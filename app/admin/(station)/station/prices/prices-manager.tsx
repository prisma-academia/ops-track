"use client"

import { useMemo, useState } from "react"
import { format, formatDistanceToNow } from "date-fns"
import type { ProductType } from "@/lib/generated/prisma/client"

import { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChevronDown,
} from "lucide-react"

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

import { DataTable } from "@/components/data-table"

type HistoricalPriceRecord = PriceControlRow & { fuelType: string }

const historyColumns: ColumnDef<HistoricalPriceRecord>[] = [
  {
    accessorKey: "fuelType",
    header: "Product",
    cell: ({ row }) => <Badge variant="secondary">{row.original.fuelType}</Badge>,
  },
  {
    accessorKey: "pricePerLiter",
    header: "Price",
    cell: ({ row }) => (
      <span className="font-mono text-sm tabular-nums">
        ₦{Number(row.original.pricePerLiter).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    ),
  },
  {
    accessorKey: "effectiveFrom",
    header: "Effective From",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(row.original.effectiveFrom), "MMM d, yyyy 'at' h:mm a")}
      </span>
    ),
  },
  {
    id: "timeAgo",
    header: "Time Ago",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatDistanceToNow(new Date(row.original.effectiveFrom), { addSuffix: true })}
      </span>
    ),
  },
]

// ── Main Component ───────────────────────────────────────────────────────────

export function PricesManager({
  stations,
  currentPrices,
  allPrices,
}: {
  stations: Station[]
  currentPrices: PriceControlRow[]
  allPrices: PriceControlRow[]
}) {
  const [expandedStations, setExpandedStations] = useState<Record<string, boolean>>({})

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

  const toggleStationExpanded = (stationId: string) => {
    setExpandedStations((prev) => ({ ...prev, [stationId]: !prev[stationId] }))
  }

  // Build history data for a station
  const getHistoryData = (stationId: string): HistoricalPriceRecord[] => {
    const historyByProduct = priceHistoryIndex[stationId] ?? {}
    const allHistorical: HistoricalPriceRecord[] = []
    FUEL_TYPES.forEach((fuelType) => {
      const records = historyByProduct[fuelType] ?? []
      const historical = records.slice(1, 11)
      historical.forEach((record) => {
        allHistorical.push({ ...record, fuelType })
      })
    })
    allHistorical.sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())
    return allHistorical
  }

  // Table columns
  const columns = useMemo<ColumnDef<MappedStation>[]>(
    () => [
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
        accessorKey: "lga",
        header: "LGA",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.lga || "—"}</Badge>
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
              onClick={(e) => {
                e.stopPropagation()
                toggleStationExpanded(row.original.id)
              }}
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

  // Custom row renderer to inject history below expanded rows
  const renderExpandedRow = (row: MappedStation) => {
    if (!expandedStations[row.id]) return null
    const historyData = getHistoryData(row.id)
    if (historyData.length === 0) return null
    return (
      <div className="px-8 py-6 bg-muted/5 border-b">
        <DataTable
          columns={historyColumns}
          data={historyData}
          title={`Price Change History — ${row.name}`}
          pageSize={10}
          empty="No price change history available."
        />
      </div>
    )
  }

  return (
    <DataTable
      columns={columns}
      data={stationsData}
      searchKey="name"
      searchPlaceholder="Search stations..."
      pageSize={15}
      empty="No stations match your search."
      getRowClassName={(row) =>
        expandedStations[row.id] ? "bg-muted/10" : ""
      }
      renderSubRow={renderExpandedRow}
    />
  )
}
