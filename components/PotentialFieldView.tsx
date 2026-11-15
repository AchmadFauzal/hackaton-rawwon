// src/components/PotentialFieldView.tsx
"use client";

import { useState, useMemo, useEffect, useRef, type RefObject } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Pane,
  Marker,
  CircleMarker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { Globe } from "lucide-react";
import {
  buildPotentialNewFields,
  getAverageContourElevation,
  getContourFeatures,
  getVisibleContourFeatures,
  getPropFlexible,
  haversineKm,
  normalizeKabName,
  analyzePolygonGeometry,
  enrichSawahWithReservoirs,
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

function getPathElement(layer: L.Layer): SVGElement | null {
  const getElement = (layer as L.Path).getElement;
  return typeof getElement === "function"
    ? (getElement.call(layer) as SVGElement | null)
    : null;
}

function disablePathPointerEvents(layer: L.Layer) {
  const apply = () => {
    getPathElement(layer)?.style.setProperty(
      "pointer-events",
      "none"
    );
  };
  apply();
  layer.on("add", apply);
}

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

function MapSizeInvalidator({
  containerRef,
  resizeKey,
}: {
  containerRef: RefObject<HTMLDivElement | null>;
  resizeKey: string;
}) {
  const map = useMap();

  useEffect(() => {
    const invalidate = () => map.invalidateSize();
    const timeoutIds = [100, 400, 1000].map((delay) =>
      window.setTimeout(invalidate, delay)
    );
    const container = containerRef.current;
    const observer =
      typeof ResizeObserver !== "undefined" && container
        ? new ResizeObserver(invalidate)
        : null;
    observer?.observe(container as HTMLDivElement);
    window.addEventListener("resize", invalidate);
    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      observer?.disconnect();
      window.removeEventListener("resize", invalidate);
    };
  }, [containerRef, map, resizeKey]);

  return null;
}

function PotentialZonePopup({
  field,
  position,
  waterSource,
  lang,
  onRemove,
}: {
  field: PotentialNewFieldPrediction;
  position: [number, number];
  waterSource: NearestReservoir | null | undefined;
  lang: "en" | "id";
  onRemove: () => void;
}) {
  const map = useMap();
  const popupRef = useRef<L.Popup | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const popup = popupRef.current;
      if (popup && !map.hasLayer(popup)) {
        popup.openOn(map);
      }
    }, 50);

    return () => window.clearTimeout(timeoutId);
  }, [field.id, map, position]);

  return (
    <Popup
      ref={popupRef}
      key={`potential-popup-${field.id}`}
      position={position}
      pane="popupPane"
      maxWidth={320}
      autoPan={true}
      closeButton={true}
      closeOnClick={false}
      eventHandlers={{
        remove: onRemove,
      }}
    >
      {renderPotentialZonePopup(field, waterSource, lang)}
    </Popup>
  );
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
  const [allExistingSawah, setAllExistingSawah] = useState<
    ComputedSawahPrediction[]
  >([]);
  const [hasUserSelectedKabupaten, setHasUserSelectedKabupaten] = useState(false);
  const [selectedPotential, setSelectedPotential] =
    useState<PotentialNewFieldPrediction | null>(null);
  const [popupLatLng, setPopupLatLng] = useState<[number, number] | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );
  const damIcon = useMemo(() => createDamBadgeIcon(), []);
  const embungIcon = useMemo(() => createEmbungBadgeIcon(), []);
  const canvasRenderer = useMemo(() => L.canvas({ padding: 0.3 }), []);
  const contourRenderer = useMemo(
    () => L.canvas({ padding: 0.3, pane: "contour-pane" }),
    []
  );
  const potentialKabupatenList = useMemo(() => {
    const features = Array.isArray(batasKabGeoJson?.features)
      ? batasKabGeoJson.features
      : [];
    const allKabupaten = features
      .map((feature: any, index: number) => {
        const properties = feature.properties || {};
        const nama = getPropFlexible(properties, [
          "WADMKK",
          "KAB_KOTA",
          "KABUPATEN",
          "NAMOBJ",
          "NAME_2",
          "kota_kab",
        ]);
        if (!nama || !feature.geometry) return null;
        const { centroid, bounds } = analyzePolygonGeometry(feature.geometry);
        return {
          id: `potential-kab-${index}-${nama}`,
          nama,
          provinsi: getPropFlexible(
            properties,
            ["WADMPR", "PROVINSI", "NAME_1", "propinsi"],
            "Jawa"
          ),
          center: centroid,
          bounds,
          geometry: feature.geometry,
        };
      })
      .filter(Boolean) as KabupatenOption[];
    return allKabupaten.length > 0 ? allKabupaten : kabupatenList;
  }, [batasKabGeoJson, kabupatenList]);

  useEffect(() => {
    const updateViewport = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetch("/data/sawah_existing.geojson")
      .then((response) => {
        if (!response.ok) throw new Error("Gagal memuat sawah existing Jawa.");
        return response.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const enriched = enrichSawahWithReservoirs(
          data,
          reservoirs,
          "Jawa"
        );
        const template = sawahList[0];
        if (!template) return;
        setAllExistingSawah(
          enriched.map((sawah) => ({
            ...template,
            ...sawah,
            id: sawah.id,
            namaBlok: sawah.namaBlok,
            kabupaten: sawah.kabupaten,
            provinsi: sawah.provinsi,
            luasHa: sawah.luasHa,
            centroid: sawah.centroid,
            geometry: sawah.geometry,
            properties: sawah.properties,
            potensiPerluasanHa: 0,
          }))
        );
      })
      .catch((error) => {
        console.error("Error loading all existing paddy fields:", error);
      });

    return () => {
      isMounted = false;
    };
  }, [reservoirs, sawahList]);

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
    if (selectedKabId === "ALL" && !hasUserSelectedKabupaten) return "ALL";
    return selectedKabId;
  }, [
    hasUserSelectedKabupaten,
    selectedKabId,
  ]);

  const selectedKab = useMemo(
    () => potentialKabupatenList.find((k) => k.id === effectiveSelectedKabId) || null,
    [potentialKabupatenList, effectiveSelectedKabId]
  );

  // Filter sawah & reservoir berdasarkan Kabupaten terpilih
  const filteredSawah = useMemo(() => {
    const sourceSawah = allExistingSawah.length > 0 ? allExistingSawah : sawahList;
    if (!selectedKab) return sourceSawah;
    const target = selectedKab.nama.toUpperCase().replace(/^KABUPATEN\s+|^KOTA\s+/i, "");
    const matched = sourceSawah.filter((s) =>
      s.kabupaten.toUpperCase().includes(target)
    );
    // Fallback bounding box jika nama kabupaten berbeda format
    if (matched.length > 0) return matched;
    const [[minLat, minLng], [maxLat, maxLng]] = selectedKab.bounds;
    return sourceSawah.filter(
      (s) =>
        s.centroid[0] >= minLat - 0.1 &&
        s.centroid[0] <= maxLat + 0.1 &&
        s.centroid[1] >= minLng - 0.1 &&
        s.centroid[1] <= maxLng + 0.1
    );
  }, [allExistingSawah, sawahList, selectedKab]);

  const filteredReservoirs = useMemo(() => {
    if (!selectedKab) {
      // Tampilkan titik di Pulau Jawa agar ringan
      return reservoirs.filter((r) => {
        const [lng, lat] = r.geometry?.coordinates || [];
        return lat >= -9 && lat <= -5.5 && lng >= 105 && lng <= 115;
      });
    }
    return reservoirs.filter((r) => {
      const [lng, lat] = r.geometry?.coordinates || [];
      const [[minLat, minLng], [maxLat, maxLng]] = selectedKab.bounds;
      const centerLat = (minLat + maxLat) / 2;
      const centerLng = (minLng + maxLng) / 2;
      return (
        typeof lat === "number" &&
        typeof lng === "number" &&
        haversineKm(centerLat, centerLng, lat, lng) <= 35
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
  const filteredContourFeatures = useMemo(
    () =>
      getContourFeatures(
        konturGeoJson,
        selectedKab?.nama || "all"
      ),
    [konturGeoJson, selectedKab]
  );
  const selectedKabupaten = selectedKab?.nama || "ALL";
  const filteredContours = useMemo(
    () =>
      getVisibleContourFeatures(
        konturGeoJson,
        selectedKabupaten,
        1200
      ),
    [konturGeoJson, selectedKabupaten]
  );
  const renderedKonturGeoJson = useMemo(() => {
    if (!konturGeoJson) return null;
    return {
      ...konturGeoJson,
      features: filteredContours,
    };
  }, [konturGeoJson, filteredContours]);
  const renderedSawah = useMemo(() => {
    if (!isMobile || selectedKab || filteredSawah.length <= 400) {
      return filteredSawah;
    }
    return [...filteredSawah]
      .sort((a, b) => b.luasHa - a.luasHa || b.potensiPerluasanHa - a.potensiPerluasanHa)
      .slice(0, 400);
  }, [filteredSawah, isMobile, selectedKab]);
  const renderedPotentialFields = useMemo(() => {
    if (!isMobile || selectedKab || filteredPotentialFields.length <= 400) {
      return filteredPotentialFields;
    }
    return filteredPotentialFields.slice(0, 400);
  }, [filteredPotentialFields, isMobile, selectedKab]);
  const potentialFeatureCollection = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: renderedPotentialFields.map((field) => ({
        type: "Feature" as const,
        id: field.id,
        geometry: field.geometry,
        properties: {
          ...field.properties,
          potentialId: field.id,
        },
      })),
    }),
    [renderedPotentialFields]
  );
  const potentialFieldLookup = useMemo(() => {
    const lookup = new Map<string, PotentialNewFieldPrediction>();
    renderedPotentialFields.forEach((field) => lookup.set(field.id, field));
    return lookup;
  }, [renderedPotentialFields]);
  const renderedReservoirs = useMemo(() => {
    if (!isMobile || selectedKab || filteredReservoirs.length <= 100) {
      return filteredReservoirs;
    }
    return filteredReservoirs.slice(0, 100);
  }, [filteredReservoirs, isMobile, selectedKab]);
  const useCanvasReservoirs = selectedKabId === "ALL";
  const activePotential = selectedPotential
    ? filteredPotentialFields.find((field) => field.id === selectedPotential.id) || null
    : null;

  const potentialWaterSources = useMemo(() => {
    const lookup = new Map<string, NearestReservoir | null>();
    renderedPotentialFields.forEach((field) => {
      lookup.set(field.id, findNearestReservoir(field.centroid, filteredReservoirs));
    });
    return lookup;
  }, [renderedPotentialFields, filteredReservoirs]);

  // Statistik Keterangan Luas Sawah Potensial di Kab. tersebut (sesuai wireframe kiri)
  const stats = useMemo(() => {
    const totalEksistingHa = filteredSawah.reduce((acc, s) => acc + s.luasHa, 0);
    const avgElevasi = getAverageContourElevation(filteredContourFeatures) ?? 0;
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
    filteredContourFeatures,
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

  const scrollToMap = () => {
    if (window.matchMedia("(max-width: 1023px)").matches) {
      mapContainerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  };

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
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 lg:overflow-hidden p-3 sm:p-4 lg:p-5 gap-4">
        {/* ============================================================
            KOLOM KIRI (Sesuai kotak atas & kotak tengah di wireframe)
           ============================================================ */}
        <aside className="w-full lg:w-[370px] xl:w-[400px] rounded-xl border border-white/10 bg-[#07070a] p-4 flex flex-col gap-4 lg:overflow-y-auto shrink-0">
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
                window.setTimeout(scrollToMap, 0);
              }}
              className="w-full bg-[#0d0d12] border border-white/20 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-pink-500"
            >
              <option value="ALL">
                {lang === "en"
                  ? "All Potential Districts (Semua Wilayah Potensial)"
                  : "All Potential Districts (Semua Wilayah Potensial)"}
              </option>
              {potentialKabupatenList.map((kab) => (
                <option key={kab.id} value={kab.id}>
                  {kab.nama} ({kab.provinsi}) •{" "}
                  {potentialSummaryByKabupaten.get(normalizeKabName(kab.nama))
                    ?.candidate_zones || 0}{" "}
                  zones
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={scrollToMap}
              className="w-full rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 text-[11px] font-mono font-bold text-cyan-200 lg:hidden"
            >
              {lang === "en" ? "View Spatial Map" : "Lihat Peta Spasial"}
            </button>
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
                onClick={() => {
                  setSelectedPotential(field);
                  setPopupLatLng(field.centroid);
                  window.setTimeout(scrollToMap, 0);
                }}
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
        <main
          ref={mapContainerRef}
          className="relative z-10 w-full h-[420px] min-h-[420px] shrink-0 rounded-xl overflow-hidden border border-white/10 bg-[#050505] lg:h-full lg:flex-1"
        >
          <MapContainer
            center={[-7.15, 110.14]}
            zoom={8}
            className="w-full h-full min-h-[420px] z-0"
            style={{ height: "100%", width: "100%", minHeight: "420px" }}
            zoomControl={false}
            preferCanvas={true}
          >
            <MapSizeInvalidator
              containerRef={mapContainerRef}
              resizeKey={effectiveSelectedKabId}
            />
            <CameraBoundsUpdater
              selectedKab={selectedKab}
              selectedPotential={activePotential}
              potentialFields={renderedPotentialFields}
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
                interactive={false}
                onEachFeature={(_feature, layer) => disablePathPointerEvents(layer)}
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
                    renderer: canvasRenderer,
                  };
                }}
              />
            )}

            {/* 2. LAYER GARIS KONTUR SRTM */}
            {layers.kontur && renderedKonturGeoJson && filteredContours.length > 0 && (
              <Pane
                name="contour-pane"
                style={{ zIndex: 480, pointerEvents: "none" }}
              >
                <GeoJSON
                  key={`contour-${selectedKabupaten}-${filteredContours.length}`}
                  data={renderedKonturGeoJson}
                  interactive={false}
                  onEachFeature={(_feature, layer) => disablePathPointerEvents(layer)}
                  style={(feature) => {
                    const elevation = Number(
                      getPropFlexible(feature?.properties || {}, [
                        "ELEV",
                        "KONTUR",
                      ])
                    );
                    const isIndexContour =
                      Number.isFinite(elevation) && elevation % 100 === 0;
                    return {
                      color: isIndexContour ? "#fbbf24" : "#f59e0b",
                      weight: isIndexContour ? 1.5 : 1,
                      opacity: isIndexContour ? 0.85 : 0.65,
                      renderer: contourRenderer,
                    };
                  }}
                />
              </Pane>
            )}

            {/* 3 & 4. LAYER SAWAH EKSISTING + LC NILAI PIXEL */}
            {(layers.sawahEksisting || layers.lcPixel) &&
              renderedSawah.map((sawah) => {
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
                      renderer: canvasRenderer,
                    }}
                    interactive={false}
                    onEachFeature={(_feature, layer) => disablePathPointerEvents(layer)}
                  >
                    <Popup pane="popupPane" className="terracorp-dark-popup">
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
            {layers.potentialNew && potentialFeatureCollection.features.length > 0 && (
              <Pane name="potential-fields-pane" style={{ zIndex: 800 }}>
                <GeoJSON
                  key={`potential-layer-${potentialFeatureCollection.features.length}-${activePotential?.id || "none"}`}
                  data={potentialFeatureCollection as any}
                  pane="potential-fields-pane"
                  style={(feature) => {
                    const potentialId = feature?.properties?.potentialId;
                    const isSelected = activePotential?.id === potentialId;
                    return {
                      fillColor: "#06b6d4",
                      fillOpacity: isSelected ? 0.72 : 0.55,
                      color: isSelected ? "#ffffff" : "#22d3ee",
                      weight: isSelected ? 3 : 2.5,
                      dashArray: "6 4",
                    };
                  }}
                  onEachFeature={(feature, layer) => {
                    const field = potentialFieldLookup.get(
                      feature?.properties?.potentialId
                    );
                    if (!field) return;

                    const pathLayer = layer as L.Path;
                    layer.on({
                      mouseover: () => {
                        pathLayer.bringToFront();
                        pathLayer.setStyle({ weight: 3 });
                        getPathElement(pathLayer)?.style.setProperty(
                          "cursor",
                          "pointer"
                        );
                      },
                      mouseout: () => {
                        pathLayer.setStyle({
                          weight: activePotential?.id === field.id ? 3 : 2.5,
                        });
                        getPathElement(pathLayer)?.style.setProperty(
                          "cursor",
                          "default"
                        );
                      },
                      click: (event: L.LeafletMouseEvent) => {
                        L.DomEvent.stopPropagation(event);
                        setSelectedPotential(field);
                        setPopupLatLng([event.latlng.lat, event.latlng.lng]);
                      },
                    });
                  }}
                />
              </Pane>
            )}

            {selectedPotentialWaterConnection && (
              <Polyline
                positions={selectedPotentialWaterConnection}
                interactive={false}
                pathOptions={{
                  color: "#67e8f9",
                  weight: 2.5,
                  dashArray: "5 5",
                  opacity: 0.95,
                }}
              />
            )}

            {activePotential && (
              <PotentialZonePopup
                field={activePotential}
                position={popupLatLng || activePotential.centroid}
                waterSource={potentialWaterSources.get(activePotential.id)}
                lang={lang}
                onRemove={() => {
                  setSelectedPotential(null);
                  setPopupLatLng(null);
                }}
              />
            )}

            {/* 6. LAYER BENDUNGAN & EMBUNG (SIGI) */}
            {layers.sigiWater && (
              <Pane name="reservoirs-top-pane" style={{ zIndex: 750 }}>
              {renderedReservoirs.map((feat, idx) => {
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
                const popup = (
                  <Popup pane="popupPane" className="terracorp-dark-popup">
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
                );

                return useCanvasReservoirs ? (
                  <CircleMarker
                    key={`p2-res-${idx}-${lat}-${lng}`}
                    center={[lat, lng]}
                    radius={isDam ? 7 : 6}
                    pathOptions={{
                      color: "#ffffff",
                      weight: 2,
                      fillColor: isDam ? "#3b82f6" : "#059669",
                      fillOpacity: 1,
                    }}
                  >
                    <Tooltip>{nama}</Tooltip>
                    {popup}
                  </CircleMarker>
                ) : (
                  <Marker
                    key={`p2-res-${idx}-${lat}-${lng}`}
                    position={[lat, lng]}
                    icon={isDam ? damIcon : embungIcon}
                  >
                    <Tooltip>{nama}</Tooltip>
                    {popup}
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