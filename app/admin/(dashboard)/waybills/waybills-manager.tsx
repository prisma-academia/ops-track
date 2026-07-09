"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost, apiPatch } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  stations,
  canCreate = false,
}: {
  initialWaybills: WaybillRow[];
  stations: { id: string; name: string; code: string }[];
  canCreate?: boolean;
}) {
  const router = useRouter();
  const waybills = initialWaybills;
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
        
        title="Dispatches"
        description="Track fuel distribution movements from depots to retail stations."
        action={
          canCreate ? (
            <Button onClick={() => router.push("/admin/waybills/create")}>
              <Plus size={16} className="mr-1" /> New Dispatch
            </Button>
          ) : undefined
        }
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
      />

      {/* ==========================================
          MODALS & DIALOGS
      ========================================== */}

      {/* Create Modal moved to /admin/waybills/create */}

      {/* (Waybill Details Modal has been removed and replaced with a full page view) */}
    </div>
  );
}
