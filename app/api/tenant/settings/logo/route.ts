import { z } from "zod";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { createPresignedUpload, isAllowedImageType, s3Configured } from "@/lib/storage/s3";

const Body = z.object({
  contentType: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_SETTINGS_WRITE.key);
    const { contentType } = Body.parse(await request.json());

    if (!s3Configured()) {
      throw new DomainError(503, "storage_unconfigured", "Object storage is not configured.");
    }
    if (!isAllowedImageType(contentType)) {
      throw new DomainError(400, "bad_type", "Logo must be a PNG, JPEG, or WebP image.");
    }

    const presigned = await createPresignedUpload({
      tenantId: actor.tenantId,
      contentType,
      kind: "logo",
    });
    return ok(presigned);
  } catch (e) {
    return handleError(e);
  }
}
