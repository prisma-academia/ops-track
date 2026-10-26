import {
  groupTransportLossByType,
  sumTransportLossLiters,
} from "@/lib/fleet/order-volume-metrics";
import { litersDeliveredFromSales } from "@/lib/fleet/transport-report";

type DeliverySlice = {
  litersDespatched?: unknown;
  litersReceived?: unknown;
};

type TransportMetricsInput = {
  litersDelivered?: unknown;
  litersLost?: unknown;
  deliveries?: DeliverySlice[];
  lossLogs?: Array<{ lossType?: string; lostQuantity?: unknown }>;
};

export function buildTransportSalesLossMetrics(transport: TransportMetricsInput) {
  const deliveries = transport.deliveries ?? [];
  const litersSold =
    litersDeliveredFromSales(deliveries) || Number(transport.litersDelivered || 0);
  const litersLost = sumTransportLossLiters(transport);
  const lossBreakdown = groupTransportLossByType(transport);
  const pendingDeliveries = deliveries.filter(
    (d) => d.litersReceived === null || d.litersReceived === undefined
  ).length;

  return {
    litersSold,
    litersLost,
    lossBreakdown,
    pendingDeliveries,
    salesCount: deliveries.length,
  };
}
