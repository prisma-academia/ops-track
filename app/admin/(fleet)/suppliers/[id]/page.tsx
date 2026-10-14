import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Wallet, Landmark, Fuel } from "lucide-react";
import { cn, formatShortCurrency } from "@/lib/utils";
import { formatSupplierRow } from "@/lib/fleet/suppliers";
import { orderPaymentBalance, orderTotalPayable } from "@/lib/fleet/order-payables";
import { SupplierOrdersTable, type SupplierOrderRow } from "./supplier-orders-table";

function formatNaira(value: number) {
  return `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_SUPPLIERS_READ.key);

  const supplier = await prisma.supplier.findFirst({
    where: { id, tenantId: actor.tenantId },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!supplier) notFound();

  const formatted = formatSupplierRow(supplier);
  const orderRows: SupplierOrderRow[] = supplier.orders.map((o) => {
    const totalPayable = orderTotalPayable(o);
    const paid = o.paymentPaid.toNumber();
    return {
      id: o.id,
      reference: o.reference,
      productType: o.productType,
      litersOrdered: o.litersOrdered.toNumber(),
      totalPayable,
      paymentPaid: paid,
      balance: orderPaymentBalance({
        pricePerLitre: o.pricePerLitre,
        loadingCostPerLitre: o.loadingCostPerLitre,
        litersOrdered: o.litersOrdered,
        paymentPaid: o.paymentPaid,
      }),
      paymentStatus: o.paymentStatus,
      createdAt: o.createdAt.toISOString(),
    };
  });

  const initials = supplier.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const payUrl = `/admin/payments/new/outgoing/supplier?supplierId=${supplier.id}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border">
            <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{supplier.name}</h1>
            <p className="text-sm text-muted-foreground">
              {supplier.contactPerson || supplier.phone || "Product supplier"}
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href={payUrl}>Pay Supplier</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground flex items-center gap-2">
              <Landmark className="size-4" /> Amount Owed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn("text-2xl font-semibold", formatted.outstandingBalance > 0 && "text-rose-600")}>
              {formatShortCurrency(formatted.outstandingBalance)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{formatNaira(formatted.outstandingBalance)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground flex items-center gap-2">
              <Wallet className="size-4" /> Prepaid Deposit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-emerald-600">
              {formatShortCurrency(formatted.depositBalance)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground flex items-center gap-2">
              <Fuel className="size-4" /> Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{supplier.orders.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fleet Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <SupplierOrdersTable data={orderRows} supplierId={supplier.id} />
        </CardContent>
      </Card>
    </div>
  );
}
