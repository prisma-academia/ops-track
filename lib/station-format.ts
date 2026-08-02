import { prisma } from "@/lib/db/client";

export const stationIncludeQuery = {
  _count: {
    select: { staff: true, tanks: true, pumps: true, tickets: true },
  },
  tanks: {
    select: { 
      productType: true, 
      currentLiters: true,
      dippingSessions: {
        orderBy: { openedAt: "desc" as const },
        take: 1,
        select: {
          closings: {
            orderBy: { recordedAt: "desc" as const },
            take: 1,
            select: { closingLiters: true }
          }
        }
      }
    },
  },
  SalesLogs: {
    where: { status: "APPROVED" as const },
    orderBy: { logDate: "desc" as const },
    take: 1,
    select: { amountPos: true, amountTransfer: true },
  },
  waybillAllocations: {
    orderBy: { createdAt: "desc" as const },
    take: 1,
    select: { waybill: { select: { dispatchedAt: true } } },
  },
};

export async function formatStationRows(rawRows: any[]) {
  const stationIds = rawRows.map((s) => s.id);
  
  // Calculate balances (All time)
  const allStationLogs = await prisma.salesLog.findMany({
    where: { stationId: { in: stationIds }, status: { not: "REJECTED" } },
    select: { stationId: true, litersSold: true, pricePerLiter: true, amountPos: true, amountTransfer: true }
  });

  const balanceByStation = allStationLogs.reduce((acc, log) => {
    const expected = Number(log.litersSold) * Number(log.pricePerLiter);
    const collected = Number(log.amountPos) + Number(log.amountTransfer);
    const balance = collected - expected;
    acc[log.stationId] = (acc[log.stationId] || 0) + balance;
    return acc;
  }, {} as Record<string, number>);

  // Calculate Today's Sales
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  
  const todayLogs = await prisma.salesLog.findMany({
    where: {
      stationId: { in: stationIds },
      status: "APPROVED",
      logDate: { gte: startOfToday }
    },
    select: { stationId: true, productType: true, amountPos: true, amountTransfer: true }
  });
  
  const todaySalesByStation = todayLogs.reduce((acc, log) => {
    const sid = log.stationId;
    const prod = log.productType as "PMS" | "AGO" | "LPG";
    if (!acc[sid]) acc[sid] = { PMS: 0, AGO: 0, LPG: 0 };
    const totalAmount = Number(log.amountPos) + Number(log.amountTransfer);
    acc[sid][prod] = (acc[sid][prod] || 0) + totalAmount;
    return acc;
  }, {} as Record<string, { PMS: number; AGO: number; LPG: number }>);

  return rawRows.map((s) => {
    let pmsLiters = 0;
    let agoLiters = 0;
    let lpgLiters = 0;
    let lastClosingStock = 0;

    s.tanks.forEach((t: any) => {
      if (t.productType === "PMS") pmsLiters += Number(t.currentLiters);
      if (t.productType === "AGO") agoLiters += Number(t.currentLiters);
      if (t.productType === "LPG") lpgLiters += Number(t.currentLiters);
      
      const lastSession = t.dippingSessions?.[0];
      if (lastSession && lastSession.closings?.[0]) {
        lastClosingStock += Number(lastSession.closings[0].closingLiters);
      }
    });

    const lastSales = s.SalesLogs?.[0];
    const lastSalesAmount = lastSales
      ? Number(lastSales.amountPos) + Number(lastSales.amountTransfer)
      : 0;

    const lastWaybillDate = s.waybillAllocations?.[0]?.waybill?.dispatchedAt?.toISOString() || null;
    const todaySales = todaySalesByStation[s.id] || { PMS: 0, AGO: 0, LPG: 0 };

    return {
      id: s.id,
      code: s.code,
      name: s.name,
      pmsLiters,
      agoLiters,
      lpgLiters,
      lastSalesAmount,
      lastWaybillDate,
      derivedBalance: balanceByStation[s.id] || 0,
      todaySales,
      lastClosingStock,
    };
  });
}
