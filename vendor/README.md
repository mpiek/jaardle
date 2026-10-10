# vendor/

Bibliotheken van derden die we zelf serveren (geen CDN van een ander in de laadroute).

## supabase-js 2.108.2

- `supabase-js-2.108.2.umd.js` = `package/dist/umd/supabase.js` uit het npm-pakket `@supabase/supabase-js@2.108.2`,
  byte voor byte (sha256 `c123f7e874934778b7d89fee7dce8de26c858a2c3a92fd7a3f870394a6a2f91f`). Eén bestand, ±52 KB gzip,
  met auth-js, postgrest-js, realtime-js, storage-js en functions-js erin; zet `window.supabase`.
- Licentie: MIT, © Supabase — zie `LICENSE-supabase-js.txt`. Dit bestand valt dus **niet** onder de licentie van de rest van de repo.
- Waarom hier en niet van esm.sh: vanuit Australië kostte de esm.sh-keten (17 bestanden, 4 niveaus achter elkaar) ±1,4 s extra
  op een eerste bezoek, en viel esm.sh weg dan bleef het hele spel op "Loading…" staan. Zie `index.template.html` (scripts onderaan).

### Bijwerken

1. Kies de nieuwe versie (`X.Y.Z`) en haal het pakket op: `npm pack @supabase/supabase-js@X.Y.Z` (of de tarball-URL uit
   `https://registry.npmjs.org/@supabase/supabase-js/X.Y.Z`; controleer `dist.integrity`).
2. Pak `package/dist/umd/supabase.js` uit naar `vendor/supabase-js-X.Y.Z.umd.js` en `package/LICENSE` naar `vendor/LICENSE-supabase-js.txt`.
3. Pas de bestandsnaam aan in `index.template.html` (één `<script src>` onderaan; de versie zit in de naam, dus geen `?v=`),
   verwijder het oude bestand, `npm run build`, `npm test`.
4. Test inloggen (e-mail én Google), uitloggen, een ingelogde herlaad en een anonieme eerste keer; kijk of `sb-auth-changed` nog aankomt.
