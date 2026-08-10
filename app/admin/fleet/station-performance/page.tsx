import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { StationPerformanceClient } from "./station-performance-client";
import { s3Configured, publicUrlForKey } from "@/lib/storage/s3";

export default async function StationPerformancePage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_ORDERS_READ.key);

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    include: {
      organization: { select: { id: true, name: true, logoKey: true } },
      tanks: { select: { id: true, name: true, productType: true, capacity: true, currentLiters: true } },
      stationSales: {
        select: {
          id: true,
          litersDespatched: true,
          totalExpectedAmount: true,
          paymentReceived: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      waybillAllocations: {
        select: {
          id: true,
          litersToDispense: true,
          status: true,
          createdAt: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const formattedStations = stations.map((s) => {
    let logoUrl = null;
    if (s.organization?.logoKey) {
      logoUrl = s.organization.logoKey.startsWith("http")
        ? s.organization.logoKey
        : s3Configured()
        ? publicUrlForKey(s.organization.logoKey)
        : null;
    }

    const totalCapacity = s.tanks.reduce((acc, t) => acc + Number(t.capacity || 0), 0);
    const currentStock = s.tanks.reduce((acc, t) => acc + Number(t.currentLiters || 0), 0);
    const fillPercentage = totalCapacity > 0 ? Math.min(100, Math.round((currentStock / totalCapacity) * 100)) : 0;

    const litersSold = s.stationSales.reduce((acc, sale) => acc + Number(sale.litersDespatched || 0), 0);
    const totalRevenue = s.stationSales.reduce((acc, sale) => acc + Number(sale.totalExpectedAmount || 0), 0);
    const totalPaymentsReceived = s.stationSales.reduce((acc, sale) => acc + Number(sale.paymentReceived || 0), 0);

    const litersOrdered = s.waybillAllocations.reduce((acc, w) => acc + Number(w.litersToDispense || 0), 0);

    const oldestSale = s.stationSales[s.stationSales.length - 1];
    const daysActive = oldestSale
      ? Math.max(1, Math.ceil((Date.now() - new Date(oldestSale.createdAt).getTime()) / (1000 * 60 * 60 * 24)))
      : 1;

    const dailySalesVelocity = litersSold > 0 ? Math.round(litersSold / Math.min(30, daysActive)) : 0;
    const daysStockRemaining = dailySalesVelocity > 0 ? Math.round((currentStock / dailySalesVelocity) * 10) / 10 : (currentStock > 0 ? 99 : 0);

    let priority: "CRITICAL" | "HIGH" | "MEDIUM" | "ADEQUATE" = "ADEQUATE";
    if (fillPercentage < 20 || daysStockRemaining < 3) {
      priority = "CRITICAL";
    } else if (fillPercentage < 40 || daysStockRemaining < 7) {
      priority = "HIGH";
    } else if (fillPercentage < 65) {
      priority = "MEDIUM";
    }

    const targetStock = totalCapacity * 0.85;
    const rawDeficit = Math.max(0, targetStock - currentStock);
    const recommendedAllocation = Math.round(rawDeficit / 1000) * 1000;

    return {
      id: s.id,
      code: s.code,
      name: s.name,
      location: s.location || "N/A",
      organization: {
        id: s.organization.id,
        name: s.organization.name,
        logoUrl,
      },
      tanksCount: s.tanks.length,
      totalCapacity,
      currentStock,
      fillPercentage,
      litersSold,
      totalRevenue,
      totalPaymentsReceived,
      litersOrdered,
      dailySalesVelocity,
      daysStockRemaining,
      priority,
      recommendedAllocation,
    };
  });

  return <StationPerformanceClient initialStations={formattedStations} />;
}
