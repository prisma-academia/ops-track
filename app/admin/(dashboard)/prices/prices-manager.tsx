"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  ColumnDef,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Edit, Fuel, MapPin, Save, Search, X } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { apiPost } from "@/lib/client/api"
import type { ProductType } from "@/lib/generated/prisma/client"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"

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
  }

  const updatePrice = (fuelType: keyof typeof editingPrices, value: string) => {
    setEditingPrices((prev) => ({
      ...prev,
      [fuelType]: value,
    }))
  }

  const handleSave = async () => {
    const selectedStationIds = Object.keys(selectedStations).filter(
      (key) => selectedStations[key]
    )

    if (selectedStationIds.length === 0) {
      toast.error("Please select at least one station from the table")
      return
    }

    // Determine which prices to send
    const pricesPayload: Record<string, number> = {};
    if (editingPrices.PMS) pricesPayload.PMS = Number(editingPrices.PMS);
    if (editingPrices.AGO) pricesPayload.AGO = Number(editingPrices.AGO);
    if (editingPrices.DPK) pricesPayload.DPK = Number(editingPrices.DPK);
    if (editingPrices.LPG) pricesPayload.LPG = Number(editingPrices.LPG);

    if (Object.keys(pricesPayload).length === 0) {
      toast.error("Please enter a new price for at least one fuel type")
      return
    }

    setIsSubmitting(true)

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

    // Reset form
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
          <div className="flex items-center justify-center">
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && "indeterminate")
              }
              onCheckedChange={(value) =>
                table.toggleAllPageRowsSelected(!!value)
              }
              aria-label="Select all"
            />
          </div>
        ),
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
            />
          </div>
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: "Station",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <MapPin className="w-3 h-3" />
              {row.original.location || row.original.region} • {row.original.code}
            </div>
          </div>
        ),
      },
      {
        id: "pms",
        header: "PMS (Petrol)",
        cell: ({ row }) => {
          const pms = row.original.fuels.PMS;
          return pms ? (
            <div className="text-start">
              <div className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md w-fit">
                ₦ {pms.price.toFixed(2)}/L
              </div>
            </div>
          ) : <span className="text-muted-foreground text-sm">-</span>
        },
      },
      {
        id: "ago",
        header: "AGO (Diesel)",
        cell: ({ row }) => {
          const ago = row.original.fuels.AGO;
          return ago ? (
            <div className="text-start">
              <div className="font-semibold text-stone-700 bg-stone-100 px-2 py-0.5 rounded-md w-fit">
                ₦ {ago.price.toFixed(2)}/L
              </div>
            </div>
          ) : <span className="text-muted-foreground text-sm">-</span>
        },
      },
      {
        id: "dpk",
        header: "DPK (Kerosene)",
        cell: ({ row }) => {
          const dpk = row.original.fuels.DPK;
          return dpk ? (
            <div className="text-start">
              <div className="font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md w-fit">
                ₦ {dpk.price.toFixed(2)}/L
              </div>
            </div>
          ) : <span className="text-muted-foreground text-sm">-</span>
        },
      },
      {
        id: "lpg",
        header: "LPG (Gas)",
        cell: ({ row }) => {
          const lpg = row.original.fuels.LPG;
          return lpg ? (
            <div className="text-start">
              <div className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md w-fit">
                ₦ {lpg.price.toFixed(2)}/L
              </div>
            </div>
          ) : <span className="text-muted-foreground text-sm">-</span>
        },
      },
    ],
    []
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
        pageSize: 10,
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
      <div className="grid grid-cols-1 xl:grid-cols-4 items-start gap-6">
        
        {/* Left Side: Price Editing Card */}
        <Card className="xl:col-span-1 shadow-sm h-fit">
          <CardHeader className="bg-stone-50 border-b pb-4">
            <div>
              <CardTitle className="text-md flex items-center gap-2">
                <Fuel size={18} className="text-stone-500" />
                Update Fuel Prices
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Leave blank to keep existing prices
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-5">
            {/* PMS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-rose-700">PMS (Petrol)</Label>
                {!isEditing && averages.PMS > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    Avg: ₦{averages.PMS.toFixed(2)}
                  </Badge>
                )}
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <span className="text-md font-bold text-stone-400">₦</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 650.00"
                    value={editingPrices.PMS}
                    onChange={(e) => updatePrice("PMS", e.target.value)}
                    className="text-lg font-bold h-11"
                  />
                  <span className="text-sm text-muted-foreground">/L</span>
                </div>
              ) : (
                <div className="text-xl font-bold font-mono">
                  {averages.PMS ? `₦ ${averages.PMS.toFixed(2)}/L` : "-"}
                </div>
              )}
            </div>

            {/* AGO */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-stone-700">AGO (Diesel)</Label>
                {!isEditing && averages.AGO > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    Avg: ₦{averages.AGO.toFixed(2)}
                  </Badge>
                )}
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <span className="text-md font-bold text-stone-400">₦</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1200.00"
                    value={editingPrices.AGO}
                    onChange={(e) => updatePrice("AGO", e.target.value)}
                    className="text-lg font-bold h-11"
                  />
                  <span className="text-sm text-muted-foreground">/L</span>
                </div>
              ) : (
                <div className="text-xl font-bold font-mono">
                  {averages.AGO ? `₦ ${averages.AGO.toFixed(2)}/L` : "-"}
                </div>
              )}
            </div>

            {/* DPK */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-amber-700">DPK (Kerosene)</Label>
                {!isEditing && averages.DPK > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    Avg: ₦{averages.DPK.toFixed(2)}
                  </Badge>
                )}
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <span className="text-md font-bold text-stone-400">₦</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 1000.00"
                    value={editingPrices.DPK}
                    onChange={(e) => updatePrice("DPK", e.target.value)}
                    className="text-lg font-bold h-11"
                  />
                  <span className="text-sm text-muted-foreground">/L</span>
                </div>
              ) : (
                <div className="text-xl font-bold font-mono">
                  {averages.DPK ? `₦ ${averages.DPK.toFixed(2)}/L` : "-"}
                </div>
              )}
            </div>

            {/* LPG */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-blue-700">LPG (Gas)</Label>
                {!isEditing && averages.LPG > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-mono">
                    Avg: ₦{averages.LPG.toFixed(2)}
                  </Badge>
                )}
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <span className="text-md font-bold text-stone-400">₦</span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 950.00"
                    value={editingPrices.LPG}
                    onChange={(e) => updatePrice("LPG", e.target.value)}
                    className="text-lg font-bold h-11"
                  />
                  <span className="text-sm text-muted-foreground">/L</span>
                </div>
              ) : (
                <div className="text-xl font-bold font-mono">
                  {averages.LPG ? `₦ ${averages.LPG.toFixed(2)}/L` : "-"}
                </div>
              )}
            </div>

            {/* Station Selection and DateTime */}
            {isEditing && (
              <div className="pt-4 border-t space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="effective-datetime" className="text-sm font-semibold">
                    Effective Date & Time
                  </Label>
                  <Input
                    id="effective-datetime"
                    type="datetime-local"
                    value={effectiveDateTime}
                    onChange={(e) => setEffectiveDateTime(e.target.value)}
                    className="bg-stone-50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional. Defaults to immediately.
                  </p>
                </div>
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-md border border-blue-100 flex gap-2">
                  <MapPin className="size-4 shrink-0" />
                  Please select the stations you want to apply these prices to from the table on the right.
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t space-y-2">
              {!isEditing ? (
                <Button
                  variant="default"
                  className="w-full h-12 font-bold"
                  onClick={handleEdit}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Station Prices
                </Button>
              ) : (
                <div className="space-y-3">
                  <Button
                    variant="default"
                    className="w-full h-12 font-bold"
                    onClick={handleSave}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Saving..." : (
                      <><Save className="w-4 h-4 mr-2" /> Save Changes</>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Stations Table */}
        <Card className="xl:col-span-3 shadow-sm h-fit">
          <CardHeader className="bg-white border-b px-5 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Network Stations</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  View and select stations for price updates
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search stations or regions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-stone-50"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id} className="bg-stone-50/50">
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} className="whitespace-nowrap px-4 py-3">
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
                        className={row.getIsSelected() ? "bg-blue-50/50" : "hover:bg-stone-50/50"}
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
                        className="h-32 text-center text-stone-500"
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
              <div className="flex items-center justify-between p-4 border-t text-sm text-muted-foreground bg-stone-50/30">
                <div>
                  Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) *
                      table.getState().pagination.pageSize,
                    filteredStations.length
                  )}{" "}
                  of {filteredStations.length} stations
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
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
  )
}
