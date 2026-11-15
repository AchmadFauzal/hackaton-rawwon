// src/components/PotentialFieldView.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Pane,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Globe } from "lucide-react";
import {
  buildPotentialNewFields,
  getPropFlexible,
  haversineKm,
  normalizeKabName,
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

interface PotentialSummary {
  kabupaten: string;
  provinsi: string;
  candidate_zones: number;
  total_new_ha: number;
  avg_suitability_score: number;
}

interface NearestReservoir {
  feature: any;
  name: string;
  type: string;
  distanceKm: number;
  position: [number, number];
}

interface PotentialFieldViewProps {
  onBack: () => void;
  onLangChange: (lang: "en" | "id") => void;
  kabupatenList: KabupatenOption[];
  batasKabGeoJson: any;
  konturGeoJson: any;
  sawahList: ComputedSawahPrediction[];
  reservoirs: any[];
  lang: "en" | "id";
}

function renderPotentialZonePopup(
  field: PotentialNewFieldPrediction,
  waterSource: NearestReservoir | null | undefined,
  lang: "en" | "id"
) {
  const eyebrow = `${field.kabupaten} • ${field.provinsi}`.toUpperCase();
  const waterSourceLabel = waterSource
    ? `${waterSource.type} ${waterSource.name} (±${waterSource.distanceKm} km)`
    : `${field.distWaterKm} km`;

  return (
    <div className="min-w-[245px] text-zinc-900 font-sans p-0.5">
      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
        {eyebrow}
      </div>
      <div className="text-sm font-extrabold text-zinc-900 mt-0.5 leading-snug">
        {field.namaBlok}
      </div>
      <div className="mt-1.5 mb-2.5">
        <span className="inline-block rounded bg-cyan-600 px-2 py-0.5 text-[10px] font-bold text-white">
          {lang === "en" ? "SUITABILITY" : "KELAYAKAN"} {field.suitabilityScore}%
        </span>
      </div>
      <div className="space-y-1 border-t border-zinc-200 pt-2 text-[11px]">
        <div className="flex justify-between gap-3">
          <span className="text-zinc-500">
            {lang === "en" ? "Additional area:" : "Luas tambahan:"}
          </span>
          <span className="font-mono font-bold text-cyan-700">
            +{field.luasHa.toLocaleString("id-ID")} Ha
          </span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-zinc-500">
            {lang === "en" ? "Classification:" : "Klasifikasi:"}
          </span>
          <span className="text-right font-semibold">{field.suitabilityTier}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-zinc-500">
            {lang === "en" ? "Existing cover:" : "Tutupan lahan:"}
          </span>
          <span className="text-right font-semibold">{field.existingCover}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-zinc-500">
            {lang === "en" ? "Water source:" : "Sumber aliran air:"}
          </span>
          <span className="text-right font-mono font-bold text-sky-600">
            {waterSourceLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

const LC_PIXEL_COLORS: Record<number, string> = {
  1: "#10b981", // LC-1: Irigasi Teknis
  2: "#38bdf8", // LC-2: Tadah Hujan
  3: "#f59e0b", // LC-3: Rawa / Lahan Basah Potensial
  4: "#ec4899", // LC-4: Tegalan / Konversi Potensial
};

function findNearestReservoir(
  centroid: [number, number],
  reservoirs: any[]
): NearestReservoir | null {
  let nearest: NearestReservoir | null = null;
  for (const feature of reservoirs) {
    const [lng, lat] = feature.geometry?.coordinates || [];
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    const distanceKm = haversineKm(centroid[0], centroid[1], lat, lng);
    if (!nearest || distanceKm < nearest.distanceKm) {
      const properties = feature.properties || {};
      const isDam = String(properties.kategori || "").toLowerCase() === "bendungan";
      nearest = {
        feature,
        name: getPropFlexible(
          properties,
          ["NAMOBJ", "name", "nama_bangunan", "nama_bendungan", "nama_embung", "nama_infrastruktur", "nama"],
          isDam ? "Bendungan" : "Embung"
        ),
        type: isDam ? "Bendungan" : "Embung",
        distanceKm: Number(distanceKm.toFixed(1)),
        position: [lat, lng],
      };
    }
  }
  return nearest;
}

const createDamBadgeIcon = () =>
  L.divIcon({
    className: "custom-potential-dam-badge",
    html: `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#0284c7 0%,#2563eb 100%);border:2px solid #fff;box-shadow:0 0 12px rgba(14,165,233,.9);display:flex;align-items:center;justify-content:center;color:#fff;font-family:ui-monospace,SFMono-Regular,monospace;font-size:8px;font-weight:800;cursor:pointer;">DAM</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const createEmbungBadgeIcon = () =>
  L.divIcon({
    className: "custom-potential-embung-badge",
    html: `<div style="width:22px;height:22px;border-radius:5px;transform:rotate(45deg);background:linear-gradient(135deg,#d97706 0%,#f59e0b 100%);border:2px solid #fff;box-shadow:0 0 10px rgba(245,158,11,.85);display:flex;align-items:center;justify-content:center;cursor:pointer;"><span style="transform:rotate(-45deg);color:#fff;font-family:ui-monospace,SFMono-Regular,monospace;font-size:7px;font-weight:800;">EMB</span></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

function MapSizeInvalidator() {
  const map = useMap();

  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    const timeoutId = window.setTimeout(invalidate, 150);
    window.addEventListener("resize", invalidate);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("resize", invalidate);
    };
  }, [map]);

  return null;
}

function CameraBoundsUpdater({
  selectedKab,
  selectedPotential,
  potentialFields,
}: {
  selectedKab: KabupatenOption | null;
  selectedPotential: PotentialNewFieldPrediction | null;
  potentialFields: PotentialNewFieldPrediction[];
}) {
  const map = useMap();
  useEffect(() => {
    if (selectedPotential) {
      map.fitBounds(L.geoJSON(selectedPotential.geometry).getBounds(), {
        padding: [24, 24],
        maxZoom: 14,
        duration: 1.0,
      });
    } else if (potentialFields.length > 0) {
      const bounds = L.latLngBounds([]);
      potentialFields.forEach((field) => {
        bounds.extend(L.geoJSON(field.geometry).getBounds());
      });
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 12, duration: 1.0 });
    } else if (selectedKab?.bounds) {
      map.fitBounds(selectedKab.bounds, { padding: [24, 24], duration: 1.0 });
    } else {
      map.flyTo([-7.15, 110.14], 8, { duration: 1.0 });
    }
  }, [selectedKab, selectedPotential, potentialFields, map]);
  return null;
}

export default function PotentialFieldView({
  onBack,
  onLangChange,
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
  const [potentialSummary, setPotentialSummary] = useState<PotentialSummary[]>([]);
  const [hasUserSelectedKabupaten, setHasUserSelectedKabupaten] = useState(false);
  const [selectedPotential, setSelectedPotential] =
    useState<PotentialNewFieldPrediction | null>(null);
  const damIcon = useMemo(() => createDamBadgeIcon(), []);
  const embungIcon = useMemo(() => createEmbungBadgeIcon(), []);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      fetch("/data/potential_new_fields.geojson"),
      fetch("/data/potential_kab_summary.json"),
    ])
      .then(async ([fieldsResponse, summaryResponse]) => {
        if (!fieldsResponse.ok || !summaryResponse.ok) {
          throw new Error("Gagal memuat dataset potensi lahan baru.");
        }
        return Promise.all([fieldsResponse.json(), summaryResponse.json()]);
      })
      .then(([fieldsData, summaryData]) => {
        if (isMounted) {
          setPotentialRawFeatures(
            Array.isArray(fieldsData?.features) ? fieldsData.features : []
          );
          setPotentialSummary(
            Array.isArray(summaryData?.by_kabupaten)
              ? summaryData.by_kabupaten
              : []
          );
        }
      })
      .catch((error) => {
        console.error("Error loading potential field datasets:", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const potentialSummaryByKabupaten = useMemo(() => {
    const lookup = new Map<string, PotentialSummary>();
    potentialSummary.forEach((summary) => {
      lookup.set(normalizeKabName(summary.kabupaten), summary);
    });
    return lookup;
  }, [potentialSummary]);

  const effectiveSelectedKabId = useMemo(() => {
    if (selectedKabId !== "ALL" || hasUserSelectedKabupaten || !potentialSummary.length) {
      return selectedKabId;
    }
    const defaultKab = kabupatenList.find(
      (kabupaten) => normalizeKabName(kabupaten.nama) === "blitar"
    );
    const defaultSummary = defaultKab
      ? potentialSummaryByKabupaten.get(normalizeKabName(defaultKab.nama))
      : undefined;
    if (!defaultKab || (defaultSummary && defaultSummary.candidate_zones > 0)) {
      return selectedKabId;
    }
    return (
      kabupatenList.find(
        (kabupaten) =>
          (potentialSummaryByKabupaten.get(normalizeKabName(kabupaten.nama))
            ?.candidate_zones || 0) > 0
      )?.id || selectedKabId
    );
  }, [
    hasUserSelectedKabupaten,
    kabupatenList,
    potentialSummary.length,
    potentialSummaryByKabupaten,
    selectedKabId,
  ]);

  const selectedKab = useMemo(
    () => kabupatenList.find((k) => k.id === effectiveSelectedKabId) || null,
    [kabupatenList, effectiveSelectedKabId]
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
      ).sort(
        (a, b) =>
          b.suitabilityScore - a.suitabilityScore || b.luasHa - a.luasHa
      ),
    [potentialRawFeatures, selectedKab]
  );
  const activePotential = selectedPotential
    ? filteredPotentialFields.find((field) => field.id === selectedPotential.id) || null
    : null;

  const potentialWaterSources = useMemo(() => {
    const lookup = new Map<string, NearestReservoir | null>();
    filteredPotentialFields.forEach((field) => {
      lookup.set(field.id, findNearestReservoir(field.centroid, filteredReservoirs));
    });
    return lookup;
  }, [filteredPotentialFields, filteredReservoirs]);

  // Statistik Keterangan Luas Sawah Potensial di Kab. tersebut (sesuai wireframe kiri)
  const stats = useMemo(() => {
    const totalEksistingHa = filteredSawah.reduce((acc, s) => acc + s.luasHa, 0);
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
    const selectedSummary = selectedKab
      ? potentialSummaryByKabupaten.get(normalizeKabName(selectedKab.nama))
      : null;
    const totalPotensialHa = selectedSummary?.total_new_ha ?? totalPotensiBaruHa;
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
      totalGabunganHa: (totalEksistingHa + totalPotensiBaruHa).toLocaleString(
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
  }, [
    filteredSawah,
    filteredReservoirs,
    filteredPotentialFields,
    potentialSummaryByKabupaten,
    selectedKab,
  ]);

  const selectedPotentialWaterConnection = useMemo(() => {
    if (!activePotential) return null;
    const nearest = potentialWaterSources.get(activePotential.id);
    return nearest
      ? ([activePotential.centroid, nearest.position] as [[number, number], [number, number]])
      : null;
  }, [activePotential, potentialWaterSources]);

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
              {lang === "en"
                ? "Multi-Layer Spatial Overlay • District Boundaries + SRTM Contours + LC Pixel + Paddy + Water Infrastructure"
                : "Multi-Layer Spatial Overlay • Batas Kab + Kontur SRTM + LC Pixel + Sawah + Infrastruktur Air"}
            </p>
          </div>
        </div>
        <div
          className="flex items-center bg-[#0d0d0f] border border-white/15 rounded-full p-0.5 text-[11px] font-mono"
          role="group"
          aria-label="Language Switcher"
        >
          <Globe className="w-3.5 h-3.5 text-pink-400 ml-2 mr-1.5" />
          <button
            type="button"
            onClick={() => onLangChange("en")}
            className={`px-2.5 py-0.5 rounded-full font-bold transition-colors cursor-pointer ${
              lang === "en" ? "bg-pink-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => onLangChange("id")}
            className={`px-2.5 py-0.5 rounded-full font-bold transition-colors cursor-pointer ${
              lang === "id" ? "bg-pink-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            ID
          </button>
        </div>
      </header>

      {/* MAIN GRID SESUAI WIREFRAME: SIDEBAR KIRI + PETA KANAN BESAR */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* ============================================================
            KOLOM KIRI (Sesuai kotak atas & kotak tengah di wireframe)
           ============================================================ */}
        <aside className="w-full md:w-[370px] xl:w-[400px] border-b md:border-b-0 md:border-r border-white/10 bg-[#07070a] p-4 flex flex-col gap-4 md:overflow-y-auto shrink-0">
          {/* KOTAK 1 (WIREFRAME ATAS): FILTER KABUPATEN */}
          <div className="bg-white/[0.03] border border-white/15 rounded-2xl p-4 space-y-2.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-sky-400 font-bold">
              {lang === "en" ? "1. District Filter (Kabupaten)" : "1. Filter Kabupaten"}
            </label>
            <select
              value={effectiveSelectedKabId}
              onChange={(e) => {
                setHasUserSelectedKabupaten(true);
                setSelectedKabId(e.target.value);
              }}
              className="w-full bg-[#0d0d12] border border-white/20 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-pink-500"
            >
              <option value="ALL">
                {lang === "en"
                  ? "All Potential Districts (Semua Wilayah Potensial)"
                  : "All Potential Districts (Semua Wilayah Potensial)"}
              </option>
              {kabupatenList.map((kab) => (
                <option key={kab.id} value={kab.id}>
                  {kab.nama} ({kab.provinsi}) •{" "}
                  {potentialSummaryByKabupaten.get(normalizeKabName(kab.nama))
                    ?.candidate_zones || 0}{" "}
                  zones
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
                  {lang === "en" ? "Existing Paddy Fields" : "Sawah Eksisting"}
                </div>
                <div className="text-lg font-mono font-bold text-emerald-400 mt-0.5">
                  {stats.totalEksistingHa}{" "}
                  <span className="text-xs font-normal text-zinc-400">Ha</span>
                </div>
              </div>

              <div className="bg-black/40 border border-pink-500/30 rounded-xl p-3">
                <div className="text-[10px] font-mono text-pink-300">
                  {lang === "en"
                    ? "Validated Expansion Potential"
                    : "Potensi Perluasan Layak"}
                </div>
                <div className="text-lg font-mono font-bold text-pink-400 mt-0.5">
                  +{stats.totalPotensialHa}{" "}
                  <span className="text-xs font-normal text-zinc-400">Ha</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="min-w-0 overflow-hidden rounded-xl border border-cyan-500/35 bg-cyan-500/10 p-3">
                <div className="text-[10px] font-mono leading-tight text-cyan-200">
                  {lang === "en" ? "Candidate zones" : "Zona kandidat"}
                </div>
                <div className="mt-1 truncate text-base font-mono font-bold leading-none text-cyan-300">
                  {stats.jumlahZonaBaru}
                </div>
              </div>
              <div className="min-w-0 overflow-hidden rounded-xl border border-cyan-500/35 bg-cyan-500/10 p-3">
                <div className="text-[10px] font-mono leading-tight text-cyan-200">
                  +Ha {lang === "en" ? "new" : "baru"}
                </div>
                <div className="mt-1 truncate text-sm font-mono font-bold leading-none text-cyan-300">
                  +{stats.totalPotensiBaruHa}
                </div>
              </div>
              <div className="min-w-0 overflow-hidden rounded-xl border border-cyan-500/35 bg-cyan-500/10 p-3">
                <div className="text-[10px] font-mono leading-tight text-cyan-200">
                  {lang === "en" ? "Avg. score" : "Skor rata-rata"}
                </div>
                <div className="mt-1 truncate text-base font-mono font-bold leading-none text-cyan-300">
                  {stats.rataRataSkor}%
                </div>
              </div>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">
                  {lang === "en" ? "Total Projected Land:" : "Total Proyeksi Lahan:"}
                </span>
                <span className="font-mono font-bold text-white">
                  {stats.totalGabunganHa} Ha
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">
                  {lang === "en" ? "Average Elevation (Contour):" : "Elevasi Rata-rata (Kontur):"}
                </span>
                <span className="font-mono text-amber-300">
                  {stats.avgElevasi} mdpl
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">
                  {lang === "en" ? "Water Infrastructure:" : "Infrastruktur Air:"}
                </span>
                <span className="font-mono text-sky-300">
                  {stats.jumlahBendungan} {lang === "en" ? "Dams" : "Bendungan"} •{" "}
                  {stats.jumlahEmbung} {lang === "en" ? "Ponds" : "Embung"}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {lang === "en"
                ? "Potential analysis is calculated from intersections of "
                : "Analisis potensi dihitung berdasarkan irisan poligon "}
              <strong className="text-zinc-200">
                {lang === "en" ? "existing paddy fields" : "sawah eksisting"}
              </strong>
              {lang === "en" ? ", land-cover pixel values (" : ", nilai piksel tutupan lahan ("}
              <strong className="text-zinc-200">Land Cover</strong>
              {lang === "en" ? "), " : "), "}
              {lang === "en" ? "SRTM contour slope, and water supply radius from " : "kemiringan "}
              {lang === "id" && <strong className="text-zinc-200">kontur SRTM</strong>}
              {lang === "en" && <strong className="text-zinc-200">SRTM contours</strong>}
              {lang === "id" ? ", dan radius pasokan air dari " : ", and water supply radius from "}
              <strong className="text-zinc-200">
                {lang === "en" ? "dams/ponds" : "Bendungan/Embung"}
              </strong>.
            </p>
          </div>

          {/* KONTROL LAYER PETA (5 LAYER SESUAI WIREFRAME KANAN) */}
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold mb-1">
              {lang === "en" ? "Geospatial Layer Overlay" : "Layer Overlay Geospasial"}
            </div>

            {[
              { key: "batasKab", label: lang === "en" ? "District Boundaries (TopoJSON)" : "Batas Kabupaten (TopoJSON)", color: "bg-purple-400" },
              { key: "kontur", label: lang === "en" ? "SRTM Contour Lines" : "Garis Kontur SRTM", color: "bg-amber-400" },
              { key: "lcPixel", label: lang === "en" ? "LC Pixel Value (Land Cover)" : "LC Nilai Pixel (Land Cover)", color: "bg-pink-500" },
              { key: "sawahEksisting", label: lang === "en" ? "Existing Paddy Fields" : "Sawah Eksisting", color: "bg-emerald-400" },
              { key: "potentialNew", label: lang === "en" ? "Potential New Fields" : "Potensi Lahan Baru", color: "bg-cyan-400" },
              { key: "sigiWater", label: lang === "en" ? "Dams & Ponds" : "Bendungan & Embung", color: "bg-sky-400" },
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
                  <span>
                    {(() => {
                      const source = potentialWaterSources.get(field.id);
                      return source
                        ? `${source.type} ${source.name} (${source.distanceKm} km)`
                        : `${field.distWaterKm} km ${lang === "en" ? "water" : "sumber air"}`;
                    })()}
                  </span>
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
        <main className="flex-1 relative min-h-[400px] h-[55vh] md:h-full md:min-h-0">
          <MapContainer
            center={[-7.15, 110.14]}
            zoom={8}
            className="w-full h-full z-0"
            zoomControl={false}
            preferCanvas={true}
          >
            <MapSizeInvalidator />
            <CameraBoundsUpdater
              selectedKab={selectedKab}
              selectedPotential={activePotential}
              potentialFields={filteredPotentialFields}
            />
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution="© Esri • SIGI PUPR • SRTM • Landsat LC"
            />
            <Pane name="potential-popup-pane" style={{ zIndex: 900 }} />

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
                    <Popup pane="potential-popup-pane" className="terracorp-dark-popup">
                      <div className="bg-[#09090d] text-white p-1 min-w-[200px] text-xs space-y-1">
                        <div className="font-bold text-sm">{sawah.namaBlok}</div>
                        <div className="text-zinc-400">{sawah.kabupaten}</div>
                        <div className="pt-1 border-t border-white/10 space-y-1">
                          <div>
                            <span className="text-zinc-400">
                              {lang === "en" ? "LC Pixel: " : "LC Pixel: "}
                            </span>
                            <span className="font-mono text-pink-300">
                              {sawah.lcLabel}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-400">
                              {lang === "en" ? "Area / Potential: " : "Luas / Potensi: "}
                            </span>
                            <span className="font-mono text-emerald-300">
                              {sawah.luasHa} Ha (+{sawah.potensiPerluasanHa} Ha)
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-400">
                              {lang === "en" ? "Contour Elevation: " : "Elevasi Kontur: "}
                            </span>
                            <span className="font-mono text-amber-300">
                              {sawah.elevasiMdpl} {lang === "en" ? "masl" : "mdpl"}
                            </span>
                          </div>
                          <div>
                            <span className="text-zinc-400">
                              {lang === "en" ? "Water Source: " : "Sumber Air: "}
                            </span>
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
            {layers.potentialNew && (
              <Pane name="potential-fields-pane" style={{ zIndex: 650 }}>
                {filteredPotentialFields.map((field) => (
                  <GeoJSON
                    key={`pot-${effectiveSelectedKabId}-${filteredPotentialFields.length}-${layers.potentialNew}-${field.id}`}
                    data={field.geometry}
                    style={{
                      fillColor: "#06b6d4",
                      fillOpacity: 0.55,
                      color: "#22d3ee",
                      weight: activePotential?.id === field.id ? 3 : 2.5,
                      dashArray: "6 4",
                    }}
                    eventHandlers={{
                      click: () => {
                        setSelectedPotential(field);
                      },
                    }}
                  >
                    <Tooltip sticky>
                      <strong>{field.namaBlok}</strong>
                      <br />
                      {field.kabupaten} • {field.luasHa.toLocaleString("id-ID")} Ha
                      <br />
                      {field.suitabilityScore}% • {field.suitabilityTier}
                      <br />
                      {field.existingCover} •{" "}
                      {potentialWaterSources.get(field.id)
                        ? `${potentialWaterSources.get(field.id)?.type} ${
                            potentialWaterSources.get(field.id)?.name
                          } (±${potentialWaterSources.get(field.id)?.distanceKm} km)`
                        : `${field.distWaterKm} km water`}
                    </Tooltip>
                  </GeoJSON>
                ))}
              </Pane>
            )}

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
                pane="potential-popup-pane"
                key={`potential-popup-${activePotential.id}`}
                position={activePotential.centroid}
                eventHandlers={{
                  remove: () => setSelectedPotential(null),
                }}
              >
                {renderPotentialZonePopup(
                  activePotential,
                  potentialWaterSources.get(activePotential.id),
                  lang
                )}
              </Popup>
            )}

            {/* 6. LAYER BENDUNGAN & EMBUNG (SIGI) */}
            {layers.sigiWater && (
              <Pane name="reservoirs-top-pane" style={{ zIndex: 750 }}>
              {filteredReservoirs.map((feat, idx) => {
                const [lng, lat] = feat.geometry.coordinates;
                const props = feat.properties || {};
                const isDam =
                  String(props.kategori || "").toLowerCase() === "bendungan";
                const nama = getPropFlexible(
                  props,
                  ["NAMOBJ", "name", "nama_bangunan", "nama_bendungan", "nama_embung", "nama_infrastruktur", "nama"],
                  isDam ? "Bendungan" : "Embung"
                );
                const status = getPropFlexible(
                  props,
                  ["status_infrastruktur", "kondisi_bangunan", "status"],
                  "Tidak tersedia"
                );
                const capacity = getPropFlexible(
                  props,
                  ["kapasitas", "kapasitas_tampung", "teknis_volume_tampung_total_m3"],
                  "Tidak tersedia"
                );
                return (
                  <Marker
                    key={`p2-res-${idx}-${lat}-${lng}`}
                    position={[lat, lng]}
                    icon={isDam ? damIcon : embungIcon}
                  >
                    <Tooltip>{nama}</Tooltip>
                    <Popup pane="potential-popup-pane" className="terracorp-dark-popup">
                      <div className="bg-[#09090d] text-white p-1 text-xs">
                        <div className="font-mono text-[10px] text-sky-400 uppercase font-bold">
                          {isDam
                            ? lang === "en"
                              ? "DAM"
                              : "BENDUNGAN"
                            : lang === "en"
                              ? "POND"
                              : "EMBUNG"}
                        </div>
                        <div className="font-bold text-sm">{nama}</div>
                        <div className="text-zinc-400">Status: {status}</div>
                        <div className="text-zinc-400">Kapasitas: {capacity}</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              </Pane>
            )}
          </MapContainer>
        </main>
      </div>
    </div>
  );
}