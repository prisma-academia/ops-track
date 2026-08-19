"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Truck } from "lucide-react";

// Fix for default Leaflet markers in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface LeafletMapProps {
  transports: any[];
}

export default function LeafletMap({ transports }: LeafletMapProps) {
  // Let's assume a default center of Nigeria
  const defaultCenter: [number, number] = [9.0820, 8.6753];
  
  // Create a custom icon for trucks
  const truckIcon = new L.Icon({
    iconUrl: "/assets/icons/gas-truck.png",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={6} 
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        {/* Render markers for each transport based on destination */}
        {transports.map((t, idx) => {
          // Add some jitter for multiple trucks at the same destination
          const lat = 9.0820 + (Math.random() - 0.5) * 2;
          const lng = 8.6753 + (Math.random() - 0.5) * 2;
          
          return (
            <Marker key={t.id || idx} position={[lat, lng]} icon={truckIcon}>
              <Popup>
                <div className="font-sans">
                  <p className="font-bold text-sm">{t.truck?.plateNumber || "Unknown Truck"}</p>
                  <p className="text-xs">{t.transporter?.name}</p>
                  <p className="text-xs font-semibold mt-1">Destination: {t.destination}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
