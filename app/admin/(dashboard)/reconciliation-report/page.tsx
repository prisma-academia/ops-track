import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { ReconciliationReportManager } from "./reconciliation-report-manager";

export default async function ReconciliationReportPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_WAYBILLS_READ.key);

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
  const rows = allocations.map((a, index) => {
    const deliveryQty = Number(a.litersToDispense);
    const deliveryCost = Number(a.costPerLiter);
    const stockValue = deliveryQty * deliveryCost;

    // Total delivery for this waybill = sum of all allocations on same waybill
    const totalDelivery = a.waybill.allocations.reduce(
      (sum, alloc) => sum + Number(alloc.litersToDispense),
      0
    );

    // Reconciliation computed values
    const reconciledQty = a.litersReceived ? Number(a.litersReceived) : null;
    const transportationCost = Number(a.transportationCost);
    const reconciledDeposit =
      reconciledQty !== null
        ? reconciledQty * deliveryCost + transportationCost
        : null;
    const pnl =
      reconciledQty !== null
        ? (deliveryQty - reconciledQty) * deliveryCost
        : null;

    return {
      id: a.id,
      sn: index + 1,
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
      reconciledDate: a.deliveredAt ? a.deliveredAt.toISOString() : null,
      reconciledDeposit,
      pnl,
      reconciledStation: a.station.name,
      reconciledQty,
      status: a.status,
    };
  });

  const serialized = JSON.parse(JSON.stringify(rows));
  const serializedStations = JSON.parse(JSON.stringify(stations));

  return (
    <ReconciliationReportManager
      initialRows={serialized}
      stations={serializedStations}
    />
  );
}
