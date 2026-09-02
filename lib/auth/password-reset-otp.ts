import { randomInt } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { hashOpaqueToken } from "@/lib/auth/tokens";
import { sendEmail } from "@/lib/email/send";
import { passwordResetCodeEmail } from "@/lib/email/templates";
import type { EmailBrand } from "@/lib/email/branding";
import type { SessionUserType } from "@/lib/generated/prisma/enums";

const OTP_TTL_MS = 1000 * 60 * 15;

export function hashPasswordResetOtp(userId: string, code: string): string {
  return hashOpaqueToken(`otp:${userId}:${code}`);
}

export async function issuePasswordResetOtp(input: {
  userType: SessionUserType;
  userId: string;
  tenantId: string | null;
  email: string;
  name: string | null;
  tenantName: string;
  brand?: EmailBrand;
}): Promise<void> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const tokenHash = hashPasswordResetOtp(input.userId, code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await prisma.passwordResetToken.deleteMany({
    where: { userType: input.userType, userId: input.userId, consumedAt: null },
  });
  await prisma.passwordResetToken.create({
    data: {
      tokenHash,
      userType: input.userType,
      userId: input.userId,
      tenantId: input.tenantId,
      expiresAt,
    },
  });

  await sendEmail({
    to: input.email,
    subject: "Reset your password",
    html: passwordResetCodeEmail({
      name: input.name,
      code,
      tenantName: input.tenantName,
      brand: input.brand,
    }),
  });
}

export async function findActiveOtpReset(input: {
  userType: SessionUserType;
  userId: string;
  code: string;
}) {
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashPasswordResetOtp(input.userId, input.code) },
  });
  if (!row || row.consumedAt || row.userType !== input.userType || row.userId !== input.userId) {
    return null;
  }
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row;
}
