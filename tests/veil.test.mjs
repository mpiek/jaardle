// ⏳ Het laadscherm (26/11/2026, zijn "kan je bij al de spellen een laadscherm maken want nu switch je en soms zie je dat ie aan laden is
// beter net zoals bij duels dat je start en je zo pulsing [icoon ziet]"). html[data-load] = j/d/t: de tegel van het spel uit de deur,
// ademend in het midden, tot er echt iets staat. Het head-script zet het bij het openen van een pagina; game.js (worldGo) bij een wissel
// naar een spel dat nog moet laden, en haalt het weg zodra dat spel er staat.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TPL = readFileSync(join(ROOT, "index.template.html"), "utf8");
const CSS = readFileSync(join(ROOT, "style.css"), "utf8");
const GAME = readFileSync(join(ROOT, "game.js"), "utf8");
const DUEL = readFileSync(join(ROOT, "duel.js"), "utf8");
const TL = readFileSync(join(ROOT, "timeline.js"), "utf8");

// een documentElement met alleen wat het head-script en game.js gebruiken
function fakeRoot() {
  const attrs = {};
  const camel = (n) => n.replace(/^data-/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const dataset = new Proxy({}, {
    get: (_, k) => attrs["data-" + String(k).replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())],
    set: (_, k, v) => { attrs["data-" + String(k).replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())] = String(v); return true; },
    deleteProperty: (_, k) => { delete attrs["data-" + String(k).replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())]; return true; },
  });
  return { attrs, camel, dataset, setAttribute: (n, v) => { attrs[n] = String(v); }, removeAttribute: (n) => { delete attrs[n]; }, hasAttribute: (n) => n in attrs };
}
// nep-klok: setTimeout loopt pas bij tick(ms)
function fakeClock() {
  let now = 0, id = 0;
  const timers = new Map();
  return {
    setTimeout: (fn, ms = 0) => { timers.set(++id, { at: now + ms, fn }); return id; },
    clearTimeout: (i) => { timers.delete(i); },
    async tick(ms) {
      const end = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]); now = due[1].at; due[1].fn();
        await flush();
      }
      now = end;
      await flush();
    },
  };
}
const flush = () => new Promise((r) => setImmediate(r));

test("head-script: meteen het laadscherm met de tegel van de pagina; ?duel= houdt de ⚔️; een vangnet na 12 s", () => {
  const src = TPL.slice(TPL.indexOf("// ⏳ Het laadscherm (style.css, html[data-load]; 26/11)"), TPL.indexOf("// Emoji-font voorladen"));
  assert.ok(src.length > 200, "het blok staat in de head");
  assert.ok(TPL.indexOf(src) < TPL.indexOf('<link rel="stylesheet" href="/style.css'), "vóór de stylesheet: er flitst niets");
  const run = (pathname, search = "") => {
    const root = fakeRoot(), timers = [];
    vm.runInNewContext(src, { location: { pathname, search }, document: { documentElement: root }, setTimeout: (fn, ms) => timers.push([fn, ms]) });
    return { root, timers };
  };
  for (const [p, s, want] of [["/", "", "j"], ["/nl/", "", "j"], ["/nl/", "?p=abc", "j"], ["/duels/", "", "d"], ["/de/duels", "", "d"],
    ["/timeline/", "", "t"], ["/pt/timeline/", "", "t"]]) {
    const { root, timers } = run(p, s);
    assert.equal(root.attrs["data-load"], want, `${p}${s}`);
    assert.ok(!("data-duelload" in root.attrs));
    assert.equal(timers.length, 1); assert.equal(timers[0][1], 12000);
    timers[0][0]();
    assert.deepEqual(root.attrs, {}, "het vangnet haalt alles weg");
  }
  for (const [p, s] of [["/", "?duel=ABC123"], ["/nl/duels/", "?duel=ABC123"], ["/timeline/", "?x=1&duel=Q7"]]) {
    const { root } = run(p, s);
    assert.equal(root.attrs["data-duelload"], "", `${p}${s}: de ⚔️ (loopt door in de opening van de ronde)`);
    assert.ok(!("data-load" in root.attrs));
  }
  assert.ok(!/var (root|p)\b[^\n]*\n(?![\s\S]*\(function \(\) \{)/.test(src) && /\(function \(\) \{\n    try \{\n      var root = document\.documentElement/.test(src),
    "binnen een functie: een globale var root zou botsen met een let/const in game.js");
});

test("style.css: de tegels zijn die uit de deur (JA/AR = favicon.svg, DU/EL, TI/ME), als data-URI zodat ze bij de eerste tekening al staan", () => {
  const FAV = readFileSync(join(ROOT, "favicon.svg"), "utf8");
  const enc = (svg) => "data:image/svg+xml," + svg.replace(/\s*\n\s*/g, "").replace(/"/g, "'").replace(/%/g, "%25").replace(/#/g, "%23").replace(/</g, "%3C").replace(/>/g, "%3E");
  const tile = (w) => new RegExp(`<span class="kw-tile" data-w="${w}">(<svg[\\s\\S]*?</svg>)</span>`).exec(TPL)[1]
    .replace(/ class="kd-logo"| aria-hidden="true"| focusable="false"/g, "").replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
  for (const [w, svg] of [["j", FAV.trim()], ["d", tile("d")], ["t", tile("t")]]) {
    const m = new RegExp(`html\\[data-load="${w}"\\]::after \\{ background-image: url\\("([^"]+)"\\); \\}`).exec(CSS);
    assert.ok(m, `${w}: een eigen regel`);
    assert.equal(m[1], enc(svg), `${w}: gelijk aan de tegel in de deur (anders opnieuw maken met dezelfde enc() als hier)`);
  }
  // met een skin de Jaardle-tegel van die skin (zoals syncDoor in de deur), uit het bestand dat het favicon al ophaalt
  for (const s of ["halloween", "sinterklaas", "kerst"]) {
    assert.match(CSS, new RegExp(`html\\[data-load="j"\\]\\[data-season="${s}"\\]::after \\{ background-image: url\\("/favicon-${s}\\.svg\\?v=2"\\); \\}`));
    assert.match(TPL, new RegExp(`${s}: \\{[^}]*icon: "/favicon-${s}"`), `${s}: dezelfde naam als in het season-script`);
  }
  assert.match(TPL, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg\?v=2">/, "?v=2 zoals het favicon");
});

test("style.css: één vlak in de achtergrondkleur, de tegel ademt; opkomen en wegvagen; tikken gaan nergens heen; minder beweging = stil", () => {
  assert.match(CSS, /html\[data-load\]::after, html\[data-duelload\]::after \{ content: ""; position: fixed; z-index: 150;[^}]*border-radius: 25%;[^}]*box-shadow: 0 0 0 100vmax var\(--bg\);[^}]*animation: load-breathe 1\.1s ease-in-out infinite alternate; \}/);
  assert.match(CSS, /@keyframes load-breathe \{ from \{ transform: scale\(0\.88\); \} to \{ transform: scale\(1\); \} \}/, "zoals de ⚔️ altijd ademde");
  assert.match(CSS, /html\[data-load\]:not\(\[data-load-fx="out"\]\) body \{ pointer-events: none; \}/);
  assert.match(CSS, /html\[data-load-fx="in"\]::after \{ animation: load-breathe [^;]*, load-in 0\.14s ease-out both; \}/);
  assert.match(CSS, /html\[data-load-fx="out"\]::after \{ animation: load-breathe [^;]*, load-out 0\.22s ease-in both; \}/);
  assert.match(CSS, /@media \(prefers-reduced-motion: reduce\) \{\n  html\[data-load\]::after, html\[data-duelload\]::after \{ animation: none; \}/);
  assert.match(CSS, /html\[data-duelload\]::after \{ content: "⚔️";[^}]*font: 3\.2rem\/1 "JaardleEmoji", sans-serif; \}/, "?duel=: de ⚔️ blijft");
  assert.ok(!/data-tlload\]/.test(CSS), "het 🗓️-scherm is opgegaan in de TI/ME-tegel");
  // de tijden in game.js horen bij de animaties
  assert.match(GAME, /const VEIL_IN = 140, VEIL_OUT = 220, VEIL_MAX = 10000;/);
});

// de stukjes uit game.js: veilArm/veilOn/veilOff/worldGo, met een nep-document en een nep-klok
function loadVeil({ reduced = false } = {}) {
  const src = GAME.slice(GAME.indexOf("const VEIL_IN = "), GAME.indexOf("// ⚔️ De Duels-pagina (18/11/2026)"));
  assert.match(src, /function worldGo\(w, load, show, warm\) \{/);
  const root = fakeRoot(), clock = fakeClock(), swaps = [];
  const ctx = { document: { documentElement: root }, setTimeout: clock.setTimeout, clearTimeout: clock.clearTimeout, Promise,
    kopSwap: (dir, update) => { swaps.push(dir); update(); }, matchMedia: () => ({ matches: reduced }) };
  vm.runInNewContext(src + "\nthis.X = { veilOn, veilOff, veilArm, worldGo, VEIL_IN, VEIL_OUT, VEIL_MAX };", ctx);
  return { X: ctx.X, root, clock, swaps };
}
const deferred = () => { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); return { p, res, rej }; };

test("worldGo — warm: de schuif van altijd, geen laadscherm", async () => {
  const { X, root, swaps } = loadVeil();
  let shown = 0;
  await X.worldGo("d", () => Promise.resolve("D"), (m) => { assert.equal(m, "D"); shown++; return new Promise(() => {}); }, () => true);
  assert.deepEqual(swaps, ["in"]); assert.equal(shown, 1);
  assert.equal(root.dataset.load, undefined, "geen laadscherm");
});

test("worldGo — koud: eerst het laadscherm (komt op), de wissel eronder pas als het dekt, weg zodra er echt iets staat", async () => {
  const { X, root, clock, swaps } = loadVeil();
  const code = deferred(), page = deferred();
  let shown = 0;
  X.worldGo("t", () => code.p, () => { shown++; return page.p; }, () => false);
  assert.equal(root.dataset.load, "t"); assert.equal(root.dataset.loadFx, "in");
  code.res("TL"); await flush();
  assert.equal(shown, 0, "nog niet: het scherm komt nog op (anders zie je de wissel erdoorheen)");
  await clock.tick(X.VEIL_IN);
  assert.equal(shown, 1); assert.deepEqual(swaps, [], "geen schuif onder het laadscherm");
  await clock.tick(3000);
  assert.equal(root.dataset.load, "t", "zolang de kaarten er niet liggen, blijft het staan");
  page.res(); await flush();
  assert.equal(root.dataset.loadFx, "out", "vaagt weg");
  await clock.tick(X.VEIL_OUT);
  assert.equal(root.dataset.load, undefined); assert.equal(root.dataset.loadFx, undefined);
});

test("worldGo — de code laadt niet: het laadscherm gaat weg en je blijft waar je was; iets dat blijft hangen: na VEIL_MAX weg", async () => {
  {
    const { X, root, clock } = loadVeil();
    let shown = 0;
    X.worldGo("d", () => Promise.reject(new Error("net")), () => { shown++; }, () => false);
    await clock.tick(X.VEIL_IN);
    assert.equal(shown, 0); assert.equal(root.dataset.loadFx, "out");
    await clock.tick(X.VEIL_OUT);
    assert.equal(root.dataset.load, undefined);
  }
  {
    const { X, root, clock } = loadVeil();
    X.worldGo("d", () => Promise.resolve("D"), () => new Promise(() => {}), () => false);
    await clock.tick(X.VEIL_MAX - 1);
    assert.equal(root.dataset.load, "d");
    await clock.tick(1);
    assert.equal(root.dataset.loadFx, "out", "na 10 s altijd weg");
  }
  {
    const { X, root } = loadVeil();
    X.worldGo("d", () => Promise.resolve("D"), () => { throw new Error("stuk"); }, () => { throw new Error("warm stuk"); });
    assert.equal(root.dataset.load, "d", "warm() die faalt = koud");
  }
});

test("veilOn/veilOff — opnieuw op tijdens het wegvagen = gewoon weer vol; het 🗓️ van een oude pagina (data-tlload) gaat ook weg", async () => {
  const { X, root, clock } = loadVeil();
  root.dataset.load = "j";   // zoals het head-script het zet: geen opkomst
  root.setAttribute("data-tlload", "");
  X.veilOff();
  assert.equal(root.dataset.loadFx, "out"); assert.ok(!root.hasAttribute("data-tlload"));
  X.veilOn("d");
  assert.equal(root.dataset.load, "d"); assert.equal(root.dataset.loadFx, undefined, "geen nieuwe opkomst vanaf half doorzichtig");
  await clock.tick(X.VEIL_OUT);
  assert.equal(root.dataset.load, "d", "de oude wegvaag-timer ruimt het nieuwe scherm niet op");
  X.veilOff(); X.veilOff();
  await clock.tick(X.VEIL_OUT);
  assert.equal(root.dataset.load, undefined);
  X.veilOff();   // niets op: niets te doen
  assert.equal(root.dataset.loadFx, undefined);
});

test("game.js: elke weg naar een spel gaat via worldGo, en elk geopend adres haalt het laadscherm weg zodra dat spel er staat", () => {
  assert.match(GAME, /function goDuels\(\) \{ return worldGo\("d", loadDuel, \(D\) => D\.openList\(duelHost\(\), \{\}\), \(\) => window\.Duel\?\.listed\?\.\(\)\); \}/);
  assert.match(GAME, /function openDuels\(src = "menu"\) \{[^}]*gcCount\("duel-list"[^}]*\);\n  goDuels\(\);\n\}/, "de deur, de nieuwsbalk");
  assert.match(GAME, /return worldGo\("t", loadTl, \(TL\) => TL\.open\(tlHost\(\)\), \(\) => window\.JaardleTimeline\?\.ready\?\.\(\)\);/);
  assert.match(GAME, /else worldGo\("j", \(\) => Promise\.resolve\(null\), \(\) => \{ closeModal\(TL_PAGE\); return firstGameP; \}, \(\) => firstGameDone\);/, "Timeline → Jaardle");
  assert.match(GAME, /if \(w && w\.n === 1\) loadDuel\(\)\.then\(\(D\) => D\.fromEnd\(duelHost\(\), w\)\)\.catch\(\(\) => \{\}\);\n\s+else goDuels\(\);/, "het ⚔️-stuk op het eindscherm: meer of niets = het Duels-scherm");
  assert.ok(!/kopSwap\("in", \(\) => \{ (D\.openList|TL\.open)/.test(GAME), "geen schuif meer langs worldGo heen");
  // init: de daily laadt altijd; Jaardle staat er pas als dat potje er staat
  assert.match(GAME, /firstGameP = startGame\("free", false, sharedHashes\);/);
  assert.match(GAME, /firstGameP = switchMode\("daily"\);/);
  assert.match(GAME, /function switchMode\(mode\) \{[^]*?return startGame\(mode\);\n\}/);
  assert.match(GAME, /firstGameP = firstGameP\.catch\(\(\) => \{\}\)\.then\(\(\) => \{ firstGameDone = true; \}\);/);
  assert.match(GAME, /veilArm\(\);\n/, "het vangnet van 10 s voor het scherm van het head-script");
  assert.match(GAME, /loadDuel\(\)\.then\(\(D\) => D\.openList\(duelHost\(\), \{\}\)\)\.catch\(\(\) => \{\}\)\.finally\(veilOff\);/, "/duels/");
  assert.match(GAME, /else if \(tlLand\) loadTl\(\)\.then\(\(TL\) => TL\.open\(tlHost\(\)\)\)\.catch\(\(\) => \{\}\)\.finally\(veilOff\);/, "/timeline/");
  assert.match(GAME, /if \(!duelsLand && !tlLand\) firstGameP\.then\(veilOff\);/, "Jaardle zelf");
  // de else-if-keten na de landing is heel gebleven (seintjes, rode stip)
  assert.match(GAME, /\.finally\(veilOff\);\n  else if \(duelInviteWaiting\(\) && !duelInviteWaiting\(\)\.later && !sharedHashes\) setTimeout/);
});

test("duel.js en timeline.js zeggen of ze al iets te laten zien hebben, en open() wacht op de kaarten", () => {
  assert.match(DUEL, /listed: \(\) => !!listItems,/);
  assert.match(DUEL, /if \(!listItems\) \{ foot\.hidden = true; body\.innerHTML = `<p class="dl-msg">\$\{esc\(T\.loading\)\}<\/p>`; return; \}/, "zonder lijst: \"Even laden…\" (dat dekt het laadscherm nu)");
  assert.match(TL, /ready: \(\) => !!G,/);
  assert.match(TL, /function open\(host\) \{[^]*?if \(G \|\| loading\) draw\(\); else start\(\);\n\s+return loading \? new Promise\(\(r\) => loadWait\.push\(r\)\) : Promise\.resolve\(\);\n\s+\}/);
  assert.ok(!/removeAttribute\("data-tlload"\)/.test(TL), "game.js haalt het laadscherm weg, niet timeline.js");
});
