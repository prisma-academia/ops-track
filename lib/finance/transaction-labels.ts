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
  delivery?: {
    customer?: { name: string } | null;
    station?: { name: string; code?: string | null } | null;
  } | null;
}): string | null {
  if (transaction.customer?.name) return transaction.customer.name;
  if (transaction.station?.name) {
    return transaction.station.code
      ? `${transaction.station.name} (${transaction.station.code})`
      : transaction.station.name;
  }
  if (transaction.delivery?.customer?.name) return transaction.delivery.customer.name;
  if (transaction.delivery?.station?.name) {
    const station = transaction.delivery.station;
    return station.code ? `${station.name} (${station.code})` : station.name;
  }
  if (transaction.transporter?.name) return transaction.transporter.name;
  return null;
}
