"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function StationRequestsManager({
  initialRequests,
}: {
  initialRequests: any[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Fuel Requisitions"
        description="Request fuel supplies for your station."
        action={
          <Button onClick={() => router.push("/admin/station/requests/create")}>
            <Plus size={16} className="mr-1" /> Request Fuel
          </Button>
        }
      />

      <div className="bg-card text-card-foreground rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead>Date</TableHead>
              <TableHead>Station</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Volume Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Dispatch Linked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No requests found.
                </TableCell>
              </TableRow>
            ) : (
              initialRequests.map((req) => (
                <TableRow key={req.id}>
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
                    <Badge
                      variant={
                        req.status === "PENDING"
                          ? "outline"
                          : req.status === "APPROVED"
                          ? "default"
                          : req.status === "IN_TRANSIT"
                          ? "secondary"
                          : req.status === "FULFILLED"
                          ? "default" // or success
                          : "destructive"
                      }
                    >
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {req.waybillAllocation ? (
                      <span className="text-sm font-mono text-muted-foreground">
                        {req.waybillAllocation.waybill.number}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
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
