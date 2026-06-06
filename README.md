# Jaardle

Een Nederlandstalig year-guessing puzzelspel (Wordle voor jaartallen).

Elke dag krijg je één historische gebeurtenis en moet je raden in welk jaar het gebeurde. Per gok zie je een gekleurde range-badge en kun je extra hints opvragen (tekst of richting). Je hebt 6 pogingen.

## Live

➡️ **<https://jaardle.nl/>** — Engelstalige versie op **<https://jaardle.nl/en>**

## Spelen

- **Dagelijkse Jaardle** — elke dag één puzzel, voor iedereen gelijk
- **Nieuw spel** — oneindig rondjes, willekeurige gebeurtenis
- **Account** (optioneel) — log in met Google of e-mail om je statistieken
  (win-rate, streaks, gemiddelde score) cross-device te synchroniseren
- Range-badges:
  - 🟩 0 jaar — 🟪 1-2 — 🟨 3-10 — 🟧 11-25 — 🟥 26-50 — 🟫 51-200 — ⬜ 200+

## Dataset

2.322 jaartallen (679 v.Chr. tot 2026), 40.138 historische feiten, Nederlands +
Engels.

Puzzels en spelersdata worden tijdens runtime via **Supabase RPC** geladen — er
zit geen dataset in deze repo. De dagpuzzels worden vooruit gegenereerd uit de
DB (zie de aparte tools-repo); de daily-picker selecteert jaren met genoeg hints.

De vertaling is LLM-geassisteerd (Gemini 2.5 Flash + Claude). Jaartal-spoilers (vermeldingen binnen ±2 van het puzzle-jaar) zijn automatisch vervangen door `____`.

## Lokaal draaien

```bash
git clone https://github.com/mpiek/jaardle.git
cd jaardle
python3 -m http.server 8000
# Open http://localhost:8000
```

## Architectuur

Static HTML/CSS/JS frontend (geen build-stap, geen framework) met **Supabase** als
backend voor auth, puzzeldata en stats-sync. Anonieme state in `localStorage`;
ingelogde spelers syncen hun geschiedenis naar de DB.

```
index.html      — NL UI + Supabase-init (window.sb / window.sbAuth)
en/index.html   — Engelstalige variant
login/, register/ — redirect-stubs naar de auth-modal
style.css       — Donker thema + range-badges
game.js         — Game logic, year-input, share, daily/free modes, auth & stats
favicon.svg     — Tab-icoon (+ favicon-96/192.png voor zoekresultaten)
```

## Licenties

- **Code** (HTML, CSS, JS): [MIT](LICENSE)
- **Dataset**: CC BY-SA 4.0, afgeleid van Engelse Wikipedia

## Bijdragen

Issues en PRs welkom. Met name interessant:
- Vertaalfouten in `events.nl.json` (open een issue met het event-jaar)
- UI-verbeteringen
- Extra puzzle-modi (eeuw-modus, decennium-modus, etc.)
