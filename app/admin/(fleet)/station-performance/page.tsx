import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { StationPerformanceClient } from "./station-performance-client";
import { s3Configured, publicUrlForKey } from "@/lib/storage/s3";

export default async function StationPerformancePage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_REPORTS_READ.key);

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    include: {
      organization: { select: { id: true, name: true, logoKey: true } },
      tanks: { select: { id: true, name: true, productType: true, capacity: true, currentLiters: true } },
      deliveries: {
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

  const formattedStations = stations.map((d) => {
    let logoUrl = null;
    if (d.organization?.logoKey) {
      logoUrl = d.organization.logoKey.startsWith("http")
        ? d.organization.logoKey
        : s3Configured()
        ? publicUrlForKey(d.organization.logoKey)
        : null;
    }

    const totalCapacity = d.tanks?.reduce((acc, t) => acc + Number(t.capacity || 0), 0);
    const currentStock = d.tanks?.reduce((acc, t) => acc + Number(t.currentLiters || 0), 0);
    const fillPercentage = totalCapacity > 0 ? Math.min(100, Math.round((currentStock / totalCapacity) * 100)) : 0;

    const litersSold = d.deliveries?.reduce((acc: number, delivery: any) => acc + Number(delivery.litersDespatched || 0), 0) || 0;
    const totalRevenue = d.deliveries?.reduce((acc: number, delivery: any) => acc + Number(delivery.totalExpectedAmount || 0), 0) || 0;
    const totalPaymentsReceived = d.deliveries?.reduce((acc: number, delivery: any) => acc + Number(delivery.paymentReceived || 0), 0) || 0;

    const litersOrdered = d.waybillAllocations?.reduce((acc: number, w: any) => acc + Number(w.litersToDispense || 0), 0) || 0;

    const oldestSale = d.deliveries && d.deliveries.length > 0 ? d.deliveries[d.deliveries.length - 1] : null;
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
      id: d.id,
      code: d.code,
      name: d.name,
      location: d.location || "N/A",
      organization: {
        id: d.organization.id,
        name: d.organization.name,
        logoUrl,
      },
      tanksCount: d.tanks.length,
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
