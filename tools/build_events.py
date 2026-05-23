#!/usr/bin/env python3
"""
Bouwt events.<lang>.json door jaarpagina's te scrapen van Wikipedia.

Werkt voor zowel NL (nl.wikipedia.org) als EN (en.wikipedia.org). Voor elk jaar
in de gevraagde range:

- Probeert kandidaat-URLs (gewone, AD_<X>, <X>_BC, <X>_v.Chr.)
- Extracteert de Events / Gebeurtenissen-sectie
- Strip lelijke prefixes en jaarvermeldingen (anti-spoiler)
- Filtert op lengte
- Kiest deterministisch 3 events per jaar (seed = jaar)

Gebruik:
  python3 tools/build_events.py --lang en --from -2000 --to 2024 --out events.en.json
  python3 tools/build_events.py --lang nl --from 1900   --to 2024 --out events.nl.json
"""

import argparse
import html
import json
import random
import re
import sys
import time
import urllib.error
import urllib.request

USER_AGENT = "Jaardle-DataBuilder/1.0 (https://github.com/mpiek/jaardle)"
DEFAULT_DELAY = 0.4
MIN_LEN = 40
MAX_LEN = 320
HINTS_PER_YEAR = 3


LANG_CONFIG = {
    "nl": {
        "host": "nl.wikipedia.org",
        "section_ids": ["Gebeurtenissen"],
        "url_candidates": lambda y: (
            [f"https://nl.wikipedia.org/wiki/{abs(y)}_v.Chr."] if y < 0
            else [f"https://nl.wikipedia.org/wiki/{y}"] if y > 0
            else []
        ),
    },
    "en": {
        "host": "en.wikipedia.org",
        # BC years vaak 'Events_and_trends'; oudere AD soms 'Events_and_culture'
        "section_ids": ["Events", "Events_and_trends", "Events_and_culture"],
        "url_candidates": lambda y: (
            [f"https://en.wikipedia.org/wiki/{abs(y)}_BC"] if y < 0
            else [] if y == 0
            else [f"https://en.wikipedia.org/wiki/AD_{y}", f"https://en.wikipedia.org/wiki/{y}"] if y < 100
            else [f"https://en.wikipedia.org/wiki/{y}", f"https://en.wikipedia.org/wiki/AD_{y}"]
        ),
    },
}


def fetch(url: str, timeout: int = 20) -> str | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise


def fetch_year(year: int, lang: str) -> str | None:
    for url in LANG_CONFIG[lang]["url_candidates"](year):
        src = fetch(url)
        if src is not None:
            return src
    return None


PREFIX_PATTERNS = [
    re.compile(r"^\d{1,2}\s*[-–.]\s*"),                        # "13 - "
    re.compile(r"^[A-Za-zÀ-ſ]+\s+\d{1,2}\s*[-–.]\s*"),  # "January 13 - "
    re.compile(r"^\([^)]{1,30}\)\s*[-–:]\s*"),                 # "(Italy) - "
    re.compile(r"^[A-Z][a-z]{2,15}\s*[-–:]\s*"),               # "Italy - "
]


def clean_bullet(li: str, year: int) -> str:
    s = re.sub(r"<sup[^>]*>.*?</sup>", "", li, flags=re.DOTALL)
    s = re.sub(r"<style[^>]*>.*?</style>", "", s, flags=re.DOTALL)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = re.sub(r"\s+", " ", s).strip()

    # Strip lelijke prefixes iteratief (kan combinaties zijn)
    for _ in range(3):
        for pat in PREFIX_PATTERNS:
            new = pat.sub("", s)
            if new != s:
                s = new.strip()
                break
        else:
            break

    # Anti-spoiler: verwijder jaarvermeldingen
    abs_y = abs(year)
    s = re.sub(rf"\b{abs_y}\s*BC\b", "____", s)
    s = re.sub(rf"\bAD\s*{abs_y}\b", "____", s)
    s = re.sub(rf"\b{abs_y}\b", "____", s)
    # Ook v.Chr. variant
    s = re.sub(rf"\b{abs_y}\s*v\.?\s*Chr\.?", "____", s)

    return s.strip()


def extract_events(src: str, year: int, section_ids: list[str]) -> list[str]:
    # Probeer kandidaat section-IDs op volgorde, pak inhoud tot volgende <h2>
    section = None
    for sid in section_ids:
        pattern = rf'<h2 id="{sid}">.*?</h2>(.*?)(?=<h2[\s>])'
        m = re.search(pattern, src, re.DOTALL)
        if m:
            section = m.group(1)
            break
    if section is None:
        return []
    lis = re.findall(r"<li[^>]*>(.*?)</li>", section, re.DOTALL)

    out = []
    for li in lis:
        # Skip geneste bullets (subitems) — gewoon de top-level
        s = clean_bullet(li, year)
        if not (MIN_LEN <= len(s) <= MAX_LEN):
            continue
        if s.count("____") > 2:
            continue
        # Skip bullets die te veel uit losse zinnen lijken (bv. lijstjes met komma's)
        if s.count(",") > 5 and "." not in s[: len(s) // 2]:
            continue
        out.append(s)
    return out


def pick_hints(events: list[str], year: int, n: int = HINTS_PER_YEAR) -> list[str]:
    if len(events) <= n:
        return events
    rng = random.Random(year)
    return rng.sample(events, n)


def primary_source_url(year: int, lang: str) -> str:
    return LANG_CONFIG[lang]["url_candidates"](year)[0]


def build_entry(year: int, events: list[str], lang: str) -> dict | None:
    picked = pick_hints(events, year)
    if len(picked) < 1:
        return None
    source = primary_source_url(year, lang)
    hints = [{"text": t, "source": source} for t in picked]
    return {"year": year, "hints": hints}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", choices=("nl", "en"), default="en")
    ap.add_argument("--from", dest="year_from", type=int, default=-2000)
    ap.add_argument("--to", dest="year_to", type=int, default=2026)
    ap.add_argument("--out", dest="out", required=True)
    ap.add_argument("--delay", type=float, default=DEFAULT_DELAY)
    args = ap.parse_args()

    cfg = LANG_CONFIG[args.lang]
    section_ids = cfg["section_ids"]

    out: list[dict] = []
    total = 0
    for y in range(args.year_from, args.year_to + 1):
        if y == 0:
            continue
        try:
            src = fetch_year(y, args.lang)
            if src is None:
                print(f"{y}: geen pagina", file=sys.stderr)
                time.sleep(args.delay)
                continue
            evs = extract_events(src, y, section_ids)
            entry = build_entry(y, evs, args.lang)
            if entry and len(entry["hints"]) >= 1:
                out.append(entry)
                total += 1
                if total % 25 == 0:
                    print(f"  [{total}] {y}: {len(evs)} -> {len(entry['hints'])}", file=sys.stderr)
            else:
                print(f"{y}: 0 bruikbare events", file=sys.stderr)
            time.sleep(args.delay)
        except (urllib.error.URLError, TimeoutError) as e:
            print(f"{y}: FOUT {e}", file=sys.stderr)
            time.sleep(args.delay)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"\nGeschreven: {len(out)} jaren naar {args.out}", file=sys.stderr)


if __name__ == "__main__":
    main()
