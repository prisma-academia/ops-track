"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/client/api";
import { Button } from "@/components/ui/button";
import { FormField, TextInput } from "@/components/form-field";
import { DataTableToolbar } from "@/components/data-table-toolbar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Flame, Gauge } from "lucide-react";

/**
 * ==========================================
 * SCHEMAS & CONFIGS
 * ==========================================
 */

const AddTankSchema = z.object({
  stationId: z.string().min(1, "Please select a station"),
  name: z.string().min(1, "Please enter a tank name").max(50),
  productType: z.enum(["PMS", "AGO", "DPK", "LPG"]),
  capacity: z.coerce.number().positive("Capacity must be positive"),
});

const AddPumpSchema = z.object({
  stationId: z.string().min(1, "Please select a station"),
  name: z.string().min(1, "Please enter a pump name").max(50),
  tankId: z.string().min(1, "Please select a tank"),
  nozzles: z.array(z.object({ name: z.string().min(1) })).min(1),
});

function getOrdinalSuffix(day: number) {
  if (day > 3 && day < 21) return "th";
  switch (day % 10) {
    case 1:  return "st";
    case 2:  return "nd";
    case 3:  return "rd";
    default: return "th";
  }
}

function formatHumanReadableDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "—";

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? "0" + minutes : minutes;

  return `${month} ${day}${getOrdinalSuffix(day)} ${year} ${hours}:${minutesStr}${ampm}`;
}

export function TanksPumpsManager({
  tanks,
  pumps,
  stations,
  activeStationId,
}: {
  tanks: any[];
  pumps: any[];
  stations: any[];
  activeStationId?: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("tanks");
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const defaultStationId = activeStationId && activeStationId !== "all" ? activeStationId : "";

  const tankForm = useForm({
    resolver: zodResolver(AddTankSchema),
    defaultValues: { stationId: defaultStationId, name: "", productType: "PMS" as any, capacity: 0 },
  });

  const [nozzleCount, setNozzleCount] = useState<number>(1);

  const pumpForm = useForm({
    resolver: zodResolver(AddPumpSchema),
    defaultValues: { stationId: defaultStationId, name: "", tankId: "", nozzles: [{ name: "Nozzle A" }] },
  });

  const handleNozzleCountChange = (count: number) => {
    setNozzleCount(count);
    const newNozzles = Array.from({ length: count }, (_, i) => ({
      name: `Nozzle ${String.fromCharCode(65 + i)}`,
    }));
    pumpForm.setValue("nozzles", newNozzles, { shouldValidate: true });
  };

  const handleAddTank = tankForm.handleSubmit(async (values) => {
    setApiError(null);
    const { stationId, ...payload } = values;
    const res = await apiPost(`/api/tenant/stations/${stationId}/tanks`, payload);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const handleAddPump = pumpForm.handleSubmit(async (values) => {
    setApiError(null);
    const { stationId, ...payload } = values;
    const res = await apiPost(`/api/tenant/stations/${stationId}/pumps`, payload);
    if (res.error) {
      setApiError(res.error.message);
    } else {
      closeDialog();
    }
  });

  const closeDialog = () => {
    setActiveDialog(null);
    setApiError(null);
    setNozzleCount(1);
    tankForm.reset({ stationId: defaultStationId, name: "", productType: "PMS" as any, capacity: 0 });
    pumpForm.reset({ stationId: defaultStationId, name: "", tankId: "", nozzles: [{ name: "Nozzle A" }] });
    router.refresh();
  };

  const selectedStationIdForPump = pumpForm.watch("stationId");
  const availableTanksForPump = selectedStationIdForPump
    ? stations.find((s) => s.id === selectedStationIdForPump)?.tanks || []
    : [];

  return (
    <div className="space-y-6">
      <DataTableToolbar
        title="Tanks & Pumps"
        description="Configure and monitor fuel tanks, capacities, and active pump nozzles across all stations."
        action={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActiveDialog("addTank")}>
              <Plus size={16} className="mr-1" /> Add Tank
            </Button>
            <Button onClick={() => setActiveDialog("addPump")}>
              <Plus size={16} className="mr-1" /> Add Pump
            </Button>
          </div>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="tanks">Tanks Capacity Overview</TabsTrigger>
          <TabsTrigger value="pumps">Active Dispensers / Pumps</TabsTrigger>
        </TabsList>

        {/* Tanks Content */}
        <TabsContent value="tanks" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tanks.length === 0 ? (
              <Card className="col-span-2 p-6 text-center text-muted-foreground text-sm">No underground fuel tanks defined yet.</Card>
            ) : (
              tanks.map((tank: any) => {
                const lastDip = tank.dippings[0];
                const dippedLiters = lastDip ? Number(lastDip.dippingLiters) : 0;
                const capacity = Number(tank.capacity);
                const fillPercentage = capacity > 0 ? Math.min(100, Math.round((dippedLiters / capacity) * 100)) : 0;

                return (
                  <Card key={tank.id} className="relative overflow-hidden">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div>
                        <CardTitle className="font-bold text-sm flex items-center gap-1.5">
                          <Flame size={16} className="text-rose-500 animate-pulse shrink-0" />
                          {tank.name}
                        </CardTitle>
                        <CardDescription>
                          Station: <span className="font-semibold">{tank.station.name}</span> | Product: <span className="font-semibold">{tank.productType}</span>
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-muted-foreground">Capacity</span>
                        <div className="font-mono text-sm font-bold">{capacity.toLocaleString()} L</div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>Dipped Level: {lastDip ? `${dippedLiters.toLocaleString()} L` : "No reading"}</span>
                          <span>{fillPercentage}% Full</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${fillPercentage}%` }}
                          />
                        </div>
                      </div>
                      {lastDip && (
                        <div className="text-[10px] text-muted-foreground mt-2 text-right">
                          Last dipped: {formatHumanReadableDate(lastDip.recordedAt)} ({lastDip.shift} shift)
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Pumps Content */}
        <TabsContent value="pumps" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pumps.length === 0 ? (
              <Card className="col-span-2 p-6 text-center text-muted-foreground text-sm">No dispensing pumps set up yet.</Card>
            ) : (
              pumps.map((pump: any) => (
                <Card key={pump.id}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="font-bold text-sm flex items-center gap-1.5">
                      <Gauge size={16} className="text-muted-foreground shrink-0" />
                      {pump.name}
                    </CardTitle>
                    <div className="flex flex-col items-end text-right">
                      <span className="text-[10px] text-muted-foreground">Station: {pump.station.name}</span>
                      <Badge variant="secondary" className="text-xs font-mono mt-1">
                        Draws: {pump.tank.name} ({pump.tank.productType})
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="space-y-2">
                      <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block">Nozzles</span>
                      <div className="flex flex-wrap gap-2">
                        {pump.nozzles.map((noz: any) => (
                          <span key={noz.id} className="text-xs bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
                            {noz.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Tank Dialog */}
      {activeDialog === "addTank" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Fuel Tank</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddTank} className="space-y-4">
              <FormField label="Select Station" htmlFor="t_stat" error={tankForm.formState.errors.stationId?.message}>
                <select id="t_stat" className="rounded border border-stone-300 bg-white px-3 py-2 text-sm w-full" {...tankForm.register("stationId")}>
                  <option value="">Select station...</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Tank Name" htmlFor="t_name" error={tankForm.formState.errors.name?.message}>
                <TextInput id="t_name" placeholder="e.g. PMS Tank 1" {...tankForm.register("name")} />
              </FormField>
              
              <FormField label="Product Type" htmlFor="t_prod" error={tankForm.formState.errors.productType?.message}>
                <select id="t_prod" className="rounded border border-stone-300 bg-white px-3 py-2 text-sm w-full" {...tankForm.register("productType")}>
                  <option value="PMS">PMS (Petrol)</option>
                  <option value="AGO">AGO (Diesel)</option>
                  <option value="DPK">DPK (Kerosene)</option>
                  <option value="LPG">LPG (Gas)</option>
                </select>
              </FormField>

              <FormField label="Liters Capacity" htmlFor="t_cap" error={tankForm.formState.errors.capacity?.message}>
                <TextInput id="t_cap" type="number" placeholder="e.g. 45000" {...tankForm.register("capacity")} />
              </FormField>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Create Tank</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Pump Dialog */}
      {activeDialog === "addPump" && (
        <Dialog open={true} onOpenChange={closeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Fuel Pump</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddPump} className="space-y-4">
              <FormField label="Select Station" htmlFor="p_stat" error={pumpForm.formState.errors.stationId?.message}>
                <select id="p_stat" className="rounded border border-stone-300 bg-white px-3 py-2 text-sm w-full" {...pumpForm.register("stationId")}>
                  <option value="">Select station...</option>
                  {stations.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Pump Name" htmlFor="p_name" error={pumpForm.formState.errors.name?.message}>
                <TextInput id="p_name" placeholder="e.g. Pump 1" {...pumpForm.register("name")} />
              </FormField>

              <FormField label="Draws From Tank" htmlFor="p_tank" error={pumpForm.formState.errors.tankId?.message}>
                <select id="p_tank" className="rounded border border-stone-300 bg-white px-3 py-2 text-sm w-full" {...pumpForm.register("tankId")} disabled={!selectedStationIdForPump}>
                  <option value="">Select tank...</option>
                  {availableTanksForPump.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.productType})</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Number of Nozzles" htmlFor="p_nozzle_count" error={pumpForm.formState.errors.nozzles?.message}>
                <select
                  id="p_nozzle_count"
                  className="rounded border border-stone-300 bg-white px-3 py-2 text-sm w-full font-medium"
                  value={nozzleCount}
                  onChange={(e) => handleNozzleCountChange(Number(e.target.value))}
                >
                  <option value={1}>1 Nozzle</option>
                  <option value={2}>2 Nozzles</option>
                  <option value={3}>3 Nozzles</option>
                  <option value={4}>4 Nozzles</option>
                </select>
              </FormField>

              {apiError && <p className="text-xs text-red-600">{apiError}</p>}

              <DialogFooter showCloseButton={true}>
                <Button type="submit">Create Pump</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
