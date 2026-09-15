import { z } from "zod";
import { requireTenantActor } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { createPresignedUpload, isAllowedReceiptType, s3Configured } from "@/lib/storage/s3";
import crypto from "crypto";

const Body = z.object({
  contentType: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);

    // Any tenant user can upload basic media/receipts if they are authenticated.
    const actor = await requireTenantActor();

    let contentType = "application/octet-stream";
    try {
      const parsed = Body.parse(await request.json());
      if (parsed.contentType) contentType = parsed.contentType;
    } catch {
      // Body may be empty or invalid JSON; fallback to default
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      // Return Cloudinary signature
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = crypto
        .createHash("sha1")
        .update(`timestamp=${timestamp}${apiSecret}`)
        .digest("hex");

      const endpoint =
        contentType === "application/pdf" || contentType.toLowerCase().endsWith("pdf")
          ? "auto"
          : "image";

      return ok({
        uploadType: "cloudinary",
        url: `https://api.cloudinary.com/v1_1/${cloudName}/${endpoint}/upload`,
        apiKey,
        timestamp,
        signature,
      });
    }

    if (!s3Configured()) {
      throw new DomainError(
        503,
        "storage_unconfigured",
        "Object storage is not configured.",
      );
    }

    const presigned = await createPresignedUpload({
      tenantId: actor.tenantId,
      contentType: isAllowedReceiptType(contentType) ? contentType : "application/pdf",
      kind: "receipt",
    });

    return ok({ uploadType: "s3", ...presigned });
  } catch (e) {
    return handleError(e);
  }
}
