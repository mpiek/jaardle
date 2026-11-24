// Tests voor /timeline.js (🗓️ Timeline, alpha, db/226): de spelregels (gat past, waar hij wél hoort), de teksten in alle vijf talen,
// de deeltekst, en sinds 22/11 de Timeline-pagina in de app: /timeline/ uit de template (noindex, niet in de sitemap), timeline.js lui
// geladen door game.js, en de deur naast 🌐 die rondgaat (Jaardle → Duels → Timeline → Jaardle).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(dir, "..");
const SRC = readFileSync(join(ROOT, "timeline.js"), "utf8");

// timeline.js zonder pagina: zonder #tl start hij niet en geeft hij alleen zijn kern op window.JaardleTimeline
function core() {
  const win = {};
  const doc = { getElementById: () => null };
  new Function("window", "document", SRC)(win, doc);
  return win.JaardleTimeline;
}

test("een gat past als het jaar ertussen ligt; hetzelfde jaar telt aan beide kanten", () => {
  const { fits, rightIdx } = core();
  const line = [{ y: -45 }, { y: 1436 }, { y: 1436 }, { y: 1969 }];
  assert.equal(fits(line, 0, { y: -300 }), true);
  assert.equal(fits(line, 0, { y: 100 }), false);
  assert.equal(fits(line, 1, { y: 1436 }), true);
  assert.equal(fits(line, 2, { y: 1436 }), true);
  assert.equal(fits(line, 3, { y: 1436 }), true);
  assert.equal(fits(line, 4, { y: 1436 }), false);
  assert.equal(fits(line, 4, { y: 2014 }), true);
  assert.equal(fits([{ y: 1900 }], 1, { y: 1900 }), true);
  // waar hij wél hoort: na alle kaarten met een jaar ≤ het zijne, en dat gat past altijd
  for (const y of [-500, -45, 0, 1436, 1500, 1969, 2022]) assert.equal(fits(line, rightIdx(line, { y }), { y }), true, `jaar ${y}`);
  assert.equal(rightIdx(line, { y: 1436 }), 3);
  assert.equal(rightIdx(line, { y: -100 }), 0);
});

test("alle vijf talen hebben dezelfde teksten, en elke functie geeft tekst", () => {
  const { T } = core();
  const langs = ["nl", "en", "de", "es", "pt"];
  assert.deepEqual(Object.keys(T).sort(), [...langs].sort());
  const keys = Object.keys(T.nl).sort();
  for (const l of langs) {
    assert.deepEqual(Object.keys(T[l]).sort(), keys, `sleutels ${l}`);
    for (const k of keys) {
      const v = T[l][k];
      assert.equal(typeof v, typeof T.nl[k], `${l}.${k}`);
      if (typeof v === "function") assert.equal(typeof v(2, 3), "string", `${l}.${k}()`);
      if (typeof v === "string") assert.ok(v.length > 0, `${l}.${k} leeg`);
    }
    assert.equal(T[l].cats.length, 8, `${l}: acht categorieën`);
  }
});

test("de reeks in treden (3 · 5 · 10 · 15 · 20 · 30) en na 30 elke 5 belletjes, steeds meer (23/11)", () => {
  const { tierOf, isStep, bubOf, bubN } = core();
  assert.deepEqual([0, 2, 3, 4, 5, 9, 10, 14, 15, 19, 20, 29, 30, 53].map(tierOf), [0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
  for (const n of [3, 5, 10, 15, 20, 30, 35, 40, 45, 50, 55]) assert.equal(isStep(n), true, `${n} is een mijlpaal`);
  for (const n of [1, 2, 4, 11, 29, 31, 34, 36, 52]) assert.equal(isStep(n), false, `${n} geen mijlpaal`);
  assert.equal(bubOf(30), null);
  assert.deepEqual([35, 40, 45, 50, 55].map((n) => bubOf(n)[0]), ["🤯", "🚀", "🌟", "🐐", "🤯"]);
  assert.deepEqual([35, 40, 45, 50, 55, 60, 80].map(bubN), [9, 12, 15, 18, 21, 24, 24]);
  // de emoji van de belletjes moeten in ons emoji-font zitten (jaardle-emoji.woff2: 🤯🔥✨🚀☄️⚡🌟💎🐐🏆🎉)
  const ok = new Set(["🤯", "🔥", "✨", "🚀", "☄️", "⚡", "🌟", "💎", "🐐", "🏆", "🎉"]);
  for (const n of [35, 40, 45, 50]) for (const e of bubOf(n)) assert.ok(ok.has(e), `${e} niet nagekeken in het emoji-font`);
});

test("de deeltekst: score, blokjes in speelvolgorde en het adres", () => {
  const { T, shareText, endBand } = core();
  const s = shareText(T.nl, 11, [true, true, false, true], true);
  assert.equal(s, "Jaardle Timeline: 🗓️ 11 kaarten (record!)\n📊 🟩🟩🟥🟩\njaardle.com/timeline");
  assert.match(shareText(T.en, 1, [true], false), /^Jaardle Timeline: 🗓️ 1 card\n/);
  assert.deepEqual([0, 4, 5, 9, 10, 19, 20, 55].map(endBand), ["0-4", "0-4", "5-9", "5-9", "10-19", "10-19", "20+", "20+"]);
});

test("Timeline-pagina — de build schrijft /timeline/ in elke taal: vindbaar, in de sitemap, eigen kop, de deur gaat naar Jaardle", () => {
  const read = (f) => readFileSync(join(ROOT, f), "utf8");
  const pages = { "timeline/index.html": ["en", "/timeline/", "/"], "en/timeline/index.html": ["en", "/timeline/", "/"],
    "nl/timeline/index.html": ["nl", "/nl/timeline/", "/nl"], "de/timeline/index.html": ["de", "/de/timeline/", "/de"],
    "es/timeline/index.html": ["es", "/es/timeline/", "/es"], "pt/timeline/index.html": ["pt", "/pt/timeline/", "/pt"] };
  const main = read("nl/index.html");
  for (const [f, [lang, url, home]] of Object.entries(pages)) {
    assert.ok(existsSync(join(ROOT, f)), `${f} bestaat (npm run build)`);
    const h = read(f);
    assert.match(h, new RegExp(`<html lang="${lang}">`), f);
    assert.doesNotMatch(h, /<meta name="robots"/, `${f}: vindbaar in Google (sinds 24/11)`);
    assert.match(h, new RegExp(`<link rel="canonical" href="https://jaardle\\.com${url}">`), f);
    assert.match(h, /<title>Jaardle Timeline[^<]*<\/title>/, f);
    assert.match(h, /<header class="site-intro sr-only">\n\s+<h1>Jaardle Timeline[^<]*<\/h1>/, `${f}: eigen kop zonder data-i18n`);
    assert.match(h, new RegExp(`<a id="world-door" class="kop-door kop-wheel" data-at="t" href="${home}" aria-label="Jaardle"`), `${f}: de deur gaat naar Jaardle`);
    assert.ok(!/<script[^>]+timeline\.js/.test(h), `${f}: timeline.js laadt lui (game.js)`);
    assert.equal(h.match(/content="(default-src[^"]*)"/)[1], main.match(/content="(default-src[^"]*)"/)[1], `${f}: zelfde CSP als de hoofdpagina`);
  }
  for (const url of Object.values(pages).map(([, u]) => u)) assert.match(read("sitemap.xml"), new RegExp(`<loc>https://jaardle\\.com${url}</loc>`), `${url} in de sitemap`);
  assert.ok(!/<meta name="robots"/.test(main) && !/<meta name="robots"/.test(read("nl/duels/index.html")), "Jaardle en Duels zijn ook vindbaar");
  // de deur op Duels gaat naar Timeline, op Jaardle naar Duels
  assert.match(read("nl/duels/index.html"), /<a id="world-door" class="kop-door kop-wheel" data-at="d" href="\/nl\/timeline\/" aria-label="Timeline"/);
  assert.match(main, /<a id="world-door" class="kop-door kop-wheel" data-at="j" href="\/nl\/duels\/"/);
});

test("timeline.js — lui geladen door game.js, een pagina zoals /duels/ (één tegelijk), de kop in #mode-tabs, 🗓️-laadscherm", () => {
  const GAME = readFileSync(join(ROOT, "game.js"), "utf8"), TPL = readFileSync(join(ROOT, "index.template.html"), "utf8");
  const tl = core();
  assert.equal(typeof tl.open, "function");
  assert.equal(typeof tl.setLang, "function");
  assert.ok(!/<script[^>]+timeline\.js/.test(TPL), "niet in de pagina: alleen lui");
  assert.match(GAME, /const loadTl = fxLoader\("\/timeline\.js", "JaardleTimeline"\);/);
  assert.match(GAME, /const TL_PAGE = "modal-tl", APP_PAGES = \[DUELS_PAGE, TL_PAGE\];/);
  assert.match(GAME, /function onTlPath\(\) \{ return \/\\\/timeline\\\/\?\$\/\.test\(location\.pathname\); \}/);
  assert.match(GAME, /loadTl\(\)\.then\(\(TL\) => TL\.open\(tlHost\(\)\)\)\.catch\(uncoverTl\);/, "het adres /timeline/ opent de pagina");
  assert.match(GAME, /for \(const other of APP_PAGES\) \{   \/\/ één pagina tegelijk/);
  assert.match(GAME, /const page = \{ d: "duels", t: "timeline" \}\[worldNow\(\)\] \|\| "";/, "🌐 houdt de pagina");
  assert.match(GAME, /if \(page === "timeline"\) window\.JaardleTimeline\?\.setLang\?\.\(lang\);/);
  // het laadscherm: head-script voor het pad, CSS met 🗓️, timeline.js haalt het weg
  assert.match(TPL, /else if \(\/\\\/timeline\\\/\?\$\/\.test\(location\.pathname\)\) \{\s*document\.documentElement\.setAttribute\("data-tlload", ""\);/);
  assert.match(readFileSync(join(ROOT, "style.css"), "utf8"), /html\[data-tlload\]::after \{ content: "🗓️"; \}/);
  assert.match(SRC, /document\.documentElement\.removeAttribute\("data-tlload"\)/);
  // het scherm in <main>, de kop (logo + 🔈) in #mode-tabs; de CSS verbergt het spel en de tabs zolang
  assert.match(SRC, /root\.id = PAGE_ID; root\.className = "modal tl-page tl"; root\.hidden = true;/);
  assert.match(SRC, /k\.id = "kop-tl"; k\.className = "kop-tl";\n\s+nav\.appendChild\(k\);/);
  assert.match(tl.CSS, /\[data-tlhome\] main > :not\(#modal-tl\):not\(#mode-tabs\)/);
  assert.match(tl.CSS, /\[data-tlhome\] #mode-tabs > :is\(\.jl-mid, \.mode-seg\) \{ display: none; \}/);
  assert.match(tl.CSS, /\.tl-snd \{ flex: none;[^}]*width: 1\.95rem; height: 1\.95rem;[^}]*border: 1px solid var\(--border\); border-radius: 50%; \}/, "🔈 als rondje van 31 px, zoals op Duels");
  assert.match(tl.CSS, /\.tl-c \.tl-t \{[^}]*overflow-wrap: anywhere; hyphens: auto;/, "lange woorden vallen niet van de kaart");
  assert.ok(!/\btl-kop\b|HOME\[/.test(SRC), "geen eigen kop of terugknop meer");
});

test("de deur naast 🌐 gaat rond: Jaardle → Duels → Timeline → Jaardle; de tegel is waar je bent (logo), het stipje ook", () => {
  const GAME = readFileSync(join(ROOT, "game.js"), "utf8"), CSS = readFileSync(join(ROOT, "style.css"), "utf8");
  const TPL = readFileSync(join(ROOT, "index.template.html"), "utf8");
  assert.match(GAME, /const DOOR_NEXT = \{ j: "duels", d: "timeline", t: "" \};/);
  assert.match(GAME, /if \(at === "j"\) \{ newsSeen\("duels"\); openDuels\("door"\); \}\n\s+else if \(at === "d"\) openTimeline\("door"\);\n\s+else kopSwap\("in", \(\) => closeModal\(TL_PAGE\)\);/);
  assert.match(GAME, /function worldNow\(\) \{ const b = document\.body; return b\.hasAttribute\("data-tlhome"\) \? "t" : b\.hasAttribute\("data-duelshome"\) \? "d" : "j"; \}/);
  assert.match(GAME, /function appPageSet\(id, on\) \{[^]*?syncDoor\(\);\n\}/, "elke wissel van pagina zet de deur goed");
  // de drie tegels in de deur; per plek de eigen tegel voor (22/11 avond, zijn "logo verwacht van waar je nu bent") en het eigen stipje aan
  for (const w of ["j", "d", "t"]) assert.match(TPL, new RegExp(`<span class="kw-tile" data-w="${w}">`));
  assert.match(TPL, /<span class="kw-dots" aria-hidden="true"><i data-w="j"><\/i><i data-w="d"><\/i><i data-w="t"><\/i><\/span>/);
  assert.match(CSS, /\.kop-wheel\[data-at="j"\] \.kw-tile\[data-w="j"\], \.kop-wheel\[data-at="d"\] \.kw-tile\[data-w="d"\], \.kop-wheel\[data-at="t"\] \.kw-tile\[data-w="t"\] \{ opacity: 1; transform: none;/);
  assert.match(CSS, /\.kop-wheel\[data-at="j"\] \.kw-tile\[data-w="d"\], \.kop-wheel\[data-at="d"\] \.kw-tile\[data-w="t"\], \.kop-wheel\[data-at="t"\] \.kw-tile\[data-w="j"\] \{ transform: translateX\(12px\) scale\(0\.86\); \}/, "de volgende staat rechts klaar");
  assert.match(CSS, /\.kop-wheel\[data-at="j"\] \.kw-dots i\[data-w="j"\], \.kop-wheel\[data-at="d"\] \.kw-dots i\[data-w="d"\], \.kop-wheel\[data-at="t"\] \.kw-dots i\[data-w="t"\] \{ width: 11px; opacity: 1; \}/);
  assert.match(CSS, /\.kop-wheel\.has-new::after \{ display: none; \}/, "geen rood stipje in de hoek van de deur");
  assert.match(CSS, /\.kop-wheel\.has-new:not\(\[data-at="d"\]\) \.kw-dots i\[data-w="d"\] \{[^}]*background: var\(--achv-new, #e5484d\);/, "jouw beurt: het Duels-stipje wordt rood (niet op Duels zelf)");
  // de TI/ME-tegel: blauw, met de tijdlijnen erachter (make_time_icon.py)
  assert.match(TPL, /<span class="kw-tile" data-w="t"><svg class="kd-logo" viewBox="0 0 512 512" aria-hidden="true" focusable="false"><rect width="512" height="512" rx="128" fill="#1e88e5"\/><g fill="#1565c0">/);
});

test("Wie haal je in? (db/238, 24/11): de doelen van een run en het eerstvolgende doel", () => {
  const { chaseMarks, chaseNext } = core();
  const board = { rows: [{ name: "Sanne", flair: "🦉", v: 24 }, { name: "Joris", v: 19 }, { name: "Kim", me: true, v: 9 }, { name: "Eva", v: 11 }, { name: "Nul", v: 0 }] };
  const m = chaseMarks(board, 23);
  // de anderen (wie op 0 staat niet), dan jij (je beste van deze week), dan je record als dat hoger is
  assert.deepEqual(m.map((x) => x.kind + x.v), ["p24", "p19", "p11", "self9", "rec23"]);
  const at = (n) => { const g = chaseNext(m, n); return g ? g.items.map((x) => x.kind + x.v).join("+") : "top"; };
  assert.equal(at(0), "self9");
  assert.equal(at(9), "self9");     // gelijk = nog niet ingehaald
  assert.equal(at(10), "p11");
  assert.equal(at(12), "p19");
  assert.equal(at(20), "rec23");
  assert.equal(at(24), "p24");
  assert.equal(at(25), "top");
  // record = je beste van deze week: één doel ("jij"), niet twee
  assert.deepEqual(chaseMarks({ rows: [{ me: true, v: 23 }] }, 23).map((x) => x.kind), ["self"]);
  // nog niet gespeeld deze week: alleen je record
  assert.deepEqual(chaseMarks({ rows: [{ name: "Pip", flair: "🐣", bot: true, v: 7 }] }, 12).map((x) => x.kind + x.v), ["bot7", "rec12"]);
  // twee op hetzelfde getal: samen één doel
  assert.equal(chaseNext(chaseMarks({ rows: [{ name: "A", v: 19 }, { name: "B", v: 19 }] }, 0), 3).items.length, 2);
  // geen bord: geen doelen
  assert.deepEqual(chaseMarks(null, 30), [{ kind: "rec", name: "", flair: null, v: 30 }]);
  assert.equal(chaseNext([], 0), null);
});

test("db/238: het bord komt mee met de stapel (speler-id en team), zonder extra aanroep; het chipje vervangt 'goed'", () => {
  const GAME = readFileSync(join(ROOT, "game.js"), "utf8");
  assert.match(SRC, /const args = \{ p_lang: LANG, p_client: [^}]+, p_pool: activePool\(\) \};/);
  assert.match(SRC, /H\.rpc\("get_timeline_deck2", args\)/);   // met een account: met je sessie, dan kent de server je team
  assert.match(SRC, /e\.code === "PGRST202"/);                  // vóór db/238: terug naar de aanroep met alleen p_lang
  // get_timeline_board alleen na een teamwissel (eindscherm of pop-up), nooit bij de start van een run
  assert.equal((SRC.match(/H\.rpc\("get_timeline_board"/g) || []).length, 2);
  assert.match(SRC, /\$\{chip \? "" : `<span>\$\{esc\(L\.good\)\}<\/span>`\}/);
  assert.match(GAME, /flairGlyph: \(raw\) => \{ const p = parseFlair\(raw\); return p\.emoji \? flairGlyphHtml\(p\.emoji\) : ""; \}/);
  // 👑 en 🏆 staan in ons emoji-font (het chipje); de smalle-telefoon-regel zit in de CSS
  assert.match(SRC, /@container tl-hud \(max-width: 20\.5rem\) \{ \.tl-next-n \{ display: none; \}/);
});
