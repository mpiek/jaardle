const MAX_GUESSES = 6;
const FACTS_PER_PUZZLE = 1;
const MAX_EXTRA_HINTS = 2;
const MAX_DIRECTION_HINTS = 2;
const EPOCH = new Date(Date.UTC(2026, 0, 1));
const MIN_YEAR = -753;
const MAX_YEAR = new Date().getFullYear();

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

let events = [];
let _hashToLoc = null;  // hash → [yearIdx, hintIdx]
let state = null;

// Content-hash per event: stabiel obv year + main text. 10 hex chars = 40 bit.
// Verbergt ID-volgorde (lage ID → laag jaar) en blijft stabiel als nieuwe
// events toegevoegd worden, zolang bestaande events ongewijzigd blijven.
function eventHash(year, text) {
  const s = `${year}|${text}`;
  let h1 = 2166136261 | 0;
  let h2 = 0x12345678 | 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 0x5bd1e995);
  }
  const hex = ((h1 >>> 0).toString(16).padStart(8, "0")
             + (h2 >>> 0).toString(16).padStart(8, "0"));
  return hex.slice(0, 10);
}

function buildEventHashes() {
  _hashToLoc = new Map();
  let total = 0;
  let collisions = 0;
  for (let yi = 0; yi < events.length; yi++) {
    const ev = events[yi];
    for (let hi = 0; hi < ev.hints.length; hi++) {
      total++;
      const h = eventHash(ev.year, ev.hints[hi].text);
      if (_hashToLoc.has(h)) {
        collisions++;
        // First-wins: collisions are not URL-addressable but still playable.
      } else {
        _hashToLoc.set(h, [yi, hi]);
      }
    }
  }
  if (collisions > 0) {
    console.warn(`eventHash: ${collisions} collisions in ${total} hints`);
  }
}

function hashFor(yearIdx, hintIdx) {
  return eventHash(events[yearIdx].year, events[yearIdx].hints[hintIdx].text);
}

function findLocByHash(h) {
  return _hashToLoc === null ? null : (_hashToLoc.get(h) || null);
}

// Concat de hashes van alle gepickte hints → opaque share token.
function buildShareToken(yearIdx, hintIdxs) {
  return hintIdxs.map((hi) => hashFor(yearIdx, hi)).join("");
}

// Parse share token (N × 10 hex, één hash per fact). Returns [yearIdx, hintIdxs] of null.
function parseShareToken(token) {
  if (!/^[0-9a-f]+$/.test(token) || token.length % 10 !== 0) return null;
  const hashes = token.match(/.{10}/g);
  const locs = hashes.map((h) => findLocByHash(h));
  if (locs.some((l) => l === null)) return null;
  const yearIdx = locs[0][0];
  if (!locs.every((l) => l[0] === yearIdx)) return null;
  const hintIdxs = locs.map((l) => l[1]).sort((a, b) => a - b);
  return [yearIdx, hintIdxs];
}

function normalizeEvent(raw) {
  // Keep ALL hints; per-game we pick one as "main" and the rest as extras.
  if (Array.isArray(raw.hints) && raw.hints.length > 0) {
    return { year: raw.year, hints: raw.hints };
  }
  return { year: raw.year, hints: [{ text: raw.event, source: raw.source }] };
}

// Deterministisch FACTS_PER_PUZZLE indices uit ev.hints kiezen. Als jaar
// minder hints heeft, geven we er minder terug.
function pickHintIdxs(yearIdx, seed) {
  const ev = events[yearIdx];
  const n = Math.min(FACTS_PER_PUZZLE, ev.hints.length);
  const idxs = ev.hints.map((_, i) => i);
  const rand = mulberry32(seed);
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
  }
  return idxs.slice(0, n).sort((a, b) => a - b);
}

// Extras worden deterministisch afgeleid uit (year, factHintIdxs) zodat
// share-URLs alleen de fact-hashes hoeven te bevatten — de extras volgen.
function pickExtraHintIdxs(yearIdx, factHintIdxs) {
  const ev = events[yearIdx];
  const factSet = new Set(factHintIdxs);
  const remaining = [];
  for (let i = 0; i < ev.hints.length; i++) if (!factSet.has(i)) remaining.push(i);
  if (remaining.length === 0) return [];
  let seed = (ev.year * 2654435761) >>> 0;
  for (const i of factHintIdxs) seed = (seed ^ Math.imul(i + 1, 1000003)) >>> 0;
  const rand = mulberry32(seed);
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  return remaining.slice(0, MAX_EXTRA_HINTS).sort((a, b) => a - b);
}

// Build the {year, facts[], extras[], source} that de UI rendert.
// Elke fact/extra is { nl, en } zodat de "hold for EN" knop kan toggelen.
function buildVisibleEvent(yearIdx, hintIdxs) {
  const ev = events[yearIdx];
  const facts = hintIdxs.map((i) => ({ nl: ev.hints[i].text, en: ev.hints[i].en || "" }));
  const extras = pickExtraHintIdxs(yearIdx, hintIdxs).map((i) => ({ nl: ev.hints[i].text, en: ev.hints[i].en || "" }));
  const source = ev.hints[hintIdxs[0]]?.source;
  return { year: ev.year, facts, extras, source };
}

function daysSince(epoch) {
  const today = new Date();
  const utcToday = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.floor((utcToday - epoch.getTime()) / 86400000);
}

function todayKey() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
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
  p.textContent = f.nl;
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
  els.hintCount.textContent = `💡 ${state.textHintsUsed}/${MAX_EXTRA_HINTS} hints · 🧭 ${state.directionsRevealed.length}/${MAX_DIRECTION_HINTS} richtingen`;
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
  { min: 100, label: "Perfect",            emoji: "🏆" },
  { min: 80,  label: "Indrukwekkend",      emoji: "🥇" },
  { min: 60,  label: "Goed",               emoji: "🥈" },
  { min: 40,  label: "Solide",             emoji: "🥉" },
  { min: 1,   label: "Net gehaald",        emoji: "😅" },
  { min: 0,   label: "Volgende keer beter", emoji: "💀" },
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
  const intro = won ? "Goed geraden! Het was" : "Helaas — het juiste jaar was";
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
    scoreLine.textContent = `${tier.emoji} ${tier.label} · ${score}/100`;
    els.resultText.append(scoreLine);
  }
  els.source.innerHTML = ev.source
    ? `Bron: <a href="${ev.source}" target="_blank" rel="noopener">${displaySource(ev.source)}</a> · CC BY-SA`
    : "";
  els.nextBtn.hidden = state.mode !== "free";
  renderHintStatus();
  if (fresh && won) showConfetti();
  if (fresh && state.mode === "daily") recordDailyResult(won);
}

// --- Daily history & stats ------------------------------------------------

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

function renderStats() {
  const body = document.getElementById("stats-body");
  const history = loadHistory();
  if (history.length === 0) {
    body.innerHTML = '<p class="stats-empty">Nog geen dagelijkse puzzels afgerond.</p>';
    return;
  }
  const s = computeStats(history);
  body.innerHTML = `
    <div class="stats-grid">
      <div class="stat"><div class="num">${s.total}</div><div class="lbl">Gespeeld</div></div>
      <div class="stat"><div class="num">${s.winRate}%</div><div class="lbl">Win-rate</div></div>
      <div class="stat"><div class="num">${s.currentStreak}</div><div class="lbl">Huidige streak</div></div>
      <div class="stat"><div class="num">${s.bestStreak}</div><div class="lbl">Beste streak</div></div>
      <div class="stat"><div class="num">${s.avgScore}</div><div class="lbl">Gem. score (gewonnen)</div></div>
      <div class="stat"><div class="num">${s.won}</div><div class="lbl">Gewonnen</div></div>
    </div>
  `;
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
    section.innerHTML = `<span class="email">${auth.user.email}</span>Ingelogd`;
    if (DEBUG && statsBtn) statsBtn.hidden = false;
    const out = document.createElement("button");
    out.className = "menu-item danger";
    out.role = "menuitem";
    out.dataset.action = "logout";
    out.textContent = "Uitloggen";
    items.appendChild(out);
  } else {
    section.innerHTML = "";
    if (statsBtn) statsBtn.hidden = true;
    const inBtn = document.createElement("button");
    inBtn.className = "menu-item";
    inBtn.role = "menuitem";
    inBtn.dataset.action = "login";
    inBtn.textContent = "🔑 Inloggen";
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

function save() {
  try {
    localStorage.setItem(storageKey(state.mode), JSON.stringify({
      guesses: state.guesses,
      done: state.done,
      won: state.won,
      textHintsUsed: state.textHintsUsed,
      directionsRevealed: state.directionsRevealed,
      yearIdx: state.yearIdx,
      hintIdxs: state.hintIdxs,
    }));
  } catch (e) { /* storage may be unavailable */ }
}

function load(mode, expectedYearIdx, expectedHintIdxs) {
  try {
    const raw = localStorage.getItem(storageKey(mode));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (mode === "free") {
      if (parsed.yearIdx !== expectedYearIdx) return null;
      const a = expectedHintIdxs, b = parsed.hintIdxs;
      if (!Array.isArray(b) || a.length !== b.length || a.some((v, i) => v !== b[i])) return null;
    }
    return parsed;
  } catch (e) {
    return null;
  }
}

function shareText() {
  const dayNum = daysSince(EPOCH) + 1;
  const tag = state.mode === "daily" ? `#${dayNum}` : "(vrij)";
  const guessScore = state.won ? `${state.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const grid = state.guesses.map((g) => emojiFor(g.cls)).join("");
  let intro;
  if (state.won) {
    const s = computeScore();
    const tier = scoreTier(s);
    intro = `Jaardle ${tag}: ${tier.emoji} ${tier.label} (${s}/100)`;
  } else {
    intro = `Jaardle ${tag}: 💀 Niet gekraakt`;
  }
  const statsParts = [`🎯 ${guessScore}`, `📊 ${grid}`];
  if (state.textHintsUsed > 0) statsParts.push(`💡 ${state.textHintsUsed}`);
  if (state.directionsRevealed.length > 0) statsParts.push(`🧭 ${state.directionsRevealed.length}`);
  return `${intro}\n${statsParts.join(" | ")}`;
}

async function doShare() {
  const text = shareText();
  const url = state.mode === "free"
    ? `https://jaardle.nl/?p=${buildShareToken(state.yearIdx, state.hintIdxs)}`
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
    els.shareBtn.textContent = "Gekopieerd!";
    setTimeout(() => (els.shareBtn.textContent = "Deel resultaat"), 1500);
  } catch (e) {
    prompt("Kopieer dit:", `${text}\n${url}`);
  }
}

// Mulberry32: kleine, deterministische PRNG voor een vaste shuffle van de jaren.
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Uniforme dagvolgorde: elke jaar precies één keer, deterministisch geschud
// zodat iedereen op dezelfde dag hetzelfde jaar krijgt.
let _yearOrder = null;
function yearOrder() {
  if (_yearOrder) return _yearOrder;
  const order = [];
  for (let i = 0; i < events.length; i++) order.push(i);
  const rand = mulberry32(0x4A415254); // "JART"
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  _yearOrder = order;
  return order;
}

// Returns [yearIdx, hintIdxs] for the given mode.
function pickLocation(mode) {
  if (mode === "daily") {
    const order = yearOrder();
    const dayNum = daysSince(EPOCH);
    const yearIdx = order[((dayNum % order.length) + order.length) % order.length];
    const ev = events[yearIdx];
    const seed = (dayNum * 1000003) ^ (ev.year * 9001);
    return [yearIdx, pickHintIdxs(yearIdx, seed)];
  }
  // Free mode: resume saved if not finished, else random
  try {
    const raw = localStorage.getItem(storageKey("free"));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        !parsed.done &&
        Number.isInteger(parsed.yearIdx) &&
        Array.isArray(parsed.hintIdxs) && parsed.hintIdxs.length > 0 &&
        parsed.yearIdx >= 0 && parsed.yearIdx < events.length &&
        parsed.hintIdxs.every((hi) => hi >= 0 && hi < events[parsed.yearIdx].hints.length)
      ) {
        return [parsed.yearIdx, parsed.hintIdxs];
      }
    }
  } catch (e) {}
  const order = yearOrder();
  const yearIdx = order[Math.floor(Math.random() * order.length)];
  return [yearIdx, pickHintIdxs(yearIdx, Math.floor(Math.random() * 2147483647))];
}

function startGame(mode, forceNew = false, locationOverride = null) {
  // Eerst clearen, anders pakt pickLocation de saved event weer op
  if (forceNew) {
    try { localStorage.removeItem(storageKey(mode)); } catch (e) {}
  }
  const [yearIdx, hintIdxs] = locationOverride !== null
    ? locationOverride
    : pickLocation(mode);
  state = {
    mode,
    yearIdx,
    hintIdxs,
    event: buildVisibleEvent(yearIdx, hintIdxs),
    guesses: [],
    done: false,
    won: false,
    textHintsUsed: 0,
    directionsRevealed: [],
  };

  if (!forceNew) {
    const saved = load(mode, yearIdx, hintIdxs);
    if (saved) {
      state.guesses = saved.guesses || [];
      state.done = !!saved.done;
      state.won = !!saved.won;
      state.textHintsUsed = saved.textHintsUsed || 0;
      state.directionsRevealed = Array.isArray(saved.directionsRevealed) ? saved.directionsRevealed : [];
    }
  }

  setKeypadDisabled(false);
  clearYear();
  els.result.hidden = true;
  els.nextBtn.hidden = true;

  renderEvent();
  renderHintStatus();
  renderGuesses();
  save();
  syncUrl();

  if (state.done) {
    finishGame(state.won);
  }
}

function syncUrl() {
  try {
    const target = state.mode === "free"
      ? `${window.location.pathname}?p=${buildShareToken(state.yearIdx, state.hintIdxs)}`
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

function sourceFor(year) {
  if (year < 0) return `https://en.wikipedia.org/wiki/${-year}_BC`;
  if (year < 100) return `https://en.wikipedia.org/wiki/AD_${year}`;
  return `https://en.wikipedia.org/wiki/${year}`;
}

const BUNDLE_KEY = "j7r4Td9xPq2nMv5W";

async function loadBundle(url) {
  const buf = new Uint8Array(await (await fetch(url)).arrayBuffer());
  const key = new TextEncoder().encode(BUNDLE_KEY);
  for (let i = 0; i < buf.length; i++) buf[i] ^= key[i % key.length];
  const stream = new Response(buf).body.pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
}

async function init() {
  const raw = await loadBundle("bundle.bin");
  events = raw.map(([year, hints]) => normalizeEvent({
    year,
    hints: hints.map((h) => {
      // h is [nl, en] vanaf bundle v2; oude bundles hadden plain string.
      const [text, en] = Array.isArray(h) ? h : [h, ""];
      return { text, en, source: sourceFor(year) };
    }),
  }));
  buildEventHashes();
  renderHelpConstants();

  const dayNum = daysSince(EPOCH);
  els.dayLabel.textContent = `Dag #${dayNum + 1}`;

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
  // Wrapper is in HTML hidden tot account-features af zijn — DEBUG onthult 'm.
  if (DEBUG) document.getElementById("menu-wrap").hidden = false;
  const menuBtn = document.getElementById("menu-btn");
  const menuPop = document.getElementById("menu-pop");
  menuBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(); });
  menuPop.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    toggleMenu(false);
    const action = btn.dataset.action;
    if (action === "stats") openModal("modal-stats");
    else if (action === "login") openModal("modal-login");
    else if (action === "logout") doSignOut();
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
    renderMenu();
  });

  // Houd de tekst-box ingedrukt om de Engelse bron te zien.
  if (els.eventCard) {
    const peekEn = (e) => { e.preventDefault(); showFactsLang("en"); };
    const restoreNl = () => showFactsLang("nl");
    els.eventCard.addEventListener("mousedown", peekEn);
    els.eventCard.addEventListener("mouseup", restoreNl);
    els.eventCard.addEventListener("mouseleave", restoreNl);
    els.eventCard.addEventListener("touchstart", peekEn, { passive: false });
    els.eventCard.addEventListener("touchend", restoreNl);
    els.eventCard.addEventListener("touchcancel", restoreNl);
    els.eventCard.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  const sharedLoc = getSharedLocation();
  if (sharedLoc !== null) {
    // Open een door iemand gedeeld vrij spel.
    els.tabs.forEach((t) => {
      t.setAttribute("aria-selected", String(t.dataset.mode === "free"));
    });
    startGame("free", false, sharedLoc);
  } else {
    switchMode("daily");
  }
}

function getSharedLocation() {
  const params = new URLSearchParams(window.location.search);
  const p = params.get("p");
  if (p === null) return null;
  // Nieuwe vorm: concat van N hashes van 10 hex chars
  if (/^[0-9a-f]+$/.test(p) && p.length % 10 === 0 && p.length >= 10) {
    return parseShareToken(p);
  }
  // Legacy numeric ?p=N — wijst naar yearIdx, pick hints deterministisch
  const idx = parseInt(p, 10);
  if (!Number.isInteger(idx) || idx < 0 || idx >= events.length) return null;
  return [idx, pickHintIdxs(idx, idx * 31337)];
}

init().catch((err) => {
  els.eventText.textContent = "Kon de gebeurtenis niet laden.";
  console.error(err);
});
