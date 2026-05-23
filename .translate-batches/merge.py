#!/usr/bin/env python3
"""Merge all batch_NNN_out.json files into events.nl.json."""
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).parent
PROJECT = ROOT.parent

with open(PROJECT / "events.en.json", encoding="utf-8") as f:
    en_data = json.load(f)

# Build translation map: index -> [nl_text, nl_text, nl_text]
nl_map = {}
batch_files = sorted(ROOT.glob("batch_*_out.json"))
print(f"Found {len(batch_files)} output batches", file=sys.stderr)

for bf in batch_files:
    with open(bf, encoding="utf-8") as f:
        batch = json.load(f)
    for entry in batch:
        nl_map[entry["i"]] = entry["h"]

print(f"Translated entries: {len(nl_map)}/{len(en_data)}", file=sys.stderr)

# Build events.nl.json
nl_data = []
for idx, en_entry in enumerate(en_data):
    nl_hints_text = nl_map.get(idx)
    if nl_hints_text is None:
        # Niet vertaald: skip of fall-back op EN
        nl_data.append(en_entry)
        continue
    nl_hints = []
    for i, en_hint in enumerate(en_entry["hints"]):
        nl_text = nl_hints_text[i] if i < len(nl_hints_text) else en_hint["text"]
        nl_hints.append({"text": nl_text, "source": en_hint["source"]})
    nl_data.append({"year": en_entry["year"], "hints": nl_hints})

out = PROJECT / "events.nl.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(nl_data, f, ensure_ascii=False, indent=2)
print(f"Wrote {out}", file=sys.stderr)
