import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { env, isProd, apexHostname } from "@/lib/env";
import type { SessionUserType, SessionScope } from "@/lib/generated/prisma/enums";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12;

export const COOKIE_NAMES = {
  platform: "__mt-platform-session",
  tenant: "__mt-tenant-session",
  client: "__mt-client-session",
} as const;

export type CookieKind = keyof typeof COOKIE_NAMES;

function cookieNameFor(userType: SessionUserType): string {
  if (userType === "PLATFORM") return COOKIE_NAMES.platform;
  if (userType === "TENANT") return COOKIE_NAMES.tenant;
  return COOKIE_NAMES.client;
}

function newToken(): string {
  return randomBytes(32).toString("base64url");
}

export type CreateSessionInput = {
  userId: string;
  userType: SessionUserType;
  tenantId: string | null;
  scope: SessionScope;
  ip?: string | null;
  userAgent?: string | null;
};

export async function createSession(input: CreateSessionInput): Promise<{ token: string; expiresAt: Date }> {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({
    data: {
      id: token,
      userId: input.userId,
      userType: input.userType,
      tenantId: input.tenantId,
      scope: input.scope,
      expiresAt,
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    },
  });
  const jar = await cookies();
  jar.set(cookieNameFor(input.userType), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    expires: expiresAt,
    domain: cookieDomain(input.userType),
  });
  return { token, expiresAt };
}

function cookieDomain(userType: SessionUserType): string | undefined {
  if (!isProd) return undefined;
  if (userType === "PLATFORM") return apexHostname();
  return undefined;
}

export async function readSessionToken(userType: SessionUserType): Promise<string | null> {
  const jar = await cookies();
  return jar.get(cookieNameFor(userType))?.value ?? null;
}

export type LoadedSession = {
  id: string;
  userId: string;
  userType: SessionUserType;
  tenantId: string | null;
  scope: SessionScope;
  expiresAt: Date;
};

export async function getSession(token: string | null | undefined): Promise<LoadedSession | null> {
  if (!token) return null;
  const s = await prisma.session.findUnique({ where: { id: token } });
  if (!s) return null;
  if (s.revokedAt) return null;
  if (s.expiresAt.getTime() < Date.now()) return null;
  return {
    id: s.id,
    userId: s.userId,
    userType: s.userType,
    tenantId: s.tenantId,
    scope: s.scope,
    expiresAt: s.expiresAt,
  };
}

export async function revokeSession(token: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: token, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessionsForUser(
  userType: SessionUserType,
  userId: string
): Promise<void> {
  await prisma.session.updateMany({
    where: { userType, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Revoke all tenant + client sessions for a tenant. Called when a tenant is
 * suspended/archived so live sessions stop working immediately (PRD §13).
 * `Session` is a global model, safe under the Prisma scope guard.
 */
export async function revokeAllSessionsForTenant(tenantId: string): Promise<void> {
  await prisma.session.updateMany({
    where: {
      tenantId,
      userType: { in: ["TENANT", "CLIENT"] },
      revokedAt: null,
    },
    data: { revokedAt: new Date() },
  });
}

export async function clearSessionCookie(userType: SessionUserType): Promise<void> {
  const jar = await cookies();
  const name = cookieNameFor(userType);
  jar.set(name, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    expires: new Date(0),
    domain: cookieDomain(userType),
  });
  jar.delete(name);
}

export { env };
