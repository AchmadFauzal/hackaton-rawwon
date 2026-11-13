// src/data/dummySawahData.ts

export interface BendunganInfo {
  nama: string;
  kapasitasJutaM3: number;
  statusDebit: "Normal" | "Siaga" | "Surut";
  coordinates: [number, number];
}

export interface SawahFeature {
  id: string;
  namaBlok: string;
  luasHa: number;
  jenisTanah: "Aluvial" | "Latosol" | "Grumusol" | "Regosol";
  phTanah: number;
  elevasiMdpl: number;
  jarakBendunganKm: number;
  saluranIrigasi: "Primer" | "Sekunder" | "Tadah Hujan";
  kelembapanTanahBase: number;
  ndviBase: number;
  curahHujanBase: number;
  suhuPermukaanBase: number;
  confidence: number;
  coordinates: [number, number][];
}

export interface CityData {
  id: string;
  nama: string;
  provinsi: string;
  maxMasaTanamPerTahun: 3 | 4; // Batas maksimal MT di wilayah ini dalam 1 tahun
  center: [number, number];
  zoom: number;
  bendungan: BendunganInfo;
  lahan: SawahFeature[];
}

export const FULL_INDONESIA_SAWAH_DATA: CityData[] = [
  {
    id: "karawang",
    nama: "Kab. Karawang",
    provinsi: "Jawa Barat",
    maxMasaTanamPerTahun: 4, // Mendukung penuh hingga MT-4
    center: [-6.292, 107.338],
    zoom: 13,
    bendungan: {
      nama: "Bendungan Walahar / Jatiluhur",
      kapasitasJutaM3: 2440,
      statusDebit: "Normal",
      coordinates: [-6.365, 107.358],
    },
    lahan: [
      {
        id: "krw-01",
        namaBlok: "Blok Irigasi Tarum Timur A1",
        luasHa: 148.5,
        jenisTanah: "Aluvial",
        phTanah: 6.5,
        elevasiMdpl: 18,
        jarakBendunganKm: 3.2,
        saluranIrigasi: "Primer",
        kelembapanTanahBase: 84,
        ndviBase: 0.81,
        curahHujanBase: 255,
        suhuPermukaanBase: 27.1,
        confidence: 96.2,
        coordinates: [
          [-6.271, 107.316],
          [-6.269, 107.329],
          [-6.274, 107.337],
          [-6.285, 107.335],
          [-6.286, 107.321],
          [-6.279, 107.315],
        ],
      },
      {
        id: "krw-02",
        namaBlok: "Blok Rengasdengklok Selatan B2",
        luasHa: 112.0,
        jenisTanah: "Aluvial",
        phTanah: 6.3,
        elevasiMdpl: 14,
        jarakBendunganKm: 7.8,
        saluranIrigasi: "Sekunder",
        kelembapanTanahBase: 71,
        ndviBase: 0.69,
        curahHujanBase: 220,
        suhuPermukaanBase: 28.0,
        confidence: 93.4,
        coordinates: [
          [-6.273, 107.340],
          [-6.271, 107.353],
          [-6.278, 107.359],
          [-6.287, 107.354],
          [-6.286, 107.339],
        ],
      },
      {
        id: "krw-03",
        namaBlok: "Blok Telagasari Barat C1",
        luasHa: 129.4,
        jenisTanah: "Latosol",
        phTanah: 6.0,
        elevasiMdpl: 26,
        jarakBendunganKm: 13.5,
        saluranIrigasi: "Sekunder",
        kelembapanTanahBase: 55,
        ndviBase: 0.56,
        curahHujanBase: 175,
        suhuPermukaanBase: 29.2,
        confidence: 91.0,
        coordinates: [
          [-6.289, 107.318],
          [-6.288, 107.336],
          [-6.298, 107.338],
          [-6.304, 107.327],
          [-6.299, 107.316],
        ],
      },
      {
        id: "krw-04",
        namaBlok: "Blok Cilamaya Kulon D4",
        luasHa: 94.2,
        jenisTanah: "Regosol",
        phTanah: 5.7,
        elevasiMdpl: 9,
        jarakBendunganKm: 22.4,
        saluranIrigasi: "Tadah Hujan",
        kelembapanTanahBase: 36,
        ndviBase: 0.32,
        curahHujanBase: 130,
        suhuPermukaanBase: 31.1,
        confidence: 95.8,
        coordinates: [
          [-6.290, 107.341],
          [-6.289, 107.357],
          [-6.299, 107.361],
          [-6.305, 107.350],
          [-6.301, 107.340],
        ],
      },
      {
        id: "krw-05",
        namaBlok: "Blok Lemahabang Tengah E2",
        luasHa: 86.7,
        jenisTanah: "Grumusol",
        phTanah: 6.8,
        elevasiMdpl: 21,
        jarakBendunganKm: 16.2,
        saluranIrigasi: "Sekunder",
        kelembapanTanahBase: 45,
        ndviBase: 0.49,
        curahHujanBase: 165,
        suhuPermukaanBase: 29.8,
        confidence: 89.7,
        coordinates: [
          [-6.305, 107.328],
          [-6.304, 107.343],
          [-6.314, 107.346],
          [-6.316, 107.331],
        ],
      },
    ],
  },
  {
    id: "ngawi",
    nama: "Kab. Ngawi",
    provinsi: "Jawa Timur",
    maxMasaTanamPerTahun: 4, // Mendukung hingga MT-4
    center: [-7.425, 111.435],
    zoom: 13,
    bendungan: {
      nama: "Bendungan Pondok / Sangiran",
      kapasitasJutaM3: 410,
      statusDebit: "Normal",
      coordinates: [-7.385, 111.485],
    },
    lahan: [
      {
        id: "ngw-01",
        namaBlok: "Blok Geneng Bengawan 01",
        luasHa: 174.0,
        jenisTanah: "Aluvial",
        phTanah: 6.6,
        elevasiMdpl: 48,
        jarakBendunganKm: 4.5,
        saluranIrigasi: "Primer",
        kelembapanTanahBase: 85,
        ndviBase: 0.84,
        curahHujanBase: 268,
        suhuPermukaanBase: 26.6,
        confidence: 96.4,
        coordinates: [
          [-7.410, 111.416],
          [-7.409, 111.434],
          [-7.422, 111.437],
          [-7.425, 111.418],
        ],
      },
      {
        id: "ngw-02",
        namaBlok: "Blok Paron Barat 02",
        luasHa: 124.3,
        jenisTanah: "Latosol",
        phTanah: 6.2,
        elevasiMdpl: 56,
        jarakBendunganKm: 9.8,
        saluranIrigasi: "Sekunder",
        kelembapanTanahBase: 70,
        ndviBase: 0.71,
        curahHujanBase: 228,
        suhuPermukaanBase: 27.4,
        confidence: 93.1,
        coordinates: [
          [-7.412, 111.439],
          [-7.411, 111.456],
          [-7.425, 111.455],
          [-7.426, 111.438],
        ],
      },
      {
        id: "ngw-03",
        namaBlok: "Blok Pangkur Timur 03",
        luasHa: 96.7,
        jenisTanah: "Grumusol",
        phTanah: 6.9,
        elevasiMdpl: 62,
        jarakBendunganKm: 15.4,
        saluranIrigasi: "Sekunder",
        kelembapanTanahBase: 50,
        ndviBase: 0.51,
        curahHujanBase: 172,
        suhuPermukaanBase: 28.9,
        confidence: 90.8,
        coordinates: [
          [-7.428, 111.422],
          [-7.427, 111.445],
          [-7.440, 111.444],
          [-7.441, 111.420],
        ],
      },
      {
        id: "ngw-04",
        namaBlok: "Blok Kwadungan Selatan 04",
        luasHa: 82.1,
        jenisTanah: "Regosol",
        phTanah: 5.8,
        elevasiMdpl: 70,
        jarakBendunganKm: 23.1,
        saluranIrigasi: "Tadah Hujan",
        kelembapanTanahBase: 38,
        ndviBase: 0.34,
        curahHujanBase: 122,
        suhuPermukaanBase: 30.8,
        confidence: 95.5,
        coordinates: [
          [-7.429, 111.448],
          [-7.429, 111.462],
          [-7.442, 111.460],
          [-7.441, 111.447],
        ],
      },
    ],
  },
  {
    id: "indramayu",
    nama: "Kab. Indramayu",
    provinsi: "Jawa Barat",
    maxMasaTanamPerTahun: 3, // Mentok di MT-3 (MT-4 otomatis jadi abu-abu)
    center: [-6.365, 108.285],
    zoom: 13,
    bendungan: {
      nama: "Bendung Rentang Cimanuk",
      kapasitasJutaM3: 980,
      statusDebit: "Normal",
      coordinates: [-6.425, 108.235],
    },
    lahan: [
      {
        id: "idm-01",
        namaBlok: "Blok Jatibarang Utara 01",
        luasHa: 184.4,
        jenisTanah: "Aluvial",
        phTanah: 6.6,
        elevasiMdpl: 15,
        jarakBendunganKm: 4.1,
        saluranIrigasi: "Primer",
        kelembapanTanahBase: 81,
        ndviBase: 0.82,
        curahHujanBase: 242,
        suhuPermukaanBase: 27.6,
        confidence: 95.1,
        coordinates: [
          [-6.351, 108.266],
          [-6.349, 108.282],
          [-6.357, 108.288],
          [-6.366, 108.284],
          [-6.365, 108.267],
        ],
      },
      {
        id: "idm-02",
        namaBlok: "Blok Lohbener Timur 02",
        luasHa: 132.0,
        jenisTanah: "Grumusol",
        phTanah: 6.9,
        elevasiMdpl: 12,
        jarakBendunganKm: 15.8,
        saluranIrigasi: "Sekunder",
        kelembapanTanahBase: 47,
        ndviBase: 0.54,
        curahHujanBase: 172,
        suhuPermukaanBase: 29.9,
        confidence: 89.4,
        coordinates: [
          [-6.352, 108.290],
          [-6.351, 108.306],
          [-6.362, 108.309],
          [-6.368, 108.296],
          [-6.365, 108.289],
        ],
      },
      {
        id: "idm-03",
        namaBlok: "Blok Cikedung Selatan 03",
        luasHa: 105.5,
        jenisTanah: "Regosol",
        phTanah: 5.6,
        elevasiMdpl: 28,
        jarakBendunganKm: 24.6,
        saluranIrigasi: "Tadah Hujan",
        kelembapanTanahBase: 39,
        ndviBase: 0.27,
        curahHujanBase: 118,
        suhuPermukaanBase: 31.9,
        confidence: 96.0,
        coordinates: [
          [-6.369, 108.270],
          [-6.368, 108.292],
          [-6.379, 108.296],
          [-6.384, 108.280],
          [-6.378, 108.268],
        ],
      },
      {
        id: "idm-04",
        namaBlok: "Blok Lelea Barat 04",
        luasHa: 141.2,
        jenisTanah: "Aluvial",
        phTanah: 6.4,
        elevasiMdpl: 17,
        jarakBendunganKm: 8.9,
        saluranIrigasi: "Sekunder",
        kelembapanTanahBase: 68,
        ndviBase: 0.67,
        curahHujanBase: 210,
        suhuPermukaanBase: 28.3,
        confidence: 92.2,
        coordinates: [
          [-6.370, 108.297],
          [-6.369, 108.312],
          [-6.381, 108.314],
          [-6.383, 108.299],
        ],
      },
    ],
  },
  {
    id: "demak",
    nama: "Kab. Demak",
    provinsi: "Jawa Tengah",
    maxMasaTanamPerTahun: 3, // Mentok di MT-3
    center: [-6.915, 110.645],
    zoom: 13,
    bendungan: {
      nama: "Bendung Klambu / Kedung Ombo",
      kapasitasJutaM3: 723,
      statusDebit: "Normal",
      coordinates: [-6.985, 110.715],
    },
    lahan: [
      {
        id: "dmk-01",
        namaBlok: "Blok Klambu Kiri Dempet A",
        luasHa: 165.8,
        jenisTanah: "Aluvial",
        phTanah: 6.7,
        elevasiMdpl: 11,
        jarakBendunganKm: 3.8,
        saluranIrigasi: "Primer",
        kelembapanTanahBase: 83,
        ndviBase: 0.80,
        curahHujanBase: 250,
        suhuPermukaanBase: 27.2,
        confidence: 95.3,
        coordinates: [
          [-6.902, 110.628],
          [-6.900, 110.644],
          [-6.912, 110.647],
          [-6.916, 110.631],
        ],
      },
      {
        id: "dmk-02",
        namaBlok: "Blok Wonosalam Tengah B",
        luasHa: 118.4,
        jenisTanah: "Grumusol",
        phTanah: 7.0,
        elevasiMdpl: 14,
        jarakBendunganKm: 14.1,
        saluranIrigasi: "Sekunder",
        kelembapanTanahBase: 45,
        ndviBase: 0.55,
        curahHujanBase: 170,
        suhuPermukaanBase: 29.1,
        confidence: 90.8,
        coordinates: [
          [-6.903, 110.648],
          [-6.902, 110.664],
          [-6.915, 110.665],
          [-6.917, 110.650],
        ],
      },
      {
        id: "dmk-03",
        namaBlok: "Blok Gajah Selatan C",
        luasHa: 139.0,
        jenisTanah: "Aluvial",
        phTanah: 6.5,
        elevasiMdpl: 12,
        jarakBendunganKm: 9.2,
        saluranIrigasi: "Sekunder",
        kelembapanTanahBase: 69,
        ndviBase: 0.68,
        curahHujanBase: 215,
        suhuPermukaanBase: 28.1,
        confidence: 92.9,
        coordinates: [
          [-6.919, 110.634],
          [-6.918, 110.654],
          [-6.931, 110.652],
          [-6.930, 110.632],
        ],
      },
    ],
  },
  {
    id: "sidrap",
    nama: "Kab. Sidenreng Rappang",
    provinsi: "Sulawesi Selatan",
    maxMasaTanamPerTahun: 4, // Mendukung hingga MT-4
    center: [-3.925, 119.795],
    zoom: 13,
    bendungan: {
      nama: "Bendung Bulu Cenrana / Bila",
      kapasitasJutaM3: 320,
      statusDebit: "Normal",
      coordinates: [-3.875, 119.835],
    },
    lahan: [
      {
        id: "sdr-01",
        namaBlok: "Blok Maritengngae Utama A",
        luasHa: 182.1,
        jenisTanah: "Aluvial",
        phTanah: 6.5,
        elevasiMdpl: 24,
        jarakBendunganKm: 4.9,
        saluranIrigasi: "Primer",
        kelembapanTanahBase: 80,
        ndviBase: 0.79,
        curahHujanBase: 246,
        suhuPermukaanBase: 27.7,
        confidence: 95.2,
        coordinates: [
          [-3.911, 119.776],
          [-3.910, 119.795],
          [-3.923, 119.797],
          [-3.925, 119.778],
        ],
      },
      {
        id: "sdr-02",
        namaBlok: "Blok Watang Pulu B",
        luasHa: 115.4,
        jenisTanah: "Latosol",
        phTanah: 6.1,
        elevasiMdpl: 35,
        jarakBendunganKm: 16.5,
        saluranIrigasi: "Sekunder",
        kelembapanTanahBase: 46,
        ndviBase: 0.57,
        curahHujanBase: 180,
        suhuPermukaanBase: 29.2,
        confidence: 90.1,
        coordinates: [
          [-3.913, 119.799],
          [-3.912, 119.816],
          [-3.926, 119.815],
          [-3.927, 119.798],
        ],
      },
      {
        id: "sdr-03",
        namaBlok: "Blok Panca Rijang C",
        luasHa: 134.8,
        jenisTanah: "Aluvial",
        phTanah: 6.4,
        elevasiMdpl: 29,
        jarakBendunganKm: 10.2,
        saluranIrigasi: "Sekunder",
        kelembapanTanahBase: 67,
        ndviBase: 0.68,
        curahHujanBase: 210,
        suhuPermukaanBase: 28.3,
        confidence: 91.9,
        coordinates: [
          [-3.928, 119.782],
          [-3.927, 119.805],
          [-3.940, 119.803],
          [-3.939, 119.780],
        ],
      },
    ],
  },
  {
    id: "deliserdang",
    nama: "Kab. Deli Serdang",
    provinsi: "Sumatera Utara",
    maxMasaTanamPerTahun: 4,
    center: [3.555, 98.865],
    zoom: 13,
    bendungan: {
      nama: "Bendung Sei Ular Perbaungan",
      kapasitasJutaM3: 295,
      statusDebit: "Normal",
      coordinates: [3.585, 98.915],
    },
    lahan: [
      {
        id: "dsd-01",
        namaBlok: "Blok Lubuk Pakam Irigasi 01",
        luasHa: 152.6,
        jenisTanah: "Aluvial",
        phTanah: 6.4,
        elevasiMdpl: 19,
        jarakBendunganKm: 5.1,
        saluranIrigasi: "Primer",
        kelembapanTanahBase: 83,
        ndviBase: 0.80,
        curahHujanBase: 275,
        suhuPermukaanBase: 27.0,
        confidence: 94.8,
        coordinates: [
          [3.568, 98.848],
          [3.569, 98.865],
          [3.556, 98.867],
          [3.555, 98.849],
        ],
      },
      {
        id: "dsd-02",
        namaBlok: "Blok Beringin Pantai Labu 02",
        luasHa: 121.9,
        jenisTanah: "Aluvial",
        phTanah: 6.2,
        elevasiMdpl: 10,
        jarakBendunganKm: 11.4,
        saluranIrigasi: "Sekunder",
        kelembapanTanahBase: 70,
        ndviBase: 0.69,
        curahHujanBase: 235,
        suhuPermukaanBase: 27.9,
        confidence: 92.5,
        coordinates: [
          [3.567, 98.869],
          [3.568, 98.885],
          [3.554, 98.884],
          [3.554, 98.868],
        ],
      },
      {
        id: "dsd-03",
        namaBlok: "Blok Pagar Merbau 03",
        luasHa: 98.4,
        jenisTanah: "Latosol",
        phTanah: 5.9,
        elevasiMdpl: 27,
        jarakBendunganKm: 18.7,
        saluranIrigasi: "Tadah Hujan",
        kelembapanTanahBase: 44,
        ndviBase: 0.52,
        curahHujanBase: 185,
        suhuPermukaanBase: 28.7,
        confidence: 90.2,
        coordinates: [
          [3.551, 98.854],
          [3.552, 98.876],
          [3.539, 98.874],
          [3.538, 98.852],
        ],
      },
    ],
  },
  {
    id: "lomboktengah",
    nama: "Kab. Lombok Tengah",
    provinsi: "Nusa Tenggara Barat",
    maxMasaTanamPerTahun: 3, // Mentok di MT-3
    center: [-8.715, 116.275],
    zoom: 13,
    bendungan: {
      nama: "Bendungan Batujai & Pengga",
      kapasitasJutaM3: 185,
      statusDebit: "Siaga",
      coordinates: [-8.685, 116.255],
    },
    lahan: [
      {
        id: "lbt-01",
        namaBlok: "Blok Praya Irigasi Pengga 01",
        luasHa: 145.0,
        jenisTanah: "Aluvial",
        phTanah: 6.6,
        elevasiMdpl: 95,
        jarakBendunganKm: 3.9,
        saluranIrigasi: "Primer",
        kelembapanTanahBase: 76,
        ndviBase: 0.75,
        curahHujanBase: 225,
        suhuPermukaanBase: 27.6,
        confidence: 93.7,
        coordinates: [
          [-8.702, 116.258],
          [-8.701, 116.275],
          [-8.714, 116.277],
          [-8.715, 116.259],
        ],
      },
      {
        id: "lbt-02",
        namaBlok: "Blok Jonggat Timur 02",
        luasHa: 112.8,
        jenisTanah: "Grumusol",
        phTanah: 6.8,
        elevasiMdpl: 112,
        jarakBendunganKm: 13.6,
        saluranIrigasi: "Sekunder",
        kelembapanTanahBase: 46,
        ndviBase: 0.50,
        curahHujanBase: 155,
        suhuPermukaanBase: 29.8,
        confidence: 91.3,
        coordinates: [
          [-8.703, 116.279],
          [-8.702, 116.295],
          [-8.716, 116.294],
          [-8.716, 116.278],
        ],
      },
      {
        id: "lbt-03",
        namaBlok: "Blok Pujut Selatan 03",
        luasHa: 95.3,
        jenisTanah: "Regosol",
        phTanah: 5.8,
        elevasiMdpl: 68,
        jarakBendunganKm: 24.8,
        saluranIrigasi: "Tadah Hujan",
        kelembapanTanahBase: 35,
        ndviBase: 0.21,
        curahHujanBase: 95,
        suhuPermukaanBase: 32.4,
        confidence: 96.5,
        coordinates: [
          [-8.719, 116.264],
          [-8.718, 116.286],
          [-8.731, 116.284],
          [-8.730, 116.262],
        ],
      },
    ],
  },
];

export interface ComputedSawahResult extends SawahFeature {
  faseTanam: 1 | 2 | 3 | 4 | 0;
  kelembapanAktual: number;
  curahHujanAktual: number;
  ndviAktual: number;
  suhuAktual: number;
  rekomendasiTanaman: string;
  alasanAgronomi: string;
  indeksKesuburan: number;
}

export function computeSawahPrediction(
  sawah: SawahFeature,
  month: number,
  year: string,
  mlRunCount: number,
  maxMasaTanamPerTahun: 3 | 4 = 4
): ComputedSawahResult {
  const isWetSeason = month >= 11 || month <= 4;
  const seasonalRainFactor = isWetSeason ? 1.15 : 0.65;
  const damProximityBonus = Math.max(0, 22 - sawah.jarakBendunganKm * 0.9);

  const soilRetentionBonus =
    sawah.jenisTanah === "Aluvial"
      ? 8
      : sawah.jenisTanah === "Grumusol"
      ? 5
      : sawah.jenisTanah === "Latosol"
      ? 2
      : -5;

  const yearOffset = (Number(year) - 2026) * 2;
  const runJitter = (mlRunCount % 3) - 1;

  const curahHujanAktual = Math.round(
    sawah.curahHujanBase * seasonalRainFactor + yearOffset + runJitter * 4
  );

  const rawMoisture =
    sawah.kelembapanTanahBase * (isWetSeason ? 1.02 : 0.74) +
    damProximityBonus * 0.45 +
    soilRetentionBonus +
    runJitter * 2;

  const kelembapanAktual = Math.min(95, Math.max(18, Math.round(rawMoisture)));

  const suhuAktual = Number(
    (
      sawah.suhuPermukaanBase +
      (isWetSeason ? -0.6 : 1.4) +
      (sawah.jarakBendunganKm > 15 ? 0.5 : 0)
    ).toFixed(1)
  );

  const ndviAktual = Number(
    Math.min(0.92, Math.max(0.15, (kelembapanAktual / 100) * 0.95)).toFixed(2)
  );

  // Tentukan kandidat fase tanam
  let kandidatFase: 1 | 2 | 3 | 4 | 0 = 0;

  if (kelembapanAktual >= 72 && sawah.jarakBendunganKm <= 12) {
    kandidatFase = 1;
  } else if (kelembapanAktual >= 58) {
    kandidatFase = 2;
  } else if (kelembapanAktual >= 44) {
    kandidatFase = 3;
  } else if (kelembapanAktual >= 34) {
    kandidatFase = 4;
  } else {
    kandidatFase = 0;
  }

  // ATURAN DATABASE: Jika wilayah hanya mendukung maksimal MT-3 dalam setahun,
  // maka kandidat MT-4 otomatis mentok menjadi 0 (Abu-abu / Non-Tanam).
  const faseTanam: 1 | 2 | 3 | 4 | 0 =
    kandidatFase > maxMasaTanamPerTahun ? 0 : kandidatFase;

  let rekomendasiTanaman = "";
  let alasanAgronomi = "";

  if (faseTanam === 1) {
    rekomendasiTanaman =
      sawah.jenisTanah === "Aluvial"
        ? "Padi Ciherang / IR64"
        : "Padi Mekongga / Situ Bagendit";
    alasanAgronomi = `Irigasi primer (${sawah.jarakBendunganKm} km dari dam) & kelembapan ${kelembapanAktual}% optimal untuk padi utama.`;
  } else if (faseTanam === 2) {
    rekomendasiTanaman = "Padi Inpari 32 / Inpari 42";
    alasanAgronomi = `Kelembapan ${kelembapanAktual}% pada tanah ${sawah.jenisTanah} sesuai untuk padi varietas hemat air.`;
  } else if (faseTanam === 3) {
    rekomendasiTanaman =
      sawah.jenisTanah === "Grumusol"
        ? "Kedelai Anjasmoro / Kacang Tanah"
        : "Jagung Hibrida Bisi-18";
    alasanAgronomi = `Suplai air sedang (${curahHujanAktual} mm). Rotasi palawija menjaga keseimbangan hara.`;
  } else if (faseTanam === 4) {
    rekomendasiTanaman = "Kacang Hijau / Bawang Merah / Hortikultura";
    alasanAgronomi = `Wilayah mendukung indeks tanam 4x/tahun. Komoditas umur pendek (<65 hari) direkomendasikan.`;
  } else {
    rekomendasiTanaman = "Tidak Masa Tanam (Bera / Pemulihan Tanah)";
    alasanAgronomi =
      kandidatFase === 4 && maxMasaTanamPerTahun === 3
        ? `Kapasitas siklus wilayah ini maksimal MT-3 per tahun. Lahan masuk fase istirahat (abu-abu).`
        : `Jarak dam ${sawah.jarakBendunganKm} km & kelembapan ${kelembapanAktual}%. Lahan diistirahatkan.`;
  }

  const indeksKesuburan = Math.min(
    98,
    Math.max(
      40,
      Math.round(kelembapanAktual * 0.6 + (10 - Math.abs(6.5 - sawah.phTanah) * 10) * 3)
    )
  );

  return {
    ...sawah,
    faseTanam,
    kelembapanAktual,
    curahHujanAktual,
    ndviAktual,
    suhuAktual,
    rekomendasiTanaman,
    alasanAgronomi,
    indeksKesuburan,
  };
}