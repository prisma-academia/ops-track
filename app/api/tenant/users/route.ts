import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { hashPassword, generateTempPassword, recordPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta, parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";
import { ALL_TENANT_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { genericOrgFilter, assertOrgAccess } from "@/lib/auth/org-scope";
import { cookies } from "next/headers";

const InviteBody = z.object({
  email: z.email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  otherName: z.string().max(100).optional(),
  phone: z.string().max(40).optional(),
  roleTemplateId: z.string().min(1),
  activeModules: z.array(z.enum(["STATION", "FLEET"])).min(1),
  permissions: z.array(z.string()).optional(),
  organizationId: z.string().optional().nullable(),
  stationId: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_USERS_READ.key);
    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");
    const moduleFilter = url.searchParams.get("module") as "STATION" | "FLEET" | null;

    const jar = await cookies();
    const activeStationId = jar.get("active-station-id")?.value || "all";

    const whereClause: any = { 
      tenantId: actor.tenantId,
      ...(moduleFilter ? { activeModules: { has: moduleFilter } } : {})
    };

    if (moduleFilter === "STATION" && activeStationId !== "all") {
      const activeStation = await prisma.station.findUnique({
        where: { id: activeStationId },
        select: { organizationId: true }
      });
      const targetOrgId = activeStation?.organizationId || (await prisma.organization.findUnique({ where: { id: activeStationId } }))?.id || actor.organizationId;

      if (targetOrgId) {
        whereClause.OR = [
          { isOwner: true },
          { organizationId: targetOrgId },
          { ownedOrganizations: { some: { id: targetOrgId } } },
          { stations: { some: { id: activeStationId } } },
          { stations: { some: { organizationId: targetOrgId } } },
        ];
      } else {
        whereClause.OR = [
          { isOwner: true },
          { stations: { some: { id: activeStationId } } }
        ];
      }
    } else if (actor.organizationId) {
      whereClause.OR = [
        { isOwner: true },
        { organizationId: actor.organizationId },
        { ownedOrganizations: { some: { id: actor.organizationId } } },
        { stations: { some: { organizationId: actor.organizationId } } },
      ];
    }

    const userSelect = {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      otherName: true,
      phone: true,
      isOwner: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      activeModules: true,
      organizationId: true,
      organization: {
        select: {
          name: true,
        },
      },
      ownedOrganizations: {
        select: {
          name: true,
        },
      },
    };
    
    if (useOffset) {
      const { page, take, skip } = parseOffsetPagination(url.searchParams);
      const [totalCount, rows] = await Promise.all([
        prisma.tenantUser.count({ where: whereClause }),
        prisma.tenantUser.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
          take,
          skip,
          select: userSelect,
        }),
      ]);
      return ok(rows, buildOffsetPageMeta(totalCount, page, take));
    } else {
      const { cursor, take } = parsePagination(url.searchParams);
      const rows = await prisma.tenantUser.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        select: userSelect,
      });
      return ok(rows, buildPageMeta(rows, take));
    }
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor(PERMISSIONS.TENANT_USERS_WRITE.key);
    const body = InviteBody.parse(await request.json());
    const meta = requestMeta(request);

    const role = await prisma.roleTemplate.findUnique({ where: { id: body.roleTemplateId } });
    if (!role || role.scope !== "TENANT" || role.tenantId !== actor.tenantId) {
      throw new DomainError(400, "invalid_role", "Role template not in this tenant.");
    }
    const allowed = new Set<string>(ALL_TENANT_PERMISSION_KEYS);
    
    // Org access control:
    // 1. If actor is org-scoped, they can only invite to their own org.
    // 2. If actor is fleet-wide, they can invite to any org or fleet-wide (null).
    if (actor.organizationId) {
      if (body.organizationId !== actor.organizationId) {
        throw new DomainError(403, "forbidden", "You can only invite users to your own organization.");
      }
    } else if (body.organizationId) {
      assertOrgAccess(actor, body.organizationId); // though this is no-op for fleet-wide, good for consistency
    }

    const requestedPerms = body.permissions ?? role.permissions;
    const perms = requestedPerms.filter((p) => allowed.has(p));

    const existing = await prisma.tenantUser.findUnique({
      where: { tenantId_email: { tenantId: actor.tenantId, email: body.email.toLowerCase() } },
    });
    if (existing) throw new DomainError(409, "email_taken", "Email already in use in this tenant.");

    const tenant = await prisma.tenant.findUnique({ where: { id: actor.tenantId } });
    if (!tenant) throw new DomainError(404, "not_found", "Tenant not found.");

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const user = await prisma.tenantUser.create({
      data: {
        tenantId: actor.tenantId,
        email: body.email.toLowerCase(),
        firstName: body.firstName,
        lastName: body.lastName,
        otherName: body.otherName ?? null,
        phone: body.phone ?? null,
        passwordHash,
        mustChangePassword: true,
        activeModules: body.activeModules,
        organizationId: body.organizationId || null,
        ...(body.stationId ? { stations: { connect: { id: body.stationId } } } : {}),
        ...(role.module === "STATION" ? { stationPermissions: perms } : { fleetPermissions: perms }),
      },
    });
    await recordPassword("TENANT", user.id, passwordHash);
    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "tenant_user.invite",
      tenantId: actor.tenantId,
      targetType: "TenantUser",
      targetId: user.id,
      module: role.module,
      after: { email: user.email, role: role.name, permissions: perms } as object,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    if (role.name !== "Attendant") {
      const loginUrl = `http://${tenant.slug}.${env.APP_DOMAIN}/admin/auth/login`;
      await sendEmail({
        to: body.email,
        subject: `You're invited to ${tenant.name}`,
        html: inviteEmail({
          name: `${body.firstName} ${body.lastName}`,
          loginUrl,
          tempPassword,
          subjectLabel: tenant.name,
        }),
      });
    }

    return ok({ user });
  } catch (e) {
    return handleError(e);
  }
}
