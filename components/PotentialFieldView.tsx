// src/components/PotentialFieldView.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  buildPotentialNewFields,
  PotentialNewFieldPrediction,
} from "@/lib/geodataEngine";
type LatLngBounds = [[number, number], [number, number]];

interface ComputedSawahPrediction {
  id: string | number;
  namaBlok: string;
  kabupaten: string;
  luasHa: number;
  potensiPerluasanHa: number;
  elevasiMdpl: number;
  lcPixelValue: number;
  lcLabel: string;
  sumberAirTerdekat: string;
  jarakDamKm: number;
  centroid: [number, number];
  geometry?: any;
}

interface KabupatenOption {
  id: string;
  nama: string;
  provinsi: string;
  bounds: LatLngBounds;
}

function getPropFlexible(
  properties: Record<string, any>,
  keys: string[],
  fallback = ""
) {
  for (const key of keys) {
    const value = properties[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return fallback;
}

interface PotentialFieldViewProps {
  onBack: () => void;
  kabupatenList: KabupatenOption[];
  batasKabGeoJson: any;
  konturGeoJson: any;
  sawahList: ComputedSawahPrediction[];
  reservoirs: any[];
  lang: "en" | "id";
}

const damSmallIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#0ea5e9;border:2px solid #fff;box-shadow:0 0 10px #38bdf8;"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const embungSmallIcon = L.divIcon({
  className: "",
  html: `<div style="width:12px;height:12px;border-radius:3px;transform:rotate(45deg);background:#10b981;border:2px solid #fff;box-shadow:0 0 8px #34d399;"></div>`,
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const LC_PIXEL_COLORS: Record<number, string> = {
  1: "#10b981", // LC-1: Irigasi Teknis
  2: "#38bdf8", // LC-2: Tadah Hujan
  3: "#f59e0b", // LC-3: Rawa / Lahan Basah Potensial
  4: "#ec4899", // LC-4: Tegalan / Konversi Potensial
};

function CameraBoundsUpdater({
  selectedKab,
  selectedPotential,
}: {
  selectedKab: KabupatenOption | null;
  selectedPotential: PotentialNewFieldPrediction | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (selectedPotential) {
      map.flyTo(selectedPotential.centroid, 13, { duration: 1.0 });
    } else if (selectedKab?.bounds) {
      map.fitBounds(selectedKab.bounds, { padding: [24, 24], duration: 1.0 });
    } else {
      map.flyTo([-7.15, 110.14], 8, { duration: 1.0 });
    }
  }, [selectedKab, selectedPotential, map]);
  return null;
}

export default function PotentialFieldView({
  onBack,
  kabupatenList,
  batasKabGeoJson,
  konturGeoJson,
  sawahList,
  reservoirs,
  lang,
}: PotentialFieldViewProps) {
  const [selectedKabId, setSelectedKabId] = useState<string>("ALL");
  const [layers, setLayers] = useState({
    batasKab: true,
    kontur: true,
    lcPixel: true,
    sawahEksisting: true,
    potentialNew: true,
    sigiWater: true,
  });
  const [potentialRawFeatures, setPotentialRawFeatures] = useState<any[]>([]);
  const [selectedPotential, setSelectedPotential] =
    useState<PotentialNewFieldPrediction | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("/data/potential_new_fields.geojson")
      .then((response) => {
        if (!response.ok) throw new Error("Gagal memuat data potensi lahan baru.");
        return response.json();
      })
      .then((data) => {
        if (isMounted) {
          setPotentialRawFeatures(Array.isArray(data?.features) ? data.features : []);
        }
      })
      .catch((error) => {
        console.error("Error loading potential new fields:", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedKab = useMemo(
    () => kabupatenList.find((k) => k.id === selectedKabId) || null,
    [kabupatenList, selectedKabId]
  );

  // Filter sawah & reservoir berdasarkan Kabupaten terpilih
  const filteredSawah = useMemo(() => {
    if (!selectedKab) return sawahList;
    const target = selectedKab.nama.toUpperCase().replace(/^KABUPATEN\s+|^KOTA\s+/i, "");
    const matched = sawahList.filter((s) =>
      s.kabupaten.toUpperCase().includes(target)
    );
    // Fallback bounding box jika nama kabupaten berbeda format
    if (matched.length > 0) return matched;
    const [[minLat, minLng], [maxLat, maxLng]] = selectedKab.bounds;
    return sawahList.filter(
      (s) =>
        s.centroid[0] >= minLat - 0.1 &&
        s.centroid[0] <= maxLat + 0.1 &&
        s.centroid[1] >= minLng - 0.1 &&
        s.centroid[1] <= maxLng + 0.1
    );
  }, [sawahList, selectedKab]);

  const filteredReservoirs = useMemo(() => {
    if (!selectedKab) {
      // Tampilkan titik di Pulau Jawa agar ringan
      return reservoirs.filter((r) => {
        const [lng, lat] = r.geometry?.coordinates || [];
        return lat >= -9 && lat <= -5.5 && lng >= 105 && lng <= 115;
      });
    }
    const [[minLat, minLng], [maxLat, maxLng]] = selectedKab.bounds;
    return reservoirs.filter((r) => {
      const [lng, lat] = r.geometry?.coordinates || [];
      return (
        lat >= minLat - 0.15 &&
        lat <= maxLat + 0.15 &&
        lng >= minLng - 0.15 &&
        lng <= maxLng + 0.15
      );
    });
  }, [reservoirs, selectedKab]);

  const filteredPotentialFields = useMemo(
    () =>
      buildPotentialNewFields(
        potentialRawFeatures,
        selectedKab?.nama || "all"
      ).sort((a, b) => b.suitabilityScore - a.suitabilityScore),
    [potentialRawFeatures, selectedKab]
  );
  const activePotential = selectedPotential
    ? filteredPotentialFields.find((field) => field.id === selectedPotential.id) || null
    : null;

  // Statistik Keterangan Luas Sawah Potensial di Kab. tersebut (sesuai wireframe kiri)
  const stats = useMemo(() => {
    const totalEksistingHa = filteredSawah.reduce((acc, s) => acc + s.luasHa, 0);
    const totalPotensialHa = filteredSawah.reduce(
      (acc, s) => acc + s.potensiPerluasanHa,
      0
    );
    const avgElevasi =
      filteredSawah.length > 0
        ? Math.round(
            filteredSawah.reduce((acc, s) => acc + s.elevasiMdpl, 0) /
              filteredSawah.length
          )
        : 45;
    const jumlahBendungan = filteredReservoirs.filter(
      (r) => String(r.properties?.kategori).toLowerCase() === "bendungan"
    ).length;
    const jumlahEmbung = filteredReservoirs.filter(
      (r) => String(r.properties?.kategori).toLowerCase() === "embung"
    ).length;
    const totalPotensiBaruHa = filteredPotentialFields.reduce(
      (acc, field) => acc + field.luasHa,
      0
    );
    const rataRataSkor = filteredPotentialFields.length
      ? Math.round(
          filteredPotentialFields.reduce(
            (acc, field) => acc + field.suitabilityScore,
            0
          ) / filteredPotentialFields.length
        )
      : 0;

    return {
      totalEksistingHa: totalEksistingHa.toLocaleString("id-ID", {
        maximumFractionDigits: 1,
      }),
      totalPotensialHa: totalPotensialHa.toLocaleString("id-ID", {
        maximumFractionDigits: 1,
      }),
      totalGabunganHa: (totalEksistingHa + totalPotensialHa).toLocaleString(
        "id-ID",
        { maximumFractionDigits: 1 }
      ),
      avgElevasi,
      jumlahBendungan,
      jumlahEmbung,
      jumlahZonaBaru: filteredPotentialFields.length,
      totalPotensiBaruHa: totalPotensiBaruHa.toLocaleString("id-ID", {
        maximumFractionDigits: 1,
      }),
      rataRataSkor,
    };
  }, [filteredSawah, filteredReservoirs, filteredPotentialFields]);

  const selectedPotentialWaterConnection = useMemo(() => {
    if (!activePotential) return null;
    const [fieldLat, fieldLng] = activePotential.centroid;
    let nearest: [number, number] | null = null;
    let minDistance = Infinity;

    for (const reservoir of filteredReservoirs) {
      const [lng, lat] = reservoir.geometry?.coordinates || [];
      if (typeof lat !== "number" || typeof lng !== "number") continue;
      const distance = Math.hypot(lat - fieldLat, lng - fieldLng);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = [lat, lng];
      }
    }

    return nearest
      ? ([activePotential.centroid, nearest] as [
          [number, number],
          [number, number]
        ])
      : null;
  }, [activePotential, filteredReservoirs]);

  return (
    <div className="min-h-screen lg:h-screen w-full bg-[#050505] text-white flex flex-col overflow-x-hidden lg:overflow-hidden">
      {/* TOP BAR */}
      <header className="px-4 py-3 border-b border-white/10 bg-[#08080c] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs font-mono font-semibold text-zinc-200 transition-colors cursor-pointer"
          >
            ← {lang === "en" ? "Back to Crop Cycle" : "Kembali ke Siklus Tanam"}
          </button>
          <div>
            <h1 className="font-serif text-base sm:text-lg font-bold tracking-tight animate-gradient-text">
              POTENTIAL FIELD INTELLIGENCE
            </h1>
            <p className="text-[11px] font-mono text-zinc-400">
              Multi-Layer Spatial Overlay • Batas Kab + Kontur SRTM + LC Pixel + Sawah + SIGI
            </p>
          </div>
        </div>
      </header>

      {/* MAIN GRID SESUAI WIREFRAME: SIDEBAR KIRI + PETA KANAN BESAR */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0">
        {/* ============================================================
            KOLOM KIRI (Sesuai kotak atas & kotak tengah di wireframe)
           ============================================================ */}
        <aside className="w-full lg:w-[370px] xl:w-[400px] border-b lg:border-b-0 lg:border-r border-white/10 bg-[#07070a] p-4 flex flex-col gap-4 lg:overflow-y-auto shrink-0">
          {/* KOTAK 1 (WIREFRAME ATAS): FILTER KABUPATEN */}
          <div className="bg-white/[0.03] border border-white/15 rounded-2xl p-4 space-y-2.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-sky-400 font-bold">
              {lang === "en" ? "1. District Filter (Kabupaten)" : "1. Filter Kabupaten"}
            </label>
            <select
              value={selectedKabId}
              onChange={(e) => setSelectedKabId(e.target.value)}
              className="w-full bg-[#0d0d12] border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-pink-500"
            >
              <option value="ALL">
                {lang === "en"
                  ? "All Java Island Districts (Seluruh Jawa)"
                  : "Seluruh Kabupaten Pulau Jawa"}
              </option>
              {kabupatenList.map((kab) => (
                <option key={kab.id} value={kab.id}>
                  {kab.nama} ({kab.provinsi})
                </option>
              ))}
            </select>
          </div>

          {/* KOTAK 2 (WIREFRAME TENGAH): KETERANGAN LUAS SAWAH POTENSIAL DI KAB. TERSEBUT */}
          <div className="bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/15 rounded-2xl p-4 space-y-3.5">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                {lang === "en"
                  ? "2. Potential Paddy Field Summary"
                  : "2. Keterangan Luas Sawah Potensial"}
              </div>
              <h2 className="font-serif text-base font-bold text-white mt-0.5">
                {selectedKab ? selectedKab.nama : "Wilayah Pulau Jawa"}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-black/40 border border-white/10 rounded-xl p-3">
                <div className="text-[10px] font-mono text-zinc-400">
                  Sawah Eksisting
                </div>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
                  {stats.totalEksistingHa}{" "}
                  <span className="text-xs font-normal text-zinc-400">Ha</span>
                </div>
              </div>

              <div className="bg-black/40 border border-pink-500/30 rounded-xl p-3">
                <div className="text-[10px] font-mono text-pink-300">
                  Potensi Perluasan (LC)
                </div>
                <div className="text-lg font-mono font-bold text-pink-400 mt-0.5">
                  +{stats.totalPotensialHa}{" "}
                  <span className="text-xs font-normal text-zinc-400">Ha</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="rounded-xl border border-cyan-500/35 bg-cyan-500/10 p-3">
                <div className="text-[10px] font-mono text-cyan-200">
                  {lang === "en" ? "Candidate zones" : "Zona kandidat"}
                </div>
                <div className="mt-0.5 text-lg font-mono font-bold text-cyan-300">
                  {stats.jumlahZonaBaru}
                </div>
              </div>
              <div className="rounded-xl border border-cyan-500/35 bg-cyan-500/10 p-3">
                <div className="text-[10px] font-mono text-cyan-200">
                  +Ha {lang === "en" ? "new" : "baru"}
                </div>
                <div className="mt-0.5 text-lg font-mono font-bold text-cyan-300">
                  +{stats.totalPotensiBaruHa}
                </div>
              </div>
              <div className="rounded-xl border border-cyan-500/35 bg-cyan-500/10 p-3">
                <div className="text-[10px] font-mono text-cyan-200">
                  {lang === "en" ? "Avg. score" : "Skor rata-rata"}
                </div>
                <div className="mt-0.5 text-lg font-mono font-bold text-cyan-300">
                  {stats.rataRataSkor}%
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Total Proyeksi Lahan:</span>
                <span className="font-mono font-bold text-white">
                  {stats.totalGabunganHa} Ha
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Elevasi Rata-rata (Kontur):</span>
                <span className="font-mono text-amber-300">
                  {stats.avgElevasi} mdpl
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Infrastruktur Air (SIGI):</span>
                <span className="font-mono text-sky-300">
                  {stats.jumlahBendungan} Bendungan • {stats.jumlahEmbung} Embung
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Analisis potensi dihitung berdasarkan irisan poligon{" "}
              <strong className="text-zinc-200">sawah eksisting</strong>, nilai
              piksel tutupan lahan (<strong className="text-zinc-200">Land Cover</strong>),
              kemiringan <strong className="text-zinc-200">kontur SRTM</strong>, dan
              radius pasokan air dari <strong className="text-zinc-200">Bendungan/Embung</strong>.
            </p>
          </div>

          {/* KONTROL LAYER PETA (5 LAYER SESUAI WIREFRAME KANAN) */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold mb-1">
              Layer Overlay Geospasial
            </div>

            {[
              { key: "batasKab", label: "Batas Kabupaten (TopoJSON)", color: "bg-purple-400" },
              { key: "kontur", label: "Garis Kontur SRTM", color: "bg-amber-400" },
              { key: "lcPixel", label: "LC Nilai Pixel (Land Cover)", color: "bg-pink-500" },
              { key: "sawahEksisting", label: "Sawah Eksisting", color: "bg-emerald-400" },
              { key: "potentialNew", label: "Potensi Lahan Baru", color: "bg-cyan-400" },
              { key: "sigiWater", label: "Bendungan & Embung (SIGI)", color: "bg-sky-400" },
            ].map((item) => {
              const active = layers[item.key as keyof typeof layers];
              return (
                <button
                  key={item.key}
                  onClick={() =>
                    setLayers((prev) => ({
                      ...prev,
                      [item.key]: !prev[item.key as keyof typeof layers],
                    }))
                  }
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition-all cursor-pointer ${
                    active
                      ? "bg-white/[0.07] border-white/20 text-white"
                      : "bg-transparent border-white/5 text-zinc-500"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    {item.label}
                  </span>
                  <span className="font-mono text-[10px]">
                    {active ? "ON" : "OFF"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="bg-white/[0.03] border border-cyan-500/25 rounded-2xl p-4">
            <div className="mb-2 text-[11px] font-mono uppercase tracking-wider text-cyan-300 font-bold">
            {lang === "en" ? "Priority New Field Recommendations" : "Rekomendasi Prioritas Lahan Baru"}
            </div>
            <div className="space-y-2">
            {filteredPotentialFields.slice(0, 8).map((field, index) => (
              <button
                type="button"
                key={field.id}
                onClick={() => setSelectedPotential(field)}
                className={`w-full rounded-xl border p-2.5 text-left transition-colors ${
                  selectedPotential?.id === field.id
                    ? "border-cyan-300 bg-cyan-500/15"
                    : "border-white/10 bg-black/20 hover:border-cyan-500/50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-bold text-white">
                    {index + 1}. {field.namaBlok}
                  </span>
                  <span className="shrink-0 rounded bg-cyan-500/20 px-1.5 py-0.5 font-mono text-[10px] text-cyan-200">
                    {field.suitabilityScore}%
                  </span>
                </div>
                <div className="mt-1 text-[10px] text-zinc-400">
                  {field.kabupaten} • {field.existingCover}
                </div>
                <div className="mt-1 flex justify-between gap-2 font-mono text-[10px] text-zinc-300">
                  <span>{field.distWaterKm} km water</span>
                  <span>+{field.luasHa} Ha</span>
                </div>
              </button>
            ))}
            {filteredPotentialFields.length === 0 && (
              <div className="text-[11px] text-zinc-500">
                {lang === "en"
                  ? "No potential zones match this district."
                  : "Tidak ada zona potensi untuk kabupaten ini."}
              </div>
            )}
            </div>
          </div>
        </aside>

        {/* ============================================================
            KOLOM KANAN BESAR (PETA 5 LAYER GABUNGAN SESUAI WIREFRAME)
           ============================================================ */}
        <main className="flex-1 relative min-h-[450px] lg:min-h-0">
          <MapContainer
            center={[-7.15, 110.14]}
            zoom={8}
            className="w-full h-full z-0"
            zoomControl={false}
            preferCanvas={true}
          >
            <CameraBoundsUpdater
              selectedKab={selectedKab}
              selectedPotential={activePotential}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="© Esri • SIGI PUPR • SRTM • Landsat LC"
            />

            {/* 1. LAYER BATAS KABUPATEN */}
            {layers.batasKab && batasKabGeoJson && (
              <GeoJSON
                key={`batas-${selectedKabId}`}
                data={batasKabGeoJson}
                style={(feature) => {
                  const nama = getPropFlexible(
                    feature?.properties || {},
                    ["WADMKK", "KAB_KOTA", "KABUPATEN", "NAMOBJ"],
                    ""
                  );
                  const isCurrent =
                    selectedKab &&
                    nama.toUpperCase() === selectedKab.nama.toUpperCase();
                  return {
                    color: isCurrent ? "#f472b6" : "#a855f7",
                    weight: isCurrent ? 3 : 1.2,
                    fillColor: isCurrent ? "#ec4899" : "transparent",
                    fillOpacity: isCurrent ? 0.12 : 0,
                    dashArray: isCurrent ? undefined : "4 4",
                  };
                }}
              />
            )}

            {/* 2. LAYER GARIS KONTUR SRTM */}
            {layers.kontur && konturGeoJson && (
              <GeoJSON
                data={konturGeoJson}
                style={{
                  color: "#f59e0b",
                  weight: 0.9,
                  opacity: 0.45,
                }}
              />
            )}

            {/* 3 & 4. LAYER SAWAH EKSISTING + LC NILAI PIXEL */}
            {(layers.sawahEksisting || layers.lcPixel) &&
              filteredSawah.map((sawah) => {
                if (!sawah.geometry) return null;
                const fillColor = layers.lcPixel
                  ? LC_PIXEL_COLORS[sawah.lcPixelValue] || "#10b981"
                  : "#10b981";

                return (
                  <GeoJSON
                    key={`pot-${sawah.id}-${layers.lcPixel}`}
                    data={sawah.geometry}
                    style={{
                      fillColor,
                      color: "#ffffff",
                      weight: 0.8,
                      fillOpacity: 0.55,
                    }}
                    eventHandlers={{
                      click: () => setSelectedPotential(null),
                    }}
                  >
                    <Popup className="terracorp-dark-popup">
                      <div className="bg-[#09090d] text-white p-1 min-w-[200px] text-xs space-y-1">
                        <div className="font-bold text-sm">{sawah.namaBlok}</div>
                        <div className="text-zinc-400">{sawah.kabupaten}</div>
                        <div className="pt-1 border-t border-white/10 space-y-1">
                          <div>
                            <span className="text-zinc-400">LC Pixel: </span>
                            <span className="font-mono text-pink-300">
                              {sawah.lcLabel}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-400">Luas / Potensi: </span>
                            <span className="font-mono text-emerald-300">
                              {sawah.luasHa} Ha (+{sawah.potensiPerluasanHa} Ha)
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-400">Elevasi Kontur: </span>
                            <span className="font-mono text-amber-300">
                              {sawah.elevasiMdpl} mdpl
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-400">Sumber Air: </span>
                            <span className="font-mono text-sky-300">
                              {sawah.sumberAirTerdekat} ({sawah.jarakDamKm} km)
                            </span>
                          </div>
                        </div>
                      </div>
                    </Popup>
                  </GeoJSON>
                );
              })}

            {/* 5. LAYER PREDIKSI LAHAN SAWAH BARU */}
            {layers.potentialNew &&
              filteredPotentialFields.map((field) => (
                <GeoJSON
                  key={`potential-new-${field.id}`}
                  data={field.geometry}
                  style={{
                    fillColor: "#06b6d4",
                    color: "#67e8f9",
                    weight: activePotential?.id === field.id ? 3 : 1.5,
                    fillOpacity: activePotential?.id === field.id ? 0.72 : 0.46,
                    dashArray: "5 5",
                  }}
                  eventHandlers={{
                    click: () => setSelectedPotential(field),
                  }}
                />
              ))}

            {selectedPotentialWaterConnection && (
              <Polyline
                positions={selectedPotentialWaterConnection}
                pathOptions={{
                  color: "#67e8f9",
                  weight: 2.5,
                  dashArray: "5 5",
                  opacity: 0.95,
                }}
              />
            )}

            {activePotential && (
              <Popup
                key={`potential-popup-${activePotential.id}`}
                position={activePotential.centroid}
                eventHandlers={{
                  remove: () => setSelectedPotential(null),
                }}
              >
                <div className="min-w-[245px] text-zinc-900 font-sans p-0.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-700 font-bold">
                    {activePotential.kabupaten} • {activePotential.provinsi}
                  </div>
                  <div className="text-sm font-extrabold text-zinc-900 mt-0.5 leading-snug">
                    {activePotential.namaBlok}
                  </div>
                  <div className="mt-1.5 mb-2.5">
                    <span className="inline-block rounded bg-cyan-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      {lang === "en" ? "SUITABILITY" : "KELAYAKAN"} {activePotential.suitabilityScore}%
                    </span>
                  </div>
                  <div className="space-y-1 border-t border-zinc-200 pt-2 text-[11px]">
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">{lang === "en" ? "Additional area:" : "Luas tambahan:"}</span>
                      <span className="font-mono font-bold text-cyan-700">+{activePotential.luasHa} Ha</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">{lang === "en" ? "Classification:" : "Klasifikasi:"}</span>
                      <span className="text-right font-semibold">{activePotential.suitabilityTier}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">{lang === "en" ? "Existing cover:" : "Tutupan saat ini:"}</span>
                      <span className="text-right font-semibold">{activePotential.existingCover}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-zinc-500">{lang === "en" ? "Water distance:" : "Jarak sumber air:"}</span>
                      <span className="font-mono font-bold text-sky-600">{activePotential.distWaterKm} km</span>
                    </div>
                  </div>
                </div>
              </Popup>
            )}

            {/* 6. LAYER BENDUNGAN & EMBUNG (SIGI) */}
            {layers.sigiWater &&
              filteredReservoirs.map((feat, idx) => {
                const [lng, lat] = feat.geometry.coordinates;
                const props = feat.properties || {};
                const isDam =
                  String(props.kategori || "").toLowerCase() === "bendungan";
                const nama = getPropFlexible(
                  props,
                  ["nama_bendungan", "nama_embung", "nama_infrastruktur", "nama", "namobj"],
                  isDam ? "Bendungan" : "Embung"
                );
                return (
                  <Marker
                    key={`p2-res-${idx}-${lat}-${lng}`}
                    position={[lat, lng]}
                    icon={isDam ? damSmallIcon : embungSmallIcon}
                  >
                    <Popup className="terracorp-dark-popup">
                      <div className="bg-[#09090d] text-white p-1 text-xs">
                        <div className="font-mono text-[10px] text-sky-400 uppercase font-bold">
                          {isDam ? "BENDUNGAN" : "EMBUNG"}
                        </div>
                        <div className="font-bold text-sm">{nama}</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
          </MapContainer>
        </main>
      </div>
    </div>
  );
}