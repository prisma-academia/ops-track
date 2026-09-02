import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";
import { resolveTenantFromHeaders } from "@/lib/auth/context";
import { findActiveOtpReset } from "@/lib/auth/password-reset-otp";
import { enterContext } from "@/lib/db/tenant-context";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { requestMeta } from "@/lib/auth/audit";
import { enforceRateLimit, RATE_PRESETS } from "@/lib/auth/rate-limit";

const Body = z.object({
  email: z.email(),
  otp: z.string().regex(/^\d{6}$/),
  surface: z.enum(["platform", "tenant_admin", "tenant_client"]).optional(),
});

const INVALID = new DomainError(400, "invalid_token", "Invalid or expired code.");

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const { email, otp, surface: requestedSurface } = Body.parse(await request.json());
    const meta = requestMeta(request);
    await enforceRateLimit(RATE_PRESETS.RESET_PASSWORD, [meta.ip, email.toLowerCase()]);

    const h = await headers();
    const ctx = resolveTenantFromHeaders(h.get("host"), h.get("x-tenant-slug"));
    const surface =
      requestedSurface ?? (ctx.mode === "platform" ? "platform" : "tenant_admin");

    if (surface === "platform") {
      if (ctx.mode !== "platform") throw INVALID;
      enterContext({ mode: "platform", tenantId: null });
      const user = await prisma.platformUser.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (!user || user.status !== "ACTIVE") throw INVALID;
      const row = await findActiveOtpReset({ userType: "PLATFORM", userId: user.id, code: otp });
      if (!row) throw INVALID;
      return ok({ valid: true });
    }

    if (ctx.mode !== "tenant") throw INVALID;
    const tenant = await prisma.tenant.findUnique({ where: { slug: ctx.slug } });
    if (!tenant || tenant.status !== "ACTIVE") throw INVALID;

    if (surface === "tenant_client") {
      enterContext({ mode: "tenant-client", tenantId: tenant.id });
      const client = await prisma.client.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() } },
      });
      if (!client || client.status !== "ACTIVE") throw INVALID;
      const row = await findActiveOtpReset({ userType: "CLIENT", userId: client.id, code: otp });
      if (!row) throw INVALID;
      return ok({ valid: true });
    }

    enterContext({ mode: "tenant-admin", tenantId: tenant.id });
    const user = await prisma.tenantUser.findUnique({
      where: { tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() } },
    });
    if (!user || user.status !== "ACTIVE") throw INVALID;
    const row = await findActiveOtpReset({ userType: "TENANT", userId: user.id, code: otp });
    if (!row) throw INVALID;
    return ok({ valid: true });
  } catch (e) {
    return handleError(e);
  }
}
