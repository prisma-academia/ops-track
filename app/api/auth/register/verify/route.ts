import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { hashPassword, recordPassword, validatePolicy } from "@/lib/auth/password";
import { verifyOtp } from "@/lib/auth/otp";
import { isValidSlug, RESERVED_SLUGS } from "@/lib/auth/context";
import { TENANT_BUILTIN_ROLES, ALL_TENANT_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { sendEmail } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { runWithContext } from "@/lib/db/tenant-context";
import { enforceRateLimit, RATE_PRESETS } from "@/lib/auth/rate-limit";
import { RegisterBody } from "../start/route";

const QUARANTINE_DAYS = 90;

const VerifyBody = RegisterBody.extend({
  code: z.string().regex(/^\d{6}$/),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const body = VerifyBody.parse(await request.json());
    await enforceRateLimit(RATE_PRESETS.REGISTER, [body.email.toLowerCase(), body.slug]);

    const policy = validatePolicy(body.password);
    if (!policy.ok) throw new DomainError(400, "weak_password", policy.reason);

    if (!isValidSlug(body.slug) || RESERVED_SLUGS.has(body.slug)) {
      throw new DomainError(400, "invalid_slug", "Slug is reserved or invalid.");
    }
    const existingTenant = await prisma.tenant.findUnique({ where: { slug: body.slug } });
    if (existingTenant) {
      if (existingTenant.status === "ARCHIVED" && existingTenant.archivedAt) {
        const cutoff = new Date(existingTenant.archivedAt.getTime() + QUARANTINE_DAYS * 24 * 60 * 60 * 1000);
        if (Date.now() < cutoff.getTime()) {
          throw new DomainError(409, "slug_quarantined", "Slug is quarantined.");
        }
      } else {
        throw new DomainError(409, "slug_taken", "Slug already in use.");
      }
    }

    const otp = await verifyOtp({
      identifier: body.email.toLowerCase(),
      code: body.code,
      purpose: "TENANT_REGISTRATION",
    });
    if (!otp.ok) {
      throw new DomainError(401, `otp_${otp.reason}`, "Code is invalid or expired.");
    }

    const passwordHash = await hashPassword(body.password);

    const created = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: body.slug,
          name: body.name,
          companyEmail: body.companyEmail ?? null,
          companyPhone: body.companyPhone ?? null,
          website: body.website ?? null,
          addressLine1: body.addressLine1 ?? null,
          addressLine2: body.addressLine2 ?? null,
          city: body.city ?? null,
          region: body.region ?? null,
          postalCode: body.postalCode ?? null,
          country: body.country ?? null,
        },
      });
      return runWithContext(
        { mode: "tenant-admin", tenantId: tenant.id },
        async () => {
      for (const r of TENANT_BUILTIN_ROLES) {
        await tx.roleTemplate.create({
          data: {
            scope: "TENANT",
            tenantId: tenant.id,
            name: r.name,
            permissions: [...r.permissions],
            isSystem: true,
          },
        });
      }
      const owner = await tx.tenantUser.create({
        data: {
          tenantId: tenant.id,
          email: body.email.toLowerCase(),
          firstName: body.firstName,
          lastName: body.lastName,
          otherName: body.otherName ?? null,
          phone: body.phone ?? null,
          passwordHash,
          mustChangePassword: false,
          isOwner: true,
          permissions: [...ALL_TENANT_PERMISSION_KEYS],
        },
      });
      await tx.tenant.update({ where: { id: tenant.id }, data: { ownerUserId: owner.id } });
      await tx.activityLog.create({
        data: {
          tenantId: tenant.id,
          actorType: "SYSTEM",
          actorId: null,
          action: "tenant.self_register",
          targetType: "Tenant",
          targetId: tenant.id,
          afterJson: { slug: tenant.slug, name: tenant.name, ownerEmail: owner.email } as object,
        },
      });
      return { tenant, owner };
        }
      );
    });

    await recordPassword("TENANT", created.owner.id, passwordHash);

    const loginUrl = `http://${body.slug}.${env.APP_DOMAIN}/admin/auth/login`;
    await sendEmail({
      to: body.email,
      subject: `Welcome to ${body.name}`,
      html: inviteEmail({
        name: `${body.firstName} ${body.lastName}`,
        loginUrl,
        tempPassword: "(the password you set during registration)",
        subjectLabel: `${body.name} — sign in to your admin console`,
      }),
    });

    return ok({ redirectUrl: loginUrl });
  } catch (e) {
    return handleError(e);
  }
}
