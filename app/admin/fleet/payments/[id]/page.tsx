import { prisma } from "@/lib/db/client";
import { requireTenantPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Link as LinkIcon, FileText, Download } from "lucide-react";
import Link from "next/link";
import { InvoiceReceipt } from "./invoice-receipt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { publicUrlForKey, s3Configured } from "@/lib/storage/s3";

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
      tenant: true,
    },
  });

  if (!transaction || transaction.tenantId !== actor.tenantId) {
    redirect("/admin/fleet/payments");
  }

  let logoUrl = null;
  if (transaction.tenant?.settingsJson) {
    const settings = transaction.tenant.settingsJson as { logoKey?: string };
    if (settings.logoKey) {
      if (settings.logoKey.startsWith("http")) {
        logoUrl = settings.logoKey;
      } else if (s3Configured()) {
        logoUrl = publicUrlForKey(settings.logoKey);
      }
    }
  }

  const safeTransactionForClient = {
    id: transaction.id,
    type: transaction.type,
    reference: transaction.reference,
    category: transaction.category,
    amount: Number(transaction.amount),
    createdAt: transaction.createdAt,
    description: transaction.description,
    paymentMethod: transaction.paymentMethod,
    sale: transaction.sale ? {
      customer: transaction.sale.customer ? { name: transaction.sale.customer.name } : null,
      station: transaction.sale.station ? { name: transaction.sale.station.name } : null,
    } : null,
    transporter: transaction.transporter ? { name: transaction.transporter.name } : null,
    tenant: transaction.tenant ? { name: transaction.tenant.name, logoUrl } : null,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 print:hidden">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/fleet/payments">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payment Details</h1>
          <p className="text-muted-foreground mt-1">Ref: {transaction.reference || transaction.id.substring(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <Tabs defaultValue="receipt" className="w-full">
        <TabsList className="mb-4 print:hidden">
          <TabsTrigger value="receipt">Invoice / Receipt</TabsTrigger>
          <TabsTrigger value="details">System Details</TabsTrigger>
        </TabsList>

        <TabsContent value="receipt" className="mt-0">
          <InvoiceReceipt transaction={safeTransactionForClient} />
        </TabsContent>

        <TabsContent value="details" className="mt-0 space-y-6 print:hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      Attachment Document
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
                      }}
                    />
                    <div className="text-sm font-medium hover:underline text-primary mt-2">
                      <a href={transaction.receiptUrl} target="_blank" rel="noopener noreferrer">View Full Document</a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

