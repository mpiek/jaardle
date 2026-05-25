# Jaardle

Een Nederlandstalig year-guessing puzzelspel (Wordle voor jaartallen).

Elke dag krijg je één historische gebeurtenis en moet je raden in welk jaar het gebeurde. Per gok zie je een gekleurde range-badge en kun je extra hints opvragen (tekst of richting). Je hebt 6 pogingen.

## Live

➡️ **<https://mpiek.github.io/jaardle/>**

## Spelen

- **Dagelijkse Jaardle** — elke dag één puzzel, voor iedereen gelijk
- **Nieuw spel** — oneindig rondjes, willekeurige gebeurtenis
- Range-badges:
  - 🟩 0 jaar — 🟪 1-2 — 🟨 3-10 — 🟧 11-25 — 🟥 26-50 — 🟫 51-200 — ⬜ 200+

## Dataset

2.447 jaartallen (753 v.Chr. tot 2026), 46.506 historische feiten, Nederlands.

| Bestand | Inhoud |
|---|---|
| `events.en.json` | Engelse bron, gescraped van Wikipedia |
| `events.nl.json` | Nederlandse vertaling (canonical, met sources) |
| `events.min.json` | Compacte runtime-versie voor de webapp |

De vertaling is LLM-geassisteerd (Gemini 2.5 Flash + Claude). Jaartal-spoilers (vermeldingen binnen ±2 van het puzzle-jaar) zijn automatisch vervangen door `____`.

## Lokaal draaien

```bash
git clone https://github.com/mpiek/jaardle.git
cd jaardle
python3 -m http.server 8000
# Open http://localhost:8000
```

## Architectuur

Pure static HTML/CSS/JS. Geen build-stap, geen framework, geen backend. State in `localStorage`. Dagelijkse cyclus seeded vanaf 2026-01-01.

```
index.html      — UI
style.css       — Donkere thema + range-badges
game.js         — Game logic, year-input, share, daily/free modes
events.min.json — Runtime data (geladen via fetch)
tools/          — Build- en cleanup-scripts
```

## Re-build de dataset

```bash
python3 tools/build_events.py        # scrape EN Wikipedia → events.en.json
python3 tools/translate_batches.py   # split → .translate-batches/batch_NNN_in.json
# (vertaal batches met LLM van keuze, output naar batch_NNN_out.json)
python3 .translate-batches/merge.py  # merge → events.nl.json
python3 tools/clean_spoilers.py      # remove year-spoilers
python3 tools/build_compact.py       # build events.min.json
```

## Licenties

- **Code** (HTML, CSS, JS, Python): [MIT](LICENSE)
- **Dataset** (`events.*.json`): [CC BY-SA 4.0](LICENSE-DATA.md), afgeleid van Engelse Wikipedia

## Bijdragen

Issues en PRs welkom. Met name interessant:
- Vertaalfouten in `events.nl.json` (open een issue met het event-jaar)
- UI-verbeteringen
- Extra puzzle-modi (eeuw-modus, decennium-modus, etc.)
