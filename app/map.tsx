// src/components/map.tsx
"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix icon Marker Leaflet
const DefaultIcon = L.icon({
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapProps {
  activeBasemap: "osm" | "topo" | "satellite";
}

// Sub-komponen untuk memuat basemap dinamis
function TileLayerSwitcher({ activeBasemap }: { activeBasemap: "osm" | "topo" | "satellite" }) {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
  }, [map]);

  if (activeBasemap === "topo") {
    return (
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri &mdash; Esri, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey"
        maxZoom={18}
      />
    );
  }

  if (activeBasemap === "satellite") {
    return (
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping"
        maxZoom={18}
      />
    );
  }

  // Default OpenStreetMap
  return (
    <TileLayer
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> | Batas Wilayah: <a href="https://github.com/cahyadsn/wilayah_boundaries" target="_blank" class="underline">cahyadsn</a>'
      maxZoom={19}
    />
  );
}

export default function Map({ activeBasemap }: MapProps) {
  const centerPosition: [number, number] = [-7.15, 110.14];

  return (
    <MapContainer
      center={centerPosition}
      zoom={9}
      scrollWheelZoom={true}
      zoomControl={false}
      className="w-full h-full z-0"
    >
      <TileLayerSwitcher activeBasemap={activeBasemap} />
    </MapContainer>
  );
}