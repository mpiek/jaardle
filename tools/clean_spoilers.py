#!/usr/bin/env python3
"""Detect & clean year-spoilers in events.nl.json.

Strategy:
- For each hint, find 4-digit AD years and BC patterns (NL: "v.Chr.", "voor Christus", legacy "BC").
- Compute distance to event.year.
- Auto-fix: distance ≤ 2 → replace year with ____ (keep BC/v.Chr. marker).
- Report: 3 ≤ distance ≤ 10 → manual review.
- Ignore: distance > 10 (likely historical context).
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "events.nl.json"
OUTPUT = ROOT / "events.nl.json"
REPORT = ROOT / "tools" / "spoilers_review.txt"

AUTO_THRESHOLD = 2
REVIEW_THRESHOLD = 10

AD_RE = re.compile(r'(?<!\d)(\d{4})(?!\d)')
BC_RE = re.compile(r'(?<!\d)(\d{1,4})(\s*(?:v\.?\s*Chr\.?|voor\s+Christus|BCE?|BC))', re.IGNORECASE)


def find_year_mentions(text, true_year):
    """Return list of (start, end, year_value, marker_match_obj) tuples."""
    mentions = []
    if true_year > 0:
        # Look for plain AD years
        for m in AD_RE.finditer(text):
            y = int(m.group(1))
            if 100 <= y <= 2100:
                mentions.append((m.start(1), m.end(1), y, None))
    else:
        # BC events: look for years explicitly marked BC/v.Chr.
        for m in BC_RE.finditer(text):
            y = -int(m.group(1))
            mentions.append((m.start(1), m.end(1), y, m))
    return mentions


def clean_hint(text, true_year, stats):
    """Replace near-year mentions with ____. Returns (new_text, replacements_made)."""
    mentions = find_year_mentions(text, true_year)
    # Sort descending by start so replacements don't shift indices
    mentions.sort(key=lambda x: -x[0])
    new = text
    replacements = 0
    for start, end, y, _ in mentions:
        dist = abs(y - true_year)
        if dist <= AUTO_THRESHOLD:
            new = new[:start] + "____" + new[end:]
            replacements += 1
            stats['auto_fixed'] += 1
        elif dist <= REVIEW_THRESHOLD:
            stats['review'].append((true_year, y, dist, text))
        else:
            stats['far_ignored'] += 1
    return new, replacements


def main():
    data = json.load(open(INPUT, encoding="utf-8"))
    stats = {'auto_fixed': 0, 'far_ignored': 0, 'review': []}
    hints_touched = 0
    events_touched = 0

    for ev in data:
        ev_touched = False
        for hint in ev['hints']:
            new_text, n = clean_hint(hint['text'], ev['year'], stats)
            if n > 0:
                hint['text'] = new_text
                hints_touched += 1
                ev_touched = True
        if ev_touched:
            events_touched += 1

    json.dump(data, open(OUTPUT, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

    # Report
    print(f"Auto-fixed: {stats['auto_fixed']} year-mentions (distance ≤ {AUTO_THRESHOLD})")
    print(f"Hints touched: {hints_touched}, events touched: {events_touched}")
    print(f"For manual review (distance {AUTO_THRESHOLD+1}-{REVIEW_THRESHOLD}): {len(stats['review'])}")
    print(f"Ignored (distance > {REVIEW_THRESHOLD}): {stats['far_ignored']}")

    # Write review file
    with open(REPORT, "w", encoding="utf-8") as f:
        f.write(f"# Spoilers for manual review (distance {AUTO_THRESHOLD+1}-{REVIEW_THRESHOLD})\n\n")
        for true_y, found_y, dist, text in sorted(stats['review'], key=lambda x: x[2]):
            f.write(f"puzzle={true_y}  found={found_y}  dist=±{dist}\n  {text}\n\n")
    print(f"Review report: {REPORT}")


if __name__ == "__main__":
    main()
