import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";
import { resolveHost } from "@/lib/auth/context";
import { hashOpaqueToken } from "@/lib/auth/tokens";
import { hashPassword, validatePolicy, assertNotReused, recordPassword } from "@/lib/auth/password";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { enterContext } from "@/lib/db/tenant-context";
import { enforceRateLimit, RATE_PRESETS } from "@/lib/auth/rate-limit";

const Body = z.object({
  token: z.string().min(10),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const { token, password } = Body.parse(await request.json());
    const meta = requestMeta(request);
    await enforceRateLimit(RATE_PRESETS.RESET_PASSWORD, [meta.ip, token]);
    const policy = validatePolicy(password);
    if (!policy.ok) throw new DomainError(400, "weak_password", policy.reason);

    const h = await headers();
    const ctx = resolveHost(h.get("host"));
    const tokenHash = hashOpaqueToken(token);
    const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!row || row.consumedAt || row.expiresAt.getTime() < Date.now()) {
      throw new DomainError(400, "invalid_token", "This link is invalid or has expired.");
    }

    const tenant = row.tenantId
      ? await prisma.tenant.findUnique({ where: { id: row.tenantId } })
      : null;

    enterContext({
      mode:
        row.userType === "PLATFORM"
          ? "platform"
          : row.userType === "CLIENT"
            ? "tenant-client"
            : "tenant-admin",
      tenantId: row.userType === "PLATFORM" ? null : row.tenantId,
    });

    if (row.userType === "PLATFORM") {
      if (ctx.mode !== "platform") {
        throw new DomainError(400, "wrong_host", "Open this link on the main app domain.");
      }
      const user = await prisma.platformUser.findUnique({ where: { id: row.userId } });
      if (!user || user.status !== "ACTIVE") {
        throw new DomainError(400, "invalid_token", "This link is no longer valid.");
      }
      const reuse = await assertNotReused("PLATFORM", user.id, password);
      if (!reuse.ok) throw new DomainError(400, "password_reused", "Cannot reuse a recent password.");
      const passwordHash = await hashPassword(password);
      await prisma.$transaction([
        prisma.platformUser.update({
          where: { id: user.id },
          data: { passwordHash, mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
        }),
        prisma.passwordResetToken.update({
          where: { id: row.id },
          data: { consumedAt: new Date() },
        }),
      ]);
      await recordPassword("PLATFORM", user.id, passwordHash);
      await revokeAllSessionsForUser("PLATFORM", user.id);
      await audit({
        actorType: "SYSTEM",
        actorId: null,
        action: "auth.reset_password",
        tenantId: null,
        targetType: "PlatformUser",
        targetId: user.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return ok({ redirect: "/auth/login" });
    }

    if (row.userType === "TENANT") {
      if (ctx.mode !== "tenant" || !tenant || tenant.slug !== ctx.slug) {
        throw new DomainError(400, "wrong_host", "Open this link on the correct workspace URL.");
      }
      const user = await prisma.tenantUser.findUnique({ where: { id: row.userId } });
      if (!user || user.status !== "ACTIVE" || user.tenantId !== tenant.id) {
        throw new DomainError(400, "invalid_token", "This link is no longer valid.");
      }
      const reuse = await assertNotReused("TENANT", user.id, password);
      if (!reuse.ok) throw new DomainError(400, "password_reused", "Cannot reuse a recent password.");
      const passwordHash = await hashPassword(password);
      await prisma.$transaction([
        prisma.tenantUser.update({
          where: { id: user.id },
          data: { passwordHash, mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
        }),
        prisma.passwordResetToken.update({
          where: { id: row.id },
          data: { consumedAt: new Date() },
        }),
      ]);
      await recordPassword("TENANT", user.id, passwordHash);
      await revokeAllSessionsForUser("TENANT", user.id);
      await audit({
        actorType: "SYSTEM",
        actorId: null,
        action: "auth.reset_password",
        tenantId: tenant.id,
        targetType: "TenantUser",
        targetId: user.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return ok({ redirect: "/admin/auth/login" });
    }

    if (row.userType === "CLIENT") {
      if (ctx.mode !== "tenant" || !tenant || tenant.slug !== ctx.slug) {
        throw new DomainError(400, "wrong_host", "Open this link on the correct workspace URL.");
      }
      const client = await prisma.client.findUnique({ where: { id: row.userId } });
      if (!client || client.status !== "ACTIVE" || client.tenantId !== tenant.id) {
        throw new DomainError(400, "invalid_token", "This link is no longer valid.");
      }
      const reuse = await assertNotReused("CLIENT", client.id, password);
      if (!reuse.ok) throw new DomainError(400, "password_reused", "Cannot reuse a recent password.");
      const passwordHash = await hashPassword(password);
      await prisma.$transaction([
        prisma.client.update({
          where: { id: client.id },
          data: { passwordHash, mustChangePassword: false, failedLoginAttempts: 0, lockedUntil: null },
        }),
        prisma.passwordResetToken.update({
          where: { id: row.id },
          data: { consumedAt: new Date() },
        }),
      ]);
      await recordPassword("CLIENT", client.id, passwordHash);
      await revokeAllSessionsForUser("CLIENT", client.id);
      await audit({
        actorType: "SYSTEM",
        actorId: null,
        action: "auth.reset_password",
        tenantId: tenant.id,
        targetType: "Client",
        targetId: client.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return ok({ redirect: "/auth/login" });
    }

    throw new DomainError(400, "invalid_token", "This link is invalid.");
  } catch (e) {
    return handleError(e);
  }
}
