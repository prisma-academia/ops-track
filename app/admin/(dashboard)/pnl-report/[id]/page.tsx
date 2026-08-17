import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { formatShortCurrency } from "@/lib/utils";
import { ArrowLeft, Truck, CheckCircle2, History, Receipt, Banknote, MapPin } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function PnlReportDetailsPage({ params }: { params: { id: string } }) {
  const actor = await requireTenantPage(PERMISSIONS.TENANT_PNL_REPORTS_READ.key);

  const allocation = await prisma.waybillAllocation.findFirst({
    where: { id: params.id, tenantId: actor.tenantId },
    include: {
      station: true,
      waybill: {
        include: {
          recordedBy: true
        }
      },
      delivery: true,
    },
  });

  if (!allocation) {
    notFound();
  }

  // Same calculations as in the main P&L report
  const deliveryQty = Number(allocation.litersToDispense);
  const productPrice = Number(allocation.costPerLiter);
  const stockValue = deliveryQty * productPrice;
  const transportationCost = Number(allocation.transportationCost);

  const reconciledQty = allocation.litersReceived ? Number(allocation.litersReceived) : null;
  
  // Fetch expenses
  const expenses = await prisma.expense.findMany({
    where: {
      stationId: allocation.stationId,
      status: "APPROVED",
      createdAt: {
        gte: allocation.deliveredAt || new Date(0),
      }
    },
    orderBy: { createdAt: 'asc' }
  });
  
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  // Note: True accurate matching of deliveries requires chronological processing of all deliveries. 
  // For the details view, we can just show the total deliveries logs since delivery that might be related,
  // or we can just omit the complex exact breakdown logic since it spans multiple deliveries.
  // We'll show the fetched deliveries logs for this station & product from delivery date.
  const salesLogs = await prisma.salesLog.findMany({
    where: {
      stationId: allocation.stationId,
      productType: allocation.waybill.productType,
      status: "APPROVED",
      logDate: {
        gte: allocation.deliveredAt || new Date(0),
      },
    },
    orderBy: { logDate: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/pnl-report">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">P&L Report Details</h1>
          <p className="text-sm text-muted-foreground">Detailed breakdown for Waybill #{allocation.waybill.number}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="size-5 text-muted-foreground" />
              Delivery Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Waybill No.</p>
                <p className="font-semibold">{allocation.waybill.number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Truck Plate</p>
                <p className="font-semibold uppercase">{allocation.waybill.truckPlate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Product Type</p>
                <Badge variant="outline">{allocation.waybill.productType}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge>{allocation.status}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dispatched</p>
                <p className="font-semibold">{format(allocation.waybill.dispatchedAt, "dd MMM yyyy HH:mm")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Delivered</p>
                <p className="font-semibold">{allocation.deliveredAt ? format(allocation.deliveredAt, "dd MMM yyyy HH:mm") : "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="size-5 text-muted-foreground" />
              Station & Allocation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Station Name</p>
                <p className="font-semibold">{allocation.station.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Station Code</p>
                <p className="font-semibold">{allocation.station.code}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Allocated Qty</p>
                <p className="font-mono font-semibold">{deliveryQty.toLocaleString()} L</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Received Qty</p>
                <p className="font-mono font-semibold">{reconciledQty !== null ? `${reconciledQty.toLocaleString()} L` : "—"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cost per Liter</p>
                <p className="font-mono font-semibold">₦{productPrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Stock Value</p>
                <p className="font-mono font-bold text-slate-700">₦{stockValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="size-5 text-muted-foreground" />
              Approved Expenses Since Delivery
            </CardTitle>
            <CardDescription>Total: ₦{totalExpense.toLocaleString()}</CardDescription>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approved expenses recorded.</p>
            ) : (
              <div className="space-y-3">
                {expenses.map(e => (
                  <div key={e.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{e.category.replace(/_/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">{format(e.createdAt, "dd MMM yyyy HH:mm")}</p>
                    </div>
                    <span className="font-mono font-semibold text-rose-500">-₦{Number(e.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="size-5 text-muted-foreground" />
              deliveries Logs Since Delivery
            </CardTitle>
            <CardDescription>Approved deliveries logs that could match this delivery.</CardDescription>
          </CardHeader>
          <CardContent>
            {salesLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No approved deliveries recorded yet.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {salesLogs.map(s => {
                  const liters = Number(s.litersSold);
                  const price = Number(s.pricePerLiter);
                  const revenue = liters * price;
                  return (
                    <div key={s.id} className="flex justify-between items-center border-b pb-2 last:border-0">
                      <div>
                        <p className="text-sm font-medium">{liters.toLocaleString()} L <span className="text-muted-foreground font-normal">@ ₦{price.toLocaleString()}/L</span></p>
                        <p className="text-xs text-muted-foreground">{format(s.logDate, "dd MMM yyyy")}</p>
                      </div>
                      <span className="font-mono font-semibold text-emerald-600">+₦{revenue.toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
