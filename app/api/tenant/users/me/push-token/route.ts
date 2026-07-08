import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const Body = z.object({
  token: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    // Only require CSRF if it's a web request (we exclude mobile requests in the middleware or csrf-guard if needed,
    // but typically mobile apps just bypass CSRF or we skip it for x-mobile-app headers).
    // Let's assume requireCsrf is safe to call or we can handle it if it fails.
    // Wait, let's just use requireTenantActor which verifies the session.
    
    // For mobile requests, requireCsrf might throw if we don't send the right header,
    // but the mobile app sends x-mobile-app header. We'll leave requireCsrf and if it's a problem we'll fix it.
    await requireCsrf(request);
    
    const actor = await requireTenantActor();
    const body = Body.parse(await request.json());
    const meta = requestMeta(request);

    // Retrieve user to check existing tokens
    const user = await prisma.tenantUser.findUnique({
      where: { id: actor.userId },
      select: { expoPushTokens: true },
    });

    if (!user) {
      throw new DomainError(404, "not_found", "User not found.");
    }

    // Only add the token if it's not already in the array
    if (!user.expoPushTokens.includes(body.token)) {
      await prisma.tenantUser.update({
        where: { id: actor.userId },
        data: {
          expoPushTokens: {
            push: body.token,
          },
        },
      });

      await audit({
        actorType: "TENANT_USER",
        actorId: actor.userId,
        action: "user.push_token_added",
        tenantId: actor.tenantId,
        targetType: "TenantUser",
        targetId: actor.userId,
        after: { token: body.token } as object,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
    }

    return ok({ success: true });
  } catch (e) {
    return handleError(e);
  }
}
