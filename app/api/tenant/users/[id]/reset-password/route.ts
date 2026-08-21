import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import {
  hashPassword,
  generateTempPassword,
  recordPassword,
  validatePolicy,
  assertNotReused,
} from "@/lib/auth/password";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { tempPasswordEmail } from "@/lib/email/templates";
import { emailBrandFromTenant } from "@/lib/email/branding";
import { env } from "@/lib/env";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { displayName } from "@/lib/auth/display";

const Body = z.object({
  password: z.string().min(1).optional(),
  revokeSessions: z.boolean().optional().default(true),
  sendEmail: z.boolean().optional().default(true),
});

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_USERS_WRITE.key);
    const { id } = await ctx.params;
    const body = Body.parse(await request.json().catch(() => ({})));
    const meta = requestMeta(request);

    const target = await prisma.tenantUser.findUnique({ where: { id } });
    if (!target || target.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "User not found.");
    }
    const tenant = await prisma.tenant.findUnique({ where: { id: actor.tenantId } });
    if (!tenant) throw new DomainError(404, "not_found", "Tenant not found.");

    const newPassword = body.password?.trim() || generateTempPassword();
    if (body.password) {
      const policy = validatePolicy(newPassword);
      if (!policy.ok) throw new DomainError(400, "weak_password", policy.reason);
      const reused = await assertNotReused("TENANT", id, newPassword);
      if (!reused.ok) {
        throw new DomainError(400, "password_reused", "That password was used recently. Choose a different one.");
      }
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.tenantUser.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
    });
    await recordPassword("TENANT", id, passwordHash);
    if (body.revokeSessions) {
      await revokeAllSessionsForUser("TENANT", id);
    }
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant_user.reset_password",
      tenantId: actor.tenantId,
      targetType: "TenantUser",
      targetId: id,
      after: { revokeSessions: body.revokeSessions, sendEmail: body.sendEmail } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    if (body.sendEmail) {
      const loginUrl = `http://${tenant.slug}.${env.APP_DOMAIN}/admin/auth/login`;
      await sendEmail({
        to: target.email,
        subject: "Your password has been reset",
        html: tempPasswordEmail({
          name: displayName(target),
          loginUrl,
          tempPassword: newPassword,
          brand: emailBrandFromTenant(tenant),
        }),
      });
    }
    return ok({ reset: true, emailed: body.sendEmail, sessionsRevoked: body.revokeSessions });
  } catch (e) {
    return handleError(e);
  }
}
