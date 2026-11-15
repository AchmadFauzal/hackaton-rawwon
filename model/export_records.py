"""Ubah Excel data mentah -> data_mentah.json (dipakai ipFeatures.js).  python export_records.py data.xlsx data_mentah.json"""
import sys, json, pandas as pd
df = pd.read_excel(sys.argv[1])
for c in ["tanam_1", "tanam_2", "tanam_3"]:
    d = pd.to_datetime(df[c], errors="coerce")
    df[c] = d.dt.strftime("%Y-%m-%d").where(d.notna(), None)
cols = ["uid", "kabupaten", "tahun", "IP_class", "n_siklus", "n_genangan", "ndvi_max", "ndvi_min", "ndvi_amp",
        "kandidat_sawah", "lswi_kemarau", "n_periode_data", "tanam_1", "tanam_2", "tanam_3"]
recs = json.loads(df[cols].to_json(orient="records"))
json.dump(recs, open(sys.argv[2], "w"), separators=(",", ":"), ensure_ascii=False)
print(len(recs), "baris ->", sys.argv[2])
