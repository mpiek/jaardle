#!/usr/bin/env python3
"""
Bouwt events.en.json door alle jaarpagina's te scrapen van English Wikipedia.

Gebruikt de MediaWiki Action API (action=parse&prop=wikitext) i.p.v. HTML
scrapen — robuuster en netter voor Wikipedia. Pakt ALLE bruikbare events
per jaar (geen 3-per-jaar limiet meer). Vertaling naar NL gebeurt apart
(bijv. Google Translate API).

Gebruik:
  python3 tools/build_events.py --from -2000 --to 2026 --out events.en.json
"""

import argparse
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

USER_AGENT = (
    "Jaardle-DataBuilder/2.0 "
    "(https://github.com/mpiek/jaardle; matthijs.piek@easyflex.nl)"
)
API_URL = "https://en.wikipedia.org/w/api.php"
DEFAULT_DELAY = 0.2
MIN_LEN = 30
MAX_LEN = 400


def page_candidates(year: int) -> list[str]:
    """Titles to try on English Wikipedia for a given year."""
    if year < 0:
        return [f"{abs(year)} BC"]
    if year == 0:
        return []
    if year < 100:
        return [f"AD {year}", str(year)]
    return [str(year), f"AD {year}"]


def fetch_wikitext(title: str, timeout: int = 30) -> tuple[str, str] | None:
    """Fetch raw wikitext via Action API. Returns (wikitext, resolved_title)."""
    params = {
        "action": "parse",
        "page": title,
        "prop": "wikitext",
        "format": "json",
        "formatversion": "2",
        "redirects": "1",
    }
    url = f"{API_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise
    if "error" in data:
        return None
    parse = data.get("parse")
    if not parse:
        return None
    return parse["wikitext"], parse["title"]


def fetch_year(year: int) -> tuple[str, str] | None:
    for title in page_candidates(year):
        result = fetch_wikitext(title)
        if result is not None:
            return result
    return None


EVENTS_HEADER_RE = re.compile(
    r"^==\s*Events(?:\s+and\s+(?:trends|culture))?\s*==\s*$",
    re.MULTILINE,
)
NEXT_L2_HEADER_RE = re.compile(r"^==[^=].*?==\s*$", re.MULTILINE)


def extract_events_section(wikitext: str) -> str | None:
    """Slice out everything from '== Events ==' until the next level-2 header."""
    m = EVENTS_HEADER_RE.search(wikitext)
    if not m:
        return None
    start = m.end()
    nxt = NEXT_L2_HEADER_RE.search(wikitext, pos=start)
    return wikitext[start : nxt.start()] if nxt else wikitext[start:]


def strip_wikitext(s: str) -> str:
    """Convert wikitext fragment to plain text."""
    s = re.sub(r"<ref[^>]*?/>", "", s)
    s = re.sub(r"<ref[^>]*>.*?</ref>", "", s, flags=re.DOTALL)
    s = re.sub(r"<!--.*?-->", "", s, flags=re.DOTALL)
    # Templates {{...}} — drop, peel nested layers
    while True:
        new = re.sub(r"\{\{[^{}]*\}\}", "", s)
        if new == s:
            break
        s = new
    # File/Image links contain pipes & nested links — drop them outright
    s = re.sub(r"\[\[File:[^\]]*?\]\]", "", s, flags=re.IGNORECASE)
    s = re.sub(r"\[\[Image:[^\]]*?\]\]", "", s, flags=re.IGNORECASE)
    # [[Target|Display]] -> Display
    s = re.sub(r"\[\[([^|\]]+)\|([^\]]+)\]\]", r"\2", s)
    # [[Target]] -> Target
    s = re.sub(r"\[\[([^\]]+)\]\]", r"\1", s)
    # External links [http://… label] -> label, bare [http://…] -> drop
    s = re.sub(r"\[https?://\S+\s+([^\]]+)\]", r"\1", s)
    s = re.sub(r"\[https?://\S+\]", "", s)
    s = re.sub(r"'''([^']+)'''", r"\1", s)
    s = re.sub(r"''([^']+)''", r"\1", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


PREFIX_PATTERNS = [
    re.compile(r"^\d{1,2}\s*[-–.]\s*"),
    re.compile(r"^[A-Z][a-zA-Z]+\s+\d{1,2}\s*[-–.:]\s*"),
    re.compile(r"^\([^)]{1,40}\)\s*[-–:]\s*"),
    re.compile(r"^[A-Z][a-z]{2,15}\s*[-–:]\s*"),
]


def strip_prefixes(s: str) -> str:
    for _ in range(3):
        for pat in PREFIX_PATTERNS:
            new = pat.sub("", s)
            if new != s:
                s = new.strip()
                break
        else:
            break
    return s


def censor_year(s: str, year: int) -> str:
    a = abs(year)
    s = re.sub(rf"\b{a}\s*BC\b", "____", s)
    s = re.sub(rf"\bAD\s*{a}\b", "____", s)
    s = re.sub(rf"\b{a}\b", "____", s)
    return s


def top_level_bullets(section: str) -> list[str]:
    """Yield only top-level '* ' bullets; skip nested ('**', '*#', '*:')."""
    out = []
    for line in section.splitlines():
        if not line.startswith("*"):
            continue
        if len(line) > 1 and line[1] in "*#:":
            continue
        out.append(line[1:].strip())
    return out


def process_section(section: str, year: int) -> list[str]:
    out = []
    seen = set()
    for raw in top_level_bullets(section):
        s = strip_wikitext(raw)
        s = strip_prefixes(s)
        s = censor_year(s, year)
        if not (MIN_LEN <= len(s) <= MAX_LEN):
            continue
        if s.count("____") > 3:
            continue
        if s in seen:
            continue
        seen.add(s)
        out.append(s)
    return out


def canonical_url(resolved_title: str) -> str:
    return f"https://en.wikipedia.org/wiki/{urllib.parse.quote(resolved_title.replace(' ', '_'))}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="year_from", type=int, default=-2000)
    ap.add_argument("--to", dest="year_to", type=int, default=2026)
    ap.add_argument("--out", dest="out", required=True)
    ap.add_argument("--delay", type=float, default=DEFAULT_DELAY)
    args = ap.parse_args()

    out: list[dict] = []
    total_events = 0
    n_done = 0
    n_missing = 0

    for y in range(args.year_from, args.year_to + 1):
        if y == 0:
            continue
        try:
            result = fetch_year(y)
            if result is None:
                n_missing += 1
                print(f"{y}: geen pagina", file=sys.stderr)
                time.sleep(args.delay)
                continue
            wikitext, resolved = result
            section = extract_events_section(wikitext)
            if section is None:
                print(f"{y}: geen Events-sectie ({resolved})", file=sys.stderr)
                time.sleep(args.delay)
                continue
            events = process_section(section, y)
            if not events:
                print(f"{y}: 0 bruikbare events ({resolved})", file=sys.stderr)
                time.sleep(args.delay)
                continue
            source = canonical_url(resolved)
            out.append({
                "year": y,
                "hints": [{"text": t, "source": source} for t in events],
            })
            total_events += len(events)
            n_done += 1
            if n_done % 25 == 0:
                print(f"  [{n_done}] {y}: {len(events)} events (totaal {total_events})", file=sys.stderr)
            time.sleep(args.delay)
        except (urllib.error.URLError, TimeoutError) as e:
            print(f"{y}: FOUT {e}", file=sys.stderr)
            time.sleep(args.delay)

    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(
        f"\nGeschreven: {len(out)} jaren, {total_events} events naar {args.out} "
        f"({n_missing} jaren zonder pagina)",
        file=sys.stderr,
    )


if __name__ == "__main__":
    main()
