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

## Dagelijks Discord-bericht

Elke ochtend tussen 06:00 en 12:00 (Amsterdam) plaatst de database (`pg_cron` + `pg_net`, functie `post_daily_discord()`) de vraag van de dag in het Jaardle-Discordkanaal, met een link naar het spel; het jaar van de dag staat er nooit in. GitHub Actions bleek daar te onbetrouwbaar voor (geplande runs kwamen uren te laat of niet). `tools/discord-daily.mjs` is de preview en de handmatige variant en de bron van de tekst: `node tools/discord-daily.mjs` (preview, post niets) of `--check-webhook`; de workflow `discord-daily.yml` is alleen met de hand te starten (check / post, webhook = repo-secret `DISCORD_DAILY_WEBHOOK`).

## Licentie

Code © mpiek, alle rechten voorbehouden — **niet** open source, zie [LICENSE](LICENSE) (vragen over hergebruik: contact@jaardle.com) · gebeurtenissen + vertalingen CC BY-SA 4.0, afgeleid van [Engelstalige Wikipedia](https://en.wikipedia.org/wiki/Main_Page) · geanimeerde emoji in `/emoji/` uit [Noto Emoji Animation](https://googlefonts.github.io/noto-emoji-animation/) (Google, CC BY 4.0), lokaal gehost · de emoji-webfont `/fonts/jaardle-emoji.woff2` is een subset van [Noto Color Emoji](https://github.com/googlefonts/noto-emoji) (Google, [OFL 1.1](fonts/OFL.txt)) · vlaggen van [Kenney](https://kenney.nl) (CC0). De credits staan ook in het spel zelf, onder "Hoe werkt het?".

Issues welkom — bij een vertaalfout graag het event-jaar vermelden. Pull requests graag eerst overleggen.
