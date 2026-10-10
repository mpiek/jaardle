/* Event-UI (lui geladen, ~12 KB gzip): de balk boven de feitenkaart, de strook op het eindscherm, de stempelkaart, het Events-scherm en
   het archief van een event (EVENTS in game.js), plus de teksten in vijf talen en de kleuren per event. game.js haalt dit bestand (±12 KB gzip) pas op
   zodra er een event in beeld is (of de kluis een Events-tab heeft), dus op gewone dagen wordt het nooit geladen.
   De functies hier zijn puur: ze krijgen een "view" (de stand van het event, gebouwd door eventView() in game.js) en geven HTML terug;
   het bedraden van tikken en knoppen (data-ev-open, data-ev-act, …) doet game.js. Een nieuw event toevoegen = een blok in EVENT_UI
   (teksten ×5 en het plaatje van het zegel; de mascotte staat in EVENTS) + een tokens-blok in de CSS hieronder ([data-ev="<id>"]). */
window.SeasonEvent = (() => {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = String.raw`/* ═══ Event-UI (EVENTS in game.js): balk, strook, stempelkaart, Events-scherm, archief ═══════════════════════════════════════════
   Alles is generiek; de kleur en het stempel-plaatje komen per event uit de tokens hieronder ([data-ev="<id>"]). Een nieuw event =
   een blok met tokens erbij (+ het licht-thema-blok). Alle onderdelen dragen data-ev zodat de tokens erbij komen. */
[data-ev] { --ev-gift: url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 96 96%22 %3E%3Cpath fill-rule=%22evenodd%22 d=%22M12 38h72v14H12Z M16 52h64v36H16ZM43 38h10v50H43Z%22/%3E%3Cpath d=%22M48 38C40 24 26 22 27 31C28 38 40 38 48 38C56 38 68 38 69 31C70 22 56 24 48 38Z%22/%3E%3C/svg%3E"); --ev-ok: #6fd08c; }
html[data-theme="light"] [data-ev], html[data-theme="parchment"] [data-ev] { --ev-ok: #2c7031; }
/* Spooktober: pompoen-oranje, los van het accent (zodat het ook ná het event in het gewone thema hetzelfde oogt) */
[data-ev="spook"] { --ev-pk: #ff8f2a; --ev-pk-ink: #1f1000; --ev-pk-soft: rgba(255, 143, 42, 0.15); --ev-stamp: url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 96 84%22 %3E%3Cdefs%3E%3Cmask id=%22m%22%3E%3Crect width=%2296%22 height=%2284%22 fill=%22%23fff%22/%3E%3Cg fill=%22%23000%22%3E%3Cpath d=%22M28 52L36 38L44 52Z%22/%3E%3Cpath d=%22M52 52L60 38L68 52Z%22/%3E%3Cpath d=%22M44 58H52L48 64Z%22/%3E%3Cpath d=%22M25 62L33 68L37 63L43 70L48 65L53 70L59 63L63 68L71 62C69 74 60 80 48 80C36 80 27 74 25 62Z%22/%3E%3C/g%3E%3C/mask%3E%3C/defs%3E%3Cg mask=%22url(%23m)%22%3E%3Cellipse cx=%2248%22 cy=%2249%22 rx=%2230%22 ry=%2229%22/%3E%3Cellipse cx=%2229%22 cy=%2251%22 rx=%2220%22 ry=%2226%22/%3E%3Cellipse cx=%2267%22 cy=%2251%22 rx=%2220%22 ry=%2226%22/%3E%3Cpath d=%22M43 24C43 15 47 10 53 8L57 13C54 15 53 19 53 24Z%22/%3E%3C/g%3E%3C/svg%3E"); }
html[data-theme="light"] [data-ev="spook"], html[data-theme="parchment"] [data-ev="spook"] { --ev-pk: #c25a00; --ev-pk-ink: #fff; --ev-pk-soft: rgba(194, 90, 0, 0.12); }

/* ── de balk boven de feitenkaart: de aankondiging; tikken opent het Events-scherm ── */
.ev-bar { display: flex; align-items: center; gap: 0.55rem; width: 100%; margin: 0 0 0.5rem; padding: 0.35rem 0.7rem; text-align: left; font: inherit; font-size: 0.85rem; font-weight: 500; line-height: 1.25;
  color: var(--fg); background: color-mix(in srgb, var(--ev-pk) 9%, var(--card)); border: 1px solid color-mix(in srgb, var(--ev-pk) 40%, var(--border)); border-radius: 12px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.ev-bar:hover { background: color-mix(in srgb, var(--ev-pk) 15%, var(--card)); }
.ev-bar.slim { padding-block: 0.15rem; font-size: 0.8rem; color: var(--muted); }
.ev-bar[hidden] { display: none; }
.ev-bar .cat-head, .evs .cat-head, .menu-item .cat-head { flex: none; width: 30px; height: 30px; filter: drop-shadow(0 0 1px rgba(205, 170, 255, 0.9)); }
.ev-bar.slim .cat-head { width: 24px; height: 24px; }
.menu-item .cat-head { width: 20px; height: 18px; vertical-align: -3px; margin-right: 0.35rem; }
.ev-bar .ev-ico { flex: none; font-size: 1.3rem; line-height: 1; }
.ev-bar .ev-bt { flex: 1; min-width: 0; }
.ev-bar .ev-bt small { display: block; color: var(--muted); font-size: 0.75rem; font-weight: 400; }
.ev-bar .ev-chev { flex: none; color: var(--ev-pk); font-size: 1.2rem; line-height: 1; }

/* ── stempelkaart: de dagen als ronde vakjes; de drempels zijn cadeau-vakjes die opengaan en de beloning laten zien ── */
.evp { display: grid; grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr)); gap: 0.6rem calc(2.2rem / var(--cols, 4)); justify-items: center; padding: 0.15rem 0; }
.evp-s { position: relative; display: grid; place-items: center; width: min(100%, 3.7rem); aspect-ratio: 1; border-radius: 50%; border: 2px dashed color-mix(in srgb, var(--muted) 50%, transparent); box-sizing: border-box; font-style: normal; color: var(--muted); container-type: inline-size; }
.evp-no { position: absolute; font-size: 0.62rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.evp-s:not(.rw) .evp-no { opacity: 0.8; }
.evp-s.on { border-style: solid; border-color: var(--ev-pk); background: var(--ev-pk-soft); }
.evp-s.on:not(.rw)::before { content: ""; width: 62%; height: 62%; background: var(--ev-pk); -webkit-mask: var(--ev-stamp) center / contain no-repeat; mask: var(--ev-stamp) center / contain no-repeat; }
.evp-s.on:not(.rw) .evp-no { display: none; }
.evp-s.nextup { border-color: var(--ev-pk); }
.evp-s.rw { border-color: color-mix(in srgb, var(--achv-gold) 65%, transparent); }
.evp-s.rw .evp-no { right: 0.05rem; bottom: -0.1rem; width: 1.05rem; height: 1.05rem; border-radius: 50%; background: var(--card); border: 1px solid var(--border); display: grid; place-items: center; font-size: 0.58rem; color: var(--fg); }
.evp-gf { width: 52%; height: 52%; background: var(--achv-gold); -webkit-mask: var(--ev-gift) center / contain no-repeat; mask: var(--ev-gift) center / contain no-repeat; opacity: 0.85; }
.evp-s.rw.on { border-style: solid; border-color: var(--achv-gold); background: color-mix(in srgb, var(--achv-gold) 16%, transparent); box-shadow: 0 0 0.9rem -0.2rem color-mix(in srgb, var(--achv-gold) 70%, transparent); }
.evp-ic { font-size: 1.55rem; font-size: min(1.55rem, 60cqw); line-height: 1; font-weight: 400; }
@container (max-width: 34px) { .evp-s.rw .evp-no { display: none; } }   /* smalle vakjes (7 kolommen op een telefoon): alleen het icoon, het getal staat in de lijst eronder */
.evp-s.gift::after { content: ""; position: absolute; top: -0.12rem; right: -0.12rem; width: 1.05rem; width: min(1.05rem, 46cqw); height: 1.05rem; height: min(1.05rem, 46cqw); border-radius: 50%; background-color: var(--achv-gold); -webkit-mask: var(--ev-gift) center / 64% no-repeat; mask: var(--ev-gift) center / 64% no-repeat; }
.evp-s.gift0 { border-color: color-mix(in srgb, var(--achv-gold) 70%, transparent); }
/* het nieuwste stempel landt één keer */
.evc.arrive .evp-s.new { animation: ev-pop 0.7s cubic-bezier(0.2, 1.5, 0.4, 1) 0.3s both; }

/* ── compacte strook onder de wereldstatistiek van het eindscherm: de dagen als puntjes + de drempels, één tekstregel ── */
.evs { appearance: none; display: block; width: 100%; text-align: left; font: inherit; color: var(--fg); background: var(--card-soft); border: 1px solid var(--border); border-radius: 12px; padding: 0.5rem 0.7rem 0.55rem; margin: 0.2rem 0 0.8rem; cursor: pointer; -webkit-tap-highlight-color: transparent; position: relative; }
.evs:hover { border-color: color-mix(in srgb, var(--ev-pk) 45%, var(--border)); }
.evs-top { display: flex; align-items: center; gap: 0.45rem; font-size: 0.82rem; }
.evs-ico { font-size: 1.05rem; line-height: 1; }
.evs-top b { font-weight: 700; }
.evs-n { margin-left: auto; color: var(--muted); font-variant-numeric: tabular-nums; font-size: 0.78rem; }
.evs-go { color: var(--muted); font-size: 1.05rem; line-height: 1; }
.evs-pips { display: grid; grid-template-columns: repeat(var(--n, 12), minmax(0, 1fr)); gap: 0.18rem; margin-top: 0.42rem; align-items: center; }
.evs-pip { height: 0.46rem; border-radius: 3px; background: var(--penalty-tint); position: relative; }
.evs-pip.on { background: var(--ev-pk); }
.evs-pip.rw { height: 0.9rem; border-radius: 50%; width: 0.9rem; justify-self: center; background: var(--card); box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--achv-gold) 60%, transparent); }
.evs-pip.rw.on { background: var(--achv-gold); box-shadow: 0 0 0.5rem -0.1rem var(--achv-gold); }
.evs-next { display: block; margin-top: 0.4rem; font-size: 0.72rem; color: var(--muted); line-height: 1.3; }
.evs-note { display: block; margin-top: 0.35rem; font-size: 0.68rem; color: var(--muted); }
.evs-hookline { display: block; margin-top: 0.4rem; font-size: 0.72rem; font-weight: 700; color: var(--ev-pk); line-height: 1.35; }
.evs.quiet .evs-pips { display: none; }
.evs.arrive .evs-pip.new { animation: ev-pop 0.7s cubic-bezier(0.2, 1.5, 0.4, 1) 0.25s both; }
.evs.arrive .evs-pip.new::after { content: ""; position: absolute; inset: -0.2rem; border-radius: 50%; border: 2px solid var(--ev-pk); opacity: 0; animation: ev-ring 0.8s ease-out 0.45s both; }
.evs.arrive .evs-num { animation: ev-bump 0.5s ease-out 0.35s both; display: inline-block; }
@keyframes ev-pop { 0% { transform: scale(0); } 55% { transform: scale(1.5); } 100% { transform: scale(1); } }
@keyframes ev-ring { 0% { transform: scale(0.6); opacity: 0.9; } 100% { transform: scale(2.2); opacity: 0; } }
@keyframes ev-bump { 0% { transform: translateY(0.45em); opacity: 0; } 100% { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .evs.arrive .evs-pip.new, .evs.arrive .evs-num, .evs.arrive .evs-pip.new::after, .evc.arrive .evp-s.new { animation: none; } }

/* ── Events in de kluis (🪎): tab met stip, kop met kaart, beloningen-rijen, archief ── */
.rc-tab.has-new::after { content: ""; display: inline-block; width: 6px; height: 6px; margin-left: 0.3rem; border-radius: 50%; background: var(--achv-new); vertical-align: 0.5em; }
.rc-tabs.n5 { gap: 0.28rem; }
.rc-tabs.n5 .rc-tab { font-size: 0.6rem; letter-spacing: 0; white-space: nowrap; }
.rc-tabs.n5 .rc-sep { display: none; }
.ev-hero { position: relative; background: var(--card-soft); border: 1px solid var(--border); border-radius: 14px; padding: 0.8rem 0.8rem 0.75rem; }
.ev-head { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.8rem; }
.ev-ico { font-size: 1.75rem; line-height: 1; }
.ev-head .cat-head { flex: none; width: 36px; height: 36px; filter: drop-shadow(0 0 1px rgba(205, 170, 255, 0.9)); }
.ev-ttl { flex: 1; min-width: 0; }
.ev-ttl b { display: block; font-size: 1.05rem; letter-spacing: 0.01em; line-height: 1.15; }
.ev-ttl span { display: block; margin-top: 0.12rem; font-size: 0.76rem; color: var(--muted); }
.ev-count { font-size: 1.45rem; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ev-count small { font-size: 0.8rem; font-weight: 600; color: var(--muted); margin-left: 0.1rem; }
.ev-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 0.55rem; margin: 0.7rem 0 0; font-size: 0.72rem; color: var(--muted); line-height: 1.35; }
.ev-chip { appearance: none; font: inherit; font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; white-space: nowrap; border: 1px solid color-mix(in srgb, var(--ev-ok) 55%, transparent); color: var(--ev-ok); background: color-mix(in srgb, var(--ev-ok) 12%, transparent); }
button.ev-chip { cursor: pointer; border-color: var(--ev-pk); color: var(--ev-pk); background: var(--ev-pk-soft); }
.ev-gift { display: inline-flex; align-items: center; gap: 0.3rem; }
.ev-gift::before { content: ""; width: 0.95rem; height: 0.95rem; background: var(--achv-gold); -webkit-mask: var(--ev-gift) center / contain no-repeat; mask: var(--ev-gift) center / contain no-repeat; flex: none; }
.ev-sect + .rw-sect { margin-top: 1.3rem; }
.ev-list { display: flex; flex-direction: column; gap: 0.45rem; }
.ev-row { display: grid; grid-template-columns: 2.7rem minmax(0, 1fr) auto; gap: 0.65rem; align-items: center; padding: 0.5rem 0.6rem; background: var(--card-soft); border: 1px solid var(--border); border-radius: 12px; }
.ev-row.lock { opacity: 0.68; }
.ev-row.next { border-color: color-mix(in srgb, var(--ev-pk) 55%, var(--border)); box-shadow: 0 0 0 1px color-mix(in srgb, var(--ev-pk) 30%, transparent); }
.ev-prev { position: relative; width: 2.7rem; height: 2.7rem; border-radius: 10px; background: var(--card); border: 1px solid var(--border); display: grid; place-items: center; font-size: 1.5rem; line-height: 1; overflow: hidden; }
.ev-prev .fl-fx { font-size: 1.5rem; }
.ev-prev.fx { overflow: visible; }
.ev-prev.seal { overflow: visible; background: none; border: 0; }
.ev-prev.seal .ev-ring, .ev-prev.seal .achv-tring { display: block; margin: 0; width: 2.7rem; height: 2.7rem; }   /* .achv-tring is van zichzelf inline: dan tekent de box-shadow-ring maar losse stukjes */
.ev-tx { min-width: 0; }
.ev-nm { display: block; font-size: 0.88rem; font-weight: 700; line-height: 1.2; }
.ev-sb { display: block; margin-top: 0.12rem; font-size: 0.74rem; color: var(--muted); line-height: 1.25; }
.ev-sb .ok { color: var(--ev-ok); font-weight: 700; }
.ev-sb .go { color: var(--ev-pk); font-weight: 700; }
.ev-btn { appearance: none; font: inherit; font-size: 0.75rem; font-weight: 700; padding: 0.34rem 0.8rem; border-radius: 999px; white-space: nowrap; cursor: pointer; background: transparent; color: var(--ev-pk); border: 1px solid var(--ev-pk); -webkit-tap-highlight-color: transparent; }
.ev-btn:hover { background: var(--ev-pk-soft); }
.ev-btn[disabled] { opacity: 0.45; cursor: default; }
.ev-btn.on { cursor: default; border-color: transparent; color: var(--ev-ok); background: color-mix(in srgb, var(--ev-ok) 14%, transparent); }
.ev-hint { display: block; margin-top: 0.1rem; font-size: 0.7rem; color: var(--muted); }
.ev-lk { font-size: 0.95rem; color: var(--muted); opacity: 0.75; padding: 0 0.3rem; }
.ev-note { margin: 0.75rem 0.2rem 0; text-align: center; font-size: 0.76rem; color: var(--muted); line-height: 1.4; }
.ev-after { margin: 0.4rem 0.2rem 0; font-size: 0.76rem; color: var(--muted); line-height: 1.4; text-align: center; }
/* voorbeeld van de viering in de rij: pictogrammetjes vallen omlaag en zweven omhoog */
.ev-fxp { position: absolute; inset: 0; overflow: hidden; }
.ev-fxp b { position: absolute; top: -12px; font-size: 11px; font-weight: 400; animation: ev-fall 2.4s linear infinite; }
.ev-fxp b.up { top: auto; bottom: -14px; animation-name: ev-rise; }
@keyframes ev-fall { 0% { transform: translateY(0) rotate(0); opacity: 1; } 85% { opacity: 1; } 100% { transform: translateY(56px) rotate(300deg); opacity: 0; } }
@keyframes ev-rise { 0% { transform: translateY(0); opacity: 0; } 20% { opacity: 1; } 85% { opacity: 1; } 100% { transform: translateY(-56px); opacity: 0; } }
@keyframes rw-rise { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 1; } 85% { opacity: 1; } 100% { transform: translateY(-125px); opacity: 0; } }
.rw-fxp b.rw-up { top: auto; bottom: -18px; font-size: 16px; animation-name: rw-rise; }
.rw-tile .rw-fxp b.rw-up { animation-duration: 3s; }
@media (prefers-reduced-motion: reduce) { .ev-fxp b { animation: none; top: 14px; } .ev-fxp b.up { top: 22px; bottom: auto; } .rw-fxp b.rw-up { animation: none; top: 52px; bottom: auto; } }

/* haakje voor wie niet is ingelogd: de beloningen zijn publiek en dus alleen met een account te bewaren en te dragen */
.ev-hook { margin-top: 0.85rem; padding: 0.75rem 0.8rem 0.8rem; border-radius: 12px; border: 1px dashed color-mix(in srgb, var(--ev-pk) 55%, var(--border)); background: color-mix(in srgb, var(--ev-pk) 7%, transparent); text-align: center; }
.ev-hook p { margin: 0 0 0.6rem; font-size: 0.8rem; line-height: 1.4; }
.ev-hook .google-btn { margin: 0 auto; }
.ev-hook .link-btn { display: block; margin: 0.5rem auto 0; }

/* archief: wat je van eerdere events hebt */
.ev-arch { display: grid; grid-template-columns: 2.9rem minmax(0, 1fr); gap: 0.7rem; align-items: center; padding: 0.55rem 0.65rem; background: var(--card-soft); border: 1px solid var(--border); border-radius: 12px; }
.ev-arch + .ev-arch { margin-top: 0.45rem; }
.ev-arch .achv-tring { display: block; margin: 0; width: 2.9rem; height: 2.9rem; }
.ev-ring { display: block; width: 2.9rem; height: 2.9rem; }
.ev-got { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.35rem; }
.ev-got i { font-style: normal; font-size: 0.95rem; line-height: 1; padding: 0.18rem 0.4rem; border-radius: 8px; background: var(--card); border: 1px solid var(--border); }

/* pop-up: meerdere beloningen in één kaart (groep) en het haakje voor wie niet is ingelogd; de kaart is altijd donker (.rw-card) */
.rw-got { display: flex; flex-wrap: wrap; gap: 6px; justify-content: center; margin: 12px 0 0; }
.rw-got span { font-size: 0.74rem; font-weight: 600; padding: 0.22rem 0.6rem; border-radius: 999px; background: #ffffff14; color: #e3d6f2; white-space: nowrap; }
.rw-card .google-btn { margin: 0 auto; }
.rw-card .link-btn { color: #c1acdb; }
`;

  // ── teksten ──────────────────────────────────────────────────────────────────────────────────────────────────
  // Gedeeld door elk event: wat een stempelkaart, een beloning en een inhaaldag heet. (ES/PT/DE zelf vertaald: graag laten nalezen.)
  const SHARED = {
    nl: {
      left: (n) => (n <= 1 ? "laatste dag" : `nog ${n} dagen`), over: "Het event is voorbij", catchupUntil: (d) => `Inhalen kan nog t/m ${d}`,
      keep: "Wat je verdient blijft van jou, ook na het event.", count: (n, tot) => `${n} van ${tot}`, gift: "Cadeau: je eerste stempel staat er al op.",
      todayDone: "Vandaag binnen", todayOpen: "Speel de daily van vandaag", catchup: "Inhalen telt ook mee.", rewardsH: "Beloningen",
      at: (n) => `bij ${n}`, toGo: (n) => `nog ${n}`, wear: "Draag nu", turnOn: "Zet aan", worn: "Gedragen", on: "Aan",
      sealRow: "Zegel in Prestaties", sealFirst: (nm, at) => `${nm} bij ${at}`, sealNext: (have, nm, at) => `${have} · volgende: ${nm} bij ${at}`, sealTop: (have) => `${have} · het hoogste`, sealOf: (nm) => `${nm}-zegel`,
      archH: "Eerdere events", archLine: (n, tot) => `${n} van ${tot}`, lineNext: (k, nm) => `nog ${k} tot ${nm}`, lineDone: "Kaart compleet", allIn: "Alle beloningen binnen",
      anonLock: "Een gratis account bewaart je beloningen.", anonHook: "Bewaar je beloningen met een gratis account", google: "Doorgaan met Google", orMail: "of met e-mail",
      turnAllOn: "Alles aanzetten", needFlair: "Draag eerst een flair om je effect te zien.",
      afterNote: "Dit event is voorbij; je beloningen staan in de Flair- en Viering-tab.", achH: "Events", achSub: (n, tot) => `${n} van ${tot}`,
      lockedHint: "Dit lukt nog niet: je eerdere dagen staan nog niet op je account. Speel de daily van vandaag en probeer het opnieuw.", countsAnyway: "telt toch mee", popGroupTitle: (n) => `${n} beloningen vrijgespeeld`, barEvery: (i) => `Elke daily is een ${i}`,
    },
    en: {
      left: (n) => (n <= 1 ? "last day" : `${n} days left`), over: "The event is over", catchupUntil: (d) => `You can still catch up until ${d}`,
      keep: "What you earn is yours to keep, even after the event.", count: (n, tot) => `${n} of ${tot}`, gift: "Gift: your first stamp is already on the card.",
      todayDone: "Today's is in", todayOpen: "Play today's daily", catchup: "Catching up counts too.", rewardsH: "Rewards",
      at: (n) => `at ${n}`, toGo: (n) => `${n} to go`, wear: "Wear it now", turnOn: "Turn it on", worn: "Wearing", on: "On",
      sealRow: "Seal in Achievements", sealFirst: (nm, at) => `${nm} at ${at}`, sealNext: (have, nm, at) => `${have} · next: ${nm} at ${at}`, sealTop: (have) => `${have} · the highest`, sealOf: (nm) => `${nm} seal`,
      archH: "Past events", archLine: (n, tot) => `${n} of ${tot}`, lineNext: (k, nm) => `${k} to go for ${nm}`, lineDone: "Card complete", allIn: "All rewards earned",
      anonLock: "A free account keeps your rewards.", anonHook: "Keep your rewards with a free account", google: "Continue with Google", orMail: "or with email",
      turnAllOn: "Turn everything on", needFlair: "Wear a flair first to see your effect.",
      afterNote: "This event is over; your rewards are in the Flair and Party tabs.", achH: "Events", achSub: (n, tot) => `${n} of ${tot}`,
      lockedHint: "Not yet: your earlier days aren't on your account yet. Play today's daily and try again.", countsAnyway: "still counts", popGroupTitle: (n) => `${n} rewards unlocked`, barEvery: (i) => `Every daily is a ${i}`,
    },
    de: {
      left: (n) => (n <= 1 ? "letzter Tag" : `noch ${n} Tage`), over: "Das Event ist vorbei", catchupUntil: (d) => `Nachholen ist noch bis ${d} möglich`,
      keep: "Was du verdienst, bleibt dein – auch nach dem Event.", count: (n, tot) => `${n} von ${tot}`, gift: "Geschenk: dein erster Stempel ist schon drauf.",
      todayDone: "Heute geschafft", todayOpen: "Das heutige Daily spielen", catchup: "Nachholen zählt auch.", rewardsH: "Belohnungen",
      at: (n) => `bei ${n}`, toGo: (n) => `noch ${n}`, wear: "Jetzt tragen", turnOn: "Einschalten", worn: "Getragen", on: "An",
      sealRow: "Siegel in den Erfolgen", sealFirst: (nm, at) => `${nm} bei ${at}`, sealNext: (have, nm, at) => `${have} · nächste: ${nm} bei ${at}`, sealTop: (have) => `${have} · die höchste Stufe`, sealOf: (nm) => `${nm}-Siegel`,
      archH: "Frühere Events", archLine: (n, tot) => `${n} von ${tot}`, lineNext: (k, nm) => `noch ${k} bis ${nm}`, lineDone: "Karte komplett", allIn: "Alle Belohnungen verdient",
      anonLock: "Ein kostenloses Konto bewahrt deine Belohnungen.", anonHook: "Behalte deine Belohnungen mit einem kostenlosen Konto", google: "Weiter mit Google", orMail: "oder mit E-Mail",
      turnAllOn: "Alles einschalten", needFlair: "Trag zuerst ein Flair, um deinen Effekt zu sehen.",
      afterNote: "Dieses Event ist vorbei; deine Belohnungen findest du in den Tabs Flair und Feier.", achH: "Events", achSub: (n, tot) => `${n} von ${tot}`,
      lockedHint: "Das klappt noch nicht: deine früheren Tage sind noch nicht in deinem Konto. Spiele das heutige Daily und versuche es erneut.", countsAnyway: "zählt trotzdem", popGroupTitle: (n) => `${n} Belohnungen freigeschaltet`, barEvery: (i) => `Jedes Daily ist ein ${i}`,
    },
    es: {
      left: (n) => (n <= 1 ? "último día" : `quedan ${n} días`), over: "El evento ha terminado", catchupUntil: (d) => `Aún puedes recuperar hasta el ${d}`,
      keep: "Lo que ganes es tuyo para siempre, también después del evento.", count: (n, tot) => `${n} de ${tot}`, gift: "Regalo: tu primer sello ya está en la tarjeta.",
      todayDone: "El de hoy ya está", todayOpen: "Juega el diario de hoy", catchup: "Recuperar también cuenta.", rewardsH: "Recompensas",
      at: (n) => `con ${n}`, toGo: (n) => `faltan ${n}`, wear: "Usar ahora", turnOn: "Activar", worn: "En uso", on: "Activado",
      sealRow: "Sello en Logros", sealFirst: (nm, at) => `${nm} con ${at}`, sealNext: (have, nm, at) => `${have} · siguiente: ${nm} con ${at}`, sealTop: (have) => `${have} · el más alto`, sealOf: (nm) => `sello de ${nm}`,
      archH: "Eventos anteriores", archLine: (n, tot) => `${n} de ${tot}`, lineNext: (k, nm) => `faltan ${k} para ${nm}`, lineDone: "Tarjeta completa", allIn: "Todas las recompensas ganadas",
      anonLock: "Una cuenta gratuita guarda tus recompensas.", anonHook: "Guarda tus recompensas con una cuenta gratuita", google: "Continuar con Google", orMail: "o con correo electrónico",
      turnAllOn: "Activar todo", needFlair: "Lleva primero un distintivo para ver tu efecto.",
      afterNote: "Este evento ha terminado; tus recompensas están en las pestañas Distintivo y Fiesta.", achH: "Eventos", achSub: (n, tot) => `${n} de ${tot}`,
      lockedHint: "Aún no: tus días anteriores todavía no están en tu cuenta. Juega el diario de hoy y vuelve a intentarlo.", countsAnyway: "cuenta igual", popGroupTitle: (n) => `${n} recompensas desbloqueadas`, barEvery: (i) => `Cada diario es una ${i}`,
    },
    pt: {
      left: (n) => (n <= 1 ? "último dia" : `faltam ${n} dias`), over: "O evento acabou", catchupUntil: (d) => `Você ainda pode recuperar até ${d}`,
      keep: "O que você ganhar fica com você, mesmo depois do evento.", count: (n, tot) => `${n} de ${tot}`, gift: "Presente: seu primeiro carimbo já está no cartão.",
      todayDone: "O de hoje já está feito", todayOpen: "Jogue o diário de hoje", catchup: "Recuperar também conta.", rewardsH: "Recompensas",
      at: (n) => `com ${n}`, toGo: (n) => `faltam ${n}`, wear: "Usar agora", turnOn: "Ativar", worn: "Em uso", on: "Ativado",
      sealRow: "Selo em Conquistas", sealFirst: (nm, at) => `${nm} com ${at}`, sealNext: (have, nm, at) => `${have} · próximo: ${nm} com ${at}`, sealTop: (have) => `${have} · o mais alto`, sealOf: (nm) => `selo de ${nm}`,
      archH: "Eventos anteriores", archLine: (n, tot) => `${n} de ${tot}`, lineNext: (k, nm) => `faltam ${k} para ${nm}`, lineDone: "Cartão completo", allIn: "Todas as recompensas conquistadas",
      anonLock: "Uma conta gratuita guarda suas recompensas.", anonHook: "Guarde suas recompensas com uma conta gratuita", google: "Continuar com o Google", orMail: "ou com e-mail",
      turnAllOn: "Ativar tudo", needFlair: "Use primeiro um distintivo para ver seu efeito.",
      afterNote: "Este evento acabou; suas recompensas estão nas abas Distintivo e Festa.", achH: "Eventos", achSub: (n, tot) => `${n} de ${tot}`,
      lockedHint: "Ainda não: seus dias anteriores ainda não estão na sua conta. Jogue o diário de hoje e tente de novo.", countsAnyway: "conta mesmo assim", popGroupTitle: (n) => `${n} recompensas desbloqueadas`, barEvery: (i) => `Cada diário é uma ${i}`,
    },
  };

  // Per event: de naam, de beloningen, de pop-up-teksten, een mascotte en het zegel. De sleutel is het id uit EVENTS in game.js.
  const EVENT_UI = {
    spook: {
      copy: {
        nl: {
          name: "Spooktober", barLead: "Het is Spooktober!", menu: "Spooktober", achName: "Spooktober 2026",
          rewardName: { flair: "Pompoen-flair", fx: "\u{1F578}️ Spinnenweb", feest: "\u{1F383} Spookfeest" },
          popEyebrow: "Spooktober-beloning",
          popSub: { flair: "Je pompoen voor op het leaderboard. Blijft van jou, ook na Spooktober.", fx: "Een effect rond je flair, zichtbaar op elk bord. Blijft van jou.", feest: "Pompoenen, spoken en vleermuizen bij elke winst. Je zet 'm zelf aan of uit." },
          popGroupSub: "Je pompoen en je effect, samen te dragen.",
          hookLine: "Je pompoen-flair is verdiend. Met een gratis account kun je hem dragen.",
        },
        en: {
          name: "Spooktober", barLead: "It's Spooktober!", menu: "Spooktober", achName: "Spooktober 2026",
          rewardName: { flair: "Pumpkin flair", fx: "\u{1F578}️ Cobweb", feest: "\u{1F383} Spooky party" },
          popEyebrow: "Spooktober reward",
          popSub: { flair: "Your pumpkin for the leaderboard. Yours to keep, even after Spooktober.", fx: "An effect around your flair, visible on every board. Yours to keep.", feest: "Pumpkins, ghosts and bats with every win. You turn it on or off yourself." },
          popGroupSub: "Your pumpkin and your effect, to wear together.",
          hookLine: "You earned the pumpkin flair. A free account lets you wear it.",
        },
        de: {
          name: "Spooktober", barLead: "Es ist Spooktober!", menu: "Spooktober", achName: "Spooktober 2026",
          rewardName: { flair: "Kürbis-Flair", fx: "\u{1F578}️ Spinnennetz", feest: "\u{1F383} Gruselparty" },
          popEyebrow: "Spooktober-Belohnung",
          popSub: { flair: "Dein Kürbis für die Bestenliste. Bleibt dein, auch nach Spooktober.", fx: "Ein Effekt um dein Flair, sichtbar auf jeder Bestenliste. Bleibt dein.", feest: "Kürbisse, Geister und Fledermäuse bei jedem Sieg. Du schaltest es selbst ein oder aus." },
          popGroupSub: "Dein Kürbis und dein Effekt – trag beides zusammen.",
          hookLine: "Dein Kürbis-Flair ist verdient. Mit einem kostenlosen Konto kannst du es tragen.",
        },
        es: {
          name: "Spooktober", barLead: "¡Es Spooktober!", menu: "Spooktober", achName: "Spooktober 2026",
          rewardName: { flair: "Distintivo de calabaza", fx: "\u{1F578}️ Telaraña", feest: "\u{1F383} Fiesta de miedo" },
          popEyebrow: "Recompensa de Spooktober",
          popSub: { flair: "Tu calabaza para la clasificación. Es tuya para siempre, incluso después de Spooktober.", fx: "Un efecto alrededor de tu distintivo, visible en cada clasificación. Es tuyo.", feest: "Calabazas, fantasmas y murciélagos en cada victoria. Tú lo activas o lo apagas." },
          popGroupSub: "Tu calabaza y tu efecto, para llevar juntos.",
          hookLine: "Has ganado el distintivo de calabaza. Con una cuenta gratuita podrás usarlo.",
        },
        pt: {
          name: "Spooktober", barLead: "É Spooktober!", menu: "Spooktober", achName: "Spooktober 2026",
          rewardName: { flair: "Distintivo de abóbora", fx: "\u{1F578}️ Teia de aranha", feest: "\u{1F383} Festa assombrada" },
          popEyebrow: "Recompensa do Spooktober",
          popSub: { flair: "Sua abóbora para o placar. Fica com você, mesmo depois do Spooktober.", fx: "Um efeito em volta do seu distintivo, visível em todo placar. Fica com você.", feest: "Abóboras, fantasmas e morcegos a cada vitória. Você liga ou desliga quando quiser." },
          popGroupSub: "Sua abóbora e seu efeito, para usar juntos.",
          hookLine: "Você ganhou o distintivo de abóbora. Com uma conta gratuita você pode usá-lo.",
        },
      },
      // Het zegel in Prestaties: de pompoen (v3, 10/10/2026). Vorm, ribben en lichtval zijn gemeten aan een door Matthijs aangeleverde referentie:
      // één lichtbron links-boven (rechts en onderaan donkerder), vijf overlappende ribben met schaduw in de naden, zachte glansranden, gesneden gezicht met gloeirand.
      // Bewust rijker dan de vlakke album-zegels (verlopen, clipPaths, een blur voor de maangloed); nachtpaars blijft de achtergrond. Id = achv-art-<event>;
      // de onderdelen heten sp-* (uniek in het document). Bron-generator: jaardle-tools/mockups/pumpkin-seal.
      art:
        '<clipPath id="achv-spook-clip"><circle cx="50" cy="50" r="46"/></clipPath>' +
        '<clipPath id="sp-cb"><path d="M50 35C69.8 35 81.9 42.8 81.9 59.4C81.9 76 74.9 83.8 50 83.8C25.1 83.8 18.1 76 18.1 59.4C18.1 42.8 30.2 35 50 35Z"/></clipPath>' +
        '<clipPath id="sp-cc"><path d="M50 38.7C56.7 38.7 64 47.8 64 61.4C64 75 58.1 84.1 50 84.1C41.9 84.1 36 75 36 61.4C36 47.8 43.3 38.7 50 38.7Z"/></clipPath>' +
        '<clipPath id="sp-cs"><path d="M42.6 39.2C45.4 38.6 46.9 37.2 47.6 35.4C48.4 33.4 49.1 31.4 50.2 29.7C51.4 27.8 53.6 25.9 56.6 25C59.2 24.3 62 25.7 62.7 28.4C63.1 30 62.4 31.8 61 32.3C60.5 32.4 60.9 31.4 61.2 30.6C61.4 29.6 60.8 28.8 59.6 28.8C58.6 28.8 57.3 29.3 56.4 30.4C55.7 31.4 55.4 32.6 55.3 34C55.3 35.5 55.8 36.8 56.7 37.6C57.2 38 57.9 38.3 58 39.2Z"/></clipPath>' +
        '<filter id="sp-f1" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.6"/></filter>' +
        '<filter id="sp-f2" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.1"/></filter>' +
        '<filter id="sp-f3" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation=".3"/></filter>' +
        '<linearGradient id="sp-Bv" x1="0" y1="36" x2="0" y2="82" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fa820b"/><stop offset=".174" stop-color="#fa880d"/><stop offset=".348" stop-color="#fa7607"/><stop offset=".522" stop-color="#fa6407"/><stop offset=".739" stop-color="#fa5e07"/><stop offset="1" stop-color="#fa5207"/></linearGradient>' +
        '<linearGradient id="sp-Bh" x1="17.9" y1="0" x2="82.1" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#d23a06" stop-opacity="0"/><stop offset=".033" stop-color="#d23a06" stop-opacity="0"/><stop offset=".098" stop-color="#c93004" stop-opacity=".55"/><stop offset=".126" stop-color="#c93004" stop-opacity="0"/><stop offset=".874" stop-color="#c93004" stop-opacity="0"/><stop offset=".911" stop-color="#b92a04" stop-opacity=".6"/><stop offset=".936" stop-color="#b92a04" stop-opacity=".3"/><stop offset="1" stop-color="#b92a04" stop-opacity=".38"/></linearGradient>' +
        '<linearGradient id="sp-gBL" x1="0" y1="35" x2="0" y2="42" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fa870d"/><stop offset="1" stop-color="#fa7007"/></linearGradient>' +
        '<linearGradient id="sp-L2v" x1="0" y1="38" x2="0" y2="82" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fc8c0f"/><stop offset=".1" stop-color="#fc9613"/><stop offset=".22" stop-color="#fc9813"/><stop offset=".4" stop-color="#fa820b"/><stop offset=".545" stop-color="#fa7c08"/><stop offset=".727" stop-color="#fa7c08"/><stop offset=".9" stop-color="#fa7207"/><stop offset="1" stop-color="#fa6407"/></linearGradient>' +
        '<linearGradient id="sp-L2h" x1="30" y1="0" x2="44" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#c4400a" stop-opacity="0"/><stop offset="1" stop-color="#c4400a" stop-opacity=".32"/></linearGradient>' +
        '<linearGradient id="sp-R2h" x1="62" y1="0" x2="76.4" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fa7c08"/><stop offset=".208" stop-color="#fa7a07"/><stop offset="1" stop-color="#fa5307"/></linearGradient>' +
        '<linearGradient id="sp-Cv" x1="0" y1="38.7" x2="0" y2="84.1" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fc9a14"/><stop offset=".139" stop-color="#fc9412"/><stop offset=".249" stop-color="#fc8d0f"/><stop offset=".337" stop-color="#fa870d"/><stop offset=".425" stop-color="#fa7f09"/><stop offset=".601" stop-color="#fa7f09"/><stop offset=".733" stop-color="#fa7a07"/><stop offset=".899" stop-color="#fa840b"/><stop offset=".943" stop-color="#fa7a07"/><stop offset="1" stop-color="#fa6007"/></linearGradient>' +
        '<linearGradient id="sp-Ch" x1="36" y1="0" x2="64" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#ffc060" stop-opacity=".24"/><stop offset=".393" stop-color="#ffc060" stop-opacity="0"/><stop offset=".714" stop-color="#b83c06" stop-opacity="0"/><stop offset="1" stop-color="#b83c06" stop-opacity=".2"/></linearGradient>' +
        '<linearGradient id="sp-vs" x1="0" y1="60" x2="0" y2="84.5" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#b03005" stop-opacity="0"/><stop offset=".408" stop-color="#b03005" stop-opacity=".12"/><stop offset="1" stop-color="#8a1c04" stop-opacity=".42"/></linearGradient>' +
        '<radialGradient id="sp-gg" cx="50" cy="86" r="26" gradientUnits="userSpaceOnUse" gradientTransform="matrix(1 0 0 .22 0 67)"><stop offset="0" stop-color="#ff7a1a" stop-opacity=".55"/><stop offset=".6" stop-color="#ff5a14" stop-opacity=".18"/><stop offset="1" stop-color="#ff5a14" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="sp-eye" x1="0" y1="48" x2="0" y2="58" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#10010d"/><stop offset=".6" stop-color="#14010d"/><stop offset=".74" stop-color="#1d020c"/><stop offset=".82" stop-color="#2c040a"/><stop offset=".9" stop-color="#430a0b"/><stop offset=".96" stop-color="#530f0d"/><stop offset="1" stop-color="#85360c"/></linearGradient>' +
        '<linearGradient id="sp-mouth" x1="0" y1="64" x2="0" y2="79" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#12020c"/><stop offset=".6" stop-color="#15020c"/><stop offset=".733" stop-color="#24030b"/><stop offset=".867" stop-color="#3b090a"/><stop offset=".953" stop-color="#57100d"/><stop offset="1" stop-color="#7a2a0c"/></linearGradient>' +
        '<linearGradient id="sp-stem" x1="46" y1="0" x2="58" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#93bd2c"/><stop offset=".35" stop-color="#6e9b1b"/><stop offset=".7" stop-color="#4b7014"/><stop offset="1" stop-color="#2e4a10"/></linearGradient>' +
        '<path id="sp-m" d="M40.5 15A15.3 15.3 0 1 0 48.2 41.2A13.8 13.8 0 0 1 40.5 15Z"/>' +
        '<path id="sp-s" d="M0-1Q.12-.12 1 0Q.12.12 0 1Q-.12.12-1 0Q-.12-.12 0-1Z"/>' +
        '<path id="sp-b" d="M50 35C69.8 35 81.9 42.8 81.9 59.4C81.9 76 74.9 83.8 50 83.8C25.1 83.8 18.1 76 18.1 59.4C18.1 42.8 30.2 35 50 35Z"/>' +
        '<path id="sp-c" d="M50 38.7C56.7 38.7 64 47.8 64 61.4C64 75 58.1 84.1 50 84.1C41.9 84.1 36 75 36 61.4C36 47.8 43.3 38.7 50 38.7Z"/>' +
        '<path id="sp-l" d="M38.2 38.5C45.7 38.5 51.9 47.4 51.9 60.8C51.9 74.2 45.7 83.1 38.2 83.1C30.7 83.1 24.5 74.2 24.5 60.8C24.5 47.4 30.7 38.5 38.2 38.5Z"/><path id="sp-r" d="M61.8 38.5C69.3 38.5 75.5 47.4 75.5 60.8C75.5 74.2 69.3 83.1 61.8 83.1C54.3 83.1 48.1 74.2 48.1 60.8C48.1 47.4 54.3 38.5 61.8 38.5Z"/>' +
        '<g id="achv-art-spook"><use href="#achv-tile-base"/><g clip-path="url(#achv-spook-clip)">' +
        '<use href="#sp-m" fill="#ffd27a" opacity=".4" filter="url(#sp-f1)"/><use href="#sp-m" fill="#ffe3a0" opacity=".45" filter="url(#sp-f2)"/><use href="#sp-m" fill="#fdedb2"/>' +
        '<g fill="#ffc43d"><use href="#sp-s" transform="translate(50.2 20.3) scale(1.35)"/><use href="#sp-s" transform="translate(74.5 27.3) scale(2.8)"/><use href="#sp-s" transform="translate(81.1 37.3) scale(1.25)"/><use href="#sp-s" transform="translate(15.9 39.7) scale(2.1)"/><use href="#sp-s" transform="translate(86.1 47.4) scale(1.1)"/><circle cx="62.3" cy="16.5" r=".55"/><circle cx="41.3" cy="29.8" r=".45"/><circle cx="13.1" cy="50.9" r=".55"/></g>' +
        '<path d="M0 72Q50 60 100 72V100H0Z" fill="#1d0f27"/><ellipse cx="50" cy="86" rx="26" ry="5.6" fill="url(#sp-gg)"/><ellipse cx="50" cy="85.2" rx="31" ry="3.8" fill="#0e0615" opacity=".72"/>' +
        '<use href="#sp-b" fill="url(#sp-Bv)"/><use href="#sp-b" fill="url(#sp-Bh)"/><ellipse cx="43.4" cy="40.4" rx="7" ry="5.1" fill="url(#sp-gBL)"/><ellipse cx="56.6" cy="40.4" rx="7" ry="5.1" fill="url(#sp-gBL)"/>' +
        '<g clip-path="url(#sp-cb)"><path d="M23.2 60.8C21.5 47.4 30.7 35.5 38.2 37.2C30.7 38.9 24.9 47.4 23.2 60.8ZM76.8 60.8C78.5 47.4 69.3 35.5 61.8 37.2C69.3 38.9 75.1 47.4 76.8 60.8ZM23.2 60.8C21.3 74.2 30.7 86.3 38.2 84.4C30.7 82.5 25.1 74.2 23.2 60.8ZM76.8 60.8C78.7 74.2 69.3 86.3 61.8 84.4C69.3 82.5 74.9 74.2 76.8 60.8Z" fill="#c02e04" fill-opacity=".5"/></g>' +
        '<use href="#sp-l" fill="url(#sp-L2v)"/><use href="#sp-l" fill="url(#sp-L2h)"/><use href="#sp-r" fill="url(#sp-R2h)"/>' +
        '<g clip-path="url(#sp-cb)"><path d="M19 56.6C19.6 43.5 29 36.7 44.4 36.1C29.1 38.1 20.9 43.6 19 56.6ZM31.2 42.8C32.9 40 35.3 38.8 38.2 39.5C35.3 40.2 33.9 41 31.2 42.8ZM69.1 43.2C67.4 40.1 64.8 38.8 61.8 39.5C64.8 40.2 66.4 41 69.1 43.2Z" fill="#ffe0a0" fill-opacity=".4"/><path d="M34.8 61.4C33.2 47.8 43.3 35.9 50 37.5C43.3 39.1 36.4 47.8 34.8 61.4ZM34.8 61.4C33.1 75 41.9 87 50 85.3C41.9 83.6 36.5 75 34.8 61.4Z" fill="#c02e04" fill-opacity=".28"/><path d="M65.2 61.4C66.8 47.8 56.7 35.9 50 37.5C56.7 39.1 63.6 47.8 65.2 61.4ZM65.2 61.4C66.9 75 58.1 87 50 85.3C58.1 83.6 63.5 75 65.2 61.4Z" fill="#c02e04" fill-opacity=".08"/></g>' +
        '<use href="#sp-b" fill="url(#sp-vs)"/>' +
        '<path d="M42.6 39.2C45.4 38.6 46.9 37.2 47.6 35.4C48.4 33.4 49.1 31.4 50.2 29.7C51.4 27.8 53.6 25.9 56.6 25C59.2 24.3 62 25.7 62.7 28.4C63.1 30 62.4 31.8 61 32.3C60.5 32.4 60.9 31.4 61.2 30.6C61.4 29.6 60.8 28.8 59.6 28.8C58.6 28.8 57.3 29.3 56.4 30.4C55.7 31.4 55.4 32.6 55.3 34C55.3 35.5 55.8 36.8 56.7 37.6C57.2 38 57.9 38.3 58 39.2Z" fill="url(#sp-stem)"/>' +
        '<g clip-path="url(#sp-cs)" fill="none" stroke-linecap="round"><path d="M53.8 38.2C54.4 35.6 54 33 55.2 30.9C56 29.6 57.4 29.1 58.8 29.2" stroke="#243c0d" stroke-width="2.2" opacity=".5"/><path d="M49.3 36.4C49.5 33.6 50 31.4 51.2 29.4C52.4 27.5 54.2 26.4 56.6 25.9" stroke="#a9d03d" stroke-width="2.6" opacity=".38"/><path d="M49.3 36.4C49.5 33.6 50 31.4 51.2 29.4C52.4 27.5 54.2 26.4 56.6 25.9" stroke="#c9e56e" stroke-width=".7" opacity=".45"/><path d="M44.5 39.6C48 38.8 50.5 38.4 53.5 38.6" stroke="#1f3309" stroke-width="2.4" opacity=".35"/></g>' +
        '<use href="#sp-c" fill="url(#sp-Cv)"/><use href="#sp-c" fill="url(#sp-Ch)"/>' +
        '<path d="M51.5 38.5C56.6 43.5 57.2 56 56.2 68C55.8 74 55.2 79 55.8 84.6H70V38.5Z" fill="#d04a05" fill-opacity=".26" clip-path="url(#sp-cc)"/><path d="M50 38.7C43.3 38.7 36 47.8 36 61.4C36 75 41.9 84.1 50 84.1" fill="none" stroke="#c23d07" stroke-opacity=".5" stroke-width=".55"/>' +
        '<g clip-path="url(#sp-cb)" fill="#ffe0a0" filter="url(#sp-f3)"><path d="M28.7 50.9C29.3 44.3 32 41.1 36.6 41.5C32.7 44 32.1 45.2 28.7 50.9Z" fill-opacity=".36"/><path d="M41 48.5C42.5 42.6 45.7 39.9 49.7 40.9C45.9 42.4 44.8 43.7 41 48.5Z" fill-opacity=".4"/><path d="M66.6 42C65.3 40 63.9 39.5 61.8 40.4C63.9 41.3 64.3 41.4 66.6 42Z" fill-opacity=".36"/></g>' +
        '<g fill="#fcd33c"><path d="M37.6 48L45 58L31.7 57.4Z" transform="translate(-.4 .95)"/><path d="M62.4 48L68.3 57.4L55 58Z" transform="translate(.4 .95)"/><path d="M29.6 63.4L36.8 70L40.7 66.7L45.3 72L50 66.6L54.7 72L59.3 66.7L63.2 70L70.4 63.4C70.2 67 68.2 71.5 63.4 75.4L61.6 74C58.8 76.2 54.6 78.9 50 78.9C45.4 78.9 41.2 76.2 38.4 74L36.6 75.4C31.8 71.5 29.8 67 29.6 63.4Z" transform="translate(0 -6.07)scale(1 1.095)"/></g>' +
        '<path d="M37.6 48L45 58L31.7 57.4Z" fill="url(#sp-eye)"/><path d="M62.4 48L68.3 57.4L55 58Z" fill="url(#sp-eye)"/><path d="M46.9 60.7H53.1L50 65Z" fill="#120210"/><path d="M29.6 63.4L36.8 70L40.7 66.7L45.3 72L50 66.6L54.7 72L59.3 66.7L63.2 70L70.4 63.4C70.2 67 68.2 71.5 63.4 75.4L61.6 74C58.8 76.2 54.6 78.9 50 78.9C45.4 78.9 41.2 76.2 38.4 74L36.6 75.4C31.8 71.5 29.8 67 29.6 63.4Z" fill="url(#sp-mouth)"/>' +
        '</g></g>',
    },
  };

  const LANG_FALLBACK = "en";
  // Alle teksten van een event in een taal: het gedeelde deel + het deel van dit event (een ontbrekende taal valt terug op Engels).
  function copy(id, lang) {
    const ui = EVENT_UI[id] || { copy: {} };
    // Een onbekend event (id zonder blok in EVENT_UI) valt terug op veilige lege teksten i.p.v. een fout.
    const blank = { name: id, barLead: "", menu: id, achName: id, rewardName: {}, popEyebrow: "", popSub: {}, popGroupSub: "", hookLine: "" };
    return Object.assign(blank, SHARED[lang] || SHARED[LANG_FALLBACK], ui.copy[lang] || ui.copy[LANG_FALLBACK] || {});
  }
  const mascotOf = (v) => v.mascot || "";   // de mascotte (bv. het kattenkopje van /season-cat.js) komt mee in de view; zonder valt het terug op het icoon

  // ── hulpjes op een "view" (zie eventView() in game.js) ────────────────────────────────────────────────────────
  const fmtDay = (v, key, o) => new Intl.DateTimeFormat(v.locale, Object.assign({ timeZone: "UTC" }, o)).format(new Date(key + "T00:00:00Z"));
  const dates = (v) => `${fmtDay(v, v.start, { day: "numeric", month: "short" })} – ${fmtDay(v, v.end, { day: "numeric", month: "short" })}`;
  const nextReward = (v) => v.rewards.find((r, i) => !v.earned[i]) || null;
  // De volgende ring-tier van het zegel (stempels + tiernaam), of null als de hoogste al is gehaald (of het event geen tiers meldt).
  const nextSeal = (v) => { const i = (v.sealTiers || []).findIndex((x) => v.n < x); return i >= 0 && v.tierNames && v.tierNames[i] ? { at: v.sealTiers[i], name: v.tierNames[i], i } : null; };
  const capFirst = (x) => String(x).charAt(0).toUpperCase() + String(x).slice(1);
  function nextText(v, c) {
    const r = nextReward(v);
    if (v.n >= v.total) return c.lineDone;
    if (r) return c.lineNext(r.at - v.n, c.rewardName[r.kind]);
    const nx = nextSeal(v);
    return nx ? c.lineNext(nx.at - v.n, c.sealOf(nx.name)) : c.allIn;
  }
  
  // ── de balk boven de feitenkaart (alleen tijdens het event, met de skin) ─────────────────────────────────────
  // intro = de eerste dagen: twee regels met de aankondiging; daarna één dunne regel met je stand.
  function bar(v, o) {
    const c = copy(v.id, v.lang), intro = !!(o && o.intro), tail = `<span class="ev-chev" aria-hidden="true">›</span>`;
    const head = mascotOf(v) || `<span class="ev-ico">${esc(v.icon)}</span>`;
    const text = intro
      ? `<span class="ev-bt"><b>${esc(c.barLead)}</b><small>${esc(c.barEvery(v.icon))} · ${esc(dates(v))}</small></span>`
      : `<span class="ev-bt">${esc(c.name)} · ${esc(v.icon)} ${esc(c.count(v.n, v.total))}</span>`;
    return `<button type="button" class="ev-bar${intro ? "" : " slim"}" data-ev="${esc(v.id)}" data-ev-open="${esc(v.id)}" aria-label="${esc(c.name + " " + c.count(v.n, v.total))}">${head}${text}${tail}</button>`;
  }

  // ── de stempelkaart ───────────────────────────────────────────────────────────────────────────────────────────
  // Een vakje per dag; de drempels zijn cadeau-vakjes die opengaan en de beloning tonen; het cadeau is vakje 1.
  function card(v, o) {
    const c = copy(v.id, v.lang), arrive = !!(o && o.arrive);
    let slots = "";
    for (let i = 1; i <= v.total; i++) {
      const r = v.thresholds.indexOf(i), on = i <= v.n, rw = r >= 0;
      if (i === 1 && v.gift && v.n === 0) { slots += `<i class="evp-s gift0"><em class="evp-gf"></em></i>`; continue; }
      const cls = "evp-s" + (on ? " on" : "") + (rw ? " rw rw" + (r + 1) : "") + (i === 1 && v.gift && on ? " gift" : "") + (!on && i === v.n + 1 && v.phase !== "past" ? " nextup" : "") + (arrive && i === v.n && v.n >= 2 ? " new" : "");
      const inner = rw ? (on ? `<b class="evp-ic">${esc(v.rewards[r].icon)}</b>` : `<em class="evp-gf"></em>`) + `<span class="evp-no">${i}</span>` : `<span class="evp-no">${i}</span>`;
      slots += `<i class="${cls}">${inner}</i>`;
    }
    return `<div class="evc${arrive ? " arrive" : ""}" role="img" aria-label="${esc(c.count(v.n, v.total))}"><div class="evp" style="--cols:${v.total % 4 === 0 ? 4 : v.total % 7 === 0 ? 7 : v.total % 5 === 0 ? 5 : 4}">${slots}</div></div>`;
  }

  // ── de strook op het eindscherm: dagen als puntjes, drempels als ronde pinnen, één tekstregel ──────────────────
  // o.arrive = het nieuwe stempel landt (één keer) · o.quiet = zonder puntjes · o.mood = "cheer" (winst) of "comfort" (verlies): het kopje viert of
  // troost (de animaties staan in season-cat.js) · o.lost = "telt toch mee" · o.hat = het kopje draagt de heksenhoed (hoogste beloning binnen)
  function strip(v, o) {
    o = o || {};
    const c = copy(v.id, v.lang);
    let pips = "";
    for (let i = 1; i <= v.total; i++) pips += `<i class="evs-pip${i <= v.n ? " on" : ""}${v.thresholds.includes(i) ? " rw" : ""}${o.arrive && i === v.n ? " new" : ""}"></i>`;
    const note = v.anon ? (v.n >= v.thresholds[0] ? `<span class="evs-hookline">${esc(c.hookLine)} ›</span>` : `<span class="evs-note">\u{1F512} ${esc(c.anonLock)}</span>`) : "";
    const next = (o.lost ? `${c.countsAnyway} · ` : "") + nextText(v, c);
    return `<button type="button" class="evs${o.arrive ? " arrive" : ""}${o.quiet ? " quiet" : ""}${o.mood === "cheer" || o.mood === "comfort" ? " " + o.mood : ""}${o.hat ? " hat" : ""}" data-ev="${esc(v.id)}" data-ev-open="${esc(v.id)}" aria-label="${esc(c.name + " " + c.count(v.n, v.total))}">` +
      `<span class="evs-top">${mascotOf(v) || `<span class="evs-ico">${esc(v.icon)}</span>`}<b>${esc(c.name)}</b><span class="evs-n"><span class="evs-num">${esc(c.count(v.n, v.total))}</span></span><span class="evs-go" aria-hidden="true">›</span></span>` +
      `<span class="evs-pips" style="--n:${v.total}">${pips}</span><span class="evs-next">${esc(next)}</span>${note}</button>`;
  }

  // ── het Events-scherm (de Events-tab in de kluis én het scherm voor wie niet is ingelogd) ─────────────────────
  function rewardPreview(v, r) {
    if (r.kind === "flair") return `<span class="ev-prev">${esc(r.icon)}</span>`;
    if (r.kind === "fx") return `<span class="ev-prev fx">${v.fxWrap(r.fx, esc(v.wornFlair || v.icon), false)}</span>`;
    let b = "";
    [8, 30, 52, 74].forEach((left, i) => { b += `<b style="left:${left}%;animation-delay:-${(i * 0.6).toFixed(1)}s">${esc(v.icon)}</b>`; });
    return `<span class="ev-prev"><span class="ev-fxp" aria-hidden="true">${b}<b class="up" style="left:42%;animation-delay:-0.8s">${esc(r.icon)}</b></span></span>`;
  }
  function row(v, c, r, i) {
    const earned = v.earned[i], isNext = !earned && nextReward(v) === r, worn = !!v.worn[i];
    const sub = earned ? `<span class="ok">✓</span> ${esc(c.at(r.at))}` : `${esc(c.at(r.at))} · ${isNext ? `<span class="go">${esc(c.toGo(r.at - v.n))}</span>` : esc(c.toGo(r.at - v.n))}`;
    let act;
    if (!earned) act = `<span class="ev-lk" aria-hidden="true">\u{1F512}</span>`;
    else if (v.anon) act = `<span class="ev-lk" aria-hidden="true">✓</span>`;
    else if (worn) act = `<span class="ev-btn on">✓ ${esc(r.kind === "flair" ? c.worn : c.on)}</span>`;
    else if (r.kind === "fx" && !v.anyFlair) act = `<button type="button" class="ev-btn" disabled>${esc(c.turnOn)}</button>`;
    else act = `<button type="button" class="ev-btn" data-ev-act="${i}" data-ev-id="${esc(v.id)}">${esc(r.kind === "flair" ? c.wear : c.turnOn)}</button>`;
    const hint = earned && !v.anon && r.kind === "fx" && !v.anyFlair ? `<span class="ev-hint">${esc(c.needFlair)}</span>` : "";
    return `<div class="ev-row ${earned ? "done" : isNext ? "next" : "lock"}" data-ev="${esc(v.id)}">${rewardPreview(v, r)}<div class="ev-tx"><b class="ev-nm">${esc(c.rewardName[r.kind])}</b><span class="ev-sb">${sub}</span>${hint}</div>${act}</div>`;
  }
  // Het zegel van Prestaties als vierde rij onder de beloningen: je ring nu en wat de volgende tier kost.
  function sealRow(v, c) {
    if (!v.tierNames || !v.sealTiers) return "";
    const tier = v.tier || 0, nx = nextSeal(v), have = tier ? capFirst(v.tierNames[tier - 1]) : "";
    const sub = !tier ? c.sealFirst(capFirst(v.tierNames[0]), v.sealTiers[0]) : nx ? c.sealNext(have, v.tierNames[nx.i], nx.at) : c.sealTop(have);
    const act = tier ? `<span class="ev-lk" aria-hidden="true">✓</span>` : `<span class="ev-lk" aria-hidden="true">\u{1F512}</span>`;
    return `<div class="ev-row seal ${tier ? "done" : "lock"}" data-ev="${esc(v.id)}"><span class="ev-prev seal"><span class="ev-ring achv-t${tier}"><span class="achv-tring tiered"><svg viewBox="0 0 100 100" class="achv-art" aria-hidden="true"><use href="#achv-art-${esc(v.id)}"></use></svg></span></span></span>` +
      `<div class="ev-tx"><b class="ev-nm">${esc(c.sealRow)}</b><span class="ev-sb">${esc(sub)}</span></div>${act}</div>`;
  }
  function hook(v, c, google) {
    return `<div class="ev-hook"><p>${esc(c.anonHook)}</p><button type="button" class="google-btn js-google-btn">${google || ""}<span>${esc(c.google)}</span></button><button type="button" class="link-btn js-acct-btn">${esc(c.orMail)}</button></div>`;
  }
  // Het lopende event: kop (titel, datums, nog hoeveel dagen), de kaart, vandaag binnen of niet, en de beloningen.
  function screen(v, o) {
    o = o || {};
    const c = copy(v.id, v.lang), over = v.phase !== "run";
    const when = over ? c.over : c.left(v.daysLeft);
    const head = `<div class="ev-head">${mascotOf(v) || `<span class="ev-ico">${esc(v.icon)}</span>`}<div class="ev-ttl"><b>${esc(c.name)}</b><span>${esc(dates(v) + " · " + when)}</span></div><span class="ev-count"><b>${v.n}</b><small>/ ${v.total}</small></span></div>`;
    let foot;
    if (over) foot = `<p class="ev-foot">${esc(c.catchupUntil(fmtDay(v, v.catchupEnd, { weekday: "short", day: "numeric", month: "short" })))}</p>`;
    else {
      const chip = v.todayPlayed ? `<span class="ev-chip">✓ ${esc(c.todayDone)}</span>` : `<button type="button" class="ev-chip" data-ev-play="1">${esc(c.todayOpen)} ›</button>`;
      const tip = v.gift && v.n <= 2 ? `<span class="ev-gift">${esc(c.gift)}</span>` : `<span>${esc(c.catchup)}</span>`;
      foot = `<p class="ev-foot">${chip}${tip}</p>`;
    }
    const hero = `<section class="rw-sect ev-sect" data-rw-sect="events" data-ev="${esc(v.id)}"><div class="ev-hero">${head}${card(v, { arrive: o.arrive })}${foot}</div></section>`;
    const rows = v.rewards.map((r, i) => row(v, c, r, i)).join("") + sealRow(v, c);
    return hero + `<section class="rw-sect" data-rw-sect="ev-rewards" data-ev="${esc(v.id)}"><h3 class="stats-heading">${esc(c.rewardsH)}</h3><div class="ev-list">${rows}</div>` +
      (v.anon ? hook(v, c, o.google) : `<p class="ev-note">${esc(c.keep)}</p>`) + `</section>`;
  }
  // Het archief (na het event, voor wie meedeed): het zegel met zijn ring en wat je verdiende. Wat je niet haalde staat er niet.
  function archive(v) {
    const c = copy(v.id, v.lang), tier = v.tier != null ? v.tier : v.earned.filter(Boolean).length;
    const got = v.rewards.map((r, i) => (v.earned[i] ? `<i>${esc(r.icon)}</i>` : "")).join("");
    return `<div class="ev-arch" data-ev="${esc(v.id)}"><span class="ev-ring achv-t${tier}"><span class="achv-tring tiered"><svg viewBox="0 0 100 100" class="achv-art" aria-hidden="true"><use href="#achv-art-${esc(v.id)}"></use></svg></span></span>` +
      `<div class="ev-tx"><b class="ev-nm">${esc(c.achName)}</b><span class="ev-sb">${esc(dates(v) + " · " + c.archLine(v.n, v.total))}</span><span class="ev-got">${got}</span></div></div>`;
  }
  // De hele tab-inhoud: elk event in beeld (kaart + beloningen) en daarna het archief van de afgelopen events.
  function tab(views, o) {
    o = o || {};
    const live = views.filter((v) => v.phase !== "past"), past = views.filter((v) => v.phase === "past");
    const c0 = copy((past[0] || live[0] || {}).id, (past[0] || live[0] || {}).lang);
    return live.map((v) => screen(v, o)).join("") +
      (past.length ? `<section class="rw-sect"><h3 class="stats-heading">${esc(c0.archH)}</h3>${past.map(archive).join("")}${live.length ? "" : `<p class="ev-after">${esc(c0.afterNote)}</p>`}</section>` : "");
  }
  // De regel in het menu (voor wie niet is ingelogd): kattenkopje of icoon + de naam.
  const menuItem = (v) => `${mascotOf(v) || `<span class="ev-ico" style="font-size:1.05em">${esc(v.icon)}</span> `}${esc(copy(v.id, v.lang).menu)}`;
  // Het zegel-plaatje(s) voor de SVG-defs van Prestaties (id achv-art-<event>); null als het event er geen heeft.
  const art = (id) => (EVENT_UI[id] && EVENT_UI[id].art) || "";
  const ids = () => Object.keys(EVENT_UI);

  // De CSS komt als één <style> mee (de CSP staat inline style toe); eenmalig, ook bij een tweede inlaad.
  try {
    if (!document.querySelector("style[data-season-event]")) {
      const st = document.createElement("style");
      st.setAttribute("data-season-event", "");
      st.textContent = CSS;
      document.head.appendChild(st);
    }
  } catch (e) {}

  return { copy, bar, card, strip, screen, archive, tab, menuItem, art, ids, css: CSS, nextText: (v) => nextText(v, copy(v.id, v.lang)), dates };
})();
