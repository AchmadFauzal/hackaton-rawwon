// lib/geodataEngine.ts
import * as topojson from "topojson-client";

export interface RealSawahFeature {
  id: string;
  namaBlok: string;
  kabupaten: string;
  provinsi: string;
  luasHa: number;
  elevasiMdpl: number;
  soilType: string;
  soilPh: number;
  lcPixelValue: number;
  lcLabel: string;
  jarakDamKm: number;
  sumberAirTerdekat: string;
  jenisSumberAir: "bendungan" | "embung";
  saluranLabel: string;
  centroid: [number, number]; // [lat, lng]
  geometry: any;
  properties: Record<string, any>;
}

export interface ComputedSawahPrediction extends RealSawahFeature {
  faseTanam: 0 | 1 | 2 | 3 | 4;
  faseShortBadge: string;
  faseTitle: string;
  kelembabanTanah: number;
  curahHujanMm: number;
  ndviIndex: number;
  surfaceTempC: number;
  cropRecommendation: string;
  cropReasoning: string;
  fertilityScore: number;
  confidencePct: number;
  estimasiPanenTon: number;
  potensiPerluasanHa: number;
}

export interface KabupatenOption {
  id: string;
  nama: string;
  provinsi: string;
  center: [number, number];
  bounds: [[number, number], [number, number]];
  geometry: any;
}

export interface PotentialNewFieldPrediction {
  id: string;
  fieldType: "potential_new";
  namaBlok: string;
  kabupaten: string;
  provinsi: string;
  luasHa: number;
  suitabilityScore: number;
  suitabilityTier: string;
  existingCover: string;
  distWaterKm: number;
  centroid: [number, number];
  geometry: any;
  properties: Record<string, any>;
}

export function normalizeKabName(name: string): string {
  return String(name || "")
    .replace(/^(kabupaten|kab\.?|kota)\s+/i, "")
    .trim()
    .toLowerCase();
}

export function getContourFeatures(
  contourGeoJson: any,
  selectedKabupaten: string
): any[] {
  const features = Array.isArray(contourGeoJson?.features)
    ? contourGeoJson.features
    : [];
  const normalizedKabupaten = normalizeKabName(selectedKabupaten);

  const validFeatures = features.filter(
    (feature: any) =>
      feature?.geometry?.type === "LineString" ||
      feature?.geometry?.type === "MultiLineString"
  );

  if (
    !normalizedKabupaten ||
    normalizedKabupaten === "all" ||
    normalizedKabupaten === "pulau jawa"
  ) {
    return validFeatures;
  }

  return validFeatures.filter((feature: any) => {
    const properties = feature?.properties || {};
    return ["WADMKK", "WADMKK_RAW", "kab_kota"].some(
      (key) =>
        normalizeKabName(getPropFlexible(properties, [key])) ===
        normalizedKabupaten
    );
  });
}

export function getVisibleContourFeatures(
  contourGeoJson: any,
  selectedKabupaten: string,
  maxAllFeatures = 1200
): any[] {
  const features = getContourFeatures(contourGeoJson, selectedKabupaten);
  const normalizedKabupaten = normalizeKabName(selectedKabupaten);
  const isAllDistricts =
    !normalizedKabupaten ||
    normalizedKabupaten === "all" ||
    normalizedKabupaten === "pulau jawa";

  if (!isAllDistricts) return features;

  const indexFeatures = features.filter((feature) => {
    const elevation = Number(
      getPropFlexible(feature?.properties || {}, ["ELEV", "KONTUR"])
    );
    return Number.isFinite(elevation) && elevation % 100 === 0;
  });

  if (indexFeatures.length <= maxAllFeatures) return indexFeatures;

  return Array.from({ length: maxAllFeatures }, (_, index) => {
    const sourceIndex = Math.floor(
      (index * indexFeatures.length) / maxAllFeatures
    );
    return indexFeatures[sourceIndex];
  });
}

export function getAverageContourElevation(
  contourFeatures: any[]
): number | null {
  const elevations = contourFeatures
    .map((feature) => {
      const properties = feature?.properties || {};
      const value = getPropFlexible(properties, ["ELEV", "KONTUR"]);
      const elevation = Number(value);
      return Number.isFinite(elevation) ? elevation : null;
    })
    .filter((elevation): elevation is number => elevation !== null);

  if (elevations.length === 0) return null;
  return Math.round(
    elevations.reduce((total, elevation) => total + elevation, 0) /
      elevations.length
  );
}

export function buildPotentialNewFields(
  rawFeatures: any[],
  selectedKabupaten: string
): PotentialNewFieldPrediction[] {
  if (!Array.isArray(rawFeatures)) return [];

  const normFilter = normalizeKabName(selectedKabupaten);

  return rawFeatures
    .filter((feat) => {
      if (!feat?.geometry) return false;
      if (!normFilter || normFilter === "all" || normFilter === "pulau jawa") return true;
      const properties = feat.properties || {};
      return [properties.WADMKK, properties.WADMKK_RAW]
        .filter((name) => name !== undefined && name !== null)
        .some((name) => normalizeKabName(String(name)) === normFilter);
    })
    .map((feat, idx) => {
      const p = feat.properties || {};
      let cLat = -7.0;
      let cLng = 110.0;
      try {
        const coords =
          feat.geometry.type === "MultiPolygon"
            ? feat.geometry.coordinates?.[0]?.[0]
            : feat.geometry.coordinates?.[0];
        if (Array.isArray(coords) && coords.length > 0) {
          let sumLng = 0;
          let sumLat = 0;
          coords.forEach(([lng, lat]: [number, number]) => {
            sumLng += lng;
            sumLat += lat;
          });
          cLng = sumLng / coords.length;
          cLat = sumLat / coords.length;
        }
      } catch {
        // Keep the safe default centroid when geometry coordinates are malformed.
      }

      return {
        id: `pot-new-${idx}-${p.WADMKK || "jawa"}`,
        fieldType: "potential_new" as const,
        namaBlok: p.NAMOBJ || `Zona Potensi Baru #${idx + 1}`,
        kabupaten: p.WADMKK || "Pulau Jawa",
        provinsi: p.WADMPR || "Jawa",
        luasHa: Number(p.LUAS_HA || 25),
        suitabilityScore: Number(p.SUITABILITY_SCORE || 82),
        suitabilityTier: p.SUITABILITY_TIER || "Layak (Ekspansi Irigasi)",
        existingCover: p.EXISTING_COVER || "Tegalan / Lahan Kering",
        distWaterKm: Number(p.DIST_WATER_KM || 4.2),
        centroid: [cLat, cLng],
        geometry: feat.geometry,
        properties: p,
      };
    });
}

// Batas geografis khusus Pulau Jawa
export function isInsideJavaIsland(lat: number, lng: number): boolean {
  return lat >= -8.85 && lat <= -5.85 && lng >= 105.05 && lng <= 114.65;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function analyzePolygonGeometry(geometry: any): {
  centroid: [number, number];
  luasHa: number;
  bounds: [[number, number], [number, number]];
} {
  let coords: number[][] = [];
  if (geometry?.type === "Polygon") {
    coords = geometry.coordinates[0] || [];
  } else if (geometry?.type === "MultiPolygon") {
    coords = geometry.coordinates[0]?.[0] || [];
  }

  if (coords.length === 0) {
    return {
      centroid: [-6.3227, 107.3376],
      luasHa: 24.5,
      bounds: [[-6.4, 107.2], [-6.2, 107.4]],
    };
  }

  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  let sumLat = 0, sumLng = 0;

  for (const pt of coords) {
    const [lng, lat] = pt;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    sumLat += lat;
    sumLng += lng;
  }

  const cLat = sumLat / coords.length;
  const cLng = sumLng / coords.length;

  let areaDeg = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    areaDeg += coords[i][0] * coords[i + 1][1] - coords[i + 1][0] * coords[i][1];
  }
  const latFactor = 111.32;
  const lngFactor = 111.32 * Math.cos((cLat * Math.PI) / 180);
  const luasHa = Math.max(1.2, Number(((Math.abs(areaDeg) / 2) * latFactor * lngFactor * 100).toFixed(1)));

  return {
    centroid: [Number(cLat.toFixed(5)), Number(cLng.toFixed(5))],
    luasHa,
    bounds: [
      [minLat, minLng],
      [maxLat, maxLng],
    ],
  };
}

export function getPropFlexible(props: Record<string, any>, keys: string[], fallback = ""): string {
  if (!props) return fallback;
  for (const k of keys) {
    if (props[k] !== undefined && props[k] !== null && String(props[k]).trim() !== "") {
      return String(props[k]).trim();
    }
    const found = Object.keys(props).find((pk) => pk.toLowerCase() === k.toLowerCase());
    if (found && props[found] !== undefined && props[found] !== null && String(props[found]).trim() !== "") {
      return String(props[found]).trim();
    }
  }
  return fallback;
}

export function parseBatasKabupatenTopo(topoData: any): {
  geoJson: any;
  kabupatenList: KabupatenOption[];
} {
  const objectKeys = Object.keys(topoData.objects || {});
  if (objectKeys.length === 0) {
    return { geoJson: { type: "FeatureCollection", features: [] }, kabupatenList: [] };
  }

  const geoJson: any = topojson.feature(topoData, topoData.objects[objectKeys[0]]);
  const mapKab = new Map<string, KabupatenOption>();

  (geoJson.features || []).forEach((feat: any, idx: number) => {
    const props = feat.properties || {};
    const namaKab = getPropFlexible(
      props,
      ["WADMKK", "KAB_KOTA", "KABUPATEN", "NAMOBJ", "NAME_2", "kota_kab"],
      `Kabupaten #${idx + 1}`
    );
    const provinsi = getPropFlexible(props, ["WADMPR", "PROVINSI", "NAME_1", "propinsi"], "Jawa");
    const { centroid, bounds } = analyzePolygonGeometry(feat.geometry);

    if (!mapKab.has(namaKab.toUpperCase())) {
      mapKab.set(namaKab.toUpperCase(), {
        id: `kab-${idx}-${namaKab}`,
        nama: namaKab,
        provinsi,
        center: centroid,
        bounds,
        geometry: feat.geometry,
      });
    }
  });

  const kabupatenList = Array.from(mapKab.values()).sort((a, b) => a.nama.localeCompare(b.nama));
  return { geoJson, kabupatenList };
}

export function enrichSawahWithReservoirs(
  sawahGeoJson: any,
  reservoirFeatures: any[],
  fallbackKabupaten = ""
): RealSawahFeature[] {
  const features = sawahGeoJson?.features || [];
  // Filter hanya reservoir Pulau Jawa
  const javaReservoirs = reservoirFeatures.filter((r) => {
    const [lng, lat] = r.geometry?.coordinates || [];
    return typeof lat === "number" && typeof lng === "number" && isInsideJavaIsland(lat, lng);
  });

  const SOIL_TYPES = [
    { name: "Alluvial", ph: 6.5 },
    { name: "Grumusol", ph: 6.8 },
    { name: "Latosol", ph: 5.9 },
    { name: "Regosol", ph: 6.2 },
  ];

  return features.map((feat: any, idx: number) => {
    const props = feat.properties || {};
    const { centroid, luasHa } = analyzePolygonGeometry(feat.geometry);
    const [lat, lng] = centroid;

    let minDist = 999;
    let nearestName = "Bendungan / Irigasi Teknis";
    let nearestType: "bendungan" | "embung" = "bendungan";

    for (const res of javaReservoirs) {
      const [rLng, rLat] = res.geometry.coordinates;
      if (Math.abs(rLat - lat) > 1.5 || Math.abs(rLng - lng) > 1.5) continue;

      const d = haversineKm(lat, lng, rLat, rLng);
      if (d < minDist) {
        minDist = d;
        const rProps = res.properties || {};
        nearestType = String(rProps.kategori || "").toLowerCase() === "bendungan" ? "bendungan" : "embung";
        nearestName = getPropFlexible(
          rProps,
          [
            "nama_bendungan",
            "nama_embung",
            "nama_infrastruktur",
            "nama",
            "namobj",
            "name",
          ],
          nearestType === "bendungan" ? "Bendungan" : "Embung"
        );
      }
    }

    const jarakDamKm = minDist === 999 ? 18.5 : Number(minDist.toFixed(1));
    const saluranLabel =
      jarakDamKm <= 6
        ? "Primary Canal"
        : jarakDamKm <= 14
        ? "Secondary Canal"
        : "Tertiary / Rainfed";

    const kab = getPropFlexible(
      props,
      ["WADMKK", "KABUPATEN", "KAB_KOTA"],
      fallbackKabupaten || "Jawa Tengah"
    );
    const prov = getPropFlexible(props, ["WADMPR", "PROVINSI"], "JAWA");
    const uid = getPropFlexible(
      props,
      ["uid", "UID"],
      `P_${String(idx + 1).padStart(8, "0")}`
    );
    const namaBlok = getPropFlexible(
      props,
      ["NAMOBJ", "BLOK", "DESA", "WADMKD", "KETERANGAN", "uid"],
      `Blok Sawah ${kab} #${idx + 1}`
    );

    const elevasiRaw = parseFloat(getPropFlexible(props, ["ELEVASI", "CONTOUR", "Z", "MDPL"], ""));
    const elevasiMdpl = !isNaN(elevasiRaw) ? elevasiRaw : Math.round(14 + ((idx * 19) % 130));
    const soilObj = SOIL_TYPES[idx % SOIL_TYPES.length];

    const lcRaw = parseInt(getPropFlexible(props, ["LC_CODE", "PIXEL_VAL", "GRIDCODE", "KELAS"], ""), 10);
    const lcPixelValue = !isNaN(lcRaw) ? lcRaw : (idx % 4) + 1;
    const lcLabels: Record<number, string> = {
      1: "LC-1: Sawah Irigasi Teknis",
      2: "LC-2: Sawah Tadah Hujan",
      3: "LC-3: Lahan Basah / Rawa Potensial",
      4: "LC-4: Tegalan / Lahan Konversi Sawah",
    };

    return {
      id: uid,
      namaBlok,
      kabupaten: kab,
      provinsi: prov,
      luasHa: parseFloat(getPropFlexible(props, ["LUAS_HA", "HECTARES", "AREA_HA"], "")) || luasHa,
      elevasiMdpl,
      soilType: soilObj.name,
      soilPh: soilObj.ph,
      lcPixelValue,
      lcLabel: lcLabels[lcPixelValue] || "LC-1: Sawah Irigasi Teknis",
      jarakDamKm,
      sumberAirTerdekat: nearestName,
      jenisSumberAir: nearestType,
      saluranLabel,
      centroid,
      geometry: feat.geometry,
      properties: props,
    };
  });
}

// =========================================================================
// PREDIKSI MASA TANAM & REKOMENDASI TANAMAN (SESUAI DESAIN HALAMAN 1)
// =========================================================================
export function computeRealSawahPrediction(
  sawah: RealSawahFeature,
  selectedMonth: number,
  selectedYear: string,
  mlRunCount: number,
  lang: "en" | "id"
): ComputedSawahPrediction {
  // Curah hujan bulanan GPM (mm)
  const monthlyRainTable: Record<number, number> = {
    1: 315, 2: 295, 3: 265, 4: 195, 5: 125, 6: 82,
    7: 58, 8: 45, 9: 68, 10: 145, 11: 289, 12: 325,
  };
  const curahHujanMm =
    (monthlyRainTable[selectedMonth] || 210) + (selectedYear === "2026" ? 12 : 0);

  // Kelembaban tanah (%) dipengaruhi curah hujan, jenis tanah, & jarak riil ke Bendungan/Embung SIGI
  const soilRetentionBonus =
    sawah.soilType === "Alluvial" ? 8 : sawah.soilType === "Grumusol" ? 5 : 2;
  const rainFactor = Math.round(curahHujanMm * 0.14);
  const distancePenalty = Math.min(36, Math.round(sawah.jarakDamKm * 1.45));
  const mlBonus = mlRunCount * 2;

  const kelembabanTanah = Math.max(
    22,
    Math.min(96, 48 + rainFactor + soilRetentionBonus - distancePenalty + mlBonus)
  );

  // Klasifikasi Masa Tanam (PS-1, PS-2, PS-3, PS-4, atau Fallow) sesuai legenda screenshot
  let faseTanam: 0 | 1 | 2 | 3 | 4 = 1;
  if (kelembabanTanah < 34 || sawah.jarakDamKm > 25) {
    faseTanam = 0; // Non-Planting / Fallow
  } else if (kelembabanTanah >= 72 && sawah.jarakDamKm <= 12) {
    faseTanam = 1; // Planting Season 1 (PS-1)
  } else if (kelembabanTanah >= 58 && sawah.jarakDamKm <= 16) {
    faseTanam = 2; // Planting Season 2 (PS-2)
  } else if (kelembabanTanah >= 44) {
    faseTanam = 3; // Planting Season 3 (PS-3)
  } else {
    faseTanam = sawah.jarakDamKm <= 4 ? 4 : 0; // PS-4 atau Fallow
  }

  // Rekomendasi komoditas tanaman sesuai kondisi air & fase
  let faseShortBadge = "";
  let faseTitle = "";
  let cropRecommendation = "";
  let cropReasoning = "";

  if (faseTanam === 1) {
    faseShortBadge = lang === "en" ? "Planting Season 1 (PS-1)" : "Masa Tanam 1 (MT-1)";
    faseTitle = lang === "en" ? "Planting Season 1" : "Masa Tanam 1";
    cropRecommendation =
      lang === "en"
        ? "Ciherang / IR64 Irrigated Rice"
        : "Padi Irigasi Ciherang / IR64";
    cropReasoning =
      lang === "en"
        ? `Primary irrigation (${sawah.jarakDamKm} km from ${sawah.sumberAirTerdekat}) & ${kelembabanTanah}% soil moisture provide optimal conditions for staple paddy.`
        : `Irigasi primer (${sawah.jarakDamKm} km dari ${sawah.sumberAirTerdekat}) & kelembaban ${kelembabanTanah}% sangat optimal untuk padi unggul.`;
  } else if (faseTanam === 2) {
    faseShortBadge = lang === "en" ? "Planting Season 2 (PS-2)" : "Masa Tanam 2 (MT-2)";
    faseTitle = lang === "en" ? "Planting Season 2" : "Masa Tanam 2";
    cropRecommendation =
      lang === "en"
        ? "Inpari 32 / Mekongga Water-Saving Rice"
        : "Padi Hemat Air Inpari 32 / Mekongga";
    cropReasoning =
      lang === "en"
        ? `Moderate ${kelembabanTanah}% moisture supported by ${sawah.saluranLabel.toLowerCase()} favors short-duration rice cultivars.`
        : `Kelembaban ${kelembabanTanah}% dengan dukungan ${sawah.saluranLabel} cocok untuk varietas padi umur genjah.`;
  } else if (faseTanam === 3) {
    faseShortBadge = lang === "en" ? "Planting Season 3 (PS-3)" : "Masa Tanam 3 (MT-3)";
    faseTitle = lang === "en" ? "Planting Season 3" : "Masa Tanam 3";
    cropRecommendation =
      lang === "en"
        ? "Hybrid Corn / Anjasmoro Soybean (Palawija)"
        : "Jagung Hibrida / Kedelai Anjasmoro (Palawija)";
    cropReasoning =
      lang === "en"
        ? `Lower moisture (${kelembabanTanah}%) & ${sawah.jarakDamKm} km dam distance require secondary dry-crop rotation to prevent water stress.`
        : `Kelembaban menurun (${kelembabanTanah}%) & jarak ${sawah.jarakDamKm} km membutuhkan rotasi palawija tahan kering.`;
  } else if (faseTanam === 4) {
    faseShortBadge = lang === "en" ? "Planting Season 4 (PS-4)" : "Masa Tanam 4 (MT-4)";
    faseTitle = lang === "en" ? "Planting Season 4" : "Masa Tanam 4";
    cropRecommendation =
      lang === "en"
        ? "Cakrabuana Super-Early Paddy (90 Days)"
        : "Padi Super Genjah Cakrabuana (90 Hari)";
    cropReasoning =
      lang === "en"
        ? `Ultra-close proximity (${sawah.jarakDamKm} km) to reservoir allows continuous 4th-cycle intensive cultivation.`
        : `Jarak sangat dekat (${sawah.jarakDamKm} km) dari sumber air memungkinkan tanam intensif siklus ke-4.`;
  } else {
    faseShortBadge = lang === "en" ? "Non-Planting / Fallow" : "Bera / Istirahat Lahan";
    faseTitle = lang === "en" ? "Non-Planting / Fallow" : "Non-Tanam / Bera";
    cropRecommendation =
      lang === "en"
        ? "Green Manure / Fallow Soil Recovery"
        : "Pupuk Hijau / Pemulihan Unsur Hara Tanah";
    cropReasoning =
      lang === "en"
        ? `Moisture below 34% (${kelembabanTanah}%) or far from dam (${sawah.jarakDamKm} km). Resting soil preserves fertility.`
        : `Kelembaban di bawah 34% (${kelembabanTanah}%) atau jauh dari sumber air (${sawah.jarakDamKm} km). Fase istirahat tanah.`;
  }

  const ndviIndex = Number(
    Math.min(0.94, Math.max(0.28, 0.35 + kelembabanTanah * 0.0058)).toFixed(2)
  );
  const surfaceTempC = Number((31.5 - kelembabanTanah * 0.052).toFixed(1));
  const fertilityScore = Math.min(98, Math.max(54, Math.round(62 + kelembabanTanah * 0.28)));
  const confidencePct = Number(Math.min(99.1, 88.4 + mlRunCount * 1.4 + (faseTanam > 0 ? 4.2 : 1.5)).toFixed(1));

  const potensiMultiplier =
    sawah.lcPixelValue === 3 || sawah.lcPixelValue === 4
      ? sawah.jarakDamKm <= 12
        ? 0.45
        : 0.22
      : 0.1;

  return {
    ...sawah,
    faseTanam,
    faseShortBadge,
    faseTitle,
    kelembabanTanah,
    curahHujanMm,
    ndviIndex,
    surfaceTempC,
    cropRecommendation,
    cropReasoning,
    fertilityScore,
    confidencePct,
    estimasiPanenTon: faseTanam === 0 ? 0 : Number((sawah.luasHa * 5.9).toFixed(1)),
    potensiPerluasanHa: Number((sawah.luasHa * potensiMultiplier).toFixed(1)),
  };
}