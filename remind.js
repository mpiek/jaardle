/* Het dagelijkse seintje (web push), lui geladen bij de eerste tik op de bel op het eindscherm of in het ⋮-menu: bij het openen
   van de site vraagt niets om toestemming ("het moet clean openen", 25/10/2026), de browservraag komt pas na "Zet seintje aan".
   Eén scherm: een tijdlijn van 7 tot 22 uur in je eigen tijd, met de lucht van die dag als spoor. Uren minder dan 2 uur vóór de
   nieuwe daily (00:00 Amsterdam, in New York 18:00, in Sydney 10:00) zijn gearceerd en niet te kiezen ("zodat mensen echt alleen
   logische tijden kunnen kiezen", 26/10); valt de nieuwe daily binnen het venster, dan staat er een streepje. De server
   (db/137, functie daily-reminder) stuurt hooguit één bericht per dag, alleen als je de daily van dat moment nog niet speelde,
   en een week niet gespeeld = stil. Op een iPhone kan push alleen vanaf het beginscherm: dan dezelfde kaart met de drie stappen.
   game.js levert host (taal, rpc, speler-id, aftelklok) en leest jaardle:remind zelf voor de bel; dit bestand schrijft hem. */
window.Remind = (() => {
  const VAPID = "BMIGkZBV67ptymA1ihwGL9YfCdT_XfIEXHfhR6n7_5Quim-OqEqMW1MkxK8PPNpuhk1u4mFUdwUm2SK9XvNyyUc";
  const KEY = "jaardle:remind";   // { on, hour, tz, ep }
  const FIRST = 7, LAST = 22, MARGIN = 120;   // kiesbare uren (lokaal) en minuten die er minstens over moeten zijn tot de nieuwe daily

  const TXT = {
    nl: {
      title: "Dagelijks seintje",
      lead: "Eén berichtje per dag, alleen als je de daily nog niet gespeeld hebt. Een week niet gespeeld? Dan stoppen ze vanzelf.",
      first: (d) => `Eerste seintje: ${d}`, today: "vandaag", tomorrow: "morgen",
      blocked: "Te kort vóór de nieuwe daily", mark: "nieuwe daily", pick: "Tijd van je seintje",
      enable: "Zet seintje aan", busy: "Even wachten…", on: "Seintje staat aan", done: "Klaar", off: "Zet uit",
      denied: "Meldingen voor jaardle.com staan uit in je browser. Zet ze aan via het slotje naast het webadres en probeer het opnieuw.",
      error: "Het seintje aanzetten lukte niet. Probeer het later nog eens.",
      ios: "Op een iPhone kan Jaardle alleen een seintje sturen vanaf je beginscherm. Eenmalig, zo:",
      ios1: (i) => `Tik onderin op ${i} <b>Deel</b>`, ios2: (i) => `Kies ${i} <b>Zet op beginscherm</b>`,
      ios3: (i) => `Open Jaardle vanaf je beginscherm en tik op ${i}`,
      iosNote: "Je streak staat nu in Safari. Log in (ook in de app), dan gaat hij mee.", ok: "Begrepen", close: "Sluiten",
    },
    en: {
      title: "Daily reminder",
      lead: "One message a day, only if you haven't played the daily yet. Skip a week and they stop by themselves.",
      first: (d) => `First reminder: ${d}`, today: "today", tomorrow: "tomorrow",
      blocked: "Too close to the new daily", mark: "new daily", pick: "Reminder time",
      enable: "Turn on reminder", busy: "One moment…", on: "Reminder is on", done: "Done", off: "Turn off",
      denied: "Notifications for jaardle.com are blocked in your browser. Allow them via the lock next to the address, then try again.",
      error: "Couldn't turn on the reminder. Please try again later.",
      ios: "On iPhone, Jaardle can only send reminders from your home screen. One-time setup:",
      ios1: (i) => `Tap ${i} <b>Share</b> at the bottom`, ios2: (i) => `Choose ${i} <b>Add to Home Screen</b>`,
      ios3: (i) => `Open Jaardle from your home screen and tap ${i}`,
      iosNote: "Your streak lives in Safari right now. Log in (in the app too) and it comes along.", ok: "Got it", close: "Close",
    },
    de: {
      title: "Tägliche Erinnerung",
      lead: "Eine Nachricht pro Tag, nur wenn du das Daily noch nicht gespielt hast. Eine Woche Pause? Dann hören sie von selbst auf.",
      first: (d) => `Erste Erinnerung: ${d}`, today: "heute", tomorrow: "morgen",
      blocked: "Zu kurz vor dem neuen Daily", mark: "neues Daily", pick: "Uhrzeit der Erinnerung",
      enable: "Erinnerung einschalten", busy: "Einen Moment…", on: "Erinnerung ist an", done: "Fertig", off: "Ausschalten",
      denied: "Mitteilungen für jaardle.com sind in deinem Browser blockiert. Erlaube sie über das Schloss neben der Adresse und versuche es erneut.",
      error: "Das Einschalten hat nicht geklappt. Versuche es später noch einmal.",
      ios: "Auf dem iPhone kann Jaardle nur vom Home-Bildschirm aus erinnern. Einmalig so:",
      ios1: (i) => `Tippe unten auf ${i} <b>Teilen</b>`, ios2: (i) => `Wähle ${i} <b>Zum Home-Bildschirm</b>`,
      ios3: (i) => `Öffne Jaardle vom Home-Bildschirm und tippe auf ${i}`,
      iosNote: "Deine Serie liegt gerade in Safari. Melde dich an (auch in der App), dann kommt sie mit.", ok: "Verstanden", close: "Schließen",
    },
    es: {
      title: "Recordatorio diario",
      lead: "Un mensaje al día, solo si aún no has jugado el diario. ¿Una semana sin jugar? Dejan de llegar solos.",
      first: (d) => `Primer recordatorio: ${d}`, today: "hoy", tomorrow: "mañana",
      blocked: "Muy poco antes del nuevo diario", mark: "nuevo diario", pick: "Hora del recordatorio",
      enable: "Activar recordatorio", busy: "Un momento…", on: "Recordatorio activado", done: "Listo", off: "Desactivar",
      denied: "Las notificaciones de jaardle.com están bloqueadas en tu navegador. Permítelas con el candado junto a la dirección y vuelve a intentarlo.",
      error: "No se pudo activar el recordatorio. Inténtalo más tarde.",
      ios: "En iPhone, Jaardle solo puede enviarte recordatorios desde tu pantalla de inicio. Se hace una vez:",
      ios1: (i) => `Toca ${i} <b>Compartir</b> abajo`, ios2: (i) => `Elige ${i} <b>Añadir a pantalla de inicio</b>`,
      ios3: (i) => `Abre Jaardle desde tu pantalla de inicio y toca ${i}`,
      iosNote: "Tu racha está ahora en Safari. Inicia sesión (también en la app) y vendrá contigo.", ok: "Entendido", close: "Cerrar",
    },
    pt: {
      title: "Lembrete diário",
      lead: "Uma mensagem por dia, só se você ainda não jogou o diário. Uma semana sem jogar? Eles param sozinhos.",
      first: (d) => `Primeiro lembrete: ${d}`, today: "hoje", tomorrow: "amanhã",
      blocked: "Muito perto do novo diário", mark: "novo diário", pick: "Hora do lembrete",
      enable: "Ativar lembrete", busy: "Um momento…", on: "Lembrete ativado", done: "Pronto", off: "Desativar",
      denied: "As notificações de jaardle.com estão bloqueadas no seu navegador. Permita-as pelo cadeado ao lado do endereço e tente de novo.",
      error: "Não foi possível ativar o lembrete. Tente mais tarde.",
      ios: "No iPhone, o Jaardle só pode enviar lembretes a partir da tela de início. É só uma vez:",
      ios1: (i) => `Toque em ${i} <b>Compartilhar</b> embaixo`, ios2: (i) => `Escolha ${i} <b>Adicionar à Tela de Início</b>`,
      ios3: (i) => `Abra o Jaardle pela tela de início e toque em ${i}`,
      iosNote: "Sua sequência está no Safari agora. Entre (também no app) e ela vem junto.", ok: "Entendi", close: "Fechar",
    },
  };

  const BELL = `<svg class="rm-bell" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g class="rm-bell-sw"><path d="M12 2.6a1.4 1.4 0 0 1 1.4 1.4v.55A6.2 6.2 0 0 1 18.2 10.6v3.9l1.55 2.3a.9.9 0 0 1-.75 1.4H5a.9.9 0 0 1-.75-1.4l1.55-2.3v-3.9a6.2 6.2 0 0 1 4.8-6.05V4A1.4 1.4 0 0 1 12 2.6Z" fill="currentColor"/><path d="M9.6 19.4h4.8a2.4 2.4 0 0 1-4.8 0Z" fill="currentColor"/></g></svg>`;
  const SHARE = `<svg class="rm-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 3v12M8 7l4-4 4 4M7 10H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1"/></svg>`;
  const PLUS = `<svg class="rm-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M12 8v8M8 12h8"/></svg>`;
  // De duim van de tijdlijn: een witte knop met de bel erin (CSP: img-src staat data: toe).
  const THUMB = "data:image/svg+xml," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2.6a1.4 1.4 0 0 1 1.4 1.4v.55A6.2 6.2 0 0 1 18.2 10.6v3.9l1.55 2.3a.9.9 0 0 1-.75 1.4H5a.9.9 0 0 1-.75-1.4l1.55-2.3v-3.9a6.2 6.2 0 0 1 4.8-6.05V4A1.4 1.4 0 0 1 12 2.6Z M9.6 19.4h4.8a2.4 2.4 0 0 1-4.8 0Z" fill="#2a3550"/></svg>`);

  // De lucht van een dag, 7 → 22 uur: ochtendgloed, middagblauw, avondrood, schemering, nacht.
  const SKY = [[7, "#f2b27c"], [9, "#a9d4f5"], [12, "#79b4f2"], [16, "#86b3e8"], [18.5, "#ef9467"], [20, "#9a6db4"], [22, "#3b3f86"]];
  const pct = (h) => ((h - FIRST) / (LAST - FIRST)) * 100;
  const skyCss = () => `linear-gradient(90deg, ${SKY.map(([h, c]) => `${c} ${pct(h).toFixed(1)}%`).join(", ")})`;

  const CSS = `
#modal-remind .modal-card { max-width: 22rem; }
#modal-remind .modal-header h2 { display: flex; align-items: center; gap: 0.5rem; }
.rm-bell { width: 1.15em; height: 1.15em; flex: none; color: var(--muted); overflow: visible; }
.rm-bell-sw { transform-origin: 12px 3.2px; transform-box: view-box; }
#modal-remind.is-on .modal-header .rm-bell { color: var(--gold-text); }
#modal-remind.ring .modal-header .rm-bell-sw { animation: rm-ring 1.1s cubic-bezier(.36,.07,.19,.97) 1; }
@keyframes rm-ring { 0%,100% { transform: none; } 12% { transform: rotate(16deg); } 26% { transform: rotate(-13deg); } 40% { transform: rotate(9deg); } 54% { transform: rotate(-6deg); } 68% { transform: rotate(3deg); } 82% { transform: rotate(-1deg); } }
.rm-lead { margin: 0; color: var(--muted); font-size: 0.9rem; line-height: 1.45; }
.rm-dial { margin: 0.35rem 0 0; text-align: center; }
.rm-time { display: block; font-size: 2.75rem; font-weight: 750; line-height: 1.05; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; color: var(--fg); transition: opacity 0.15s; }
.rm-first { display: block; min-height: 1.35em; margin-top: 0.2rem; font-size: 0.86rem; color: var(--muted); }
.rm-dial.is-blocked .rm-time { opacity: 0.38; }
.rm-dial.is-blocked .rm-first { color: var(--loss-soft); }
#modal-remind.is-on .rm-first { color: var(--green-text); }
.rm-line { position: relative; margin: 0.55rem 2px 0; padding-top: 4px; }
.rm-line.has-mark { padding-top: 20px; }
.rm-range { -webkit-appearance: none; appearance: none; display: block; width: 100%; height: 40px; margin: 0; background: transparent; cursor: pointer; position: relative; z-index: 2; touch-action: pan-y; }
.rm-range:focus { outline: none; }
.rm-range::-webkit-slider-runnable-track { height: 12px; border-radius: 999px; background: transparent; }
.rm-range::-moz-range-track { height: 12px; border-radius: 999px; background: transparent; }
.rm-range::-webkit-slider-thumb { -webkit-appearance: none; width: 30px; height: 30px; margin-top: -9px; border-radius: 50%; background: #fff url("${THUMB}") center / 17px no-repeat; border: 0; box-shadow: 0 3px 10px rgba(0,0,0,.45), 0 0 0 4px color-mix(in srgb, var(--card) 65%, transparent); }
.rm-range::-moz-range-thumb { width: 30px; height: 30px; border-radius: 50%; background: #fff url("${THUMB}") center / 17px no-repeat; border: 0; box-shadow: 0 3px 10px rgba(0,0,0,.45), 0 0 0 4px color-mix(in srgb, var(--card) 65%, transparent); }
.rm-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 3px 10px rgba(0,0,0,.45), 0 0 0 3px var(--card), 0 0 0 5px var(--accent); }
.rm-range:focus-visible::-moz-range-thumb { box-shadow: 0 3px 10px rgba(0,0,0,.45), 0 0 0 3px var(--card), 0 0 0 5px var(--accent); }
.rm-sky, .rm-block { position: absolute; top: calc(4px + 14px); height: 12px; border-radius: 999px; pointer-events: none; }
.has-mark .rm-sky, .has-mark .rm-block { top: calc(20px + 14px); }
.rm-sky { left: 0; right: 0; background: ${skyCss()}; box-shadow: inset 0 0 0 1px rgba(255,255,255,.12), 0 1px 0 rgba(0,0,0,.25); }
.rm-block { border-radius: 2px; background: repeating-linear-gradient(135deg, var(--card) 0 2.5px, color-mix(in srgb, var(--fg) 30%, var(--card)) 2.5px 4.5px); box-shadow: 0 0 0 2px var(--card); }
.rm-mark { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; font-size: 0.68rem; font-weight: 600; color: var(--muted); }
.rm-mark-l { transform: translateX(-11px); }
.rm-mark-r { transform: translateX(calc(-100% + 11px)); }
.rm-mark-l::after { left: 11px; }
.rm-mark-r::after { left: auto; right: 10px; }
.rm-mark::after { content: ""; position: absolute; left: 50%; top: 100%; width: 2px; height: 22px; margin-left: -1px; border-radius: 1px; background: var(--fg); opacity: 0.75; }
.rm-axis { position: relative; height: 1.1rem; margin: 0.15rem 2px 0; font-size: 0.7rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.rm-axis span { position: absolute; top: 0; transform: translateX(-50%); white-space: nowrap; }
.rm-act { display: flex; flex-direction: column; align-items: stretch; gap: 0.35rem; margin-top: 0.7rem; }
.rm-go { min-height: 46px; border: 0; border-radius: 10px; background: var(--accent); color: var(--on-accent); font: inherit; font-weight: 700; font-size: 0.98rem; cursor: pointer; }
.rm-go:disabled { opacity: 0.55; cursor: default; }
.rm-go:not(:disabled):hover { filter: brightness(1.07); }
.rm-go:focus-visible, .rm-off:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
.rm-off { align-self: center; min-height: 40px; padding: 0 0.9rem; border: 0; background: transparent; color: var(--muted); font: inherit; font-size: 0.86rem; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.rm-off:hover { color: var(--fg); }
.rm-msg[hidden] { display: none; }
.rm-msg { margin: 0; padding: 0.6rem 0.75rem; border-radius: 8px; background: var(--card-soft); font-size: 0.86rem; line-height: 1.4; }
.rm-steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6rem; counter-reset: rm; }
.rm-steps li { display: grid; grid-template-columns: 1.65rem minmax(0, 1fr); gap: 0.6rem; align-items: center; font-size: 0.93rem; line-height: 1.35; counter-increment: rm; }
.rm-steps li::before { content: counter(rm); display: grid; place-items: center; width: 1.65rem; height: 1.65rem; border-radius: 50%; background: var(--card-soft); border: 1px solid var(--border); font-size: 0.78rem; font-weight: 700; }
.rm-ico { display: inline-block; width: 1.3em; height: 1.3em; vertical-align: -0.3em; color: var(--accent); }
.rm-steps .rm-bell { display: inline-block; width: 1.1em; height: 1.1em; vertical-align: -0.2em; color: var(--gold-text); }
.rm-note { margin: 0; padding-top: 0.65rem; border-top: 1px solid var(--border); font-size: 0.8rem; color: var(--muted); line-height: 1.4; }
@media (prefers-reduced-motion: reduce) { #modal-remind.ring .modal-header .rm-bell-sw { animation: none; } .rm-time { transition: none; } }
`;

  let host = null;
  const T = () => TXT[host?.lang] || TXT.en;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function load() { try { return { on: false, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch (e) { return { on: false }; } }
  function save(st) { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
  const tzNow = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) { return "UTC"; } };

  // 'push' = kan hier; 'ios' = iPhone/iPad in de browser (alleen vanaf het beginscherm); null = deze browser kan het niet.
  function support() {
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) return "push";
    const ios = /iP(hone|ad|od)/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    return ios && !standalone ? "ios" : null;
  }

  // Waar valt de nieuwe daily in jouw dag, en welke uren mogen? `now` in ms, `secsToReset` = seconden tot 00:00 Amsterdam.
  // Per uur h (lokaal, hele uren): de minuten van h:00 tot de eerstvolgende nieuwe daily; minder dan MARGIN = gearceerd.
  function hoursInfo(now, secsToReset) {
    const reset = new Date(now + secsToReset * 1000);
    const resetMin = reset.getHours() * 60 + reset.getMinutes();
    const hours = [];
    for (let h = FIRST; h <= LAST; h++) {
      const left = (((resetMin - h * 60) % 1440) + 1440) % 1440 || 1440;
      hours.push({ h, ok: left >= MARGIN });
    }
    const resetH = resetMin / 60;
    return { hours, resetH: resetH >= FIRST && resetH <= LAST ? resetH : null };
  }
  const isOk = (info, h) => !!info.hours.find((x) => x.h === h && x.ok);
  // Dichtstbijzijnde geldige uur; met dir (+1/−1) eerst in die richting, zodat je met de pijltjes óver een gearceerd stuk heen komt.
  function nearestOk(info, h, dir = 1) {
    for (let d = 0; d <= LAST - FIRST; d++) {
      if (isOk(info, h + dir * d)) return h + dir * d;
      if (isOk(info, h - dir * d)) return h - dir * d;
    }
    return 19;
  }
  // Wanneer komt het eerste seintje? Het eerstvolgende h:00 ná nu; valt dat nog vóór de nieuwe daily, dan hoort het bij de
  // daily die je net speelde en slaat de server het over → een dag later. Geeft 'today' of 'tomorrow'.
  function firstDay(now, secsToReset, h) {
    const d = new Date(now); d.setMinutes(0, 0, 0); d.setHours(h);
    if (d.getTime() <= now) d.setDate(d.getDate() + 1);
    if (d.getTime() < now + secsToReset * 1000) d.setDate(d.getDate() + 1);
    const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
    return day(d) === day(new Date(now)) ? "today" : "tomorrow";
  }
  // Tijden in de taal van het spel, met de regio van de browser als die dezelfde taal is (en-US → 7:00 PM, en-GB → 19:00);
  // een Nederlandse speler met een Engelstalige browser ziet dus 19:00, zoals de rest van het spel.
  const timeLocale = () => { const n = navigator.language || ""; const l = host?.lang || "en"; return n.toLowerCase().startsWith(l) ? n : l; };
  function fmtHour(h, m = 0) {
    const d = new Date(2026, 0, 1, Math.floor(h), m);
    try { return new Intl.DateTimeFormat(timeLocale(), { hour: "numeric", minute: "2-digit" }).format(d); }
    catch (e) { return `${Math.floor(h)}:${String(m).padStart(2, "0")}`; }
  }
  function fmtTick(h) {
    try { return new Intl.DateTimeFormat(timeLocale(), { hour: "numeric" }).format(new Date(2026, 0, 1, h)).replace(/\s?(uur|Uhr)$/, "").replace(/^0(?=\d)/, ""); }
    catch (e) { return String(h); }
  }
  function b64u(s) {
    const pad = "=".repeat((4 - (s.length % 4)) % 4);
    const raw = atob((s + pad).replace(/-/g, "+").replace(/_/g, "/"));
    return Uint8Array.from(raw, (c) => c.charCodeAt(0));
  }

  let el = null, info = null, st = null, saveTimer = null, show = () => {};
  function ensureCss() {
    if (document.getElementById("remind-css")) return;
    const s = document.createElement("style"); s.id = "remind-css"; s.textContent = CSS; document.head.appendChild(s);
  }

  function open(api) {
    host = api;
    ensureCss();
    document.getElementById("modal-remind")?.remove();
    st = load();
    const mode = support();
    el = document.createElement("div");
    el.id = "modal-remind";
    el.className = "modal" + (st.on ? " is-on" : "");
    el.hidden = true;
    el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "remind-title");
    const t = T();
    const head = `<div class="modal-backdrop" data-close></div><div class="modal-card"><header class="modal-header"><h2 id="remind-title">${BELL}${esc(t.title)}</h2>` +
      `<button type="button" class="modal-close" data-close aria-label="${esc(t.close)}">✕</button></header><div class="modal-body">`;
    if (mode === "ios") {
      el.innerHTML = head + `<p class="rm-lead">${esc(t.ios)}</p><ol class="rm-steps"><li><span>${t.ios1(SHARE)}</span></li><li><span>${t.ios2(PLUS)}</span></li>` +
        `<li><span>${t.ios3(BELL)}</span></li></ol>` + (host.loggedIn ? "" : `<p class="rm-note">${esc(t.iosNote)}</p>`) +
        `<div class="rm-act"><button type="button" class="rm-go" data-close>${esc(t.ok)}</button></div></div></div>`;
    } else {
      info = hoursInfo(Date.now(), host.secsToReset());
      const start = st.hour != null ? st.hour : new Date().getHours();
      const h = isOk(info, start) ? start : nearestOk(info, Math.min(LAST, Math.max(FIRST, start)));
      const blocks = [];   // aaneengesloten gearceerde stukken, een half uur aan weerszijden (de duim staat óp het uur)
      for (const x of info.hours) {
        if (x.ok) continue;
        const last = blocks[blocks.length - 1];
        if (last && last.to === x.h - 1) last.to = x.h; else blocks.push({ from: x.h, to: x.h });
      }
      const ticks = [7, 10, 13, 16, 19, 22];
      el.innerHTML = head + `<p class="rm-lead">${esc(t.lead)}</p>` +
        `<div class="rm-dial" aria-live="polite"><span class="rm-time"></span><span class="rm-first"></span></div>` +
        `<div class="rm-line${info.resetH != null ? " has-mark" : ""}"><div class="rm-sky"></div>` +
        blocks.map((b) => `<div class="rm-block" style="${posCss(Math.max(FIRST, b.from - 0.5), Math.min(LAST, b.to + 0.5))}"></div>`).join("") +
        (info.resetH != null ? `<span class="rm-mark${info.resetH < 9.5 ? " rm-mark-l" : info.resetH > 19.5 ? " rm-mark-r" : ""}" style="left:${xCss(info.resetH)}">${esc(t.mark)} ${esc(fmtHour(info.resetH, Math.round((info.resetH % 1) * 60)))}</span>` : "") +
        `<input class="rm-range" type="range" min="${FIRST}" max="${LAST}" step="1" value="${h}" aria-label="${esc(t.pick)}"></div>` +
        `<div class="rm-axis" aria-hidden="true">${ticks.map((x) => `<span style="left:${xCss(x)}">${esc(fmtTick(x))}</span>`).join("")}</div>` +
        `<p class="rm-msg" hidden></p>` +
        `<div class="rm-act"><button type="button" class="rm-go"></button><button type="button" class="rm-off" hidden>${esc(t.off)}</button></div></div></div>`;
    }
    document.body.appendChild(el);
    el.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => host.closeModal("modal-remind")));
    if (mode !== "ios") wire();
    host.openModal("modal-remind");
    host.gc?.("remind-open", "Reminder: opened");
  }
  // De duim loopt van 15 px tot (breedte − 15 px): posities rekenen met dezelfde inzet, anders staat het streepje naast het uur.
  const xCss = (h) => `calc(15px + (100% - 30px) * ${((h - FIRST) / (LAST - FIRST)).toFixed(4)})`;
  const posCss = (a, b) => `left:${xCss(a)};width:calc((100% - 30px) * ${((b - a) / (LAST - FIRST)).toFixed(4)})`;

  function wire() {
    const t = T(), range = el.querySelector(".rm-range"), dial = el.querySelector(".rm-dial"), go = el.querySelector(".rm-go"), off = el.querySelector(".rm-off");
    let prev = Number(range.value);
    show = () => {
      const h = Number(range.value), ok = isOk(info, h);
      dial.classList.toggle("is-blocked", !ok);
      el.querySelector(".rm-time").textContent = fmtHour(h);
      el.querySelector(".rm-first").textContent = !ok ? t.blocked
        : st.on ? `${t.on} · ${t.first(t[firstDay(Date.now(), host.secsToReset(), h)])}`
        : t.first(t[firstDay(Date.now(), host.secsToReset(), h)]);
      go.disabled = !ok && !st.on;
      go.textContent = st.on ? t.done : t.enable;
      off.hidden = !st.on;
      el.classList.toggle("is-on", !!st.on);
      range.setAttribute("aria-valuetext", fmtHour(h));
    };
    range.addEventListener("input", show);
    range.addEventListener("change", () => {
      const h = Number(range.value);
      if (!isOk(info, h)) { range.value = String(nearestOk(info, h, h >= prev ? 1 : -1)); show(); }
      prev = Number(range.value);
      if (st.on) { clearTimeout(saveTimer); saveTimer = setTimeout(() => enable(true), 350); }   // tijd verzetten = abonnement bijwerken
    });
    go.addEventListener("click", () => (st.on ? host.closeModal("modal-remind") : enable(false)));
    off.addEventListener("click", disable);
    show();
  }

  function message(txt) {
    const m = el.querySelector(".rm-msg");
    m.textContent = txt || ""; m.hidden = !txt;
  }

  // Aanzetten (of, met quiet, alleen de tijd bijwerken). De toestemming vragen we als eerste, nog binnen de tik.
  async function enable(quiet) {
    const t = T(), go = el.querySelector(".rm-go"), range = el.querySelector(".rm-range");
    const hour = Number(range.value);
    if (!isOk(info, hour)) return;
    message("");
    if (!quiet) { go.disabled = true; go.textContent = t.busy; }
    try {
      const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (perm !== "granted") { host.gc?.("remind-denied", "Reminder: permission denied"); message(t.denied); show(); return; }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(VAPID) });
      const j = sub.toJSON(), tz = tzNow();
      const ok = await host.rpc("set_push_sub", {
        p_endpoint: j.endpoint, p_p256dh: j.keys.p256dh, p_auth: j.keys.auth,
        p_tz: tz, p_hour: hour, p_lang: host.lang, p_client_id: host.clientId(),
      });
      if (ok === false) throw new Error("set_push_sub weigerde");
      const was = st.on;
      st = { on: true, hour, tz, ep: j.endpoint };
      save(st);
      if (!was) {
        host.gc?.("remind-on", "Reminder: on");
        el.classList.remove("ring"); void el.offsetWidth; el.classList.add("ring");
      }
      host.onChange?.(st);
    } catch (e) {
      message(t.error);
    }
    show();
  }

  async function disable() {
    message("");
    try {
      const reg = await navigator.serviceWorker.getRegistration("/");
      const sub = await reg?.pushManager.getSubscription();
      const ep = sub?.endpoint || st.ep;
      if (sub) await sub.unsubscribe();
      if (ep) await host.rpc("del_push_sub", { p_endpoint: ep }).catch(() => {});
    } catch (e) {}
    st = { on: false, hour: st.hour };
    save(st);
    host.gc?.("remind-off", "Reminder: off");
    host.onChange?.(st);
    el.classList.remove("ring");
    show();
  }

  return { open, support, hoursInfo, firstDay, nearestOk, KEY };
})();
