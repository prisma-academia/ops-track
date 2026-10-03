import { requireTenantActor, PERMISSIONS } from "@/lib/auth/guards";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";
import { prisma } from "@/lib/db/client";
import { ok } from "@/lib/api/respond";
import { handleError } from "@/lib/api/errors";
import { ProductType } from "@/lib/generated/prisma/client";

function calcChange(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 1 : 0;
  return (curr - prev) / prev;
}

export async function GET(request: Request) {
  try {
    const actor = await requireTenantActor(PERMISSIONS.TENANT_STATIONS_READ.key, "STATION");
    const activeOrgId = await resolveActiveOrgId(actor);
    const url = new URL(request.url);

    const stationId = url.searchParams.get("stationId") || undefined;
    const productType = url.searchParams.get("productType") || undefined;
    const fromStr = url.searchParams.get("from");
    const toStr = url.searchParams.get("to");

    let fromDate = new Date();
    fromDate.setMonth(fromDate.getMonth() - 1);
    fromDate.setHours(0, 0, 0, 0);

    let toDate = new Date();
    toDate.setHours(23, 59, 59, 999);

    if (fromStr) {
      const p = new Date(fromStr);
      if (!isNaN(p.getTime())) {
        fromDate = p;
        fromDate.setHours(0, 0, 0, 0);
      }
    }

    if (toStr) {
      const p = new Date(toStr);
      if (!isNaN(p.getTime())) {
        toDate = p;
        toDate.setHours(23, 59, 59, 999);
      }
    }

    const stationWhere: any = {
      tenantId: actor.tenantId,
      ...(activeOrgId ? { organizationId: activeOrgId } : {}),
    };

    // Stations list for dropdown selector
    const stations = await prisma.station.findMany({
      where: stationWhere,
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });

    // 1. Stock Level Query
    const tankWhere: any = {
      tenantId: actor.tenantId,
      status: "ACTIVE",
      ...(activeOrgId ? { station: { organizationId: activeOrgId } } : {}),
    };

    if (stationId && stationId !== "ALL") {
      tankWhere.stationId = stationId;
    }

    if (productType && productType !== "ALL") {
      tankWhere.productType = productType as ProductType;
    }

    const tanks = await prisma.tank.findMany({
      where: tankWhere,
      select: {
        id: true,
        productType: true,
        currentLiters: true,
        capacity: true,
      },
    });

    let totalStockLiters = 0;
    let totalTankCapacity = 0;
    const stockByProduct: Record<string, number> = { PMS: 0, AGO: 0, DPK: 0, LPG: 0 };

    tanks.forEach((t) => {
      const liters = Number(t.currentLiters || 0);
      const cap = Number(t.capacity || 0);
      totalStockLiters += liters;
      totalTankCapacity += cap;
      if (t.productType in stockByProduct) {
        stockByProduct[t.productType] += liters;
      }
    });

    const stockUtilization = totalTankCapacity > 0 
      ? (totalStockLiters / totalTankCapacity) * 100 
      : 0;

    // 2. Sales Query
    const salesWhere: any = {
      tenantId: actor.tenantId,
      status: "APPROVED",
      logDate: { gte: fromDate, lte: toDate },
      ...(activeOrgId ? { station: { organizationId: activeOrgId } } : {}),
    };

    if (stationId && stationId !== "ALL") {
      salesWhere.stationId = stationId;
    }

    if (productType && productType !== "ALL") {
      salesWhere.productType = productType as ProductType;
    }

    // Previous period for trend calculation
    const periodMs = toDate.getTime() - fromDate.getTime();
    const prevToDate = new Date(fromDate.getTime() - 1);
    const prevFromDate = new Date(prevToDate.getTime() - periodMs);

    const prevSalesWhere: any = {
      ...salesWhere,
      logDate: { gte: prevFromDate, lte: prevToDate },
    };

    const [salesAgg, prevSalesAgg] = await Promise.all([
      prisma.salesLog.aggregate({
        where: salesWhere,
        _sum: { amountPos: true, amountTransfer: true, litersSold: true },
        _count: { id: true },
      }),
      prisma.salesLog.aggregate({
        where: prevSalesWhere,
        _sum: { amountPos: true, amountTransfer: true },
      }),
    ]);

    const totalSalesRevenue =
      Number(salesAgg._sum.amountPos || 0) + Number(salesAgg._sum.amountTransfer || 0);
    const prevSalesRevenue =
      Number(prevSalesAgg._sum.amountPos || 0) + Number(prevSalesAgg._sum.amountTransfer || 0);
    const totalLitersSold = Number(salesAgg._sum.litersSold || 0);
    const salesPercentageChange = calcChange(totalSalesRevenue, prevSalesRevenue);

    // 3. Waybill Remaining and Sold Query
    const waybillAllocWhere: any = {
      tenantId: actor.tenantId,
      ...(activeOrgId ? { station: { organizationId: activeOrgId } } : {}),
    };

    if (stationId && stationId !== "ALL") {
      waybillAllocWhere.stationId = stationId;
    }

    if (productType && productType !== "ALL") {
      waybillAllocWhere.waybill = { productType: productType as ProductType };
    }

    const waybillAllocations = await prisma.waybillAllocation.findMany({
      where: waybillAllocWhere,
      select: {
        id: true,
        litersToDispense: true,
        litersReceived: true,
        status: true,
      },
    });

    let totalWaybillVolume = 0;
    waybillAllocations.forEach((a) => {
      const qty = a.litersReceived ? Number(a.litersReceived) : Number(a.litersToDispense);
      totalWaybillVolume += qty;
    });

    // Remaining on station is current stock, sold is volume delivered - current stock
    const remainingLiters = Math.max(0, totalStockLiters);
    const soldLiters = Math.max(0, totalWaybillVolume > 0 ? totalWaybillVolume - remainingLiters : totalLitersSold);
    const remainingPct = totalWaybillVolume > 0 
      ? Math.min(100, Math.max(0, (remainingLiters / totalWaybillVolume) * 100))
      : 0;
    const soldPct = totalWaybillVolume > 0
      ? Math.min(100, Math.max(0, (soldLiters / totalWaybillVolume) * 100))
      : 0;

    return ok({
      stations,
      stockLevel: {
        totalLiters: totalStockLiters,
        totalCapacity: totalTankCapacity,
        utilizationPct: stockUtilization,
        byProduct: stockByProduct,
        tankCount: tanks.length,
      },
      sales: {
        totalRevenue: totalSalesRevenue,
        totalLitersSold,
        transactionCount: salesAgg._count.id || 0,
        percentageChange: salesPercentageChange,
      },
      remainingAndSold: {
        totalWaybillVolume,
        remainingLiters,
        soldLiters,
        remainingPct,
        soldPct,
        activeBatches: waybillAllocations.length,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}
