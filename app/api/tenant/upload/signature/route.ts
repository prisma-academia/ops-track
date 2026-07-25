import { z } from "zod";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    
    // Any tenant user can upload basic media if they are authenticated.
    await requireTenantActor();

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
       throw new DomainError(503, "storage_unconfigured", "Object storage is not configured.");
    }

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
  } catch (e) {
    return handleError(e);
  }
}
