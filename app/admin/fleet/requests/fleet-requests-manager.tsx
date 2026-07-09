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

export function FleetRequestsManager({
  initialRequests,
}: {
  initialRequests: any[];
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

  const canFulfill = selectedRequests.length > 0 && new Set(selectedRequests.map(r => r.productType)).size === 1;

  const handleFulfill = () => {
    if (!canFulfill) return;
    const params = new URLSearchParams();
    selectedIds.forEach(id => params.append("requestId", id));
    router.push(`/admin/waybills/create?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Pending Station Requests"
        description="Review and fulfill fuel requests from stations."
        action={
          <div className="flex items-center gap-3">
            {!canFulfill && selectedIds.size > 0 && (
              <span className="text-xs text-destructive font-medium">
                Selected requests must be for the same product type.
              </span>
            )}
            <Button onClick={handleFulfill} disabled={!canFulfill}>
              <Truck size={16} className="mr-1" /> 
              Fulfill Selected ({selectedIds.size})
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
              <TableHead>Station</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Volume Requested</TableHead>
              <TableHead>Requested By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No pending requests.
                </TableCell>
              </TableRow>
            ) : (
              initialRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="text-center">
                    <Checkbox 
                      checked={selectedIds.has(req.id)}
                      onCheckedChange={() => toggleSelect(req.id)}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(req.createdAt), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{req.station.name}</div>
                    <div className="text-xs text-muted-foreground">{req.station.code}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{req.productType}</Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    {Number(req.requestedLiters).toLocaleString()} L
                  </TableCell>
                  <TableCell>
                    {req.requestedBy.firstName} {req.requestedBy.lastName}
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
