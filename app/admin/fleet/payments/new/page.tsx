import Link from "next/link";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function NewPaymentPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/admin/fleet/payments">
            <ChevronLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Log Payment</h1>
          <p className="text-muted-foreground mt-1">
            Choose the type of payment you want to record.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-w-3xl">
        <Link href="/admin/fleet/payments/new/incoming" className="group">
          <Card className="h-full border-stone-200 dark:border-stone-800 p-6 transition-all hover:border-emerald-500/50 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                <ArrowDownLeft className="size-6" />
              </div>
              <ArrowRight className="size-5 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Incoming Payment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Record a payment received from a customer or station for a fuel sale.
            </p>
          </Card>
        </Link>

        <Link href="/admin/fleet/payments/new/outgoing" className="group">
          <Card className="h-full border-stone-200 dark:border-stone-800 p-6 transition-all hover:border-red-500/50 hover:shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex size-12 items-center justify-center rounded-full bg-red-500/10 text-red-600">
                <ArrowUpRight className="size-6" />
              </div>
              <ArrowRight className="size-5 text-muted-foreground opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
            </div>
            <h2 className="mt-4 text-lg font-semibold">Outgoing Payment</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Record a transport fee payout or an operational fleet expense.
            </p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
