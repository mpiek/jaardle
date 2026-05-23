#!/usr/bin/env python3
"""Build events.min.json from events.json (compact format)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "events.json"
DST = ROOT / "events.min.json"

d = json.load(open(SRC, encoding="utf-8"))
compact = [[e["year"], [h["text"] for h in e["hints"]]] for e in d]

# Compact JSON: no indentation, no spaces
with open(DST, "w", encoding="utf-8") as f:
    json.dump(compact, f, ensure_ascii=False, separators=(",", ":"))

import os, gzip
raw = os.path.getsize(DST)
with open(DST, "rb") as f:
    gz = len(gzip.compress(f.read(), 9))
print(f"{DST.name}: {raw/1024:.0f} KB raw, {gz/1024:.0f} KB gzipped")
