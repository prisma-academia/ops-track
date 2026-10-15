"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
  type MapViewport,
} from "@/components/ui/map";

type DepotLookup = {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
};

type MapTransport = {
  id: string;
  destination: string;
  status: string;
  truck?: { plateNumber?: string | null; name?: string | null } | null;
  transporter?: { name?: string | null } | null;
  deliveries?: {
    station?: {
      name?: string | null;
      latitude?: number | string | null;
      longitude?: number | string | null;
    } | null;
  }[];
};

function toCoord(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function hasCoords(lat: number | null, lng: number | null) {
  return (
    lat !== null &&
    lng !== null &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

const DEFAULT_CENTER: [number, number] = [8.6753, 9.082];

export default function OrderTransportsMap({
  sourceDepot,
  depots,
  transports,
}: {
  sourceDepot?: string | null;
  depots: DepotLookup[];
  transports: MapTransport[];
}) {
  const depot = depots.find(
    (d) => d.name.toLowerCase() === (sourceDepot || "").toLowerCase(),
  );

  const destinationMarkers = useMemo(() => {
    const seen = new Set<string>();
    const markers: {
      id: string;
      label: string;
      longitude: number;
      latitude: number;
      transportLabel: string;
    }[] = [];

    for (const transport of transports) {
      const primaryDelivery = transport.deliveries?.[0];
      const station = primaryDelivery?.station;
      const lat = toCoord(station?.latitude);
      const lng = toCoord(station?.longitude);
      if (!hasCoords(lat, lng)) continue;

      const key = `${lng},${lat}`;
      if (seen.has(key)) continue;
      seen.add(key);

      markers.push({
        id: transport.id,
        label: station?.name || transport.destination,
        longitude: lng!,
        latitude: lat!,
        transportLabel:
          transport.truck?.plateNumber ||
          transport.truck?.name ||
          transport.destination,
      });
    }

    return markers;
  }, [transports]);

  const points = useMemo(() => {
    const rows: { longitude: number; latitude: number }[] = [];
    const depotLat = toCoord(depot?.latitude);
    const depotLng = toCoord(depot?.longitude);
    if (hasCoords(depotLat, depotLng)) {
      rows.push({ longitude: depotLng!, latitude: depotLat! });
    }
    for (const marker of destinationMarkers) {
      rows.push({ longitude: marker.longitude, latitude: marker.latitude });
    }
    return rows;
  }, [depot, destinationMarkers]);

  const bounds =
    points.length > 1
      ? ([
          [
            Math.min(...points.map((p) => p.longitude)),
            Math.min(...points.map((p) => p.latitude)),
          ],
          [
            Math.max(...points.map((p) => p.longitude)),
            Math.max(...points.map((p) => p.latitude)),
          ],
        ] as [[number, number], [number, number]])
      : undefined;

  const initialCenter: [number, number] =
    points.length === 1
      ? [points[0].longitude, points[0].latitude]
      : DEFAULT_CENTER;

  const [viewport, setViewport] = useState<MapViewport>({
    center: initialCenter,
    zoom: points.length === 1 ? 10 : 5,
    bearing: 0,
    pitch: 0,
  });

  const hasAnyMarker = points.length > 0;

  return (
    <Card className="overflow-hidden py-0 shadow-sm border-stone-200 dark:border-stone-800">
      <div className="relative h-[320px] min-h-[280px] w-full">
        <Map
          viewport={viewport}
          onViewportChange={setViewport}
          bounds={bounds}
          fitBoundsOptions={{ padding: 40, maxZoom: 11 }}
          className="h-full w-full"
        >
          <MapControls position="top-right" showCompass showFullscreen />
          {hasCoords(toCoord(depot?.latitude), toCoord(depot?.longitude)) && (
            <MapMarker
              longitude={toCoord(depot?.longitude)!}
              latitude={toCoord(depot?.latitude)!}
              anchor="bottom"
            >
              <MarkerContent>
                <div className="grid size-9 place-items-center rounded-full border-2 border-white bg-amber-500 shadow-md">
                  <Image
                    src="/assets/icons/gps.png"
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 object-contain brightness-0 invert"
                  />
                </div>
              </MarkerContent>
              <MarkerTooltip className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-medium shadow-md">
                {depot?.name || sourceDepot || "Source depot"}
              </MarkerTooltip>
            </MapMarker>
          )}
          {destinationMarkers.map((marker) => (
            <MapMarker
              key={marker.id}
              longitude={marker.longitude}
              latitude={marker.latitude}
              anchor="bottom"
            >
              <MarkerContent>
                <div className="grid size-9 place-items-center rounded-full border-2 border-white bg-background shadow-md">
                  <Image
                    src="/assets/icons/gas-truck.png"
                    alt=""
                    width={24}
                    height={24}
                    className="size-6 object-contain"
                  />
                </div>
              </MarkerContent>
              <MarkerTooltip className="max-w-[14rem] rounded-lg border border-border bg-card p-2.5 text-card-foreground shadow-md">
                <p className="text-xs font-semibold truncate">{marker.label}</p>
                <p className="text-[11px] text-muted-foreground truncate">{marker.transportLabel}</p>
              </MarkerTooltip>
            </MapMarker>
          ))}
        </Map>
        {!hasAnyMarker && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
            <div className="rounded-lg border border-border bg-card/95 px-4 py-3 text-center shadow-md">
              <p className="text-sm font-medium">No map coordinates yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add depot and station latitude/longitude to show routes on the map.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
