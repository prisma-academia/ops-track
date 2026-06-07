import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";
import { resolveHost } from "@/lib/auth/context";
import { hashPassword, validatePolicy } from "@/lib/auth/password";
import { issueOtp } from "@/lib/auth/otp";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { enterContext } from "@/lib/db/tenant-context";
import { enforceRateLimit, RATE_PRESETS } from "@/lib/auth/rate-limit";

const Body = z
  .object({
    email: z.email(),
    password: z.string().min(12),
    confirm: z.string().min(12),
    displayName: z.string().min(1).max(200),
    firstName: z.string().max(100).optional(),
    lastName: z.string().max(100).optional(),
    otherName: z.string().max(100).optional(),
    phone: z.string().max(40).optional(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match.",
  });

const PENDING_TTL_MS = 1000 * 60 * 60 * 24;

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const body = Body.parse(await request.json());
    await enforceRateLimit(RATE_PRESETS.REGISTER, [body.email.toLowerCase()]);
    const h = await headers();
    const ctx = resolveHost(h.get("host"));
    if (ctx.mode !== "tenant") {
      throw new DomainError(400, "no_tenant", "Registration is only available on a tenant workspace URL.");
    }
    const tenant = await prisma.tenant.findUnique({ where: { slug: ctx.slug } });
    if (!tenant || tenant.status !== "ACTIVE") {
      throw new DomainError(403, "tenant_blocked", "Workspace is not available.");
    }
    enterContext({ mode: "tenant-client", tenantId: tenant.id });

    const policy = validatePolicy(body.password);
    if (!policy.ok) throw new DomainError(400, "weak_password", policy.reason);

    const normalized = body.email.toLowerCase();
    const existing = await prisma.client.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: normalized } },
    });
    if (existing) {
      throw new DomainError(409, "email_taken", "An account with this email already exists. Sign in instead.");
    }

    const passwordHash = await hashPassword(body.password);
    const profileJson = { name: body.displayName.trim() };
    const expiresAt = new Date(Date.now() + PENDING_TTL_MS);

    await prisma.pendingClientRegistration.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: normalized } },
      create: {
        tenantId: tenant.id,
        email: normalized,
        passwordHash,
        firstName: body.firstName?.trim() || null,
        lastName: body.lastName?.trim() || null,
        otherName: body.otherName?.trim() || null,
        phone: body.phone?.trim() || null,
        profileJson,
        expiresAt,
      },
      update: {
        passwordHash,
        firstName: body.firstName?.trim() || null,
        lastName: body.lastName?.trim() || null,
        otherName: body.otherName?.trim() || null,
        phone: body.phone?.trim() || null,
        profileJson,
        expiresAt,
      },
    });

    const otp = await issueOtp({
      identifier: normalized,
      purpose: "CLIENT_SIGNUP",
      tenantId: tenant.id,
      tenantName: tenant.name,
      emailVariant: "registration",
    });
    if (!otp.sent) {
      throw new DomainError(429, "rate_limited", "Too many verification codes. Try again later.");
    }

    return ok({ step: "otp" as const });
  } catch (e) {
    return handleError(e);
  }
}
