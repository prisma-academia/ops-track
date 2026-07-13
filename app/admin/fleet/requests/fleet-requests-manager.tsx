"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Truck } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StationStockData } from "@/components/station-stock-summary";

export function FleetRequestsManager({
  initialRequests,
  stockData,
}: {
  initialRequests: any[];
  stockData: StationStockData[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectedRequests = useMemo(() => {
    return initialRequests.filter(r => selectedIds.has(r.id));
  }, [selectedIds, initialRequests]);

  const canFulfill = selectedRequests.length > 0;

  const handleFulfill = () => {
    if (!canFulfill) return;
    const params = new URLSearchParams();
    selectedIds.forEach(id => params.append("requestId", id));
    router.push(`/admin/fleet/transports/new?${params.toString()}`);
  };

  const formatNumber = (num: number) => {
    if (num === 0) return "0";
    if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}k`;
    return num.toString();
  };

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Pending Station Requests"
        description="Review and fulfill fuel requests from stations."
        action={
          <div className="flex items-center gap-3">
            <Button onClick={handleFulfill} disabled={!canFulfill}>
              <Truck size={16} className="mr-1" /> 
              Fulfill via Transport ({selectedIds.size})
            </Button>
          </div>
        }
      />



      <div className="bg-card text-card-foreground rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-12 text-center"></TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Station</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Volume Requested</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Requested By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No pending requests.
                </TableCell>
              </TableRow>
            ) : (
              initialRequests.map((req) => {
                const stockItem = stockData.find(s => s.stationId === req.stationId);
                const pType = req.productType as keyof StationStockData["stock"];
                const stockVol = stockItem?.stock[pType] || 0;
                const expectedVol = stockItem?.expected[pType] || 0;

                return (
                  <TableRow key={req.id}>
                    <TableCell className="text-center">
                      <Checkbox 
                        checked={selectedIds.has(req.id)}
                        onCheckedChange={() => toggleSelect(req.id)}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {format(new Date(req.createdAt), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      {req.batch?.reference ? (
                        <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                          {req.batch.reference}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{req.station.name}</div>
                      <div className="text-xs text-muted-foreground">{req.station.code}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{req.productType}</Badge>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {Number(req.requestedLiters).toLocaleString()} L
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-medium text-sm">{formatNumber(stockVol)}L</span>
                        {expectedVol > 0 && (
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-1 py-0.5 rounded font-medium">
                            +{formatNumber(expectedVol)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {req.requestedBy.firstName} {req.requestedBy.lastName}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
