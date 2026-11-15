// src/app/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { buildFeatures } from "@/model/lib/ipFeatures";
import { loadIP, predictBatch } from "@/model/lib/ipTfjs";
import {
  Loader2,
  Droplets,
  Thermometer,
  CloudRain,
  Sprout,
  Layers,
  X,
  CheckCircle2,
  MapPin,
  BarChart3,
  Waves,
  Mountain,
  Sparkles,
  SlidersHorizontal,
  Globe,
  Map as MapIcon,
} from "lucide-react";
import {
  parseBatasKabupatenTopo,
  enrichSawahWithReservoirs,
  computeRealSawahPrediction,
  ComputedSawahPrediction,
  RealSawahFeature,
  KabupatenOption,
  PlantingSeason,
} from "@/lib/geodataEngine";

const MapComponent = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#050505] flex flex-col items-center justify-center text-zinc-500 gap-3">
      <Loader2 className="w-7 h-7 animate-spin text-pink-500" />
      <span className="text-xs font-mono tracking-widest uppercase text-center px-4">
        Initializing TerraCrop Viewport...
      </span>
    </div>
  ),
});

const PotentialFieldComponent = dynamic(
  () => import("@/components/PotentialFieldView"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-[#050505] text-xs font-mono text-zinc-400">
        Loading Potential Field Intelligence...
      </div>
    ),
  }
);

type Lang = "en" | "id";

const MONTHS_DATA = [
  { value: 1, en: "01 - January", id: "01 - Januari" },
  { value: 2, en: "02 - February", id: "02 - Februari" },
  { value: 3, en: "03 - March", id: "03 - Maret" },
  { value: 4, en: "04 - April", id: "04 - April" },
  { value: 5, en: "05 - May", id: "05 - Mei" },
  { value: 6, en: "06 - June", id: "06 - Juni" },
  { value: 7, en: "07 - July", id: "07 - Juli" },
  { value: 8, en: "08 - August", id: "08 - Agustus" },
  { value: 9, en: "09 - September", id: "09 - September" },
  { value: 10, en: "10 - October", id: "10 - Oktober" },
  { value: 11, en: "11 - November", id: "11 - November" },
  { value: 12, en: "12 - December", id: "12 - Desember" },
];

const YEARS = ["2025", "2026", "2027", "2028"];

const TRANSLATIONS = {
  en: {
    subtitle: "NASA Space Apps • Predictive Agri-Telemetry",
    introducing: "Introducing TerraCrop",
    controlTitle: "Spatial & Temporal Control",
    regencyLabel: "Regency / City",
    yearLabel: "Year",
    monthLabel: "Month (1–12)",
    runningML: "RUNNING SPATIAL ML INFERENCE...",
    runML: "Run Machine Learning Model",
    legendTitle: "Legend & Prediction Analysis",
    analysisPrefix: "Analysis of",
    analysisDesc: (
      <>
        Polygon classification is calculated based on <b>distance to reservoir</b>,{" "}
        <b>soil water retention</b> (Alluvial, Grumusol, Latosol, Regosol), and GPM monthly
        rainfall. Tap any paddy polygon on the map below to inspect sensor telemetry.
      </>
    ),
    baseLegend: [
      {
        fase: 1,
        color: "bg-emerald-500",
        border: "border-emerald-700",
        title: "Planting Season 1 (PS-1)",
        desc: "Close to dam (<12 km) & moisture ≥72%. Full irrigated paddy.",
      },
      {
        fase: 2,
        color: "bg-sky-500",
        border: "border-sky-700",
        title: "Planting Season 2 (PS-2)",
        desc: "Soil moisture 58–71%. Recommended water-saving rice varieties.",
      },
      {
        fase: 3,
        color: "bg-amber-500",
        border: "border-amber-700",
        title: "Planting Season 3 (PS-3)",
        desc: "Soil moisture 44–57%. Suitable for secondary crop rotation (corn/soybean).",
      },
    ],
    mt4Legend: {
      fase: 4,
      color: "bg-violet-500",
      border: "border-violet-700",
      title: "Planting Season 4 (PS-4)",
      desc: "Soil moisture 34–43%. Horticulture / short-cycle crops.",
    },
    nonTanamLegend: {
      fase: 0,
      color: "bg-zinc-500",
      border: "border-zinc-700",
      title: "Non-Planting / Fallow (Gray)",
      desc: "Far from dam, moisture <34%, or capped at PS-3 cycle. Fallow resting phase.",
    },
    mapSectionTitle: "Interactive Satellite & Paddy Map",
    footerCopy: "© 2026 TerraCrop. NASA Space Apps Challenge.",
    telemetryHeader: "Land Telemetry & Hydrology",
    predCategory: "Prediction Category:",
    nonPlantingBadge: "Non-Planting (Gray)",
    plantingSeasonBadge: (fase: number) => `Planting Season ${fase}`,
    distToDam: "Distance to Dam",
    soilChar: "Soil Profile",
    soilMoisture: "Soil Moisture",
    rainfall: "Precipitation",
    ndviIndex: "NDVI Index",
    surfaceTemp: "Surface Temp",
    optimalCropTitle: "Optimal Commodity Recommendation",
    areaLabel: "Area",
    fertilityLabel: "Fertility",
    mapPrompt: (
      <>
        Tap any <span className="text-white font-semibold">paddy polygon</span> on the map to
        view dam proximity, soil profile, moisture, & crop recommendations.
      </>
    ),
  },
  id: {
    subtitle: "NASA Space Apps • Predictive Agri-Telemetry",
    introducing: "Memperkenalkan TerraCrop",
    controlTitle: "Spatial & Temporal Control",
    regencyLabel: "Kabupaten / Kota",
    yearLabel: "Tahun",
    monthLabel: "Bulan (1–12)",
    runningML: "MENJALANKAN INFERENSI ML SPASIAL...",
    runML: "Run Machine Learning Model",
    legendTitle: "Legenda & Analisis Prediksi",
    analysisPrefix: "Analisis",
    analysisDesc: (
      <>
        Klasifikasi poligon dihitung berdasarkan <b>jarak lahan ke bendungan</b>,{" "}
        <b>retensi air jenis tanah</b> (Aluvial, Grumusol, Latosol, Regosol), serta curah hujan
        bulanan GPM. Ketuk area sawah pada peta di bawah untuk melihat detail sensor.
      </>
    ),
    baseLegend: [
      {
        fase: 1,
        color: "bg-emerald-500",
        border: "border-emerald-700",
        title: "Masa Tanam 1 (MT-1)",
        desc: "Jarak dam dekat (<12 km) & kelembapan ≥72%. Padi irigasi penuh.",
      },
      {
        fase: 2,
        color: "bg-sky-500",
        border: "border-sky-700",
        title: "Masa Tanam 2 (MT-2)",
        desc: "Kelembapan 58–71%. Direkomendasikan padi varietas hemat air.",
      },
      {
        fase: 3,
        color: "bg-amber-500",
        border: "border-amber-700",
        title: "Masa Tanam 3 (MT-3)",
        desc: "Kelembapan 44–57%. Cocok untuk rotasi palawija (jagung/kedelai).",
      },
    ],
    mt4Legend: {
      fase: 4,
      color: "bg-violet-500",
      border: "border-violet-700",
      title: "Masa Tanam 4 (MT-4)",
      desc: "Kelembapan 34–43%. Hortikultura / tanaman umur pendek.",
    },
    nonTanamLegend: {
      fase: 0,
      color: "bg-zinc-500",
      border: "border-zinc-700",
      title: "Tidak Masa Tanam (Abu-abu)",
      desc: "Jarak jauh dari dam, kelembapan <34%, atau siklus mentok MT-3. Fase bera.",
    },
    mapSectionTitle: "Peta Satelit & Lahan Sawah Interaktif",
    footerCopy: "© 2026 TerraCrop. NASA Space Apps Challenge.",
    telemetryHeader: "Telemetry & Hidrologi Lahan",
    predCategory: "Kategori Prediksi:",
    nonPlantingBadge: "Non-Tanam (Abu-abu)",
    plantingSeasonBadge: (fase: number) => `Masa Tanam ${fase}`,
    distToDam: "Jarak ke Dam",
    soilChar: "Karakter Tanah",
    soilMoisture: "Kelembapan Tanah",
    rainfall: "Curah Hujan",
    ndviIndex: "Indeks NDVI",
    surfaceTemp: "Suhu Permukaan",
    optimalCropTitle: "Rekomendasi Komoditas Optimal",
    areaLabel: "Luas",
    fertilityLabel: "Kesuburan",
    mapPrompt: (
      <>
        Ketuk pada <span className="text-white font-semibold">poligon sawah</span> di peta untuk
        melihat jarak ke bendungan, jenis tanah, kelembapan, & rekomendasi tanam.
      </>
    ),
  },
};

export default function NasaHackathonDashboard() {
  // Buffer Opening Splash State
  const [showOpening, setShowOpening] = useState<boolean>(true);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  const [lang, setLang] = useState<Lang>("en");
  const [selectedKabId, setSelectedKabId] = useState<string>("ALL");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<number>(11);

  const [isRunningML, setIsRunningML] = useState<boolean>(false);
  const [mlRunCount, setMlRunCount] = useState<number>(0);
  const [lastRunTimestamp, setLastRunTimestamp] = useState<string>("v2.4 LIVE");

  const [selectedSawahId, setSelectedSawahId] = useState<string | null>(null);
  const [activeBasemap, setActiveBasemap] = useState<"osm" | "topo" | "satellite">("satellite");
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);
  const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [realSawahList, setRealSawahList] = useState<RealSawahFeature[]>([]);
  const [modelFasesByUid, setModelFasesByUid] = useState<Record<string, PlantingSeason>>({});
  const [reservoirs, setReservoirs] = useState<Record<string, unknown>[]>([]);
  const [kabupatenList, setKabupatenList] = useState<KabupatenOption[]>([]);
  const [batasKabGeoJson, setBatasKabGeoJson] = useState<Record<string, unknown> | null>(null);
  const [konturGeoJson, setKonturGeoJson] = useState<Record<string, unknown> | null>(null);
  const [activeView, setActiveView] = useState<"cycle" | "potential">("cycle");

  const mapSectionRef = useRef<HTMLDivElement | null>(null);
  const modelRef = useRef<Awaited<ReturnType<typeof loadIP>> | null>(null);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 3000);

    const removeTimer = setTimeout(() => {
      setShowOpening(false);
    }, 3700);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadRealGeodata() {
      try {
        setIsDataLoading(true);
        setLoadError(null);
        const [sawahData, reservoirData, batasData, konturData] = await Promise.all([
          fetch("/data/sawah_existing.geojson").then((response) => {
            if (!response.ok) throw new Error("Gagal memuat data lahan sawah.");
            return response.json();
          }),
          fetch("/data/sigi_reservoirs.geojson").then((response) => {
            if (!response.ok) throw new Error("Gagal memuat data bendungan.");
            return response.json();
          }),
          fetch("/data/batas_kab_jawa.topojson").then((response) => {
            if (!response.ok) throw new Error("Gagal memuat batas kabupaten.");
            return response.json();
          }),
          fetch("/data/kontur_jawa_all.geojson", { cache: "no-store" })
            .then((response) => (response.ok ? response.json() : null))
            .catch(() => null),
        ]);

        if (!isMounted) return;
        const reservoirFeatures = Array.isArray(reservoirData?.features)
          ? reservoirData.features
          : [];
        setReservoirs(reservoirFeatures);
        setRealSawahList(enrichSawahWithReservoirs(sawahData, reservoirFeatures));
        const parsedBoundaries = parseBatasKabupatenTopo(batasData);
        setBatasKabGeoJson(parsedBoundaries.geoJson);
        setKabupatenList(parsedBoundaries.kabupatenList);
        setKonturGeoJson(konturData);
      } catch (error) {
        if (isMounted) {
          setLoadError(error instanceof Error ? error.message : "Gagal memuat data geospasial.");
        }
      } finally {
        if (isMounted) setIsDataLoading(false);
      }
    }

    loadRealGeodata();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSkipOpening = () => {
    setIsFadingOut(true);
    setTimeout(() => setShowOpening(false), 450);
  };

  const t = TRANSLATIONS[lang];

  const activeKabupaten =
    kabupatenList.find((kabupaten) => kabupaten.id === selectedKabId) || null;
  const filteredSawah = activeKabupaten
    ? (() => {
        const target = activeKabupaten.nama
          .toUpperCase()
          .replace(/^KABUPATEN\s+|^KOTA\s+/i, "");
        const byName = realSawahList.filter((sawah) =>
          sawah.kabupaten.toUpperCase().includes(target)
        );
        if (byName.length > 0) return byName;

        const [[minLat, minLng], [maxLat, maxLng]] = activeKabupaten.bounds;
        return realSawahList.filter(
          (sawah) =>
            sawah.centroid[0] >= minLat - 0.1 &&
            sawah.centroid[0] <= maxLat + 0.1 &&
            sawah.centroid[1] >= minLng - 0.1 &&
            sawah.centroid[1] <= maxLng + 0.1
        );
      })()
    : realSawahList;

  const selectedMonthObj = MONTHS_DATA.find((m) => m.value === selectedMonth);
  const currentMonthName = selectedMonthObj
    ? selectedMonthObj[lang].split(" - ")[1]
    : "November";

  const getPredictedFase = (item: RealSawahFeature): PlantingSeason | undefined => {
    return modelFasesByUid[item.id];
  };

  const computedList = filteredSawah.map((item) =>
    computeRealSawahPrediction(
      item,
      selectedMonth,
      selectedYear,
      mlRunCount,
      lang,
      getPredictedFase(item)
    )
  );

  const selectedSawah: ComputedSawahPrediction | null = selectedSawahId
    ? computedList.find((item) => item.id === selectedSawahId) || null
    : null;

  const totalLuas = computedList.reduce((acc, item) => acc + item.luasHa, 0).toFixed(1);
  const avgMoisture = Math.round(
    computedList.length
      ? computedList.reduce((acc, item) => acc + item.kelembabanTanah, 0) / computedList.length
      : 0
  );

  const hasMasaTanam4 = computedList.some((item) => item.faseTanam === 4);

  const displayedLegendItems = [
    ...t.baseLegend,
    hasMasaTanam4 ? t.mt4Legend : t.nonTanamLegend,
  ];

  const mapCenter = activeKabupaten?.center ||
    realSawahList[0]?.centroid || [-6.3227, 107.3376];
  const regionName = activeKabupaten?.nama || "Java Region";
  const regionProvince = activeKabupaten?.provinsi || "Java Island";
  const primaryReservoir = selectedSawah?.sumberAirTerdekat ||
    computedList[0]?.sumberAirTerdekat || "Bendungan / Irigasi";
  const allComputedList = realSawahList.map((item) =>
    computeRealSawahPrediction(
      item,
      selectedMonth,
      selectedYear,
      mlRunCount,
      lang,
      getPredictedFase(item)
    )
  );

  if (activeView === "potential") {
    return (
      <PotentialFieldComponent
        onBack={() => setActiveView("cycle")}
        onLangChange={setLang}
        kabupatenList={kabupatenList}
        batasKabGeoJson={batasKabGeoJson}
        konturGeoJson={konturGeoJson}
        sawahList={allComputedList}
        reservoirs={reservoirs}
        lang={lang}
      />
    );
  }

  const handleRunMachineLearning = async () => {
    setIsRunningML(true);
    setSelectedSawahId(null);

    try {
      if (!modelRef.current) {
        modelRef.current = await loadIP("/model");
      }

      const records = await fetch("/model/data_mentah.json").then((response) => {
        if (!response.ok) throw new Error("Data Excel hasil export tidak ditemukan.");
        return response.json();
      });
      const featureSet = buildFeatures(records, Number(selectedYear));
      const probabilities = await predictBatch(
        { ...modelRef.current, fitur: { features: featureSet.names } },
        featureSet.petak.map((petak) => petak.x)
      );
      if (probabilities.length > 0) {
        const predictedFases: Record<string, PlantingSeason> = {};
        featureSet.petak.forEach((petak, index) => {
          const scores = probabilities[index];
          const modelClass = scores.reduce(
            (best: number, score: number, classIndex: number) =>
              score > scores[best] ? classIndex : best,
            0
          );
          predictedFases[petak.uid] = modelClass as PlantingSeason;
        });
        setModelFasesByUid(predictedFases);
      }

      setIsRunningML(false);
      setMlRunCount((prev) => prev + 1);
      const now = new Date();
      setLastRunTimestamp(
        `SYNCED ${now.toLocaleTimeString(lang === "en" ? "en-US" : "id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}`
      );
      if (typeof window !== "undefined" && window.innerWidth < 1024 && mapSectionRef.current) {
        mapSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (error) {
      setIsRunningML(false);
      const message = error instanceof Error ? error.message : "Model gagal dijalankan.";
      setLoadError(`Gagal menjalankan model pola tanam: ${message}`);
      console.error("Planting season model inference failed", error);
    }
  };

  const renderTelemetryCard = (isMobileBottom: boolean) => {
    if (!selectedSawah) return null;

    return (
      <div
        className={
          isMobileBottom
            ? "lg:hidden mt-3 bg-[#09090c] border border-white/15 rounded-xl shadow-2xl overflow-hidden"
            : "hidden lg:block absolute top-4 right-4 z-[1000] w-[400px] bg-[#070709]/95 backdrop-blur-md border border-white/15 rounded-xl shadow-2xl overflow-hidden"
        }
      >
        <div className="px-4 py-3 bg-[#0d0d10] border-b border-white/10 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-pink-400">
              <MapPin className="w-3 h-3 shrink-0" />
              <span>{t.telemetryHeader}</span>
            </div>
            <h3 className="font-serif text-sm sm:text-base font-bold text-white mt-0.5 truncate">
              {selectedSawah.namaBlok}
            </h3>
          </div>
          <button
            onClick={() => setSelectedSawahId(null)}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 text-xs lg:max-h-[calc(100vh-120px)] lg:overflow-y-auto">
          {/* Planting Phase Status */}
          <div className="flex items-center justify-between bg-[#0e0e11] px-3 py-2 rounded-lg border border-white/10">
            <span className="text-zinc-400">{t.predCategory}</span>
            <span
              className={`px-2.5 py-0.5 rounded font-bold text-[11px] ${
                selectedSawah.faseTanam === 1
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : selectedSawah.faseTanam === 2
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
                  : selectedSawah.faseTanam === 3
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                  : selectedSawah.faseTanam === 4
                  ? "bg-violet-500/20 text-violet-300 border border-violet-500/40"
                  : "bg-zinc-500/20 text-zinc-300 border border-zinc-500/40"
              }`}
            >
              {selectedSawah.faseTanam === 0
                ? t.nonPlantingBadge
                : t.plantingSeasonBadge(selectedSawah.faseTanam)}
            </span>
          </div>

          {/* Dam Distance & Soil Profile */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 sm:p-3 rounded-lg bg-[#0d0d10] border border-white/10">
              <div className="flex items-center gap-1.5 text-sky-400 text-[10px] uppercase font-medium">
                <Waves className="w-3.5 h-3.5 shrink-0" />
                <span>{t.distToDam}</span>
              </div>
              <div className="text-sm font-mono font-bold text-white mt-1">
                {selectedSawah.jarakDamKm} km
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
                {selectedSawah.saluranLabel}
              </div>
            </div>

            <div className="p-2.5 sm:p-3 rounded-lg bg-[#0d0d10] border border-white/10">
              <div className="flex items-center gap-1.5 text-amber-400 text-[10px] uppercase font-medium">
                <Mountain className="w-3.5 h-3.5 shrink-0" />
                <span>{t.soilChar}</span>
              </div>
              <div className="text-sm font-bold text-white mt-1 truncate">
                {selectedSawah.soilType}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                pH {selectedSawah.soilPh} • {selectedSawah.elevasiMdpl}{" "}
                {lang === "en" ? "masl" : "mdpl"}
              </div>
            </div>
          </div>

          {/* NASA Satellite Parameters Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-[#0c0c0e] border border-white/10">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase">
                <Droplets className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>{t.soilMoisture}</span>
              </div>
              <div className="text-base font-mono font-bold text-white mt-1">
                {selectedSawah.kelembabanTanah}%
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0c0c0e] border border-white/10">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase">
                <CloudRain className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>{t.rainfall}</span>
              </div>
              <div className="text-base font-mono font-bold text-white mt-1">
                {selectedSawah.curahHujanMm}{" "}
                <span className="text-[10px] font-normal text-zinc-400">mm</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0c0c0e] border border-white/10">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase">
                <Sprout className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{t.ndviIndex}</span>
              </div>
              <div className="text-base font-mono font-bold text-white mt-1">
                {selectedSawah.ndviIndex}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#0c0c0e] border border-white/10">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase">
                <Thermometer className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span>{t.surfaceTemp}</span>
              </div>
              <div className="text-base font-mono font-bold text-white mt-1">
                {selectedSawah.surfaceTempC}°C
              </div>
            </div>
          </div>

          {/* Commodity Recommendation */}
          <div className="p-3 sm:p-3.5 rounded-lg bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-transparent border border-pink-500/30 space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-pink-400">
              {t.optimalCropTitle}
            </div>
            <div className="text-sm font-bold text-white">
              {selectedSawah.cropRecommendation}
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              {selectedSawah.cropReasoning}
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-zinc-400 font-mono">
              <span>
                {t.areaLabel}: {selectedSawah.luasHa} Ha
              </span>
              <span>
                {t.fertilityLabel}: {selectedSawah.fertilityScore}/100
              </span>
              <span>Conf: {selectedSawah.confidencePct}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative min-h-screen flex flex-col w-full overflow-x-hidden bg-[#050505] text-white font-sans lg:h-screen lg:overflow-hidden">
      {/* Paksa agar di HP (< 1024px) scroll body tidak pernah terkunci oleh globals.css */}
      <style>{`
        @media (max-width: 1023px) {
          html, body {
            overflow-x: hidden !important;
            overflow-y: auto !important;
            height: auto !important;
            position: static !important;
            -webkit-overflow-scrolling: touch;
          }
        }
      `}</style>

      {/* =========================================================
          BUFFER OPENING SPLASH SCREEN (ZOOM IN -> GRADIENT SHIMMER)
         ========================================================= */}
      {showOpening && (
        <div
          onClick={handleSkipOpening}
          className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center select-none cursor-pointer transition-opacity duration-700 ${
            isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <style>{`
            @keyframes scaleUpTitle {
              0% {
                opacity: 0;
                transform: scale(0.32);
                letter-spacing: 0.25em;
              }
              100% {
                opacity: 1;
                transform: scale(1);
                letter-spacing: 0.04em;
              }
            }
            @keyframes strokeShimmer {
              0% {
                background-position: 180% 50%;
              }
              100% {
                background-position: -180% 50%;
              }
            }
            @keyframes fadeInSub {
              0%, 60% {
                opacity: 0;
                transform: translateY(8px);
              }
              100% {
                opacity: 1;
                transform: translateY(0);
              }
            }
            .terracrop-opening-title {
              font-weight: 800;
              color: #050505;
              background: linear-gradient(
                110deg,
                #3f3f46 25%,
                #ec4899 43%,
                #a855f7 50%,
                #38bdf8 57%,
                #3f3f46 75%
              );
              background-size: 240% auto;
              background-position: 180% 50%;
              -webkit-background-clip: text;
              background-clip: text;
              -webkit-text-stroke: 2.5px transparent;
              animation:
                scaleUpTitle 1.1s cubic-bezier(0.16, 1, 0.3, 1) forwards,
                strokeShimmer 2.1s linear 1.1s infinite;
            }
            @media (min-width: 640px) {
              .terracrop-opening-title {
                -webkit-text-stroke: 3.5px transparent;
              }
            }
            .terracrop-opening-sub {
              animation: fadeInSub 1.4s ease-out forwards;
            }
          `}</style>

          <div className="px-6 text-center">
            <div className="terracrop-opening-title text-5xl sm:text-7xl md:text-8xl lg:text-9xl leading-none">
              TerraCrop
            </div>
            <div className="terracrop-opening-sub mt-4 sm:mt-5 flex items-center justify-center gap-2 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.22em] sm:tracking-[0.28em] text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse shrink-0" />
              <span>NASA Space Apps • Initializing Telemetry</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          TOP HEADER BAR
         ========================================================= */}
      <header className="sticky top-0 lg:static h-14 sm:h-16 bg-[#050505]/95 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-pink-500 via-purple-500 to-sky-500 p-[1.5px] shrink-0">
            <div className="w-full h-full bg-[#050505] rounded-[5px] flex items-center justify-center">
              <Sprout className="w-4 h-4 text-pink-400" />
            </div>
          </div>

          <div className="h-5 w-[1px] bg-white/20 shrink-0" />

          <div className="flex items-center gap-3 min-w-0">
            <h1 className="text-base sm:text-xl font-extrabold tracking-[0.14em] uppercase animate-gradient-text truncate">
              TERRACROP
            </h1>
            <span className="hidden md:inline-block text-xs text-zinc-500 font-medium pl-2">
              {t.subtitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <div
            className="flex items-center bg-[#0d0d0f] border border-white/15 rounded-full p-0.5 text-[11px] font-mono"
            role="group"
            aria-label="Language Switcher"
          >
            <Globe className="w-3.5 h-3.5 text-pink-400 ml-2 mr-1 sm:mr-1.5" />
            <button
              onClick={() => setLang("en")}
              className={`px-2 sm:px-2.5 py-0.5 rounded-full font-bold transition-colors cursor-pointer ${
                lang === "en"
                  ? "bg-pink-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang("id")}
              className={`px-2 sm:px-2.5 py-0.5 rounded-full font-bold transition-colors cursor-pointer ${
                lang === "id"
                  ? "bg-pink-600 text-white"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              ID
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
            <span>
              {t.introducing} {lastRunTimestamp}
            </span>
          </div>
        </div>
      </header>

      {/* =========================================================
          MAIN WORKSPACE (MOBILE: SCROLL STACK | DESKTOP: SPLIT)
         ========================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
        {/* LEFT PANEL (KONTROL + LEGENDA) */}
        <aside className="w-full lg:w-[445px] xl:w-[475px] bg-[#050505] border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col shrink-0 z-20 lg:overflow-y-auto">
          {(isDataLoading || loadError) && (
            <div className="px-4 sm:px-5 pt-4">
              <div
                className={`rounded-lg border px-3 py-2 text-[11px] font-mono ${
                  loadError
                    ? "border-red-500/40 bg-red-500/10 text-red-300"
                    : "border-sky-500/30 bg-sky-500/10 text-sky-300"
                }`}
              >
                {loadError || "Syncing geospatial data..."}
              </div>
            </div>
          )}
          {/* PARAMETERS + RUN ML BUTTON */}
          <div className="p-4 sm:p-5 border-b border-white/10 space-y-3.5 sm:space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-serif text-sm font-bold tracking-tight text-zinc-200 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span>{t.controlTitle}</span>
              </span>
              <span className="text-[11px] font-medium text-pink-400 shrink-0">
                {regionProvince}
              </span>
            </div>

            {/* 3 Dropdowns */}
            <div className="grid grid-cols-12 gap-2 sm:gap-2.5">
              <div className="col-span-5">
                <label className="block text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1.5 truncate">
                  {t.regencyLabel}
                </label>
                <select
                  value={selectedKabId}
                  onChange={(e) => {
                    setSelectedKabId(e.target.value);
                    setSelectedSawahId(null);
                  }}
                  className="w-full bg-[#0d0d0f] border border-white/15 rounded-lg px-2 sm:px-2.5 py-2 text-xs font-medium text-white focus:outline-none focus:border-pink-500 transition-colors"
                >
                  <option value="ALL" className="bg-[#0d0d0f]">
                    All Java
                  </option>
                  {kabupatenList.map((kabupaten) => (
                    <option key={kabupaten.id} value={kabupaten.id} className="bg-[#0d0d0f]">
                      {kabupaten.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-3">
                <label className="block text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1.5 truncate">
                  {t.yearLabel}
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setSelectedSawahId(null);
                  }}
                  className="w-full bg-[#0d0d0f] border border-white/15 rounded-lg px-2 py-2 text-xs font-mono font-medium text-white focus:outline-none focus:border-pink-500 transition-colors"
                >
                  {YEARS.map((yr) => (
                    <option key={yr} value={yr} className="bg-[#0d0d0f]">
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-4">
                <label className="block text-[9px] sm:text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1.5 truncate">
                  {t.monthLabel}
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(Number(e.target.value));
                    setSelectedSawahId(null);
                  }}
                  className="w-full bg-[#0d0d0f] border border-white/15 rounded-lg px-2 py-2 text-xs font-medium text-white focus:outline-none focus:border-pink-500 transition-colors"
                >
                  {MONTHS_DATA.map((m) => (
                    <option key={m.value} value={m.value} className="bg-[#0d0d0f]">
                      {m[lang]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Reservoir Info */}
            <div className="px-3 sm:px-3.5 py-2.5 rounded-lg bg-[#0c0c0e] border border-white/10 flex items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2 text-zinc-300 min-w-0">
                <Waves className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">{primaryReservoir}</span>
              </div>
              <span className="font-mono text-zinc-400 shrink-0">
                SIGI PUPR
              </span>
            </div>

            {/* Run Machine Learning Button */}
            <button
              onClick={handleRunMachineLearning}
              disabled={isRunningML}
              className="w-full py-3 px-4 rounded-lg animate-gradient-border-btn text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-pink-500/20 hover:opacity-95 transition-all active:scale-[0.99] cursor-pointer"
            >
              {isRunningML ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.runningML}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{t.runML}</span>
                </>
              )}
            </button>
          </div>

          {/* LEGEND & ANALYSIS */}
          <div className="flex-1 p-4 sm:p-5 flex flex-col justify-between space-y-5 lg:overflow-y-auto">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-serif text-sm font-bold tracking-tight text-zinc-200 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <span>{t.legendTitle}</span>
                </span>
                <span className="text-[10px] font-mono bg-white/[0.05] border border-white/10 px-2.5 py-0.5 rounded-full text-zinc-300 shrink-0">
                  {totalLuas} Ha • SM {avgMoisture}%
                </span>
              </div>

              {/* Analysis Summary Card */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-[#0b0b0d] border border-white/10 space-y-2">
                <h2 className="font-serif text-base font-bold text-white tracking-tight">
                  {t.analysisPrefix} {regionName} — {currentMonthName} {selectedYear}
                </h2>
                <p className="text-zinc-400 leading-relaxed text-[11px]">{t.analysisDesc}</p>
              </div>

              {/* 4 Dynamic Legend Cards */}
              <div className="space-y-2">
                {displayedLegendItems.map((item) => (
                  <div
                    key={item.fase}
                    className="flex items-start gap-3 p-2.5 rounded-lg bg-[#09090b] border border-white/[0.07] hover:border-white/15 transition-colors"
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-sm ${item.color} border ${item.border} shrink-0 mt-1`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-serif text-sm font-bold text-white tracking-tight">
                        {item.title}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {activeKabupaten && computedList.length === 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
                  Data sawah untuk {activeKabupaten.nama} belum tersedia pada file GeoJSON
                  yang diberikan. Ini bukan karena Machine Learning belum dijalankan.
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveView("potential")}
                className="w-full py-3 px-4 rounded-lg animate-gradient-border-btn text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-pink-500/20 hover:opacity-95 transition-all cursor-pointer"
              >
                <span>Potential Field Intelligence</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>

            {/* Bottom Brand Watermark (Desktop Sidebar) */}
            <div className="hidden lg:block pt-3 border-t border-white/10 text-center select-none">
              <div className="text-3xl font-extrabold tracking-[0.2em] uppercase animate-gradient-text opacity-80">
                TERRACROP
              </div>
              <div className="text-[10px] text-zinc-600 mt-1">{t.footerCopy}</div>
            </div>
          </div>
        </aside>

        {/* =========================================================
            RIGHT PANEL (DESKTOP) / BOTTOM SECTION (MOBILE)
           ========================================================= */}
        <section
          ref={mapSectionRef}
          className="w-full p-4 sm:p-5 lg:p-0 lg:flex-1 lg:h-full bg-[#050505] flex flex-col"
        >
          {/* Header Section Map Khusus HP */}
          <div className="lg:hidden flex items-center justify-between mb-3">
            <span className="font-serif text-sm font-bold tracking-tight text-zinc-200 flex items-center gap-1.5">
              <MapIcon className="w-4 h-4 text-pink-400" />
              <span>{t.mapSectionTitle}</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-400">
              {regionName}
            </span>
          </div>

          {/* Container Peta */}
          <div className="relative w-full h-[380px] sm:h-[440px] lg:h-full lg:flex-1 rounded-xl lg:rounded-none overflow-hidden border border-white/15 lg:border-0 bg-[#050505]">
            <MapComponent
              center={mapCenter}
              zoom={activeKabupaten ? 11 : 9}
              selectedYear={selectedYear}
              sawahList={computedList}
              reservoirs={reservoirs}
              activeBasemap={activeBasemap}
              selectedSawah={selectedSawah}
              onSelectSawah={(sawah) => setSelectedSawahId(sawah ? sawah.id : null)}
              lang={lang}
            />

            {/* Basemap Switcher */}
            <div className="absolute bottom-3 right-2 lg:bottom-6 lg:right-4 z-[1000]">
              <div className="relative">
                <button
                  onClick={() => setShowLayerMenu(!showLayerMenu)}
                  className="bg-[#050505]/95 hover:bg-[#111114] text-white px-2.5 py-1.5 rounded-lg shadow-2xl border border-white/15 flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer transition-colors"
                >
                  <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-400" />
                  <span>Basemap: {activeBasemap.toUpperCase()}</span>
                </button>

                {showLayerMenu && (
                  <div className="absolute bottom-11 right-0 w-52 bg-[#0a0a0c] border border-white/15 rounded-lg shadow-2xl p-1.5 space-y-1">
                    {[
                      { id: "satellite", label: "Esri Satellite Imagery" },
                      { id: "topo", label: "Esri Topographic" },
                      { id: "osm", label: "OpenStreetMap Standard" },
                    ].map((bm) => (
                      <button
                        key={bm.id}
                        onClick={() => {
                          setActiveBasemap(bm.id as "osm" | "topo" | "satellite");
                          setShowLayerMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-xs font-medium flex items-center justify-between transition-colors ${
                          activeBasemap === bm.id
                            ? "bg-pink-600 text-white"
                            : "text-zinc-300 hover:bg-white/5"
                        }`}
                      >
                        <span>{bm.label}</span>
                        {activeBasemap === bm.id && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Floating Telemetry Card */}
            {renderTelemetryCard(false)}

            {/* Map Prompt Hint */}
            {!selectedSawah && (
              <div className="hidden lg:block absolute top-3 right-3 lg:top-4 lg:right-4 z-[1000] bg-[#050505]/90 backdrop-blur-md border border-white/15 px-3 py-2 rounded-lg shadow-2xl text-[11px] sm:text-xs text-zinc-300 max-w-[230px] sm:max-w-xs pointer-events-none">
                {t.mapPrompt}
              </div>
            )}
          </div>

          {!selectedSawah && (
            <div className="lg:hidden mb-2 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] leading-tight text-zinc-300">
              {t.mapPrompt}
            </div>
          )}

          {/* Mobile Telemetry Card (Tampil rapi tepat di bawah peta saat sawah diklik di HP) */}
          {renderTelemetryCard(true)}
        </section>
      </div>

      {/* Mobile Footer Watermark */}
      <footer className="lg:hidden py-6 px-4 bg-[#050505] border-t border-white/10 text-center select-none">
        <div className="text-2xl font-extrabold tracking-[0.2em] uppercase animate-gradient-text opacity-80">
          TERRACROP
        </div>
        <div className="text-[10px] text-zinc-600 mt-1">{t.footerCopy}</div>
      </footer>
    </div>
  );
}