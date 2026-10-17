import { prisma } from "@/lib/db/client";
import { computeSupplierFinancialMetrics } from "@/lib/fleet/supplier-metrics";
import { formatSupplierRow } from "@/lib/fleet/suppliers";
import { parseTenantSettings } from "@/lib/tenant/settings";

export const supplierMetricsOrderInclude = {
  orders: {
    select: {
      reference: true,
      sourceDepot: true,
      productType: true,
      litersOrdered: true,
      pricePerLitre: true,
      loadingCostPerLitre: true,
      supplierShortageLiters: true,
      paymentPaid: true,
      createdAt: true,
      transports: {
        select: {
          ratePerLiter: true,
          litersCarried: true,
          maintenanceCost: true,
          lossLogs: {
            select: {
              lossType: true,
              economicImpact: true,
              lostQuantity: true,
              expensesIncurred: true,
            },
          },
          deliveries: {
            select: {
              id: true,
              litersDespatched: true,
              litersReceived: true,
              amountPerLiter: true,
              totalExpectedAmount: true,
              paymentReceived: true,
              transportRate: true,
              transportCost: true,
              transportCostBorneBy: true,
              status: true,
              createdAt: true,
            },
          },
        },
      },
    },
  },
};

export async function mapSupplierListRow(
  supplier: Parameters<typeof formatSupplierRow>[0] & { id: string; orders?: unknown[] },
  tenantId: string,
  settingsJson: unknown
) {
  const settings = parseTenantSettings(settingsJson);
  const paidFromTx = await prisma.transaction.aggregate({
    where: {
      tenantId,
      supplierId: supplier.id,
      type: "OUTFLOW",
      category: { in: ["SUPPLIER_PAYMENT", "PRODUCT_SUPPLY"] },
    },
    _sum: { amount: true },
  });
  const txPaid = Math.abs(Number(paidFromTx._sum.amount ?? 0));
  const metrics = computeSupplierFinancialMetrics(
    (supplier.orders ?? []) as Parameters<typeof computeSupplierFinancialMetrics>[0],
    txPaid,
    settings
  );

  return {
    ...formatSupplierRow(supplier),
    amountPaid: metrics.amountPaid,
    totalExpectedAmount: metrics.totalExpectedAmount,
    saleProfit: metrics.saleProfit,
    companyLoss: metrics.companyLoss,
  };
}

export type SupplierListTotals = {
  totalExpectedAmount: number;
  amountPaid: number;
  outstandingBalance: number;
  saleProfit: number;
  depositBalance: number;
};

export function aggregateSupplierListTotals(
  rows: Array<{
    totalExpectedAmount?: number;
    amountPaid?: number;
    outstandingBalance: number;
    saleProfit?: number;
    depositBalance: number;
  }>
): SupplierListTotals {
  return rows.reduce<SupplierListTotals>(
    (acc, row) => {
      acc.totalExpectedAmount += Number(row.totalExpectedAmount ?? 0);
      acc.amountPaid += Number(row.amountPaid ?? 0);
      acc.outstandingBalance += Number(row.outstandingBalance ?? 0);
      acc.saleProfit += Number(row.saleProfit ?? 0);
      acc.depositBalance += Number(row.depositBalance ?? 0);
      return acc;
    },
    {
      totalExpectedAmount: 0,
      amountPaid: 0,
      outstandingBalance: 0,
      saleProfit: 0,
      depositBalance: 0,
    }
  );
}
