import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { hashPassword, recordPassword, validatePolicy } from "@/lib/auth/password";
import { verifyOtp } from "@/lib/auth/otp";
import { isValidSlug, RESERVED_SLUGS } from "@/lib/auth/context";
import { TENANT_BUILTIN_ROLES, ALL_TENANT_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { sendEmail } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
import { emailBrandFromTenant } from "@/lib/email/branding";
import { env } from "@/lib/env";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { runWithContext } from "@/lib/db/tenant-context";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { requestMeta } from "@/lib/auth/audit";
import { PlatformRegisterBody } from "../start/route";

const QUARANTINE_DAYS = 90;

const VerifyBody = PlatformRegisterBody.extend({
  code: z.string().regex(/^\d{6}$/, "Verification code must be 6 digits"),
});

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requirePlatformActor(PERMISSIONS.PLATFORM_TENANTS_WRITE.key);
    const body = VerifyBody.parse(await request.json());
    const meta = requestMeta(request);

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
      throw new DomainError(401, `otp_${otp.reason}`, "Verification code is invalid or expired.");
    }

    const passwordHash = await hashPassword(body.password);

    const trialStartedAt = body.enableTrial ? new Date() : null;
    const trialEndsAt = body.enableTrial
      ? new Date(Date.now() + body.trialDays * 24 * 60 * 60 * 1000)
      : null;
    const trialDays = body.enableTrial ? body.trialDays : 0;

    const created = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          slug: body.slug,
          name: body.name,
          status: body.status,
          activeModules: body.activeModules && body.activeModules.length > 0 ? body.activeModules : ["FLEET", "STATION"],
          companyEmail: body.companyEmail || null,
          companyPhone: body.companyPhone || null,
          website: body.website || null,
          addressLine1: body.addressLine1 || null,
          addressLine2: body.addressLine2 || null,
          city: body.city || null,
          region: body.region || null,
          postalCode: body.postalCode || null,
          country: body.country || null,
          trialDays,
          trialStartedAt,
          trialEndsAt,
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
                module: r.module,
              },
            });
          }

          const owner = await tx.tenantUser.create({
            data: {
              tenantId: tenant.id,
              email: body.email.toLowerCase(),
              firstName: body.firstName,
              lastName: body.lastName,
              otherName: body.otherName || null,
              phone: body.phone || null,
              passwordHash,
              mustChangePassword: body.mustChangePassword,
              isOwner: true,
              stationPermissions: [...ALL_TENANT_PERMISSION_KEYS],
              fleetPermissions: [...ALL_TENANT_PERMISSION_KEYS],
            },
          });

          await tx.tenant.update({
            where: { id: tenant.id },
            data: { ownerUserId: owner.id },
          });

          await tx.activityLog.create({
            data: {
              tenantId: tenant.id,
              actorType: "PLATFORM_USER",
              actorId: actor.userId,
              action: "tenant.create",
              targetType: "Tenant",
              targetId: tenant.id,
              afterJson: {
                slug: tenant.slug,
                name: tenant.name,
                ownerEmail: owner.email,
                status: tenant.status,
              } as object,
              ip: meta.ip,
              userAgent: meta.userAgent,
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
        tempPassword: "(the password configured during registration)",
        subjectLabel: `${body.name} — sign in to your admin console`,
        brand: emailBrandFromTenant(created.tenant),
      }),
    });

    return ok({
      tenant: created.tenant,
      redirectUrl: `/tenants/${created.tenant.id}`,
    });
  } catch (e) {
    return handleError(e);
  }
}
