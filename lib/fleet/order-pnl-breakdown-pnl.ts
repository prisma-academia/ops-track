import type { FleetSettings } from "@/lib/fleet/fleet-settings";
import { companyLossAmountFromLog } from "@/lib/fleet/loss-attribution";
import { isCompanyPnlLossLog } from "@/lib/fleet/pnl-options";
import type { OrderPnlTransportRow } from "@/lib/fleet/order-pnl-summary";

function toNum(value: unknown): number {
  return Number(value ?? 0) || 0;
}

/**
 * Matches the Profit / Loss column footer on the Transports & deliveries Breakdown table
 * (see buildFleetPnlDetailRows).
 */
export function sumOrderBreakdownPnl(
  transports: OrderPnlTransportRow[],
  priceBought: number,
  loadingCostPerLitre: number,
  fleet: FleetSettings,
  useAttribution: boolean
): number {
  const orderRates = { pricePerLitre: priceBought, loadingCostPerLitre };

  let total = 0;
  for (const transport of transports) {
    for (const delivery of transport.deliveries) {
      total += delivery.pnl;
    }

    const lossPnls: number[] = [];
    for (const log of transport.incidentLossLogs ?? []) {
      if (useAttribution && !isCompanyPnlLossLog(log, fleet)) continue;
      const qty = toNum(log.lostQuantity);
      const expenses = toNum(log.expensesIncurred);
      const tCost = useAttribution
        ? companyLossAmountFromLog(log, orderRates)
        : qty * priceBought + qty * loadingCostPerLitre + expenses;
      lossPnls.push(-tCost);
    }

    if (
      !useAttribution &&
      lossPnls.length === 0 &&
      (transport.incidentLossLiters ?? 0) > 0
    ) {
      const qty = transport.incidentLossLiters;
      const pCost = qty * priceBought;
      const lCost = qty * loadingCostPerLitre;
      lossPnls.push(-(pCost + lCost));
    }

    if (transport.deliveries.length === 0) {
      if (lossPnls.length > 0) {
        total += lossPnls.reduce((sum, p) => sum + p, 0);
      } else {
        const tripCost =
          transport.depotToPrimaryCost +
          transport.deliveryTransportCost +
          transport.fleetExpenses;
        total += -tripCost;
      }
    } else {
      total += lossPnls.reduce((sum, p) => sum + p, 0);
    }
  }

  return total;
}
