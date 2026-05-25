#!/usr/bin/env python3
"""
Vertaal events.en.json → events.nl.json met NLLB-200-distilled-600M (offline).

Beter dan Argos voor zeldzame termen (Klaagliederen ipv Lamentations,
beleegt ipv besieges). Wel ~5× trager.

Volledig session-resumable: Ctrl+C op enig moment, herstart pakt op waar je
was. Schrijft state na elk batch en aan einde van elk jaar.

Gebruik:
  ~/venvs/argos/bin/python tools/translate_events_nllb.py
  # Ctrl+C is OK, weer starten doet rest

Opties:
  --max-minutes 60      # stop na ~1 uur (voor sessie-werken)
  --max-years 100       # stop na 100 jaren
  --batch-size 32       # batch grootte (default 32)
"""

import argparse
import json
import os
import signal
import sys
import time
from pathlib import Path

import ctranslate2
import transformers

MODEL_PATH = os.environ.get(
    "NLLB_MODEL_PATH",
    str(Path.home() / ".cache" / "nllb-600m-int8"),
)
SENTINEL = "XX0XX"
SRC_LANG = "eng_Latn"
TGT_LANG = "nld_Latn"


def protect(text: str) -> str:
    # Normalize unicode chars not in NLLB's vocab → ASCII equivalents
    text = (
        text.replace("–", " - ")  # en-dash
            .replace("—", " - ")  # em-dash
            .replace("‘", "'").replace("’", "'")  # curly quotes
            .replace("“", '"').replace("”", '"')
            .replace("…", "...")  # ellipsis
            .replace(" ", " ")  # nbsp
    )
    return text.replace("____", SENTINEL)


def restore(text: str) -> str:
    # Strip any residual <unk> tokens and collapse whitespace
    text = text.replace("<unk>", "")
    text = " ".join(text.split())
    return text.replace(SENTINEL, "____")


class Translator:
    def __init__(self, model_path: str, batch_size: int = 32):
        self.tokenizer = transformers.AutoTokenizer.from_pretrained(model_path, src_lang=SRC_LANG)
        self.translator = ctranslate2.Translator(
            model_path, device="cpu", compute_type="int8", inter_threads=4
        )
        self.batch_size = batch_size

    def translate_many(self, texts: list[str]) -> list[str]:
        """Translate a list of EN texts → NL texts (batched)."""
        out: list[str] = [""] * len(texts)
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i : i + self.batch_size]
            protected = [protect(t) for t in batch]
            srcs = [
                self.tokenizer.convert_ids_to_tokens(self.tokenizer.encode(t))
                for t in protected
            ]
            results = self.translator.translate_batch(
                srcs,
                target_prefix=[[TGT_LANG]] * len(batch),
                beam_size=2,
            )
            for j, r in enumerate(results):
                target = r.hypotheses[0][1:]  # drop the target lang token
                decoded = self.tokenizer.decode(self.tokenizer.convert_tokens_to_ids(target))
                out[i + j] = restore(decoded)
        return out


def load_state(partial_path: str) -> tuple[list[dict], dict[str, str]]:
    """Load partial state (nl_data accumulated so far, plus translation cache)."""
    if not Path(partial_path).exists():
        return [], {}
    with open(partial_path) as f:
        st = json.load(f)
    return st.get("nl_data", []), st.get("cache", {})


def save_state(partial_path: str, nl_data: list[dict], cache: dict[str, str]) -> None:
    """Atomic save: write to .tmp then rename."""
    tmp = partial_path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump({"nl_data": nl_data, "cache": cache}, f, ensure_ascii=False)
    os.replace(tmp, partial_path)


# ---- Graceful shutdown ----
_should_stop = False


def _handle_sigint(signum, frame):
    global _should_stop
    if _should_stop:
        print("\n!! Tweede Ctrl+C — direct exit zonder save !!", file=sys.stderr)
        sys.exit(1)
    print("\n>> Ctrl+C ontvangen — laat huidige batch afmaken en sla op...", file=sys.stderr)
    _should_stop = True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--in", dest="in_path", default="events.en.json")
    ap.add_argument("--out", dest="out_path", default="events.nl.json")
    ap.add_argument("--partial", default="events.nl.partial.json")
    ap.add_argument("--batch-size", type=int, default=32)
    ap.add_argument("--max-minutes", type=float, default=0, help="stop after ~N minutes (0 = until done)")
    ap.add_argument("--max-years", type=int, default=0, help="stop after N years (0 = until done)")
    args = ap.parse_args()

    signal.signal(signal.SIGINT, _handle_sigint)

    with open(args.in_path) as f:
        en_data = json.load(f)

    nl_data, cache = load_state(args.partial)
    done_years = {e["year"] for e in nl_data}

    print(f"NLLB-200-distilled-600M (int8). Batch={args.batch_size}.", file=sys.stderr)
    print(f"In : {args.in_path}  ({len(en_data)} jaren)", file=sys.stderr)
    print(f"Out: {args.out_path}", file=sys.stderr)
    print(f"Resume: {len(nl_data)} jaren al gedaan, {len(cache)} teksten in cache.", file=sys.stderr)
    print(f"Te doen: {len(en_data) - len(done_years)} jaren.", file=sys.stderr)
    print("Laden NLLB...", file=sys.stderr)
    t_load_start = time.time()
    translator = Translator(MODEL_PATH, batch_size=args.batch_size)
    print(f"Geladen in {time.time()-t_load_start:.1f}s.\n", file=sys.stderr)

    t_run_start = time.time()
    years_done_this_run = 0
    n_translated = 0

    try:
        for entry in en_data:
            if _should_stop:
                break
            if args.max_years and years_done_this_run >= args.max_years:
                print(f"-- Stop: {args.max_years} jaren gedaan deze sessie", file=sys.stderr)
                break
            if args.max_minutes and (time.time() - t_run_start) / 60 >= args.max_minutes:
                print(f"-- Stop: {args.max_minutes} min limiet bereikt", file=sys.stderr)
                break
            year = entry["year"]
            if year in done_years:
                continue

            # Collect uncached texts in deterministic order
            to_translate: list[str] = []
            for h in entry["hints"]:
                if h["text"] not in cache:
                    to_translate.append(h["text"])

            if to_translate:
                # Dedupe within this year
                uniq = list(dict.fromkeys(to_translate))
                translations = translator.translate_many(uniq)
                for en, nl in zip(uniq, translations):
                    cache[en] = nl
                n_translated += len(uniq)

            # Build NL entry
            nl_data.append({
                "year": year,
                "hints": [{"text": cache[h["text"]], "source": h["source"]} for h in entry["hints"]],
            })
            done_years.add(year)
            years_done_this_run += 1

            # Save partial after each year
            save_state(args.partial, nl_data, cache)

            if years_done_this_run % 5 == 0 or years_done_this_run == 1:
                el = time.time() - t_run_start
                rate = n_translated / el if el > 0 else 0
                remaining_years = len(en_data) - len(done_years)
                avg_events_per_year = n_translated / max(years_done_this_run, 1)
                eta_h = remaining_years * avg_events_per_year / rate / 3600 if rate > 0 else 0
                print(
                    f"  [{len(done_years)}/{len(en_data)}] y={year} ({len(entry['hints'])} events) | "
                    f"vertaald: {n_translated} ({rate:.2f}/s) | ETA ~{eta_h:.1f}u",
                    file=sys.stderr,
                )
    finally:
        save_state(args.partial, nl_data, cache)

    if len(done_years) == len(en_data):
        # Finished: write final + cleanup
        with open(args.out_path, "w", encoding="utf-8") as f:
            json.dump(nl_data, f, ensure_ascii=False, indent=2)
        Path(args.partial).unlink(missing_ok=True)
        print(f"\n✓ KLAAR — {len(nl_data)} jaren naar {args.out_path}", file=sys.stderr)
    else:
        remaining = len(en_data) - len(done_years)
        print(
            f"\n⏸  Sessie gestopt. {len(done_years)}/{len(en_data)} jaren klaar, "
            f"{remaining} te gaan. Herstart om door te gaan.",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
