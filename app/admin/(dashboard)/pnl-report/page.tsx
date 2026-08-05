import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { PnlReportManager } from "./pnl-report-manager";

export default async function PnlReportPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_PNL_REPORTS_READ.key);

  const allocations = await prisma.waybillAllocation.findMany({
    where: { tenantId: actor.tenantId },
    orderBy: { waybill: { dispatchedAt: "desc" } },
    include: {
      station: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
      sale: true,
      waybill: {
        select: {
          id: true,
          number: true,
          truckPlate: true,
          productType: true,
          litersLoaded: true,
          dispatchedAt: true,
          allocations: {
            select: {
              litersToDispense: true,
            },
          },
        },
      },
    },
  });

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  // Pre-fetch all approved sales logs for the tenant
  const allSalesLogs = await prisma.salesLog.findMany({
    where: {
      tenantId: actor.tenantId,
      status: "APPROVED"
    },
    orderBy: { logDate: "asc" }
  });

  // Track remaining liters for each sales log
  const availableSalesLogs = allSalesLogs.map(log => ({
    ...log,
    availableLiters: Number(log.litersSold)
  }));

  // Sort allocations chronologically so oldest deliveries consume sales first
  const sortedAllocations = [...allocations].sort((a, b) => {
    const dateA = a.deliveredAt || a.waybill.dispatchedAt;
    const dateB = b.deliveredAt || b.waybill.dispatchedAt;
    return dateA.getTime() - dateB.getTime();
  });

  const unsortedRows = [];
  for (const a of sortedAllocations) {
    const deliveryQty = Number(a.litersToDispense);
    const productPrice = Number(a.costPerLiter);
    const transportationCost = Number(a.transportationCost);
    const deliveryCost = deliveryQty > 0 ? transportationCost / deliveryQty : 0;
    const stockValue = deliveryQty * productPrice;

    const totalDelivery = a.waybill.allocations.reduce(
      (sum, alloc) => sum + Number(alloc.litersToDispense),
      0
    );

    const reconciledQty = a.litersReceived ? Number(a.litersReceived) : null;
    let reconciledDate: string | null = null;
    let reconciledDeposit: number | null = null;
    let totalExpense: number = 0;
    let pnl: number | null = null;

    const buyingPrice = productPrice;
    const approvedSalesLiters = a.sale ? Number(a.sale.litersDespatched) : null;
    let sellingPrice: number | null = null;
    let salesRevenue: number | null = null;

    const remainingLiters = (reconciledQty ?? deliveryQty) - (approvedSalesLiters ?? 0);
    const remainingStockValue = sellingPrice !== null ? remainingLiters * sellingPrice : null;

    let amountSold = 0;
    let salesBreakdown: Array<{ id: string, date: string, liters: number, price: number, revenue: number }> = [];

    if (a.deliveredAt && reconciledQty !== null && reconciledQty > 0) {
      const eligibleLogs = availableSalesLogs.filter(log => 
        log.stationId === a.stationId &&
        log.productType === a.waybill.productType &&
        log.logDate >= a.deliveredAt! &&
        log.availableLiters > 0
      );

      let depositSum = 0;
      let finalSalesDate: Date | null = null;
      let isFullySold = false;
      let lastKnownPrice: number | null = null;

      for (const log of eligibleLogs) {
        const liters = log.availableLiters;
        const price = Number(log.pricePerLiter);
        lastKnownPrice = price;

        if (amountSold + liters >= reconciledQty) {
          const neededLiters = reconciledQty - amountSold;
          depositSum += neededLiters * price;
          amountSold += neededLiters;
          finalSalesDate = log.logDate;
          isFullySold = true;
          
          log.availableLiters -= neededLiters;

          salesBreakdown.push({
            id: log.id,
            date: log.logDate.toISOString(),
            liters: neededLiters,
            price: price,
            revenue: neededLiters * price
          });
          break;
        } else {
          depositSum += liters * price;
          amountSold += liters;
          finalSalesDate = log.logDate;

          log.availableLiters = 0;

          salesBreakdown.push({
            id: log.id,
            date: log.logDate.toISOString(),
            liters: liters,
            price: price,
            revenue: liters * price
          });
        }
      }

      reconciledDeposit = depositSum;
      salesRevenue = depositSum;
      if (lastKnownPrice !== null) sellingPrice = lastKnownPrice;

      if (isFullySold && finalSalesDate) {
        reconciledDate = finalSalesDate.toISOString();
      } else {
        reconciledDate = null;
      }

      const expenseEndDate = (isFullySold && finalSalesDate) 
        ? new Date(finalSalesDate.getTime()) 
        : new Date();
      expenseEndDate.setHours(23, 59, 59, 999);

      const expenses = await prisma.expense.aggregate({
        where: {
          stationId: a.stationId,
          createdAt: {
            gte: a.deliveredAt,
            lte: expenseEndDate,
          },
          status: "APPROVED",
        },
        _sum: {
          amount: true,
        },
      });
      
      totalExpense = Number(expenses._sum.amount || 0);
      pnl = reconciledDeposit - stockValue - totalExpense;
    }

      const expectedRevenue = sellingPrice !== null && reconciledQty !== null ? sellingPrice * reconciledQty : null;
      const remainToComplete = (reconciledQty ?? deliveryQty) - amountSold;

      unsortedRows.push({
        id: a.id,
        sn: 0, // Assigned later
        deliveryDate: a.waybill.dispatchedAt.toISOString(),
        truckNo: a.waybill.truckPlate,
        waybillNumber: a.waybill.number,
        productType: a.waybill.productType,
        stationId: a.stationId,
        stationName: a.station.name,
        stationCode: a.station.code,
        deliveryQty,
        totalDelivery,
        deliveryCost,
        stockValue,
        reconciledDate,
        reconciledDeposit,
        totalExpense,
        pnl,
        reconciledStation: a.station.name,
        reconciledQty,
        status: a.status,
        buyingPrice,
        approvedSalesLiters,
        sellingPrice,
        expectedRevenue,
        salesRevenue,
        amountSold,
        remainToComplete,
        remainingStockValue,
        salesBreakdown,
      });
  }

  // Sort rows ascending for default UI presentation (oldest first)
  unsortedRows.sort((a, b) => new Date(a.deliveryDate).getTime() - new Date(b.deliveryDate).getTime());
  
  const rows = unsortedRows.map((r, index) => ({ ...r, sn: index + 1 }));

  const serialized = JSON.parse(JSON.stringify(rows));
  const serializedStations = JSON.parse(JSON.stringify(stations));

  return (
    <PnlReportManager
      initialRows={serialized}
      stations={serializedStations}
    />
  );
}
