const MAX_GUESSES = 6;
const FACTS_PER_PUZZLE = 1;
const MAX_EXTRA_HINTS = 2;
const MAX_DIRECTION_HINTS = 2;
const EPOCH = new Date(Date.UTC(2026, 0, 1));
const MIN_YEAR = -753;
const MAX_YEAR = new Date().getFullYear();

// --- i18n (NL/EN) ------------------------------------------------------------
// Taalkeuze: pad (/en) > ?lang= > opgeslagen voorkeur > NL.
let lang = (() => {
  try {
    const p = location.pathname.replace(/\/+$/, "");
    if (p === "/en" || p.endsWith("/en")) return "en";
    const q = new URLSearchParams(location.search).get("lang");
    if (q === "en" || q === "nl") return q;
    return localStorage.getItem("jaardle:lang") === "en" ? "en" : "nl";
  } catch (e) { return "nl"; }
})();

const HELP_NL = `
  <li>Je krijgt een gebeurtenis uit een jaar en <span data-help="max-guesses"></span> pogingen om dat jaar te raden. Max <span data-help="max-text-hints"></span> extra hints (💡) beschikbaar.</li>
  <li>Per gok zie je een gekleurde badge met range. Richting (↑/↓) is verborgen tot je 'm vraagt.</li>
  <li>Max <strong><span data-help="max-dir-hints"></span> richting-hints</strong> (🧭) per puzzel. Een richting-hint onthult pijl alleen op je laatste gok.</li>
  <li>🟩 0 &nbsp; 🟪 1–2 &nbsp; 🟨 3–10 &nbsp; 🟧 11–25 &nbsp; 🟥 26–50 &nbsp; 🟫 51–200 &nbsp; ⬜ 200+</li>
  <li><strong>Score (0–100)</strong>: start op 100, strafpunten per misgok: 🟪 <span data-penalty="veryclose"></span> · 🟨 <span data-penalty="close"></span> · 🟧 <span data-penalty="warm"></span> · 🟥 <span data-penalty="cool"></span> · 🟫 <span data-penalty="far"></span> · ⬜ <span data-penalty="distant"></span>. Hints kosten 💡 <span data-penalty="text-hint"></span> en 🧭 <span data-penalty="dir-hint"></span>. Verloren = 0.</li>
  <li>Tiers: <span data-help="tiers"></span></li>
  <li><strong>Dagelijkse Jaardle</strong>: elke dag één puzzel die voor iedereen gelijk is.</li>
  <li><strong>Nieuw spel</strong>: oneindig rondjes, willekeurige gebeurtenis.</li>
  <li><strong>Toetsen</strong>: cijfers + Enter om te gokken, <kbd>−</kbd> voor v.Chr., <kbd>E</kbd> voor extra hint, <kbd>R</kbd> voor richting-hint, <kbd>D</kbd>/<kbd>N</kbd> om te wisselen.</li>`;
const HELP_EN = `
  <li>You get an event from a year and <span data-help="max-guesses"></span> guesses to find that year. Up to <span data-help="max-text-hints"></span> extra hints (💡) available.</li>
  <li>Each guess shows a coloured badge with a range. Direction (↑/↓) stays hidden until you ask for it.</li>
  <li>Max <strong><span data-help="max-dir-hints"></span> direction hints</strong> (🧭) per puzzle. A direction hint reveals the arrow only on your latest guess.</li>
  <li>🟩 0 &nbsp; 🟪 1–2 &nbsp; 🟨 3–10 &nbsp; 🟧 11–25 &nbsp; 🟥 26–50 &nbsp; 🟫 51–200 &nbsp; ⬜ 200+</li>
  <li><strong>Score (0–100)</strong>: starts at 100, penalty per wrong guess: 🟪 <span data-penalty="veryclose"></span> · 🟨 <span data-penalty="close"></span> · 🟧 <span data-penalty="warm"></span> · 🟥 <span data-penalty="cool"></span> · 🟫 <span data-penalty="far"></span> · ⬜ <span data-penalty="distant"></span>. Hints cost 💡 <span data-penalty="text-hint"></span> and 🧭 <span data-penalty="dir-hint"></span>. Lost = 0.</li>
  <li>Tiers: <span data-help="tiers"></span></li>
  <li><strong>Daily Jaardle</strong>: one puzzle a day, the same for everyone.</li>
  <li><strong>New game</strong>: endless rounds, a random event.</li>
  <li><strong>Keys</strong>: digits + Enter to guess, <kbd>−</kbd> for BC, <kbd>E</kbd> for an extra hint, <kbd>R</kbd> for a direction hint, <kbd>D</kbd>/<kbd>N</kbd> to switch.</li>`;

const I18N = {
  nl: {
    tab_daily: "Dagelijkse Jaardle", tab_free: "Nieuw spel",
    menu_stats: "📊 Statistieken", menu_login: "🔑 Inloggen", menu_logout: "Uitloggen", menu_loggedin: "Ingelogd",
    guess: "Gok", share: "Deel resultaat", next: "Nieuw rondje",
    hint_text: "💡 Extra hint", hint_dir: "🧭 Richting",
    help_summary: "Hoe werkt het?", stats_title: "📊 Statistieken",
    login_title: "Inloggen", login_google: "Doorgaan met Google", login_or: "of met e-mail",
    login_email: "E-mail", login_password: "Wachtwoord", login_submit: "Inloggen", login_register: "Registreren",
    login_note: `Inloggen verloopt via <a href="https://supabase.com/docs/guides/auth" target="_blank" rel="noopener">Supabase Auth</a> (Google). Wachtwoorden worden gehasht opgeslagen (bcrypt), nooit als platte tekst, en alleen jouw e-mail en spelscores worden bewaard — niet gedeeld met derden.`,
    footer_note: `Gebeurtenissen + Nederlandse vertalingen onder <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.nl" target="_blank" rel="noopener">CC BY-SA 4.0</a>, afgeleid van <a href="https://en.wikipedia.org/wiki/Main_Page" target="_blank" rel="noopener">Engelstalige Wikipedia</a> (machine-vertaald).`,
    day: "Dag", loading: "Laden…",
    err_load: "Kon de gebeurtenis niet laden.", err_share: "Deze gedeelde puzzel bestaat niet meer.",
    err_none: "Geen puzzel beschikbaar.", retry: "Opnieuw proberen",
    won_intro: "Goed geraden! Het was", lost_intro: "Helaas — het juiste jaar was", source: "Bron:",
    stats_empty: "Nog geen dagelijkse puzzels afgerond.",
    stat_played: "Gespeeld", stat_winrate: "Win-rate", stat_curstreak: "Huidige streak",
    stat_beststreak: "Beste streak", stat_avgscore: "Gem. score", stat_won: "Gewonnen",
    cal_title: "Laatste maanden", cal_notsolved: "niet opgelost",
    peek_title: "Houd ingedrukt voor de Engelse tekst", free_tag: "(vrij)", lost_share: "💀 Niet gekraakt",
    tiers: { perfect: "Perfect", impressive: "Indrukwekkend", good: "Goed", solid: "Solide", justmade: "Net gehaald", lost: "Volgende keer beter" },
    help_list: HELP_NL,
  },
  en: {
    tab_daily: "Daily Jaardle", tab_free: "New game",
    menu_stats: "📊 Statistics", menu_login: "🔑 Sign in", menu_logout: "Sign out", menu_loggedin: "Signed in",
    guess: "Guess", share: "Share result", next: "New round",
    hint_text: "💡 Extra hint", hint_dir: "🧭 Direction",
    help_summary: "How to play?", stats_title: "📊 Statistics",
    login_title: "Sign in", login_google: "Continue with Google", login_or: "or with email",
    login_email: "Email", login_password: "Password", login_submit: "Sign in", login_register: "Register",
    login_note: `Sign-in is handled by <a href="https://supabase.com/docs/guides/auth" target="_blank" rel="noopener">Supabase Auth</a> (Google). Passwords are stored hashed (bcrypt), never as plain text, and only your email and game scores are kept — not shared with third parties.`,
    footer_note: `Events + Dutch translations under <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.en" target="_blank" rel="noopener">CC BY-SA 4.0</a>, derived from <a href="https://en.wikipedia.org/wiki/Main_Page" target="_blank" rel="noopener">English Wikipedia</a> (machine-translated).`,
    day: "Day", loading: "Loading…",
    err_load: "Couldn't load the event.", err_share: "This shared puzzle no longer exists.",
    err_none: "No puzzle available.", retry: "Try again",
    won_intro: "Well guessed! It was", lost_intro: "Too bad — the year was", source: "Source:",
    stats_empty: "No daily puzzles finished yet.",
    stat_played: "Played", stat_winrate: "Win rate", stat_curstreak: "Current streak",
    stat_beststreak: "Best streak", stat_avgscore: "Avg. score", stat_won: "Won",
    cal_title: "Last few months", cal_notsolved: "not solved",
    peek_title: "Hold to see the Dutch text", free_tag: "(free)", lost_share: "💀 Not cracked",
    tiers: { perfect: "Perfect", impressive: "Impressive", good: "Good", solid: "Solid", justmade: "Just made it", lost: "Better luck next time" },
    help_list: HELP_EN,
  },
};

function t(key) {
  const v = I18N[lang] && I18N[lang][key];
  return v != null ? v : I18N.nl[key];
}
function tierLabel(tier) {
  return (t("tiers") || {})[tier.key] || tier.label;
}

// Pas de gekozen taal toe op alle UI. Idempotent — kan altijd opnieuw.
function applyLang() {
  try { localStorage.setItem("jaardle:lang", lang); } catch (e) {}
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = t(el.dataset.i18n); if (v != null) el.textContent = v;
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const v = t(el.dataset.i18nHtml); if (v != null) el.innerHTML = v;
  });
  const help = document.getElementById("help-list");
  if (help) help.innerHTML = t("help_list");
  renderHelpConstants();
  const langItem = document.querySelector('#menu-pop [data-action="lang"]');
  if (langItem) langItem.textContent = lang === "nl" ? "🇬🇧 English" : "🇳🇱 Nederlands";
  if (els.dayLabel) els.dayLabel.textContent = `${t("day")} #${daysSince(EPOCH) + 1}`;
  if (els.eventCard) els.eventCard.title = t("peek_title");
  renderMenu();
  if (state) {
    renderEvent();
    renderHintStatus();
    if (state.done) finishGame(state.won);
  }
  const sm = document.getElementById("modal-stats");
  if (sm && !sm.hidden) renderStats();
}

function toggleLang() {
  lang = lang === "nl" ? "en" : "nl";
  applyLang();
  // Houd de URL in lijn met de taal: /en voor Engels, / voor Nederlands (query
  // zoals ?p=... blijft behouden). Direct bezoek aan /en werkt via en/index.html.
  try { history.replaceState(null, "", (lang === "en" ? "/en" : "/") + location.search); }
  catch (e) {}
}

// Debug-flag onthult WIP-features (account-menu, stats) zonder ze voor
// publieke users zichtbaar te maken. Aan op localhost, of via ?debug=1
// (blijft daarna in localStorage staan tot ?debug=0).
const DEBUG = (() => {
  const params = new URLSearchParams(location.search);
  if (params.get("debug") === "1") localStorage.setItem("jaardle:debug", "1");
  if (params.get("debug") === "0") localStorage.removeItem("jaardle:debug");
  return (
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    localStorage.getItem("jaardle:debug") === "1"
  );
})();
const els = {
  eventText: document.getElementById("event-text"),
  eventCard: document.getElementById("event-card"),
  hintBtnText: document.getElementById("hint-btn-text"),
  hintBtnDir: document.getElementById("hint-btn-direction"),
  hintCount: document.getElementById("hint-count"),
  guesses: document.getElementById("guesses"),
  input: document.getElementById("year-input"),
  keypad: document.getElementById("keypad"),
  signBtn: document.getElementById("sign-btn"),
  backspaceBtn: document.getElementById("backspace-btn"),
  guessBtn: document.getElementById("guess-btn"),
  result: document.getElementById("result"),
  resultText: document.getElementById("result-text"),
  revealRow: document.getElementById("reveal-row"),
  source: document.getElementById("event-source"),
  shareBtn: document.getElementById("share-btn"),
  nextBtn: document.getElementById("next-btn"),
  dayLabel: document.getElementById("day-label"),
  tabs: Array.from(document.querySelectorAll("#mode-tabs .tab")),
};

const MAX_DIGITS = 4;

function getYearString() {
  return els.input.textContent;
}

function setYearString(s) {
  els.input.textContent = s;
  updateSignBtn();
}

function clearYear() {
  setYearString("");
}

function appendDigit(d) {
  if (isKeypadDisabled()) return;
  const cur = getYearString();
  const neg = cur.startsWith("-");
  const digits = neg ? cur.slice(1) : cur;
  if (digits.length >= MAX_DIGITS) return;
  setYearString((neg ? "-" : "") + digits + d);
}

function backspaceYear() {
  if (isKeypadDisabled()) return;
  const cur = getYearString();
  const neg = cur.startsWith("-");
  const digits = neg ? cur.slice(1) : cur;
  if (digits.length === 0) {
    if (neg) setYearString("");
    return;
  }
  const trimmed = digits.slice(0, -1);
  setYearString((neg && trimmed.length > 0 ? "-" : "") + trimmed);
}

function toggleSign() {
  if (isKeypadDisabled()) return;
  const cur = getYearString();
  if (cur.startsWith("-")) setYearString(cur.slice(1));
  else if (cur.length > 0) setYearString("-" + cur);
  else setYearString("-");
}

function updateSignBtn() {
  const neg = getYearString().startsWith("-");
  els.signBtn.classList.toggle("negative", neg);
  els.signBtn.setAttribute("aria-pressed", neg ? "true" : "false");
}

function isKeypadDisabled() {
  return els.keypad.classList.contains("disabled");
}

function setKeypadDisabled(disabled) {
  els.keypad.classList.toggle("disabled", disabled);
  els.keypad.querySelectorAll("button").forEach((b) => (b.disabled = disabled));
}

let state = null;

// --- Supabase RPC-bridge (window.sb wordt in index.html gezet) ---------------
function rpc(fn, args) {
  if (window.sb?.rpc) return window.sb.rpc(fn, args || {});
  return Promise.reject(new Error("Supabase nog niet geladen"));
}
function whenSbReady() {
  return new Promise((resolve) => {
    if (window.sb) return resolve();
    window.addEventListener("sb-ready", () => resolve(), { once: true });
  });
}

function arraysEqual(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length &&
    a.every((v, i) => v === b[i]);
}

// Een puzzle komt zo van de RPC's:
//   { year, hashes:[main,...extras], facts:[{hash,nl,en,source}], extras:[...] }
// state.event is de UI-vorm ({year, facts:[{nl,en}], extras:[{nl,en}], source});
// state.hashes is het share-token (main eerst).
function toEvent(puzzle) {
  const map = (f) => ({ nl: f.nl, en: f.en || "" });
  return {
    year: puzzle.year,
    facts: (puzzle.facts || []).map(map),
    extras: (puzzle.extras || []).map(map),
    source: puzzle.facts?.[0]?.source || "",
  };
}

// Laad/fout-status in de event-card.
function setCardStatus(msg, retry) {
  els.eventText.innerHTML = "";
  const p = document.createElement("p");
  p.className = "fact card-status";
  p.textContent = msg;
  els.eventText.appendChild(p);
  if (retry) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "retry-btn";
    b.textContent = t("retry");
    b.addEventListener("click", retry);
    els.eventText.appendChild(b);
  }
  els.eventCard?.classList.remove("has-en");
}

// Share-token = de puzzle-hashes aan elkaar (main eerst, dan extras). De server
// reconstrueert 'm via get_facts_by_hashes — geen index/jaar-afleiding meer.
function buildShareToken() {
  return (state?.hashes || []).join("");
}

// Parse share token (N × 10 hex) → array van hashes, of null.
function parseShareToken(token) {
  if (!/^[0-9a-f]+$/.test(token) || token.length % 10 !== 0 || token.length === 0) return null;
  return token.match(/.{10}/g);
}

// "Vandaag" in Europe/Amsterdam, zodat iedereen dezelfde dagpuzzel krijgt en het
// matcht met de server-gate in get_daily(). en-CA levert YYYY-MM-DD.
function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function daysSince(epoch) {
  const [y, m, d] = todayKey().split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - epoch.getTime()) / 86400000);
}

function storageKey(mode) {
  return mode === "daily" ? `jaardle:daily:${todayKey()}` : `jaardle:free:current`;
}

// Eenmalig: migreer state uit oude "yeardle-nl:" sleutels naar "jaardle:"
(function migrateLegacyStorage() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("yeardle-nl:")) {
        const newKey = "jaardle:" + k.slice("yeardle-nl:".length);
        if (localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, localStorage.getItem(k));
        }
        localStorage.removeItem(k);
      }
    }
  } catch (e) { /* private browsing etc. */ }
})();

function classify(diff) {
  const abs = Math.abs(diff);
  if (abs === 0) return "correct";
  if (abs <= 2) return "veryclose";
  if (abs <= 10) return "close";
  if (abs <= 25) return "warm";
  if (abs <= 50) return "cool";
  if (abs <= 200) return "far";
  return "distant";
}

function displaySource(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch (e) {
    return url;
  }
}

function emojiFor(cls) {
  return {
    correct: "🟩",
    veryclose: "🟪",
    close: "🟨",
    warm: "🟧",
    cool: "🟥",
    far: "🟫",
    distant: "⬜",
  }[cls];
}

function renderEvent() {
  els.eventText.innerHTML = "";
  state.event.facts.forEach((f) => appendFact(f, false));
  for (let i = 0; i < state.textHintsUsed; i++) {
    const f = state.event.extras[i];
    if (!f) continue;
    appendFact(f, true);
  }
  updateEnButton();
}

function appendFact(f, isExtra) {
  const p = document.createElement("p");
  p.className = "fact" + (isExtra ? " fact-extra" : "");
  p.dataset.nl = f.nl;
  p.dataset.en = f.en;
  p.textContent = (lang === "en" ? (f.en || f.nl) : f.nl);
  els.eventText.appendChild(p);
}

function updateEnButton() {
  // Markeer card als "kan peeken" zolang er minstens één EN beschikbaar is.
  const anyEn = Array.from(els.eventText.querySelectorAll(".fact"))
    .some((p) => p.dataset.en && p.dataset.en.length > 0);
  els.eventCard?.classList.toggle("has-en", anyEn);
}

function showFactsLang(lang) {
  els.eventText.querySelectorAll(".fact").forEach((p) => {
    const txt = lang === "en" ? p.dataset.en : p.dataset.nl;
    if (txt) p.textContent = txt;
  });
}

function renderHintStatus() {
  const availableExtras = Math.min(state.event.extras.length, MAX_EXTRA_HINTS);
  const textRemaining = availableExtras - state.textHintsUsed;
  const dirsLeft = MAX_DIRECTION_HINTS - state.directionsRevealed.length;
  const hasUnrevealedGuess =
    state.guesses.length > 0 &&
    !state.directionsRevealed.includes(state.guesses.length - 1);
  els.hintBtnText.hidden = state.done || textRemaining <= 0;
  els.hintBtnDir.hidden = state.done || dirsLeft <= 0 || !hasUnrevealedGuess;
  els.hintCount.textContent = `💡 ${state.textHintsUsed}/${MAX_EXTRA_HINTS} hints · 🧭 ${state.directionsRevealed.length}/${MAX_DIRECTION_HINTS} ${lang === "en" ? "directions" : "richtingen"}`;
}

function requestTextHint() {
  if (state.done) return;
  const available = Math.min(state.event.extras.length, MAX_EXTRA_HINTS);
  if (state.textHintsUsed >= available) return;
  state.textHintsUsed += 1;
  renderEvent();
  renderHintStatus();
  save();
}

function requestDirectionHint() {
  if (state.done) return;
  if (state.directionsRevealed.length >= MAX_DIRECTION_HINTS) return;
  if (state.guesses.length === 0) return;
  const latestIdx = state.guesses.length - 1;
  if (state.directionsRevealed.includes(latestIdx)) return;
  state.directionsRevealed.push(latestIdx);
  renderHintStatus();
  renderGuesses();
  // Pop-animatie op het zojuist onthulde pijltje. Double-rAF zodat de
  // browser de fresh arrow eerst paint zonder class, dan de class als
  // state-overgang detecteert. Class blijft staan — keyframes eindigen
  // op scale(1) dus geen cleanup nodig.
  const rows = els.guesses.querySelectorAll(".guess-row");
  const arrow = rows[latestIdx]?.querySelector(".delta-badge .arrow");
  if (arrow) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      arrow.classList.add("just-revealed");
    }));
  }
  save();
}

const RANGE_LABELS = {
  veryclose: "1–2",
  close: "3–10",
  warm: "11–25",
  cool: "26–50",
  far: "51–200",
  distant: "200+",
};

// Score: 100 - sum(penalty per wrong guess) - hint penalties.
const GUESS_PENALTIES = {
  correct: 0,
  veryclose: 3,
  close: 5,
  warm: 8,
  cool: 11,
  far: 13,
  distant: 15,
};
const TEXT_HINT_PENALTY = 5;
const DIRECTION_HINT_PENALTY = 3;

function computeScore() {
  if (!state.won) return 0;
  let s = 100;
  for (const g of state.guesses) s -= GUESS_PENALTIES[g.cls] || 0;
  s -= state.textHintsUsed * TEXT_HINT_PENALTY;
  s -= state.directionsRevealed.length * DIRECTION_HINT_PENALTY;
  return Math.max(0, s);
}

// Tiers: hoogste eerst. Eerste match wint.
const SCORE_TIERS = [
  { min: 100, key: "perfect",    label: "Perfect",            emoji: "🏆" },
  { min: 80,  key: "impressive", label: "Indrukwekkend",      emoji: "🥇" },
  { min: 60,  key: "good",       label: "Goed",               emoji: "🥈" },
  { min: 40,  key: "solid",      label: "Solide",             emoji: "🥉" },
  { min: 1,   key: "justmade",   label: "Net gehaald",        emoji: "😅" },
  { min: 0,   key: "lost",       label: "Volgende keer beter", emoji: "💀" },
];

function scoreTier(score) {
  return SCORE_TIERS.find((t) => score >= t.min);
}

// Vul de uitleg-tekst met de actuele constanten (zo hoef je bij tweaks niks
// in de HTML te wijzigen).
function renderHelpConstants() {
  const map = {
    veryclose: GUESS_PENALTIES.veryclose,
    close:     GUESS_PENALTIES.close,
    warm:      GUESS_PENALTIES.warm,
    cool:      GUESS_PENALTIES.cool,
    far:       GUESS_PENALTIES.far,
    distant:   GUESS_PENALTIES.distant,
    "text-hint": TEXT_HINT_PENALTY,
    "dir-hint": DIRECTION_HINT_PENALTY,
  };
  document.querySelectorAll("[data-penalty]").forEach((el) => {
    const key = el.dataset.penalty;
    if (key in map) el.textContent = `-${map[key]}`;
  });
  const helpMap = {
    "max-guesses": MAX_GUESSES,
    "max-text-hints": MAX_EXTRA_HINTS,
    "max-dir-hints": MAX_DIRECTION_HINTS,
  };
  document.querySelectorAll("[data-help]").forEach((el) => {
    const key = el.dataset.help;
    if (key in helpMap) el.textContent = String(helpMap[key]);
  });
  const tiers = document.querySelector('[data-help="tiers"]');
  if (tiers) {
    tiers.textContent = SCORE_TIERS.map((t) => {
      const range = t.min === 100 ? "100" : (t.min === 0 ? "0" : `${t.min}+`);
      return `${t.emoji} ${range}`;
    }).join(" · ");
  }
}

function renderDeltaBadge(badge, diff, cls, showDirection) {
  badge.textContent = "";
  if (cls === "correct") { badge.textContent = "✓"; return; }
  if (showDirection) {
    const arrow = document.createElement("span");
    arrow.className = "arrow";
    arrow.textContent = diff > 0 ? "↑" : "↓";
    badge.appendChild(arrow);
    badge.appendChild(document.createTextNode(` ${RANGE_LABELS[cls]}`));
  } else {
    badge.textContent = RANGE_LABELS[cls];
  }
}

function renderGuesses() {
  els.guesses.innerHTML = "";
  const revealedSet = new Set(state.directionsRevealed);
  for (let idx = 0; idx < MAX_GUESSES; idx++) {
    const g = state.guesses[idx];
    if (g) {
      const row = document.createElement("div");
      row.className = `guess-row ${g.cls}`;
      const yr = document.createElement("span");
      yr.className = "year";
      yr.textContent = g.year;
      const badge = document.createElement("span");
      badge.className = `delta-badge ${g.cls}`;
      const showDir = state.done || revealedSet.has(idx);
      renderDeltaBadge(badge, g.diff, g.cls, showDir);
      row.append(yr, badge);
      const penalty = GUESS_PENALTIES[g.cls] || 0;
      if (penalty > 0) {
        const pen = document.createElement("span");
        pen.className = "penalty";
        pen.textContent = `−${penalty}`;
        row.appendChild(pen);
      }
      els.guesses.appendChild(row);
    } else {
      const row = document.createElement("div");
      row.className = "guess-row empty";
      const slot = document.createElement("span");
      slot.className = "slot-num";
      slot.textContent = `${idx + 1}`;
      row.appendChild(slot);
      els.guesses.appendChild(row);
    }
  }
}

function showConfetti() {
  const colors = ["#4caf50", "#ab47bc", "#f4c430", "#ff9800", "#e53935", "#8b5a2b", "#6ea8ff"];
  const container = document.createElement("div");
  container.className = "confetti-container";
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.6 + "s";
    piece.style.animationDuration = 2.5 + Math.random() * 2 + "s";
    container.appendChild(piece);
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 5000);
}

function finishGame(won, fresh = false) {
  state.done = true;
  state.won = won;
  save();
  setKeypadDisabled(true);
  els.result.hidden = false;
  els.revealRow.hidden = true;
  els.revealRow.innerHTML = "";
  const ev = state.event;
  const intro = won ? t("won_intro") : t("lost_intro");
  els.resultText.innerHTML = "";
  els.resultText.append(
    document.createTextNode(`${intro} `),
  );
  const yearBadge = document.createElement("span");
  yearBadge.className = "year-pill" + (fresh && won ? " win-pop" : "");
  yearBadge.textContent = ev.year;
  els.resultText.append(yearBadge);
  if (won) {
    const score = computeScore();
    const tier = scoreTier(score);
    const scoreLine = document.createElement("div");
    scoreLine.className = "score-line";
    scoreLine.textContent = `${tier.emoji} ${tierLabel(tier)} · ${score}/100`;
    els.resultText.append(scoreLine);
  }
  els.source.innerHTML = ev.source
    ? `${t("source")} <a href="${ev.source}" target="_blank" rel="noopener">${displaySource(ev.source)}</a> · CC BY-SA`
    : "";
  els.nextBtn.hidden = state.mode !== "free";
  renderHintStatus();
  if (fresh && won) showConfetti();
  if (fresh && state.mode === "daily") recordDailyResult(won);
  if (fresh) sendTelemetry();
  showFactStats(state.hashes?.[0]);
}

// Eén rij per afgerond spel naar de DB (fire-and-forget). Idempotent per puzzel
// zodat herladen/heropenen niet dubbel telt. Geen PII — anon of JWT (server-side).
function sendTelemetry() {
  const hash = state.hashes?.[0];
  if (!hash) return;
  const sentKey = `jaardle:sent:${hash}:${state.mode === "daily" ? todayKey() : "free"}`;
  if (localStorage.getItem(sentKey)) return;
  try { localStorage.setItem(sentKey, "1"); } catch (e) {}
  const first = state.guesses[0];
  rpc("record_play", {
    p_fact_hash: hash,
    p_attempts: Math.min(6, Math.max(1, state.guesses.length)),
    p_won: state.won,
    p_first_distance: first ? Math.abs(first.diff) : 0,
    p_text_hints_used: state.textHintsUsed,
    p_dir_hints_used: state.directionsRevealed.length,
    p_mode: state.mode,
    p_puzzle_date: state.mode === "daily" ? todayKey() : null,
    p_score: computeScore(),
  })
    .then(() => { invalidateHistory(); })  // verse stats bij volgende opening
    .catch(() => { try { localStorage.removeItem(sentKey); } catch (e) {} });
}

// Globale statistieken van het hoofd-feit op het eindscherm.
async function showFactStats(hash) {
  els.result.querySelectorAll(".fact-stats").forEach((e) => e.remove());
  if (!hash) return;
  let s;
  try { s = await rpc("get_fact_stats", { h: hash }); } catch (e) { return; }
  if (!s || !s.games) return;
  const el = document.createElement("p");
  el.className = "fact-stats";
  el.textContent = lang === "en"
    ? `🌍 ${s.games} ${s.games === 1 ? "player" : "players"} · ${s.win_pct}% solved · avg. ${s.avg_guesses} guesses · ${s.first_try_pct}% first try`
    : `🌍 ${s.games} ${s.games === 1 ? "speler" : "spelers"} · ${s.win_pct}% opgelost · gem. ${s.avg_guesses} pogingen · ${s.first_try_pct}% in één keer`;
  els.source.after(el);
}

// --- Daily history & stats ------------------------------------------------
// Ingelogd: de dagresultaten komen uit de DB (cross-device sync) via
// get_my_history(). Anon ziet geen stats — het ⋮-menu opent dan de login-modal
// als nudge. De lokale "jaardle:history" blijft als offline-vangnet bestaan,
// maar de getoonde statistieken komen voor ingelogde spelers uit de DB.
let myHistoryCache = null;     // [{date, won, score, guesses}] of null (niet geladen)
let myHistoryPromise = null;   // dedupe gelijktijdige fetches

async function fetchMyHistory() {
  try {
    const rows = await rpc("get_my_history", {});
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => ({
      date: r.date,
      won: !!r.won,
      score: r.score ?? 0,
      guesses: r.guesses,
    }));
  } catch (e) {
    return [];
  }
}

function getMyHistory() {
  if (myHistoryCache) return Promise.resolve(myHistoryCache);
  if (!myHistoryPromise) {
    myHistoryPromise = fetchMyHistory().then((h) => {
      myHistoryCache = h;
      myHistoryPromise = null;
      return h;
    });
  }
  return myHistoryPromise;
}

function invalidateHistory() {
  myHistoryCache = null;
  myHistoryPromise = null;
}

const HISTORY_KEY = "jaardle:history";

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function saveHistory(arr) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); } catch (e) {}
}

function recordDailyResult(won) {
  const date = todayKey();
  const score = won ? computeScore() : 0;
  const entry = {
    date,
    won,
    score,
    guesses: state.guesses.length,
    hintsUsed: state.textHintsUsed,
    dirsUsed: state.directionsRevealed.length,
  };
  const history = loadHistory().filter((e) => e.date !== date);
  history.push(entry);
  history.sort((a, b) => a.date.localeCompare(b.date));
  saveHistory(history);
}

function computeStats(history) {
  const total = history.length;
  const wins = history.filter((e) => e.won);
  const winsN = wins.length;
  const winRate = total ? Math.round((winsN / total) * 100) : 0;
  const avgScore = winsN ? Math.round(wins.reduce((s, e) => s + e.score, 0) / winsN) : 0;
  // Streaks worden geteld op opeenvolgende kalenderdagen mét win.
  const dateSet = new Set(wins.map((e) => e.date));
  let best = 0, run = 0;
  const sorted = [...wins].sort((a, b) => a.date.localeCompare(b.date));
  let prev = null;
  for (const e of sorted) {
    if (prev && daysBetween(prev, e.date) === 1) run += 1;
    else run = 1;
    if (run > best) best = run;
    prev = e.date;
  }
  // Current streak: tel terug vanaf vandaag (of gister als vandaag nog niet gespeeld).
  let cur = 0;
  let cursor = todayKey();
  if (!dateSet.has(cursor)) cursor = shiftDay(cursor, -1);
  while (dateSet.has(cursor)) { cur += 1; cursor = shiftDay(cursor, -1); }
  return { total, won: winsN, winRate, avgScore, currentStreak: cur, bestStreak: best };
}

function shiftDay(yyyymmdd, delta) {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + delta);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

function daysBetween(a, b) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const ta = Date.UTC(ay, am - 1, ad);
  const tb = Date.UTC(by, bm - 1, bd);
  return Math.round((tb - ta) / 86400000);
}

async function renderStats() {
  const body = document.getElementById("stats-body");
  if (!auth.user) {
    // Vangnet: het menu gate't dit al (opent login), maar mocht de modal toch
    // open zijn zonder login, toon dan niets persoonlijks.
    body.innerHTML = `<p class="stats-empty">${t("stats_empty")}</p>`;
    return;
  }
  body.innerHTML = `<p class="stats-empty">${t("loading")}</p>`;
  const history = await getMyHistory();
  // Modal kan ondertussen gesloten/gewisseld zijn; alleen vullen als nog relevant.
  if (document.getElementById("modal-stats").hidden) return;
  if (history.length === 0) {
    body.innerHTML = `<p class="stats-empty">${t("stats_empty")}</p>`;
    return;
  }
  const s = computeStats(history);
  body.innerHTML = `
    <div class="stats-grid">
      <div class="stat"><div class="num">${s.total}</div><div class="lbl">${t("stat_played")}</div></div>
      <div class="stat"><div class="num">${s.winRate}%</div><div class="lbl">${t("stat_winrate")}</div></div>
      <div class="stat"><div class="num">${s.currentStreak}</div><div class="lbl">${t("stat_curstreak")}</div></div>
      <div class="stat"><div class="num">${s.bestStreak}</div><div class="lbl">${t("stat_beststreak")}</div></div>
      <div class="stat"><div class="num">${s.avgScore}</div><div class="lbl">${t("stat_avgscore")}</div></div>
      <div class="stat"><div class="num">${s.won}</div><div class="lbl">${t("stat_won")}</div></div>
    </div>
  `;
  body.appendChild(renderCalendar(history));
}

// Redactle-achtige bijdrage-grid: kolommen = weken, rijen = ma..zo. Gekleurd op
// gewonnen / verloren / niet gespeeld. Puur uit de lokale history — geen DB.
function renderCalendar(history) {
  const WEEKS = 17;
  const map = new Map(history.map((e) => [e.date, e]));
  let cur = shiftDay(todayKey(), -(WEEKS * 7 - 1));
  const [sy, sm, sd] = cur.split("-").map(Number);
  const mondayOffset = (new Date(Date.UTC(sy, sm - 1, sd)).getUTCDay() + 6) % 7; // 0 = ma
  cur = shiftDay(cur, -mondayOffset);
  const today = todayKey();
  const grid = document.createElement("div");
  grid.className = "cal-grid";
  while (cur <= today) {
    const e = map.get(cur);
    const cell = document.createElement("div");
    cell.className = "cal-cell " + (e ? (e.won ? "win" : "loss") : "none");
    const solved = lang === "en" ? `solved (${e?.guesses}/${MAX_GUESSES})` : `opgelost (${e?.guesses}/${MAX_GUESSES})`;
    cell.title = e ? `${cur} — ${e.won ? solved : t("cal_notsolved")}` : cur;
    grid.appendChild(cell);
    cur = shiftDay(cur, 1);
  }
  const wrap = document.createElement("div");
  wrap.className = "cal-wrap";
  const h = document.createElement("div");
  h.className = "cal-title";
  h.textContent = t("cal_title");
  wrap.append(h, grid);
  return wrap;
}

// --- Menu + modals --------------------------------------------------------

// Auth-state placeholder; Supabase-wiring zit in de module-bridge in index.html.
const auth = { user: null };

function renderMenu() {
  const section = document.getElementById("menu-account");
  const items = document.getElementById("menu-pop");
  const statsBtn = items.querySelector('[data-action="stats"]');
  // Verwijder dynamische account-knoppen (action=login|logout) maar laat
  // statische knoppen (stats) staan.
  items.querySelectorAll('[data-action="login"], [data-action="logout"]').forEach((b) => b.remove());

  if (auth.user) {
    section.innerHTML = `<span class="email">${auth.user.email}</span>${t("menu_loggedin")}`;
    if (statsBtn) statsBtn.hidden = false;
    const out = document.createElement("button");
    out.className = "menu-item danger";
    out.role = "menuitem";
    out.dataset.action = "logout";
    out.textContent = t("menu_logout");
    items.appendChild(out);
  } else {
    section.innerHTML = "";
    if (statsBtn) statsBtn.hidden = false;  // zichtbaar maar login-gated: klik opent login-nudge
    const inBtn = document.createElement("button");
    inBtn.className = "menu-item";
    inBtn.role = "menuitem";
    inBtn.dataset.action = "login";
    inBtn.textContent = t("menu_login");
    items.insertBefore(inBtn, items.firstChild);
  }
}

function toggleMenu(force) {
  const pop = document.getElementById("menu-pop");
  const btn = document.getElementById("menu-btn");
  const open = force !== undefined ? force : pop.hidden;
  pop.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
}

function openModal(id) {
  document.getElementById(id).hidden = false;
  if (id === "modal-stats") renderStats();
  if (id === "modal-login") {
    const err = document.getElementById("login-error");
    if (err) err.hidden = true;
    document.querySelector('#login-form input[name="email"]')?.focus();
  }
}

function closeModal(id) {
  document.getElementById(id).hidden = true;
}

function closeAllModals() {
  document.querySelectorAll(".modal").forEach((m) => (m.hidden = true));
}

async function doAuth(mode, e) {
  e.preventDefault();
  const form = document.getElementById("login-form");
  const err = document.getElementById("login-error");
  err.hidden = true;
  err.textContent = "";
  if (!window.sbAuth) {
    err.textContent = "Supabase nog aan het laden, probeer het opnieuw.";
    err.hidden = false;
    return;
  }
  const email = form.email.value.trim();
  const pw = form.password.value;
  const submitBtns = form.querySelectorAll("button");
  submitBtns.forEach((b) => (b.disabled = true));
  try {
    if (mode === "signup") {
      const data = await window.sbAuth.signUp(email, pw);
      // Met "Confirm email" aan retourneert signUp een user zonder session;
      // de gebruiker moet eerst de bevestigingsmail klikken.
      if (!data?.session) {
        form.reset();
        err.textContent = "Account aangemaakt — check je inbox om je e-mailadres te bevestigen.";
        err.hidden = false;
        return;
      }
    } else {
      await window.sbAuth.signIn(email, pw);
    }
    form.reset();
    closeAllModals();
  } catch (ex) {
    err.textContent = friendlyAuthError(ex);
    err.hidden = false;
  } finally {
    submitBtns.forEach((b) => (b.disabled = false));
  }
}

function friendlyAuthError(ex) {
  const code = ex?.code || "";
  const status = ex?.status || 0;
  const msg = (ex?.message || "").toLowerCase();
  if (code === "invalid_credentials" || msg.includes("invalid login credentials"))
    return "E-mail of wachtwoord klopt niet.";
  if (code === "email_not_confirmed")
    return "E-mailadres nog niet bevestigd — check je inbox.";
  if (code === "user_already_exists" || msg.includes("already registered"))
    return "Dit e-mailadres heeft al een account — kies Inloggen.";
  if (code === "weak_password" || msg.includes("password should be"))
    return "Wachtwoord te kort (minimaal 6 tekens).";
  if (code === "email_address_invalid" || msg.includes("invalid email") || msg.includes("invalid format"))
    return "Ongeldig e-mailadres.";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || status === 429)
    return "Te veel pogingen — probeer het later opnieuw.";
  if (code === "signup_disabled") return "Registreren is uitgeschakeld.";
  if (code === "provider_disabled") return "Deze inlogmethode staat niet aan.";
  if (msg.includes("failed to fetch") || msg.includes("networkerror"))
    return "Netwerkfout, controleer je verbinding.";
  return ex?.message || "Inloggen mislukt.";
}

async function doSignOut() {
  if (window.sbAuth) {
    try { await window.sbAuth.signOut(); } catch (e) {}
  }
}

async function doGoogleSignIn() {
  const err = document.getElementById("login-error");
  err.hidden = true;
  err.textContent = "";
  if (!window.sbAuth?.signInWithGoogle) {
    err.textContent = "Google-login niet beschikbaar.";
    err.hidden = false;
    return;
  }
  const btn = document.getElementById("login-google");
  btn.disabled = true;
  try {
    // Supabase redirect (geen popup): browser navigeert weg, sessie wordt
    // bij terugkomst door getSession() in index.html opgepikt.
    await window.sbAuth.signInWithGoogle();
  } catch (ex) {
    err.textContent = friendlyAuthError(ex);
    err.hidden = false;
  } finally {
    btn.disabled = false;
  }
}

function submitGuess() {
  if (state.done) return;
  const raw = getYearString().trim();
  if (raw === "" || raw === "-") {
    flashInput();
    return;
  }
  const year = parseInt(raw, 10);
  if (!Number.isFinite(year)) {
    flashInput();
    return;
  }
  if (year < MIN_YEAR || year > MAX_YEAR) {
    flashInput();
    return;
  }
  const diff = state.event.year - year;
  const cls = classify(diff);
  state.guesses.push({ year, diff, cls });
  clearYear();
  renderGuesses();
  // Pop-animatie op de zojuist toegevoegde penalty (zelfde double-rAF
  // truc als bij de richting-pijl).
  const rows = els.guesses.querySelectorAll(".guess-row");
  const pen = rows[state.guesses.length - 1]?.querySelector(".penalty");
  if (pen) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      pen.classList.add("just-added");
    }));
  }
  save();
  renderHintStatus();
  if (cls === "correct") {
    finishGame(true, true);
  } else if (state.guesses.length >= MAX_GUESSES) {
    finishGame(false, true);
  }
}

function flashInput() {
  els.input.classList.remove("flash");
  // force reflow so animation restarts
  void els.input.offsetWidth;
  els.input.classList.add("flash");
}

// Bewaar de hele puzzel + het bord, zodat herladen instant/offline werkt en de
// dagpuzzel niet opnieuw opgehaald hoeft te worden.
function save() {
  try {
    localStorage.setItem(storageKey(state.mode), JSON.stringify({
      hashes: state.hashes,
      event: state.event,
      board: {
        guesses: state.guesses,
        done: state.done,
        won: state.won,
        textHintsUsed: state.textHintsUsed,
        directionsRevealed: state.directionsRevealed,
      },
    }));
  } catch (e) { /* storage may be unavailable */ }
}

function loadRecord(mode) {
  try {
    const raw = localStorage.getItem(storageKey(mode));
    if (!raw) return null;
    const r = JSON.parse(raw);
    return (r && Array.isArray(r.hashes) && r.event) ? r : null;
  } catch (e) {
    return null;
  }
}

function shareText() {
  const dayNum = daysSince(EPOCH) + 1;
  const tag = state.mode === "daily" ? `#${dayNum}` : t("free_tag");
  const guessScore = state.won ? `${state.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const grid = state.guesses.map((g) => emojiFor(g.cls)).join("");
  let intro;
  if (state.won) {
    const s = computeScore();
    const tier = scoreTier(s);
    intro = `Jaardle ${tag}: ${tier.emoji} ${tierLabel(tier)} (${s}/100)`;
  } else {
    intro = `Jaardle ${tag}: ${t("lost_share")}`;
  }
  const statsParts = [`🎯 ${guessScore}`, `📊 ${grid}`];
  if (state.textHintsUsed > 0) statsParts.push(`💡 ${state.textHintsUsed}`);
  if (state.directionsRevealed.length > 0) statsParts.push(`🧭 ${state.directionsRevealed.length}`);
  return `${intro}\n${statsParts.join(" | ")}`;
}

async function doShare() {
  const text = shareText();
  const url = state.mode === "free"
    ? `https://jaardle.nl/?p=${buildShareToken()}`
    : "https://jaardle.nl/";
  if (navigator.share) {
    try {
      await navigator.share({ text: `${text}\n${url}` });
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    els.shareBtn.textContent = lang === "en" ? "Copied!" : "Gekopieerd!";
    setTimeout(() => (els.shareBtn.textContent = t("share")), 1500);
  } catch (e) {
    prompt("Kopieer dit:", `${text}\n${url}`);
  }
}

// Bepaal de puzzel (uit lokale cache of via RPC). Geeft { mode, hashes, event, board }
// of null (niet gevonden). Kan throwen bij netwerk/RPC-fout.
async function resolveRecord(mode, forceNew, sharedHashes) {
  if (sharedHashes) {
    const cached = loadRecord("free");
    if (cached && arraysEqual(cached.hashes, sharedHashes)) return { mode: "free", ...cached };
    const p = await rpc("get_facts_by_hashes", { hashes: sharedHashes });
    if (!p) return null;
    return { mode: "free", hashes: p.hashes, event: toEvent(p), board: null };
  }
  if (mode === "daily") {
    const cached = loadRecord("daily");   // bevat de puzzel (offline/instant) + bord
    if (cached) return { mode: "daily", ...cached };
    const p = await rpc("get_daily", { d: todayKey() });
    if (!p) return null;
    return { mode: "daily", hashes: p.hashes, event: toEvent(p), board: null };
  }
  // free
  if (!forceNew) {
    const cached = loadRecord("free");
    if (cached && !cached.board?.done) return { mode: "free", ...cached };
  }
  const p = await rpc("get_random_fact", {});
  if (!p) return null;
  return { mode: "free", hashes: p.hashes, event: toEvent(p), board: null };
}

async function startGame(mode, forceNew = false, sharedHashes = null) {
  if (forceNew) {
    try { localStorage.removeItem(storageKey(mode)); } catch (e) {}
  }
  setKeypadDisabled(true);
  setCardStatus(t("loading"));
  els.result.hidden = true;
  els.nextBtn.hidden = true;

  let record;
  try {
    record = await resolveRecord(mode, forceNew, sharedHashes);
  } catch (e) {
    console.error(e);
    setCardStatus(t("err_load"), () => startGame(mode, forceNew, sharedHashes));
    return;
  }
  if (!record) {
    if (sharedHashes) setCardStatus(t("err_share"), () => switchMode("daily"));
    else setCardStatus(t("err_none"), () => startGame(mode, forceNew, sharedHashes));
    return;
  }

  const b = record.board;
  state = {
    mode: record.mode,
    hashes: record.hashes,
    event: record.event,
    guesses: b?.guesses || [],
    done: !!b?.done,
    won: !!b?.won,
    textHintsUsed: b?.textHintsUsed || 0,
    directionsRevealed: Array.isArray(b?.directionsRevealed) ? b.directionsRevealed : [],
  };

  setKeypadDisabled(false);
  clearYear();
  renderEvent();
  renderHintStatus();
  renderGuesses();
  save();
  syncUrl();

  if (state.done) finishGame(state.won);
}

function syncUrl() {
  try {
    const target = state.mode === "free"
      ? `${window.location.pathname}?p=${buildShareToken()}`
      : window.location.pathname;
    history.replaceState(null, "", target);
  } catch (e) { /* sandbox / file:// */ }
}

function switchMode(mode) {
  els.tabs.forEach((t) => {
    const selected = t.dataset.mode === mode;
    t.setAttribute("aria-selected", String(selected));
  });
  startGame(mode);
}

async function init() {
  applyLang();           // zet UI-taal + helptekst + daglabel (idempotent)
  await whenSbReady();

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchMode(tab.dataset.mode));
  });
  els.guessBtn.addEventListener("click", submitGuess);
  els.signBtn.addEventListener("click", toggleSign);
  els.backspaceBtn.addEventListener("click", backspaceYear);
  els.keypad.querySelectorAll("[data-digit]").forEach((btn) => {
    btn.addEventListener("click", () => appendDigit(btn.dataset.digit));
  });
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Niet onderscheppen wanneer iemand in een formulier-veld typt.
    const tag = e.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
    // Tab-shortcuts werken altijd, ook nadat de puzzel klaar is.
    if (e.key === "d" || e.key === "D") { switchMode("daily"); e.preventDefault(); return; }
    if (e.key === "n" || e.key === "N") { switchMode("free"); e.preventDefault(); return; }
    if (state && state.done) return;
    if (/^[0-9]$/.test(e.key)) { appendDigit(e.key); e.preventDefault(); }
    else if (e.key === "Backspace") { backspaceYear(); e.preventDefault(); }
    else if (e.key === "Enter") { submitGuess(); e.preventDefault(); }
    else if (e.key === "-" || e.key === "+") { toggleSign(); e.preventDefault(); }
    else if (e.key === "e" || e.key === "E") {
      if (!els.hintBtnText.hidden) { requestTextHint(); e.preventDefault(); }
    }
    else if (e.key === "r" || e.key === "R") {
      if (!els.hintBtnDir.hidden) { requestDirectionHint(); e.preventDefault(); }
    }
  });
  els.shareBtn.addEventListener("click", doShare);
  els.nextBtn.addEventListener("click", () => startGame("free", true));
  els.hintBtnText.addEventListener("click", requestTextHint);
  els.hintBtnDir.addEventListener("click", requestDirectionHint);

  // Menu (⋮): toggle, items, en click-outside om te sluiten.
  // ⋮-menu (Statistieken + Inloggen) is voor iedereen zichtbaar.
  document.getElementById("menu-wrap").hidden = false;
  const menuBtn = document.getElementById("menu-btn");
  const menuPop = document.getElementById("menu-pop");
  menuBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(); });
  menuPop.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    toggleMenu(false);
    const action = btn.dataset.action;
    // Stats zijn login-gated: uitgelogd opent de login-modal als nudge.
    if (action === "stats") openModal(auth.user ? "modal-stats" : "modal-login");
    else if (action === "login") openModal("modal-login");
    else if (action === "logout") doSignOut();
    else if (action === "lang") toggleLang();
  });
  document.addEventListener("click", (e) => {
    if (!menuPop.hidden && !menuPop.contains(e.target) && e.target !== menuBtn) {
      toggleMenu(false);
    }
  });
  renderMenu();

  // Modals: backdrop / ✕ knop / Escape.
  document.querySelectorAll(".modal [data-close]").forEach((el) => {
    el.addEventListener("click", () => closeAllModals());
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
  });
  const loginForm = document.getElementById("login-form");
  loginForm.addEventListener("submit", (e) => doAuth("signin", e));
  document.getElementById("login-register").addEventListener("click", (e) => doAuth("signup", e));
  document.getElementById("login-google").addEventListener("click", doGoogleSignIn);

  // Sync auth-state vanuit de Supabase module-bridge.
  window.addEventListener("sb-auth-changed", (e) => {
    auth.user = e.detail ? { email: e.detail.email, uid: e.detail.uid } : null;
    invalidateHistory();   // andere speler / uitgelogd -> stats opnieuw laden
    renderMenu();
    // Stats-modal open terwijl auth wisselt? Herteken met de juiste bron.
    const sm = document.getElementById("modal-stats");
    if (sm && !sm.hidden) renderStats();
  });

  // Houd de tekst-box ingedrukt om de Engelse bron te zien.
  if (els.eventCard) {
    const peek = (e) => { e.preventDefault(); showFactsLang(lang === "en" ? "nl" : "en"); };
    const restore = () => showFactsLang(lang);
    els.eventCard.addEventListener("mousedown", peek);
    els.eventCard.addEventListener("mouseup", restore);
    els.eventCard.addEventListener("mouseleave", restore);
    els.eventCard.addEventListener("touchstart", peek, { passive: false });
    els.eventCard.addEventListener("touchend", restore);
    els.eventCard.addEventListener("touchcancel", restore);
    els.eventCard.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  const sharedHashes = getSharedLocation();
  if (sharedHashes) {
    // Open een door iemand gedeeld vrij spel.
    els.tabs.forEach((t) => {
      t.setAttribute("aria-selected", String(t.dataset.mode === "free"));
    });
    startGame("free", false, sharedHashes);
  } else {
    switchMode("daily");
  }
}

function getSharedLocation() {
  const params = new URLSearchParams(window.location.search);
  const p = params.get("p");
  if (p === null) return null;
  return parseShareToken(p);  // array van 10-hex hashes, of null
}

init().catch((err) => {
  els.eventText.textContent = "Kon de gebeurtenis niet laden.";
  console.error(err);
});
