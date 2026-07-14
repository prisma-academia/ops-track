import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText, ArrowDownLeft, ArrowUpRight, Link as LinkIcon, Download } from "lucide-react";
import Link from "next/link";

export default async function PaymentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireTenantPage(PERMISSIONS.TENANT_FLEET_READ.key);

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      sale: {
        include: { customer: true, station: true }
      },
      transporter: true,
      truck: true,
      order: true,
      transport: true,
    },
  });

  if (!transaction || transaction.tenantId !== actor.tenantId) {
    redirect("/admin/fleet/payments");
  }

  const isOutflow = transaction.type === "OUTFLOW";
  const ref = transaction.reference || transaction.id.substring(0, 8).toUpperCase();
  const categoryFormatted = transaction.category.replace(/_/g, " ").toLowerCase();

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/fleet/payments">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Details</h1>
          <p className="text-muted-foreground mt-1">Ref: {ref}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className={`size-8 flex items-center justify-center shrink-0 rounded-md ${isOutflow ? 'text-red-600 bg-red-600/10' : 'text-green-600 bg-green-600/10'}`}>
                {isOutflow ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
              </div>
              Transaction Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-y-4 text-sm">
              <div className="text-muted-foreground">Type</div>
              <div className="font-medium">
                <Badge variant={isOutflow ? "secondary" : "default"} className={isOutflow ? "bg-red-600/10 text-red-700 hover:bg-red-600/20" : "bg-green-600/10 text-green-700 hover:bg-green-600/20"}>
                  {transaction.type}
                </Badge>
              </div>

              <div className="text-muted-foreground">Category</div>
              <div className="font-medium capitalize">{categoryFormatted}</div>

              <div className="text-muted-foreground">Amount</div>
              <div className={`font-semibold text-lg ${isOutflow ? "text-red-600" : "text-green-600"}`}>
                {isOutflow ? "-" : "+"}₦{Number(transaction.amount).toLocaleString()}
              </div>

              <div className="text-muted-foreground">Method</div>
              <div className="font-medium">{transaction.paymentMethod || "N/A"}</div>

              <div className="text-muted-foreground">Date</div>
              <div className="font-medium">{transaction.createdAt.toLocaleString()}</div>
            </div>

            {transaction.description && (
              <div className="pt-4 border-t border-border/50">
                <div className="text-sm text-muted-foreground mb-1">Description</div>
                <p className="text-sm">{transaction.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <LinkIcon className="h-4 w-4" />
                Related Entities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                {transaction.sale && (
                  <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">Sale</span>
                    <Link href={`/admin/fleet/sales/${transaction.sale.id}`} className="font-medium text-primary hover:underline">
                      View Sale {transaction.sale.id.substring(0, 8)}
                    </Link>
                  </div>
                )}
                {transaction.order && (
                  <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">Order</span>
                    <Link href={`/admin/fleet/orders/${transaction.order.id}`} className="font-medium text-primary hover:underline">
                      {transaction.order.reference || transaction.order.id.substring(0, 8)}
                    </Link>
                  </div>
                )}
                {transaction.transport && (
                  <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">Transport Trip</span>
                    <Link href={`/admin/fleet/transports/${transaction.transport.id}`} className="font-medium text-primary hover:underline">
                      Trip {transaction.transport.id.substring(0, 8)}
                    </Link>
                  </div>
                )}
                {transaction.transporter && (
                  <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">Transporter</span>
                    <Link href={`/admin/fleet/transporters/${transaction.transporter.id}`} className="font-medium text-primary hover:underline">
                      {transaction.transporter.name}
                    </Link>
                  </div>
                )}
                {transaction.truck && (
                  <div className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                    <span className="text-muted-foreground">Truck</span>
                    <span className="font-medium">{transaction.truck.name}</span>
                  </div>
                )}
                {/* Fallback if no related entities */}
                {!transaction.sale && !transaction.order && !transaction.transport && !transaction.transporter && !transaction.truck && (
                  <div className="text-muted-foreground italic text-center py-4">No related entities found.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {transaction.receiptUrl && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Receipt Document
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={transaction.receiptUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg overflow-hidden border border-border bg-muted/50 p-2 flex items-center justify-center">
                  <img 
                    src={transaction.receiptUrl} 
                    alt="Transaction Receipt" 
                    className="max-h-[300px] object-contain rounded-md"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      // Note: We could display a file icon if it's not an image
                    }}
                  />
                  <div className="text-sm font-medium hover:underline text-primary">
                    <a href={transaction.receiptUrl} target="_blank" rel="noopener noreferrer">View Full Document</a>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
