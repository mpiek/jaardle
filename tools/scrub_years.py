#!/usr/bin/env python3
"""
Scrub jaartal-leakage uit events JSON. Vervangt jaarvermeldingen door ____
om Jaardle anti-spoiler te houden.

Strategie (van zeker → onzeker):
- Altijd: <n> BC, AD <n>, <n> v.Chr., jaartal in haakjes (1492)
- Met voorzetsel: in/since/by/from/until/during/around/circa/c.\\s/approximately
  + <4-digit year> — duidelijke jaarverwijzing
- Kale 4-cijferige getallen blijven staan (vaak quantities, false positives)

Gebruik:
  python3 tools/scrub_years.py events.en.json --dry-run        # toon wat zou veranderen
  python3 tools/scrub_years.py events.en.json --in-place       # overschrijf
  python3 tools/scrub_years.py events.en.json --out events.en.clean.json
"""

import argparse
import json
import re
import sys
from collections import Counter

CENSOR = "____"

# FULL_PATTERNS: replace entire match with CENSOR
FULL_PATTERNS = [
    # "<n> BC", "<n> BCE", "<n> CE" — allow comma: "1012, BC"
    re.compile(r"\b\d{1,4}[,\s]+(?:BCE|BC|CE)\b"),
    re.compile(r"\b\d{1,4}(?:BCE|BC|CE)\b"),
    # "AD <n>"
    re.compile(r"\bAD\s+\d{1,4}\b"),
    # Dutch "<n> v.Chr." / "n.Chr."
    re.compile(r"\b\d{1,4}\s*(?:v|n)\.?\s*Chr\.?", re.IGNORECASE),
    # Year (or year-range) in parens: (1492), (314), (1229–1249), (1064-65)
    re.compile(r"\((?:c\.?\s*|circa\s*|AD\s*)?\d{3,4}(?:\s*[-–—/]\s*\d{1,4})?\)"),
    # 4-digit year-range: "1229–1249", "1064-65", "1947/48", "1127/1126"
    # First part is 1000-2099 (likely AD year); second can be short (abbrev)
    re.compile(r"\b(?:1\d{3}|20\d{2})\s*[-–—/]\s*\d{1,4}\b"),
]

# INNER_PATTERNS: keep surrounding text, replace only the captured group
INNER_PATTERNS = [
    # Sentence-start year prefix: "1610 - description" / "1610: description" / "1610—desc"
    re.compile(r"(?:^|(?<=[.!?]\s))(\d{3,4})\s*[-–—:/]"),
    # "between X and Y" / "from X to Y" — both are years (first captured, second left for next pass)
    re.compile(r"\b(?:between|from)\s+(\d{3,4})\s+(?:and|to)\s+\d{3,4}\b", re.IGNORECASE),
    re.compile(r"\bbetween\s+\d{3,4}\s+and\s+(\d{3,4})\b", re.IGNORECASE),
    re.compile(r"\bfrom\s+\d{3,4}\s+to\s+(\d{3,4})\b", re.IGNORECASE),
]

# Year prepositions — when directly followed by a 4-digit number, that's a year
YEAR_PREPS = (
    r"in|since|by|from|until|till|during|around|about|see|"
    r"circa|c\.|approximately|the\s+year|year\s+of|"
    # Dutch equivalents (voor toekomstige NL-input)
    r"sinds|tot|tijdens|rond|ca\.|omstreeks|in\s+het\s+jaar"
)
PREP_YEAR_RE = re.compile(
    rf"\b(?:{YEAR_PREPS})\s+(\d{{3,4}})\b",
    re.IGNORECASE,
)

# Month-name + year: "April 1077", "May 2019"
MONTH_YEAR_RE = re.compile(
    r"\b(?:January|February|March|April|May|June|July|August|September|October|November|December|"
    r"januari|februari|maart|april|mei|juni|juli|augustus|september|oktober|november|december)"
    r"(?:\s+\d{1,2},?)?\s+(\d{4})\b",
    re.IGNORECASE,
)

# "(d. 1066)", "(b. 1066)", "(r. 1066-1100)", "(c. 1066)" — date in parens with marker
DATE_PARENS_RE = re.compile(
    r"\((?:d|b|r|fl|c|circa)\.?\s+(\d{3,4})(?:\s*[-–—]\s*\d{3,4})?\)",
    re.IGNORECASE,
)

# Year-adjective for nouns: "the 1853 Christmas carol", "Papal Interdict of 1208", "treaty of 1082"
# Conservative: require lowercase article/preposition + year + capitalized noun
# OR: noun + "of " + year (treaty/massacre/interdict of YYYY)
NOUN_OF_YEAR_RE = re.compile(
    r"\b(?:treaty|treaties|battle|battles|siege|sieges|war|wars|act|acts|massacre|"
    r"revolt|revolution|interdict|edict|peace|invasion|raid|earthquake|eruption|"
    r"crisis|panic|plague|famine|riot|riots|coup|constitution|charter|"
    r"verdrag|slag|oorlog|opstand)\s+of\s+(\d{3,4})\b",
    re.IGNORECASE,
)

# List of years: "1935, 1986, 1994, 2007" — when 2+ comma-separated 4-digit numbers occur
YEAR_LIST_RE = re.compile(
    r"\b(\d{4})\s*,\s*(?=\d{4}\s*[,.])",
)

# Templates artefacts: {{cite ...}} en partial templates die door scraper niet gefilterd zijn
TEMPLATE_JUNK_RE = re.compile(r"\{\{[^}]*\}?\}?")

# Range patterns — to be applied AFTER initial passes, when one side is already ____ or BC.
# These catch the "naked" companion of a range like "1787-____" or "between 1206 and 1180 BC".
RANGE_PATTERNS = [
    # "<n>-____", "<n> – ____", "<n>—____"  (also reversed)
    re.compile(rf"\b(\d{{3,4}})\s*[-–—]\s*{re.escape(CENSOR)}"),
    re.compile(rf"{re.escape(CENSOR)}\s*[-–—]\s*(\d{{3,4}})\b"),
    # "<n> and ____", "<n> to ____", "<n> or ____"
    re.compile(rf"\b(\d{{3,4}})\s+(?:and|to|or)\s+{re.escape(CENSOR)}", re.IGNORECASE),
    re.compile(rf"{re.escape(CENSOR)}\s+(?:and|to|or)\s+(\d{{3,4}})\b", re.IGNORECASE),
    # "<n>-<n> BC", "<n>–<n> BC" — both numbers are years
    re.compile(rf"\b(\d{{3,4}})\s*[-–—]\s*\d{{1,4}}\s*BC\b"),
    # "between <n> and <n>(BC|AD)" — first number is the leak
    re.compile(rf"\b(?:between|from)\s+(\d{{3,4}})\s+(?:and|to)\s+\d{{1,4}}\s*(?:BC|AD)?\b", re.IGNORECASE),
]


def scrub_text(text: str) -> tuple[str, list[str]]:
    """Apply scrubbing patterns. Returns (scrubbed, list of original tokens removed)."""
    removed: list[str] = []

    def replace_group_0(m):
        removed.append(m.group(0))
        return CENSOR

    def replace_group_1(m):
        # Preserve surrounding text, replace just the captured number
        removed.append(m.group(1))
        return m.group(0).replace(m.group(1), CENSOR)

    for pat in FULL_PATTERNS:
        text = pat.sub(replace_group_0, text)
    for pat in INNER_PATTERNS:
        text = pat.sub(replace_group_1, text)
    text = PREP_YEAR_RE.sub(replace_group_1, text)
    text = MONTH_YEAR_RE.sub(replace_group_1, text)
    text = DATE_PARENS_RE.sub(replace_group_0, text)
    text = NOUN_OF_YEAR_RE.sub(replace_group_1, text)
    text = YEAR_LIST_RE.sub(replace_group_1, text)
    # Strip template junk that leaked through the scraper
    if "{{" in text or "}}" in text:
        text = TEMPLATE_JUNK_RE.sub("", text)
        text = re.sub(r"\s+", " ", text).strip()

    # Iterate range patterns until stable — each pass may expose new neighbours
    for _ in range(5):
        before = text
        for pat in RANGE_PATTERNS:
            text = pat.sub(replace_group_1, text)
        if text == before:
            break

    # Collapse consecutive ____ runs (e.g. "____ ____" → "____")
    text = re.sub(rf"{re.escape(CENSOR)}(?:\s+{re.escape(CENSOR)})+", CENSOR, text)
    return text, removed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("input")
    ap.add_argument("--out", help="output path (default: alongside input with .clean.json)")
    ap.add_argument("--in-place", action="store_true", help="overwrite input file")
    ap.add_argument("--dry-run", action="store_true", help="alleen rapport, niets wegschrijven")
    ap.add_argument(
        "--max-censored", type=int, default=4,
        help="drop event als er > N ____ tokens overblijven (default 4)",
    )
    ap.add_argument("--min-len", type=int, default=20, help="drop event korter dan dit na scrub")
    ap.add_argument("--show", type=int, default=20, help="aantal voorbeelden in rapport")
    args = ap.parse_args()

    if not args.dry_run and not args.in_place and not args.out:
        ap.error("specify --in-place, --out, or --dry-run")

    with open(args.input) as f:
        data = json.load(f)

    n_events = 0
    n_scrubbed = 0
    n_dropped = 0
    examples: list[tuple[int, str, str]] = []  # (year, before, after)
    token_counter: Counter = Counter()

    for entry in data:
        new_hints = []
        for hint in entry["hints"]:
            n_events += 1
            before = hint["text"]
            after, removed = scrub_text(before)
            if removed:
                n_scrubbed += 1
                token_counter.update(removed)
                if len(examples) < args.show:
                    examples.append((entry["year"], before, after))
            if len(after) < args.min_len or after.count(CENSOR) > args.max_censored:
                n_dropped += 1
                continue
            hint["text"] = after
            new_hints.append(hint)
        entry["hints"] = new_hints

    data = [e for e in data if e["hints"]]

    print(f"Totaal events: {n_events}", file=sys.stderr)
    print(f"Gescrubd: {n_scrubbed}", file=sys.stderr)
    print(f"Gedropt (te kort/te veel ____): {n_dropped}", file=sys.stderr)
    print(f"Top tokens verwijderd:", file=sys.stderr)
    for tok, n in token_counter.most_common(15):
        print(f"  {n:4}× {tok!r}", file=sys.stderr)
    print(f"\nVoorbeelden:", file=sys.stderr)
    for y, b, a in examples:
        print(f"  year={y}", file=sys.stderr)
        print(f"    BEFORE: {b}", file=sys.stderr)
        print(f"    AFTER : {a}", file=sys.stderr)

    if args.dry_run:
        print("\n(dry-run, niets weggeschreven)", file=sys.stderr)
        return

    out_path = args.input if args.in_place else (args.out or args.input.replace(".json", ".clean.json"))
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\nWeggeschreven naar {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()
