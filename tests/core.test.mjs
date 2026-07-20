// Unit tests voor de pure spel-logica in game.js — GEEN DB, GEEN DOM, GEEN npm.
// We laten game.js ONGEWIJZIGD: de test leest 'm in, stript de init()-call, stubt
// de browser-globals die bij load worden aangeraakt, en draait 'm via indirecte
// eval. Functies/consts worden via een aangehangen __T-handle blootgesteld.
// Draaien:  cd yeardle-nl && node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// --- stub de browser-globals die game.js bij load aanraakt (geen echt DOM) ---
const noopEl = {
  classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
  querySelectorAll: () => [], addEventListener() {}, setAttribute() {},
  after() {}, appendChild() {}, remove() {}, hidden: true, style: {}, dataset: {},
  textContent: "", innerHTML: "",
};
// sommige globals (navigator/localStorage) zijn read-only getters in nieuwe Node — robuust zetten
function setGlobal(k, v) {
  try { globalThis[k] = v; }
  catch { try { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); } catch {} }
}
setGlobal("document", {
  getElementById: () => noopEl, querySelector: () => null, querySelectorAll: () => [],
  documentElement: {}, addEventListener() {}, createElement: () => ({ ...noopEl }),
});
setGlobal("window", globalThis);
setGlobal("location", { pathname: "/", search: "", hostname: "localhost", origin: "http://localhost" });
setGlobal("history", { replaceState() {} });
setGlobal("requestAnimationFrame", () => {});
setGlobal("localStorage", {
  _: {}, getItem(k) { return k in this._ ? this._[k] : null; },
  setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; },
  key(i) { return Object.keys(this._)[i] ?? null; },
  get length() { return Object.keys(this._).length; },
});

// --- game.js inladen zonder z'n auto-init / netwerk ---
const dir = dirname(fileURLToPath(import.meta.url));
let src = readFileSync(join(dir, "..", "game.js"), "utf8");
src = src.replace(/\ninit\(\)\.catch\([\s\S]*$/, "\n");   // strip de init()-aanroep + alles erna
src += `
;globalThis.__T = {
  classify, scoreTier, parseShareToken, emojiFor, t, computeScore, I18N, outOfBand,
  BAND_OUTER, BAND_SLACK, fasterThanHtml,
  setState: (s) => { state = s; },
  setLang:  (l) => { lang = l; },
};`;
(0, eval)(src);   // indirecte eval → sloppy global scope (game.js heeft geen 'use strict')
const T = globalThis.__T;

test("classify — afstand → bucket", () => {
  assert.equal(T.classify(0), "correct");
  assert.equal(T.classify(2), "veryclose");
  assert.equal(T.classify(-2), "veryclose");   // absolute waarde
  assert.equal(T.classify(10), "close");
  assert.equal(T.classify(25), "warm");
  assert.equal(T.classify(50), "cool");
  assert.equal(T.classify(200), "far");
  assert.equal(T.classify(201), "distant");
});

test("scoreTier — score → tier-key", () => {
  assert.equal(T.scoreTier(100).key, "perfect");
  assert.equal(T.scoreTier(85).key, "impressive");
  assert.equal(T.scoreTier(60).key, "good");
  assert.equal(T.scoreTier(40).key, "solid");
  assert.equal(T.scoreTier(1).key, "justmade");
  assert.equal(T.scoreTier(0).key, "lost");
});

test("computeScore — penalties per gok + hints, niet onder 0", () => {
  T.setState({ won: false, guesses: [], directionsRevealed: [], laterCluesShown: 0 });
  assert.equal(T.computeScore(), 0);                       // verloren = 0

  T.setState({ won: true, guesses: [{ cls: "correct" }], directionsRevealed: [], laterCluesShown: 0 });
  assert.equal(T.computeScore(), 100);                     // in één keer goed

  // Zelfde-tijd extra's (geel) zijn gratis; ⏩-clues −3 elk; 🧭-richting −3 elk (sinds v147).
  T.setState({ won: true, guesses: [{ cls: "close" }, { cls: "correct" }], directionsRevealed: [0], laterCluesShown: 2 });
  assert.equal(T.computeScore(), 100 - 5 - 3 - 2 * 3);     // close(5) + dir(3) + 2×later(3) = 86

  T.setState({ won: true, guesses: Array(6).fill({ cls: "farthest" }), directionsRevealed: [0, 1], laterCluesShown: 0 });
  assert.equal(T.computeScore(), 0);                       // clamp op 0, niet negatief
});

test("fasterThanHtml — score-percentiel: mid-rank, min-sample, clamps, alleen winst", () => {
  T.setLang("nl");
  T.setState({ won: true, guesses: [{ cls: "correct", diff: 0 }] });
  assert.equal(T.fasterThanHtml(null), "");                                            // RPC faalde → geen regel
  assert.equal(T.fasterThanHtml({ lower: 3, same: 1, total: 4 }), "");                 // te weinig data
  assert.match(T.fasterThanHtml({ lower: 8, same: 2, total: 10 }), /Beter dan 90%/);   // mid-rank: (8+2/2)/10
  assert.match(T.fasterThanHtml({ lower: 10, same: 0, total: 10 }), /Beter dan 99%/);  // clamp boven
  assert.match(T.fasterThanHtml({ lower: 0, same: 0, total: 10 }), /Beter dan 1%/);    // clamp onder
  T.setState({ won: false, guesses: [] });
  assert.equal(T.fasterThanHtml({ lower: 8, same: 2, total: 10 }), "");                // verlies → geen regel
});

test("parseShareToken — N×10 hex of null", () => {
  assert.deepEqual(T.parseShareToken("abcdef0123"), ["abcdef0123"]);
  assert.deepEqual(T.parseShareToken("abcdef0123" + "0011223344"), ["abcdef0123", "0011223344"]);
  assert.equal(T.parseShareToken(""), null);
  assert.equal(T.parseShareToken("abc"), null);            // geen veelvoud van 10
  assert.equal(T.parseShareToken("ABCDEF0123"), null);     // hoofdletters niet toegestaan
  assert.equal(T.parseShareToken("xyz!"), null);
});

test("emojiFor — elke bucket heeft een emoji", () => {
  for (const cls of ["correct", "veryclose", "close", "warm", "cool", "far", "distant"]) {
    assert.match(T.emojiFor(cls), /\p{Emoji}/u);
  }
});

test("i18n — t() wisselt NL/EN en dicts dekken dezelfde keys", () => {
  T.setLang("nl");
  assert.equal(T.t("tab_daily"), "Dagelijkse Jaardle");
  T.setLang("en");
  assert.equal(T.t("tab_daily"), "Daily Jaardle");
  assert.equal(T.t("nietbestaand") ?? null, T.I18N.nl["nietbestaand"] ?? null);  // fallback → nl/undefined
  const nlKeys = Object.keys(T.I18N.nl).sort();
  const enKeys = Object.keys(T.I18N.en).sort();
  assert.deepEqual(enKeys, nlKeys, "NL en EN dictionaries moeten dezelfde keys hebben");
});

test("outOfBand — waarschuwt als de gok duidelijk buiten het bereik van je dichtste gok valt", () => {
  const close = { year: 1850, diff: 5, cls: "close" };   // bovengrens 10 (+ slack 30 = 40)
  // geen eerdere gokken → nooit
  assert.equal(T.outOfBand([], 1800), 0);
  // close → bovengrens 10 + speelruimte 30 = 40; pas verder dan 40 jaar weg → afstand terug
  assert.equal(T.outOfBand([close], 1800), 50);   // |1800-1850| = 50 > 40
  assert.equal(T.outOfBand([close], 1915), 65);
  // binnen bovengrens + speelruimte → geen waarschuwing (zou v66 wél hebben gewaarschuwd)
  assert.equal(T.outOfBand([close], 1858), 0);    // |1858-1850| = 8
  assert.equal(T.outOfBand([close], 1885), 0);    // |1885-1850| = 35 ≤ 40
  // grens: precies op bovengrens + speelruimte telt niet, één jaar erbuiten wél
  assert.equal(T.outOfBand([close], 1850 + T.BAND_OUTER.close + T.BAND_SLACK), 0);
  assert.equal(T.outOfBand([close], 1850 + T.BAND_OUTER.close + T.BAND_SLACK + 1), 41);
  // bredere band (warm, bovengrens 25 + 30 = 55) → grotere sprong toegestaan
  const warm = { year: 1850, diff: 20, cls: "warm" };
  assert.equal(T.outOfBand([warm], 1900), 0);     // |1900-1850| = 50 ≤ 55
  assert.equal(T.outOfBand([warm], 1910), 60);    // |1910-1850| = 60 > 55
  // farthest (600+) is onbegrensd → nooit een waarschuwing
  assert.equal(T.outOfBand([{ year: 1850, diff: 700, cls: "farthest" }], 0), 0);
  // pakt de DICHTSTE gok (smalste band), niet de meest recente
  assert.equal(T.outOfBand([close, { year: 1700, diff: 150, cls: "far" }], 1790), 60); // |1790-1850|
});
