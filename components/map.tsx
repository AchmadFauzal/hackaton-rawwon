// components/map.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  Polyline,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import {
  ComputedSawahPrediction,
  getPropFlexible,
  isInsideJavaIsland,
} from "@/lib/geodataEngine";

interface MapProps {
  center: [number, number];
  zoom: number;
  selectedYear: string;
  sawahList: ComputedSawahPrediction[];
  reservoirs: any[];
  activeBasemap: "osm" | "topo" | "satellite";
  selectedSawah: ComputedSawahPrediction | null;
  onSelectSawah: (sawah: ComputedSawahPrediction | null) => void;
  lang: "en" | "id";
}

// =====================================================================
// 1. SIMBOL MARKER BENDUNGAN (DAM) & EMBUNG (KHUSUS PULAU JAWA)
// =====================================================================
const createDamBadgeIcon = () =>
  L.divIcon({
    className: "custom-dam-badge",
    html: `
      <div style="
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
        border: 2px solid #ffffff;
        box-shadow: 0 0 12px rgba(14, 165, 233, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        font-family: ui-monospace, SFMono-Regular, monospace;
        font-size: 8px;
        font-weight: 800;
        letter-spacing: 0.02em;
        cursor: pointer;
      ">DAM</div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const createEmbungBadgeIcon = () =>
  L.divIcon({
    className: "custom-embung-badge",
    html: `
      <div style="
        width: 22px;
        height: 22px;
        border-radius: 5px;
        transform: rotate(45deg);
        background: linear-gradient(135deg, #059669 0%, #0d9488 100%);
        border: 2px solid #ffffff;
        box-shadow: 0 0 10px rgba(16, 185, 129, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      ">
        <span style="
          transform: rotate(-45deg);
          color: #ffffff;
          font-family: ui-monospace, SFMono-Regular, monospace;
          font-size: 7px;
          font-weight: 800;
        ">EMB</span>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

// =====================================================================
// 2. PALET WARNA POLIGON SAWAH & BADGE MASA TANAM
// =====================================================================
const FASE_STYLE: Record<
  number,
  {
    fill: string;
    stroke: string;
    badgeBg: string;
    textColor: string;
    labelEn: string;
    labelId: string;
  }
> = {
  1: {
    fill: "#10b981",
    stroke: "#ffffff",
    badgeBg: "#10b981",
    textColor: "#059669",
    labelEn: "PS-1",
    labelId: "MT-1",
  },
  2: {
    fill: "#0ea5e9",
    stroke: "#ffffff",
    badgeBg: "#0ea5e9",
    textColor: "#0284c7",
    labelEn: "PS-2",
    labelId: "MT-2",
  },
  3: {
    fill: "#f59e0b",
    stroke: "#ffffff",
    badgeBg: "#f59e0b",
    textColor: "#d97706",
    labelEn: "PS-3",
    labelId: "MT-3",
  },
  4: {
    fill: "#8b5cf6",
    stroke: "#ffffff",
    badgeBg: "#8b5cf6",
    textColor: "#7c3aed",
    labelEn: "PS-4",
    labelId: "MT-4",
  },
  0: {
    fill: "#71717a",
    stroke: "#d4d4d8",
    badgeBg: "#71717a",
    textColor: "#52525b",
    labelEn: "Fallow",
    labelId: "Bera",
  },
};

// =====================================================================
// 3. SUB-KOMPONEN KAMERA & TELEMETRI KOORDINAT KURSOR
// =====================================================================
function MapCameraAndCursor({
  center,
  zoom,
  onCursorMove,
}: {
  center: [number, number];
  zoom: number;
  onCursorMove: (coords: [number, number]) => void;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.0 });
  }, [center, zoom, map]);

  useMapEvents({
    mousemove(e) {
      onCursorMove([e.latlng.lat, e.latlng.lng]);
    },
  });

  return null;
}

// =====================================================================
// 4. KOMPONEN UTAMA PETA INTERAKTIF TERRACROP
// =====================================================================
export default function TerraCropMap({
  center,
  zoom,
  selectedYear,
  sawahList,
  reservoirs,
  activeBasemap,
  selectedSawah,
  onSelectSawah,
  lang,
}: MapProps) {
  const [cursorCoords, setCursorCoords] = useState<[number, number]>(center);

  const safeCenter: [number, number] =
    Array.isArray(center) &&
    center.length >= 2 &&
    !isNaN(center[0]) &&
    !isNaN(center[1])
      ? center
      : [-6.3227, 107.3376];
  const safeZoom = zoom || 11;

  const damIcon = useMemo(() => createDamBadgeIcon(), []);
  const embungIcon = useMemo(() => createEmbungBadgeIcon(), []);

  // Filter Bendungan & Embung SIGI khusus wilayah Pulau Jawa
  const javaReservoirs = useMemo(() => {
    return reservoirs.filter((feat) => {
      const coords = feat.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) return false;
      const [lng, lat] = coords;
      return isInsideJavaIsland(lat, lng);
    });
  }, [reservoirs]);

  // Gabungkan poligon sawah ke dalam 1 FeatureCollection GeoJSON tunggal
  // agar tampil rapi sebagai hamparan sawah dan tidak menumpuk seperti logo
  const sawahFeatureCollection = useMemo(() => {
    const validFeatures = sawahList
      .filter((s) => s.geometry && s.geometry.type && s.geometry.coordinates)
      .map((s) => ({
        type: "Feature" as const,
        id: s.id,
        geometry: s.geometry,
        properties: {
          sawahId: s.id,
          faseTanam: s.faseTanam,
        },
      }));

    return {
      type: "FeatureCollection" as const,
      features: validFeatures,
    };
  }, [sawahList]);

  // Lookup cepat berdasarkan ID blok sawah saat poligon diklik
  const sawahLookupMap = useMemo(() => {
    const map = new Map<string, ComputedSawahPrediction>();
    sawahList.forEach((s) => map.set(s.id, s));
    return map;
  }, [sawahList]);

  // Hitung garis penghubung irigasi dari poligon sawah terpilih ke DAM / EMBUNG terdekat
  const nearestWaterConnection = useMemo(() => {
    if (!selectedSawah || !Array.isArray(selectedSawah.centroid)) return null;
    const [sLat, sLng] = selectedSawah.centroid;

    let bestPos: [number, number] | null = null;
    let minD = Infinity;

    for (const feat of javaReservoirs) {
      const [rLng, rLat] = feat.geometry.coordinates;
      const d = Math.hypot(rLat - sLat, rLng - sLng);
      if (d < minD) {
        minD = d;
        bestPos = [rLat, rLng];
      }
    }

    if (!bestPos || minD > 1.5) return null;
    return [selectedSawah.centroid, bestPos] as [
      [number, number],
      [number, number]
    ];
  }, [selectedSawah, javaReservoirs]);

  const tileUrl =
    activeBasemap === "satellite"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
      : activeBasemap === "topo"
      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const activeStyle = selectedSawah
    ? FASE_STYLE[selectedSawah.faseTanam] || FASE_STYLE[1]
    : FASE_STYLE[1];

  return (
    <div className="relative w-full h-full select-none">
      {/* BADGE BASEMAP DI POJOK KIRI BAWAH (PERSIS DESAIN AWAL) */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-[#07070a]/90 backdrop-blur-md border border-white/15 rounded-lg px-3 py-1.5 text-[11px] font-mono text-zinc-200 flex items-center gap-2 shadow-lg">
        <span className="w-2 h-2 rounded-full bg-pink-500" />
        <span>Basemap: {activeBasemap.toUpperCase()}</span>
        <span className="hidden sm:inline text-zinc-600">|</span>
        <span className="hidden sm:inline text-[10px] text-zinc-400">
          {cursorCoords[0].toFixed(4)}°, {cursorCoords[1].toFixed(4)}°
        </span>
      </div>

      <MapContainer
        center={safeCenter}
        zoom={safeZoom}
        className="w-full h-full z-0"
        zoomControl={false}
        preferCanvas={true}
      >
        <ZoomControl position="topleft" />
        <MapCameraAndCursor
          center={safeCenter}
          zoom={safeZoom}
          onCursorMove={setCursorCoords}
        />

        <TileLayer
          url={tileUrl}
          attribution="Leaflet | Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye • SIGI PUPR"
        />

        {/* LAYER HAMPARAN POLIGON SAWAH EKSISTING */}
        {sawahFeatureCollection.features.length > 0 && (
          <GeoJSON
            key={`sawah-layer-${sawahFeatureCollection.features.length}-${
              selectedSawah?.id || "none"
            }`}
            data={sawahFeatureCollection as any}
            style={(feature) => {
              const sId = feature?.properties?.sawahId;
              const fase = feature?.properties?.faseTanam ?? 1;
              const isSelected = selectedSawah?.id === sId;
              const st = FASE_STYLE[fase] || FASE_STYLE[1];

              return {
                fillColor: st.fill,
                color: isSelected ? "#ffffff" : st.stroke,
                weight: isSelected ? 2.5 : 1,
                fillOpacity: isSelected ? 0.72 : 0.48,
                dashArray: undefined,
              };
            }}
            onEachFeature={(feature, layer) => {
              const sId = feature?.properties?.sawahId;
              layer.on({
                click: () => {
                  const found = sawahLookupMap.get(sId);
                  if (found) {
                    onSelectSawah(found);
                  }
                },
              });
            }}
          />
        )}

        {/* GARIS PUTUS-PUTUS KONEKSI IRIGASI DARI SAWAH KE DAM / EMBUNG TERDEKAT */}
        {nearestWaterConnection && (
          <Polyline
            positions={nearestWaterConnection}
            pathOptions={{
              color: "#38bdf8",
              weight: 2.5,
              dashArray: "6 6",
              opacity: 0.95,
            }}
          />
        )}

        {/* POPUP PUTIH INFORMASI MASA TANAM & REKOMENDASI KOMODITAS TANAMAN */}
        {selectedSawah && Array.isArray(selectedSawah.centroid) && (
          <Popup
            position={selectedSawah.centroid}
            eventHandlers={{
              remove: () => onSelectSawah(null),
            }}
          >
            <div className="min-w-[240px] text-zinc-900 font-sans p-0.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                {selectedSawah.kabupaten} • {selectedYear}
              </div>
              <div className="text-sm font-extrabold text-zinc-900 mt-0.5 leading-snug">
                {selectedSawah.namaBlok}
              </div>

              <div className="mt-1.5 mb-2.5">
                <span
                  style={{ backgroundColor: activeStyle.badgeBg }}
                  className="inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded"
                >
                  {selectedSawah.faseShortBadge}
                </span>
              </div>

              <div className="border-t border-zinc-200 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500">
                    {lang === "en" ? "Distance to Dam:" : "Jarak ke Bendungan:"}
                  </span>
                  <span className="font-mono font-bold text-sky-600 text-right">
                    {selectedSawah.jarakDamKm} km ({selectedSawah.saluranLabel})
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500">
                    {lang === "en" ? "Soil & pH:" : "Tanah & pH:"}
                  </span>
                  <span className="font-mono font-semibold text-zinc-800">
                    {selectedSawah.soilType} (pH {selectedSawah.soilPh})
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500">
                    {lang === "en" ? "Soil Moisture:" : "Kelembaban Tanah:"}
                  </span>
                  <span className="font-mono font-bold text-zinc-900">
                    {selectedSawah.kelembabanTanah}%
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-zinc-500">
                    {lang === "en" ? "Precipitation:" : "Curah Hujan:"}
                  </span>
                  <span className="font-mono font-bold text-zinc-900">
                    {selectedSawah.curahHujanMm} mm
                  </span>
                </div>
              </div>

              <div className="border-t border-zinc-200 mt-2 pt-1.5">
                <div className="text-[10px] text-zinc-500">
                  {lang === "en"
                    ? "Crop Recommendation:"
                    : "Rekomendasi Tanaman:"}
                </div>
                <div
                  style={{ color: activeStyle.textColor }}
                  className="text-xs font-extrabold mt-0.5"
                >
                  {selectedSawah.cropRecommendation}
                </div>
              </div>
            </div>
          </Popup>
        )}

        {/* LAYER MARKER BENDUNGAN (DAM) & EMBUNG (EMB) KHUSUS PULAU JAWA */}
        {javaReservoirs.map((feat, idx) => {
          const [lng, lat] = feat.geometry.coordinates;
          const props = feat.properties || {};
          const isDam =
            String(props.kategori || "").toLowerCase() === "bendungan";

          const nama = getPropFlexible(
            props,
            [
              "nama_bendungan",
              "nama_embung",
              "nama_infrastruktur",
              "nama",
              "namobj",
              "name",
              "judul",
            ],
            isDam ? `Bendungan #${idx + 1}` : `Embung #${idx + 1}`
          );
          const kab = getPropFlexible(
            props,
            ["kabupaten", "kab_kota", "wadmkk", "kab"],
            ""
          );
          const prov = getPropFlexible(
            props,
            ["provinsi", "propinsi", "wadmpr", "prov"],
            "JAWA"
          );
          const kap = getPropFlexible(
            props,
            [
              "kapasitas",
              "kapasitas_tampung",
              "volume",
              "vol_tampung",
              "tampungan",
            ],
            "-"
          );

          return (
            <Marker
              key={`java-water-${idx}-${lat}-${lng}`}
              position={[lat, lng]}
              icon={isDam ? damIcon : embungIcon}
            >
              <Popup>
                <div className="min-w-[195px] text-zinc-900 font-sans p-0.5">
                  <span
                    className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded text-white ${
                      isDam ? "bg-sky-600" : "bg-emerald-600"
                    }`}
                  >
                    {isDam ? "DAM • BENDUNGAN" : "EMBUNG"}
                  </span>
                  <div className="font-bold text-sm mt-1 leading-snug">
                    {nama}
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {kab ? `${kab}, ` : ""}
                    {prov}
                  </div>
                  <div className="mt-1.5 pt-1 border-t border-zinc-200 text-[11px] flex justify-between">
                    <span className="text-zinc-500">
                      {lang === "en" ? "Capacity:" : "Kapasitas:"}
                    </span>
                    <span className="font-mono font-bold">{kap}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}