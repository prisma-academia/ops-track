import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import {
  recordLoginAttempt,
  shouldLockAccount,
  computeLockoutUntil,
  isLocked,
  enforceRateLimit,
  RATE_PRESETS,
} from "@/lib/auth/rate-limit";
import { audit, requestMeta } from "@/lib/auth/audit";
import { resolveHost } from "@/lib/auth/context";
import { enterContext } from "@/lib/db/tenant-context";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

import { clientProfileIncomplete } from "@/lib/auth/client-profile";

const Body = z.object({
  email: z.email(),
  password: z.string().min(1),
  surface: z.enum(["tenant_admin", "tenant_client"]).optional(),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const json = await request.json();
    const { email, password, surface } = Body.parse(json);
    const meta = requestMeta(request);
    await enforceRateLimit(RATE_PRESETS.LOGIN, [meta.ip, email.toLowerCase()]);

    const h = await headers();
    const host = h.get("host");
    const ctx = resolveHost(host);

    if (ctx.mode === "platform") {
      enterContext({ mode: "platform", tenantId: null });
      const result = await loginPlatform(email, password, meta);
      return ok(result);
    }
    if (ctx.mode === "tenant") {
      const resolvedSurface = surface ?? "tenant_admin";
      if (resolvedSurface === "tenant_admin") {
        const result = await loginTenant(ctx.slug, email, password, meta);
        return ok(result);
      }
      const result = await loginClient(ctx.slug, email, password, meta);
      return ok(result);
    }
    throw new DomainError(404, "not_found", "Unknown context.");
  } catch (e) {
    return handleError(e);
  }
}

async function loginPlatform(email: string, password: string, meta: { ip: string | null; userAgent: string | null }) {
  const user = await prisma.platformUser.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user || user.status !== "ACTIVE") {
    await recordLoginAttempt(email, "platform", false, meta.ip);
    throw new DomainError(401, "invalid_credentials", "Invalid credentials.");
  }
  if (isLocked(user.lockedUntil)) {
    throw new DomainError(429, "locked", "Account is temporarily locked.");
  }
  const okPw = await verifyPassword(user.passwordHash, password);
  await recordLoginAttempt(email, "platform", okPw, meta.ip);

  if (!okPw) {
    const lock = await shouldLockAccount(email, "platform");
    await prisma.platformUser.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: { increment: 1 },
        lockedUntil: lock ? computeLockoutUntil() : user.lockedUntil,
      },
    });
    throw new DomainError(401, "invalid_credentials", "Invalid credentials.");
  }

  await prisma.platformUser.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const scope = user.mustChangePassword ? "MUST_CHANGE_PASSWORD" : "FULL";
  await createSession({
    userId: user.id,
    userType: "PLATFORM",
    tenantId: null,
    scope,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  await audit({
    actorType: "PLATFORM_USER",
    actorId: user.id,
    action: "auth.login",
    tenantId: null,
    targetType: "PlatformUser",
    targetId: user.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { mustChangePassword: user.mustChangePassword, redirect: user.mustChangePassword ? "/auth/change-password" : "/dashboard" };
}

async function loginTenant(slug: string, email: string, password: string, meta: { ip: string | null; userAgent: string | null }) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) throw new DomainError(404, "not_found", "Unknown tenant.");
  if (tenant.status !== "ACTIVE") throw new DomainError(403, "tenant_blocked", "Tenant is not active.");
  enterContext({ mode: "tenant-admin", tenantId: tenant.id });

  const user = await prisma.tenantUser.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() } },
  });
  if (!user || user.status !== "ACTIVE") {
    await recordLoginAttempt(`${slug}:${email}`, "tenant-admin", false, meta.ip);
    throw new DomainError(401, "invalid_credentials", "Invalid credentials.");
  }
  if (isLocked(user.lockedUntil)) {
    throw new DomainError(429, "locked", "Account is temporarily locked.");
  }
  const okPw = await verifyPassword(user.passwordHash, password);
  await recordLoginAttempt(`${slug}:${email}`, "tenant-admin", okPw, meta.ip);

  if (!okPw) {
    const lock = await shouldLockAccount(`${slug}:${email}`, "tenant-admin");
    await prisma.tenantUser.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: { increment: 1 },
        lockedUntil: lock ? computeLockoutUntil() : user.lockedUntil,
      },
    });
    throw new DomainError(401, "invalid_credentials", "Invalid credentials.");
  }

  await prisma.tenantUser.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const scope = user.mustChangePassword ? "MUST_CHANGE_PASSWORD" : "FULL";
  await createSession({
    userId: user.id,
    userType: "TENANT",
    tenantId: tenant.id,
    scope,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  await audit({
    actorType: "TENANT_USER",
    actorId: user.id,
    action: "auth.login",
    tenantId: tenant.id,
    targetType: "TenantUser",
    targetId: user.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  return { mustChangePassword: user.mustChangePassword, redirect: user.mustChangePassword ? "/admin/auth/change-password" : "/admin/dashboard" };
}

async function loginClient(
  slug: string,
  email: string,
  password: string,
  meta: { ip: string | null; userAgent: string | null }
) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) throw new DomainError(404, "not_found", "Unknown tenant.");
  if (tenant.status !== "ACTIVE") throw new DomainError(403, "tenant_blocked", "Tenant is not active.");
  enterContext({ mode: "tenant-client", tenantId: tenant.id });

  const normalized = email.toLowerCase();
  const identifier = `${slug}:${normalized}`;

  const user = await prisma.client.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: normalized } },
  });
  if (!user || user.status !== "ACTIVE") {
    await recordLoginAttempt(identifier, "tenant-client", false, meta.ip);
    throw new DomainError(401, "invalid_credentials", "Invalid credentials.");
  }
  if (!user.passwordHash) {
    await recordLoginAttempt(identifier, "tenant-client", false, meta.ip);
    throw new DomainError(
      401,
      "no_password",
      "No password on file. Use “Forgot password”, complete registration from your email link, or ask an administrator to send a reset."
    );
  }
  if (isLocked(user.lockedUntil)) {
    throw new DomainError(429, "locked", "Account is temporarily locked.");
  }
  const okPw = await verifyPassword(user.passwordHash, password);
  await recordLoginAttempt(identifier, "tenant-client", okPw, meta.ip);

  if (!okPw) {
    const lock = await shouldLockAccount(identifier, "tenant-client");
    await prisma.client.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: { increment: 1 },
        lockedUntil: lock ? computeLockoutUntil() : user.lockedUntil,
      },
    });
    throw new DomainError(401, "invalid_credentials", "Invalid credentials.");
  }

  await prisma.client.update({
    where: { id: user.id },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  const scope = user.mustChangePassword ? "MUST_CHANGE_PASSWORD" : "FULL";
  await createSession({
    userId: user.id,
    userType: "CLIENT",
    tenantId: tenant.id,
    scope,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  await audit({
    actorType: "CLIENT",
    actorId: user.id,
    action: "auth.client_login",
    tenantId: tenant.id,
    targetType: "Client",
    targetId: user.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  const profileIncomplete = clientProfileIncomplete(user.profileJson);
  const redirect = user.mustChangePassword
    ? "/auth/change-password"
    : profileIncomplete
      ? "/profile"
      : "/dashboard";
  return { mustChangePassword: user.mustChangePassword, redirect };
}
