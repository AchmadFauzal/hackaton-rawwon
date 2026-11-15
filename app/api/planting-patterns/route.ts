import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const DATA_DIRECTORY = path.join(process.cwd(), "public", "data");
const FILE_PATTERN = /^ringkasan_pola_tanam_(.+)\.geojson$/i;

interface PlantingDataset {
  city: string;
  fileName: string;
}

async function listDatasets(): Promise<PlantingDataset[]> {
  const fileNames = await readdir(DATA_DIRECTORY);
  return fileNames
    .map((fileName) => {
      const match = fileName.match(FILE_PATTERN);
      return match ? { city: match[1], fileName } : null;
    })
    .filter((dataset): dataset is PlantingDataset => dataset !== null)
    .sort((a, b) => a.city.localeCompare(b.city));
}

async function readDataset(dataset: PlantingDataset) {
  const contents = await readFile(
    path.join(DATA_DIRECTORY, dataset.fileName),
    "utf8"
  );
  const geoJson = JSON.parse(contents);
  if (!Array.isArray(geoJson?.features)) {
    throw new Error(`Dataset ${dataset.fileName} bukan FeatureCollection valid.`);
  }
  return geoJson;
}

export async function GET(request: Request) {
  try {
    const datasets = await listDatasets();
    const city = new URL(request.url).searchParams.get("city");

    if (!city) {
      return NextResponse.json(
        { cities: datasets.map(({ city: name }) => name) },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    if (city.toLowerCase() === "all") {
      const collections = await Promise.all(datasets.map(readDataset));
      return NextResponse.json(
        {
          type: "FeatureCollection",
          features: collections.flatMap((collection) => collection.features),
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const dataset = datasets.find(
      (item) => item.city.toLowerCase() === city.toLowerCase()
    );
    if (!dataset) {
      return NextResponse.json(
        { error: `Dataset pola tanam untuk ${city} tidak ditemukan.` },
        { status: 404 }
      );
    }

    return NextResponse.json(await readDataset(dataset), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to load planting pattern datasets:", error);
    return NextResponse.json(
      { error: "Gagal memuat dataset pola tanam." },
      { status: 500 }
    );
  }
}
