import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";
import { resolveHost } from "@/lib/auth/context";
import { issueOtp } from "@/lib/auth/otp";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { enterContext } from "@/lib/db/tenant-context";
import { enforceRateLimit, RATE_PRESETS } from "@/lib/auth/rate-limit";

const Body = z.object({ email: z.email() });

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const { email } = Body.parse(await request.json());
    await enforceRateLimit(RATE_PRESETS.OTP_REQUEST, [email.toLowerCase()]);
    const h = await headers();
    const ctx = resolveHost(h.get("host"));
    if (ctx.mode !== "tenant") {
      throw new DomainError(400, "no_tenant", "Use your workspace URL.");
    }
    const tenant = await prisma.tenant.findUnique({ where: { slug: ctx.slug } });
    if (!tenant || tenant.status !== "ACTIVE") {
      return ok({ sent: true });
    }
    enterContext({ mode: "tenant-client", tenantId: tenant.id });

    const normalized = email.toLowerCase();
    const pending = await prisma.pendingClientRegistration.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: normalized } },
    });
    if (!pending || pending.expiresAt.getTime() < Date.now()) {
      return ok({ sent: true });
    }

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
    return ok({ sent: true });
  } catch (e) {
    return handleError(e);
  }
}
