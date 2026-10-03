import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { resolveActiveOrgId } from "@/lib/auth/org-scope";
import { SalesPnlManager } from "./sales-pnl-manager";

export default async function SalesPnlPage() {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_SALES_REPORTS_READ.key);
  const activeOrgId = await resolveActiveOrgId(actor);

  const stationWhere: any = {
    tenantId: actor.tenantId,
    ...(activeOrgId ? { organizationId: activeOrgId } : {}),
  };

  const salesWhere: any = {
    tenantId: actor.tenantId,
    status: "APPROVED",
    isDebtRepayment: false,
    ...(activeOrgId ? { station: { organizationId: activeOrgId } } : {}),
  };

  const allocationWhere: any = {
    tenantId: actor.tenantId,
    deliveredAt: { not: null },
    ...(activeOrgId ? { station: { organizationId: activeOrgId } } : {}),
  };

  const expenseWhere: any = {
    tenantId: actor.tenantId,
    context: "STATION",
    status: { not: "REJECTED" },
    ...(activeOrgId ? { station: { organizationId: activeOrgId } } : {}),
  };

  const [stations, salesLogs, waybillAllocations, expenses] = await Promise.all([
    prisma.station.findMany({
      where: stationWhere,
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: "asc" },
    }),
    prisma.salesLog.findMany({
      where: salesWhere,
      orderBy: { logDate: "desc" },
      select: {
        id: true,
        stationId: true,
        productType: true,
        litersSold: true,
        pricePerLiter: true,
        amountPos: true,
        amountTransfer: true,
        appliedCredit: true,
        logDate: true,
        createdAt: true,
        station: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    }),
    prisma.waybillAllocation.findMany({
      where: allocationWhere,
      orderBy: { deliveredAt: "desc" },
      select: {
        id: true,
        stationId: true,
        costPerLiter: true,
        litersToDispense: true,
        litersReceived: true,
        transportationCost: true,
        deliveredAt: true,
        waybill: {
          select: {
            productType: true,
            truckPlate: true,
          },
        },
      },
    }),
    prisma.expense.findMany({
      where: expenseWhere,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        stationId: true,
        category: true,
        paymentMethod: true,
        amount: true,
        description: true,
        receiptUrl: true,
        status: true,
        createdAt: true,
        station: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    }),
  ]);

  const serializedStations = JSON.parse(JSON.stringify(stations));
  const serializedSales = JSON.parse(JSON.stringify(salesLogs));
  const serializedAllocations = JSON.parse(JSON.stringify(waybillAllocations));
  const serializedExpenses = JSON.parse(JSON.stringify(expenses));

  return (
    <SalesPnlManager
      stations={serializedStations}
      salesLogs={serializedSales}
      allocations={serializedAllocations}
      expenses={serializedExpenses}
    />
  );
}
