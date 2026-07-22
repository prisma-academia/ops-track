"use client";

import { useEffect, useState } from "react";

import IncomingPaymentForm from "@/components/fleet/payments/IncomingPaymentForm";
import OutgoingPaymentForm from "@/components/fleet/payments/OutgoingPaymentForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDownLeft, ArrowUpRight, CreditCard, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NewPaymentPage() {
  const [metadata, setMetadata] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch(`/api/tenant/fleet/payments/metadata`);
        if (res.ok) {
          const body = await res.json();
          setMetadata(body.data || body);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMetadata();
  }, []);

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
          <IncomingPaymentForm metadata={metadata} loading={loading} />
        </TabsContent>

        <TabsContent value="outgoing" className="animate-in fade-in duration-500">
          <OutgoingPaymentForm metadata={metadata} loading={loading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
