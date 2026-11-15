// ipTfjs.js — memuat model TensorFlow.js hasil notebook dan memprediksi IP class satu petak.
//
// Letakkan folder hasil ekspor di public/models/ip/<tahun>/ (model.json, group1-shard*.bin, prep.json, fitur.json, meta.json).
//
//   import { loadIP, predictPetak } from "@/lib/ipTfjs";
//   const ip = await loadIP("/models/ip/2026");            // sisi browser (client component)
//   const rows = await predictPetak(ip, "P_000...", "Purworejo");
//
// Praproses di sini identik dengan kelas Prep di notebook (median, penanda kosong, standardisasi, clip).

export const CLASSES = ["tidak ada siklus", "IP100", "IP200", "IP300"];

/** x: array (urutan `features` di fitur.json) atau objek {nama: nilai}; null/undefined/NaN = kosong. */
export function preprocess(prep, x, features) {
  const get = Array.isArray(x)
    ? (c) => x[features.indexOf(c)]
    : (c) => x[c];
  const isNa = (v) => v === null || v === undefined || Number.isNaN(v);
  const out = new Float32Array(prep.cols.length + prep.miss.length);
  prep.cols.forEach((c, i) => {
    const raw = get(c);
    const v = isNa(raw) ? prep.med[i] : raw;
    out[i] = Math.max(-prep.clip, Math.min(prep.clip, (v - prep.mu[i]) / prep.sd[i]));
  });
  prep.miss.forEach((c, j) => {
    out[prep.cols.length + j] = isNa(get(c)) ? 1 : 0;
  });
  return out;
}

export function describe(probs) {
  let best = 0;
  probs.forEach((p, k) => p > probs[best] && (best = k));
  const confidence = probs[best];
  const level = confidence >= 0.7 ? "tinggi" : confidence >= 0.5 ? "sedang" : "rendah";
  const expected = probs.reduce((a, p, k) => a + p * k, 0);
  return {
    probs: Object.fromEntries(CLASSES.map((c, k) => [c, probs[k]])),
    label: CLASSES[best],
    confidence,
    level,
    expected,
  };
}

/** Memuat model + praproses + fitur dari satu folder tahun. */
export async function loadIP(baseUrl) {
  const tf = await import("@tensorflow/tfjs");
  class L2 extends tf.serialization.Serializable {
    constructor(config = {}) {
      super();
      this.l2 = config.l2 ?? 0;
      this.delegate = tf.regularizers.l2({ l2: this.l2 });
    }

    apply(x) {
      return this.delegate.apply(x);
    }

    getConfig() {
      return { l2: this.l2 };
    }
  }

  L2.className = "L2";
  tf.serialization.registerClass(L2);
  const [model, prep, fitur] = await Promise.all([
    tf.loadLayersModel(`${baseUrl}/model.json`),
    fetch(`${baseUrl}/prep.json`).then((r) => r.json()),
    fetch(`${baseUrl}/fitur.json`).then((r) => r.json()),
  ]);
  return { tf, model, prep, fitur };
}

/** Prediksi batch: rows = array vektor mentah. Mengembalikan array probabilitas (n x 4). */
export async function predictBatch(ip, rows) {
  const { tf, model, prep, fitur } = ip;
  const data = rows.map((x) => preprocess(prep, x, fitur.features));
  const n = data[0].length;
  const flat = new Float32Array(rows.length * n);
  data.forEach((v, i) => flat.set(v, i * n));
  const probs = tf.tidy(() => model.predict(tf.tensor2d(flat, [rows.length, n])));
  const arr = await probs.array();
  probs.dispose();
  return arr;
}

/** Satu baris per petak (uid bisa ada di >1 kabupaten). */
export async function predictPetak(ip, uid, kabupaten) {
  const sel = ip.fitur.petak.filter((p) => p.uid === uid && (!kabupaten || p.kabupaten === kabupaten));
  if (!sel.length) return [];
  const P = await predictBatch(ip, sel.map((p) => p.x));
  return sel.map((p, i) => ({
    uid: p.uid,
    kabupaten: p.kabupaten,
    tahun_target: ip.fitur.tahun_target,
    ...describe(P[i]),
  }));
}
