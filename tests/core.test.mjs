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
  BAND_INNER, guessRanges, guessImpossibleAt, strictGuardOn, remainingRanges,
  intersectRanges, rangeLabel, MIN_YEAR, MAX_YEAR, digitGlowOn, MAX_GUESSES,
  easterSunday, holidayFxFor, historicFxFor, HolidayFx,
  raceWindow, racePos, RACE_MIN_SPREAD, RACE_LEAD_POS, RACE_LAST_POS,
  dagzegeApplies, forecastWins, forecastPlaces, oddsLimits, oddsShareAfter, oddsHamilton, oddsView, oddsBuild, oddsHash, oddsPct, DAGZEGE_ALONE_FROM, ODDS_FOLD, ODDS_MIN_PLAYERS, ODDS_MIN_WEEK_ROWS, ODDS_PLACES_MIN,
  recapArrowKey, setRecapArrow: (r) => { recapArrow = r; },
  ACHV_SERIES, ACHV_TIER_KEYS, CAPSTONE_MAX, BEER_FX, achvTier, capstoneTier, achvTickPos, achvRailPct, achvTierName,
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
  assert.equal(T.holidayFxFor(d(2026, 3, 19)), "eid");      // ±1 dag rond de voorspelling (20 mrt)
  assert.equal(T.holidayFxFor(d(2026, 3, 21)), "eid");
  assert.equal(T.holidayFxFor(d(2026, 3, 22)), null);
  assert.equal(T.holidayFxFor(d(2029, 2, 14)), "eid");         // Eid wint van Valentijn
  assert.equal(T.holidayFxFor(d(2026, 11, 7)), "diwali");    // ±1 dag rond de voorspelling (8 nov)
  assert.equal(T.holidayFxFor(d(2026, 11, 9)), "diwali");
  assert.equal(T.holidayFxFor(d(2026, 11, 10)), null);
  assert.equal(T.holidayFxFor(d(2027, 10, 29)), "diwali");
  assert.equal(T.holidayFxFor(d(2026, 2, 16)), "carnival");  // Lunar NY (17-2) blijft exact: 16-2 is nog carnaval
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

// ── Strenge guard: bereiken, omslagpunt en de veiligheidsgarantie ────────────
test("guessRanges — een gok laat twee vensters open, 🧭 knipt er één weg", () => {
  const g = { year: 1450, diff: 51, cls: "far" };            // badge 51–200
  assert.deepEqual(T.guessRanges(g, false), [[1250, 1399], [1501, 1650]]);
  assert.deepEqual(T.guessRanges(g, true), [[1501, 1650]]);  // diff > 0 → omhoog
  assert.deepEqual(T.guessRanges({ year: 1450, diff: -51, cls: "far" }, true), [[1250, 1399]]);
  assert.deepEqual(T.guessRanges({ year: 1501, diff: 0, cls: "correct" }, false), []);
});

test("guessRanges — knipt op de speelbare jaren en houdt 600+ open", () => {
  const r = T.guessRanges({ year: 1822, diff: -321, cls: "distant" }, false);
  assert.deepEqual(r[0], [1223, 1621]);
  assert.deepEqual(r[1], [2023, T.MAX_YEAR]);
  assert.deepEqual(T.guessRanges({ year: 800, diff: 701, cls: "farthest" }, false),
    [[T.MIN_YEAR, 200], [1400, T.MAX_YEAR]]);
  const edge = T.guessRanges({ year: T.MIN_YEAR + 5, diff: 300, cls: "distant" }, false);
  assert.equal(edge.length, 1);                              // linkerhelft valt weg
  assert.equal(edge[0][0], T.MIN_YEAR + 206);
});

test("guessImpossibleAt — vangt 'te dicht bij de vorige gok', anders dan outOfBand", () => {
  const rev = new Set();
  const g1450 = { year: 1450, diff: 51, cls: "far" };         // 1250–1399 of 1501–1650
  assert.equal(T.guessImpossibleAt([g1450], 1500, rev), 0);   // 50 weg, band zei ≥51
  assert.equal(T.outOfBand([g1450], 1500), 0);                // flauwe guard laat 'm door
  assert.equal(T.guessImpossibleAt([g1450], 1501, rev), -1);
  assert.equal(T.guessImpossibleAt([g1450], 1650, rev), -1);
  assert.equal(T.guessImpossibleAt([g1450], 1651, rev), 0);
  assert.equal(T.guessImpossibleAt([g1450], 1300, new Set([0])), 0);   // 🧭 sluit links uit
});

test("strictGuardOn — pas na een gok die de speler zelf al uitsloot", () => {
  const rev = new Set();
  const g1450 = { year: 1450, diff: 51, cls: "far" };
  const g1550 = { year: 1550, diff: -49, cls: "cool" };
  assert.equal(T.strictGuardOn([], rev), false);
  assert.equal(T.strictGuardOn([g1450], rev), false);         // gok 1 kan nooit fout zijn
  assert.equal(T.strictGuardOn([g1450, g1550], rev), false);  // 1550 mocht (1501–1650)
  assert.equal(T.strictGuardOn([g1450, { year: 1500, diff: 1, cls: "veryclose" }], rev), true);
});

test("remainingRanges — doorsnede van alle vensters, met de 🏛️-eeuw erbij", () => {
  const rev = new Set();
  const gs = [{ year: 1450, diff: 51, cls: "far" }, { year: 1555, diff: -54, cls: "far" }];
  // 1450 laat 1250–1399 / 1501–1650 toe, 1555 laat 1355–1504 / 1606–1755 toe:
  // drie stukken overlappen, waaronder het venster 1606–1650 rechtsboven.
  assert.deepEqual(T.remainingRanges(gs, rev, null),
    [[1355, 1399], [1501, 1504], [1606, 1650]]);
  assert.deepEqual(T.remainingRanges(gs, rev, 1501), [[1501, 1504]]);   // 1500–1599
  assert.deepEqual(T.remainingRanges([], rev, null), [[T.MIN_YEAR, T.MAX_YEAR]]);
  assert.deepEqual(T.intersectRanges([[1, 10]], [[20, 30]]), []);
});

test("strenge guard blokkeert NOOIT het juiste antwoord", () => {
  // De garantie waar alles op staat: wat de speler ook gokt, het echte jaartal moet
  // altijd in elk venster blijven vallen — anders kan een potje onwinbaar worden.
  const rev = new Set();
  for (let answer = -753; answer <= 2026; answer += 7) {
    const gs = [];
    for (const g of [answer - 900, answer + 340, answer - 77, answer + 31, answer - 4, answer + 1]) {
      const year = Math.max(T.MIN_YEAR, Math.min(T.MAX_YEAR, g));
      if (year === answer) continue;
      gs.push({ year, diff: answer - year, cls: T.classify(answer - year) });
      assert.equal(T.guessImpossibleAt(gs, answer, rev), -1,
        `antwoord ${answer} uitgesloten na gok ${year}`);
      const left = T.remainingRanges(gs, rev, answer);
      assert.ok(left.some(([a, b]) => answer >= a && answer <= b),
        `antwoord ${answer} valt buiten de resterende bereiken`);
    }
  }
});

test("rangeLabel — v.Chr. telt aflopend en één jaar blijft één jaartal", () => {
  T.setLang("nl");
  assert.equal(T.rangeLabel(1250, 1399), "1250–1399");
  assert.equal(T.rangeLabel(-753, -200), "753–200 v.Chr.");
  assert.equal(T.rangeLabel(-50, 120), "50 v.Chr.–120");
  assert.equal(T.rangeLabel(1501, 1501), "1501");
  T.setLang("en");
  assert.equal(T.rangeLabel(-753, -200), "753–200 BC");
});

test("digitGlowOn — puls vanaf gok 4, uit bij 🟪, gekochte 🔢 of einde", () => {
  const g = (cls) => ({ year: 1500, diff: 30, cls });
  const drie = [g("far"), g("cool"), g("warm")];
  const vier = [...drie, g("close")];
  assert.equal(T.digitGlowOn({ guesses: drie }), false);           // gok 3: nog te vroeg
  assert.equal(T.digitGlowOn({ guesses: vier }), true);            // gok 4: aan
  assert.equal(T.digitGlowOn({ guesses: [...vier, g("close")] }), true);   // gok 5: blijft
  assert.equal(T.digitGlowOn({ guesses: vier, done: true }), false);
  assert.equal(T.digitGlowOn({ guesses: vier, lastDigitRevealed: true }), false);
  // De uitzondering hangt aan de KLEUR, niet aan de afstand in jaren: het uitblijven
  // van de puls mag niets verraden wat niet al als badge op het bord staat.
  assert.equal(T.digitGlowOn({ guesses: [...drie, g("veryclose")] }), false);
  assert.equal(T.digitGlowOn({ guesses: [g("veryclose"), ...drie] }), false);
  assert.equal(T.digitGlowOn({ guesses: [] }), false);
  assert.equal(T.digitGlowOn(null), false);
  assert.equal(T.MAX_GUESSES - 2, 4);   // "vanaf gok 4" staat of valt hiermee
});

// --- ⚔️ Weekstand-race in de recap (grill 3/10) ---
const mkRows = (n, meIdx) => Array.from({ length: n }, (_, i) => ({ rank: i + 1, week_score: 300 - i * 20, is_me: i === meIdx }));

test("raceWindow — top-3 + jouw buren, jager als je op het podium staat", () => {
  assert.deepEqual(T.raceWindow(mkRows(1, 0)), [0]);                    // alleen jij
  assert.deepEqual(T.raceWindow(mkRows(2, -1)), [0, 1]);                // nog niet op het bord, 2 rijen
  assert.deepEqual(T.raceWindow(mkRows(8, 0)), [0, 1, 2, 3]);           // 1e → top-3 + jager
  assert.deepEqual(T.raceWindow(mkRows(8, 2)), [0, 1, 2, 3]);           // 3e → top-3 + jager
  assert.deepEqual(T.raceWindow(mkRows(8, 3)), [0, 1, 2, 3, 4]);        // 4e → aaneengesloten, geen ⋯
  assert.deepEqual(T.raceWindow(mkRows(8, 5)), [0, 1, 2, 4, 5, 6]);     // 6e → ⋯ op index 3
  assert.deepEqual(T.raceWindow(mkRows(6, 5)), [0, 1, 2, 4, 5]);        // laatste → geen rij onder je
  assert.deepEqual(T.raceWindow(mkRows(5, -1)), [0, 1, 2, 3]);          // niet op het bord → jager
});

test("racePos — koploper-relatief, minimale spreiding, nooit buiten de baan", () => {
  // Koploper staat op RACE_LEAD_POS; de achterste bij een ruime spreiding op RACE_LAST_POS.
  assert.equal(T.racePos(300, 300, 150), T.RACE_LEAD_POS);
  assert.ok(Math.abs(T.racePos(150, 300, 150) - T.RACE_LAST_POS) < 1e-9);
  // Kleine spreiding (10 punten) telt als RACE_MIN_SPREAD: de achterste ligt dan dicht bij de kop.
  const near = T.racePos(290, 300, 290);
  assert.ok(near > 0.75 && near < T.RACE_LEAD_POS, `near=${near}`);
  assert.ok(Math.abs(near - (T.RACE_LEAD_POS - (10 / T.RACE_MIN_SPREAD) * (T.RACE_LEAD_POS - T.RACE_LAST_POS))) < 1e-9);
  // Iedereen gelijk (maandagochtend, 1 speler): alles op de kop, geen NaN.
  assert.equal(T.racePos(120, 120, 120), T.RACE_LEAD_POS);
  // Monotoon: meer punten = verder op de baan.
  const ps = [300, 280, 240, 150].map((sc) => T.racePos(sc, 300, 150));
  assert.deepEqual([...ps].sort((a, b) => b - a), ps);
  for (const p of ps) assert.ok(p >= T.RACE_LAST_POS - 1e-9 && p <= T.RACE_LEAD_POS + 1e-9);
});

// --- 🔮 Kans: winkansen op de weekzege (grill 3/10) ---
test("dagzegeApplies — gewonnen, en ≥2 deelnemers of vanaf de grensdatum ook alleen (db/74+76)", () => {
  assert.equal(T.DAGZEGE_ALONE_FROM, "2026-10-04");
  assert.equal(T.dagzegeApplies(1, true, "2026-10-03"), false);    // alleen, vóór de grens
  assert.equal(T.dagzegeApplies(1, true, "2026-10-04"), true);     // alleen, vanaf de grens
  assert.equal(T.dagzegeApplies(2, true, "2026-09-01"), true);     // altijd bij ≥2
  assert.equal(T.dagzegeApplies(1, false, "2026-10-12"), false);   // een verlies is nooit een dagzege
  assert.equal(T.dagzegeApplies(5, false, "2026-10-12"), false);
});

const mkSim = (over = {}) => ({
  players: [], dayMean: 75, daySd: 6, todayKey: "2026-10-06", todayD: 75, todaySd: 6, todayOpen: false, futureKeys: [], ...over,
});
const pl = (o = {}) => ({ base: 0, q: 1, lost: 0, mu: 0, sd: 8, today: null, pToday: 0, ...o });

test("forecastWins — tellen op tot 1, deterministisch per seed", () => {
  const inp = mkSim({ players: [pl({ base: 300 }), pl({ base: 280 }), pl({ base: 250, q: 0.7 })], futureKeys: ["2026-10-07", "2026-10-08", "2026-10-09"] });
  const a = T.forecastWins(inp, 2000, 42), b = T.forecastWins(inp, 2000, 42), c = T.forecastWins(inp, 2000, 43);
  assert.ok(Math.abs(a.reduce((x, y) => x + y, 0) - 1) < 1e-9);
  assert.deepEqual(a, b);                 // zelfde seed = zelfde getallen (geen geflipper bij heropenen)
  assert.notDeepEqual(a, c);              // andere seed = andere ruis
  assert.ok(a[0] > a[2]);                 // meer punten + vaker spelen wint vaker
});

test("forecastWins — beslist is beslist, symmetrie is 50/50, wie niet speelt wint niet", () => {
  // geen dagen meer: de koploper wint altijd
  const done = T.forecastWins(mkSim({ players: [pl({ base: 400 }), pl({ base: 200 })] }), 500, 1);
  assert.equal(done[0], 1);
  // twee identieke spelers, zelfde stand → ± 50/50
  const sym = T.forecastWins(mkSim({ players: [pl({ base: 100 }), pl({ base: 100 })], futureKeys: ["2026-10-07", "2026-10-08"] }), 6000, 7);
  assert.ok(Math.abs(sym[0] - 0.5) < 0.05, `sym=${sym[0]}`);
  // een betere speler (mu +12) met dezelfde stand en 5 dagen te gaan wint meestal
  const better = T.forecastWins(mkSim({ players: [pl({ base: 100, mu: 12 }), pl({ base: 100 })], futureKeys: ["2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"] }), 4000, 9);
  assert.ok(better[0] > 0.6, `better=${better[0]}`);
  // q = 0: speelt nooit meer, dus verliest van wie nog wel punten haalt
  const idle = T.forecastWins(mkSim({ players: [pl({ base: 150, q: 0 }), pl({ base: 100 })], futureKeys: ["2026-10-07", "2026-10-08", "2026-10-09"] }), 1000, 3);
  assert.ok(idle[1] > 0.9, `idle=${idle}`);
});

test("forecastWins — vandaag: vaste resultaten, wie nog moet spelen kan de dagzege afpakken", () => {
  // A (net gespeeld, 80) en B (nog niet; speelt vandaag zeker, mu +15 = vaak beter). Zonder dagen erna beslist de dagzege.
  const mk = (pToday) => mkSim({
    todayOpen: true, todayD: 75, todaySd: 0.0001, players: [
      pl({ base: 200, q: 1, today: { won: true, score: 80, rank: 1 } }),
      pl({ base: 190, q: 1, mu: 15, sd: 1, pToday }),
    ] });
  const stays = T.forecastWins(mk(0), 2000, 5);          // B speelt niet meer → A houdt 200 (+25 als er een 2e deelnemer is: hier niet)
  assert.equal(stays[0], 1);
  const may = T.forecastWins(mk(1), 2000, 5);            // B speelt zeker: ±90 → 280 vs 200 (+ dagzege voor B)
  assert.ok(may[1] > 0.95, `may=${may}`);
});

test("forecastWins — gedeelde 1e plek van vandaag: allebei de dagzege (zoals de SQL), niet alleen de eerste in de lijst", () => {
  // A (base 90) en B (base 100) hebben vandaag precies hetzelfde resultaat en delen rang 1: beiden +25 → B blijft vóór A.
  // (Een fout waarbij alleen de eerste in de lijst de bonus kreeg, zette A met 115 vóór B met 100.)
  const tie = { won: true, score: 80, rank: 1 };
  const r = T.forecastWins(mkSim({ todayKey: "2026-10-06", players: [pl({ base: 90, today: tie }), pl({ base: 100, today: tie })] }), 500, 11);
  assert.equal(r[1], 1);
  // vóór de grensdatum geldt de ≥2-regel: met twee deelnemers krijgen ze ook dan allebei de bonus
  const old = T.forecastWins(mkSim({ todayKey: "2026-10-01", players: [pl({ base: 90, today: tie }), pl({ base: 100, today: tie })] }), 500, 11);
  assert.equal(old[1], 1);
});

test("oddsShareAfter — aandeel van de dag dat nog komt", () => {
  const uni = new Array(24).fill(1 / 24);
  assert.ok(Math.abs(T.oddsShareAfter(uni, 0) - 1) < 1e-9);
  assert.ok(Math.abs(T.oddsShareAfter(uni, 12 * 3600) - 0.5) < 1e-9);
  assert.ok(Math.abs(T.oddsShareAfter(uni, 12 * 3600 + 1800) - (0.5 - 1 / 48)) < 1e-9);   // halverwege uur 12
  assert.ok(T.oddsShareAfter(uni, 86399) < 0.001);
  assert.equal(T.oddsShareAfter(null, 100), 0.5);   // geen verdeling → neutraal
});

test("oddsHamilton — hele procenten, altijd 100", () => {
  assert.equal(T.oddsHamilton([0.333, 0.333, 0.334]).reduce((a, b) => a + b, 0), 100);
  assert.deepEqual(T.oddsHamilton([0.5, 0.25, 0.25]), [50, 25, 25]);
  for (let k = 0; k < 20; k++) {
    const v = Array.from({ length: 2 + (k % 9) }, (_, i) => ((k * 7 + i * 13) % 17) + 1);
    assert.equal(T.oddsHamilton(v).reduce((a, b) => a + b, 0), 100);
  }
});

const mkItems = (probs, me = 0) => probs.map((p, i) => ({ id: "p" + i, idx: i, name: "S" + i, flair: "", title: "", me: i === me, prob: p }));

test("oddsView — onder 3% vouwt samen tot Overig (alleen bij ≥ 2), jij blijft vindbaar", () => {
  const v = T.oddsView(mkItems([0.4, 0.3, 0.2, 0.05, 0.02, 0.01, 0.01, 0.01], 5));
  assert.equal(v.items.length, 4);                               // 40/30/20/5
  assert.ok(v.other && v.other.members.length === 4);            // 2+1+1+1 %
  assert.equal(v.other.me, true);                                // jij zit in Overig
  assert.equal(v.meId, "p5");
  const sum = v.items.reduce((a, x) => a + v.pc[x.id], 0) + v.pc.other;
  assert.equal(sum, 100);
  assert.deepEqual(v.items.map((x) => x.id), ["p0", "p1", "p2", "p3"]);   // grootste kans eerst
  // één kleine speler = geen Overig-plak (een plak voor één persoon zou alleen verwarren)
  const one = T.oddsView(mkItems([0.5, 0.3, 0.19, 0.01]));
  assert.equal(one.other, null);
  assert.equal(one.items.length, 4);
  // kansen die niet precies tot 1 optellen worden genormaliseerd
  const raw = T.oddsView(mkItems([0.2, 0.2, 0.2, 0.2]));
  assert.deepEqual(raw.items.map((x) => raw.pc[x.id]), [25, 25, 25, 25]);
});

test("oddsBuild — drempels, kansen tellen op tot 1, stabiel per stand", () => {
  const names = ["Anna", "Joris", "Piet", "Lisa", "Mo", "Sanne", "Daan"];
  const fc = {
    day_mean: 76, day_sd: 6, hour_share: new Array(24).fill(1 / 24),
    players: names.map((n, i) => ({ display_name: n, flair: "", title: null, is_me: i === 3, n: 30, q: 0.9 - i * 0.05, lost_p: 0.05, mu: 6 - i * 2, sd: 11 })),
  };
  const week = [["Anna", 300], ["Joris", 290], ["Piet", 250], ["Lisa", 240], ["Mo", 200]].map(([n, w], i) => ({ rank: i + 1, display_name: n, week_score: w, daily_wins: 0, played: 4, is_me: n === "Lisa" }));
  const daily = [{ rank: 1, display_name: "Anna", won: true, score: 90, late: false }, { rank: 2, display_name: "Lisa", won: true, score: 80, late: false }];
  const ctx = { poolId: "p1", weekStart: "2026-09-28", todayKey: "2026-10-01", secsSinceMidnight: 14 * 3600 };
  const items = T.oddsBuild(fc, daily, week, ctx);
  assert.equal(items.length, 7);
  assert.ok(Math.abs(items.reduce((a, x) => a + x.prob, 0) - 1) < 1e-9);
  assert.ok(items.find((x) => x.name === "Anna").prob > items.find((x) => x.name === "Daan").prob);   // koploper > achterstand
  assert.equal(items.filter((x) => x.me).length, 1);
  assert.deepEqual(T.oddsBuild(fc, daily, week, ctx).map((x) => x.prob), items.map((x) => x.prob));   // zelfde stand, zelfde getallen
  // drempels: te weinig spelers in de pool-historie, of te weinig weekrijen → geen donut
  assert.equal(T.oddsBuild({ ...fc, players: fc.players.slice(0, T.ODDS_MIN_PLAYERS - 1) }, daily, week, ctx), null);
  assert.equal(T.oddsBuild(fc, daily, week.slice(0, T.ODDS_MIN_WEEK_ROWS - 1), ctx), null);
  assert.equal(T.oddsBuild(null, daily, week, ctx), null);   // RPC faalde/bestaat nog niet
});

test("oddsPct — nooit 100% of 0% beweren; een duel (2 spelers) is een geldige donut", () => {
  assert.equal(T.ODDS_MIN_PLAYERS, 2);
  assert.equal(T.ODDS_MIN_WEEK_ROWS, 2);
  const v = T.oddsView(mkItems([0.9998, 0.0002]));
  assert.equal(T.oddsPct(v, "p0"), ">99%");
  assert.equal(T.oddsPct(v, "p1"), "<1%");
  assert.equal(v.other, null);                      // één kleine speler: geen Overig-plak
  assert.equal(v.items.length, 2);
  const duel = T.oddsView(mkItems([0.62, 0.38]));
  assert.equal(T.oddsPct(duel, "p0"), "62%");
  assert.equal(T.oddsPct(duel, "p1"), "38%");
  assert.equal(duel.items.reduce((a, x) => a + duel.pc[x.id], 0), 100);
});

test("oddsBuild — werkt voor een pool van twee (duel)", () => {
  const fc = { day_mean: 90, day_sd: 1, hour_share: new Array(24).fill(1 / 24), players: [
    { display_name: "A", flair: "", title: null, is_me: true, q: 0.95, lost_p: 0, mu: -4, sd: 14 },
    { display_name: "B", flair: "", title: null, is_me: false, q: 0.85, lost_p: 0, mu: 6, sd: 4 }] };
  const week = [{ rank: 1, display_name: "B", week_score: 750, played: 6, daily_wins: 6 }, { rank: 2, display_name: "A", week_score: 638, played: 6, daily_wins: 3 }];
  const daily = [{ rank: 1, display_name: "A", won: true, score: 100, late: false }, { rank: 1, display_name: "B", won: true, score: 100, late: false }];   // gedeelde 1e plek
  const items = T.oddsBuild(fc, daily, week, { poolId: "p", weekStart: "2026-09-28", todayKey: "2026-10-03", secsSinceMidnight: 18 * 3600 });
  assert.equal(items.length, 2);
  assert.ok(Math.abs(items[0].prob + items[1].prob - 1) < 1e-9);
  // 112 punten voorsprong, 1 dag te gaan — niet zeker: A kan zondag alleen spelen (B slaat over) en met ≥ 88 + de
  // solo-dagzege (db/76: vanaf 4 okt ook alleen) nog passeren; ±6%
  const B = items.find((x) => x.name === "B");
  assert.ok(B.prob > 0.9 && B.prob < 0.99, `B=${B.prob}`);
  assert.equal(B.sures[0], false);
});

test("oddsLimits / forecastPlaces — wat volgens de regels niet meer kan is exact 0, een onhaalbare koploper exact 1", () => {
  // Zondag 8:30 (4 okt, laatste dag): L heeft een 100 (1 poging, 0 hints) en staat 118 voor op R. R kan hooguit
  // 100 + 25 halen, maar die 25 deelt hij dan met L (een 100 is niet te verslaan) → netto 100 < 118: L is binnen.
  const L = pl({ base: 738, today: { won: true, score: 100, rank: 1 } }), R = pl({ base: 620, pToday: 0.9 }), S = pl({ base: 300, pToday: 0.9 });
  const inp = mkSim({ todayKey: "2026-10-04", todayOpen: true, players: [L, R, S] });
  const lim = T.oddsLimits(inp);
  assert.deepEqual(lim.can[0], [true, false, false]);
  assert.deepEqual(lim.sure[0], [true, false, false]);
  assert.deepEqual(lim.can[1], [false, true, false]);    // R is zeker 2e: S haalt met 125 R's 620 niet
  assert.deepEqual(lim.sure[2], [false, false, true]);
  const pp = T.forecastPlaces(inp, 500, 3);
  assert.deepEqual(pp[0], [1, 0, 0]);
  assert.deepEqual(pp[1], [0, 1, 0]);
  // 100 voorsprong = net niet veilig (R kan gelijk komen; de tiebreak kent de simulatie niet) → niets staat vast
  const edge = T.oddsLimits(mkSim({ todayKey: "2026-10-04", todayOpen: true, players: [pl({ base: 720, today: { won: true, score: 100, rank: 1 } }), pl({ base: 620 })] }));
  assert.deepEqual(edge.can[0], [true, true]);
  assert.deepEqual(edge.sure[0], [false, false]);
  // een 95 ís te verslaan: dan verliest L de voorlopige +25 (zit niet in base) en kan R met 125 een gat tot 125 dichten
  const beat = T.oddsLimits(mkSim({ todayKey: "2026-10-04", todayOpen: true, players: [pl({ base: 745, today: { won: true, score: 95, rank: 1 } }), pl({ base: 620 })] }));
  assert.deepEqual(beat.can[0], [true, true]);
  const safe = T.oddsLimits(mkSim({ todayKey: "2026-10-04", todayOpen: true, players: [pl({ base: 746, today: { won: true, score: 95, rank: 1 } }), pl({ base: 620 })] }));
  assert.deepEqual(safe.sure[0], [true, false]);
  // inhaalpot: een gemiste dag in het venster is 100 punten waard (zonder dagzege)
  const miss = T.oddsLimits(mkSim({ todayKey: "2026-10-04", todayOpen: true, players: [pl({ base: 800 }), pl({ base: 620, miss: 1 })] }));
  assert.deepEqual(miss.can[0], [true, true]);     // 620 + 125 + 100 = 845 > 800
  const miss0 = T.oddsLimits(mkSim({ todayKey: "2026-10-04", todayOpen: true, players: [pl({ base: 800 }), pl({ base: 620 })] }));
  assert.deepEqual(miss0.sure[0], [true, false]);
  // open week: niets staat vast, kansen blijven kansen
  const open = T.forecastPlaces(mkSim({ players: [pl({ base: 300 }), pl({ base: 280 }), pl({ base: 250 })], futureKeys: ["2026-10-07", "2026-10-08", "2026-10-09"] }), 1000, 5);
  assert.ok(open[0].every((p) => p > 0 && p < 1));
});

test("forecastPlaces — twee 100's delen de dagzege (één poging zonder hints is een volledig gelijkspel)", () => {
  // L (al 100 vandaag, 118 voor) vs R die zeker nog speelt en vrijwel zeker een 100 haalt: R kan hooguit delen → L wint altijd.
  const inp = mkSim({ todayKey: "2026-10-04", todayOpen: true, todayD: 100, todaySd: 0.0001, players: [
    pl({ base: 738, today: { won: true, score: 100, rank: 1 } }), pl({ base: 620, mu: 30, sd: 0.001, pToday: 1 })] });
  assert.deepEqual(T.forecastPlaces(inp, 300, 8)[0], [1, 0]);
});

test("oddsPct — vaststaande uitkomst toont exact 100% / 0% (ook voor een Overig-plak van zekere nullen)", () => {
  const mk = (probs, sures) => probs.map((p, i) => ({ id: "p" + i, idx: i, name: "S" + i, flair: "", title: "", me: i === 0, prob: p, probs: [p, 0, 0], sures: [sures[i], false, false] }));
  const v = T.oddsView(mk([1, 0, 0, 0], [true, true, true, true]));
  assert.equal(T.oddsPct(v, "p0"), "100%");
  assert.ok(v.other && v.other.sure);
  assert.equal(T.oddsPct(v, "other"), "0%");
  const duel = T.oddsView(mk([1, 0], [true, true]));
  assert.equal(T.oddsPct(duel, "p1"), "0%");
  // zonder zekerheid blijft de schatting een schatting
  const est = T.oddsView(mk([0.9998, 0.0002], [false, false]));
  assert.equal(T.oddsPct(est, "p0"), ">99%");
  assert.equal(T.oddsPct(est, "p1"), "<1%");
});

test("oddsBuild — wie weekpunten heeft maar niet in het forecast-universum zit, doet toch mee", () => {
  const fc = { day_mean: 80, day_sd: 6, hour_share: new Array(24).fill(1 / 24), players: [
    { display_name: "A", flair: "", title: null, is_me: true, q: 0.9, lost_p: 0, mu: 0, sd: 10 },
    { display_name: "B", flair: "", title: null, is_me: false, q: 0.9, lost_p: 0, mu: 0, sd: 10 }] };
  const week = [{ rank: 1, display_name: "Spook", week_score: 700, played: 6, daily_wins: 0, flair: "👻" }, { rank: 2, display_name: "A", week_score: 500, played: 6, daily_wins: 2 }, { rank: 3, display_name: "B", week_score: 300, played: 6, daily_wins: 1 }];
  const items = T.oddsBuild(fc, [], week, { poolId: "p", weekStart: "2026-09-28", todayKey: "2026-10-04", secsSinceMidnight: 10 * 3600 });
  assert.equal(items.length, 3);
  const g = items.find((x) => x.name === "Spook");
  assert.ok(g && g.flair === "👻");
  assert.equal(g.sures[0], true);     // 200 voor op de laatste dag: niemand haalt hem meer in (ook niet met een inhaalpot: A/B misten niets)
  assert.equal(g.probs[0], 1);
});

test("forecastPlaces — elke plek telt op tot 1, 1e plek = forecastWins, beslist is beslist", () => {
  const inp = mkSim({ players: [pl({ base: 300 }), pl({ base: 280 }), pl({ base: 250, q: 0.7 }), pl({ base: 200, q: 0.5 })], futureKeys: ["2026-10-07", "2026-10-08", "2026-10-09"] });
  const pp = T.forecastPlaces(inp, 2000, 42);
  assert.equal(pp.length, 3);
  for (const place of pp) assert.ok(Math.abs(place.reduce((a, b) => a + b, 0) - 1) < 1e-9);
  assert.deepEqual(pp[0], T.forecastWins(inp, 2000, 42));                     // zelfde simulatie, zelfde getallen voor de winnaar
  // geen dagen meer: de eindstand staat vast → 1e/2e/3e zijn exact bekend
  const fin = T.forecastPlaces(mkSim({ players: [pl({ base: 400 }), pl({ base: 300 }), pl({ base: 200 }), pl({ base: 100 })] }), 300, 5);
  assert.deepEqual(fin[0], [1, 0, 0, 0]);
  assert.deepEqual(fin[1], [0, 1, 0, 0]);
  assert.deepEqual(fin[2], [0, 0, 1, 0]);
  // een gedeelde stand: twee spelers wisselen 1e en 2e af (≈ 50/50), de derde blijft derde
  const sw = T.forecastPlaces(mkSim({ players: [pl({ base: 300 }), pl({ base: 300 }), pl({ base: 100 }), pl({ base: 50 })] }), 4000, 8);
  assert.ok(Math.abs(sw[0][0] - 0.5) < 0.05 && Math.abs(sw[1][0] - 0.5) < 0.05, `sw=${sw[0][0]},${sw[1][0]}`);
  assert.equal(sw[2][2], 1);
});

test("oddsView(items, plek) — per plek een eigen verdeling; schakelaar pas vanaf 4 spelers", () => {
  assert.equal(T.ODDS_PLACES_MIN, 4);
  const mk = (n, i) => ({ id: "p" + i, idx: i, name: "S" + i, flair: "", title: "", me: i === 0, prob: 0, probs: [] });
  const items = [0, 1, 2, 3].map((i) => mk(4, i));
  const P1 = [0.7, 0.2, 0.1, 0], P2 = [0.2, 0.5, 0.2, 0.1], P3 = [0.05, 0.2, 0.4, 0.35];
  items.forEach((x, i) => { x.prob = P1[i]; x.probs = [P1[i], P2[i], P3[i]]; });
  const v1 = T.oddsView(items, 0), v2 = T.oddsView(items, 1), v3 = T.oddsView(items, 2);
  assert.equal(v1.places, true);
  assert.deepEqual(v2.items.map((x) => x.id), ["p1", "p0", "p2", "p3"]);   // 2e plek: p1 het vaakst
  assert.deepEqual(v3.items.map((x) => x.id), ["p2", "p3", "p1", "p0"]);   // 3e plek: p2 het vaakst
  for (const v of [v1, v2, v3]) assert.equal(v.items.reduce((a, x) => a + v.pc[x.id], 0) + (v.other ? v.pc.other : 0), 100);
  assert.equal(v2.place, 1);
  assert.equal(T.oddsView(items.slice(0, 3), 0).places, false);          // 3 spelers: geen schakelaar
});

test("oddsBuild — levert probs [1e, 2e, 3e] die per plek optellen tot 1", () => {
  const names = ["Anna", "Joris", "Piet", "Lisa", "Mo", "Sanne"];
  const fc = { day_mean: 76, day_sd: 6, hour_share: new Array(24).fill(1 / 24),
    players: names.map((n, i) => ({ display_name: n, flair: "", title: null, is_me: i === 3, q: 0.9 - i * 0.05, lost_p: 0.05, mu: 6 - i * 2, sd: 11 })) };
  const week = [["Anna", 300], ["Joris", 290], ["Piet", 250], ["Lisa", 240], ["Mo", 200]].map(([n, w], i) => ({ rank: i + 1, display_name: n, week_score: w, daily_wins: 0, played: 4, is_me: n === "Lisa" }));
  const items = T.oddsBuild(fc, [], week, { poolId: "p1", weekStart: "2026-09-28", todayKey: "2026-10-01", secsSinceMidnight: 14 * 3600 });
  for (let k = 0; k < 3; k++) assert.ok(Math.abs(items.reduce((a, x) => a + x.probs[k], 0) - 1) < 1e-9, `plek ${k + 1}`);
  assert.ok(items.every((x) => x.prob === x.probs[0]));
  // wie een grote kans op de winst heeft, heeft zelden de 3e plek
  const anna = items.find((x) => x.name === "Anna");
  assert.ok(anna.probs[0] > anna.probs[2]);
});

test("recapArrowKey — ←/→ sturen de recap-tabs zodra het eindscherm gemount en zichtbaar is", () => {
  const calls = [];
  const mk = (top, bottom, connected = true) => ({
    track: { isConnected: connected, getBoundingClientRect: () => ({ top, bottom, height: bottom - top }) },
    go: (d) => calls.push(d),
  });
  T.setRecapArrow(null);
  assert.equal(T.recapArrowKey(1, false), false, "niet gemount → niets af te handelen");
  T.setRecapArrow(mk(300, 700));
  assert.equal(T.recapArrowKey(1, false), true);
  assert.equal(T.recapArrowKey(-1, false), true);
  assert.deepEqual(calls, [1, -1], "richting wordt doorgegeven");
  assert.equal(T.recapArrowKey(1, true), true, "een vastgehouden toets wordt opgeslokt…");
  assert.deepEqual(calls, [1, -1], "…maar schuift niet nog een tab op");
  T.setRecapArrow(mk(900, 1300));   // onder de vouw van het eindscherm (modal scrolt): toch direct bruikbaar
  assert.equal(T.recapArrowKey(1, false), true);
  T.setRecapArrow(mk(300, 700, false));   // niet meer in de DOM (recap herbouwd/weg)
  assert.equal(T.recapArrowKey(1, false), false);
  T.setRecapArrow(mk(0, 0));              // verborgen (modal dicht): hoogte 0
  assert.equal(T.recapArrowKey(1, false), false);
  T.setRecapArrow(null);
});

test("grind-ladders — 6 treden (obsidiaan = de oude diamant), brons/zilver bevroren, flairs aan hun getal", () => {
  const S = (k) => T.ACHV_SERIES.find((x) => x.key === k);
  // brons/zilver zijn bewust nooit gewijzigd (retro tier-bump); de top is de oude diamant-waarde
  const want = {
    games:   [10, 100, 250, 750, 2000, 5000],
    dailies: [7, 30, 60, 120, 200, 365],
    streak:  [7, 30, 60, 90, 180, 365],
    perfect: [1, 10, 25, 50, 100, 250],
    pure:    [5, 25, 50, 100, 250, 500],
  };
  for (const [k, steps] of Object.entries(want)) assert.deepEqual(S(k).steps, steps, k);
  assert.equal(T.CAPSTONE_MAX, 6);
  assert.equal(T.ACHV_TIER_KEYS.length, 6);
  assert.equal(T.ACHV_TIER_KEYS[5], "obsidian");
  // rating/jaren houden 5 treden (talent-/albumplafond)
  assert.equal(S("rating").steps.length, 5);
  assert.equal(S("years").steps.length, 5);
  // De server-gate (db/41: ⏳ ≥90, 💯 ≥50) en het bier (2000) hangen aan een GETAL: de pin staat op de
  // trede waar dat getal valt. Verschuift een trede, dan klopt dit niet meer met set_my_flair.
  assert.equal(S("streak").steps[S("streak").flairs[0].at], 90);
  assert.equal(S("perfect").steps[S("perfect").flairs[0].at], 50);
  assert.equal(S("games").steps[T.BEER_FX.at], 2000);
});

test("capstoneTier — laagste trede over de 5 ladders, max 6", () => {
  const a = (games, dailies, streak, perfect, pure) => ({ games, dailies, streak, perfect, pure, years: [], rating: null });
  assert.equal(T.capstoneTier(null), 0);
  assert.equal(T.capstoneTier(a(0, 0, 0, 0, 0)), 0);
  assert.equal(T.capstoneTier(a(33, 26, 5, 3, 5)), 0);          // streak 5 < 7 houdt brons tegen
  assert.equal(T.capstoneTier(a(1133, 119, 89, 80, 218)), 3);   // goud (dailies/streak: 60 / 60)
  assert.equal(T.capstoneTier(a(4261, 121, 98, 297, 807)), 4);  // platina: dailies 120 + streak 90 halen platina, de rest ver erboven
  assert.equal(T.capstoneTier(a(5000, 365, 365, 250, 500)), 6); // alles op de top = obsidiaan
  assert.equal(T.capstoneTier(a(5000, 364, 365, 250, 500)), 5); // één dag te weinig = diamant
});

test("achvTickPos — tick-posities per aantal treden (5 = 10/30/50/70/90, 6 = gelijke vakken)", () => {
  const five = [0, 1, 2, 3, 4].map((i) => T.achvTickPos(i, 5));
  assert.deepEqual(five, [10, 30, 50, 70, 90]);
  const six = [0, 1, 2, 3, 4, 5].map((i) => T.achvTickPos(i, 6));
  assert.ok(Math.abs(six[0] - 100 / 12) < 1e-9 && Math.abs(six[5] - 1100 / 12) < 1e-9);
  assert.ok(six.every((p, i) => i === 0 || p > six[i - 1]) && six[5] < 100);
});

test("achvRailPct — loopt monotoon op en bereikt 100 pas op de hoogste trede (5 én 6 treden)", () => {
  for (const s of T.ACHV_SERIES.filter((x) => x.key !== "rating" && x.key !== "years")) {
    let prev = -1;
    for (const n of [0, ...s.steps, s.steps[s.steps.length - 1] * 2]) {
      const pct = T.achvRailPct(n, s);
      assert.ok(pct >= prev, `${s.key} @${n}`);
      prev = pct;
    }
    assert.equal(T.achvRailPct(s.steps[s.steps.length - 1], s), 100, s.key);
    assert.ok(T.achvRailPct(s.steps[s.steps.length - 2], s) < 100, s.key);
  }
  // rating start op 1500 (floor): 5 treden, ongewijzigd gedrag
  const rating = T.ACHV_SERIES.find((x) => x.key === "rating");
  assert.equal(T.achvRailPct(1850, rating), 100);
  assert.ok(T.achvRailPct(1500, rating) === 0);
});

test("achvTierName — obsidiaan is de 6e trede in elke taal", () => {
  for (const l of ["nl", "en", "de", "es", "pt"]) {
    T.setLang(l);
    assert.equal(T.achvTierName(5), T.I18N[l].achv_tiers.obsidian, l);
  }
  T.setLang("nl");
});
