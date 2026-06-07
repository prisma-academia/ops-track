import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";
import { resolveHost } from "@/lib/auth/context";
import { verifyOtp } from "@/lib/auth/otp";
import { recordPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { audit, requestMeta } from "@/lib/auth/audit";
import { clientProfileIncomplete } from "@/lib/auth/client-profile";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { enterContext } from "@/lib/db/tenant-context";
import { enforceRateLimit, RATE_PRESETS } from "@/lib/auth/rate-limit";
import type { Prisma } from "@/lib/generated/prisma/client";

const Body = z.object({
  email: z.email(),
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const { email, code } = Body.parse(await request.json());
    const meta = requestMeta(request);
    await enforceRateLimit(RATE_PRESETS.REGISTER, [meta.ip, email.toLowerCase()]);
    const h = await headers();
    const ctx = resolveHost(h.get("host"));
    if (ctx.mode !== "tenant") {
      throw new DomainError(400, "no_tenant", "Complete registration on your workspace URL.");
    }

    const tenant = await prisma.tenant.findUnique({ where: { slug: ctx.slug } });
    if (!tenant || tenant.status !== "ACTIVE") {
      throw new DomainError(403, "tenant_blocked", "Workspace is not active.");
    }
    enterContext({ mode: "tenant-client", tenantId: tenant.id });

    const normalized = email.toLowerCase();
    const otpResult = await verifyOtp({
      identifier: normalized,
      code,
      purpose: "CLIENT_SIGNUP",
    });
    if (!otpResult.ok) {
      throw new DomainError(401, `otp_${otpResult.reason}`, "Code is invalid or expired.");
    }

    const pending = await prisma.pendingClientRegistration.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: normalized } },
    });
    if (!pending || pending.expiresAt.getTime() < Date.now()) {
      throw new DomainError(400, "pending_expired", "Registration expired. Start again from the beginning.");
    }

    const dup = await prisma.client.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: normalized } },
    });
    if (dup) {
      await prisma.pendingClientRegistration.deleteMany({ where: { tenantId: tenant.id, email: normalized } });
      throw new DomainError(409, "already_registered", "An account with this email already exists. Sign in instead.");
    }

    const client = await prisma.$transaction(async (tx) => {
      const c = await tx.client.create({
        data: {
          tenantId: tenant.id,
          email: normalized,
          passwordHash: pending.passwordHash,
          mustChangePassword: false,
          firstName: pending.firstName,
          lastName: pending.lastName,
          otherName: pending.otherName,
          phone: pending.phone,
          profileJson: pending.profileJson as Prisma.InputJsonValue,
        },
      });
      await tx.pendingClientRegistration.delete({ where: { id: pending.id } });
      return c;
    });

    await recordPassword("CLIENT", client.id, client.passwordHash!);
    await createSession({
      userId: client.id,
      userType: "CLIENT",
      tenantId: tenant.id,
      scope: "FULL",
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    await audit({
      actorType: "CLIENT",
      actorId: client.id,
      action: "auth.client_signup",
      tenantId: tenant.id,
      targetType: "Client",
      targetId: client.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const profileIncomplete = clientProfileIncomplete(client.profileJson);
    return ok({ redirect: profileIncomplete ? "/profile" : "/dashboard" });
  } catch (e) {
    return handleError(e);
  }
}
