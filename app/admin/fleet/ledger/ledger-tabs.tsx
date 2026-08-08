"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LedgerTabs() {
  const pathname = usePathname();

  return (
    <Tabs value={pathname} className="w-full">
      <TabsList>
        <TabsTrigger value="/admin/fleet/ledger/sales" asChild>
          <Link href="/admin/fleet/ledger/sales">Sales</Link>
        </TabsTrigger>
        <TabsTrigger value="/admin/fleet/ledger/transports" asChild>
          <Link href="/admin/fleet/ledger/transports">Transport</Link>
        </TabsTrigger>
        <TabsTrigger value="/admin/fleet/ledger/expenses" asChild>
          <Link href="/admin/fleet/ledger/expenses">Expenses</Link>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
