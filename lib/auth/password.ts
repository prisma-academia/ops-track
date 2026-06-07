import argon2 from "argon2";
import { prisma } from "@/lib/db/client";
import type { SessionUserType } from "@/lib/generated/prisma/enums";

const HISTORY_LIMIT = 5;

const argonOpts = {
  type: argon2.argon2id,
  memoryCost: 2 ** 16,
  timeCost: 3,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, argonOpts);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

export type PasswordPolicyError = { ok: false; reason: string };
export type PasswordPolicyOk = { ok: true };

export function validatePolicy(password: string): PasswordPolicyOk | PasswordPolicyError {
  if (password.length < 12) return { ok: false, reason: "Password must be at least 12 characters." };
  if (!/[a-z]/.test(password)) return { ok: false, reason: "Password must contain a lowercase letter." };
  if (!/[A-Z]/.test(password)) return { ok: false, reason: "Password must contain an uppercase letter." };
  if (!/\d/.test(password)) return { ok: false, reason: "Password must contain a digit." };
  if (!/[^A-Za-z0-9]/.test(password)) return { ok: false, reason: "Password must contain a symbol." };
  return { ok: true };
}

export async function assertNotReused(
  userType: SessionUserType,
  userId: string,
  plain: string
): Promise<{ ok: boolean }> {
  const history = await prisma.passwordHistory.findMany({
    where: { userType, userId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  for (const h of history) {
    if (await verifyPassword(h.hash, plain)) return { ok: false };
  }
  return { ok: true };
}

export async function recordPassword(
  userType: SessionUserType,
  userId: string,
  hash: string
): Promise<void> {
  await prisma.passwordHistory.create({ data: { userType, userId, hash } });
  const stale = await prisma.passwordHistory.findMany({
    where: { userType, userId },
    orderBy: { createdAt: "desc" },
    skip: HISTORY_LIMIT,
    select: { id: true },
  });
  if (stale.length > 0) {
    await prisma.passwordHistory.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
  }
}

import { randomBytes } from "node:crypto";

export function generateTempPassword(): string {
  const raw = randomBytes(12).toString("base64url");
  return `Tmp!${raw}9A`;
}
