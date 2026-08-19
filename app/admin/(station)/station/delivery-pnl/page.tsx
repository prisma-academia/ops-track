import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DeliveryPnlManager } from "./delivery-pnl-manager";

export default async function DeliveryPnlPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_STOCK_REPORTS_READ.key);

  const stations = await prisma.station.findMany({
    where: { tenantId: actor.tenantId },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" },
  });

  const allocations = await prisma.waybillAllocation.findMany({
    where: { 
      tenantId: actor.tenantId,
      deliveredAt: { not: null } 
    },
    orderBy: { deliveredAt: "asc" },
    include: {
      station: {
        select: { id: true, name: true, code: true }
      },
      waybill: {
        select: { truckPlate: true, productType: true }
      }
    }
  });

  const stationAllocationsMap = allocations.reduce((acc, alloc) => {
    if (!acc[alloc.stationId]) acc[alloc.stationId] = [];
    acc[alloc.stationId].push(alloc);
    return acc;
  }, {} as Record<string, typeof allocations>);

  const rows = [];

  for (const stationId of Object.keys(stationAllocationsMap)) {
    const stAllocations = stationAllocationsMap[stationId];
    
    for (let i = 0; i < stAllocations.length; i++) {
      const a = stAllocations[i];
      const cycleStart = a.deliveredAt!;
      const cycleEnd = i < stAllocations.length - 1 ? stAllocations[i + 1].deliveredAt! : new Date();

      const deliveryQty = a.litersReceived ? Number(a.litersReceived) : Number(a.litersToDispense);
      const costPerLiter = Number(a.costPerLiter || 0);
      const deliveryCost = deliveryQty * costPerLiter;

      const transactions = await prisma.transaction.findMany({
        where: {
          stationId: a.stationId,
          createdAt: {
            gte: cycleStart,
            lt: cycleEnd
          }
        },
        select: {
          type: true,
          amount: true
        }
      });

      let cycleRevenue = 0;
      let cycleExpenses = 0;

      for (const t of transactions) {
        const amt = Number(t.amount);
        if (t.type === "INFLOW") {
          cycleRevenue += amt;
        } else if (t.type === "OUTFLOW") {
          cycleExpenses += amt;
        }
      }

      const netProfit = cycleRevenue - deliveryCost - cycleExpenses;
      const margin = cycleRevenue > 0 ? (netProfit / cycleRevenue) * 100 : 0;

      rows.push({
        id: a.id,
        stationId: a.stationId,
        stationName: a.station.name,
        deliveryDate: cycleStart.toISOString(),
        cycleEndDate: cycleEnd.toISOString(),
        truckPlate: a.waybill.truckPlate,
        productType: a.waybill.productType,
        deliveryQty,
        purchasePrice: costPerLiter,
        deliveryCost,
        cycleRevenue,
        cycleExpenses,
        netProfit,
        margin
      });
    }
  }

  rows.sort((a, b) => new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime());
  const rowsWithSn = rows.map((r, i) => ({ ...r, sn: i + 1 }));

  return (
    <DeliveryPnlManager
      initialRows={rowsWithSn}
      stations={stations}
    />
  );
}
