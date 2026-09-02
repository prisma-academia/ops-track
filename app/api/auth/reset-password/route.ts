import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";
import { resolveTenantFromHeaders } from "@/lib/auth/context";
import { hashOpaqueToken } from "@/lib/auth/tokens";
import { findActiveOtpReset } from "@/lib/auth/password-reset-otp";
import { hashPassword, validatePolicy, assertNotReused, recordPassword } from "@/lib/auth/password";
import { revokeAllSessionsForUser } from "@/lib/auth/session";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { enterContext } from "@/lib/db/tenant-context";
import { enforceRateLimit, RATE_PRESETS } from "@/lib/auth/rate-limit";

const LinkBody = z.object({
  token: z.string().min(10),
  password: z.string().min(1),
});

const OtpBody = z.object({
  email: z.email(),
  otp: z.string().regex(/^\d{6}$/),
  newPassword: z.string().min(1),
  surface: z.enum(["platform", "tenant_admin", "tenant_client"]).optional(),
});

const Body = z.union([LinkBody, OtpBody]);

const INVALID_RESET = new DomainError(400, "invalid_token", "This reset is invalid or has expired.");

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const parsed = Body.parse(await request.json());
    const password = "password" in parsed ? parsed.password : parsed.newPassword;
    const rateKey = "token" in parsed ? parsed.token : `${parsed.email}:${parsed.otp}`;
    const meta = requestMeta(request);
    await enforceRateLimit(RATE_PRESETS.RESET_PASSWORD, [meta.ip, rateKey]);
    const policy = validatePolicy(password);
    if (!policy.ok) throw new DomainError(400, "weak_password", policy.reason);

    const h = await headers();
    const xTenantSlug = h.get("x-tenant-slug");
    const ctx = resolveTenantFromHeaders(h.get("host"), xTenantSlug);

    let row =
      "token" in parsed
        ? await prisma.passwordResetToken.findUnique({
            where: { tokenHash: hashOpaqueToken(parsed.token) },
          })
        : null;

    if ("otp" in parsed) {
      const surface =
        parsed.surface ?? (ctx.mode === "platform" ? "platform" : "tenant_admin");
      if (surface === "platform") {
        if (ctx.mode !== "platform") throw INVALID_RESET;
        enterContext({ mode: "platform", tenantId: null });
        const user = await prisma.platformUser.findUnique({
          where: { email: parsed.email.toLowerCase() },
        });
        if (user?.status === "ACTIVE") {
          row = await findActiveOtpReset({ userType: "PLATFORM", userId: user.id, code: parsed.otp });
        }
      } else if (ctx.mode === "tenant") {
        const tenant = await prisma.tenant.findUnique({ where: { slug: ctx.slug } });
        if (tenant?.status === "ACTIVE") {
          if (surface === "tenant_client") {
            enterContext({ mode: "tenant-client", tenantId: tenant.id });
            const client = await prisma.client.findUnique({
              where: { tenantId_email: { tenantId: tenant.id, email: parsed.email.toLowerCase() } },
            });
            if (client?.status === "ACTIVE") {
              row = await findActiveOtpReset({ userType: "CLIENT", userId: client.id, code: parsed.otp });
            }
          } else {
            enterContext({ mode: "tenant-admin", tenantId: tenant.id });
            const user = await prisma.tenantUser.findUnique({
              where: { tenantId_email: { tenantId: tenant.id, email: parsed.email.toLowerCase() } },
            });
            if (user?.status === "ACTIVE") {
              row = await findActiveOtpReset({ userType: "TENANT", userId: user.id, code: parsed.otp });
            }
          }
        }
      }
    }

    if (!row || row.consumedAt || row.expiresAt.getTime() < Date.now()) {
      throw INVALID_RESET;
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
