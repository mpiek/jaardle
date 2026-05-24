#!/usr/bin/env python3
"""
Vertaal events.en.json → events.nl.json met Argos Translate (en→nl, offline).

Strategie:
- ____ wordt eerst vervangen door 'XX0XX' (Argos behoudt deze token bij vertaling)
- Na vertaling weer terug naar ____
- Resumable: schrijft elke N events de partial-file zodat we niet opnieuw beginnen na crash

Gebruik (in argos venv):
  ~/venvs/argos/bin/python tools/translate_events.py
"""

import argparse
import json
import sys
import time
from pathlib import Path

import argostranslate.translate

SENTINEL = "XX0XX"


def protect(text: str) -> str:
    return text.replace("____", SENTINEL)


def restore(text: str) -> str:
    # Argos kan witruimte rondom de sentinel variëren — handle "XX0XX" of "XX 0 XX" etc.
    return text.replace(SENTINEL, "____")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", default="events.en.json")
    ap.add_argument("--out", dest="out_path", default="events.nl.json")
    ap.add_argument("--partial", default="events.nl.partial.json",
                    help="resume cache (rename to --out at the end)")
    ap.add_argument("--save-every", type=int, default=100,
                    help="save partial elke N events")
    args = ap.parse_args()

    with open(args.in_path) as f:
        en_data = json.load(f)

    # Load partial if it exists — resume from there
    done: dict[str, str] = {}  # en text → nl text
    nl_data: list[dict] = []
    last_year_done = None
    if Path(args.partial).exists():
        with open(args.partial) as f:
            partial = json.load(f)
        nl_data = partial.get("nl_data", [])
        done = partial.get("cache", {})
        if nl_data:
            last_year_done = nl_data[-1]["year"]
        print(f"Resume: {len(nl_data)} jaren al gedaan (laatste: {last_year_done}), "
              f"{len(done)} unieke teksten in cache", file=sys.stderr)

    # Warm-up: ensures the model is loaded
    argostranslate.translate.translate("warmup", "en", "nl")

    t_start = time.time()
    n_translated_this_run = 0
    n_skipped_cache = 0

    completed_years = {e["year"] for e in nl_data}

    for entry in en_data:
        year = entry["year"]
        if year in completed_years:
            continue

        new_hints = []
        for hint in entry["hints"]:
            en = hint["text"]
            if en in done:
                nl_text = done[en]
                n_skipped_cache += 1
            else:
                protected = protect(en)
                try:
                    translated = argostranslate.translate.translate(protected, "en", "nl")
                except Exception as ex:
                    print(f"y={year}: vertaalfout — gebruik origineel: {ex}", file=sys.stderr)
                    translated = protected
                nl_text = restore(translated)
                done[en] = nl_text
                n_translated_this_run += 1
            new_hints.append({"text": nl_text, "source": hint["source"]})

        nl_data.append({"year": year, "hints": new_hints})

        # Save partial periodically
        if (n_translated_this_run + n_skipped_cache) and (n_translated_this_run + n_skipped_cache) % args.save_every == 0:
            with open(args.partial, "w", encoding="utf-8") as f:
                json.dump({"nl_data": nl_data, "cache": done}, f, ensure_ascii=False)
            elapsed = time.time() - t_start
            rate = n_translated_this_run / elapsed if elapsed > 0 else 0
            remaining = len(en_data) - len(nl_data)
            eta_min = remaining * (len(entry["hints"]) or 5) / rate / 60 if rate > 0 else 0
            print(f"  [{len(nl_data)}/{len(en_data)}] y={year} | "
                  f"vertaald nu: {n_translated_this_run} ({rate:.1f}/s), cache: {n_skipped_cache} | "
                  f"ETA ~{eta_min:.0f} min", file=sys.stderr)

    # Final write
    with open(args.out_path, "w", encoding="utf-8") as f:
        json.dump(nl_data, f, ensure_ascii=False, indent=2)
    # Cleanup partial
    Path(args.partial).unlink(missing_ok=True)

    elapsed_min = (time.time() - t_start) / 60
    print(f"\nKlaar in {elapsed_min:.1f} min", file=sys.stderr)
    print(f"  {n_translated_this_run} nieuwe vertalingen, {n_skipped_cache} uit cache", file=sys.stderr)
    print(f"  → {args.out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
