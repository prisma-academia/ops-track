import { z } from "zod";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { createPresignedUpload, isAllowedImageType, s3Configured } from "@/lib/storage/s3";
import crypto from "crypto";

const Body = z.object({
  contentType: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_FLEET_ORGANIZATIONS_WRITE.key);
    const { contentType } = Body.parse(await request.json());

    if (!isAllowedImageType(contentType)) {
      throw new DomainError(400, "bad_type", "Logo must be a PNG, JPEG, or WebP image.");
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      // Return Cloudinary signature
      const timestamp = Math.round(new Date().getTime() / 1000);
      const signature = crypto.createHash("sha1").update(`timestamp=${timestamp}${apiSecret}`).digest("hex");
      
      return ok({
        uploadType: "cloudinary",
        url: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        apiKey,
        timestamp,
        signature,
      });
    }

    if (!s3Configured()) {
      throw new DomainError(503, "storage_unconfigured", "Object storage is not configured.");
    }

    const presigned = await createPresignedUpload({
      tenantId: actor.tenantId,
      contentType,
      kind: "logo",
    });
    
    return ok({ uploadType: "s3", ...presigned });
  } catch (e) {
    return handleError(e);
  }
}
