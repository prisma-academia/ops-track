import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { StockReportManager } from "./stock-report-manager";

export default async function StockReportPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STOCK_REPORTS_READ.key);

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
      delivery: {
        include: {
          transport: true,
        },
      },
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

  // Build flat rows — each row is one WaybillAllocation (one station delivery)
  const rows = await Promise.all(
    allocations.map(async (a, index) => {
      const deliveryQty = Number(a.litersToDispense);
      const productPrice = Number(a.costPerLiter);
      const transportationCost = Number(a.transportationCost);
      const deliveryCost = deliveryQty > 0 ? transportationCost / deliveryQty : 0; // transport cost per liter

      // Total delivery for this waybill = sum of all allocations on same waybill
      const totalDelivery = a.waybill.allocations.reduce(
        (sum, alloc) => sum + Number(alloc.litersToDispense),
        0
      );

      // Reconciliation computed values
      const reconciledQty = a.litersReceived ? Number(a.litersReceived) : null;
      // Stock value reflects what was actually received; falls back to the
      // dispatched quantity until the delivery has been reconciled.
      const stockValue = (reconciledQty ?? deliveryQty) * productPrice;
      let reconciledDate = a.deliveredAt ? a.deliveredAt.toISOString() : null;
      let reconciledDeposit: number | null = null;
      let totalExpense: number = 0;
      let pnl: number | null = null;

      // deliveries and Stock logic
      const approvedSalesLiters = a.delivery ? Number(a.delivery.litersDespatched) : null;
      const sellingPrice = a.delivery ? Number(a.delivery.amountPerLiter) : null;
      const salesRevenue = a.delivery ? Number(a.delivery.totalExpectedAmount) : null;

      const remainingLiters = (reconciledQty ?? deliveryQty) - (approvedSalesLiters ?? 0);
      const remainingStockValue = sellingPrice !== null ? remainingLiters * sellingPrice : null;

      // New logic for calculating Reconciled Date, Deposit, Total Expense, and PNL
      if (a.deliveredAt && reconciledQty !== null && reconciledQty > 0) {
        // Fetch approved deliveries logs from the delivery date onwards for this station & product
        const salesLogs = await prisma.salesLog.findMany({
          where: {
            stationId: a.stationId,
            productType: a.waybill.productType,
            status: "APPROVED",
            logDate: {
              gte: a.deliveredAt,
            },
          },
          orderBy: { logDate: "asc" },
        });

        let accumulatedLiters = 0;
        let depositSum = 0;
        let finalSalesDate: Date | null = null;
        let isFullySold = false;

        for (const log of salesLogs) {
          const liters = Number(log.litersSold);
          const price = Number(log.pricePerLiter);

          if (accumulatedLiters + liters >= reconciledQty) {
            // We reached the quantity
            const neededLiters = reconciledQty - accumulatedLiters;
            depositSum += neededLiters * price;
            accumulatedLiters += neededLiters;
            finalSalesDate = log.logDate;
            isFullySold = true;
            break;
          } else {
            depositSum += liters * price;
            accumulatedLiters += liters;
            finalSalesDate = log.logDate;
          }
        }

        reconciledDeposit = depositSum;

        if (isFullySold && finalSalesDate) {
          reconciledDate = finalSalesDate.toISOString();
        } else {
          reconciledDate = null;
        }

        const expenseEndDate = (isFullySold && finalSalesDate) 
          ? new Date(finalSalesDate.getTime()) 
          : new Date();
        expenseEndDate.setHours(23, 59, 59, 999);

        // Fetch total expense for this station between deliveredAt and reconciledDate
        const expenses = await prisma.expense.aggregate({
          where: {
            stationId: a.stationId,
            createdAt: {
              gte: a.deliveredAt,
              lte: expenseEndDate,
            },
          },
          _sum: {
            amount: true,
          },
        });
        
        totalExpense = Number(expenses._sum.amount || 0);
        pnl = reconciledDeposit - stockValue - totalExpense;
      }

      return {
        id: a.id,
        sn: index + 1,
        deliveryDate: a.waybill.dispatchedAt.toISOString(),
        truckNo: (a.delivery?.transport?.isOneTime ? a.delivery.transport.oneTimeTruckPlate : null) || a.waybill.truckPlate,
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
        approvedSalesLiters,
        sellingPrice,
        salesRevenue,
        remainingLiters,
        remainingStockValue,
      };
    })
  );

  const serialized = JSON.parse(JSON.stringify(rows));
  const serializedStations = JSON.parse(JSON.stringify(stations));

  return (
    <StockReportManager
      initialRows={serialized}
      stations={serializedStations}
    />
  );
}

