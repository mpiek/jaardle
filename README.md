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

2.322 jaartallen (679 v.Chr. tot 2026), 40.138 historische feiten, Nederlands.

Runtime laadt `bundle.bin` (XOR+gzip van `events.min.json`). De ruwe bronbestanden (`events.en.json`, `events.nl.json`, `events.min.json`) en alle scrape/translate/build-scripts staan in een aparte (private) repo: **`mpiek/jaardle-tools`**.

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
index.html  — UI
style.css   — Donkere thema + range-badges
game.js     — Game logic, year-input, share, daily/free modes
bundle.bin  — Geobfusceerde runtime data (geladen via fetch)
```

## Re-build de dataset

Build-scripts en ruwe data staan in `mpiek/jaardle-tools`. Daar genereer je een nieuwe `bundle.bin` en commit je 'm vervolgens hierheen.

## Licenties

- **Code** (HTML, CSS, JS): [MIT](LICENSE)
- **Dataset**: CC BY-SA 4.0 (zie `LICENSE-DATA.md` in `jaardle-tools`), afgeleid van Engelse Wikipedia

## Bijdragen

Issues en PRs welkom. Met name interessant:
- Vertaalfouten in `events.nl.json` (open een issue met het event-jaar)
- UI-verbeteringen
- Extra puzzle-modi (eeuw-modus, decennium-modus, etc.)
