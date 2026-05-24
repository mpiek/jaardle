#!/usr/bin/env python3
"""Build bundle.bin (+ events.min.json) from events.nl.json.

Run this na elke translation/scrub-update:
  python3 tools/build_compact.py
"""
import gzip
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC_NL = ROOT / "events.nl.json"
SRC_EN = ROOT / "events.en.json"
MIN = ROOT / "events.min.json"
BUNDLE = ROOT / "bundle.bin"

# 16-byte key, herhaald als XOR-masker. Moet matchen met BUNDLE_KEY in game.js.
PACK_KEY = b"j7r4Td9xPq2nMv5W"


def main() -> None:
    if not SRC_NL.exists():
        raise SystemExit(f"missing source: {SRC_NL}")
    nl_data = json.loads(SRC_NL.read_text(encoding="utf-8"))
    en_by_year: dict[int, list[str]] = {}
    if SRC_EN.exists():
        en_data = json.loads(SRC_EN.read_text(encoding="utf-8"))
        en_by_year = {e["year"]: [h["text"] for h in e["hints"]] for e in en_data}

    # Per-year naieve zip (alignment by index): voor de meeste events klopt
    # het 1-op-1 vanuit Argos-translatie. Bij scrubbed drops vallen we netjes
    # terug op een lege EN-string voor die hint.
    compact = []
    for e in nl_data:
        en_hints = en_by_year.get(e["year"], [])
        pairs = []
        for i, h in enumerate(e["hints"]):
            pairs.append([h["text"], en_hints[i] if i < len(en_hints) else ""])
        compact.append([e["year"], pairs])

    # Compact JSON (no whitespace) — input voor de packer en debug-bestand
    raw = json.dumps(compact, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    MIN.write_bytes(raw)

    # Pack: gzip → XOR met PACK_KEY → bundle.bin
    gz = gzip.compress(raw, compresslevel=9)
    out = bytearray(len(gz))
    for i, b in enumerate(gz):
        out[i] = b ^ PACK_KEY[i % len(PACK_KEY)]
    BUNDLE.write_bytes(bytes(out))

    print(f"  {MIN.name:18}: {len(raw)/1024:>6.0f} KB raw")
    print(f"  {BUNDLE.name:18}: {len(out)/1024:>6.0f} KB packed (gzip ratio {len(gz)/len(raw)*100:.0f}%)")
    print(f"  {len(nl_data)} jaren, {sum(len(e['hints']) for e in nl_data)} events")


if __name__ == "__main__":
    main()
