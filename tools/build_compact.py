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
SRC = ROOT / "events.nl.json"
MIN = ROOT / "events.min.json"
BUNDLE = ROOT / "bundle.bin"

# 16-byte key, herhaald als XOR-masker. Moet matchen met BUNDLE_KEY in game.js.
PACK_KEY = b"j7r4Td9xPq2nMv5W"


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"missing source: {SRC}")
    d = json.loads(SRC.read_text(encoding="utf-8"))
    compact = [[e["year"], [h["text"] for h in e["hints"]]] for e in d]

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
    print(f"  {len(d)} jaren, {sum(len(e['hints']) for e in d)} events")


if __name__ == "__main__":
    main()
