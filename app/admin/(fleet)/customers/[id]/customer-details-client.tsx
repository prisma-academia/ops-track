"use client";

import { CustomerDeliveriesTable, type CustomerDeliveryRow } from "./customer-deliveries-table";

export { CustomerDeliveriesTable, type CustomerDeliveryRow };

export function CustomerDetailsClient({ deliveries }: { deliveries: CustomerDeliveryRow[] }) {
  return <CustomerDeliveriesTable data={deliveries} />;
}
