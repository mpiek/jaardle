/* ⚔️ Duels: 5 rondes, best of 5 (14/11/2026, gevraagd door twee teamgenoten). Lui geladen: bij ⋮ → Duels, bij een ?duel=CODE-link,
   bij een lopende duelronde en (alleen wie duels heeft) voor het rode stipje. Wie nooit duelleert, laadt dit bestand nooit.
   De afspraken uit de grill-sessie: de link draagt een code; wie hem als eerste aanneemt is de tegenstander (een revanche: alleen
   de vorige tegenstander). Pas bij aannemen kiest de server 5 puzzels, van makkelijk naar moeilijk; daarna hebben allebei 24 uur.
   Per ronde wint de hoogste score, de meeste rondes wint (gelijk → totaal), een ronde die je niet speelde verlies je. De score van
   de ander zie je pas na je eigen ronde. Duelrondes tellen nergens voor (rating, prestaties, streak). Server: db/185 + db/186 (flair, claim).
   Versie 2 (na live kijken, mockup v4, 14/11): een eigen duelscherm (body[data-duelpage]: duelkop ‹ Jaardle · ⚔️ DUEL · ronde in plaats
   van de tabbladen, VS-kop, de duelkleur via body[data-arena]; ?duel=CODE blijft in de adresbalk), een eindstand-pop-up na je vijfde
   ronde (en voor een uitslag die je nog niet zag, met de rondes die omdraaien), een Duels-scherm met je stand en uitleg (leeg: Jij vs ?
   en drie stappen; daarna achter "Hoe werkt het?"), de link zelf zichtbaar met Kopieer, je eigen scores bij een duel dat op de ander
   wacht, flair in de rondjes (met account), en een licht account-moment (uitnodiging: "Al een account? Log in", eindstand zonder account).
   game.js geeft een host mee (taal, rpc, speler-id, naam, flair, modals, een ronde starten, delen, confetti, inloggen); dit bestand
   brengt zijn eigen CSS (één <style>) en teksten in vijf talen mee, en bewaart lokaal alleen jaardle:duels (welke duels nog nieuws
   kunnen brengen), jaardle:duel-news (voor het stipje), jaardle:duel-name (je naam zonder account) en jaardle:pendingDuel (een
   uitnodiging of je eigen duel dat na het inloggen terugkomt); jaardle:duelclaim is van game.js (zie remember).
   Meetpunten (GoatCounter, site jaardle-events; game.js telt duel-list bij ⋮ → Duels): duel-create · duel-rematch · duel-invite-shared|copied|
   abort|prompt · duel-copy-link · duel-resend · duel-withdraw · duel-link-open|own|taken|closed|notfound · duel-accept · duel-decline ·
   duel-login-invite · duel-round-1…5 · duel-done-first · duel-done-second · duel-reveal · duel-tell · duel-share-result · duel-exit ·
   duel-help · duel-login-end · duel-login-list · duel-share-image · duel-link-spectate · duel-spectate-challenge|-direct|-daily · duel-result-open · duel-peek · duel-sync (tik op het logo = verversen) · duel-stand-b|k (een kaart onder Jouw stand). Trechter: link-open → accept →
   round-1 → round-5; create → invite-shared/copied → (bij de ander) link-open; share-image → (bij een buitenstaander) link-spectate → spectate-challenge.
   De Duels-pagina (18/11/2026): het Duels-scherm is geen pop-up meer maar een eigen scherm met een eigen adres, /duels/ (zie
   ensureListModal en appPageSet in game.js); de deellink gaat daarheen (eigen titel + deelplaatje). Meetpunten: duel-page (het
   adres zelf geopend, game.js) · duel-list-exit (‹ Jaardle, tot 22/11: sindsdien gaat de deur op deze pagina naar Timeline).
   Versie 4 (stap 2, db/190, mockup v6 16/11): "Deel uitslag" stuurt een plaatje mee (canvas 1080×1080, scorebord: winnaar links met kroon,
   elke ronde met beide scores, iedere speler in de kleur van zijn gezichtje) met één regel en de link; wie die link opent zonder mee te
   spelen, ziet de uitslag (de rondes draaien om) met "Daag zelf iemand uit", een teamgenoot van de winnaar "Daag <winnaar> uit".
   Account-momenten (16/11, db/193): zonder account staat bij de uitslag wat je er met déze tegenstander aan hebt ("Met een account daag je
   Bram uit zonder link"; alleen als Bram een account met een naam heeft: opp_acc van de server, anders "Bewaar je duels op al je
   toestellen"), en in het Duels-scherm één regel onder de knop zodra je zo'n duel speelde. Tijdens het wachten op de ander staat er geen
   account-regel meer. Na het inloggen (ook via Google) zet game.js eerst je duels over en opent dan het Duels-scherm bij dat duel: je
   tegenstander staat er als gezichtje (duelsAfterLogin). */
window.Duel = (() => {
  const ICON = "⚔️";
  // db/202 (18/11/2026): duelmodi. Geen thema = gewoon duel; "1900" = alle rondes vanaf 1900 ("leuk voor de wat meer casual speler").
  // De uitdager kiest via de ▾ naast de grote knop; de ander kiest niets. Een nieuwe modus = hier, teksten en de server (db/202).
  const THEMES = { 1900: { ico: "📻", label: "1900+", from: 1900 } };
  const LIST_KEY = "jaardle:duels", NEWS_KEY = "jaardle:duel-news", NAME_KEY = "jaardle:duel-name", PENDING_KEY = "jaardle:pendingDuel";
  const INVITE_KEY = "jaardle:duelInvite";   // { c: code, u: einde (ms), later: na ✕ } — een uitnodiging die nog op je antwoord wacht (game.js leest hem ook)
  const CLAIM_KEY = "jaardle:duelclaim";   // van game.js (duelsAfterLogin): voor welke accounts dit toestel zijn duels al overzette
  const LINK = (code) => `https://jaardle.com/duels/?duel=${code}`;   // /duels/ (18/11/2026): het deelvoorbeeld is dan een duel (eigen titel + plaatje); oude ?duel=-links blijven werken
  const FLIP_MS = 500 + 5 * 650 + 500;   // zo lang duurt de onthulling (zie .flip in de CSS)

  const CSS = String.raw`/* ═══ Duels (/duel.js) ═══ */
:root { --duel-me: var(--accent); --duel-op: #f0a35e; --duel-win: var(--green); --duel-loss: #e5735f; }
html[data-theme="light"] { --duel-op: #b8611a; --duel-loss: #c8432f; }
.duel-ico { flex: none; font-size: 1.2rem; line-height: 1; }
.duel-cells { flex: none; display: flex; gap: 0.2rem; }
.duel-cell { width: 0.95rem; height: 0.95rem; border-radius: 4px; box-sizing: border-box; border: 1.5px dashed color-mix(in srgb, var(--muted) 55%, transparent); }
.duel-cell.p { border: 0; background: var(--duel-me); }
.duel-cell.w { border: 0; background: var(--duel-win); }
.duel-cell.l { border: 0; background: var(--duel-loss); }
.duel-cell.d { border: 0; background: var(--gray); }
.duel-cell.cur { border: 2px solid var(--fg); }
/* de kaart op het eindscherm en in het Duels-scherm */
.duel-card { box-sizing: border-box; width: 100%; margin: 0.35rem 0 0.9rem; padding: 0.6rem 0.75rem 0.7rem; text-align: left; color: var(--fg);
  background: var(--card-soft); border: 1px solid var(--border); border-radius: 12px; font-size: 0.85rem; line-height: 1.3; }
.duel-head { display: flex; align-items: center; gap: 0.45rem; }
.duel-head .duel-ico { font-size: 1.05rem; }
.duel-head b { font-weight: 700; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.duel-head .duel-r { margin-left: auto; flex: none; color: var(--muted); font-size: 0.78rem; font-variant-numeric: tabular-nums; }
.duel-head .duel-big { margin-left: auto; flex: none; font-size: 1.25rem; font-weight: 800; font-variant-numeric: tabular-nums; letter-spacing: 0.02em; }
.duel-verdict { font-size: 1.05rem; font-weight: 800; }
.duel-note { margin: 0.55rem 0 0; color: var(--muted); font-size: 0.75rem; line-height: 1.35; }
.duel-note b { color: var(--fg); font-weight: 700; }
.duel-err { color: var(--danger); }
@keyframes duel-pop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.18); opacity: 1; } 100% { transform: none; } }
/* de onthulling (wie als eerste klaar was, eerste keer openen): per ronde klapt de uitslag om (.fv), daarna stand en oordeel (.after) */
.duel-card .after, .dl .after { animation: duel-in 0.4s ease-out 3.75s both; }
@keyframes duel-flip { 0% { transform: rotateX(90deg); } 100% { transform: none; } }
@keyframes duel-in { 0% { opacity: 0; transform: translateY(0.3rem); } 100% { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .duel-card .after, .dl .after { animation: none; } }
.duel-tip { margin: 0.4rem 0 0; font-size: 0.72rem; color: var(--muted); text-align: center; }
.rq { max-width: 22rem; }
.rq-body { display: flex; flex-direction: column; gap: 0.7rem; padding: 1.2rem 1rem 1rem; text-align: center; }
.rq-eyebrow { margin: 0; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--duel-arena); }
.rq-in { display: flex; flex-direction: column; gap: 0.7rem; }
/* het hoofdfeit en de 💡-extra's van de ronde als klein carrouselletje (zoals in de ❓-uitleg): vegen, of tik op een puntje */
.rq-ev { background: var(--card-soft); border: 1px solid var(--border); border-radius: 10px; padding: 0.55rem 0.35rem 0.25rem; text-align: left; }
.rq-vp { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none; overscroll-behavior-x: contain; }
.rq-vp::-webkit-scrollbar { display: none; }
.rq-fs { --c: var(--h-extra); flex: 0 0 100%; min-width: 0; box-sizing: border-box; padding: 0 0.5rem 0.3rem; scroll-snap-align: start; scroll-snap-stop: always; }
.rq-fs.c-fun { --c: var(--h-fun); } .rq-fs.c-wow { --c: var(--h-wow); } .rq-fs.c-mys { --c: var(--h-mys); }
.rq-fs.c-rec { --c: var(--h-rec); } .rq-fs.c-warm { --c: var(--h-warm); } .rq-fs.c-spook { --c: var(--h-spook); }
.rq-tag { display: flex; align-items: center; gap: 0.4em; margin: 0 0 0.3rem 0.85em; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--c); }
.rq-fact { margin: 0; padding-left: 0.75em; border-left: 3px solid var(--c); font-size: 0.92rem; font-weight: 500; line-height: 1.35; text-wrap: pretty; }
.rq-dots { display: flex; justify-content: center; gap: 0.1rem; }
.rq-dots button { appearance: none; background: none; color: inherit; border: 0; border-radius: 6px; padding: 0.25rem 0.35rem; min-width: 1.9rem; min-height: 1.75rem;
  font-size: 0.8rem; line-height: 1; cursor: pointer; opacity: 0.35; filter: grayscale(1); transition: opacity 0.25s, filter 0.25s; }
.rq-dots button:hover { filter: grayscale(1); opacity: 0.6; }
.rq-dots button.on, .rq-dots button.on:hover { opacity: 1; filter: none; }
.rq-year { margin: -0.1rem 0 0; font-size: 2.1rem; font-weight: 900; line-height: 1.05; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.rq-scores { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0.4rem; }
.rq-sc { display: flex; flex-direction: column; align-items: center; gap: 0.05rem; min-width: 0; padding: 0.4rem 0.4rem 0.45rem; border-radius: 8px; background: var(--card-soft); font-variant-numeric: tabular-nums; }
.rq-sc small { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.72rem; color: var(--muted); }
.rq-sc b { font-size: 1.25rem; font-weight: 800; line-height: 1.15; }
.rq-sc.me.won { background: color-mix(in srgb, var(--duel-win) 26%, var(--card)); }
.rq-sc.op.won { background: color-mix(in srgb, var(--duel-op) 24%, var(--card)); }
.rq-verdict { margin: -0.2rem 0 0; font-size: 0.85rem; font-weight: 700; }
.rq-src { align-self: center; font-size: 0.75rem; color: var(--muted); text-decoration: underline; text-underline-offset: 2px; overflow-wrap: anywhere; }
.rq-load { margin: 0.6rem 0; color: var(--muted); font-size: 0.88rem; }
/* de uitnodiging: een pop-up boven het spel (zoals de bevestiging bij een team-uitnodiging) */
.duel-pop { max-width: 22rem; }
.duel-pop .modal-close { position: absolute; top: 0.45rem; right: 0.45rem; min-width: 2.75rem; min-height: 2.75rem; }
.duel-inv { box-sizing: border-box; width: 100%; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 1.3rem 1.1rem 1.1rem; text-align: center; }
.duel-inv .duel-ico { font-size: 2.2rem; }
.duel-inv h2 { margin: 0; font-size: 1.3rem; line-height: 1.2; text-wrap: balance; }
.duel-inv p { margin: 0; color: var(--muted); font-size: 0.9rem; }
.duel-inv ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.88rem; color: var(--muted); }
.duel-inv ul b { color: var(--fg); }
.duel-inv label, .dl-name label { align-self: stretch; display: flex; flex-direction: column; gap: 0.3rem; text-align: left; font-size: 0.8rem; color: var(--muted); }
.duel-inv input, .dl-name input { box-sizing: border-box; width: 100%; min-width: 0; font: inherit; font-size: 1rem; padding: 0.55rem 0.7rem; color: var(--fg); background: var(--card-soft); border: 1px solid var(--border); border-radius: 8px; }
.duel-inv input:focus, .dl-name input:focus { outline: none; border-color: var(--accent); }
.duel-inv input[aria-invalid="true"], .dl-name input[aria-invalid="true"] { border-color: var(--danger); }
.duel-inv .duel-go { align-self: stretch; }
.duel-no { appearance: none; background: transparent; color: var(--muted); border: 0; padding: 0.5rem 0.9rem; min-height: 2.75rem; font: inherit; font-size: 0.88rem; font-weight: 500; cursor: pointer; }
.duel-no:hover { color: var(--fg); filter: none; }
.duel-fine { font-size: 0.72rem !important; }
.duel-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; }
#result-actions #next-btn.duel-btn, #result-actions .nx:has(> #next-btn.duel-btn) { order: -1; }   /* Revanche vóór "Deel uitslag" (zoals de mockup) */
/* ⚔️ Duels (⋮-menu) */
.dl { gap: 0.55rem; }
.dl-new { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; width: 100%; }
.dl-name { display: flex; flex-direction: column; gap: 0.4rem; }
.dl-name div { display: flex; gap: 0.4rem; }
.dl-name button { flex: none; padding: 0.55rem 1rem; }
.dl-sent { display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem; padding: 0.6rem 0.75rem; background: color-mix(in srgb, var(--green) 10%, var(--card-soft));
  border: 1px solid color-mix(in srgb, var(--green) 35%, var(--border)); border-radius: 10px; font-size: 0.85rem; line-height: 1.35; }
.dl-sent b { color: var(--green-text); }
/* 19/11 (zijn vraag): het groene vak kun je wegklikken; het ✕ rechtsboven, de tekst houdt er ruimte voor */
.dl-sent { position: relative; padding-right: 2.6rem; }
.dl-sent > .dl-x { position: absolute; top: 0.15rem; right: 0.15rem; }
.dl-sent .dl-mini { margin-top: 0.3rem; }
.dl-empty, .dl-msg { margin: 0; color: var(--muted); font-size: 0.85rem; line-height: 1.4; }
.dl-hb { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 0.3rem; }
.dl-hc { font-size: 0.8em; transition: transform 0.15s; }
.dl-hb[aria-expanded="false"] .dl-hc { transform: rotate(-90deg); }
.dl-hb:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }
.dl-h { margin: 0.45rem 0 -0.15rem; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--muted); }
.dl-row { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 0.6rem; background: var(--card-soft); border-radius: 10px; min-height: 2.9rem; }
.dl-row.turn { box-shadow: inset 0 0 0 1.5px var(--accent); }
.dl-row.dim { opacity: 0.65; }
.dl-row.wrap { flex-wrap: wrap; row-gap: 0.35rem; }
.dl-row.wrap .dl-acts { flex-basis: 100%; padding-left: 2.6rem; }
.dl-av { flex: none; width: 2rem; height: 2rem; display: grid; place-items: center; border-radius: 50%; background: var(--card); font-size: 1rem; font-weight: 700; color: var(--muted); }
.dl-main { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.dl-main b { font-size: 0.92rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dl-main b small { font-size: 0.72rem; font-weight: 500; color: var(--muted); }
.dl-main > small { font-size: 0.76rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dl-main > small em { font-style: normal; color: var(--fg); font-weight: 600; }
.dl-row.has-new .dl-main b::after { content: ""; display: inline-block; width: 7px; height: 7px; margin-left: 0.4rem; border-radius: 50%; background: var(--achv-new, #e5484d); vertical-align: middle; }
.dl-acts { flex: none; display: flex; gap: 0.3rem; }
.dl-go { flex: none; padding: 0.5rem 0.9rem; font-size: 0.85rem; min-height: 2.5rem; }
.dl-mini { flex: none; padding: 0.35rem 0.75rem; min-height: 2.5rem; font-size: 0.78rem; font-weight: 600; color: var(--fg); background: transparent; border: 1px solid var(--border); border-radius: 999px; }
.dl-mini:hover { border-color: var(--accent); filter: none; }
.dl-res { flex: none; font-size: 0.8rem; font-weight: 700; font-variant-numeric: tabular-nums; padding: 0.15rem 0.55rem; border-radius: 999px; color: var(--muted); background: var(--card); white-space: nowrap; }
.dl-res.w { color: var(--on-badge); background: var(--green); }
.dl-res.l { color: #fff; background: var(--duel-loss); }
.dl-stand { flex: none; font-size: 0.95rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.dl-item { display: flex; flex-direction: column; background: var(--card-soft); border-radius: 10px; }
.dl-item > .dl-row { background: transparent; cursor: pointer; }
.dl-chev { flex: none; color: var(--muted); font-size: 0.75rem; transition: transform 0.2s; }
.dl-item.open .dl-chev { transform: rotate(180deg); }
.dl-row.sync .dl-main small { animation: dl-sync 0.7s ease-in-out infinite alternate; }   /* syncList: even vers kijken */
@keyframes dl-sync { to { opacity: 0.4; } }
@media (prefers-reduced-motion: reduce) { .dl-row.sync .dl-main small { animation: none; opacity: 0.6; } }
.dl-detail { display: none; flex-direction: column; gap: 0.5rem; padding: 0 0.6rem 0.65rem; }
.dl-item.open .dl-detail { display: flex; }
.dl-detail .duel-card { margin: 0; padding: 0.15rem 0 0; background: transparent; border: 0; border-top: 1px solid var(--border); border-radius: 0; }
.dl-detail .duel-head { padding-top: 0.45rem; }
.dl-detail .duel-head b { font-size: 0.78rem; font-weight: 600; color: var(--muted); }
.dl-detail .duel-verdict { display: block; margin-top: 0.55rem; font-size: 0.95rem; }
/* 🏁› rechts op de kaart: de eindstand (zoals de 🏆› in de tabrij van het eindscherm) */
.dl-endb { flex: none; display: inline-flex; align-items: center; gap: 0.1rem; min-height: 2rem; margin: -0.3rem -0.35rem -0.3rem 0.2rem; padding: 0.15rem 0.45rem; border: 0; border-radius: 999px;
  background: none; color: var(--muted); font: inherit; font-size: 0.85rem; line-height: 1.4; cursor: pointer; }
.dl-endb span { font-size: 1.05rem; line-height: 1; }
.dl-endb:hover { background: var(--card); color: var(--fg); filter: none; }
.dl-endb:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.dl-rev { align-self: flex-start; display: inline-flex; align-items: center; gap: 0.35rem; }
.dl-past { display: flex; flex-direction: column; }
.dl-past button { appearance: none; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; width: 100%; min-height: 2.5rem; padding: 0.25rem 0.1rem; font: inherit; font-size: 0.8rem; font-weight: 500;
  color: var(--fg); background: transparent; border: 0; border-top: 1px solid var(--border); border-radius: 0; cursor: pointer; }
.dl-past button[aria-pressed="true"] { color: var(--accent); }
.dl-detail .dl-ko .ko-life { margin-top: 0.5rem; }
.dl-ko-life:empty { min-height: 10rem; }   /* het verloop komt zodra ko.js er is: geen sprong */
.dl-past button:hover { filter: none; color: var(--accent); }
.dl-rec { flex: none; display: flex; align-items: center; gap: 0.45rem; font-variant-numeric: tabular-nums; }
.dl-rec b { font-size: 1rem; font-weight: 800; }
.dl-form { display: inline-flex; gap: 2px; }
.dl-form i { width: 0.5rem; height: 0.5rem; border-radius: 2px; background: var(--gray); }
.dl-form i.w { background: var(--duel-win); }
.dl-form i.l { background: var(--duel-loss); }
.dl-moreb { appearance: none; align-self: center; min-height: 2.75rem; padding: 0.3rem 0.9rem; font: inherit; font-size: 0.85rem; font-weight: 600; color: var(--accent); background: transparent; border: 0; cursor: pointer; }
.dl-moreb:hover { filter: none; text-decoration: underline; }
:root { --duel-arena: #e8794a; --duel-arena-on: #1d0f05; }
html[data-theme="light"] { --duel-arena: #b5531c; --duel-arena-on: #fff; }

/* kop van het Duels-scherm: "Hoe werkt het?" naast het kruisje */
.dl-help-btn { appearance: none; margin-left: auto; display: inline-flex; align-items: center; gap: 0.3rem; min-height: 2.5rem; padding: 0.2rem 0.75rem;
  font: inherit; font-size: 0.8rem; font-weight: 600; color: var(--muted); background: transparent; border: 1px solid var(--border); border-radius: 999px; cursor: pointer; }
.dl-help-btn:hover { filter: none; color: var(--fg); }

/* de uitleg: drie stappen (in de lege staat altijd, daarna achter "Hoe werkt het?") */
.dl-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; counter-reset: dl; }
.dl-steps li { display: grid; grid-template-columns: 1.7rem 1fr; gap: 0.65rem; align-items: start; font-size: 0.88rem; line-height: 1.35; color: var(--fg); text-align: left; }
.dl-steps li::before { counter-increment: dl; content: counter(dl); display: grid; place-items: center; width: 1.7rem; height: 1.7rem; border-radius: 50%;
  font-weight: 800; font-size: 0.85rem; color: var(--duel-arena-on); background: var(--duel-arena); }
.dl-steps li small { display: block; margin-top: 0.1rem; font-size: 0.76rem; color: var(--muted); }
.dl-howto .duel-inv { gap: 0.85rem; }
.dl-howto .dl-steps { align-self: stretch; }
.dl-fine { margin: 0; text-align: center; font-size: 0.72rem; color: var(--muted); }

/* lege staat: Jij vs ?, de uitleg, de knop */
.dl-hero { display: flex; flex-direction: column; align-items: center; gap: 0.85rem; padding: 0.5rem 0 0.1rem; text-align: center; }
.dl-vs { display: flex; align-items: center; gap: 0.65rem; }
.dl-vs .dl-av { width: 2.9rem; height: 2.9rem; font-size: 1.15rem; color: #fff; }
.dl-vs .dl-av.me { background: var(--duel-me); }
.dl-vs .dl-av.op { background: color-mix(in srgb, var(--duel-op) 30%, var(--card)); color: var(--duel-op); border: 2px dashed var(--duel-op); box-sizing: border-box; }
.dl-vs b { font-size: 0.95rem; font-weight: 900; letter-spacing: 0.1em; color: var(--duel-arena); }
.dl-hero h3 { margin: 0; font-size: 1.15rem; line-height: 1.25; text-wrap: balance; }
.dl-hero .dl-steps { align-self: stretch; }
.dl-hero .dl-new { margin-top: 0.15rem; }

/* Jouw stand per vorm (22/11/2026, mockup "stand per vorm"): twee kaarten in GeoGuessr-stijl onder het kopje; de gekozen kaart is ook de
   schakelaar voor de stand per tegenstander eronder (pijltje ernaartoe, zoals bij het spelerskaartje). De gloed achter het icoon is het
   enige grote gebaar. */
:root { --ms-b: var(--duel-arena); --ms-k: #e2564e; }
html[data-theme="light"] { --ms-k: #c23a37; }
.ms-cards { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; margin: 0.1rem 0 0.3rem; }
.ms-card { appearance: none; font: inherit; color: inherit; position: relative; isolation: isolate; display: flex; flex-direction: column; align-items: center; gap: 0.05rem;
  padding: 0.75rem 0.4rem 0.7rem; border: 0; border-radius: 14px; background: var(--card-soft); text-align: center; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.ms-card.b { --mc: var(--ms-b); }
.ms-card.k { --mc: var(--ms-k); }
.ms-card::before { content: ""; position: absolute; z-index: -1; left: 50%; top: 0.1rem; width: 6.4rem; height: 6.4rem; transform: translateX(-50%); border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--mc) 34%, transparent) 0%, transparent 66%); opacity: 0.55; transition: opacity 0.2s; }
.ms-card:hover { filter: none; }
.ms-card[aria-pressed="true"] { background: color-mix(in srgb, var(--mc) 12%, var(--card-soft)); box-shadow: inset 0 0 0 2px var(--mc); }
.ms-card[aria-pressed="true"]::before { opacity: 1; }
.ms-card[aria-pressed="true"]::after { content: ""; position: absolute; left: 50%; bottom: -6px; width: 11px; height: 11px; margin-left: -5.5px; transform: rotate(45deg);
  background: inherit; box-shadow: inset -2px -2px 0 0 var(--mc); border-bottom-right-radius: 2px; }
.ms-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.ms-ico { display: block; width: 3.3rem; height: 3.3rem; margin: 0.1rem 0 0.4rem; filter: drop-shadow(0 5px 8px rgba(0, 0, 0, 0.28)); }
.ms-name { font-size: 0.8rem; font-weight: 700; color: var(--muted); }
.ms-card[aria-pressed="true"] .ms-name { color: var(--fg); }
.ms-rec { font-size: 1.55rem; font-weight: 900; line-height: 1.15; font-variant-numeric: tabular-nums; letter-spacing: 0.02em; }
.ms-rec .w { color: var(--green-text); }
.ms-rec .l { color: var(--duel-loss); }
.ms-rec .dash { color: var(--muted); font-weight: 700; margin: 0 0.04em; }
.ms-sub { font-size: 0.7rem; line-height: 1.3; color: var(--muted); font-variant-numeric: tabular-nums; }
.ms-card.none .ms-ico { opacity: 0.5; filter: grayscale(0.7); }
.ms-card.none .ms-rec { padding: 0.3rem 0 0.15rem; font-size: 0.95rem; font-weight: 700; color: var(--muted); letter-spacing: 0; }
.ms-empty { margin: 0; padding: 0.9rem; border-radius: 10px; background: var(--card-soft); text-align: center; font-size: 0.82rem; line-height: 1.45; color: var(--muted); }
.ms-bot { margin-left: 0.3rem; padding: 0 0.32rem; border: 1px solid var(--border); border-radius: 999px; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.05em;
  text-transform: uppercase; color: var(--muted); vertical-align: 0.12em; }

/* de link zelf: te selecteren, met een eigen kopieerknop */
.dl-link { display: flex; gap: 0.35rem; align-self: stretch; margin-top: 0.4rem; }
.dl-link input { flex: 1; min-width: 0; font: inherit; font-size: 0.85rem; padding: 0.45rem 0.6rem; color: var(--fg); background: var(--card); border: 1px solid var(--border); border-radius: 8px; }
.dl-link .dl-mini { min-height: 2.5rem; }

/* een duel dat op de ander wacht klapt ook open: jouw scores, en die van de ander voor rondes die jullie allebei speelden */
.dl-detail .dl-wait-note { margin: 0.5rem 0 0; font-size: 0.75rem; color: var(--muted); }
.dl-detail .dl-wait-note b { color: var(--fg); }


/* look B/C: een VS-kop in plaats van de dunne balk */
.duel-vs { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 0.2rem 0.5rem; box-sizing: border-box; width: 100%;
  margin: 0 0 0.5rem; padding: 0.45rem 0.65rem 0.5rem; background: var(--card); border: 1px solid color-mix(in srgb, var(--duel-arena) 50%, var(--border)); border-radius: 12px; }
.duel-vs .side { display: flex; align-items: center; gap: 0.45rem; min-width: 0; }
.duel-vs .side.op { flex-direction: row-reverse; text-align: right; }
.duel-vs .side span { min-width: 0; }
.duel-vs .side b { display: block; font-size: 0.88rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.duel-vs .side small { display: block; font-size: 0.68rem; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }
.duel-vs .dl-av { width: 1.9rem; height: 1.9rem; font-size: 0.9rem; color: #fff; }
.duel-vs .side.me .dl-av { background: var(--duel-me); }
.duel-vs .side.op .dl-av { background: var(--duel-op); }
.duel-vs .mid { display: flex; flex-direction: column; align-items: center; }
.duel-vs .mid b { font-size: 1.35rem; font-weight: 900; font-variant-numeric: tabular-nums; letter-spacing: 0.04em; line-height: 1.05; }
.duel-vs .mid small { font-size: 0.62rem; color: var(--muted); letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; }
.duel-vs .duel-cells { grid-column: 1 / -1; justify-content: center; margin-top: 0.2rem; }

/* look C: arena — tijdens een duel neemt de duelkleur het accent over (tabblad, knoppen, Gok), met een rand om de kaart */
[data-arena] { --accent: var(--duel-arena); --on-accent: var(--duel-arena-on); --duel-me: #6ea8ff; }
html[data-theme="light"] [data-arena] { --duel-me: #2456c4; }
[data-arena] #event-card { box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--duel-arena) 60%, transparent); }

/* look D: een eigen duelscherm (deeplink ?duel=CODE blijft in de adresbalk): geen Daily/Nieuw spel maar een duelkop met terug,
   ⚔️ DUEL en de ronde; daaronder de VS-kop, en alles in de duelkleur (zoals de arena) */
[data-duelpage] #mode-tabs { display: none; }
.duel-top { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 0.5rem; min-height: 2.75rem; margin-bottom: 0.6rem; }
/* terug naar het spel = het Jaardle-icoontje als thuisknop (18/11: "‹ Jaardle" als pil voelde onnatuurlijk: je zit al in Jaardle) */
.duel-exit { justify-self: start; appearance: none; display: inline-flex; align-items: center; gap: 0.25rem; min-width: 2.75rem; min-height: 2.75rem; padding: 0 0.3rem 0 0.1rem;
  font: inherit; color: var(--muted); background: transparent; border: 0; border-radius: 10px; cursor: pointer; }
.duel-exit:hover { filter: none; color: var(--fg); }
.duel-exit:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.dx-chev { font-size: 1.35rem; line-height: 1; margin-top: -0.1em; }
.dx-logo { display: block; width: 30px; height: 30px; border-radius: 8px; }
.duel-title { font-size: 1rem; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; color: var(--duel-arena); white-space: nowrap; }
.duel-round { justify-self: end; display: flex; flex-direction: column; align-items: flex-end; gap: 0.2rem; font-size: 0.8rem; font-weight: 600; color: var(--muted);
  font-variant-numeric: tabular-nums; white-space: nowrap; }
/* de Duels-pagina (/duels/, 18/11/2026): het Duels-scherm op de plek van het spel. game.js zet body[data-duelshome] en het adres;
   het spel en de voet-knoppen gaan zolang weg, de kop (#mode-tabs) blijft. */
[data-duelshome] main > :not(#modal-duels):not(#mode-tabs), [data-duelshome] #help-btn, [data-duelshome] #day-label { display: none !important; }
#modal-duels.dl-page { position: static; inset: auto; z-index: auto; display: block; padding: 0; }
/* de kop van de Duels-pagina = de kop van Jaardle (21/11/2026, zijn "linksboven exact zelfde profiel/language en ernaast jaardle logo"):
   profiel, 🌐 en de deur blijven staan (sinds 22/11 gaat de deur hier naar Timeline, game.js syncDoor), dan het logo in het midden van
   wat overblijft ("gewoon beetje midden") en 🔈. Het Jaardle-logo en de schakelaar 📅|🎲 gaan zolang weg. Een duelronde houdt zijn eigen kop. */
.kop-d { display: none; }
body[data-duelshome] #mode-tabs { display: flex; }
[data-duelshome] #mode-tabs > :is(.jl-mid, .mode-seg) { display: none; }
[data-duelshome] .kop-d { flex: 1; min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 0.3rem; }
.kop-d .duel-title { justify-self: center; margin: 0; transform: translateX(var(--kd-dx, 0px)); }   /* echt in het midden: centerLogo() */
.kop-d .dl-tools { gap: 0.25rem; }
/* "Hoe werkt het?" onderaan (21/11: het ? paste in de kop niet meer naast het logo), zoals onder de daily */
.dl-foot { display: flex; justify-content: center; margin: 1rem 0 0.25rem; }
.dl-how { display: inline-flex; align-items: center; gap: 0.45rem; margin: 0; padding: 0.5rem 1rem; font: inherit; font-weight: 600; color: var(--fg);
  background: var(--card-soft); border: 1px solid var(--border); border-radius: 999px; cursor: pointer; }
.dl-how:hover { filter: none; background: var(--card); border-color: var(--accent); }
.dl-how svg { width: 1.05rem; height: 1.05rem; color: var(--accent); flex: none; }
/* de kop als logo (18/11): de ⚔️ áchter het woord, DUELS in de duelkleur erover. Een zachte gloed in de achtergrondkleur (geen harde
   rand: die oogde als een zwarte omlijning) laat de zwaarden net achter de letters vervagen, zodat het woord leesbaar blijft. */
.dl-logo { position: relative; display: inline-grid; place-items: center; line-height: 1; }
.dl-logo > * { grid-area: 1 / 1; }
.dl-logo-sw { font-size: 1.9rem; line-height: 1; letter-spacing: 0; }   /* even hoog als het Jaardle-icoontje links (30 px) */
.dl-logo-btn { all: unset; display: inline-grid; place-items: center; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.dl-logo-btn > * { grid-area: 1 / 1; }
.dl-logo-btn:focus-visible { outline: 2px solid var(--duel-arena); outline-offset: 4px; border-radius: 6px; }
.dl-logo.sync .dl-logo-sw { animation: dl-clash 0.3s ease-in-out infinite alternate; }   /* ververs (syncList): de zwaarden kletteren */
@keyframes dl-clash { from { transform: rotate(-9deg) scale(0.95); } to { transform: rotate(9deg) scale(1.05); } }
@media (prefers-reduced-motion: reduce) { .dl-logo.sync .dl-logo-sw { animation: none; opacity: 0.6; } }
.dl-logo-txt { position: relative; font-size: 1.2rem; padding-left: 0.14em;   /* letter-spacing zet ook ruimte ná de laatste letter: zo staat het woord echt in het midden */
  text-shadow: 0 0 4px var(--bg), 0 0 8px var(--bg); }
/* 🔈 overal 1.95rem (31 px), even groot als het poppetje in de kop (23/11, zijn "kijken of alle elementen even hoog zijn … ook over duels
   en timelines?" en "als je in een duel zit"): was 44 px; daardoor was de kop van de Duels-pagina 4 px hoger dan op Jaardle. */
/* ⚔️ Duel-geluid ook als knop naast de ? (19/11, zijn vraag): dezelfde schakelaar als het vinkje in ⚙️. Luidspreker met golfjes = aan,
   met een kruisje = uit; de stand staat in aria-pressed (game.js zet hem ook, als het vinkje elders verandert). */
.dl-tools { justify-self: end; display: flex; align-items: center; gap: 0.4rem; }
.dl-snd-btn { appearance: none; display: grid; place-items: center; width: 1.95rem; height: 1.95rem; padding: 0; color: var(--muted); background: transparent;
  border: 1px solid var(--border); border-radius: 50%; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.dl-snd-btn:hover { filter: none; color: var(--fg); }
.dl-snd-btn svg { width: 1.05rem; height: 1.05rem; }
.dl-snd-btn .on, .dl-snd-btn[aria-pressed="true"] .off { display: none; }
.dl-snd-btn[aria-pressed="true"] .on { display: inline; }
.dl-snd-btn .mus, .dl-snd-btn[data-snd="2"] .on { display: none; }
.dl-snd-btn[data-snd="2"] .mus { display: inline; }
.dl-snd-btn[aria-pressed="true"] { color: var(--fg); }
/* in de kop van een ronde (20/11): links naast het Jaardle-icoontje. Rechts paste hij niet: daar staan de ronde en het pilletje (⚡ Knock-out,
   📻 1900+), en op 360 px schoof dat dan over het logo */
.duel-left { justify-self: start; display: flex; align-items: center; gap: 0.25rem; min-width: 0; }
.dl-page .modal-body { padding: 0 0 1.5rem; }

/* eindstand-pop-up: na je vijfde ronde (ook als de ander nog moet), en bij een uitslag die je nog niet zag (dan draaien de rondes om) */
.ep { max-width: 23rem; }
.ep .ep-body { margin: 0; padding: 1.25rem 1rem 1rem; display: flex; flex-direction: column; gap: 0.6rem; text-align: center; background: transparent; border: 0; }
.ep .ep-eyebrow { margin: 0; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--duel-arena); }
.ep h2 { margin: 0; font-size: 1.35rem; line-height: 1.2; text-wrap: balance; }
.ep .duel-vs { margin: 0; text-align: left; }
.ep-note { margin: 0; font-size: 0.8rem; color: var(--muted); }
.ep-note b { color: var(--fg); }
.ep-btns { display: flex; flex-direction: column; gap: 0.45rem; margin-top: 0.2rem; }
/* ⚔️ db/224: het unlock-kaartje (+ smalle regels) van de duel-prestaties, onder de uitslag */
.ep-achv { display: flex; flex-direction: column; gap: 0.4rem; text-align: left; }
.ep-achv:empty { display: none; }
.ep-achv .achv-card { margin: 0; }
.ep-btns button { width: 100%; }
.ep-ghost { background: transparent; color: var(--fg); border: 1px solid var(--border); }
.ep-ghost:hover { filter: none; border-color: var(--duel-arena); }

/* in het duelscherm: geen nudges van de daily boven het feit */
[data-duelpage] #catchup-bar, [data-duelpage] #repair-banner, [data-duelpage] #event-bar { display: none !important; }
/* flair in een rondje (met account) */
.dl-av.fl { background: var(--card-soft); font-size: 1.15em; }
.duel-vs .dl-av.fl, .dl-vs .dl-av.fl { background: var(--card-soft); }
/* afgelopen-rij: de onderregel mag afbreken (op 360 px paste "Gisteren: gewonnen 3–2" niet naast de stand) */
.dl-item .dl-main > small { white-space: normal; }
/* bij een openstaande link: de link zelf op een eigen regel */
.dl-row.wrap .dl-acts + .dl-acts { padding-top: 0; }
.dl-row.wrap .dl-acts .dl-link { flex: 1; margin-top: 0; }
/* uitnodiging zonder account: "Al een account? Log in" */
.duel-login { font-size: 0.8rem; margin-top: -0.3rem; text-decoration: underline; text-underline-offset: 2px; }
/* eindstand-pop-up zonder account: bewaar je duels */
.ep-keep { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.3rem 0.6rem; margin-top: 0.15rem; padding-top: 0.6rem;
  border-top: 1px solid var(--border); font-size: 0.8rem; color: var(--muted); }
.ep .after { animation: duel-in 0.4s ease-out 3.75s both; }
@media (prefers-reduced-motion: reduce) { .ep .after { animation: none; } }
/* ═══ db/189: teamgenoten direct uitdagen, stand per tegenstander, seintjes ═══ */
/* uitdagen: je teamgenoten als gezichtjes (tik = kiezen, je stand eronder); de grote knop volgt de keuze */
.dl-pick { display: flex; flex-direction: column; gap: 0.5rem; }
.dl-faces { display: flex; gap: 0.1rem; overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: none; margin: 0 -0.3rem; padding: 0.35rem 0.3rem 0.1rem; }
.dl-faces::-webkit-scrollbar { display: none; }
.dl-face { appearance: none; flex: none; width: 4.25rem; display: flex; flex-direction: column; align-items: center; gap: 0.18rem; padding: 0.1rem 0 0.2rem;
  font: inherit; color: var(--fg); background: transparent; border: 0; border-radius: 10px; cursor: pointer; }
.dl-face:hover { filter: none; }
.dl-face .dl-av { width: 2.75rem; height: 2.75rem; font-size: 1.4rem; background: var(--card-soft); transition: box-shadow 0.15s; }
.dl-face:hover .dl-av { box-shadow: 0 0 0 2px var(--border); }
.dl-face b { max-width: 100%; font-size: 0.76rem; font-weight: 600; line-height: 1.15; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dl-face small { font-size: 0.7rem; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; color: var(--muted); }
.dl-face small.up { color: var(--green-text); }
.dl-face small.down { color: var(--duel-loss); }
.dl-face small.new, .dl-face small.run { font-weight: 600; }
.dl-face small.run { color: var(--duel-arena); }
.dl-face.busy .dl-av { opacity: 0.55; }
.dl-face[aria-pressed="true"] .dl-av { box-shadow: 0 0 0 2px var(--card), 0 0 0 4.5px var(--duel-arena); }
.dl-face[aria-pressed="true"] b { color: var(--duel-arena); font-weight: 800; }
.dl-face .dl-av { position: relative; }
.dl-face .dl-av.on::after { content: ""; position: absolute; right: -1px; bottom: -1px; width: 0.72rem; height: 0.72rem; border-radius: 50%; background: var(--green); box-shadow: 0 0 0 2px var(--card); }   /* db/206: nu online */
/* je stand tegen wie je koos, net boven de knop */
.dl-vsline { display: flex; align-items: center; gap: 0.5rem; min-height: 2.4rem; box-sizing: border-box; padding: 0.35rem 0.7rem; font-size: 0.8rem; color: var(--muted);
  background: var(--card-soft); border-radius: 10px; }
.dl-vsline b { color: var(--fg); font-variant-numeric: tabular-nums; }
.dl-vsline { flex-wrap: wrap; row-gap: 0.25rem; }
.dl-vsline > span:first-child { margin-right: auto; }
.dl-vsline .vs-m { display: inline-flex; align-items: center; gap: 0.35rem; }
.dl-vsline .vs-e { font-size: 0.95rem; line-height: 1; }
.dl-linkb { appearance: none; align-self: center; min-height: 2.5rem; padding: 0.2rem 0.8rem; font: inherit; font-size: 0.8rem; font-weight: 600; color: var(--muted);
  background: transparent; border: 0; cursor: pointer; }
.dl-linkb:hover { filter: none; color: var(--fg); text-decoration: underline; }
/* zonder account, na een duel tegen iemand met een account: één regel onder de knop (alleen "Log in" onderstreept) */
.dl-acct { margin-top: -0.2rem; font-weight: 500; line-height: 1.35; text-wrap: balance; }
.dl-acct u { font-weight: 700; color: var(--fg); text-underline-offset: 2px; }
.dl-acct:hover { text-decoration: none; }

/* een uitdaging die op jou wacht: in "Jouw beurt", met Neem aan en een kruisje */
.dl-x { flex: none; appearance: none; width: 2.5rem; height: 2.5rem; display: grid; place-items: center; padding: 0; font: inherit; font-size: 0.9rem;
  color: var(--muted); background: transparent; border: 0; border-radius: 50%; cursor: pointer; }
.dl-x:hover { filter: none; color: var(--fg); background: var(--card); }

/* het seintjes-knopje: zelfde goud als de bel van de daily-herinnering */
.dl-bell { appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; min-height: 2.5rem; padding: 0.35rem 0.9rem 0.35rem 0.75rem;
  font: inherit; font-size: 0.82rem; font-weight: 700; color: var(--gold-text); background: color-mix(in srgb, var(--gold-text) 13%, transparent);
  border: 1px solid color-mix(in srgb, var(--gold-text) 38%, transparent); border-radius: 999px; cursor: pointer; }
.dl-bell:hover { filter: none; background: color-mix(in srgb, var(--gold-text) 20%, transparent); }
.dl-bell svg, .dl-push svg { width: 1.05em; height: 1.05em; flex: none; }
.dl-push { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.78rem; color: var(--muted); }
.dl-push svg { color: var(--gold-text); }
.dl-sent .dl-sent-acts { display: flex; flex-wrap: wrap; align-items: center; gap: 0.4rem; margin-top: 0.45rem; }
.dl-sent .dl-sent-acts .dl-mini { margin-top: 0; }

/* opengeklapte tegenstander: bovenaan jullie stand als VS-kop, daaronder de cijfers */
.dl-detail .duel-vs { margin: 0.15rem 0 0; background: var(--card); }
.dl-h2h-sub { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.2rem 0.9rem; margin: 0; font-size: 0.74rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.dl-h2h-sub b { color: var(--fg); }
.dl-btns { display: flex; flex-wrap: wrap; gap: 0.4rem; }

/* de uitnodiging: jullie stand als chip */
.duel-inv .duel-h2h { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.3rem 0.8rem; font-size: 0.8rem; color: var(--muted); background: var(--card-soft); border-radius: 999px; }
.duel-inv .duel-h2h b { color: var(--fg); font-variant-numeric: tabular-nums; }

/* eindstand-pop-up: seintje aanzetten, of zeggen wie er al een krijgt */
.ep-btns .dl-bell { width: 100%; min-height: 2.75rem; font-size: 0.9rem; }
.ep-pushes { display: flex; flex-direction: column; align-items: center; gap: 0.15rem; }
/* db/189: duel-seintjes op de eindscherm-kaart */
.duel-note .duel-pushes { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 0.6rem; margin-top: 0.45rem; }
/* db/189: de ander krijgt dezelfde achtergrond als zijn gezichtje in het score-histogram (game.js faceHue) */
.dl .dl-av.hue, .duel-vs .side .dl-av.hue, .duel-inv .dl-av.hue, .dl-av.hue { color: var(--fg); background: color-mix(in srgb, hsl(var(--h) 65% 52%) 38%, var(--card-soft)); }
/* db/190: de uitslag voor wie de link opent zonder mee te spelen: winnaar links (gouden rand), iedere speler in zijn eigen kleur
   (--ha links, --hb rechts); de rondes draaien één voor één om, daarna verschijnen de stand en de kop */
.duel-inv.sp .duel-vs { align-self: stretch; }
.duel-inv .sp-vs .side .dl-av.hue { background: color-mix(in srgb, hsl(var(--h) 65% 52%) 38%, var(--card-soft)); color: var(--fg); }
.duel-inv .sp-vs .side.win .dl-av { box-shadow: 0 0 0 2px var(--card), 0 0 0 4.5px var(--gold-text); }
.sp-rds { align-self: stretch; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.3rem; font-variant-numeric: tabular-nums; perspective: 600px; }
.sp-rd { display: flex; flex-direction: column; align-items: center; gap: 0.08rem; padding: 0.3rem 0 0.4rem; border-radius: 8px; background: var(--card); }
.sp-rd small { font-size: 0.6rem; color: var(--muted); letter-spacing: 0.05em; text-transform: uppercase; }
.sp-rd b { display: flex; align-items: center; gap: 0.24rem; font-size: 1rem; font-weight: 800; line-height: 1.2; color: var(--fg); }
.sp-rd b::before { content: ""; width: 0.42rem; height: 0.42rem; border-radius: 50%; }
.sp-rd b.a::before { background: hsl(var(--ha) 65% 52%); }
.sp-rd b.b::before { background: hsl(var(--hb) 65% 52%); }
.sp-rd b.lo { color: var(--muted); font-weight: 600; }
.sp-rd.wa { background: color-mix(in srgb, hsl(var(--ha) 65% 52%) 28%, var(--card)); }
.sp-rd.wb { background: color-mix(in srgb, hsl(var(--hb) 65% 52%) 28%, var(--card)); }
.sp-rd.d { background: color-mix(in srgb, var(--gray) 22%, var(--card)); }
.duel-inv .sp-how { font-size: 0.8rem; max-width: 30ch; }
.sp.rev .sp-rd { animation: dsp-flip 0.42s cubic-bezier(.3, .7, .3, 1.15) both; animation-delay: calc(0.35s + var(--i) * 0.32s); }
.sp.rev h2, .sp.rev .sp-vs .side small { animation: dsp-in 0.35s ease-out both; animation-delay: 2.05s; }
.sp.rev .sp-vs .mid b { position: relative; color: transparent; animation: dsp-show 0.01s linear both; animation-delay: 2.05s; }
.sp.rev .sp-vs .mid b::before { content: "?–?"; position: absolute; inset: 0; color: var(--muted); animation: dsp-hide 0.01s linear both; animation-delay: 2.05s; }
@keyframes dsp-flip { from { transform: rotateX(90deg); opacity: 0.2; } to { transform: none; opacity: 1; } }
@keyframes dsp-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }
@keyframes dsp-show { to { color: var(--fg); } }
@keyframes dsp-hide { to { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .sp.rev .sp-rd, .sp.rev h2, .sp.rev .sp-vs .side small, .sp.rev .sp-vs .mid b { animation: none; }
  .sp.rev .sp-vs .mid b { color: var(--fg); }
  .sp.rev .sp-vs .mid b::before { content: none; }
}
/* de opening van een duelronde (17/11, mockup v7 richting B "Twee kanten"): het scherm splitst schuin, boven jij in blauw, onder je
   tegenstander in de kleur van zijn gezichtje (--h), met de ⚔️ op de naad; daarna schuiven de helften weg. Tussen twee rondes alleen
   een korte band (.short). Altijd donker (een eigen beeld, los van het thema). Alleen transform en opacity bewegen, geen vervaging. */
#duel-intro { --or: #f08a52; position: fixed; inset: 0; z-index: 200; overflow: hidden; color: #fff; cursor: pointer; -webkit-tap-highlight-color: transparent; }
#duel-intro.short { pointer-events: none; cursor: auto; }   /* de band tussen rondes: de nieuwe ronde staat er al, tikken gaat erdoorheen */
#duel-intro .dix-bg, #duel-intro .dix-wrap { position: absolute; inset: 0; }
#duel-intro .dix-bg { background: var(--bg); }
#duel-intro .dix-cur { position: absolute; left: 50%; top: 50%; width: 6rem; height: 6rem; margin: -3rem 0 0 -3rem; display: grid; place-items: center; font-size: 3.2rem; line-height: 1; }
#duel-intro .dix-half { position: absolute; inset: 0 -24px; }
#duel-intro .dix-half.me { clip-path: polygon(0 0, 100% 0, 100% 42%, 0 58%); background: linear-gradient(180deg, hsl(222 70% 13%) 0%, hsl(222 62% 28%) 30%, hsl(222 60% 47%) 58%); }
#duel-intro .dix-half.op { clip-path: polygon(0 58%, 100% 42%, 100% 100%, 0 100%); background: linear-gradient(0deg, hsl(var(--h) 70% 12%) 0%, hsl(var(--h) 62% 26%) 30%, hsl(var(--h) 60% 44%) 58%); }
#duel-intro .dix-half::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(-18deg, rgba(255, 255, 255, 0.07) 0 2px, transparent 2px 17px); }
#duel-intro .dix-in { position: absolute; z-index: 1; left: max(48px, calc(50% - 256px)); right: max(48px, calc(50% - 256px)); display: flex; flex-direction: column; align-items: flex-start; gap: 0.2rem; }
#duel-intro .me .dix-in { top: 12%; }
#duel-intro .op .dix-in { bottom: 10%; align-items: flex-end; text-align: right; }
#duel-intro .dix-av { flex: none; width: 104px; height: 104px; box-sizing: border-box; border-radius: 50%; display: grid; place-items: center; margin-bottom: 0.6rem;
  font-size: 2.8rem; font-weight: 800; line-height: 1; color: #fff; background: rgba(255, 255, 255, 0.14); box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.92), 0 14px 30px rgba(0, 0, 0, 0.35); }
#duel-intro .dix-av.fl { font-size: 3.4rem; }
#duel-intro .dix-tag { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(255, 255, 255, 0.8); font-variant-numeric: tabular-nums; }
#duel-intro .dix-nm { font-size: 2.6rem; font-weight: 900; line-height: 1.02; text-transform: uppercase; letter-spacing: 0.01em; text-shadow: 0 3px 0 rgba(0, 0, 0, 0.22); max-width: 100%; overflow-wrap: anywhere; }
#duel-intro .dix-seam { position: absolute; top: 0; left: -24px; width: calc(100% + 48px); height: 100%; overflow: visible; opacity: 0; filter: drop-shadow(0 0 5px var(--or)) drop-shadow(0 0 14px var(--or)); }
#duel-intro .dix-seam line { stroke: #fff; stroke-width: 3; }
#duel-intro .dix-ring { position: absolute; left: 50%; top: 50%; width: 140px; height: 140px; margin: -70px 0 0 -70px; box-sizing: border-box; border-radius: 50%; opacity: 0;
  border: 3px solid var(--or); box-shadow: 0 0 22px rgba(240, 138, 82, 0.55), inset 0 0 16px rgba(240, 138, 82, 0.4); }
#duel-intro .dix-flash { position: absolute; inset: 0; background: #fff; opacity: 0; }
#duel-intro .dix-badge { position: absolute; left: 50%; top: 50%; width: 88px; height: 88px; margin: -44px 0 0 -44px; box-sizing: border-box; border-radius: 50%; display: grid; place-items: center;
  font-size: 2.7rem; line-height: 1; background: #121214; box-shadow: 0 0 0 3px var(--or), 0 0 32px rgba(240, 138, 82, 0.7), 0 10px 24px rgba(0, 0, 0, 0.45); }
#duel-intro .dix-rd { position: absolute; left: 0; right: 0; top: calc(50% + 56px); margin-inline: auto; width: max-content; padding: 0.42rem 1rem; border-radius: 999px; white-space: nowrap;
  font-size: 0.78rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; font-variant-numeric: tabular-nums; color: #1d0f05; background: var(--or); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28); }
#duel-intro .dix-band { position: absolute; left: 0; right: 0; top: calc(42% - 84px); height: 168px; clip-path: polygon(0 14%, 100% 0, 100% 86%, 0 100%);
  background: linear-gradient(90deg, hsl(222 60% 36%) 0%, #141418 34%, #141418 66%, hsl(var(--h) 60% 33%) 100%); }
#duel-intro .dix-bin { position: absolute; inset: 0; display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; padding: 0 max(22px, calc(50% - 258px)); }
#duel-intro .dix-band .dix-av { width: 62px; height: 62px; margin: 0; font-size: 1.6rem; }
#duel-intro .dix-band .dix-av.fl { font-size: 2.05rem; }
#duel-intro .dix-bmid { display: flex; flex-direction: column; align-items: center; gap: 0.4rem; min-width: 0; }
#duel-intro .dix-x { font-size: 2.3rem; line-height: 1; }
#duel-intro .dix-bmid b { font-size: 0.78rem; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: var(--or); white-space: nowrap; font-variant-numeric: tabular-nums; }
/* db/202: duelmodi. De grote knop met rechts een ▾ (alleen dat stuk klapt de andere duelvormen uit; een keuze = meteen uitdagen) */
.dl-split { display: flex; align-items: stretch; width: 100%; }
.dl-split .dl-new { flex: 1; min-width: 0; width: auto; border-radius: 8px 0 0 8px; }
.dl-more { flex: none; display: grid; place-items: center; width: 3.1rem; min-height: 2.75rem; padding: 0; border-radius: 0 8px 8px 0; color: var(--on-accent);
  background: color-mix(in srgb, var(--accent) 78%, #000); box-shadow: inset 1px 0 0 color-mix(in srgb, var(--on-accent) 30%, transparent); }
.dl-more:hover { filter: brightness(1.12); }
.dl-more:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dl-more svg { width: 1.1rem; height: 1.1rem; transition: transform 0.18s ease; }
.dl-more[aria-expanded="true"] svg { transform: rotate(180deg); }
.dl-menu { align-self: stretch; display: flex; flex-direction: column; gap: 2px; margin-top: -0.15rem; padding: 0.3rem; background: var(--card-soft); border: 1px solid var(--border); border-radius: 10px; }
.dl-opt { appearance: none; display: flex; align-items: center; gap: 0.55rem; width: 100%; min-height: 2.6rem; padding: 0.3rem 0.55rem; border-radius: 8px;
  background: transparent; color: var(--fg); text-align: left; font: inherit; font-weight: 600; }
.dl-opt:hover { filter: none; background: var(--card); }
.dl-opt .mo-e { flex: none; font-size: 1.15rem; line-height: 1; }
.dl-opt span { min-width: 0; }
.dl-opt b { font-size: 0.92rem; }   /* één regel: naam · uitleg (loopt alleen door als het niet past) */
.dl-opt small { margin-left: 0.4rem; font-size: 0.76rem; font-weight: 400; color: var(--muted); }
.dl-opt::after { content: "›"; margin-left: auto; padding-left: 0.4rem; font-size: 1.3rem; line-height: 1; color: var(--muted); }
/* het thema als pilletje: uitnodiging, duelkop, lijst, eindstand */
.dl-th { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.1rem 0.5rem 0.1rem 0.4rem; border-radius: 999px; font-size: 0.78rem; font-weight: 700; line-height: 1.35;
  letter-spacing: 0; text-transform: none; white-space: nowrap; color: var(--fg); background: color-mix(in srgb, var(--duel-arena) 16%, var(--card-soft));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--duel-arena) 45%, transparent); }
.duel-inv .dl-th { font-size: 0.85rem; padding: 0.2rem 0.7rem 0.2rem 0.55rem; margin-top: -0.15rem; }
.ep-eyebrow .dl-th { margin-left: 0.35rem; font-size: 0.7rem; vertical-align: 0.1em; }
.duel-round .dl-th { font-size: 0.68rem; padding: 0 0.4rem 0 0.3rem; }
.dl-main b .dl-th, .dl-sent b .dl-th { margin-left: 0.35rem; font-size: 0.68rem; padding: 0 0.4rem 0 0.3rem; vertical-align: 0.1em; }
.dl-card-f > small > .dl-th { margin-left: 0.4rem; }   /* 22/11 (zijn "chip niet tegen de laatste letter"): ⚡ Knock-out / 📻 1900+ achter "X daagt je uit" */
.dl-card.bot .dl-card-f > small > i { font-style: normal; color: var(--fg); opacity: 0.8; }   /* zijn zin, zoals .bo-say in de pop-up */
/* in een ronde met een thema zegt het lege invoervak welk stuk tijd (i.p.v. "—"). line-height 1.5 / 0.6 = 2.5: de kleine tekst krijgt
   dezelfde regelhoogte als de cijfers, anders krimpt het vak na elke gok (leeg) en groeit het bij het eerste cijfer (19/11: 14 px) */
[data-era] #year-input:empty::before { content: attr(data-ph); font-size: 0.6em; line-height: 2.5; letter-spacing: 0.02em; }
@media (prefers-reduced-motion: reduce) { .dl-more svg, .dl-pickchev svg { transition: none; } }
/* ═══ 19/11/2026 (mockup v9 "mix", zijn keuze: "gewoon jaardle stijl, niet too much"): het scorebord en de uitslag van een ronde
   als gewone Jaardle-kaarten; de twee kanten (zoals de opening) alleen bij een uitdaging. Een ronde krijgt de kleur van wie hem won:
   jij blauw (--db-me), de ander de tint van zijn gezichtje (--h, faceHue in game.js); niet meer groen/rood. ═══ */
:root { --db-me: hsl(222 64% 50%); --db-gold: #f2c14e; }
html[data-theme="light"] { --db-me: hsl(222 64% 46%); --db-gold: #9a7410; }
.db { --cw: 2.05rem; --rh: 1.75rem; --db-op: hsl(var(--h, 30) 58% 44%); display: grid; grid-template-columns: minmax(0, 1fr) repeat(5, var(--cw)) calc(var(--cw) + 0.2rem);
  gap: 3px; align-items: center; box-sizing: border-box; width: 100%; padding: 0.35rem 0.4rem 0.42rem 0.55rem; border-radius: 12px; color: var(--fg);
  background: var(--card); box-shadow: inset 0 0 0 1px var(--border); font-variant-numeric: tabular-nums; text-align: left; }
html[data-theme="light"] .db { --db-op: hsl(var(--h, 30) 58% 40%); }
.db-hd, .db-rw { display: contents; }
.db-rw.me { --col: var(--db-me); }
.db-rw.op { --col: var(--db-op); }
.db-hd > * { font-style: normal; font-size: 0.56rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); text-align: center;
  line-height: 1; padding: 0.05rem 0 0.12rem; white-space: nowrap; }
.db-hd .db-meta { text-align: left; overflow: hidden; text-overflow: ellipsis; }
.db-hd .db-meta.hot { color: var(--duel-arena); }
.db-hd .on { color: var(--fg); }
.db-who { display: flex; align-items: center; gap: 0.42rem; min-width: 0; }
.db-who b { min-width: 0; font-size: 0.86rem; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.db-av { flex: none; width: 1.5rem; height: 1.5rem; border-radius: 50%; display: grid; place-items: center; font-size: 0.82rem; font-weight: 800; color: #fff; background: var(--col); }
.db-av.fl { font-size: 0.92rem; background: var(--card-soft); box-shadow: inset 0 0 0 2px var(--col); }
.db-c { position: relative; height: var(--rh); display: grid; place-items: center; border-radius: 5px; font-size: 0.9rem; font-weight: 800; color: var(--muted); background: var(--card-soft); }
.db-c.w { color: #fff; background: var(--col); }
.db-c.l { font-weight: 700; }
.db-c.d { color: var(--fg); background: color-mix(in srgb, var(--gray) 40%, var(--card-soft)); }
.db-c.p { color: var(--fg); }
.db-c.cur { box-shadow: inset 0 0 0 1.5px var(--fg); }
.db-c.seal { background: repeating-linear-gradient(-45deg, color-mix(in srgb, var(--fg) 13%, transparent) 0 3px, transparent 3px 6px), var(--card-soft); }
.db-c svg { width: 0.72rem; height: 0.72rem; }
.db-n { position: relative; height: var(--rh); display: grid; place-items: center; margin-left: 0.2rem; border-radius: 6px; font-size: 1.12rem; font-weight: 900; color: var(--fg); background: var(--card-soft); }
.db-n.lead { color: #fff; background: var(--col); }
.db-n.champ { box-shadow: 0 0 0 2px var(--card), 0 0 0 4px var(--db-gold); }
.db.mini { --cw: 1.75rem; --rh: 1.5rem; padding: 0.3rem 0.35rem 0.35rem 0.5rem; border-radius: 10px; }
.db.mini .db-c { font-size: 0.78rem; border-radius: 4px; }
.db.mini .db-n { font-size: 0.95rem; }
.db.mini .db-av { width: 1.3rem; height: 1.3rem; font-size: 0.72rem; }
.db.mini .db-who b { font-size: 0.8rem; }
.db.big { --cw: 2.1rem; --rh: 2.15rem; padding: 0.5rem 0.5rem 0.55rem 0.65rem; gap: 4px; }
.db.big .db-c { font-size: 1rem; }
.db.big .db-n { font-size: 1.4rem; }
.db.big .db-av { width: 1.6rem; height: 1.6rem; font-size: 0.95rem; }
.db.big .db-who b { font-size: 0.82rem; }
@media (max-width: 370px) { .db.big { --cw: 1.75rem; } .db.big .db-c { font-size: 0.85rem; } }
/* een ronde die je speelde (of elke, als het duel klaar is): tik = de vraag terugzien */
.db-c[data-q] { cursor: pointer; -webkit-tap-highlight-color: transparent; }
.db-c[data-q]:active { transform: scale(0.94); }
.db-c[data-q]:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
/* de onthulling (wie als eerste klaar was): per ronde klappen beide cellen om, daarna de stand */
.db-c > .fv, .db-n > .fv { position: absolute; inset: 0; display: grid; place-items: center; border-radius: inherit; font-style: normal; color: var(--muted);
  background: var(--card-soft); }
.db-c > .fv { animation: duel-flip 0.45s ease-out calc(0.5s + var(--i, 0) * 0.65s) both; }
.db-c > .fv.w, .db-n > .fv.lead { color: #fff; background: var(--col); }
.db-c > .fv.d { color: var(--fg); background: color-mix(in srgb, var(--gray) 40%, var(--card-soft)); }
.db-n > .fv { color: var(--fg); animation: duel-flip 0.45s ease-out 3.75s both; }   /* eigen regel: zonder --i was de hele animatie ongeldig (stond meteen open) */
/* in een ronde: het bord op de plek van de VS-kop; het ⚔️ DUELS-logo bovenin (hetzelfde als op de Duels-pagina) = naar het Duels-scherm */
.duel-hud { margin: 0 0 0.55rem; }
button.duel-title { justify-self: center; appearance: none; min-height: 2.75rem; margin: 0; padding: 0 0.4rem; font-family: inherit; background: transparent; border: 0; border-radius: 10px;
  cursor: pointer; -webkit-tap-highlight-color: transparent; }
button.duel-title:hover { filter: none; opacity: 0.85; }
button.duel-title:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
/* de uitslag van een ronde in de gewone uitslagkaart: beide scores naast elkaar, die van de winnaar in zijn kleur */
#result.dv-res #result-text { display: none; }
[data-duelpage] #help-btn, [data-duelpage] #day-label { display: none !important; }
.duel-card.jr-card { margin: 0 0 0.75rem; padding: 0; background: transparent; border: 0; }
.jr { display: flex; flex-direction: column; gap: 0.55rem; text-align: center; }
.jr-sc { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0.45rem; }
.jr-box { --col: var(--db-me); display: flex; align-items: center; justify-content: space-between; gap: 0.45rem; min-width: 0; padding: 0.5rem 0.7rem; border-radius: 10px;
  background: var(--card-soft); font-variant-numeric: tabular-nums; }
.jr-box.op { --col: hsl(var(--h, 30) 58% 46%); flex-direction: row-reverse; }
.jr-box.win { background: color-mix(in srgb, var(--col) 26%, var(--card)); box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--col) 75%, transparent); }
.jr-box.todo { background: transparent; box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--muted) 45%, transparent); }
.jr-who { display: flex; align-items: center; gap: 0.4rem; min-width: 0; font-size: 0.84rem; }
.jr-box.op .jr-who { flex-direction: row-reverse; }
.jr-who > b { min-width: 0; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.jr-who .db-av { width: 1.55rem; height: 1.55rem; font-size: 0.85rem; }
.jr-box > strong { flex: none; font-size: 1.85rem; font-weight: 800; line-height: 1; }
.jr-box:not(.win) > strong { color: var(--muted); }
.jr-box > strong.wait { font-size: 0.8rem; font-weight: 700; line-height: 1.2; }
.jr-box.op > strong.wait { text-align: left; }
.jr-v { margin: 0; font-size: 1.05rem; font-weight: 800; }
.jr-v .me { color: var(--duel-me); }
.jr-v .op { color: hsl(var(--h, 30) 72% 66%); }
html[data-theme="light"] .jr-v .op { color: hsl(var(--h, 30) 62% 38%); }
.jr-sub { margin: -0.2rem 0 0; font-size: 0.82rem; color: var(--muted); line-height: 1.4; text-wrap: pretty; }
.jr-sub b { color: var(--fg); }
.jr-ans { margin: 0; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 0.3rem 0.45rem; font-size: 0.86rem; color: var(--muted); }
.jr-ans .nw { white-space: nowrap; }
.jr-card .duel-note { margin-top: 0.15rem; text-align: center; }
.jr.fresh .jr-box.op > strong { animation: duel-flip 0.4s ease-out 0.35s both; }
.jr.fresh .jr-box.win { animation: jr-lit 0.35s ease-out 0.85s both; }
.jr.fresh .jr-v { animation: duel-in 0.35s ease-out 1.1s both; }
@keyframes jr-lit { from { background: var(--card-soft); box-shadow: none; } }
@media (max-width: 370px) { .jr-box { padding: 0.5rem 0.55rem; } .jr-box > strong { font-size: 1.6rem; } }
/* Duels-scherm: een lopend duel is één tikbare kaart (bord + regel), tik = Speel; een uitdaging aan jou ook (tik = Neem aan, ✕ apart);
   een duel dat op de ander wacht klapt open (19/11: "je wilt gewoon dat het werkt als je op die dingen klikt") */
.dl-card { display: flex; flex-direction: column; gap: 0.45rem; padding: 0.45rem; border-radius: 12px; background: var(--card-soft); cursor: pointer;
  -webkit-tap-highlight-color: transparent; }
.dl-card.turn, .dl-card.inc { box-shadow: inset 0 0 0 1.5px var(--accent); }
.dl-card:active { transform: scale(0.99); }
.dl-item > .dl-card { background: transparent; }
.dl-card-f { display: flex; align-items: center; gap: 0.5rem; min-height: 2.5rem; padding: 0 0.15rem; }
.dl-card-f > small { flex: 1; min-width: 0; font-size: 0.78rem; color: var(--muted); line-height: 1.35; }
.dl-card-f > small b { color: var(--fg); font-size: 0.9rem; }
.dl-card-f > small em { font-style: normal; color: var(--fg); font-weight: 600; }
.dl-card.sync .dl-card-f > small { animation: dl-sync 0.7s ease-in-out infinite alternate; }
.dl-card.out > .dl-link { margin: 0; }   /* je eigen uitdaging onder Wacht: de band zoals bij een uitdaging aan jou, zonder blauwe rand (niet jouw beurt) */
.dl-card.out .vb-me, .dl-card.out .vb-op { filter: saturate(0.4) brightness(0.72); }   /* 19/11: wachten = gedempt t.o.v. wat jouw beurt is */
/* de twee kanten bij een uitdaging (zoals de opening): jij blauw, de ander in zijn kleur, ⚔️ op de schuine naad */
.vb { --p: 50%; --tilt: 0.7rem; --ang: 24.3deg; position: relative; flex: none; height: 3.1rem; border-radius: 10px; overflow: hidden; color: #fff; isolation: isolate; }
.vb-op, .vb-me { position: absolute; inset: 0; }
.vb-op { background: linear-gradient(270deg, hsl(var(--h, 30) 58% 24%) 0%, hsl(var(--h, 30) 58% 42%) 75%); }
.vb-me { background: linear-gradient(90deg, hsl(222 66% 26%) 0%, hsl(222 64% 46%) 75%); clip-path: polygon(0 0, calc(var(--p) + var(--tilt)) 0, calc(var(--p) - var(--tilt)) 100%, 0 100%); }
.vb-op::after, .vb-me::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(-66deg, rgba(255, 255, 255, 0.07) 0 2px, transparent 2px 15px); }
.vb-line { position: absolute; z-index: 1; top: -25%; height: 150%; left: var(--p); width: 3px; margin-left: -1.5px; background: #fff; transform: rotate(var(--ang));
  box-shadow: 0 0 6px #f08a52, 0 0 14px rgba(240, 138, 82, 0.75); }
.vb-badge { position: absolute; z-index: 3; left: var(--p); top: 50%; width: 1.9rem; height: 1.9rem; margin: -0.95rem 0 0 -0.95rem; border-radius: 50%; display: grid; place-items: center;
  font-size: 0.9rem; line-height: 1; background: #131317; box-shadow: 0 0 0 2px #f08a52, 0 0 12px rgba(240, 138, 82, 0.6); }
.vb-in { position: absolute; z-index: 2; inset: 0; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0 0.6rem; }
.vb-side { display: flex; align-items: center; gap: 0.5rem; min-width: 0; }
.vb-side.op { flex-direction: row-reverse; }
.vb-side b { min-width: 0; font-size: 0.8rem; font-weight: 900; letter-spacing: 0.05em; text-transform: uppercase; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vb-av { flex: none; width: 1.75rem; height: 1.75rem; border-radius: 50%; display: grid; place-items: center; font-size: 0.95rem; font-weight: 800; color: #fff;
  background: rgba(255, 255, 255, 0.14); box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.92); }
.dl-hero > .vb, .duel-inv > .vb { align-self: stretch; }
/* de uitnodiging: de twee kanten groot, met de ⚔️ en "5 rondes" op de naad */
.vb.vbf { height: 8.5rem; --tilt: 1.6rem; --ang: 20.6deg; border-radius: 14px; }
.vbf .vb-in { padding: 0 1rem; }
.vbf .vb-side { flex-direction: column; gap: 0.35rem; }
.vbf .vb-av { width: 3.2rem; height: 3.2rem; font-size: 1.6rem; }
.vbf .vb-badge { top: 42%; width: 2.5rem; height: 2.5rem; margin: -1.25rem 0 0 -1.25rem; font-size: 1.2rem; }
.vbf-tag { position: absolute; z-index: 3; left: var(--p); top: calc(42% + 1.6rem); transform: translateX(-50%); padding: 0.18rem 0.65rem; border-radius: 999px; font-size: 0.66rem;
  font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; white-space: nowrap; color: #fff; background: #131317; box-shadow: 0 0 0 1.5px #f08a52; }
@media (prefers-reduced-motion: reduce) { .db-c > .fv, .db-n > .fv, .jr.fresh .jr-box.op > strong, .jr.fresh .jr-box.win, .jr.fresh .jr-v, .dl-card.sync .dl-card-f > small { animation: none; } }
/* 🤖 Bots (db/218, 21/11): één gezichtje vooraan in de rij van "Daag iemand uit" (altijd online), tik = een pop-up met de bots in de
   vorm van het ▾-menu (.dl-menu / .dl-opt), de hele regel = beginnen; na winst op het K.O.-eindscherm de volgende bot als één regel. */
.dl-face.bot .dl-av { background: color-mix(in srgb, var(--duel-arena) 24%, var(--card-soft)); }
.dl-pick.bot-only .dl-faces { justify-content: center; }   /* de lege staat: alleen de bot, gecentreerd boven de grote knop */
.bot-pop .duel-inv { gap: 0.7rem; }
.bot-menu { margin-top: 0.15rem; gap: 4px; }
.bot-opt { min-height: 3.5rem; gap: 0.7rem; padding: 0.55rem 0.6rem; }
.bot-opt .dl-av { width: 2.5rem; height: 2.5rem; font-size: 1.3rem; align-self: flex-start; margin-top: 0.15rem; }
.bot-opt .bo-t { flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 0.08rem; }
.bot-opt .bo-say { display: block; margin-top: 0.12rem; font-size: 0.8rem; font-weight: 400; line-height: 1.32; color: var(--fg); opacity: 0.8; text-align: left; text-wrap: pretty; }   /* db/226: zijn zin */
.dl-av.won { box-shadow: 0 0 0 2px var(--card-soft), 0 0 0 4px var(--green); }   /* db/226: ooit verslagen (zoals een gekozen gezichtje, in de winstkleur) */
.bot-opt .bo-t b { font-size: 0.98rem; display: flex; align-items: center; gap: 0.4rem; }
.bot-opt .bo-t small { margin-left: 0; font-size: 0.78rem; font-variant-numeric: tabular-nums; }
.bot-opt .bo-you { padding: 0.05rem 0.4rem; border-radius: 999px; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.02em;
  color: var(--duel-arena); background: color-mix(in srgb, var(--duel-arena) 16%, transparent); }
.bot-opt .bo-rec { margin-left: auto; font-size: 0.78rem; font-weight: 800; font-variant-numeric: tabular-nums; color: var(--muted); }
.bot-opt .bo-rec.up { color: var(--green-text); }
.bot-opt .bo-rec.down { color: var(--duel-loss); }
.bot-opt:has(.bo-rec)::after { margin-left: 0; padding-left: 0.6rem; }   /* de stand rechts, dan de › */
.bot-note { margin: -0.1rem 0 0; font-size: 0.76rem; color: var(--muted); }
/* ⚔️ db/227 (22/11): ⚡ Knock-out | ⚔️ Best of 5. Breed in de pop-up met bots (zijn keuze "Schakelaar bovenin"), klein op de kaart van de
   bot die klaarstaat (alleen de twee iconen als knopjes, de gekozen vorm erachter; zijn "kiezen tussen die twee icons"). */
.bm-seg { display: inline-flex; padding: 3px; gap: 2px; border-radius: 999px; background: var(--card-soft); box-shadow: inset 0 0 0 1px var(--border); }
.bm-o { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; min-height: 2.1rem; padding: 0.2rem 0.8rem; border: 0; border-radius: 999px;
  font: inherit; font-size: 0.88rem; font-weight: 700; color: var(--muted); background: transparent; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.bm-o[aria-checked="true"] { color: var(--fg); background: color-mix(in srgb, var(--duel-arena) 20%, var(--card));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--duel-arena) 55%, transparent); }
.bm-o:focus-visible { outline: 2px solid var(--duel-arena); outline-offset: 1px; }
.bm-o .bm-i { font-size: 1rem; line-height: 1; }
.bm-o[aria-checked="false"] .bm-i { opacity: 0.75; }
.bm-mini { display: inline-flex; align-items: center; gap: 0.35rem; margin-left: 0.4rem; vertical-align: middle; white-space: nowrap; }
.bm-mini .bm-seg { padding: 2px; }
.bm-mini .bm-o { min-height: 1.6rem; min-width: 2rem; padding: 0 0.4rem; }
.bm-mini .bm-o .bm-i { font-size: 0.9rem; }
.bm-mini .bm-n { font-size: 0.78rem; font-weight: 700; color: var(--fg); }
/* wat de bot zegt in Best of 5: in ronde 1 onder het scorebord (gedag, de hele ronde), op de eindstand (zijn laatste woord) */
.bo-line { display: flex; align-items: flex-start; gap: 0.45rem; margin: 0.5rem 0 0; font-size: 0.84rem; line-height: 1.35; color: var(--fg); text-align: left; }
.bo-line .bo-av { flex: none; width: 1.7rem; height: 1.7rem; display: grid; place-items: center; border-radius: 50%; font-size: 1rem; line-height: 1;
  background: color-mix(in srgb, var(--duel-arena) 18%, var(--card-soft)); }
.bo-line .bo-tx { padding: 0.32rem 0.65rem; border-radius: 0.25rem 0.85rem 0.85rem 0.85rem; background: var(--card-soft); box-shadow: inset 0 0 0 1px var(--border); text-wrap: pretty; }
.ep .bo-line { align-self: center; max-width: 21rem; }
.ep-botnext { margin-top: 0.6rem; }   /* .bot-next: zoals op het K.O.-eindscherm */
.bot-next { align-self: stretch; margin-top: -0.1rem; }
.bot-next .dl-opt { background: var(--card-soft); border: 1px solid var(--border); border-radius: 10px; }
/* ═══ ⚔️ Duelrating (db/225, 22/11/2026): de strook bovenaan Jouw stand, de pop-up, de Rated-schakelaar en het label "unrated".
   De regel op de eindstand is de ⚡-regel uit style.css (.fact-stats.rating-line). Alleen thema-tokens, geen gekleurde randen. ═══ */
.dr-strip { appearance: none; font: inherit; color: inherit; width: 100%; display: grid; grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center; column-gap: 0.7rem; margin: 0.15rem 0 0.5rem; padding: 0.6rem 0.7rem 0.6rem 0.75rem; border: 0; border-radius: 14px;
  background: var(--card-soft); text-align: left; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.dr-strip:hover { filter: none; background: color-mix(in srgb, var(--fg) 4%, var(--card-soft)); }
.dr-strip:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.dr-ico { font-size: 1.6rem; line-height: 1; }
.dr-main { display: flex; flex-direction: column; min-width: 0; }
.dr-lbl { font-size: 0.66rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--muted); }
.dr-row { display: flex; align-items: baseline; flex-wrap: wrap; column-gap: 0.55rem; }
.dr-num { font-size: 1.5rem; font-weight: 900; line-height: 1.15; font-variant-numeric: tabular-nums; letter-spacing: 0.01em; }
.dr-q { margin-left: 0.04em; color: var(--muted); font-weight: 700; }
.dr-trend { font-size: 0.76rem; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }
.dr-trend.up { color: var(--green-text); }
.dr-trend.down { color: var(--duel-loss); }
.dr-trend small { font-size: inherit; font-weight: 400; color: var(--muted); }
.dr-rank { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.15; }
.dr-rank b { font-size: 1.15rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.dr-rank small { font-size: 0.66rem; color: var(--muted); white-space: nowrap; }
.dr-chev { color: var(--muted); font-size: 1.15rem; font-weight: 700; }
.dr-strip:hover .dr-chev, .dr-strip:focus-visible .dr-chev { color: var(--accent); }
.dr-prov { display: flex; align-items: center; flex-wrap: wrap; gap: 0.15rem 0.45rem; font-size: 0.72rem; color: var(--muted); }
.dr-pips { display: inline-flex; gap: 3px; }
.dr-pips i { width: 7px; height: 7px; border-radius: 50%; background: color-mix(in srgb, var(--muted) 38%, transparent); }
.dr-pips i.on { background: var(--accent); }
.dr-pop .duel-inv { gap: 0.6rem; }
.dr-pop h2 { margin: 0; }
.dr-big { display: flex; align-items: baseline; justify-content: center; flex-wrap: wrap; gap: 0 0.55rem; margin-top: -0.2rem; }
.dr-big b { font-size: 2.4rem; font-weight: 900; line-height: 1.05; font-variant-numeric: tabular-nums; color: var(--fg); }
.dr-spark { align-self: stretch; margin: 0; }
.dr-spark svg { display: block; width: 100%; height: auto; }
.dr-spark .ar { fill: color-mix(in srgb, var(--accent) 16%, transparent); stroke: none; }
.dr-spark .ln { fill: none; stroke: var(--accent); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; }
.dr-spark .ax { stroke: color-mix(in srgb, var(--muted) 30%, transparent); stroke-width: 1; stroke-dasharray: 3 4; }
.dr-spark .dt { fill: var(--accent); stroke: var(--card); stroke-width: 2; }
.dr-spark text { fill: var(--muted); font-size: 10.5px; font-variant-numeric: tabular-nums; }
.dr-spark text.end { fill: var(--fg); font-weight: 700; }
.dr-pop .dr-spark figcaption { margin-top: 0.1rem; font-size: 0.7rem; color: var(--muted); }
.dr-pop .dr-h { align-self: stretch; margin: 0.2rem 0 -0.2rem; text-align: left; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--muted); }
.dr-list { align-self: stretch; list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; text-align: left; }
.dr-list li { display: grid; grid-template-columns: 1.3rem auto minmax(0, 1fr) auto; align-items: center; column-gap: 0.55rem; min-height: 2.5rem; padding: 0.2rem 0.55rem; border-radius: 10px; }
.dr-list li.me { background: color-mix(in srgb, var(--accent) 15%, var(--card-soft)); }
.dr-list .rk { font-size: 0.82rem; color: var(--muted); font-variant-numeric: tabular-nums; text-align: right; }
.dr-list .dl-av { width: 1.9rem; height: 1.9rem; font-size: 1.05rem; }
.dr-list .nm { min-width: 0; font-weight: 700; color: var(--fg); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dr-list .nm small { margin-left: 0.35rem; font-weight: 400; font-size: 0.72rem; color: var(--muted); }
.dr-list .rt { font-weight: 800; color: var(--fg); font-variant-numeric: tabular-nums; }
.dr-list li.prov .nm, .dr-list li.prov .rt { color: var(--muted); }
.dr-pop .dr-how { align-self: stretch; margin: 0.15rem 0 0; padding: 0.65rem 0 0 1.1rem; border-top: 1px solid var(--border); text-align: left; list-style: disc;
  display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.8rem; line-height: 1.45; color: var(--muted); }
.dr-pop .dr-how li::marker { color: color-mix(in srgb, var(--muted) 70%, transparent); }
.ep .rating-line, .duel-inv .rating-line { margin: 0.1rem 0 0; font-size: 0.92rem; color: var(--fg); }
/* ⚔️ db/239 (25/11/2026, mockup "Kies vorm én jaren" v2, zijn "misschien beter dit als pop-up dan?" → "bouw maar"): de kiesstrook. Vorm
   en jaren zijn twee losse keuzes, twee schakelaars (.bm-seg/.bm-o) direct boven de knop die begint, in een pop-up: elk gezichtje opent
   er een (vriend, of 🤖 de bots), de knop "Daag een vriend uit" die voor een link. Rated (alleen met een account, niet bij bots) rechts
   op de jarenregel: het woord + het schakelaartje uit ⚙️. Zonder Rated is de jarenregel even breed als de vormregel. */
.dk { align-self: stretch; display: flex; flex-direction: column; gap: 0.4rem; }
.dk .bm-seg { display: flex; }
.dk .bm-o { flex: 1 1 0; min-width: 0; white-space: nowrap; }
.dk-row { display: flex; align-items: center; gap: 0.5rem; }
.dk-row .bm-seg, .dk-row .bm-o { flex: none; }
.dk-row:not(:has(.dk-rt)) .bm-seg { flex: 1; }
.dk-row:not(:has(.dk-rt)) .bm-o { flex: 1 1 0; }
.dk-rt { margin-left: auto; display: inline-flex; align-items: center; gap: 0.5rem; min-height: 2.4rem; padding: 0 0.1rem 0 0.5rem; border: 0;
  background: transparent; color: var(--fg); font: inherit; font-size: 0.88rem; font-weight: 700; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.dk-rt:hover { filter: none; }
.dk-sw { position: relative; flex: none; width: 30px; height: 17px; border-radius: 999px; background: var(--border); transition: background 0.15s; }
.dk-sw::after { content: ""; position: absolute; left: 2px; top: 2px; width: 13px; height: 13px; border-radius: 50%; background: var(--fg); opacity: 0.8; transition: transform 0.15s; }
.dk-rt[aria-checked="true"] .dk-sw { background: var(--accent); }
.dk-rt[aria-checked="true"] .dk-sw::after { transform: translateX(13px); background: var(--on-accent); opacity: 1; }
.dk-rt:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
/* de pop-up voor een vriend of een link: band, jullie stand, de strook, één knop; het ✕ wit in de hoek van de band (anders valt hij eronder) */
.dk-pop .dl-vsline, .dk-pop .dk-go { align-self: stretch; }
.dk-pop .duel-inv > .vb { margin-bottom: 0.1rem; }
.dk-go { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; }
.duel-inv .dk-go .duel-ico { font-size: 1.1rem; }
.dk-pop .modal-close { z-index: 3; top: calc(1.3rem + 0.15rem); right: calc(1.1rem + 0.15rem); min-width: 2.2rem; min-height: 2.2rem; color: #fff; }
.dk-pop .modal-close:hover { background: rgb(0 0 0 / 0.25); color: #fff; }
.dk-pop .vb .vb-badge.ko-z { font-size: 0.95rem; }   /* ⚡ zoals in ko.js (die is hier nog niet geladen) */
.dk-note { margin: -0.2rem 0 0; font-size: 0.76rem; color: var(--muted); }   /* alleen bij een knock-out met iemand die niet online is */
@media (prefers-reduced-motion: reduce) { .dk-sw, .dk-sw::after { transition: none; } }
/* het label "unrated": alleen op duels die niet meetellen, rustig grijs (geen duelkleur: het is geen spelvorm) */
.dl-th.dr-fr { color: var(--muted); background: var(--card-soft); box-shadow: inset 0 0 0 1px var(--border); }
.ep .ep-eyebrow:has(.dr-fr) { padding-inline: 2.4rem; }
`;

  const TXT = {
    nl: {
      help: "Hoe werkt het?", sound: "Duel-geluid", snd0: "uit", snd1: "effecten", snd2: "effecten + muziek", st1: "Stuur een link naar een vriend", st1s: "Wie hem als eerste aanneemt, speelt tegen je.", st2: "Jullie spelen dezelfde 5 rondes", st2s: "Van makkelijk naar moeilijk, allebei wanneer je wilt binnen 24 uur.", st3: "Per ronde wint de hoogste score", st3s: "Wie de meeste rondes wint, wint het duel. Telt niet mee voor je rating.", heroTitle: "Daag een vriend uit voor een duel", copy: "Kopieer", linkAria: "Je duellink", yourRounds: "Jouw rondes", waitDetail: (n, k) => `${n} speelde ${k} van de 5. De rest zie je zodra ${n} verder speelt.`, exit: "Jaardle", roundN: (r) => `Ronde ${r}/5`, you: "Jij", played5: (k) => `${k}/5 gespeeld`, busy: "nog bezig", final: "eindstand", login: "Al een account? Log in", keepTitle: "Bewaar je duels op al je toestellen", keepBtn: "Maak een account", h2hNow: (a, b) => `jullie nu ${a}–${b}`,
      title: "Duels", close: "Sluiten", newBtn: "Daag een vriend uit", nameLabel: "Je naam (die ziet je tegenstander)", namePh: "Naam", go: "Daag uit",
      ready: "Je uitdaging staat klaar", sent: "Link verstuurd", copied: "Link gekopieerd", sentSub: "Wie hem als eerste aanneemt, speelt tegen je.", onlyFor: (n) => `Alleen ${n} kan hem aannemen.`,  sendLink: "Stuur de link",
      copyPrompt: "Kopieer de link:", empty: "Nog geen duels. Daag iemand uit: jullie spelen dezelfde 5 rondes en per ronde wint de hoogste score.",
      loading: "Even laden…", err: "Dat lukte niet. Probeer het nog eens.", retry: "Opnieuw", refresh: "Ververs",
      errMax: "Je hebt al 3 uitnodigingen openstaan. Wacht tot iemand aanneemt of trek er een in.", errName: "Vul eerst je naam in.",
      secTurn: "Jouw beurt", secWait: "Wacht", secDone: "Jouw stand",
      left: (h, m) => (h >= 1 ? `nog ${h} u` : `nog ${m} min`),
      accepted: (n) => `${n} nam aan`, oppDone: (n) => `${n} is klaar`, oppPlays: (n, k) => `${n} speelt · ${k}/5`, oppNotYet: (n) => `${n} begon nog niet`,
      yourLink: "Je link", resend: "Stuur opnieuw", withdraw: "Intrekken", play: "Speel",
      h2h: (a, b) => `jullie ${a}–${b}`, won: (a, b) => `gewonnen ${a}–${b}`, lost: (a, b) => `verloren ${a}–${b}`, drawn: (a, b) => `gelijk ${a}–${b}`,
      nobody: "Niemand nam hem aan", declined: (n) => `${n} wees af`, gone: "Verlopen",
      today: "vandaag", yesterday: "gisteren", moreOpp: (n) => `Nog ${n} ${n === 1 ? "tegenstander" : "tegenstanders"} ›`,
      total: (a, b) => `totaal ${a}–${b}`, revealTap: "Uitslag binnen · tik om te onthullen", revenge: "Revanche",
      invTitle: (n) => `${n} daagt je uit`, invRematch: (n) => `${n} wil revanche`, inv1: "<b>5 rondes</b>, van makkelijk naar moeilijk", inv2: "Per ronde wint de hoogste score", inv3: "Daarna heb je <b>24 uur</b> om ze te spelen",
      invName: (n) => `Je naam (die ziet ${n})`, accept: "Accepteer en speel", decline: "Nee, dank je", invFine: (l) => `${l} om aan te nemen · telt niet mee voor je rating`,
      own: "Dit is je eigen uitdaging", ownSub: "Stuur de link naar een vriend. Wie hem als eerste aanneemt, speelt tegen je.",
      taken: (n) => `${n} nam deze uitdaging al aan`, closedExp: "Deze uitdaging is verlopen", closedWd: "Deze uitdaging is ingetrokken", closedDecl: "Deze uitdaging is afgewezen",
      notForYou: "Deze revanche is voor iemand anders", notFound: "Deze duellink klopt niet", challengeX: (n) => `Daag ${n} uit`, challengeAny: "Daag zelf iemand uit",
      duelWith: (n) => `Duel met ${n}`, roundOf: (r) => `ronde ${r}/5`, theyHad: (n, s) => `${n} had <b>${s}</b> in deze ronde.`,
      rYours: "Deze is voor jou!", rTheirs: (n) => `Deze is voor ${n}.`, rDraw: "Gelijk.",
      notYet: (n) => `${n} speelde deze ronde nog niet. De score zie je zodra dat gebeurt.`, youDone: (n) => `Klaar! Nu ${n} nog`, pts: (s) => `${s} pt`,
      waitNote: (n, l) => `Je ziet de uitslag zodra ${n} heeft gespeeld (${l}).`, late: "Te laat: de 24 uur zijn om, deze ronde telt niet meer.",
      vWin: (a, b, n) => `Je wint ${a}–${b} van ${n}!`, vLoss: (a, b, n) => `${n} wint ${b}–${a}`, vDraw: (a, b) => `Gelijkspel, ${a}–${b}`,
      totalNote: (a, b) => `Totaal ${a} tegen ${b}`, played: (n) => `${n} heeft gespeeld`,
      nextRound: (r) => `Ronde ${r} ›`, nextDuel: (n) => `Volgend duel: ${n} ›`, toDaily: "Naar de daily ›", tell: (n) => `Laat ${n} het weten`, shareRes: "Deel uitslag",
      saveErr: "Je score opslaan lukte niet.",
      shInvite: (n) => `${ICON} ${n} daagt je uit voor een Jaardle-duel! 5 rondes, best of 5. Neem hem aan binnen 24 uur:`,
      shRematch: (n) => `${ICON} Revanche! ${n} daagt je opnieuw uit voor een Jaardle-duel. Neem hem aan binnen 24 uur:`,
      shTurn: (n) => `${ICON} Ik ben klaar met ons Jaardle-duel, jouw beurt ${n}!`,
      shResult: (n, a, b, r) => `${ICON} Jaardle-duel tegen ${n}: ${r === "w" ? "gewonnen" : r === "l" ? "verloren" : "gelijk"}, ${a}–${b}`, shTotals: (a, b) => `${a} tegen ${b}`,
      // db/189: teamgenoten direct uitdagen, seintjes, stand per tegenstander
      botsFace: "Bots", botsH: "Knock-out tegen een bot", botLvl: "Makkelijk|Gemiddeld|Sterk", botsNote: "Begint meteen · telt niet voor je rating", botsAny: "Speel tegen een bot", botsNoteB: "In je eigen tempo · telt niet voor je rating", errBotCool: "Even pauze: je speelde al veel tegen bots. Probeer het zo weer.", botYou: "≈ jij", botNext: "Volgende",
      botQ: (s) => `„${s}”`, saypip: "Ik ben net uit het ei. Ik lees alles twee keer.", sayrobo: "Elke gok in precies 10 seconden. Biep.", sayprof: "Vraag me alles over de Romeinen. Popmuziek? Nooit van gehoord.",   // 🤖 db/226: de zin van elke bot in de pop-up ("say" + key)
      pickH: "Daag iemand uit", faceNew: "nieuw", faceRun: "loopt", vsLine: (n) => `Jij tegen ${n}:`, linkInstead: "Liever een link sturen",
      challenged: (n) => `${n} is uitgedaagd`, pushYes: (n) => `${n} krijgt meteen een seintje. Nog 24 uur om aan te nemen.`, pushNo: (n) => `${n} ziet hem bij het openen van Jaardle. Nog 24 uur om aan te nemen.`,
      alsoLink: "Stuur ook een link", sendLinkShort: "Stuur link", acceptShort: "Neem aan", errRunning: (n) => `Je hebt al 3 duels met ${n} lopen.`,
      errRecent: "Je hebt net al 3 uitnodigingen verstuurd. Over een uurtje kan het weer.", errIncoming: (n) => `${n} daagt je al uit: neem die hieronder aan.`,
      eraSub: "Alle 5 rondes uit 1900 tot nu", modes: "Meer duelvormen", inv1Era: "<b>5 rondes</b> uit <b>1900 tot nu</b>, van makkelijk naar moeilijk", eraPh: (y) => `${y} – nu`, eraRefuse: (y) => `📻 Dit duel gaat over ${y} tot nu`,
      bellAcc: (n) => `Seintje als ${n} begint`, bellAccAny: "Seintje als iemand begint", bellDone: (n) => `Seintje als ${n} klaar is`,
      onAcc: (n) => `Je krijgt een seintje als ${n} begint`, onAccAny: "Je krijgt een seintje als iemand begint", onDone: (n) => `Je krijgt een seintje als ${n} klaar is`,
      pushThem: (n) => `${n} krijgt een seintje dat jij klaar bent`, pushDenied: "Meldingen staan uit voor deze site. Zet ze aan in je browser.",
      h2hChip: "Jullie stand", duelsN: (n) => (n === 1 ? "1 duel" : `${n} duels`), wonN: (n) => `${n} gewonnen`,
      stRounds: "Rondes", stAvg: "Gemiddeld", stAgainst: "tegen", stBest: "Grootste zege", playedPct: (n, p) => `${n} gespeeld · ${p}% gewonnen`, notYet: "nog niet gespeeld", koNotYetSub: "live, tegen een vriend of bot", standPick: "Kies een vorm", koNone: "Nog geen knock-outs. Daag een vriend die online is live uit, of speel er een tegen een bot.", bo5None: "Nog geen duels van 5 rondes uitgespeeld.", kosN: (n) => (n === 1 ? "1 knock-out" : `${n} knock-outs`), stFast: "Snelste K.O.", koRnd: (r) => `ronde ${r}`, botTag: "bot", koTag: "Knock-out", koRounds: (r) => (r === 1 ? "1 ronde" : `${r} rondes`), koWonS: "K.O. gewonnen", koLostS: "K.O. verloren", koDrawS: "knock-out gelijk", koRes: (res, r) => `${res === "w" ? "gewonnen" : res === "l" ? "verloren" : "gelijk"} · ronde ${r}`, koVWin: (r) => `Jij wint, K.O. in ronde ${r}`, koVLoss: (n, r) => `${n} wint, K.O. in ronde ${r}`, koVDraw: (r) => `Gelijkspel na ${r} rondes`, koVQuitW: (n) => `Jij wint, ${n} stopte`, koVQuitL: "Je stopte",
      // db/190: uitslag delen als plaatje, en de pop-up voor wie de link opent zonder mee te spelen
      imgBrand: "JAARDLE-DUEL", imgTotal: (a, b) => `Totaal ${a} – ${b}`, imgTag: "Raad het jaar bij een gebeurtenis", onTotal: "op totaal",
      spEyebrow: "Jaardle-duel", spWin: (a, b, w, l) => `${a} wint ${w}–${l} van ${b}`, spWinTotal: (a, b) => `${a} wint op totaal van ${b}`, spTie: (a, b) => `Gelijkspel tussen ${a} en ${b}`,
      spHow: "Allebei dezelfde 5 puzzels, van makkelijk naar moeilijk. Per ronde wint de hoogste score.", spDaily: "Speel de daily van vandaag",
      spNew: "Nieuw hier? In Jaardle raad je elke dag het jaar bij een gebeurtenis.", spMate: (n) => `Jij tegen ${n}`, spOther: "Daag iemand anders uit",
      notForYouD: "Deze uitdaging is voor iemand anders", lockedLogin: "Log in met je account om hem aan te nemen.", loginBtn: "Log in",
      // account-momenten (db/193): bij de uitslag wat je er met deze tegenstander aan hebt, en één regel in het Duels-scherm
      keepVs: (n) => `Met een account daag je ${n} uit zonder link`, keepWould: (t) => `Met een account had deze zege je ${t} opgeleverd`, keepList: "<u>Log in</u>, dan staan je tegenstanders hier en daag je ze uit met één tik",
      // de vraag van een ronde terugzien: de tip onder de tegels (dooft uit, zie peekHint)
      peekTip: "Tik op een ronde om de vraag terug te zien",
      // 19/11 (mockup v9 "mix"): de uitslag van een ronde, het scorebord, het logo bovenin een ronde, de uitnodiging
      rWin: (r) => `Ronde ${r} is voor jou`, rLoss: (r, n) => `Ronde ${r} is voor ${n}`, rTie: (r) => `Ronde ${r}: gelijkspel`, bar: "Jij legt de lat",
      barSub: (n, s, r) => `${n} ziet jouw ${s} pas na het spelen van ronde ${r}.`, yet: "moet<br>nog", itWas: "Het was", decider: "Beslissend", toDuels: "Naar Duels", fiveR: "5 rondes", turnBtn: "Best of 5", koName: "Knock-out · live", turnSub: "5 rondes, om de beurt", liveOff: (n) => `${n} krijgt een seintje en 1 minuut`, koSub: (n) => `${n} is online`,
      // ⚔️ db/239 (25/11): de kiesstrook in de pop-up (vorm + jaren) en de knop voor een link
      allYears: "Alle jaren", yearsAria: "Welke jaren", makeLink: "Maak een link",
      rated: "Rated", unrated: "unrated", drLbl: "Duelrating", drProv: "voorlopig", drLeft: (n) => `nog ${n} duels`, drWeek: "deze week", drOf: (n) => `van ${n}`, drEnd: "Jouw duelrating", drList: "Duellisten", drLast: (n) => `je laatste ${n} duels`, drProvRow: (n) => `voorlopig · ${n} van 10`,
      drHow1: "Elk duel tegen iemand met een account telt, Best of 5 en Knock-out samen. Bots niet.", drHow2: "Win van een sterkere speler en je krijgt er meer bij.", drHow3: "Na 10 duels staat je rating vast. Vaak achter elkaar tegen dezelfde speler telt minder.",
    },
    en: {
      help: "How does it work?", sound: "Duel sounds", snd0: "off", snd1: "effects", snd2: "effects + music", st1: "Send a link to a friend", st1s: "Whoever accepts it first plays against you.", st2: "You both play the same 5 rounds", st2s: "From easy to hard, each whenever you like within 24 hours.", st3: "The highest score wins each round", st3s: "Whoever wins the most rounds wins the duel. Doesn't count toward your rating.", heroTitle: "Challenge a friend to a duel", copy: "Copy", linkAria: "Your duel link", yourRounds: "Your rounds", waitDetail: (n, k) => `${n} has played ${k} of 5. You'll see the rest as ${n} plays on.`, exit: "Jaardle", roundN: (r) => `Round ${r}/5`, you: "You", played5: (k) => `${k}/5 played`, busy: "in progress", final: "final score", login: "Already have an account? Log in", keepTitle: "Keep your duels on all your devices", keepBtn: "Create an account", h2hNow: (a, b) => `${a}–${b} overall now`,
      title: "Duels", close: "Close", newBtn: "Challenge a friend", nameLabel: "Your name (your opponent sees it)", namePh: "Name", go: "Challenge",
      ready: "Your challenge is ready", sent: "Link sent", copied: "Link copied", sentSub: "Whoever accepts it first plays against you.", onlyFor: (n) => `Only ${n} can accept it.`,  sendLink: "Send the link",
      copyPrompt: "Copy the link:", empty: "No duels yet. Challenge someone: you both play the same 5 rounds and the highest score wins each round.",
      loading: "Loading…", err: "That didn't work. Please try again.", retry: "Retry", refresh: "Refresh",
      errMax: "You already have 3 open invitations. Wait for someone to accept, or withdraw one.", errName: "Fill in your name first.",
      secTurn: "Your turn", secWait: "Waiting", secDone: "Your record",
      left: (h, m) => (h >= 1 ? `${h} h left` : `${m} min left`),
      accepted: (n) => `${n} accepted`, oppDone: (n) => `${n} is done`, oppPlays: (n, k) => `${n} is playing · ${k}/5`, oppNotYet: (n) => `${n} hasn't started`,
      yourLink: "Your link", resend: "Send again", withdraw: "Withdraw", play: "Play",
      h2h: (a, b) => `${a}–${b} overall`, won: (a, b) => `won ${a}–${b}`, lost: (a, b) => `lost ${a}–${b}`, drawn: (a, b) => `tied ${a}–${b}`,
      nobody: "Nobody accepted it", declined: (n) => `${n} declined`, gone: "Expired",
      today: "today", yesterday: "yesterday", moreOpp: (n) => `${n} more ${n === 1 ? "opponent" : "opponents"} ›`,
      total: (a, b) => `total ${a}–${b}`, revealTap: "Result's in · tap to reveal", revenge: "Rematch",
      invTitle: (n) => `${n} challenges you`, invRematch: (n) => `${n} wants a rematch`, inv1: "<b>5 rounds</b>, from easy to hard", inv2: "The highest score wins each round", inv3: "Then you have <b>24 hours</b> to play them",
      invName: (n) => `Your name (${n} sees it)`, accept: "Accept and play", decline: "No, thanks", invFine: (l) => `${l} to accept · doesn't count toward your rating`,
      own: "This is your own challenge", ownSub: "Send the link to a friend. Whoever accepts it first plays against you.",
      taken: (n) => `${n} already accepted this challenge`, closedExp: "This challenge has expired", closedWd: "This challenge was withdrawn", closedDecl: "This challenge was declined",
      notForYou: "This rematch is for someone else", notFound: "This duel link doesn't work", challengeX: (n) => `Challenge ${n}`, challengeAny: "Challenge someone yourself",
      duelWith: (n) => `Duel with ${n}`, roundOf: (r) => `round ${r}/5`, theyHad: (n, s) => `${n} scored <b>${s}</b> in this round.`,
      rYours: "This one's yours!", rTheirs: (n) => `This one goes to ${n}.`, rDraw: "A tie.",
      notYet: (n) => `${n} hasn't played this round yet. You'll see the score once that happens.`, youDone: (n) => `Done! Now it's ${n}'s turn`, pts: (s) => `${s} pts`,
      waitNote: (n, l) => `You'll see the result once ${n} has played (${l}).`, late: "Too late: the 24 hours are up, this round no longer counts.",
      vWin: (a, b, n) => `You beat ${n} ${a}–${b}!`, vLoss: (a, b, n) => `${n} wins ${b}–${a}`, vDraw: (a, b) => `A draw, ${a}–${b}`,
      totalNote: (a, b) => `Total ${a} vs ${b}`, played: (n) => `${n} has played`,
      nextRound: (r) => `Round ${r} ›`, nextDuel: (n) => `Next duel: ${n} ›`, toDaily: "To the daily ›", tell: (n) => `Let ${n} know`, shareRes: "Share result",
      saveErr: "Saving your score didn't work.",
      shInvite: (n) => `${ICON} ${n} challenges you to a Jaardle duel! 5 rounds, best of 5. Accept within 24 hours:`,
      shRematch: (n) => `${ICON} Rematch! ${n} challenges you to another Jaardle duel. Accept within 24 hours:`,
      shTurn: (n) => `${ICON} I've finished our Jaardle duel, your turn ${n}!`,
      shResult: (n, a, b, r) => `${ICON} Jaardle duel vs ${n}: ${r === "w" ? "won" : r === "l" ? "lost" : "tied"} ${a}–${b}`, shTotals: (a, b) => `${a} vs ${b}`,
      // db/189: challenge teammates directly, notifications, head-to-head
      botsFace: "Bots", botsH: "Knockout against a bot", botLvl: "Easy|Medium|Hard", botsNote: "Starts right away · doesn't count toward your rating", botsAny: "Play a bot", botsNoteB: "At your own pace · doesn't count toward your rating", errBotCool: "Take a short break: you've played a lot against bots. Try again soon.", botYou: "≈ you", botNext: "Next",
      botQ: (s) => `“${s}”`, saypip: "I just hatched. I read everything twice.", sayrobo: "Every guess in exactly 10 seconds. Beep.", sayprof: "Ask me anything about the Romans. Pop music? Never heard of it.",   // 🤖 db/226: de zin van elke bot in de pop-up ("say" + key)
      pickH: "Challenge someone", faceNew: "new", faceRun: "running", vsLine: (n) => `You vs ${n}:`, linkInstead: "Send a link instead",
      challenged: (n) => `You challenged ${n}`, pushYes: (n) => `${n} gets a notification right away. 24 hours to accept.`, pushNo: (n) => `${n} will see it when opening Jaardle. 24 hours to accept.`,
      alsoLink: "Also send a link", sendLinkShort: "Send link", acceptShort: "Accept", errRunning: (n) => `You already have 3 duels going with ${n}.`,
      errRecent: "You just sent 3 invitations. You can send more in about an hour.", errIncoming: (n) => `${n} already challenged you: accept it below.`,
      eraSub: "All 5 rounds from 1900 or later", modes: "More duel types", inv1Era: "<b>5 rounds</b>, all <b>1900 or later</b>, from easy to hard", eraPh: (y) => `${y} – now`, eraRefuse: (y) => `📻 This duel only covers ${y} or later`,
      bellAcc: (n) => `Notify me when ${n} starts`, bellAccAny: "Notify me when someone starts", bellDone: (n) => `Notify me when ${n} is done`,
      onAcc: (n) => `You'll get a notification when ${n} starts`, onAccAny: "You'll get a notification when someone starts", onDone: (n) => `You'll get a notification when ${n} is done`,
      pushThem: (n) => `${n} gets a notification that you're done`, pushDenied: "Notifications are blocked for this site. Allow them in your browser.",
      h2hChip: "Your record", duelsN: (n) => (n === 1 ? "1 duel" : `${n} duels`), wonN: (n) => `${n} won`,
      stRounds: "Rounds", stAvg: "Average", stAgainst: "vs", stBest: "Biggest win", playedPct: (n, p) => `${n} played · ${p}% won`, notYet: "not played yet", koNotYetSub: "live, against a friend or a bot", standPick: "Choose a mode", koNone: "No knockouts yet. Challenge a friend who is online, or play one against a bot.", bo5None: "No best-of-5 duels finished yet.", kosN: (n) => (n === 1 ? "1 knockout" : `${n} knockouts`), stFast: "Fastest K.O.", koRnd: (r) => `round ${r}`, botTag: "bot", koTag: "Knockout", koRounds: (r) => (r === 1 ? "1 round" : `${r} rounds`), koWonS: "won by K.O.", koLostS: "lost by K.O.", koDrawS: "knockout draw", koRes: (res, r) => `${res === "w" ? "won" : res === "l" ? "lost" : "draw"} · round ${r}`, koVWin: (r) => `You win, K.O. in round ${r}`, koVLoss: (n, r) => `${n} wins, K.O. in round ${r}`, koVDraw: (r) => `A draw after ${r} rounds`, koVQuitW: (n) => `You win, ${n} stopped`, koVQuitL: "You stopped",
      imgBrand: "JAARDLE DUEL", imgTotal: (a, b) => `Total ${a} – ${b}`, imgTag: "Guess the year of the event", onTotal: "on points",
      spEyebrow: "Jaardle duel", spWin: (a, b, w, l) => `${a} beats ${b} ${w}–${l}`, spWinTotal: (a, b) => `${a} beats ${b} on points`, spTie: (a, b) => `${a} and ${b} tied`,
      spHow: "Both played the same 5 puzzles, from easy to hard. The highest score wins each round.", spDaily: "Play today's daily",
      spNew: "New here? In Jaardle you guess the year of an event, every day.", spMate: (n) => `You vs ${n}`, spOther: "Challenge someone else",
      notForYouD: "This challenge is for someone else", lockedLogin: "Log in to your account to accept it.", loginBtn: "Log in",
      // account-momenten (db/193): bij de uitslag wat je er met deze tegenstander aan hebt, en één regel in het Duels-scherm
      keepVs: (n) => `With an account, you can challenge ${n} without a link`, keepWould: (t) => `With an account, this win would have earned you ${t}`, keepList: "<u>Log in</u> and your opponents appear here: challenge them with one tap",
      // de vraag van een ronde terugzien: de tip onder de tegels (dooft uit, zie peekHint)
      peekTip: "Tap a round to see its question again",
      rWin: (r) => `Round ${r} is yours`, rLoss: (r, n) => `Round ${r} goes to ${n}`, rTie: (r) => `Round ${r}: a tie`, bar: "You set the bar",
      barSub: (n, s, r) => `${n} only sees your ${s} after playing round ${r}.`, yet: "yet to<br>play", itWas: "It was", decider: "Decider", toDuels: "To Duels", fiveR: "5 rounds", turnBtn: "Best of 5", koName: "Knockout · live", turnSub: "5 rounds, taking turns", liveOff: (n) => `${n} gets a ping and 1 minute`, koSub: (n) => `${n} is online`,
      // ⚔️ db/239 (25/11): de kiesstrook in de pop-up (vorm + jaren) en de knop voor een link
      allYears: "All years", yearsAria: "Which years", makeLink: "Make a link",
      rated: "Rated", unrated: "unrated", drLbl: "Duel rating", drProv: "provisional", drLeft: (n) => `${n} more duels`, drWeek: "this week", drOf: (n) => `of ${n}`, drEnd: "Your duel rating", drList: "Duelists", drLast: (n) => `your last ${n} duels`, drProvRow: (n) => `provisional · ${n} of 10`,
      drHow1: "Every duel against someone with an account counts, Best of 5 and Knockout together. Bots don't.", drHow2: "Beat a stronger player and you gain more.", drHow3: "After 10 duels your rating is settled. Many duels in a row against the same player count less.",
    },
    de: {
      help: "Wie funktioniert das?", sound: "Duell-Sounds", snd0: "aus", snd1: "Effekte", snd2: "Effekte + Musik", st1: "Schick einen Link an jemanden", st1s: "Wer ihn zuerst annimmt, spielt gegen dich.", st2: "Ihr spielt dieselben 5 Runden", st2s: "Von leicht bis schwer, wann ihr wollt, innerhalb von 24 Stunden.", st3: "Pro Runde gewinnt die höchste Punktzahl", st3s: "Wer die meisten Runden gewinnt, gewinnt das Duell. Zählt nicht für dein Rating.", heroTitle: "Fordere jemanden zum Duell heraus", copy: "Kopieren", linkAria: "Dein Duell-Link", yourRounds: "Deine Runden", waitDetail: (n, k) => `${n} hat ${k} von 5 gespielt. Den Rest siehst du, sobald ${n} weiterspielt.`, exit: "Jaardle", roundN: (r) => `Runde ${r}/5`, you: "Du", played5: (k) => `${k}/5 gespielt`, busy: "läuft noch", final: "Endstand", login: "Schon ein Konto? Anmelden", keepTitle: "Behalte deine Duelle auf all deinen Geräten", keepBtn: "Konto erstellen", h2hNow: (a, b) => `jetzt insgesamt ${a}–${b}`,
      title: "Duelle", close: "Schließen", newBtn: "Fordere jemanden heraus", nameLabel: "Dein Name (sieht dein Gegenüber)", namePh: "Name", go: "Herausfordern",
      ready: "Deine Herausforderung ist bereit", sent: "Link verschickt", copied: "Link kopiert", sentSub: "Wer ihn zuerst annimmt, spielt gegen dich.", onlyFor: (n) => `Nur ${n} kann sie annehmen.`,  sendLink: "Link senden",
      copyPrompt: "Kopiere den Link:", empty: "Noch keine Duelle. Fordere jemanden heraus: Ihr spielt dieselben 5 Runden, und pro Runde gewinnt die höchste Punktzahl.",
      loading: "Lädt…", err: "Das hat nicht geklappt. Versuch es noch einmal.", retry: "Nochmal", refresh: "Aktualisieren",
      errMax: "Du hast schon 3 offene Einladungen. Warte, bis jemand annimmt, oder zieh eine zurück.", errName: "Gib zuerst deinen Namen ein.",
      secTurn: "Du bist dran", secWait: "Wartet", secDone: "Dein Stand",
      left: (h, m) => (h >= 1 ? `noch ${h} Std.` : `noch ${m} Min.`),
      accepted: (n) => `${n} hat angenommen`, oppDone: (n) => `${n} ist fertig`, oppPlays: (n, k) => `${n} spielt · ${k}/5`, oppNotYet: (n) => `${n} hat noch nicht angefangen`,
      yourLink: "Dein Link", resend: "Nochmal senden", withdraw: "Zurückziehen", play: "Spielen",
      h2h: (a, b) => `insgesamt ${a}–${b}`, won: (a, b) => `gewonnen ${a}–${b}`, lost: (a, b) => `verloren ${a}–${b}`, drawn: (a, b) => `unentschieden ${a}–${b}`,
      nobody: "Niemand hat angenommen", declined: (n) => `${n} hat abgelehnt`, gone: "Abgelaufen",
      today: "heute", yesterday: "gestern", moreOpp: (n) => `${n} weitere ›`,
      total: (a, b) => `gesamt ${a}–${b}`, revealTap: "Ergebnis ist da · zum Aufdecken tippen", revenge: "Revanche",
      invTitle: (n) => `${n} fordert dich heraus`, invRematch: (n) => `${n} will Revanche`, inv1: "<b>5 Runden</b>, von leicht bis schwer", inv2: "Pro Runde gewinnt die höchste Punktzahl", inv3: "Danach hast du <b>24 Stunden</b> zum Spielen",
      invName: (n) => `Dein Name (sieht ${n})`, accept: "Annehmen und spielen", decline: "Nein, danke", invFine: (l) => `${l} zum Annehmen · zählt nicht für dein Rating`,
      own: "Das ist deine eigene Herausforderung", ownSub: "Schick den Link an jemanden. Wer ihn zuerst annimmt, spielt gegen dich.",
      taken: (n) => `${n} hat diese Herausforderung schon angenommen`, closedExp: "Diese Herausforderung ist abgelaufen", closedWd: "Diese Herausforderung wurde zurückgezogen",
      closedDecl: "Diese Herausforderung wurde abgelehnt", notForYou: "Diese Revanche ist für jemand anderen", notFound: "Dieser Duell-Link funktioniert nicht",
      challengeX: (n) => `${n} herausfordern`, challengeAny: "Selbst jemanden herausfordern",
      duelWith: (n) => `Duell mit ${n}`, roundOf: (r) => `Runde ${r}/5`, theyHad: (n, s) => `${n} hatte <b>${s}</b> in dieser Runde.`,
      rYours: "Die geht an dich!", rTheirs: (n) => `Die geht an ${n}.`, rDraw: "Unentschieden.",
      notYet: (n) => `${n} hat diese Runde noch nicht gespielt. Die Punktzahl siehst du, sobald das passiert.`, youDone: (n) => `Fertig! Jetzt ist ${n} dran`, pts: (s) => `${s} P.`,
      waitNote: (n, l) => `Das Ergebnis siehst du, sobald ${n} gespielt hat (${l}).`, late: "Zu spät: Die 24 Stunden sind um, diese Runde zählt nicht mehr.",
      vWin: (a, b, n) => `Du schlägst ${n} ${a}–${b}!`, vLoss: (a, b, n) => `${n} gewinnt ${b}–${a}`, vDraw: (a, b) => `Unentschieden, ${a}–${b}`,
      totalNote: (a, b) => `Gesamt ${a} zu ${b}`, played: (n) => `${n} hat gespielt`,
      nextRound: (r) => `Runde ${r} ›`, nextDuel: (n) => `Nächstes Duell: ${n} ›`, toDaily: "Zum täglichen Rätsel ›", tell: (n) => `Sag ${n} Bescheid`, shareRes: "Ergebnis teilen",
      saveErr: "Deine Punktzahl zu speichern hat nicht geklappt.",
      shInvite: (n) => `${ICON} ${n} fordert dich zu einem Jaardle-Duell heraus! 5 Runden, Best of 5. Nimm es innerhalb von 24 Stunden an:`,
      shRematch: (n) => `${ICON} Revanche! ${n} fordert dich erneut zu einem Jaardle-Duell heraus. Nimm es innerhalb von 24 Stunden an:`,
      shTurn: (n) => `${ICON} Ich bin mit unserem Jaardle-Duell fertig, du bist dran, ${n}!`,
      shResult: (n, a, b, r) => `${ICON} Jaardle-Duell gegen ${n}: ${r === "w" ? "gewonnen" : r === "l" ? "verloren" : "unentschieden"}, ${a}–${b}`, shTotals: (a, b) => `${a} zu ${b}`,
      // db/189: Teammitglieder direkt herausfordern, Benachrichtigungen, Stand pro Gegner
      botsFace: "Bots", botsH: "Knock-out gegen einen Bot", botLvl: "Leicht|Mittel|Schwer", botsNote: "Startet sofort · zählt nicht für dein Rating", botsAny: "Spiel gegen einen Bot", botsNoteB: "In deinem Tempo · zählt nicht für dein Rating", errBotCool: "Kurze Pause: Du hast viel gegen Bots gespielt. Versuch es gleich noch mal.", botYou: "≈ du", botNext: "Nächster",
      botQ: (s) => `„${s}“`, saypip: "Ich bin gerade geschlüpft. Ich lese alles zweimal.", sayrobo: "Jeder Tipp in genau 10 Sekunden. Piep.", sayprof: "Frag mich alles über die Römer. Popmusik? Nie gehört.",   // 🤖 db/226: de zin van elke bot in de pop-up ("say" + key)
      pickH: "Fordere jemanden heraus", faceNew: "neu", faceRun: "läuft", vsLine: (n) => `Du gegen ${n}:`, linkInstead: "Lieber einen Link schicken",
      challenged: (n) => `${n} ist herausgefordert`, pushYes: (n) => `${n} bekommt sofort eine Benachrichtigung. 24 Stunden zum Annehmen.`, pushNo: (n) => `${n} sieht sie beim Öffnen von Jaardle. 24 Stunden zum Annehmen.`,
      alsoLink: "Auch einen Link schicken", sendLinkShort: "Link schicken", acceptShort: "Annehmen", errRunning: (n) => `Du hast schon 3 laufende Duelle mit ${n}.`,
      errRecent: "Du hast gerade 3 Einladungen verschickt. In etwa einer Stunde geht es wieder.", errIncoming: (n) => `${n} hat dich schon herausgefordert: nimm unten an.`,
      eraSub: "Alle 5 Runden ab 1900", modes: "Weitere Duellarten", inv1Era: "<b>5 Runden</b>, alle <b>ab 1900</b>, von leicht bis schwer", eraPh: (y) => `${y} – heute`, eraRefuse: (y) => `📻 In diesem Duell geht es nur um ${y} bis heute`,
      bellAcc: (n) => `Benachrichtigen, wenn ${n} anfängt`, bellAccAny: "Benachrichtigen, wenn jemand anfängt", bellDone: (n) => `Benachrichtigen, wenn ${n} fertig ist`,
      onAcc: (n) => `Du bekommst eine Benachrichtigung, wenn ${n} anfängt`, onAccAny: "Du bekommst eine Benachrichtigung, wenn jemand anfängt", onDone: (n) => `Du bekommst eine Benachrichtigung, wenn ${n} fertig ist`,
      pushThem: (n) => `${n} bekommt eine Benachrichtigung, dass du fertig bist`, pushDenied: "Benachrichtigungen sind für diese Seite blockiert. Erlaube sie im Browser.",
      h2hChip: "Euer Stand", duelsN: (n) => (n === 1 ? "1 Duell" : `${n} Duelle`), wonN: (n) => `${n} gewonnen`,
      stRounds: "Runden", stAvg: "Schnitt", stAgainst: "gegen", stBest: "Höchster Sieg", playedPct: (n, p) => `${n} gespielt · ${p}% gewonnen`, notYet: "noch nicht gespielt", koNotYetSub: "live, gegen jemanden oder einen Bot", standPick: "Wähle einen Modus", koNone: "Noch keine Knock-outs. Fordere jemanden heraus, der online ist, oder spiel einen gegen einen Bot.", bo5None: "Noch keine Duelle mit 5 Runden beendet.", kosN: (n) => (n === 1 ? "1 Knock-out" : `${n} Knock-outs`), stFast: "Schnellstes K.o.", koRnd: (r) => `Runde ${r}`, botTag: "Bot", koTag: "Knock-out", koRounds: (r) => (r === 1 ? "1 Runde" : `${r} Runden`), koWonS: "per K.o. gewonnen", koLostS: "per K.o. verloren", koDrawS: "Knock-out unentschieden", koRes: (res, r) => `${res === "w" ? "gewonnen" : res === "l" ? "verloren" : "unentschieden"} · Runde ${r}`, koVWin: (r) => `Du gewinnst, K.o. in Runde ${r}`, koVLoss: (n, r) => `${n} gewinnt, K.o. in Runde ${r}`, koVDraw: (r) => `Unentschieden nach ${r} Runden`, koVQuitW: (n) => `Du gewinnst, ${n} hat aufgehört`, koVQuitL: "Du hast aufgehört",
      imgBrand: "JAARDLE-DUELL", imgTotal: (a, b) => `Gesamt ${a} – ${b}`, imgTag: "Errate das Jahr des Ereignisses", onTotal: "nach Punkten",
      spEyebrow: "Jaardle-Duell", spWin: (a, b, w, l) => `${a} schlägt ${b} ${w}–${l}`, spWinTotal: (a, b) => `${a} schlägt ${b} nach Punkten`, spTie: (a, b) => `Unentschieden zwischen ${a} und ${b}`,
      spHow: "Beide spielten dieselben 5 Rätsel, von leicht bis schwer. Pro Runde gewinnt die höhere Punktzahl.", spDaily: "Das heutige Rätsel spielen",
      spNew: "Neu hier? Bei Jaardle errätst du jeden Tag das Jahr eines Ereignisses.", spMate: (n) => `Du gegen ${n}`, spOther: "Fordere jemand anderen heraus",
      notForYouD: "Diese Herausforderung ist für jemand anderen", lockedLogin: "Melde dich an, um sie anzunehmen.", loginBtn: "Anmelden",
      // account-momenten (db/193): bij de uitslag wat je er met deze tegenstander aan hebt, en één regel in het Duels-scherm
      keepVs: (n) => `Mit einem Konto forderst du ${n} ohne Link heraus`, keepWould: (t) => `Mit einem Konto hätte dir dieser Sieg ${t} eingebracht`, keepList: "<u>Melde dich an</u>, dann forderst du deine Gegner hier mit einem Tipp heraus",
      // de vraag van een ronde terugzien: de tip onder de tegels (dooft uit, zie peekHint)
      peekTip: "Tippe auf eine Runde, um die Frage noch mal zu sehen",
      rWin: (r) => `Runde ${r} geht an dich`, rLoss: (r, n) => `Runde ${r} geht an ${n}`, rTie: (r) => `Runde ${r}: unentschieden`, bar: "Du legst die Latte",
      barSub: (n, s, r) => `${n} sieht deine ${s} erst nach Runde ${r}.`, yet: "noch<br>offen", itWas: "Es war", decider: "Entscheidung", toDuels: "Zu den Duellen", fiveR: "5 Runden", turnBtn: "Best of 5", koName: "Knock-out · live", turnSub: "5 Runden, abwechselnd", liveOff: (n) => `${n} bekommt eine Nachricht und 1 Minute`, koSub: (n) => `${n} ist online`,
      // ⚔️ db/239 (25/11): de kiesstrook in de pop-up (vorm + jaren) en de knop voor een link
      allYears: "Alle Jahre", yearsAria: "Welche Jahre", makeLink: "Link erstellen",
      rated: "Gewertet", unrated: "ungewertet", drLbl: "Duell-Rating", drProv: "vorläufig", drLeft: (n) => `noch ${n} Duelle`, drWeek: "diese Woche", drOf: (n) => `von ${n}`, drEnd: "Dein Duell-Rating", drList: "Duellanten", drLast: (n) => `deine letzten ${n} Duelle`, drProvRow: (n) => `vorläufig · ${n} von 10`,
      drHow1: "Jedes Duell gegen jemanden mit Konto zählt, Best of 5 und Knock-out zusammen. Bots nicht.", drHow2: "Schlägst du einen stärkeren Spieler, bekommst du mehr.", drHow3: "Nach 10 Duellen steht dein Rating fest. Viele Duelle hintereinander gegen dieselbe Person zählen weniger.",
    },
    es: {
      help: "¿Cómo funciona?", sound: "Sonidos de duelos", snd0: "desactivados", snd1: "efectos", snd2: "efectos + música", st1: "Envía un enlace a un amigo", st1s: "Quien lo acepte primero juega contra ti.", st2: "Jugáis las mismas 5 rondas", st2s: "De fácil a difícil, cada uno cuando quiera en 24 horas.", st3: "En cada ronda gana la puntuación más alta", st3s: "Quien gane más rondas gana el duelo. No cuenta para tu rating.", heroTitle: "Reta a un amigo a un duelo", copy: "Copiar", linkAria: "Tu enlace de duelo", yourRounds: "Tus rondas", waitDetail: (n, k) => `${n} ha jugado ${k} de 5. Verás el resto cuando siga jugando.`, exit: "Jaardle", roundN: (r) => `Ronda ${r}/5`, you: "Tú", played5: (k) => `${k}/5 jugadas`, busy: "en curso", final: "resultado final", login: "¿Ya tienes cuenta? Inicia sesión", keepTitle: "Guarda tus duelos en todos tus dispositivos", keepBtn: "Crear una cuenta", h2hNow: (a, b) => `ahora en total ${a}–${b}`,
      title: "Duelos", close: "Cerrar", newBtn: "Reta a un amigo", nameLabel: "Tu nombre (lo verá tu rival)", namePh: "Nombre", go: "Retar",
      ready: "Tu reto está listo", sent: "Enlace enviado", copied: "Enlace copiado", sentSub: "Quien lo acepte primero juega contra ti.", onlyFor: (n) => `Solo ${n} puede aceptarlo.`,  sendLink: "Enviar el enlace",
      copyPrompt: "Copia el enlace:", empty: "Aún no hay duelos. Reta a alguien: jugáis las mismas 5 rondas y en cada ronda gana la puntuación más alta.",
      loading: "Cargando…", err: "No ha funcionado. Inténtalo de nuevo.", retry: "Reintentar", refresh: "Actualizar",
      errMax: "Ya tienes 3 invitaciones abiertas. Espera a que alguien acepte o retira una.", errName: "Escribe primero tu nombre.",
      secTurn: "Tu turno", secWait: "En espera", secDone: "Tu marcador",
      left: (h, m) => (h >= 1 ? `quedan ${h} h` : `quedan ${m} min`),
      accepted: (n) => `${n} aceptó`, oppDone: (n) => `${n} ha terminado`, oppPlays: (n, k) => `${n} está jugando · ${k}/5`, oppNotYet: (n) => `${n} aún no ha empezado`,
      yourLink: "Tu enlace", resend: "Reenviar", withdraw: "Retirar", play: "Jugar",
      h2h: (a, b) => `en total ${a}–${b}`, won: (a, b) => `ganado ${a}–${b}`, lost: (a, b) => `perdido ${a}–${b}`, drawn: (a, b) => `empate ${a}–${b}`,
      nobody: "Nadie lo aceptó", declined: (n) => `${n} lo rechazó`, gone: "Caducado",
      today: "hoy", yesterday: "ayer", moreOpp: (n) => `${n} ${n === 1 ? "rival" : "rivales"} más ›`,
      total: (a, b) => `total ${a}–${b}`, revealTap: "Ya hay resultado · toca para descubrirlo", revenge: "Revancha",
      invTitle: (n) => `${n} te reta`, invRematch: (n) => `${n} quiere la revancha`, inv1: "<b>5 rondas</b>, de fácil a difícil", inv2: "En cada ronda gana la puntuación más alta", inv3: "Después tienes <b>24 horas</b> para jugarlas",
      invName: (n) => `Tu nombre (lo verá ${n})`, accept: "Aceptar y jugar", decline: "No, gracias", invFine: (l) => `${l} para aceptar · no cuenta para tu rating`,
      own: "Este es tu propio reto", ownSub: "Envía el enlace a un amigo. Quien lo acepte primero juega contra ti.",
      taken: (n) => `${n} ya aceptó este reto`, closedExp: "Este reto ha caducado", closedWd: "Este reto fue retirado", closedDecl: "Este reto fue rechazado",
      notForYou: "Esta revancha es para otra persona", notFound: "Este enlace de duelo no funciona", challengeX: (n) => `Retar a ${n}`, challengeAny: "Reta tú a alguien",
      duelWith: (n) => `Duelo con ${n}`, roundOf: (r) => `ronda ${r}/5`, theyHad: (n, s) => `${n} sacó <b>${s}</b> en esta ronda.`,
      rYours: "¡Esta es tuya!", rTheirs: (n) => `Esta es para ${n}.`, rDraw: "Empate.",
      notYet: (n) => `${n} aún no ha jugado esta ronda. Verás la puntuación cuando lo haga.`, youDone: (n) => `¡Listo! Ahora le toca a ${n}`, pts: (s) => `${s} pts`,
      waitNote: (n, l) => `Verás el resultado cuando ${n} haya jugado (${l}).`, late: "Demasiado tarde: pasaron las 24 horas, esta ronda ya no cuenta.",
      vWin: (a, b, n) => `¡Ganas a ${n} ${a}–${b}!`, vLoss: (a, b, n) => `${n} gana ${b}–${a}`, vDraw: (a, b) => `Empate, ${a}–${b}`,
      totalNote: (a, b) => `Total ${a} contra ${b}`, played: (n) => `${n} ha jugado`,
      nextRound: (r) => `Ronda ${r} ›`, nextDuel: (n) => `Siguiente duelo: ${n} ›`, toDaily: "Al Diario ›", tell: (n) => `Avisa a ${n}`, shareRes: "Compartir resultado",
      saveErr: "No se pudo guardar tu puntuación.",
      shInvite: (n) => `${ICON} ¡${n} te reta a un duelo de Jaardle! 5 rondas, al mejor de 5. Acéptalo en 24 horas:`,
      shRematch: (n) => `${ICON} ¡Revancha! ${n} te reta a otro duelo de Jaardle. Acéptalo en 24 horas:`,
      shTurn: (n) => `${ICON} He terminado nuestro duelo de Jaardle, ¡te toca, ${n}!`,
      shResult: (n, a, b, r) => `${ICON} Duelo de Jaardle contra ${n}: ${r === "w" ? "ganado" : r === "l" ? "perdido" : "empate"}, ${a}–${b}`, shTotals: (a, b) => `${a} contra ${b}`,
      // db/189: retar directamente a compañeros, avisos, marcador por rival
      botsFace: "Bots", botsH: "K.O. contra un bot", botLvl: "Fácil|Medio|Difícil", botsNote: "Empieza al instante · no cuenta para tu rating", botsAny: "Juega contra un bot", botsNoteB: "A tu ritmo · no cuenta para tu rating", errBotCool: "Haz una pausa: has jugado mucho contra bots. Vuelve a intentarlo en un rato.", botYou: "≈ tú", botNext: "Siguiente",
      botQ: (s) => `«${s}»`, saypip: "Acabo de salir del cascarón. Lo leo todo dos veces.", sayrobo: "Cada respuesta en exactamente 10 segundos. Bip.", sayprof: "Pregúntame lo que quieras sobre los romanos. ¿Música pop? Ni idea.",   // 🤖 db/226: de zin van elke bot in de pop-up ("say" + key)
      pickH: "Reta a alguien", faceNew: "nuevo", faceRun: "en curso", vsLine: (n) => `Tú contra ${n}:`, linkInstead: "Mejor enviar un enlace",
      challenged: (n) => `Has retado a ${n}`, pushYes: (n) => `${n} recibe un aviso ahora mismo. 24 horas para aceptar.`, pushNo: (n) => `${n} lo verá al abrir Jaardle. 24 horas para aceptar.`,
      alsoLink: "Enviar también un enlace", sendLinkShort: "Enviar enlace", acceptShort: "Aceptar", errRunning: (n) => `Ya tienes 3 duelos en curso con ${n}.`,
      errRecent: "Acabas de enviar 3 invitaciones. Podrás enviar más dentro de una hora.", errIncoming: (n) => `${n} ya te ha retado: acéptalo abajo.`,
      eraSub: "Las 5 rondas, de 1900 en adelante", modes: "Más tipos de duelo", inv1Era: "<b>5 rondas</b>, todas <b>de 1900 en adelante</b>, de fácil a difícil", eraPh: (y) => `${y} – hoy`, eraRefuse: (y) => `📻 Este duelo solo va de ${y} en adelante`,
      bellAcc: (n) => `Avísame cuando ${n} empiece`, bellAccAny: "Avísame cuando alguien empiece", bellDone: (n) => `Avísame cuando ${n} termine`,
      onAcc: (n) => `Te avisaremos cuando ${n} empiece`, onAccAny: "Te avisaremos cuando alguien empiece", onDone: (n) => `Te avisaremos cuando ${n} termine`,
      pushThem: (n) => `${n} recibe un aviso de que has terminado`, pushDenied: "Las notificaciones están bloqueadas para este sitio. Permítelas en el navegador.",
      h2hChip: "Marcador", duelsN: (n) => (n === 1 ? "1 duelo" : `${n} duelos`), wonN: (n) => `${n} ganados`,
      stRounds: "Rondas", stAvg: "Media", stAgainst: "contra", stBest: "Mayor victoria", playedPct: (n, p) => `${n} jugados · ${p}% ganados`, notYet: "aún sin jugar", koNotYetSub: "en vivo, contra un amigo o un bot", standPick: "Elige un modo", koNone: "Aún no hay K.O. Reta en vivo a un amigo que esté en línea, o juega uno contra un bot.", bo5None: "Aún no has terminado duelos de 5 rondas.", kosN: (n) => (n === 1 ? "1 K.O." : `${n} K.O.`), stFast: "K.O. más rápido", koRnd: (r) => `ronda ${r}`, botTag: "bot", koTag: "K.O.", koRounds: (r) => (r === 1 ? "1 ronda" : `${r} rondas`), koWonS: "ganado por K.O.", koLostS: "perdido por K.O.", koDrawS: "empate en K.O.", koRes: (res, r) => `${res === "w" ? "ganado" : res === "l" ? "perdido" : "empate"} · ronda ${r}`, koVWin: (r) => `Ganas tú, K.O. en la ronda ${r}`, koVLoss: (n, r) => `Gana ${n}, K.O. en la ronda ${r}`, koVDraw: (r) => `Empate tras ${r} rondas`, koVQuitW: (n) => `Ganas tú, ${n} lo dejó`, koVQuitL: "Lo dejaste",
      imgBrand: "DUELO JAARDLE", imgTotal: (a, b) => `Total ${a} – ${b}`, imgTag: "Adivina el año del acontecimiento", onTotal: "por puntos",
      spEyebrow: "Duelo de Jaardle", spWin: (a, b, w, l) => `${a} gana ${w}–${l} a ${b}`, spWinTotal: (a, b) => `${a} gana a ${b} por puntos`, spTie: (a, b) => `Empate entre ${a} y ${b}`,
      spHow: "Los dos jugaron los mismos 5 puzles, de fácil a difícil. En cada ronda gana la puntuación más alta.", spDaily: "Jugar el Diario de hoy",
      spNew: "¿Nuevo aquí? En Jaardle adivinas cada día el año de un acontecimiento.", spMate: (n) => `Tú contra ${n}`, spOther: "Reta a otra persona",
      notForYouD: "Este reto es para otra persona", lockedLogin: "Inicia sesión para aceptarlo.", loginBtn: "Iniciar sesión",
      // account-momenten (db/193): bij de uitslag wat je er met deze tegenstander aan hebt, en één regel in het Duels-scherm
      keepVs: (n) => `Con una cuenta retas a ${n} sin enlace`, keepWould: (t) => `Con una cuenta, esta victoria te habría dado ${t}`, keepList: "<u>Inicia sesión</u> y tus rivales aparecerán aquí: rétalos con un toque",
      // de vraag van een ronde terugzien: de tip onder de tegels (dooft uit, zie peekHint)
      peekTip: "Toca una ronda para volver a ver la pregunta",
      rWin: (r) => `La ronda ${r} es tuya`, rLoss: (r, n) => `La ronda ${r} es para ${n}`, rTie: (r) => `Ronda ${r}: empate`, bar: "Tú pones el listón",
      barSub: (n, s, r) => `${n} verá tu ${s} solo después de jugar la ronda ${r}.`, yet: "aún no<br>juega", itWas: "Era", decider: "Decisiva", toDuels: "A Duelos", fiveR: "5 rondas", turnBtn: "Al mejor de 5", koName: "K.O. · en vivo", turnSub: "5 rondas, por turnos", liveOff: (n) => `${n} recibe un aviso y 1 minuto`, koSub: (n) => `${n} está en línea`,
      // ⚔️ db/239 (25/11): de kiesstrook in de pop-up (vorm + jaren) en de knop voor een link
      allYears: "Todos los años", yearsAria: "Qué años", makeLink: "Crear un enlace",
      rated: "Puntuable", unrated: "sin puntuar", drLbl: "Rating de duelos", drProv: "provisional", drLeft: (n) => `faltan ${n} duelos`, drWeek: "esta semana", drOf: (n) => `de ${n}`, drEnd: "Tu rating de duelos", drList: "Duelistas", drLast: (n) => `tus últimos ${n} duelos`, drProvRow: (n) => `provisional · ${n} de 10`,
      drHow1: "Cuenta cada duelo contra alguien con cuenta, Best of 5 y knock-out juntos. Los bots no.", drHow2: "Si ganas a alguien más fuerte, sumas más.", drHow3: "Tras 10 duelos tu rating es firme. Muchos duelos seguidos contra la misma persona cuentan menos.",
    },
    pt: {
      help: "Como funciona?", sound: "Sons dos duelos", snd0: "desligados", snd1: "efeitos", snd2: "efeitos + música", st1: "Envie um link para um amigo", st1s: "Quem aceitar primeiro joga contra você.", st2: "Vocês jogam as mesmas 5 rodadas", st2s: "Da mais fácil à mais difícil, cada um quando quiser em até 24 horas.", st3: "Em cada rodada vence a maior pontuação", st3s: "Quem vencer mais rodadas vence o duelo. Não conta para o seu rating.", heroTitle: "Desafie um amigo para um duelo", copy: "Copiar", linkAria: "Seu link de duelo", yourRounds: "Suas rodadas", waitDetail: (n, k) => `${n} jogou ${k} de 5. Você verá o resto quando continuar jogando.`, exit: "Jaardle", roundN: (r) => `Rodada ${r}/5`, you: "Você", played5: (k) => `${k}/5 jogadas`, busy: "em andamento", final: "placar final", login: "Já tem conta? Entrar", keepTitle: "Guarde seus duelos em todos os seus aparelhos", keepBtn: "Criar uma conta", h2hNow: (a, b) => `agora no total ${a}–${b}`,
      title: "Duelos", close: "Fechar", newBtn: "Desafie um amigo", nameLabel: "Seu nome (seu adversário vai ver)", namePh: "Nome", go: "Desafiar",
      ready: "Seu desafio está pronto", sent: "Link enviado", copied: "Link copiado", sentSub: "Quem aceitar primeiro joga contra você.", onlyFor: (n) => `Só ${n} pode aceitar.`,  sendLink: "Enviar o link",
      copyPrompt: "Copie o link:", empty: "Ainda não há duelos. Desafie alguém: vocês jogam as mesmas 5 rodadas e em cada rodada vence a maior pontuação.",
      loading: "Carregando…", err: "Não deu certo. Tente de novo.", retry: "Tentar de novo", refresh: "Atualizar",
      errMax: "Você já tem 3 convites em aberto. Espere alguém aceitar ou retire um.", errName: "Preencha seu nome primeiro.",
      secTurn: "Sua vez", secWait: "Aguardando", secDone: "Seu placar",
      left: (h, m) => (h >= 1 ? `faltam ${h} h` : `faltam ${m} min`),
      accepted: (n) => `${n} aceitou`, oppDone: (n) => `${n} terminou`, oppPlays: (n, k) => `${n} está jogando · ${k}/5`, oppNotYet: (n) => `${n} ainda não começou`,
      yourLink: "Seu link", resend: "Enviar de novo", withdraw: "Retirar", play: "Jogar",
      h2h: (a, b) => `no total ${a}–${b}`, won: (a, b) => `venceu ${a}–${b}`, lost: (a, b) => `perdeu ${a}–${b}`, drawn: (a, b) => `empate ${a}–${b}`,
      nobody: "Ninguém aceitou", declined: (n) => `${n} recusou`, gone: "Expirado",
      today: "hoje", yesterday: "ontem", moreOpp: (n) => `Mais ${n} ${n === 1 ? "adversário" : "adversários"} ›`,
      total: (a, b) => `total ${a}–${b}`, revealTap: "Já há resultado · toque para revelar", revenge: "Revanche",
      invTitle: (n) => `${n} desafia você`, invRematch: (n) => `${n} quer revanche`, inv1: "<b>5 rodadas</b>, da mais fácil à mais difícil", inv2: "Em cada rodada vence a maior pontuação", inv3: "Depois você tem <b>24 horas</b> para jogá-las",
      invName: (n) => `Seu nome (${n} vai ver)`, accept: "Aceitar e jogar", decline: "Agora não", invFine: (l) => `${l} para aceitar · não conta para o seu rating`,
      own: "Este é o seu próprio desafio", ownSub: "Envie o link para um amigo. Quem aceitar primeiro joga contra você.",
      taken: (n) => `${n} já aceitou este desafio`, closedExp: "Este desafio expirou", closedWd: "Este desafio foi retirado", closedDecl: "Este desafio foi recusado",
      notForYou: "Esta revanche é para outra pessoa", notFound: "Este link de duelo não funciona", challengeX: (n) => `Desafiar ${n}`, challengeAny: "Desafie outra pessoa",
      duelWith: (n) => `Duelo com ${n}`, roundOf: (r) => `rodada ${r}/5`, theyHad: (n, s) => `${n} fez <b>${s}</b> nesta rodada.`,
      rYours: "Esta é sua!", rTheirs: (n) => `Esta fica com ${n}.`, rDraw: "Empate.",
      notYet: (n) => `${n} ainda não jogou esta rodada. Você verá a pontuação quando isso acontecer.`, youDone: (n) => `Pronto! Agora é a vez de ${n}`, pts: (s) => `${s} pts`,
      waitNote: (n, l) => `Você verá o resultado quando ${n} tiver jogado (${l}).`, late: "Tarde demais: as 24 horas acabaram, esta rodada não conta mais.",
      vWin: (a, b, n) => `Você vence ${n} por ${a}–${b}!`, vLoss: (a, b, n) => `${n} vence por ${b}–${a}`, vDraw: (a, b) => `Empate, ${a}–${b}`,
      totalNote: (a, b) => `Total ${a} contra ${b}`, played: (n) => `${n} jogou`,
      nextRound: (r) => `Rodada ${r} ›`, nextDuel: (n) => `Próximo duelo: ${n} ›`, toDaily: "Para o Diário ›", tell: (n) => `Avise ${n}`, shareRes: "Compartilhar resultado",
      saveErr: "Não foi possível salvar sua pontuação.",
      shInvite: (n) => `${ICON} ${n} desafia você para um duelo de Jaardle! 5 rodadas, melhor de 5. Aceite em até 24 horas:`,
      shRematch: (n) => `${ICON} Revanche! ${n} desafia você para outro duelo de Jaardle. Aceite em até 24 horas:`,
      shTurn: (n) => `${ICON} Terminei nosso duelo de Jaardle, sua vez, ${n}!`,
      shResult: (n, a, b, r) => `${ICON} Duelo de Jaardle contra ${n}: ${r === "w" ? "venci" : r === "l" ? "perdi" : "empate"}, ${a}–${b}`, shTotals: (a, b) => `${a} contra ${b}`,
      // db/189: desafiar colegas de equipe diretamente, avisos, placar por adversário
      botsFace: "Bots", botsH: "Nocaute contra um bot", botLvl: "Fácil|Médio|Difícil", botsNote: "Começa na hora · não conta para o seu rating", botsAny: "Jogue contra um bot", botsNoteB: "No seu ritmo · não conta para o seu rating", errBotCool: "Faça uma pausa: você jogou muito contra bots. Tente de novo daqui a pouco.", botYou: "≈ você", botNext: "Próximo",
      botQ: (s) => `“${s}”`, saypip: "Acabei de sair do ovo. Leio tudo duas vezes.", sayrobo: "Cada palpite em exatamente 10 segundos. Bip.", sayprof: "Me pergunte qualquer coisa sobre os romanos. Música pop? Nunca ouvi falar.",   // 🤖 db/226: de zin van elke bot in de pop-up ("say" + key)
      pickH: "Desafie alguém", faceNew: "novo", faceRun: "em curso", vsLine: (n) => `Você contra ${n}:`, linkInstead: "Prefiro enviar um link",
      challenged: (n) => `Você desafiou ${n}`, pushYes: (n) => `${n} recebe um aviso agora mesmo. 24 horas para aceitar.`, pushNo: (n) => `${n} verá ao abrir o Jaardle. 24 horas para aceitar.`,
      alsoLink: "Enviar também um link", sendLinkShort: "Enviar link", acceptShort: "Aceitar", errRunning: (n) => `Você já tem 3 duelos em andamento com ${n}.`,
      errRecent: "Você acabou de enviar 3 convites. Poderá enviar mais em cerca de uma hora.", errIncoming: (n) => `${n} já te desafiou: aceite abaixo.`,
      eraSub: "As 5 rodadas, de 1900 em diante", modes: "Mais tipos de duelo", inv1Era: "<b>5 rodadas</b>, todas <b>de 1900 em diante</b>, da mais fácil à mais difícil", eraPh: (y) => `${y} – hoje`, eraRefuse: (y) => `📻 Este duelo só vai de ${y} em diante`,
      bellAcc: (n) => `Avise-me quando ${n} começar`, bellAccAny: "Avise-me quando alguém começar", bellDone: (n) => `Avise-me quando ${n} terminar`,
      onAcc: (n) => `Você receberá um aviso quando ${n} começar`, onAccAny: "Você receberá um aviso quando alguém começar", onDone: (n) => `Você receberá um aviso quando ${n} terminar`,
      pushThem: (n) => `${n} recebe um aviso de que você terminou`, pushDenied: "As notificações estão bloqueadas para este site. Permita-as no navegador.",
      h2hChip: "Placar", duelsN: (n) => (n === 1 ? "1 duelo" : `${n} duelos`), wonN: (n) => `${n} vitórias`,
      stRounds: "Rodadas", stAvg: "Média", stAgainst: "contra", stBest: "Maior vitória", playedPct: (n, p) => `${n} jogados · ${p}% vencidos`, notYet: "ainda não jogado", koNotYetSub: "ao vivo, contra um amigo ou um bot", standPick: "Escolha um modo", koNone: "Ainda sem nocautes. Desafie ao vivo um amigo que esteja online, ou jogue um contra um bot.", bo5None: "Ainda nenhum duelo de 5 rodadas terminado.", kosN: (n) => (n === 1 ? "1 nocaute" : `${n} nocautes`), stFast: "Nocaute mais rápido", koRnd: (r) => `rodada ${r}`, botTag: "bot", koTag: "Nocaute", koRounds: (r) => (r === 1 ? "1 rodada" : `${r} rodadas`), koWonS: "venceu por nocaute", koLostS: "perdeu por nocaute", koDrawS: "nocaute empatado", koRes: (res, r) => `${res === "w" ? "venceu" : res === "l" ? "perdeu" : "empate"} · rodada ${r}`, koVWin: (r) => `Você venceu, nocaute na rodada ${r}`, koVLoss: (n, r) => `${n} venceu, nocaute na rodada ${r}`, koVDraw: (r) => `Empate após ${r} rodadas`, koVQuitW: (n) => `Você venceu, ${n} parou`, koVQuitL: "Você parou",
      imgBrand: "DUELO JAARDLE", imgTotal: (a, b) => `Total ${a} – ${b}`, imgTag: "Adivinhe o ano do acontecimento", onTotal: "nos pontos",
      spEyebrow: "Duelo de Jaardle", spWin: (a, b, w, l) => `${a} vence ${b} por ${w}–${l}`, spWinTotal: (a, b) => `${a} vence ${b} nos pontos`, spTie: (a, b) => `Empate entre ${a} e ${b}`,
      spHow: "Os dois jogaram os mesmos 5 desafios, do fácil ao difícil. Em cada rodada vence a maior pontuação.", spDaily: "Jogar o Diário de hoje",
      spNew: "Novo por aqui? No Jaardle você adivinha todo dia o ano de um acontecimento.", spMate: (n) => `Você contra ${n}`, spOther: "Desafie outra pessoa",
      notForYouD: "Este desafio é para outra pessoa", lockedLogin: "Entre na sua conta para aceitar.", loginBtn: "Entrar",
      // account-momenten (db/193): bij de uitslag wat je er met deze tegenstander aan hebt, en één regel in het Duels-scherm
      keepVs: (n) => `Com uma conta, você desafia ${n} sem link`, keepWould: (t) => `Com uma conta, esta vitória teria te dado ${t}`, keepList: "<u>Entre</u> e seus adversários aparecem aqui: desafie com um toque",
      // de vraag van een ronde terugzien: de tip onder de tegels (dooft uit, zie peekHint)
      peekTip: "Toque em uma rodada para ver a pergunta de novo",
      rWin: (r) => `A rodada ${r} é sua`, rLoss: (r, n) => `A rodada ${r} é de ${n}`, rTie: (r) => `Rodada ${r}: empate`, bar: "Você define a marca",
      barSub: (n, s, r) => `${n} só vê o seu ${s} depois de jogar a rodada ${r}.`, yet: "ainda<br>não", itWas: "Era", decider: "Decisiva", toDuels: "Para Duelos", fiveR: "5 rodadas", turnBtn: "Melhor de 5", koName: "Nocaute · ao vivo", turnSub: "5 rodadas, por turnos", liveOff: (n) => `${n} recebe um aviso e 1 minuto`, koSub: (n) => `${n} está online`,
      // ⚔️ db/239 (25/11): de kiesstrook in de pop-up (vorm + jaren) en de knop voor een link
      allYears: "Todos os anos", yearsAria: "Quais anos", makeLink: "Criar um link",
      rated: "Ranqueada", unrated: "casual", drLbl: "Rating de duelos", drProv: "provisório", drLeft: (n) => `faltam ${n} duelos`, drWeek: "esta semana", drOf: (n) => `de ${n}`, drEnd: "Seu rating de duelos", drList: "Duelistas", drLast: (n) => `seus últimos ${n} duelos`, drProvRow: (n) => `provisório · ${n} de 10`,
      drHow1: "Conta cada duelo contra alguém com conta, Best of 5 e nocaute juntos. Bots não.", drHow2: "Vencer alguém mais forte vale mais.", drHow3: "Depois de 10 duelos seu rating fica firme. Muitos duelos seguidos contra a mesma pessoa contam menos.",
    },
  };
  const tx = (l) => TXT[l] || TXT.en;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const sum = (a) => (a || []).reduce((x, y) => x + (y || 0), 0);
  const icoHtml = (ch = ICON) => `<span class="duel-ico" aria-hidden="true">${ch}</span>`;
  // De iconen van de twee duelvormen (22/11/2026, mockup "stand per vorm"): de DU/EL-tegel zonder letters, zelfde raster (512, rx 128) en
  // zwaarden, met in het midden de vijf rondes (3 gewonnen, 2 open) of een levensbalk die bijna op is. Bron: jaardle-tools/mockups/standen/icons.
  // Alleen groot, op de kaarten onder Jouw stand: klein waren ze niet mooi (zijn woorden), daar blijven ⚔️ (Best of 5) en ⚡ (Knock-out).
  const DM_SW = (c) => `<g fill="${c}">` + [45, -45].map((r) => `<g transform="translate(256 256) rotate(${r})"><path d="M0 -236L24 -196V112H-24V-196Z"/>` +
    `<rect x="-84" y="112" width="168" height="34" rx="17"/><rect x="-15" y="146" width="30" height="66" rx="6"/><circle cy="232" r="26"/></g>`).join("") + "</g>";
  const DM_SVG = {
    b: `<rect width="512" height="512" rx="128" fill="#e8794a"/>${DM_SW("#b9532a")}<g fill="#fff">` +
      [0, 1, 2].map((i) => `<rect x="${44 + i * 88}" y="215" width="72" height="82" rx="16"/>`).join("") +
      [3, 4].map((i) => `<rect x="${48 + i * 88}" y="219" width="64" height="74" rx="12" fill="none" stroke="#fff" stroke-width="8"/>`).join("") + "</g>",
    k: `<rect width="512" height="512" rx="128" fill="#d9433f"/>${DM_SW("#a8302c")}` +
      `<rect x="48" y="219" width="416" height="74" rx="12" fill="none" stroke="#fff" stroke-width="8"/><rect x="62" y="233" width="116" height="46" rx="4" fill="#fff"/>`,
  };
  const dmIco = (m, cls = "ms-ico") => `<svg class="${cls}" viewBox="0 0 512 512" aria-hidden="true" focusable="false">${DM_SVG[m]}</svg>`;
  const themeOf = (d) => (d && d.theme && THEMES[d.theme]) || null;
  const thHtml = (d) => { const m = themeOf(d); return (m ? `<span class="dl-th"><span aria-hidden="true">${m.ico}</span>${esc(m.label)}</span>` : "") +
    (d && d.rated === false && !d.bot ? `<span class="dl-th dr-fr">${esc(tx(H?.lang).unrated)}</span>` : ""); };   // ⚔️ db/225: telt niet voor de duelrating (een bot nooit: geen label, db/227)
  // het ⚔️ DUELS-logo: de zwaarden áchter het woord. Eén bron voor de kop van de Duels-pagina én die van een ronde (19/11: "niet overal
  // is duel logo nog hetzelfde": de ronde had nog ⚔️ DUEL naast elkaar)
  const logoHtml = (T) => `<span class="dl-logo-sw" aria-hidden="true">${ICON}</span><span class="dl-logo-txt">${esc(T.title)}</span>`;
  // ⚔️ db/225 (22/11/2026): de Rated-schakelaar ("0" = uit, standaard aan; zijn "gewoon rated met toggle is genoeg onder, niet te veel
  // tekst") en jouw duelrating (get_my_duel_rating; alleen met een account, anders null)
  const RATED_KEY = "jaardle:duel-rated";
  let ratedOn = (() => { try { return localStorage.getItem(RATED_KEY) !== "0"; } catch (e) { return true; } })();
  let listDr = null, drAt = 0, drBusy = null;
  function toggleRated(b) {
    ratedOn = !ratedOn;
    try { localStorage.setItem(RATED_KEY, ratedOn ? "1" : "0"); } catch (err) {}
    b.setAttribute("aria-checked", String(ratedOn));
    gc(ratedOn ? "duel-rated-on" : "duel-rated-off", ratedOn ? "Duel: Rated switched on" : "Duel: Rated switched off");
  }
  // ⚔️ db/239 (25/11/2026, mockup "Kies vorm én jaren" v2 https://claude.ai/artifact/7MFxFgQvLMGyCewKzYabeo; zijn "varianten zoals
  // 1900+ ook voor knock-outs … maar dan wel een redesign van het kiesscherm" → "misschien beter dit als pop-up dan?" → "bouw maar").
  // Het ▾-lijstje (een regel per vorm, 📻 1900+ ertussen alsof het een vorm was) is weg. Vorm en jaren zijn twee losse keuzes: twee
  // schakelaars in een pop-up, direct boven de knop die begint. Eén onthouden keuze voor vrienden én bots: botMode (k|b, db/227) en
  // pickTheme ("" = alle jaren, anders een sleutel uit THEMES). vorm = alleen als er iemand gekozen is (een link is altijd Best of 5:
  // een knock-out speel je live); rated = de schakelaar erbij (alleen met een account, en niet tegen een bot).
  const THEME_KEY = "jaardle:duel-theme";
  let pickTheme = (() => { try { const v = localStorage.getItem(THEME_KEY) || ""; return THEMES[v] ? v : ""; } catch (e) { return ""; } })();
  function setPickTheme(v) {
    const t = THEMES[v] ? v : "";
    if (t === pickTheme) return false;
    pickTheme = t;
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    gc("duel-years-" + (t || "all"), "Duel: years " + (t ? THEMES[t].label : "all"));
    return true;
  }
  function dkHtml(T, { vorm = true, rated = false } = {}) {
    const o = (k, v, cur, label, ico = "") => `<button type="button" class="bm-o" role="radio" data-act="dk" data-dk="${k}" data-v="${esc(v)}" aria-checked="${cur === v}">` +
      (ico ? `<span class="bm-i" aria-hidden="true">${ico}</span>` : "") + `${esc(label)}</button>`;
    return `<div class="dk">` +
      (vorm ? `<span class="bm-seg" role="radiogroup" aria-label="${esc(T.standPick)}">${o("m", "k", botMode, T.koTag, "⚡")}${o("m", "b", botMode, T.turnBtn, ICON)}</span>` : "") +
      `<div class="dk-row"><span class="bm-seg" role="radiogroup" aria-label="${esc(T.yearsAria)}">${o("t", "", pickTheme, T.allYears)}` +
      Object.entries(THEMES).map(([k, m]) => o("t", k, pickTheme, m.label, m.ico)).join("") + `</span>` +
      (rated && H?.loggedIn ? `<button type="button" class="dk-rt" role="switch" aria-checked="${ratedOn}" data-act="rated">${esc(T.rated)}<span class="dk-sw" aria-hidden="true"></span></button>` : "") +
      `</div></div>`;
  }
  // een tik in de strook: onthouden; true = er veranderde iets (de pop-up opnieuw tekenen)
  const dkPick = (b) => (b.dataset.dk === "m" ? setBotMode(b.dataset.v) : setPickTheme(b.dataset.v));
  const pickedTheme = () => pickTheme || null;   // wat de server krijgt (p_theme)
  const oppName = (d) => ((d && (d.ko ? d.opp_name : d.me === "c" ? d.o_name : d.c_name)) || "?");
  // De tegenstander in een duel dat we al kennen (cache of het Duels-scherm): de naam in de foutmelding bij een revanche.
  const nameOf = (code) => { const d = code && (cache[code] || (listItems || []).find((x) => x.code === code)); return d ? oppName(d) : null; };
  const oppFlair = (d) => (d && (d.ko ? d.opp_flair : d.me === "c" ? d.o_flair : d.c_flair)) || null;
  const initial = (n) => ((n || "?").trim().charAt(0) || "?").toUpperCase();
  // Meetpunten (GoatCounter, site jaardle-events via gcCount in game.js): de duel-trechter, zie de lijst in de kop van dit bestand.
  const gc = (path, title) => { try { H?.gc?.(path, title); } catch (e) {} };

  let H = null;            // host van de laatste aanroep (game.js)
  const cache = {};        // code → laatste antwoord van de server (met de puzzels, als we die kregen)
  let endNext = null, endShare = null;   // wat de knoppen op het eindscherm (en in de eindstand-pop-up) doen
  let listItems = null, listTop = "", openGrp = null, showAll = false;
  let listBots = [];   // 🤖 db/218: de bots uit duel_list (key, k, name, flair, elo, w, l), ook zonder account
  let listTargets = [], listH2h = {}, listKo = [];   // listKo (db/215): je afgelopen ⚡ knock-outs (laatste 30 van 90 dagen)   // db/189: wie je direct kunt uitdagen, je stand per tegenstander (alle duels)
  const selInGrp = {}, openWait = new Set();
  // Jouw stand per vorm (22/11/2026): "b" = Best of 5 (om de beurt, ook 1900+), "k" = knock-out. Een tik op een kaart onthoudt de keuze
  // (standPick); zonder keuze de vorm van je laatst afgelopen duel. standFocus = even de vorm van een uitslag die we openen (eindstand).
  let standPick = null, standFocus = null; try { standPick = localStorage.getItem("jaardle:duelStand"); } catch (e) {}
  let shut = new Set(); try { shut = new Set(JSON.parse(localStorage.getItem("jaardle:duelShut") || "[]")); } catch (e) {}   // 19/11: ingeklapte koppen
  const secH = (k, txt) => `<h3 class="dl-h"><button type="button" class="dl-hb" data-act="sec" data-sec="${k}" aria-expanded="${!shut.has(k)}">${txt}<span class="dl-hc" aria-hidden="true">▾</span></button></h3>`;
  let listAt = 0, listSync = null, syncCode = null, visHooked = false;   // verversen bij kijken (syncList)

  function ensureCss() {
    if (document.getElementById("duel-css")) return;
    const st = document.createElement("style");
    st.id = "duel-css";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ── opslag op dit toestel ──
  const readJson = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || "null"); return v ?? d; } catch (e) { return d; } };
  const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  function remember(code, deadline) {   // dit duel kan nieuws brengen: bij het laden even kijken (zie checkNews)
    const list = (readJson(LIST_KEY, []) || []).filter((x) => x && x.c !== code);
    list.push({ c: code, u: Date.parse(deadline || "") || Date.now() + 864e5 });
    writeJson(LIST_KEY, list.slice(-30));
    // Zonder account geduelleerd: bij de volgende keer inloggen zet game.js de duels van dit toestel (opnieuw) over naar het account.
    if (!H?.loggedIn) { try { localStorage.removeItem(CLAIM_KEY); } catch (e) {} }
  }
  // Een link-uitnodiging staat in geen lijst: bewaard tot je antwoordt (17/11: terug naar WhatsApp, app later weer open → onvindbaar).
  const inviteRec = () => { const v = readJson(INVITE_KEY, null); return v && v.c && v.u > Date.now() ? v : null; };
  function inviteKeep(d, later = false) { writeJson(INVITE_KEY, { c: d.code, u: Date.parse(d.deadline || "") || Date.now() + 864e5, later }); }
  function inviteDrop(code) { const v = readJson(INVITE_KEY, null); if (v && (!code || v.c === code)) { try { localStorage.removeItem(INVITE_KEY); } catch (e) {} } }
  // Duels-scherm en stipje: de bewaarde uitnodiging erbij onder Jouw beurt (één aanroep, alleen als er een is).
  async function withInvite(v) {
    const inv = readJson(INVITE_KEY, null);
    if (!inv || !inv.c || !v) return v;
    if (!(inv.u > Date.now())) { inviteDrop(); return v; }
    const items = Array.isArray(v.items) ? v.items : [];
    const there = items.find((x) => x.code === inv.c);
    if (there) { if (!incoming(there)) inviteDrop(inv.c); return v; }
    const g = await call("duel_get", { p_code: inv.c });
    if (!g.ok) return v;   // geen netwerk: volgende keer
    if (!g.v || !incoming(g.v)) { inviteDrop(inv.c); return v; }
    keep(g.v);
    return { ...v, items: [g.v, ...items], news: (v.news || 0) + 1 };
  }
  function setNews(n) {
    try { localStorage.setItem(NEWS_KEY, String(Math.max(0, n | 0))); } catch (e) {}
    H?.renderMenuDot?.();
  }
  function keep(d) {
    if (!d || !d.code) return d;
    const old = cache[d.code];
    cache[d.code] = { ...(old || {}), ...d, rounds: d.rounds || old?.rounds || null };
    return cache[d.code];
  }
  function storedName() { try { return (localStorage.getItem(NAME_KEY) || "").trim() || null; } catch (e) { return null; } }
  function myName() { return (H.loggedIn && H.myName && H.myName()) || storedName(); }
  function saveName(n) { try { localStorage.setItem(NAME_KEY, n); } catch (e) {} }
  const cleanName = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 20);

  // ── tijd ──
  function leftText(T, iso, now = Date.now()) {
    const ms = Date.parse(iso || "") - now;
    if (!(ms > 0)) return T.left(0, 0);
    const h = Math.floor(ms / 3600000);
    return h >= 1 ? T.left(h, 0) : T.left(0, Math.max(1, Math.ceil(ms / 60000)));
  }
  function whenText(T, iso, now = new Date()) {
    const d = new Date(iso);
    if (isNaN(d)) return "";
    const day = (x) => Math.floor(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) / 864e5);
    const diff = day(now) - day(d);
    if (diff <= 0) return T.today;
    if (diff === 1) return T.yesterday;
    try {
      return new Intl.DateTimeFormat(H?.intl || undefined, diff < 7 ? { weekday: "long" } : { day: "numeric", month: "short" }).format(d);
    } catch (e) { return d.toISOString().slice(0, 10); }
  }
  function clockText(iso) {
    try { return new Intl.DateTimeFormat(H?.intl || undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date(iso)); } catch (e) { return ""; }
  }

  // ── uitslag ──
  // mine/theirs: scores per ronde (korter = niet gespeeld). Niet gespeeld verliest van gespeeld; allebei niet = niemand.
  function outcome(mine, theirs) {
    let w = 0, l = 0, a = 0, b = 0;
    const per = [];
    for (let i = 0; i < 5; i++) {
      const x = mine?.[i], y = theirs?.[i];
      if (x != null) a += x;
      if (y != null) b += y;
      const r = x != null && y != null ? (x > y ? "w" : x < y ? "l" : "d") : x != null ? "w" : y != null ? "l" : "n";
      if (r === "w") w++;
      if (r === "l") l++;
      per.push(r);
    }
    return { w, l, a, b, per, res: w !== l ? (w > l ? "w" : "l") : a !== b ? (a > b ? "w" : "l") : "d" };
  }
  // Tussenstand van een lopend duel: alleen rondes die jullie allebei speelden.
  function stand(mine, theirs) {
    const n = Math.min(mine?.length || 0, theirs?.length || 0);
    let w = 0, l = 0;
    for (let i = 0; i < n; i++) { if (mine[i] > theirs[i]) w++; else if (mine[i] < theirs[i]) l++; }
    return { w, l, n };
  }
  const resText = (T, o) => (o.res === "w" ? T.won : o.res === "l" ? T.lost : T.drawn)(o.w, o.l);
  const squares = (o) => o.per.map((r) => (r === "w" ? "🟩" : r === "l" ? "🟥" : "⬜")).join("");
  const verdict = (T, o, n) => (o.res === "w" ? T.vWin(o.w, o.l, n) : o.res === "l" ? T.vLoss(o.w, o.l, n) : T.vDraw(o.w, o.l));
  // ⚡ een afgelopen knock-out in de lijst (db/215): de uitslag is wie er won (levens), niet de rondes; r = het aantal rondes;
  // opgegeven = een winnaar terwijl allebei nog levens hadden
  const koRes = (d) => (d.winner === "me" ? "w" : d.winner === "opp" ? "l" : "d");
  const koR = (d) => Math.max(d.mine?.length || 0, d.theirs?.length || 0);
  const koQuit = (d) => !!d.winner && d.hp > 0 && d.opp_hp > 0;
  const resOf = (d) => (d.ko ? koRes(d) : outcome(d.mine, d.theirs).res);
  // Een uitslag die je nog niet zag (seen: false van de server): de lijst verklapt hem nergens, dat doet de onthulling.
  const unrevealed = (d) => d.status === "done" && d.seen === false;
  // Je stand tegen één tegenstander over alle afgelopen duels (in de lijst van de server: 90 dagen, max 100), zonder ongeziene uitslagen.
  function h2hOf(items, k) {
    let a = 0, b = 0;
    for (const d of items || []) {
      if (d.status !== "done" || unrevealed(d) || (d.opp || oppName(d)) !== k) continue;
      const r = resOf(d);
      if (r === "w") a++; else if (r === "l") b++;
    }
    return [a, b];
  }

  // db/189: de stand van de server (alle duels, zonder ongeziene uitslagen); zonder die (oude server) uit de lijst van 90 dagen.
  // db/215: knock-outs tellen mee (kw/kl naast w/l)
  function recOf(k) { const x = listH2h[k]; return x ? [(x.w || 0) + (x.kw || 0), (x.l || 0) + (x.kl || 0)] : h2hOf(listItems, k); }
  const formIn = (list, k) => list.filter((d) => d.status === "done" && !unrevealed(d) && (d.opp || oppName(d)) === k)
    .sort((a, b) => (Date.parse(a.finished_at || a.created_at) || 0) - (Date.parse(b.finished_at || b.created_at) || 0))
    .slice(-8).map(resOf);
  // Per vorm (22/11): b = Best of 5 (w/l van de server, anders de lijst), k = knock-outs (kw/kl). Een gewoon duel (kaart, uitnodiging, link)
  // toont de Best of 5-stand, "Jij tegen X" allebei; alleen de gezichtjes houden het totaal (recOf).
  const recB = (k) => { const x = listH2h[k]; return x ? [x.w || 0, x.l || 0] : h2hOf(listItems, k); };
  const recK = (k) => { const x = listH2h[k]; return x ? [x.kw || 0, x.kl || 0] : h2hOf(listKo, k); };
  const formB = (k) => formIn(listItems || [], k), formK = (k) => formIn(listKo, k);
  const formHtml = (f) => (f.length ? `<span class="dl-form" aria-hidden="true">${f.map((r) => `<i class="${r}"></i>`).join("")}</span>` : "");
  const incoming = (d) => d.status === "open" && !d.me && d.can_accept;

  // ── account-momenten (zonder account) ──
  // opp_acc (db/193): je tegenstander heeft een account met een naam. Dan staat die na het inloggen bij je gezichtjes (duel_list.targets)
  // en klopt "daag je X uit zonder link". Zonder dat veld (oudere server, of een tegenstander zonder account): de algemene regel.
  const oppAcc = (d) => !!d && d.opp_acc === true;
  // Bij de uitslag (niet tijdens het wachten op de ander: daar staan de seintjes-knop en "Laat X het weten" al).
  // ⚔️ db/224: zou dit duel met een account een trofee zijn geweest? Remontada (gewonnen na 0–2) of Ongeschonden (geen ronde verloren),
  // alleen als jullie allebei alle vijf speelden; David vraagt een rating, dus die niet. Geeft de i18n-sleutel van de naam (game.js).
  function wouldEarn(d) {
    const mine = d?.mine || [], theirs = d?.theirs || [];
    if (d?.status !== "done" || mine.length < 5 || theirs.length < 5 || d.bot) return null;   // db/227: tegen een bot telt niets
    const o = outcome(mine, theirs);
    if (o.res !== "w") return null;
    let w = 0, l = 0, down = false;
    for (const r of o.per) { if (r === "w") w++; if (r === "l") l++; if (!w && l >= 2) down = true; }
    return down ? "achv_t_comeback" : !o.l ? "achv_t_unscathed" : null;
  }
  // Had het duel iets opgeleverd, dan zegt de regel dat (en een account maken zet dit duel over: duel_claim, dan telt het alsnog);
  // anders de regel van db/193.
  const keepHtml = (T, d, cls = "") => {
    const k = wouldEarn(d), name = k && H?.t ? H.t(k) : "";
    return `<div class="ep-keep${cls}"><span>${esc(name ? T.keepWould(name) : oppAcc(d) ? T.keepVs(oppName(d)) : T.keepTitle)}</span>` +
      `<button type="button" class="dl-mini" data-act="login">${esc(T.keepBtn)}</button></div>`;
  };
  // In het Duels-scherm: één regel onder de knop, zodra je een uitslag zag van een duel tegen iemand met een account (een uitslag
  // die je nog niet zag telt niet: de onthulling heeft haar eigen regel). De knop draagt dat duel mee voor de terugkeer.
  function acctHtml(T, items) {
    if (H?.loggedIn) return "";
    const d = (items || []).find((x) => x.status === "done" && !unrevealed(x) && oppAcc(x));
    return d ? `<button type="button" class="dl-linkb dl-acct" data-act="login" data-code="${esc(d.code)}">${T.keepList}</button>` : "";
  }
  // Na het inloggen (ook na een Google-redirect, 30 minuten geldig) komt dit duel terug: een uitnodiging als pop-up, je eigen duel
  // als het Duels-scherm bij dat duel (openInvite). game.js zet eerst je duels over: zie duelsAfterLogin.
  const parkLogin = (code) => { if (code) writeJson(PENDING_KEY, { code, at: Date.now() }); };

  // ── rondjes: je flair (met een account) of de beginletter ──
  // De ander krijgt dezelfde achtergrondkleur als zijn gezichtje in het score-histogram (faceHue in game.js, op naam).
  function avHtml(flair, name, cls = "", hue = true) {
    const f = flair && H?.flairHtml ? H.flairHtml(flair) : "";
    const h = hue && H?.faceHue ? H.faceHue(name) : null;
    return `<span class="dl-av${cls}${f ? " fl" : ""}${h != null ? " hue" : ""}"${h != null ? ` style="--h:${h}"` : ""} aria-hidden="true">${f || esc(initial(name))}</span>`;
  }
  const meAv = (T, cls = " me") => avHtml(H?.loggedIn ? H.myFlair?.() : null, myName() || T.you, cls, false);

  // ── het scorebord (19/11/2026, mockup v9 "mix"; vervangt de vijf tegels en de VS-kop) ──
  // Twee regels (jij en de ander) × vijf rondes, rechts het aantal gewonnen rondes. Een ronde krijgt de kleur van wie hem won (jij blauw,
  // de ander de tint van zijn gezichtje); een slotje = de ander speelde die ronde al (zijn score zie je pas na jouw ronde, zoals altijd);
  // cur = de ronde die je nu speelt. Een ronde die je speelde (of elke ronde als het duel klaar is) opent de vraag (openPeek), behalve
  // met peek: false (een kaart in de lijst is zelf de knop). fresh = de net gespeelde ronde (klapt om), flip = de onthulling.
  const LOCK = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5.1 7.2V5.4a2.9 2.9 0 0 1 5.8 0v1.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><rect x="3.3" y="7.1" width="9.4" height="7" rx="1.6" fill="currentColor"/></svg>`;
  function dbAv(flair, name, cls = "db-av") {
    const f = flair && H?.flairHtml ? H.flairHtml(flair) : "";
    return `<span class="${cls}${f ? " fl" : ""}" aria-hidden="true">${f || esc(initial(name))}</span>`;
  }
  const meFlair = () => (H?.loggedIn ? H.myFlair?.() : null);
  const meNameOr = (T, d = "?") => (H ? myName() : null) || d;
  function boardHtml(T, d, { size = "", meta = "", hot = false, cur = -1, fresh = -1, flip = false, hint = false, peek = true } = {}) {
    const mine = d.mine || [], theirs = d.theirs || [], done = d.status === "done", n = oppName(d);
    const their = d.their_done ?? theirs.length, o = outcome(mine, theirs), s = done ? o : stand(mine, theirs);
    const per = (i) => (done ? o.per[i] : mine[i] != null && theirs[i] != null ? (mine[i] > theirs[i] ? "w" : mine[i] < theirs[i] ? "l" : "d") : null);
    const can = (i) => peek && canPeek(d, i);
    if (peek && d.code && d.me) peekSrc.set(d.code, d);   // de stand zoals je hem ziet: de pop-up toont dezelfde scores
    const cell = (i, side) => {
      const me = side === "me", r = per(i), x = mine[i], v = me ? x : theirs[i];
      const cls = r === (me ? "w" : "l") ? "w" : r === "d" ? "d" : r && r !== "n" ? "l" : "";
      const qa = can(i) ? ` data-q="${esc(d.code)}.${i}"` + (me ? ` role="button" tabindex="0" aria-haspopup="dialog"` : "") : "";
      if (flip) return `<span class="db-c" style="--i:${i}"${qa}>${me ? x ?? "–" : "?"}<i class="fv${cls ? " " + cls : ""}">${v ?? "–"}</i></span>`;
      if (v == null) {
        if (!me && !done && i < their) return x == null ? `<span class="db-c seal${i === cur ? " cur" : ""}">${LOCK}</span>` : `<span class="db-c"${qa}>?</span>`;   // de ander speelde al
        return `<span class="db-c${me && i === cur ? " cur" : ""}"${done ? qa : ""}>${done ? "–" : ""}</span>`;   // klaar: ook een ronde die niemand speelde heeft een vraag
      }
      return `<span class="db-c ${cls || "p"}${i === fresh ? " new" : ""}"${qa}>${v}</span>`;
    };
    const lead = s.w > s.l ? "me" : s.l > s.w ? "op" : "", champ = done && !flip && o.res !== "d" ? (o.res === "w" ? "me" : "op") : "";
    const num = (side) => {
      const v = side === "me" ? s.w : s.l;
      if (flip) return `<b class="db-n">?<i class="fv${lead === side ? " lead" : ""}">${v}</i></b>`;
      return `<b class="db-n${lead === side ? " lead" : ""}${champ === side ? " champ" : ""}">${v}</b>`;
    };
    const row = (side) => `<div class="db-rw ${side}"><span class="db-who">${side === "me" ? dbAv(meFlair(), meNameOr(T, T.you)) : dbAv(oppFlair(d), n)}` +
      `<b>${esc(side === "me" ? T.you : n)}</b></span>${[0, 1, 2, 3, 4].map((i) => cell(i, side)).join("")}${num(side)}</div>`;
    const hd = size === "mini" ? "" : `<div class="db-hd" aria-hidden="true"><span class="db-meta${hot ? " hot" : ""}">${esc(meta)}</span>` +
      [0, 1, 2, 3, 4].map((i) => `<i${i === cur || i === fresh ? ' class="on"' : ""}>${i + 1}</i>`).join("") + `<i></i></div>`;
    let h = `<div class="db${size ? " " + size : ""}" style="--h:${H?.faceHue ? H.faceHue(n) : 30}">${hd}${row("me")}${row("op")}</div>`;
    if (hint && [0, 1, 2, 3, 4].some(can) && peekHint(d.code)) h += `<p class="duel-tip${flip ? " after" : ""}">${esc(T.peekTip)}</p>`;
    return h;
  }
  // De twee kanten (zoals de opening van een ronde): alleen bij een uitdaging (19/11: "als dat alleen voor uitdaging aannemen is").
  // poster = groot (de uitnodiging), met tag op de naad ("5 rondes").
  function bandHtml(T, n, flair, { poster = false, tag = "" } = {}) {
    return `<div class="vb${poster ? " vbf" : ""}" style="--h:${H?.faceHue ? H.faceHue(n) : 30}" aria-hidden="true"><div class="vb-op"></div><div class="vb-me"></div><span class="vb-line"></span>` +
      `<div class="vb-in"><span class="vb-side me">${dbAv(meFlair(), meNameOr(T), "vb-av")}<b>${esc(T.you)}</b></span>` +
      `<span class="vb-side op">${dbAv(flair, n, "vb-av")}${n === "?" ? "" : `<b>${esc(n)}</b>`}</span></div>` +
      `<span class="vb-badge">${ICON}</span>${tag ? `<span class="vbf-tag">${esc(tag)}</span>` : ""}</div>`;
  }

  // ── delen (zoals doShare in game.js: deelvenster op een telefoon, anders klembord) ──
  async function shareText(T, text, url, btn) {
    const full = url ? `${text}\n${url}` : text;
    if (navigator.share && H.isMobile()) {
      try { await navigator.share({ text: full }); return "shared"; }
      catch (e) { if (e && e.name === "AbortError") return "abort"; }
    }
    try {
      await navigator.clipboard.writeText(full);
      flash(btn, T.copied);
      return "copied";
    } catch (e) {
      try { window.prompt(T.copyPrompt, full); } catch (e2) {}
      return "prompt";
    }
  }
  function flash(btn, text) {
    const lab = btn && (btn.querySelector(".share-label") || btn);
    if (!lab) return;
    const was = lab.textContent;
    lab.textContent = text;
    setTimeout(() => { lab.textContent = was; }, 1500);
  }
  // Alleen de link (Kopieer-knop naast het linkveld). Lukt kopiëren niet, dan staat hij geselecteerd in het veld.
  async function copyLink(T, code, btn) {
    gc("duel-copy-link", "Duel: link copied (button)");
    try { await navigator.clipboard.writeText(LINK(code)); flash(btn, T.copied); }
    catch (e) { const inp = btn?.closest(".dl-link")?.querySelector("input"); if (inp) { inp.focus(); inp.select(); } }
  }
  const linkField = (T, code) => `<div class="dl-link"><input type="text" readonly value="${esc(LINK(code).replace(/^https:\/\//, ""))}" aria-label="${esc(T.linkAria)}">` +
    `<button type="button" class="dl-mini" data-act="copy" data-code="${code}">${esc(T.copy)}</button></div>`;

  // ── het deelplaatje (db/190, mockup v6 "scorebord"): canvas 1080×1080, op dit toestel getekend; geen puzzels of jaartallen ──
  // Winnaar links met een kroon (gelijk: de uitdager), elke ronde met beide scores, iedere speler in de kleur van zijn gezichtje.
  const HUES = [8, 28, 42, 168, 190, 262, 292, 330];   // = FACE_HUES in game.js (een test bewaakt dat)
  const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif', EMO = '"JaardleEmoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  const PAL = {   // de spelkleuren (style.css), los van een seizoens-skin
    dark: { bg: "#1a1a1a", card: "#262626", soft: "#2c2c2c", fg: "#f5f5f5", mu: "#a3a3a3", line: "#383838", arena: "#e8794a", gold: "#f4c430", tile: 0.3, gray: "rgba(158,158,158,0.22)", glow: "rgba(232,121,74,0.24)", edge: "rgba(232,121,74,0.5)" },
    light: { bg: "#f4f1ea", card: "#fffdf8", soft: "#ebe7dd", fg: "#211e19", mu: "#5d574b", line: "#d6d0c2", arena: "#b5531c", gold: "#c99a0e", tile: 0.26, gray: "rgba(158,158,158,0.24)", glow: "rgba(181,83,28,0.16)", edge: "rgba(181,83,28,0.45)" },
  };
  // Een flair = een emoji of een vondst-tekening ("v:<id>"), eventueel met een effect erachter ("~sparkle").
  const FX_IDS = ["sparkle", "ember", "glow", "vizier", "sweat", "ripple", "lotus", "timer", "pendulum", "eclipse", "shard", "aura", "web", "lights", "snow", "lives"];   // = de .fx-<id> in flair-fx.css (een test bewaakt dat)
  function flairParts(f) {
    const [g, fx] = String(f || "").split("~"), vf = !!g && g.startsWith("v:");
    return { em: g && !vf ? g : null, vf: vf ? g : null, fx: FX_IDS.includes(fx) ? fx : null };
  }
  const flairEmoji = (f) => flairParts(f).em;
  // De tekening van een vondst-flair als plaatje (game.js, stil); null als dat niet lukt of de browser het canvas er niet meer van
  // laat uitlezen (dan zou het hele plaatje mislukken): dan de beginletter.
  async function vondstImg(vf) {
    try {
      const im = await H?.vondstImage?.(vf);
      if (!im) return null;
      const t = document.createElement("canvas"); t.width = t.height = 2;
      const tc = t.getContext("2d"); tc.drawImage(im, 0, 0, 2, 2); tc.getImageData(0, 0, 1, 1);
      return im;
    } catch (e) { return null; }
  }
  // De flair-effecten in hun stilstaande stand (.fl-still in flair-fx.css), nagetekend: zelfde vormen, maten in em en kleuren per thema.
  // (x0, y0) = linksboven van het em-vak van de flair, E = 1em; back = de laag achter de flair (alleen de ring van de eclips).
  const FXC = {
    dark: { core: "#fff6c8", edge: "#f5c518", sc: "#fff6c0", sm: "#ffb12e", se: "#ff5a12", sr: "rgba(130,24,0,0.75)", gi: "#fff0b0", gm: "#ffb02e", go: "rgba(255,70,0,0.9)",
      target: "#ff5a4d", da: "#9fdcff", db: "#3aa0e8", ripple: "#9be7dc", line: "#cfc8dd", timer: "#ffb020",
      ohi: "#efe8ff", omid: "#a58ff0", odeep: "#5a45b0", odark: "#1a0e33", oblack: "#07040f", halo: "rgba(150,118,255,0.75)", ring: "#a58ff0", dcore: "#fff", dmid: "#cdbdff", dedge: "#8f6cff",
      ai: "#e6dcff", am: "#8f6cff", ao: "rgba(88,40,200,0.85)", web: "#ece3ff", spider: "#f3ecff",
      wire: "#7f998c", hi: "#fff", r: "#ff5a5a", y: "#ffc93c", g: "#40d98a", b: "#5aa8ff", flake: "#fff", flake0: "rgba(255,255,255,0)", lotus: ["#f2e8c9", "#e8d9ae", "#6db06d"], lotusLine: null, heart: "#e05a4e" },
    light: { core: "#ffc933", edge: "#b25a00", sc: "#ffe2a0", sm: "#ff9a1f", se: "#d94a00", sr: "rgba(120,30,0,0.7)", gi: "#ffd37a", gm: "#ff9a1f", go: "rgba(214,60,0,0.85)",
      target: "#d32f2f", da: "#5cb8f0", db: "#1f78c8", ripple: "#2a9d8f", line: "#6d6555", timer: "#c77700",
      ohi: "#ffffff", omid: "#7a5cd6", odeep: "#432c8f", odark: "#160b2c", oblack: "#07040f", halo: "rgba(90,60,190,0.7)", ring: "#5d3fb8", dcore: "#fff", dmid: "#6a40d8", dedge: "#1a0e33",
      ai: "#b9a2ff", am: "#6a40d8", ao: "rgba(50,20,140,0.9)", web: "#4a2f7a", spider: "#2d1b45",
      wire: "#41564b", hi: "#fff3c4", r: "#e5383b", y: "#f0a000", g: "#12a060", b: "#2f84ea", flake: "#9fb6c8", flake0: "rgba(159,182,200,0)", lotus: ["#fffaf0", "#f6ecd0", "#4e9a52"], lotusLine: "#b99a47", heart: "#d2453a" },
  };
  const FX_STAR = [[50, 0], [60, 40], [100, 50], [60, 60], [50, 100], [40, 60], [0, 50], [40, 40]];
  const FX_HEART = "M12 22C5 17 1 13 1 8.5C1 4.5 4 2 7.3 2C9.4 2 11 3.2 12 5C13 3.2 14.6 2 16.7 2C20 2 23 4.5 23 8.5C23 13 19 17 12 22Z";   // ❤️ Volle levens (één hart van 24×24; drie op x 0/27/54)
  const FX_DROP = [[50, 0], [74, 38], [100, 68], [84, 94], [50, 100], [16, 94], [0, 68], [26, 38]];
  const FX_LOTUS = [["M50 26C56 36 56 48 50 57C44 48 44 36 50 26Z", 0], ["M29 38C40 40 48 48 50 59C40 59 31 50 29 38Z", 1], ["M71 38C60 40 52 48 50 59C60 59 69 50 71 38Z", 1], ["M27 61Q50 74 73 61Q66 77 50 77Q34 77 27 61Z", 2]];
  const FX_WEB = "M100 0L2 0M100 0L9.5 37.5M100 0L30.7 69.3M100 0L62.5 90.5M100 0L100 98M70.7 0Q75.9 4.8 73 11.2M73 11.2Q79.6 13.7 79.3 20.7M79.3 20.7Q86.3 20.4 88.8 27M88.8 27Q95.2 24.1 100 29.3M41.5 0Q51.8 9.6 45.9 22.4M45.9 22.4Q59.1 27.3 58.6 41.4M58.6 41.4Q72.7 40.9 77.6 54.1M77.6 54.1Q90.4 48.2 100 58.5M12.2 0Q27.7 14.4 18.9 33.6M18.9 33.6Q38.7 41 37.9 62.1M37.9 62.1Q59 61.3 66.4 81.1M66.4 81.1Q85.6 72.3 100 87.8";
  const FX_SPIDER = ["M12 25a8 9 0 1 0 16 0a8 9 0 1 0 -16 0ZM15 14a5 5 0 1 0 10 0a5 5 0 1 0 -10 0ZM17.2 13a1.15 1.15 0 1 0 2.3 0a1.15 1.15 0 1 0 -2.3 0ZM20.5 13a1.15 1.15 0 1 0 2.3 0a1.15 1.15 0 1 0 -2.3 0Z",
    "M14 20Q5 11 2 19M13 23Q3 21 1 29M13 26Q4 30 3 38M15 29Q9 35 8 43M26 20Q35 11 38 19M27 23Q37 21 39 29M27 26Q36 30 37 38M25 29Q31 35 32 43"];
  function drawFx(c, fx, x0, y0, E, theme, back) {
    const K = FXC[theme] || FXC.dark, x1 = x0 + E, y1 = y0 + E, cx = x0 + E / 2, cy = y0 + E / 2, TAU = Math.PI * 2;
    const poly = (pts, x, y, w, h) => { c.beginPath(); pts.forEach(([px, py], i) => c[i ? "lineTo" : "moveTo"](x + (px / 100) * w, y + (py / 100) * h)); c.closePath(); };
    const radial = (x, y, r, stops) => { const g = c.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
    const dot = (x, y, r, stops) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = radial(x, y, r, stops); c.fill(); };
    const box = (x, y, w, h, deg, fn, ox = 0.5, oy = 0.5) => { c.save(); c.translate(x + w * ox, y + h * oy); c.rotate((deg * Math.PI) / 180); c.translate(-w * ox, -h * oy); fn(w, h); c.restore(); };
    c.save();
    if (back) {
      if (fx === "eclipse") {   // de ring, schuin achter de flair, met een gloed
        c.translate(cx, cy); c.rotate((-14 * Math.PI) / 180); c.beginPath(); c.ellipse(0, 0, 0.7225 * E, 0.2525 * E, 0, 0, TAU);
        c.lineWidth = 0.055 * E; c.strokeStyle = K.ring; c.shadowColor = K.halo; c.shadowBlur = 0.1 * E; c.stroke();
      }
      c.restore();
      return;
    }
    if (fx === "sparkle") {
      const star = (x, y, s) => box(x, y, s, s, 45, (w) => { const q = w * 0.85, o = (w - q) / 2; poly(FX_STAR, o, o, q, q);
        c.fillStyle = radial(w / 2, w / 2, q * 0.707, [[0, K.core], [0.22, K.core], [0.85, K.edge], [1, K.edge]]); c.fill(); });
      star(x1 - 0.32 * E, y0 - 0.24 * E, 0.56 * E); star(x0 - 0.2 * E, y1 - 0.32 * E, 0.4 * E);
    } else if (fx === "ember") {   // vonkjes in zes kolommen, onder- en bovenaan uitgevaagd
      const top = y1 - 1.04 * E, HH = 1.12 * E, L = x0 - 0.3 * E, tw = 0.32 * E;
      const stops = [[0, K.sc], [0.22, K.sc], [0.22, K.sm], [0.46, K.sm], [0.46, K.se], [0.68, K.se], [0.68, K.sr], [0.88, K.sr], [1, "rgba(0,0,0,0)"]];
      [[2.3, 0.62, 0.1, 0.24], [32.8, 0.5, 0.075, 0.47], [96.9, 0.74, 0.09, 0.25], [9.4, 0.62, 0.1, 0.37], [65.6, 0.5, 0.075, 0.25], [89.8, 0.74, 0.09, 0.41]].forEach(([p, th, r, off]) => {
        const x = L + (1.6 * E - tw) * (p / 100) + tw / 2;
        for (let k = -3; k <= 3; k++) {
          const y = top + off * E + k * th * E + (th * E) / 2, t = (top + HH - y) / HH;
          if (t <= 0 || t >= 1) continue;
          c.globalAlpha = t < 0.26 ? t / 0.26 : t <= 0.58 ? 1 : (1 - t) / 0.42;
          dot(x, y, r * E, stops);
        }
      });
    } else if (fx === "vizier") {
      c.strokeStyle = K.target; c.fillStyle = K.target; c.lineWidth = 0.07 * E;
      c.beginPath(); c.arc(cx, cy, 0.535 * E, 0, TAU); c.stroke();
      const B = 1.36 * E, t = 0.07 * E, l = 0.24 * E;
      c.fillRect(cx - t / 2, cy - B / 2, t, l); c.fillRect(cx - t / 2, cy + B / 2 - l, t, l); c.fillRect(cx - B / 2, cy - t / 2, l, t); c.fillRect(cx + B / 2 - l, cy - t / 2, l, t);
    } else if (fx === "sweat") {
      const drop = (x, y, w, h) => { poly(FX_DROP, x, y, w, h); const g = c.createRadialGradient(x + 0.35 * w, y + 0.32 * h, 0, x + 0.35 * w, y + 0.32 * h, h);
        g.addColorStop(0, "#fff"); g.addColorStop(0.1, "#fff"); g.addColorStop(0.35, K.da); g.addColorStop(1, K.db); c.fillStyle = g; c.fill(); };
      drop(x1 - 0.16 * E, y0 + 0.04 * E, 0.22 * E, 0.31 * E); drop(x0 - 0.06 * E, y0 + 0.27 * E, 0.17 * E, 0.24 * E);
    } else if (fx === "ripple") {
      [[0.5, 0.85], [0.88, 0.45]].forEach(([s, al]) => { c.globalAlpha = al; c.beginPath(); c.ellipse(cx, y1 - 0.05 * E, (0.71 * E) * s, (0.21 * E) * s, 0, 0, TAU);
        c.lineWidth = 0.08 * E * s; c.strokeStyle = K.ripple; c.stroke(); });
    } else if (fx === "lotus") {
      const lotus = (x, y, w, h) => { c.save(); const s = Math.min(w / 50, h / 55); c.translate(x + (w - 50 * s) / 2, y + (h - 55 * s) / 2); c.scale(s, s); c.translate(-25, -24);
        FX_LOTUS.forEach(([d, k]) => { const p = new Path2D(d); c.fillStyle = K.lotus[k]; c.fill(p); if (K.lotusLine && k < 2) { c.lineWidth = 1.3; c.lineJoin = "round"; c.strokeStyle = K.lotusLine; c.stroke(p); } });
        c.restore(); };
      lotus(x1 - 0.32 * E, y1 - 0.42 * E, 0.54 * E, 0.6 * E); lotus(x0 - 0.16 * E, y1 - 0.32 * E, 0.42 * E, 0.46 * E);
    } else if (fx === "timer") {   // een ring om de flair, 300° gevuld vanaf boven
      c.beginPath(); c.arc(cx, cy, 0.57 * E, -Math.PI / 2, -Math.PI / 2 + (300 / 180) * Math.PI); c.lineWidth = 0.1 * E; c.strokeStyle = K.timer; c.stroke();
    } else if (fx === "pendulum") {   // het draadje en het ophangpunt boven de flair
      const b = y0 + 0.08 * E;
      c.fillStyle = K.line; c.fillRect(cx - 0.0225 * E, b - 0.26 * E, 0.045 * E, 0.26 * E);
      c.beginPath(); c.arc(cx, b - 0.3 * E, 0.07 * E, 0, TAU); c.fill();
    } else if (fx === "eclipse") {   // het lichtpunt vóór de flair
      dot(cx - 0.402 * E, cy + 0.123 * E, 0.105 * E, [[0, K.dcore], [0.24, K.dcore], [0.4, K.dmid], [0.66, K.dedge], [0.72, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0)"]]);
    } else if (fx === "shard") {   // twee scherven zwart glas
      const shard = (x, y, w, h, deg, pts) => box(x, y, w, h, deg, (w, h) => {
        const a = (128 * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a), L = Math.abs(w * dx) + Math.abs(h * dy);
        const g = c.createLinearGradient(w / 2 - (dx * L) / 2, h / 2 - (dy * L) / 2, w / 2 + (dx * L) / 2, h / 2 + (dy * L) / 2);
        [[0, K.ohi], [0.12, K.ohi], [0.12, K.omid], [0.26, K.omid], [0.26, K.odeep], [0.4, K.odeep], [0.4, K.odark], [0.62, K.odark], [0.62, K.oblack], [1, K.oblack]].forEach(([o, col]) => g.addColorStop(o, col));
        poly(pts, 0, 0, w, h); c.fillStyle = g; c.fill(); });
      shard(x1 - 0.19 * E, y0 - 0.21 * E, 0.46 * E, 0.52 * E, 5, [[44, 0], [100, 26], [92, 66], [58, 100], [6, 74]]);
      shard(x0 - 0.21 * E, y1 - 0.33 * E, 0.34 * E, 0.38 * E, -4, [[26, 0], [100, 18], [80, 100], [8, 82], [0, 36]]);
    } else if (fx === "web") {   // een web in de hoek rechtsboven en een spinnetje aan een draad
      const w = 0.76 * E;
      c.save(); c.translate(x1 + 0.17 * E - w, y0 - 0.27 * E); c.scale(w / 100, w / 100); c.globalAlpha = 0.95;
      c.lineWidth = 4.4; c.lineCap = "round"; c.strokeStyle = K.web; c.stroke(new Path2D(FX_WEB)); c.restore();
      box(x1 - 0.18 * E, y0 - 0.2 * E, 0.32 * E, 0.84 * E, -6, (bw, bh) => {
        c.fillStyle = K.spider; c.fillRect(bw / 2 - 0.0175 * E, 0, 0.035 * E, 0.52 * E);
        c.save(); c.translate((bw - 0.29 * E) / 2, bh - 0.32 * E); c.scale((0.29 * E) / 40, (0.32 * E) / 46);
        c.fill(new Path2D(FX_SPIDER[0]), "evenodd"); c.lineWidth = 1.8; c.lineCap = "round"; c.strokeStyle = K.spider; c.stroke(new Path2D(FX_SPIDER[1])); c.restore();
      }, 0.5, 0);
    } else if (fx === "lights") {   // een lichtsnoer boven de flair
      const s = (1.04 * E) / 104;
      c.translate(cx - 0.52 * E, y0 - 0.27 * E); c.scale(s, s);
      c.lineWidth = 3.5; c.lineCap = "round"; c.strokeStyle = K.wire; c.stroke(new Path2D("M5.5 4Q52 16 98.5 4"));
      c.fillStyle = K.wire; [[3.7, 3.5], [27, 8], [50.2, 9.5], [73.5, 8], [96.7, 3.5]].forEach(([x, y]) => c.fillRect(x, y, 3.6, 3.5));
      [[5.5, 12, K.r], [28.8, 16.5, K.g], [52, 18, K.y], [75.3, 16.5, K.b], [98.5, 12, K.r]].forEach(([x, y, col]) => {
        c.beginPath(); c.ellipse(x, y, 5, 6, 0, 0, TAU); c.fillStyle = radial(x, y, 6.4, [[0, K.hi], [0.39, col], [1, col]]); c.fill(); });
    } else if (fx === "lives") {   // ❤️ Volle levens (db/224): drie hartjes boven de flair, zoals .fx-lives (0,78em breed, bovenrand 0,33em)
      const sc = (0.78 * E) / 78, heart = new Path2D(FX_HEART);
      c.translate(cx - 0.39 * E, y0 - 0.33 * E); c.scale(sc, sc); c.fillStyle = K.heart;
      [0, 27, 54].forEach((x) => { c.save(); c.translate(x, 0); c.fill(heart); c.restore(); });
    } else if (fx === "snow") {   // een paar vlokjes boven en naast de flair
      const bx = cx - 0.83 * E, by = y0 - 0.24 * E;
      [[0.15, 0.26, 0.042, 0.07], [0.31, 0.13, 0.025, 0.042], [1.43, 0.16, 0.028, 0.046], [1.59, 0.6, 0.034, 0.056]].forEach(([x, y, r1, r2]) =>
        dot(bx + x * E, by + y * E, r2 * E, [[0, K.flake], [r1 / r2, K.flake], [1, K.flake0]]));
    }
    c.restore();
  }
  const hueOf = (name) => { try { const h = H?.faceHue?.(name); return HUES.includes(h) ? h : HUES[0]; } catch (e) { return HUES[0]; } };
  // De twee spelers van een afgelopen duel, winnaar links. Twee gelijke kleuren: wiens naam later in het alfabet staat schuift op
  // (vast, los van wie er won).
  function sides(p, q) {
    p = { ...p, hue: hueOf(p.name) }; q = { ...q, hue: hueOf(q.name) };
    if (p.hue === q.hue) {
      const shift = (x) => ({ ...x, hue: HUES[(HUES.indexOf(x.hue) + 4) % HUES.length] });
      if (String(p.name) > String(q.name)) p = shift(p); else q = shift(q);
    }
    const o = outcome(p.s, q.s), [a, b] = o.res === "l" ? [q, p] : [p, q];
    return { a, b, o: outcome(a.s, b.s) };
  }
  // Je eigen afgelopen duel (jij en de ander) of, voor een buitenstaander, d.spec van db/190 (uitdager en tegenstander, met hun sleutel).
  function duelSides(d) {
    if (d.spec) return sides({ name: d.c_name || "?", flair: d.c_flair, s: d.spec.c || [], key: d.spec.c_key || null },
                             { name: d.o_name || "?", flair: d.o_flair, s: d.spec.o || [], key: d.spec.o_key || null });
    const meC = d.me === "c";
    return sides({ name: (meC ? d.c_name : d.o_name) || myName() || "?", flair: meC ? d.c_flair : d.o_flair, s: d.mine || [] },
                 { name: oppName(d), flair: oppFlair(d), s: d.theirs || [] });
  }
  const dayOf = (d) => { try { return new Date(d.finished_at || Date.now()).toLocaleDateString(H.intl || H.lang, { day: "numeric", month: "short" }); } catch (e) { return ""; } };
  let iconP = null;
  const shareIcon = () => iconP || (iconP = new Promise((ok) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = "/favicon-192.png"; }));

  async function drawShare(cv, d, T, theme) {
    const P = PAL[theme] || PAL.dark, { a, b, o } = duelSides(d), fa = flairParts(a.flair), fb = flairParts(b.flair);
    try { await document.fonts.load(`64px ${EMO}`, "⚔️👑" + (fa.em || "") + (fb.em || "")); } catch (e) {}
    const [icon, ia, ib] = await Promise.all([shareIcon(), fa.vf ? vondstImg(fa.vf) : null, fb.vf ? vondstImg(fb.vf) : null]);
    fa.img = ia; fb.img = ib;
    cv.width = 1080; cv.height = 1080;
    const c = cv.getContext("2d");
    const hue = (h, al) => `hsla(${h}, 65%, 52%, ${al})`;
    const sp = (px) => { if ("letterSpacing" in c) c.letterSpacing = px + "px"; };
    const font = (w, px, fam = SANS) => { c.font = `${w} ${px}px ${fam}`; };
    const rr = (x, y, w, h, r) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); };
    const fit = (s, max) => { s = String(s); if (c.measureText(s).width <= max) return s; while (s.length > 1 && c.measureText(s + "…").width > max) s = s.slice(0, -1); return s.trimEnd() + "…"; };
    const shrink = (s, max, w, sizes) => { for (const px of sizes) { font(w, px); if (c.measureText(s).width <= max) return s; } return fit(s, max); };   // lange naam: eerst kleiner, dan pas afkappen
    const text = (s, x, y, al = "center", col = P.fg) => { c.textAlign = al; c.textBaseline = "alphabetic"; c.fillStyle = col; c.fillText(s, x, y); };
    // het rondje met de flair (emoji of vondst-tekening) en zijn effect, zoals in het spel; zonder flair de beginletter
    function avatar(cx, cy, r, pl, gl) {
      c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fillStyle = P.soft; c.fill(); c.fillStyle = hue(pl.hue, 0.38); c.fill();
      c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = P.fg;
      if (!gl.img && !gl.em) { font(800, Math.round(r * 0.92)); c.fillText(initial(pl.name), cx, cy + r * 0.05); return; }
      const E = r * (gl.fx ? 0.9 : 1.02), x0 = cx - E / 2, y0 = cy - E / 2 + r * 0.03;   // met effect iets kleiner: het effect steekt uit
      const glyph = () => {
        if (gl.img) c.drawImage(gl.img, x0, y0, E, E);
        else { font("", Math.round(E), EMO); c.textAlign = "center"; c.textBaseline = "middle"; c.fillStyle = P.fg; c.fillText(gl.em, cx, cy + r * 0.07); }
      };
      if (gl.fx) drawFx(c, gl.fx, x0, y0, E, theme, true);
      const K = FXC[theme] || FXC.dark, halo = gl.fx === "glow" ? [K.gi, K.gm, K.go, 0.22] : gl.fx === "aura" ? [K.ai, K.am, K.ao, 0.25] : null;
      if (halo) [[halo[2], halo[3]], [halo[1], 0.13], [halo[0], 0.04]].forEach(([col, s]) => { c.save(); c.shadowColor = col; c.shadowBlur = s * E * 1.2; glyph(); c.restore(); });   // gloed/aura: drop-shadows
      glyph();
      if (gl.fx) drawFx(c, gl.fx, x0, y0, E, theme, false);
    }
    // achtergrond: een kaart met de duelgloed, zoals het duelscherm
    c.fillStyle = P.bg; c.fillRect(0, 0, 1080, 1080);
    const g = c.createRadialGradient(540, -160, 60, 540, -160, 980);
    g.addColorStop(0, P.glow); g.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = g; c.fillRect(0, 0, 1080, 1080);
    rr(40, 40, 1000, 1000, 56); c.fillStyle = P.card; c.fill(); c.lineWidth = 3; c.strokeStyle = P.edge; c.stroke();
    // kop: ⚔️ JAARDLE-DUEL · datum
    font("", 40, EMO); c.textAlign = "left"; c.textBaseline = "alphabetic"; c.fillText(ICON, 92, 134);
    font(800, 31); sp(6); text(T.imgBrand, 148, 130, "left", P.arena); sp(0);
    font(500, 30); text(dayOf(d), 988, 130, "right", P.mu);
    // de twee spelers en de stand
    const Y = 300, R = 96, XL = 232, XR = 848;
    avatar(XL, Y, R, a, fa); avatar(XR, Y, R, b, fb);
    if (o.res !== "d") {
      c.beginPath(); c.arc(XL, Y, R + 11, 0, Math.PI * 2); c.lineWidth = 9; c.strokeStyle = P.gold; c.stroke();
      c.save(); c.translate(XL + R * 0.68, Y - R * 0.8); c.rotate(0.34); font("", 64, EMO); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("👑", 0, 0); c.restore();
    }
    text(shrink(a.name, 330, 700, [46, 40, 35]), XL, 452); text(shrink(b.name, 330, 700, [46, 40, 35]), XR, 452);
    font(500, 31); text(T.pts(o.a), XL, 498, "center", P.mu); text(T.pts(o.b), XR, 498, "center", P.mu);
    font(800, 172); text(`${o.w}–${o.l}`, 540, 356);
    font(700, 27); sp(4); text((o.w === o.l && o.res !== "d" ? T.onTotal : T.final).toUpperCase(), 540, 412, "center", P.mu); sp(0);
    // vijf rondes: bovenaan de score van links, onderaan die van rechts; de tegel in de kleur van wie de ronde won
    const TY = 556, TH = 262, X0 = 80, GAP = 18, TW = (920 - 4 * GAP) / 5;
    for (let i = 0; i < 5; i++) {
      const x = X0 + i * (TW + GAP), r = o.per[i], va = a.s[i], vb = b.s[i];
      rr(x, TY, TW, TH, 26); c.fillStyle = P.soft; c.fill();
      c.fillStyle = r === "w" ? hue(a.hue, P.tile) : r === "l" ? hue(b.hue, P.tile) : P.gray; c.fill();
      font(700, 25); sp(3); text(`R${i + 1}`, x + TW / 2, TY + 50, "center", P.mu); sp(0);
      [[va, vb, a.hue, TY + 140], [vb, va, b.hue, TY + 224]].forEach(([v, w, h, y]) => {
        c.beginPath(); c.arc(x + 25, y - 21, 10, 0, Math.PI * 2); c.fillStyle = hue(h, 1); c.fill();
        const top = v != null && (w == null || v >= w);
        font(top ? 800 : 600, 58); text(v == null ? "–" : String(v), x + TW / 2 + 14, y, "center", top ? P.fg : P.mu);
      });
    }
    // voet: logo + jaardle.com + wat Jaardle is, rechts het totaal
    c.fillStyle = P.line; c.fillRect(80, 862, 920, 2);
    if (icon) { c.save(); rr(80, 878, 64, 64, 14); c.clip(); c.drawImage(icon, 80, 878, 64, 64); c.restore(); }
    font(800, 40); text("jaardle.com", 162, 936, "left");
    font(500, 27); text(T.imgTag, 162, 976, "left", P.mu);
    font(500, 31); text(T.imgTotal(o.a, o.b), 1000, 936, "right", P.mu);
  }

  // Het plaatje wordt klaargezet zodra de uitslag op je scherm staat: Safari wil het deelvenster vlak na de tik, zonder wachten.
  const pngs = {};   // code → Promise<Blob | null>
  function canShareFiles() {
    try {
      return !!(navigator.share && navigator.canShare && H?.isMobile?.() && typeof File === "function" &&
        navigator.canShare({ files: [new File(["x"], "x.png", { type: "image/png" })] }));
    } catch (e) { return false; }
  }
  function prepShare(d) {
    if (!d || d.status !== "done" || pngs[d.code] || !canShareFiles()) return;
    const T = tx(H.lang), theme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    pngs[d.code] = (async () => {
      const cv = document.createElement("canvas");
      await drawShare(cv, d, T, theme);
      return await new Promise((ok) => cv.toBlob((bl) => ok(bl), "image/png"));
    })().catch(() => null);
  }
  async function shareImage(d, text) {
    if (!canShareFiles()) return null;
    prepShare(d);
    const blob = await pngs[d.code];
    if (!blob) return null;
    const file = new File([blob], `jaardle-duel-${d.code}.png`, { type: "image/png" });
    if (!navigator.canShare({ files: [file], text })) return null;
    try { await navigator.share({ files: [file], text }); return "shared"; }
    catch (e) { return e && e.name === "AbortError" ? "abort" : null; }   // geen toestemming meer (te laat na de tik) → tekst
  }

  // ── wie de link van een afgelopen duel opent zonder mee te spelen (db/190: d.spec): de uitslag, met de rondes die omdraaien ──
  function spectateBody(T, d) {
    const { a, b, o } = duelSides(d), win = o.res !== "d";
    const av = (p) => { const f = p.flair && H?.flairHtml ? H.flairHtml(p.flair) : ""; return `<span class="dl-av hue${f ? " fl" : ""}" style="--h:${p.hue}" aria-hidden="true">${f || esc(initial(p.name))}</span>`; };
    const h = !win ? T.spTie(a.name, b.name) : o.w === o.l ? T.spWinTotal(a.name, b.name) : T.spWin(a.name, b.name, o.w, o.l);
    const vs = `<div class="duel-vs sp-vs"><span class="side me${win ? " win" : ""}">${av(a)}<span><b>${esc(a.name)}</b><small>${esc(T.pts(o.a))}</small></span></span>` +
      `<span class="mid"><b>${o.w}–${o.l}</b><small>${esc(win && o.w === o.l ? T.onTotal : T.final)}</small></span>` +
      `<span class="side op">${av(b)}<span><b>${esc(b.name)}</b><small>${esc(T.pts(o.b))}</small></span></span></div>`;
    let rds = `<div class="sp-rds">`;
    for (let i = 0; i < 5; i++) {
      const r = o.per[i];
      rds += `<div class="sp-rd${r === "w" ? " wa" : r === "l" ? " wb" : r === "d" ? " d" : ""}" style="--i:${i}"><small>R${i + 1}</small>` +
        `<b class="a${r === "l" ? " lo" : ""}">${a.s[i] ?? "–"}</b><b class="b${r === "w" ? " lo" : ""}">${b.s[i] ?? "–"}</b></div>`;
    }
    rds += `</div>`;
    // een teamgenoot van de winnaar (bij gelijk: de uitdager) kan die meteen uitdagen, met zijn eigen stand erbij
    const t = H?.loggedIn && a.key ? (listTargets || []).find((x) => x.k === a.key && !x.busy) : null;
    const [ha, hb] = t ? recB(a.key) : [0, 0];
    const chip = t && (ha || hb) ? `<p class="duel-h2h">${esc(T.spMate(a.name))} <b>${ha}–${hb}</b>${formHtml(formB(a.key))}</p>` : "";
    const btns = t
      ? `<button type="button" class="duel-go" data-act="sp-for" data-k="${esc(a.key)}" data-name="${esc(a.name)}">${ICON} ${esc(T.challengeX(a.name))}</button>` +
        `<button type="button" class="duel-no" data-act="new">${esc(T.spOther)}</button>`
      : `<p class="sp-how">${esc(T.spHow)}</p><button type="button" class="duel-go" data-act="new">${ICON} ${esc(T.challengeAny)}</button>` +
        `<button type="button" class="duel-no" data-act="sp-daily">${esc(T.spDaily)}</button>`;
    const day = dayOf(d);
    return `<p class="ep-eyebrow">${ICON} ${esc(T.spEyebrow)}${day ? ` · ${esc(day)}` : ""}</p><h2>${win ? "🏆 " : ""}${esc(h)}</h2>${chip}${vs}${rds}${btns}` +
      (H?.loggedIn ? "" : `<p class="duel-fine">${esc(T.spNew)}</p>`);
  }

  // ── seintjes (web push, db/189) ──
  // Duel-seintjes staan los van het dagelijkse seintje (set_push_duel); wie dat al had, krijgt ze ook (server: duel = true).
  // De knop vraagt pas bij een tik om toestemming; op een iPhone in de browser opent hij de beginscherm-uitleg.
  const VAPID = "BMIGkZBV67ptymA1ihwGL9YfCdT_XfIEXHfhR6n7_5Quim-OqEqMW1MkxK8PPNpuhk1u4mFUdwUm2SK9XvNyyUc";   // zelfde sleutel als remind.js
  const PUSH_KEY = "jaardle:duelpush";   // { on, ep }: dit toestel krijgt duel-seintjes (game.js en remind.js lezen hem ook)
  const BELL = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.6a1.4 1.4 0 0 1 1.4 1.4v.55A6.2 6.2 0 0 1 18.2 10.6v3.9l1.55 2.3a.9.9 0 0 1-.75 1.4H5a.9.9 0 0 1-.75-1.4l1.55-2.3v-3.9a6.2 6.2 0 0 1 4.8-6.05V4A1.4 1.4 0 0 1 12 2.6Z" fill="currentColor"/><path d="M9.6 19.4h4.8a2.4 2.4 0 0 1-4.8 0Z" fill="currentColor"/></svg>`;
  const pushSupport = () => { try { return H?.remindSupport?.() || null; } catch (e) { return null; } };   // 'push' | 'ios' | null
  function pushOn() {
    try { if (typeof Notification === "undefined" || Notification.permission !== "granted") return false; } catch (e) { return false; }
    const st = readJson(PUSH_KEY, null);
    if (st && typeof st.on === "boolean") return st.on;
    return !!H?.remindOn?.();
  }
  // De knop (nog geen seintjes) of de regel (staan aan); niets als deze browser het niet kan.
  // het ✕ van het groene vak na het uitdagen (weg = alleen het vak; de uitdaging zelf staat onder Wacht, met daar het ✕ om in te trekken)
  const sentX = (T) => `<button type="button" class="dl-x" data-act="sent-x" aria-label="${esc(T.close)}" title="${esc(T.close)}">✕</button>`;
  function bellHtml(label, onText, cls = "") {
    if (!pushSupport()) return "";
    if (pushOn()) return `<span class="dl-push">${BELL} ${esc(onText)}</span>`;
    return `<button type="button" class="dl-bell${cls}" data-act="push" data-on="${esc(onText)}">${BELL} ${esc(label)}</button>`;
  }
  function b64u(str) {
    const pad = "=".repeat((4 - (str.length % 4)) % 4), raw = atob((str + pad).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  }
  async function pushEnable() {
    const sup = pushSupport();
    if (sup === "ios") { H.openInstall?.(); return "ios"; }
    if (sup !== "push") return "no";
    try {
      const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (perm !== "granted") {
        gc(perm === "denied" ? "duel-push-denied" : "duel-push-dismissed", perm === "denied" ? "Duel: notifications denied" : "Duel: notification question dismissed");
        return perm === "denied" ? "denied" : "dismissed";
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(VAPID) });
      const j = sub.toJSON();
      let tz = "UTC"; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) {}
      if (H.ready) await H.ready();
      const ok = await H.rpc("set_push_duel", { p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth, p_tz: tz, p_lang: H.lang, p_client_id: H.clientId(), p_on: true });
      if (ok === false) throw new Error("set_push_duel weigerde");
      writeJson(PUSH_KEY, { on: true, ep: j.endpoint });
      gc("duel-push-on", "Duel: notifications on");
      H.onPushChange?.();
      return "on";
    } catch (e) { return "err"; }
  }
  async function pushDisable() {
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      const ep = sub?.endpoint || readJson(PUSH_KEY, {})?.ep;
      if (H.ready) await H.ready();
      if (ep) await H.rpc("set_push_duel", { p_endpoint: ep, p_p256dh: null, p_auth: null, p_tz: null, p_lang: null, p_client_id: null, p_on: false }).catch(() => {});
      if (sub && !H.remindOn?.()) await sub.unsubscribe().catch(() => {});   // het dagelijkse seintje gebruikt hetzelfde abonnement
    } catch (e) {}
    writeJson(PUSH_KEY, { on: false });
    gc("duel-push-off", "Duel: notifications off");
    H.onPushChange?.();
  }
  async function pushToggle(host) { H = host; return pushOn() ? pushDisable() : pushEnable(); }
  // Tik op een gouden knop: aanzetten, dan wordt hij de regel (of de uitleg als de browser nee zegt).
  async function onBell(b) {
    const T = tx(H.lang), onText = b.dataset.on || "";
    b.disabled = true;
    const r = await pushEnable();
    if (r === "on") { b.outerHTML = `<span class="dl-push">${BELL} ${esc(onText)}</span>`; return; }
    b.disabled = false;
    if (r === "denied") b.outerHTML = `<span class="dl-push">${esc(T.pushDenied)}</span>`;
    else if (r === "err") flash(b, T.err);
  }

  // ── rpc met nette fouten ──
  async function call(fn, args) {
    try {
      if (H.ready) await H.ready();   // bij een link of het stipje vlak na het laden: wacht tot de verbinding met de server er is
      return { ok: true, v: await H.rpc(fn, { p_client: H.clientId(), ...args }) };
    } catch (e) { return { ok: false, e: String(e?.message || e) }; }
  }

  // ════ geluid bij de opening (19/11, zijn vraag: "sfx voor duels, vinkje onder instellingen"; vooral het openen en wegschuiven) ════
  // Sinds 21/11 standaard AAN (zijn "zonder geluid is het lastiger te spelen"): stil alleen als je ⚙️ ⚔️ Duel-geluid of de luidspreker
  // zelf uitzette (jaardle:duelsfx = "0"; game.js zet hem, db/205 laat hem met een account meereizen). Geen
  // bestanden: alles komt uit Web Audio, zoals bij de obsidiaan-onthulling. Schuiven = ruis door een meeschuivend bandfilter, links of
  // rechts (stereo), net als de helften; de botsing = een paar onharmonische tonen (het zingen van metaal) met een tik en een doffe klap
  // eronder (het scherm schudt). De tijden komen uit INTRO_MS, dus beeld en geluid botsen tegelijk. Een browser laat geluid pas toe na
  // een tik: elke tik maakt het geluid wakker (binnen de tik, zoals iOS eist). Komt de opening zonder tik (seintje, link), dan blijft
  // hij stil tot je tikt. Na een tijdje stilte gaat het weer slapen (scheelt batterij).
  const SFX_KEY = "jaardle:duelsfx";
  const SND = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 9.3h3.4l4.6-3.9v13.2l-4.6-3.9H3.5z" fill="currentColor"/>` +
    `<g class="on" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M15 9.3a3.9 3.9 0 0 1 0 5.4"/><path d="M17.7 6.7a7.6 7.6 0 0 1 0 10.6"/></g>` +
    `<g class="off" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M15.4 9.6l4.8 4.8M20.2 9.6l-4.8 4.8"/></g>` +
    `<g class="mus"><path d="M19.3 5.4v8.3M19.3 5.4c.5 1.7 2.7 2.2 2.7 4.3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><ellipse cx="17.4" cy="14" rx="2.2" ry="1.7" transform="rotate(-20 17.4 14)" fill="currentColor"/></g></svg>`;
  const sfxOn = () => { try { return localStorage.getItem(SFX_KEY) !== "0"; } catch (e) { return false; } };   // leeg = nooit gekozen = aan
  // De luidspreker als knop: op de Duels-pagina naast de ?, en sinds 20/11 ook links in de kop van een ronde (zijn vraag: "altijd de
  // geluidsknop kunnen indrukken, ook als je in een duel zit"); ⚡ Knock-out (/ko.js) gebruikt dezelfde. Hetzelfde als het vinkje in ⚙️:
  // game.js bewaart hem (ook op de server) en zet het vinkje en elke knop; aan = meteen de klang, binnen de tik.
  // 🎵 21/11: drie standen (zijn "3-way: sfx, uit, alles"): 0 = uit, 1 = effecten, 2 = effecten + achtergrondmuziek. Standaard (nooit
  // gekozen) sinds 21/11 middag "alles" (zijn "toch change of plans: standaard alles aan sfx+muziek"); wie zelf koos, houdt dat.
  // De muziek is een eigen sleutel, alleen op dit toestel (de effecten reizen mee als duelsfx, db/205). Tik: effecten → uit → alles → effecten.
  const MUS_KEY = "jaardle:duelmusic";
  const sndState = () => { if (!sfxOn()) return 0; try { return localStorage.getItem(MUS_KEY) === "0" ? 1 : 2; } catch (e) { return 1; } };
  const sndLbl = (T, s = sndState()) => `${T.sound}: ${T[`snd${s}`]}`;
  function sndSet(b, T = tx(H?.lang)) {
    const s = sndState(), l = sndLbl(T, s);
    b.setAttribute("aria-pressed", String(s > 0)); b.setAttribute("data-snd", String(s)); b.setAttribute("aria-label", l); b.title = l;
  }
  const sndHtml = (T) => { const s = sndState(), l = esc(sndLbl(T, s)); return `<button type="button" class="dl-snd-btn" data-act="sfx" aria-pressed="${s > 0}" data-snd="${s}" aria-label="${l}" title="${l}">${SND}</button>`; };
  function toggleSfx(b) {
    const n = [2, 0, 1][sndState()];
    if (H?.setSnd) H.setSnd(n); else try { localStorage.setItem(SFX_KEY, n ? "1" : "0"); if (n) localStorage.setItem(MUS_KEY, n === 2 ? "1" : "0"); } catch (e) {}
    document.querySelectorAll(".dl-snd-btn").forEach((e) => sndSet(e));
    if (n === 2) musTest(); else if (n) sfxTest();   // aan = meteen de klang (op "alles" de drie noten), binnen de tik
    musicKick();
  }
  function armSnd(root) {   // de knop in de kop van een ronde: eigen klik (de kop wordt telkens opnieuw getekend)
    const b = root?.querySelector(".dl-snd-btn");
    if (!b) return;
    b.onmousedown = (e) => e.preventDefault();   // een muisklik laat de focus in het jaartal-vak: doortypen en Enter = gokken, niet nog eens de knop
    b.onclick = () => toggleSfx(b);
  }
  const AU = { x: null, out: null, noise: null, nap: 0 };
  function auNap(ms) {
    clearTimeout(AU.nap);
    AU.nap = setTimeout(() => { try { if (AU.x?.state === "running" && !MUS.m?.on) AU.x.suspend(); } catch (e) {} }, ms);
  }
  function auWake() {
    if (!sfxOn()) return null;
    try {
      if (!AU.x) {
        const C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        const x = new C(), comp = x.createDynamicsCompressor(), out = x.createGain();
        comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.2;
        out.gain.value = 0.6;
        out.connect(comp); comp.connect(x.destination);
        const nb = x.createBuffer(1, x.sampleRate * 2, x.sampleRate), nd = nb.getChannelData(0);
        for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        Object.assign(AU, { x, out, noise: nb });
        auLoad(x);
      }
      if (AU.x.state !== "running") { AU.x.resume()?.catch?.(() => {}); auNap(15000); }
    } catch (e) { AU.x = null; }
    return AU.x;
  }
  try {
    for (const ev of ["pointerup", "touchend", "click", "keydown"]) window.addEventListener?.(ev, () => { if (AU.x?.state !== "running") auWake(); }, { capture: true, passive: true });
  } catch (e) {}
  // 21/11 (zijn keuze op de luisterpagina): drie klanken zijn opnames (ElevenLabs): de botsing, de tik van de klok en de max-schade. Ze laden
  // pas als het geluid voor het eerst wakker wordt (samen ±26 KB, /sfx/, één keer); tot ze er zijn klinkt de synth. Het getal = het volume,
  // gelijkgetrokken met de synth (gemeten op de luisterpagina).
  const SMP = { "duel-hit": 1.48, "ko-tick": 0.09, "ko-bam": 1.09 };
  const VER = (() => { try { return new URL(document.currentScript.src).searchParams.get("v") || ""; } catch (e) { return ""; } })();
  function auLoad(x) {
    if (AU.smp) return;
    AU.smp = {};
    for (const n of Object.keys(SMP)) {
      try {
        window.fetch(`/sfx/${n}.mp3${VER ? `?v=${encodeURIComponent(VER)}` : ""}`).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
          .then((a) => new Promise((ok, no) => x.decodeAudioData(a, ok, no))).then((b) => { AU.smp[n] = b; }).catch(() => {});
      } catch (e) {}
    }
  }
  function smp(bus, n, at = 0, k = 1) {   // false = (nog) niet geladen: dan speelt de synth
    const b = AU.smp?.[n], x = AU.x;
    if (!b || !bus || !x) return false;
    const s = x.createBufferSource(), e = x.createGain(), t = x.currentTime + at;
    s.buffer = b; e.gain.value = SMP[n] * k;
    s.connect(e); e.connect(bus); s.start(t); s.stop(t + b.duration + 0.02);
    return true;
  }
  // 🎵 Achtergrondmuziek tijdens het spelen (21/11, zijn "soort melodie tijdens spelen, net zoals bij geoguessr"): alleen op stand 2, alleen
  // in een ronde (om de beurt: tot je klaar bent, zie sync; ⚡ knock-out: het hele spel, ko.js), stil zodra het tabblad weg is. De muziek
  // zelf (Web Audio, geen bestand) staat in /duel-music.js en laadt pas als hij moet klinken. tense = de klok van een knock-out loopt.
  const MUS = { want: false, tense: false, m: null };
  // want null = laten zoals het is; tense = hoe lang de klok van een knock-out nog loopt (ms; true = een hele klok), 0/false = geen klok
  function music(want, tense = false) { if (want != null) MUS.want = !!want; MUS.tense = tense || false; musicKick(); }
  function musicKick() {
    if (!(MUS.want && sndState() === 2 && !document.hidden)) { if (MUS.m?.on) { MUS.m.stop(); auNap(15000); } return; }
    const x = auWake();
    if (!x || !H?.music) return;
    H.music().then((M) => { MUS.m = M; if (MUS.want && sndState() === 2 && !document.hidden) { M.start(x, AU.out); M.tense(MUS.tense); } }).catch(() => {});
  }
  try { document.addEventListener?.("visibilitychange", () => musicKick()); } catch (e) {}
  // Bouwstenen; at = seconden vanaf nu, alles via de bus van één opening.
  function swish(bus, at, dur, f0, f1, g, peak, pan0, pan1) {   // peak = waar (0–1) de zwiep het hardst is
    const x = AU.x, t = x.currentTime + at, s = x.createBufferSource(), bp = x.createBiquadFilter(), e = x.createGain();
    s.buffer = AU.noise;
    bp.type = "bandpass"; bp.Q.value = 1.1;
    bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + dur * peak); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp); bp.connect(e);
    let last = e;
    if (x.createStereoPanner) { const p = x.createStereoPanner(); p.pan.setValueAtTime(pan0, t); p.pan.linearRampToValueAtTime(pan1, t + dur); e.connect(p); last = p; }
    last.connect(bus);
    s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.02);
  }
  function ring(bus, at, base, g) {   // het zingen van metaal: onharmonische boventonen, elk twee keer iets verstemd (zweving)
    const x = AU.x, t = x.currentTime + at;
    for (const [r, a, d] of [[1, 1, 1.1], [1.51, 0.55, 0.8], [2.43, 0.4, 0.55], [3.19, 0.28, 0.4], [4.67, 0.18, 0.25]]) {
      for (const det of [-7, 7]) {
        const o = x.createOscillator(), e = x.createGain();
        o.frequency.value = base * r; o.detune.value = det;
        e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g * a / 2, t + 0.003); e.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(e); e.connect(bus); o.start(t); o.stop(t + d + 0.02);
      }
    }
  }
  function tick(bus, at, f, g, dur) {   // de tik van het raken: korte hoge ruis
    const x = AU.x, t = x.currentTime + at, s = x.createBufferSource(), hp = x.createBiquadFilter(), e = x.createGain();
    s.buffer = AU.noise; hp.type = "highpass"; hp.frequency.value = f;
    e.gain.setValueAtTime(g, t); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(hp); hp.connect(e); e.connect(bus);
    s.start(t, Math.random()); s.stop(t + dur + 0.02);
  }
  function note(bus, at, f, g) {   // een glinsternoot zoals in de muziek (/duel-music.js): grondtoon + twee boventonen, 0,7 s
    const x = AU.x, t = x.currentTime + at, e = x.createGain();
    e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.004); e.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    e.connect(bus);
    for (const [r, a] of [[1, 1], [2, 0.25], [3, 0.08]]) {
      const o = x.createOscillator(), og = x.createGain();
      o.frequency.value = f * r; og.gain.value = a; o.connect(og); og.connect(e); o.start(t); o.stop(t + 0.72);
    }
  }
  function thud(bus, at, f0, f1, g, dur) {   // de doffe klap eronder
    const x = AU.x, t = x.currentTime + at, o = x.createOscillator(), e = x.createGain();
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
    e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.006); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(e); e.connect(bus); o.start(t); o.stop(t + dur + 0.02);
  }
  // De geluiden, op de tijden van INTRO_MS (die staat hieronder; deze worden pas bij een opening aangeroepen).
  const SFX = {
    // de volle opening: de helften schuiven van links en rechts naar de naad en botsen op de ⚔️; daarna schuiven ze weer weg
    in: (b) => { const d = INTRO_MS.hit / 1000; swish(b, 0, d, 280, 2300, 0.5, 0.92, -0.85, -0.1); swish(b, 0.015, d - 0.015, 330, 2000, 0.45, 0.92, 0.85, 0.1); },
    hit: (b, at = 0) => { if (smp(b, "duel-hit", at)) return; ring(b, at, 1180, 0.32); tick(b, at, 3500, 0.35, 0.06); thud(b, at, 150, 46, 0.7, 0.28); swish(b, at + 0.03, 0.7, 1800, 220, 0.12, 0.08, 0, 0); },
    out: (b) => { const d = INTRO_MS.out / 1000; swish(b, 0, d, 1900, 380, 0.4, 0.3, -0.1, -0.9); swish(b, 0.01, d - 0.01, 2100, 420, 0.36, 0.3, 0.1, 0.9); },
    // de band tussen twee rondes: van links erin met een lichte tik van de ⚔️, naar rechts eruit
    bandIn: (b) => { const d = INTRO_MS.bandIn / 1000; swish(b, 0, d, 450, 2600, 0.36, 0.9, -0.85, 0); ring(b, d - 0.02, 1760, 0.1); },
    bandOut: (b) => swish(b, 0, INTRO_MS.bandOut / 1000, 2400, 600, 0.3, 0.3, 0, 0.85),
    skip: (b) => swish(b, 0, 0.16, 1600, 500, 0.22, 0.25, 0, 0),   // overgeslagen: alles vervaagt in 140 ms
    still: (b) => ring(b, 0, 1180, 0.22),   // "minder beweging": geen zwiepen, alleen het zwaard, zacht
    // de muziek aanzetten (21/11, zijn "aparte kleine sound voor muziek, 3 noten ofzo"): D – F♯ – A, de glinsternoot van /duel-music.js
    mus: (b, at = 0) => [587.33, 739.99, 880].forEach((f, i) => note(b, at + i * 0.11, f, 0.09 + i * 0.015)),
  };
  // Eén bus per opening, zodat overslaan of weghalen kan dempen wat nog klinkt of nog moet komen. null = (nu) geen geluid.
  function sfxBus() {
    if (!sfxOn() || document.hidden) return null;
    const x = auWake();
    if (!x) return null;
    try {
      const bus = x.createGain();
      bus.connect(AU.out);
      // Niet wakker te krijgen zonder tik (Safari): ontkoppelen, anders klinkt alles in één keer bij de volgende tik.
      if (x.state !== "running") setTimeout(() => { if (x.state !== "running") try { bus.disconnect(); } catch (e) {} }, 300);
      return bus;
    } catch (e) { return null; }
  }
  function sfx(bus, kind, at = 0) {
    if (!bus || !AU.x) return;
    try { SFX[kind](bus, at); } catch (e) {}
    auNap(15000);
  }
  function sfxHush(bus, tc = 0.03) {
    if (!bus || !AU.x) return;
    try { bus.gain.setTargetAtTime(0, AU.x.currentTime, tc); } catch (e) {}
    setTimeout(() => { try { bus.disconnect(); } catch (e) {} }, 1000);
  }
  // ⚙️: bij het aanzetten één keer de botsing, zodat je hoort wat je aanzet (game.js roept dit binnen de tik aan)
  function sfxTest() { sfx(sfxBus(), "hit"); }
  function musTest() { sfx(sfxBus(), "mus"); }   // 🎵 op "alles": drie noten in plaats van de botsing

  // ════ de opening van een duelronde (17/11, mockup v7 richting B "Twee kanten") ════
  // Jouw kant schuift van links binnen, die van je tegenstander van rechts; ze botsen op de ⚔️ (flits, schokgolf), eronder de ronde
  // met de stand. Daarna schuiven de helften weg en sta je in de ronde. Tussen twee rondes (na "Ronde 4 ›") alleen een korte band
  // over de nieuwe ronde heen (geen zwart scherm, tikken en toetsen gaan er gewoon doorheen; 17/11 op zijn "is wat smoother").
  // Tik of toets = meteen door (bij de volle opening gaat die eerste toets niet naar het spel). Met "minder beweging": het stilstaande beeld, heel even.
  // Een seintje of link (?duel=) opent achter het ⚔️-laadscherm (head-script + style.css, html[data-duelload]): dat neemt de
  // opening over, en verder haalt alles wat iets anders laat zien (pop-up, Duels-scherm, een ronde zonder opening) het weg.
  const uncover = () => { try { document.documentElement.removeAttribute("data-duelload"); } catch (e) {} };
  const E_OUT = "cubic-bezier(.2,.8,.2,1)", E_IN = "cubic-bezier(.55,0,.8,.3)", E_BACK = "cubic-bezier(.3,1.45,.5,1)";
  const INTRO_MS = { hit: 340, hold: 920, out: 380, bandIn: 280, bandHold: 480, bandOut: 240, still: 800 };
  // De regel op de pil/band: ronde 1 zonder stand, daarna met (jij eerst).
  const introLabel = (T, d, r) => { const s = stand((d.mine || []).slice(0, r), d.theirs || []); return r === 0 ? T.roundN(1) : `${T.roundN(r + 1)} · ${s.w}–${s.l}`; };
  // Eén animatie per element; steps = [[ms, keyframe], …] (easing in een keyframe geldt voor het stuk erna).
  function anim(el, steps) {
    if (!el || !el.animate) return;
    const t0 = steps[0][0], dur = Math.max(1, steps[steps.length - 1][0] - t0);
    try { el.animate(steps.map(([t, k]) => ({ ...k, offset: (t - t0) / dur })), { delay: t0, duration: dur, fill: "both" }); } catch (e) {}
  }
  let introNow = null;
  // o (⚡ Knock-out, 21/11): icon op de naad, label in de pil, tag onder de naam van de ander, gc = de telling bij overslaan
  function introStart(d, r, short, o = {}) {
    ensureCss();
    introNow?.kill();
    const T = tx(H.lang), curtain = document.documentElement.hasAttribute("data-duelload");
    let still = false; try { still = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    const label = o.label || introLabel(T, d, r), icon = o.icon || ICON, mine = myName(), opName = oppName(d), played = d.their_done ?? (d.theirs || []).length;
    let hue = 28; try { const h = H.faceHue?.(opName); if (h != null) hue = h; } catch (e) {}
    const av = (flair, name) => { const f = flair && H.flairHtml ? H.flairHtml(flair) : ""; return `<span class="dix-av${f ? " fl" : ""}">${f || esc(initial(name))}</span>`; };
    const meAv = av(H.loggedIn ? H.myFlair?.() : null, mine || T.you), opAv = av(oppFlair(d), opName);
    const el = document.createElement("div");
    el.id = "duel-intro";
    if (short) el.className = "short";
    el.setAttribute("aria-hidden", "true");
    el.style.setProperty("--h", hue);
    // Vanaf het laadscherm blijft de ⚔️ daarvan liggen, bóven de helften (die schuiven eronder door); bij de botsing groeit het
    // donkere rondje erachter en wordt hij het zwaard op de naad.
    const cur = curtain && !short;
    el.innerHTML = (short ? "" : `<div class="dix-bg"></div>`) + (short
      ? `<div class="dix-band"><div class="dix-bin">${meAv}<span class="dix-bmid"><span class="dix-x">${icon}</span><b>${esc(label)}</b></span>${opAv}</div></div>`
      : `<div class="dix-wrap"><div class="dix-half me"><div class="dix-in">${meAv}${mine ? `<small class="dix-tag">${esc(T.you)}</small>` : ""}<b class="dix-nm">${esc(mine || T.you)}</b></div></div>` +
        `<div class="dix-half op"><div class="dix-in">${opAv}<b class="dix-nm">${esc(opName)}</b><small class="dix-tag">${esc(o.tag ?? T.played5(played))}</small></div></div>` +
        `<svg class="dix-seam" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="58" x2="100" y2="42" vector-effect="non-scaling-stroke"/></svg></div>` +
        `<div class="dix-ring"></div><div class="dix-flash"></div><div class="dix-badge">${cur ? "" : icon}</div>${cur ? `<div class="dix-cur">${icon}</div>` : ""}<div class="dix-rd">${esc(label)}</div>`);
    document.body.appendChild(el);
    uncover();   // het laadscherm en de opening hebben dezelfde achtergrond: de wissel is niet te zien
    const avail = Math.min(window.innerWidth || 390, 560) - 48;   // namen zo groot als past (hoofdletters, ±0,74 em per teken)
    el.querySelectorAll(".dix-nm").forEach((n) => { const k = Math.max(...n.textContent.split(/\s+/).map((w) => w.length), 1); n.style.fontSize = Math.min(41.6, avail / (k * 0.74)).toFixed(1) + "px"; });
    const $ = (s) => el.querySelector(s), HIT = INTRO_MS.hit;
    let coverAt, holdTo;
    if (still) {
      anim(el, [[0, { opacity: curtain ? 1 : 0 }], [120, { opacity: 1 }]]);
      coverAt = 120; holdTo = 120 + INTRO_MS.still;
    } else if (short) {
      anim($(".dix-band"), [[0, { transform: "translateX(-104%)", easing: "cubic-bezier(.2,.9,.3,1)" }], [INTRO_MS.bandIn, { transform: "translateX(0%)" }]]);
      anim($(".dix-bin"), [[40, { transform: "translateX(-60px)", opacity: 0, easing: E_OUT }], [380, { transform: "translateX(0px)", opacity: 1 }]]);
      coverAt = 0; holdTo = INTRO_MS.bandIn + INTRO_MS.bandHold;   // geen zwart scherm: de nieuwe ronde staat er meteen, de band schuift eroverheen
    } else {
      anim($(".dix-bg"), [[0, { opacity: curtain ? 1 : 0, easing: E_OUT }], [140, { opacity: 1 }]]);
      if (cur) anim($(".dix-cur"), [[0, { transform: "scale(1)" }], [HIT - 60, { transform: "scale(1)", easing: E_IN }], [HIT, { transform: "scale(1.12)", easing: E_OUT }], [HIT + 200, { transform: "scale(.84)" }]]);
      const door = (dir) => [[0, { transform: `translateX(${dir * 104}%)`, easing: "cubic-bezier(.3,.6,.35,1)" }], [HIT, { transform: "translateX(0px)", easing: E_OUT }],
        [HIT + 70, { transform: `translateX(${-dir * 7}px)`, easing: E_OUT }], [HIT + 230, { transform: "translateX(0px)" }]];
      anim($(".dix-half.me"), door(-1));
      anim($(".dix-half.op"), door(1));
      anim($(".me .dix-in"), [[40, { transform: "translateX(-70px)", opacity: 0, easing: E_OUT }], [HIT + 180, { transform: "translateX(0px)", opacity: 1 }]]);
      anim($(".op .dix-in"), [[40, { transform: "translateX(70px)", opacity: 0, easing: E_OUT }], [HIT + 180, { transform: "translateX(0px)", opacity: 1 }]]);
      anim($(".dix-seam"), [[HIT - 10, { opacity: 0 }], [HIT + 30, { opacity: 1, easing: E_OUT }], [HIT + 420, { opacity: 0.5 }]]);
      anim($(".dix-flash"), [[HIT - 5, { opacity: 0 }], [HIT + 35, { opacity: 0.5, easing: E_OUT }], [HIT + 320, { opacity: 0 }]]);
      anim($(".dix-ring"), [[HIT - 1, { opacity: 0, transform: "scale(.25)" }], [HIT, { opacity: 1, transform: "scale(.25)", easing: "cubic-bezier(.1,.7,.3,1)" }], [HIT + 760, { opacity: 0, transform: "scale(6.5)" }]]);
      anim($(".dix-badge"), [[HIT - 30, { opacity: 0, transform: "scale(.2) rotate(-60deg)", easing: E_BACK }], [HIT + 210, { opacity: 1, transform: "scale(1) rotate(0deg)" }]]);
      anim($(".dix-rd"), [[HIT + 170, { opacity: 0, transform: "translateY(10px)", easing: E_OUT }], [HIT + 400, { opacity: 1, transform: "translateY(0px)" }]]);
      anim($(".dix-wrap"), [[HIT, { transform: "translate(0px,0px)" }], [HIT + 40, { transform: "translate(5px,-3px)" }], [HIT + 95, { transform: "translate(-4px,2px)" }], [HIT + 150, { transform: "translate(2px,-1px)" }], [HIT + 210, { transform: "translate(0px,0px)" }]]);
      coverAt = HIT; holdTo = HIT + INTRO_MS.hold;
    }
    // ⚙️ ⚔️ Duel-geluid (19/11): zwiepen tot de botsing en de klang op de ⚔️; bij de band alleen erin met een lichte tik
    const bus = sfxBus();
    if (still) sfx(bus, "still");
    else if (short) sfx(bus, "bandIn");
    else { sfx(bus, "in"); sfx(bus, "hit", HIT / 1000); }
    const t0 = performance.now();
    let ready = false, gone = false;
    function off() { window.removeEventListener("keydown", onKey, true); window.removeEventListener("pointerdown", skip, true); if (introNow === api) introNow = null; }
    function exit(fast) {   // fast = overgeslagen: even vervagen in plaats van de helften weg te schuiven
      if (gone) return;
      gone = true;
      off();
      el.style.pointerEvents = "none";
      let ms;
      if (fast) { sfxHush(bus); sfx(sfxBus(), "skip"); }   // overgeslagen: wat nog moest komen (de botsing) valt weg
      else if (!still) sfx(bus, short ? "bandOut" : "out");   // het wegschuiven
      if (fast || still) { ms = fast ? 140 : 200; anim(el, [[0, { opacity: 1 }], [ms, { opacity: 0 }]]); }
      else if (short) {
        ms = INTRO_MS.bandOut;
        anim($(".dix-band"), [[0, { transform: "translateX(0%)", easing: E_IN }], [ms, { transform: "translateX(104%)" }]]);
      } else {
        ms = INTRO_MS.out;
        anim($(".dix-bg"), [[0, { opacity: 1 }], [1, { opacity: 0 }]]);
        anim($(".dix-half.me"), [[0, { transform: "translateX(0px)", easing: E_IN }], [ms, { transform: "translateX(-104%)" }]]);
        anim($(".dix-half.op"), [[0, { transform: "translateX(0px)", easing: E_IN }], [ms, { transform: "translateX(104%)" }]]);
        anim($(".dix-seam"), [[0, { opacity: 0.5, easing: E_OUT }], [90, { opacity: 0 }]]);
        anim($(".dix-badge"), [[30, { opacity: 1, transform: "scale(1) rotate(0deg)", easing: E_IN }], [240, { opacity: 0, transform: "scale(.35) rotate(0deg)" }]]);
        anim($(".dix-cur"), [[30, { opacity: 1, transform: "scale(.84)", easing: E_IN }], [240, { opacity: 0, transform: "scale(.29)" }]]);
        anim($(".dix-rd"), [[0, { opacity: 1, transform: "translateY(0px)", easing: E_OUT }], [160, { opacity: 0, transform: "translateY(0px)" }]]);
      }
      setTimeout(() => el.remove(), ms + 30);
    }
    function skip() {
      if (gone) return;
      if (!short) gc(...(o.gc || ["duel-intro-skip", "Duel: intro skipped"]));   // de band gaat bij elke toets of tik weg: dat is gewoon spelen
      if (ready) exit(true); else el.dataset.skip = "1";   // de ronde staat er nog niet: zodra hij er is (open) meteen weg
    }
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key === "Tab" || e.key === "Shift") return;
      if (!short) { e.preventDefault(); e.stopImmediatePropagation(); }   // de opening bedekt het scherm: die eerste toets slaat alleen over; de band laat hem door
      skip();
    }
    window.addEventListener("keydown", onKey, true);
    if (short) window.addEventListener("pointerdown", skip, true); else el.addEventListener("click", skip);
    const api = {
      covered: new Promise((res) => setTimeout(res, coverAt)),   // het oude scherm is bedekt: nu mag de ronde eronder klaarstaan
      async open() {   // de ronde staat klaar: na het vasthouden de helften weg
        ready = true;
        if (gone) return;
        if (el.dataset.skip) return exit(true);
        const wait = holdTo - (performance.now() - t0);
        if (wait > 0) await new Promise((res) => setTimeout(res, wait));
        exit(false);
      },
      kill() { gone = true; off(); sfxHush(bus, 0.01); el.remove(); },
    };
    introNow = api;
    return api;
  }

  // ════ een ronde spelen ════
  // how: "full" = de opening (binnenkomen via seintje, link, aannemen of het Duels-scherm), "short" = de band tussen twee rondes,
  // null = zonder. Een ronde die al liep (herladen, of terug van de daily) begint altijd zonder opening.
  async function play(host, code, d, how = "full") {
    H = host;
    if (!d || !d.rounds) {
      const r = await call("duel_get", { p_code: code });
      if (!r.ok || !r.v) return openList(H, {});
      d = r.v;
    }
    keep(d);
    if (!d.me) return openInvite(H, code);
    const r = (d.mine || []).length;
    if (d.status !== "active" || r >= 5 || !d.rounds || !d.rounds[r]) return openList(H, { focus: d.code });
    const p = d.rounds[r], board = H.duelBoard?.(d.code, r) || null;
    const begun = !!(board && (board.done || (board.guesses || []).length));
    if (how && !begun && H.loggedIn) await H.ensureIdentity?.().catch?.(() => {});   // je flair in de opening
    const intro = how && !begun ? introStart(d, r, how === "short") : null;
    if (intro) await intro.covered; else uncover();
    ["modal-duels", "modal-duel-pop", "modal-duel-end"].forEach((id) => { const el = document.getElementById(id); if (el && !el.hidden) H.closeModal(id); });
    try {
      await H.startRound({
        mode: "free", hashes: p.hashes, event: H.toEvent(p), board, potId: `d${d.code}${r}`,   // niet shared: een duelronde telt als een vrij potje (db/200)
        duel: { code: d.code, round: r, opp: oppName(d), deadline: d.deadline, ...(themeOf(d) ? { theme: d.theme, from: themeOf(d).from } : {}) },
      });
    } finally { intro?.open(); }
  }

  // Het duelscherm (zolang state.duel): de duelkop in plaats van de tabbladen (‹ Jaardle · ⚔️ DUELS · ronde), de VS-kop boven
  // het feit, en de duelkleur (body[data-arena]). Zonder duel: alles weer weg.
  let vsFetching = null, idAsked = false, botTxtAsked = false;
  function sync(host) {
    H = host || H;
    const st = H.state(), body = document.body;
    if (!st?.duel?.ko) music(!!st?.duel && !st.done);   // 🎵 om de beurt: tijdens de ronde; de knock-out regelt het zelf (ko.js)
    if (st?.duel?.ko) { H.ko?.().then((K) => K.sync(H)).catch(() => {}); return; }   // ⚡ Knock-out (db/208): eigen kop en levensstrook
    if (!st || !st.duel) {
      document.querySelectorAll("#duel-top, #duel-vs, #duel-bar, #ko-hintnote").forEach((e) => e.remove());
      body.removeAttribute("data-ko");
      document.getElementById("result")?.classList.remove("dv-res");
      body.removeAttribute("data-duelpage");
      body.removeAttribute("data-arena");
      body.removeAttribute("data-era");
      return;
    }
    ensureCss();
    if (H.loggedIn && !H.myFlair?.() && !idAsked) {   // na herladen: je flair i.p.v. je beginletter
      idAsked = true;
      H.ensureIdentity?.().then(() => { if (H.myFlair?.()) sync(); }).catch(() => {});
    }
    const T = tx(H.lang), dl = st.duel;
    const d = cache[dl.code] || { code: dl.code, status: "active", me: null, c_name: dl.opp, o_name: dl.opp, mine: [], theirs: [], deadline: dl.deadline };
    body.setAttribute("data-duelpage", "");
    body.setAttribute("data-arena", "");
    const tabs = document.getElementById("mode-tabs"), card = document.getElementById("event-card");
    let top = document.getElementById("duel-top");
    if (!top && tabs) {
      top = document.createElement("div");
      top.id = "duel-top"; top.className = "duel-top";
      tabs.before(top);
      top.addEventListener("click", (e) => {
        if (e.target.closest(".duel-exit")) { gc("duel-exit", "Duel: back to Duels"); H.switchMode("daily"); openList(H, {}); return; }   // 22/11: ‹ = naar Duels
        // 19/11 (zijn vraag): het ⚔️ DUELS-logo bovenin = naar het Duels-scherm (de ronde blijft bewaard, zoals bij ‹; Speel = verder)
        if (e.target.closest(".duel-home")) { gc("duel-home", "Duel: logo tapped (to Duels)"); H.switchMode("daily"); openList(H, {}); }
      });
    }
    const mine = (d.mine || []).slice(0, st.done ? 5 : dl.round), theirs = d.theirs || [];
    const shown = st.done ? Math.max(1, mine.length) : dl.round + 1;
    const era = themeOf({ theme: d.theme || dl.theme }), inp = document.getElementById("year-input");   // db/202
    body.toggleAttribute("data-era", !!era);
    if (inp) { if (era) inp.dataset.ph = T.eraPh(era.from); else delete inp.dataset.ph; }
    if (top) top.innerHTML = `<div class="duel-left"><button type="button" class="duel-exit" aria-label="${esc(T.toDuels)}">${exitHtml()}</button>${sndHtml(T)}</div><button type="button" class="duel-title duel-home dl-logo" aria-label="${esc(T.toDuels)}" title="${esc(T.toDuels)}">${logoHtml(T)}</button>` +
      `<span class="duel-round">${era ? thHtml({ theme: d.theme || dl.theme }) : ""}<span>${esc(T.roundN(Math.min(5, shown)))}</span></span>`;
    armSnd(top);
    let vs = document.getElementById("duel-vs");
    if (!vs && card) { vs = document.createElement("div"); vs.id = "duel-vs"; vs.setAttribute("role", "status"); card.before(vs); }
    if (vs) vs.className = "duel-hud";
    const s = stand(mine, theirs), cur = st.done ? -1 : dl.round;
    const dd = { ...d, mine, theirs: theirs.slice(0, Math.max(s.n, d.status === "done" ? 5 : 0)) };
    const decider = cur === 4 && s.n === 4 && s.w === 2 && s.l === 2;   // 2–2 en de laatste ronde: de beslissende
    if (vs) vs.innerHTML = boardHtml(T, dd, { cur, hot: decider, meta: d.status === "done" ? T.final : decider ? T.decider : leftText(T, d.deadline || dl.deadline) });
    if (vs && d.bot && cur === 0) {   // ⚔️ db/227: in ronde 1 zegt de bot gedag (de zinnen van ko.js); nog niet geladen: eerst laden
      const hi = botLine(d, "hi", d.code);
      if (hi) vs.insertAdjacentHTML("beforeend", botSayHtml(d, hi, " hi"));
      else if (!window.KO && H.ko && !botTxtAsked) { botTxtAsked = true; H.ko().then(() => sync()).catch(() => {}); }
    }
    if (!cache[dl.code] && !vsFetching) {   // na herladen: de stand nog niet in het geheugen
      vsFetching = call("duel_get", { p_code: dl.code }).then((r) => { vsFetching = null; if (r.ok && r.v) { keep(r.v); sync(); } });
    }
  }

  // Na een duelronde (fresh = net gespeeld; anders herstel na herladen of een taalwissel): score insturen, kaart en knoppen;
  // na je vijfde ronde ook de eindstand-pop-up.
  async function roundDone(host, st, fresh) {
    H = host;
    ensureCss();
    const T = tx(H.lang), dl = st.duel;
    if (!dl) return;
    if (dl.ko) return H.ko?.().then((K) => K.roundDone(H, st)).catch(() => {});   // ⚡ Knock-out: score naar ko_submit
    endNext = null; endShare = null;
    H.els.nextBtn.hidden = true;
    H.els.shareBtn.hidden = true;
    placeCard(`<p class="duel-note">${esc(T.loading)}</p>`);
    // Altijd insturen, ook bij herstel: een ronde die al binnen is negeert de server, een ronde die (geen netwerk) nooit aankwam gaat alsnog.
    // db/200: de ronde telt als een vrij potje (prestaties, potjes-events, 🎭; niet voor de rating). game.js geeft de gegevens van
    // het potje (p_play); de server schrijft de rij en geeft het id terug (play). Een server zonder db/200 kent p_play niet: dan
    // nog eens zonder (de ronde telt, het potje niet).
    const score = H.score();
    let sent = null; try { sent = H.playStart ? H.playStart(st) : null; } catch (e) {}   // het potje mag de ronde nooit tegenhouden
    let r = await call("duel_submit", { p_code: dl.code, p_round: dl.round, p_score: score, p_play: sent ? sent.play : null });
    if (!r.ok && /PGRST202|schema cache|p_play/i.test(r.e || "")) r = await call("duel_submit", { p_code: dl.code, p_round: dl.round, p_score: score });
    try { if (sent) sent.done(r.ok && r.v && r.v.play != null ? r.v.play : null); } catch (e) {}
    if (H.state() !== st) return;   // de speler is al verder
    if (!r.ok || !r.v) {
      placeCard(`<p class="duel-note duel-err">${esc(fresh ? T.saveErr : T.err)}</p><button type="button" class="dl-mini" data-duel-retry>${esc(T.retry)}</button>`)
        .querySelector("[data-duel-retry]").addEventListener("click", () => roundDone(H, st, fresh));
      return;
    }
    const d = keep(r.v);
    remember(d.code, d.deadline);
    if ((d.mine || []).length > dl.round || d.status === "done") H.dropDuelBoard?.(dl.code, dl.round);   // binnen (of te laat): het aparte bord mag weg
    if (fresh && (d.mine || []).length > dl.round) gc("duel-round-" + (dl.round + 1), "Duel: round " + (dl.round + 1) + " played");
    if (fresh && (d.mine || []).length === 5 && dl.round === 4) gc(d.status === "done" ? "duel-done-second" : "duel-done-first", d.status === "done" ? "Duel: finished (second)" : "Duel: finished (first, waiting)");
    renderEnd(T, st, d, fresh);
    sync();
  }

  function placeCard(html, cls = "") {
    H.els.result.querySelectorAll(".duel-card").forEach((e) => e.remove());
    H.els.result.classList.toggle("dv-res", !!cls);   // met de uitslag van de ronde: het gewone kopje ("Goed geraden!") gaat weg (CSS)
    const el = document.createElement("div");
    el.className = "duel-card" + (cls ? " " + cls : "");
    el.innerHTML = html;
    el.addEventListener("click", (e) => { const b = e.target.closest('[data-act="push"]'); if (b) onBell(b); });   // db/189
    H.els.resultText.after(el);
    return el;
  }

  function setButtons(next, share) {
    const nb = H.els.nextBtn, sb = H.els.shareBtn;
    endNext = next; endShare = share;
    nb.hidden = !next;
    if (next) { nb.innerHTML = next.html; nb.classList.toggle("duel-btn", !!next.icon); }
    sb.hidden = !share;
    const lab = sb.querySelector(".share-label");
    if (share && lab) lab.textContent = share.label;
  }

  function renderEnd(T, st, d, fresh) {
    const opp = oppName(d), mine = d.mine || [], theirs = d.theirs || [], r = st.duel.round;
    const late = fresh && mine.length <= r;   // te laat ingestuurd: niet meer opgeslagen
    // 19/11 (mockup v9 "mix"): de uitslag van deze ronde in de uitslagkaart, beide scores naast elkaar (die van de winnaar in zijn
    // kleur), daaronder het jaartal en je score (uit het gewone kopje, dat in een duelronde verdwijnt). Speelde de ander deze ronde
    // nog niet: "Jij legt de lat". Het scorebord bovenin laat alle rondes zien; een tik daarop toont de vraag.
    const x = mine[r], y = theirs[r], known = x != null && y != null, s = stand(mine, theirs);
    const box = (side, av, name, num, won, extra = "") => `<span class="jr-box ${side}${won ? " win" : ""}${extra}"><span class="jr-who">${av}<b>${esc(name)}</b></span>${num}</span>`;
    const boxes = box("me", dbAv(meFlair(), meNameOr(T, T.you)), T.you, `<strong>${x ?? "–"}</strong>`, known && x > y) +
      box("op", dbAv(oppFlair(d), opp), opp, known ? `<strong>${y}</strong>` : `<strong class="wait">${T.yet}</strong>`, known && y > x, known ? "" : " todo");
    let v, sub = "";
    if (late) v = esc(T.late);
    else if (known) v = `<span class="${x > y ? "me" : x < y ? "op" : ""}">${esc(x > y ? T.rWin(r + 1) : x < y ? T.rLoss(r + 1, opp) : T.rTie(r + 1))}</span>${s.n ? ` · ${s.w}–${s.l}` : ""}`;
    else { v = esc(T.bar); sub = T.barSub(esc(opp), `<b>${x}</b>`, r + 1); }
    const rt = H.els.resultText, yp = rt?.querySelector(".year-pill"), sl = rt?.querySelector(".score-line");
    const ans = yp ? `<p class="jr-ans"><span>${esc(T.itWas)} ${yp.outerHTML}</span>${sl ? `<span class="nw">${sl.innerHTML}</span>` : ""}</p>` : "";
    let html = `<div class="jr${fresh ? " fresh" : ""}" style="--h:${H?.faceHue ? H.faceHue(opp) : 30}"><div class="jr-sc">${boxes}</div><p class="jr-v">${v}</p>` +
      (sub ? `<p class="jr-sub">${sub}</p>` : "") + `</div>` + ans;
    if (d.status === "done") {
      const o = outcome(mine, theirs);
      html += `<p class="duel-note"><span class="duel-verdict">${o.res === "w" ? "🏆 " : ""}${esc(verdict(T, o, opp))}</span> ${esc(T.totalNote(o.a, o.b))}</p>`;
      setButtons({ kind: "rematch", code: d.code, html: `${icoHtml()} ${esc(T.revenge)}`, icon: true }, { kind: "result", d, label: T.shareRes });
      prepShare(d);
    } else if (mine.length < 5) {
      setButtons({ kind: "round", code: d.code, html: esc(T.nextRound(mine.length + 1)) }, null);
    } else {   // jij bent klaar, de ander nog niet
      let note = `<b>${esc(T.youDone(opp))}</b> ${esc(T.waitNote(opp, leftText(T, d.deadline)))}`;
      // db/189: krijgt de ander zelf een seintje, dan hoef je het niet te laten weten; zelf een seintje als de ander klaar is
      const bell = bellHtml(T.bellDone(opp), T.onDone(opp));
      if (d.opp_push || bell) note += `<span class="duel-pushes">${d.opp_push ? `<span class="dl-push">${BELL} ${esc(T.pushThem(opp))}</span>` : ""}${bell}</span>`;
      html += `<p class="duel-note">${note}</p>`;
      const after = H.dailyDone() ? { kind: "free", html: esc(H.t("next")) } : { kind: "daily", html: esc(T.toDaily) };
      setButtons(after, d.opp_push ? null : { kind: "turn", d, label: T.tell(opp) });
    }
    placeCard(html, "jr-card");
    // Na je vijfde ronde: de eindstand als eigen pop-up (alleen direct na het spelen, niet bij herladen).
    if (fresh && mine.length >= 5) showEndPop(T, d, { fresh: true, wonLast: st.won });
    // Wacht er nog een duel op jou? Dan gaat de knop daarheen (en in de pop-up ook). De lijst geeft ook je stand tegen deze tegenstander.
    if (mine.length >= 5 && d.status !== "done") {
      call("duel_list", {}).then((res) => {
        if (!res.ok || H.state() !== st) return;
        applyList(res.v);
        const other = (res.v?.items || []).find((x) => x.code !== d.code && x.status === "active" && (x.mine || []).length < 5);
        if (other) setButtons({ kind: "duel", code: other.code, html: esc(T.nextDuel(oppName(other))) }, endShare);
        const pop = document.querySelector("#modal-duel-end [data-act='end-next']");
        if (pop && endNext) pop.innerHTML = endNext.html;
      });
    }
  }

  // ════ de vraag van een ronde terugzien (18/11, gevraagd door spelers) ════
  // Tik op een tegel → een pop-up met het feit, het jaartal en jullie scores, bóven wat er open is (de duelkaart onder het bord, de
  // eindstand of het Duels-scherm): sluiten (✕, achtergrond, Esc) brengt je terug naar precies dat scherm. Alleen rondes die je zelf
  // speelde, of alle vijf als het duel klaar is: een ronde die je nog moet spelen, verklapt hij nooit. De puzzels komen van duel_get
  // (db/185 bewaart ze in duels.rounds); het Duels-scherm krijgt ze niet mee (duel_list), dan haalt een tik dat ene duel op.
  // Je gokken staan niet op de server: die toont hij niet. Meetpunt duel-peek.
  const PEEK_ID = "modal-duel-q";
  const PEEK_KEY = "jaardle:duel-peek";   // { n: [duels waar de tip stond], used: 1 = al eens getikt } → de tip dooft uit
  const peekSrc = new Map();   // code → het duel zoals de tegels het laatst toonden
  const canPeek = (d, i) => !!(d && d.code && d.me) && (d.status === "done" || (d.mine || [])[i] != null);
  function peekHint(code) {   // de tip "tik op een ronde": tot je eerste tik, op hoogstens 3 duels
    const v = readJson(PEEK_KEY, {});
    if (v.used) return false;
    const n = Array.isArray(v.n) ? v.n : [];
    if (n.includes(code)) return true;
    if (n.length >= 3) return false;
    writeJson(PEEK_KEY, { n: [...n, code] });
    return true;
  }
  const yearText = (y) => (y < 0 ? `${-y} ${H?.t ? H.t("bc") : "BC"}` : String(y));
  // Labels en kleuren zoals in het spel (STORY_TAGS in game.js): 🎭 gek maar waar, de verhaal-kopjes, anders 💡.
  const PEEK_TAGS = { fun: ["🎭", "fun_label", "fun"], a: ["🤯", "tag_wow", "wow"], m: ["🔍", "tag_mys", "mys"], f: ["🏆", "tag_rec", "rec"],
    w: ["❤️", "tag_warm", "warm"], d: ["👻", "tag_spook", "spook"] };
  function peekSlides(p, lang) {   // het hoofdfeit en de 💡-extra's van de ronde
    const txt = (f) => (f && (f[lang] || f.en || f.nl)) || "";
    return [{ e: "💡", label: "main_label", c: "extra", text: txt((p.facts || [])[0]) }].concat((p.extras || []).map((x) => {
      const tg = PEEK_TAGS[x.fun ? "fun" : x.tag];
      return { e: tg ? tg[0] : "💡", label: tg ? tg[1] : "extra_label", c: tg ? tg[2] : "extra", text: txt(x) };
    })).filter((sl) => sl.text);
  }
  function peekHtml(T, d, i, p, lang) {
    const f = (p.facts || [])[0] || {}, sl = peekSlides(p, lang), lb = (k) => (H?.t ? H.t(k) : k);
    const x = (d.mine || [])[i], y = (d.theirs || [])[i], n = oppName(d);
    const res = x == null || y == null ? null : x > y ? "w" : x < y ? "l" : "d";
    const cell = (who, cls, s, won) => `<span class="rq-sc ${cls}${won ? " won" : ""}"><small>${esc(who)}</small><b>${s ?? "–"}</b></span>`;
    let src = "";
    try {
      const u = new URL(f.source || "");
      if (u.protocol === "https:" || u.protocol === "http:") {
        src = `<a class="rq-src" href="${esc(u.href)}" target="_blank" rel="noopener">${esc(H?.t ? H.t("source") : "Source:")} ${esc(u.hostname.replace(/^www\./, ""))}</a>`;
      }
    } catch (e) {}
    const car = `<div class="rq-ev"><div class="rq-vp">` + sl.map((z) => `<div class="rq-fs c-${z.c}"><div class="rq-tag"><span aria-hidden="true">${z.e}</span>` +
        `<span>${esc(lb(z.label))}</span></div><p class="rq-fact">${esc(z.text)}</p></div>`).join("") + `</div>` +
      (sl.length > 1 ? `<div class="rq-dots">${sl.map((z, j) => `<button type="button" data-i="${j}"${j ? "" : ` class="on"`} aria-label="${j + 1}/${sl.length}">${z.e}</button>`).join("")}</div>` : "") +
      `</div>`;
    return car + `<p class="rq-year">${esc(yearText(p.year))}</p>` +
      `<div class="rq-scores">${cell(T.you, "me", x, res === "w")}${cell(n, "op", y, res === "l")}</div>` +
      (res ? `<p class="rq-verdict">${esc(res === "w" ? T.rYours : res === "l" ? T.rTheirs(n) : T.rDraw)}</p>` : "") + src;
  }
  async function openPeek(code, i) {
    if (!H) return;
    const T = tx(H.lang);
    ensureCss();
    gc("duel-peek", "Duel: question of a round reopened");
    writeJson(PEEK_KEY, { used: 1 });
    document.querySelectorAll(".duel-tip").forEach((e) => e.remove());   // de tip heeft zijn werk gedaan
    document.getElementById(PEEK_ID)?.remove();
    const el = document.createElement("div");
    el.id = PEEK_ID;
    el.className = "modal";
    el.hidden = true;
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "duel-q-title");
    el.innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal-card duel-pop rq">` +
      `<button type="button" class="modal-close" data-close aria-label="${esc(T.close)}">✕</button>` +
      `<section class="rq-body"><p class="rq-eyebrow" id="duel-q-title">${ICON} ${esc(T.roundN(i + 1))}</p>` +
      `<div class="rq-in"><p class="rq-load">${esc(T.loading)}</p></div></section></div>`;
    document.body.appendChild(el);   // als laatste: ligt boven de eindstand en het Duels-scherm
    el.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => H.closeModal(PEEK_ID)));
    H.openModal(PEEK_ID, { over: true });   // over: wat eronder open is, blijft open
    let d = peekSrc.get(code) || cache[code], rounds = d?.rounds || cache[code]?.rounds;
    if (!rounds?.[i]) {   // het Duels-scherm heeft de puzzels niet: dit ene duel ophalen
      const r = await call("duel_get", { p_code: code });
      if (r.ok && r.v) { const v = keep(r.v); rounds = v.rounds; d = d || v; }
    }
    const box = el.querySelector(".rq-in");
    if (!el.isConnected || !box) return;
    box.innerHTML = rounds?.[i] && d ? peekHtml(T, d, i, rounds[i], H.lang) : `<p class="rq-load duel-err">${esc(T.err)}</p>`;
    // vegen (scroll-snap) of tik op een puntje
    const vp = box.querySelector(".rq-vp"), dots = [...box.querySelectorAll(".rq-dots button")];
    if (!vp || !dots.length) return;
    vp.addEventListener("scroll", () => {
      const k = Math.round(vp.scrollLeft / Math.max(1, vp.clientWidth));
      dots.forEach((b, j) => b.classList.toggle("on", j === k));
    }, { passive: true });
    const smooth = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    dots.forEach((b) => b.addEventListener("click", () => vp.scrollTo({ left: Number(b.dataset.i) * vp.clientWidth, behavior: smooth ? "smooth" : "auto" })));
  }
  function peekTarget(e) { const t = e.target?.closest?.(".db-c[data-q]"); return t && /^(.+)\.([0-4])$/.exec(t.dataset.q); }
  document.addEventListener?.("click", (e) => { const m = peekTarget(e); if (m) openPeek(m[1], Number(m[2])); });
  document.addEventListener?.("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const m = peekTarget(e);
    if (m) { e.preventDefault(); openPeek(m[1], Number(m[2])); }
  });

  // ════ de eindstand-pop-up ════
  // Na je vijfde ronde (de ander nog bezig of al klaar), en voor een uitslag die je nog niet zag (flip: de rondes draaien om).
  function showEndPop(T, d, { flip = false, fresh = false, wonLast = false, again = false } = {}) {
    ensureCss();
    document.getElementById("modal-duel-end")?.remove();
    const opp = oppName(d), mine = d.mine || [], theirs = d.theirs || [], done = d.status === "done";
    const o = outcome(mine, theirs), s = stand(mine, theirs), af = flip ? " after" : "";
    let inner = `<p class="ep-eyebrow">${ICON} ${esc(T.duelWith(opp))}${thHtml(d)}</p>`;
    if (done) {
      prepShare(d);
      const h = verdict(T, o, opp);
      inner += `<h2 class="${af.trim()}">${o.res === "w" ? "🏆 " : ""}${esc(h)}</h2>` +
        boardHtml(T, d, { size: "big", meta: T.final, flip, hint: true }) +
        `<p class="ep-note${af}">${esc(T.totalNote(o.a, o.b))}<span class="ep-h2h"></span></p>` +
        (H.loggedIn && !again && d.rated !== false ? `<p class="fact-stats rating-line rating-line-link dr-endline" role="button" tabindex="0" hidden></p>` : "") +   // ⚔️ db/225
        (H.loggedIn && H.duelAchv && !again && !d.bot ? `<div class="ep-achv"></div>` : "") +   // ⚔️ db/224: kaartje voor Duellist/Remontada/Ongeschonden/David (niet bij terugkijken; db/227: niet tegen een bot)
        (d.bot && !again && o.res !== "d" ? botSayHtml(d, botLine(d, o.res === "w" ? "win" : "lose", d.code), ` last${af}`) : "") +   // ⚔️ db/227: zijn laatste woord
        `<div class="ep-btns${af}"><button type="button" class="duel-btn" data-act="rematch" data-code="${d.code}">${icoHtml()} ${esc(T.revenge)}</button>` +
        `<button type="button" class="duel-btn ep-ghost" data-act="share-result">${esc(T.shareRes)}</button></div>` +
        botNextHtml(T, d, o, af);
    } else {
      inner += `<h2>${esc(T.youDone(opp))}</h2>` +
        boardHtml(T, d, { size: "big", meta: T.busy }) +
        `<p class="ep-note">${esc(T.waitNote(opp, leftText(T, d.deadline)))}</p>`;
      // db/189: het lokkertje (zelf een seintje als de ander klaar is); "Laat X het weten" alleen als X zelf geen seintje krijgt
      const meOn = pushOn(), sup = pushSupport();
      const lines = (meOn && sup ? `<span class="dl-push">${BELL} ${esc(T.onDone(opp))}</span>` : "") +
        (d.opp_push ? `<span class="dl-push">${BELL} ${esc(T.pushThem(opp))}</span>` : "");
      if (lines) inner += `<div class="ep-pushes">${lines}</div>`;
      const bell = !meOn && sup ? `<button type="button" class="dl-bell" data-act="push" data-on="${esc(T.onDone(opp))}">${BELL} ${esc(T.bellDone(opp))}</button>` : "";
      inner += `<div class="ep-btns">${bell}` +
        (d.opp_push ? "" : `<button type="button" class="duel-btn${bell ? " ep-ghost" : ""}" data-act="share-turn">${esc(T.tell(opp))}</button>`) +
        `<button type="button" class="ep-ghost" data-act="end-next">${endNext ? endNext.html : esc(T.toDaily)}</button></div>`;
    }
    if (done && !H.loggedIn) inner += keepHtml(T, d, af);
    const el = document.createElement("div");
    el.id = "modal-duel-end";
    el.className = "modal";
    el.hidden = true;
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "duel-end-title");
    el.innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal-card duel-pop ep">` +
      `<button type="button" class="modal-close" data-close aria-label="${esc(T.close)}">✕</button><section class="ep-body duel-card">${inner}</section></div>`;
    el.querySelector("h2")?.setAttribute("id", "duel-end-title");
    document.body.appendChild(el);
    const close = () => H.closeModal("modal-duel-end");
    el.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", close));
    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      const act = b.dataset.act;
      if (act === "rematch") { close(); return create(H, { rematch: b.dataset.code }); }
      if (act === "share-result") return share(H, b, { kind: "result", d });
      if (act === "share-turn") return share(H, b, { kind: "turn", d });
      if (act === "push") return onBell(b);
      if (act === "end-next") { close(); return next(H); }
      if (act === "botnext") { close(); gc("duel-bot-b5-next", "Duel: next bot after a best of 5 win"); return botDuel(H, b.dataset.bot, d?.theme || null); }   // ⚔️ db/227 (db/239: in dezelfde jaren)
      if (act === "login") { gc("duel-login-end", "Duel: create account from result"); parkLogin(d.code); close(); return H.openLogin?.(); }
    });
    H.openModal("modal-duel-end", { over: true });   // boven het Duels-scherm (als dat open is): wegklikken = terug in de lijst
    if (flip) gc("duel-reveal", "Duel: result revealed (first finisher)");
    // je stand tegen deze tegenstander, als de lijst er al is
    const [ha, hb] = h2hOf((listItems || []).filter((x) => x.code !== d.code).concat(done ? [{ ...d, seen: true }] : []), d.opp || opp);   // dit duel telt al mee (je ziet het nu)
    if (done && (ha || hb) && ha + hb > 1) { const x = el.querySelector(".ep-h2h"); if (x) x.textContent = ` · ${T.h2hNow(ha, hb)}`; }   // pas vanaf je tweede duel tegen deze speler
    if (!done) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // ⚔️ db/224: de duel-prestaties (game.js checkDuelAchievements). Bij een onthulling pas als de rondes omgedraaid zijn, anders speelt de
    // pop-in van het kaartje onzichtbaar af.
    const box = el.querySelector(".ep-achv");
    if (box && typeof H.duelAchv === "function") setTimeout(() => { H.duelAchv(box)?.catch?.(() => {}); }, flip && !reduced ? FLIP_MS : 0);
    drEndLine(el.querySelector(".dr-endline"), d.code, flip && !reduced ? FLIP_MS : 0);   // ⚔️ db/225: de duelrating telt op, de delta popt
    setTimeout(() => {   // het bord draait zelf om (CSS): pas daarna confetti
      if (o.res === "w" && !again && !(fresh && wonLast)) H.showConfetti();   // gewonnen: feest (had de laatste ronde al confetti, of zag je hem al: niet nog eens)
      if (!d.seen) markSeen(d.code);
    }, flip && !reduced ? FLIP_MS : 0);
  }

  // ⚔️ db/227: na een zege op een bot de volgende als één regel (zoals op het K.O.-eindscherm), ook in Best of 5
  function botNextHtml(T, d, o, af = "") {
    if (!d.bot || o.res !== "w") return "";
    const i = listBots.findIndex((b) => b.key === d.bot), nb = i >= 0 ? listBots[i + 1] : null;
    return nb ? `<div class="bot-next ep-botnext${af}">${botOptHtml(T, nb, i + 1, { next: true, attrs: 'data-act="botnext"', mode: "b" })}</div>` : "";
  }

  function next(host) {
    H = host;
    const m = endNext;
    if (!m) return H.newFree();
    if (m.kind === "round") return play(H, m.code, null, "short");   // de volgende ronde van dit duel: alleen de korte band
    if (m.kind === "duel") return play(H, m.code);
    if (m.kind === "rematch") return create(H, { rematch: m.code });
    if (m.kind === "daily") return H.switchMode("daily");
    return H.newFree();
  }

  function share(host, btn, what) {
    H = host;
    const T = tx(H.lang), s = what || endShare;
    if (!s) return;
    if (s.kind === "turn") { gc("duel-tell", "Duel: let opponent know"); return shareText(T, T.shTurn(oppName(s.d)), LINK(s.d.code), btn); }
    if (s.kind === "result") {   // db/190: met het plaatje en de link (een buitenstaander ziet daar de uitslag); kan dat niet, dan tekst met link
      gc("duel-share-result", "Duel: share result");
      const o = outcome(s.d.mine, s.d.theirs), line = T.shResult(oppName(s.d), o.w, o.l, o.res), url = LINK(s.d.code);
      return shareImage(s.d, `${line}\n${url}`).then((how) => {
        if (how === "shared") gc("duel-share-image", "Duel: result shared as image");
        return how || shareText(T, `${line}\n${squares(o)} · ${T.shTotals(o.a, o.b)}`, url, btn);
      });
    }
  }

  async function markSeen(code) {
    if (cache[code]) cache[code].seen = true;
    const li = (listItems || []).find((x) => x.code === code);
    if (li) li.seen = true;
    await call("duel_seen", { p_code: code });
    checkNews(H);
    if (!document.getElementById("modal-duels")?.hidden) renderList(tx(H.lang), null);   // stipje op de rij weg
  }

  // Het Jaardle-icoontje (dat van de skin als er een is: het favicon in de <head>): de reserve voor de terugknop in een ronde hieronder.
  const homeIcon = () => document.querySelector('link[rel="icon"][type="image/svg+xml"]')?.getAttribute("href") || "/favicon.svg?v=2";   // het Jaardle-icoontje van de skin
  // De terugknop in een ronde (Best of 5 en knock-out): ‹ + het DU/EL-icoon, naar Duels (22/11/2026, zijn "nu is terugknop naar JAAR ipv
  // DUEL, dat is natuurlijk raar, je doet duel"). Het icoon is dat van de deur in de kop (#duels-door); Jaardle via de Duels-pagina. Een
  // knock-out die loopt staat daar bovenaan (tik = terug in het spel), een ronde om de beurt bij Jouw beurt. Ook met de draaiende deur
  // (#world-door, de DU/EL-tegel); zonder icoon in de kop het Jaardle-icoontje zoals eerst.
  const duelIcon = () => document.querySelector('#duels-door svg, #world-door [data-w="d"] svg')?.outerHTML.replace('class="kd-logo"', 'class="dx-logo"') || "";
  const exitHtml = () => `<span class="dx-chev" aria-hidden="true">‹</span>${duelIcon() || `<img class="dx-logo" src="${esc(homeIcon())}" alt="">`}`;
  // "?" op de Duels-pagina: de drie stappen als pop-up boven de pagina (18/11: liever dan uitklappen); Esc/✕/naast = dicht
  const HOWTO_ID = "modal-duel-help";
  function openHowto(T) {
    let el = document.getElementById(HOWTO_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = HOWTO_ID; el.className = "modal"; el.hidden = true;
      el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "duel-howto-title");
      document.body.appendChild(el);
      el.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) H.closeModal(HOWTO_ID); });
    }
    el.innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal-card duel-pop dl-howto">` +
      `<button type="button" class="modal-close" data-close aria-label="${esc(T.close)}">✕</button>` +
      `<div class="duel-inv"><span class="duel-ico" aria-hidden="true">${ICON}</span><h2 id="duel-howto-title">${esc(T.help)}</h2>${stepsHtml(T)}</div></div>`;
    H.openModal(HOWTO_ID, { over: true });
    el.querySelector(".modal-close")?.focus();
  }

  // ════ het Duels-scherm (de deur naast 🌐, of het adres /duels/) ════
  // Sinds 18/11/2026 een eigen pagina in plaats van een pop-up: het staat in <main> op de plek van het spel. Sinds 21/11 met de kop
  // van Jaardle erboven (ensureKop). Het id en de klasse .modal blijven, zodat game.js het als open scherm blijft zien (toetsen,
  // pop-ups die wachten); openModal/closeModal zetten body[data-duelshome] en het adres (appPageSet). Inloggen, de eindstand en de
  // vraag van een ronde gaan erbovenop en sluiten terug naar de pagina.
  const HELPI = '<svg viewBox="0 0 512 512" aria-hidden="true"><path fill="currentColor" d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256zm169.8-90.7c7.9-22.3 29.1-37.3 52.8-37.3l58.3 0c34.9 0 63.1 28.3 63.1 63.1c0 22.6-12.1 43.5-31.7 54.8L280 264.4c-.2 13-10.9 23.6-24 23.6c-13.3 0-24-10.7-24-24l0-13.5c0-8.6 4.6-16.5 12.1-20.8l44.3-25.4c4.7-2.7 7.6-7.7 7.6-13.1c0-8.4-6.8-15.1-15.1-15.1l-58.3 0c-3.4 0-6.4 2.1-7.5 5.3l-.4 1.2c-4.4 12.5-18.2 19-30.6 14.6s-19-18.2-14.6-30.6l.4-1.2zM224 352a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"/></svg>';
  function ensureListModal() {
    let el = document.getElementById("modal-duels");
    if (el) return el;
    el = document.createElement("section");
    el.id = "modal-duels";
    el.className = "modal dl-page";
    el.hidden = true;
    el.setAttribute("aria-labelledby", "duels-title");
    el.innerHTML = `<div class="modal-body dl"></div><div class="dl-foot" hidden><button type="button" class="dl-how" data-act="help" aria-haspopup="dialog">${HELPI}<span></span></button></div>`;
    (document.querySelector("main") || document.body).appendChild(el);
    el.addEventListener("click", onListClick);
    el.addEventListener("submit", onListSubmit);
    el.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("[data-grp], [data-wait]")) { e.preventDefault(); e.target.click(); }
    });
    return el;
  }

  // De kop van de Duels-pagina (21/11/2026): in #mode-tabs van game.js, achter profiel, 🌐 en de deur (die gaat hier naar Timeline;
  // game.js regelt hem, 22/11). Het logo = verversen; 🔈 = het geluid.
  function ensureKop() {
    let k = document.getElementById("kop-duels");
    if (k) return k;
    const nav = document.getElementById("mode-tabs");
    if (!nav) return null;
    k = document.createElement("div");
    k.id = "kop-duels"; k.className = "kop-d";
    k.innerHTML = `<h2 id="duels-title" class="duel-title dl-logo"></h2>` +
      `<div class="dl-tools"><button type="button" class="dl-snd-btn" data-act="sfx" aria-pressed="false">${SND}</button></div>`;
    nav.appendChild(k);
    k.addEventListener("click", onListClick);
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => centerLogo()); ro.observe(k); ro.observe(k.querySelector("#duels-title")); }
    return k;
  }
  // Het logo echt in het midden van de kop als er ruimte is (21/11, zijn vraag "kan duel logo echt in het midden als er ruimte is"):
  // de grid zet het tussen het Jaardle-icoontje en 🔈; dit schuift het naar het midden van de hele kop, maar nooit dichter dan 6 px bij
  // die twee (smal scherm, lange taal: dan zo dicht bij het midden als past). Opnieuw bij elke maatwissel (ResizeObserver). Links is
  // dat sinds 22/11 de gedeelde deur (#world-door) in plaats van een eigen Jaardle-icoontje.
  function centerLogo() {
    const k = document.getElementById("kop-duels"), nav = document.getElementById("mode-tabs"), lg = k?.querySelector("#duels-title");
    if (!k || !nav || !lg || !k.offsetParent) return;   // niet op de Duels-pagina: niets te meten
    const cur = parseFloat(lg.style.getPropertyValue("--kd-dx")) || 0, r = lg.getBoundingClientRect(), n = nav.getBoundingClientRect();
    const door = document.getElementById("world-door");
    const lo = (door && door.offsetParent ? door.getBoundingClientRect().right : r.left - cur) + 6, hi = k.querySelector(".dl-tools").getBoundingClientRect().left - 6 - r.width;
    const left0 = r.left - cur, want = n.left + (n.width - r.width) / 2;
    const dx = hi < lo ? 0 : Math.round(Math.min(hi, Math.max(lo, want)) - left0);
    if (dx !== cur) lg.style.setProperty("--kd-dx", dx + "px");
  }

  async function openList(host, opts = {}) {
    H = host;
    uncover();
    ensureCss();
    const T = tx(H.lang), el = ensureListModal(), kop = ensureKop();
    if (kop) {
      // Het logo is ook de ververs-knop (18/11): spelers tikken erop om te zien of de ander al speelde (syncList).
      kop.querySelector("#duels-title").innerHTML = `<button type="button" class="dl-logo-btn" data-act="sync" title="${esc(T.refresh)}">${logoHtml(T)}</button>`;
      const sb = kop.querySelector(".dl-snd-btn");
      sndSet(sb, T);
    }
    el.querySelector(".dl-how span").textContent = T.help;
    if (!opts.keepTop) listTop = "";
    H.openModal("modal-duels");
    centerLogo();
    if (!visHooked) {   // terug in de app met het Duels-scherm open: even vers kijken (syncList); verder kost terugkomen niets
      visHooked = true;
      document.addEventListener("visibilitychange", () => {
        const m = document.getElementById("modal-duels");
        if (document.visibilityState === "visible" && H && m && !m.hidden) syncList(tx(H.lang));
      });
    }
    if (H.loggedIn) await H.ensureIdentity?.().catch?.(() => {});
    renderList(T, null);   // meteen wat we al weten (ook een net onthulde uitslag: die staat al op gezien), daarna vers van de server
    const [r] = await Promise.all([call("duel_list", {}), drFetch(true)]);   // ⚔️ db/225: de duelrating tegelijk (alleen met een account)
    if (!r.ok) { listItems = listItems || []; renderList(T, T.err); return; }
    applyList(await withInvite(r.v));
    let pop = null;
    if (opts.focus) {
      const d = listItems.find((x) => x.code === opts.focus) || (opts.end && opts.end.code === opts.focus ? opts.end : null);
      if (d && d.status === "done") { openGrp = d.opp || oppName(d); selInGrp[openGrp] = d.code; standFocus = "b"; if (!d.seen || opts.end) pop = d; }
      else if (d && d.status === "active") openWait.add(d.code);
    }
    renderList(T, null);
    if (pop) showEndPop(T, pop, pop.seen ? { again: true } : { flip: true });
  }

  function applyList(v) {
    listAt = Date.now();
    const all = v?.items || [];
    listItems = all.filter((d) => d.status !== "withdrawn");   // een link die je zelf introk hoeft niet in de lijst (ook niet als "Ingetrokken" onder Stand per tegenstander)
    listTargets = Array.isArray(v?.targets) ? v.targets : [];
    listH2h = v?.h2h && typeof v.h2h === "object" && !Array.isArray(v.h2h) ? v.h2h : {};
    listBots = (Array.isArray(v?.bots) ? v.bots : []).filter((b) => b && typeof b.key === "string" && typeof b.name === "string");
    // db/215: je afgelopen knock-outs (vorm van ko_get); in de lijst als een afgelopen, geziene uitslag
    listKo = (Array.isArray(v?.ko) ? v.ko : []).filter((g) => g && typeof g.code === "string" && g.state === "done" && g.finished_at)
      .map((g) => ({ ...g, ko: true, status: "done", seen: true, created_at: g.finished_at }));
    setNews(v?.news || 0);
    // Op dit toestel onthouden wat nog nieuws kan brengen; de rest valt eraf (dan kijkt het laden niet meer).
    writeJson(LIST_KEY, listItems.filter((d) => d.status === "open" || d.status === "active" || (d.status === "done" && !d.seen))
      .map((d) => ({ c: d.code, u: Date.parse(d.deadline || "") || Date.now() })));
    for (const d of all) if (cache[d.code]) keep(d);
    H?.duelsChanged?.();   // 19/11: de verder-spelen-knop op het eindscherm leest waiting()
    return listItems;
  }

  // 19/11 (mockup v10 "Schuin"): wat er op jou wacht, voor het duel-stuk van "🎲 Nog een potje? / ⚔️" op het eindscherm. Uit de lijst die
  // er al is (checkNews bij het laden of het Duels-scherm), met de versere kopie uit cache (een net gespeelde ronde); geen aanroep.
  // null = nog niets bekend; { n: 0 } = niets; anders het eerstvolgende duel (uitdagingen aan jou eerst, dan jouw beurt op deadline).
  function waiting() {
    if (!listItems) return null;
    const cur = (d) => cache[d.code] || d;
    const inc = listItems.map(cur).filter(incoming);
    const turn = listItems.map(cur).filter((d) => d.status === "active" && (d.mine || []).length < 5)
      .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
    const all = [...inc, ...turn];
    if (!all.length) return { n: 0 };
    const d = all[0], inv = incoming(d);
    return { n: all.length, code: d.code, kind: inv ? "inv" : "turn", name: inv ? (d.c_name || "?") : oppName(d) };
  }
  // Tik op het duel-stuk: één duel → meteen je ronde of de uitnodiging; meer, of niets → het Duels-scherm (daar staat "Daag een vriend uit").
  function fromEnd(host, w) {
    H = host;
    if (w && w.n === 1 && w.kind === "turn") return play(H, w.code);
    if (w && w.n === 1 && w.kind === "inv") return openInvite(H, w.code);
    return openList(H, {});
  }

  // 18/11 (zijn vraag): spelers tikken op een lopend duel, of komen terug in de app, om te zien of de ander al speelde. Dan haalt het
  // scherm de lijst vers op: één duel_list, hooguit eens per 4 s (net geopend = al vers); intussen pulseert de regel van dat duel.
  // Is een duel dat je openklapte intussen klaar en zag je de uitslag nog niet: meteen de eindstand met de omdraaiende rondes.
  function syncList(T, force = false, focus = null) {   // force = een tik op het logo (of een seintje): dan ook binnen 4 s
    if (listSync || (!force && Date.now() - listAt < 4000)) { if (!listSync) syncCode = null; return; }
    const was = new Map((listItems || []).map((d) => [d.code, d.status]));
    const logo = document.getElementById("duels-title"), t0 = Date.now();
    logo?.classList.add("sync");   // de zwaarden kletteren zolang hij kijkt
    const shown = () => { const el = document.getElementById("modal-duels"); return !!el && !el.hidden; };
    listSync = Promise.all([call("duel_list", {}), drFetch(force)]).then(async ([r]) => {
      if (!r.ok || !shown()) return null;
      applyList(await withInvite(r.v));
      const pop = listItems.find((d) => (openWait.has(d.code) || d.code === focus) && was.get(d.code) === "active" && d.status === "done" && !d.seen);
      if (pop) { openGrp = pop.opp || oppName(pop); selInGrp[openGrp] = pop.code; standFocus = "b"; }
      return pop;
    }).catch(() => null).then((pop) => {
      listSync = null; syncCode = null;
      setTimeout(() => logo?.classList.remove("sync"), Math.max(0, 600 - (Date.now() - t0)));
      if (!shown()) return;
      renderList(T, null);
      if (pop) showEndPop(T, pop, { flip: true });
    });
  }

  function rowHtml({ av, name, h2h, tag = "", sub, right, cls = "", attrs = "" }) {   // tag = het thema-pilletje (db/202)
    return `<div class="dl-row${cls}"${attrs}>${av}` +
      `<span class="dl-main"><b>${esc(name)}${h2h ? ` <small>· ${esc(h2h)}</small>` : ""}${tag}</b><small>${sub}</small></span>${right || ""}</div>`;
  }
  const qAv = `<span class="dl-av" aria-hidden="true">?</span>`;

  // Welke vorm staat open onder Jouw stand: een ongeziene uitslag gaat voor (die moet je kunnen onthullen), dan een uitslag die we openen,
  // dan je eigen keuze, anders de vorm van je laatst afgelopen duel.
  function standMode(items) {
    if ((items || []).some(unrevealed)) return "b";
    if (standFocus) return standFocus;
    if (standPick === "b" || standPick === "k") return standPick;
    const t = (d) => Date.parse(d.finished_at || d.created_at) || 0;
    const lastB = Math.max(0, ...(items || []).filter((d) => d.status === "done").map(t)), lastK = Math.max(0, ...listKo.map(t));
    return lastK > lastB ? "k" : "b";
  }
  // De stand op de kaarten: van de server (db/189, alle duels; knock-outs in kw/kl/kn), zonder bots; zonder die (oude server) uit de lijsten.
  function standTotals(items) {
    const botK = new Set(listBots.map((b) => b.k)), t = { b: { w: 0, l: 0, n: 0 }, k: { w: 0, l: 0, n: 0 } };
    const hs = Object.entries(listH2h).filter(([k]) => !botK.has(k)).map(([, x]) => x);
    if (hs.length) {
      for (const x of hs) { t.b.w += x.w || 0; t.b.l += x.l || 0; t.b.n += x.n || 0; t.k.w += x.kw || 0; t.k.l += x.kl || 0; t.k.n += x.kn || 0; }
    } else {
      for (const d of items || []) { if (d.status !== "done" || unrevealed(d) || d.bot) continue; const r = resOf(d); t.b.n++; if (r !== "d") t.b[r]++; }
      for (const d of listKo) { if (botK.has(d.opp)) continue; const r = koRes(d); t.k.n++; if (r !== "d") t.k[r]++; }
    }
    return t;
  }
  function standCardsHtml(T, mode, items) {
    const t = standTotals(items);
    const card = (m, name, sub0) => {
      const x = t[m], n = Math.max(x.n, x.w + x.l);
      const head = `<button type="button" class="ms-card ${m}${n ? "" : " none"}" data-act="stand" data-mode="${m}" aria-pressed="${mode === m}">${dmIco(m, "ms-ico")}` +
        `<span class="ms-name">${esc(name)}</span>`;
      if (!n) return head + `<span class="ms-rec">${esc(T.notYet)}</span><span class="ms-sub">${esc(sub0)}</span></button>`;
      return head + `<span class="ms-rec"><span class="w">${x.w}</span><span class="dash">–</span><span class="l">${x.l}</span></span>` +
        `<span class="ms-sub">${esc(T.playedPct(n, Math.round((100 * x.w) / n)))}</span></button>`;
    };
    return `<div class="ms-cards" role="group" aria-label="${esc(T.standPick)}">${card("b", T.turnBtn, T.turnSub)}${card("k", T.koTag, T.koNotYetSub)}</div>`;
  }

  // ════ ⚔️ Duelrating (db/225, 22/11/2026; mockup https://claude.ai/artifact/25hpnMQYX1RszXzZeqV1xJ) ════
  // Glicko-1 voor duels tegen mensen (Best of 5 + live knock-out samen), los van de ⚡. De server rekent (triggers); hier alleen tonen:
  // de strook bovenaan Jouw stand (hele strook = de pop-up), de pop-up en de regel op beide eindstanden. Getallen komen al naar beneden
  // afgerond van de server (FLOOR-regel, zoals de ⚡). Voorlopig tot 10 duels: "?" en tien stipjes, geen plek in de rij.
  function drFetch(force = false) {   // met duel_list mee (geen extra laadbeurt van de pagina); zonder account niets
    if (!H?.loggedIn) { listDr = null; return Promise.resolve(null); }
    if (drBusy) return drBusy;
    if (!force && Date.now() - drAt < 4000) return Promise.resolve(listDr);
    drBusy = (async () => {
      try {
        if (H.ready) await H.ready();
        const v = await H.rpc("get_my_duel_rating", {});
        listDr = v && v.n ? v : null; drAt = Date.now();
      } catch (e) { /* oude server of geen verbinding: dan geen strook */ }
      drBusy = null;
      return listDr;
    })();
    return drBusy;
  }
  const drSign = (n) => (n > 0 ? "+" : "−") + Math.abs(n);
  const drTrendHtml = (T, v) => (v && v.week ? `<span class="dr-trend ${v.week > 0 ? "up" : "down"}">${drSign(v.week)} <small>${esc(T.drWeek)}</small></span>` : "");
  function drStripHtml(T) {
    const v = listDr;
    if (!H?.loggedIn || !v || !v.n) return "";
    const head = `<button type="button" class="dr-strip" data-act="dr"><span class="dr-ico" aria-hidden="true">${ICON}</span><span class="dr-main">`;
    const chev = `<span class="dr-chev" aria-hidden="true">›</span></button>`;
    if (v.prov) {
      const pips = Array.from({ length: 10 }, (_, i) => `<i${i < v.n ? ' class="on"' : ""}></i>`).join("");
      return head + `<span class="dr-lbl">${esc(T.drLbl)} · ${esc(T.drProv)}</span><span class="dr-row"><span class="dr-num">${v.r}<span class="dr-q">?</span></span>` +
        `<span class="dr-prov"><span class="dr-pips" aria-hidden="true">${pips}</span>${esc(T.drLeft(10 - v.n))}</span></span></span><span aria-hidden="true"></span>` + chev;
    }
    const est = (v.rank || []).filter((x) => x.n >= 10), i = est.findIndex((x) => x.me);
    const rank = i >= 0 && est.length > 1 ? `<span class="dr-rank"><b>#${i + 1}</b><small>${esc(T.drOf(est.length))}</small></span>` : `<span aria-hidden="true"></span>`;
    return head + `<span class="dr-lbl">${esc(T.drLbl)}</span><span class="dr-row"><span class="dr-num">${v.r}</span>${drTrendHtml(T, v)}</span></span>` + rank + chev;
  }
  // je laatste duels als lijntje (met het begin erbij zolang je er ≤ 20 hebt): vlak, gestippelde lijn op een rond honderdtal, eindwaarde erbij
  function drSparkHtml(T, v) {
    const hs = (v && v.hist || []).map(Number).filter((x) => isFinite(x));
    if (hs.length < 2) return "";
    const W = 300, Hh = 70, n = hs.length, lo0 = Math.min(...hs), hi0 = Math.max(...hs), pad = Math.max(8, (hi0 - lo0) * 0.12);
    const lo = lo0 - pad, hi = hi0 + pad, x = (i) => 30 + (i * (W - 70)) / (n - 1), y = (r) => 8 + (1 - (r - lo) / (hi - lo)) * (Hh - 16);
    const pts = hs.map((r, i) => `${x(i).toFixed(1)},${y(r).toFixed(1)}`).join(" ");
    const g = Math.round((lo0 + hi0) / 200) * 100, grid = g > lo && g < hi
      ? `<line class="ax" x1="30" x2="${W - 40}" y1="${y(g).toFixed(1)}" y2="${y(g).toFixed(1)}"/><text x="0" y="${(y(g) + 3.5).toFixed(1)}">${g}</text>` : "";
    const last = hs[n - 1];
    return `<figure class="dr-spark"><svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(T.drLbl)}: ${hs[0]} → ${last}">${grid}` +
      `<polygon class="ar" points="${x(0).toFixed(1)},${Hh - 4} ${pts} ${x(n - 1).toFixed(1)},${Hh - 4}"/><polyline class="ln" points="${pts}"/>` +
      `<circle class="dt" cx="${x(n - 1).toFixed(1)}" cy="${y(last).toFixed(1)}" r="4.5"/><text class="end" x="${(x(n - 1) + 8).toFixed(1)}" y="${(y(last) + 4).toFixed(1)}">${last}</text></svg>` +
      `<figcaption>${esc(T.drLast(Math.min(v.n || n - 1, 20)))}</figcaption></figure>`;
  }
  function drPopHtml(T, v) {
    const rows = v.rank || [], est = rows.filter((x) => x.n >= 10), prov = rows.filter((x) => x.n < 10);
    const li = (x, i) => `<li class="${x.me ? "me" : ""}${x.n < 10 ? " prov" : ""}"><span class="rk">${i == null ? "" : i + 1}</span>${x.me ? meAv(T, " me") : avHtml(x.flair, x.name || "?")}` +
      `<span class="nm">${esc(x.me ? T.you : x.name || "?")}${x.n < 10 ? `<small>${esc(T.drProvRow(x.n))}</small>` : ""}</span>` +
      `<span class="rt">${x.r}${x.n < 10 ? '<span class="dr-q">?</span>' : ""}</span></li>`;
    const list = est.map((x, i) => li(x, i)).join("") + prov.map((x) => li(x, null)).join("");
    return `<div class="modal-backdrop" data-close></div><div class="modal-card duel-pop dr-pop">` +
      `<button type="button" class="modal-close" data-close aria-label="${esc(T.close)}">✕</button><div class="duel-inv">` +
      `<span class="duel-ico" aria-hidden="true">${ICON}</span><h2 id="duel-dr-title">${esc(T.drLbl)}</h2>` +
      `<div class="dr-big"><b>${v.r}${v.prov ? '<span class="dr-q">?</span>' : ""}</b>${drTrendHtml(T, v)}</div>${drSparkHtml(T, v)}` +
      (rows.length > 1 ? `<p class="dr-h">${esc(T.drList)}</p><ol class="dr-list">${list}</ol>` : "") +
      `<ul class="dr-how"><li>${esc(T.drHow1)}</li><li>${esc(T.drHow2)}</li><li>${esc(T.drHow3)}</li></ul></div></div>`;
  }
  const DR_ID = "modal-duel-rating";
  async function openDr(T) {   // boven Duels of boven een eindstand (over: true); ✕, Esc en de achtergrond = terug
    ensureCss();
    if (!listDr || Date.now() - drAt > 60000) await drFetch(true);
    if (!listDr) return;
    let el = document.getElementById(DR_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = DR_ID; el.className = "modal"; el.hidden = true;
      el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "duel-dr-title");
      document.body.appendChild(el);
      el.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) H.closeModal(DR_ID); });
    }
    el.innerHTML = drPopHtml(T, listDr);
    H.openModal(DR_ID, { over: true });
    el.querySelector(".modal-close")?.focus();
  }
  // De regel op de eindstand (Best of 5 hier, knock-out via kit.drLine): eerst je rating van vóór dit duel, dan telt hij razendsnel
  // zichtbaar naar de nieuwe (zijn regel: getallen nooit laten verspringen) en popt de delta. Telde dit duel niet (unrated, de ander zonder
  // account of zonder ronde, nog niet afgerekend): de regel blijft weg. Tik = de pop-up.
  async function drEndLine(p, code, delay = 0) {
    if (!p || !code) return;
    const T = tx(H.lang);
    let v = null;
    try { if (H.ready) await H.ready(); v = await H.rpc("get_my_duel_rating", { p_code: code }); } catch (e) { /* geen regel */ }
    const t = v && v.this;
    if (!t || !p.isConnected) { p.remove?.(); return; }
    listDr = v; drAt = Date.now();   // de strook op Duels loopt meteen mee
    p.innerHTML = `<span class="rating-lbl">${ICON} ${esc(T.drEnd)}: </span><span class="rating-num">${t.before}</span><span class="rating-go">›</span>`;
    p.hidden = false;
    const go = () => { gc("duel-rating-end", "Duel: duel rating opened from a result"); openDr(T); };
    p.onclick = go;
    p.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
    const dd = t.after - t.before, num = p.querySelector(".rating-num"), badge = document.createElement("span");
    badge.className = `rating-delta ${dd > 0 ? "up" : dd < 0 ? "down" : "zero"}`;
    badge.textContent = dd ? drSign(dd) : "±0";
    p.querySelector(".rating-go").before(badge);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => {
      badge.classList.add("pop");
      if (reduced || !dd) { num.textContent = String(t.after); return; }
      const t0 = performance.now(), dur = Math.min(900, 120 + Math.abs(dd) * 25);
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        num.textContent = String(Math.round(t.before + dd * k));
        if (k < 1 && num.isConnected) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, delay + 350);
  }
  function groupsOf(items) {
    const m = new Map();
    for (const d of items) {
      if (d.status !== "done") continue;
      const k = d.opp || oppName(d);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(d);
    }
    const t = (d) => Date.parse(d.finished_at || d.created_at) || 0;
    return [...m.entries()].map(([k, ds]) => ({ k, ds: ds.sort((a, b) => t(b) - t(a)) })).sort((a, b) => t(b.ds[0]) - t(a.ds[0]));
  }

  const stepsHtml = (T) => `<ol class="dl-steps"><li><span>${esc(T.st1)}<small>${esc(T.st1s)}</small></span></li>` +
    `<li><span>${esc(T.st2)}<small>${esc(T.st2s)}</small></span></li><li><span>${esc(T.st3)}<small>${esc(T.st3s)}</small></span></li></ol>`;

  function renderList(T, msg) {
    const el = document.getElementById("modal-duels");
    if (!el) return;
    const body = el.querySelector(".modal-body"), foot = el.querySelector(".dl-foot");   // "Hoe werkt het?" onderaan; de lege staat legt het zelf uit
    if (!listItems) { foot.hidden = true; body.innerHTML = `<p class="dl-msg">${esc(T.loading)}</p>`; return; }
    foot.hidden = !listItems.length && !listTop;
    body.innerHTML = listBody(T, listItems, listTop, msg);
    fillKo(body);
  }

  // De inhoud van het Duels-scherm. top = wat je net deed (naamveld, "verstuurd" met de link, een fout): dat staat bovenaan,
  // dan jouw beurt, en pas daaronder "Daag een vriend uit" (eerst spelen wat op je wacht; na versturen geen grote knop boven het groene vak).
  function listBody(T, items, top, msg) {
    const newBtn = `<button type="button" class="dl-new" data-act="pick" aria-haspopup="dialog">${icoHtml()} ${esc(T.newBtn)}</button>`;   // db/239: de pop-up voor een link
    const err = msg ? `<p class="dl-msg duel-err">${esc(msg)} <button type="button" class="dl-mini" data-act="reload">${esc(T.retry)}</button></p>` : "";
    const koLive = (koNow() && window.KO.liveHtml?.(H)) || "";   // ⚡ een knock-out die nu loopt (20/11): de kaart terug naar het spel
    const rb = readyBot();   // 🤖 de bot die klaarstaat (22/11): als uitdaging, ook zonder account
    // De bot die klaarstaat hoort bij Wacht, onder "Daag een vriend uit" (22/11, zijn "logischer dat die invite onder de challenge a friend
    // komt te staan, het moet gewoon bij waiting staan en die hoort daaronder"); de bots, laatste kaart, telt niet mee in het getal.
    const waitBot = () => (rb && !shut.has("wait") ? botCardHtml(T, rb) : "");
    if (!items.length && !listKo.length && !top && !koLive) {   // lege staat: Jij vs ?, de drie stappen (= de uitleg), één knop; daaronder Wacht met de bot
      const bf = rb ? "" : botFaceHtml(T);   // het 🤖-gezichtje alleen als er geen bot klaarstaat (oude server)
      return err + `<div class="dl-hero">${bandHtml(T, "?", null)}` +
        `<h3>${esc(T.heroTitle)}</h3>${stepsHtml(T)}${bf ? `<div class="dl-pick bot-only"><div class="dl-faces">${bf}</div></div>` : ""}${newBtn}</div>` +
        (rb ? secH("wait", esc(T.secWait)) + waitBot() : "");
    }
    // Jouw stand (22/11/2026): per vorm, niet meer door elkaar en niet meer bovenaan (wat loopt staat al bij Jouw beurt en Wacht).
    const mode = standMode(items), groups = groupsOf(mode === "k" ? listKo : items);
    const anyDone = groups.length > 0 || groupsOf(mode === "k" ? items : listKo).length > 0;
    let h = top + err;
    const turn = items.filter((d) => d.status === "active" && (d.mine || []).length < 5)
      .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
    const wait = items.filter((d) => (d.status === "open" && d.me === "c") || (d.status === "active" && (d.mine || []).length >= 5));
    const recent = (d) => Date.now() - Date.parse(d.created_at) < 3 * 864e5;
    const gone = items.filter((d) => d.me === "c" && ["expired", "declined"].includes(d.status) && recent(d)).slice(0, 3);
    const h2hTxt = (d) => { const [a, b] = recB(d.opp || oppName(d)); return a || b ? T.h2h(a, b) : ""; };   // een gewoon duel: de Best of 5-stand
    const inc = items.filter(incoming);   // db/189: een uitdaging aan jou (een teamgenoot, of een revanche)
    if (turn.length || inc.length || koLive) {
      const nT = turn.length + inc.length + (koLive ? 1 : 0);
      h += secH("turn", `${esc(T.secTurn)}${nT > 1 ? ` · ${nT}` : ""}`);
      if (!shut.has("turn")) h += koLive;   // live gaat voor: de klok loopt
      if (!shut.has("turn")) for (const d of inc) {   // 19/11: de hele kaart = Neem aan (✕ apart); de twee kanten, zoals de opening
        const n = d.c_name || "?", rec = h2hTxt(d);
        h += `<div class="dl-card inc" data-act="accept" data-code="${d.code}">${bandHtml(T, n, d.c_flair)}` +
          `<div class="dl-card-f"><small><b>${esc((d.rematch ? T.invRematch : T.invTitle)(n))}</b>${thHtml(d)}<br>${rec ? esc(cap(rec)) + " · " : ""}<em>${esc((rec ? String : cap)(leftText(T, d.deadline)))}</em></small>` +
          `<button type="button" class="dl-go" data-act="accept" data-code="${d.code}">${esc(T.acceptShort)}</button>` +
          `<button type="button" class="dl-x" data-act="decline" data-code="${d.code}" aria-label="${esc(T.decline)}">✕</button></div></div>`;
      }
      if (!shut.has("turn")) for (const d of turn) {   // 19/11: het bord + één regel, de hele kaart = Speel
        const n = oppName(d), k = d.their_done || 0, h2 = h2hTxt(d);
        const who = k >= 5 ? T.oppDone(n) : k > 0 ? T.oppPlays(n, k) : d.me === "c" ? T.accepted(n) : T.oppNotYet(n);   // "nam aan" alleen als jij uitdaagde
        h += `<div class="dl-card turn" data-act="play" data-code="${d.code}">` + boardHtml(T, d, { cur: (d.mine || []).length, meta: leftText(T, d.deadline), peek: false }) +
          `<div class="dl-card-f"><small>${esc(who)}${h2 ? ` · ${esc(h2)}` : ""}${thHtml(d)}</small><button type="button" class="dl-go" data-act="play" data-code="${d.code}">${esc(T.play)}</button></div></div>`;
      }
    }
    if (!top.startsWith("<form")) h += pickHtml(T, newBtn, items);   // met het naamveld open is "Daag uit" de knop
    if (wait.length || rb) {
      h += secH("wait", `${esc(T.secWait)}${wait.length > 1 ? ` · ${wait.length}` : ""}`);
      if (!shut.has("wait")) for (const d of wait) h += d.status === "open" ? openLinkHtml(T, d) : waitItemHtml(T, d, h2hTxt(d));
      h += waitBot();   // 🤖 als laatste: eerst wat met mensen loopt
    }
    if (anyDone || gone.length) {
      h += secH("done", esc(T.secDone));
    }
    if ((anyDone || gone.length) && !shut.has("done")) {
      if (anyDone) h += drStripHtml(T) + standCardsHtml(T, mode, items);
      if (anyDone && !groups.length) h += `<p class="ms-empty">${esc(mode === "k" ? T.koNone : T.bo5None)}</p>`;
      const shown = showAll ? groups : groups.slice(0, 3);
      for (const g of shown) h += groupHtml(T, g, mode);
      if (!showAll && groups.length > 3) h += `<button type="button" class="dl-moreb" data-act="more">${esc(T.moreOpp(groups.length - 3))}</button>`;
      if (mode === "b") for (const d of gone) {
        const sub = d.status === "declined" ? T.declined(d.o_name || "?") : T.nobody;
        h += rowHtml({ av: qAv, name: T.yourLink, sub: esc(sub), cls: " dim", right: `<span class="dl-res">${esc(T.gone)}</span>` });
      }
    }
    return h;
  }

  // 19/11 (zijn "op computer kan je niet naar rechts swipen bij gezichtjes en carousel"): met een muis slepen in de gezichtjesrij en het
  // carrouselletje van "vraag terugzien"; het wiel scrolt de gezichtjes zijwaarts. Na slepen geen klik (geen per ongeluk gekozen gezichtje),
  // en de carrousel klikt vast op het dichtstbijzijnde feit. Vingers doen dit al zelf (alleen pointerType "mouse").
  (() => {
    let drag = null;
    const SEL = ".dl-faces, .rq-vp";
    try {
      document.addEventListener("pointerdown", (e) => {
        const el = e.pointerType === "mouse" && e.button === 0 && e.target.closest?.(SEL);
        if (!el || el.scrollWidth <= el.clientWidth + 2) return;
        drag = { el, x: e.clientX, left: el.scrollLeft, moved: false, id: e.pointerId };
      }, true);
      document.addEventListener("pointermove", (e) => {
        if (!drag || e.pointerId !== drag.id) return;
        const dx = e.clientX - drag.x;
        if (!drag.moved && Math.abs(dx) < 6) return;
        if (!drag.moved) { drag.moved = true; drag.el.style.scrollSnapType = "none"; drag.el.style.cursor = "grabbing"; try { drag.el.setPointerCapture(e.pointerId); } catch (err) {} }
        drag.el.scrollLeft = drag.left - dx;
      }, true);
      const end = () => {
        if (!drag) return;
        const d = drag; drag = null;
        if (!d.moved) return;
        d.el.style.cursor = "";
        if (d.el.matches(".rq-vp")) {   // vastklikken op een feit, dan het vastklikken van de browser terug
          const w = d.el.clientWidth || 1;
          d.el.scrollTo({ left: Math.round(d.el.scrollLeft / w) * w, behavior: "smooth" });
          setTimeout(() => { d.el.style.scrollSnapType = ""; }, 400);
        } else d.el.style.scrollSnapType = "";
        const stop = (ev) => { ev.stopPropagation(); ev.preventDefault(); };   // de klik na het slepen telt niet
        document.addEventListener("click", stop, { capture: true, once: true });
        setTimeout(() => document.removeEventListener("click", stop, true), 50);
      };
      document.addEventListener("pointerup", end, true);
      document.addEventListener("pointercancel", end, true);
      document.addEventListener("wheel", (e) => {
        const el = e.target.closest?.(".dl-faces");
        if (!el || el.scrollWidth <= el.clientWidth + 2 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
        const max = el.scrollWidth - el.clientWidth;
        if ((e.deltaY < 0 && el.scrollLeft <= 0) || (e.deltaY > 0 && el.scrollLeft >= max - 1)) return;   // aan het eind: gewoon de pagina
        el.scrollLeft += e.deltaY; e.preventDefault();
      }, { passive: false });
    } catch (e) {}
  })();
  // db/206: wie er nu op Jaardle is (/live.js, alleen ingelogd): een groen stipje op het gezichtje. Verandert het, dan alleen de stipjes
  // bijwerken (geen nieuwe lijst: een open naamveld of keuze blijft staan).
  const isOn = (k) => !!(k && window.Live?.isOn?.(k));
  // ⚡ de knock-out die nu loopt (al afgelopen in de lijst = ko.js miste het seintje) en met wie: kaart + gezichtje "loopt", tik = terug
  const koNow = () => { const g = H?.ko && window.KO?.live?.(); return g && !listKo.some((d) => d.code === g.code) ? g : null; };
  const koOpp = () => koNow()?.opp || null;
  const koResume = () => { H?.ko?.().then((K) => K.resume?.(H)).catch(() => {}); };
  window.addEventListener?.("jaardle:ko-live", () => {   // begint of stopt er een: de kaart erbij of eraf
    const m = document.getElementById("modal-duels");
    if (H && listItems && m && !m.hidden) renderList(tx(H.lang), null);
  });
  // 22/11 (zijn "live mensen altijd vooraan, maar bot altijd op 1"): wie online is eerst, verder de volgorde van de server; de bots staan
  // er los vóór (botFaceHtml). Verandert wie er online is, dan schuiven de gezichtjes op hun plek zonder nieuwe lijst.
  const onFirst = (ts) => [...ts].sort((a, b) => Number(isOn(b.k)) - Number(isOn(a.k)));
  function syncOnline() {
    refreshPick();   // db/239: de pop-up voor een vriend (de regel onder de knop bij een knock-out)
    document.querySelectorAll("#modal-duels .dl-face[data-face]").forEach((f) => f.querySelector(".dl-av")?.classList.toggle("on", isOn(f.dataset.face)));
    const row = document.querySelector("#modal-duels .dl-faces");
    if (!row) return;
    const order = onFirst(listTargets).map((t) => t.k), pos = (f) => { const i = order.indexOf(f.dataset.face); return i < 0 ? order.length : i; };
    const now = [...row.querySelectorAll(".dl-face[data-face]")], want = [...now].sort((a, b) => pos(a) - pos(b));
    if (want.some((f, i) => f !== now[i])) want.forEach((f) => row.appendChild(f));
  }
  window.addEventListener?.("jaardle:online", syncOnline);
  // db/189: je teamgenoten (en eerdere tegenstanders met een account) als gezichtjes, met jullie stand eronder. Tik = de pop-up om die
  // vriend uit te dagen (db/239; geen link nodig, die krijgt een seintje). De grote knop eronder = de pop-up voor een link.
  function pickHtml(T, newBtn, items = listItems) {
    const bf = botFaceHtml(T);   // 🤖 (db/218, zijn "voorraan"): de bots altijd vooraan, ook zonder account
    const only = () => `<h3 class="dl-h">${esc(T.pickH)}</h3><div class="dl-pick"><div class="dl-faces">${bf}</div>${newBtn}</div>`;
    if (!H.loggedIn) return (bf ? only() : newBtn) + acctHtml(T, items);   // zonder account: de link, en (na een duel tegen een account) de account-regel
    if (!listTargets.length) return bf ? only() : newBtn;
    const koK = koOpp();
    // db/239: een gezichtje opent de pop-up (zoals 🤖 Bots al deed); loopt er iets met die vriend, dan dat (zie onListClick)
    const faces = onFirst(listTargets).map((t) => {
      const [a, b] = recOf(t.k), busy = !!t.busy || t.k === koK;
      const lab = busy ? `<small class="run">${esc(T.faceRun)}</small>`
        : a || b ? `<small class="${a > b ? "up" : a < b ? "down" : ""}">${a}–${b}</small>` : `<small class="new">${esc(T.faceNew)}</small>`;
      return `<button type="button" class="dl-face${busy ? " busy" : ""}" data-face="${esc(t.k)}"${busy ? "" : ' aria-haspopup="dialog"'}>` +
        `${avHtml(t.flair, t.name, isOn(t.k) ? " on" : "")}<b>${esc(t.name)}</b>${lab}</button>`;
    }).join("");
    return `<h3 class="dl-h">${esc(T.pickH)}</h3><div class="dl-pick"><div class="dl-faces">${bf}${faces}</div>${newBtn}</div>`;
  }
  // jullie stand per vorm (22/11): Best of 5 (⚔️) en knock-outs (⚡), elk met stand en laatste blokjes; een vorm zonder potjes valt weg
  function vsLineHtml(T, t) {
    const seg = (m, [a, b], f) => (a || b ? `<span class="vs-m"><span class="vs-e" aria-hidden="true">${m === "k" ? "⚡" : ICON}</span><b>${a}–${b}</b>${formHtml(f.slice(-5))}</span>` : "");
    const segs = seg("b", recB(t.k), formB(t.k)) + seg("k", recK(t.k), formK(t.k));
    return segs ? `<div class="dl-vsline"><span>${esc(T.vsLine(t.name))}</span>${segs}</div>` : "";
  }
  // ⚔️ db/239: de pop-up om uit te dagen. t = een vriend (een gezichtje uit listTargets), zonder t een link. Bovenaan wie (de band: jij
  // tegen die vriend, of tegen ?; het rondje in het midden volgt de vorm), dan jullie stand, de strook en één knop; bij een vriend
  // onderaan nog de link als uitweg. Een knock-out met iemand die niet online is: één regel onder de knop (seintje + 1 minuut).
  const PICK_ID = "modal-duel-pick";
  let pickFor = null;   // de vriend van de open pop-up (null = een link)
  function openPick(T, t = null) {
    pickFor = t;
    let el = document.getElementById(PICK_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = PICK_ID; el.className = "modal"; el.hidden = true;
      el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true");
      document.body.appendChild(el);
      el.addEventListener("click", onPickClick);
    }
    pickFill(el, T);
    H.openModal(PICK_ID, { over: true });
    el.querySelector(".dk-go")?.focus();
    gc(t ? "duel-pick-face" : "duel-pick-link", t ? "Duel: challenge pop-up for a friend" : "Duel: challenge pop-up for a link");
  }
  function pickFill(el, T) {
    const t = pickFor, ko = !!t && botMode === "k";
    const band = bandHtml(T, t ? t.name : "?", t ? t.flair : null, { poster: true });
    const inner = t
      ? (ko ? band.replace(`<span class="vb-badge">${ICON}</span>`, '<span class="vb-badge ko-z">⚡</span>') : band) + vsLineHtml(T, t) + dkHtml(T, { rated: true }) +
        `<button type="button" class="duel-go dk-go" data-act="pgo">${icoHtml(ko ? "⚡" : ICON)} ${esc(T.challengeX(t.name))}</button>` +
        (ko && !isOn(t.k) ? `<p class="dk-note">${esc(T.liveOff(t.name))}</p>` : "") +
        `<button type="button" class="duel-no" data-act="plink">${esc(T.linkInstead)}</button>`
      : band + `<h2>${esc(T.newBtn)}</h2>` + dkHtml(T, { vorm: false, rated: true }) +
        `<button type="button" class="duel-go dk-go" data-act="pgo">${icoHtml()} ${esc(T.makeLink)}</button>`;
    el.setAttribute("aria-label", t ? T.challengeX(t.name) : T.newBtn);
    el.innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal-card duel-pop dk-pop">` +
      `<button type="button" class="modal-close" data-close aria-label="${esc(T.close)}">✕</button><div class="duel-inv">${inner}</div></div>`;
  }
  function onPickClick(e) {
    const el = document.getElementById(PICK_ID), T = tx(H.lang);
    if (e.target.closest("[data-close]")) return H.closeModal(PICK_ID);
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act, t = pickFor;
    if (act === "dk") {   // de pop-up blijft open; de kaart van de bot die klaarstaat in Duels volgt
      if (dkPick(b)) { pickFill(el, T); el.querySelector(`[data-dk="${b.dataset.dk}"][aria-checked="true"]`)?.focus(); refreshList(); }
      return;
    }
    if (act === "rated") return toggleRated(b);
    if (act !== "pgo" && act !== "plink") return;
    H.closeModal(PICK_ID);
    if (act === "plink" || !t) return create(H, { theme: pickedTheme() });
    if (botMode === "k") return H.ko?.().then((K) => K.invite(H, t.k, t.name, { rated: ratedOn, theme: pickedTheme() })).catch(() => {});
    gc("duel-create-team", "Duel: teammate challenged");
    return create(H, { forK: t.k, forName: t.name, theme: pickedTheme() });
  }
  // de pop-up voor een vriend opnieuw tekenen als die net online kwam of wegging (de regel onder de knop)
  function refreshPick() {
    const el = document.getElementById(PICK_ID);
    if (H && el && !el.hidden && pickFor) pickFill(el, tx(H.lang));
  }
  // 🤖 Bots (db/218, 21/11, mockup "Knock-out bots"): één gezichtje, altijd online; eronder je stand tegen alle bots samen. Tik = de keuze
  // (pop-up). Loopt er een spel tegen een bot: "loopt", tik = terug.
  function botFaceHtml(T) {
    if (!listBots.length) return "";
    const busy = !!koNow()?.bot;
    let w = 0, l = 0;
    for (const b of listBots) { w += (b.w || 0) + (b.bw || 0); l += (b.l || 0) + (b.bl || 0); }   // db/227: knock-outs + Best of 5
    const lab = busy ? `<small class="run">${esc(T.faceRun)}</small>`
      : w || l ? `<small class="${w > l ? "up" : w < l ? "down" : ""}">${w}–${l}</small>` : `<small class="new">${esc(T.faceNew)}</small>`;
    return `<button type="button" class="dl-face bot${busy ? " busy" : ""}" data-act="${busy ? "kolive" : "bots"}"${busy ? "" : ' aria-haspopup="dialog"'}>` +
      `${avHtml("🤖", T.botsFace, " on", false)}<b>${esc(T.botsFace)}</b>${lab}</button>`;
  }
  // 🤖 De bot die klaarstaat (22/11/2026, zijn idee: "dat er altijd een challenge klaar staat van bot van jouw dichtste rating zodat nieuwe
  // spelers ook gelijk 1 druk play kunnen doen; maar hun starten met pip als ze unrated zijn"; mockup
  // https://claude.ai/artifact/8M32TzfMpK2m8a8Y31Gw1U). Sinds 24/11 (zijn "laten we toch alleen de bot aanraden bij duels waar je een
  // neutraal of hogere score hebt; je rating is niet indicatief genoeg") telt je ⚡ niet meer, alleen je stand tegen de bots: de ladder
  // (Pip, na een zege op een bot de volgende = de hoogste die je ooit versloeg + 1) en daarvandaan omlaag tot een bot waar je niet
  // achterstaat (zeges ≥ nederlagen, ⚡ en ⚔️ samen; 0–0 = gelijk). Sta je overal achter: Pip.
  // Niet zolang er een knock-out loopt: die kaart staat er dan al. Alleen uit duel_list (bots met jouw stand).
  function readyBot() {
    if (!listBots.length || koNow()) return null;
    return pickReady(listBots);
  }
  // 🤖 db/232: dezelfde keuze voor de bot-kaart op het eindscherm van de daily (de bots komen daar uit get_daily_bots, zelfde vorm)
  function pickReady(list) {
    const bots = list.filter((b) => Number.isFinite(Number(b.elo))).sort((a, b) => a.elo - b.elo);
    if (!bots.length) return null;
    let top = -1;
    bots.forEach((b, i) => { if (botBeaten(b)) top = i; });   // db/227: ook een zege in Best of 5
    for (let i = Math.min(top + 1, bots.length - 1); i >= 0; i--) if (!botBehind(bots[i])) return bots[i];
    return bots[0];
  }
  // De kaart: dezelfde als "X daagt je uit" (band + regel, de hele kaart = Speel), zonder ✕ en zonder klok. Tweede regel: zijn zin zolang
  // je nog nooit tegen hem speelde, daarna jullie stand (zoals bij een vriend).
  // ⚔️ db/227 (22/11, zijn "wellicht ook in de auto challenge dat je kan kiezen tussen die twee icons"): op de kaart ⚡ en ⚔️ als twee
  // knopjes, de gekozen vorm erachter. De hele kaart = spelen in die vorm; dezelfde keuze als de schakelaar in de pop-up (botMode).
  // 🤖 db/232 (zijn "had verwacht dat het meer zou lijken als de standaard uitnodiging ook zonder die header"): onder een botrij op het
  // eindscherm van de daily dezelfde kaart zonder band (band: false, de rij is de kop) en met zijn reactie op vandaag (say).
  function botCardHtml(T, b, { band = true, say: line = "" } = {}) {
    const [w, l] = botRec(b), say = T["say" + b.key], k = esc(b.key);
    const sub = line ? `<i>${esc(T.botQ(line))}</i>` : w || l ? esc(cap(T.h2h(w, l))) : say ? `<i>${esc(T.botQ(say))}</i>` : "";
    return `<div class="dl-card inc bot${band ? "" : " bc-in"}" data-act="botgo" data-bot="${k}">${band ? bandHtml(T, b.name, b.flair) : ""}` +
      `<div class="dl-card-f"><small><b>${esc(T.invTitle(b.name))}</b>${botModesHtml(T)}${sub ? "<br>" + sub : ""}</small>` +
      `<button type="button" class="dl-go" data-act="botgo" data-bot="${k}">${esc(T.play)}</button></div></div>`;
  }
  // ⚔️ db/227 Best of 5 tegen een bot (22/11/2026, zijn "kunnen we ook maken dat je tegen bots rounds kan spelen?" → "Schakelaar bovenin").
  // Eén keuze voor de pop-up en de kaart, onthouden (standaard Knock-out, zoals het was). De stand per bot volgt de vorm: w/l = knock-outs,
  // bw/bl = Best of 5 (duel_list). De groene rand blijft: ooit verslagen, in welke vorm dan ook. Sinds db/239 ook de vorm voor een vriend
  // (de strook, dkHtml): één onthouden keuze voor iedereen (de sleutel heet nog bot-mode, zodat niemand zijn keuze kwijtraakt).
  const BOTMODE_KEY = "jaardle:bot-mode";
  let botMode = (() => { try { return localStorage.getItem(BOTMODE_KEY) === "b" ? "b" : "k"; } catch (e) { return "k"; } })();
  function setBotMode(m) {
    if ((m === "b" ? "b" : "k") === botMode) return false;
    botMode = m === "b" ? "b" : "k";
    try { localStorage.setItem(BOTMODE_KEY, botMode); } catch (e) {}
    gc("duel-bot-mode-" + botMode, "Duel: bot mode " + (botMode === "b" ? "best of 5" : "knockout"));
    return true;
  }
  const botRec = (b, m = botMode) => (m === "b" ? [b.bw || 0, b.bl || 0] : [b.w || 0, b.l || 0]);
  const botBeaten = (b) => (b.w || 0) + (b.bw || 0) > 0;
  const botBehind = (b) => (b.w || 0) + (b.bw || 0) < (b.l || 0) + (b.bl || 0);   // de bot die klaarstaat: hier sta je achter
  // op de kaart van de bot die klaarstaat: alleen de twee iconen als knopjes, de naam van de gekozen vorm erachter (de pop-up heeft de
  // strook, dkHtml). db/239: bij 1900+ staat dat achter de naam ("Knock-out · 📻 1900+"; een los pilletje liep op 360 px naar een 3e regel)
  function botModesHtml(T) {
    const opt = (m, ico, name) => `<button type="button" class="bm-o" role="radio" data-act="bmode" data-bmode="${m}" aria-checked="${botMode === m}"` +
      ` aria-label="${esc(name)}" title="${esc(name)}"><span class="bm-i" aria-hidden="true">${ico}</span></button>`;
    const seg = `<span class="bm-seg" role="radiogroup" aria-label="${esc(T.standPick)}">${opt("k", "⚡", T.koTag)}${opt("b", ICON, T.turnBtn)}</span>`;
    const th = THEMES[pickTheme];
    return `<span class="bm-mini">${seg}<span class="bm-n">${esc(botMode === "b" ? T.turnBtn : T.koTag)}${th ? ` · ${th.ico} ${esc(th.label)}` : ""}</span></span>`;
  }
  // 🤖 een bot beginnen in de gekozen vorm en jaren (de pop-up, de kaart die klaarstaat, de kaart op het eindscherm van de daily)
  function botGo(key) {
    if (botMode === "b") return botDuel(H, key, pickedTheme());
    return H.ko?.().then((K) => K.botStart?.(H, key, false, { theme: pickedTheme() })).catch(() => {});
  }
  // Best of 5 tegen een bot: hij speelt zijn vijf rondes meteen (server), jij speelt ze zoals altijd; loopt er al een, dan die.
  let botDuelBusy = false;
  async function botDuel(host, key, theme = null) {   // theme: db/239 (1900+; een revanche neemt dat van het vorige duel)
    H = host;
    if (botDuelBusy) return;
    botDuelBusy = true;
    const T = tx(H.lang);
    gc("duel-bot-b5-" + String(key).replace(/[^a-z0-9]/g, ""), "Duel: best of 5 started against a bot");
    try {
      const [r] = await Promise.all([call("duel_bot_start", { p_bot: key, p_name: myName() || null, ...(theme ? { p_theme: theme } : {}) }), H.ko ? H.ko().catch(() => null) : null]);   // ko.js: zijn zinnen
      if (!r.ok || !r.v) {
        listTop = `<p class="dl-msg duel-err">${esc(/cooldown/.test(r.e || "") ? T.errBotCool : T.err)}</p>`;
        return openList(H, { keepTop: true });
      }
      const d = keep(r.v);
      remember(d.code, d.deadline);
      ["modal-duel-bots", "modal-duel-end"].forEach((id) => { const el = document.getElementById(id); if (el && !el.hidden) H.closeModal(id); });
      return play(H, d.code, d);
    } finally { botDuelBusy = false; }
  }
  // de bot achter een duel (db/227: d.bot = zijn sleutel), en wat hij zegt: de zinnen van ko.js (BOT_TXT, window.KO na het laden)
  const botOf = (d) => (d && d.bot && listBots.find((b) => b.key === d.bot)) || null;
  function botLine(d, moment, seed) {
    const L = window.KO?.botCopy?.(H?.lang) || window.KO?.botCopy?.("en"), B = d?.bot && L && L[d.bot];
    const arr = (B?.[moment] || []).filter((t) => !t.includes("|"));   // "rond|…" en "na1950|…" gaan over een gok: niet in Best of 5
    if (!arr.length) return "";
    let h = 7; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const me = H?.loggedIn ? H.myRating?.() : null, b = botOf(d);
    const p = me != null && b?.elo != null ? Math.round(100 / (1 + 10 ** ((me - b.elo) / 400))) : "??";   // Robo: zijn winkans (elo)
    return arr[h % arr.length].replace(/\{p\}/g, String(p));
  }
  const botSayHtml = (d, text, cls = "") => {
    if (!text) return "";
    const f = oppFlair(d) || "🤖", fl = H?.flairHtml ? H.flairHtml(f) : "";
    return `<p class="bo-line${cls}"><span class="bo-av" aria-hidden="true">${fl || esc(f)}</span><span class="bo-tx">${esc(text)}</span></p>`;
  };
  // één bot als regel (de pop-up, en na winst op het K.O.-eindscherm: next). Het niveau komt uit de volgorde (botLvl), de rating eronder.
  // 🤖 db/226 (mockup "Bots met karakter" v3, zijn keuze 22/11): onder de naam de zin van de bot (zoals het ballonnetje op chess.com: hij
  // kondigt zijn trekje aan), en een groene rand om zijn gezichtje als je hem ooit versloeg (zijn "kroontje niet zo, gewoon een border").
  function botOptHtml(T, b, i, { you = false, next = false, attrs = "", mode = botMode } = {}) {
    const lvl = (T.botLvl || "").split("|")[i] || "", [w, l] = botRec(b, mode), say = T["say" + b.key];
    const rec = !next && (w || l) ? `<span class="bo-rec${w > l ? " up" : w < l ? " down" : ""}">${w}–${l}</span>` : "";
    return `<button type="button" class="dl-opt bot-opt" data-bot="${esc(b.key)}"${attrs ? " " + attrs : ""}>${avHtml(b.flair, b.name, botBeaten(b) ? " won" : "")}` +
      `<span class="bo-t"><b>${esc(b.name)}${you ? ` <span class="bo-you">${esc(T.botYou)}</span>` : ""}</b>` +
      `<small>${next ? esc(T.botNext) + ": " : ""}${esc([lvl, b.elo].filter((x) => x !== "" && x != null).join(" · "))}</small>` +
      (say ? `<span class="bo-say">${esc(T.botQ(say))}</span>` : "") + `</span>${rec}</button>`;
  }
  const BOTS_ID = "modal-duel-bots";
  function openBots(T) {
    let el = document.getElementById(BOTS_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = BOTS_ID; el.className = "modal"; el.hidden = true;
      el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "duel-bots-title");
      document.body.appendChild(el);
      el.addEventListener("click", (e) => {
        if (e.target.closest("[data-close]")) return H.closeModal(BOTS_ID);
        const m = e.target.closest('[data-act="dk"]');
        if (m) {   // ⚔️ db/227/239: de strook (vorm, jaren); de pop-up blijft open, de kaart in Duels volgt
          if (dkPick(m)) { botsFill(el, tx(H.lang)); el.querySelector(`[data-dk="${m.dataset.dk}"][aria-checked="true"]`)?.focus(); refreshList(); }
          return;
        }
        const b = e.target.closest("[data-bot]");
        if (!b) return;
        H.closeModal(BOTS_ID);
        botGo(b.dataset.bot);
      });
    }
    botsFill(el, T);
    H.openModal(BOTS_ID, { over: true });
    el.querySelector(".modal-close")?.focus();   // zoals de ?-pop-up: geen bot die al gekozen lijkt
  }
  function botsFill(el, T) {
    const me = H.loggedIn ? H.myRating?.() : null;   // "≈ jij": de bot die het dichtst bij jouw rating zit
    const near = me != null && listBots.length ? listBots.reduce((a, b) => (Math.abs(b.elo - me) < Math.abs(a.elo - me) ? b : a)) : null;
    el.innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal-card duel-pop bot-pop">` +
      `<button type="button" class="modal-close" data-close aria-label="${esc(T.close)}">✕</button>` +
      `<div class="duel-inv"><span class="duel-ico" aria-hidden="true">${botMode === "b" ? ICON : "⚡"}</span><h2 id="duel-bots-title">${esc(T.botsAny)}</h2>` +
      dkHtml(T) +   // db/239: dezelfde strook als bij een vriend, zonder Rated (een bot telt nooit)
      `<div class="dl-menu bot-menu">${listBots.map((b, i) => botOptHtml(T, b, i, { you: b === near })).join("")}</div>` +
      `<p class="bot-note">${esc(botMode === "b" ? T.botsNoteB : T.botsNote)}</p></div></div>`;
  }
  // het Duels-scherm opnieuw tekenen als het open is (de kaart van de bot die klaarstaat volgt de schakelaar)
  function refreshList() { const m = document.getElementById("modal-duels"); if (H && listItems && m && !m.hidden) renderList(tx(H.lang), null); }

  // Je openstaande uitdaging (19/11: "bij waiting is die nog grijs en saai"): dezelfde kaart als een uitdaging aan jou, met de twee
  // kanten. Tik = de link nog eens sturen (de knop is het label), ✕ = intrekken. db/189: een directe uitdaging of een revanche krijgt
  // geen linkveld (die ander krijgt een seintje en ziet hem in zijn lijst); een gewone link (wie hem als eerste aanneemt) heeft ? als
  // tegenstander en het veld met Kopieer, want de link is de enige weg (net verstuurd: dan staat hij al in het groene vak).
  function openLinkHtml(T, d) {
    const n = d.for_name || "", [a, b] = n ? recB(d.opp) : [0, 0];
    const sub = [n && d.rematch ? T.revenge : "", a || b ? cap(T.h2h(a, b)) : ""].filter(Boolean).map((s) => esc(s) + " · ").join("");
    return `<div class="dl-card out" data-act="resend" data-code="${d.code}">${bandHtml(T, n || "?", n ? d.for_flair : null)}` +
      `<div class="dl-card-f"><small><b>${esc(n ? T.challenged(n) : T.yourLink)}</b>${thHtml(d)}<br>${sub}<em>${esc((sub ? String : cap)(leftText(T, d.deadline)))}</em></small>` +
      `<button type="button" class="dl-mini" data-act="resend" data-code="${d.code}">${esc(n ? T.sendLinkShort : T.resend)}</button>` +
      `<button type="button" class="dl-x" data-act="withdraw" data-code="${d.code}" aria-label="${esc(T.withdraw)}" title="${esc(T.withdraw)}">✕</button></div>` +
      (n || listTop.includes(d.code) ? "" : linkField(T, d.code)) + `</div>`;
  }

  // Een duel dat op de ander wacht: tik = je eigen vijf scores, en die van de ander voor de rondes die jullie allebei speelden.
  function waitItemHtml(T, d, h2h) {   // 19/11: een klein bord; tik = open/dicht (de regel om het te laten weten)
    const n = oppName(d), k = d.their_done || 0, open = openWait.has(d.code);
    const card = `<div class="dl-card wait${listSync && syncCode === d.code ? " sync" : ""}" data-wait="${d.code}" role="button" tabindex="0" aria-expanded="${open}">` +
      boardHtml(T, d, { size: "mini", peek: false }) +
      `<div class="dl-card-f"><small>${esc(k > 0 ? T.oppPlays(n, k) : T.oppNotYet(n))} · <em>${esc(leftText(T, d.deadline))}</em>${h2h ? ` · ${esc(h2h)}` : ""}${thHtml(d)}</small>` +
      `<span class="dl-chev" aria-hidden="true">▾</span></div></div>`;
    const det = open ? `<div class="dl-detail"><p class="dl-wait-note">${esc(T.waitDetail(n, k))}</p>` +
      `<button type="button" class="dl-mini dl-rev" data-act="turn" data-code="${d.code}">${esc(T.tell(n))}</button></div>` : "";
    return `<div class="dl-item${open ? " open" : ""}">${card}${det}</div>`;
  }
  function groupHtml(T, g, mode = "b") {
    const latest = g.ds[0], n = oppName(latest), isOpen = openGrp === g.k, isK = mode === "k";
    const known = g.ds.filter((d) => !unrevealed(d));   // stand, blokjes en details alleen van uitslagen die je al zag
    let a = 0, b = 0;
    const form = known.slice(0, 8).reverse().map(resOf);
    for (const d of known) { const r = resOf(d); if (r === "w") a++; else if (r === "l") b++; }
    const sv = listH2h[g.k];
    if (sv) { a = (isK ? sv.kw : sv.w) || 0; b = (isK ? sv.kl : sv.l) || 0; }   // db/189: over alle duels van deze vorm, niet alleen de laatste 90 dagen
    const sel = known.find((d) => d.code === selInGrp[g.k]) || known[0];
    const news = g.ds.some((d) => !d.seen);
    const sub = unrevealed(latest) ? T.revealTap : `${cap(whenText(T, latest.finished_at))}: ${latest.ko ? T.koRes(koRes(latest), koR(latest)) : resText(T, outcome(latest.mine, latest.theirs))}`;
    const bot = listBots.some((x) => x.k === g.k);   // 🤖 knock-outs en (db/227) Best of 5 tegen een bot; telt niet mee op de kaart
    const rec = known.length ? `<span class="dl-rec"><span class="dl-form" aria-hidden="true">${form.map((r) => `<i class="${r}"></i>`).join("")}</span><b>${a}–${b}</b></span>` : "";
    const row = `<div class="dl-row${news ? " has-new" : ""}" data-grp="${esc(g.k)}" role="button" tabindex="0" aria-expanded="${isOpen}">` +
      `${avHtml(oppFlair(latest), n)}<span class="dl-main"><b>${esc(n)}${bot ? `<span class="ms-bot">${esc(T.botTag)}</span>` : ""}</b><small>${esc(sub)}</small></span>` +
      `${rec}<span class="dl-chev" aria-hidden="true">▾</span></div>`;
    let det = "";
    if (isOpen && sel) {
      const so = sel.ko ? null : outcome(sel.mine, sel.theirs), nD = sv ? (isK ? sv.kn : sv.n) || 0 : known.length;
      let vs = "";
      if (nD >= 2) {   // db/189: jullie stand als VS-kop, met de laatste duels als blokjes en een paar cijfers
        vs = `<div class="duel-vs"><span class="side me">${meAv(T, "")}<span><b>${esc(T.you)}</b><small>${esc(T.wonN(a))}</small></span></span>` +
          `<span class="mid"><b>${a}–${b}</b><small>${esc(isK ? T.kosN(nD) : T.duelsN(nD))}</small></span>` +
          `<span class="side op">${avHtml(oppFlair(latest), n)}<span><b>${esc(n)}</b><small>${esc(T.wonN(b))}</small></span></span>` +
          `<span class="duel-cells" aria-hidden="true">${form.slice(-6).map((r) => `<i class="duel-cell ${r === "w" ? "w" : r === "l" ? "l" : "d"}"></i>`).join("")}</span></div>`;
        if (!isK && sv && sv.n) {   // gewone duels: rondes, gemiddeld, grootste zege
          const best = Array.isArray(sv.best) ? sv.best : null, avg = (x) => Math.round((x || 0) / (sv.n * 5));
          vs += `<p class="dl-h2h-sub"><span>${esc(T.stRounds)} <b>${sv.rw || 0}–${sv.rl || 0}</b></span>` +
            `<span>${esc(T.stAvg)} <b>${avg(sv.a)}</b> ${esc(T.stAgainst)} <b>${avg(sv.b)}</b></span>` +
            (best ? `<span>${esc(T.stBest)} <b>${best[0]}–${best[1]}</b></span>` : "") + `</p>`;
        }
        if (isK && known.length) {   // knock-outs: de snelste K.O. (gewonnen, niet opgegeven) en hoe lang ze duren, uit je afgelopen knock-outs
          const wins = known.filter((d) => koRes(d) === "w" && !koQuit(d)).map(koR), avgR = known.reduce((x, d) => x + koR(d), 0) / known.length;
          const one = (x) => (Math.round(x * 10) / 10).toLocaleString(H?.intl || "nl-NL");
          vs += `<p class="dl-h2h-sub">` + (wins.length ? `<span>${esc(T.stFast)} <b>${esc(T.koRnd(Math.min(...wins)))}</b></span>` : "") +
            `<span>${esc(T.stAvg)} <b>${esc(T.koRounds(one(avgR)))}</b></span></p>`;
        }
      }
      const card = sel.ko ? koCardHtml(T, sel, n)
        : `<div class="duel-card"><div class="duel-head"><b>${esc(cap(whenText(T, sel.finished_at)))}, ${esc(clockText(sel.finished_at))}</b>` +
          `<span class="duel-r">${esc(T.total(so.a, so.b))}</span>` +
          `<button type="button" class="dl-endb" data-act="end" data-code="${sel.code}" aria-label="${esc(cap(T.final))}" title="${esc(cap(T.final))}">🏁<span aria-hidden="true">›</span></button></div>` + boardHtml(T, sel, { hint: true }) +
          `<span class="duel-verdict">${esc(verdict(T, so, n))}</span></div>`;
      const pastRes = (d) => { if (d.ko) { const r = koRes(d); return [r, T.koRes(r, koR(d))]; } const o = outcome(d.mine, d.theirs); return [o.res, resText(T, o)]; };
      det = `<div class="dl-detail">${vs}${card}` +
        (known.length > 1 ? `<div class="dl-past">${known.slice(0, 6).map((d) => { const [r, txt] = pastRes(d);
          return `<button type="button" data-sel="${d.code}" data-grp-of="${esc(g.k)}" aria-pressed="${d.code === sel.code}"><span>${esc(cap(whenText(T, d.finished_at)))}</span><span class="dl-res ${r}">${esc(txt)}</span></button>`; }).join("")}</div>` : "") +
        (sel.ko ? `<button type="button" class="dl-mini dl-rev" data-act="korev" data-k="${esc(sel.opp || "")}" data-name="${esc(n)}"${sel.bot ? ` data-bot="${esc(sel.bot)}"` : ""}${themeOf(sel) ? ` data-theme="${esc(sel.theme)}"` : ""}>⚡ ${esc(T.revenge)}</button></div>`
          : `<button type="button" class="dl-mini dl-rev" data-act="rematch" data-code="${sel.code}">${icoHtml()} ${esc(T.revenge)}</button></div>`);
    }
    return `<div class="dl-item${isOpen ? " open" : ""}" data-sel="${(sel || latest).code}">${row}${det}</div>`;
  }

  // ⚡ het kaartje van een afgelopen knock-out (db/215): het levensverloop tekent ko.js (lui geladen, zie fillKo); 🏁› = het eindscherm
  function koCardHtml(T, d, n) {
    const r = koR(d), res = koRes(d);
    const v = koQuit(d) ? (res === "w" ? T.koVQuitW(n) : T.koVQuitL) : res === "w" ? T.koVWin(r) : res === "l" ? T.koVLoss(n, r) : T.koVDraw(r);
    return `<div class="duel-card dl-ko"><div class="duel-head"><b>${esc(cap(whenText(T, d.finished_at)))}, ${esc(clockText(d.finished_at))} · ⚡ ${esc(T.koTag)}${themeOf(d) ? ` · ${themeOf(d).ico} ${esc(themeOf(d).label)}` : ""}</b>` +
      `<span class="duel-r">${esc(T.koRounds(r))}</span>` +
      `<button type="button" class="dl-endb" data-act="koend" data-code="${esc(d.code)}" aria-label="${esc(cap(T.final))}" title="${esc(cap(T.final))}">🏁<span aria-hidden="true">›</span></button></div>` +
      `<div class="dl-ko-life" data-ko-life="${esc(d.code)}"></div><span class="duel-verdict">${esc(v)}</span></div>`;
  }
  // de levenslijnen in de kaartjes van knock-outs: pas als ko.js er is (die laadt alleen wie een knock-out opent)
  function fillKo(root) {
    const els = [...(root?.querySelectorAll?.("[data-ko-life]") || [])];
    if (!els.length || !H?.ko) return;
    H.ko().then((K) => {
      for (const el of els) {
        const d = listKo.find((x) => x.code === el.dataset.koLife);
        if (d && el.isConnected && K?.lifeHtml) el.innerHTML = K.lifeHtml(H, d);
      }
    }).catch(() => {});
  }

  function onListClick(e) {
    const T = tx(H.lang);
    const b = e.target.closest("[data-act], [data-grp], [data-wait], [data-sel][data-grp-of], [data-face]");
    if (!b) return;
    if (b.dataset.face) {   // db/189: een gezichtje (db/239: de pop-up om uit te dagen); loopt er al een duel, dan dat duel
      const t = listTargets.find((x) => x.k === b.dataset.face);
      if (!t) return;
      if (t.k === koOpp()) return koResume();
      if (t.busy) {
        const d = (listItems || []).find((x) => x.code === t.busy);
        if (d && incoming(d)) return showPop(T, popBody(T, d), d);
        if (d && d.status === "active" && (d.mine || []).length < 5) return play(H, d.code);
        if (d && d.status === "active") { openWait.add(d.code); syncCode = d.code; syncList(T); }
        return renderList(T, null);
      }
      return openPick(T, t);   // db/239: de pop-up (vorm, jaren, Daag uit)
    }
    if (b.dataset.grpOf) { selInGrp[b.dataset.grpOf] = b.dataset.sel; renderList(T, null); return; }
    if (b.dataset.wait && !b.dataset.act) {
      const c = b.dataset.wait;
      if (openWait.has(c)) openWait.delete(c); else { openWait.add(c); syncCode = c; syncList(T); }   // openklappen = even vers kijken
      renderList(T, null);
      return;
    }
    if (b.dataset.grp != null && !b.dataset.act) {
      const k = b.dataset.grp, wasOpen = openGrp === k;
      openGrp = wasOpen ? null : k;
      renderList(T, null);
      // Een uitslag die je nog niet zag: de eindstand-pop-up, met de rondes die omdraaien.
      const g = !wasOpen && groupsOf(listItems || []).find((x) => x.k === k);
      const unseen = g && g.ds.find((d) => !d.seen);
      if (unseen) showEndPop(T, unseen, { flip: true });
      return;
    }
    const act = b.dataset.act, code = b.dataset.code;
    if (act === "koend" || act === "korev") {   // db/215: een afgelopen knock-out terugzien (het eindscherm) of revanche (live, ⚡)
      const d = listKo.find((x) => x.code === code);
      if (act === "koend" && d) gc("duel-ko-review", "Duel: knockout result reviewed from Duels");
      if (act === "korev") gc("duel-ko-rev", "Duel: knockout rematch from Duels");
      H?.ko?.().then((K) => (act === "koend" ? d && K.review?.(H, d) : b.dataset.bot ? K.botStart?.(H, b.dataset.bot, true, { theme: b.dataset.theme || null }) : K.invite?.(H, b.dataset.k, b.dataset.name, { rated: ratedOn, theme: b.dataset.theme || null }))).catch(() => {});
      return;
    }
    if (act === "kolive") return koResume();   // ⚡ terug in de knock-out die loopt
    if (act === "bots") { gc("duel-bots", "Duel: bots opened"); return openBots(T); }   // 🤖 db/218
    if (act === "bmode") { if (setBotMode(b.dataset.bmode)) renderList(T, null); return; }   // ⚔️ db/227: ⚡ of ⚔️ op de kaart van de bot (niet spelen)
    if (act === "botgo") {   // 🤖 de bot die klaarstaat, in de gekozen vorm (db/227)
      gc("duel-bot-card", "Duel: ready bot started from Duels");
      return botGo(b.dataset.bot);
    }
    if (act === "sync") { gc("duel-sync", "Duel: Duels logo tapped (refresh)"); return syncList(T, true); }
    if (act === "sfx") return toggleSfx(b);   // ⚔️ Duel-geluid aan/uit (de knop naast de ?)
    if (act === "sent-x") { listTop = ""; return renderList(T, null); }
    if (act === "dr") { gc("duel-rating-open", "Duel: duel rating opened"); return openDr(T); }
    if (act === "pick") return openPick(T, null);   // ⚔️ db/239: "Daag een vriend uit" = de pop-up voor een link
    if (act === "new") return create(H, {});
    if (act === "login") { gc("duel-login-list", "Duel: log in from the Duels screen"); parkLogin(code); return H.openLogin?.(); }   // het login-paneel sluit dit scherm
    if (act === "push") return onBell(b);
    if (act === "accept") return acceptFromList(T, code, b);
    if (act === "decline") {
      gc("duel-decline", "Duel: declined");
      b.disabled = true;
      return call("duel_decline", { p_code: code, p_name: myName() }).then(() => { inviteDrop(code); return openList(H, { keepTop: true }); });
    }
    if (act === "help") { gc("duel-help", "Duel: how it works"); return openHowto(T); }
    if (act === "reload") return openList(H, { keepTop: true });
    if (act === "sec") { const k = b.dataset.sec; shut.has(k) ? shut.delete(k) : shut.add(k); try { localStorage.setItem("jaardle:duelShut", JSON.stringify([...shut])); } catch (e) {} return renderList(T, null); }
    if (act === "more") { showAll = true; return renderList(T, null); }
    if (act === "stand") {   // een kaart onder Jouw stand: die vorm (onthouden); een opengeklapte tegenstander zonder potjes in die vorm gaat dicht
      const m = b.dataset.mode === "k" ? "k" : "b";
      if (standMode(listItems) === m && !standFocus) return;
      standPick = m; standFocus = null; showAll = false;
      try { localStorage.setItem("jaardle:duelStand", m); } catch (e) {}
      if (openGrp && !groupsOf(m === "k" ? listKo : listItems || []).some((x) => x.k === openGrp)) openGrp = null;
      gc(`duel-stand-${m}`, `Duel: ${m === "k" ? "knockout" : "best of 5"} record opened`);
      return renderList(T, null);
    }
    if (act === "play") return play(H, code);
    if (act === "rematch") return create(H, { rematch: code });
    // 🏁› rechts op de kaart: de eindstand-pop-up met Revanche en Deel uitslag, ook op een ander toestel dan waar je speelde. Hij ligt boven het
    // Duels-scherm (modal-duel-end is geen MODAL_PANELS-paneel): wegklikken = terug waar je was. Zonder confetti: die uitslag zag je al.
    if (act === "end") {
      const d = (listItems || []).find((x) => x.code === code);
      if (d && d.status === "done" && !unrevealed(d)) { gc("duel-result-open", "Duel: result opened from the Duels screen"); showEndPop(T, d, { again: true }); }
      return;
    }
    if (act === "copy") return copyLink(T, code, b);
    if (act === "turn") { const d = (listItems || []).find((x) => x.code === code); if (d) share(H, b, { kind: "turn", d }); return; }
    if (act === "resend" || act === "send") {
      if (e.target.closest(".dl-link")) return;   // het linkveld in de kaart: selecteren, niet delen
      gc("duel-resend", "Duel: invite sent again");
      const d = (listItems || []).find((x) => x.code === code) || cache[code];
      const btn = b.matches("button") ? b : b.querySelector('button[data-act="resend"]') || b;   // tik op de kaart: "Gekopieerd!" op de knop, niet over de hele kaart
      if (d) shareText(T, (d.rematch ? T.shRematch : T.shInvite)(d.c_name), LINK(code), btn);
      return;
    }
    if (act === "withdraw") {
      gc("duel-withdraw", "Duel: withdrawn");
      b.disabled = true;
      call("duel_withdraw", { p_code: code }).then((r) => {
        if (r?.ok && listItems) listItems = listItems.filter((x) => x.code !== code);   // meteen weg, niet pas na het verversen
        if (/duel-err/.test(listTop) || listTop.includes(code)) listTop = "";   // een foutmelding ("al 3 open uitnodigingen") of het groene vak van díe link verdwijnt mee
        openList(H, { keepTop: true });
      });
    }
  }
  // Een uitdaging aan jou aannemen vanuit de lijst; zonder naam (geen account) eerst de pop-up met het naamveld.
  async function acceptFromList(T, code, b) {
    const d = (listItems || []).find((x) => x.code === code);
    const name = myName();
    if (!name) return showPop(T, popBody(T, d), d);
    const card = b.closest?.(".dl-card") || b, btn = b.matches?.("button") ? b : card.querySelector?.('button[data-act="accept"]') || b;   // 19/11: de kaart zelf is ook de knop
    if (card.dataset.busy) return;
    card.dataset.busy = "1";
    btn.disabled = true;
    btn.textContent = T.loading;
    const r = await call("duel_accept", { p_code: code, p_name: name });
    if (!r.ok) {
      // db/203: al 3 duels met deze speler: zeg dat, in plaats van stil de lijst te verversen (de uitnodiging blijft 24 uur staan)
      if (/running/.test(r.e)) listTop = `<p class="dl-msg duel-err">${esc(T.errRunning((d && d.c_name) || "?"))}</p>`;
      return openList(H, { keepTop: true });
    }
    inviteDrop(code);
    const dd = keep(r.v);
    remember(dd.code, dd.deadline);
    gc("duel-accept", "Duel: accepted");
    return play(H, dd.code, dd);
  }
  function onListSubmit(e) {
    const f = e.target.closest(".dl-name");
    if (!f) return;
    e.preventDefault();
    const inp = f.querySelector("input"), n = cleanName(inp.value);
    if (!n) { inp.setAttribute("aria-invalid", "true"); inp.focus(); return; }
    saveName(n);
    create(H, { rematch: f.dataset.rematch || null, forK: f.dataset.for || null, forName: f.dataset.forName || null, theme: f.dataset.theme || null });
  }

  // Nieuwe uitdaging of revanche: naam (zonder account één keer vragen), aanmaken, dan meteen delen; de link blijft zichtbaar.
  async function create(host, { rematch = null, forK = null, forName = null, theme = null } = {}) {   // theme: db/202 (een revanche neemt het thema zelf over)
    H = host;
    const bd = rematch && (cache[rematch] || (listItems || []).find((x) => x.code === rematch));
    if (bd && bd.bot) { gc("duel-bot-rematch", "Duel: best of 5 rematch against a bot"); return botDuel(H, bd.bot, bd.theme || null); }   // ⚔️ db/227: een bot wil altijd, meteen (db/239: in dezelfde jaren)
    const T = tx(H.lang);
    if (H.loggedIn) await H.ensureIdentity?.().catch?.(() => {});
    const name = myName();
    if (!name) {
      listTop = `<form class="dl-name"${rematch ? ` data-rematch="${esc(rematch)}"` : ""}${forK ? ` data-for="${esc(forK)}" data-for-name="${esc(forName || "")}"` : ""}${theme && !rematch ? ` data-theme="${esc(theme)}"` : ""}><label for="duel-name-new">${esc(T.nameLabel)}</label>` +
        `<div><input id="duel-name-new" maxlength="20" autocomplete="nickname" placeholder="${esc(T.namePh)}"><button type="submit">${esc(T.go)}</button></div></form>`;
      await openList(H, { keepTop: true });
      document.getElementById("duel-name-new")?.focus();
      return;
    }
    listTop = `<p class="dl-msg">${esc(T.loading)}</p>`;
    const opened = openList(H, { keepTop: true });
    const r = await call("duel_create", { p_name: name, p_rematch: forK ? null : rematch, ...(forK ? { p_for: forK } : {}), ...(theme && !rematch ? { p_theme: theme } : {}),
      ...(H.loggedIn && !ratedOn && !rematch ? { p_rated: false } : {}) });   // ⚔️ db/225: alleen als Rated uit staat; een revanche neemt het zelf over   // p_theme alleen bij een modus (db/202)   // p_for alleen als het moet (oudere server kent hem niet)
    if (!r.ok) {
      // db/201: ook een revanche volgt "één duel tegelijk per tweetal" (running). Daagde de ander jou al uit (incoming:CODE), dan
      // staat die uitdaging hieronder bij Jouw beurt. Ingetrokken uitnodigingen tellen een uur mee voor de grens van 3 (too_many_recent).
      const nm = forName || nameOf(rematch) || "?", inc = /incoming:/.test(r.e);
      listTop = `<p class="dl-msg${inc ? "" : " duel-err"}">${esc(inc ? T.errIncoming(nm) : /too_many_open/.test(r.e) ? T.errMax : /too_many_recent/.test(r.e) ? T.errRecent
        : /running/.test(r.e) ? T.errRunning(nm) : /name/.test(r.e) ? T.errName : T.err)}</p>`;
      await opened;
      renderList(T, null);
      return;
    }
    const d = keep(r.v);
    remember(d.code, d.deadline);
    if (themeOf(d) && !rematch) gc(`duel-theme-${d.theme}`, `Duel: ${themeOf(d).label} challenge created`);
    gc(rematch ? "duel-rematch" : forK ? "duel-create-direct" : "duel-create", rematch ? "Duel: rematch created" : forK ? "Duel: direct challenge created" : "Duel: challenge created");
    // db/189: een directe uitdaging (en een revanche aan iemand met seintjes) gaat zonder link: de ander krijgt een seintje of ziet
    // hem in zijn lijst. De link kan er los bij ("Stuur ook een link").
    if (forK || (rematch && d.opp_push)) {
      const nm = d.for_name || forName || "?";
      listTop = `<div class="dl-sent">${sentX(T)}<b>✓ ${esc(T.challenged(nm))}${thHtml(d)}</b><span>${esc(d.opp_push ? T.pushYes(nm) : T.pushNo(nm))}</span>` +
        `<div class="dl-sent-acts">${bellHtml(T.bellAcc(nm), T.onAcc(nm))}<button type="button" class="dl-mini" data-act="send" data-code="${d.code}">${esc(T.alsoLink)}</button></div></div>`;
      await opened;
      openList(H, { keepTop: true });
      return;
    }
    const how = await shareText(T, (rematch ? T.shRematch : T.shInvite)(d.c_name), LINK(d.code), null);
    gc("duel-invite-" + how, "Duel: invite " + how);   // shared / copied / abort / prompt
    const head = how === "shared" ? T.sent : how === "copied" ? T.copied : T.ready;
    const sub = d.for_name ? T.onlyFor(d.for_name) : T.sentSub;
    const bell = d.for_name ? bellHtml(T.bellAcc(d.for_name), T.onAcc(d.for_name)) : bellHtml(T.bellAccAny, T.onAccAny);
    listTop = `<div class="dl-sent">${sentX(T)}<b>✓ ${esc(head)}${thHtml(d)}</b><span>${esc(sub)}</span>${linkField(T, d.code)}` +
      (how === "shared" || how === "copied" ? "" : `<button type="button" class="dl-mini" data-act="send" data-code="${d.code}">${esc(T.sendLink)}</button>`) +
      (bell ? `<div class="dl-sent-acts">${bell}</div>` : "") + `</div>`;
    await opened;
    openList(H, { keepTop: true });
  }

  // ════ een ?duel=CODE-link ════
  // afterLogin: een afgelopen duel zonder eindstand-pop-up (je tegenstander bij de gezichtjes). resume: bewaarde uitnodiging, alleen als hij nog kan.
  async function openInvite(host, raw, { afterLogin = false, resume = false } = {}) {
    H = host;
    ensureCss();
    const T = tx(H.lang), code = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    // Eerst weten of je ingelogd bent: anders een leeg naamveld ("Neem aan" deed niets) en "J" (van "Jij") in de opening.
    await H.authReady?.();
    if (H.loggedIn) await H.ensureIdentity?.().catch?.(() => {});
    const [r, l] = await Promise.all([call("duel_get", { p_code: code }), H.loggedIn ? call("duel_list", {}) : null]);
    if (l && l.ok) applyList(l.v);   // db/189: jullie stand in de uitnodiging
    if (resume) {
      if (!r.ok) return;   // geen netwerk: volgende keer
      if (!r.v || !incoming(r.v)) return inviteDrop(code);   // al beantwoord, ingetrokken of verlopen: stil weg
      if (document.querySelector(".modal:not([hidden])")) return;
      return showPop(T, popBody(T, r.v), r.v);
    }
    if (!r.ok) return showPop(T, `<p>${esc(T.err)}</p>`, null);
    const d = r.v;
    if (d && incoming(d)) inviteKeep(d); else inviteDrop(code);
    if (d && d.me && (d.status === "active" || d.status === "done")) {
      keep(d); remember(d.code, d.deadline);
      if (d.status === "active" && (d.mine || []).length < 5) return play(H, d.code, d);
      // uitgespeeld, via seintje of link: de eindstand-pop-up boven het Duels-scherm
      return openList(H, { focus: d.code, end: afterLogin ? null : d });
    }
    if (d && !d.me && d.status === "done" && d.spec) {   // db/190
      gc("duel-link-spectate", "Duel: result opened by a spectator");
      const { a, b } = duelSides(d);
      return showPop(T, spectateBody(T, d), d, { cls: " sp rev", style: `--ha:${a.hue};--hb:${b.hue}` });
    }
    const kind = !d ? "notfound" : d.me === "c" ? "own" : d.can_accept ? "open" : d.status === "active" || d.status === "done" ? "taken" : "closed";
    gc("duel-link-" + kind, "Duel: link opened (" + kind + ")");
    showPop(T, popBody(T, d), d);
  }

  function resumeInvite(host) {
    H = host;
    const inv = inviteRec();
    if (!inv || inv.later) return;
    return openInvite(host, inv.c, { resume: true });
  }

  function popBody(T, d) {
    const anyBtn = `<button type="button" class="duel-go" data-act="new">${esc(T.challengeAny)}</button>`;
    if (!d) return `${icoHtml()}<h2>${esc(T.notFound)}</h2>${anyBtn}`;
    const c = d.c_name || "?";
    if (d.me === "c") {
      return `${icoHtml()}<h2>${esc(T.own)}</h2><p>${esc(T.ownSub)}</p>` +
        `<button type="button" class="duel-go" data-act="send" data-code="${d.code}">${esc(T.sendLink)}</button>`;
    }
    if (d.can_accept) {
      const needName = !(H.loggedIn && H.myName && H.myName());
      const [ha, hb] = recB(d.opp || "");
      const chip = ha || hb ? `<p class="duel-h2h">${esc(T.h2hChip)} <b>${ha}–${hb}</b>${formHtml(formB(d.opp || ""))}</p>` : "";   // db/189 (22/11: alleen Best of 5)
      return `${bandHtml(T, c, d.c_flair, { poster: true, tag: T.fiveR })}<h2>${esc((d.rematch ? T.invRematch : T.invTitle)(c))}</h2>${thHtml(d)}${chip}<ul><li>${themeOf(d) ? T.inv1Era : T.inv1}</li><li>${T.inv2}</li><li>${T.inv3}</li></ul>` +
        (needName ? `<label for="duel-name-acc">${esc(T.invName(c))}<input id="duel-name-acc" maxlength="20" autocomplete="nickname" placeholder="${esc(T.namePh)}" value="${esc(storedName() || "")}"></label>` : "") +
        `<button type="button" class="duel-go" data-act="accept" data-code="${d.code}">${esc(T.accept)}</button>` +
        `<button type="button" class="duel-no" data-act="decline" data-code="${d.code}">${esc(T.decline)}</button>` +
        `<p class="duel-fine">${esc(cap(T.invFine(leftText(T, d.deadline))))}</p>` +
        (H.loggedIn ? "" : `<button type="button" class="duel-no duel-login" data-act="login" data-code="${d.code}">${esc(T.login)}</button>`);
    }
    if (d.status === "open" && d.locked && !d.rematch && !H.loggedIn) {   // db/189: een directe uitdaging is voor één account: eerst inloggen
      return `${icoHtml()}<h2>${esc((d.rematch ? T.invRematch : T.invTitle)(c))}</h2><p>${esc(T.lockedLogin)}</p>` +
        `<button type="button" class="duel-go" data-act="login" data-code="${d.code}">${esc(T.loginBtn)}</button>${anyBtn.replace("duel-go", "duel-no")}`;
    }
    if (d.status === "open") return `${icoHtml()}<h2>${esc(d.rematch ? T.notForYou : T.notForYouD)}</h2>${anyBtn}`;
    if (d.status === "active" || d.status === "done") return `${icoHtml()}<h2>${esc(T.taken(d.o_name || "?"))}</h2>${anyBtn}`;
    const again = `<button type="button" class="duel-go" data-act="new">${esc(T.challengeX(c))}</button>`;
    if (d.status === "withdrawn") return `${icoHtml()}<h2>${esc(T.closedWd)}</h2>${again}`;
    if (d.status === "declined") return `${icoHtml()}<h2>${esc(T.closedDecl)}</h2>${anyBtn}`;
    return `${icoHtml()}<h2>${esc(T.closedExp)}</h2>${again}`;
  }

  function showPop(T, inner, d, { cls = "", style = "" } = {}) {
    uncover();
    document.getElementById("modal-duel-pop")?.remove();
    const el = document.createElement("div");
    el.id = "modal-duel-pop";
    el.className = "modal";
    el.hidden = true;
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "duel-pop-title");
    el.innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal-card duel-pop">` +
      `<button type="button" class="modal-close" data-close aria-label="${esc(T.close)}">✕</button><section class="duel-inv${cls}"${style ? ` style="${style}"` : ""}>${inner}</section></div>`;
    el.querySelector("h2")?.setAttribute("id", "duel-pop-title");
    document.body.appendChild(el);
    el.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => {
      const later = d && incoming(d) && readJson(INVITE_KEY, null)?.c === d.code;
      if (later) inviteKeep(d, true);   // ✕ = later beslissen: dan in het Duels-scherm (met stipje), niet meer als pop-up
      H.closeModal("modal-duel-pop");
      if (later) checkNews(H);
    }));
    el.addEventListener("click", (e) => onPopClick(e, d));
    H.openModal("modal-duel-pop");
  }

  async function onPopClick(e, d) {
    const T = tx(H.lang), b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act, code = b.dataset.code;
    if (act === "new" && d?.spec) gc("duel-spectate-challenge", "Duel: spectator challenges someone");
    if (act === "new") { H.closeModal("modal-duel-pop"); return create(H, {}); }
    if (act === "sp-for") {   // db/190: een teamgenoot daagt de winnaar uit (zoals een gezichtje)
      gc("duel-spectate-challenge-direct", "Duel: spectator challenges the winner");
      H.closeModal("modal-duel-pop");
      return create(H, { forK: b.dataset.k, forName: b.dataset.name });
    }
    if (act === "sp-daily") {
      gc("duel-spectate-daily", "Duel: spectator goes to the daily");
      H.closeModal("modal-duel-pop");
      if (H.state?.()?.mode !== "daily") H.switchMode?.("daily");
      return;
    }
    if (act === "send") return shareText(T, (d?.rematch ? T.shRematch : T.shInvite)(d?.c_name || ""), LINK(code), b);
    if (act === "login") {   // na het inloggen (ook na Google) komt deze uitnodiging terug: zie duelsAfterLogin in game.js
      gc("duel-login-invite", "Duel: log in from invite");
      parkLogin(code);
      H.closeModal("modal-duel-pop");
      return H.openLogin?.();
    }
    const inp = document.getElementById("duel-name-acc");
    const name = (inp && cleanName(inp.value)) || myName();
    if (act === "decline") {
      b.disabled = true;
      gc("duel-decline", "Duel: declined");
      await call("duel_decline", { p_code: code, p_name: name || null });
      inviteDrop(code);
      H.closeModal("modal-duel-pop");
      return;
    }
    if (act === "accept") {
      if (!name) { if (inp) { inp.setAttribute("aria-invalid", "true"); inp.focus(); } return; }
      if (inp) saveName(name);
      b.disabled = true;
      b.textContent = T.loading;
      const r = await call("duel_accept", { p_code: code, p_name: name });
      if (!r.ok) {   // al aangenomen, verlopen of geen netwerk: laat zien hoe het er nu voor staat
        const g = await call("duel_get", { p_code: code });
        if (g.ok && !(g.v && incoming(g.v))) inviteDrop(code);
        const box = document.querySelector("#modal-duel-pop .duel-inv");
        // db/203: al 3 duels met deze speler: dat bovenaan, de uitnodiging eronder (die blijft 24 uur staan)
        const full = /running/.test(r.e) && g.ok && g.v ? `<p class="duel-err">${esc(T.errRunning(g.v.c_name || "?"))}</p>` : "";
        if (box) box.innerHTML = g.ok ? full + popBody(T, g.v) : `<p class="duel-err">${esc(T.err)}</p>`;
        return;
      }
      inviteDrop(code);
      const dd = keep(r.v);
      remember(dd.code, dd.deadline);
      gc("duel-accept", "Duel: accepted");
      return play(H, dd.code, dd);
    }
  }

  // Het rode stipje: alleen voor wie duels heeft (game.js roept dit pas aan als jaardle:duels iets bevat).
  // sw.js (db/204): een duel-seintje terwijl je in de app zit, zonder systeemmelding. Duels-scherm open: vers kijken (zoals een tik op het
  // logo; is dat duel net klaar, dan de eindstand). Anders de lijst voor het rode stipje.
  let lastPush = { code: null, t: 0 };
  function pushed(host, code) {
    H = host || H;
    const now = Date.now();
    if (code && code === lastPush.code && now - lastPush.t < 4000) return;   // db/206: Realtime én het sw-seintje over hetzelfde duel
    lastPush = { code: code || null, t: now };
    const m = document.getElementById("modal-duels");
    if (m && !m.hidden) return syncList(tx(H.lang), true, code || null);
    return checkNews(H);
  }

  async function checkNews(host) {
    H = host || H;
    const r = await call("duel_list", {});
    if (r.ok) applyList(await withInvite(r.v));
  }

  return {
    openList, openInvite, resumeInvite, play, sync, roundDone, next, share, checkNews, pushed, pushToggle, waiting, fromEnd, pushOn: (host) => { H = host || H; return pushOn(); },
    listed: () => !!listItems,   // de lijst is er al (checkNews of eerder geopend): de deur schuift er meteen heen, zonder laadscherm (game.js worldGo)
    sfxTest, musTest, musicKick, sndSync: () => document.querySelectorAll(".dl-snd-btn").forEach((b) => sndSet(b)),
    // 🤖 db/232 Bots in de daily: de bot-kaart op het eindscherm (dezelfde kaart, keuze ⚡/⚔️ en bot als in Duels)
    daily: {
      card: (h, b, o) => { H = h; ensureCss(); return botCardHtml(tx(h.lang), b, o); },
      ready: (h, bots) => { H = h; return pickReady(Array.isArray(bots) ? bots : []); },
      mode: (m) => setBotMode(m),
      go: (h, key) => { H = h; return botGo(key); },   // db/239: ook in de gekozen jaren
    },
    // ⚡ Knock-out (/ko.js) bouwt hierop: dezelfde band, gezichtjes, kop en CSS, en het geluid (au: de bus, de bouwstenen, "hit")
    kit: { esc, tx, ensureCss, thHtml, themeOf, bandHtml, dbAv, meFlair, meNameOr, logoHtml, exitHtml, sndHtml, armSnd, flairEmoji, gc, create: (h, o) => create(h, o),
           openList: (h, o) => openList(h, o), setHost: (h) => { H = h; },
           bots: () => listBots, botOptHtml: (T, b, i, o) => botOptHtml(T, b, i, o),   // 🤖 db/218: het K.O.-eindscherm (de volgende bot)
           intro: (h, d, o) => { H = h; return introStart(d, 0, false, o); },   // de opening van een ronde (⚡: bij de start van ronde 1)
           au: { bus: sfxBus, play: sfx, nap: auNap, swish, ring, tick, thud, smp, music },
           drLine: (h, el, code) => { H = h; ensureCss(); return drEndLine(el, code); } },   // ⚔️ db/225: de duelrating op het K.O.-eindscherm
    css: CSS, copy: (l) => tx(l), langs: () => Object.keys(TXT),
    _: { outcome, stand, boardHtml, bandHtml, leftText, groupsOf, popBody, LINK, withInvite, INVITE_KEY, h2hOf, listBody, pickHtml, recOf, applyList, bellHtml, avHtml, showEndPop,
         spectateBody, duelSides, flairEmoji, SFX, INTRO_MS, flairParts, FX_IDS, HUES, drawShare, keepHtml, acctHtml, introLabel, canPeek, peekHtml, PEEK_ID, thHtml, THEMES, dkHtml, openPick, pickFill, setPickTheme, pickTheme: () => pickTheme, PICK_ID, setPickFor: (t) => { pickFor = t; }, onPickClick,
         setGrp: (k) => { openGrp = k; }, setStand: (m) => { standPick = m; standFocus = null; }, standMode, standCardsHtml, dmIco, setHost: (h) => { H = h; }, koCardHtml, fillKo, onListClick, listKo: () => listKo,
         botFaceHtml, botOptHtml, openBots, listBots: () => listBots, readyBot, botCardHtml, onFirst, sndState, toggleSfx, music,
         botModesHtml, setBotMode, botMode: () => botMode, botNextHtml, botLine, standTotals, create, wouldEarn, host: () => H,   // ⚔️ db/227
         drStripHtml, drPopHtml, drSparkHtml, setDr: (v) => { listDr = v; }, ratedOn: () => ratedOn, setRated: (v) => { ratedOn = v; } },   // voor de tests
  };
})();
