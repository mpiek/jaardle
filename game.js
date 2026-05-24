const MAX_GUESSES = 6;
const FACTS_PER_PUZZLE = 1;
const MAX_EXTRA_HINTS = 2;
const MAX_DIRECTION_HINTS = 2;
const EPOCH = new Date(Date.UTC(2026, 0, 1));
const MIN_YEAR = -2000;
const MAX_YEAR = new Date().getFullYear();
// Weighted daily order: years with more events appear vaker.
// 0 = uniform, 1 = fully proportional. 0.4 = mild boost (1942 ~8x vs 200 BC).
const WEIGHT_ALPHA = 0.4;

const els = {
  eventText: document.getElementById("event-text"),
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

// Parse share token (3×10 hex). Returns [yearIdx, hintIdxs] of null.
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
// share-URLs alleen de 3 fact-hashes hoeven te bevatten.
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
function buildVisibleEvent(yearIdx, hintIdxs) {
  const ev = events[yearIdx];
  const facts = hintIdxs.map((i) => ev.hints[i].text);
  const extras = pickExtraHintIdxs(yearIdx, hintIdxs).map((i) => ev.hints[i].text);
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
  state.event.facts.forEach((text) => {
    const p = document.createElement("p");
    p.className = "fact";
    p.textContent = text;
    els.eventText.appendChild(p);
  });
  for (let i = 0; i < state.textHintsUsed; i++) {
    const text = state.event.extras[i];
    if (!text) continue;
    const p = document.createElement("p");
    p.className = "fact fact-extra";
    p.textContent = text;
    els.eventText.appendChild(p);
  }
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

// Weighted order: years with more events appear multiple times (=more often).
// Uses count^WEIGHT_ALPHA, then deterministic mulberry32 shuffle.
let _weightedYearOrder = null;
function weightedYearOrder() {
  if (_weightedYearOrder) return _weightedYearOrder;
  const expanded = [];
  for (let i = 0; i < events.length; i++) {
    const n = events[i].hints.length;
    const w = Math.max(1, Math.round(Math.pow(n, WEIGHT_ALPHA)));
    for (let k = 0; k < w; k++) expanded.push(i);
  }
  const rand = mulberry32(0x4A415254); // "JART" — vaste volgorde voor iedereen
  for (let i = expanded.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [expanded[i], expanded[j]] = [expanded[j], expanded[i]];
  }
  _weightedYearOrder = expanded;
  return expanded;
}

// Returns [yearIdx, hintIdxs] for the given mode.
function pickLocation(mode) {
  if (mode === "daily") {
    const order = weightedYearOrder();
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
  const order = weightedYearOrder();
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
    hints: hints.map((text) => ({ text, source: sourceFor(year) })),
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
    if (state && state.done) return;
    if (/^[0-9]$/.test(e.key)) { appendDigit(e.key); e.preventDefault(); }
    else if (e.key === "Backspace") { backspaceYear(); e.preventDefault(); }
    else if (e.key === "Enter") { submitGuess(); e.preventDefault(); }
    else if (e.key === "-" || e.key === "+") { toggleSign(); e.preventDefault(); }
  });
  els.shareBtn.addEventListener("click", doShare);
  els.nextBtn.addEventListener("click", () => startGame("free", true));
  els.hintBtnText.addEventListener("click", requestTextHint);
  els.hintBtnDir.addEventListener("click", requestDirectionHint);

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
