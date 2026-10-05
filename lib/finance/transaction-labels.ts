const TRANSACTION_CATEGORY_LABELS: Record<string, string> = {
  TRANSPORT_PAYMENT: "Transport Payment",
  CLIENT_PAYMENT: "Client Payment",
  PRODUCT_SUPPLY: "Product Supply",
  STATION_SALE: "Station Sale",
  STATION_EXPENSE: "Station Expense",
  FLEET_EXPENSE: "Fleet Expense",
  EXPENSE: "Expense",
  OTHER_INFLOW: "Other Inflow",
  OTHER_OUTFLOW: "Other Outflow",
  OTHER: "Other",
  ASSET_PURCHASE: "Asset Purchase",
  SALARY_PAYMENT: "Salary Payment",
};

export function formatTransactionCategoryLabel(category: string): string {
  if (TRANSACTION_CATEGORY_LABELS[category]) {
    return TRANSACTION_CATEGORY_LABELS[category];
  }
  return category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function resolveTransactionCounterpartyName(transaction: {
  customer?: { name: string } | null;
  station?: { name: string; code?: string | null } | null;
  transporter?: { name: string } | null;
  organization?: { name: string } | null;
  truck?: { plateNumber?: string | null; name?: string | null } | null;
  order?: { reference?: string | null; supplier?: string | null } | null;
  transport?: {
    id?: string;
    destination?: string | null;
    isOneTime?: boolean;
    oneTimeTransporterName?: string | null;
    oneTimeTruckPlate?: string | null;
    transporter?: { name: string } | null;
    truck?: { plateNumber?: string | null; name?: string | null } | null;
    order?: { reference?: string | null; supplier?: string | null } | null;
  } | null;
  delivery?: {
    customer?: { name: string } | null;
    station?: { name: string; code?: string | null } | null;
    organization?: { name: string } | null;
    transport?: {
      destination?: string | null;
      oneTimeTransporterName?: string | null;
      transporter?: { name: string } | null;
    } | null;
  } | null;
  description?: string | null;
  paymentPurpose?: string | null;
}): string | null {
  if (transaction.customer?.name) return transaction.customer.name;
  if (transaction.organization?.name) return transaction.organization.name;
  if (transaction.station?.name) {
    return transaction.station.code
      ? `${transaction.station.name} (${transaction.station.code})`
      : transaction.station.name;
  }
  if (transaction.delivery?.customer?.name) return transaction.delivery.customer.name;
  if (transaction.delivery?.organization?.name) return transaction.delivery.organization.name;
  if (transaction.delivery?.station?.name) {
    const station = transaction.delivery.station;
    return station.code ? `${station.name} (${station.code})` : station.name;
  }
  if (transaction.transporter?.name) return transaction.transporter.name;
  if (transaction.transport?.transporter?.name) return transaction.transport.transporter.name;
  if (transaction.transport?.oneTimeTransporterName) {
    return `${transaction.transport.oneTimeTransporterName} (One-Time)`;
  }
  if (transaction.delivery?.transport?.transporter?.name) {
    return transaction.delivery.transport.transporter.name;
  }
  if (transaction.delivery?.transport?.oneTimeTransporterName) {
    return `${transaction.delivery.transport.oneTimeTransporterName} (One-Time)`;
  }
  if (transaction.order?.supplier) return transaction.order.supplier;
  if (transaction.transport?.order?.supplier) return transaction.transport.order.supplier;
  if (transaction.truck?.plateNumber || transaction.truck?.name) {
    return transaction.truck.plateNumber || transaction.truck.name || null;
  }
  if (transaction.transport?.truck?.plateNumber || transaction.transport?.truck?.name) {
    return transaction.transport.truck.plateNumber || transaction.transport.truck.name || null;
  }
  if (transaction.transport?.destination) {
    return `Transport: ${transaction.transport.destination}`;
  }
  if (transaction.description) return transaction.description;
  if (transaction.paymentPurpose) return transaction.paymentPurpose;
  if (transaction.order?.reference) return `Order ${transaction.order.reference}`;
  return null;
}

