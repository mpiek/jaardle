// /event-mini.js: de UI van een potjes-event (een rij in EVENTS in game.js met unit: "plays"): je stand in een balk boven de
// feitenkaart en in een strook op het eindscherm, plus de teksten van de beloning (kluis, pop-up) in vijf talen.
// Geen stempelkaart, zegel of eigen scherm: dat is /season-event.js (dagen-events zoals Spooktober).
// Lui geladen (fxLoader in game.js): alleen op de dagen van zo'n event, of als je de beloning hebt en de kluis of de pop-up
// zijn naam nodig heeft. Op een gewone dag wordt dit bestand nooit opgehaald.
// Nieuw potjes-event = een blok in UI hieronder (tokens in de CSS, een plaatje, teksten ×5 met dezelfde sleutels).
window.EventMini = (() => {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const CSS = String.raw`/* ═══ Potjes-event (EVENTS met unit "plays"): balk + strook. De kleur per event komt uit de tokens ([data-evm="<id>"]). ═══ */
[data-evm] { --evm: var(--accent); --evm-nut: #b9763a; }
[data-evm="sint"] { --evm: #e0453a; }
html[data-theme="light"] [data-evm="sint"], html[data-theme="parchment"] [data-evm="sint"] { --evm: #b3261e; --evm-nut: #8f5423; }

/* ── de balk boven de feitenkaart: wat je kunt verdienen en hoe ver je bent ── */
.evm-bar { display: flex; align-items: center; gap: 0.55rem; box-sizing: border-box; width: 100%; margin: 0 0 0.5rem; padding: 0.35rem 0.7rem; font-size: 0.85rem; font-weight: 500; line-height: 1.25;
  color: var(--fg); background: color-mix(in srgb, var(--evm) 9%, var(--card)); border: 1px solid color-mix(in srgb, var(--evm) 40%, var(--border)); border-radius: 12px; }
.evm-bar.slim { padding-block: 0.15rem; font-size: 0.8rem; color: var(--muted); min-height: 1.93rem; }
.evm-ico { flex: none; display: inline-grid; place-items: center; width: 1.6rem; height: 1.6rem; }
.evm-bar.slim .evm-ico { width: 1.25rem; height: 1.25rem; }
.evm-ico svg { width: 100%; height: 100%; display: block; }
.evm-bt { flex: 1; min-width: 0; }
.evm-bt small { display: block; color: var(--muted); font-size: 0.75rem; font-weight: 400; }
.evm-bar.slim .evm-bt { flex: none; }
.evm-n { flex: none; margin-left: auto; font-variant-numeric: tabular-nums; font-weight: 700; color: var(--fg); }
.evm-bar.slim .evm-n { font-size: 0.78rem; }
.evm-pips { display: flex; align-items: center; gap: 0.2rem; }
.evm-bar .evm-pips { flex: 1; min-width: 0; justify-content: flex-end; }
.evm-pip { flex: none; width: 0.66rem; height: 0.66rem; border-radius: 50%; box-sizing: border-box; border: 1.5px dashed color-mix(in srgb, var(--evm-nut) 65%, transparent); }
.evm-pip.on { border: 0; background: var(--evm-pip, var(--evm-nut)) center / contain no-repeat; }

/* ── de strook op het eindscherm: je stand na dit potje, en de knop zodra je hem hebt ── */
.evm-strip { display: block; box-sizing: border-box; width: 100%; text-align: left; color: var(--fg); background: var(--card-soft); border: 1px solid var(--border); border-radius: 12px; padding: 0.5rem 0.7rem 0.55rem; margin: 0.2rem 0 0.8rem; }
.evm-strip.done { border-color: color-mix(in srgb, var(--evm) 45%, var(--border)); }
.evm-top { display: flex; align-items: center; gap: 0.45rem; font-size: 0.82rem; }
.evm-top .evm-ico { width: 1.3rem; height: 1.3rem; }
.evm-top b { font-weight: 700; }
.evm-top .evm-n { color: var(--muted); font-weight: 400; font-size: 0.78rem; }
.evm-strip .evm-pips { margin-top: 0.45rem; gap: 0; justify-content: space-between; }
.evm-strip .evm-pip { width: 1.3rem; height: 1.3rem; }
.evm-next { display: block; margin-top: 0.45rem; font-size: 0.72rem; color: var(--muted); line-height: 1.3; }
.evm-strip.done .evm-next { color: var(--fg); }
.evm-btn { appearance: none; display: inline-block; box-sizing: border-box; min-height: 2.75rem; margin-top: 0.5rem; padding: 0.4rem 1.1rem; font: inherit; font-size: 0.8rem; font-weight: 700; border-radius: 999px; cursor: pointer; -webkit-tap-highlight-color: transparent;
  color: #fff; background: var(--evm); border: 1px solid var(--evm); }
.evm-btn[aria-pressed="true"] { color: var(--muted); background: transparent; border-color: var(--border); font-weight: 500; }
.evm-strip.arrive .evm-pip.new { animation: evm-pop 0.7s cubic-bezier(0.2, 1.5, 0.4, 1) 0.25s both; }
.evm-strip.arrive .evm-num { display: inline-block; animation: evm-bump 0.5s ease-out 0.35s both; }
@keyframes evm-pop { 0% { transform: scale(0); } 55% { transform: scale(1.55); } 100% { transform: scale(1); } }
@keyframes evm-bump { 0% { transform: translateY(0.45em); opacity: 0; } 100% { transform: none; opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .evm-strip.arrive .evm-pip.new, .evm-strip.arrive .evm-num { animation: none; } }
/* de schakelaar in ⚙️ (zonder account) en de tegel in de 🪎-kluis gebruiken dezelfde tekeningen */
.menu-item .evm-ico { display: inline-grid; width: 1.15em; height: 1.15em; vertical-align: -0.22em; margin-right: 0.35rem; }
.rw-fxp b svg { display: block; width: 1em; height: 1em; }
`;

  // Per event: het plaatje (inline SVG, vierkante viewBox) en de teksten. Alle talen dezelfde sleutels (de test controleert het).
  // rewardName/popEyebrow/popSub hebben dezelfde vorm als in /season-event.js: de kluis en de beloning-pop-up van game.js lezen ze zo.
  const UI = {
    sint: {
      // De chocolademunt (het icoon) en de kruidnoot (de nootjes van de teller): letterlijk dezelfde SVG's als StrooigoedFx.ICONS in
      // /strooigoed-fx.js, hier overgenomen zodat de balk dat bestand niet hoeft te laden (de test houdt ze gelijk).
      art: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.4" fill="#c4860f"/><circle cx="12" cy="12" r="9" fill="#f6c63c"/><circle cx="12" cy="12" r="6.9" fill="none" stroke="#dc9f1a" stroke-width="1"/><path d="M12 7.6l1.18 3.08 3.29.17-2.57 2.07.86 3.18L12 14.3l-2.76 1.8.86-3.18-2.57-2.07 3.29-.17z" fill="#dc9f1a"/><path d="M5.5 9.4A7.4 7.4 0 0 1 10.9 4.7" fill="none" stroke="#fff6cf" stroke-width="1.6" stroke-linecap="round"/><path d="M18.3 15.4a7.2 7.2 0 0 1-2.5 2.7" fill="none" stroke="#fff6cf" stroke-width="1.2" stroke-linecap="round" opacity=".7"/></svg>',
      pip: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12.8" r="9.4" fill="#8f5423"/><circle cx="12" cy="11.5" r="8.8" fill="#bd7a35"/><ellipse cx="9.5" cy="8.8" rx="4.8" ry="3.6" fill="#d39755"/><ellipse cx="8.3" cy="7.5" rx="1.8" ry="1.1" fill="#ecc089"/><path d="M13.8 7.3l1.9 1.6M10.4 11.2l1 1.7M15.2 13.4l1.6 1.9M8.3 16.2l2.2.5" fill="none" stroke="#8f5423" stroke-width="1.2" stroke-linecap="round"/></svg>',
      copy: {
        nl: {
          name: "Strooigoed", rewardName: { feest: "Strooigoed" }, popEyebrow: "Sinterklaas-beloning",
          popSub: { feest: "Verdiend met 10 potjes op 5 en 6 december. Speelt bij elke winst en blijft van jou." },
          lead: (total) => `Speel ${total} potjes, verdien Strooigoed`, sub: (last) => `Een viering bij elke winst · ${last ? "alleen vandaag nog" : "vandaag en morgen"}`,
          toGo: (n) => (n === 1 ? "Nog 1 potje voor de viering Strooigoed" : `Nog ${n} potjes voor de viering Strooigoed`),
          earnedOff: "Verdiend! Zet Strooigoed aan: dan speelt het bij elke winst.", earnedOn: "Strooigoed staat aan en speelt bij elke winst.",
          turnOn: "Zet aan", turnOff: "Zet uit", menu: "Strooigoed-viering", aria: (n, total) => `Strooigoed: ${n} van ${total} potjes`,
        },
        en: {
          name: "Candy Shower", rewardName: { feest: "Candy Shower" }, popEyebrow: "Sinterklaas reward",
          popSub: { feest: "Earned with 10 rounds on 5 and 6 December. Plays after every win and is yours to keep." },
          lead: (total) => `Play ${total} rounds, earn Candy Shower`, sub: (last) => `A celebration after every win · ${last ? "today only" : "today and tomorrow"}`,
          toGo: (n) => (n === 1 ? "1 more round for the Candy Shower celebration" : `${n} more rounds for the Candy Shower celebration`),
          earnedOff: "Earned! Turn Candy Shower on to see it after every win.", earnedOn: "Candy Shower is on and plays after every win.",
          turnOn: "Turn on", turnOff: "Turn off", menu: "Candy Shower celebration", aria: (n, total) => `Candy Shower: ${n} of ${total} rounds`,
        },
        de: {
          name: "Bonbonregen", rewardName: { feest: "Bonbonregen" }, popEyebrow: "Sinterklaas-Belohnung",
          popSub: { feest: "Verdient mit 10 Runden am 5. und 6. Dezember. Läuft bei jedem Sieg und bleibt dir erhalten." },
          lead: (total) => `Spiel ${total} Runden und hol dir den Bonbonregen`, sub: (last) => `Eine Feier bei jedem Sieg · ${last ? "nur noch heute" : "heute und morgen"}`,
          toGo: (n) => (n === 1 ? "Noch 1 Runde bis zur Feier Bonbonregen" : `Noch ${n} Runden bis zur Feier Bonbonregen`),
          earnedOff: "Geschafft! Schalte den Bonbonregen ein: dann läuft er bei jedem Sieg.", earnedOn: "Der Bonbonregen ist an und läuft bei jedem Sieg.",
          turnOn: "Einschalten", turnOff: "Ausschalten", menu: "Bonbonregen-Feier", aria: (n, total) => `Bonbonregen: ${n} von ${total} Runden`,
        },
        es: {
          name: "Lluvia de dulces", rewardName: { feest: "Lluvia de dulces" }, popEyebrow: "Recompensa de Sinterklaas",
          popSub: { feest: "Conseguida con 10 partidas el 5 y el 6 de diciembre. Aparece en cada victoria y es tuya para siempre." },
          lead: (total) => `Juega ${total} partidas y gana la Lluvia de dulces`, sub: (last) => `Una celebración en cada victoria · ${last ? "solo hoy" : "hoy y mañana"}`,
          toGo: (n) => (n === 1 ? "Falta 1 partida para la celebración Lluvia de dulces" : `Faltan ${n} partidas para la celebración Lluvia de dulces`),
          earnedOff: "¡Conseguida! Activa la Lluvia de dulces y la verás en cada victoria.", earnedOn: "La Lluvia de dulces está activada: la verás en cada victoria.",
          turnOn: "Activar", turnOff: "Desactivar", menu: "Celebración Lluvia de dulces", aria: (n, total) => `Lluvia de dulces: ${n} de ${total} partidas`,
        },
        pt: {
          name: "Chuva de doces", rewardName: { feest: "Chuva de doces" }, popEyebrow: "Recompensa de Sinterklaas",
          popSub: { feest: "Conquistada com 10 partidas em 5 e 6 de dezembro. Aparece a cada vitória e é sua para sempre." },
          lead: (total) => `Jogue ${total} partidas e ganhe a Chuva de doces`, sub: (last) => `Uma comemoração a cada vitória · ${last ? "só hoje" : "hoje e amanhã"}`,
          toGo: (n) => (n === 1 ? "Falta 1 partida para a comemoração Chuva de doces" : `Faltam ${n} partidas para a comemoração Chuva de doces`),
          earnedOff: "Conquistada! Ative a Chuva de doces para vê-la a cada vitória.", earnedOn: "A Chuva de doces está ativada: aparece a cada vitória.",
          turnOn: "Ativar", turnOff: "Desativar", menu: "Comemoração Chuva de doces", aria: (n, total) => `Chuva de doces: ${n} de ${total} partidas`,
        },
      },
    },
  };

  const LANG_FALLBACK = "en";
  const copy = (id, lang) => { const c = (UI[id] || {}).copy || {}; return c[lang] || c[LANG_FALLBACK] || null; };
  const art = (id) => (UI[id] && UI[id].art) || "";
  const ids = () => Object.keys(UI);
  const sweets = (id) => (UI[id] ? [UI[id].pip, UI[id].art].filter(Boolean) : []);   // voor de vallende tekeningen op de kluis-tegel
  const menuItem = (id, lang) => { const c = copy(id, lang); return c ? `<span class="evm-ico" aria-hidden="true">${art(id)}</span>${esc(c.menu)}` : ""; };
  // Het nootje van de teller als achtergrond (data-URI; de CSP staat data: toe voor plaatjes, zoals bij de stempels van /season-event.js).
  const TOKENS = ids().filter((id) => UI[id].pip).map((id) => `[data-evm="${id}"] { --evm-pip: url("data:image/svg+xml,${encodeURIComponent(UI[id].pip)}"); }`).join("\n");
  const ico = (v) => `<span class="evm-ico" aria-hidden="true">${art(v.id)}</span>`;
  // De stand als tien nootjes: gevuld = gespeeld; het nieuwste krijgt (op het eindscherm) een plopje.
  function pips(v, arrive) {
    let h = "";
    for (let i = 1; i <= v.total; i++) h += `<i class="evm-pip${i <= v.n ? " on" : ""}${arrive && i === v.n ? " new" : ""}"></i>`;
    return `<span class="evm-pips" aria-hidden="true">${h}</span>`;
  }
  // view (uit game.js): { id, lang, n, total, earned, on, lastDay }; n loopt niet verder dan total.
  // De balk: tot je eerste potje twee regels (wat het is), daarna één dunne regel met de nootjes. Wie de beloning heeft krijgt geen balk meer.
  function bar(v, o) {
    const c = copy(v.id, v.lang);
    if (!c) return "";
    const intro = !!(o && o.intro), count = `<span class="evm-n">${v.n}/${v.total}</span>`;
    const body = intro ? `<span class="evm-bt"><b>${esc(c.lead(v.total))}</b><small>${esc(c.sub(v.lastDay))}</small></span>${count}`
      : `<span class="evm-bt">${esc(c.name)}</span>${pips(v, false)}${count}`;
    return `<div class="evm-bar${intro ? "" : " slim"}" data-evm="${esc(v.id)}" role="status" aria-label="${esc(c.aria(v.n, v.total))}">${ico(v)}${body}</div>`;
  }
  // De strook: na een vers potje plopt het nieuwe nootje (arrive). Heb je hem, dan staat er een knop om de viering aan of uit te zetten.
  function strip(v, o) {
    const c = copy(v.id, v.lang);
    if (!c) return "";
    const arrive = !!(o && o.arrive);
    const next = v.earned ? (v.on ? c.earnedOn : c.earnedOff) : c.toGo(v.total - v.n);
    const btn = v.earned ? `<button type="button" class="evm-btn" data-evm-toggle="${esc(v.id)}" aria-pressed="${v.on ? "true" : "false"}">${esc(v.on ? c.turnOff : c.turnOn)}</button>` : "";
    return `<div class="evm-strip${arrive ? " arrive" : ""}${v.earned ? " done" : ""}" data-evm="${esc(v.id)}" aria-label="${esc(c.aria(v.n, v.total))}">` +
      `<span class="evm-top">${ico(v)}<b>${esc(c.name)}</b><span class="evm-n"><span class="evm-num">${v.n}/${v.total}</span></span></span>` +
      `${pips(v, arrive)}<span class="evm-next">${esc(next)}</span>${btn}</div>`;
  }

  // De CSS komt als één <style> mee (de CSP staat inline style toe); eenmalig, ook bij een tweede inlaad.
  try {
    if (!document.querySelector("style[data-event-mini]")) {
      const st = document.createElement("style");
      st.setAttribute("data-event-mini", "");
      st.textContent = CSS + TOKENS;
      document.head.appendChild(st);
    }
  } catch (e) {}

  return { copy, art, ids, sweets, menuItem, bar, strip, css: CSS + TOKENS };
})();
