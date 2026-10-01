"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { Box, Search } from "lucide-react"
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
  const [is3d, setIs3d] = useState(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [viewport, setViewport] = useState<MapViewport>({
    center,
    zoom: locatedStations.length === 1 ? 12 : 5,
    bearing: 0,
    pitch: 0,
  })

  function focusStation(station: StationMapStation) {
    setSelectedStationId(station.id)
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

  const normalizedSearch = search.trim().toLocaleLowerCase()
  const filteredStations = stations.filter((station) =>
    [station.name, station.code, station.location, station.ward, station.lga, station.state]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase().includes(normalizedSearch))
  )

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
                      <p className="mt-1 text-sm font-semibold">{station.tankCount} tanks</p>
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