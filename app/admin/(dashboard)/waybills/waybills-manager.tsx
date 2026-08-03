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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { DataTableToolbar } from "@/components/data-table-toolbar";
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
  
  const [fStationId, setFStationId] = useState("");
  const [fStatus, setFStatus] = useState("");
  const [fProduct, setFProduct] = useState("");
  const [fLoadedMin, setFLoadedMin] = useState("");
  const [fLoadedMax, setFLoadedMax] = useState("");
  const [fDateStart, setFDateStart] = useState("");
  const [fDateEnd, setFDateEnd] = useState("");

  const [appliedFilters, setAppliedFilters] = useState<Record<string, string>>({});

  const query = usePaginatedQuery<WaybillRow>({
    baseUrl: "/api/tenant/waybills/list",
    syncWithUrl: true,
    additionalParams: appliedFilters,
  });

  useEffect(() => {
    query.setInitialData(initialWaybills, initialMeta);
  }, []);

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

  const handleApplyFilters = () => {
    const filters: Record<string, string> = {};
    if (fStationId) filters.stationId = fStationId;
    if (fStatus) filters.status = fStatus;
    if (fProduct) filters.product = fProduct;
    if (fLoadedMin) filters.loadedMin = fLoadedMin;
    if (fLoadedMax) filters.loadedMax = fLoadedMax;
    if (fDateStart) filters.dateStart = fDateStart;
    if (fDateEnd) filters.dateEnd = fDateEnd;
    
    setAppliedFilters(filters);
  };

  const handleClearFilters = () => {
    setFStationId("");
    setFStatus("");
    setFProduct("");
    setFLoadedMin("");
    setFLoadedMax("");
    setFDateStart("");
    setFDateEnd("");
    setAppliedFilters({});
  };

  const filterNode = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Station</Label>
        <Popover open={openStationSelect} onOpenChange={setOpenStationSelect}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between font-normal text-foreground">
              <span className="truncate">{stations.find(s => s.id === fStationId)?.name || "All Stations"}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search station..." />
              <CommandList className="max-h-[200px] overflow-y-auto">
                <CommandEmpty>No station found.</CommandEmpty>
                <CommandGroup>
                  {stations.map((s) => (
                    <CommandItem
                      key={s.id}
                      value={s.name.toLowerCase()}
                      onSelect={() => {
                        setFStationId(s.id === fStationId ? "" : s.id);
                        setOpenStationSelect(false);
                      }}
                    >
                      {s.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="space-y-2">
        <Label>Status</Label>
        <Select value={fStatus} onValueChange={setFStatus}>
          <SelectTrigger>
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="DISPATCHED">Dispatched</SelectItem>
            <SelectItem value="DELIVERED">Delivered</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Product</Label>
        <Select value={fProduct} onValueChange={setFProduct}>
          <SelectTrigger>
            <SelectValue placeholder="All Products" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PMS">PMS (Petrol)</SelectItem>
            <SelectItem value="AGO">AGO (Diesel)</SelectItem>
            <SelectItem value="DPK">DPK (Kerosene)</SelectItem>
            <SelectItem value="LPG">LPG (Gas)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Loaded Volume Range (L)</Label>
        <div className="flex items-center gap-2">
          <NumberInput placeholder="Min" value={fLoadedMin} onChange={v => setFLoadedMin(v.toString())} />
          <span>-</span>
          <NumberInput placeholder="Max" value={fLoadedMax} onChange={v => setFLoadedMax(v.toString())} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Dispatched Date Range</Label>
        <div className="flex flex-col gap-2">
          <Input type="date" placeholder="Start" value={fDateStart} onChange={e => setFDateStart(e.target.value)} />
          <Input type="date" placeholder="End" value={fDateEnd} onChange={e => setFDateEnd(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleApplyFilters} className="w-full">Apply Filters</Button>
        <Button variant="outline" onClick={handleClearFilters} className="w-full">Clear</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Waybills"
        description="Monitor incoming and completed waybills across your stations."
        createHref={canCreate ? "/admin/waybills/create" : undefined}
        createLabel="Create Waybill"
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
        filterNode={filterNode}
      />

      {/* ==========================================
          MODALS & DIALOGS
      ========================================== */}

      {/* Create Modal moved to /admin/waybills/create */}

      {/* (Waybill Details Modal has been removed and replaced with a full page view) */}
    </div>
  );
}
