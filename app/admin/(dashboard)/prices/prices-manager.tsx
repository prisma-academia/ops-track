"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { apiPost } from "@/lib/client/api"
import type { ProductType } from "@/lib/generated/prisma/client"

import {
  ColumnDef,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Edit, Fuel, MapPin, Save, Search, Store, X, Calendar, AlertTriangle } from "lucide-react"

type Station = {
  id: string;
  name: string;
  code: string;
  region: string;
  location: string | null;
};

type PriceControlRow = {
  id: string;
  stationId: string;
  productType: ProductType;
  pricePerLiter: number;
  effectiveFrom: string;
};

type MappedStation = Station & {
  fuels: {
    PMS?: { price: number; lastUpdate: string; date: Date };
    AGO?: { price: number; lastUpdate: string; date: Date };
    DPK?: { price: number; lastUpdate: string; date: Date };
    LPG?: { price: number; lastUpdate: string; date: Date };
  }
}

// Reusable mini-card for Fuel Inputs
const FuelInputCard = ({ 
  label, 
  value, 
  onChange, 
  average, 
  isEditing, 
  colorClass, 
  bgClass, 
  borderClass 
}: any) => {
  return (
    <div className={`p-4 rounded-xl border transition-all duration-300 ${isEditing ? borderClass : 'border-border/40 bg-card/40'} ${isEditing ? bgClass : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <Label className={`font-semibold ${colorClass}`}>{label}</Label>
        {!isEditing && average > 0 && (
          <Badge variant="outline" className={`text-[10px] font-mono ${colorClass} ${borderClass}`}>
            Avg: ₦{average.toFixed(2)}
          </Badge>
        )}
      </div>
      
      {isEditing ? (
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">₦</span>
          <Input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`pl-8 text-lg font-bold h-12 bg-background/80 backdrop-blur-sm ${borderClass} focus-visible:ring-1 focus-visible:${borderClass}`}
          />
        </div>
      ) : (
        <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
          {average ? `₦ ${average.toFixed(2)}` : "—"}
        </div>
      )}
    </div>
  )
}

const PriceCell = ({ product }: { product?: { price: number } }) => {
  if (!product) return <span className="text-muted-foreground text-sm font-mono opacity-50">—</span>;
  return (
    <div className="font-mono text-sm font-semibold tracking-tight text-foreground/90 tabular-nums">
      <span className="text-muted-foreground mr-1 text-xs font-normal">₦</span>
      {product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </div>
  )
}

export function PricesManager({
  stations,
  currentPrices,
}: {
  stations: Station[];
  currentPrices: PriceControlRow[];
}) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  
  const [editingPrices, setEditingPrices] = useState<{
    PMS: string;
    AGO: string;
    DPK: string;
    LPG: string;
  }>({
    PMS: "",
    AGO: "",
    DPK: "",
    LPG: "",
  })
  
  const [selectedStations, setSelectedStations] = useState<RowSelectionState>({})
  const [effectiveDateTime, setEffectiveDateTime] = useState("")
  const [searchQuery, setSearchQuery] = useState("")

  // Map stations data to include current active fuels
  const stationsData = useMemo<MappedStation[]>(() => {
    return stations.map(station => {
      const fuels: MappedStation["fuels"] = {};
      const stationPrices = currentPrices.filter(p => p.stationId === station.id);
      
      for (const p of stationPrices) {
        fuels[p.productType] = {
          price: Number(p.pricePerLiter),
          date: new Date(p.effectiveFrom),
          lastUpdate: formatDistanceToNow(new Date(p.effectiveFrom), { addSuffix: true })
        };
      }
      return { ...station, fuels };
    })
  }, [stations, currentPrices])

  const handleEdit = () => {
    setIsEditing(true)
    setEditingPrices({ PMS: "", AGO: "", DPK: "", LPG: "" })
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditingPrices({ PMS: "", AGO: "", DPK: "", LPG: "" })
    setSelectedStations({})
    setEffectiveDateTime("")
    setShowConfirmDialog(false)
  }

  const updatePrice = (fuelType: keyof typeof editingPrices, value: string) => {
    setEditingPrices((prev) => ({
      ...prev,
      [fuelType]: value,
    }))
  }

  const selectedStationIds = Object.keys(selectedStations).filter((key) => selectedStations[key])
  
  const pricesPayload = useMemo(() => {
    const payload: Record<string, number> = {};
    if (editingPrices.PMS) payload.PMS = Number(editingPrices.PMS);
    if (editingPrices.AGO) payload.AGO = Number(editingPrices.AGO);
    if (editingPrices.DPK) payload.DPK = Number(editingPrices.DPK);
    if (editingPrices.LPG) payload.LPG = Number(editingPrices.LPG);
    return payload;
  }, [editingPrices]);

  const initiateSave = () => {
    if (selectedStationIds.length === 0) {
      toast.error("Please select at least one station from the table")
      return
    }

    if (Object.keys(pricesPayload).length === 0) {
      toast.error("Please enter a new price for at least one fuel type")
      return
    }

    setShowConfirmDialog(true)
  }

  const handleConfirmSave = async () => {
    setIsSubmitting(true)
    setShowConfirmDialog(false)

    const res = await apiPost("/api/tenant/prices/bulk", {
      prices: pricesPayload,
      stationIds: selectedStationIds,
      effectiveFrom: effectiveDateTime || undefined,
    });

    setIsSubmitting(false)

    if (res.error) {
      toast.error(res.error.message)
      return
    }

    toast.success(`Price changes applied successfully to ${selectedStationIds.length} station(s)`)

    handleCancel()
    router.refresh()
  }

  // Filter stations based on search query
  const filteredStations = useMemo(() => {
    if (!searchQuery) return stationsData
    const query = searchQuery.toLowerCase()
    return stationsData.filter(
      (station) =>
        station.name.toLowerCase().includes(query) ||
        (station.location && station.location.toLowerCase().includes(query)) ||
        station.code.toLowerCase().includes(query)
    )
  }, [searchQuery, stationsData])

  // Table columns definition
  const columns = useMemo<ColumnDef<MappedStation>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <div className="flex items-center justify-center pl-2">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label="Select all"
              className={isEditing ? "border-primary" : ""}
              disabled={!isEditing}
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center pl-2">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
              className={isEditing ? "border-primary" : ""}
              disabled={!isEditing}
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: "Station Details",
        cell: ({ row }) => {
          const name = row.original.name;
          const code = row.original.code;
          return (
            <div className="flex items-center gap-3 py-1">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                <Store size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground tracking-tight">{name}</span>
                <span className="text-xs text-muted-foreground font-mono">{code}</span>
              </div>
            </div>
          );
        },
      },
      {
        id: "pms",
        header: "PMS (Petrol)",
        cell: ({ row }) => <PriceCell product={row.original.fuels.PMS} />
      },
      {
        id: "ago",
        header: "AGO (Diesel)",
        cell: ({ row }) => <PriceCell product={row.original.fuels.AGO} />
      },
      {
        id: "dpk",
        header: "DPK (Kero)",
        cell: ({ row }) => <PriceCell product={row.original.fuels.DPK} />
      },
      {
        id: "lpg",
        header: "LPG (Gas)",
        cell: ({ row }) => <PriceCell product={row.original.fuels.LPG} />
      },
    ],
    [isEditing]
  )

  const table = useReactTable({
    data: filteredStations,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: true,
    onRowSelectionChange: setSelectedStations,
    getRowId: (row) => row.id,
    state: {
      rowSelection: selectedStations,
    },
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  })

  // To display average prices when not editing
  const averages = useMemo(() => {
    let pmsSum = 0, pmsCount = 0;
    let agoSum = 0, agoCount = 0;
    let dpkSum = 0, dpkCount = 0;
    let lpgSum = 0, lpgCount = 0;

    for (const s of stationsData) {
      if (s.fuels.PMS) { pmsSum += s.fuels.PMS.price; pmsCount++; }
      if (s.fuels.AGO) { agoSum += s.fuels.AGO.price; agoCount++; }
      if (s.fuels.DPK) { dpkSum += s.fuels.DPK.price; dpkCount++; }
      if (s.fuels.LPG) { lpgSum += s.fuels.LPG.price; lpgCount++; }
    }

    return {
      PMS: pmsCount ? pmsSum / pmsCount : 0,
      AGO: agoCount ? agoSum / agoCount : 0,
      DPK: dpkCount ? dpkSum / dpkCount : 0,
      LPG: lpgCount ? lpgSum / lpgCount : 0,
    }
  }, [stationsData])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-12 items-start gap-6 relative">
        
        {/* Left Side: Price Editing Card (Sticky Control Center) */}
        <div className="xl:col-span-4 xl:sticky xl:top-6 space-y-6">
          <Card className="shadow-sm border-border/40 overflow-hidden bg-card/60 backdrop-blur-xl">
            <CardHeader className="border-b bg-muted/20 pb-5">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="size-8 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Fuel size={18} />
                  </div>
                  Control Center
                </CardTitle>
                <CardDescription className="mt-1.5">
                  Update and manage pump prices across your retail network.
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-6">
              <FuelInputCard
                label="PMS (Petrol)"
                value={editingPrices.PMS}
                onChange={(v: string) => updatePrice("PMS", v)}
                average={averages.PMS}
                isEditing={isEditing}
                colorClass="text-rose-700 dark:text-rose-400"
                bgClass="bg-rose-50/50 dark:bg-rose-950/20"
                borderClass="border-rose-200 dark:border-rose-900"
              />
              
              <FuelInputCard
                label="AGO (Diesel)"
                value={editingPrices.AGO}
                onChange={(v: string) => updatePrice("AGO", v)}
                average={averages.AGO}
                isEditing={isEditing}
                colorClass="text-stone-700 dark:text-stone-300"
                bgClass="bg-stone-50/80 dark:bg-stone-900/40"
                borderClass="border-stone-200 dark:border-stone-800"
              />

              <FuelInputCard
                label="DPK (Kerosene)"
                value={editingPrices.DPK}
                onChange={(v: string) => updatePrice("DPK", v)}
                average={averages.DPK}
                isEditing={isEditing}
                colorClass="text-amber-700 dark:text-amber-500"
                bgClass="bg-amber-50/50 dark:bg-amber-950/20"
                borderClass="border-amber-200 dark:border-amber-900"
              />

              <FuelInputCard
                label="LPG (Gas)"
                value={editingPrices.LPG}
                onChange={(v: string) => updatePrice("LPG", v)}
                average={averages.LPG}
                isEditing={isEditing}
                colorClass="text-blue-700 dark:text-blue-400"
                bgClass="bg-blue-50/50 dark:bg-blue-950/20"
                borderClass="border-blue-200 dark:border-blue-900"
              />

              {/* Station Selection and DateTime */}
              {isEditing && (
                <div className="pt-2 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="p-4 rounded-xl border border-border/50 bg-muted/30 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="effective-datetime" className="text-sm font-semibold flex items-center gap-2">
                        <Calendar size={14} className="text-muted-foreground" />
                        Effective Date & Time
                      </Label>
                      <Input
                        id="effective-datetime"
                        type="datetime-local"
                        value={effectiveDateTime}
                        onChange={(e) => setEffectiveDateTime(e.target.value)}
                        className="bg-background/80"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Optional. Leave blank to apply immediately.
                      </p>
                    </div>
                    
                    <div className="p-3 bg-primary/10 text-primary text-xs rounded-lg border border-primary/20 flex gap-2">
                      <MapPin className="size-4 shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        Check the boxes on the table to select which stations these prices apply to.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 space-y-3">
                {!isEditing ? (
                  <Button
                    variant="default"
                    className="w-full h-12 font-semibold text-md tracking-wide rounded-xl shadow-sm"
                    onClick={handleEdit}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Enter Edit Mode
                  </Button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Button
                      variant="default"
                      className="w-full h-12 font-semibold text-md tracking-wide rounded-xl shadow-sm"
                      onClick={initiateSave}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Saving..." : (
                        <><Save className="w-4 h-4 mr-2" /> Apply Prices</>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full h-12 rounded-xl text-muted-foreground hover:text-foreground"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                    >
                      Cancel Edit
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Stations Table */}
        <div className="xl:col-span-8">
          <Card className="shadow-sm border-border/40 overflow-hidden bg-card/60 backdrop-blur-xl">
            <CardHeader className="bg-muted/10 border-b px-6 py-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Network Stations</CardTitle>
                  <CardDescription className="mt-1">
                    {isEditing 
                      ? <span className="text-primary font-medium flex items-center gap-1.5"><AlertTriangle size={14} /> Selection mode active. Choose stations to update.</span>
                      : "View current active prices across your stations"}
                  </CardDescription>
                </div>
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search stations or regions..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background/60 shadow-sm rounded-xl h-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id} className="bg-muted/30 border-b-border/40">
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className="whitespace-nowrap px-4 py-4 text-xs uppercase tracking-wider font-semibold">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          className={`transition-colors border-b-border/30 ${row.getIsSelected() ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30"}`}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="px-4 py-3">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-48 text-center text-muted-foreground"
                        >
                          No stations match your search.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Info */}
              {table.getPageCount() > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-border/40 text-sm text-muted-foreground bg-muted/10">
                  <div>
                    Showing <span className="font-medium text-foreground">{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</span> to{" "}
                    <span className="font-medium text-foreground">
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) *
                        table.getState().pagination.pageSize,
                      filteredStations.length
                    )}
                    </span>{" "}
                    of <span className="font-medium text-foreground">{filteredStations.length}</span> stations
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="rounded-lg shadow-sm"
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="rounded-lg shadow-sm"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <AlertTriangle className="size-5 text-amber-500" />
              Confirm Price Changes
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base pt-2">
              You are about to deploy new prices to <strong className="text-foreground">{selectedStationIds.length}</strong> station(s).
              <div className="mt-4 space-y-2 p-4 bg-muted/40 rounded-xl border border-border/50">
                {pricesPayload.PMS && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">PMS (Petrol)</span>
                    <span className="font-mono font-bold text-foreground">₦{pricesPayload.PMS.toFixed(2)}/L</span>
                  </div>
                )}
                {pricesPayload.AGO && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">AGO (Diesel)</span>
                    <span className="font-mono font-bold text-foreground">₦{pricesPayload.AGO.toFixed(2)}/L</span>
                  </div>
                )}
                {pricesPayload.DPK && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">DPK (Kerosene)</span>
                    <span className="font-mono font-bold text-foreground">₦{pricesPayload.DPK.toFixed(2)}/L</span>
                  </div>
                )}
                {pricesPayload.LPG && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">LPG (Gas)</span>
                    <span className="font-mono font-bold text-foreground">₦{pricesPayload.LPG.toFixed(2)}/L</span>
                  </div>
                )}
              </div>
              {effectiveDateTime ? (
                <p className="mt-4 text-sm">
                  These prices will take effect on <strong className="text-foreground">{new Date(effectiveDateTime).toLocaleString()}</strong>.
                </p>
              ) : (
                <p className="mt-4 text-sm">
                  These prices will take effect <strong className="text-foreground">immediately</strong>.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-xl h-10">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmSave} 
              className="rounded-xl h-10 bg-primary text-primary-foreground"
            >
              Confirm Deployment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
