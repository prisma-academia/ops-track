import { litersDeliveredFromSales } from "@/lib/fleet/transport-report";

type TransportWithLoss = {
  status?: string;
  litersLost?: unknown;
  litersDelivered?: unknown;
  deliveries?: Array<{ litersDespatched?: unknown; litersReceived?: unknown }>;
  lossLogs?: Array<{ lostQuantity?: unknown; lossType?: string }>;
};

export function sumTransportLossLiters(transport: TransportWithLoss): number {
  const fromLogs = (transport.lossLogs ?? []).reduce(
    (sum, log) => sum + Number(log.lostQuantity || 0),
    0
  );
  return Math.max(Number(transport.litersLost || 0), fromLogs);
}

export function groupTransportLossByType(
  transport: TransportWithLoss
): { type: string; liters: number }[] {
  const map = new Map<string, number>();
  for (const log of transport.lossLogs ?? []) {
    const type = String(log.lossType || "OTHERS");
    map.set(type, (map.get(type) ?? 0) + Number(log.lostQuantity || 0));
  }
  const fieldLoss = Number(transport.litersLost || 0);
  if (fieldLoss > 0 && map.size === 0) {
    map.set("OTHERS", fieldLoss);
  }
  return Array.from(map.entries())
    .map(([type, liters]) => ({ type, liters }))
    .filter((row) => row.liters > 0)
    .sort((a, b) => b.liters - a.liters);
}

export function sumLitersSoldFromTransports(transports: TransportWithLoss[]): number {
  return transports
    .filter((t) => t.status !== "CANCELLED")
    .reduce((sum, transport) => {
      const fromDeliveries = litersDeliveredFromSales(transport.deliveries ?? []);
      if (fromDeliveries > 0) return sum + fromDeliveries;
      return sum + Number(transport.litersDelivered || 0);
    }, 0);
}

export function sumOrderLossLiters(transports: TransportWithLoss[]): number {
  return transports
    .filter((t) => t.status !== "CANCELLED")
    .reduce((sum, t) => sum + sumTransportLossLiters(t), 0);
}

export function soldVolumeBreakdown(
  litersOrdered: number,
  litersSold: number,
  litersLost: number
) {
  const ordered = Math.max(0, litersOrdered);
  const sold = Math.min(ordered, Math.max(0, litersSold));
  const loss = Math.min(ordered, Math.max(0, litersLost));
  const remainingToSell = Math.max(0, ordered - sold - loss);
  const soldProgress = ordered > 0 ? Math.min(100, Math.round((sold / ordered) * 100)) : 0;
  const lossProgress = ordered > 0 ? Math.min(100, Math.round((loss / ordered) * 100)) : 0;
  const remainingProgress =
    ordered > 0 ? Math.min(100, Math.round((remainingToSell / ordered) * 100)) : 0;

  return {
    sold,
    loss,
    remainingToSell,
    soldProgress,
    lossProgress,
    remainingProgress,
  };
}
