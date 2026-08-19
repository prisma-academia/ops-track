"use client"

import { Fragment, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format, formatDistanceToNow } from "date-fns"
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
import {
  InputGroup,
  InputGroupAddon,
} from "@/components/ui/input-group"
import { FormattedNumberInput as NumberInput } from "@/components/ui/formatted-number-input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
import {
  ChevronDown,
  Edit,
  Fuel,
  History,
  Save,
  Search,
  Store,
  X,
  CalendarIcon,
} from "lucide-react"
import SpinnerEllipsis from "@/components/spinner-ellipsis"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────────────────────

type Station = {
  id: string
  name: string
  code: string
  state: string | null
  lga: string | null
  ward: string | null
  location: string | null
}

type PriceControlRow = {
  id: string
  stationId: string
  productType: ProductType
  pricePerLiter: number
  effectiveFrom: string
}

type MappedStation = Station & {
  fuels: {
    PMS?: { price: number; lastUpdate: string; date: Date }
    AGO?: { price: number; lastUpdate: string; date: Date }
    DPK?: { price: number; lastUpdate: string; date: Date }
    LPG?: { price: number; lastUpdate: string; date: Date }
  }
}

const FUEL_TYPES = ["PMS", "AGO", "DPK", "LPG"] as const
const FUEL_LABELS: Record<string, string> = {
  PMS: "PMS (Petrol)",
  AGO: "AGO (Diesel)",
  DPK: "DPK (Kerosene)",
  LPG: "LPG (Gas)",
}

// ── Price Cell ───────────────────────────────────────────────────────────────

function PriceCell({ product }: { product?: { price: number } }) {
  if (!product) return <span className="text-muted-foreground text-sm">—</span>
  return (
    <span className="font-mono text-sm tabular-nums">
      ₦{product.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </span>
  )
}

// ── Station History Row ──────────────────────────────────────────────────────

function StationHistoryRow({
  station,
  historyByProduct,
}: {
  station: MappedStation
  historyByProduct: Record<string, PriceControlRow[]>
}) {
  const hasHistory = Object.values(historyByProduct).some((h) => h.length > 1)

  if (!hasHistory) {
    return (
      <TableRow>
        <TableCell colSpan={99} className="px-12 py-4">
          <p className="text-sm text-muted-foreground">
            No price change history available for this station.
          </p>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <TableRow>
      <TableCell colSpan={99} className="p-0">
        <div className="px-12 py-4">
          <div className="flex items-center gap-2 mb-3">
            <History className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Price Change History — {station.name}
            </span>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Product</TableHead>
                <TableHead className="text-xs">Price</TableHead>
                <TableHead className="text-xs">Effective From</TableHead>
                <TableHead className="text-xs">Time Ago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {FUEL_TYPES.flatMap((fuelType) => {
                const records = historyByProduct[fuelType] ?? []
                // Skip the first record (current price), show up to 10 historical
                const historical = records.slice(1, 11)
                if (historical.length === 0) return []
                return historical.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <Badge variant="secondary">{fuelType}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm tabular-nums">
                      ₦
                      {Number(record.pricePerLiter).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(
                        new Date(record.effectiveFrom),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(record.effectiveFrom), {
                        addSuffix: true,
                      })}
                    </TableCell>
                  </TableRow>
                ))
              })}
            </TableBody>
          </Table>
        </div>
      </TableCell>
    </TableRow>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export function UpdatePricesManager({
  stations,
  currentPrices,
  allPrices,
}: {
  stations: Station[]
  currentPrices: PriceControlRow[]
  allPrices: PriceControlRow[]
}) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [expandedStations, setExpandedStations] = useState<Record<string, boolean>>({})

  const [editingPrices, setEditingPrices] = useState<{
    PMS: string
    AGO: string
    DPK: string
    LPG: string
  }>({
    PMS: "",
    AGO: "",
    DPK: "",
    LPG: "",
  })

  const [selectedStations, setSelectedStations] = useState<RowSelectionState>({})
  const [effectiveDateTime, setEffectiveDateTime] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")

  // Build price history index: stationId → productType → PriceControlRow[]
  const priceHistoryIndex = useMemo(() => {
    const index: Record<string, Record<string, PriceControlRow[]>> = {}
    for (const p of allPrices) {
      if (!index[p.stationId]) index[p.stationId] = {}
      if (!index[p.stationId][p.productType]) index[p.stationId][p.productType] = []
      index[p.stationId][p.productType].push(p)
    }
    return index
  }, [allPrices])

  // Map stations data to include current active fuels
  const stationsData = useMemo<MappedStation[]>(() => {
    return stations.map((station) => {
      const fuels: MappedStation["fuels"] = {}
      const stationPrices = currentPrices.filter((p) => p.stationId === station.id)

      for (const p of stationPrices) {
        fuels[p.productType] = {
          price: Number(p.pricePerLiter),
          date: new Date(p.effectiveFrom),
          lastUpdate: formatDistanceToNow(new Date(p.effectiveFrom), { addSuffix: true }),
        }
      }
      return { ...station, fuels }
    })
  }, [stations, currentPrices])

  // Average prices across all stations
  const averages = useMemo(() => {
    const sums: Record<string, number> = { PMS: 0, AGO: 0, DPK: 0, LPG: 0 }
    const counts: Record<string, number> = { PMS: 0, AGO: 0, DPK: 0, LPG: 0 }

    for (const s of stationsData) {
      for (const ft of FUEL_TYPES) {
        const fuel = s.fuels[ft]
        if (fuel) {
          sums[ft] += fuel.price
          counts[ft]++
        }
      }
    }

    return Object.fromEntries(
      FUEL_TYPES.map((ft) => [ft, counts[ft] ? sums[ft] / counts[ft] : 0])
    ) as Record<string, number>
  }, [stationsData])

  const handleCancel = () => {
    setEditingPrices({ PMS: "", AGO: "", DPK: "", LPG: "" })
    setSelectedStations({})
    setEffectiveDateTime("")
    setShowConfirmDialog(false)
  }

  const updatePrice = (fuelType: keyof typeof editingPrices, value: string) => {
    setEditingPrices((prev) => ({ ...prev, [fuelType]: value }))
  }

  const selectedStationIds = Object.keys(selectedStations).filter(
    (key) => selectedStations[key]
  )

  const pricesPayload = useMemo(() => {
    const payload: Record<string, number> = {}
    for (const ft of FUEL_TYPES) {
      if (editingPrices[ft]) payload[ft] = Number(editingPrices[ft])
    }
    return payload
  }, [editingPrices])

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

    let effectiveFrom: string | undefined = undefined
    if (effectiveDateTime) {
      effectiveFrom = new Date(effectiveDateTime).toISOString()
    }

    const res = await apiPost("/api/tenant/prices/bulk", {
      prices: pricesPayload,
      stationIds: selectedStationIds,
      effectiveFrom,
    })

    setIsSubmitting(false)

    if (res.error) {
      toast.error(res.error.message)
      return
    }

    toast.success(
      `Price changes applied successfully to ${selectedStationIds.length} station(s)`
    )
    setShowConfirmDialog(false)
    router.push("/admin/station/prices")
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

  const toggleStationExpanded = (stationId: string) => {
    setExpandedStations((prev) => ({ ...prev, [stationId]: !prev[stationId] }))
  }

  // Table columns
  const columns = useMemo<ColumnDef<MappedStation>[]>(
    () => [
      {
        id: "select",
        header: ({ table }: any) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value: boolean) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }: any) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value: boolean) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      } satisfies ColumnDef<MappedStation>,
      {
        accessorKey: "name",
        header: "Station",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="font-medium">{row.original.name}</span>
              <span className="text-xs text-muted-foreground font-mono">
                {row.original.code}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "pms",
        header: "PMS",
        cell: ({ row }) => <PriceCell product={row.original.fuels.PMS} />,
      },
      {
        id: "ago",
        header: "AGO",
        cell: ({ row }) => <PriceCell product={row.original.fuels.AGO} />,
      },
      {
        id: "dpk",
        header: "DPK",
        cell: ({ row }) => <PriceCell product={row.original.fuels.DPK} />,
      },
      {
        id: "lpg",
        header: "LPG",
        cell: ({ row }) => <PriceCell product={row.original.fuels.LPG} />,
      },
      {
        id: "expand",
        header: "",
        cell: ({ row }) => {
          const stationHistory = priceHistoryIndex[row.original.id] ?? {}
          const hasHistory = Object.values(stationHistory).some((h) => h.length > 1)
          if (!hasHistory) return null
          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleStationExpanded(row.original.id)}
            >
              <ChevronDown
                className={`size-4 transition-transform ${
                  expandedStations[row.original.id] ? "rotate-180" : ""
                }`}
              />
            </Button>
          )
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [expandedStations, priceHistoryIndex]
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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ── Left Column: Form & Date Time ───────────────────────────── */}
      <div className="lg:col-span-1 space-y-6">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Fuel className="size-5" />
              Update Prices
            </CardTitle>
            <CardDescription>
              Enter new prices and select stations to apply.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {FUEL_TYPES.map((ft) => (
                <div key={ft} className="space-y-2">
                  <Label htmlFor={`price-${ft}`}>{FUEL_LABELS[ft]}</Label>
                  <NumberInput
                    id={`price-${ft}`}
                    placeholder={
                      averages[ft]
                        ? `Current avg: ${averages[ft].toFixed(2)}`
                        : "0.00"
                    }
                    value={editingPrices[ft]}
                    onChange={(e: any) => updatePrice(ft, e.target.value)}
                    prefixText="₦"
                  />
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Effective Date & Time</Label>
              <Input
                type="datetime-local"
                value={effectiveDateTime}
                onChange={(e) => setEffectiveDateTime(e.target.value)}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank to apply immediately.
              </p>
            </div>

            <Button onClick={initiateSave} disabled={isSubmitting} className="w-full gap-2">
              {isSubmitting ? (
                <>
                  <SpinnerEllipsis />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  <span>Apply Prices</span>
                </>
              )}
            </Button>
            {selectedStationIds.length > 0 && (
              <p className="text-sm text-center text-muted-foreground">
                <strong>{selectedStationIds.length}</strong> station(s) selected
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Right Column: Stations Table ──────────────────────────────── */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Store className="size-5" />
                  Network Stations
                </CardTitle>
                <CardDescription>
                  Select stations to apply new prices to.
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
              <Input
                placeholder="Search stations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
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
                  <Fragment key={row.id}>
                    <TableRow
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                    {expandedStations[row.original.id] && (
                      <StationHistoryRow
                        key={`${row.id}-history`}
                        station={row.original}
                        historyByProduct={priceHistoryIndex[row.original.id] ?? {}}
                      />
                    )}
                  </Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No stations match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {table.getPageCount() > 1 && (
            <>
              <Separator />
              <div className="flex items-center justify-between px-4 py-3 text-sm text-muted-foreground">
                <div>
                  Showing{" "}
                  <strong className="text-foreground">
                    {table.getState().pagination.pageIndex *
                      table.getState().pagination.pageSize +
                      1}
                  </strong>{" "}
                  to{" "}
                  <strong className="text-foreground">
                    {Math.min(
                      (table.getState().pagination.pageIndex + 1) *
                        table.getState().pagination.pageSize,
                      filteredStations.length
                    )}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-foreground">
                    {filteredStations.length}
                  </strong>{" "}
                  stations
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
            </>
          )}
        </CardContent>
      </Card>
      </div>

      {/* ── Confirmation Dialog ────────────────────────────────────────── */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Price Changes</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  You are about to deploy new prices to{" "}
                  <strong className="text-foreground">
                    {selectedStationIds.length}
                  </strong>{" "}
                  station(s).
                </p>
                <div className="space-y-2">
                  {Object.entries(pricesPayload).map(([type, price]) => (
                    <div key={type} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {FUEL_LABELS[type]}
                      </span>
                      <span className="font-mono font-bold text-foreground">
                        ₦{price.toFixed(2)}/L
                      </span>
                    </div>
                  ))}
                </div>
                <Separator />
                {effectiveDateTime ? (
                  <p className="text-sm">
                    These prices will take effect on{" "}
                    <strong className="text-foreground">
                      {format(new Date(effectiveDateTime), "PPP 'at' p")}
                    </strong>
                    .
                  </p>
                ) : (
                  <p className="text-sm">
                    These prices will take effect{" "}
                    <strong className="text-foreground">immediately</strong>.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleConfirmSave()
              }}
              disabled={isSubmitting}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <SpinnerEllipsis />
                  <span>Deploying...</span>
                </>
              ) : (
                "Confirm Deployment"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
