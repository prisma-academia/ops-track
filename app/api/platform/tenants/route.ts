import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requirePlatformActor, PERMISSIONS } from "@/lib/auth/guards";
import { runWithContext } from "@/lib/db/tenant-context";
import { isValidSlug, RESERVED_SLUGS } from "@/lib/auth/context";
import { TENANT_BUILTIN_ROLES, ALL_TENANT_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { hashPassword, generateTempPassword, recordPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta } from "@/lib/api/pagination";

const QUARANTINE_DAYS = 90;

const CreateBody = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(3).max(32).regex(/^[a-z0-9-]+$/),
  ownerEmail: z.email(),
  ownerFirstName: z.string().min(1).max(100),
  ownerLastName: z.string().min(1).max(100),
  ownerOtherName: z.string().max(100).optional(),
  ownerPhone: z.string().max(40).optional(),
  companyEmail: z.email().optional(),
  companyPhone: z.string().max(40).optional(),
  website: z.string().max(200).optional(),
  addressLine1: z.string().max(200).optional(),
  addressLine2: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  postalCode: z.string().max(40).optional(),
  country: z.string().max(2).optional(),
});

export async function GET(request: Request) {
  try {
    await requirePlatformActor(PERMISSIONS.PLATFORM_TENANTS_READ.key);
    const url = new URL(request.url);
    const { cursor, take } = parsePagination(url.searchParams);
    const rows = await prisma.tenant.findMany({
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    return ok(rows, buildPageMeta(rows, take));
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requirePlatformActor(PERMISSIONS.PLATFORM_TENANTS_WRITE.key);
    const body = CreateBody.parse(await request.json());
    const meta = requestMeta(request);

    if (!isValidSlug(body.slug) || RESERVED_SLUGS.has(body.slug)) {
      throw new DomainError(400, "invalid_slug", "Slug is reserved or invalid.");
    }
    const existing = await prisma.tenant.findUnique({ where: { slug: body.slug } });
    if (existing) {
      if (existing.status === "ARCHIVED" && existing.archivedAt) {
        const cutoff = new Date(existing.archivedAt.getTime() + QUARANTINE_DAYS * 24 * 60 * 60 * 1000);
        if (Date.now() < cutoff.getTime()) {
          throw new DomainError(409, "slug_quarantined", "Slug is quarantined.");
        }
      } else {
        throw new DomainError(409, "slug_taken", "Slug already in use.");
      }
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

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
      // Owner/roles/log belong to the new tenant — bind scope to it so the
      // Prisma guard permits these strict-scoped writes from platform context.
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
          email: body.ownerEmail.toLowerCase(),
          firstName: body.ownerFirstName,
          lastName: body.ownerLastName,
          otherName: body.ownerOtherName ?? null,
          phone: body.ownerPhone ?? null,
          passwordHash,
          mustChangePassword: true,
          isOwner: true,
          permissions: [...ALL_TENANT_PERMISSION_KEYS],
        },
      });
      await tx.tenant.update({ where: { id: tenant.id }, data: { ownerUserId: owner.id } });
      await tx.activityLog.create({
        data: {
          tenantId: tenant.id,
          actorType: "PLATFORM_USER",
          actorId: actor.userId,
          action: "tenant.create",
          targetType: "Tenant",
          targetId: tenant.id,
          afterJson: { slug: tenant.slug, name: tenant.name } as object,
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
      to: body.ownerEmail,
      subject: `You're invited to ${body.name}`,
      html: inviteEmail({
        name: `${body.ownerFirstName} ${body.ownerLastName}`,
        loginUrl,
        tempPassword,
        subjectLabel: `${body.name} as the owner`,
      }),
    });

    return ok({ tenant: created.tenant });
  } catch (e) {
    return handleError(e);
  }
}
