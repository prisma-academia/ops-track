import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { hashPassword, generateTempPassword, recordPassword } from "@/lib/auth/password";
import { sendEmail } from "@/lib/email/send";
import { inviteEmail } from "@/lib/email/templates";
import { emailBrandFromTenant } from "@/lib/email/branding";
import { env } from "@/lib/env";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import { parsePagination, buildPageMeta, parseOffsetPagination, buildOffsetPageMeta } from "@/lib/api/pagination";
import { ALL_TENANT_PERMISSION_KEYS } from "@/lib/auth/permissions";
import { cookies } from "next/headers";
import {
  assertRoleUsable,
  canManageFleetUsers,
  canManageStationUsers,
  canWriteFleetUsers,
  canWriteStationUsers,
  filterPermissionsForModule,
  requireAnyPermission,
  type MembershipMode,
} from "@/lib/auth/membership";
import { resolveActiveOrgIdFromCookie } from "@/lib/auth/org-scope";
import type { AppModule } from "@/lib/generated/prisma/client";

const InviteBody = z.object({
  email: z.email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  otherName: z.string().max(100).optional(),
  phone: z.string().max(40).optional(),
  roleTemplateId: z.string().min(1),
  activeModules: z.array(z.enum(["STATION", "FLEET"])).min(1).optional(),
  permissions: z.array(z.string()).optional(),
  organizationId: z.string().optional().nullable(),
  stationId: z.string().optional().nullable(),
  inviteContext: z.enum(["STATION", "FLEET"]).optional(),
});

async function resolveStationOrgId(actor: Awaited<ReturnType<typeof requireTenantActor>>, requested?: string | null) {
  if (actor.organizationId) {
    if (requested && requested !== actor.organizationId) {
      throw new DomainError(403, "forbidden", "You can only invite users to your own organization.");
    }
    return actor.organizationId;
  }
  if (requested) return requested;
  const cookieOrg = await resolveActiveOrgIdFromCookie(actor);
  if (cookieOrg) return cookieOrg;
  throw new DomainError(400, "invalid_input", "An organization is required for station users.");
}

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor();
    const url = new URL(request.url);
    const useOffset = url.searchParams.has("page");
    const moduleFilter = (url.searchParams.get("module") as "STATION" | "FLEET" | null) ?? null;

    if (moduleFilter === "STATION") {
      requireAnyPermission(actor, canManageStationUsers(actor));
    } else {
      requireAnyPermission(actor, canManageFleetUsers(actor));
    }

    const jar = await cookies();
    const activeStationId = jar.get("active-station-id")?.value || "all";

    const whereClause: Record<string, unknown> = {
      tenantId: actor.tenantId,
      ...(moduleFilter ? { activeModules: { has: moduleFilter } } : {}),
    };

    if (moduleFilter === "STATION") {
      const activeStation = activeStationId !== "all"
        ? await prisma.station.findUnique({
            where: { id: activeStationId },
            select: { organizationId: true },
          })
        : null;
      const targetOrgId =
        actor.organizationId ||
        activeStation?.organizationId ||
        (activeStationId !== "all"
          ? (await prisma.organization.findUnique({ where: { id: activeStationId } }))?.id
          : null) ||
        (await resolveActiveOrgIdFromCookie(actor));

      if (targetOrgId) {
        whereClause.OR = [
          { organizationId: targetOrgId },
          { stations: { some: { organizationId: targetOrgId } } },
        ];
      }
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
    const actor = await requireTenantActor();
    const body = InviteBody.parse(await request.json());
    const meta = requestMeta(request);

    const inviteContext: MembershipMode = body.inviteContext
      ?? (body.activeModules?.length === 1 && body.activeModules[0] === "STATION" ? "STATION" : "FLEET");

    if (inviteContext === "STATION") {
      requireAnyPermission(actor, canWriteStationUsers(actor));
    } else {
      requireAnyPermission(actor, canWriteFleetUsers(actor));
    }

    const role = await assertRoleUsable({ actor, roleId: body.roleTemplateId, mode: inviteContext });
    const allowed = new Set<string>(ALL_TENANT_PERMISSION_KEYS);
    const requestedPerms = (body.permissions ?? role.permissions).filter((p) => allowed.has(p));
    const perms = filterPermissionsForModule(requestedPerms, inviteContext);

    const stationOrgId = inviteContext === "STATION"
      ? await resolveStationOrgId(actor, body.organizationId ?? role.organizationId)
      : null;

    if (inviteContext === "STATION") {
      if (body.activeModules?.includes("FLEET") && !canWriteFleetUsers(actor)) {
        throw new DomainError(403, "forbidden", "Station admins cannot grant fleet access.");
      }
    }

    if (body.stationId && stationOrgId) {
      const station = await prisma.station.findFirst({
        where: { id: body.stationId, tenantId: actor.tenantId, organizationId: stationOrgId },
        select: { id: true },
      });
      if (!station) {
        throw new DomainError(400, "invalid_input", "Station does not belong to this organization.");
      }
    }

    const existing = await prisma.tenantUser.findUnique({
      where: { tenantId_email: { tenantId: actor.tenantId, email: body.email.toLowerCase() } },
    });

    const tenant = await prisma.tenant.findUnique({ where: { id: actor.tenantId } });
    if (!tenant) throw new DomainError(404, "not_found", "Tenant not found.");

    if (existing) {
      if (inviteContext === "STATION") {
        if (existing.organizationId && existing.organizationId !== stationOrgId) {
          throw new DomainError(409, "org_conflict", "This user already belongs to a different organization.");
        }
        const activeModules = Array.from(new Set<AppModule>([...existing.activeModules, "STATION"]));
        const stationPermissions = Array.from(new Set([...existing.stationPermissions, ...perms]));
        const user = await prisma.tenantUser.update({
          where: { id: existing.id },
          data: {
            activeModules,
            organizationId: existing.organizationId ?? stationOrgId,
            stationPermissions,
            ...(body.stationId ? { stations: { connect: { id: body.stationId } } } : {}),
          },
        });
        await audit({
          actorType: "TENANT_USER",
          actorId: actor.userId,
          action: "tenant_user.attach_station",
          tenantId: actor.tenantId,
          targetType: "TenantUser",
          targetId: user.id,
          module: "STATION",
          after: { email: user.email, role: role.name, permissions: stationPermissions } as object,
          ip: meta.ip,
          userAgent: meta.userAgent,
        });
        return ok({ user, attached: true });
      }

      const activeModules = Array.from(new Set<AppModule>([...existing.activeModules, "FLEET"]));
      const fleetPermissions = Array.from(new Set([...existing.fleetPermissions, ...perms]));
      const user = await prisma.tenantUser.update({
        where: { id: existing.id },
        data: {
          activeModules,
          fleetPermissions,
        },
      });
      await audit({
        actorType: "TENANT_USER",
        actorId: actor.userId,
        action: "tenant_user.attach_fleet",
        tenantId: actor.tenantId,
        targetType: "TenantUser",
        targetId: user.id,
        module: "FLEET",
        after: { email: user.email, role: role.name, permissions: fleetPermissions } as object,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return ok({ user, attached: true });
    }

    const activeModules: AppModule[] = inviteContext === "STATION"
      ? ["STATION"]
      : (body.activeModules && body.activeModules.length > 0 ? body.activeModules : ["FLEET"]);

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
        activeModules,
        organizationId: stationOrgId,
        ...(body.stationId ? { stations: { connect: { id: body.stationId } } } : {}),
        ...(inviteContext === "STATION" ? { stationPermissions: perms } : { fleetPermissions: perms }),
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
      module: inviteContext,
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
          brand: emailBrandFromTenant(tenant),
        }),
      });
    }

    return ok({ user });
  } catch (e) {
    return handleError(e);
  }
}
