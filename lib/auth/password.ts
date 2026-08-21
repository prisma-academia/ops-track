import argon2 from "argon2";
import { randomInt } from "node:crypto";
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
  } catch (err) {
    console.error("Password verification error:", err);
    return false;
  }
}

export type { PasswordPolicyError, PasswordPolicyOk } from "@/lib/auth/password-policy";
export { validatePolicy, generateRandomPassword } from "@/lib/auth/password-policy";

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

const TEMP_LOGIN_CODE_LENGTH = 8;

/** OTP-style numeric code used as the one-time login password on invite / reset. */
export function generateTempPassword(): string {
  const max = 10 ** TEMP_LOGIN_CODE_LENGTH;
  return String(randomInt(0, max)).padStart(TEMP_LOGIN_CODE_LENGTH, "0");
}
