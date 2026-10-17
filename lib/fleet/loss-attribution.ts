import type { SupplierType } from "@/lib/generated/prisma/client";
import type { ProductLossType } from "@/lib/fleet/loss-types";
import type { FleetSettings } from "@/lib/fleet/fleet-settings";
import { DEFAULT_COMPANY_LOSS_TYPES as DEFAULT_COMPANY_LOSS } from "@/lib/fleet/fleet-settings";

export type ShortageParty = "TRANSPORTER" | "SUPPLIER" | "UNCONFIGURED";

export type LossEconomicImpact =
  | "COMPANY_PNL"
  | "TRANSPORTER_RECOVERY"
  | "SUPPLIER_CREDIT"
  | "INFORMATIONAL";

export type LossLogSource = "MANUAL_LOG" | "DELIVERY_VARIANCE" | "SYSTEM_RECOMPUTE";

export type LossLogLike = {
  lossType: string;
  lostQuantity: unknown;
  expensesIncurred: unknown;
  economicImpact?: LossEconomicImpact | string | null;
  source?: LossLogSource | string | null;
};

export type OrderRates = {
  pricePerLitre: number;
  loadingCostPerLitre: number;
  supplierShortageLiters?: number;
};

export const DEFAULT_COMPANY_LOSS_TYPES = DEFAULT_COMPANY_LOSS;

export function landedCostPerLiter(order: OrderRates): number {
  return order.pricePerLitre + order.loadingCostPerLitre;
}

export function resolveShortageParty(
  supplierType: SupplierType | null | undefined
): ShortageParty {
  if (supplierType === "LOCAL") return "SUPPLIER";
  if (supplierType === "DEPOT") return "TRANSPORTER";
  return "UNCONFIGURED";
}

export function isCompanyLossType(lossType: string, fleet: FleetSettings): boolean {
  return fleet.companyLossTypes.includes(lossType as ProductLossType);
}

export function classifyLossLogEconomicImpact(
  log: LossLogLike,
  fleet: FleetSettings
): LossEconomicImpact {
  if (log.economicImpact) return log.economicImpact as LossEconomicImpact;

  if (log.lossType === "SHORTAGE") {
    if (log.source === "DELIVERY_VARIANCE") return "TRANSPORTER_RECOVERY";
    return "TRANSPORTER_RECOVERY";
  }

  if (log.lossType === "MAINTENANCE") return "INFORMATIONAL";

  if (isCompanyLossType(log.lossType, fleet)) return "COMPANY_PNL";

  return "INFORMATIONAL";
}

export function toNum(value: unknown): number {
  return Number(value ?? 0) || 0;
}

export function companyLossAmountFromLog(log: LossLogLike, order: OrderRates): number {
  const qty = toNum(log.lostQuantity);
  const expenses = toNum(log.expensesIncurred);
  return qty * landedCostPerLiter(order) + expenses;
}

export function shortageDeductionPerLiter(
  fleet: FleetSettings,
  order: OrderRates,
  transportRate: number,
  sellingPrice: number
): number {
  switch (fleet.shortageDeductionBasis) {
    case "TRANSPORT_RATE":
      return transportRate;
    case "SELLING_PRICE":
      return sellingPrice > 0 ? sellingPrice : landedCostPerLiter(order);
    case "LANDED_COST":
    default:
      return landedCostPerLiter(order);
  }
}

export function transporterRecoveryAmountFromLog(
  log: LossLogLike,
  order: OrderRates,
  transportRate: number,
  sellingPrice: number,
  fleet: FleetSettings
): number {
  const expenses = toNum(log.expensesIncurred);
  if (expenses > 0 && log.lossType === "SHORTAGE") return expenses;
  const qty = toNum(log.lostQuantity);
  const perLiter = shortageDeductionPerLiter(fleet, order, transportRate, sellingPrice);
  return qty * perLiter + expenses;
}

export function filterCompanyLossLogs<T extends LossLogLike>(
  logs: T[],
  fleet: FleetSettings
): T[] {
  return logs.filter((log) => classifyLossLogEconomicImpact(log, fleet) === "COMPANY_PNL");
}

export function sumCompanyLossAmount(
  logs: LossLogLike[],
  order: OrderRates,
  fleet: FleetSettings
): number {
  return filterCompanyLossLogs(logs, fleet).reduce(
    (sum, log) => sum + companyLossAmountFromLog(log, order),
    0
  );
}

export function economicImpactForManualLossLog(
  lossType: string,
  fleet: FleetSettings
): LossEconomicImpact {
  if (lossType === "SHORTAGE") return "TRANSPORTER_RECOVERY";
  if (lossType === "MAINTENANCE") return "INFORMATIONAL";
  if (isCompanyLossType(lossType, fleet)) return "COMPANY_PNL";
  return "INFORMATIONAL";
}
