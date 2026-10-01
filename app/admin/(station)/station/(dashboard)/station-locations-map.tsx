"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"
import {
    Map,
    MapControls,
    MapMarker,
    MarkerContent,
    MarkerPopup,
    MarkerTooltip,
    type MapRef,
    type MapViewport,
} from "@/components/ui/map"
import { Box } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"

export interface StationMapStation {
  id: string
  name: string
  code: string
  location: string | null
  ward: string | null
  lga: string | null
  state: string | null
  latitude: number | null
  longitude: number | null
  tanks: { productType: string; currentLiters: number; capacity: number }[]
  lastWaybill: {
    number: string
    productType: string
    liters: number
    dispatchedAt: string
  } | null
  ledgerBalance: number
}

function hasCoordinates(
  station: StationMapStation
): station is StationMapStation & { latitude: number; longitude: number } {
  return (
    station.latitude !== null &&
    station.longitude !== null &&
    Number.isFinite(station.latitude) &&
    Number.isFinite(station.longitude) &&
    station.latitude >= -90 &&
    station.latitude <= 90 &&
    station.longitude >= -180 &&
    station.longitude <= 180
  )
}

export default function StationLocationsMap({
  stations,
}: {
  stations: StationMapStation[]
}) {
  const locatedStations = stations.filter(hasCoordinates)
  const defaultCenter: [number, number] = [8.6753, 9.082]
  const center: [number, number] = locatedStations.length === 1
    ? [locatedStations[0].longitude, locatedStations[0].latitude]
    : defaultCenter
  const bounds = locatedStations.length > 1
    ? [
        [
          Math.min(...locatedStations.map((station) => station.longitude)),
          Math.min(...locatedStations.map((station) => station.latitude)),
        ],
        [
          Math.max(...locatedStations.map((station) => station.longitude)),
          Math.max(...locatedStations.map((station) => station.latitude)),
        ],
      ] as [[number, number], [number, number]]
    : undefined

  const mapRef = useRef<MapRef>(null)
  const [selectedStation, setSelectedStation] = useState<StationMapStation | null>(stations[0] ?? null)
  const selectedStationId = selectedStation?.id ?? null
  const [is3d, setIs3d] = useState(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [viewport, setViewport] = useState<MapViewport>({
    center,
    zoom: locatedStations.length === 1 ? 12 : 5,
    bearing: 0,
    pitch: 0,
  })

  function focusStation(station: StationMapStation) {
    setSelectedStation(station)
    if (hasCoordinates(station)) {
      setViewport((current) => ({
        ...current,
        center: [station.longitude, station.latitude],
        zoom: 12,
      }))
    }
  }

  useEffect(() => {
    mapRef.current?.easeTo({ pitch: is3d ? 60 : 0, duration: 600 })
  }, [is3d])

  const productStorage = selectedStation?.tanks.reduce<Record<string, { liters: number; capacity: number }>>(
    (totals, tank) => {
      totals[tank.productType] ??= { liters: 0, capacity: 0 }
      totals[tank.productType].liters += tank.currentLiters
      totals[tank.productType].capacity += tank.capacity
      return totals
    },
    {}
  ) ?? {}

  return (
    <Card className="w-full overflow-hidden py-0">
      <div className="grid min-h-[720px] grid-cols-1 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="relative h-[420px] min-w-0 sm:h-[480px] lg:h-[520px]">
          <Map
            ref={mapRef}
            viewport={viewport}
            onViewportChange={setViewport}
            bounds={bounds}
            fitBoundsOptions={{ padding: 48, maxZoom: 12 }}
            styles={is3d ? {
              light: "https://tiles.openfreemap.org/styles/liberty",
              dark: "https://tiles.openfreemap.org/styles/liberty",
            } : undefined}
            className="h-full w-full"
          >
            <MapControls
              position="top-right"
              showCompass
              showLocate
              showFullscreen
              onLocate={({ longitude, latitude }) => {
                setUserLocation([longitude, latitude])
                setViewport((current) => ({
                  ...current,
                  center: [longitude, latitude],
                  zoom: 14,
                }))
              }}
            />
            {locatedStations.map((station) => (
              <MapMarker
                key={station.id}
                longitude={station.longitude}
                latitude={station.latitude}
                anchor="bottom"
                onClick={() => focusStation(station)}
              >
                <MarkerContent>
                  <div className={`grid size-10 place-items-center rounded-full border-2 border-white bg-background shadow-md ${selectedStationId === station.id ? "ring-4 ring-emerald-500/30" : ""}`}>
                    <Image
                      src="/assets/icons/gps.png"
                      alt=""
                      width={500}
                      height={300}
                      className="h-8 w-8 object-contain"
                    />
                  </div>
                </MarkerContent>
                <MarkerTooltip
                  offset={20}
                  className="w-56 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-lg"
                >
                  <div className="mb-2 grid h-20 place-items-center rounded-md bg-muted">
                    <Image
                      src="/assets/icons/gps.png"
                      alt="Station location placeholder"
                      width={500}
                      height={300}
                      className="h-16 w-16 object-contain"
                    />
                  </div>
                  <p className="text-sm font-semibold">{station.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{station.code}</p>
                </MarkerTooltip>
                <MarkerPopup
                  closeButton
                  className="w-72 rounded-lg border border-border bg-card p-4 text-card-foreground shadow-xl"
                >
                  <div className="flex items-start justify-between gap-3 pr-5">
                    <div>
                      <p className="text-base font-semibold leading-5">{station.name}</p>
                      <p className="mt-1 text-xs font-medium text-muted-foreground">{station.code}</p>
                    </div>
                    <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                      Mapped
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-5 text-muted-foreground">
                    {[station.location, station.ward, station.lga, station.state]
                      .filter(Boolean)
                      .join(", ") || "No address recorded"}
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-3">
                    <div>
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">Storage</p>
                      <p className="mt-1 text-sm font-semibold">{station.tanks.length} tanks</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-medium uppercase text-muted-foreground">Coordinates</p>
                      <p className="mt-1 text-xs font-medium">
                        {station.latitude.toFixed(5)}, {station.longitude.toFixed(5)}
                      </p>
                    </div>
                  </div>
                  <Button asChild size="sm" className="mt-3 w-full">
                    <Link href={`/admin/station/stations/${station.id}`}>Open station record</Link>
                  </Button>
                </MarkerPopup>
              </MapMarker>
            ))}
            {userLocation && (
              <MapMarker longitude={userLocation[0]} latitude={userLocation[1]} anchor="center">
                <MarkerContent>
                  <div className="grid size-5 place-items-center rounded-full border-2 border-white bg-sky-600 shadow-lg ring-4 ring-sky-500/25">
                    <span className="size-1.5 rounded-full bg-white" />
                  </div>
                </MarkerContent>
                <MarkerTooltip>Your current location</MarkerTooltip>
              </MapMarker>
            )}
          </Map>
          <div className="absolute left-1/2 top-3 z-10 w-[min(24rem,calc(100%-6rem))] -translate-x-1/2">
            <Combobox
              items={stations}
              value={selectedStation}
              onValueChange={(station) => {
                if (station) focusStation(station)
              }}
              itemToStringValue={(station: StationMapStation) => station.name}
            >
              <ComboboxInput
                placeholder="Search stations..."
                aria-label="Search stations"
                showTrigger={false}
                className="h-11 border-border bg-background/95 shadow-lg backdrop-blur"
              />
              <ComboboxContent className="w-full">
                <ComboboxEmpty>No stations found.</ComboboxEmpty>
                <ComboboxList>
                  {(station: StationMapStation) => (
                    <ComboboxItem key={station.id} value={station}>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{station.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[station.code, station.lga, station.state].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>
          <div className="absolute left-3 top-3 z-10">
            <Button
              type="button"
              size="sm"
              variant={is3d ? "default" : "outline"}
              aria-pressed={is3d}
              onClick={() => setIs3d((enabled) => !enabled)}
              className="shadow-md"
            >
              <Box className="mr-2 size-4" />
              {is3d ? "3D view" : "2D view"}
            </Button>
          </div>
          {locatedStations.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-[1000] flex items-center justify-center p-4">
              <div className="rounded-lg border border-border bg-card/95 px-5 py-4 text-center shadow-md">
                <p className="text-sm font-medium">No station coordinates available</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add latitude and longitude to a station to place it on the map.
                </p>
              </div>
            </div>
          )}
        </div>
        <aside className="flex min-h-[300px] flex-col border-t border-border lg:min-h-0 lg:border-l lg:border-t-0">
          {selectedStation ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="flex items-center gap-3">
                <div className="grid size-16 shrink-0 place-items-center rounded-lg bg-muted">
                  <Image
                    src="/assets/icons/gps.png"
                    alt="Station placeholder"
                    width={500}
                    height={300}
                    className="size-12 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{selectedStation.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedStation.code}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {[selectedStation.location, selectedStation.ward, selectedStation.lga, selectedStation.state]
                      .filter(Boolean)
                      .join(", ") || "No address recorded"}
                  </p>
                </div>
              </div>

              <section className="mt-6">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">Product volumes / storage</h3>
                <div className="mt-2 divide-y divide-border rounded-md border border-border">
                  {(["PMS", "AGO", "DPK", "LPG"] as const).map((product) => {
                    const stock = productStorage[product] ?? { liters: 0, capacity: 0 }
                    return (
                      <div key={product} className="flex items-center justify-between gap-3 px-3 py-2.5">
                        <span className="text-sm font-medium">{product}</span>
                        <span className="text-right text-xs text-muted-foreground">
                          {stock.liters.toLocaleString()} / {stock.capacity.toLocaleString()} L
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>

              <section className="mt-5">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">Last waybill</h3>
                {selectedStation.lastWaybill ? (
                  <div className="mt-2 rounded-md border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{selectedStation.lastWaybill.number}</span>
                      <span className="text-xs text-muted-foreground">{selectedStation.lastWaybill.productType}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {selectedStation.lastWaybill.liters.toLocaleString()} L · {new Date(selectedStation.lastWaybill.dispatchedAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">No waybills recorded.</p>
                )}
              </section>

              <section className="mt-5 rounded-md bg-muted/60 p-3">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">Station ledger balance</h3>
                <p className={`mt-1 text-lg font-semibold ${selectedStation.ledgerBalance < 0 ? "text-destructive" : "text-foreground"}`}>
                  ₦{selectedStation.ledgerBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </section>

              <Button asChild size="sm" className="mt-5 w-full">
                <Link href={`/admin/station/stations/${selectedStation.id}`}>Open station record</Link>
              </Button>
            </div>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">No stations available.</p>
          )}
        </aside>
      </div>
    </Card>
  )
}