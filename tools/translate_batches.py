#!/usr/bin/env python3
"""
Vertaalt batch_NNN_in.json files naar batch_NNN_out.json via Claude Haiku.

- Leest batch_001_in.json ... batch_009_in.json
- Voor elke batch: extracts hints, stuurt naar Haiku, schrijft batch_NNN_out.json
- Prompt caching op system-prompt
- Kan hervatten onderbroken translaties

Gebruik:
  python3 tools/translate_batches.py
"""

import json
import os
import sys
import time
from pathlib import Path

import anthropic

MODEL = "claude-haiku-4-5"
MAX_RETRIES = 3

SYSTEM_PROMPT = """Je bent een professionele vertaler Engels -> Nederlands voor een geschiedenistrivia-spel.

Vertaal elke Engelse zin naar natuurlijk, vloeiend Nederlands. Regels:

1. Behoud de feitelijke inhoud exact (jaartallen, namen, plaatsen).
2. Gebruik Nederlandse spelling voor algemeen bekende historische termen (bv. "Tweede Wereldoorlog", "Romeinse Rijk", "Vrede van Munster").
3. Behoud eigennamen die geen Nederlands equivalent hebben (Battle of X, FC Bayern, etc.).
4. Behoud het `____` token letterlijk (anti-spoiler placeholder voor het jaar).
5. Vertaal beknopt en natuurlijk - geen overbodige toevoegingen.
6. Schrijf historisch correct en in een neutrale, encyclopedische toon.

INPUT-FORMAT: een JSON array van objecten {"id": int, "text": "Engelse zin"}.
OUTPUT-FORMAT: ALLEEN een JSON array van objecten {"id": int, "text": "Nederlandse vertaling"}, in dezelfde volgorde. Geen uitleg, geen markdown, geen ```json fences. Begin direct met `[`.
"""


def translate_batch(client: anthropic.Anthropic, hints: list[dict]) -> list[dict]:
    """hints = [{"id": int, "text": "..."}, ...] -> same shape, NL text."""
    user_payload = json.dumps(hints, ensure_ascii=False)

    last_err: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            resp = client.messages.create(
                model=MODEL,
                max_tokens=8192,
                system=[
                    {
                        "type": "text",
                        "text": SYSTEM_PROMPT,
                        "cache_control": {"type": "ephemeral"},
                    }
                ],
                messages=[{"role": "user", "content": user_payload}],
            )
            text = "".join(b.text for b in resp.content if b.type == "text").strip()
            # Verwijder evt. ```json fences
            if text.startswith("```"):
                text = text.split("\n", 1)[1] if "\n" in text else text
                text = text.rsplit("```", 1)[0].strip()
            parsed = json.loads(text)
            if not isinstance(parsed, list):
                raise ValueError("response not a list")
            if len(parsed) != len(hints):
                raise ValueError(
                    f"size mismatch: expected {len(hints)}, got {len(parsed)}"
                )
            return parsed
        except (json.JSONDecodeError, ValueError, anthropic.APIError) as e:
            last_err = e
            print(f"  retry {attempt + 1}/{MAX_RETRIES}: {e}", file=sys.stderr)
            time.sleep(2 ** attempt)
    raise RuntimeError(f"batch failed after {MAX_RETRIES} retries: {last_err}")


def main():
    batch_dir = Path(__file__).parent.parent / ".translate-batches"

    if "ANTHROPIC_API_KEY" not in os.environ:
        print("FOUT: ANTHROPIC_API_KEY niet gezet.", file=sys.stderr)
        sys.exit(1)

    client = anthropic.Anthropic()

    # Find all batch_NNN_in.json files
    batch_files = sorted(batch_dir.glob("batch_*_in.json"))
    if not batch_files:
        print(f"Geen batch files gevonden in {batch_dir}", file=sys.stderr)
        sys.exit(1)

    print(f"Gevonden {len(batch_files)} batches", file=sys.stderr)

    for batch_file in batch_files:
        # Determine output filename
        batch_num = batch_file.stem.replace("batch_", "").replace("_in", "")
        out_file = batch_dir / f"batch_{batch_num}_out.json"

        # Skip if already done
        if out_file.exists():
            with out_file.open(encoding="utf-8") as f:
                existing = json.load(f)
            # Check if all hints are translated
            all_translated = True
            with batch_file.open(encoding="utf-8") as f:
                batch_data = json.load(f)
            if len(existing) == len(batch_data):
                # Assume if same length and file exists, it's done
                print(f"  {out_file.name}: al voltooid", file=sys.stderr)
                continue
            print(f"  {out_file.name}: onvolledig, hervatten...", file=sys.stderr)

        # Load batch input
        with batch_file.open(encoding="utf-8") as f:
            batch_data = json.load(f)

        print(f"\nVertalen {batch_file.name} ({len(batch_data)} entries)...", file=sys.stderr)

        # Flatten all hints for translation
        all_hints = []
        hint_map = []  # [(entry_idx, hint_idx_in_entry), ...]
        for entry_idx, entry in enumerate(batch_data):
            for hint_idx, hint_text in enumerate(entry["h"]):
                all_hints.append({"id": len(all_hints), "text": hint_text})
                hint_map.append((entry_idx, hint_idx))

        print(f"  {len(all_hints)} hints total", file=sys.stderr)

        # Translate in batches of 30
        translated_by_id = {}
        for batch_start in range(0, len(all_hints), 30):
            batch_slice = all_hints[batch_start : batch_start + 30]
            print(f"  Vertalen hints {batch_start}-{batch_start + len(batch_slice)}...", file=sys.stderr)
            try:
                translated = translate_batch(client, batch_slice)
                for item in translated:
                    translated_by_id[item["id"]] = item["text"]
            except Exception as e:
                print(f"FOUT: {e}", file=sys.stderr)
                sys.exit(1)

        # Build output in same structure as input
        output = []
        hint_counter = 0
        for entry in batch_data:
            nl_hints = []
            for _ in enumerate(entry["h"]):
                nl_text = translated_by_id.get(hint_counter, "")
                nl_hints.append(nl_text)
                hint_counter += 1
            output.append({
                "i": entry["i"],
                "y": entry["y"],
                "h": nl_hints
            })

        # Write output
        with out_file.open("w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)
        print(f"  Geschreven naar {out_file.name}", file=sys.stderr)

    print("\nAlle batches vertaald!", file=sys.stderr)


if __name__ == "__main__":
    main()
