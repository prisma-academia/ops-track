import { calculateOrderPnlSummary, type OrderPnlOrder } from "@/lib/fleet/order-pnl-summary";
import { orderTotalPayable } from "@/lib/fleet/order-payables";
import { getOrderPnlOptions } from "@/lib/fleet/pnl-context";
import type { TenantSettings } from "@/lib/tenant/settings";

type SupplierOrderSlice = {
  paymentPaid: { toNumber(): number } | number;
  reference: string | null;
  sourceDepot: string | null;
  productType: string;
  litersOrdered: unknown;
  pricePerLitre: unknown;
  loadingCostPerLitre: unknown;
  supplierShortageLiters?: unknown;
  createdAt: Date;
  transports: Array<{
    ratePerLiter: unknown;
    litersCarried?: unknown;
    maintenanceCost?: unknown;
    lossLogs: Array<{
      lossType: string;
      economicImpact?: string | null;
      lostQuantity: unknown;
      expensesIncurred: unknown;
    }>;
    deliveries: Array<{
      id: string;
      litersDespatched: unknown;
      litersReceived?: unknown;
      amountPerLiter: unknown;
      totalExpectedAmount: unknown;
      paymentReceived: unknown;
      transportRate?: unknown;
      transportCost?: unknown;
      transportCostBorneBy?: string | null;
      status: string;
      createdAt: Date;
    }>;
  }>;
};

export function computeSupplierFinancialMetrics(
  orders: SupplierOrderSlice[],
  supplierTransactionsPaid: number,
  settings: TenantSettings
) {
  const pnlOptions = getOrderPnlOptions(settings);
  let amountPaid = supplierTransactionsPaid;
  let totalExpectedAmount = 0;
  let saleProfit = 0;
  let companyLoss = 0;

  for (const order of orders) {
    totalExpectedAmount += orderTotalPayable({
      pricePerLitre: Number(order.pricePerLitre),
      loadingCostPerLitre: Number(order.loadingCostPerLitre),
      litersOrdered: Number(order.litersOrdered),
      supplierShortageLiters: order.supplierShortageLiters != null
        ? Number(order.supplierShortageLiters)
        : null,
    });
    amountPaid += Number(order.paymentPaid);

    const pnlOrder = {
      id: "aggregate",
      reference: order.reference,
      sourceDepot: order.sourceDepot,
      productType: order.productType,
      litersOrdered: order.litersOrdered,
      pricePerLitre: order.pricePerLitre,
      loadingCostPerLitre: order.loadingCostPerLitre,
      supplierShortageLiters: order.supplierShortageLiters,
      createdAt: order.createdAt,
      transports: order.transports.map((t) => ({
        id: "t",
        ratePerLiter: t.ratePerLiter,
        litersCarried: t.litersCarried,
        maintenanceCost: t.maintenanceCost,
        deliveries: t.deliveries.map((d) => ({
          ...d,
          createdAt: d.createdAt,
        })),
        lossLogs: t.lossLogs,
      })),
    } as OrderPnlOrder;

    const result = calculateOrderPnlSummary(pnlOrder, pnlOptions);
    saleProfit += result.summary.pnl;
    companyLoss += result.summary.totalLossAmount;
  }

  return { amountPaid, totalExpectedAmount, saleProfit, companyLoss };
}
