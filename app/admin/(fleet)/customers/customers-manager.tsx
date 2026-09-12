"use client";

import { CustomersTable, type CustomerRow } from "./table";

export { CustomersTable, type CustomerRow };

export function CustomersManager({
  initialCustomers,
  initialMeta,
}: {
  initialCustomers: CustomerRow[];
  initialMeta: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}) {
  return <CustomersTable initialData={initialCustomers} initialMeta={initialMeta} />;
}
