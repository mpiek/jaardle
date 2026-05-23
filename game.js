const MAX_GUESSES = 6;
const MAX_EXTRA_HINTS = 2;
const MAX_DIRECTION_HINTS = 2;
const EPOCH = new Date(Date.UTC(2026, 0, 1));

const els = {
  eventText: document.getElementById("event-text"),
  extraHints: document.getElementById("extra-hints"),
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
let state = null;

function normalizeEvent(raw) {
  if (Array.isArray(raw.hints) && raw.hints.length > 0) {
    const main = raw.hints[0];
    const extras = raw.hints.slice(1, 1 + MAX_EXTRA_HINTS).map((h) => h.text);
    return {
      year: raw.year,
      event: main.text,
      source: main.source,
      extras,
    };
  }
  return {
    year: raw.year,
    event: raw.event,
    source: raw.source,
    extras: [],
  };
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
  return mode === "daily" ? `yeardle-nl:daily:${todayKey()}` : `yeardle-nl:free:current`;
}

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
  els.eventText.textContent = state.event.event;
}

function totalHintsUsed() {
  return state.textHintsUsed + state.directionsRevealed.length;
}

function renderExtraHints() {
  els.extraHints.innerHTML = "";
  for (let i = 0; i < state.textHintsUsed; i++) {
    const hint = state.event.extras[i];
    if (!hint) continue;
    const card = document.createElement("div");
    card.className = "extra-hint";
    const lbl = document.createElement("div");
    lbl.className = "extra-hint-label";
    lbl.textContent = "💡 Nog een gebeurtenis uit hetzelfde jaar";
    const p = document.createElement("p");
    p.textContent = hint;
    card.append(lbl, p);
    els.extraHints.appendChild(card);
  }

  const availableExtras = Math.min(state.event.extras.length, MAX_EXTRA_HINTS);
  const textRemaining = availableExtras - state.textHintsUsed;
  const dirsLeft = MAX_DIRECTION_HINTS - state.directionsRevealed.length;
  const hasUnrevealedGuess =
    state.guesses.length > 0 &&
    !state.directionsRevealed.includes(state.guesses.length - 1);

  els.hintBtnText.hidden = state.done || textRemaining <= 0;
  els.hintBtnDir.hidden = state.done || dirsLeft <= 0 || !hasUnrevealedGuess;

  const txt = `💡 ${state.textHintsUsed}/${MAX_EXTRA_HINTS} hints · 🧭 ${state.directionsRevealed.length}/${MAX_DIRECTION_HINTS} richtingen`;
  els.hintCount.textContent = txt;
}

function requestTextHint() {
  if (state.done) return;
  const available = Math.min(state.event.extras.length, MAX_EXTRA_HINTS);
  if (state.textHintsUsed >= available) return;
  state.textHintsUsed += 1;
  renderExtraHints();
  save();
}

function requestDirectionHint() {
  if (state.done) return;
  if (state.directionsRevealed.length >= MAX_DIRECTION_HINTS) return;
  if (state.guesses.length === 0) return;
  const latestIdx = state.guesses.length - 1;
  if (state.directionsRevealed.includes(latestIdx)) return;
  state.directionsRevealed.push(latestIdx);
  renderExtraHints();
  renderGuesses();
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

function deltaLabel(diff, cls, showDirection) {
  if (cls === "correct") return "✓";
  if (!showDirection) return RANGE_LABELS[cls];
  const arrow = diff > 0 ? "↑" : "↓";
  return `${arrow} ${RANGE_LABELS[cls]}`;
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
      badge.textContent = deltaLabel(g.diff, g.cls, showDir);
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

function finishGame(won) {
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
  yearBadge.className = "year-pill";
  yearBadge.textContent = ev.year;
  els.resultText.append(yearBadge);
  els.source.innerHTML = ev.source
    ? `Bron: <a href="${ev.source}" target="_blank" rel="noopener">${displaySource(ev.source)}</a> · CC BY-SA`
    : "";
  els.nextBtn.hidden = state.mode !== "free";
  renderExtraHints();
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
  if (year < -3000 || year > 2100) {
    flashInput();
    return;
  }
  const diff = state.event.year - year;
  const cls = classify(diff);
  state.guesses.push({ year, diff, cls });
  clearYear();
  renderGuesses();
  save();
  renderExtraHints();
  if (cls === "correct") {
    finishGame(true);
  } else if (state.guesses.length >= MAX_GUESSES) {
    finishGame(false);
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
      eventIndex: state.eventIndex,
    }));
  } catch (e) { /* storage may be unavailable */ }
}

function load(mode, expectedIndex) {
  try {
    const raw = localStorage.getItem(storageKey(mode));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (mode === "free" && parsed.eventIndex !== expectedIndex) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function shareText() {
  const dayNum = daysSince(EPOCH) + 1;
  const header = state.mode === "daily"
    ? `Jaartal #${dayNum} — ${state.won ? state.guesses.length : "X"}/${MAX_GUESSES}`
    : `Jaartal (vrij) — ${state.won ? state.guesses.length : "X"}/${MAX_GUESSES}`;
  const used = totalHintsUsed();
  const hintBadge = used > 0 ? " " + "💡".repeat(used) : "";
  const grid = state.guesses.map((g) => emojiFor(g.cls)).join("\n");
  return `${header}${hintBadge}\n${grid}`;
}

async function doShare() {
  const text = shareText();
  const url = "https://jaardle.nl";
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

let _dailyOrder = null;
function dailyOrder() {
  if (_dailyOrder) return _dailyOrder;
  const rand = mulberry32(0x4A415254); // "JART" als seed — vaste volgorde voor iedereen
  const order = events.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  _dailyOrder = order;
  return order;
}

function pickEventIndex(mode) {
  if (mode === "daily") {
    const order = dailyOrder();
    const dayNum = daysSince(EPOCH);
    return order[((dayNum % order.length) + order.length) % order.length];
  }
  try {
    const raw = localStorage.getItem(storageKey("free"));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (
        Number.isInteger(parsed.eventIndex) &&
        parsed.eventIndex >= 0 &&
        parsed.eventIndex < events.length
      ) {
        return parsed.eventIndex;
      }
    }
  } catch (e) {}
  return Math.floor(Math.random() * events.length);
}

function startGame(mode, forceNew = false) {
  // Eerst clearen, anders pakt pickEventIndex de saved event weer op
  if (forceNew) {
    try { localStorage.removeItem(storageKey(mode)); } catch (e) {}
  }
  const eventIndex = pickEventIndex(mode);
  state = {
    mode,
    eventIndex,
    event: events[eventIndex],
    guesses: [],
    done: false,
    won: false,
    textHintsUsed: 0,
    directionsRevealed: [],
  };

  if (!forceNew) {
    const saved = load(mode, eventIndex);
    if (saved) {
      state.guesses = saved.guesses || [];
      state.done = !!saved.done;
      state.won = !!saved.won;
      // Migratie: oude saves
      state.textHintsUsed = saved.textHintsUsed ?? saved.hintsUsed ?? 0;
      state.directionsRevealed = Array.isArray(saved.directionsRevealed)
        ? saved.directionsRevealed
        : (saved.directionRevealed ? [0] : []);
    }
  }

  setKeypadDisabled(false);
  clearYear();
  els.result.hidden = true;
  els.nextBtn.hidden = true;

  renderEvent();
  renderExtraHints();
  renderGuesses();

  if (state.done) {
    finishGame(state.won);
  }
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

async function init() {
  const res = await fetch("events.min.json");
  const raw = await res.json();
  events = raw.map(([year, hints]) => normalizeEvent({
    year,
    hints: hints.map((text) => ({ text, source: sourceFor(year) })),
  }));

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

  switchMode("daily");
}

init().catch((err) => {
  els.eventText.textContent = "Kon de gebeurtenis niet laden.";
  console.error(err);
});
