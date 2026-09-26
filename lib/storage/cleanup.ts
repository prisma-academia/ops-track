/**
 * Best-effort cleanup of uploaded receipt files.
 *
 * When a sales log is deleted we attempt to remove the associated
 * S3 (MinIO) objects.  If the call fails the error is logged but
 * never propagated — cleanup must never block the primary delete
 * operation.
 */

import { env } from "@/lib/env";
import { s3Configured } from "./s3";

// ── S3 / MinIO ──────────────────────────────────────────────────────

function extractS3Key(url: string): string | null {
  if (!s3Configured()) return null;
  try {
    const bucket = env.S3_BUCKET!;

    // Try S3 public URL patterns
    if (env.S3_PUBLIC_BASE_URL && url.startsWith(env.S3_PUBLIC_BASE_URL)) {
      return url.slice(env.S3_PUBLIC_BASE_URL.replace(/\/$/, "").length + 1);
    }

    const u = new URL(url);

    // Virtual-hosted style: https://<bucket>.s3.<region>.amazonaws.com/<key>
    if (u.hostname.startsWith(`${bucket}.`)) {
      return u.pathname.slice(1); // strip leading "/"
    }

    // Path-style (MinIO default): https://endpoint/<bucket>/<key>
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
    forcePathStyle: true, // MinIO requires path-style addressing
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
 * Attempt to delete one or more uploaded file URLs from S3/MinIO.
 * Best-effort only — errors are swallowed and logged.
 */
export async function cleanupUploadedFiles(urls: (string | null | undefined)[]): Promise<void> {
  const unique = [...new Set(urls.filter(Boolean))] as string[];
  if (unique.length === 0) return;

  await Promise.allSettled(
    unique.map(async (url) => {
      try {
        const s3Key = extractS3Key(url);
        if (s3Key) {
          await deleteFromS3(s3Key);
        }
      } catch (err) {
        console.warn(`Failed to clean up uploaded file ${url}:`, err);
      }
    }),
  );
}
