"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatShortCurrency } from "@/lib/utils";

export function StationPayrollTab({ stationId }: { stationId: string }) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchRuns();
  }, []);

  const fetchRuns = async () => {
    try {
      const res = await fetch(`/api/tenant/stations/${stationId}/payroll/runs`);
      const data = await res.json();
      if (data.data) {
        setRuns(data.data);
      }
    } catch (error) {
      toast.error("Failed to load payroll runs");
    } finally {
      setLoading(false);
    }
  };

  const generateRun = async () => {
    setGenerating(true);
    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const res = await fetch(`/api/tenant/stations/${stationId}/payroll/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: firstDay.toISOString(),
          periodEnd: lastDay.toISOString(),
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      
      toast.success("Payroll run generated successfully!");
      fetchRuns();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const approveRun = async (runId: string) => {
    try {
      const res = await fetch(`/api/tenant/stations/${stationId}/payroll/runs/${runId}/approve`, {
        method: "POST"
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve");
      
      toast.success("Payroll approved and expenses generated!");
      fetchRuns();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Payroll Runs</h3>
          <p className="text-sm text-muted-foreground">Manage station staff payroll cycles</p>
        </div>
        <Button onClick={generateRun} disabled={generating}>
          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
          Generate Current Month Run
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payslips</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading runs...</TableCell>
              </TableRow>
            ) : runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No payroll runs found.</TableCell>
              </TableRow>
            ) : (
              runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>
                    {new Date(run.periodStart).toLocaleDateString()} - {new Date(run.periodEnd).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={run.status === "PAID" ? "default" : "secondary"}>
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{run._count?.payslips || 0}</TableCell>
                  <TableCell>{formatShortCurrency(run.totalAmount || 0)}</TableCell>
                  <TableCell className="text-right">
                    {run.status === "DRAFT" && (
                      <Button size="sm" variant="outline" onClick={() => approveRun(run.id)}>
                        <Check className="w-4 h-4 mr-1" /> Approve & Pay
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
