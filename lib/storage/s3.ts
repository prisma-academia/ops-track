import { randomBytes } from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db/client";

/**
 * Tenant branding object storage (PRD §5.8, §8.3, §16.6).
 *
 * Works with AWS S3 and S3-compatible self-hosted backends (MinIO, Ceph
 * RGW, Garage, etc.). For self-hosted, set S3_ENDPOINT (e.g.
 * http://localhost:9000); path-style addressing and a default region are
 * applied automatically.
 *
 * SVG is intentionally NOT allowed (stored-XSS vector for logos rendered
 * inline). Uploads are presigned PUTs with a short expiry and a pinned
 * content-type.
 */

// MinIO/self-hosted default. AWS S3 also accepts us-east-1 globally.
const DEFAULT_REGION = "us-east-1";

export const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024; // 8 MB

const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export type PresignKind = "payment-receipt" | "sales-receipt" | "settings" | "waybill-uploads" | "expense-receipt" | "logo" | "profile" | "receipt";

export function isAllowedImageType(contentType: string): boolean {
  return (
    contentType === "image/png" ||
    contentType === "image/jpeg" ||
    contentType === "image/webp"
  );
}

export function isAllowedReceiptType(contentType: string): boolean {
  return contentType in CONTENT_TYPE_EXT;
}

export function s3Configured(): boolean {
  // Region is optional for S3-compatible endpoints (a default is applied);
  // AWS proper still needs it explicitly.
  const hasRegion = Boolean(env.S3_REGION || env.S3_ENDPOINT);
  return Boolean(
    hasRegion &&
    env.S3_BUCKET &&
    env.S3_ACCESS_KEY_ID &&
    env.S3_SECRET_ACCESS_KEY,
  );
}

let client: S3Client | null = null;
let presignClient: S3Client | null = null;

function s3ClientOptions(endpoint?: string): S3ClientConfig {
  const forcePathStyle = endpoint ?? env.S3_ENDPOINT
    ? env.S3_FORCE_PATH_STYLE !== false
    : env.S3_FORCE_PATH_STYLE === true;

  return {
    region: env.S3_REGION ?? DEFAULT_REGION,
    ...(endpoint ? { endpoint } : env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    forcePathStyle,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  };
}

function getClient(): S3Client {
  if (!s3Configured()) {
    throw new Error("S3 is not configured (S3_REGION/S3_BUCKET/credentials).");
  }
  if (!client) {
    client = new S3Client(s3ClientOptions());
  }
  return client;
}

/** Presigned PUT URLs must use an endpoint reachable from the uploader (browser / mobile). */
function getPresignClient(): S3Client {
  if (!s3Configured()) {
    throw new Error("S3 is not configured (S3_REGION/S3_BUCKET/credentials).");
  }
  const publicEndpoint = env.S3_PUBLIC_ENDPOINT;
  if (!publicEndpoint) {
    return getClient();
  }
  if (!presignClient) {
    presignClient = new S3Client(s3ClientOptions(publicEndpoint));
  }
  return presignClient;
}

export function publicUrlForKey(key: string): string {
  if (env.S3_PUBLIC_BASE_URL) {
    return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  }
  if (env.S3_ENDPOINT) {
    return `${env.S3_ENDPOINT.replace(/\/$/, "")}/${env.S3_BUCKET}/${key}`;
  }
  return `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
}

async function buildObjectKey(
  tenantId: string,
  kind: PresignKind,
  contentType: string,
): Promise<string> {
  const ext = CONTENT_TYPE_EXT[contentType];
  if (!ext) throw new Error("Unsupported content type.");

  let tenantName = "unknown";
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    if (tenant?.name) {
      tenantName = tenant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    }
  } catch (error) {
    console.error("Failed to fetch tenant name for S3 upload:", error);
  }

  return `tenants/${tenantName}-${tenantId}/${kind}/${randomBytes(8).toString("hex")}.${ext}`;
}

export async function uploadObject(input: {
  tenantId: string;
  contentType: string;
  kind: PresignKind;
  body: Uint8Array | Buffer;
}): Promise<{ key: string; publicUrl: string }> {
  const key = await buildObjectKey(input.tenantId, input.kind, input.contentType);
  await getClient().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET!,
      Key: key,
      ContentType: input.contentType,
      Body: input.body,
    }),
  );
  return { key, publicUrl: publicUrlForKey(key) };
}

export async function createPresignedUpload(input: {
  tenantId: string;
  contentType: string;
  kind: PresignKind;
}): Promise<{ url: string; key: string; publicUrl: string }> {
  const key = await buildObjectKey(input.tenantId, input.kind, input.contentType);

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET!,
    Key: key,
    ContentType: input.contentType,
  });
  const url = await getSignedUrl(getPresignClient(), command, { expiresIn: 300 });
  return { url, key, publicUrl: publicUrlForKey(key) };
}

export async function checkS3Health(): Promise<boolean> {
  if (!s3Configured()) return false;
  try {
    const command = new HeadBucketCommand({ Bucket: env.S3_BUCKET! });
    await getClient().send(command);
    return true;
  } catch (e) {
    console.error("S3 Health Check Failed:", e);
    return false;
  }
}
