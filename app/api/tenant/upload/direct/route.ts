import { requireTenantActor } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import {
  isAllowedReceiptType,
  MAX_RECEIPT_BYTES,
  s3Configured,
  uploadObject,
} from "@/lib/storage/s3";

/**
 * Server-side receipt upload for mobile (and other clients that cannot reach
 * internal MinIO presigned PUT URLs). Streams the file into object storage.
 */
export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor();

    if (!s3Configured()) {
      throw new DomainError(503, "storage_unconfigured", "Object storage is not configured.");
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof Blob)) {
      throw new DomainError(400, "invalid_file", "Missing file upload.");
    }

    if (file.size > MAX_RECEIPT_BYTES) {
      throw new DomainError(
        400,
        "file_too_large",
        `File must be ${MAX_RECEIPT_BYTES / (1024 * 1024)} MB or smaller.`,
      );
    }

    const contentType = file.type || "application/octet-stream";
    if (!isAllowedReceiptType(contentType)) {
      throw new DomainError(400, "invalid_type", "Unsupported file type.");
    }

    const body = Buffer.from(await file.arrayBuffer());
    const { publicUrl } = await uploadObject({
      tenantId: actor.tenantId,
      contentType,
      kind: "receipt",
      body,
    });

    return ok({ publicUrl });
  } catch (e) {
    return handleError(e);
  }
}
