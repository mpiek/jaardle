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
  BAND_OUTER, BAND_SLACK, scoreRankPct, scoreFineBin, buildHistogram,
  easterSunday, holidayFxFor, historicFxFor, HolidayFx,
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

test("scoreRankPct — score-percentiel: mid-rank, min-sample, clamps, alleen winst", () => {
  T.setLang("nl");
  T.setState({ won: true, guesses: [{ cls: "correct", diff: 0 }] });
  assert.equal(T.scoreRankPct(null), null);                                  // RPC faalde → geen rangbalk
  assert.equal(T.scoreRankPct({ lower: 3, same: 1, total: 4 }), null);       // te weinig data
  assert.equal(T.scoreRankPct({ lower: 6, same: 2, total: 10 }), 78);        // mid-rank: (6+1)/9, eigen play eruit
  assert.equal(T.scoreRankPct({ lower: 8, same: 2, total: 10 }), 100);       // topscore: ties van anderen in je voordeel
  assert.equal(T.scoreRankPct({ lower: 0, same: 1, total: 10 }), 1);         // vloer: hekkensluiter ziet geen 0%
  T.setState({ won: false, guesses: [] });
  assert.equal(T.scoreRankPct({ lower: 8, same: 2, total: 10 }), null);      // verlies → geen rangbalk
});

test("scoreFineBin — 5-puntsbins, spiegel van db/65", () => {
  assert.equal(T.scoreFineBin(0), 0);
  assert.equal(T.scoreFineBin(4), 0);
  assert.equal(T.scoreFineBin(5), 1);
  assert.equal(T.scoreFineBin(77), 15);   // 75–79
  assert.equal(T.scoreFineBin(99), 19);   // 95–99
  assert.equal(T.scoreFineBin(100), 20);  // perfect apart
});

test("buildHistogram — zoomt op het bezette bereik, fijn per 5 of grof per 10", () => {
  const dist = new Array(22).fill(0);
  dist[0] = 2;                       // 2 verliezers
  dist[1 + 10] = 12; dist[1 + 15] = 20; dist[1 + 20] = 4;  // scores 50–54, 75–79, 100 (36 winnaars ≥ 2,5 × 11 bins)
  let h = T.buildHistogram(dist, 77, true);
  assert.equal(h.step, 5);
  assert.equal(h.loScore, 50);
  assert.equal(h.bars.length, 12);                 // verl. + 50,55,…,95 + 100 (11 fijne bins ≤ 14)
  assert.equal(h.bars[0].count, 2);
  assert.equal(h.bars[h.mine].from, 75);           // 77 zit in 75–79
  assert.equal(h.bars[h.bars.length - 1].count, 4);
  assert.ok(h.xOf(50) > h.xOf(49) - 0.01 && h.xOf(77) > h.xOf(60) && h.xOf(100) > h.xOf(99));
  // eigen lage winst-score trekt het venster open
  h = T.buildHistogram(dist, 42, true);
  assert.equal(h.loScore, 40);
  // te weinig winnaars per staaf → per 10
  const sparse = new Array(22).fill(0); sparse[0] = 2; sparse[1 + 10] = 3; sparse[1 + 15] = 5; sparse[1 + 20] = 1;
  assert.equal(T.buildHistogram(sparse, 77, true).step, 10);
  // wijd bereik → per 10, 100 apart
  const wide = new Array(22).fill(1);
  h = T.buildHistogram(wide, 77, true);
  assert.equal(h.step, 10);
  assert.equal(h.bars.length, 12);                 // verl. + 0,10,…,90 + 100
  assert.equal(h.bars[1].count, 2);                // 0–4 + 5–9 samengevoegd
  assert.equal(h.bars[h.mine].from, 70);
  // verlies: pin op de verl.-staaf, venster op de anderen
  h = T.buildHistogram(dist, 3, false);
  assert.equal(h.mine, 0);
  assert.equal(h.loScore, 50);
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
  // tab_free verschilt per taal (tab_daily is in NL én EN "Daily").
  T.setLang("nl");
  assert.equal(T.t("tab_free"), "Nieuw spel");
  T.setLang("en");
  assert.equal(T.t("tab_free"), "New game");
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

test("easterSunday — Meeus/Jones/Butcher, 2026–2032", () => {
  const want = { 2026: [4, 5], 2027: [3, 28], 2028: [4, 16], 2029: [4, 1], 2030: [4, 21], 2031: [4, 13], 2032: [3, 28] };
  for (const [y, md] of Object.entries(want)) assert.deepEqual(T.easterSunday(+y), md, `Pasen ${y}`);
});

test("holidayFxFor — vaste dagen, paas-afgeleiden, maankalender, voorrang bij overlap, gewone dag = null", () => {
  const d = (y, m, dd) => new Date(y, m - 1, dd, 12);
  assert.equal(T.holidayFxFor(d(2026, 1, 1)), "newyear");
  assert.equal(T.holidayFxFor(d(2026, 12, 31)), "newyear");
  assert.equal(T.holidayFxFor(d(2026, 1, 6)), "kings");
  assert.equal(T.holidayFxFor(d(2026, 2, 14)), "valentine");
  assert.equal(T.holidayFxFor(d(2026, 3, 17)), "patrick");
  assert.equal(T.holidayFxFor(d(2026, 6, 28)), "pride");
  assert.equal(T.holidayFxFor(d(2026, 10, 31)), "halloween");
  assert.equal(T.holidayFxFor(d(2026, 11, 1)), "muertos");
  assert.equal(T.holidayFxFor(d(2026, 11, 2)), "muertos");
  assert.equal(T.holidayFxFor(d(2026, 12, 24)), "xmas");
  assert.equal(T.holidayFxFor(d(2026, 12, 26)), "xmas");
  assert.equal(T.holidayFxFor(d(2026, 12, 27)), null);
  // Pasen 2026 = 5 april → paasmaandag 6 april; carnaval = 15–17 februari
  assert.equal(T.holidayFxFor(d(2026, 4, 5)), "easter");
  assert.equal(T.holidayFxFor(d(2026, 4, 6)), "easter");
  assert.equal(T.holidayFxFor(d(2026, 4, 7)), null);
  assert.equal(T.holidayFxFor(d(2026, 2, 15)), "carnival");
  assert.equal(T.holidayFxFor(d(2026, 2, 16)), "carnival");
  assert.equal(T.holidayFxFor(d(2026, 2, 17)), "lunar");      // Lunar Nieuwjaar wint van carnavalsdinsdag
  assert.equal(T.holidayFxFor(d(2026, 2, 18)), null);          // Aswoensdag: niets
  assert.equal(T.holidayFxFor(d(2026, 3, 20)), "eid");
  assert.equal(T.holidayFxFor(d(2026, 3, 22)), "eid");
  assert.equal(T.holidayFxFor(d(2026, 3, 23)), null);
  assert.equal(T.holidayFxFor(d(2029, 2, 14)), "eid");         // Eid wint van Valentijn
  assert.equal(T.holidayFxFor(d(2026, 11, 8)), "diwali");
  assert.equal(T.holidayFxFor(d(2027, 10, 29)), "diwali");
  assert.equal(T.holidayFxFor(d(2026, 9, 20)), null);
  assert.equal(T.holidayFxFor(d(2033, 2, 10)), null);          // buiten de maankalender-tabel: stil null
});

test("historicFxFor — puzzeldag + gepind jaar; ander jaar of andere dag = null", () => {
  assert.equal(T.historicFxFor("2027-04-21", -753), "rome");
  assert.equal(T.historicFxFor("2027-04-21", 1994), null);
  assert.equal(T.historicFxFor("2027-07-20", 1969), "moon");
  assert.equal(T.historicFxFor("2026-10-15", 1582), "gregorian");
  assert.equal(T.historicFxFor("2026-10-16", 1582), null);
  assert.equal(T.historicFxFor("2027-03-15", -44), "ides");
  assert.equal(T.historicFxFor("2027-05-29", 1953), "everest");
  assert.equal(T.historicFxFor("2026-10-12", 1492), "columbus");
  assert.equal(T.historicFxFor("2026-12-17", 1903), "flight");
  assert.equal(T.historicFxFor(undefined, 1582), null);
});

test("HolidayFx — elke viering uit de tabellen heeft een laag", () => {
  for (const id of ["newyear", "kings", "lunar", "eid", "valentine", "patrick", "carnival", "easter", "pride", "halloween", "muertos", "diwali", "xmas", "rome", "moon", "gregorian", "ides", "everest", "columbus", "flight"]) {
    assert.ok(T.HolidayFx.has(id), id);
  }
  assert.equal(T.HolidayFx.has("stamp"), false);
});
