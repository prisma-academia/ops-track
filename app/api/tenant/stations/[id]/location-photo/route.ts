import { z } from "zod";
import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { audit, requestMeta } from "@/lib/auth/audit";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";
import { requireCsrf } from "@/lib/api/csrf-guard";

const UpdateLocationPhotoSchema = z.object({
  imageUrl: z.string().min(1, "Image URL is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional().nullable(),
  location: z.string().max(255).optional().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireCsrf(request);
    const { id } = await params;
    const actor = await requireTenantActor(undefined, "STATION");

    const canMobileUpdate = actor.permissions.has("mobile.tenant.station-info:update");
    const canAdminWrite = actor.isOwner || actor.permissions.has(PERMISSIONS.TENANT_STATIONS_WRITE.key);

    if (!canMobileUpdate && !canAdminWrite) {
      throw new DomainError(403, "forbidden", "You do not have permission to update station information.");
    }

    const body = UpdateLocationPhotoSchema.parse(await request.json());
    const meta = requestMeta(request);

    const existing = await prisma.station.findUnique({
      where: { id },
      select: {
        id: true,
        tenantId: true,
        name: true,
        code: true,
        imageUrl: true,
        latitude: true,
        longitude: true,
        altitude: true,
        location: true,
      },
    });

    if (!existing || existing.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const before = {
      imageUrl: existing.imageUrl,
      latitude: existing.latitude ? Number(existing.latitude) : null,
      longitude: existing.longitude ? Number(existing.longitude) : null,
      altitude: existing.altitude ? Number(existing.altitude) : null,
      location: existing.location,
    };

    const updatedStation = await prisma.station.update({
      where: { id },
      data: {
        imageUrl: body.imageUrl,
        latitude: body.latitude,
        longitude: body.longitude,
        altitude: body.altitude ?? null,
        ...(body.location !== undefined ? { location: body.location } : {}),
      },
    });

    let permissionRevoked = false;
    // Auto-revoke mobile permission after successful capture so it cannot be updated again without admin re-enabling
    if (!canAdminWrite && canMobileUpdate) {
      const userRecord = await prisma.tenantUser.findUnique({
        where: { id: actor.userId },
        select: { stationPermissions: true },
      });

      if (userRecord) {
        const nextPerms = userRecord.stationPermissions.filter(
          (p) => p !== "mobile.tenant.station-info:update"
        );
        await prisma.tenantUser.update({
          where: { id: actor.userId },
          data: { stationPermissions: nextPerms },
        });
        permissionRevoked = true;
      }
    }

    await audit({
      actorType: "TENANT_USER",
      actorId: actor.userId,
      action: "station.update_location_photo",
      tenantId: actor.tenantId,
      targetType: "Station",
      targetId: id,
      before,
      after: {
        imageUrl: updatedStation.imageUrl,
        latitude: updatedStation.latitude ? Number(updatedStation.latitude) : null,
        longitude: updatedStation.longitude ? Number(updatedStation.longitude) : null,
        altitude: updatedStation.altitude ? Number(updatedStation.altitude) : null,
        location: updatedStation.location,
        permissionRevoked,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return ok({ station: updatedStation, permissionRevoked });
  } catch (e) {
    return handleError(e);
  }
}
