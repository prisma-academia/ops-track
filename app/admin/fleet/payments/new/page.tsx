"use client";

import IncomingPaymentForm from "@/components/fleet/payments/IncomingPaymentForm";
import OutgoingPaymentForm from "@/components/fleet/payments/OutgoingPaymentForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, CreditCard, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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
          <p className="text-muted-foreground mt-1">Record incoming payments and outgoing fleet expenses.</p>
        </div>
      </div>

      <Tabs defaultValue="incoming" className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-xl">
          <TabsTrigger value="incoming" className="rounded-lg px-6 py-2 flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4 text-green-600" />
            Incoming Payments
          </TabsTrigger>
          <TabsTrigger value="outgoing" className="rounded-lg px-6 py-2 flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-red-600" />
            Outgoing Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="animate-in fade-in duration-500">
          <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs">
            <CardHeader className="pb-4 border-b border-border/30">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-green-600" />
                Log Incoming Payment
              </CardTitle>
              <CardDescription>Record payments received from customers for fuel sales.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <IncomingPaymentForm />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outgoing" className="animate-in fade-in duration-500">
          <Card className="border-stone-200 dark:border-stone-800 bg-white/60 dark:bg-stone-950/60 backdrop-blur-xs">
            <CardHeader className="pb-4 border-b border-border/30">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-red-600" />
                Log Outgoing Payment
              </CardTitle>
              <CardDescription>Record transport fee payouts and operational expenses.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <OutgoingPaymentForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
