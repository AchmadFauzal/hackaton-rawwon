// src/app/page.tsx
"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
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
} from "lucide-react";
import {
  FULL_INDONESIA_SAWAH_DATA,
  ComputedSawahResult,
  computeSawahPrediction,
} from "@/data/dummySawahData";

const MapComponent = dynamic(() => import("@/components/map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#050505] flex flex-col items-center justify-center text-zinc-500 gap-3">
      <Loader2 className="w-7 h-7 animate-spin text-pink-500" />
      <span className="text-xs font-mono tracking-widest uppercase">
        Initializing TerraCrop Viewport...
      </span>
    </div>
  ),
});

const MONTHS = [
  { value: 1, label: "01 - Januari" },
  { value: 2, label: "02 - Februari" },
  { value: 3, label: "03 - Maret" },
  { value: 4, label: "04 - April" },
  { value: 5, label: "05 - Mei" },
  { value: 6, label: "06 - Juni" },
  { value: 7, label: "07 - Juli" },
  { value: 8, label: "08 - Agustus" },
  { value: 9, label: "09 - September" },
  { value: 10, label: "10 - Oktober" },
  { value: 11, label: "11 - November" },
  { value: 12, label: "12 - Desember" },
];

const YEARS = ["2025", "2026", "2027", "2028"];

const BASE_LEGEND_ITEMS = [
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
];

const MT4_LEGEND_ITEM = {
  fase: 4,
  color: "bg-violet-500",
  border: "border-violet-700",
  title: "Masa Tanam 4 (MT-4)",
  desc: "Kelembapan 34–43%. Hortikultura / tanaman umur pendek.",
};

const NON_TANAM_LEGEND_ITEM = {
  fase: 0,
  color: "bg-zinc-500",
  border: "border-zinc-700",
  title: "Tidak Masa Tanam (Abu-abu)",
  desc: "Jarak jauh dari dam & kelembapan <34%. Fase bera / istirahat tanah.",
};

export default function NasaHackathonDashboard() {
  const [selectedCityId, setSelectedCityId] = useState<string>("karawang");
  const [selectedYear, setSelectedYear] = useState<string>("2026");
  const [selectedMonth, setSelectedMonth] = useState<number>(11);

  const [isRunningML, setIsRunningML] = useState<boolean>(false);
  const [mlRunCount, setMlRunCount] = useState<number>(0);
  const [lastRunTimestamp, setLastRunTimestamp] = useState<string>("v2.4 LIVE");

  const [selectedSawah, setSelectedSawah] = useState<ComputedSawahResult | null>(null);
  const [activeBasemap, setActiveBasemap] = useState<"osm" | "topo" | "satellite">("satellite");
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);

  const currentCity =
    FULL_INDONESIA_SAWAH_DATA.find((c) => c.id === selectedCityId) ||
    FULL_INDONESIA_SAWAH_DATA[0];

  const currentMonthName =
    MONTHS.find((m) => m.value === selectedMonth)?.label.split(" - ")[1] || "November";

  const computedList = currentCity.lahan.map((item) =>
    computeSawahPrediction(item, selectedMonth, selectedYear, mlRunCount)
  );
  const totalLuas = computedList.reduce((acc, item) => acc + item.luasHa, 0).toFixed(1);
  const avgMoisture = Math.round(
    computedList.reduce((acc, item) => acc + item.kelembapanAktual, 0) / computedList.length
  );

  // Cek apakah di area & waktu terpilih ada lahan yang mencapai Masa Tanam 4 (MT-4)
  const hasMasaTanam4 = computedList.some((item) => item.faseTanam === 4);

  // Tampilkan tepat 4 kotak: MT-1, MT-2, MT-3, dan kotak ke-4 menyesuaikan data (MT-4 atau Abu-abu)
  const displayedLegendItems = [
    ...BASE_LEGEND_ITEMS,
    hasMasaTanam4 ? MT4_LEGEND_ITEM : NON_TANAM_LEGEND_ITEM,
  ];

  const handleRunMachineLearning = () => {
    setIsRunningML(true);
    setSelectedSawah(null);

    setTimeout(() => {
      setIsRunningML(false);
      setMlRunCount((prev) => prev + 1);
      const now = new Date();
      setLastRunTimestamp(
        `SYNCED ${now.toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}`
      );
    }, 900);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#050505] text-white font-sans">
      {/* =========================================================
          TOP HEADER BAR (GAYA MINIMALIS HITAM PEKAT)
         ========================================================= */}
      <header className="h-16 bg-[#050505] border-b border-white/10 px-6 flex items-center justify-between shrink-0 z-30">
        {/* Logo + Pemisah Vertikal + Nama Judul Gradasi Bergerak */}
        <div className="flex items-center gap-3.5">
          {/* Ikon Geometris Ungu-Pink */}
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-pink-500 via-purple-500 to-sky-500 p-[1.5px]">
            <div className="w-full h-full bg-[#050505] rounded-[5px] flex items-center justify-center">
              <Sprout className="w-4 h-4 text-pink-400" />
            </div>
          </div>

          {/* Garis Pemisah Vertikal */}
          <div className="h-5 w-[1px] bg-white/20" />

          {/* Judul Utama dengan Gradasi Bergerak */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-[0.14em] uppercase animate-gradient-text">
              TERRACROP
            </h1>
            <span className="hidden md:inline-block text-xs text-zinc-500 font-medium pl-2">
              NASA Space Apps • Predictive Agri-Telemetry
            </span>
          </div>
        </div>

        {/* Badge Pill Status Kanan */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] text-zinc-300">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" />
            <span>Introducing TerraCrop {lastRunTimestamp}</span>
          </div>
        </div>
      </header>

      {/* =========================================================
          MAIN WORKSPACE
         ========================================================= */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* PANEL KIRI: HITAM PEKAT (#050505) */}
        <aside className="w-full lg:w-[445px] xl:w-[475px] bg-[#050505] border-r border-white/10 flex flex-col shrink-0 z-20 overflow-y-auto">
          {/* KIRI ATAS: PARAMETER + TOMBOL RUN ML */}
          <div className="p-5 border-b border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-serif text-sm font-bold tracking-tight text-zinc-200 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-pink-400" />
                Spatial & Temporal Control
              </span>
              <span className="text-[11px] font-medium text-pink-400">
                {currentCity.provinsi}
              </span>
            </div>

            {/* 3 Dropdown Sejajar */}
            <div className="grid grid-cols-12 gap-2.5">
              <div className="col-span-5">
                <label className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
                  Kabupaten / Kota
                </label>
                <select
                  value={selectedCityId}
                  onChange={(e) => {
                    setSelectedCityId(e.target.value);
                    setSelectedSawah(null);
                  }}
                  className="w-full bg-[#0d0d0f] border border-white/15 rounded-lg px-2.5 py-2 text-xs font-medium text-white focus:outline-none focus:border-pink-500 transition-colors"
                >
                  {FULL_INDONESIA_SAWAH_DATA.map((city) => (
                    <option key={city.id} value={city.id} className="bg-[#0d0d0f]">
                      {city.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-3">
                <label className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
                  Tahun
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setSelectedSawah(null);
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
                <label className="block text-[10px] font-medium uppercase tracking-wider text-zinc-400 mb-1.5">
                  Bulan (1–12)
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(Number(e.target.value));
                    setSelectedSawah(null);
                  }}
                  className="w-full bg-[#0d0d0f] border border-white/15 rounded-lg px-2 py-2 text-xs font-medium text-white focus:outline-none focus:border-pink-500 transition-colors"
                >
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value} className="bg-[#0d0d0f]">
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Info Bendungan Aktif */}
            <div className="px-3.5 py-2.5 rounded-lg bg-[#0c0c0e] border border-white/10 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-zinc-300">
                <Waves className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="truncate">{currentCity.bendungan.nama}</span>
              </div>
              <span className="font-mono text-zinc-400 shrink-0">
                {currentCity.bendungan.kapasitasJutaM3}M m³
              </span>
            </div>

            {/* Tombol Run Machine Learning dengan Gradasi Bergerak */}
            <button
              onClick={handleRunMachineLearning}
              disabled={isRunningML}
              className="w-full py-3 px-4 rounded-lg animate-gradient-border-btn text-white font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-lg shadow-pink-500/20 hover:opacity-95 transition-all active:scale-[0.99] cursor-pointer"
            >
              {isRunningML ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>RUNNING SPATIAL ML INFERENCE...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Run Machine Learning Model</span>
                </>
              )}
            </button>
          </div>

          {/* KIRI BAWAH: LEGENDA & PENJELASAN ANALISIS */}
          <div className="flex-1 p-5 flex flex-col justify-between space-y-5 overflow-y-auto">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="font-serif text-sm font-bold tracking-tight text-zinc-200 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-pink-400" />
                  Legenda & Analisis Prediksi
                </span>
                <span className="text-[10px] font-mono bg-white/[0.05] border border-white/10 px-2.5 py-0.5 rounded-full text-zinc-300">
                  {totalLuas} Ha • SM {avgMoisture}%
                </span>
              </div>

              {/* Kotak Ringkasan Hasil Analisis dengan Judul Serif Elegan */}
              <div className="p-4 rounded-xl bg-[#0b0b0d] border border-white/10 space-y-2">
                <h2 className="font-serif text-base font-bold text-white tracking-tight">
                  Analisis {currentCity.nama} — {currentMonthName} {selectedYear}
                </h2>
                <p className="text-zinc-400 leading-relaxed text-[11px]">
                  Klasifikasi poligon dihitung berdasarkan <b>jarak lahan ke bendungan</b>,{" "}
                  <b>retensi air jenis tanah</b> (Aluvial, Grumusol, Latosol, Regosol), serta
                  curah hujan bulanan GPM. Klik area sawah pada peta untuk melihat detail sensor.
                </p>
              </div>

              {/* Daftar 4 Kategori Warna Poligon (Dinamis sesuai data wilayah) */}
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
            </div>

            {/* Watermark Brand Besar Gradasi Bergerak di Bawah Panel */}
            <div className="pt-3 border-t border-white/10 text-center select-none">
              <div className="text-3xl font-extrabold tracking-[0.2em] uppercase animate-gradient-text opacity-80">
                TERRACROP
              </div>
              <div className="text-[10px] text-zinc-600 mt-1">
                © 2026 TerraCrop. NASA Space Apps Challenge.
              </div>
            </div>
          </div>
        </aside>

        {/* =========================================================
            PANEL KANAN: PETA LEAFLET + OVERLAY TELEMETRI HITAM PEKAT
           ========================================================= */}
        <main className="flex-1 relative bg-[#050505]">
          <MapComponent
            selectedCity={currentCity}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            activeBasemap={activeBasemap}
            selectedSawah={selectedSawah}
            onSelectSawah={(sawah) => setSelectedSawah(sawah)}
            mlRunCount={mlRunCount}
          />

          {/* Basemap Switcher Hitam Pekat */}
          <div className="absolute bottom-6 left-4 z-[1000]">
            <div className="relative">
              <button
                onClick={() => setShowLayerMenu(!showLayerMenu)}
                className="bg-[#050505]/95 hover:bg-[#111114] text-white px-4 py-2 rounded-lg shadow-2xl border border-white/15 flex items-center gap-2 text-xs font-semibold cursor-pointer transition-colors"
              >
                <Layers className="w-4 h-4 text-pink-400" />
                <span>Basemap: {activeBasemap.toUpperCase()}</span>
              </button>

              {showLayerMenu && (
                <div className="absolute bottom-11 left-0 w-52 bg-[#0a0a0c] border border-white/15 rounded-lg shadow-2xl p-1.5 space-y-1">
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

          {/* FLOATING TELEMETRY CARD SAWAH TERPILIH (HITAM PEKAT) */}
          {selectedSawah ? (
            <div className="absolute top-4 right-4 z-[1000] w-80 sm:w-[400px] bg-[#070709]/95 backdrop-blur-md border border-white/15 rounded-xl shadow-2xl overflow-hidden">
              <div className="px-4 py-3.5 bg-[#0d0d10] border-b border-white/10 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-pink-400">
                    <MapPin className="w-3 h-3" />
                    <span>Telemetry & Hidrologi Lahan</span>
                  </div>
                  <h3 className="font-serif text-base font-bold text-white mt-0.5">
                    {selectedSawah.namaBlok}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedSawah(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3 text-xs max-h-[calc(100vh-120px)] overflow-y-auto">
                {/* Status Fase Tanam */}
                <div className="flex items-center justify-between bg-[#0e0e11] px-3 py-2.5 rounded-lg border border-white/10">
                  <span className="text-zinc-400">Kategori Prediksi:</span>
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
                      ? "Non-Tanam (Abu-abu)"
                      : `Masa Tanam ${selectedSawah.faseTanam}`}
                  </span>
                </div>

                {/* Parameter Jarak Bendungan & Karakteristik Tanah */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-lg bg-[#0d0d10] border border-white/10">
                    <div className="flex items-center gap-1.5 text-sky-400 text-[10px] uppercase font-medium">
                      <Waves className="w-3.5 h-3.5" />
                      <span>Jarak ke Dam</span>
                    </div>
                    <div className="text-sm font-mono font-bold text-white mt-1">
                      {selectedSawah.jarakBendunganKm} km
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">
                      Irigasi {selectedSawah.saluranIrigasi}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#0d0d10] border border-white/10">
                    <div className="flex items-center gap-1.5 text-amber-400 text-[10px] uppercase font-medium">
                      <Mountain className="w-3.5 h-3.5" />
                      <span>Karakter Tanah</span>
                    </div>
                    <div className="text-sm font-bold text-white mt-1">
                      {selectedSawah.jenisTanah}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                      pH {selectedSawah.phTanah} • {selectedSawah.elevasiMdpl} mdpl
                    </div>
                  </div>
                </div>

                {/* Grid Parameter Satelit NASA */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-[#0c0c0e] border border-white/10">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase">
                      <Droplets className="w-3.5 h-3.5 text-sky-400" />
                      <span>Kelembapan Tanah</span>
                    </div>
                    <div className="text-base font-mono font-bold text-white mt-1">
                      {selectedSawah.kelembapanAktual}%
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0c0c0e] border border-white/10">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase">
                      <CloudRain className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Curah Hujan</span>
                    </div>
                    <div className="text-base font-mono font-bold text-white mt-1">
                      {selectedSawah.curahHujanAktual}{" "}
                      <span className="text-[10px] font-normal text-zinc-400">mm</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0c0c0e] border border-white/10">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase">
                      <Sprout className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Indeks NDVI</span>
                    </div>
                    <div className="text-base font-mono font-bold text-white mt-1">
                      {selectedSawah.ndviAktual}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#0c0c0e] border border-white/10">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] uppercase">
                      <Thermometer className="w-3.5 h-3.5 text-pink-400" />
                      <span>Suhu Permukaan</span>
                    </div>
                    <div className="text-base font-mono font-bold text-white mt-1">
                      {selectedSawah.suhuAktual}°C
                    </div>
                  </div>
                </div>

                {/* Rekomendasi Komoditas & Alasan Agronomi */}
                <div className="p-3.5 rounded-lg bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-transparent border border-pink-500/30 space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-pink-400">
                    Rekomendasi Komoditas Optimal
                  </div>
                  <div className="text-sm font-bold text-white">
                    {selectedSawah.rekomendasiTanaman}
                  </div>
                  <p className="text-[11px] text-zinc-300 leading-relaxed">
                    {selectedSawah.alasanAgronomi}
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] text-zinc-400 font-mono">
                    <span>Luas: {selectedSawah.luasHa} Ha</span>
                    <span>Kesuburan: {selectedSawah.indeksKesuburan}/100</span>
                    <span>Conf: {selectedSawah.confidence}%</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="absolute top-4 right-4 z-[1000] bg-[#050505]/90 backdrop-blur-md border border-white/15 px-4 py-2.5 rounded-lg shadow-2xl text-xs text-zinc-300 max-w-xs pointer-events-none">
              Klik pada <span className="text-white font-semibold">poligon sawah</span> untuk
              melihat jarak ke bendungan, jenis tanah, kelembapan, & rekomendasi tanam.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}