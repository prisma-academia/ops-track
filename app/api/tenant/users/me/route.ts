import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";
import {
  hashPassword,
  verifyPassword,
  validatePolicy,
  assertNotReused,
  recordPassword,
} from "@/lib/auth/password";
import {
  createSession,
  revokeAllSessionsForUser,
} from "@/lib/auth/session";

const PatchBody = z.object({
  phone: z.string().nullable().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
});

export async function GET() {
  try {
    const actor = await requireTenantActor();
    const user = await prisma.tenantUser.findUnique({
      where: { id: actor.userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            companyEmail: true,
            companyPhone: true,
            activeModules: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
          },
        },
        stations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!user || user.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "User profile not found.");
    }

    return ok({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        otherName: user.otherName,
        phone: user.phone,
        isOwner: user.isOwner,
        status: user.status,
        bannedReason: user.bannedReason,
        activeModules: user.activeModules,
        stationPermissions: user.stationPermissions,
        fleetPermissions: user.fleetPermissions,
        failedLoginAttempts: user.failedLoginAttempts,
        lockedUntil: user.lockedUntil,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        tenant: user.tenant,
        organization: user.organization,
        stations: user.stations,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireCsrf(request);
    const actor = await requireTenantActor();
    const body = PatchBody.parse(await request.json());
    const meta = requestMeta(request);

    const user = await prisma.tenantUser.findUnique({
      where: { id: actor.userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            companyEmail: true,
            companyPhone: true,
            activeModules: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            type: true,
          },
        },
        stations: {
          select: {
            id: true,
            name: true,
            code: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!user || user.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "User not found.");
    }

    let phoneUpdated = false;
    let passwordUpdated = false;

    // 1. Handle Phone Number Update
    if (body.phone !== undefined) {
      const normalizedPhone = body.phone?.trim() || null;
      if (normalizedPhone !== user.phone) {
        await prisma.tenantUser.update({
          where: { id: user.id },
          data: { phone: normalizedPhone },
        });

        await audit({
          actorType: "TENANT_USER",
          actorId: user.id,
          action: "user.profile_update",
          tenantId: user.tenantId,
          targetType: "TenantUser",
          targetId: user.id,
          before: { phone: user.phone },
          after: { phone: normalizedPhone },
          ip: meta.ip,
          userAgent: meta.userAgent,
        });

        user.phone = normalizedPhone;
        phoneUpdated = true;
      }
    }

    // 2. Handle Password Reset / Change
    if (body.newPassword) {
      if (!body.currentPassword) {
        throw new DomainError(400, "missing_current_password", "Current password is required to set a new password.");
      }

      if (body.confirmPassword !== undefined && body.newPassword !== body.confirmPassword) {
        throw new DomainError(400, "password_mismatch", "New password and confirmation password do not match.");
      }

      const validCurrent = await verifyPassword(user.passwordHash, body.currentPassword);
      if (!validCurrent) {
        throw new DomainError(401, "invalid_credentials", "Current password is incorrect.");
      }

      const policy = validatePolicy(body.newPassword);
      if (!policy.ok) {
        throw new DomainError(400, "weak_password", policy.reason);
      }

      const reuse = await assertNotReused("TENANT", user.id, body.newPassword);
      if (!reuse.ok) {
        throw new DomainError(400, "password_reused", "Cannot reuse a recent password.");
      }

      const newHash = await hashPassword(body.newPassword);
      await prisma.tenantUser.update({
        where: { id: user.id },
        data: {
          passwordHash: newHash,
          mustChangePassword: false,
        },
      });

      await recordPassword("TENANT", user.id, newHash);
      await revokeAllSessionsForUser("TENANT", user.id);

      // Re-create session so current browser session is preserved without logging out
      await createSession({
        userId: user.id,
        userType: "TENANT",
        tenantId: user.tenantId,
        scope: "FULL",
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      await audit({
        actorType: "TENANT_USER",
        actorId: user.id,
        action: "auth.change_password",
        tenantId: user.tenantId,
        targetType: "TenantUser",
        targetId: user.id,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });

      passwordUpdated = true;
    }

    return ok({
      success: true,
      phoneUpdated,
      passwordUpdated,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        otherName: user.otherName,
        phone: user.phone,
        isOwner: user.isOwner,
        status: user.status,
        activeModules: user.activeModules,
        stationPermissions: user.stationPermissions,
        fleetPermissions: user.fleetPermissions,
        failedLoginAttempts: user.failedLoginAttempts,
        lockedUntil: user.lockedUntil,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        tenant: user.tenant,
        organization: user.organization,
        stations: user.stations,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
