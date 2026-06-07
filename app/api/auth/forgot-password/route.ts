import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db/client";
import { resolveHost } from "@/lib/auth/context";
import { hashOpaqueToken, newOpaqueToken } from "@/lib/auth/tokens";
import { sendEmail } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/templates";
import { tenantHttpOrigin } from "@/lib/url/tenant";
import { env } from "@/lib/env";
import { displayName } from "@/lib/auth/display";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { enterContext } from "@/lib/db/tenant-context";
import { audit, requestMeta } from "@/lib/auth/audit";
import { enforceRateLimit, RATE_PRESETS } from "@/lib/auth/rate-limit";
import type { SessionUserType } from "@/lib/generated/prisma/enums";

const Body = z.object({
  email: z.email(),
  surface: z.enum(["platform", "tenant_admin", "tenant_client"]),
});

const RESET_TTL_MS = 1000 * 60 * 60;

function platformOrigin(): string {
  return `http://${env.APP_DOMAIN}`;
}

async function queuePasswordReset(input: {
  userType: SessionUserType;
  userId: string;
  tenantId: string | null;
  tenantSlug: string | null;
  email: string;
  name: string | null;
  resetPath: string;
}): Promise<void> {
  const raw = newOpaqueToken();
  const tokenHash = hashOpaqueToken(raw);
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);
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
  const origin =
    input.userType === "PLATFORM" ? platformOrigin() : tenantHttpOrigin(input.tenantSlug!);
  const resetUrl = `${origin}${input.resetPath}?token=${encodeURIComponent(raw)}`;
  await sendEmail({
    to: input.email,
    subject: "Reset your password",
    html: passwordResetEmail({ name: input.name, resetUrl }),
  });
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const body = Body.parse(await request.json());
    const meta = requestMeta(request);
    await enforceRateLimit(RATE_PRESETS.FORGOT_PASSWORD, [meta.ip, body.email.toLowerCase()]);
    const h = await headers();
    const ctx = resolveHost(h.get("host"));

    if (body.surface === "platform") {
      enterContext({ mode: "platform", tenantId: null });
      if (ctx.mode !== "platform") {
        throw new DomainError(400, "bad_surface", "Use the main app domain for platform password reset.");
      }
      const user = await prisma.platformUser.findUnique({
        where: { email: body.email.toLowerCase() },
      });
      if (user && user.status === "ACTIVE") {
        await queuePasswordReset({
          userType: "PLATFORM",
          userId: user.id,
          tenantId: null,
          tenantSlug: null,
          email: user.email,
          name: displayName(user),
          resetPath: "/auth/reset-password",
        });
        await audit({
          actorType: "SYSTEM",
          actorId: null,
          action: "auth.forgot_password",
          tenantId: null,
          targetType: "PlatformUser",
          targetId: user.id,
          ip: meta.ip,
          userAgent: meta.userAgent,
        });
      }
      return ok({ sent: true });
    }

    if (ctx.mode !== "tenant") {
      throw new DomainError(400, "bad_surface", "Use your workspace URL for this reset.");
    }
    const tenant = await prisma.tenant.findUnique({ where: { slug: ctx.slug } });
    if (!tenant || tenant.status !== "ACTIVE") {
      return ok({ sent: true });
    }
    enterContext({
      mode: body.surface === "tenant_client" ? "tenant-client" : "tenant-admin",
      tenantId: tenant.id,
    });

    if (body.surface === "tenant_admin") {
      const user = await prisma.tenantUser.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email: body.email.toLowerCase() } },
      });
      if (user && user.status === "ACTIVE") {
        await queuePasswordReset({
          userType: "TENANT",
          userId: user.id,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          email: user.email,
          name: displayName(user),
          resetPath: "/admin/auth/reset-password",
        });
        await audit({
          actorType: "SYSTEM",
          actorId: null,
          action: "auth.forgot_password",
          tenantId: tenant.id,
          targetType: "TenantUser",
          targetId: user.id,
          ip: meta.ip,
          userAgent: meta.userAgent,
        });
      }
      return ok({ sent: true });
    }

    if (body.surface === "tenant_client") {
      const client = await prisma.client.findUnique({
        where: { tenantId_email: { tenantId: tenant.id, email: body.email.toLowerCase() } },
      });
      if (client && client.status === "ACTIVE") {
        await queuePasswordReset({
          userType: "CLIENT",
          userId: client.id,
          tenantId: tenant.id,
          tenantSlug: tenant.slug,
          email: client.email,
          name: displayName({
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
          }),
          resetPath: "/auth/reset-password",
        });
        await audit({
          actorType: "SYSTEM",
          actorId: null,
          action: "auth.forgot_password",
          tenantId: tenant.id,
          targetType: "Client",
          targetId: client.id,
          ip: meta.ip,
          userAgent: meta.userAgent,
        });
      }
      return ok({ sent: true });
    }

    throw new DomainError(400, "bad_surface", "Invalid surface.");
  } catch (e) {
    return handleError(e);
  }
}
