import { prisma } from "@/lib/db/client";
import { requirePlatformPage } from "@/lib/auth/page-guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function SubscriptionsPage() {
  await requirePlatformPage(PERMISSIONS.PLATFORM_TENANTS_READ.key);
  
  const subscriptions = await prisma.tenantSubscription.findMany({
    orderBy: { recordedAt: "desc" },
    include: {
      tenant: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
    take: 200,
  });

  return (
    <div>
      <DataTableToolbar
        title="Payments"
        description="B2B subscription payments across all companies."
        createHref="/subscriptions/new"
        createLabel="Record Payment"
      />
      
      <Card className="mt-4">
        <CardContent className="p-0">
          {subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="size-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium">No payments recorded</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                You haven't recorded any subscription payments yet. Click "Record Payment" to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recorded</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <Link href={`/tenants/${sub.tenantId}?tab=payments`} className="font-medium hover:underline">
                        {sub.tenant.name}
                      </Link>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {sub.tenant.slug}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {sub.currency} {Number(sub.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(sub.startDate, "PP")} — {format(sub.endDate, "PP")}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {sub.description ?? "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{sub.receiptRef ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-medium",
                          sub.status === "ACTIVE"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : sub.status === "EXPIRED"
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "border-destructive/30 bg-destructive/10 text-destructive"
                        )}
                      >
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(sub.recordedAt, "PP")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
