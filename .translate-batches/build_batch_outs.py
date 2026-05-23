#!/usr/bin/env python3
"""Combine chunk-level _nl.json files back into batch_NNN_out.json (event-grouped)."""
import json, glob
from pathlib import Path

CHUNKS_DIR = Path("/tmp")
HERE = Path(__file__).parent

for n in range(1, 10):
    bid = f"{n:03d}"
    inp = json.load(open(HERE / f"batch_{bid}_in.json"))

    # Concat all NL chunks (in order) into a flat list of hint strings
    nl_flat = []
    for chunk_path in sorted(CHUNKS_DIR.glob(f"batch_{bid}_chunk_*_nl.json"), key=lambda p: int(p.stem.split("_")[3])):
        nl_flat.extend(json.load(open(chunk_path)))

    expected = sum(len(e["h"]) for e in inp)
    assert len(nl_flat) == expected, f"batch_{bid}: got {len(nl_flat)}, expected {expected}"

    # Slice nl_flat back into per-event lists
    out = []
    cursor = 0
    for entry in inp:
        k = len(entry["h"])
        out.append({"i": entry["i"], "h": nl_flat[cursor:cursor + k]})
        cursor += k

    out_path = HERE / f"batch_{bid}_out.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"Wrote {out_path.name} ({len(out)} events, {expected} hints)")
