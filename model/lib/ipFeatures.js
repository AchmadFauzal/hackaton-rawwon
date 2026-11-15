// ipFeatures.js — menghitung fitur mentah (39 kolom) tiap petak dari data mentah, identik dengan build_h() di notebook.
// Setelah ini, panggil preprocess() dari ipTfjs.js (-> 53 angka) lalu model.predict.
//
// records: array baris data asli (satu baris = 1 petak x 1 tahun), kolom sama seperti file Excel:
//   { uid, kabupaten, tahun, IP_class, n_siklus, n_genangan, ndvi_max, ndvi_min, ndvi_amp,
//     kandidat_sawah, lswi_kemarau, n_periode_data, tanam_1, tanam_2, tanam_3 }
//   tanam_* = "YYYY-MM-DD" atau "-" / null bila tidak ada.

export const CLASSES = ["tidak ada siklus", "IP100", "IP200", "IP300"];
const NUM = ["n_siklus", "n_genangan", "ndvi_max", "ndvi_min", "ndvi_amp", "kandidat_sawah",
  "lswi_kemarau", "n_periode_data", "tanam_1_off", "tanam_2_off", "gap_12", "gap_23"];
const nan = (v) => v === null || v === undefined || Number.isNaN(v);
const mean = (a) => { const v = a.filter((x) => !nan(x)); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };

function offsetDays(dateStr, tahun) {            // hari sejak 1 Oktober tahun musim tanam
  if (!dateStr || dateStr === "-") return null;
  const d = Date.parse(String(dateStr).slice(0, 10) + "T00:00:00Z");
  if (Number.isNaN(d)) return null;
  return Math.round((d - Date.UTC(tahun, 9, 1)) / 86400000);
}

function prepare(records) {
  return records.map((r) => {
    const t1 = offsetDays(r.tanam_1, r.tahun), t2 = offsetDays(r.tanam_2, r.tahun), t3 = offsetDays(r.tanam_3, r.tahun);
    return {
      ...r,
      y: CLASSES.indexOf(r.IP_class),
      tanam_1_off: t1, tanam_2_off: t2,
      gap_12: nan(t1) || nan(t2) ? null : t2 - t1,
      gap_23: nan(t2) || nan(t3) ? null : t3 - t2,
    };
  });
}

/** Fitur semua petak untuk tahun `target`. Mengembalikan [{uid, kabupaten, fitur: {nama: nilai|null}, x: [...]}], urut = `names`. */
export function buildFeatures(records, target) {
  const rows = prepare(records);
  const last = Math.max(...rows.map((r) => r.tahun));
  const h = target - last;
  if (h < 1) throw new Error(`Tahun target harus > ${last}`);
  const T = target - h + 1;                          // = last + 1 : fitur memakai data < T
  const kabs = [...new Set(rows.map((r) => r.kabupaten))].sort();

  const byPlot = new Map();
  for (const r of rows) {
    const k = r.uid + "|" + r.kabupaten;
    if (!byPlot.has(k)) byPlot.set(k, []);
    byPlot.get(k).push(r);
  }
  // konteks kabupaten pada tahun T-1
  const kabStat = {};
  for (const kab of kabs) {
    const ys = rows.filter((r) => r.kabupaten === kab && r.tahun === T - 1).map((r) => r.y);
    kabStat[kab] = ys.length
      ? { mean: ys.reduce((a, b) => a + b, 0) / ys.length, noc: ys.filter((y) => y === 0).length / ys.length }
      : { mean: null, noc: null };
  }

  const names = [];
  const out = [];
  for (const [, recs] of byPlot) {
    const hist = recs.filter((r) => r.tahun < T);
    const f = {};
    const at = (yr) => hist.find((r) => r.tahun === yr);
    for (const lag of [1, 2, 3]) {
      const r = at(T - lag);
      const cols = lag === 1 ? ["y", ...NUM] : ["y", "n_siklus", "ndvi_amp", "ndvi_max"];
      for (const c of cols) f[`${c}_l${lag}`] = r && !nan(r[c]) ? r[c] : null;
    }
    const ys = hist.map((r) => r.y), n = ys.length;
    const my = mean(ys);
    f.n_hist = n;
    f.mean_siklus = mean(hist.map((r) => r.n_siklus));
    f.mean_y = my;
    f.std_y = n > 1 ? Math.sqrt(ys.reduce((s, y) => s + (y - my) ** 2, 0) / (n - 1)) : null;  // ddof = 1
    f.mean_ndvi_amp = mean(hist.map((r) => r.ndvi_amp));
    f.mean_lswi = mean(hist.map((r) => r.lswi_kemarau));
    f.mean_tanam1 = mean(hist.map((r) => r.tanam_1_off));
    CLASSES.forEach((c, k) => (f[`share_${c}`] = n ? ys.filter((y) => y === k).length / n : null));
    f.delta_siklus = nan(f.n_siklus_l1) || nan(f.mean_siklus) ? null : f.n_siklus_l1 - f.mean_siklus;
    const kab = recs[0].kabupaten;
    f.kab_mean_y_l1 = kabStat[kab].mean;
    f.kab_share_nocycle_l1 = kabStat[kab].noc;
    for (const k of kabs) f[`kab_${k}`] = kab === k ? 1 : 0;
    if (!names.length) names.push(...Object.keys(f));
    out.push({ uid: recs[0].uid, kabupaten: kab, fitur: f, x: names.map((n) => f[n]) });
  }
  return { names, petak: out, tahun_target: target, horizon: h };
}

/** Fitur satu petak (uid [+ kabupaten]) untuk tahun target. */
export function featuresFor(records, uid, kabupaten, target) {
  const all = buildFeatures(records, target);
  return { ...all, petak: all.petak.filter((p) => p.uid === uid && (!kabupaten || p.kabupaten === kabupaten)) };
}
