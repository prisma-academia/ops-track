import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: stationId } = await params;
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_READ.key);

    // Verify station ownership
    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "not_found", "Station not found.");
    }

    const staff = await prisma.tenantUser.findMany({
      where: {
        tenantId: actor.tenantId,
        stations: {
          some: {
            id: stationId
          }
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
      orderBy: {
        firstName: 'asc'
      }
    });

    return ok(staff);
  } catch (e) {
    return handleError(e);
  }
}
