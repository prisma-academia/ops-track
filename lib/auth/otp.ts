import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email/send";
import { otpEmail } from "@/lib/email/templates";
import type { OtpPurpose } from "@/lib/generated/prisma/enums";

const OTP_TTL_MS = 1000 * 60 * 5;
const RATE_WINDOW_MS = 1000 * 60 * 10;
const RATE_MAX = 3;
const MAX_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash("sha256").update(`${env.OTP_PEPPER}:${code}`).digest("hex");
}

export async function issueOtp(input: {
  identifier: string;
  purpose: OtpPurpose;
  tenantId: string | null;
  tenantName: string;
  emailVariant?: "signin" | "registration";
}): Promise<{ sent: true } | { sent: false; reason: "rate_limited" }> {
  const since = new Date(Date.now() - RATE_WINDOW_MS);
  const recent = await prisma.otpRequest.count({
    where: { identifier: input.identifier, createdAt: { gte: since } },
  });
  if (recent >= RATE_MAX) return { sent: false, reason: "rate_limited" };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = hashCode(code);
  await prisma.otpRequest.create({
    data: {
      identifier: input.identifier,
      codeHash,
      purpose: input.purpose,
      tenantId: input.tenantId,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });
  await sendEmail({
    to: input.identifier,
    subject:
      input.emailVariant === "registration"
        ? `Verify your email — ${input.tenantName}`
        : `Your sign-in code for ${input.tenantName}`,
    html: otpEmail({
      code,
      tenantName: input.tenantName,
      variant: input.emailVariant,
    }),
  });
  return { sent: true };
}

export type VerifyResult =
  | { ok: true; otpId: string }
  | { ok: false; reason: "not_found" | "expired" | "too_many_attempts" | "invalid" };

export async function verifyOtp(input: {
  identifier: string;
  code: string;
  purpose: OtpPurpose;
}): Promise<VerifyResult> {
  const candidate = await prisma.otpRequest.findFirst({
    where: {
      identifier: input.identifier,
      purpose: input.purpose,
      consumedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });
  if (!candidate) return { ok: false, reason: "not_found" };
  if (candidate.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
  if (candidate.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  await prisma.otpRequest.update({
    where: { id: candidate.id },
    data: { attempts: { increment: 1 } },
  });

  const provided = Buffer.from(hashCode(input.code));
  const stored = Buffer.from(candidate.codeHash);
  const equal = provided.length === stored.length && timingSafeEqual(provided, stored);
  if (!equal) return { ok: false, reason: "invalid" };

  await prisma.otpRequest.update({
    where: { id: candidate.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true, otpId: candidate.id };
}
