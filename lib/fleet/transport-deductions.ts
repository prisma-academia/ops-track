import type { FleetSettings } from "@/lib/fleet/fleet-settings";
import {
  classifyLossLogEconomicImpact,
  resolveShortageParty,
  shortageDeductionPerLiter,
  toNum,
  transporterRecoveryAmountFromLog,
  type LossLogLike,
  type OrderRates,
} from "@/lib/fleet/loss-attribution";
import type { SupplierType } from "@/lib/generated/prisma/client";

type VolumeDelivery = {
  litersDespatched: unknown;
  litersReceived: unknown;
  litersReturned?: unknown;
  shortageDeducted?: boolean | null;
};

function deliveryShortfall(d: VolumeDelivery): number {
  if (d.litersReceived === null || d.litersReceived === undefined) return 0;
  const committed = Math.max(0, toNum(d.litersDespatched) - toNum(d.litersReturned));
  return Math.max(0, committed - toNum(d.litersReceived));
}

export function computeTransporterFeeDeduction(args: {
  maintenanceCost: number;
  ratePerLiter: number;
  deliveries: VolumeDelivery[];
  lossLogs: LossLogLike[];
  supplierType: SupplierType | null | undefined;
  order: OrderRates;
  fleet: FleetSettings;
  sellingPrice: number;
}): { litersLost: number; totalDeduction: number; shortfallCharged: number } {
  const shortfallAll = args.deliveries.reduce((s, d) => s + deliveryShortfall(d), 0);
  const shortfallCharged = args.deliveries.reduce(
    (s, d) => s + (d.shortageDeducted === false ? 0 : deliveryShortfall(d)),
    0
  );

  const loggedLostQty = args.lossLogs.reduce((s, log) => s + toNum(log.lostQuantity), 0);
  const litersLost = loggedLostQty + shortfallAll;

  const party = resolveShortageParty(args.supplierType);
  const perLiter = shortageDeductionPerLiter(
    args.fleet,
    args.order,
    args.ratePerLiter,
    args.sellingPrice
  );

  let transporterShortfallDeduction = 0;
  if (party === "TRANSPORTER") {
    transporterShortfallDeduction = shortfallCharged * perLiter;
  }

  let logDeduction = 0;
  for (const log of args.lossLogs) {
    const impact = classifyLossLogEconomicImpact(log, args.fleet);
    if (impact === "TRANSPORTER_RECOVERY") {
      logDeduction += transporterRecoveryAmountFromLog(
        log,
        args.order,
        args.ratePerLiter,
        args.sellingPrice,
        args.fleet
      );
    }
  }

  const totalDeduction = args.maintenanceCost + transporterShortfallDeduction + logDeduction;

  return { litersLost, totalDeduction, shortfallCharged };
}
