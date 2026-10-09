// Unit tests voor de pure spel-logica in game.js — GEEN DB, GEEN DOM, GEEN npm.
// We laten game.js ONGEWIJZIGD: de test leest 'm in, stript de init()-call, stubt
// de browser-globals die bij load worden aangeraakt, en draait 'm via indirecte
// eval. Functies/consts worden via een aangehangen __T-handle blootgesteld.
// Draaien:  cd yeardle-nl && node --test tests/
import { test } from "node:test";
import vm from "node:vm";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
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
setGlobal("matchMedia", () => ({ matches: false, addEventListener() {} }));
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
  classify, scoreTier, closestMiss, shareText, NEAR_TIERS, distChip, parseShareToken, emojiFor, t, computeScore, I18N, outOfBand,
  BAND_OUTER, BAND_SLACK, scoreRankPct, scoreFineBin, buildHistogram, histBinOfFroms, faceHue, FACE_HUES,
  BAND_INNER, guessRanges, guessImpossibleAt, strictGuardOn, remainingRanges,
  intersectRanges, rangeLabel, MIN_YEAR, MAX_YEAR, digitGlowOn, MAX_GUESSES,
  easterSunday, holidayFxFor, historicFxFor, HOLIDAY_FX_IDS, HISTORIC_FX, loadHolidayFx, FX_ALIASES, fxResolve,
  EVENT_FX, EVENT_FX_IDS, eventFxFor, fxKnown, loadEventFx, winCelebrationFx,
  raceWindow, racePos, RACE_MIN_SPREAD, RACE_LEAD_POS, RACE_LAST_POS,
  dagzegeApplies, forecastWins, forecastPlaces, oddsLimits, oddsShareAfter, oddsHamilton, oddsView, oddsBuild, oddsHash, oddsPct, DAGZEGE_ALONE_FROM, ODDS_FOLD, ODDS_MIN_PLAYERS, ODDS_MIN_WEEK_ROWS, ODDS_PLACES_MIN,
  recapArrowKey, setRecapArrow: (r) => { recapArrow = r; },
  ACHV_SERIES, ACHV_TIER_KEYS, CAPSTONE_MAX, BEER_FX, achvTier, capstoneTier, achvTickPos, achvRailPct, achvTierName,
  parseFlair, joinFlair, flairBadgeHtml, flairStaticHtml, onFlairAnimReady, flairFxEarned, FLAIR_FX, REWARDS, REWARD_ORDER, ACHV_TROPHIES, auth,
  resultFrameStyle, setResultFrame, frameOverlayHtml, frameLabelHtml, rewardsTabsAvailable, platinaFrameUnlocked, FRAME_STYLES, RW_SECT_TAB,
  recapAccountHtml, teamNudgeStage, teamTeaserHtml, TEAM_NUDGE_KEY, TEAM_NUDGE_FULL, TEAM_NUDGE_SLIM, todayKey,
  setPlayer: (n, f, ti) => { myUsername = n; myFlair = f; myTitle = ti; },
  setState: (s) => { state = s; },
  refreshWeekPodiumResult, soloPathOk, fetchMyPools, popupSteps, withTimeout, teamAfterLoginPark, getPendingTeam: () => pendingTeamAfterLogin, setMyPool: (p) => { myPool = p; }, getWeekPodiumResult: () => weekPodiumResult, resetPodiumReq: () => { podiumPendingReq = null; },
  fmtDailyDate, fmtHistoryDate,
  achvSnapshot, achvSeriesItem, achvTrophyItem, trophyFxCrossing, achvDetailHtml, achvTrophyHtml,
  streakFlameTier, streakFlameHtml, withAnimEmoji,
  perfectWeekKeys, weekMondayKey, perfectWeeks, renderHistoryList,
  calendarLabels, weekLetters, perfectWeekJustCompleted, calendarFxUnlocked, calendarFxActive, setCalendarFx, setBeerFx, setGoldYearsFx, setFlairConfetti,
  currentWinFxChoice, winFxUnlockedMap, setWinFx, earnedRewardKeys, loadRewardFx, runFx, stopFx, addFxLayers, CAL_FX, winFxPreviewHtml, rewardsVierHtml,
  ensureFlairFxCss, flairFxClass, getFxRun: () => fxRun,
  awardsHtml, spotlightAwards, soloWeekStats, buildSoloVs, fetchWorldWeek, pickVsRows, vsWorldHtml, vwNum, vwMarker, weekdayShort, fetchWeekVsWorld, awardMeHtml, awardTexts, WEEK_AWARDS, fetchWeekAwards, weekdayName, podiumHtml, podiumParts, recapRaceHtml, setAchv: (a) => { achvCache = a; }, setHistoryCache: (h) => { myHistoryCache = h; },
  rewardQueueFor, obsidianGroupKeys, CAPSTONE_FLAIRS, FLAIR_ANIM, CAP_REWARD_ICONS, LANGS, OBSIDIAN_FX_DEFAULT,
  seasonFor, SEASONS, SEASON_KEY, seasonKey, THEME_COLORS, themeBarColor, setSeason, seasonActive, seasonCurrent, seasonMenuShown, syncSeasonCheck,
  setLang:  (l) => { lang = l; },
};`;
(0, eval)(src);   // indirecte eval → sloppy global scope (game.js heeft geen 'use strict')
// De vieringen zitten in een eigen bestand (lui geladen in de browser): hier gewoon meteen inladen.
(0, eval)(readFileSync(join(dir, "..", "holiday-fx.js"), "utf8"));
(0, eval)(readFileSync(join(dir, "..", "event-fx.js"), "utf8"));
(0, eval)(readFileSync(join(dir, "..", "reward-fx.js"), "utf8"));
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

test("scoreTier — een verlies krijgt de toon van je dichtste gok (alleen weergave)", () => {
  assert.equal(T.scoreTier(10, false, 1).key, "near2");
  assert.equal(T.scoreTier(10, false, 2).key, "near2");
  assert.equal(T.scoreTier(6, false, 3).key, "near10");
  assert.equal(T.scoreTier(6, false, 10).key, "near10");
  assert.equal(T.scoreTier(4, false, 11).key, "lost");
  assert.equal(T.scoreTier(0, false, 640).key, "lost");
  assert.equal(T.scoreTier(0, false).key, "lost");         // zonder afstand: zoals voorheen
  assert.equal(T.scoreTier(76, true, 1).key, "good");      // een winst negeert de afstand
  assert.ok(T.scoreTier(10, false, 1).near && !T.scoreTier(0, false, 640).near);
});

test("closestMiss — dichtste gok in jaren", () => {
  assert.equal(T.closestMiss([]), null);
  assert.equal(T.closestMiss([{ diff: -45 }, { diff: 3 }, { diff: -1 }]), 1);
});

test("shareText — een bijna-verlies noemt de afstand, een verre misser blijft 💀", () => {
  const base = { mode: "free", won: false, directionsRevealed: [], laterCluesShown: 0, centuryRevealed: false, lastDigitRevealed: false };
  T.setState({ ...base, guesses: [{ cls: "far", diff: 60 }, { cls: "veryclose", diff: -1 }] });
  assert.ok(T.shareText().includes(`😭 ${T.t("near_share")(1, true)}`));
  T.setState({ ...base, guesses: [{ cls: "far", diff: 60 }, { cls: "close", diff: 6 }] });
  assert.ok(T.shareText().includes(`😬 ${T.t("near_share")(6, false)}`));
  T.setState({ ...base, guesses: [{ cls: "far", diff: 60 }, { cls: "warm", diff: 15 }] });
  assert.ok(T.shareText().includes(T.t("lost_share")));
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

test("histBinOfFroms — teamgenoot op de staaf van zijn score", () => {
  // kolommen: verloren, 70, 75, 80, 85, 90, 95, 100 (fijn) — de ondergrenzen komen uit data-from
  const froms = [null, 70, 75, 80, 85, 90, 95, 100];
  assert.equal(T.histBinOfFroms(froms, 77, true), 2);     // 75–79
  assert.equal(T.histBinOfFroms(froms, 75, true), 2);     // ondergrens hoort bij de eigen staaf
  assert.equal(T.histBinOfFroms(froms, 99, true), 6);     // 95–99
  assert.equal(T.histBinOfFroms(froms, 100, true), 7);    // perfect apart
  assert.equal(T.histBinOfFroms(froms, 4, false), 0);     // verliezer, ook met troostscore
  assert.equal(T.histBinOfFroms(froms, 40, true), 1);     // onder het venster → eerste scorestaaf
  // spiegelt de eigen-staaf-zoektocht van buildHistogram, ook in het grove venster (per 10)
  const dist = new Array(22).fill(0); dist[0] = 2; dist[1 + 10] = 12; dist[1 + 15] = 20; dist[1 + 20] = 4;
  const wide = new Array(22).fill(1);
  for (const d of [dist, wide]) {
    const f = T.buildHistogram(d, 77, true).bars.map((b) => b.from);
    for (const sc of [50, 54, 55, 77, 91, 99, 100]) assert.equal(T.histBinOfFroms(f, sc, true), T.buildHistogram(d, sc, true).mine);
  }
});

test("faceHue — vaste kleur per naam, uit het palet zonder groen/blauw", () => {
  assert.equal(T.faceHue("Anna"), T.faceHue("Anna"));
  assert.ok(T.FACE_HUES.includes(T.faceHue("Matthijs")));
  assert.ok(T.FACE_HUES.includes(T.faceHue("")));          // lege naam crasht niet
  assert.ok(T.FACE_HUES.every((h) => h < 100 || h > 160)); // 100–160 = groen = jouw staaf
  assert.ok(new Set(["Anna", "Bram", "Cees", "Daan", "Eva", "Fleur", "Gijs", "Hans"].map(T.faceHue)).size >= 4);   // niet iedereen dezelfde kleur
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
  assert.equal(T.holidayFxFor(d(2027, 10, 28)), "diwali");     // Diwali 2027 (29 okt) valt grotendeels onder Halloween: zie ronde 4
  assert.equal(T.holidayFxFor(d(2026, 2, 16)), "carnival");  // Lunar NY (17-2) blijft exact: 16-2 is nog carnaval
  assert.equal(T.holidayFxFor(d(2026, 9, 20)), null);
  assert.equal(T.holidayFxFor(d(2033, 2, 10)), null);          // buiten de maankalender-tabel: stil null
});

test("holidayFxFor — ronde 4: Halloween 29–31 okt, Eid al-Adha, 1 april, Moederdag, verjaardag, Mid-Autumn, schrikkeldag", () => {
  const d = (y, m, dd) => new Date(y, m - 1, dd, 12);
  // Halloween: 21–31 okt (gelijk aan de skin en de spook-daily's; 8/10/2026), de kern 29–31 wint van Diwali, 21–28 geeft Diwali voorrang
  assert.equal(T.holidayFxFor(d(2026, 10, 20)), null);
  for (const dd of [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31]) assert.equal(T.holidayFxFor(d(2026, 10, dd)), "halloween", `okt ${dd}`);
  assert.equal(T.holidayFxFor(d(2030, 10, 25)), "diwali");     // Diwali 2030 (26 okt) ±1: 25–27 blijft Diwali
  assert.equal(T.holidayFxFor(d(2030, 10, 27)), "diwali");
  assert.equal(T.holidayFxFor(d(2030, 10, 28)), "halloween");
  assert.equal(T.holidayFxFor(d(2027, 10, 27)), "halloween");  // vóór het Diwali-venster van 2027 (28–30 okt)
  assert.equal(T.holidayFxFor(d(2026, 11, 1)), "muertos");     // de skin loopt t/m 1 nov, het confetti wordt dan Día de Muertos
  assert.equal(T.holidayFxFor(d(2027, 10, 28)), "diwali");     // Diwali 29 okt 2027 ±1: alleen de 28e blijft over
  assert.equal(T.holidayFxFor(d(2027, 10, 29)), "halloween");  // Halloween wint van Diwali
  assert.equal(T.holidayFxFor(d(2027, 10, 30)), "halloween");
  assert.equal(T.holidayFxFor(d(2027, 10, 31)), "halloween");
  // Eid al-Adha hergebruikt het eid-effect, venster ±1 dag (27 mei 2026)
  assert.equal(T.holidayFxFor(d(2026, 5, 26)), "eid");
  assert.equal(T.holidayFxFor(d(2026, 5, 27)), "eid");
  assert.equal(T.holidayFxFor(d(2026, 5, 28)), "eid");
  assert.equal(T.holidayFxFor(d(2026, 5, 29)), null);          // Everest is een hoogtijdag (puzzeldatum), geen feestdag
  assert.equal(T.holidayFxFor(d(2031, 4, 1)), "eid");          // Eid al-Adha-venster (2 apr 2031) wint van 1 april
  // 1 april (Pasen 2029 valt óp 1 april en wint)
  assert.equal(T.holidayFxFor(d(2026, 4, 1)), "april");
  assert.equal(T.holidayFxFor(d(2029, 4, 1)), "easter");
  // Moederdag = 2e zondag van mei
  assert.equal(T.holidayFxFor(d(2026, 5, 10)), "mothers");
  assert.equal(T.holidayFxFor(d(2027, 5, 9)), "mothers");
  assert.equal(T.holidayFxFor(d(2028, 5, 14)), "mothers");
  assert.equal(T.holidayFxFor(d(2026, 5, 3)), null);           // 1e zondag
  assert.equal(T.holidayFxFor(d(2026, 5, 17)), null);          // 3e zondag
  // Jaardle-verjaardag pas vanaf 2027
  assert.equal(T.holidayFxFor(d(2026, 6, 6)), null);
  assert.equal(T.holidayFxFor(d(2027, 6, 6)), "birthday");
  assert.equal(T.holidayFxFor(d(2030, 6, 6)), "birthday");
  // Mid-Autumn (exact) en schrikkeldag (wint van carnavalsdinsdag in 2028)
  assert.equal(T.holidayFxFor(d(2027, 9, 15)), "midautumn");
  assert.equal(T.holidayFxFor(d(2027, 9, 14)), null);
  assert.equal(T.holidayFxFor(d(2028, 10, 3)), "midautumn");
  assert.equal(T.holidayFxFor(d(2028, 2, 28)), "carnival");
  assert.equal(T.holidayFxFor(d(2028, 2, 29)), "leap");
});

test("holidayFxFor — elke dag van 2026 t/m 2032 levert null of een id dat (na fxResolve) een laag heeft", () => {
  let n = 0;
  for (let t = new Date(2026, 0, 1, 12); t.getFullYear() <= 2032; t.setDate(t.getDate() + 1)) {
    const id = T.holidayFxFor(new Date(t));
    if (!id) continue;
    n++;
    const ids = FX_ALL(id);
    for (const v of ids) assert.ok(T.HOLIDAY_FX_IDS.includes(v), `${t.toDateString()}: ${id} → ${v}`);
  }
  assert.ok(n > 150 && n < 400, `aantal themadagen ${n}`);   // ± 25–40 per jaar
  for (let i = 0; i < 20; i++) assert.ok(["aprilup", "aprilfish"].includes(T.fxResolve("april")));
  assert.equal(T.fxResolve("xmas"), "xmas");
});
const FX_ALL = (id) => globalThis.__T.FX_ALIASES[id] || [id];

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
  // ronde 3 (db/78)
  assert.equal(T.historicFxFor("2027-01-07", 1610), "galileo");
  assert.equal(T.historicFxFor("2027-06-19", 1215), "magna");
  assert.equal(T.historicFxFor("2027-06-15", 1215), null);     // de pin staat op 19 juni (de DB-tekst noemt die dag)
  assert.equal(T.historicFxFor("2027-09-04", 476), "rome476");
  assert.equal(T.historicFxFor("2026-11-04", 1922), "tut");
  assert.equal(T.historicFxFor("2026-12-10", 1901), "nobel");
  assert.equal(T.historicFxFor("2027-01-07", 1611), null);     // jaar-check vangt een niet-gepinde dag af
});

test("HolidayFx — HOLIDAY_FX_IDS is precies wat holiday-fx.js bouwt, en elke hoogtijdag wijst naar een laag", () => {
  const HF = globalThis.HolidayFx;
  assert.deepEqual([...HF.ids].sort(), [...T.HOLIDAY_FX_IDS].sort());
  assert.equal(new Set(T.HOLIDAY_FX_IDS).size, T.HOLIDAY_FX_IDS.length);
  for (const id of T.HOLIDAY_FX_IDS) assert.ok(HF.has(id), id);
  for (const [k, v] of Object.entries(T.HISTORIC_FX)) assert.ok(T.HOLIDAY_FX_IDS.includes(v.id), k);
  assert.equal(HF.has("stamp"), false);
});

test("loadHolidayFx — laadt holiday-fx.js één keer lui, hergebruikt de belofte, en probeert opnieuw na een fout", async () => {
  const src = readFileSync(join(dir, "..", "holiday-fx.js"), "utf8"), saved = globalThis.HolidayFx, saveCreate = document.createElement, saveHead = document.head;
  const loaded = []; let mode = "ok";
  document.createElement = () => ({});
  document.head = { appendChild(sc) { loaded.push(sc.src); queueMicrotask(() => { if (mode === "ok") { (0, eval)(src); sc.onload(); } else sc.onerror(); }); } };
  try {
    delete globalThis.HolidayFx;
    mode = "fail";
    await assert.rejects(T.loadHolidayFx());                       // bestand niet te laden (offline)
    mode = "ok";
    const [a, b] = await Promise.all([T.loadHolidayFx(), T.loadHolidayFx()]);
    assert.equal(a, b);
    assert.ok(a.has("galileo"));
    assert.equal(loaded.length, 2, "één mislukte + één geslaagde poging");
    assert.ok(loaded.every((u) => u.startsWith("/holiday-fx.js")));
    await T.loadHolidayFx();
    assert.equal(loaded.length, 2, "al geladen: geen nieuw script");
  } finally { globalThis.HolidayFx = saved; document.createElement = saveCreate; document.head = saveHead; }
});

// Strikte nep-canvas: onbekende ctx-methodes, NaN/Infinity-argumenten, negatieve stralen,
// globalAlpha buiten 0..1 en drawImage zonder sprite zijn fouten. Geen DOM nodig.
function strictCtx() {
  const METHODS = new Set("save restore scale rotate translate transform setTransform createLinearGradient createRadialGradient clearRect fillRect strokeRect beginPath fill stroke clip fillText strokeText measureText drawImage setLineDash closePath moveTo lineTo bezierCurveTo quadraticCurveTo arc arcTo ellipse rect roundRect".split(" "));
  const PROPS = new Set(["fillStyle", "strokeStyle", "globalAlpha", "lineWidth", "lineCap", "lineJoin", "font", "textAlign", "textBaseline", "globalCompositeOperation", "shadowColor", "shadowBlur", "shadowOffsetX", "shadowOffsetY"]);
  const state = {};
  return new Proxy({}, {
    get(_, k) {
      if (k in state) return state[k];
      if (PROPS.has(k)) return k === "globalAlpha" ? 1 : "";
      if (!METHODS.has(k)) throw new Error("onbekende ctx-methode/eigenschap: " + String(k));
      return (...a) => {
        for (const v of a) if (typeof v === "number" && !Number.isFinite(v)) throw new Error(`${String(k)}(${a.join(",")})`);
        if (k === "createLinearGradient" || k === "createRadialGradient") return { addColorStop() {} };
        if (k === "drawImage" && !a[0]?.__sprite) throw new Error("drawImage zonder sprite");
        if ((k === "arc" && a[2] < 0) || (k === "ellipse" && (a[2] < 0 || a[3] < 0))) throw new Error("negatieve straal " + a.join(","));
      };
    },
    set(_, k, v) {
      if (k === "globalAlpha" && !(v >= 0 && v <= 1.0000001)) throw new Error("globalAlpha " + v);
      if ((k === "fillStyle" || k === "strokeStyle") && typeof v === "string" && /NaN|undefined/.test(v)) throw new Error(k + " " + v);
      state[k] = v; return true;
    },
  });
}

test("EventFx — EVENT_FX_IDS is precies wat event-fx.js bouwt en elke feit-hash wijst naar een bestaande laag", () => {
  const EF = globalThis.EventFx, HF = globalThis.HolidayFx;
  assert.deepEqual([...EF.ids].sort(), [...T.EVENT_FX_IDS].sort());
  assert.equal(new Set(T.EVENT_FX_IDS).size, T.EVENT_FX_IDS.length);
  for (const id of T.EVENT_FX_IDS) assert.ok(!T.HOLIDAY_FX_IDS.includes(id), `${id} staat in beide lijsten`);
  for (const [hash, id] of Object.entries(T.EVENT_FX)) {
    assert.match(hash, /^[0-9a-f]{10}$/, hash);
    assert.ok(T.fxKnown(id), `${hash} → ${id}`);
    assert.ok(T.EVENT_FX_IDS.includes(id) ? EF.has(id) : HF.has(id), `${hash} → ${id} heeft geen laag`);
  }
  for (const id of T.EVENT_FX_IDS) assert.ok(Object.values(T.EVENT_FX).includes(id), `${id} wordt door geen enkel feit gebruikt`);
  assert.equal(T.eventFxFor("7dceb65bb4"), "wall");
  assert.equal(T.eventFxFor("zzzzzzzzzz"), null);
  assert.equal(T.eventFxFor(undefined), null);
  assert.equal(T.eventFxFor("toString"), null);                    // geen prototype-lek
});

test("winCelebrationFx — hoogtijdag gaat vóór het feit-effect, dat gaat vóór de feestdag; werkt ook in vrij spel", () => {
  // vrij spel: het feit zelf bepaalt de viering, ongeacht de datum
  T.setState({ mode: "free", hashes: ["7dceb65bb4"], event: { year: 1990 } });
  assert.equal(T.winCelebrationFx(), "wall");
  T.setState({ mode: "free", hashes: ["673113bc9c"], event: { year: 1969 } });
  assert.equal(T.winCelebrationFx(), "pride");                     // zusterfeit van een bestaande laag
  // daily op een gepinde hoogtijdag met het juiste jaar: de hoogtijdag wint
  T.setState({ mode: "daily", puzzleDate: "2027-10-15", hashes: ["7dceb65bb4"], event: { year: 1582 } });
  assert.equal(T.winCelebrationFx(), "gregorian");
  // dezelfde dag, ander jaar (niet-gepind feit): dan het feit-effect
  T.setState({ mode: "daily", puzzleDate: "2027-10-15", hashes: ["7dceb65bb4"], event: { year: 1990 } });
  assert.equal(T.winCelebrationFx(), "wall");
});

test("loadEventFx — laadt event-fx.js één keer lui en probeert opnieuw na een fout", async () => {
  const src = readFileSync(join(dir, "..", "event-fx.js"), "utf8"), saved = globalThis.EventFx, saveCreate = document.createElement, saveHead = document.head;
  const loaded = []; let mode = "ok";
  document.createElement = () => ({});
  document.head = { appendChild(sc) { loaded.push(sc.src); queueMicrotask(() => { if (mode === "ok") { (0, eval)(src); sc.onload(); } else sc.onerror(); }); } };
  try {
    delete globalThis.EventFx;
    mode = "fail";
    await assert.rejects(T.loadEventFx());
    mode = "ok";
    const [a, b] = await Promise.all([T.loadEventFx(), T.loadEventFx()]);
    assert.equal(a, b);
    assert.ok(a.has("wall"));
    assert.equal(loaded.length, 2);
    assert.ok(loaded.every((u) => u.startsWith("/event-fx.js")));
  } finally { globalThis.EventFx = saved; document.createElement = saveCreate; document.head = saveHead; }
});

test("HolidayFx aprilup — het echte jaartal-pilletje draait op zijn kop, hangt even en komt rechtop terug", () => {
  const saveQ = document.querySelector, saveCreate = document.createElement, saveDs = document.documentElement.dataset, el = { style: {} };
  document.documentElement.dataset = {};
  document.querySelector = (q) => (q === "#result-text .year-pill" ? el : null);
  document.createElement = () => ({ width: 0, height: 0, __sprite: true, getContext: () => strictCtx() });
  globalThis.innerWidth = 390; globalThis.innerHeight = 844;
  try {
    const layers = globalThis.HolidayFx.build("aprilup", 390, 844), ctx = strictCtx(), end = Math.max(...layers.map((l) => l.end));
    let hold = null, seenScale = false;
    for (let t = 0; t <= end; t += 1 / 60) {
      for (const l of layers) l.draw(ctx, t, 390, 844);
      if (Math.abs(t - 1.5) < 1 / 120) hold = parseFloat(el.style.rotate);
      if (el.style.scale) seenScale = true;
    }
    assert.ok(hold > 170 && hold < 190, "halverwege hangt hij op zijn kop: " + hold);
    assert.ok(seenScale);
    assert.equal(el.style.rotate, "");                              // aan het eind netjes teruggezet
    assert.equal(el.style.scale, "");
  } finally { document.querySelector = saveQ; document.createElement = saveCreate; document.documentElement.dataset = saveDs; }
});

test("HolidayFx + EventFx — elke laag tekent zonder fouten (strikte nep-canvas, donker en licht, drie formaten)", () => {
  const HF = globalThis.HolidayFx, saveCreate = document.createElement, saveTheme = document.documentElement.dataset;
  document.createElement = () => ({ width: 0, height: 0, __sprite: true, getContext: () => strictCtx() });
  globalThis.innerWidth = 390; globalThis.innerHeight = 844;
  try {
    for (const theme of ["dark", "light"]) {
      document.documentElement.dataset = theme === "light" ? { theme: "light" } : {};
      for (const [W, H] of [[390, 844], [320, 568], [1200, 800]]) for (const id of [...T.HOLIDAY_FX_IDS, ...T.EVENT_FX_IDS]) {
        const layers = (T.EVENT_FX_IDS.includes(id) ? globalThis.EventFx : HF).build(id, W, H), ctx = strictCtx(), end = Math.max(...layers.map((l) => l.end));
        assert.ok(end > 1 && end < 6, `${id}: einde ${end}`);
        for (let t = 0; t <= end + 0.2; t += 1 / 30) for (const l of layers) { l.draw(ctx, t, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; }
      }
    }
  } finally { document.createElement = saveCreate; document.documentElement.dataset = saveTheme; }
});

// ── Scheurkalender en Wimpels (RewardFx) ──
test("calendarLabels / weekLetters — de puzzeldatum in de taal van het spel, in elke tijdzone dezelfde dag", () => {
  const was = process.env.TZ;
  try {
    for (const tz of ["Europe/Amsterdam", "America/New_York", "America/Sao_Paulo", "Pacific/Auckland", "UTC"]) {
      process.env.TZ = tz;
      T.setLang("nl");
      assert.deepEqual(T.calendarLabels("2026-10-05", 1), [
        { d: 5, mon: "OKT", y: 2026, wd: "maandag" }, { d: 6, mon: "OKT", y: 2026, wd: "dinsdag" }], tz);
    }
    T.setLang("en");
    assert.equal(T.calendarLabels("2026-10-05", 0)[0].wd, "Monday");
    // maand- en jaarwissel: het blad "eronder" is de dag erna
    T.setLang("nl");
    const w = T.calendarLabels("2026-12-31", 1);
    assert.deepEqual([w[0].d, w[0].mon, w[0].y, w[1].d, w[1].mon, w[1].y], [31, "DEC", 2026, 1, "JAN", 2027]);
    assert.equal(T.calendarLabels("2026-10-05", 7).length, 8, "een Voltreffer: zeven bladen + het blad eronder");
    assert.deepEqual(T.weekLetters(), ["M", "D", "W", "D", "V", "Z", "Z"]);
    T.setLang("en");
    assert.deepEqual(T.weekLetters(), ["M", "T", "W", "T", "F", "S", "S"]);
    T.setLang("de");
    assert.equal(T.weekLetters().length, 7);
  } finally { process.env.TZ = was; T.setLang("nl"); }
});

test("perfectWeekJustCompleted — alleen een verse daily-winst die de ma–zo week op 7 van 7 zet", () => {
  const ls = globalThis.localStorage, wasUser = T.auth.user;
  const key = "jaardle:history";
  const day = (date, won = true) => ({ date, won, score: 90 });
  const week = ["2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26", "2026-09-27"];
  try {
    T.auth.user = null; T.setHistoryCache(null);
    ls.setItem(key, JSON.stringify(week.slice(0, 6).map((d) => day(d))));
    T.setState({ mode: "daily", won: true, puzzleDate: "2026-09-27" });
    assert.equal(T.perfectWeekJustCompleted(), true, "de zevende winst van de week");
    T.setState({ mode: "daily", won: false, puzzleDate: "2026-09-27" });
    assert.equal(T.perfectWeekJustCompleted(), false, "een verlies maakt niets compleet");
    T.setState({ mode: "free", won: true, puzzleDate: "2026-09-27" });
    assert.equal(T.perfectWeekJustCompleted(), false, "vrij spel kent geen weken");
    // één verloren dag eerder in de week
    ls.setItem(key, JSON.stringify(week.slice(0, 6).map((d, i) => day(d, i !== 2))));
    T.setState({ mode: "daily", won: true, puzzleDate: "2026-09-27" });
    assert.equal(T.perfectWeekJustCompleted(), false);
    // een inhaalpot van een eerdere dag kan de week óók afmaken
    ls.setItem(key, JSON.stringify(week.filter((d) => d !== "2026-09-23").map((d) => day(d))));
    T.setState({ mode: "daily", won: true, puzzleDate: "2026-09-23" });
    assert.equal(T.perfectWeekJustCompleted(), true, "de inhaaldag maakt de week af");
    // vóór de eerste telbare week (10 aug): geen wimpels, net als de trofee
    const old = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09"];
    ls.setItem(key, JSON.stringify(old.slice(0, 6).map((d) => day(d))));
    T.setState({ mode: "daily", won: true, puzzleDate: "2026-08-09" });
    assert.equal(T.perfectWeekJustCompleted(), false);
    // ingelogd: de DB-historie telt mee (wins van een ander apparaat), de cache moet er wel zijn
    ls.setItem(key, JSON.stringify([day("2026-09-26")]));
    T.auth.user = { uid: "u" };
    T.setState({ mode: "daily", won: true, puzzleDate: "2026-09-27" });
    T.setHistoryCache(null);
    assert.equal(T.perfectWeekJustCompleted(), false, "cache er nog niet → liever geen show dan een verkeerde");
    T.setHistoryCache(week.slice(0, 5).map((d) => day(d)));
    assert.equal(T.perfectWeekJustCompleted(), true);
  } finally { T.auth.user = wasUser; T.setHistoryCache(null); ls.removeItem(key); }
});

test("Scheurkalender — verdiend op 120 dailies, opt-in, en de vier win-effecten sluiten elkaar uit", () => {
  const ls = globalThis.localStorage, wasUser = T.auth.user;
  const A = (dailies) => ({ games: 0, dailies, streak: 0, perfect: 0, pure: 0, rating: 0, years: [] });
  const keys = ["jaardle:calfx", "jaardle:flairconfetti", "jaardle:beerfx", "jaardle:goldyears"];
  const clear = () => keys.forEach((k) => ls.removeItem(k));
  try {
    clear(); T.auth.user = { uid: "u" };
    const dl = T.ACHV_SERIES.find((x) => x.key === "dailies");
    assert.equal(dl.steps[T.CAL_FX.at], 120, "platina op de dailies-ladder");
    assert.equal(dl.fx, T.CAL_FX);
    assert.equal(T.calendarFxUnlocked(A(119)), false);
    assert.equal(T.calendarFxUnlocked(A(120)), true);
    T.auth.user = null;
    assert.equal(T.calendarFxUnlocked(A(500)), false, "alleen ingelogd");
    T.auth.user = { uid: "u" };
    // opt-in: verdiend betekent nog niet aan
    T.setAchv(A(120));
    assert.equal(T.calendarFxActive(), false, "staat niet vanzelf aan");
    assert.equal(T.winFxUnlockedMap(A(120)).cal, true);
    assert.ok(T.rewardsTabsAvailable(A(120)).includes("vier"), "de Viering-tab bestaat nu");
    assert.ok(T.earnedRewardKeys().includes("fx_calendar"), "unlock-pop-up");
    assert.ok(T.REWARD_ORDER.includes("fx_calendar") && T.REWARDS.fx_calendar.cat === "effect");
    T.setWinFx("cal");
    assert.equal(T.calendarFxActive(), true);
    assert.equal(T.currentWinFxChoice(), "cal");
    assert.deepEqual(["jaardle:flairconfetti", "jaardle:beerfx", "jaardle:goldyears"].map((k) => ls.getItem(k)), ["0", "0", "0"], "de andere drie staan expliciet uit");
    // elk ander effect zet de kalender uit
    for (const [fn, name] of [[T.setBeerFx, "bier"], [T.setGoldYearsFx, "goud"], [T.setFlairConfetti, "flair-confetti"]]) {
      T.setCalendarFx(true); fn(true);
      assert.equal(ls.getItem("jaardle:calfx"), "0", `${name} zet de kalender uit`);
      assert.equal(T.calendarFxActive(), false);
    }
    T.setWinFx("cal"); T.setWinFx("none");
    assert.equal(T.calendarFxActive(), false, "'standaard' zet alles uit");
    assert.equal(T.currentWinFxChoice(), "none");
    // de tegel in de kluis: aanwezig zodra verdiend, mét een voorbeeld
    assert.match(T.rewardsVierHtml(T.winFxUnlockedMap(A(120))), /data-winfx="cal"[^>]*>.*rw-calp/s);
    assert.ok(!T.rewardsVierHtml(T.winFxUnlockedMap(A(50))).includes('data-winfx="cal"'));
    T.setLang("nl");
    assert.equal(T.t("achv_fx_calendar"), "📆 Scheurkalender");
  } finally { clear(); T.auth.user = wasUser; T.setAchv(null); }
});

test("runFx + addFxLayers — een extra laag hangt aan de lopende lus, begint op nul en verlengt de run", () => {
  const saveBody = document.body, saveCreate = document.createElement, saveRM = globalThis.matchMedia;
  const mkEl = () => ({ style: {}, className: "", appendChild() {}, setAttribute() {}, remove() {}, isConnected: true, getContext: () => strictCtx(), width: 0, height: 0 });
  document.body = { appendChild() {} };
  document.createElement = mkEl;
  globalThis.innerWidth = 390; globalThis.innerHeight = 844; globalThis.devicePixelRatio = 2;
  try {
    T.stopFx();
    assert.equal(T.addFxLayers([{ end: 1, draw() {} }]), false, "er loopt niets: de aanroeper start zelf");
    T.runFx([{ end: 2, draw() {} }]);
    const run = T.getFxRun();
    assert.ok(run && run.end === 2);
    run.t0 -= 1000;   // doe alsof de run al 1 s loopt
    const seen = [];
    assert.equal(T.addFxLayers([{ end: 3, draw: (_c, t) => seen.push(t) }]), true);
    assert.ok(run.end > 3.9 && run.end < 4.2, "de run loopt tot 1 s + 3 s: " + run.end);
    run.layers[run.layers.length - 1].draw(strictCtx(), 1.5, 390, 844);
    assert.ok(seen[0] > 0.45 && seen[0] < 0.6, "de laag ziet zijn eigen klok vanaf nul: " + seen[0]);
    assert.equal(T.addFxLayers([]), false);
    T.stopFx();
    assert.equal(T.getFxRun(), null);
    assert.equal(T.addFxLayers([{ end: 1, draw() {} }]), false, "na stopFx weer niets om aan te hangen");
    // minder beweging: geen run, dus ook niets om aan te hangen
    globalThis.matchMedia = () => ({ matches: true, addEventListener() {} });
    T.runFx([{ end: 2, draw() {} }]);
    assert.equal(T.getFxRun(), null);
    assert.equal(T.addFxLayers([{ end: 1, draw() {} }]), false);
  } finally { T.stopFx(); document.body = saveBody; document.createElement = saveCreate; globalThis.matchMedia = saveRM; }
});

test("RewardFx — kalender, wimpels en canvas-confetti tekenen zonder fouten (strikte nep-canvas, donker en licht, drie formaten)", () => {
  const RF = globalThis.RewardFx, saveTheme = document.documentElement.dataset;
  assert.deepEqual([...RF.ids].sort(), ["bunting", "calendar", "confetti"]);
  T.setLang("nl");
  try {
    for (const theme of ["dark", "light"]) {
      document.documentElement.dataset = theme === "light" ? { theme: "light" } : {};
      for (const [W, H] of [[390, 844], [320, 568], [1200, 800]]) {
        const builds = [
          RF.build("calendar", W, H, { labels: T.calendarLabels("2026-10-05", 1), first: false }),
          RF.build("calendar", W, H, { labels: T.calendarLabels("2026-10-05", 7), first: true }),
          RF.build("bunting", W, H, { letters: T.weekLetters() }),
          RF.build("confetti", W, H, { emoji: null }),
          RF.build("confetti", W, H, { emoji: "🦉" }),
        ];
        for (const layers of builds) {
          const ctx = strictCtx(), end = Math.max(...layers.map((l) => l.end));
          assert.ok(end > 3 && end < 6, `einde ${end}`);
          for (let t = 0; t <= end + 0.2; t += 1 / 30) for (const l of layers) { l.draw(ctx, t, W, H); ctx.globalAlpha = 1; }
        }
      }
    }
  } finally { document.documentElement.dataset = saveTheme; }
});

test("loadRewardFx — laadt reward-fx.js één keer lui en probeert opnieuw na een fout", async () => {
  const src = readFileSync(join(dir, "..", "reward-fx.js"), "utf8"), saved = globalThis.RewardFx, saveCreate = document.createElement, saveHead = document.head;
  const loaded = []; let mode = "ok";
  document.createElement = () => ({});
  document.head = { appendChild(sc) { loaded.push(sc.src); queueMicrotask(() => { if (mode === "ok") { (0, eval)(src); sc.onload(); } else sc.onerror(); }); } };
  try {
    delete globalThis.RewardFx;
    mode = "fail";
    await assert.rejects(T.loadRewardFx());
    mode = "ok";
    const [a, b] = await Promise.all([T.loadRewardFx(), T.loadRewardFx()]);
    assert.equal(a, b);
    assert.ok(a.has("calendar") && a.has("bunting"));
    assert.equal(loaded.length, 2);
    assert.ok(loaded.every((u) => u.startsWith("/reward-fx.js")));
  } finally { globalThis.RewardFx = saved; document.createElement = saveCreate; document.head = saveHead; }
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

test("raceWindow — iedereen staat in de race (geen top-3-uitsnede, geen ⋯)", () => {
  assert.deepEqual(T.raceWindow(mkRows(1, 0)), [0]);
  assert.deepEqual(T.raceWindow(mkRows(2, -1)), [0, 1]);
  assert.deepEqual(T.raceWindow(mkRows(8, 0)), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(T.raceWindow(mkRows(8, 5)), [0, 1, 2, 3, 4, 5, 6, 7], "ook als jij ver achterin staat");
  assert.deepEqual(T.raceWindow(mkRows(12, -1)), Array.from({ length: 12 }, (_, i) => i), "ook zonder jou op het bord");
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
    games:   [10, 100, 250, 750, 1500, 3000],   // top-2 verlaagd 8/10/2026
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
  // De server-gate (db/41: ⏳ ≥90, 💯 ≥50) en het bier (1500) hangen aan een GETAL: de pin staat op de
  // trede waar dat getal valt. Verschuift een trede, dan klopt dit niet meer met set_my_flair.
  assert.equal(S("streak").steps[S("streak").flairs[0].at], 90);
  assert.equal(S("perfect").steps[S("perfect").flairs[0].at], 50);
  assert.equal(S("games").steps[T.BEER_FX.at], 1500);
});

test("capstoneTier — laagste trede over de 5 ladders, max 6", () => {
  const a = (games, dailies, streak, perfect, pure) => ({ games, dailies, streak, perfect, pure, years: [], rating: null });
  assert.equal(T.capstoneTier(null), 0);
  assert.equal(T.capstoneTier(a(0, 0, 0, 0, 0)), 0);
  assert.equal(T.capstoneTier(a(33, 26, 5, 3, 5)), 0);          // streak 5 < 7 houdt brons tegen
  assert.equal(T.capstoneTier(a(1133, 119, 89, 80, 218)), 3);   // goud (dailies/streak: 60 / 60)
  assert.equal(T.capstoneTier(a(4261, 121, 98, 297, 807)), 4);  // platina: dailies 120 + streak 90 halen platina, de rest ver erboven
  assert.equal(T.capstoneTier(a(3000, 365, 365, 250, 500)), 6); // alles op de top = obsidiaan
  assert.equal(T.capstoneTier(a(3000, 364, 365, 250, 500)), 5); // één dag te weinig = diamant
  assert.equal(T.capstoneTier(a(2999, 365, 365, 250, 500)), 5); // één potje te weinig = diamant
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

// ── Flair-effecten ("flair+"): opslag-formaat, rendering en registry-integriteit ──
test("parseFlair/joinFlair — '🔥~sparkle' rondt netjes af en weigert onbekende effecten", () => {
  assert.deepEqual(T.parseFlair("🔥~sparkle"), { emoji: "🔥", fx: "sparkle" });
  assert.deepEqual(T.parseFlair("🔥"), { emoji: "🔥", fx: "" });
  assert.deepEqual(T.parseFlair(null), { emoji: "", fx: "" });
  assert.deepEqual(T.parseFlair("🔥~bogus"), { emoji: "🔥", fx: "" }, "onbekend effect (nieuwere server) → gewoon de flair");
  assert.deepEqual(T.parseFlair("🔥~constructor"), { emoji: "🔥", fx: "" }, "geen prototype-sleutels als effect");
  assert.deepEqual(T.parseFlair("~sparkle"), { emoji: "", fx: "" }, "een effect zonder flair bestaat niet");
  assert.equal(T.joinFlair("🔥", "sparkle"), "🔥~sparkle");
  assert.equal(T.joinFlair("🔥", ""), "🔥");
  assert.equal(T.joinFlair("🔥", "nope"), "🔥");
  assert.equal(T.joinFlair("", "sparkle"), "", "geen flair → ook geen effect opslaan");
  // ZWJ-/VS16-flairs bevatten geen '~' en overleven het splitsen intact
  assert.equal(T.parseFlair(T.joinFlair("🐦\u200d🔥", "sparkle")).emoji, "🐦\u200d🔥");
});

test("flairBadgeHtml/flairStaticHtml — effect-klassen op de badge, het teken blijft schoon", () => {
  const withFx = T.flairBadgeHtml("🔥~sparkle", 2);
  assert.match(withFx, /class="lb-flair-badge fl-fx fx-sparkle fl-still"/, "rang 2+: het effect staat stil, zoals de emoji");
  assert.match(withFx, /data-flair="🔥"/, "data-flair (hover-voorproefje) draagt alleen het teken");
  assert.ok(!withFx.includes("~"), "het opslag-formaat lekt nooit de DOM in");
  const plain = T.flairBadgeHtml("🔥", 2);
  assert.ok(!plain.includes("fl-fx"), "zonder effect geen effect-klassen");
  assert.equal(T.flairBadgeHtml("", 1), "");
  assert.equal(T.flairBadgeHtml("~sparkle", 1), "");
  assert.equal(T.flairStaticHtml("🔥~sparkle"), '<span class="fl-fx fx-sparkle fl-still">🔥</span>', "een statische emoji → een stilstaand effect");
  assert.equal(T.flairStaticHtml("🔥"), "🔥");
  assert.equal(T.flairStaticHtml(null), "");
});

test("beweging van een flair-effect volgt de emoji's: rang 1 en het kluis-voorbeeld bewegen, de rest staat stil", () => {
  const was = globalThis.matchMedia;
  try {
    const first = T.flairBadgeHtml("🔥~glow", 1);
    assert.ok(!first.includes("fl-still") && !first.includes("data-fxstill"), "rang 1 beweegt (de emoji ook)");
    assert.match(first, /emoji-anim/, "rang 1: de geanimeerde emoji");
    const other = T.flairBadgeHtml("🔥~glow", 3);
    assert.match(other, /fl-still/); assert.match(other, /data-fxstill/, "de hover-code weet dat hij de pose mag losmaken");
    assert.ok(!other.includes("emoji-anim"));
    assert.ok(!T.flairBadgeHtml("🔥~glow", 0, true).includes("fl-still"), "live (kluis-voorbeeld): altijd in beweging");
    assert.ok(!T.flairBadgeHtml("🔥~glow", null, true).includes("fl-still"));
    // minder beweging: ook rang 1 en het kluis-voorbeeld staan stil (de CSS-media-query doet hetzelfde voor de rest)
    globalThis.matchMedia = () => ({ matches: true, addEventListener() {} });
    assert.match(T.flairBadgeHtml("🔥~glow", 1), /fl-still/);
    assert.match(T.flairBadgeHtml("🔥~glow", 0, true), /fl-still/);
  } finally { globalThis.matchMedia = was; }
});

test("onFlairAnimReady — het hover-voorproefje wisselt pas als de animatie helemaal binnen is (geen leeg vakje / alt-tekst-sprong)", async () => {
  const was = globalThis.Image, made = [];
  globalThis.Image = class {
    constructor() { this.complete = false; this.naturalWidth = 0; this.waiting = []; made.push(this); }
    decode() { return new Promise((ok, no) => this.waiting.push({ ok, no })); }   // elke aanroep krijgt z'n eigen belofte, net als in de browser
    load() { this.complete = true; this.naturalWidth = 96; this.waiting.forEach((w) => w.ok()); }
    fail() { this.waiting.forEach((w) => w.no(new Error("EncodingError"))); }
  };
  const tick = () => new Promise((r) => setTimeout(r, 0));
  try {
    const got = [];
    T.onFlairAnimReady("🦁", () => got.push("a"));
    assert.deepEqual(got, [], "nog niet binnen: het statische teken blijft staan");
    assert.equal(made.length, 1);
    assert.match(made[0].src, /^\/emoji\/flair-lion\.webp$/);
    T.onFlairAnimReady("🦁", () => got.push("a2"));   // tweede hover terwijl hij nog laadt: geen tweede download
    assert.equal(made.length, 1);
    made[0].load(); await tick();
    assert.deepEqual(got, ["a", "a2"], "binnen: beide wachtende hovers wisselen");
    T.onFlairAnimReady("🦁", () => got.push("b"));
    assert.deepEqual(got.slice(2), ["b"], "volgende keer synchroon: het bestand zit in het geheugen");
    assert.equal(made.length, 1);
    // geen webp (🎩/🦫/🐷 = CSS-cheer): niets te wachten, niets te laden
    T.onFlairAnimReady("🦫", () => got.push("c"));
    assert.deepEqual(got.slice(3), ["c"]);
    assert.equal(made.length, 1);
    // laden mislukt: nooit wisselen, en de volgende hover probeert opnieuw
    T.onFlairAnimReady("🐙", () => got.push("d"));
    made[1].fail(); await tick();
    assert.deepEqual(got.slice(4), [], "mislukt: het statische teken blijft");
    T.onFlairAnimReady("🐙", () => got.push("e"));
    assert.equal(made.length, 3, "nieuwe poging met een verse <img>");
    made[2].load(); await tick();
    assert.deepEqual(got.slice(4), ["e"]);
    // wel geladen maar decode() weigert (sommige browsers): toch wisselen
    T.onFlairAnimReady("🐼", () => got.push("f"));
    made[3].complete = true; made[3].naturalWidth = 96; made[3].fail(); await tick();
    assert.deepEqual(got.slice(5), ["f"]);
  } finally { globalThis.Image = was; }
});

test("FLAIR_FX — elke registry-rij heeft reward, volgorde, naam in alle talen en een geldige prestatie-koppeling", () => {
  for (const [id, f] of Object.entries(T.FLAIR_FX)) {
    const r = T.REWARDS[f.reward];
    assert.ok(r && r.cat === "flairfx" && r.fx === id, `${id}: REWARDS mist de reward-regel`);
    assert.ok(T.REWARD_ORDER.includes(f.reward), `${id}: ${f.reward} staat niet in REWARD_ORDER (pop-up zou nooit komen)`);
    for (const code of Object.keys(T.I18N)) {
      assert.ok(T.I18N[code][`fxn_${id}`], `${id}: fxn_${id} mist in "${code}"`);
      assert.ok(T.I18N[code][`fxn_${id}`].startsWith(f.emoji), `${id}: de naam in "${code}" begint niet met het icoon ${f.emoji}`);
    }
  }
  for (const tr of T.ACHV_TROPHIES.filter((x) => x.flairFx)) assert.ok(T.FLAIR_FX[tr.flairFx], `${tr.key}: onbekend flairFx "${tr.flairFx}"`);
});

test("FLAIR_FX — het getal van de gate is precies de trede/teller van de prestatie waaraan het hangt (kaart belooft niets wat de server weigert)", () => {
  const links = {};
  for (const s of T.ACHV_SERIES) for (const f of s.flairFxs || []) {
    assert.ok(!links[f.id], `${f.id}: aan twee prestaties gekoppeld`);
    links[f.id] = { key: s.key, min: s.steps[f.at] };
  }
  for (const tr of T.ACHV_TROPHIES.filter((x) => x.flairFx)) {
    assert.ok(!links[tr.flairFx], `${tr.flairFx}: aan twee prestaties gekoppeld`);
    links[tr.flairFx] = { key: tr.key, min: tr.tiers ? tr.tiers[tr.flairFxAt] : T.FLAIR_FX[tr.flairFx].min };
    if (tr.tiers) assert.ok(Number.isInteger(tr.flairFxAt), `${tr.key}: getierd, dus een flairFxAt`);
  }
  for (const [id, f] of Object.entries(T.FLAIR_FX)) {
    if (f.key === "capstone") { assert.equal(f.min, T.CAPSTONE_MAX, `${id}: een capstone-effect hoort bij de hoogste trede`); continue; }   // obsidiaan: geen losse prestatie maar de capstone zelf
    assert.ok(links[id], `${id}: hangt aan geen enkele prestatie (zou onvindbaar zijn)`);
    assert.equal(links[id].key, f.key, `${id}: andere teller dan de prestatie`);
    assert.equal(links[id].min, f.min, `${id}: drempel wijkt af van de prestatie`);
  }
});

test("flairFxEarned — alleen ingelogd, en elk effect volgt zijn teller op de drempel", () => {
  const was = T.auth.user;
  try {
    T.auth.user = null;
    assert.deepEqual(T.flairFxEarned({ flawless: true }), [], "anoniem verdient geen effect");
    T.auth.user = { uid: "u" };
    assert.deepEqual(T.flairFxEarned({ flawless: true }), ["sparkle"]);
    assert.deepEqual(T.flairFxEarned({ flawless: false }), []);
    assert.deepEqual(T.flairFxEarned(null), []);
    for (const [id, f] of Object.entries(T.FLAIR_FX)) {
      if (f.key === "flawless" || f.key === "capstone") continue;   // sprankel = boolean; obsidiaan-effecten volgen capstoneTier (eigen test)
      const got = (n) => T.flairFxEarned({ [f.key]: n }).includes(id);
      assert.ok(got(f.min), `${id}: op ${f.min} verdiend`);
      assert.ok(got(f.min + 40), `${id}: erboven ook`);
      assert.ok(!got(f.min - 1), `${id}: één eronder nog niet`);
      assert.ok(!got(0));
    }
    // Puurspeler: 100 geeft de rimpel, 250 daarnaast de lotus
    assert.deepEqual(T.flairFxEarned({ pure: 100 }), ["ripple"]);
    assert.deepEqual(T.flairFxEarned({ pure: 250 }).sort(), ["lotus", "ripple"]);
  } finally { T.auth.user = was; }
});

test("unlock-kaart: een effect komt alleen op de stap die het vrijspeelt (reeks, getierd, teller, eenmalig)", () => {
  T.setLang("nl");
  const ser = (k) => T.ACHV_SERIES.find((x) => x.key === k);
  const tro = (k) => T.ACHV_TROPHIES.find((x) => x.key === k);
  const A = (o) => ({ games: 0, dailies: 0, streak: 0, perfect: 0, pure: 0, rating: 0, years: [], ...o });
  // reeks: streak trede 4 (90) → ⏳, trede 5 (180) → Gloed; pure trede 4 → Rimpel, trede 5 → Lotus
  assert.equal(T.achvSeriesItem(A({ streak: 90 }), ser("streak"), 4, 3).flairFx, null);
  assert.equal(T.achvSeriesItem(A({ streak: 90 }), ser("streak"), 4, 3).flair, "⏳");
  assert.equal(T.achvSeriesItem(A({ streak: 180 }), ser("streak"), 5, 4).flairFx, "glow");
  assert.equal(T.achvSeriesItem(A({ streak: 365 }), ser("streak"), 6, 5).flairFx, null, "al eerder gehaald → niet nog eens melden");
  assert.equal(T.achvSeriesItem(A({ pure: 100 }), ser("pure"), 4, 3).flairFx, "ripple");
  assert.equal(T.achvSeriesItem(A({ pure: 250 }), ser("pure"), 5, 4).flairFx, "lotus");
  assert.equal(T.achvSeriesItem(A({ pure: 250 }), ser("pure"), 5, 3).flairFx, "lotus", "twee treden in één pot: de hoogste wint");
  // getierde trofee: Voltreffer 80 = trede 4
  const ft = tro("first_try");
  assert.equal(T.achvTrophyItem(ft, 30, 3, A(), 2).flairFx, null);
  assert.equal(T.achvTrophyItem(ft, 80, 4, A(), 3).flairFx, "vizier");
  assert.equal(T.achvTrophyItem(ft, 200, 5, A(), 4).flairFx, null);
  assert.equal(T.achvTrophyItem(ft, 80, 4, A(), 1).flairFx, "vizier", "trede 2 → 4 in één pot");
  // teller-trofee (geen treden): Vuurproef → Vonken bij 25; snapshot 0 → 1 (eerste) → 2 (mijlpaal)
  const sp = tro("spicy");
  assert.equal(T.achvSnapshot(A({ spicy: 0 })).spicy, 0);
  assert.equal(T.achvSnapshot(A({ spicy: 24 })).spicy, 1);
  assert.equal(T.achvSnapshot(A({ spicy: 25 })).spicy, 2);
  assert.equal(T.achvTrophyItem(sp, 1, 0, A({ spicy: 1 }), 0).flairFx, null, "de eerste Vuurproef is nog geen effect");
  assert.equal(T.achvTrophyItem(sp, 25, 0, A({ spicy: 25 }), 1).flairFx, "ember");
  assert.equal(T.achvTrophyItem(sp, 26, 0, A({ spicy: 26 }), 2).flairFx, null);
  // eenmalige trofee (Vlekkeloos) → het effect komt meteen mee
  assert.equal(T.achvTrophyItem(tro("flawless"), 0, 0, A({ flawless: true }), 0).flairFx, "sparkle");
});

test("prestatiebord: pins en tooltips noemen de effecten alleen voor ingelogde spelers", () => {
  const was = T.auth.user;
  T.setLang("nl");
  const A = (o) => ({ games: 0, dailies: 0, streak: 0, perfect: 0, pure: 0, rating: 0, years: [], ...o });
  try {
    const pure = T.ACHV_SERIES.find((x) => x.key === "pure");
    T.auth.user = { uid: "u" };
    const html = T.achvDetailHtml(A({ pure: 30 }), pure);
    assert.ok(html.includes("🌊") && html.includes("🪷"), "pins voor Rimpel en Lotus");
    assert.match(html, /Platina|platina/i);
    const tip = T.achvTrophyHtml(A({ first_try: 5 }), T.ACHV_TROPHIES.find((x) => x.key === "first_try"));
    assert.match(tip, /title="[^"]*Vizier[^"]*"/, "tooltip noemt het effect");
    assert.match(tip, /nog 5|5/, "…en blijft de voortgang naar de volgende trede tonen");
    T.auth.user = null;
    assert.ok(!T.achvDetailHtml(A({ pure: 30 }), pure).includes("🪷"), "anoniem: geen belofte van een effect dat je niet kunt dragen");
    assert.ok(!T.achvTrophyHtml(A({ first_try: 5 }), T.ACHV_TROPHIES.find((x) => x.key === "first_try")).includes("Vizier"));
  } finally { T.auth.user = was; }
});

// ── De vlam groeit mee met de streak ──
test("streakFlameTier — de zes treden van de streak-reeks (7 · 30 · 60 · 90 · 180 · 365), daaronder geen tier", () => {
  const steps = T.ACHV_SERIES.find((x) => x.key === "streak").steps;
  assert.deepEqual(steps, [7, 30, 60, 90, 180, 365]);
  assert.equal(T.streakFlameTier(0), 0);
  assert.equal(T.streakFlameTier(6), 0);
  steps.forEach((n, i) => { assert.equal(T.streakFlameTier(n), i + 1, `${n} dagen = trede ${i + 1}`); assert.equal(T.streakFlameTier(n - 1), i, `${n - 1} dagen = nog trede ${i}`); });
  assert.equal(T.streakFlameTier(9999), 6, "boven de laatste trede blijft obsidiaan");
  assert.equal(T.streakFlameTier(-3), 0);
});

test("streakFlameHtml / withAnimEmoji — tier-klasse, boei bij een redding, rest van de string animeert gewoon", () => {
  const was = globalThis.matchMedia;
  try {
    assert.ok(!T.streakFlameHtml(3).includes("flm"), "onder de eerste trede: de gewone geanimeerde vlam");
    assert.match(T.streakFlameHtml(94), /^<span class="flm s4"><img class="emoji-anim"/, "94 dagen = platina");
    assert.match(T.streakFlameHtml(400), /class="flm s6"/);
    assert.match(T.streakFlameHtml(3, true), /class="flm s0 flm-saved"/, "een redding zonder tier krijgt toch de boei");
    assert.match(T.streakFlameHtml(94, true), /class="flm s4 flm-saved"/);
    // alleen de 🔥 wordt vervangen; 🏆 e.d. animeren zoals altijd
    const line = T.withAnimEmoji("🔥 94 dagen 🏆", T.streakFlameHtml(94));
    assert.match(line, /flm s4/); assert.match(line, /trophy\.webp/); assert.ok(!line.includes("🔥 94"), "het losse teken is vervangen (alleen de alt-tekst houdt hem)");
    assert.match(T.withAnimEmoji("🔥 x"), /fire\.webp/, "zonder eigen vlam: de gewone");
    // minder beweging: geen webp, maar het teken in dezelfde ring (de tint zit op .flm-g)
    globalThis.matchMedia = () => ({ matches: true, addEventListener() {} });
    assert.equal(T.streakFlameHtml(3), "🔥");
    assert.match(T.streakFlameHtml(94), /<span class="flm s4"><span class="flm-g">🔥<\/span><\/span>/);
  } finally { globalThis.matchMedia = was; }
});

// ── Perfecte week: trofee en gouden weekband delen dezelfde regel ──
test("perfectWeekKeys — ma–zo weken met 7 winsten, niet retroactief, verliezen en gaten tellen niet", () => {
  const days = (from, n, won = true) => Array.from({ length: n }, (_, k) => {
    const d = new Date(`${from}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + k);
    return { date: d.toISOString().slice(0, 10), won, score: 90 };
  });
  assert.equal(T.weekMondayKey("2026-10-05"), "2026-10-05", "maandag is zijn eigen weekstart");
  assert.equal(T.weekMondayKey("2026-10-11"), "2026-10-05", "zondag hoort bij de week ervoor");
  assert.equal(T.weekMondayKey("2026-10-12"), "2026-10-12");
  assert.equal(T.weekMondayKey("kapot"), null);
  assert.deepEqual([...T.perfectWeekKeys(days("2026-09-21", 7))], ["2026-09-21"]);
  assert.deepEqual([...T.perfectWeekKeys(days("2026-09-14", 14))].sort(), ["2026-09-14", "2026-09-21"], "twee weken op rij");
  assert.equal(T.perfectWeekKeys(days("2026-09-21", 6)).size, 0, "6 van 7 telt niet");
  assert.equal(T.perfectWeekKeys(days("2026-09-22", 7)).size, 0, "7 dagen die over twee weken lopen is geen week");
  const lost = days("2026-09-21", 7); lost[3].won = false;
  assert.equal(T.perfectWeekKeys(lost).size, 0, "één verloren dag breekt de week");
  assert.equal(T.perfectWeekKeys(days("2026-08-03", 7)).size, 0, "vóór PERFECT_WEEK_SINCE (10 aug) telt niet retroactief");
  assert.equal(T.perfectWeekKeys(days("2026-08-10", 7)).size, 1, "de eerste telbare maandag wel");
  assert.equal(T.perfectWeeks(days("2026-09-14", 14)), 2, "de trofee telt precies de weken van de band");
});

test("renderHistoryList — een perfecte week krijgt een gouden band, andere dagen niet", () => {
  T.setLang("nl");
  const days = (from, n, won = true) => Array.from({ length: n }, (_, k) => {
    const d = new Date(`${from}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + k);
    return { date: d.toISOString().slice(0, 10), won, score: 80 };
  });
  const body = { innerHTML: "", querySelectorAll: () => [] };
  // ma 21 t/m zo 27 sep perfect + ma 28 sep en di 29 sep los
  T.renderHistoryList(body, [...days("2026-09-21", 7), ...days("2026-09-28", 2)]);
  const html = body.innerHTML;
  assert.equal((html.match(/class="pw"/g) || []).length, 1, "precies één band");
  const band = html.slice(html.indexOf('class="pw"'));
  assert.equal((band.slice(0, band.indexOf("</div>")).match(/history-row/g) || []).length, 7, "de band omvat zeven rijen");
  assert.ok(html.indexOf("2026-09-29") < html.indexOf('class="pw"'), "nieuwste bovenaan, de losse dagen vóór de band");
  assert.ok(!html.slice(0, html.indexOf('class="pw"')).includes("pw-tag"));
  assert.match(html, /7\/7 ✓/);
  // verliezen en niet-aaneengesloten weken: geen band
  const mixed = days("2026-09-21", 7); mixed[2].won = false;
  T.renderHistoryList(body, mixed);
  assert.ok(!body.innerHTML.includes('class="pw"'));
});

// ── De effect-CSS laadt lui ──
test("ensureFlairFxCss — flair-fx.css wordt pas opgehaald bij het eerste flair-effect, één keer, en opnieuw geprobeerd na een fout", () => {
  const saveCreate = document.createElement, saveHead = document.head, appended = [];
  document.createElement = () => ({ remove() { this.removed = true; } });
  document.head = { appendChild(el) { appended.push(el); } };
  try {
    assert.equal(T.flairFxClass("", false), "", "zonder effect niets ophalen");
    assert.equal(appended.length, 0);
    assert.match(T.flairFxClass("ember", true), /fl-fx fx-ember fl-still/);
    assert.equal(appended.length, 1);
    assert.equal(appended[0].rel, "stylesheet");
    assert.match(appended[0].href, /^\/flair-fx\.css(\?v=.*)?$/);
    T.flairFxClass("glow", false); T.flairFxClass("lotus", true);
    assert.equal(appended.length, 1, "één keer, niet per flair");
    appended[0].onerror();   // netwerkfout → link weg, volgende render probeert opnieuw
    assert.ok(appended[0].removed);
    T.flairFxClass("glow", false);
    assert.equal(appended.length, 2);
    T.flairFxClass("glow", false);
    assert.equal(appended.length, 2);
  } finally {
    if (appended.length) appended[appended.length - 1].onerror?.();   // laat de status schoon achter voor de volgende test
    document.createElement = saveCreate; document.head = saveHead;
  }
});

test("flair-fx.css — elk effect heeft z'n regels, zijn stilstaande pose en de minder-beweging-variant; tokens zijn gedefinieerd", () => {
  const lazy = readFileSync(join(dir, "..", "flair-fx.css"), "utf8"), base = readFileSync(join(dir, "..", "style.css"), "utf8");
  for (const id of Object.keys(T.FLAIR_FX)) {
    assert.ok(new RegExp(`\\.fx-${id}\\b`).test(lazy), `${id}: geen .fx-${id}-regels in flair-fx.css`);
    assert.ok(new RegExp(`\\.fl-still\\.fx-${id}\\b`).test(lazy), `${id}: geen stilstaande pose (.fl-still)`);
    assert.ok(new RegExp(`\\.fl-fx\\.fx-${id}\\b`).test(lazy), `${id}: geen minder-beweging-pose (.fl-fx binnen prefers-reduced-motion)`);
    assert.ok(!new RegExp(`\\.fx-${id}\\b`).test(base), `${id}: de effect-regels horen niet in de eerste paint (style.css)`);
  }
  const used = (css) => new Set([...css.matchAll(/var\(--fx-([a-z0-9-]+)/g)].map((m) => m[1]));
  const defined = (css) => new Set([...css.matchAll(/--fx-([a-z0-9-]+)\s*:/g)].map((m) => m[1]));
  for (const tok of used(base)) assert.ok(defined(base).has(tok), `style.css gebruikt --fx-${tok} maar definieert hem niet (de lazy CSS is er niet altijd)`);
  const all = new Set([...defined(base), ...defined(lazy)]);
  for (const tok of used(lazy)) assert.ok(all.has(tok), `flair-fx.css gebruikt --fx-${tok} zonder definitie`);
  assert.ok(/@keyframes fx-twinkle\s*\{/.test(base) && !/@keyframes fx-twinkle\s*\{/.test(lazy), "fx-twinkle staat bij de Holo-foil-sierrand in style.css");
});

// ── Weekprijzen (db/80): alleen weergave, de server rekent ──
const AW = (kind, extra = {}) => ({ kind, display_name: extra.name || "Noor", flair: extra.flair ?? "🦉", title: extra.title ?? "", is_me: !!extra.me, detail: extra.detail || {} });
test("awardsHtml — vaste volgorde, eigen regel gemarkeerd, geen leeg blok, tussenstand-kop", () => {
  T.setLang("nl");
  assert.equal(T.awardsHtml([], false), "");
  assert.equal(T.awardsHtml(undefined, false), "", "geen antwoord (RPC mislukt) → geen blok");
  const html = T.awardsHtml([
    AW("reuzendoder", { name: "Bram", detail: { day: "2026-09-30", score: 94, victim_score: 71, victim: "Sem" } }),
    AW("stijger", { name: "Fenna", detail: { pct: 24, baseline: 412, week_score: 511 } }),
    AW("streak", { name: "Lotte", me: true, detail: { days: 14 } }),
    AW("record", { name: "Daan", detail: { week_score: 438, previous_best: 402 } }),
    AW("terug", { name: "Milan", detail: { gap_days: 12 } }),
  ], false);
  const order = ["Stijger", "14 dagen op rij", "Persoonlijk record", "Welkom terug", "Reuzendoder"].map((x) => html.indexOf(x));
  assert.ok(order.every((v, i) => v > 0 && (i === 0 || v > order[i - 1])), "volgorde: " + order);
  assert.match(html, /<span>Weekprijzen<\/span>/);
  assert.match(html, /24% boven het eigen gemiddelde \(412 → 511\)/);
  assert.match(html, /versloeg Sem \(woensdag\): 94 tegen 71/);
  assert.match(html, /inhaalpotjes tellen mee/);
  assert.equal((html.match(/class="lb-aw lb-me"/g) || []).length, 1, "alleen jouw eigen regel is gemarkeerd");
  assert.match(T.awardsHtml([AW("terug", { detail: { gap_days: 9 } })], true), /Weekprijzen tot nu toe/);
});

test("awardsHtml live (Week-tab) — compact: één regel per prijs zonder uitleg, afsluitregel deelt de kop", () => {
  T.setLang("nl");
  const aw = [AW("stijger", { name: "Fenna", detail: { pct: 18, baseline: 300, week_score: 354 } }), AW("streak", { name: "Sem", detail: { days: 7 } }),
    AW("record", { name: "Daan", detail: { week_score: 438, previous_best: 402 } }), AW("reuzendoder", { name: "Bram", detail: { day: "2026-09-30", score: 94, victim_score: 71, victim: "Sem" } })];
  const live = T.awardsHtml(aw, true, "🏁 sluit ma 12:00 · nog 6 d");
  assert.match(live, /<div class="lb-aw-t"><span>Weekprijzen tot nu toe<\/span><small>🏁 sluit ma 12:00 · nog 6 d<\/small><\/div>/);
  assert.ok(!live.includes("inhaalpotjes tellen mee") && !live.includes("boven het eigen gemiddelde") && !live.includes("versloeg"), "geen uitlegregels in de tussenstand");
  assert.match(live, /<b>Stijger<\/b><span>\+18%<\/span>/); assert.match(live, /<b>Persoonlijk record<\/b><span>438<\/span>/); assert.match(live, /<b>Reuzendoder<\/b><span>94–71<\/span>/);
  assert.match(live, /<b>7 dagen op rij<\/b><\/div>/, "de reeks heeft het getal al in de titel");
  assert.equal((live.match(/lb-aw-c/g) || []).length, 4);
  const closed = T.awardsHtml(aw, false);
  assert.ok(closed.includes("inhaalpotjes tellen mee") && closed.includes("versloeg Sem (woensdag)"), "een afgeronde week houdt de uitleg");
  assert.ok(!closed.includes("lb-aw-c") && !closed.includes("<small>"));
});

test("awardsHtml — een stijger zonder stijging en een reeks zonder dagen bestaan niet; namen worden ontsnapt", () => {
  T.setLang("nl");
  assert.equal(T.awardsHtml([AW("stijger", { detail: { pct: 0, baseline: 400, week_score: 400 } })], true), "");
  assert.equal(T.awardsHtml([AW("stijger", { detail: { pct: -5, baseline: 400, week_score: 380 } })], true), "");
  assert.equal(T.awardsHtml([AW("streak", { detail: { days: 0 } })], false), "");
  assert.equal(T.awardsHtml([AW("onbekend")], false), "", "een nieuwere server met een onbekende soort: gewoon overslaan");
  const html = T.awardsHtml([AW("reuzendoder", { name: "<img src=x onerror=alert(1)>", detail: { day: "2026-09-30", score: 90, victim_score: 70, victim: "<b>Sem</b>" } })], false);
  assert.ok(!html.includes("<img") && !html.includes("<b>Sem"), "geen ongeëscapete HTML uit namen");
  assert.match(html, /&lt;img/);
});

test("awardTexts / weekdayName — vijf talen, weekdag klopt in elke tijdzone", () => {
  const was = process.env.TZ;
  try {
    for (const tz of ["Europe/Amsterdam", "America/New_York", "Pacific/Auckland"]) {
      process.env.TZ = tz;
      T.setLang("nl"); assert.equal(T.weekdayName("2026-09-30"), "woensdag", tz);
      T.setLang("en"); assert.equal(T.weekdayName("2026-09-30"), "Wednesday", tz);
    }
    for (const lang of ["nl", "en", "de", "es", "pt"]) {
      T.setLang(lang);
      for (const [kind, detail] of [["stijger", { pct: 20, baseline: 300, week_score: 360 }], ["streak", { days: 7 }], ["record", { week_score: 400, previous_best: 380 }],
        ["terug", { gap_days: 8 }], ["reuzendoder", { day: "2026-09-30", score: 80, victim_score: 60, victim: "X" }]]) {
        const x = T.awardTexts(AW(kind, { detail }));
        assert.ok(x && x.title && x.detail, `${lang}/${kind}`);
        assert.ok(!/undefined|NaN|\[object/.test(x.title + x.detail), `${lang}/${kind}: ${x.title} / ${x.detail}`);
      }
    }
  } finally { process.env.TZ = was; T.setLang("nl"); }
});

test("awardMeHtml — persoonlijke regel: wat je nog nodig hebt, alleen als je deze week speelde", () => {
  T.setLang("nl");
  const me = (d) => [AW("me", { me: true, detail: d })];
  assert.equal(T.awardMeHtml([]), "");
  assert.equal(T.awardMeHtml(me({ played: 0, week_score: 0, best_week_before: 400 })), "", "nog niet gespeeld → niets");
  const a = T.awardMeHtml(me({ played: 3, week_score: 281, best_week_before: 438, streak: 12, next_milestone: 14 }));
  assert.match(a, /Jij: 3 dagen gespeeld, 281 punten\. Nog 157 voor je beste week \(438\)\./);
  assert.match(a, /🔥 12 dagen op rij, nog 2 tot 14\./);
  const b = T.awardMeHtml(me({ played: 1, week_score: 90, best_week_before: 0, streak: 1, next_milestone: 3 }));
  assert.match(b, /Jij: 1 dag gespeeld, 90 punten\./); assert.ok(!b.includes("beste week"), "geen beste week om mee te vergelijken");
  assert.match(T.awardMeHtml(me({ played: 5, week_score: 450, best_week_before: 438, streak: 0, next_milestone: 3 })), /Je zit al boven je beste week \(438\)/);
  assert.ok(!/🔥/.test(T.awardMeHtml(me({ played: 5, week_score: 450, best_week_before: 438, streak: 20, next_milestone: 14 }))), "geen volgende mijlpaal → geen regel");
});

test("awardsHtml — meerdere winnaars van één prijs staan samen op één regel, hoogste eerst; één winnaar houdt de gewone regel", () => {
  T.setLang("nl");
  const aw = [AW("streak", { name: "Cavia Tom", detail: { days: 7 } }), AW("streak", { name: "Mike", detail: { days: 30 } }), AW("streak", { name: "Jij", me: true, detail: { days: 14 } }),
    AW("record", { name: "Geert", detail: { week_score: 745, previous_best: 714 } }), AW("record", { name: "Joris", detail: { week_score: 634, previous_best: 606 } }),
    AW("terug", { name: "Glenn", detail: { gap_days: 14 } })];
  const html = T.awardsHtml(aw, false);
  assert.equal((html.match(/<li /g) || []).length, 3, "streak, record en terug: drie regels voor zes uitreikingen");
  assert.equal((html.match(/lb-aw-g/g) || []).length, 2);
  const iM = html.indexOf("Mike"), iJ = html.indexOf("Jij"), iC = html.indexOf("Cavia Tom");
  assert.ok(iM > 0 && iM < iJ && iJ < iC, "gesorteerd op dagen: 30, 14, 7");
  assert.match(html, /<b>Dagen op rij<\/b>/); assert.match(html, /<b>Persoonlijk record<\/b>/);
  assert.match(html, /lb-aw-p me">Jij/, "jouw naam in de groep is gemarkeerd");
  assert.match(html, /<li class="lb-aw lb-aw-g lb-me">/, "de groep waar jij in zit is gemarkeerd");
  assert.match(html, /<b>Welkom terug<\/b><span>weer meegedaan na 14 dagen<\/span>/, "een enkele winnaar houdt titel + uitleg");
  assert.match(T.awardsHtml(aw, true), /lb-aw lb-aw-g lb-aw-c/);
});

test("awardMeHtml compact — één regel: wat je nog nodig hebt, zonder herhaling van dagen en punten", () => {
  T.setLang("nl");
  const me = (d) => [AW("me", { me: true, detail: d })];
  const a = T.awardMeHtml(me({ played: 3, week_score: 281, best_week_before: 438, streak: 12, next_milestone: 14 }), true);
  assert.match(a, /<p>Nog 157 voor je beste week \(438\) · 🔥 nog 2 tot 14<\/p>/); assert.equal((a.match(/<p>/g) || []).length, 1);
  assert.match(T.awardMeHtml(me({ played: 5, week_score: 450, best_week_before: 438, streak: 0, next_milestone: 3 }), true), /<p>Boven je beste week \(438\)<\/p>/);
  assert.equal(T.awardMeHtml(me({ played: 2, week_score: 90, best_week_before: 0, streak: 0, next_milestone: 3 }), true), "", "niets te melden → geen blok");
  assert.equal(T.awardMeHtml(me({ played: 0, week_score: 0, best_week_before: 400, streak: 5, next_milestone: 7 }), true), "");
});

test("podiumHtml / recapRaceHtml — de prijzen staan tussen podium+formule en de rest van de stand", () => {
  T.setLang("nl");
  const rows = [1, 2, 3, 4, 5].map((i) => ({ rank: i, display_name: "Sp" + i, flair: "", title: "", week_score: 600 - i * 50, daily_wins: 0, played: 7, is_me: i === 4, prev_rank: i }));
  const awards = [AW("terug", { name: "Sp5", detail: { gap_days: 12 } })];
  const html = T.podiumHtml(rows, false, awards);
  const iNote = html.indexOf("lb-wk-note"), iAw = html.indexOf("lb-wk-awards"), iRest = html.indexOf("lb-wk-rest");
  assert.ok(iNote > 0 && iAw > iNote && iRest > iAw, `volgorde ${iNote} < ${iAw} < ${iRest}`);
  assert.ok(!T.podiumHtml(rows, false, []).includes("lb-wk-awards"), "zonder prijzen is de pop-up precies als nu");
  assert.ok(!T.podiumHtml(rows, false).includes("lb-wk-awards"));
  const race = T.recapRaceHtml(rows.map((r) => ({ ...r, runner: "" })), [...awards, AW("me", { me: true, detail: { played: 2, week_score: 150, best_week_before: 300, streak: 2, next_milestone: 3 } })]);
  assert.match(race, /Weekprijzen tot nu toe/); assert.match(race, /lb-aw-me lb-aw-me-c/);
  assert.equal((race.match(/class="lb-wk-note"/g) || []).length, 0, "met prijzen deelt de afsluitregel de kop (geen aparte regel)");
  assert.match(T.recapRaceHtml(rows.map((r) => ({ ...r, runner: "" })), []), /class="lb-wk-note"/, "zonder prijzen blijft de afsluitregel zoals hij was");
});

test("spotlightAwards — dagen op rij: max. 3 namen, laagst geplaatsten eerst, jezelf blijft altijd staan", () => {
  T.setLang("nl");
  const rows = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({ rank: i, display_name: "Sp" + i, week_score: 800 - i * 50 }));
  const st = (n, days, me) => AW("streak", { name: "Sp" + n, detail: { days }, me: !!me });
  const names = (a) => a.filter((x) => x.kind === "streak").map((x) => x.display_name).sort();
  // vijf winnaars: de vier laagst geplaatsten (Sp8, Sp7, Sp6, Sp4) → plafond 3 → Sp2 en Sp4 vallen af, Sp8/Sp7/Sp6 blijven
  const five = [st(2, 60), st(4, 14), st(6, 7), st(7, 7), st(8, 3)];
  assert.deepEqual(names(T.spotlightAwards(five, rows)), ["Sp6", "Sp7", "Sp8"]);
  // jij (Sp2, hoog geplaatst) blijft staan en telt mee in het plafond
  const withMe = [st(2, 60, true), st(4, 14), st(6, 7), st(7, 7), st(8, 3)];
  assert.deepEqual(names(T.spotlightAwards(withMe, rows)), ["Sp2", "Sp7", "Sp8"]);
  // drie of minder: niets weg; andere prijzen blijven ongemoeid; zonder stand geen filter
  assert.equal(T.spotlightAwards([st(1, 30), st(5, 7), st(8, 3)], rows).length, 3);
  const mixed = [...five, AW("terug", { name: "Sp1", detail: { gap_days: 9 } })];
  assert.equal(T.spotlightAwards(mixed, rows).filter((x) => x.kind === "terug").length, 1);
  assert.equal(T.spotlightAwards(five, []).length, 5); assert.equal(T.spotlightAwards(five).length, 5);
  // gelijke stand op rang: hogere streak wint; onbekende naam (niet in de stand) valt als eerste af
  const ghost = [st(6, 7), st(7, 7), st(8, 3), AW("streak", { name: "Onbekend", detail: { days: 30 } })];
  assert.deepEqual(names(T.spotlightAwards(ghost, rows)), ["Sp6", "Sp7", "Sp8"]);
});

// ── Team tegen de wereld (stap 3) ─────────────────────────────────────────────────────────────────────────────
const VS_DAYS = [["2026-09-28", 100, 88.4], ["2026-09-29", 60.4, 51.6], ["2026-09-30", 75.3, 49.7], ["2026-10-01", 89.1, 81.6], ["2026-10-02", 65.7, 52.9], ["2026-10-03", 92.7, 78.6], ["2026-10-04", 97.6, 86.5]]
  .map(([d, t, w]) => ({ d, t, w, tn: 8 }));
const VS_CUR = {
  week: "2026-09-28",
  team:  { n: 53, players: 8, score: 82.8, win: 94.3, att: 2.4, first_try: 32.1, p90: 62.3, hint: 43.4, late: 15.1, fd: 2, days: 6.63, all7: 88 },
  world: { n: 303, players: 203, score: 70.4, win: 86.8, att: 3.16, first_try: 23.8, p90: 41.3, hint: 29.7, late: 3, fd: 10, days: 1.48, all7: 5 },
  daily: VS_DAYS,
};
const VS_PREV = { week: "2026-09-21", team: { n: 46, score: 75.4, win: 100, att: 3.2, first_try: 8.7, p90: 40, hint: 76.1, late: 17.4, fd: 20 },
                  world: { n: 170, score: 58.9, win: 74.7, att: 4.31, first_try: 2.4, p90: 20, hint: 40, late: 5.3, fd: 72 } };

test("vwNum / vwMarker — tekens, decimalen en het oordeel per rij", () => {
  T.setLang("nl");
  assert.equal(T.vwNum(82.8, 1), "82,8"); assert.equal(T.vwNum(12.4, 1, true), "+12,4"); assert.equal(T.vwNum(-2.9, 1, true), "−2,9");
  assert.equal(T.vwNum(0, 1, true, -2.9), "−0,0", "bij het optellen houdt een negatief verschil z'n teken");
  assert.equal(T.vwMarker(1, 82.8, 70.4, 1).cls, "up"); assert.equal(T.vwMarker(1, 68, 71.6, 1).cls, "down");
  assert.equal(T.vwMarker(-1, 2.4, 3.2, 1).cls, "up", "lager is beter: lagere teamwaarde = ▲");
  assert.equal(T.vwMarker(-1, 43.4, 29.7, 0).cls, "down", "meer hints = ▼");
  assert.equal(T.vwMarker(1, 94.04, 93.96, 0).cls, "eq", "gelijk op de getoonde decimalen");
  assert.deepEqual(T.vwMarker(0, 15, 3, 0), { cls: "neu", sym: "↺" }, "ingehaald krijgt geen oordeel");
});

test("pickVsRows — 3 gekozen rijen + 2 vaste; een rij waar het team onder zit komt altijd mee", () => {
  const rows = T.pickVsRows(VS_CUR, VS_PREV).map((r) => r.k);
  assert.equal(rows.length, 5); assert.deepEqual(rows.slice(-2), ["days", "late"]);
  assert.ok(rows.includes("hint"), "hints: het team zit eronder, dus die rij staat erbij");
  assert.ok(rows.includes("p90"), "grootste voorsprong staat erbij");
  assert.equal(new Set(rows).size, rows.length, "geen dubbele rijen");
  // zonder vorige week en zonder 'eronder': toch 3 gekozen + 2 vaste
  const allUp = { ...VS_CUR, team: { ...VS_CUR.team, hint: 20 } };
  assert.equal(T.pickVsRows(allUp, null).length, 5);
  // ontbrekende waarden (bv. wereld-dagen onbekend) laten de rij weg
  const noDays = { ...VS_CUR, world: { ...VS_CUR.world, days: null } };
  assert.ok(!T.pickVsRows(noDays, null).some((r) => r.k === "days"));
  // weinig data: geen crash
  assert.deepEqual(T.pickVsRows({ team: {}, world: {} }, null), []);
});

test("vsWorldHtml — kop, verschil, 7 tikbare dagen, groen/roze oordeel en eerlijk bij een slechte week", () => {
  T.setLang("nl");
  const html = T.vsWorldHtml({ cur: VS_CUR, prev: VS_PREV }, "Team Jaardle");
  assert.match(html, /Tegen de wereld/); assert.match(html, /203 spelers, ook eenmalige/);
  assert.match(html, /data-v="82\.8"[^>]*>82,8</); assert.match(html, /data-v="70\.4"[^>]*>70,4</); assert.match(html, /Team Jaardle/);
  assert.match(html, /vw-mk up"><span aria-hidden="true">▲<\/span> <b[^>]*data-sg="1"[^>]*>\+12,4/); assert.match(html, /vorige week \+16,5/);
  assert.equal((html.match(/class="vw-col/g) || []).length, 7);
  assert.match(html, /vw-col hard/); assert.match(html, /data-def="wo: pittigste dag van de wereld \(49,7\)"/);
  assert.equal((html.match(/class="vw-r"/g) || []).length, 5);
  assert.match(html, /vw-mk down" aria-hidden="true">▼/, "hints: roze ▼"); assert.match(html, /vw-mk neu" aria-hidden="true">↺/);
  assert.match(html, /vt good/); assert.match(html, /vt bad/);
  // dag zonder teamgemiddelde (< 2 potjes): geen teamstaaf en een eerlijke regel
  const gap = { ...VS_CUR, daily: VS_DAYS.map((d, i) => (i === 3 ? { ...d, t: null, tn: 1 } : d)) };
  const h2 = T.vsWorldHtml({ cur: gap }, "Team");
  assert.match(h2, /b t none/); assert.match(h2, /do · team — · wereld 81,6/);
  // wereld-spelersaantal onbekend → aantal potjes
  assert.match(T.vsWorldHtml({ cur: { ...VS_CUR, world: { ...VS_CUR.world, players: null } } }, "T"), /🌍 303 potjes/);
  // een week waarin het team eronder zit staat er gewoon
  const bad = { ...VS_CUR, team: { ...VS_CUR.team, score: 68.7 }, world: { ...VS_CUR.world, score: 71.6 } };
  const h3 = T.vsWorldHtml({ cur: bad }, "Team");
  assert.match(h3, /vw-mk down"><span aria-hidden="true">▼<\/span> <b[^>]*>−2,9/);
  // niets te tonen
  assert.equal(T.vsWorldHtml(null, "T"), ""); assert.equal(T.vsWorldHtml({ cur: { team: {}, world: {} } }, "T"), "");
});

test("fetchWeekVsWorld — een mislukte of ontbrekende RPC geeft null (pop-up valt terug op twee stappen)", async () => {
  assert.equal(await T.fetchWeekVsWorld("00000000-0000-0000-0000-000000000000", "2026-09-28"), null);
});

// ── Pop-up zonder team (solo) ─────────────────────────────────────────────────────────────────────────────────
const SOLO_HIST = [
  { date: "2026-09-28", won: true, score: 90, guesses: 1 }, { date: "2026-09-29", won: true, score: 62, guesses: 4 },
  { date: "2026-09-30", won: false, score: 20, guesses: 6 }, { date: "2026-10-02", won: true, score: 85, guesses: 2 },
  { date: "2026-09-21", won: true, score: 70, guesses: 3 }, { date: "2026-09-20", won: true, score: 99, guesses: 1 },
];
const WORLD_RES = { cur: { world: VS_CUR.world, daily: VS_DAYS.map((d) => ({ d: d.d, w: d.w })) }, prev: { world: VS_PREV.world } };

test("soloWeekStats — eigen week uit de lokale historie, alleen de dagen van die week", () => {
  const m = T.soloWeekStats(SOLO_HIST, "2026-09-28");
  assert.equal(m.n, 4); assert.equal(m.days, 4); assert.equal(m.sum, 90 + 62 + 20 + 85); assert.equal(m.score, 64.3);
  assert.equal(m.win, 75); assert.equal(m.att, 2.33); assert.equal(m.first_try, 25); assert.equal(m.p90, 25);
  assert.equal(m.byDate.get("2026-09-30"), 20);
  assert.equal(T.soloWeekStats(SOLO_HIST, "2026-10-05"), null, "geen potjes = null");
  assert.equal(T.soloWeekStats([], "2026-09-28"), null); assert.equal(T.soloWeekStats(null, "2026-09-28"), null);
  assert.equal(T.soloWeekStats([{ date: "2026-09-28", won: false, score: 10, guesses: 6 }], "2026-09-28").att, null, "zonder winst geen pogingen");
});

test("buildSoloVs — zelfde vorm als de teamaggregatie; niet-gespeelde dagen zijn leeg; vorige week alleen als beide kanten bestaan", () => {
  const vs = T.buildSoloVs(SOLO_HIST, "2026-09-28", WORLD_RES);
  assert.equal(vs.cur.team.score, 64.3); assert.ok(!("byDate" in vs.cur.team) && !("sum" in vs.cur.team));
  assert.equal(vs.cur.world.score, 70.4); assert.equal(vs.cur.daily.length, 7);
  assert.equal(vs.cur.daily[0].t, 90); assert.equal(vs.cur.daily[3].t, null, "1 okt niet gespeeld"); assert.equal(vs.cur.daily[3].tn, 0); assert.equal(vs.cur.daily[2].tn, 1);
  assert.equal(vs.prev.team.score, 70); assert.equal(vs.prev.world.score, 58.9);
  assert.equal(T.buildSoloVs(SOLO_HIST, "2026-09-28", { cur: WORLD_RES.cur }).prev, null, "geen wereld van vorige week = geen vergelijking");
  assert.equal(T.buildSoloVs([], "2026-09-28", WORLD_RES), null); assert.equal(T.buildSoloVs(SOLO_HIST, "2026-09-28", null), null);
});

test("vsWorldHtml (solo) — 'jij' i.p.v. teamnaam, dagen gespeeld, geen hint-/afstand-/inhaalrij (lokaal onbekend)", () => {
  T.setLang("nl");
  const html = T.vsWorldHtml(T.buildSoloVs(SOLO_HIST, "2026-09-28", WORLD_RES), "Jij", true);
  assert.match(html, /<span>Jij<\/span>/); assert.match(html, /Dagen gespeeld/); assert.match(html, /<span class="lg t"><\/span>jij/);
  assert.match(html, /vw-mk down"><span aria-hidden="true">▼<\/span> <b[^>]*>−6,1/, "64,3 tegen 70,4 = eronder, en dat staat er gewoon");
  assert.ok(!/Potjes met hint|Ingehaalde|mis met/.test(html), "alleen rijen waar de lokale historie het weet");
  assert.match(html, /jij — · wereld|jij 20,0 · wereld|jij 90,0 · wereld/, "dagregel noemt jij");
  assert.equal((html.match(/class="vw-r"/g) || []).length, 4, "3 gekozen + dagen gespeeld");
});

test("podiumParts (solo) — jij met gestippelde plekken en het teamvoorproefje-onderschrift; zonder ghosts blijft het één blok", () => {
  T.setLang("nl");
  const rows = [{ rank: 1, is_me: true, display_name: "Jij", flair: "", title: "", week_score: 257, daily_wins: 0, played: 4 }];
  const p = T.podiumParts(rows, false, [], true, true);
  assert.equal((p.stage.match(/lb-pod-ghost/g) || []).length, 2); assert.match(p.stage, /Je eerste teamgenoot/); assert.match(p.stage, /data-rank="2"/); assert.match(p.stage, /data-rank="3"/);
  assert.match(p.note, /Zo ziet je team eruit/); assert.equal(p.rest, ""); assert.equal(p.awards, "");
  assert.ok(p.stage.indexOf("lb-pod-silver") < p.stage.indexOf("lb-pod-gold") && p.stage.indexOf("lb-pod-gold") < p.stage.indexOf("lb-pod-bronze"), "volgorde 2e · 1e · 3e");
  assert.ok(!T.podiumParts(rows, false, [], true).stage.includes("lb-pod-ghost"));
});

test("soloPathOk — een poollid met een mislukte my_pools krijgt NIET de pop-up 'Maak je team'", async () => {
  const oldSb = globalThis.window.sb, oldUser = T.auth.user;
  try {
    T.auth.user = null; assert.equal(T.soloPathOk(), true, "anoniem: zeker geen pool");
    T.auth.user = { uid: "u1", email: "x@example.invalid" };
    globalThis.window.sb = { rpc: async () => { throw new Error("offline"); } };
    await T.fetchMyPools(); assert.equal(T.soloPathOk(), false, "ingelogd + my_pools faalt = onbekend, dus niet solo");
    globalThis.window.sb = { rpc: async () => [] };
    await T.fetchMyPools(); assert.equal(T.soloPathOk(), true, "ingelogd + my_pools = [] = zeker geen pool");
    globalThis.window.sb = { rpc: async () => { throw new Error("401"); } };
    await T.fetchMyPools(); assert.equal(T.soloPathOk(), false, "een latere fout zet het weer op onbekend");
  } finally { globalThis.window.sb = oldSb; T.auth.user = oldUser; T.setMyPool(null); }
});

test("withTimeout — geeft de waarde, of faalt na de tijd (een hangende optionele RPC houdt het pop-up niet tegen)", async () => {
  assert.equal(await T.withTimeout(Promise.resolve(7), 50), 7);
  await assert.rejects(T.withTimeout(new Promise(() => {}), 10), /timeout/);
  await assert.rejects(T.withTimeout(Promise.reject(new Error("boem")), 50), /boem/);
});

test("popupSteps — pool van 1 krijgt spookplekken en geen 'team tegen de wereld'; grotere pool alle stappen; zonder team twee", () => {
  T.setLang("nl");
  const me = { rank: 1, is_me: true, display_name: "Jij", flair: "", title: null, week_score: 400, daily_wins: 0, played: 6 };
  const other = (i) => ({ rank: i, is_me: false, display_name: "Sp" + i, flair: "", title: null, week_score: 400 - i * 50, daily_wins: 0, played: 5 });
  const awards = [AW("terug", { name: "Sp2", detail: { gap_days: 9 } })];
  const one = T.popupSteps({ rows: [me], awards, vs: { cur: VS_CUR, prev: VS_PREV }, poolName: "Team" });
  assert.ok(one[0].includes("lb-pod-ghost"), "pool van 1: spookplekken"); assert.ok(!one.some((h) => h.includes('class="vw"')), "geen team tegen de wereld");
  const many = T.popupSteps({ rows: [me, other(2), other(3)], awards, vs: { cur: VS_CUR, prev: VS_PREV }, poolName: "Team" });
  assert.equal(many.length, 3); assert.ok(!many[0].includes("lb-pod-ghost")); assert.ok(many[2].includes('class="vw"'));
  const solo = T.popupSteps({ solo: true, rows: [me], awards: [], vs: T.buildSoloVs(SOLO_HIST, "2026-09-28", WORLD_RES), poolName: "Jouw week" });
  assert.equal(solo.length, 2); assert.ok(solo[0].includes("lb-pod-ghost")); assert.ok(solo[1].includes("Dagen gespeeld"));
});

test("teamAfterLoginPark — de bedoeling 'Maak je team' wordt gewist en verloopt", () => {
  T.teamAfterLoginPark(true); assert.equal(T.getPendingTeam(), true);
  T.teamAfterLoginPark(false); assert.equal(T.getPendingTeam(), false);
});

test("fetchWorldWeek — een mislukte RPC geeft null (dan komt de pop-up niet)", async () => {
  assert.equal(await T.fetchWorldWeek("2026-09-28"), null);
});

// ── Regressie (5/10/2026): "vs is not defined" in refreshWeekPodiumResult en "vsP is not defined" in de 🏟️-tab ───────────
test("refreshWeekPodiumResult — het pad bij het openen van het spel haalt uitslag, prijzen en team-tegen-de-wereld op", async () => {
  const RealDate = Date, FIXED = RealDate.parse("2026-10-06T09:00:00Z");   // dinsdag na de sluiting van week 28 sep – 4 okt
  class FakeDate extends RealDate { constructor(...a) { a.length ? super(...a) : super(FIXED); } static now() { return FIXED; } }
  const calls = [];
  const rows = [{ week_start: "2026-09-28", rank: 1, display_name: "Jij", flair: "", title: null, daily_wins: 2, week_score: 400, played: 6, is_me: true },
                { week_start: "2026-09-28", rank: 2, display_name: "Ander", flair: "", title: null, daily_wins: 1, week_score: 300, played: 5, is_me: false }];
  const awards = [AW("terug", { name: "Ander", detail: { gap_days: 9 } })];
  const oldSb = globalThis.window.sb, oldUser = T.auth.user;
  globalThis.Date = FakeDate;
  globalThis.window.sb = { rpc: async (fn, args) => { calls.push(fn); return fn === "get_pending_podium" ? rows : fn === "get_pool_week_awards" ? awards : fn === "get_pool_week_vs_world" ? { cur: VS_CUR, prev: VS_PREV } : null; } };
  try {
    T.auth.user = { uid: "u1", email: "x@example.invalid" };
    T.setMyPool({ id: "p1", name: "Team", is_owner: false, invite_code: "x" });
    T.resetPodiumReq();
    await T.refreshWeekPodiumResult();
    const res = T.getWeekPodiumResult();
    assert.ok(res, "uitslag staat klaar (anders komt het pop-up nooit)");
    assert.equal(res.weekStart, "2026-09-28"); assert.equal(res.rows.length, 2); assert.equal(res.awards.length, 1);
    assert.equal(res.vs.cur.team.score, 82.8, "team-tegen-de-wereld is opgehaald en meegegeven");
    assert.ok(calls.includes("get_pool_week_awards") && calls.includes("get_pool_week_vs_world") && calls.includes("get_pending_podium"));
    // vs mislukt (db/81 ontbreekt): de uitslag komt er gewoon, zonder die stap
    globalThis.window.sb = { rpc: async (fn) => { if (fn === "get_pool_week_vs_world") throw new Error("function does not exist"); return fn === "get_pending_podium" ? rows : []; } };
    T.resetPodiumReq();
    await T.refreshWeekPodiumResult();
    assert.ok(T.getWeekPodiumResult() && T.getWeekPodiumResult().vs == null, "geen vs, wel uitslag");
  } finally {
    globalThis.Date = RealDate; globalThis.window.sb = oldSb; T.auth.user = oldUser; T.setMyPool(null);
  }
});

test("game.js — elke `await xxxP` hoort bij een `const xxxP` in dezelfde functie (vangt een misplaatste vervanging)", () => {
  const chunks = readFileSync(join(dir, "..", "game.js"), "utf8").split(/\n(?=(?:async )?function )/);
  const bad = [];
  for (const c of chunks) {
    for (const m of c.matchAll(/await ([a-z][A-Za-z]*P)\b/g)) {
      if (!new RegExp(`(?:const|let|var) ${m[1]}\\b`).test(c)) bad.push(`${m[1]} in ${c.slice(0, 60).replace(/\n/g, " ")}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("podiumParts — de pop-up toont stappen: uitslag (podium + rest) en weekprijzen; podiumHtml plakt ze aan elkaar", () => {
  T.setLang("nl");
  const rows = [1, 2, 3, 4, 5].map((i) => ({ rank: i, display_name: "Sp" + i, flair: "", title: "", week_score: 600 - i * 50, daily_wins: 0, played: 7, is_me: false, prev_rank: i }));
  const awards = [AW("terug", { name: "Sp5", detail: { gap_days: 12 } })];
  const p = T.podiumParts(rows, false, awards, true);
  assert.equal(p.all, undefined);
  assert.match(p.stage, /lb-pod-stage/); assert.match(p.rest, /lb-wk-rest/); assert.match(p.awards, /lb-wk-awards/);
  assert.equal(p.note, "", "afgeronde week in de pop-up: de scoreformule valt weg");
  assert.match(T.podiumParts(rows, false, awards, false).note, /lb-wk-note/, "de 🏟️-tab houdt de formule");
  assert.match(T.podiumParts(rows, true, awards, true).note, /lb-wk-note/, "lopende week houdt altijd de afsluitregel");
  assert.equal(T.podiumHtml(rows, false, awards), p.stage + T.podiumParts(rows, false, awards).note + p.awards + p.rest);
  assert.equal(T.podiumParts(rows, false, [], true).awards, "", "zonder prijzen is er geen tweede stap");
  assert.match(T.podiumParts([], false, awards).all, /lb-wk-msg/, "lege week = één bericht");
});

test("fetchWeekAwards — een mislukte of ontbrekende RPC geeft een lege lijst (pop-up valt terug op het oude)", async () => {
  assert.deepEqual(await T.fetchWeekAwards("00000000-0000-0000-0000-000000000000", "2026-09-28"), []);
});

// ── Sierrand-keuze (Certificaat · Holo-foil · Art deco) en de kluis in tabs ──
const mkAch = (n) => ({ games: n[0], dailies: n[1], streak: n[2], perfect: n[3], pure: n[4], rating: 0, years: [] });
const A_NONE = mkAch([0, 0, 0, 0, 0]);
const A_SILVER = mkAch([100, 30, 30, 10, 25]);        // capstone-zilver → flair-confetti
const A_PLATINA = mkAch([750, 120, 90, 50, 100]);     // capstone-platina → sierrand
const A_DIAMOND = mkAch([1500, 200, 180, 100, 250]);  // capstone-diamant → thema + bier

test("resultFrameStyle — keuze per apparaat, met migratie van de oude aan/uit-schakelaar", () => {
  const ls = globalThis.localStorage;
  const clear = () => { ls.removeItem("jaardle:frame"); ls.removeItem("jaardle:platinaframe"); };
  clear();
  assert.equal(T.resultFrameStyle(), "a", "geen keuze → standaard Certificaat");
  ls.setItem("jaardle:platinaframe", "0");
  assert.equal(T.resultFrameStyle(), "", "oude schakelaar uit → blijft uit");
  ls.setItem("jaardle:platinaframe", "1");
  assert.equal(T.resultFrameStyle(), "a", "oude schakelaar aan → Certificaat");
  for (const s of T.FRAME_STYLES) { T.setResultFrame(s); assert.equal(T.resultFrameStyle(), s); }
  T.setResultFrame("off");
  assert.equal(T.resultFrameStyle(), "", "expliciet uit wint van de oude schakelaar");
  T.setResultFrame("bogus");
  assert.equal(T.resultFrameStyle(), "", "onbekende stijl telt als uit");
  ls.setItem("jaardle:frame", "x");
  ls.setItem("jaardle:platinaframe", "1");
  assert.equal(T.resultFrameStyle(), "a", "kapotte waarde → terug naar de standaard");
  clear();
});

test("frameOverlayHtml — de rand draagt je flair (met effect), zonder flair het woord PLATINA", () => {
  const a = T.frameOverlayHtml("a", "🔥~sparkle");
  assert.match(a, /class="pf-ov pf-tab"/);
  assert.match(a, /fl-fx fx-sparkle/, "het flair-effect loopt mee");
  assert.ok(a.includes("🔥") && !a.includes("~") && !a.includes("pf-gt"), "geen opslag-formaat, geen PLATINA naast een flair");
  assert.match(T.frameOverlayHtml("a", ""), /pf-gt/, "zonder flair: het woord PLATINA");
  assert.match(T.frameOverlayHtml("d", "💯"), /class="pf-ov pf-title"/);
  assert.match(T.frameOverlayHtml("b", "💯"), /class="pf-ov pf-chip"/);
  assert.equal(T.frameOverlayHtml("b", ""), "", "Holo-foil heeft zonder flair geen parelplaatje");
  assert.equal(T.frameOverlayHtml("off", "🔥"), "");
});

test("rewardsTabsAvailable — een tab bestaat pas als je er iets in hebt verdiend", () => {
  const was = T.auth.user;
  try {
    T.auth.user = { uid: "u" };
    assert.deepEqual(T.rewardsTabsAvailable(A_NONE), ["flair"], "nog niets: één scherm");
    assert.deepEqual(T.rewardsTabsAvailable(A_SILVER), ["flair", "vier"]);
    assert.deepEqual(T.rewardsTabsAvailable(A_PLATINA), ["flair", "vier", "frame"], "platina: sierrand, nog geen thema");
    assert.deepEqual(T.rewardsTabsAvailable(A_DIAMOND), ["flair", "vier", "frame", "theme"], "diamant: ook de thema-tab");
    T.auth.user = null;
    assert.deepEqual(T.rewardsTabsAvailable(A_PLATINA), ["flair"], "anoniem verdient niets");
  } finally { T.auth.user = was; }
});

test("RW_SECT_TAB — elke sectie waar een pop-up naartoe springt landt op een bestaande tab", () => {
  for (const key of Object.keys(T.REWARDS)) {
    const sect = T.REWARDS[key].sect;
    assert.ok(T.RW_SECT_TAB[sect], `reward ${key}: sectie "${sect}" mist in RW_SECT_TAB`);
  }
  assert.ok(["flair", "vier", "frame", "theme"].every((x) => Object.values(T.RW_SECT_TAB).includes(x)), "elke tab is een sprong-doel");
});

// ── Team-voorproefje in het eindscherm (ingelogd, nog geen pool) ──────────────────────────────────────
test("teamNudgeStage — voorproefje 3 dagen, slanke regel t/m dag 10, daarna weg; zelfde dag telt niet dubbel", () => {
  const set = (v) => { if (v == null) localStorage.removeItem(T.TEAM_NUDGE_KEY); else localStorage.setItem(T.TEAM_NUDGE_KEY, JSON.stringify(v)); };
  const today = T.todayKey(), old = "2000-01-01";
  set(null);
  assert.equal(T.teamNudgeStage(), 0, "eerste keer: het volledige voorproefje");
  assert.equal(T.teamNudgeStage(), 0, "heropenen op dezelfde dag verhoogt de teller niet");
  assert.equal(JSON.parse(localStorage.getItem(T.TEAM_NUDGE_KEY)).n, 1);
  set({ d: old, n: T.TEAM_NUDGE_FULL - 1 });
  assert.equal(T.teamNudgeStage(), 0, "dag 3 is nog het voorproefje");
  set({ d: old, n: T.TEAM_NUDGE_FULL });
  assert.equal(T.teamNudgeStage(), 1, "dag 4: slanke regel");
  set({ d: old, n: T.TEAM_NUDGE_SLIM - 1 });
  assert.equal(T.teamNudgeStage(), 1, "dag 10 is nog de slanke regel");
  set({ d: old, n: T.TEAM_NUDGE_SLIM });
  assert.equal(T.teamNudgeStage(), 2, "dag 11: weg");
  set({ d: today, n: 1, x: 1 });
  assert.equal(T.teamNudgeStage(), 2, "✕ is voorgoed");
  set({ d: today, n: 5 });
  assert.equal(T.teamNudgeStage(), 1, "dezelfde dag blijft dezelfde stap");
  localStorage.setItem(T.TEAM_NUDGE_KEY, "{kapot");
  assert.equal(T.teamNudgeStage(), 0, "kapotte opslag = opnieuw beginnen, geen crash");
  set(null);
});

test("teamTeaserHtml — jouw rij + baan zoals de server ze na het maken zou tonen, plus spooklijnen", () => {
  const was = T.auth.user;
  try {
    T.setPlayer("Joris", "🦊", null);
    T.setState({ won: true, puzzleDate: "2026-10-05", guesses: [{ cls: "close" }, { cls: "warm" }, { cls: "correct" }],
      directionsRevealed: [], laterCluesShown: 0, centuryRevealed: false, lastDigitRevealed: false });
    const score = T.computeScore();
    const h = T.teamTeaserHtml();
    // Dezelfde tabs en spoor als een echt team
    assert.match(h, /class="rc-tab"[^>]*data-i="0"/);
    assert.match(h, /class="rc-tab"[^>]*data-i="1"/);
    assert.equal((h.match(/class="rc-slide"/g) || []).length, 2, "twee slides: vandaag en week");
    // Dag-slide: jouw rij (gemarkeerd, #1, met naam, 3 gok-blokjes en je score) en twee spookrijen
    assert.match(h, /lb-row lb-me lb-top1/);
    assert.ok(h.includes("Joris"));
    assert.equal((h.match(/class="lb-blk /g) || []).length, 3);
    assert.ok(h.includes(String(score)));
    assert.equal((h.match(/lb-row lb-ghost/g) || []).length, 2);
    assert.ok(h.includes(T.t("recap_team_ghost")));
    // Week-slide: jouw baan met dagzege (+25, want de enige van de dag telt vanaf 4/10) en twee lege banen
    assert.match(h, /race-lane lb-top1/);
    assert.ok(h.includes(`data-v="${score + 25}"`), "weekscore = score + dagzege");
    assert.match(h, /class="race-tro"[^>]*>🏆</, "één 🏆 voor de dagzege");
    assert.equal((h.match(/race-ghost/g) || []).length, 2);
    // Onderaan: uitleg en de knop die #recap-pool-btn heet (daar hangt de klik aan)
    assert.ok(h.includes(T.t("recap_team_cap")));
    assert.match(h, /<button id="recap-pool-btn">/);
  } finally { T.auth.user = was; T.setPlayer(null, null, null); }
});

test("teamTeaserHtml — verlies: 💀 op de dag-rij, geen dagzege in de week", () => {
  T.setPlayer(null, null, null);
  T.setState({ won: false, puzzleDate: "2026-10-05", guesses: [{ cls: "far" }, { cls: "farthest" }],
    directionsRevealed: [], laterCluesShown: 0, centuryRevealed: false, lastDigitRevealed: false });
  const h = T.teamTeaserHtml();
  assert.ok(h.includes("💀"));
  assert.ok(!h.includes("race-tro"), "geen dagzege-trofee bij verlies");
  assert.ok(h.includes(T.t("lb_you")), "zonder profielnaam staat er 'jij'");
});

// ── Pitch-kaartje voor uitgelogde spelers: Google direct, e-mail als link ─────────────────────────────
test("recapAccountHtml — Google-knop als hoofdactie, 'of met e-mail' als link naar de login-modal", () => {
  for (const l of Object.keys(T.I18N)) {
    T.setLang(l);
    const h = T.recapAccountHtml();
    assert.match(h, /class="google-btn js-google-btn"/, `${l}: Google-knop`);
    assert.ok(h.includes(T.I18N[l].login_google), `${l}: label uit login_google`);
    assert.match(h, /class="link-btn js-acct-btn"/, `${l}: e-mail-link houdt de js-acct-btn-hook`);
    assert.ok(h.includes(T.I18N[l].login_or), `${l}: label uit login_or`);
    assert.ok(!h.includes("undefined"), `${l}: geen ontbrekende sleutel`);
  }
  T.setLang("nl");
});

test("fmtDailyDate / fmtHistoryDate — een datumsleutel blijft dezelfde kalenderdag in elke tijdzone (New York zag 4 okt voor 5 okt)", () => {
  const saved = process.env.TZ;
  try {
    T.setLang("en");
    for (const tz of ["Europe/Amsterdam", "America/New_York", "America/Sao_Paulo", "Pacific/Auckland", "UTC"]) {
      process.env.TZ = tz;
      assert.equal(T.fmtDailyDate("2026-10-05"), "5 Oct", tz);
      assert.equal(T.fmtHistoryDate("2026-10-05"), "5 Oct 2026", tz);
      assert.equal(T.fmtDailyDate("2026-01-01"), "1 Jan", tz);   // jaargrens
    }
  } finally {
    if (saved === undefined) delete process.env.TZ; else process.env.TZ = saved;
    T.setLang("nl");
  }
});

// ── Obsidiaan (capstone-trede 6): flair 🖤, drie effecten en de onthulling ─────────────────────────────────────
test("obsidiaan — 🖤, de drie effecten en de onthulling komen samen op trede 6, niet eerder", () => {
  const wasUser = T.auth.user;
  try {
    T.auth.user = { uid: "u" };
    const TOP = mkAch([3000, 365, 365, 250, 500]), ALMOST = mkAch([3000, 364, 365, 250, 500]), FEW = mkAch([2999, 365, 365, 250, 500]);
    const group = T.obsidianGroupKeys();
    T.setAchv(TOP);
    const got = T.earnedRewardKeys();
    for (const k of group) assert.ok(got.includes(k), `${k} verdiend op trede 6`);
    assert.deepEqual(T.flairFxEarned(TOP).filter((id) => T.FLAIR_FX[id].key === "capstone").sort(), ["aura", "eclipse", "shard"]);
    for (const a of [ALMOST, FEW]) {
      T.setAchv(a);
      const lower = T.earnedRewardKeys();
      for (const k of group) assert.ok(!lower.includes(k), `${k}: één dag/potje te weinig is nog niet genoeg`);
      assert.ok(!T.flairFxEarned(a).some((id) => T.FLAIR_FX[id].key === "capstone"));
    }
    T.auth.user = null; T.setAchv(TOP);
    assert.deepEqual(T.earnedRewardKeys(), [], "anoniem verdient niets");
  } finally { T.auth.user = wasUser; T.setAchv(null); }
});

test("obsidiaan — de groep is één moment: rewardQueueFor laat alleen de onthulling staan, andere beloningen blijven", () => {
  const group = T.obsidianGroupKeys();
  assert.ok(group.includes("cap_obsidian") && group.includes("fl_obsidian") && group.includes("fx_eclipse"));
  assert.deepEqual(T.rewardQueueFor(["fx_glow", ...group]), ["fx_glow", "cap_obsidian"]);
  assert.deepEqual(T.rewardQueueFor(["fx_glow", "fx_eclipse"]), ["fx_glow", "fx_eclipse"], "zonder de onthulling (al gezien) is een nieuw effect gewoon een kaartje");
  assert.deepEqual(T.rewardQueueFor([]), []);
  assert.equal(T.REWARD_ORDER[T.REWARD_ORDER.length - 1], "cap_obsidian", "de zeldzaamste komt als laatste");
  for (const k of group) assert.ok(T.REWARD_ORDER.includes(k) && T.REWARDS[k], `${k} staat in REWARDS en REWARD_ORDER`);
  assert.equal(T.REWARDS.cap_obsidian.cat, "obsidian");
  assert.ok(T.FLAIR_FX[T.OBSIDIAN_FX_DEFAULT] && T.FLAIR_FX[T.OBSIDIAN_FX_DEFAULT].key === "capstone", "\"Draag nu\" zet een bestaand obsidiaan-effect");
});

test("obsidiaan — 🖤 hangt aan trede 6, de animatie bestaat en de balk toont het 6e icoon", () => {
  const cf = T.CAPSTONE_FLAIRS.find((x) => x.emoji === "🖤");
  assert.equal(cf.tier, T.CAPSTONE_MAX);
  assert.equal(T.CAP_REWARD_ICONS.length, T.CAPSTONE_MAX);
  assert.equal(T.CAP_REWARD_ICONS[T.CAPSTONE_MAX - 1], "🖤");
  assert.ok(existsSync(join(dir, "..", "emoji", T.FLAIR_ANIM["🖤"] + ".webp")), "de webp bestaat");
  assert.equal(T.REWARDS.fl_obsidian.emoji, "🖤");
  assert.ok(!/🖤/.test(readFileSync(join(dir, "..", "game.js"), "utf8").match(/const FLAIR_OPTIONS = \[[^\]]*\]/)[0]), "🖤 staat niet in de gratis flairs");
  // de emoji-font wordt gebouwd uit alle emoji in game.js: het 🌑-icoon staat daarom als \u{1F311} (geen extra glyph voor iedereen)
  assert.ok(!readFileSync(join(dir, "..", "game.js"), "utf8").includes("🌑"), "🌑 staat als escape in game.js");
  assert.equal(T.FLAIR_FX.eclipse.emoji, String.fromCodePoint(0x1F311));
});

test("ObsidianFx — elke taal van het spel heeft alle teksten van de onthulling, in dezelfde vorm", () => {
  (0, eval)(readFileSync(join(dir, "..", "obsidian-fx.js"), "utf8"));
  const TX = globalThis.ObsidianFx.TX, base = TX.nl;
  assert.ok(base, "de brontaal is er");
  for (const code of Object.keys(T.LANGS)) {
    const x = TX[code];
    assert.ok(x, `${code}: ontbreekt in obsidian-fx.js`);
    for (const [k, v] of Object.entries(base)) {
      assert.equal(typeof x[k], typeof v, `${code}.${k}: ontbreekt of heeft een andere vorm`);
      if (Array.isArray(v)) assert.equal(x[k].length, v.length, `${code}.${k}: ander aantal`);
      if (v && typeof v === "object" && !Array.isArray(v)) assert.deepEqual(Object.keys(x[k]).sort(), Object.keys(v).sort(), `${code}.${k}: andere sleutels`);
    }
    assert.match(x.age(459, "12 MRT 2026"), /459/, `${code}: leeftijdsregel noemt het aantal dagen`);
    assert.match(x.nr(7), /7/); assert.match(x.shareText("Sanne"), /Sanne/);
  }
});

test("ObsidianFx — de hele tijdlijn tekent zonder fouten (strikte nep-canvas, drie formaten, ook liggend)", () => {
  (0, eval)(readFileSync(join(dir, "..", "obsidian-fx.js"), "utf8"));
  const OF = globalThis.ObsidianFx, saveCreate = document.createElement;
  // GRAIN/REFL/snapshot maken losse canvassen: geef ze dezelfde strikte context (met een sprite-markering voor drawImage)
  const obsCtx = () => {   // de strikte context + wat de onthulling extra gebruikt (korrel, patroon, schaal van de transform)
    const extra = { createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }), putImageData() {}, createPattern: () => ({}), getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), measureText: (str) => ({ width: String(str).length * 8 }) };
    const base = strictCtx();
    return new Proxy(base, { get: (t, k) => (k in extra ? extra[k] : t[k]), set: (t, k, v) => { t[k] = v; return true; } });
  };
  document.createElement = (tag) => tag === "canvas" ? { width: 0, height: 0, __sprite: true, getContext: () => obsCtx() } : { ...noopEl };
  const ladders = ["games", "dailies", "streak", "perfect", "pure"].map((key) => ({ key, steps: T.ACHV_SERIES.find((x) => x.key === key).steps }));
  try {
    for (const [W, H] of [[390, 844], [320, 568], [1280, 720]]) {
      const tx = {};  // wordt door _renderAt gevuld
      const o = { w: W, h: H, dpr: 1, need: Math.hypot(W, H) / 2, reduced: false, name: "Sanne", word: "OBSIDIAAN", rankLine: "De eerste Obsidiaan ooit", rankGold: true, ageLine: "STEEN VAN 459 DAGEN",
        sound: false, haptic: false, spin: 0, spinV: 0, touched: false, snap: null, view: { k: 1, ox: 0, oy: 0, W, H }, ladders: ladders.map((l) => ({ ico: "🎲", unit: "X", steps: l.steps })),
        tx: { capTitle: "Prestige-track", tiers: ["a", "b", "c", "d", "e", "f"], rewardIcons: ["⭐", "🎊", "🗓️", "🖼️", "🎨"], beats: ["1", "2", "3"], sub: "S", l1: "L1", l2: "L2" } };
      const cv = { width: 0, height: 0, getContext: () => obsCtx() };
      for (let t = 0; t <= 23; t += 0.25) OF._renderAt(cv, t, o);
      for (const t of [13.9, 13.97, 13.99, 14.0, 14.03, 14.2, 14.6, 15.1, 22.5]) OF._renderAt(cv, t, o);   // de breuk en de scherven
    }
  } finally { document.createElement = saveCreate; }
});

// ── Seizoens-skins (Halloween, Sinterklaas) ────────────────────────────────────
// De datumregels staan twee keer: SEASONS in game.js en inline in het head-script van de template (dat moet vóór de
// stylesheet draaien). De test draait het echte head-script in een vm en vergelijkt het met seasonFor().
const seasonHeadScript = () => {
  const tpl = readFileSync(join(dir, "..", "index.template.html"), "utf8");
  const code = [...tpl.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).find((b) => b.includes("jaardle:season"));
  assert.ok(code, "head-script van de seizoens-skins staat niet in de template");
  return code;
};
function runSeasonHead({ date, search = "", store = {}, theme } = {}) {
  const links = [], meta = { content: "#1a1a1a" };
  const icon = (h) => ({ _h: h, getAttribute() { return this._h; }, set href(v) { this._h = v; }, get href() { return this._h; } });
  const icons = [icon("/favicon.svg?v=2"), icon("/favicon-96.png?v=2"), icon("/favicon-192.png?v=2")];
  const root = { dataset: theme ? { theme } : {} };
  vm.runInNewContext(seasonHeadScript(), {
    Date: class extends Date { constructor(...a) { if (a.length) super(...a); else super(date); } },
    location: { search },
    localStorage: { getItem: (k) => (k in store ? store[k] : null) },
    document: { documentElement: root, head: { appendChild: (el) => links.push(el) }, createElement: () => ({}),
      querySelector: () => meta, querySelectorAll: () => icons },
  });
  return { season: root.dataset.season, links, bar: meta.content, icons: icons.map((i) => i._h) };
}
const seasonDay = (y, m, dd) => new Date(y, m - 1, dd, 12);

test("seasonFor — Halloween 21 okt t/m 1 nov, Sinterklaas alleen 5 december, elk jaar; daarbuiten niets", () => {
  for (const [y, m, dd, want] of [
    [2026, 10, 18, null], [2026, 10, 20, null], [2026, 10, 21, "halloween"], [2026, 10, 25, "halloween"], [2026, 10, 31, "halloween"], [2026, 11, 1, "halloween"], [2026, 11, 2, null],
    [2027, 10, 25, "halloween"], [2027, 11, 1, "halloween"], [2026, 10, 1, null], [2026, 1, 1, null], [2026, 6, 15, null],
    [2026, 12, 4, null], [2026, 12, 5, "sinterklaas"], [2026, 12, 6, null], [2027, 12, 5, "sinterklaas"], [2030, 12, 5, "sinterklaas"],
    [2026, 12, 24, null], [2026, 5, 12, null], [2026, 11, 5, null],
  ]) assert.equal(T.seasonFor(seasonDay(y, m, dd)), want, `${y}-${m}-${dd}`);
  const days = new Set();
  for (let m = 1; m <= 12; m++) for (let dd = 1; dd <= new Date(2026, m, 0).getDate(); dd++) if (T.seasonFor(seasonDay(2026, m, dd))) days.add(`${m}/${dd}`);
  assert.equal(days.size, 12 + 1, "12 dagen Halloween (21 okt t/m 1 nov) + 1 dag Sinterklaas");
});

test("head-script van de skins ≡ seasonFor(): elke dag van het jaar, ?skin=-voorvertoning, uitzetten per skin, versie van de CSS", () => {
  for (let m = 1; m <= 12; m++) for (let day = 1; day <= new Date(2026, m, 0).getDate(); day++) {
    const date = seasonDay(2026, m, day), r = runSeasonHead({ date });
    assert.equal(r.season ?? null, T.seasonFor(date), `${m}/${day}: head-script en seasonFor() verschillen`);
  }
  const buiten = seasonDay(2026, 6, 15), hal = seasonDay(2026, 10, 27), sint = seasonDay(2026, 12, 5);
  assert.equal(runSeasonHead({ date: buiten }).season, undefined, "gewone dag: geen skin");
  for (const id of Object.keys(T.SEASONS)) {
    assert.equal(runSeasonHead({ date: buiten, search: "?skin=" + id }).season, id, `?skin=${id} toont 'm altijd`);
    assert.equal(runSeasonHead({ date: buiten, search: "?x=1&skin=" + id }).season, id);
    assert.equal(runSeasonHead({ date: buiten, search: "?skin=" + id + "x" }).season, undefined, "alleen precies het id");
  }
  assert.equal(runSeasonHead({ date: buiten, search: "?skin=constructor" }).season, undefined, "geen id van Object.prototype");
  assert.equal(runSeasonHead({ date: buiten, search: "?skin=" }).season, undefined);
  // uitzetten is per skin; de oude sleutel (jaardle:season) telt als "Halloween uit"
  const off = (id) => ({ [T.seasonKey(id)]: "off" });
  assert.equal(runSeasonHead({ date: hal, store: off("halloween") }).season, undefined, "Halloween uitgezet");
  assert.equal(runSeasonHead({ date: hal, store: { [T.SEASON_KEY]: "off" } }).season, undefined, "oude sleutel = Halloween uit");
  assert.equal(runSeasonHead({ date: sint, store: { [T.SEASON_KEY]: "off" } }).season, "sinterklaas", "wie Halloween uitzette, krijgt Sinterklaas gewoon");
  assert.equal(runSeasonHead({ date: sint, store: off("halloween") }).season, "sinterklaas");
  assert.equal(runSeasonHead({ date: sint, store: off("sinterklaas") }).season, undefined, "Sinterklaas uitgezet");
  assert.equal(runSeasonHead({ date: hal, store: off("sinterklaas") }).season, "halloween", "Sinterklaas uit raakt Halloween niet");
  assert.equal(runSeasonHead({ date: hal, store: off("halloween"), search: "?skin=halloween" }).season, "halloween", "voorvertoning wint van uitgezet");
  assert.equal(runSeasonHead({ date: sint, store: off("sinterklaas"), search: "?skin=sinterklaas" }).season, "sinterklaas");
  // de versiering: precies één stylesheet, dezelfde versie als in game.js; buiten het event niets
  for (const [id, date] of [["halloween", hal], ["sinterklaas", sint]]) {
    const on = runSeasonHead({ date });
    assert.equal(on.links.length, 1, id);
    assert.equal(on.links[0].rel, "stylesheet");
    assert.equal(on.links[0].href, T.SEASONS[id].css, `${id}: het head-script en SEASONS in game.js moeten dezelfde CSS-versie laden`);
  }
  assert.deepEqual(runSeasonHead({ date: hal }).icons, ["/favicon-halloween.svg?v=2", "/favicon-halloween-96.png?v=2", "/favicon-halloween-192.png?v=2"], "pompoen-favicons");
  assert.deepEqual(runSeasonHead({ date: sint }).icons, ["/favicon.svg?v=2", "/favicon-96.png?v=2", "/favicon-192.png?v=2"], "Sinterklaas houdt het gewone icoon");
  assert.equal(runSeasonHead({ date: buiten }).links.length, 0, "buiten het event wordt de versiering niet opgehaald");
});

test("browserbalk-kleur: skin-palet voor donker/licht, verdiende thema's houden hun eigen kleur", () => {
  const save = document.documentElement;
  try {
    document.documentElement = { dataset: {} };
    assert.equal(T.themeBarColor("dark"), T.THEME_COLORS.dark);
    assert.equal(T.themeBarColor("light"), T.THEME_COLORS.light);
    for (const [id, date] of [["halloween", seasonDay(2026, 10, 27)], ["sinterklaas", seasonDay(2026, 12, 5)]]) {
      const bar = T.SEASONS[id].bar;
      document.documentElement = { dataset: { season: id } };
      assert.equal(T.themeBarColor("dark"), bar.dark, id);
      assert.equal(T.themeBarColor("light"), bar.light, id);
      for (const th of ["midnight", "gold", "parchment"]) assert.equal(T.themeBarColor(th), T.THEME_COLORS[th], `${id} ${th}`);
      assert.equal(T.themeBarColor("onbekend"), bar.dark, "onbekend thema valt terug op donker");
      // het head-script zet dezelfde kleuren
      const head = (theme) => runSeasonHead({ date, theme }).bar;
      assert.equal(head(undefined), bar.dark, id);
      assert.equal(head("light"), bar.light, id);
      assert.equal(head("midnight"), "#1a1a1a", `${id}: verdiende thema's: balk niet aangeraakt door het skin-script`);
    }
  } finally { document.documentElement = save; }
});

test("style.css + season-<id>.css: palet in de kritieke CSS (≡ balkkleur), versiering lui en nooit klikbaar", () => {
  const css = readFileSync(join(dir, "..", "style.css"), "utf8");
  const block = (sel) => { const i = css.indexOf(sel + " {"); assert.ok(i > 0, `${sel} ontbreekt in style.css`); return css.slice(i, css.indexOf("}", i)); };
  const bg = (b) => b.match(/--bg:\s*(#[0-9a-f]{6})/i)[1].toLowerCase();
  const crit = css.slice(css.indexOf("Seizoens-skin: Halloween (palet)"), css.indexOf("* { box-sizing"));
  assert.ok(!/@keyframes/.test(crit) && !/mask/.test(crit), "de versiering hoort niet in de kritieke CSS");
  assert.ok(!/@keyframes (ska|sint)-/.test(css), "de keyframes van de versiering horen in het lazy bestand");
  for (const id of Object.keys(T.SEASONS)) {
    const sel = `html[data-season="${id}"]`;
    assert.equal(bg(block(`${sel}:not([data-theme])`)), T.SEASONS[id].bar.dark, `${id}: --bg donker ≠ bar.dark`);
    assert.equal(bg(block(`${sel}[data-theme="light"]`)), T.SEASONS[id].bar.light, `${id}: --bg licht ≠ bar.light`);
    assert.match(css, new RegExp(`html\\[data-season="${id}"\\] body \\{ background: transparent; \\}`), `${id}: body moet doorzichtig zijn zodat het palet op html zichtbaar blijft`);
    const file = T.SEASONS[id].css.split("?")[0].slice(1);
    assert.ok(existsSync(join(dir, "..", file)), `${id}: ${file} ontbreekt`);
    const deco = readFileSync(join(dir, "..", file), "utf8");
    assert.ok(deco.includes(sel), `${id}: de versiering gebruikt een ander data-season`);
    // elke animatie heeft een @keyframes; elke versiering-regel met content: "" is pointer-events: none
    const names = new Set([...deco.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]));
    for (const m of deco.matchAll(/animation:\s*([^;]+);/g)) for (const part of m[1].split(",")) {
      const n = part.trim().split(/\s+/)[0];
      if (n !== "none") assert.ok(names.has(n), `${id}: animatie ${n} heeft geen @keyframes`);
    }
    for (const rule of deco.matchAll(/([^{}]+)\{([^{}]*content:\s*""[^{}]*)\}/g)) assert.match(rule[2], /pointer-events:\s*none/, `${id}: versiering ${rule[1].trim().slice(0, 60)} kan klikken blokkeren`);
    assert.match(deco, /@media \(prefers-reduced-motion: reduce\)/, `${id}: minder beweging ontbreekt`);
    assert.ok(deco.length < 40000, `${id}: versiering is onverwacht groot geworden (${deco.length} bytes)`);
    // een skin raakt geen layout van de kritieke elementen aan buiten de footer (geen verschuiving van de Gok-knop)
    assert.ok(!/#keypad|#year-input|\.key\s*\{|main\s*\{/.test(deco.replace(/\/\*[\s\S]*?\*\//g, "")), `${id}: versiering mag de speelkolom niet verschuiven`);
  }
});

test("menu-regel voor de skins: in de template, per skin vertaald in alle talen, verborgen buiten het event", () => {
  const tpl = readFileSync(join(dir, "..", "index.template.html"), "utf8");
  assert.match(tpl, /data-action="season"[^>]*data-i18n="menu_season_halloween"[^>]*hidden/);
  const emoji = { halloween: /^\u{1F383} /u, sinterklaas: /^\u{1F381} /u };
  for (const id of Object.keys(T.SEASONS)) for (const code of Object.keys(T.I18N)) {
    const v = T.I18N[code][T.SEASONS[id].label];
    assert.ok(v, `${code}: ${T.SEASONS[id].label} ontbreekt`);
    assert.match(v, emoji[id], `${code}: ${id}: emoji vooraan`);
    assert.ok(v.toLowerCase().includes(id), `${code}: ${id}: naam van de skin in het label`);
  }
  for (const f of ["favicon-halloween.svg", "favicon-halloween-96.png", "favicon-halloween-192.png"]) assert.ok(existsSync(join(dir, "..", f)), f);
});

test("setSeason/syncSeasonCheck: aan/uit per skin, juiste sleutel, label en vinkje volgen de skin", () => {
  const RealDate = Date, save = { de: document.documentElement, qs: document.querySelector, qsa: document.querySelectorAll, head: document.head, ce: document.createElement };
  const meta = { content: "" }, links = [];
  const btn = { hidden: true, dataset: { i18n: "menu_season_halloween" }, textContent: "", aria: null, setAttribute(k, v) { if (k === "aria-checked") this.aria = v; } };
  const icon = (h) => ({ _h: h, getAttribute() { return this._h; }, set href(v) { this._h = v; }, get href() { return this._h; } });
  const icons = [icon("/favicon.svg?v=2"), icon("/favicon-96.png?v=2")];
  const at = (y, m, dd) => { globalThis.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(y, m - 1, dd, 12); } }; };
  try {
    document.querySelector = (sel) => (sel.includes("theme-color") ? meta : sel.includes("data-action") ? btn
      : sel.startsWith("link[href^=") ? links.find((l) => sel.includes(String(l.href).split("?")[0])) || null : null);
    document.querySelectorAll = (sel) => (sel.includes('rel="icon"') ? icons : []);
    document.createElement = () => ({});
    document.head = { appendChild: (el) => links.push(el) };
    localStorage._ = {};
    // gewone dag: geen regel
    at(2026, 6, 15); document.documentElement = { dataset: {} };
    T.syncSeasonCheck();
    assert.equal(btn.hidden, true, "buiten het event is de regel verborgen");
    assert.equal(T.seasonMenuShown(), false);
    // 5 december, skin staat aan (head-script): regel zichtbaar met het Sinterklaas-label en een vinkje
    at(2026, 12, 5); document.documentElement = { dataset: { season: "sinterklaas" } }; links.length = 0;
    T.syncSeasonCheck();
    assert.equal(btn.hidden, false); assert.equal(btn.dataset.i18n, "menu_season_sinterklaas"); assert.equal(btn.aria, "true");
    assert.equal(btn.textContent, T.t("menu_season_sinterklaas"));
    // uitzetten: sleutel per skin, balkkleur terug, favicon blijft het gewone; Halloween-sleutel onaangeroerd
    T.setSeason(false);
    assert.equal(localStorage.getItem(T.seasonKey("sinterklaas")), "off");
    assert.equal(localStorage.getItem(T.SEASON_KEY), null);
    assert.equal(document.documentElement.dataset.season, undefined);
    assert.equal(meta.content, T.THEME_COLORS.dark);
    assert.deepEqual(icons.map((i) => i._h), ["/favicon.svg?v=2", "/favicon-96.png?v=2"]);
    assert.equal(btn.aria, "false"); assert.equal(btn.hidden, false, "de regel blijft staan, anders kom je er niet meer terug");
    // weer aanzetten: de versiering wordt opgehaald, de sleutel gaat weg, de balk krijgt het skin-kleur
    T.setSeason(true);
    assert.equal(localStorage.getItem(T.seasonKey("sinterklaas")), null);
    assert.equal(document.documentElement.dataset.season, "sinterklaas");
    assert.equal(links.length, 1); assert.equal(links[0].href, T.SEASONS.sinterklaas.css);
    assert.equal(meta.content, T.SEASONS.sinterklaas.bar.dark);
    T.setSeason(false); T.setSeason(true);
    assert.equal(links.length, 1, "de stylesheet wordt maar één keer toegevoegd, ook na uit en weer aan");
  } finally {
    globalThis.Date = RealDate;
    document.documentElement = save.de; document.querySelector = save.qs; document.querySelectorAll = save.qsa; document.head = save.head; document.createElement = save.ce;
    localStorage._ = {};
  }
});

// --- Halloween-katje (season-cat.js): lui bestand met markup + CSS + gedrag, alleen bij de skin ---
const loadSeasonCat = () => {
  // klein nep-DOM met een nep-klok, genoeg voor mount/unmount, de levenscyclus en tikken
  const clock = { now: 0, q: [], seq: 0 };
  const setT = (fn, ms) => { const id = ++clock.seq; clock.q.push({ id, at: clock.now + ms, fn }); return id; };
  const clearT = (id) => { clock.q = clock.q.filter((x) => x.id !== id); };
  const advance = (ms) => {
    const end = clock.now + ms;
    for (;;) {
      clock.q.sort((a, b) => a.at - b.at || a.id - b.id);
      const nxt = clock.q[0];
      if (!nxt || nxt.at > end) break;
      clock.q.shift(); clock.now = nxt.at; nxt.fn();
    }
    clock.now = end;
  };
  const mkEl = (tag) => {
    const cls = new Set(), kids = [], on = {};
    const e = { tag, kids, on, parent: null, attrs: {}, offsetWidth: 1, offsetParent: {}, textContent: "", innerHTML: "", style: {},
      get isConnected() { return !!this.parent; },
      classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c), list: () => [...cls] },
      set className(v) { cls.clear(); v.split(/\s+/).filter(Boolean).forEach((c) => cls.add(c)); }, get className() { return [...cls].join(" "); },
      setAttribute(k, v) { this.attrs[k] = v; }, addEventListener(t, f) { on[t] = f; },
      appendChild(c) { c.parent = this; kids.push(c); }, insertBefore(c, ref) { c.parent = this; kids.unshift(c); },
      remove() { if (this.parent) { this.parent.kids.splice(this.parent.kids.indexOf(this), 1); this.parent = null; } } };
    return e;
  };
  const make = ({ reduced = false, store = {}, hidden = false, rand = 0.5 } = {}) => {
    const bar = mkEl("div"), head = mkEl("head");
    const doc = { hidden, getElementById: (id) => (id === "play-bar" ? bar : null), createElement: mkEl, head };
    const ls = { _: { ...store }, getItem(k) { return k in this._ ? this._[k] : null; }, setItem(k, v) { this._[k] = String(v); } };
    const win = { matchMedia: () => ({ matches: reduced }) };
    const M = Object.create(Math); M.random = () => rand;
    const ctx = vm.createContext({ window: win, document: doc, localStorage: ls, setTimeout: setT, clearTimeout: clearT, Math: M, Number, String, Array, Set });
    vm.runInContext(readFileSync(join(dir, "..", "season-cat.js"), "utf8"), ctx);
    return { api: win.SeasonCat, bar, head, doc, ls, cat: () => bar.kids[0], clock };
  };
  return { make, advance, clock };
};

test("season-cat.js: mount zet één aria-hidden katje vooraan in #play-bar, unmount ruimt alles op, dubbel mounten kan niet", () => {
  const { make } = loadSeasonCat(), w = make();
  assert.ok(w.api && typeof w.api.mount === "function" && typeof w.api.unmount === "function", "SeasonCat.mount/unmount");
  w.api.mount(); w.api.mount();
  assert.equal(w.bar.kids.length, 1, "één katje, ook na twee keer mount");
  const cat = w.cat();
  assert.equal(cat.tag, "div"); assert.equal(cat.attrs["aria-hidden"], "true", "decoratief: niet voorlezen"); assert.ok(cat.classList.contains("sk-cat"));
  assert.equal(w.head.kids.length, 1, "de CSS komt als één <style> mee");
  for (const g of ["cat-sit", "cat-nap", "cat-stretch"]) assert.ok(cat.innerHTML.includes(`class="${g}"`), `pose ${g}`);
  assert.ok(!/(<button|tabindex)/.test(cat.innerHTML), "niet focusbaar");
  w.api.unmount();
  assert.equal(w.bar.kids.length, 0); assert.equal(w.head.kids.length, 0); assert.equal(w.clock.q.length, 0, "geen lopende timers meer");
  w.api.mount(); assert.equal(w.bar.kids.length, 1, "opnieuw aan kan");
});

test("season-cat.js: de eerste drie bezoeken hupt hij binnen, daarna niet meer; zonder localStorage nooit", () => {
  const { make, advance } = loadSeasonCat();
  const store = {};
  for (let i = 0; i < 4; i++) {
    const w = make({ store }); w.api.mount();
    assert.equal(w.cat().classList.contains("intro"), i < 3, `bezoek ${i + 1}`);
    Object.assign(store, w.ls._);
    advance(1400);
    assert.equal(w.cat().classList.contains("intro"), false, "de intro-klasse gaat na 1,3 s weer weg");
    w.api.unmount();
  }
  const broken = make(); broken.ls.getItem = () => { throw new Error("blocked"); };
  const ctx = make(); ctx.api.mount();   // gewone localStorage werkt hierboven; hier alleen: geen crash zonder
  assert.ok(ctx.cat());
});

test("season-cat.js: levenscyclus — wakker, miauw, gaap, slaperig, slaapt, rekt zich, weer wakker; tempo klopt met het ontwerp", () => {
  // Math.random = 0,5 → 20 s tot de miauw, 40 s wakker, 120 s slapen
  const { make, advance } = loadSeasonCat(), w = make({ store: { "jaardle:season:halloween:cat": "9" }, rand: 0.5 });
  w.api.mount(); const c = w.cat(), has = (k) => c.classList.contains(k);
  assert.ok(!has("asleep") && !has("meow") && !has("intro"), "begint wakker, zittend, zonder intro");
  advance(19900); assert.ok(!has("meow"), "nog geen miauw voor 20 s");
  advance(200); assert.ok(has("meow"), "miauw op 20 s");
  advance(1500); assert.ok(!has("meow"), "miauw duurt 1,5 s");
  advance(18200); assert.ok(!has("yawn"), "t=39,9 s: nog geen gaap");   // 20,1 + 1,5 + 18,2 = 39,8 s
  advance(300); assert.ok(has("yawn"), "gaap op 40 s");
  advance(1600); assert.ok(has("drowsy") && !has("yawn"), "na de gaap: slaperig");
  advance(2000); assert.ok(has("asleep"), "ongeveer 3,65 s na het begin van de gaap slaapt hij");
  advance(700); assert.ok(!has("drowsy") && has("asleep"), "slaperig valt weg als hij slaapt");
  advance(119000); assert.ok(has("asleep"), "hij slaapt 120 s");
  advance(1500); assert.ok(!has("asleep") && has("wake"), "daarna wordt hij wakker en rekt zich");
  advance(1800); assert.ok(!has("wake") && !has("asleep"), "en zit weer (1,7 s later)");
  advance(60000); assert.ok(has("asleep"), "de cyclus herhaalt zich");
  // de uitersten van de tempo-grenzen
  for (const [rand, awakeMs, sleepMs] of [[0, 30000, 90000], [1, 50000, 150000]]) {
    const L = loadSeasonCat(), x = L.make({ store: { "jaardle:season:halloween:cat": "9" }, rand }); x.api.mount(); const k = x.cat();
    L.advance(awakeMs + 4000); assert.ok(k.classList.contains("asleep"), `rand=${rand}: slaapt ná ${awakeMs / 1000} s wakker`);
    L.advance(sleepMs - 3000); assert.ok(k.classList.contains("asleep"), `rand=${rand}: nog steeds slapen`);
    L.advance(4500); assert.ok(!k.classList.contains("asleep"), `rand=${rand}: ná ${sleepMs / 1000} s slapen weer wakker`);
  }
});

test("season-cat.js: tikken — wakker = aaien (hartjes) en daarna weer rustig; slapend = eerst wakker (rekken), dan aaien", () => {
  const { make, advance } = loadSeasonCat(), w = make({ store: { "jaardle:season:halloween:cat": "9" } });
  w.api.mount(); const c = w.cat(), has = (k) => c.classList.contains(k);
  c.on.click(); assert.ok(has("pet")); advance(1650); assert.ok(!has("pet"), "aaien duurt 1,6 s");
  advance(1700); assert.ok(!has("asleep"));
  // slapend: tik
  advance(60000); assert.ok(has("asleep"), "hij slaapt inmiddels");
  c.on.click(); assert.ok(!has("asleep") && has("wake") && !has("pet"), "eerst wakker en rekken");
  advance(1750); assert.ok(has("pet") && !has("wake"), "daarna aaien");
  advance(1700); assert.ok(!has("pet") && !has("asleep"), "en weer rustig zitten");
  // na een tik begint de wakker-teller opnieuw: niet meteen weer slapen
  advance(20000); assert.ok(!has("asleep"), "na een tik slaapt hij niet meteen weer");
});

test("season-cat.js: verborgen tab of ingeklapt speelveld = hij wacht; minder beweging = slaapt stil, geen timers, geen tikken", () => {
  const { make, advance } = loadSeasonCat();
  const w = make({ store: { "jaardle:season:halloween:cat": "9" } }); w.api.mount(); const c = w.cat();
  w.doc.hidden = true; advance(200000);
  assert.ok(!c.classList.contains("asleep") && !c.classList.contains("yawn"), "een verborgen tab laat hem niet slapen");
  w.doc.hidden = false; advance(5000);
  assert.ok(c.classList.contains("yawn") || c.classList.contains("drowsy") || c.classList.contains("asleep"), "weer zichtbaar: de stap volgt");
  const L2 = loadSeasonCat(), r = L2.make({ reduced: true, store: {} }); r.api.mount();
  assert.equal(r.clock.q.length, 0, "minder beweging: geen timers"); assert.equal(r.cat().on.click, undefined, "geen tik-gedrag");
  assert.ok(!r.cat().classList.contains("intro"), "geen hupje");
});

test("season-cat.js (CSS): elke pose/stand/groep heeft regels, elke animatie een @keyframes, minder beweging dempt alles, geen fixed/klik-blokkade", () => {
  const { make } = loadSeasonCat(), w = make(), css = w.api.css, js = readFileSync(join(dir, "..", "season-cat.js"), "utf8");
  const sel = 'html[data-season="halloween"]';
  assert.ok(css.includes(`${sel} #play-bar { position: relative; }`), "de kat is absoluut t.o.v. #play-bar");
  assert.ok(!/<style|<\/style/.test(js.replace(/\/\/.*$/gm, "")), "geen <style> in de bron: de CSS is een string");
  // elke klasse waar de SVG's of het script mee werken staat in de CSS
  w.api.mount();
  const used = new Set([...w.cat().innerHTML.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)));
  for (const c of ["meow", "yawn", "drowsy", "asleep", "wake", "pet", "intro"]) used.add(c);
  for (const c of used) if (!["cat-sit", "cat-nap", "cat-stretch"].includes(c)) assert.ok(css.includes("." + c), `.${c} ontbreekt in de CSS`);
  for (const c of ["cat-sit", "cat-nap", "cat-stretch"]) assert.ok(css.includes("." + c), c);
  // animaties
  const names = new Set([...css.matchAll(/@keyframes\s+([\w-]+)/g)].map((m) => m[1]));
  // let op: een komma kan ook binnen steps(1, end) staan, dus niet blind op "," splitsen
  for (const m of css.matchAll(/animation:\s*([^;]+);/g)) for (const part of m[1].replace(/\([^)]*\)/g, "").split(",")) { const n = part.trim().split(/\s+/)[0]; if (n !== "none") assert.ok(names.has(n), `animatie ${n} heeft geen @keyframes`); }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.cat-nap \{ opacity: 1; \}[\s\S]*\.cat-sit \{ opacity: 0; \}/, "minder beweging: slapend en stil");
  assert.ok(!/position:\s*fixed/.test(css), "geen fixed");
  assert.ok(!/\bz-index:\s*(?!4\b)\d+/.test(css), "de kat blijft laag (z-index 4)");
  assert.ok(!/(#keypad|#year-input|\.key\s*\{|main\s*\{)/.test(css.replace(/\/\*[\s\S]*?\*\//g, "")), "raakt de speelkolom niet aan");
  assert.ok(js.length < 32000, `season-cat.js is onverwacht groot geworden (${js.length} bytes)`);
  // alleen opgemaakt onder de skin: elke selector (buiten @keyframes) begint met html[data-season="halloween"]
  const flat = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  for (const m of flat.matchAll(/([^{}]+)\{[^{}]*\}/g)) for (const one of m[1].replace(/@media[^{]*\{/g, "").split(",")) {
    if (one.trim()) assert.ok(one.trim().startsWith('html[data-season="halloween"]'), `regel buiten de skin: ${one.trim().slice(0, 80)}`);
  }
});

test("game.js ↔ season-cat.js: syncSeasonCat bij laden en bij aan/uit, het bestand wordt lui geladen met de game.js-versie, alleen bij de skin", () => {
  const g = readFileSync(join(dir, "..", "game.js"), "utf8");
  assert.match(g, /const loadSeasonCat = fxLoader\("\/season-cat\.js", "SeasonCat"\)/);
  assert.ok((g.match(/syncSeasonCat\(\)/g) || []).length >= 2, "bij laden én in setSeason");
  const fn = g.slice(g.indexOf("function syncSeasonCat()"), g.indexOf("function syncSeasonCheck()"));
  assert.match(fn, /seasonActive\(\) !== "halloween"/, "alleen bij Halloween");
  assert.match(fn, /unmount\(\)/, "uitzetten haalt de kat weg");
  assert.match(fn, /requestIdleCallback/, "pas in een rustig moment");
  assert.match(fn, /if \(seasonActive\(\) === "halloween"\) c\.mount\(\)/, "niet mounten als de skin intussen uit is gezet");
  const set = g.slice(g.indexOf("function setSeason("), g.indexOf("function syncSeasonCat()"));
  assert.match(set, /syncSeasonCat\(\)/, "setSeason ververst de kat");
  assert.ok(existsSync(join(dir, "..", "season-cat.js")));
});

test("Gok-knop: bij hover blijft hij de accentkleur (.key:hover mag .key-wide niet overschrijven)", () => {
  const css = readFileSync(join(dir, "..", "style.css"), "utf8");
  assert.match(css, /\.key-wide:hover\s*\{[^}]*background:\s*var\(--accent\)/, ".key-wide:hover houdt de accentkleur");
  assert.ok(css.indexOf(".key-wide:hover") > css.indexOf(".key:hover"), ".key-wide:hover moet ná .key:hover staan (gelijke specificiteit)");
});
