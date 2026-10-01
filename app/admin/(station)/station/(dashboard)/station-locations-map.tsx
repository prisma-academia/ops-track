"use client"

import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
    Map,
    MapControls,
    MapMarker,
    MarkerContent,
    MarkerTooltip,
    type MapRef,
} from "@/components/ui/map"
import { Fuel, Search } from "lucide-react"
import { useRef, useState } from "react"

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
  tankCount: number
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
  const [search, setSearch] = useState("")
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null)

  function focusStation(station: StationMapStation) {
    setSelectedStationId(station.id)
    if (hasCoordinates(station)) {
      mapRef.current?.flyTo({
        center: [station.longitude, station.latitude],
        zoom: 12,
        duration: 900,
      })
    }
  }

  const normalizedSearch = search.trim().toLocaleLowerCase()
  const filteredStations = stations.filter((station) =>
    [station.name, station.code, station.location, station.ward, station.lga, station.state]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase().includes(normalizedSearch))
  )

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="space-y-1">
          <CardTitle>Station Locations</CardTitle>
          <CardDescription>Station sites across your organization</CardDescription>
        </div>
        <CardAction className="shrink-0 text-sm text-muted-foreground">
          {locatedStations.length} of {stations.length} mapped
        </CardAction>
      </CardHeader>
      <div className="grid min-h-[720px] grid-cols-1 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="relative h-[420px] min-w-0 sm:h-[480px] lg:h-[520px]">
          <Map
            ref={mapRef}
            center={center}
            zoom={locatedStations.length === 1 ? 12 : 5}
            bounds={bounds}
            fitBoundsOptions={{ padding: 48, maxZoom: 12 }}
            className="h-full w-full"
          >
            <MapControls position="top-right" showCompass />
            {locatedStations.map((station) => (
              <MapMarker
                key={station.id}
                longitude={station.longitude}
                latitude={station.latitude}
                anchor="bottom"
                onClick={() => focusStation(station)}
              >
                <MarkerContent>
                  <div className={`grid size-8 place-items-center rounded-full border-2 border-white text-primary-foreground shadow-md ${selectedStationId === station.id ? "bg-emerald-700 ring-4 ring-emerald-500/30" : "bg-primary"}`}>
                    <Fuel className="size-4" />
                  </div>
                </MarkerContent>
                <MarkerTooltip
                  offset={20}
                  className="w-64 rounded-lg border border-border bg-card p-3 text-card-foreground shadow-lg"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold leading-5">{station.name}</p>
                    <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {station.code}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-4 text-muted-foreground">
                    {[station.location, station.ward, station.lga, station.state]
                      .filter(Boolean)
                      .join(", ") || "No address recorded"}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3 border-t border-border pt-2 text-xs text-muted-foreground">
                    <span>
                      {station.latitude?.toFixed(5)}, {station.longitude?.toFixed(5)}
                    </span>
                    <span>{station.tankCount} tanks</span>
                  </div>
                </MarkerTooltip>
              </MapMarker>
            ))}
          </Map>
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
          <div className="space-y-3 border-b border-border p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search stations"
                aria-label="Search stations"
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {filteredStations.length} {filteredStations.length === 1 ? "station" : "stations"}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredStations.length > 0 ? (
              <ul className="divide-y divide-border">
                {filteredStations.map((station) => {
                  const isLocated = hasCoordinates(station)
                  const isSelected = station.id === selectedStationId
                  return (
                    <li key={station.id}>
                      <button
                        type="button"
                        onClick={() => focusStation(station)}
                        aria-current={isSelected ? "true" : undefined}
                        className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/60 ${isSelected ? "bg-muted" : ""}`}
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{station.name}</span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {[station.code, station.lga, station.state].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          <span className={`mt-1 size-2 shrink-0 rounded-full ${isLocated ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                        </span>
                        <span className="mt-2 block truncate text-xs text-muted-foreground">
                          {station.location || station.ward || (isLocated ? "Coordinates available" : "No location recorded")}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No stations match “{search}”.
              </p>
            )}
          </div>
        </aside>
      </div>
    </Card>
  )
}