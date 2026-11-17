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
   duel-help · duel-login-end · duel-login-list · duel-share-image · duel-link-spectate · duel-spectate-challenge|-direct|-daily · duel-result-open. Trechter: link-open → accept →
   round-1 → round-5; create → invite-shared/copied → (bij de ander) link-open; share-image → (bij een buitenstaander) link-spectate → spectate-challenge.
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
  const LIST_KEY = "jaardle:duels", NEWS_KEY = "jaardle:duel-news", NAME_KEY = "jaardle:duel-name", PENDING_KEY = "jaardle:pendingDuel";
  const INVITE_KEY = "jaardle:duelInvite";   // { c: code, u: einde (ms), later: na ✕ } — een uitnodiging die nog op je antwoord wacht (game.js leest hem ook)
  const CLAIM_KEY = "jaardle:duelclaim";   // van game.js (duelsAfterLogin): voor welke accounts dit toestel zijn duels al overzette
  const LINK = (code) => `https://jaardle.com/?duel=${code}`;
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
/* vijf tegels: groot jouw score, klein die van de ander (stipje in de kleur van de ander) */
.duel-rds { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0.3rem; margin-top: 0.5rem; font-variant-numeric: tabular-nums; }
.duel-rd { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.05rem; padding: 0.3rem 0 0.35rem; border-radius: 8px; background: var(--card); border: 1.5px solid transparent; }
.duel-rd small { font-size: 0.6rem; color: var(--muted); letter-spacing: 0.05em; text-transform: uppercase; }
.duel-rd b { font-size: 1.1rem; font-weight: 800; line-height: 1.15; }
.duel-rd span { display: flex; align-items: center; gap: 0.2rem; font-size: 0.72rem; color: var(--muted); }
.duel-rd span::before { content: ""; width: 0.4rem; height: 0.4rem; border-radius: 50%; background: var(--duel-op); }
.duel-rd.w { background: color-mix(in srgb, var(--duel-win) 26%, var(--card)); }
.duel-rd.l { background: color-mix(in srgb, var(--duel-loss) 18%, var(--card)); }
.duel-rd.l b { color: var(--muted); }
.duel-rd.d { background: color-mix(in srgb, var(--gray) 22%, var(--card)); }
.duel-rd.todo { background: transparent; border: 1.5px dashed color-mix(in srgb, var(--muted) 45%, transparent); }
.duel-rd.todo b { color: var(--muted); font-weight: 600; }
.duel-rd.mine { background: color-mix(in srgb, var(--duel-me) 14%, var(--card)); }
.duel-card .new { animation: duel-pop 0.6s cubic-bezier(0.2, 1.5, 0.4, 1) 0.3s both; }
@keyframes duel-pop { 0% { transform: scale(0.4); opacity: 0; } 60% { transform: scale(1.18); opacity: 1; } 100% { transform: none; } }
/* de onthulling (wie als eerste klaar was, eerste keer openen): per ronde klapt de uitslag om (.fv), daarna stand en oordeel (.after) */
.duel-rd.flip > .fv { position: absolute; inset: -1.5px; display: flex; flex-direction: column; align-items: center; gap: 0.05rem; padding-top: calc(0.3rem + 1.5px);
  box-sizing: border-box; border-radius: inherit; font-style: normal; background: var(--card); animation: duel-flip 0.45s ease-out calc(0.5s + var(--i) * 0.65s) both; }
.duel-rd.flip[data-r="w"] > .fv { background: color-mix(in srgb, var(--duel-win) 26%, var(--card)); }
.duel-rd.flip[data-r="l"] > .fv { background: color-mix(in srgb, var(--duel-loss) 18%, var(--card)); }
.duel-rd.flip[data-r="l"] > .fv b { color: var(--muted); }
.duel-rd.flip[data-r="d"] > .fv { background: color-mix(in srgb, var(--gray) 22%, var(--card)); }
.duel-card .after, .dl .after { animation: duel-in 0.4s ease-out 3.75s both; }
@keyframes duel-flip { 0% { transform: rotateX(90deg); } 100% { transform: none; } }
@keyframes duel-in { 0% { opacity: 0; transform: translateY(0.3rem); } 100% { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .duel-card .new, .duel-rd.flip > .fv, .duel-card .after, .dl .after { animation: none; } }
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
#result-actions #next-btn.duel-btn { order: -1; }   /* Revanche vóór "Deel uitslag" (zoals de mockup) */
/* ⚔️ Duels (⋮-menu) */
.dl { gap: 0.55rem; }
.dl-new { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; width: 100%; }
.dl-name { display: flex; flex-direction: column; gap: 0.4rem; }
.dl-name div { display: flex; gap: 0.4rem; }
.dl-name button { flex: none; padding: 0.55rem 1rem; }
.dl-sent { display: flex; flex-direction: column; align-items: flex-start; gap: 0.15rem; padding: 0.6rem 0.75rem; background: color-mix(in srgb, var(--green) 10%, var(--card-soft));
  border: 1px solid color-mix(in srgb, var(--green) 35%, var(--border)); border-radius: 10px; font-size: 0.85rem; line-height: 1.35; }
.dl-sent b { color: var(--green-text); }
.dl-sent .dl-mini { margin-top: 0.3rem; }
.dl-empty, .dl-msg { margin: 0; color: var(--muted); font-size: 0.85rem; line-height: 1.4; }
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
.dl-help-btn[aria-expanded="true"] { color: var(--fg); border-color: var(--duel-arena); }
.dl-help-btn:hover { filter: none; color: var(--fg); }
.modal-header .dl-help-btn + .modal-close { margin-left: 0.35rem; }

/* de uitleg: drie stappen (in de lege staat altijd, daarna achter "Hoe werkt het?") */
.dl-steps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; counter-reset: dl; }
.dl-steps li { display: grid; grid-template-columns: 1.7rem 1fr; gap: 0.65rem; align-items: start; font-size: 0.88rem; line-height: 1.35; color: var(--fg); text-align: left; }
.dl-steps li::before { counter-increment: dl; content: counter(dl); display: grid; place-items: center; width: 1.7rem; height: 1.7rem; border-radius: 50%;
  font-weight: 800; font-size: 0.85rem; color: var(--duel-arena-on); background: var(--duel-arena); }
.dl-steps li small { display: block; margin-top: 0.1rem; font-size: 0.76rem; color: var(--muted); }
.dl-help { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.8rem 0.85rem; background: var(--card-soft); border: 1px solid var(--border); border-radius: 12px; }
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

/* je stand over alle duels */
.dl-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.4rem; }
.dl-stat { display: flex; flex-direction: column; align-items: center; padding: 0.45rem 0.2rem 0.4rem; background: var(--card-soft); border-radius: 10px; }
.dl-stat b { font-size: 1.3rem; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.1; }
.dl-stat small { font-size: 0.66rem; color: var(--muted); letter-spacing: 0.05em; text-transform: uppercase; }
.dl-stat.w b { color: var(--green-text); }
.dl-stat.l b { color: var(--duel-loss); }

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
.duel-exit { justify-self: start; appearance: none; display: inline-flex; align-items: center; gap: 0.3rem; min-height: 2.75rem; padding: 0.2rem 0.85rem 0.2rem 0.6rem;
  font: inherit; font-size: 0.85rem; font-weight: 600; color: var(--fg); background: var(--card); border: 1px solid var(--border); border-radius: 999px; cursor: pointer; }
.duel-exit:hover { filter: none; border-color: var(--duel-arena); }
.duel-title { font-size: 1rem; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; color: var(--duel-arena); white-space: nowrap; }
.duel-round { justify-self: end; font-size: 0.8rem; font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; white-space: nowrap; }

/* eindstand-pop-up: na je vijfde ronde (ook als de ander nog moet), en bij een uitslag die je nog niet zag (dan draaien de rondes om) */
.ep { max-width: 23rem; }
.ep .ep-body { margin: 0; padding: 1.25rem 1rem 1rem; display: flex; flex-direction: column; gap: 0.6rem; text-align: center; background: transparent; border: 0; }
.ep .ep-eyebrow { margin: 0; font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--duel-arena); }
.ep h2 { margin: 0; font-size: 1.35rem; line-height: 1.2; text-wrap: balance; }
.ep .duel-vs { margin: 0; text-align: left; }
.ep .duel-rds { margin-top: 0; }
.ep-note { margin: 0; font-size: 0.8rem; color: var(--muted); }
.ep-note b { color: var(--fg); }
.ep-btns { display: flex; flex-direction: column; gap: 0.45rem; margin-top: 0.2rem; }
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
/* je stand tegen wie je koos, net boven de knop */
.dl-vsline { display: flex; align-items: center; gap: 0.5rem; min-height: 2.4rem; box-sizing: border-box; padding: 0.35rem 0.7rem; font-size: 0.8rem; color: var(--muted);
  background: var(--card-soft); border-radius: 10px; }
.dl-vsline b { color: var(--fg); font-variant-numeric: tabular-nums; }
.dl-vsline .dl-form { margin-left: auto; }
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
`;

  const TXT = {
    nl: {
      help: "Hoe werkt het?", st1: "Stuur een link naar een vriend", st1s: "Wie hem als eerste aanneemt, speelt tegen je.", st2: "Jullie spelen dezelfde 5 rondes", st2s: "Van makkelijk naar moeilijk, allebei wanneer je wilt binnen 24 uur.", st3: "Per ronde wint de hoogste score", st3s: "Wie de meeste rondes wint, wint het duel. Telt niet mee voor je rating.", heroTitle: "Daag een vriend uit voor een duel", statW: "Gewonnen", statL: "Verloren", statO: "Lopend", copy: "Kopieer", linkAria: "Je duellink", yourRounds: "Jouw rondes", waitDetail: (n, k) => `${n} speelde ${k} van de 5. De rest zie je zodra ${n} verder speelt.`, exit: "Jaardle", duelTitle: "Duel", roundN: (r) => `Ronde ${r}/5`, you: "Jij", played5: (k) => `${k}/5 gespeeld`, busy: "nog bezig", final: "eindstand", login: "Al een account? Log in", keepTitle: "Bewaar je duels op al je toestellen", keepBtn: "Maak een account", h2hNow: (a, b) => `jullie nu ${a}–${b}`,
      title: "Duels", close: "Sluiten", newBtn: "Daag een vriend uit", nameLabel: "Je naam (die ziet je tegenstander)", namePh: "Naam", go: "Daag uit",
      ready: "Je uitdaging staat klaar", sent: "Link verstuurd", copied: "Link gekopieerd", sentSub: "Wie hem als eerste aanneemt, speelt tegen je.", onlyFor: (n) => `Alleen ${n} kan hem aannemen.`,  sendLink: "Stuur de link",
      copyPrompt: "Kopieer de link:", empty: "Nog geen duels. Daag iemand uit: jullie spelen dezelfde 5 rondes en per ronde wint de hoogste score.",
      loading: "Even laden…", err: "Dat lukte niet. Probeer het nog eens.", retry: "Opnieuw",
      errMax: "Je hebt al 3 uitnodigingen openstaan. Wacht tot iemand aanneemt of trek er een in.", errName: "Vul eerst je naam in.",
      secTurn: "Jouw beurt", secWait: "Wacht", secDone: "Stand per tegenstander",
      left: (h, m) => (h >= 1 ? `nog ${h} u` : `nog ${m} min`),
      accepted: (n) => `${n} nam aan`, oppDone: (n) => `${n} is klaar`, oppPlays: (n, k) => `${n} speelt · ${k}/5`, oppNotYet: (n) => `${n} begon nog niet`,
      yourLink: "Je link", linkLeft: (l) => `${l} om aan te nemen`, resend: "Stuur opnieuw", withdraw: "Intrekken", play: "Speel",
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
      pickH: "Daag iemand uit", faceNew: "nieuw", faceRun: "loopt", vsLine: (n) => `Jij tegen ${n}:`, linkInstead: "Liever een link sturen",
      challenged: (n) => `${n} is uitgedaagd`, pushYes: (n) => `${n} krijgt meteen een seintje. Nog 24 uur om aan te nemen.`, pushNo: (n) => `${n} ziet hem bij het openen van Jaardle. Nog 24 uur om aan te nemen.`,
      alsoLink: "Stuur ook een link", sendLinkShort: "Stuur link", invited: "Uitgedaagd", acceptShort: "Neem aan", errRunning: (n) => `Er loopt al een duel met ${n}.`,
      bellAcc: (n) => `Seintje als ${n} begint`, bellAccAny: "Seintje als iemand begint", bellDone: (n) => `Seintje als ${n} klaar is`,
      onAcc: (n) => `Je krijgt een seintje als ${n} begint`, onAccAny: "Je krijgt een seintje als iemand begint", onDone: (n) => `Je krijgt een seintje als ${n} klaar is`,
      pushThem: (n) => `${n} krijgt een seintje dat jij klaar bent`, pushDenied: "Meldingen staan uit voor deze site. Zet ze aan in je browser.",
      h2hChip: "Jullie stand", duelsN: (n) => (n === 1 ? "1 duel" : `${n} duels`), wonN: (n) => `${n} gewonnen`,
      stRounds: "Rondes", stAvg: "Gemiddeld", stAgainst: "tegen", stBest: "Grootste zege",
      // db/190: uitslag delen als plaatje, en de pop-up voor wie de link opent zonder mee te spelen
      imgBrand: "JAARDLE-DUEL", imgTotal: (a, b) => `Totaal ${a} – ${b}`, imgTag: "Raad het jaar bij een gebeurtenis", onTotal: "op totaal",
      spEyebrow: "Jaardle-duel", spWin: (a, b, w, l) => `${a} wint ${w}–${l} van ${b}`, spWinTotal: (a, b) => `${a} wint op totaal van ${b}`, spTie: (a, b) => `Gelijkspel tussen ${a} en ${b}`,
      spHow: "Allebei dezelfde 5 puzzels, van makkelijk naar moeilijk. Per ronde wint de hoogste score.", spDaily: "Speel de daily van vandaag",
      spNew: "Nieuw hier? In Jaardle raad je elke dag het jaar bij een gebeurtenis.", spMate: (n) => `Jij tegen ${n}`, spOther: "Daag iemand anders uit",
      notForYouD: "Deze uitdaging is voor iemand anders", lockedLogin: "Log in met je account om hem aan te nemen.", loginBtn: "Log in",
      // account-momenten (db/193): bij de uitslag wat je er met deze tegenstander aan hebt, en één regel in het Duels-scherm
      keepVs: (n) => `Met een account daag je ${n} uit zonder link`, keepList: "<u>Log in</u>, dan staan je tegenstanders hier en daag je ze uit met één tik",
    },
    en: {
      help: "How does it work?", st1: "Send a link to a friend", st1s: "Whoever accepts it first plays against you.", st2: "You both play the same 5 rounds", st2s: "From easy to hard, each whenever you like within 24 hours.", st3: "The highest score wins each round", st3s: "Whoever wins the most rounds wins the duel. Doesn't count toward your rating.", heroTitle: "Challenge a friend to a duel", statW: "Won", statL: "Lost", statO: "Running", copy: "Copy", linkAria: "Your duel link", yourRounds: "Your rounds", waitDetail: (n, k) => `${n} has played ${k} of 5. You'll see the rest as ${n} plays on.`, exit: "Jaardle", duelTitle: "Duel", roundN: (r) => `Round ${r}/5`, you: "You", played5: (k) => `${k}/5 played`, busy: "in progress", final: "final score", login: "Already have an account? Log in", keepTitle: "Keep your duels on all your devices", keepBtn: "Create an account", h2hNow: (a, b) => `${a}–${b} overall now`,
      title: "Duels", close: "Close", newBtn: "Challenge a friend", nameLabel: "Your name (your opponent sees it)", namePh: "Name", go: "Challenge",
      ready: "Your challenge is ready", sent: "Link sent", copied: "Link copied", sentSub: "Whoever accepts it first plays against you.", onlyFor: (n) => `Only ${n} can accept it.`,  sendLink: "Send the link",
      copyPrompt: "Copy the link:", empty: "No duels yet. Challenge someone: you both play the same 5 rounds and the highest score wins each round.",
      loading: "Loading…", err: "That didn't work. Please try again.", retry: "Retry",
      errMax: "You already have 3 open invitations. Wait for someone to accept, or withdraw one.", errName: "Fill in your name first.",
      secTurn: "Your turn", secWait: "Waiting", secDone: "Head-to-head",
      left: (h, m) => (h >= 1 ? `${h} h left` : `${m} min left`),
      accepted: (n) => `${n} accepted`, oppDone: (n) => `${n} is done`, oppPlays: (n, k) => `${n} is playing · ${k}/5`, oppNotYet: (n) => `${n} hasn't started`,
      yourLink: "Your link", linkLeft: (l) => `${l} to accept`, resend: "Send again", withdraw: "Withdraw", play: "Play",
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
      pickH: "Challenge someone", faceNew: "new", faceRun: "live", vsLine: (n) => `You vs ${n}:`, linkInstead: "Send a link instead",
      challenged: (n) => `You challenged ${n}`, pushYes: (n) => `${n} gets a notification right away. 24 hours to accept.`, pushNo: (n) => `${n} will see it when opening Jaardle. 24 hours to accept.`,
      alsoLink: "Also send a link", sendLinkShort: "Send link", invited: "Challenged", acceptShort: "Accept", errRunning: (n) => `You already have a duel with ${n}.`,
      bellAcc: (n) => `Notify me when ${n} starts`, bellAccAny: "Notify me when someone starts", bellDone: (n) => `Notify me when ${n} is done`,
      onAcc: (n) => `You'll get a notification when ${n} starts`, onAccAny: "You'll get a notification when someone starts", onDone: (n) => `You'll get a notification when ${n} is done`,
      pushThem: (n) => `${n} gets a notification that you're done`, pushDenied: "Notifications are blocked for this site. Allow them in your browser.",
      h2hChip: "Your record", duelsN: (n) => (n === 1 ? "1 duel" : `${n} duels`), wonN: (n) => `${n} won`,
      stRounds: "Rounds", stAvg: "Average", stAgainst: "vs", stBest: "Biggest win",
      imgBrand: "JAARDLE DUEL", imgTotal: (a, b) => `Total ${a} – ${b}`, imgTag: "Guess the year of the event", onTotal: "on points",
      spEyebrow: "Jaardle duel", spWin: (a, b, w, l) => `${a} beats ${b} ${w}–${l}`, spWinTotal: (a, b) => `${a} beats ${b} on points`, spTie: (a, b) => `${a} and ${b} tied`,
      spHow: "Both played the same 5 puzzles, from easy to hard. The highest score wins each round.", spDaily: "Play today's daily",
      spNew: "New here? In Jaardle you guess the year of an event, every day.", spMate: (n) => `You vs ${n}`, spOther: "Challenge someone else",
      notForYouD: "This challenge is for someone else", lockedLogin: "Log in to your account to accept it.", loginBtn: "Log in",
      // account-momenten (db/193): bij de uitslag wat je er met deze tegenstander aan hebt, en één regel in het Duels-scherm
      keepVs: (n) => `With an account, you can challenge ${n} without a link`, keepList: "<u>Log in</u> and your opponents appear here: challenge them with one tap",
    },
    de: {
      help: "Wie funktioniert das?", st1: "Schick einen Link an jemanden", st1s: "Wer ihn zuerst annimmt, spielt gegen dich.", st2: "Ihr spielt dieselben 5 Runden", st2s: "Von leicht bis schwer, wann ihr wollt, innerhalb von 24 Stunden.", st3: "Pro Runde gewinnt die höchste Punktzahl", st3s: "Wer die meisten Runden gewinnt, gewinnt das Duell. Zählt nicht für dein Rating.", heroTitle: "Fordere jemanden zum Duell heraus", statW: "Gewonnen", statL: "Verloren", statO: "Laufend", copy: "Kopieren", linkAria: "Dein Duell-Link", yourRounds: "Deine Runden", waitDetail: (n, k) => `${n} hat ${k} von 5 gespielt. Den Rest siehst du, sobald ${n} weiterspielt.`, exit: "Jaardle", duelTitle: "Duell", roundN: (r) => `Runde ${r}/5`, you: "Du", played5: (k) => `${k}/5 gespielt`, busy: "läuft noch", final: "Endstand", login: "Schon ein Konto? Anmelden", keepTitle: "Behalte deine Duelle auf all deinen Geräten", keepBtn: "Konto erstellen", h2hNow: (a, b) => `jetzt insgesamt ${a}–${b}`,
      title: "Duelle", close: "Schließen", newBtn: "Fordere jemanden heraus", nameLabel: "Dein Name (sieht dein Gegenüber)", namePh: "Name", go: "Herausfordern",
      ready: "Deine Herausforderung ist bereit", sent: "Link verschickt", copied: "Link kopiert", sentSub: "Wer ihn zuerst annimmt, spielt gegen dich.", onlyFor: (n) => `Nur ${n} kann sie annehmen.`,  sendLink: "Link senden",
      copyPrompt: "Kopiere den Link:", empty: "Noch keine Duelle. Fordere jemanden heraus: Ihr spielt dieselben 5 Runden, und pro Runde gewinnt die höchste Punktzahl.",
      loading: "Lädt…", err: "Das hat nicht geklappt. Versuch es noch einmal.", retry: "Nochmal",
      errMax: "Du hast schon 3 offene Einladungen. Warte, bis jemand annimmt, oder zieh eine zurück.", errName: "Gib zuerst deinen Namen ein.",
      secTurn: "Du bist dran", secWait: "Wartet", secDone: "Stand pro Gegner",
      left: (h, m) => (h >= 1 ? `noch ${h} Std.` : `noch ${m} Min.`),
      accepted: (n) => `${n} hat angenommen`, oppDone: (n) => `${n} ist fertig`, oppPlays: (n, k) => `${n} spielt · ${k}/5`, oppNotYet: (n) => `${n} hat noch nicht angefangen`,
      yourLink: "Dein Link", linkLeft: (l) => `${l} zum Annehmen`, resend: "Nochmal senden", withdraw: "Zurückziehen", play: "Spielen",
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
      pickH: "Fordere jemanden heraus", faceNew: "neu", faceRun: "läuft", vsLine: (n) => `Du gegen ${n}:`, linkInstead: "Lieber einen Link schicken",
      challenged: (n) => `${n} ist herausgefordert`, pushYes: (n) => `${n} bekommt sofort eine Benachrichtigung. 24 Stunden zum Annehmen.`, pushNo: (n) => `${n} sieht sie beim Öffnen von Jaardle. 24 Stunden zum Annehmen.`,
      alsoLink: "Auch einen Link schicken", sendLinkShort: "Link schicken", invited: "Herausgefordert", acceptShort: "Annehmen", errRunning: (n) => `Du hast schon ein Duell mit ${n}.`,
      bellAcc: (n) => `Benachrichtigen, wenn ${n} anfängt`, bellAccAny: "Benachrichtigen, wenn jemand anfängt", bellDone: (n) => `Benachrichtigen, wenn ${n} fertig ist`,
      onAcc: (n) => `Du bekommst eine Benachrichtigung, wenn ${n} anfängt`, onAccAny: "Du bekommst eine Benachrichtigung, wenn jemand anfängt", onDone: (n) => `Du bekommst eine Benachrichtigung, wenn ${n} fertig ist`,
      pushThem: (n) => `${n} bekommt eine Benachrichtigung, dass du fertig bist`, pushDenied: "Benachrichtigungen sind für diese Seite blockiert. Erlaube sie im Browser.",
      h2hChip: "Euer Stand", duelsN: (n) => (n === 1 ? "1 Duell" : `${n} Duelle`), wonN: (n) => `${n} gewonnen`,
      stRounds: "Runden", stAvg: "Schnitt", stAgainst: "gegen", stBest: "Höchster Sieg",
      imgBrand: "JAARDLE-DUELL", imgTotal: (a, b) => `Gesamt ${a} – ${b}`, imgTag: "Errate das Jahr des Ereignisses", onTotal: "nach Punkten",
      spEyebrow: "Jaardle-Duell", spWin: (a, b, w, l) => `${a} schlägt ${b} ${w}–${l}`, spWinTotal: (a, b) => `${a} schlägt ${b} nach Punkten`, spTie: (a, b) => `Unentschieden zwischen ${a} und ${b}`,
      spHow: "Beide spielten dieselben 5 Rätsel, von leicht bis schwer. Pro Runde gewinnt die höhere Punktzahl.", spDaily: "Das heutige Rätsel spielen",
      spNew: "Neu hier? Bei Jaardle errätst du jeden Tag das Jahr eines Ereignisses.", spMate: (n) => `Du gegen ${n}`, spOther: "Fordere jemand anderen heraus",
      notForYouD: "Diese Herausforderung ist für jemand anderen", lockedLogin: "Melde dich an, um sie anzunehmen.", loginBtn: "Anmelden",
      // account-momenten (db/193): bij de uitslag wat je er met deze tegenstander aan hebt, en één regel in het Duels-scherm
      keepVs: (n) => `Mit einem Konto forderst du ${n} ohne Link heraus`, keepList: "<u>Melde dich an</u>, dann forderst du deine Gegner hier mit einem Tipp heraus",
    },
    es: {
      help: "¿Cómo funciona?", st1: "Envía un enlace a un amigo", st1s: "Quien lo acepte primero juega contra ti.", st2: "Jugáis las mismas 5 rondas", st2s: "De fácil a difícil, cada uno cuando quiera en 24 horas.", st3: "En cada ronda gana la puntuación más alta", st3s: "Quien gane más rondas gana el duelo. No cuenta para tu rating.", heroTitle: "Reta a un amigo a un duelo", statW: "Ganados", statL: "Perdidos", statO: "En curso", copy: "Copiar", linkAria: "Tu enlace de duelo", yourRounds: "Tus rondas", waitDetail: (n, k) => `${n} ha jugado ${k} de 5. Verás el resto cuando siga jugando.`, exit: "Jaardle", duelTitle: "Duelo", roundN: (r) => `Ronda ${r}/5`, you: "Tú", played5: (k) => `${k}/5 jugadas`, busy: "en curso", final: "resultado final", login: "¿Ya tienes cuenta? Inicia sesión", keepTitle: "Guarda tus duelos en todos tus dispositivos", keepBtn: "Crear una cuenta", h2hNow: (a, b) => `ahora en total ${a}–${b}`,
      title: "Duelos", close: "Cerrar", newBtn: "Reta a un amigo", nameLabel: "Tu nombre (lo verá tu rival)", namePh: "Nombre", go: "Retar",
      ready: "Tu reto está listo", sent: "Enlace enviado", copied: "Enlace copiado", sentSub: "Quien lo acepte primero juega contra ti.", onlyFor: (n) => `Solo ${n} puede aceptarlo.`,  sendLink: "Enviar el enlace",
      copyPrompt: "Copia el enlace:", empty: "Aún no hay duelos. Reta a alguien: jugáis las mismas 5 rondas y en cada ronda gana la puntuación más alta.",
      loading: "Cargando…", err: "No ha funcionado. Inténtalo de nuevo.", retry: "Reintentar",
      errMax: "Ya tienes 3 invitaciones abiertas. Espera a que alguien acepte o retira una.", errName: "Escribe primero tu nombre.",
      secTurn: "Tu turno", secWait: "En espera", secDone: "Marcador por rival",
      left: (h, m) => (h >= 1 ? `quedan ${h} h` : `quedan ${m} min`),
      accepted: (n) => `${n} aceptó`, oppDone: (n) => `${n} ha terminado`, oppPlays: (n, k) => `${n} está jugando · ${k}/5`, oppNotYet: (n) => `${n} aún no ha empezado`,
      yourLink: "Tu enlace", linkLeft: (l) => `${l} para aceptar`, resend: "Reenviar", withdraw: "Retirar", play: "Jugar",
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
      pickH: "Reta a alguien", faceNew: "nuevo", faceRun: "en curso", vsLine: (n) => `Tú contra ${n}:`, linkInstead: "Mejor enviar un enlace",
      challenged: (n) => `Has retado a ${n}`, pushYes: (n) => `${n} recibe un aviso ahora mismo. 24 horas para aceptar.`, pushNo: (n) => `${n} lo verá al abrir Jaardle. 24 horas para aceptar.`,
      alsoLink: "Enviar también un enlace", sendLinkShort: "Enviar enlace", invited: "Retado", acceptShort: "Aceptar", errRunning: (n) => `Ya tienes un duelo con ${n}.`,
      bellAcc: (n) => `Avísame cuando ${n} empiece`, bellAccAny: "Avísame cuando alguien empiece", bellDone: (n) => `Avísame cuando ${n} termine`,
      onAcc: (n) => `Te avisaremos cuando ${n} empiece`, onAccAny: "Te avisaremos cuando alguien empiece", onDone: (n) => `Te avisaremos cuando ${n} termine`,
      pushThem: (n) => `${n} recibe un aviso de que has terminado`, pushDenied: "Las notificaciones están bloqueadas para este sitio. Permítelas en el navegador.",
      h2hChip: "Marcador", duelsN: (n) => (n === 1 ? "1 duelo" : `${n} duelos`), wonN: (n) => `${n} ganados`,
      stRounds: "Rondas", stAvg: "Media", stAgainst: "contra", stBest: "Mayor victoria",
      imgBrand: "DUELO JAARDLE", imgTotal: (a, b) => `Total ${a} – ${b}`, imgTag: "Adivina el año del acontecimiento", onTotal: "por puntos",
      spEyebrow: "Duelo de Jaardle", spWin: (a, b, w, l) => `${a} gana ${w}–${l} a ${b}`, spWinTotal: (a, b) => `${a} gana a ${b} por puntos`, spTie: (a, b) => `Empate entre ${a} y ${b}`,
      spHow: "Los dos jugaron los mismos 5 puzles, de fácil a difícil. En cada ronda gana la puntuación más alta.", spDaily: "Jugar el Diario de hoy",
      spNew: "¿Nuevo aquí? En Jaardle adivinas cada día el año de un acontecimiento.", spMate: (n) => `Tú contra ${n}`, spOther: "Reta a otra persona",
      notForYouD: "Este reto es para otra persona", lockedLogin: "Inicia sesión para aceptarlo.", loginBtn: "Iniciar sesión",
      // account-momenten (db/193): bij de uitslag wat je er met deze tegenstander aan hebt, en één regel in het Duels-scherm
      keepVs: (n) => `Con una cuenta retas a ${n} sin enlace`, keepList: "<u>Inicia sesión</u> y tus rivales aparecerán aquí: rétalos con un toque",
    },
    pt: {
      help: "Como funciona?", st1: "Envie um link para um amigo", st1s: "Quem aceitar primeiro joga contra você.", st2: "Vocês jogam as mesmas 5 rodadas", st2s: "Da mais fácil à mais difícil, cada um quando quiser em até 24 horas.", st3: "Em cada rodada vence a maior pontuação", st3s: "Quem vencer mais rodadas vence o duelo. Não conta para o seu rating.", heroTitle: "Desafie um amigo para um duelo", statW: "Vitórias", statL: "Derrotas", statO: "Em andamento", copy: "Copiar", linkAria: "Seu link de duelo", yourRounds: "Suas rodadas", waitDetail: (n, k) => `${n} jogou ${k} de 5. Você verá o resto quando continuar jogando.`, exit: "Jaardle", duelTitle: "Duelo", roundN: (r) => `Rodada ${r}/5`, you: "Você", played5: (k) => `${k}/5 jogadas`, busy: "em andamento", final: "placar final", login: "Já tem conta? Entrar", keepTitle: "Guarde seus duelos em todos os seus aparelhos", keepBtn: "Criar uma conta", h2hNow: (a, b) => `agora no total ${a}–${b}`,
      title: "Duelos", close: "Fechar", newBtn: "Desafie um amigo", nameLabel: "Seu nome (seu adversário vai ver)", namePh: "Nome", go: "Desafiar",
      ready: "Seu desafio está pronto", sent: "Link enviado", copied: "Link copiado", sentSub: "Quem aceitar primeiro joga contra você.", onlyFor: (n) => `Só ${n} pode aceitar.`,  sendLink: "Enviar o link",
      copyPrompt: "Copie o link:", empty: "Ainda não há duelos. Desafie alguém: vocês jogam as mesmas 5 rodadas e em cada rodada vence a maior pontuação.",
      loading: "Carregando…", err: "Não deu certo. Tente de novo.", retry: "Tentar de novo",
      errMax: "Você já tem 3 convites em aberto. Espere alguém aceitar ou retire um.", errName: "Preencha seu nome primeiro.",
      secTurn: "Sua vez", secWait: "Aguardando", secDone: "Placar por adversário",
      left: (h, m) => (h >= 1 ? `faltam ${h} h` : `faltam ${m} min`),
      accepted: (n) => `${n} aceitou`, oppDone: (n) => `${n} terminou`, oppPlays: (n, k) => `${n} está jogando · ${k}/5`, oppNotYet: (n) => `${n} ainda não começou`,
      yourLink: "Seu link", linkLeft: (l) => `${l} para aceitar`, resend: "Enviar de novo", withdraw: "Retirar", play: "Jogar",
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
      pickH: "Desafie alguém", faceNew: "novo", faceRun: "em curso", vsLine: (n) => `Você contra ${n}:`, linkInstead: "Prefiro enviar um link",
      challenged: (n) => `Você desafiou ${n}`, pushYes: (n) => `${n} recebe um aviso agora mesmo. 24 horas para aceitar.`, pushNo: (n) => `${n} verá ao abrir o Jaardle. 24 horas para aceitar.`,
      alsoLink: "Enviar também um link", sendLinkShort: "Enviar link", invited: "Desafiado", acceptShort: "Aceitar", errRunning: (n) => `Você já tem um duelo com ${n}.`,
      bellAcc: (n) => `Avise-me quando ${n} começar`, bellAccAny: "Avise-me quando alguém começar", bellDone: (n) => `Avise-me quando ${n} terminar`,
      onAcc: (n) => `Você receberá um aviso quando ${n} começar`, onAccAny: "Você receberá um aviso quando alguém começar", onDone: (n) => `Você receberá um aviso quando ${n} terminar`,
      pushThem: (n) => `${n} recebe um aviso de que você terminou`, pushDenied: "As notificações estão bloqueadas para este site. Permita-as no navegador.",
      h2hChip: "Placar", duelsN: (n) => (n === 1 ? "1 duelo" : `${n} duelos`), wonN: (n) => `${n} vitórias`,
      stRounds: "Rodadas", stAvg: "Média", stAgainst: "contra", stBest: "Maior vitória",
      imgBrand: "DUELO JAARDLE", imgTotal: (a, b) => `Total ${a} – ${b}`, imgTag: "Adivinhe o ano do acontecimento", onTotal: "nos pontos",
      spEyebrow: "Duelo de Jaardle", spWin: (a, b, w, l) => `${a} vence ${b} por ${w}–${l}`, spWinTotal: (a, b) => `${a} vence ${b} nos pontos`, spTie: (a, b) => `Empate entre ${a} e ${b}`,
      spHow: "Os dois jogaram os mesmos 5 desafios, do fácil ao difícil. Em cada rodada vence a maior pontuação.", spDaily: "Jogar o Diário de hoje",
      spNew: "Novo por aqui? No Jaardle você adivinha todo dia o ano de um acontecimento.", spMate: (n) => `Você contra ${n}`, spOther: "Desafie outra pessoa",
      notForYouD: "Este desafio é para outra pessoa", lockedLogin: "Entre na sua conta para aceitar.", loginBtn: "Entrar",
      // account-momenten (db/193): bij de uitslag wat je er met deze tegenstander aan hebt, en één regel in het Duels-scherm
      keepVs: (n) => `Com uma conta, você desafia ${n} sem link`, keepList: "<u>Entre</u> e seus adversários aparecem aqui: desafie com um toque",
    },
  };
  const tx = (l) => TXT[l] || TXT.en;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
  const sum = (a) => (a || []).reduce((x, y) => x + (y || 0), 0);
  const icoHtml = (ch = ICON) => `<span class="duel-ico" aria-hidden="true">${ch}</span>`;
  const oppName = (d) => ((d && (d.me === "c" ? d.o_name : d.c_name)) || "?");
  const oppFlair = (d) => (d && (d.me === "c" ? d.o_flair : d.c_flair)) || null;
  const initial = (n) => ((n || "?").trim().charAt(0) || "?").toUpperCase();
  // Meetpunten (GoatCounter, site jaardle-events via gcCount in game.js): de duel-trechter, zie de lijst in de kop van dit bestand.
  const gc = (path, title) => { try { H?.gc?.(path, title); } catch (e) {} };

  let H = null;            // host van de laatste aanroep (game.js)
  const cache = {};        // code → laatste antwoord van de server (met de puzzels, als we die kregen)
  let endNext = null, endShare = null;   // wat de knoppen op het eindscherm (en in de eindstand-pop-up) doen
  let listItems = null, listTop = "", openGrp = null, showAll = false, helpOpen = false;
  let listTargets = [], listH2h = {}, pickSel = null;   // db/189: wie je direct kunt uitdagen, je stand per tegenstander (alle duels), het gekozen gezichtje
  const selInGrp = {}, openWait = new Set();

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
  // Een uitslag die je nog niet zag (seen: false van de server): de lijst verklapt hem nergens, dat doet de onthulling.
  const unrevealed = (d) => d.status === "done" && d.seen === false;
  // Je stand tegen één tegenstander over alle afgelopen duels (in de lijst van de server: 90 dagen, max 100), zonder ongeziene uitslagen.
  function h2hOf(items, k) {
    let a = 0, b = 0;
    for (const d of items || []) {
      if (d.status !== "done" || unrevealed(d) || (d.opp || oppName(d)) !== k) continue;
      const o = outcome(d.mine, d.theirs);
      if (o.res === "w") a++; else if (o.res === "l") b++;
    }
    return [a, b];
  }

  // db/189: de stand van de server (alle duels, zonder ongeziene uitslagen); zonder die (oude server) uit de lijst van 90 dagen.
  function recOf(k) { const x = listH2h[k]; return x ? [x.w || 0, x.l || 0] : h2hOf(listItems, k); }
  const formOf = (k) => (listItems || []).filter((d) => d.status === "done" && !unrevealed(d) && (d.opp || oppName(d)) === k)
    .sort((a, b) => (Date.parse(a.finished_at || a.created_at) || 0) - (Date.parse(b.finished_at || b.created_at) || 0))
    .slice(-8).map((d) => outcome(d.mine, d.theirs).res);
  const formHtml = (f) => (f.length ? `<span class="dl-form" aria-hidden="true">${f.map((r) => `<i class="${r}"></i>`).join("")}</span>` : "");
  const incoming = (d) => d.status === "open" && !d.me && d.can_accept;

  // ── account-momenten (zonder account) ──
  // opp_acc (db/193): je tegenstander heeft een account met een naam. Dan staat die na het inloggen bij je gezichtjes (duel_list.targets)
  // en klopt "daag je X uit zonder link". Zonder dat veld (oudere server, of een tegenstander zonder account): de algemene regel.
  const oppAcc = (d) => !!d && d.opp_acc === true;
  // Bij de uitslag (niet tijdens het wachten op de ander: daar staan de seintjes-knop en "Laat X het weten" al).
  const keepHtml = (T, d, cls = "") => `<div class="ep-keep${cls}"><span>${esc(oppAcc(d) ? T.keepVs(oppName(d)) : T.keepTitle)}</span>` +
    `<button type="button" class="dl-mini" data-act="login">${esc(T.keepBtn)}</button></div>`;
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

  // Vijf tegels. fresh = index van de net gespeelde ronde (plopt); flip = onthulling (alles bekend, per ronde omdraaien).
  function tilesHtml(d, { fresh = -1, flip = false } = {}) {
    const mine = d.mine || [], theirs = d.theirs || [], done = d.status === "done";
    const their = d.their_done ?? theirs.length, o = outcome(mine, theirs);
    let h = `<div class="duel-rds">`;
    for (let i = 0; i < 5; i++) {
      const lab = `<small>R${i + 1}</small>`, x = mine[i], y = theirs[i], nw = i === fresh ? " new" : "";
      if (flip) {
        h += `<div class="duel-rd mine flip" data-r="${o.per[i]}" style="--i:${i}">${lab}<b>${x ?? "–"}</b><span>?</span>` +
          `<i class="fv">${lab}<b>${x ?? "–"}</b><span>${y ?? "–"}</span></i></div>`;
      } else if (done) {
        const r = o.per[i];
        h += `<div class="duel-rd ${r === "n" ? "todo" : r}${nw}">${lab}<b>${x ?? "–"}</b><span>${y ?? "–"}</span></div>`;
      } else if (x == null) {
        h += `<div class="duel-rd todo">${lab}<b>–</b><span>${i < their ? "?" : "–"}</span></div>`;
      } else if (y == null) {
        h += `<div class="duel-rd mine${nw}">${lab}<b>${x}</b><span>${i < their ? "?" : "–"}</span></div>`;
      } else {
        h += `<div class="duel-rd ${x > y ? "w" : x < y ? "l" : "d"}${nw}">${lab}<b>${x}</b><span>${y}</span></div>`;
      }
    }
    return h + `</div>`;
  }

  // De VS-kop: jij links, de ander rechts, in het midden de stand. big/small = het midden; cells = een vakje per ronde.
  function vsInner(T, d, { big, small, cells }) {
    const mine = d.mine || [], theirs = d.theirs || [], n = oppName(d);
    const opSub = d.status === "done" || theirs.length ? T.pts(sum(theirs)) : T.played5(d.their_done || 0);
    return `<span class="side me">${meAv(T, "")}<span><b>${esc(T.you)}</b><small>${esc(T.pts(sum(mine)))}</small></span></span>` +
      `<span class="mid"><b>${esc(big)}</b><small>${esc(small)}</small></span>` +
      `<span class="side op">${avHtml(oppFlair(d), n)}<span><b>${esc(n)}</b><small>${esc(opSub)}</small></span></span>` +
      (cells ? `<span class="duel-cells" aria-hidden="true">${cells.map((c) => `<i class="duel-cell${c ? " " + c : ""}"></i>`).join("")}</span>` : "");
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
  const FX_IDS = ["sparkle", "ember", "glow", "vizier", "sweat", "ripple", "lotus", "timer", "pendulum", "eclipse", "shard", "aura", "web", "lights", "snow"];   // = de .fx-<id> in flair-fx.css (een test bewaakt dat)
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
      wire: "#7f998c", hi: "#fff", r: "#ff5a5a", y: "#ffc93c", g: "#40d98a", b: "#5aa8ff", flake: "#fff", flake0: "rgba(255,255,255,0)", lotus: ["#f2e8c9", "#e8d9ae", "#6db06d"], lotusLine: null },
    light: { core: "#ffc933", edge: "#b25a00", sc: "#ffe2a0", sm: "#ff9a1f", se: "#d94a00", sr: "rgba(120,30,0,0.7)", gi: "#ffd37a", gm: "#ff9a1f", go: "rgba(214,60,0,0.85)",
      target: "#d32f2f", da: "#5cb8f0", db: "#1f78c8", ripple: "#2a9d8f", line: "#6d6555", timer: "#c77700",
      ohi: "#ffffff", omid: "#7a5cd6", odeep: "#432c8f", odark: "#160b2c", oblack: "#07040f", halo: "rgba(90,60,190,0.7)", ring: "#5d3fb8", dcore: "#fff", dmid: "#6a40d8", dedge: "#1a0e33",
      ai: "#b9a2ff", am: "#6a40d8", ao: "rgba(50,20,140,0.9)", web: "#4a2f7a", spider: "#2d1b45",
      wire: "#41564b", hi: "#fff3c4", r: "#e5383b", y: "#f0a000", g: "#12a060", b: "#2f84ea", flake: "#9fb6c8", flake0: "rgba(159,182,200,0)", lotus: ["#fffaf0", "#f6ecd0", "#4e9a52"], lotusLine: "#b99a47" },
  };
  const FX_STAR = [[50, 0], [60, 40], [100, 50], [60, 60], [50, 100], [40, 60], [0, 50], [40, 40]];
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
    const [ha, hb] = t ? recOf(a.key) : [0, 0];
    const chip = t && (ha || hb) ? `<p class="duel-h2h">${esc(T.spMate(a.name))} <b>${ha}–${hb}</b>${formHtml(formOf(a.key))}</p>` : "";
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
  function introStart(d, r, short) {
    ensureCss();
    introNow?.kill();
    const T = tx(H.lang), curtain = document.documentElement.hasAttribute("data-duelload");
    let still = false; try { still = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    const label = introLabel(T, d, r), mine = myName(), opName = oppName(d), played = d.their_done ?? (d.theirs || []).length;
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
      ? `<div class="dix-band"><div class="dix-bin">${meAv}<span class="dix-bmid"><span class="dix-x">${ICON}</span><b>${esc(label)}</b></span>${opAv}</div></div>`
      : `<div class="dix-wrap"><div class="dix-half me"><div class="dix-in">${meAv}${mine ? `<small class="dix-tag">${esc(T.you)}</small>` : ""}<b class="dix-nm">${esc(mine || T.you)}</b></div></div>` +
        `<div class="dix-half op"><div class="dix-in">${opAv}<b class="dix-nm">${esc(opName)}</b><small class="dix-tag">${esc(T.played5(played))}</small></div></div>` +
        `<svg class="dix-seam" viewBox="0 0 100 100" preserveAspectRatio="none"><line x1="0" y1="58" x2="100" y2="42" vector-effect="non-scaling-stroke"/></svg></div>` +
        `<div class="dix-ring"></div><div class="dix-flash"></div><div class="dix-badge">${cur ? "" : ICON}</div>${cur ? `<div class="dix-cur">${ICON}</div>` : ""}<div class="dix-rd">${esc(label)}</div>`);
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
    const t0 = performance.now();
    let ready = false, gone = false;
    function off() { window.removeEventListener("keydown", onKey, true); window.removeEventListener("pointerdown", skip, true); if (introNow === api) introNow = null; }
    function exit(fast) {   // fast = overgeslagen: even vervagen in plaats van de helften weg te schuiven
      if (gone) return;
      gone = true;
      off();
      el.style.pointerEvents = "none";
      let ms;
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
      if (!short) gc("duel-intro-skip", "Duel: intro skipped");   // de band gaat bij elke toets of tik weg: dat is gewoon spelen
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
      kill() { gone = true; off(); el.remove(); },
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
        duel: { code: d.code, round: r, opp: oppName(d), deadline: d.deadline },
      });
    } finally { intro?.open(); }
  }

  // Het duelscherm (zolang state.duel): de duelkop in plaats van de tabbladen (‹ Jaardle · ⚔️ DUEL · ronde), de VS-kop boven
  // het feit, en de duelkleur (body[data-arena]). Zonder duel: alles weer weg.
  let vsFetching = null, idAsked = false;
  function sync(host) {
    H = host || H;
    const st = H.state(), body = document.body;
    if (!st || !st.duel) {
      document.querySelectorAll("#duel-top, #duel-vs, #duel-bar").forEach((e) => e.remove());
      body.removeAttribute("data-duelpage");
      body.removeAttribute("data-arena");
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
      top.addEventListener("click", (e) => { if (e.target.closest(".duel-exit")) { gc("duel-exit", "Duel: left duel screen"); H.switchMode("daily"); } });
    }
    const mine = (d.mine || []).slice(0, st.done ? 5 : dl.round), theirs = d.theirs || [];
    const shown = st.done ? Math.max(1, mine.length) : dl.round + 1;
    if (top) top.innerHTML = `<button type="button" class="duel-exit">‹ ${esc(T.exit)}</button><span class="duel-title">${ICON} ${esc(T.duelTitle)}</span>` +
      `<span class="duel-round">${esc(T.roundN(Math.min(5, shown)))}</span>`;
    let vs = document.getElementById("duel-vs");
    if (!vs && card) { vs = document.createElement("div"); vs.id = "duel-vs"; vs.className = "duel-vs"; vs.setAttribute("role", "status"); card.before(vs); }
    const s = stand(mine, theirs), cur = st.done ? -1 : dl.round;
    const cells = [0, 1, 2, 3, 4].map((i) => (i < s.n ? (mine[i] > theirs[i] ? "w" : mine[i] < theirs[i] ? "l" : "d") : i < mine.length ? "p" : i === cur ? "cur" : ""));
    const dd = { ...d, mine, theirs: theirs.slice(0, Math.max(s.n, d.status === "done" ? 5 : 0)) };
    if (vs) vs.innerHTML = vsInner(T, dd, { big: `${s.w}–${s.l}`, small: d.status === "done" ? T.final : leftText(T, d.deadline || dl.deadline), cells });
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

  function placeCard(html) {
    H.els.result.querySelectorAll(".duel-card").forEach((e) => e.remove());
    const el = document.createElement("div");
    el.className = "duel-card";
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
    let head, note;
    if (d.status === "done") {
      const o = outcome(mine, theirs);
      head = `${icoHtml(o.res === "w" ? "🏆" : ICON)}<span class="duel-verdict">${esc(verdict(T, o, opp))}</span>`;
      note = (late ? esc(T.late) + " " : "") + esc(T.totalNote(o.a, o.b));
      setButtons({ kind: "rematch", code: d.code, html: `${icoHtml()} ${esc(T.revenge)}`, icon: true }, { kind: "result", d, label: T.shareRes });
      prepShare(d);
    } else if (mine.length < 5) {
      const s = stand(mine, theirs);
      head = `${icoHtml()}<b>${esc(T.duelWith(opp))}</b>` + (s.n ? `<span class="duel-big">${s.w}–${s.l}</span>` : `<span class="duel-r">${esc(T.roundOf(mine.length))}</span>`);
      if (theirs.length > r && mine[r] != null) {
        const x = mine[r], y = theirs[r];
        note = T.theyHad(esc(opp), y) + " " + esc(x > y ? T.rYours : x < y ? T.rTheirs(opp) : T.rDraw);
      } else note = esc(T.notYet(opp));
      setButtons({ kind: "round", code: d.code, html: esc(T.nextRound(mine.length + 1)) }, null);
    } else {   // jij bent klaar, de ander nog niet
      head = `${icoHtml()}<b>${esc(T.youDone(opp))}</b><span class="duel-r">${esc(T.pts(sum(mine)))}</span>`;
      note = esc(T.waitNote(opp, leftText(T, d.deadline)));
      // db/189: krijgt de ander zelf een seintje, dan hoef je het niet te laten weten; zelf een seintje als de ander klaar is
      const bell = bellHtml(T.bellDone(opp), T.onDone(opp));
      if (d.opp_push || bell) note += `<span class="duel-pushes">${d.opp_push ? `<span class="dl-push">${BELL} ${esc(T.pushThem(opp))}</span>` : ""}${bell}</span>`;
      const after = H.dailyDone() ? { kind: "free", html: esc(H.t("next")) } : { kind: "daily", html: esc(T.toDaily) };
      setButtons(after, d.opp_push ? null : { kind: "turn", d, label: T.tell(opp) });
    }
    placeCard(`<div class="duel-head">${head}</div>` + tilesHtml(d, { fresh: late ? -1 : r }) + `<p class="duel-note">${note}</p>`);
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

  // ════ de eindstand-pop-up ════
  // Na je vijfde ronde (de ander nog bezig of al klaar), en voor een uitslag die je nog niet zag (flip: de rondes draaien om).
  function showEndPop(T, d, { flip = false, fresh = false, wonLast = false, again = false } = {}) {
    ensureCss();
    document.getElementById("modal-duel-end")?.remove();
    const opp = oppName(d), mine = d.mine || [], theirs = d.theirs || [], done = d.status === "done";
    const o = outcome(mine, theirs), s = stand(mine, theirs), af = flip ? " after" : "";
    let inner = `<p class="ep-eyebrow">${ICON} ${esc(T.duelWith(opp))}</p>`;
    if (done) {
      prepShare(d);
      const h = verdict(T, o, opp);
      inner += `<h2 class="${af.trim()}">${o.res === "w" ? "🏆 " : ""}${esc(h)}</h2>` +
        `<div class="duel-vs">${vsInner(T, d, { big: flip ? "?–?" : `${o.w}–${o.l}`, small: T.final })}</div>` +
        tilesHtml(d, { flip }) +
        `<p class="ep-note${af}">${esc(T.totalNote(o.a, o.b))}<span class="ep-h2h"></span></p>` +
        `<div class="ep-btns${af}"><button type="button" class="duel-btn" data-act="rematch" data-code="${d.code}">${icoHtml()} ${esc(T.revenge)}</button>` +
        `<button type="button" class="duel-btn ep-ghost" data-act="share-result">${esc(T.shareRes)}</button></div>`;
    } else {
      inner += `<h2>${esc(T.youDone(opp))}</h2>` +
        `<div class="duel-vs">${vsInner(T, d, { big: `${s.w}–${s.l}`, small: T.busy })}</div>` + tilesHtml(d) +
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
      if (act === "login") { gc("duel-login-end", "Duel: create account from result"); parkLogin(d.code); close(); return H.openLogin?.(); }
    });
    H.openModal("modal-duel-end", { over: true });   // boven het Duels-scherm (als dat open is): wegklikken = terug in de lijst
    if (flip) gc("duel-reveal", "Duel: result revealed (first finisher)");
    // je stand tegen deze tegenstander, als de lijst er al is
    const [ha, hb] = h2hOf((listItems || []).filter((x) => x.code !== d.code).concat(done ? [{ ...d, seen: true }] : []), d.opp || opp);   // dit duel telt al mee (je ziet het nu)
    if (done && (ha || hb) && ha + hb > 1) { const x = el.querySelector(".ep-h2h"); if (x) x.textContent = ` · ${T.h2hNow(ha, hb)}`; }   // pas vanaf je tweede duel tegen deze speler
    if (!done) return;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const opPts = flip ? el.querySelector(".duel-vs .side.op small") : null;   // het totaal van de ander verklapt de uitslag: pas na het omdraaien
    if (opPts && !reduced) opPts.textContent = T.pts("?");
    setTimeout(() => {
      if (flip) { const big = el.querySelector(".duel-vs .mid b"); if (big) big.textContent = `${o.w}–${o.l}`; }
      if (opPts) opPts.textContent = T.pts(sum(theirs));
      if (o.res === "w" && !again && !(fresh && wonLast)) H.showConfetti();   // gewonnen: feest (had de laatste ronde al confetti, of zag je hem al: niet nog eens)
      if (!d.seen) markSeen(d.code);
    }, flip && !reduced ? FLIP_MS : 0);
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

  // ════ het Duels-scherm (⋮ → Duels) ════
  function ensureListModal() {
    let el = document.getElementById("modal-duels");
    if (el) return el;
    el = document.createElement("div");
    el.id = "modal-duels";
    el.className = "modal";
    el.hidden = true;
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "duels-title");
    el.innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal-card"><header class="modal-header"><h2 id="duels-title"></h2>` +
      `<button type="button" class="dl-help-btn" data-act="help" aria-expanded="false" hidden></button>` +
      `<button type="button" class="modal-close" data-close>✕</button></header><div class="modal-body dl"></div></div>`;
    document.body.appendChild(el);
    el.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => H.closeModal("modal-duels")));
    el.addEventListener("click", onListClick);
    el.addEventListener("submit", onListSubmit);
    el.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("[data-grp], [data-wait]")) { e.preventDefault(); e.target.click(); }
    });
    return el;
  }

  async function openList(host, opts = {}) {
    H = host;
    uncover();
    ensureCss();
    const T = tx(H.lang), el = ensureListModal();
    el.querySelector("#duels-title").textContent = `${ICON} ${T.title}`;
    el.querySelector(".modal-close").setAttribute("aria-label", T.close);
    el.querySelector(".dl-help-btn").textContent = T.help;
    if (!opts.keepTop) listTop = "";
    H.openModal("modal-duels");
    if (H.loggedIn) await H.ensureIdentity?.().catch?.(() => {});
    renderList(T, null);   // meteen wat we al weten (ook een net onthulde uitslag: die staat al op gezien), daarna vers van de server
    const r = await call("duel_list", {});
    if (!r.ok) { listItems = listItems || []; renderList(T, T.err); return; }
    applyList(await withInvite(r.v));
    let pop = null;
    if (opts.focus) {
      const d = listItems.find((x) => x.code === opts.focus) || (opts.end && opts.end.code === opts.focus ? opts.end : null);
      if (d && d.status === "done") { openGrp = d.opp || oppName(d); selInGrp[openGrp] = d.code; if (!d.seen || opts.end) pop = d; }
      else if (d && d.status === "active") openWait.add(d.code);
    }
    renderList(T, null);
    if (pop) showEndPop(T, pop, pop.seen ? { again: true } : { flip: true });
  }

  function applyList(v) {
    const all = v?.items || [];
    listItems = all.filter((d) => d.status !== "withdrawn");   // een link die je zelf introk hoeft niet in de lijst (ook niet als "Ingetrokken" onder Stand per tegenstander)
    listTargets = Array.isArray(v?.targets) ? v.targets : [];
    listH2h = v?.h2h && typeof v.h2h === "object" && !Array.isArray(v.h2h) ? v.h2h : {};
    if (pickSel && !listTargets.some((t) => t.k === pickSel && !t.busy)) pickSel = null;
    setNews(v?.news || 0);
    // Op dit toestel onthouden wat nog nieuws kan brengen; de rest valt eraf (dan kijkt het laden niet meer).
    writeJson(LIST_KEY, listItems.filter((d) => d.status === "open" || d.status === "active" || (d.status === "done" && !d.seen))
      .map((d) => ({ c: d.code, u: Date.parse(d.deadline || "") || Date.now() })));
    for (const d of all) if (cache[d.code]) keep(d);
    return listItems;
  }

  function rowHtml({ av, name, h2h, sub, right, cls = "", attrs = "" }) {
    return `<div class="dl-row${cls}"${attrs}>${av}` +
      `<span class="dl-main"><b>${esc(name)}${h2h ? ` <small>· ${esc(h2h)}</small>` : ""}</b><small>${sub}</small></span>${right || ""}</div>`;
  }
  const qAv = `<span class="dl-av" aria-hidden="true">?</span>`;

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
    const body = el.querySelector(".modal-body"), helpBtn = el.querySelector(".dl-help-btn");
    if (!listItems) { helpBtn.hidden = true; body.innerHTML = `<p class="dl-msg">${esc(T.loading)}</p>`; return; }
    helpBtn.hidden = !listItems.length && !listTop;
    helpBtn.setAttribute("aria-expanded", String(helpOpen));
    body.innerHTML = listBody(T, listItems, listTop, msg);
  }

  // De inhoud van het Duels-scherm. top = wat je net deed (naamveld, "verstuurd" met de link, een fout): dat staat bovenaan,
  // dan jouw beurt, en pas daaronder "Daag een vriend uit" (eerst spelen wat op je wacht; na versturen geen grote knop boven het groene vak).
  function listBody(T, items, top, msg) {
    const newBtn = `<button type="button" class="dl-new" data-act="new">${icoHtml()} ${esc(T.newBtn)}</button>`;
    const err = msg ? `<p class="dl-msg duel-err">${esc(msg)} <button type="button" class="dl-mini" data-act="reload">${esc(T.retry)}</button></p>` : "";
    if (!items.length && !top) {   // lege staat: Jij vs ?, de drie stappen (= de uitleg), één knop
      return err + `<div class="dl-hero"><div class="dl-vs">${meAv(T)}<b>VS</b><span class="dl-av op" aria-hidden="true">?</span></div>` +
        `<h3>${esc(T.heroTitle)}</h3>${stepsHtml(T)}${newBtn}</div>`;
    }
    let h = helpOpen ? `<div class="dl-help">${stepsHtml(T)}</div>` : "";
    const groups = groupsOf(items);
    const known = items.filter((d) => d.status === "done" && !unrevealed(d));
    const hs = Object.values(listH2h);
    if (known.length || hs.length) {   // je stand: gewonnen, verloren, lopend (zodra je een uitslag zag; een ongeziene telt nog niet mee)
      let w = 0, l = 0;
      if (hs.length) for (const x of hs) { w += x.w || 0; l += x.l || 0; }   // db/189: over alle duels
      else for (const d of known) { const o = outcome(d.mine, d.theirs); if (o.res === "w") w++; else if (o.res === "l") l++; }
      const run = items.filter((d) => d.status === "active" || (d.status === "open" && d.me === "c")).length;
      h += `<div class="dl-stats"><div class="dl-stat w"><b>${w}</b><small>${esc(T.statW)}</small></div><div class="dl-stat l"><b>${l}</b><small>${esc(T.statL)}</small></div>` +
        `<div class="dl-stat"><b>${run}</b><small>${esc(T.statO)}</small></div></div>`;
    }
    h += top + err;
    const turn = items.filter((d) => d.status === "active" && (d.mine || []).length < 5)
      .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
    const wait = items.filter((d) => (d.status === "open" && d.me === "c") || (d.status === "active" && (d.mine || []).length >= 5));
    const recent = (d) => Date.now() - Date.parse(d.created_at) < 3 * 864e5;
    const gone = items.filter((d) => d.me === "c" && ["expired", "declined"].includes(d.status) && recent(d)).slice(0, 3);
    const h2hTxt = (d) => { const [a, b] = recOf(d.opp || oppName(d)); return a || b ? T.h2h(a, b) : ""; };
    const inc = items.filter(incoming);   // db/189: een uitdaging aan jou (een teamgenoot, of een revanche)
    if (turn.length || inc.length) {
      const nT = turn.length + inc.length;
      h += `<h3 class="dl-h">${esc(T.secTurn)}${nT > 1 ? ` · ${nT}` : ""}</h3>`;
      for (const d of inc) {
        const n = d.c_name || "?", rec = h2hTxt(d);
        h += rowHtml({ av: avHtml(d.c_flair, n), name: (d.rematch ? T.invRematch : T.invTitle)(n), sub: `${rec ? esc(cap(rec)) + " · " : ""}<em>${esc(leftText(T, d.deadline))}</em>`,
          cls: " turn has-new", right: `<button type="button" class="dl-go" data-act="accept" data-code="${d.code}">${esc(T.acceptShort)}</button>` +
            `<button type="button" class="dl-x" data-act="decline" data-code="${d.code}" aria-label="${esc(T.decline)}">✕</button>` });
      }
      for (const d of turn) {
        const n = oppName(d), k = d.their_done || 0;
        const who = k >= 5 ? T.oppDone(n) : k > 0 ? T.oppPlays(n, k) : d.me === "c" ? T.accepted(n) : T.oppNotYet(n);   // "nam aan" alleen als jij uitdaagde
        h += rowHtml({ av: avHtml(oppFlair(d), n), name: n, h2h: h2hTxt(d), sub: `${esc(who)} · <em>${esc(leftText(T, d.deadline))}</em>`, cls: " turn",
          right: `<button type="button" class="dl-go" data-act="play" data-code="${d.code}">${esc(T.play)}</button>` });
      }
    }
    if (!top.startsWith("<form")) h += pickHtml(T, newBtn, items);   // met het naamveld open is "Daag uit" de knop
    if (wait.length) {
      h += `<h3 class="dl-h">${esc(T.secWait)}${wait.length > 1 ? ` · ${wait.length}` : ""}</h3>`;
      for (const d of wait) h += d.status === "open" ? openLinkHtml(T, d) : waitItemHtml(T, d, h2hTxt(d));
    }
    if (groups.length || gone.length) {
      h += `<h3 class="dl-h">${esc(T.secDone)}</h3>`;
      const shown = showAll ? groups : groups.slice(0, 3);
      for (const g of shown) h += groupHtml(T, g);
      if (!showAll && groups.length > 3) h += `<button type="button" class="dl-moreb" data-act="more">${esc(T.moreOpp(groups.length - 3))}</button>`;
      for (const d of gone) {
        const sub = d.status === "declined" ? T.declined(d.o_name || "?") : T.nobody;
        h += rowHtml({ av: qAv, name: T.yourLink, sub: esc(sub), cls: " dim", right: `<span class="dl-res">${esc(T.gone)}</span>` });
      }
    }
    return h;
  }

  // db/189: je teamgenoten (en eerdere tegenstanders met een account) als gezichtjes, met jullie stand eronder. Tik = kiezen;
  // dan wordt de grote knop "Daag X uit" (geen link nodig, X krijgt een seintje). Zonder keuze blijft het de link.
  function pickHtml(T, newBtn, items = listItems) {
    if (!H.loggedIn) return newBtn + acctHtml(T, items);   // zonder account: de link, en (na een duel tegen een account) de account-regel
    if (!listTargets.length) return newBtn;
    const faces = listTargets.map((t) => {
      const [a, b] = recOf(t.k), busy = !!t.busy;
      const lab = busy ? `<small class="run">${esc(T.faceRun)}</small>`
        : a || b ? `<small class="${a > b ? "up" : a < b ? "down" : ""}">${a}–${b}</small>` : `<small class="new">${esc(T.faceNew)}</small>`;
      return `<button type="button" class="dl-face${busy ? " busy" : ""}" data-face="${esc(t.k)}" aria-pressed="${t.k === pickSel}">` +
        `${avHtml(t.flair, t.name)}<b>${esc(t.name)}</b>${lab}</button>`;
    }).join("");
    const t = listTargets.find((x) => x.k === pickSel && !x.busy);
    let tail = newBtn;
    if (t) {
      const [a, b] = recOf(t.k);
      tail = (a || b ? `<div class="dl-vsline"><span>${esc(T.vsLine(t.name))} <b>${a}–${b}</b></span>${formHtml(formOf(t.k))}</div>` : "") +
        `<button type="button" class="dl-new" data-act="challenge" data-k="${esc(t.k)}">${icoHtml()} ${esc(T.challengeX(t.name))}</button>` +
        `<button type="button" class="dl-linkb" data-act="new">${esc(T.linkInstead)}</button>`;
    }
    return `<h3 class="dl-h">${esc(T.pickH)}</h3><div class="dl-pick"><div class="dl-faces">${faces}</div>${tail}</div>`;
  }

  // Je openstaande link: opnieuw sturen, intrekken, en de link zelf (te selecteren, Kopieer).
  function openLinkHtml(T, d) {
    if (d.for_name) {   // db/189: een directe uitdaging of een revanche: die ander krijgt een seintje en ziet hem in zijn lijst, dus geen linkveld (de link kan er los bij)
      return rowHtml({ av: avHtml(d.for_flair, d.for_name), name: d.for_name, h2h: (() => { const [a, b] = recOf(d.opp); return a || b ? T.h2h(a, b) : ""; })(),
        sub: `${esc(d.rematch ? T.revenge : T.invited)} · ${esc(cap(T.linkLeft(leftText(T, d.deadline))))}`, cls: " wrap",
        right: `<span class="dl-acts"><button type="button" class="dl-mini" data-act="resend" data-code="${d.code}">${esc(T.sendLinkShort)}</button>` +
          `<button type="button" class="dl-mini" data-act="withdraw" data-code="${d.code}">${esc(T.withdraw)}</button></span>` });
    }
    return rowHtml({ av: qAv, name: T.yourLink,   // een gewone link (wie hem als eerste aanneemt): de link is de enige weg, dus het veld met Kopieer erbij
      sub: esc(cap(T.linkLeft(leftText(T, d.deadline)))), cls: " wrap",
      right: `<span class="dl-acts"><button type="button" class="dl-mini" data-act="resend" data-code="${d.code}">${esc(T.resend)}</button>` +
        `<button type="button" class="dl-mini" data-act="withdraw" data-code="${d.code}">${esc(T.withdraw)}</button></span>` +
        (listTop.includes(d.code) ? "" : `<span class="dl-acts">${linkField(T, d.code)}</span>`) });   // net verstuurd: de link staat al in het groene vak
  }

  // Een duel dat op de ander wacht: tik = je eigen vijf scores, en die van de ander voor de rondes die jullie allebei speelden.
  function waitItemHtml(T, d, h2h) {
    const n = oppName(d), k = d.their_done || 0, s = stand(d.mine, d.theirs), open = openWait.has(d.code);
    const row = rowHtml({ av: avHtml(oppFlair(d), n), name: n, h2h, sub: `${esc(k > 0 ? T.oppPlays(n, k) : T.oppNotYet(n))} · ${esc(leftText(T, d.deadline))}`,
      right: (s.n ? `<span class="dl-stand">${s.w}–${s.l}</span>` : "") + `<span class="dl-chev" aria-hidden="true">▾</span>`,
      attrs: ` data-wait="${d.code}" role="button" tabindex="0" aria-expanded="${open}"` });
    const det = open ? `<div class="dl-detail"><div class="duel-card"><div class="duel-head"><b>${esc(T.yourRounds)}</b><span class="duel-r">${esc(T.pts(sum(d.mine)))}</span></div>` +
      tilesHtml(d) + `<p class="dl-wait-note">${esc(T.waitDetail(n, k))}</p></div>` +
      `<button type="button" class="dl-mini dl-rev" data-act="turn" data-code="${d.code}">${esc(T.tell(n))}</button></div>` : "";
    return `<div class="dl-item${open ? " open" : ""}">${row}${det}</div>`;
  }

  function groupHtml(T, g) {
    const latest = g.ds[0], n = oppName(latest), isOpen = openGrp === g.k;
    const known = g.ds.filter((d) => !unrevealed(d));   // stand, blokjes en details alleen van uitslagen die je al zag
    let a = 0, b = 0;
    const form = known.slice(0, 8).reverse().map((d) => outcome(d.mine, d.theirs).res);
    for (const d of known) { const o = outcome(d.mine, d.theirs); if (o.res === "w") a++; else if (o.res === "l") b++; }
    const sv = listH2h[g.k];
    if (sv) { a = sv.w || 0; b = sv.l || 0; }   // db/189: over alle duels, niet alleen de laatste 90 dagen
    const sel = known.find((d) => d.code === selInGrp[g.k]) || known[0];
    const news = g.ds.some((d) => !d.seen);
    const sub = unrevealed(latest) ? T.revealTap : `${cap(whenText(T, latest.finished_at))}: ${resText(T, outcome(latest.mine, latest.theirs))}`;
    const rec = known.length ? `<span class="dl-rec"><span class="dl-form" aria-hidden="true">${form.map((r) => `<i class="${r}"></i>`).join("")}</span><b>${a}–${b}</b></span>` : "";
    const row = `<div class="dl-row${news ? " has-new" : ""}" data-grp="${esc(g.k)}" role="button" tabindex="0" aria-expanded="${isOpen}">` +
      `${avHtml(oppFlair(latest), n)}<span class="dl-main"><b>${esc(n)}</b><small>${esc(sub)}</small></span>` +
      `${rec}<span class="dl-chev" aria-hidden="true">▾</span></div>`;
    let det = "";
    if (isOpen && sel) {
      const so = outcome(sel.mine, sel.theirs), nD = sv ? sv.n || 0 : known.length;
      let vs = "";
      if (nD >= 2) {   // db/189: jullie stand als VS-kop, met de laatste duels als blokjes en een paar cijfers
        vs = `<div class="duel-vs"><span class="side me">${meAv(T, "")}<span><b>${esc(T.you)}</b><small>${esc(T.wonN(a))}</small></span></span>` +
          `<span class="mid"><b>${a}–${b}</b><small>${esc(T.duelsN(nD))}</small></span>` +
          `<span class="side op">${avHtml(oppFlair(latest), n)}<span><b>${esc(n)}</b><small>${esc(T.wonN(b))}</small></span></span>` +
          `<span class="duel-cells" aria-hidden="true">${form.slice(-6).map((r) => `<i class="duel-cell ${r === "w" ? "w" : r === "l" ? "l" : "d"}"></i>`).join("")}</span></div>`;
        if (sv && sv.n) {
          const best = Array.isArray(sv.best) ? sv.best : null, avg = (x) => Math.round((x || 0) / (sv.n * 5));
          vs += `<p class="dl-h2h-sub"><span>${esc(T.stRounds)} <b>${sv.rw || 0}–${sv.rl || 0}</b></span>` +
            `<span>${esc(T.stAvg)} <b>${avg(sv.a)}</b> ${esc(T.stAgainst)} <b>${avg(sv.b)}</b></span>` +
            (best ? `<span>${esc(T.stBest)} <b>${best[0]}–${best[1]}</b></span>` : "") + `</p>`;
        }
      }
      det = `<div class="dl-detail">${vs}<div class="duel-card"><div class="duel-head"><b>${esc(cap(whenText(T, sel.finished_at)))}, ${esc(clockText(sel.finished_at))}</b>` +
        `<span class="duel-r">${esc(T.total(so.a, so.b))}</span>` +
        `<button type="button" class="dl-endb" data-act="end" data-code="${sel.code}" aria-label="${esc(cap(T.final))}" title="${esc(cap(T.final))}">🏁<span aria-hidden="true">›</span></button></div>` + tilesHtml(sel) +
        `<span class="duel-verdict">${esc(verdict(T, so, n))}</span></div>` +
        (known.length > 1 ? `<div class="dl-past">${known.slice(0, 6).map((d) => { const o = outcome(d.mine, d.theirs);
          return `<button type="button" data-sel="${d.code}" data-grp-of="${esc(g.k)}" aria-pressed="${d.code === sel.code}"><span>${esc(cap(whenText(T, d.finished_at)))}</span><span class="dl-res ${o.res}">${esc(resText(T, o))}</span></button>`; }).join("")}</div>` : "") +
        `<button type="button" class="dl-mini dl-rev" data-act="rematch" data-code="${sel.code}">${icoHtml()} ${esc(T.revenge)}</button></div>`;
    }
    return `<div class="dl-item${isOpen ? " open" : ""}" data-sel="${(sel || latest).code}">${row}${det}</div>`;
  }

  function onListClick(e) {
    const T = tx(H.lang);
    const b = e.target.closest("[data-act], [data-grp], [data-wait], [data-sel][data-grp-of], [data-face]");
    if (!b) return;
    if (b.dataset.face) {   // db/189: een gezichtje kiezen (nog eens = weer de link); loopt er al een duel, dan dat duel
      const t = listTargets.find((x) => x.k === b.dataset.face);
      if (!t) return;
      if (t.busy) {
        const d = (listItems || []).find((x) => x.code === t.busy);
        if (d && incoming(d)) return showPop(T, popBody(T, d), d);
        if (d && d.status === "active" && (d.mine || []).length < 5) return play(H, d.code);
        if (d && d.status === "active") openWait.add(d.code);
        return renderList(T, null);
      }
      pickSel = pickSel === t.k ? null : t.k;
      return renderList(T, null);
    }
    if (b.dataset.grpOf) { selInGrp[b.dataset.grpOf] = b.dataset.sel; renderList(T, null); return; }
    if (b.dataset.wait && !b.dataset.act) {
      if (openWait.has(b.dataset.wait)) openWait.delete(b.dataset.wait); else openWait.add(b.dataset.wait);
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
    if (act === "new") { pickSel = null; return create(H, {}); }
    if (act === "login") { gc("duel-login-list", "Duel: log in from the Duels screen"); parkLogin(code); return H.openLogin?.(); }   // het login-paneel sluit dit scherm
    if (act === "challenge") { const t = listTargets.find((x) => x.k === b.dataset.k); if (t) { gc("duel-create-team", "Duel: teammate challenged"); return create(H, { forK: t.k, forName: t.name }); } return; }
    if (act === "push") return onBell(b);
    if (act === "accept") return acceptFromList(T, code, b);
    if (act === "decline") {
      gc("duel-decline", "Duel: declined");
      b.disabled = true;
      return call("duel_decline", { p_code: code, p_name: myName() }).then(() => { inviteDrop(code); return openList(H, { keepTop: true }); });
    }
    if (act === "help") { helpOpen = !helpOpen; if (helpOpen) gc("duel-help", "Duel: how it works"); return renderList(T, null); }
    if (act === "reload") return openList(H, { keepTop: true });
    if (act === "more") { showAll = true; return renderList(T, null); }
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
      gc("duel-resend", "Duel: invite sent again");
      const d = (listItems || []).find((x) => x.code === code) || cache[code];
      if (d) shareText(T, (d.rematch ? T.shRematch : T.shInvite)(d.c_name), LINK(code), b);
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
    b.disabled = true;
    b.textContent = T.loading;
    const r = await call("duel_accept", { p_code: code, p_name: name });
    if (!r.ok) return openList(H, { keepTop: true });
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
    create(H, { rematch: f.dataset.rematch || null, forK: f.dataset.for || null, forName: f.dataset.forName || null });
  }

  // Nieuwe uitdaging of revanche: naam (zonder account één keer vragen), aanmaken, dan meteen delen; de link blijft zichtbaar.
  async function create(host, { rematch = null, forK = null, forName = null } = {}) {
    H = host;
    const T = tx(H.lang);
    if (H.loggedIn) await H.ensureIdentity?.().catch?.(() => {});
    const name = myName();
    if (!name) {
      listTop = `<form class="dl-name"${rematch ? ` data-rematch="${esc(rematch)}"` : ""}${forK ? ` data-for="${esc(forK)}" data-for-name="${esc(forName || "")}"` : ""}><label for="duel-name-new">${esc(T.nameLabel)}</label>` +
        `<div><input id="duel-name-new" maxlength="20" autocomplete="nickname" placeholder="${esc(T.namePh)}"><button type="submit">${esc(T.go)}</button></div></form>`;
      await openList(H, { keepTop: true });
      document.getElementById("duel-name-new")?.focus();
      return;
    }
    listTop = `<p class="dl-msg">${esc(T.loading)}</p>`;
    const opened = openList(H, { keepTop: true });
    const r = await call("duel_create", { p_name: name, p_rematch: forK ? null : rematch, ...(forK ? { p_for: forK } : {}) });   // p_for alleen als het moet (oudere server kent hem niet)
    if (!r.ok) {
      listTop = `<p class="dl-msg duel-err">${esc(/too_many_open/.test(r.e) ? T.errMax : /running/.test(r.e) ? T.errRunning(forName || "?") : /name/.test(r.e) ? T.errName : T.err)}</p>`;
      await opened;
      renderList(T, null);
      return;
    }
    const d = keep(r.v);
    remember(d.code, d.deadline);
    pickSel = null;
    gc(rematch ? "duel-rematch" : forK ? "duel-create-direct" : "duel-create", rematch ? "Duel: rematch created" : forK ? "Duel: direct challenge created" : "Duel: challenge created");
    // db/189: een directe uitdaging (en een revanche aan iemand met seintjes) gaat zonder link: de ander krijgt een seintje of ziet
    // hem in zijn lijst. De link kan er los bij ("Stuur ook een link").
    if (forK || (rematch && d.opp_push)) {
      const nm = d.for_name || forName || "?";
      listTop = `<div class="dl-sent"><b>✓ ${esc(T.challenged(nm))}</b><span>${esc(d.opp_push ? T.pushYes(nm) : T.pushNo(nm))}</span>` +
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
    listTop = `<div class="dl-sent"><b>✓ ${esc(head)}</b><span>${esc(sub)}</span>${linkField(T, d.code)}` +
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
      const fl = d.c_flair && H.flairHtml ? H.flairHtml(d.c_flair) : "";
      const [ha, hb] = recOf(d.opp || "");
      const chip = ha || hb ? `<p class="duel-h2h">${esc(T.h2hChip)} <b>${ha}–${hb}</b>${formHtml(formOf(d.opp || ""))}</p>` : "";   // db/189
      return `${icoHtml()}<h2>${fl ? fl + " " : ""}${esc((d.rematch ? T.invRematch : T.invTitle)(c))}</h2>${chip}<ul><li>${T.inv1}</li><li>${T.inv2}</li><li>${T.inv3}</li></ul>` +
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
        if (box) box.innerHTML = g.ok ? popBody(T, g.v) : `<p class="duel-err">${esc(T.err)}</p>`;
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
  async function checkNews(host) {
    H = host || H;
    const r = await call("duel_list", {});
    if (r.ok) applyList(await withInvite(r.v));
  }

  return {
    openList, openInvite, resumeInvite, play, sync, roundDone, next, share, checkNews, pushToggle, pushOn: (host) => { H = host || H; return pushOn(); },
    css: CSS, copy: (l) => tx(l), langs: () => Object.keys(TXT),
    _: { outcome, stand, tilesHtml, leftText, groupsOf, popBody, LINK, withInvite, INVITE_KEY, h2hOf, vsInner, listBody, pickHtml, recOf, applyList, bellHtml, avHtml, showEndPop,
         spectateBody, duelSides, flairEmoji, flairParts, FX_IDS, HUES, drawShare, keepHtml, acctHtml, introLabel,
         setPick: (k) => { pickSel = k; }, setGrp: (k) => { openGrp = k; }, setHost: (h) => { H = h; } },   // voor de tests
  };
})();
