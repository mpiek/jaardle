# Jaardle

Een Nederlands (en Engels) year-guessing spel — Wordle voor jaartallen.

Elke dag krijg je één historische gebeurtenis en raad je in 6 pogingen in welk jaar het gebeurde. Per gok zie je een range-badge en kun je extra hints opvragen.

**Spelen:** <https://jaardle.nl/> · **English:** <https://jaardle.nl/en>

```
🟩 0 jaar  🟪 1-2  🟨 3-10  🟧 11-25  🟥 26-50  🟫 51-200  ⬜ 200+
```

## Tech

Static HTML/CSS/JS op GitHub Pages, met **Supabase** voor auth (Google/e-mail) en cross-device stats. Puzzels worden via Supabase RPC geladen — de dataset (~40k feiten over 2.322 jaartallen, LLM-vertaald) zit niet in deze repo.

Lokaal draaien: `python3 -m http.server 8000` in de repo-root.

## Licentie

Code [MIT](LICENSE) · gebeurtenissen + vertalingen CC BY-SA 4.0, afgeleid van [Engelstalige Wikipedia](https://en.wikipedia.org/wiki/Main_Page).

Issues en PRs welkom — bij een vertaalfout graag het event-jaar vermelden.
