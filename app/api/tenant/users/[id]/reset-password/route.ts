import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { hashPassword, generateTempPassword, recordPassword } from "@/lib/auth/password";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { tempPasswordEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { displayName } from "@/lib/auth/display";

export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_USERS_WRITE.key);
    const { id } = await ctx.params;
    const meta = requestMeta(request);

    const target = await prisma.tenantUser.findUnique({ where: { id } });
    if (!target || target.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "User not found.");
    }
    const tenant = await prisma.tenant.findUnique({ where: { id: actor.tenantId } });
    if (!tenant) throw new DomainError(404, "not_found", "Tenant not found.");

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    await prisma.tenantUser.update({
      where: { id },
      data: { passwordHash, mustChangePassword: true },
    });
    await recordPassword("TENANT", id, passwordHash);
    await revokeAllSessionsForUser("TENANT", id);
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant_user.reset_password",
      tenantId: actor.tenantId,
      targetType: "TenantUser",
      targetId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    const loginUrl = `http://${tenant.slug}.${env.APP_DOMAIN}/admin/auth/login`;
    await sendEmail({
      to: target.email,
      subject: "Your password has been reset",
      html: tempPasswordEmail({ name: displayName(target), loginUrl, tempPassword }),
    });
    return ok({ reset: true });
  } catch (e) {
    return handleError(e);
  }
}
