"use client";

import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { DataTableFilterDrawer } from "@/components/data-table-filter-drawer";
import { useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle2, AlertCircle, Truck, User, Eye, ChevronsUpDown } from "lucide-react";
import { WaybillsTable, type WaybillRow } from "./table";
import SpinnerEllipsis from "@/components/spinner-ellipsis";
import { usePaginatedQuery } from "@/hooks/use-paginated-query";

const CreateWaybillSchema = z.object({
  stationId: z.string().min(1),
  number: z.string().min(1).max(50),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  litersLoaded: z.coerce.number().positive(),
  truckPlate: z.string().min(1).max(20),
  driverName: z.string().min(1).max(100),
  driverPhone: z.string().optional().nullable(),
  gpsLatitude: z.number().optional().nullable(),
  gpsLongitude: z.number().optional().nullable(),
  pictures: z.array(z.string()).default([]),
  deliveryDatetime: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  depot: z.string().optional().nullable(),
  transportCompany: z.string().optional().nullable(),
});

export function WaybillsManager({
  initialWaybills,
  initialMeta,
  stations,
  canCreate = false,
}: {
  initialWaybills: WaybillRow[];
  initialMeta: any;
  stations: { id: string; name: string; code: string }[];
  canCreate?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const appliedFilters: Record<string, string> = {};
  if (searchParams.has("stationId")) appliedFilters.stationId = searchParams.get("stationId")!;
  if (searchParams.has("status")) appliedFilters.status = searchParams.get("status")!;
  if (searchParams.has("product")) appliedFilters.product = searchParams.get("product")!;
  if (searchParams.has("loadedMin")) appliedFilters.loadedMin = searchParams.get("loadedMin")!;
  if (searchParams.has("loadedMax")) appliedFilters.loadedMax = searchParams.get("loadedMax")!;
  if (searchParams.has("dateStart")) appliedFilters.dateStart = searchParams.get("dateStart")!;
  if (searchParams.has("dateEnd")) appliedFilters.dateEnd = searchParams.get("dateEnd")!;

  const query = usePaginatedQuery<WaybillRow>({
    baseUrl: "/api/tenant/waybills/list",
    syncWithUrl: true,
    additionalParams: appliedFilters,
  });

  useEffect(() => {
    query.setInitialData(initialWaybills, initialMeta);
  }, [initialWaybills, initialMeta, query.setInitialData]);

  const waybills = query.data;
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [selectedWaybill, setSelectedWaybill] = useState<WaybillRow | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [openStationSelect, setOpenStationSelect] = useState(false);

  const createForm = useForm({
    resolver: zodResolver(CreateWaybillSchema),
  });

  const handleCreateWaybill = createForm.handleSubmit(async (values) => {
    setApiError(null);
    const res = await apiPost("/api/tenant/waybills", values);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const closeDialog = () => {
    setActiveDialog(null);
    setSelectedWaybill(null);
    setApiError(null);
    createForm.reset();
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Waybills"
        description="Monitor incoming and completed waybills across your stations."
      />

      <div className="flex items-center gap-6 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border mb-4">
        <span className="font-semibold text-foreground uppercase tracking-wider">Variance Legend:</span>
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-emerald-500" />
          <span>Exact Match</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-rose-600" />
          <span>Shortage (-)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="size-2.5 rounded-full bg-amber-500" />
          <span>Addition (+)</span>
        </div>
      </div>

      <WaybillsTable
        data={waybills}
        isLoading={query.isLoading}
        serverPagination={{
          ...query.meta,
          onPageChange: query.setPage,
          onPageSizeChange: query.setPageSize,
        }}
        filterNode={
          <DataTableFilterDrawer
            filters={[
              {
                type: "combobox",
                paramName: "stationId",
                label: "Station",
                options: stations.map(s => ({ value: s.id, label: s.name })),
              },
              {
                type: "select",
                paramName: "status",
                label: "Status",
                options: [
                  { value: "PENDING", label: "Pending" },
                  { value: "DISPATCHED", label: "Dispatched" },
                  { value: "DELIVERED", label: "Delivered" },
                  { value: "COMPLETED", label: "Completed" },
                  { value: "CANCELLED", label: "Cancelled" },
                ],
              },
              {
                type: "select",
                paramName: "product",
                label: "Product",
                options: [
                  { value: "PMS", label: "PMS (Petrol)" },
                  { value: "AGO", label: "AGO (Diesel)" },
                  { value: "DPK", label: "DPK (Kerosene)" },
                  { value: "LPG", label: "LPG (Gas)" },
                ],
              },
              {
                type: "number-range",
                label: "Loaded Volume Range (L)",
                fromParam: "loadedMin",
                toParam: "loadedMax",
              },
              {
                type: "date-range",
                label: "Dispatched Date Range",
                fromParam: "dateStart",
                toParam: "dateEnd",
              },
            ]}
          />
        }
      />

      {/* ==========================================
          MODALS & DIALOGS
      ========================================== */}

      {/* Create Modal moved to /admin/station/waybills/create */}

      {/* (Waybill Details Modal has been removed and replaced with a full page view) */}
    </div>
  );
}
