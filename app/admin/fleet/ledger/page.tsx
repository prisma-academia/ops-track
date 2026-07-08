"use client";

import { useState, useEffect } from "react";
import { Download, Wallet, CreditCard, Truck, Receipt } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { Badge } from "@/components/ui/badge";

export default function LedgerPage() {
  const [activeTab, setActiveTab] = useState<"SALES" | "TRANSPORTATION" | "EXPENSES">("SALES");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setData([]);
      try {
        let endpoint = "";
        if (activeTab === "SALES") endpoint = `/api/tenant/fleet/ledger/sales`;
        else if (activeTab === "TRANSPORTATION") endpoint = `/api/tenant/fleet/ledger/transports`;
        else if (activeTab === "EXPENSES") endpoint = `/api/tenant/fleet/ledger/expenses`;

        const res = await fetch(endpoint);
        if (res.ok) {
          const json = await res.json();
          setData(json.data || json);
        }
      } catch (e) {
        console.error("Failed to fetch ledger data", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [activeTab]);

  const handleExport = () => {
    if (data.length === 0) return;
    
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeTab === "SALES") {
      headers = ["Client Name", "Date", "Payment Type", "Amount Received", "Payment Method", "Sales ID"];
      rows = data.map((d: any) => [
        d.sale?.customer?.name || "N/A",
        new Date(d.createdAt).toLocaleDateString(),
        d.paymentType || "N/A",
        d.amount,
        d.paymentMethod || "N/A",
        d.saleId || "N/A"
      ]);
    } else if (activeTab === "TRANSPORTATION") {
      headers = ["Date", "Transporter Name", "Driver Name", "Order ID", "Total Deductions", "Maintenance Incurred", "Net Paid"];
      rows = data.map((d: any) => [
        new Date(d.createdAt).toLocaleDateString(),
        d.transporter?.name || "N/A",
        d.driver ? `${d.driver.firstName} ${d.driver.lastName}` : "N/A",
        d.orderId || "N/A",
        d.totalDeduction,
        d.maintenanceCost,
        d.netTransportFeePaid
      ]);
    } else if (activeTab === "EXPENSES") {
      headers = ["Date", "Expense Category", "Description", "Amount", "Payment Method", "Associated Entity"];
      rows = data.map((d: any) => [
        new Date(d.createdAt).toLocaleDateString(),
        d.category,
        d.description || "N/A",
        d.amount,
        d.paymentMethod || "N/A",
        d.transporter?.name || d.truck?.name || "N/A"
      ]);
    }

    const csvContent = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${activeTab.toLowerCase()}_ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ledger Module</h1>
          <p className="text-muted-foreground mt-1">View financial transactions, sales inflows, transport payouts, and expenses.</p>
        </div>
        <Button onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export to CSV
        </Button>
      </div>

      <Tabs defaultValue="SALES" onValueChange={(val) => setActiveTab(val as any)} className="space-y-6">
        <TabsList className="bg-muted p-1 rounded-xl">
          <TabsTrigger value="SALES" className="rounded-lg px-6 py-2 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Sales Ledger
          </TabsTrigger>
          <TabsTrigger value="TRANSPORTATION" className="rounded-lg px-6 py-2 flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Transportation Ledger
          </TabsTrigger>
          <TabsTrigger value="EXPENSES" className="rounded-lg px-6 py-2 flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Expenses Ledger
          </TabsTrigger>
        </TabsList>

        <Card className="border-stone-200 dark:border-stone-800">
          <CardHeader className="pb-4 border-b border-border/30">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              {activeTab === "SALES" ? "Client Sales & Inflows" : activeTab === "TRANSPORTATION" ? "Transport Operations & Payouts" : "Operational Expenses"}
            </CardTitle>
            <CardDescription>
              {activeTab === "SALES" ? "Track all incoming payments settled by clients." : activeTab === "TRANSPORTATION" ? "Track trips, deductibles, and net pay to transporters." : "Track fleet and personal administrative outflows."}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 pb-0 px-0">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground flex justify-center">
                <SpinnerEllipsis />
              </div>
            ) : data.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                No records found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  {activeTab === "SALES" && (
                    <TableRow>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Sales Ref</TableHead>
                    </TableRow>
                  )}
                  {activeTab === "TRANSPORTATION" && (
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Transporter</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Order Ref</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Maintenance</TableHead>
                      <TableHead>Net Paid</TableHead>
                    </TableRow>
                  )}
                  {activeTab === "EXPENSES" && (
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Associated To</TableHead>
                    </TableRow>
                  )}
                </TableHeader>
                <TableBody>
                  {data.map((row: any, i: number) => (
                    <TableRow key={row.id || i}>
                      {activeTab === "SALES" && (
                        <>
                          <TableCell className="font-medium">{row.sale?.customer?.name || "-"}</TableCell>
                          <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.paymentType?.replace(/_/g, ' ') || "-"}</Badge>
                          </TableCell>
                          <TableCell className="text-green-600 font-semibold">₦{Number(row.amount).toLocaleString()}</TableCell>
                          <TableCell>{row.paymentMethod}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{row.sale?.id?.substring(0,8) || "-"}</TableCell>
                        </>
                      )}
                      {activeTab === "TRANSPORTATION" && (
                        <>
                          <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="font-medium">{row.transporter?.name || "-"}</TableCell>
                          <TableCell>{row.driver ? `${row.driver.firstName} ${row.driver.lastName}` : "-"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{row.orderId?.substring(0,8) || "-"}</TableCell>
                          <TableCell className="text-red-500">₦{Number(row.totalDeduction || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-red-500">₦{Number(row.maintenanceCost || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-blue-600 font-semibold">₦{Number(row.netTransportFeePaid || 0).toLocaleString()}</TableCell>
                        </>
                      )}
                      {activeTab === "EXPENSES" && (
                        <>
                          <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{row.category?.replace(/_/g, ' ')}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate" title={row.description}>{row.description || "-"}</TableCell>
                          <TableCell className="text-red-600 font-semibold">₦{Number(row.amount).toLocaleString()}</TableCell>
                          <TableCell>{row.paymentMethod}</TableCell>
                          <TableCell>{row.transporter?.name || row.truck?.name || "-"}</TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
