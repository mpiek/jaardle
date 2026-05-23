#!/usr/bin/env python3
"""
Vertaalt events.en.json -> events.nl.json via Claude Haiku 4.5.

- Leest events.en.json
- Batches van N hints tegelijk (default 30) naar Claude
- Prompt caching op de system-prompt
- Schrijft incrementeel naar events.nl.json (resume-safe)

Vereist: ANTHROPIC_API_KEY in env.

Gebruik:
  python3 tools/translate.py --in events.en.json --out events.nl.json
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

import anthropic

MODEL = "claude-haiku-4-5"
BATCH_SIZE = 30
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


def load_events(path: Path) -> list[dict]:
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def save_events(path: Path, events: list[dict]) -> None:
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)
    tmp.replace(path)


def translate_batch(client: anthropic.Anthropic, batch: list[dict]) -> list[dict]:
    """batch = [{"id": int, "text": "..."}, ...] -> same shape, NL text."""
    user_payload = json.dumps(batch, ensure_ascii=False)

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
            # Verwijder evt. ```json fences als die er toch zijn
            if text.startswith("```"):
                text = text.split("\n", 1)[1] if "\n" in text else text
                text = text.rsplit("```", 1)[0].strip()
            parsed = json.loads(text)
            if not isinstance(parsed, list):
                raise ValueError("response not a list")
            if len(parsed) != len(batch):
                raise ValueError(
                    f"batch size mismatch: expected {len(batch)}, got {len(parsed)}"
                )
            return parsed
        except (json.JSONDecodeError, ValueError, anthropic.APIError) as e:
            last_err = e
            print(f"  retry {attempt + 1}/{MAX_RETRIES}: {e}", file=sys.stderr)
            time.sleep(2 ** attempt)
    raise RuntimeError(f"batch failed after {MAX_RETRIES} retries: {last_err}")


def build_flat_input(en_events: list[dict]) -> list[tuple[int, int, str]]:
    """[(event_idx, hint_idx, text), ...] - flatten voor batching."""
    out: list[tuple[int, int, str]] = []
    for ei, ev in enumerate(en_events):
        for hi, h in enumerate(ev.get("hints", [])):
            out.append((ei, hi, h["text"]))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="src", default="events.en.json")
    ap.add_argument("--out", dest="dst", default="events.nl.json")
    ap.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    ap.add_argument("--limit", type=int, default=None,
                    help="vertaal slechts de eerste N events (voor testen)")
    args = ap.parse_args()

    src_path = Path(args.src)
    dst_path = Path(args.dst)

    if "ANTHROPIC_API_KEY" not in os.environ:
        print("FOUT: ANTHROPIC_API_KEY niet gezet.", file=sys.stderr)
        sys.exit(1)

    en_events = load_events(src_path)
    if args.limit:
        en_events = en_events[: args.limit]
    print(f"Geladen: {len(en_events)} jaren uit {src_path}", file=sys.stderr)

    # Resume: lees bestaande output als die er is
    if dst_path.exists():
        nl_events = load_events(dst_path)
        if len(nl_events) != len(en_events):
            # Pas aan op huidige input-grootte
            if len(nl_events) < len(en_events):
                # Behoud bestaande, voeg lege toe voor de rest
                for ev in en_events[len(nl_events):]:
                    nl_events.append({"year": ev["year"], "hints": [
                        {"text": "", "source": h.get("source", "")} for h in ev.get("hints", [])
                    ]})
            else:
                nl_events = nl_events[: len(en_events)]
        print(f"Resume: bestaande {dst_path} geladen", file=sys.stderr)
    else:
        nl_events = [
            {
                "year": ev["year"],
                "hints": [
                    {"text": "", "source": h.get("source", "")}
                    for h in ev.get("hints", [])
                ],
            }
            for ev in en_events
        ]

    # Build flat list, filter wat al vertaald is (resume)
    flat = build_flat_input(en_events)
    todo: list[tuple[int, int, str]] = []
    for ei, hi, text in flat:
        if not nl_events[ei]["hints"][hi]["text"]:
            todo.append((ei, hi, text))

    print(f"Te vertalen: {len(todo)} hints (van totaal {len(flat)})", file=sys.stderr)
    if not todo:
        print("Niets te doen.", file=sys.stderr)
        return

    client = anthropic.Anthropic()

    total_done = 0
    total_input_tokens = 0
    total_output_tokens = 0
    cache_read = 0
    cache_create = 0

    for batch_start in range(0, len(todo), args.batch_size):
        batch_slice = todo[batch_start : batch_start + args.batch_size]
        batch = [
            {"id": i, "text": text} for i, (_, _, text) in enumerate(batch_slice)
        ]

        try:
            translated = translate_batch(client, batch)
        except Exception as e:
            print(f"Batch faalde definitief: {e}. Bewaar progress en stop.", file=sys.stderr)
            save_events(dst_path, nl_events)
            sys.exit(1)

        # Map terug naar nl_events
        for item, (ei, hi, _) in zip(translated, batch_slice):
            nl_events[ei]["hints"][hi]["text"] = item["text"]

        total_done += len(batch_slice)
        # Save na elke batch (resume-safe)
        save_events(dst_path, nl_events)

        print(
            f"[{total_done}/{len(todo)}] batch klaar ({len(batch_slice)} hints)",
            file=sys.stderr,
        )

    save_events(dst_path, nl_events)
    print(f"\nKlaar. Geschreven naar {dst_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
