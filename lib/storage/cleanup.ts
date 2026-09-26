/**
 * Best-effort cleanup of uploaded receipt files.
 *
 * When a sales log is deleted we attempt to remove the associated
 * Cloudinary images or S3 objects.  If the provider call fails the
 * error is logged but never propagated — cleanup must never block the
 * primary delete operation.
 */

import crypto from "node:crypto";
import { env } from "@/lib/env";
import { s3Configured } from "./s3";

// ── Cloudinary ──────────────────────────────────────────────────────

function cloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

/**
 * Extract the Cloudinary `public_id` from a delivery URL.
 * Typical URL shape:
 *   https://res.cloudinary.com/<cloud>/image/upload/v123/abc123.jpg
 */
function extractCloudinaryPublicId(url: string): string | null {
  try {
    const parts = new URL(url).pathname.split("/");
    // Find the "upload" segment and take everything after it as the public_id
    const uploadIdx = parts.indexOf("upload");
    if (uploadIdx === -1) return null;

    // Skip the version segment (e.g. "v1234567890")
    let start = uploadIdx + 1;
    if (parts[start]?.startsWith("v") && /^\d+$/.test(parts[start].slice(1))) {
      start++;
    }

    const rawId = parts.slice(start).join("/");
    // Strip extension
    return rawId.replace(/\.[^/.]+$/, "") || null;
  } catch {
    return null;
  }
}

async function deleteFromCloudinary(publicId: string): Promise<void> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const timestamp = Math.round(Date.now() / 1000);

  const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  const form = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature,
  });

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
    { method: "POST", body: form },
  );

  if (!res.ok) {
    console.warn(`Cloudinary destroy failed for ${publicId}: ${res.status}`);
  }
}

// ── S3 ──────────────────────────────────────────────────────────────

function extractS3Key(url: string): string | null {
  if (!s3Configured()) return null;
  try {
    const bucket = env.S3_BUCKET!;

    // Try S3 public URL patterns
    if (env.S3_PUBLIC_BASE_URL && url.startsWith(env.S3_PUBLIC_BASE_URL)) {
      return url.slice(env.S3_PUBLIC_BASE_URL.replace(/\/$/, "").length + 1);
    }

    // Virtual-hosted style: https://<bucket>.s3.<region>.amazonaws.com/<key>
    const u = new URL(url);
    if (u.hostname.startsWith(`${bucket}.`)) {
      return u.pathname.slice(1); // strip leading "/"
    }

    // Path-style: https://endpoint/<bucket>/<key>
    if (u.pathname.startsWith(`/${bucket}/`)) {
      return u.pathname.slice(`/${bucket}/`.length);
    }
  } catch { /* ignore */ }
  return null;
}

async function deleteFromS3(key: string): Promise<void> {
  // Dynamic import to avoid loading the SDK when S3 isn't in use
  const { S3Client, DeleteObjectCommand } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    region: env.S3_REGION ?? "us-east-1",
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
  });

  await client.send(
    new DeleteObjectCommand({ Bucket: env.S3_BUCKET!, Key: key }),
  );
}

// ── Public helper ───────────────────────────────────────────────────

/**
 * Attempt to delete one or more uploaded file URLs.
 * Best-effort only — errors are swallowed and logged.
 */
export async function cleanupUploadedFiles(urls: (string | null | undefined)[]): Promise<void> {
  const unique = [...new Set(urls.filter(Boolean))] as string[];
  if (unique.length === 0) return;

  await Promise.allSettled(
    unique.map(async (url) => {
      try {
        // Check if it's a Cloudinary URL
        if (url.includes("cloudinary.com") && cloudinaryConfigured()) {
          const publicId = extractCloudinaryPublicId(url);
          if (publicId) {
            await deleteFromCloudinary(publicId);
            return;
          }
        }

        // Check if it's an S3 URL
        const s3Key = extractS3Key(url);
        if (s3Key) {
          await deleteFromS3(s3Key);
          return;
        }

        // Not a recognised provider — nothing to clean up
      } catch (err) {
        console.warn(`Failed to clean up uploaded file ${url}:`, err);
      }
    }),
  );
}
