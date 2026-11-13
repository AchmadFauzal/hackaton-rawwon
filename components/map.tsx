// src/components/map.tsx
"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Popup,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  CityData,
  ComputedSawahResult,
  computeSawahPrediction,
} from "@/data/dummySawahData";

// Icon Bendungan / Dam Custom
const damIcon = L.divIcon({
  className: "custom-dam-icon",
  html: `<div style="background:#0284c7;color:white;border:2px solid white;border-radius:9999px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.55);font-weight:700;font-size:10px;letter-spacing:0.04em;">DAM</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

export const FASE_COLORS: Record<
  number,
  { fill: string; border: string; label: string }
> = {
  1: {
    fill: "#10b981", // Hijau Emerald
    border: "#047857",
    label: "Masa Tanam 1 (MT-1)",
  },
  2: {
    fill: "#0ea5e9", // Biru Langit
    border: "#0369a1",
    label: "Masa Tanam 2 (MT-2)",
  },
  3: {
    fill: "#f59e0b", // Kuning Amber
    border: "#b45309",
    label: "Masa Tanam 3 (MT-3)",
  },
  4: {
    fill: "#8b5cf6", // Ungu Violet
    border: "#5b21b6",
    label: "Masa Tanam 4 (MT-4)",
  },
  0: {
    fill: "#64748b", // Abu-abu (Tidak Masa Tanam / Mentok MT-3)
    border: "#334155",
    label: "Tidak Masa Tanam (Bera)",
  },
};

interface MapProps {
  selectedCity: CityData;
  selectedMonth: number;
  selectedYear: string;
  activeBasemap: "osm" | "topo" | "satellite";
  selectedSawah: ComputedSawahResult | null;
  onSelectSawah: (sawah: ComputedSawahResult) => void;
  mlRunCount: number;
}

// Menggeser kamera peta secara halus saat Kabupaten/Kota diganti
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.3 });
  }, [center, zoom, map]);

  return null;
}

// Menghitung titik tengah poligon untuk ujung garis jarak dari bendungan
function getPolygonCenter(coords: [number, number][]): [number, number] {
  const lat = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
  const lng = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
  return [lat, lng];
}

export default function Map({
  selectedCity,
  selectedMonth,
  selectedYear,
  activeBasemap,
  selectedSawah,
  onSelectSawah,
  mlRunCount,
}: MapProps) {
  return (
    <MapContainer
      center={selectedCity.center}
      zoom={selectedCity.zoom}
      scrollWheelZoom={true}
      className="w-full h-full z-0"
    >
      <MapController center={selectedCity.center} zoom={selectedCity.zoom} />

      {/* Basemap Layer */}
      {activeBasemap === "satellite" && (
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye"
          maxZoom={18}
        />
      )}
      {activeBasemap === "topo" && (
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles © Esri — Esri, USGS, FAO, NPS, NRCAN"
          maxZoom={18}
        />
      )}
      {activeBasemap === "osm" && (
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />
      )}

      {/* Marker Bendungan / Dam Utama Wilayah */}
      <Marker position={selectedCity.bendungan.coordinates} icon={damIcon}>
        <Popup>
          <div className="p-1 font-sans text-xs min-w-[190px]">
            <div className="text-[10px] font-bold uppercase text-sky-600">
              Sumber Irigasi Utama
            </div>
            <div className="font-bold text-slate-900 text-sm mt-0.5">
              {selectedCity.bendungan.nama}
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-slate-200 space-y-1 text-slate-600">
              <div>
                Kapasitas: <b>{selectedCity.bendungan.kapasitasJutaM3} Juta m³</b>
              </div>
              <div>
                Status Debit:{" "}
                <b className="text-emerald-600">{selectedCity.bendungan.statusDebit}</b>
              </div>
            </div>
          </div>
        </Popup>
      </Marker>

      {/* Garis Jarak Irigasi dari Bendungan ke Sawah yang Diklik */}
      {selectedSawah && (
        <Polyline
          positions={[
            selectedCity.bendungan.coordinates,
            getPolygonCenter(selectedSawah.coordinates),
          ]}
          pathOptions={{
            color: "#38bdf8",
            weight: 2.5,
            dashArray: "6, 6",
          }}
        />
      )}

      {/* Layer Polygon Lahan Sawah */}
      {selectedCity.lahan.map((rawSawah) => {
        const computed = computeSawahPrediction(
          rawSawah,
          selectedMonth,
          selectedYear,
          mlRunCount,
          selectedCity.maxMasaTanamPerTahun
        );
        const colorStyle = FASE_COLORS[computed.faseTanam];
        const isSelected = selectedSawah?.id === computed.id;

        return (
          <Polygon
            key={`${computed.id}-${selectedMonth}-${selectedYear}-${mlRunCount}`}
            positions={computed.coordinates}
            pathOptions={{
              fillColor: colorStyle.fill,
              fillOpacity: isSelected ? 0.75 : 0.5,
              color: isSelected ? "#ffffff" : colorStyle.border,
              weight: isSelected ? 3 : 2,
            }}
            eventHandlers={{
              click: () => {
                onSelectSawah(computed);
              },
            }}
          >
            <Popup>
              <div className="p-1 min-w-[230px] font-sans">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {selectedCity.nama} • {selectedYear}
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {computed.namaBlok}
                </div>
                <div
                  className="mt-1.5 inline-block px-2 py-0.5 rounded text-[11px] font-bold text-white"
                  style={{ backgroundColor: colorStyle.fill }}
                >
                  {colorStyle.label}
                </div>
                <div className="mt-2 pt-2 border-t border-slate-200 text-xs space-y-1 text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jarak ke Dam:</span>
                    <span className="font-mono font-bold text-sky-700">
                      {computed.jarakBendunganKm} km ({computed.saluranIrigasi})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jenis & pH Tanah:</span>
                    <span className="font-semibold">
                      {computed.jenisTanah} (pH {computed.phTanah})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kelembapan Tanah:</span>
                    <span className="font-mono font-bold">
                      {computed.kelembapanAktual}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Curah Hujan:</span>
                    <span className="font-mono font-bold">
                      {computed.curahHujanAktual} mm
                    </span>
                  </div>
                  <div className="pt-1 border-t border-slate-100">
                    <span className="text-slate-500 block text-[10px]">
                      Rekomendasi Tanaman:
                    </span>
                    <span className="font-bold text-emerald-700">
                      {computed.rekomendasiTanaman}
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Polygon>
        );
      })}
    </MapContainer>
  );
}