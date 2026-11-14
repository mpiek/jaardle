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
   uitnodiging die na het inloggen terugkomt).
   Meetpunten (GoatCounter, site jaardle-events; game.js telt duel-list bij ⋮ → Duels): duel-create · duel-rematch · duel-invite-shared|copied|
   abort|prompt · duel-copy-link · duel-resend · duel-withdraw · duel-link-open|own|taken|closed|notfound · duel-accept · duel-decline ·
   duel-login-invite · duel-round-1…5 · duel-done-first · duel-done-second · duel-reveal · duel-tell · duel-share-result · duel-exit ·
   duel-help · duel-login-end. Trechter: link-open → accept → round-1 → round-5; create → invite-shared/copied → (bij de ander) link-open. */
window.Duel = (() => {
  const ICON = "⚔️";
  const LIST_KEY = "jaardle:duels", NEWS_KEY = "jaardle:duel-news", NAME_KEY = "jaardle:duel-name", PENDING_KEY = "jaardle:pendingDuel";
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
`;

  const TXT = {
    nl: {
      help: "Hoe werkt het?", st1: "Stuur een link naar een vriend", st1s: "Wie hem als eerste aanneemt, speelt tegen je.", st2: "Jullie spelen dezelfde 5 rondes", st2s: "Van makkelijk naar moeilijk, allebei wanneer je wilt binnen 24 uur.", st3: "Per ronde wint de hoogste score", st3s: "Wie de meeste rondes wint, wint het duel. Telt niet mee voor je rating.", heroTitle: "Daag een vriend uit voor een duel", statW: "Gewonnen", statL: "Verloren", statO: "Lopend", copy: "Kopieer", linkAria: "Je duellink", yourRounds: "Jouw rondes", waitDetail: (n, k) => `${n} speelde ${k} van de 5. De rest zie je zodra ${n} verder speelt.`, exit: "Jaardle", duelTitle: "Duel", roundN: (r) => `Ronde ${r}/5`, you: "Jij", played5: (k) => `${k}/5 gespeeld`, busy: "nog bezig", final: "eindstand", login: "Al een account? Log in", keepTitle: "Bewaar je duels op al je toestellen", keepBtn: "Maak een account", h2hNow: (a, b) => `jullie nu ${a}–${b}`,
      title: "Duels", close: "Sluiten", newBtn: "Daag een vriend uit", nameLabel: "Je naam (die ziet je tegenstander)", namePh: "Naam", go: "Daag uit",
      ready: "Je uitdaging staat klaar", sent: "Link verstuurd", copied: "Link gekopieerd", sentSub: "Wie hem als eerste aanneemt, speelt tegen je.", onlyFor: (n) => `Alleen ${n} kan hem aannemen.`, rematchFor: (n) => `Revanche voor ${n}`,  sendLink: "Stuur de link",
      copyPrompt: "Kopieer de link:", empty: "Nog geen duels. Daag iemand uit: jullie spelen dezelfde 5 rondes en per ronde wint de hoogste score.",
      loading: "Even laden…", err: "Dat lukte niet. Probeer het nog eens.", retry: "Opnieuw",
      errMax: "Je hebt al 3 uitnodigingen openstaan. Wacht tot iemand aanneemt of trek er een in.", errName: "Vul eerst je naam in.",
      secTurn: "Jouw beurt", secWait: "Wacht", secDone: "Afgelopen",
      left: (h, m) => (h >= 1 ? `nog ${h} u` : `nog ${m} min`),
      accepted: (n) => `${n} nam aan`, oppDone: (n) => `${n} is klaar`, oppPlays: (n, k) => `${n} speelt · ${k}/5`, oppNotYet: (n) => `${n} begon nog niet`,
      yourLink: "Je link", linkLeft: (l) => `${l} om aan te nemen`, resend: "Stuur opnieuw", withdraw: "Intrekken", play: "Speel",
      h2h: (a, b) => `jullie ${a}–${b}`, won: (a, b) => `gewonnen ${a}–${b}`, lost: (a, b) => `verloren ${a}–${b}`, drawn: (a, b) => `gelijk ${a}–${b}`,
      nobody: "Niemand nam hem aan", declined: (n) => `${n} wees af`, withdrawn: "Ingetrokken", gone: "Verlopen",
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
    },
    en: {
      help: "How does it work?", st1: "Send a link to a friend", st1s: "Whoever accepts it first plays against you.", st2: "You both play the same 5 rounds", st2s: "From easy to hard, each whenever you like within 24 hours.", st3: "The highest score wins each round", st3s: "Whoever wins the most rounds wins the duel. Doesn't count toward your rating.", heroTitle: "Challenge a friend to a duel", statW: "Won", statL: "Lost", statO: "Running", copy: "Copy", linkAria: "Your duel link", yourRounds: "Your rounds", waitDetail: (n, k) => `${n} has played ${k} of 5. You'll see the rest as ${n} plays on.`, exit: "Jaardle", duelTitle: "Duel", roundN: (r) => `Round ${r}/5`, you: "You", played5: (k) => `${k}/5 played`, busy: "in progress", final: "final score", login: "Already have an account? Log in", keepTitle: "Keep your duels on all your devices", keepBtn: "Create an account", h2hNow: (a, b) => `${a}–${b} overall now`,
      title: "Duels", close: "Close", newBtn: "Challenge a friend", nameLabel: "Your name (your opponent sees it)", namePh: "Name", go: "Challenge",
      ready: "Your challenge is ready", sent: "Link sent", copied: "Link copied", sentSub: "Whoever accepts it first plays against you.", onlyFor: (n) => `Only ${n} can accept it.`, rematchFor: (n) => `Rematch for ${n}`,  sendLink: "Send the link",
      copyPrompt: "Copy the link:", empty: "No duels yet. Challenge someone: you both play the same 5 rounds and the highest score wins each round.",
      loading: "Loading…", err: "That didn't work. Please try again.", retry: "Retry",
      errMax: "You already have 3 open invitations. Wait for someone to accept, or withdraw one.", errName: "Fill in your name first.",
      secTurn: "Your turn", secWait: "Waiting", secDone: "Finished",
      left: (h, m) => (h >= 1 ? `${h} h left` : `${m} min left`),
      accepted: (n) => `${n} accepted`, oppDone: (n) => `${n} is done`, oppPlays: (n, k) => `${n} is playing · ${k}/5`, oppNotYet: (n) => `${n} hasn't started`,
      yourLink: "Your link", linkLeft: (l) => `${l} to accept`, resend: "Send again", withdraw: "Withdraw", play: "Play",
      h2h: (a, b) => `${a}–${b} overall`, won: (a, b) => `won ${a}–${b}`, lost: (a, b) => `lost ${a}–${b}`, drawn: (a, b) => `tied ${a}–${b}`,
      nobody: "Nobody accepted it", declined: (n) => `${n} declined`, withdrawn: "Withdrawn", gone: "Expired",
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
    },
    de: {
      help: "Wie funktioniert das?", st1: "Schick einen Link an jemanden", st1s: "Wer ihn zuerst annimmt, spielt gegen dich.", st2: "Ihr spielt dieselben 5 Runden", st2s: "Von leicht bis schwer, wann ihr wollt, innerhalb von 24 Stunden.", st3: "Pro Runde gewinnt die höchste Punktzahl", st3s: "Wer die meisten Runden gewinnt, gewinnt das Duell. Zählt nicht für dein Rating.", heroTitle: "Fordere jemanden zum Duell heraus", statW: "Gewonnen", statL: "Verloren", statO: "Laufend", copy: "Kopieren", linkAria: "Dein Duell-Link", yourRounds: "Deine Runden", waitDetail: (n, k) => `${n} hat ${k} von 5 gespielt. Den Rest siehst du, sobald ${n} weiterspielt.`, exit: "Jaardle", duelTitle: "Duell", roundN: (r) => `Runde ${r}/5`, you: "Du", played5: (k) => `${k}/5 gespielt`, busy: "läuft noch", final: "Endstand", login: "Schon ein Konto? Anmelden", keepTitle: "Behalte deine Duelle auf all deinen Geräten", keepBtn: "Konto erstellen", h2hNow: (a, b) => `jetzt insgesamt ${a}–${b}`,
      title: "Duelle", close: "Schließen", newBtn: "Fordere jemanden heraus", nameLabel: "Dein Name (sieht dein Gegenüber)", namePh: "Name", go: "Herausfordern",
      ready: "Deine Herausforderung ist bereit", sent: "Link verschickt", copied: "Link kopiert", sentSub: "Wer ihn zuerst annimmt, spielt gegen dich.", onlyFor: (n) => `Nur ${n} kann sie annehmen.`, rematchFor: (n) => `Revanche für ${n}`,  sendLink: "Link senden",
      copyPrompt: "Kopiere den Link:", empty: "Noch keine Duelle. Fordere jemanden heraus: Ihr spielt dieselben 5 Runden, und pro Runde gewinnt die höchste Punktzahl.",
      loading: "Lädt…", err: "Das hat nicht geklappt. Versuch es noch einmal.", retry: "Nochmal",
      errMax: "Du hast schon 3 offene Einladungen. Warte, bis jemand annimmt, oder zieh eine zurück.", errName: "Gib zuerst deinen Namen ein.",
      secTurn: "Du bist dran", secWait: "Wartet", secDone: "Beendet",
      left: (h, m) => (h >= 1 ? `noch ${h} Std.` : `noch ${m} Min.`),
      accepted: (n) => `${n} hat angenommen`, oppDone: (n) => `${n} ist fertig`, oppPlays: (n, k) => `${n} spielt · ${k}/5`, oppNotYet: (n) => `${n} hat noch nicht angefangen`,
      yourLink: "Dein Link", linkLeft: (l) => `${l} zum Annehmen`, resend: "Nochmal senden", withdraw: "Zurückziehen", play: "Spielen",
      h2h: (a, b) => `insgesamt ${a}–${b}`, won: (a, b) => `gewonnen ${a}–${b}`, lost: (a, b) => `verloren ${a}–${b}`, drawn: (a, b) => `unentschieden ${a}–${b}`,
      nobody: "Niemand hat angenommen", declined: (n) => `${n} hat abgelehnt`, withdrawn: "Zurückgezogen", gone: "Abgelaufen",
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
    },
    es: {
      help: "¿Cómo funciona?", st1: "Envía un enlace a un amigo", st1s: "Quien lo acepte primero juega contra ti.", st2: "Jugáis las mismas 5 rondas", st2s: "De fácil a difícil, cada uno cuando quiera en 24 horas.", st3: "En cada ronda gana la puntuación más alta", st3s: "Quien gane más rondas gana el duelo. No cuenta para tu rating.", heroTitle: "Reta a un amigo a un duelo", statW: "Ganados", statL: "Perdidos", statO: "En curso", copy: "Copiar", linkAria: "Tu enlace de duelo", yourRounds: "Tus rondas", waitDetail: (n, k) => `${n} ha jugado ${k} de 5. Verás el resto cuando siga jugando.`, exit: "Jaardle", duelTitle: "Duelo", roundN: (r) => `Ronda ${r}/5`, you: "Tú", played5: (k) => `${k}/5 jugadas`, busy: "en curso", final: "resultado final", login: "¿Ya tienes cuenta? Inicia sesión", keepTitle: "Guarda tus duelos en todos tus dispositivos", keepBtn: "Crear una cuenta", h2hNow: (a, b) => `ahora en total ${a}–${b}`,
      title: "Duelos", close: "Cerrar", newBtn: "Reta a un amigo", nameLabel: "Tu nombre (lo verá tu rival)", namePh: "Nombre", go: "Retar",
      ready: "Tu reto está listo", sent: "Enlace enviado", copied: "Enlace copiado", sentSub: "Quien lo acepte primero juega contra ti.", onlyFor: (n) => `Solo ${n} puede aceptarlo.`, rematchFor: (n) => `Revancha para ${n}`,  sendLink: "Enviar el enlace",
      copyPrompt: "Copia el enlace:", empty: "Aún no hay duelos. Reta a alguien: jugáis las mismas 5 rondas y en cada ronda gana la puntuación más alta.",
      loading: "Cargando…", err: "No ha funcionado. Inténtalo de nuevo.", retry: "Reintentar",
      errMax: "Ya tienes 3 invitaciones abiertas. Espera a que alguien acepte o retira una.", errName: "Escribe primero tu nombre.",
      secTurn: "Tu turno", secWait: "En espera", secDone: "Terminados",
      left: (h, m) => (h >= 1 ? `quedan ${h} h` : `quedan ${m} min`),
      accepted: (n) => `${n} aceptó`, oppDone: (n) => `${n} ha terminado`, oppPlays: (n, k) => `${n} está jugando · ${k}/5`, oppNotYet: (n) => `${n} aún no ha empezado`,
      yourLink: "Tu enlace", linkLeft: (l) => `${l} para aceptar`, resend: "Reenviar", withdraw: "Retirar", play: "Jugar",
      h2h: (a, b) => `en total ${a}–${b}`, won: (a, b) => `ganado ${a}–${b}`, lost: (a, b) => `perdido ${a}–${b}`, drawn: (a, b) => `empate ${a}–${b}`,
      nobody: "Nadie lo aceptó", declined: (n) => `${n} lo rechazó`, withdrawn: "Retirado", gone: "Caducado",
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
    },
    pt: {
      help: "Como funciona?", st1: "Envie um link para um amigo", st1s: "Quem aceitar primeiro joga contra você.", st2: "Vocês jogam as mesmas 5 rodadas", st2s: "Da mais fácil à mais difícil, cada um quando quiser em até 24 horas.", st3: "Em cada rodada vence a maior pontuação", st3s: "Quem vencer mais rodadas vence o duelo. Não conta para o seu rating.", heroTitle: "Desafie um amigo para um duelo", statW: "Vitórias", statL: "Derrotas", statO: "Em andamento", copy: "Copiar", linkAria: "Seu link de duelo", yourRounds: "Suas rodadas", waitDetail: (n, k) => `${n} jogou ${k} de 5. Você verá o resto quando continuar jogando.`, exit: "Jaardle", duelTitle: "Duelo", roundN: (r) => `Rodada ${r}/5`, you: "Você", played5: (k) => `${k}/5 jogadas`, busy: "em andamento", final: "placar final", login: "Já tem conta? Entrar", keepTitle: "Guarde seus duelos em todos os seus aparelhos", keepBtn: "Criar uma conta", h2hNow: (a, b) => `agora no total ${a}–${b}`,
      title: "Duelos", close: "Fechar", newBtn: "Desafie um amigo", nameLabel: "Seu nome (seu adversário vai ver)", namePh: "Nome", go: "Desafiar",
      ready: "Seu desafio está pronto", sent: "Link enviado", copied: "Link copiado", sentSub: "Quem aceitar primeiro joga contra você.", onlyFor: (n) => `Só ${n} pode aceitar.`, rematchFor: (n) => `Revanche para ${n}`,  sendLink: "Enviar o link",
      copyPrompt: "Copie o link:", empty: "Ainda não há duelos. Desafie alguém: vocês jogam as mesmas 5 rodadas e em cada rodada vence a maior pontuação.",
      loading: "Carregando…", err: "Não deu certo. Tente de novo.", retry: "Tentar de novo",
      errMax: "Você já tem 3 convites em aberto. Espere alguém aceitar ou retire um.", errName: "Preencha seu nome primeiro.",
      secTurn: "Sua vez", secWait: "Aguardando", secDone: "Encerrados",
      left: (h, m) => (h >= 1 ? `faltam ${h} h` : `faltam ${m} min`),
      accepted: (n) => `${n} aceitou`, oppDone: (n) => `${n} terminou`, oppPlays: (n, k) => `${n} está jogando · ${k}/5`, oppNotYet: (n) => `${n} ainda não começou`,
      yourLink: "Seu link", linkLeft: (l) => `${l} para aceitar`, resend: "Enviar de novo", withdraw: "Retirar", play: "Jogar",
      h2h: (a, b) => `no total ${a}–${b}`, won: (a, b) => `venceu ${a}–${b}`, lost: (a, b) => `perdeu ${a}–${b}`, drawn: (a, b) => `empate ${a}–${b}`,
      nobody: "Ninguém aceitou", declined: (n) => `${n} recusou`, withdrawn: "Retirado", gone: "Expirado",
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

  // ── rondjes: je flair (met een account) of de beginletter ──
  function avHtml(flair, name, cls = "") {
    const f = flair && H?.flairHtml ? H.flairHtml(flair) : "";
    return `<span class="dl-av${cls}${f ? " fl" : ""}" aria-hidden="true">${f || esc(initial(name))}</span>`;
  }
  const meAv = (T, cls = " me") => avHtml(H?.loggedIn ? H.myFlair?.() : null, myName() || T.you, cls);

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

  // ── rpc met nette fouten ──
  async function call(fn, args) {
    try {
      if (H.ready) await H.ready();   // bij een link of het stipje vlak na het laden: wacht tot de verbinding met de server er is
      return { ok: true, v: await H.rpc(fn, { p_client: H.clientId(), ...args }) };
    } catch (e) { return { ok: false, e: String(e?.message || e) }; }
  }

  // ════ een ronde spelen ════
  async function play(host, code, d) {
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
    const p = d.rounds[r];
    ["modal-duels", "modal-duel-pop", "modal-duel-end"].forEach((id) => { const el = document.getElementById(id); if (el && !el.hidden) H.closeModal(id); });
    await H.startRound({
      mode: "free", hashes: p.hashes, event: H.toEvent(p), board: H.duelBoard?.(d.code, r) || null, potId: `d${d.code}${r}`, shared: true,
      duel: { code: d.code, round: r, opp: oppName(d), deadline: d.deadline },
    });
  }

  // Het duelscherm (zolang state.duel): de duelkop in plaats van de tabbladen (‹ Jaardle · ⚔️ DUEL · ronde), de VS-kop boven
  // het feit, en de duelkleur (body[data-arena]). Zonder duel: alles weer weg.
  let vsFetching = null;
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
    const r = await call("duel_submit", { p_code: dl.code, p_round: dl.round, p_score: H.score() });
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
      const after = H.dailyDone() ? { kind: "free", html: esc(H.t("next")) } : { kind: "daily", html: esc(T.toDaily) };
      setButtons(after, { kind: "turn", d, label: T.tell(opp) });
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
  function showEndPop(T, d, { flip = false, fresh = false, wonLast = false } = {}) {
    ensureCss();
    document.getElementById("modal-duel-end")?.remove();
    const opp = oppName(d), mine = d.mine || [], theirs = d.theirs || [], done = d.status === "done";
    const o = outcome(mine, theirs), s = stand(mine, theirs), af = flip ? " after" : "";
    let inner = `<p class="ep-eyebrow">${ICON} ${esc(T.duelWith(opp))}</p>`;
    if (done) {
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
        `<p class="ep-note">${esc(T.waitNote(opp, leftText(T, d.deadline)))}</p>` +
        `<div class="ep-btns"><button type="button" class="duel-btn" data-act="share-turn">${esc(T.tell(opp))}</button>` +
        `<button type="button" class="ep-ghost" data-act="end-next">${endNext ? endNext.html : esc(T.toDaily)}</button></div>`;
    }
    if (!H.loggedIn) inner += `<div class="ep-keep${af}"><span>${esc(T.keepTitle)}</span><button type="button" class="dl-mini" data-act="login">${esc(T.keepBtn)}</button></div>`;
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
      if (act === "end-next") { close(); return next(H); }
      if (act === "login") { gc("duel-login-end", "Duel: create account from result"); close(); return H.openLogin?.(); }
    });
    H.openModal("modal-duel-end");
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
      if (o.res === "w" && !(fresh && wonLast)) H.showConfetti();   // gewonnen: feest (had de laatste ronde al confetti, dan niet nog eens)
      if (!d.seen) markSeen(d.code);
    }, flip && !reduced ? FLIP_MS : 0);
  }

  function next(host) {
    H = host;
    const m = endNext;
    if (!m) return H.newFree();
    if (m.kind === "round" || m.kind === "duel") return play(H, m.code);
    if (m.kind === "rematch") return create(H, { rematch: m.code });
    if (m.kind === "daily") return H.switchMode("daily");
    return H.newFree();
  }

  function share(host, btn, what) {
    H = host;
    const T = tx(H.lang), s = what || endShare;
    if (!s) return;
    if (s.kind === "turn") { gc("duel-tell", "Duel: let opponent know"); return shareText(T, T.shTurn(oppName(s.d)), LINK(s.d.code), btn); }
    if (s.kind === "result") {
      gc("duel-share-result", "Duel: share result");
      const o = outcome(s.d.mine, s.d.theirs);
      return shareText(T, `${T.shResult(oppName(s.d), o.w, o.l, o.res)}\n${squares(o)} · ${T.shTotals(o.a, o.b)}`, null, btn);
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
    applyList(r.v);
    let pop = null;
    if (opts.focus) {
      const d = listItems.find((x) => x.code === opts.focus);
      if (d && d.status === "done") { openGrp = d.opp || oppName(d); selInGrp[openGrp] = d.code; if (!d.seen) pop = d; }
      else if (d && d.status === "active") openWait.add(d.code);
    }
    renderList(T, null);
    if (pop) showEndPop(T, pop, { flip: true });
  }

  function applyList(v) {
    listItems = v?.items || [];
    setNews(v?.news || 0);
    // Op dit toestel onthouden wat nog nieuws kan brengen; de rest valt eraf (dan kijkt het laden niet meer).
    writeJson(LIST_KEY, listItems.filter((d) => d.status === "open" || d.status === "active" || (d.status === "done" && !d.seen))
      .map((d) => ({ c: d.code, u: Date.parse(d.deadline || "") || Date.now() })));
    for (const d of listItems) if (cache[d.code]) keep(d);
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
    if (known.length) {   // je stand: gewonnen, verloren, lopend (zodra je een uitslag zag; een ongeziene telt nog niet mee)
      let w = 0, l = 0;
      for (const d of known) { const o = outcome(d.mine, d.theirs); if (o.res === "w") w++; else if (o.res === "l") l++; }
      const run = items.filter((d) => d.status === "active" || (d.status === "open" && d.me === "c")).length;
      h += `<div class="dl-stats"><div class="dl-stat w"><b>${w}</b><small>${esc(T.statW)}</small></div><div class="dl-stat l"><b>${l}</b><small>${esc(T.statL)}</small></div>` +
        `<div class="dl-stat"><b>${run}</b><small>${esc(T.statO)}</small></div></div>`;
    }
    h += top + err;
    const turn = items.filter((d) => d.status === "active" && (d.mine || []).length < 5)
      .sort((a, b) => Date.parse(a.deadline) - Date.parse(b.deadline));
    const wait = items.filter((d) => (d.status === "open" && d.me === "c") || (d.status === "active" && (d.mine || []).length >= 5));
    const recent = (d) => Date.now() - Date.parse(d.created_at) < 3 * 864e5;
    const gone = items.filter((d) => d.me === "c" && ["expired", "withdrawn", "declined"].includes(d.status) && recent(d)).slice(0, 3);
    const h2hTxt = (d) => { const [a, b] = h2hOf(items, d.opp || oppName(d)); return a || b ? T.h2h(a, b) : ""; };
    if (turn.length) {
      h += `<h3 class="dl-h">${esc(T.secTurn)}${turn.length > 1 ? ` · ${turn.length}` : ""}</h3>`;
      for (const d of turn) {
        const n = oppName(d), k = d.their_done || 0;
        const who = k >= 5 ? T.oppDone(n) : k > 0 ? T.oppPlays(n, k) : d.me === "c" ? T.accepted(n) : T.oppNotYet(n);   // "nam aan" alleen als jij uitdaagde
        h += rowHtml({ av: avHtml(oppFlair(d), n), name: n, h2h: h2hTxt(d), sub: `${esc(who)} · <em>${esc(leftText(T, d.deadline))}</em>`, cls: " turn",
          right: `<button type="button" class="dl-go" data-act="play" data-code="${d.code}">${esc(T.play)}</button>` });
      }
    }
    if (!top.startsWith("<form")) h += newBtn;   // met het naamveld open is "Daag uit" de knop
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
        const sub = d.status === "declined" ? T.declined(d.o_name || "?") : d.status === "withdrawn" ? T.withdrawn : T.nobody;
        h += rowHtml({ av: qAv, name: T.yourLink, sub: esc(sub), cls: " dim", right: `<span class="dl-res">${esc(T.gone)}</span>` });
      }
    }
    return h;
  }

  // Je openstaande link: opnieuw sturen, intrekken, en de link zelf (te selecteren, Kopieer).
  function openLinkHtml(T, d) {
    return rowHtml({ av: d.for_name ? avHtml(null, d.for_name) : qAv, name: d.for_name ? T.rematchFor(d.for_name) : T.yourLink,
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
    const sel = known.find((d) => d.code === selInGrp[g.k]) || known[0];
    const news = g.ds.some((d) => !d.seen);
    const sub = unrevealed(latest) ? T.revealTap : `${cap(whenText(T, latest.finished_at))}: ${resText(T, outcome(latest.mine, latest.theirs))}`;
    const rec = known.length ? `<span class="dl-rec"><span class="dl-form" aria-hidden="true">${form.map((r) => `<i class="${r}"></i>`).join("")}</span><b>${a}–${b}</b></span>` : "";
    const row = `<div class="dl-row${news ? " has-new" : ""}" data-grp="${esc(g.k)}" role="button" tabindex="0" aria-expanded="${isOpen}">` +
      `${avHtml(oppFlair(latest), n)}<span class="dl-main"><b>${esc(n)}</b><small>${esc(sub)}</small></span>` +
      `${rec}<span class="dl-chev" aria-hidden="true">▾</span></div>`;
    let det = "";
    if (isOpen && sel) {
      const so = outcome(sel.mine, sel.theirs);
      det = `<div class="dl-detail"><div class="duel-card"><div class="duel-head"><b>${esc(cap(whenText(T, sel.finished_at)))}, ${esc(clockText(sel.finished_at))}</b>` +
        `<span class="duel-r">${esc(T.total(so.a, so.b))}</span></div>` + tilesHtml(sel) +
        `<span class="duel-verdict">${esc(verdict(T, so, n))}</span></div>` +
        (known.length > 1 ? `<div class="dl-past">${known.slice(0, 6).map((d) => { const o = outcome(d.mine, d.theirs);
          return `<button type="button" data-sel="${d.code}" data-grp-of="${esc(g.k)}" aria-pressed="${d.code === sel.code}"><span>${esc(cap(whenText(T, d.finished_at)))}</span><span class="dl-res ${o.res}">${esc(resText(T, o))}</span></button>`; }).join("")}</div>` : "") +
        `<button type="button" class="dl-mini dl-rev" data-act="rematch" data-code="${sel.code}">${icoHtml()} ${esc(T.revenge)}</button></div>`;
    }
    return `<div class="dl-item${isOpen ? " open" : ""}" data-sel="${(sel || latest).code}">${row}${det}</div>`;
  }

  function onListClick(e) {
    const T = tx(H.lang);
    const b = e.target.closest("[data-act], [data-grp], [data-wait], [data-sel][data-grp-of]");
    if (!b) return;
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
    if (act === "new") return create(H, {});
    if (act === "help") { helpOpen = !helpOpen; if (helpOpen) gc("duel-help", "Duel: how it works"); return renderList(T, null); }
    if (act === "reload") return openList(H, { keepTop: true });
    if (act === "more") { showAll = true; return renderList(T, null); }
    if (act === "play") return play(H, code);
    if (act === "rematch") return create(H, { rematch: code });
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
      call("duel_withdraw", { p_code: code }).then(() => openList(H, { keepTop: true }));
    }
  }
  function onListSubmit(e) {
    const f = e.target.closest(".dl-name");
    if (!f) return;
    e.preventDefault();
    const inp = f.querySelector("input"), n = cleanName(inp.value);
    if (!n) { inp.setAttribute("aria-invalid", "true"); inp.focus(); return; }
    saveName(n);
    create(H, { rematch: f.dataset.rematch || null });
  }

  // Nieuwe uitdaging of revanche: naam (zonder account één keer vragen), aanmaken, dan meteen delen; de link blijft zichtbaar.
  async function create(host, { rematch = null } = {}) {
    H = host;
    const T = tx(H.lang);
    if (H.loggedIn) await H.ensureIdentity?.().catch?.(() => {});
    const name = myName();
    if (!name) {
      listTop = `<form class="dl-name"${rematch ? ` data-rematch="${esc(rematch)}"` : ""}><label for="duel-name-new">${esc(T.nameLabel)}</label>` +
        `<div><input id="duel-name-new" maxlength="20" autocomplete="nickname" placeholder="${esc(T.namePh)}"><button type="submit">${esc(T.go)}</button></div></form>`;
      await openList(H, { keepTop: true });
      document.getElementById("duel-name-new")?.focus();
      return;
    }
    listTop = `<p class="dl-msg">${esc(T.loading)}</p>`;
    const opened = openList(H, { keepTop: true });
    const r = await call("duel_create", { p_name: name, p_rematch: rematch });
    if (!r.ok) {
      listTop = `<p class="dl-msg duel-err">${esc(/too_many_open/.test(r.e) ? T.errMax : /name/.test(r.e) ? T.errName : T.err)}</p>`;
      await opened;
      renderList(T, null);
      return;
    }
    const d = keep(r.v);
    remember(d.code, d.deadline);
    gc(rematch ? "duel-rematch" : "duel-create", rematch ? "Duel: rematch created" : "Duel: challenge created");
    const how = await shareText(T, (rematch ? T.shRematch : T.shInvite)(d.c_name), LINK(d.code), null);
    gc("duel-invite-" + how, "Duel: invite " + how);   // shared / copied / abort / prompt
    const head = how === "shared" ? T.sent : how === "copied" ? T.copied : T.ready;
    const sub = d.for_name ? T.onlyFor(d.for_name) : T.sentSub;
    listTop = `<div class="dl-sent"><b>✓ ${esc(head)}</b><span>${esc(sub)}</span>${linkField(T, d.code)}` +
      (how === "shared" || how === "copied" ? "" : `<button type="button" class="dl-mini" data-act="send" data-code="${d.code}">${esc(T.sendLink)}</button>`) + `</div>`;
    await opened;
    openList(H, { keepTop: true });
  }

  // ════ een ?duel=CODE-link ════
  async function openInvite(host, raw) {
    H = host;
    ensureCss();
    const T = tx(H.lang), code = String(raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (H.loggedIn) await H.ensureIdentity?.().catch?.(() => {});
    const r = await call("duel_get", { p_code: code });
    if (!r.ok) return showPop(T, `<p>${esc(T.err)}</p>`, null);
    const d = r.v;
    if (d && d.me && (d.status === "active" || d.status === "done")) {
      keep(d); remember(d.code, d.deadline);
      if (d.status === "active" && (d.mine || []).length < 5) return play(H, d.code, d);
      return openList(H, { focus: d.code });
    }
    const kind = !d ? "notfound" : d.me === "c" ? "own" : d.can_accept ? "open" : d.status === "active" || d.status === "done" ? "taken" : "closed";
    gc("duel-link-" + kind, "Duel: link opened (" + kind + ")");
    showPop(T, popBody(T, d), d);
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
      return `${icoHtml()}<h2>${fl ? fl + " " : ""}${esc((d.rematch ? T.invRematch : T.invTitle)(c))}</h2><ul><li>${T.inv1}</li><li>${T.inv2}</li><li>${T.inv3}</li></ul>` +
        (needName ? `<label for="duel-name-acc">${esc(T.invName(c))}<input id="duel-name-acc" maxlength="20" autocomplete="nickname" placeholder="${esc(T.namePh)}" value="${esc(storedName() || "")}"></label>` : "") +
        `<button type="button" class="duel-go" data-act="accept" data-code="${d.code}">${esc(T.accept)}</button>` +
        `<button type="button" class="duel-no" data-act="decline" data-code="${d.code}">${esc(T.decline)}</button>` +
        `<p class="duel-fine">${esc(cap(T.invFine(leftText(T, d.deadline))))}</p>` +
        (H.loggedIn ? "" : `<button type="button" class="duel-no duel-login" data-act="login" data-code="${d.code}">${esc(T.login)}</button>`);
    }
    if (d.status === "open") return `${icoHtml()}<h2>${esc(T.notForYou)}</h2>${anyBtn}`;
    if (d.status === "active" || d.status === "done") return `${icoHtml()}<h2>${esc(T.taken(d.o_name || "?"))}</h2>${anyBtn}`;
    const again = `<button type="button" class="duel-go" data-act="new">${esc(T.challengeX(c))}</button>`;
    if (d.status === "withdrawn") return `${icoHtml()}<h2>${esc(T.closedWd)}</h2>${again}`;
    if (d.status === "declined") return `${icoHtml()}<h2>${esc(T.closedDecl)}</h2>${anyBtn}`;
    return `${icoHtml()}<h2>${esc(T.closedExp)}</h2>${again}`;
  }

  function showPop(T, inner, d) {
    document.getElementById("modal-duel-pop")?.remove();
    const el = document.createElement("div");
    el.id = "modal-duel-pop";
    el.className = "modal";
    el.hidden = true;
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "duel-pop-title");
    el.innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal-card duel-pop">` +
      `<button type="button" class="modal-close" data-close aria-label="${esc(T.close)}">✕</button><section class="duel-inv">${inner}</section></div>`;
    el.querySelector("h2")?.setAttribute("id", "duel-pop-title");
    document.body.appendChild(el);
    el.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => H.closeModal("modal-duel-pop")));
    el.addEventListener("click", (e) => onPopClick(e, d));
    H.openModal("modal-duel-pop");
  }

  async function onPopClick(e, d) {
    const T = tx(H.lang), b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act, code = b.dataset.code;
    if (act === "new") { H.closeModal("modal-duel-pop"); return create(H, {}); }
    if (act === "send") return shareText(T, (d?.rematch ? T.shRematch : T.shInvite)(d?.c_name || ""), LINK(code), b);
    if (act === "login") {   // na het inloggen (ook na Google) komt deze uitnodiging terug: zie duelsAfterLogin in game.js
      gc("duel-login-invite", "Duel: log in from invite");
      writeJson(PENDING_KEY, { code, at: Date.now() });
      H.closeModal("modal-duel-pop");
      return H.openLogin?.();
    }
    const inp = document.getElementById("duel-name-acc");
    const name = inp ? cleanName(inp.value) : myName();
    if (act === "decline") {
      b.disabled = true;
      gc("duel-decline", "Duel: declined");
      await call("duel_decline", { p_code: code, p_name: name || null });
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
        const box = document.querySelector("#modal-duel-pop .duel-inv");
        if (box) box.innerHTML = g.ok ? popBody(T, g.v) : `<p class="duel-err">${esc(T.err)}</p>`;
        return;
      }
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
    if (r.ok) applyList(r.v);
  }

  return {
    openList, openInvite, play, sync, roundDone, next, share, checkNews,
    css: CSS, copy: (l) => tx(l), langs: () => Object.keys(TXT),
    _: { outcome, stand, tilesHtml, leftText, groupsOf, popBody, LINK, h2hOf, vsInner, listBody, setHost: (h) => { H = h; } },   // voor de tests
  };
})();
