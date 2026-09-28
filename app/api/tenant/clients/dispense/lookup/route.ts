import { prisma } from "@/lib/db/client";
import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { ok } from "@/lib/api/respond";
import { handleError, DomainError } from "@/lib/api/errors";

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_CLIENTS_READ.key);
    const url = new URL(request.url);
    const stationId = url.searchParams.get("stationId");
    const query = url.searchParams.get("query")?.trim() || "";

    if (!stationId) {
      throw new DomainError(400, "station_required", "Station ID is required.");
    }

    // Verify station exists in tenant
    const station = await prisma.station.findUnique({
      where: { id: stationId },
      include: {
        priceControls: {
          orderBy: { effectiveFrom: "desc" },
          take: 4,
        },
      },
    });
    if (!station || station.tenantId !== actor.tenantId) {
      throw new DomainError(404, "station_not_found", "Station branch not found.");
    }

    if (!query) {
      return ok({ matches: [] });
    }

    // Search vehicles whose client has access to this station branch
    const vehicles = await prisma.clientVehicle.findMany({
      where: {
        tenantId: actor.tenantId,
        isActive: true,
        plateNumber: { contains: query.toUpperCase() },
        client: {
          status: "ACTIVE",
          allowedStations: {
            some: { stationId },
          },
        },
      },
      include: {
        client: {
          select: {
            id: true,
            companyName: true,
            email: true,
            phone: true,
            billingModel: true,
            depositBalance: true,
            outstandingDebt: true,
            creditLimit: true,
            approvalRequirement: true,
            approvalThresholdLiters: true,
            dailyMaxLiters: true,
            drivers: {
              where: { isActive: true },
              select: {
                id: true,
                fullName: true,
                phone: true,
                licenseNumber: true,
                driverPhotoUrl: true,
                idCardPhotoUrl: true,
              },
            },
          },
        },
      },
      take: 10,
    });

    const results = vehicles.map((v) => {
      const client = v.client;
      const availableBalance =
        client.billingModel === "PREPAID"
          ? Number(client.depositBalance)
          : Number(client.creditLimit) - Number(client.outstandingDebt);

      return {
        vehicle: {
          id: v.id,
          plateNumber: v.plateNumber,
          makeModel: v.makeModel,
          fuelType: v.fuelType,
          tankCapacity: Number(v.tankCapacity),
          dailyLimitLiters: v.dailyLimitLiters ? Number(v.dailyLimitLiters) : null,
        },
        client: {
          id: client.id,
          companyName: client.companyName || client.email,
          email: client.email,
          phone: client.phone,
          billingModel: client.billingModel,
          depositBalance: Number(client.depositBalance),
          outstandingDebt: Number(client.outstandingDebt),
          creditLimit: Number(client.creditLimit),
          availableHeadroom: Math.max(0, availableBalance),
          approvalRequirement: client.approvalRequirement,
          drivers: client.drivers,
        },
      };
    });

    return ok({ station, matches: results });
  } catch (e) {
    return handleError(e);
  }
}
