import type { FleetSettings } from "@/lib/fleet/fleet-settings";
import {
  classifyLossLogEconomicImpact,
  type LossEconomicImpact,
} from "@/lib/fleet/loss-attribution";
import type { OrderPnlOptions } from "@/lib/fleet/order-pnl-summary";
import type { TenantSettings } from "@/lib/tenant/settings";

export function getOrderPnlOptions(settings: TenantSettings): OrderPnlOptions {
  return {
    fleet: settings.fleet,
    useAttributionPnL: settings.fleet.useAttributionPnL,
  };
}

export function isCompanyPnlLossLog(
  log: {
    lossType: string;
    economicImpact?: string | null;
    lostQuantity?: unknown;
    expensesIncurred?: unknown;
  },
  fleet: FleetSettings
): boolean {
  const impact =
    (log.economicImpact as LossEconomicImpact | undefined) ??
    classifyLossLogEconomicImpact(
      {
        lossType: log.lossType,
        lostQuantity: log.lostQuantity ?? 0,
        expensesIncurred: log.expensesIncurred ?? 0,
        economicImpact: log.economicImpact as LossEconomicImpact | null | undefined,
      },
      fleet
    );
  return impact === "COMPANY_PNL";
}
