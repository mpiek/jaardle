// Tests voor ⚡ Knock-out (/ko.js, db/208). Geen DB, geen echte DOM: duel.js en ko.js draaien samen in een vm met een kale window.
import { test } from "node:test";
import vm from "node:vm";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const read = (f) => readFileSync(join(dir, "..", f), "utf8");
const KOSRC = read("ko.js"), DUEL = read("duel.js"), GAME = read("game.js"), LIVE = read("live.js");

function load() {
  const head = { kids: [], appendChild(e) { this.kids.push(e); } };
  const win = {};
  const doc = { head, body: { setAttribute() {} }, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    createElement: () => ({ setAttribute() {}, textContent: "" }) };
  const ctx = vm.createContext({ window: win, document: doc, String, Object, Array, Math, Date, Number, JSON, Intl, Set, Map, URL, encodeURIComponent, setTimeout, clearTimeout, setInterval, clearInterval });
  vm.runInContext(DUEL, ctx);
  vm.runInContext(KOSRC, ctx);
  return win;
}
const W = load(), KO = W.KO;
const host = (o = {}) => ({ lang: "nl", intl: "nl-NL", loggedIn: true, myName: () => "Noor", myFlair: () => null, faceHue: () => 330,
  state: () => ({ duel: { code: "KABCDE", round: 3, ko: true }, done: false }), ...o });

test("ko.js — teksten in vijf talen met dezelfde sleutels, niets leeg of kapot", () => {
  const langs = [...KO.langs()].sort();
  assert.deepEqual(JSON.parse(JSON.stringify(langs)), ["de", "en", "es", "nl", "pt"]);
  const nl = KO.copy("nl");
  const sample = (v) => (typeof v === "function" ? v("Sanne", 3, 17, "1,5", 3, 26) : v);
  for (const l of langs) {
    const c = KO.copy(l);
    assert.deepEqual(Object.keys(c).sort(), Object.keys(nl).sort(), `${l}: zelfde sleutels als nl`);
    for (const [k, v] of Object.entries(c)) {
      const s = sample(v);
      assert.ok(typeof s === "string" && s.trim() && !/undefined|NaN|\[object/.test(s), `${l}.${k}: leeg of kapot (${s})`);
    }
  }
  // de keuze in het ▾-menu staat in duel.js (dat laadt eerst), ook in vijf talen
  for (const l of langs) { const c = W.Duel.copy(l); assert.ok(c.turnBtn && c.koName && c.turnSub && c.koSub("Tim").includes("Tim") && c.liveOff("Tim").includes("Tim"), `duel.js ${l}: turnBtn/koName/turnSub/koSub/liveOff`); }
});

test("ko.js — ronde-factor ×1 t/m ronde 4, daarna elke ronde +0,5 (zoals GeoGuessr), geen max; zelfde als db/222", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 12].map(KO._.mult), [1, 1, 1, 1, 1.5, 2, 2.5, 3, 5]);
  assert.equal(KO._.dmgOf(4975, 4900, 1), 75); assert.equal(KO._.dmgOf(4825, 0, 3), 4825); assert.equal(KO._.dmgOf(4900, 4825, 5), 113, "75 × 1,5 = 112,5 → 113 (zoals Postgres)");
  assert.equal(KO._.dmgOf(5000, 0, 13), 27500, "geen max");
});

test("ko.js — de levensstrook: jouw en hun levens, de ronde-factor, wat de ander doet (nooit jaren)", () => {
  const g = { code: "KABCDE", state: "live", round: 3, hp: 5520, opp_hp: 3840, hp_max: 6000, opp_name: "Sanne", opp_flair: null, mine: [4900, 4000], theirs: [2400, 4500], opp_done: false, deadline: null };
  const s = KO._.stripHtml(host(), g);
  assert.match(s, /--hp:92/); assert.match(s, /--hp:64/);
  assert.match(s, /<b>R3<\/b><span class="">×1<\/span>/);
  assert.match(KO._.stripHtml(host(), { ...g, round: 5 }), /<b>R5<\/b><span class="up">×1,5<\/span>/, "vanaf ronde 5 licht de factor op");
  assert.match(s, /Sanne denkt na/);
  assert.doesNotMatch(s, /19\d\d/, "geen jaartallen");
  // de klok: Sanne klaar, jij nog niet
  const c = KO._.stripHtml(host(), { ...g, opp_done: true, deadline: new Date(Date.now() + 12000).toISOString() });
  assert.match(c, /Sanne heeft gegokt ✓/); assert.match(c, /ko-clock/);
  // 6000 levens: de balk in procenten (ook zonder hp_max)
  assert.match(KO._.stripHtml(host(), { ...g, hp: 3000, hp_max: undefined }), /--hp:50;/);
  // leeglopen na een ronde: --was = de oude stand
  const d = KO._.stripHtml(host(), g, { drain: { r: 2, who: "opp", me: 6000, op: 3840 } });
  assert.match(d, /ko-side me drain" style="--hp:92;--was:100"/);
  assert.match(d, /Ronde 2 voor Sanne/);
});

test("ko.js — de ronde-uitslag als laag: jaartallen in de kleur van de afstand, het echte jaar groen, wat je gok kostte als chip, geen zinnen", () => {
  const h = host({ els: { resultText: null } });
  const g = { code: "KABCDE", state: "live", round: 4, round_at: new Date(Date.now() + 5000).toISOString(), hp: 4875, opp_hp: 6000, opp_name: "Sanne", mine: [4975, 4700, 4875], theirs: [4975, 4950, 5000],
    my_years: [1911, 1920, 1917], their_years: [1913, 1914, 1912], answers: [1912, 1932, 1912] };
  const r = KO._.showHtml(h, g, 3);
  assert.match(r, /<b class="ks-yr ks-ans delta-badge correct">1912<\/b>/, "het echte jaar: groen");
  assert.match(r, /<div class="ks-g me"><b class="ks-yr delta-badge near">1917<\/b><\/div>/, "jouw gok: 5 ernaast = 🟦");
  assert.match(r, /<div class="ks-g op"><b class="ks-yr delta-badge correct">1912<\/b><\/div>/, "die van de ander: precies goed = groen");
  assert.match(r, /<div class="ks-s me lose"><strong class="dmg">−125<\/strong><small><span class="ks-pen delta-badge near" data-v="-125">−125<\/span><\/small>/, "jij: 5 jaar × 25");
  assert.match(r, /<div class="ks-s op win"><strong>5000<\/strong><small><\/small>/, "precies goed: geen chip");
  assert.match(r, /<b class="ks-f">×1<\/b>/);
  assert.doesNotMatch(r, /ernaast|Het was|punten|max|×\s*1 =|ks-hint/, "geen zinnen, geen max-tekst, geen som, geen hints");
  // een klap van 5000 of meer: goud (klasse max), geen tekst
  assert.match(KO._.showHtml(h, { ...g, mine: [4975, 4700, 5000], theirs: [4975, 4950, 0], their_years: [1913, 1914, 2400] }, 3), /<div class="ks-s op lose"><strong class="dmg max">−5000<\/strong>/);
  // geen gok: een grijs streepje en alles kwijt (⬛)
  const ng = KO._.showHtml(h, { ...g, mine: [4975, 4700, 0], my_years: [1911, 1920, null] }, 3);
  assert.match(ng, /<div class="ks-g me"><b class="ks-yr none">—<\/b><\/div>/); assert.match(ng, /delta-badge farthest" data-v="-5000">−5000</);
  // gelijk: geen schade, niemand wint
  const t = KO._.showHtml(h, { ...g, mine: [4975, 4700, 4900], theirs: [4975, 4950, 4900] }, 3);
  assert.match(t, /<div class="ks-s me"><strong>4900<\/strong>/); assert.doesNotMatch(t, /dmg|win|lose/);
  // de regel daarna: wie de klap kreeg (gezichtje) en hoeveel, rechts de volgende ronde; afgelopen = zonder volgende ronde
  const l = KO._.lineHtml(h, g, 3);
  assert.match(l, /<span class="ka-l"><b>R3<\/b><span class="ka-who me"><span class="db-av[^"]*"[^>]*>[^<]*<\/span><em class="">−125<\/em><\/span><\/span><span class="n">R4 · ×1<\/span>/);
  assert.match(KO._.lineHtml(h, { ...g, state: "done" }, 3), /class="ko-after still"/);
  assert.doesNotMatch(KO._.lineHtml(h, { ...g, state: "done" }, 3), /class="n"/);
  // de kleuren per afstand zijn die van classify() in game.js
  assert.match(GAME, /if \(abs <= 2\) return "veryclose";\n  if \(blue && abs <= 5\) return "near";\n  if \(abs <= 10\) return "close";\n  if \(abs <= 25\) return "warm";\n  if \(abs <= 50\) return "cool";\n  if \(abs <= 200\) return "far";\n  if \(abs <= 599\) return "distant";/);
});

test("ko.js — rondes, levensverloop en het eindscherm (A): schade, de klap van 5000 (goud), levens per ronde", () => {
  const g = { code: "KEND", state: "done", hp_max: 6000, opp_name: "Sanne", mine: [4900, 4000, 2000, 5000, 4000], theirs: [2400, 1500, 3500, 0, 3000], hp: 4500, opp_hp: 0, winner: "me" };
  const q = KO._.roundOf(g, 3);
  assert.equal(q.d, 1500); assert.equal(q.m, 1); assert.equal(q.x, 1500); assert.equal(q.who, "me"); assert.equal(q.max, false);
  const q4 = KO._.roundOf(g, 4);
  assert.equal(q4.x, 5000); assert.equal(q4.max, true, "een hele ronde (5000) = goud");
  assert.equal(KO._.roundOf(g, 5).x, 1500, "ronde 5: 1000 × 1,5");
  assert.deepEqual(JSON.parse(JSON.stringify(KO._.hpPath(g))), [[6000, 6000], [6000, 3500], [6000, 1000], [4500, 1000], [4500, 0], [4500, 0]]);
  const h = host();
  const l = KO._.lifeHtml(h, g);
  assert.equal((l.match(/<polyline /g) || []).length, 2);
  assert.match(l, /aria-label="Levens per ronde: jij van 6000 naar 4500, Sanne van 6000 naar 0"/);
  assert.match(l, /<b>Start<\/b><small>❤️ 6000<\/small>/);
  assert.match(l, /<b>R3<\/b><small>×1<\/small><em class="me">−1500<\/em>/, "schade in de kleur van wie hem kreeg");
  assert.match(l, /<b>R4<\/b><small>×1<\/small><em class="op max">−5000<\/em>/, "de klap van 5000 in goud");
  assert.match(l, /<text class="out"[^>]*>0<\/text>/, "K.O. = 0 in rood");
  assert.doesNotMatch(l, /many/);
  assert.match(KO._.lifeHtml(h, { ...g, mine: Array(9).fill(50), theirs: Array(9).fill(50) }), /ko-life many/, "veel rondes: compacter");
  // het eindscherm gebruikt het verloop (geen rij chips meer); Duels kan het ook (punt 8)
  assert.match(KOSRC, /\(Math\.min\(g\.mine\.length, g\.theirs\.length\) \? lifeHtml\(g\) : ""\) \+/);
  assert.equal(typeof KO.lifeHtml, "function"); assert.equal(typeof KO.review, "function");
});

test("db/208 + 210 + 214 + 218 ↔ ko.js — elke RPC die ko.js aanroept bestaat, met de juiste argumentnamen", { skip: !existsSync(join(dir, "..", "..", "jaardle-tools", "db", "218_ko_bot.sql")) }, () => {
  // de laatste definitie telt (db/210 maakt ko_submit opnieuw: jaar + hints in plaats van een score; db/218 + p_client met default)
  const rd = (f) => readFileSync(join(dir, "..", "..", "jaardle-tools", "db", f), "utf8");
  const old = ["208_ko.sql", "210_ko_one_guess.sql", "214_ko_react.sql"].map(rd).join("\n"), sql = old + "\n" + rd("218_ko_bot.sql") + "\n" + rd("225_duel_rating.sql");   // db/225: ko_invite(p_k, p_rated)
  const calls = [...KOSRC.matchAll(/call\("(ko_[a-z_]+)", \{([^}]*)\}/g)].map((m) => [m[1], [...m[2].matchAll(/(p_[a-z]+):/g)].map((x) => x[1])]);
  assert.deepEqual([...new Set(calls.map((c) => c[0]))].sort(), ["ko_answer", "ko_bot_start", "ko_cancel", "ko_get", "ko_invite", "ko_react", "ko_rematch", "ko_submit"]);
  for (const [fn, args] of calls) {
    const defs = [...sql.matchAll(new RegExp(`create (?:or replace )?function public\\.${fn}\\(([^)]*)\\)`, "gi"))], def = defs[defs.length - 1];
    assert.ok(def, `${fn} bestaat niet in db/208–218`);
    const ps = def[1].split(",").map((x) => x.trim()).filter(Boolean).map((x) => ({ n: x.split(/\s/)[0], opt: /default/i.test(x) }));
    for (const a of args) assert.ok(ps.some((p) => p.n === a), `${fn}: ${a} bestaat niet`);
    for (const p of ps) if (!p.opt && p.n !== "p_client") assert.ok(args.includes(p.n), `${fn}: ${p.n} ontbreekt`);
  }
  assert.match(KOSRC, /if \(!H\.loggedIn && \/\^ko_\(get\|submit\|bot_start\)\$\/\.test\(fn\)\) args = \{ \.\.\.args, p_client: H\.clientId\?\.\(\) \|\| null \};/, "anoniem: het speler-id mee");
  assert.match(sql, /grant execute on function public\.ko_invite[\s\S]*to authenticated;/);
  assert.doesNotMatch(old, /to anon/, "anoniem mag niets met een mens");
  // db/218: anoniem alleen ophalen, insturen en een bot-spel starten
  assert.deepEqual([...rd("218_ko_bot.sql").matchAll(/grant execute on function public\.(\w+)\([^)]*\) to anon, authenticated;/g)].map((m) => m[1]).sort(), ["ko_bot_start", "ko_get", "ko_submit"]);
});

test("game.js / duel.js / live.js ↔ ko.js — lui geladen, rondes en seintjes gaan naar ko.js", () => {
  assert.match(GAME, /const loadKoFile = fxLoader\("\/ko\.js", "KO"\);/);
  assert.match(GAME, /const loadKo = \(\) => loadDuel\(\)\.then\(loadKoFile\);/, "eerst duel.js (Duel.kit)");
  assert.match(GAME, /"jaardle:ko-rt", \(e\) => loadKo\(\)\.then\(\(K\) => K\.event\(duelHost\(\), e\.detail\)\)/);
  assert.match(GAME, /state\.guesses\.length >= MAX_GUESSES \|\| state\.duel\?\.ko\) \{/, "één gok per ronde");
  assert.doesNotMatch(GAME, /koHints/, "geen hints meer in knock-out (22/11)");
  // klok op 0: wat in het veld staat telt als gok (25/11); leeg/ongeldig = geen gok
  const kt = GAME.match(/koTimeout: \(\) => \{([\s\S]*?)\n    \},/)?.[1] || "";
  assert.match(kt, /if \(!state\?\.duel\?\.ko \|\| state\.done\) return;/);
  assert.match(kt, /parseInt\(getYearString\(\)\.trim\(\), 10\)/);
  assert.match(kt, /Number\.isFinite\(y\) && y >= MIN_YEAR && y <= MAX_YEAR\) submitGuess\(\);/, "half ingevuld jaar telt als gok");
  assert.match(kt, /if \(!state\.done\) finishGame\(false, true\);/, "anders: geen gok = 0 punten");
  assert.match(DUEL, /if \(st\?\.duel\?\.ko\) \{ H\.ko\?\.\(\)\.then\(\(K\) => K\.sync\(H\)\)/);
  assert.match(DUEL, /if \(dl\.ko\) return H\.ko\?\.\(\)\.then\(\(K\) => K\.roundDone\(H, st\)\)/);
  assert.match(DUEL, /class="dl-opt ko-opt" data-act="ko"[^]*?\$\{esc\(isOn\(t\.k\) \? T\.koSub\(t\.name\) : T\.liveOff\(t\.name\)\)\}/, "⚡ Knock-out in de uitklapkeuze, ook als die vriend niet online is");
  assert.match(LIVE, /replay: \{ since: Date\.now\(\) - 60000/, "een uitnodiging van de laatste minuut komt bij het openen alsnog binnen");
  assert.match(LIVE, /\.on\("broadcast", \{ event: "ko" \}/);
  assert.ok(!/ko\.js/.test(read("index.template.html")), "ko.js staat niet in de pagina zelf (lui)");
});

// ── geluid (19/11): duel.js (de motor, K.au) + ko.js (de klanken) met een nep-AudioContext; currentTime = 10 ──
function loadAudio(on, withAudio = true) {
  const log = { src: [], errs: [], gains: [] };
  const param = (name) => {
    let last = -Infinity;
    const chk = (v, t, exp) => {
      if (!Number.isFinite(v) || !Number.isFinite(t) || t < 0) log.errs.push(`${name}: ${v}@${t}`);
      if (exp && !(v > 0)) log.errs.push(`${name}: exponentieel naar ${v} (gooit in een browser)`);
      if (t < last - 1e-9) log.errs.push(`${name}: tijd terug (${t} < ${last})`);
      if (exp && name === "gain") log.gains.push(v);
      last = t;
    };
    return { value: 1, setValueAtTime: (v, t) => chk(v, t, false), linearRampToValueAtTime: (v, t) => chk(v, t, false),
      exponentialRampToValueAtTime: (v, t) => chk(v, t, true), setTargetAtTime() {} };
  };
  class Ctx {
    constructor() { this.currentTime = 10; this.sampleRate = 8000; this.state = "running"; this.destination = this.node(); }
    node(x = {}) { return { context: this, connect() {}, disconnect() {}, ...x }; }
    source(kind, x) { const r = { kind }; log.src.push(r); return this.node({ ...x, start: (t, off = 0) => Object.assign(r, { t, off }), stop: (t) => { r.end = t; } }); }
    createGain() { return this.node({ gain: param("gain") }); }
    createDynamicsCompressor() { return this.node({ threshold: param("thr"), knee: param("knee"), ratio: param("ratio"), attack: param("att"), release: param("rel") }); }
    createBuffer(ch, n) { const d = new Float32Array(n); return { getChannelData: () => d }; }
    createBufferSource() { return this.source("noise", { buffer: null }); }
    createOscillator() { return this.source("osc", { type: "sine", frequency: param("osc-f"), detune: param("det") }); }
    createBiquadFilter() { return this.node({ type: "", Q: param("Q"), frequency: param("filter-f") }); }
    createStereoPanner() { return this.node({ pan: param("pan") }); }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
  }
  const els = {}, win = { addEventListener() {}, ...(withAudio ? { AudioContext: Ctx } : {}) };
  const mk = () => ({ hidden: true, textContent: "", setAttribute() {}, querySelector: () => mk(), querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} }, style: { setProperty() {} } });
  const doc = { hidden: false, head: { appendChild() {} }, body: { setAttribute() {}, appendChild(e) { if (e.id) els[e.id] = e; }, classList: { add() {}, remove() {} } },
    getElementById: (id) => els[id] || null, querySelector: () => null, querySelectorAll: () => [], createElement: mk, addEventListener() {}, removeEventListener() {} };
  const localStorage = { getItem: (k) => (k === "jaardle:duelsfx" ? (on === null ? null : on ? "1" : "0") : null) };
  const ctx = vm.createContext({ window: win, document: doc, localStorage, performance: { now: () => 0 }, Float32Array, String, Object, Array, Math, Date, Number, JSON, Intl, Set, Map, URL,
    encodeURIComponent, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {} });
  vm.runInContext(DUEL, ctx);
  vm.runInContext(KOSRC, ctx);
  return { KO: win.KO, Duel: win.Duel, log, els };
}
const ARGS = { tick: [3], hit: [26, true], ko: [true], want: [0], power: [3] };

test("ko.js — knock-out-geluid: veertien klanken (21/11: + de zap bij ⚡ en de power-up van de verdubbelaar), stil en zonder fout zonder vinkje of zonder Web Audio, elk moment één keer", () => {
  const { KO: K1, log } = loadAudio(true);
  assert.deepEqual([...Object.keys(K1._.SFX)].sort(), ["bam", "clash", "clock", "count", "draw", "go", "hit", "invite", "ko", "power", "rx", "tick", "want", "zap"]);
  for (const k of Object.keys(K1._.SFX)) {
    const n = log.src.length;
    assert.equal(K1._.sfx(`t:${k}`, k, ...(ARGS[k] || [])), true);
    assert.ok(log.src.length > n, `${k} klinkt met het vinkje aan`);
    assert.equal(K1._.sfx(`t:${k}`, k, ...(ARGS[k] || [])), false, `${k}: hetzelfde moment klinkt niet nog eens`);
  }
  assert.deepEqual(log.errs, [], "geen ramp naar 0, geen tijd terug, geen NaN");
  for (const r of log.src) {
    assert.ok(r.t >= 10 && r.end > r.t, `${r.kind}: start en stop kloppen`);
    if (r.kind === "noise") assert.ok(r.off + (r.end - r.t) <= 2, "de ruis past in de buffer van 2 s");
    assert.ok(r.end - 10 < 5, "alles is binnen 5 s uitgeklonken (21/11: de verlies-gong zingt 4,5 s)");
  }
  // schade: de klap valt als de balk zakt (ko-drop wacht 0,5 s) en is harder bij meer schade
  assert.ok(/ko-drop 0\.35s ease-out 0\.5s both/.test(KOSRC) && /crunch\(b, 0\.5,/.test(KOSRC) && /bwop\(b, 0\.5,/.test(KOSRC) && /drop\(b, 0\.5,/.test(KOSRC), "klap en noot op 0,5 s, gelijk met ko-drop");
  const peak = (x) => { log.gains.length = 0; K1._.sfx(`p:${x}`, "hit", x, false); return Math.max(...log.gains); };
  // 21/11: met de levens van vóór de klap komt de dalende noot erbij (twee oscillatoren); vol C5 … leeg C3
  const nSrc = (args) => { const n = log.src.length; K1._.sfx(`n:${args.join()}`, "hit", ...args); return log.src.length - n; };
  assert.equal(nSrc([30, true, 120, 150]) - nSrc([30, true]), 2, "de noot klinkt alleen met de levens erbij");
  assert.match(KOSRC, /if \(here && g\.state === "done"\) A\.music\?\.\(null, false\);/, "21/11: bij de K.O. loopt de muziek door tot het K.O.-scherm");
  assert.match(KOSRC, /A\.music\?\.\(false\);   \/\/ 🎵 de muziek weg zodra het K\.O\.-scherm er is/);
  assert.match(KOSRC, /if \(m > 1\) sfx\(`pw:\$\{g\.code\}:\$\{q\.r\}`, "power", m\);\n\s+if \(q\.x !== q\.d\) later\(w, \(\) => count\(/, "21/11: power-up bij ×1,5+, daarna aftellen (later() telt vanaf nu)");
  assert.match(KOSRC, /if \(v !== last\) \{ last = v; ping\(k, to > from\); \}/, "21/11: een ping per stap van de getallen");
  assert.match(KOSRC, /if \(t - pingAt < 40\) return;/, "hooguit 25 per seconde");
  assert.match(KOSRC, /f = \(v\) => 130\.81 \* 2 \*\* \(\(2 \* Math\.max\(0, v\)\) \/ max\)/, "leeg C3 (131 Hz), vol twee octaven hoger (C5)");
  assert.ok(peak(60) > peak(5), "meer schade = hardere klap");

  for (const [on, au] of [[false, true], [true, false]]) {   // vinkje uit, of geen AudioContext
    const { KO: K2, log: l2 } = loadAudio(on, au);
    for (const k of Object.keys(K2._.SFX)) assert.doesNotThrow(() => K2._.sfx(`x:${k}`, k, ...(ARGS[k] || [])));
    assert.equal(l2.src.length, 0, on ? "zonder Web Audio: stil" : "vinkje uit: stil");
  }
  // de kale window van de andere tests (geen localStorage, geen AudioContext): ook geen fout
  for (const k of Object.keys(KO._.SFX)) assert.doesNotThrow(() => KO._.sfx(`b:${k}`, k, ...(ARGS[k] || [])));
});

test("ko.js — knock-out-geluid in het spel: uitnodiging, aftellen, K.O. en 'wil ook' één keer, ook als apply() vaker loopt", () => {
  const { KO: K3, log, els } = loadAudio(true);
  const opened = [];
  const h = host({ state: () => null, openModal: (id) => { opened.push(id); els[id].hidden = false; }, closeModal: (id) => { els[id].hidden = true; } });
  const nowIso = () => new Date().toISOString(), soon = (ms) => new Date(Date.now() + ms).toISOString();
  const base = { code: "KSOUND", opp_name: "Sanne", opp_flair: null, hp: 100, opp_hp: 100, mine: [], theirs: [], round: 1 };
  const count = () => log.src.length;
  // je wordt uitgedaagd: het seintje én het antwoord van ko_get tekenen hem allebei
  let n = count();
  K3._.apply(h, { ...base, state: "invite", me: "b", now: nowIso(), invite_until: soon(30000) });
  const inv = count() - n;
  assert.ok(inv > 0, "de uitnodiging klinkt");
  K3._.apply(h, { ...base, state: "invite", me: "b", now: nowIso(), invite_until: soon(29000) });
  assert.equal(count() - n, inv, "tweede keer dezelfde uitnodiging: stil");
  // aftellen: de eerste tel klinkt meteen (de rest via de timer)
  n = count();
  K3._.apply(h, { ...base, code: "KCOUNT", state: "live", me: "b", now: nowIso(), round_at: soon(2600) });
  assert.ok(count() > n, "3 piept");
  // K.O.: gong één keer; later drukt de ander op revanche: alleen het belletje
  const done = { ...base, code: "KDONE", state: "done", me: "a", now: nowIso(), finished_at: nowIso(), winner: "me", hp: 40, opp_hp: 0, mine: [90, 80], theirs: [40, 30] };
  n = count();
  K3._.apply(h, done);
  const gong = count() - n;
  assert.ok(gong > 10, "de K.O.-gong klinkt");
  n = count();
  K3._.apply(h, done);
  assert.equal(count() - n, 0, "opnieuw getekend: geen tweede gong");
  K3._.apply(h, { ...done, re_opp: true });
  const bell = count() - n;
  assert.ok(bell > 0 && bell < gong, "de ander wil ook: een klein belletje");
  K3._.apply(h, { ...done, re_opp: true });
  assert.equal(count() - n, bell, "en dat maar één keer");
  // een oude K.O. (langer dan 2 min geleden): geen gong
  n = count();
  K3._.apply(h, { ...done, code: "KOLD", finished_at: new Date(Date.now() - 600000).toISOString() });
  assert.equal(count() - n, 0, "oude K.O.: stil");
  assert.deepEqual(log.errs, []);
  // de haakjes in de code: ⚡ bij de start van ronde 1; de klok en de tik-tak voor allebei (19/11: "zorgen dat beide spelers zelfde sfx krijgen")
  assert.match(KOSRC, /tStart = setTimeout\(\(\) => openRound\(g\), Math\.max\(0, at\(g\.round_at\) - now\(\)\)\);/);
  assert.match(KOSRC, /if \(!it\) \{ sfx\(`go:\$\{g\.code\}`, "go"\); return startRound\(g\); \}/, "zonder opening: de ⚡-klang bij de start van ronde 1");
  assert.match(KOSRC, /if \(end - now\(\) > 1000\) sfx\(`dl:\$\{rk\}`, "clock"\);/);
  assert.match(KOSRC, /if \(s > 0 && s <= 5\) sfx\(`t:\$\{rk\}:\$\{s\}`, "tick", s\);/);
  assert.match(KOSRC, /if \(q\.who\) sfx\(`res:\$\{g\.code\}:\$\{r\}`, "hit", q\.x, q\.who === "me", q\.who === "me" \? drain\.me : drain\.op, hpMax\(g\)\);/, "met de levens van vóór de klap: de dalende noot");
  assert.match(DUEL, /au: \{ bus: sfxBus, play: sfx, nap: auNap, swish, ring, tick, thud, smp, music \}/, "de motor blijft in duel.js (21/11: + opnames en muziek)");
});

test("ko.js — de laatste ronde speelt eerst af: een tweede 'klaar' (seintje + antwoord) springt niet meteen naar de K.O. (feedback 20/11)", () => {
  const { KO: K4 } = loadAudio(false);
  const opened = [];
  const card = { querySelectorAll: () => [], classList: { add() {} } };
  const h = host({ state: () => ({ duel: { code: "KLAST", round: 2, ko: true }, done: true }), openModal: (id) => opened.push(id), closeModal() {},
    els: { result: card, resultText: { after() {}, querySelector: () => null }, nextBtn: {}, shareBtn: {} } });
  const done = { code: "KLAST", state: "done", me: "a", now: new Date().toISOString(), finished_at: new Date().toISOString(), winner: "me", opp_name: "Sanne",
    hp: 40, opp_hp: 0, mine: [90, 80], theirs: [40, 30], answers: [1912, 1950], my_years: [1910, 1950], their_years: [1930, 1980] };
  K4._.apply(h, done);
  assert.deepEqual(opened, [], "eerst de uitslag van de laatste ronde, geen K.O.-pop-up");
  K4._.apply(h, { ...done, now: new Date().toISOString() });
  assert.deepEqual(opened, [], "het tweede bericht wacht mee");
  assert.match(KOSRC, /const end = \(\) => \{ endWait = null; if \(cur && cur\.code === g\.code\) showEnd\(cur\); \};/, "daarna de K.O. met de nieuwste stand");
  assert.match(KOSRC, /showResult\(g, r, \(\) => \{ clearTimeout\(fb\);/, "pas als de laag weg is");
});

test("ko.js — tijdens een knock-out geen andere uitnodigingen; buiten een spel wel (feedback 20/11)", () => {
  const { KO: K5 } = loadAudio(false);
  const rpc = [];
  const h = host({ state: () => ({ duel: { code: "KLIVE", round: 1, ko: true }, done: false }), openModal() {}, closeModal() {}, rpc: async (fn, a) => { rpc.push([fn, a.p_code]); return null; } });
  K5._.apply(h, { code: "KLIVE", state: "live", me: "a", now: new Date().toISOString(), round: 1, round_at: new Date().toISOString(), opp_name: "Sanne", hp: 150, opp_hp: 150, mine: [], theirs: [] });
  K5.event(h, { code: "KSPAM1", k: "invite" });
  K5.event(h, { code: "KSPAM1", k: "cancelled" });
  assert.deepEqual(rpc, [], "uitnodiging van een ander tijdens het spel: niets ophalen, geen pop-up");
  K5.event(h, { code: "KLIVE", k: "round" });
  assert.deepEqual(rpc, [["ko_get", "KLIVE"]], "je eigen spel gaat gewoon door");
});

test("ko.js — bezet of net nee gezegd (db/213): eigen tekst, geen 'nog eens vragen', wel om de beurt", async () => {
  const { KO: K6 } = loadAudio(false);
  for (const err of ["busy", "cooldown"]) {   // de server zegt nee: geen fout naar boven, gewoon de pop-up
    const h = host({ state: () => null, closeModal() {}, openModal() {}, rpc: async () => { throw new Error(err); } });
    await K6.invite(h, "k1", "Tim");
  }
  assert.match(KOSRC, /const why = !r\.ok && \/busy\|cooldown\/\.exec\(r\.e \|\| ""\);/);
  assert.match(KOSRC, /\(s === "expired" \? `<button type="button" class="duel-go" data-ko="again">/, "nog eens vragen alleen als die niet reageerde");
  for (const l of K6.langs()) { const c = K6.copy(l); assert.ok(c.busyH("Tim").includes("Tim") && c.busyP && c.coolP, `${l}: busyH/busyP/coolP`); }
});

test("ko.js — een weggeklikt K.O.-eindscherm komt niet terug (feedback 20/11: Tim kreeg ze na afloop steeds opnieuw)", () => {
  const { KO: K7, els } = loadAudio(false);
  const opened = [];
  let st = null;
  const h = host({ state: () => st, openModal: (id) => { opened.push(id); els[id].hidden = false; }, closeModal: (id) => { els[id].hidden = true; } });
  const iso = () => new Date().toISOString();
  const done = { code: "KTIM01", state: "done", me: "b", now: iso(), finished_at: iso(), winner: "opp", opp_name: "Matthijs", hp: 0, opp_hp: 40, mine: [40, 30], theirs: [90, 80] };
  // je bent al weg (Duels of daily): eerst het eindscherm, weggeklikt = weg, ook als de ander daarna op Revanche drukt
  K7._.apply(h, done);
  assert.equal(opened.length, 1, "het eindscherm komt één keer");
  K7._.apply(h, { ...done, re_opp: true });
  assert.equal(opened.length, 1, "nog open: alleen bijgewerkt (wil ook), niet opnieuw geopend");
  els["modal-ko"].hidden = true;   // weggeklikt
  K7._.apply(h, { ...done, re_opp: true, now: iso() });
  K7._.apply(h, { ...done, now: iso() });
  assert.equal(opened.length, 1, "weggeklikt: komt niet terug");
  // nog op het spelscherm: één keer terug als de ander net om revanche vraagt (nieuw nieuws), daarna niet meer
  st = { duel: { code: "KTIM02", round: 2, ko: true }, done: false };
  const d2 = { ...done, code: "KTIM02" };
  K7._.apply(h, d2);
  assert.equal(opened.length, 2);
  els["modal-ko"].hidden = true;
  K7._.apply(h, { ...d2, now: iso() });
  assert.equal(opened.length, 2, "zelfde stand: niet terug");
  K7._.apply(h, { ...d2, re_opp: true, now: iso() });
  assert.equal(opened.length, 3, "de ander vraagt om revanche: één keer terug");
  els["modal-ko"].hidden = true;
  K7._.apply(h, { ...d2, re_opp: true, now: iso() });
  assert.equal(opened.length, 3, "en daarna niet meer");
});

test("ko.js — nageleverde seintjes (replay bij het verbinden) over een ander spel: niets ophalen; een uitnodiging wel", () => {
  const { KO: K8 } = loadAudio(false);
  const rpc = [];
  const h = host({ state: () => null, openModal() {}, closeModal() {}, rpc: async (fn, a) => { rpc.push([fn, a.p_code]); return null; } });
  K8.event(h, { code: "KOUD01", k: "end", replayed: true });
  K8.event(h, { code: "KOUD01", k: "rematch", replayed: true });
  assert.deepEqual(rpc, [], "oud spel: niets");
  K8.event(h, { code: "KINV02", k: "invite", replayed: true });
  K8.event(h, { code: "KNEW03", k: "end" });
  assert.deepEqual(rpc, [["ko_get", "KINV02"], ["ko_get", "KNEW03"]], "uitnodiging (daarvoor is de replay) en live seintjes gaan gewoon door");
});

test("ko.js — de kosten-chip botst op je eigen getal, daarna botsen jullie; past in de pauze van 8 s", () => {
  assert.match(KOSRC, /const T0 = hn \? CH0 \+ hn \* HS \+ 100 : 1250, left = o\.left \?\? Infinity;/);
  assert.match(KOSRC, /HS = 600, CH0 = 950;/);
  assert.match(KOSRC, /if \(reduced\(\) \|\| left < T0 \+ 3600 \+ 500\) return fin\(/, "past het niet: meteen het eindbeeld");
  // de rekensom: één chip per kant; de hele laag moet passen in wat er van 8 s over is als de uitslag ±0,4 s later binnenkomt
  for (const hn of [0, 1]) { const T0 = hn ? 950 + hn * 600 + 100 : 1250; assert.ok(T0 + 3600 + 500 <= 7600, `${hn} chip: ${T0 + 4100} ms`); }
  assert.doesNotMatch(KOSRC, /hintNote|hintParts/, "geen hints meer");
});

test("ko.js — reacties (db/214): zes vaste, een reactie van de ander geeft een bubbel en een zacht tikje; nageleverd of ander spel: niets", () => {
  const { KO: K9, log } = loadAudio(true);
  const rpc = [];
  const h = host({ state: () => ({ duel: { code: "KRX001", round: 2, ko: true }, done: false }), openModal() {}, closeModal() {}, rpc: async (fn, a) => { rpc.push([fn, a.p_code]); return null; } });
  K9._.apply(h, { code: "KRX001", state: "live", me: "a", now: new Date().toISOString(), round: 2, round_at: new Date().toISOString(), opp_name: "Sanne", hp: 150, opp_hp: 150, mine: [80], theirs: [70] });
  let n = log.src.length;
  K9.event(h, { code: "KRX001", k: "rx", i: 1 });
  assert.ok(log.src.length > n, "een reactie van de ander: tikje");
  n = log.src.length;
  K9.event(h, { code: "KRX001", k: "rx", i: 1, replayed: true });
  K9.event(h, { code: "KOTHER", k: "rx", i: 1 });
  K9.event(h, { code: "KRX001", k: "rx", i: 9 });
  assert.equal(log.src.length, n, "nageleverd, ander spel of onzin: stil");
  assert.deepEqual(rpc, [], "een reactie haalt niets op");
  // de zes en de limieten (zelfde als db/214)
  assert.match(KOSRC, /const RX = \["😂", "🤯", "🔥", "😬", "gg", "g2g", "😭"\], RXGAP = 2000, RXMAX = 6, RXLIFE = 2500, RXO = \[0, 1, 2, 3, 6, 4, 5\];/, "😭 = nummer 6 (oude clients), in de rij bij de emoji");
  const f = join(dir, "..", "..", "jaardle-tools", "db", "214_ko_react.sql");
  if (existsSync(f)) {
    const sql = readFileSync(f, "utf8");
    assert.match(sql, /p_i < 0 or p_i > 5/); assert.match(sql, /v_n >= 6/); assert.match(sql, /interval '1\.8 seconds'/); assert.match(sql, /interval '5 minutes'/);
  }
  const f218 = join(dir, "..", "..", "jaardle-tools", "db", "218_ko_bot.sql");
  if (existsSync(f218)) assert.match(readFileSync(f218, "utf8"), /p_i < 0 or p_i > 6/, "db/218: zeven reacties");
  for (const l of K9.langs()) assert.equal(K9.copy(l).rxL.split("|").length, 7, `${l}: zeven labels`);
  // 😂 zit in het eigen emoji-lettertype (ko.js wordt gescand)
  assert.match(read("tools/build-emoji-font.py"), /SCAN = \[ROOT \/ "game\.js", ROOT \/ "index\.template\.html", ROOT \/ "ko\.js"\]/);
  assert.match(read("style.css"), /U\+1F602/i, "😂 in de unicode-range");
});

test("ko.js — opgave (db/216: twee rondes op rij weg): het eindscherm zegt 'Sanne stopte.' / 'Je stopte.', geen K.O.-zin", () => {
  const { KO: KA, els } = loadAudio(false);
  const h = host({ state: () => null, openModal: (id) => { els[id].hidden = false; }, closeModal: (id) => { els[id].hidden = true; } });
  const g = { code: "KSTOP1", state: "done", me: "a", now: new Date().toISOString(), finished_at: new Date().toISOString(), opp_name: "Sanne", hp_max: 150,
    mine: [80, 30], theirs: [0, 0], hp: 150, opp_hp: 40, winner: "me" };
  KA._.apply(h, g);
  assert.match(els["modal-ko"].innerHTML, /Sanne stopte\./);
  const { KO: KB, els: e2 } = loadAudio(false);
  KB._.apply(host({ state: () => null, openModal: (id) => { e2[id].hidden = false; }, closeModal() {} }), { ...g, me: "b", mine: [0, 0], theirs: [80, 30], hp: 40, opp_hp: 150, winner: "opp" });
  assert.match(e2["modal-ko"].innerHTML, /Je stopte\./);
});

test("ko.js — terug in een lopende knock-out vanaf Duels (20/11): kaart bovenaan, gezichtje 'loopt', tik = de verse stand en dezelfde ronde met je bord", async () => {
  const { KO: KC, Duel: D } = loadAudio(false);
  const started = [], rpc = [];
  const board = { guesses: [{ year: 1917, diff: 5 }], done: true, won: false, centuryRevealed: true };
  const g = { code: "KBACK1", state: "live", me: "a", opp: "k-sanne", now: new Date().toISOString(), round: 3, round_at: new Date(Date.now() - 5000).toISOString(),
    opp_name: "Sanne", opp_flair: null, hp: 112, opp_hp: 87, hp_max: 150, mine: [80, 70], theirs: [60, 90], opp_done: false, puzzle: { hashes: ["h1"] } };
  let st = { duel: { code: "KBACK1", round: 3, ko: true }, done: false };   // eerst in de ronde
  const h = host({ state: () => st, openModal() {}, closeModal() {}, toEvent: (p) => ({ p }), gc() {}, ko: async () => KC,
    duelBoard: (c, r) => (c === "KBACK1" && r === 3 ? board : null),
    startRound: (rec) => { started.push(rec); st = { duel: rec.duel, done: false }; },
    rpc: async (fn, a) => { rpc.push([fn, a.p_code]); return g; } });
  KC._.apply(h, { ...g, opp_done: true });
  assert.match(KC.liveHtml(h), /<br><em>Sanne heeft gegokt ✓<\/em><\/small>/, "de ander gokte al: dat in plaats van de levens");
  KC._.apply(h, g);
  assert.equal(started.length, 0, "in de ronde: niets opnieuw starten");
  st = { duel: null, done: false };   // op het duel-logo getikt: naar Duels (daily op de achtergrond)
  assert.equal(KC.live()?.code, "KBACK1");
  const card = KC.liveHtml(h);
  assert.match(card, /<div class="dl-card turn ko-live" data-act="kolive">/, "de hele kaart = terug");
  assert.match(card, /<span class="vb-badge ko-z">⚡<\/span>/);
  assert.match(card, /<b>⚡ Knock-out · Ronde 3<\/b><br>Levens: jij 112, Sanne 87<\/small>/);
  assert.match(card, /<button type="button" class="dl-go" data-act="kolive">Terug<\/button>/);
  // Duels: de kaart onder Jouw beurt (ook zonder andere duels), het gezichtje van Sanne "loopt" en kan niet opnieuw uitgedaagd worden
  D._.setHost(h);
  D._.applyList({ items: [], targets: [{ k: "k-sanne", name: "Sanne", flair: null }, { k: "k-tim", name: "Tim", flair: null }], ko: [] });
  D._.setPick("k-sanne");
  const T = D.copy("nl");
  const body = D._.listBody(T, [], "", null);
  assert.ok(body.includes(card), "de kaart staat op Duels");
  assert.match(body, /Jouw beurt/);
  assert.doesNotMatch(body, /dl-hero/, "geen lege staat");
  assert.match(body, /class="dl-face busy" data-face="k-sanne" aria-pressed="false">.*?<small class="run">loopt<\/small>/s);
  assert.doesNotMatch(body, /data-act="challenge" data-k="k-sanne"/, "geen 'Daag Sanne uit' tijdens het spel");
  // tik op de kaart of op Sanne: de verse stand ophalen, dan dezelfde ronde met je bord (al gegokt = niet nog eens)
  for (const target of [{ dataset: { act: "kolive" } }, { dataset: { face: "k-sanne" } }]) {
    started.length = 0; rpc.length = 0; st = { duel: null, done: false };
    D._.onListClick({ target: { closest: () => target } });
    for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r));
    assert.deepEqual(rpc, [["ko_get", "KBACK1"]]);
    assert.equal(started.length, 1, `terug in de ronde (${JSON.stringify(target.dataset)})`);
    assert.equal(started[0].board, board, "je bord zoals je het achterliet");
    assert.equal(started[0].duel.round, 3); assert.equal(started[0].duel.ko, true);
  }
  // afgelopen: geen kaart meer, Sanne weer gewoon
  KC._.apply(h, { ...g, state: "done", finished_at: new Date().toISOString(), winner: "me", opp_hp: 0 });
  assert.equal(KC.live(), null);
  assert.equal(KC.liveHtml(h), "");
  assert.doesNotMatch(D._.listBody(T, [], "", null), /ko-live|class="dl-face busy"/);
  // ko.js miste het einde (geen seintje), maar de lijst kent hem al als afgelopen: ook geen kaart
  const { KO: KD, Duel: D2 } = loadAudio(false);
  const h2 = host({ state: () => ({ duel: null }), openModal() {}, closeModal() {}, toEvent: (p) => ({ p }), gc() {}, ko: async () => KD, startRound() {}, rpc: async () => g });
  KD._.apply(h2, g);
  D2._.setHost(h2);
  D2._.applyList({ items: [], targets: [], ko: [{ ...g, state: "done", finished_at: new Date().toISOString(), winner: "opp" }] });
  assert.doesNotMatch(D2._.listBody(D2.copy("nl"), [], "", null), /ko-live/);
});

test("ko.js — de start: eerst het aftel-pop-up (3, 2, 1), dan de opening van een duel met ⚡, de ronde eronder, dan weg (21/11)", async () => {
  const els = {}, timers = [];
  const mk = () => {
    const q = {};
    const e = { hidden: true, textContent: "", innerHTML: "", dataset: {}, style: { setProperty() {} }, classList: { add() {}, remove() {}, toggle() {} },
      setAttribute() {}, addEventListener() {}, removeEventListener() {}, remove() { e.removed = true; }, querySelector: (s) => (q[s] ||= mk()), querySelectorAll: () => [] };
    return e;
  };
  const doc = { hidden: false, documentElement: { hasAttribute: () => false, removeAttribute() {} }, head: { appendChild() {} },
    body: { setAttribute() {}, appendChild(e) { if (e.id) els[e.id] = e; }, classList: { add() {}, remove() {} } },
    getElementById: (id) => els[id] || null, querySelector: () => null, querySelectorAll: () => [], createElement: mk, addEventListener() {}, removeEventListener() {} };
  const win = { addEventListener() {}, removeEventListener() {}, innerWidth: 390 };
  const later = (f, ms) => { timers.push({ f, ms }); return timers.length; };
  const ctx = vm.createContext({ window: win, document: doc, localStorage: { getItem: () => null }, performance: { now: () => 0 }, String, Object, Array, Math, Date, Number, JSON, Intl,
    Set, Map, URL, encodeURIComponent, setTimeout: later, clearTimeout() {}, setInterval: () => 0, clearInterval() {} });
  vm.runInContext(DUEL, ctx);
  vm.runInContext(KOSRC, ctx);
  const K = win.KO, opened = [], closed = [], rounds = [];
  const h = host({ state: () => null, openModal: (id) => { opened.push(id); if (els[id]) els[id].hidden = false; }, closeModal: (id) => { closed.push(id); if (els[id]) els[id].hidden = true; },
    toEvent: (p) => p, startRound: (rec) => { rounds.push(rec); return Promise.resolve(); } });
  const soon = (ms) => new Date(Date.now() + ms).toISOString();
  const g = { code: "KSTART", state: "live", me: "b", now: new Date().toISOString(), round: 1, round_at: soon(2600), opp_name: "Sanne", opp_flair: null,
    hp: 150, opp_hp: 150, hp_max: 150, mine: [], theirs: [], puzzle: { year: 1969, hashes: ["h1"], facts: [] } };
  K._.apply(h, g);
  assert.deepEqual(opened, ["modal-ko"], "eerst het aftel-pop-up");
  assert.match(els["modal-ko"].innerHTML, /<p class="ko-count">3<\/p>/);
  assert.ok(!els["duel-intro"], "nog geen opening");
  // op 0 (round_at): de opening
  const t0 = timers.find((t) => t.ms > 2000 && t.ms <= 2700);   // marge: g.now wordt vóór round_at gemaakt, onder belasting kan het 2601 ms worden
  assert.ok(t0, "een timer tot round_at");
  t0.f();
  const it = els["duel-intro"];
  assert.ok(it, "de opening van een duel ligt over het scherm");
  assert.match(it.innerHTML, /<div class="dix-badge">⚡<\/div>/, "⚡ op de naad");
  assert.doesNotMatch(it.innerHTML, /⚔️/);
  assert.match(it.innerHTML, /<b class="dix-nm">Noor<\/b>/);
  assert.match(it.innerHTML, /<b class="dix-nm">Sanne<\/b><small class="dix-tag">❤️ 150 levens<\/small>/);
  assert.match(it.innerHTML, /<div class="dix-rd">Ronde 1<\/div>/);
  assert.deepEqual(rounds, [], "de ronde pas als de helften het scherm bedekken");
  // de helften bedekken het scherm (covered): de ronde eronder, het pop-up dicht, de opening blijft tot hij wegschuift
  timers.find((t) => t.ms === 340).f();
  await new Promise((r) => setImmediate(r));
  assert.equal(rounds.length, 1, "ronde 1 staat klaar");
  assert.equal(rounds[0].duel.ko, true);
  assert.ok(closed.includes("modal-ko"), "het aftel-pop-up is dicht");
  assert.ok(!it.removed, "de opening schuift nog weg");
  // iets anders te zien (een uitnodiging van een ander) tijdens een volgende start: de opening weg
  K._.apply(h, { ...g, code: "KTWEE", round_at: soon(2600) });
  timers.filter((t) => t.ms > 2000 && t.ms <= 2700).pop().f();
  const it2 = els["duel-intro"];
  K._.apply(h, { code: "KOTHER", state: "invite", me: "b", now: new Date().toISOString(), invite_until: soon(30000), opp_name: "Tim", round: 1, mine: [], theirs: [] });
  assert.ok(it2.removed, "de opening is weg");
  assert.match(DUEL, /intro: \(h, d, o\) => \{ H = h; return introStart\(d, 0, false, o\); \}/);
});

// 🤖 db/218: bots. Eigen lader met timers die we zelf afvuren (de bot gokt op bot_at: dan haalt de client de stand op).
function loadBots() {
  const timers = [];
  const els = {}, win = { addEventListener() {}, dispatchEvent() {} };
  const mk = () => ({ hidden: true, textContent: "", setAttribute() {}, querySelector: () => mk(), querySelectorAll: () => [], classList: { add() {}, remove() {}, toggle() {} }, style: { setProperty() {} } });
  const doc = { hidden: false, head: { appendChild() {} }, body: { setAttribute() {}, appendChild(e) { if (e.id) els[e.id] = e; }, classList: { add() {}, remove() {} } },
    getElementById: (id) => els[id] || null, querySelector: () => null, querySelectorAll: () => [], createElement: mk, addEventListener() {}, removeEventListener() {} };
  const ctx = vm.createContext({ window: win, document: doc, localStorage: { getItem: () => null }, performance: { now: () => 0 }, String, Object, Array, Math, Date, Number, JSON, Intl, Set, Map, URL,
    encodeURIComponent, CustomEvent: class { constructor(t) { this.type = t; } }, setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearTimeout(i) { if (timers[i - 1]) timers[i - 1].f = null; },
    setInterval: () => 0, clearInterval() {} });
  vm.runInContext(DUEL, ctx);
  vm.runInContext(KOSRC, ctx);
  return { KO: win.KO, Duel: win.Duel, els, timers };
}
const BOTS = [{ key: "pip", k: "kp", name: "Pip", flair: "🐣", elo: 1100, w: 3, l: 0 }, { key: "robo", k: "kr", name: "Robo", flair: "🤖", elo: 1500, w: 1, l: 2 },
              { key: "prof", k: "kf", name: "Prof", flair: "🧠", elo: 1800, w: 0, l: 0 }];

test("ko.js — 🤖 bots (db/218): starten (ook anoniem), de stand ophalen op bot_at zolang je in het spel zit, geen reacties", async () => {
  const { KO: KB, timers } = loadBots();
  const rpc = [];
  let st = null;
  const h = host({ loggedIn: false, clientId: () => "cid-1", state: () => st, openModal() {}, closeModal() {}, rpc: async (fn, a) => { rpc.push([fn, a]); return null; } });
  await KB.botStart(h, "robo");
  assert.deepEqual(plainKo(rpc), [["ko_bot_start", { p_bot: "robo", p_client: "cid-1" }]], "anoniem: het speler-id gaat mee");
  rpc.length = 0;
  const now = Date.now(), iso = (ms) => new Date(now + ms).toISOString();
  const g = { code: "KBOT01", state: "live", me: "a", bot: "robo", bot_elo: 1500, now: iso(0), round: 1, round_at: iso(-1000), bot_at: iso(5000), opp_done: false,
    opp_name: "Robo", opp_flair: "🤖", hp: 150, opp_hp: 150, mine: [], theirs: [] };
  st = { duel: { code: "KBOT01", round: 1, ko: true }, done: false };
  KB._.apply(h, g);
  const t = timers.filter((x) => x.f && x.ms >= 5000 && x.ms <= 5600).pop();
  assert.ok(t, "een timer op bot_at (+250 ms)");
  t.f();
  assert.deepEqual(plainKo(rpc), [["ko_get", { p_code: "KBOT01", p_client: "cid-1" }]], "op bot_at de stand ophalen");
  // weg uit het spel (Duels, de daily): niet ophalen, anders trekt elke bot-gok je terug
  rpc.length = 0;
  KB._.apply(h, { ...g, now: iso(0) });
  st = null;
  timers.filter((x) => x.f && x.ms >= 5000 && x.ms <= 5600).pop().f();
  assert.deepEqual(rpc, [], "niet in het spel: niets");
  // de bot gokte al (opp_done): geen timer meer
  const n = timers.length;
  st = { duel: { code: "KBOT01", round: 1, ko: true }, done: false };
  KB._.apply(h, { ...g, opp_done: true, bot_at: null, deadline: iso(15000) });
  assert.equal(timers.slice(n).filter((x) => x.f && x.ms >= 5000 && x.ms <= 5600).length, 0, "geen bot-timer als hij al gokte");
  // geen reactieknopje tegen een bot; wel tegen een mens
  assert.doesNotMatch(KB._.stripHtml(h, g), /ko-rx-btn/, "tegen een bot: geen reacties");
  assert.match(KB._.stripHtml(h, { ...g, bot: null }), /ko-rx-btn/);
  assert.match(KB._.stripHtml(h, g), /<b>Robo<\/b>/);
});

test("ko.js — 🤖 K.O. tegen een bot: Revanche begint meteen een nieuw spel, na winst de volgende bot, na verlies niet", async () => {
  const { KO: KB, Duel: DB, els } = loadBots();
  const rpc = [];
  const h = host({ loggedIn: true, state: () => null, openModal: (id) => { els[id].hidden = false; }, closeModal: (id) => { els[id].hidden = true; },
    rpc: async (fn, a) => { rpc.push([fn, a]); return null; }, flairHtml: (f) => `<i>${f}</i>` });
  DB.kit.setHost(h);
  DB._.applyList({ items: [], h2h: {}, targets: [], bots: BOTS });
  const iso = new Date().toISOString();
  const won = { code: "KBOT02", state: "done", me: "a", bot: "robo", now: iso, finished_at: iso, winner: "me", opp_name: "Robo", opp_flair: "🤖", hp: 80, opp_hp: 0,
    mine: [90, 80], theirs: [40, 30], answers: [1912, 1950], my_years: [1912, 1950], their_years: [1930, 1980] };
  KB.review(h, won);
  const html = els["modal-ko"].innerHTML;
  assert.match(html, /data-ko="re">⚡ Revanche<\/button>/, "Revanche zonder 'wil ook'");
  assert.doesNotMatch(html, /Druk je allebei/, "geen uitleg over allebei drukken");
  assert.match(html, /<div class="bot-next"><button type="button" class="dl-opt bot-opt" data-bot="prof" data-ko="bot">[^]*<b>Prof<\/b>[^]*Volgende: Sterk · 1800/, "na winst: de volgende bot");
  assert.doesNotMatch(html, /class="ko-rx/, "geen reacties");
  const click = (ko, bot) => els["modal-ko"].onclick({ target: { closest: () => ({ dataset: { ko, bot }, disabled: false, closest: () => null }) } });
  click("re");
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(plainKo(rpc.pop()), ["ko_bot_start", { p_bot: "robo" }], "Revanche = een nieuw spel tegen dezelfde bot");
  KB.review(h, won);   // (het antwoord null gaf een foutpop-up: het eindscherm opnieuw)
  click("bot", "prof");
  await new Promise((r) => setImmediate(r));
  assert.deepEqual(plainKo(rpc.pop()), ["ko_bot_start", { p_bot: "prof" }]);
  KB.review(h, { ...won, code: "KBOT03", winner: "opp", hp: 0, opp_hp: 50 });
  assert.doesNotMatch(els["modal-ko"].innerHTML, /bot-next/, "na verlies geen volgende bot");
  KB.review(h, { ...won, code: "KBOT04", bot: "prof", opp_name: "Prof" });
  assert.doesNotMatch(els["modal-ko"].innerHTML, /bot-next/, "Prof is de sterkste: geen volgende");
});
function plainKo(x) { return JSON.parse(JSON.stringify(x)); }

test("ko.js — 🎵 de muziek begint met de ronde, niet pas na de eerste gok (21/11, zijn melding)", async () => {
  const { KO: KM, Duel: D } = loadAudio(true);   // effecten aan, muziek nooit gekozen = alles
  const calls = [];
  const M = { on: false, start() { this.on = true; calls.push("start"); }, stop() { this.on = false; calls.push("stop"); }, tense(t) { calls.push(`tense:${t}`); } };
  let st = { duel: null, done: false };   // nog niet in het spel (aftellen, opening)
  const h = host({ state: () => st, music: () => Promise.resolve(M), openModal() {}, closeModal() {}, toEvent: (p) => ({ p }), gc() {},
    startRound: (rec) => { st = { duel: rec.duel, done: false }; return Promise.resolve(); } });
  D._.setHost(h);
  const g = { code: "KMUS01", state: "live", me: "a", opp: "k-sanne", now: new Date().toISOString(), round: 1, round_at: new Date(Date.now() - 500).toISOString(),
    opp_name: "Sanne", opp_flair: null, hp: 150, opp_hp: 150, hp_max: 150, mine: [], theirs: [], opp_done: false, deadline: null, puzzle: { hashes: ["h1"] } };
  KM._.apply(h, g);   // round_at is voorbij: meteen de ronde
  for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r));
  assert.deepEqual(calls, ["start", "tense:false"], "de muziek speelt zodra de ronde klaarstaat, nog zonder klok");
  // de ander gokt: de klok loopt (15 s), de muziek bouwt op
  KM._.apply(h, { ...g, opp_done: true, deadline: new Date(Date.now() + 15000).toISOString() });
  for (let i = 0; i < 6; i++) await new Promise((r) => setImmediate(r));
  const last = calls.at(-1);
  assert.ok(/^tense:\d+$/.test(last) && +last.slice(6) > 14000, `de klok gaat door: ${last}`);
});

test("ko.js — de regels (db/222, 22/11): 5000 − 25 per jaar, 6000 levens, geen hints; de oude regels zijn weg", () => {
  const f = join(dir, "..", "..", "jaardle-tools", "db", "222_ko_rules3.sql");
  if (existsSync(f)) assert.match(readFileSync(f, "utf8"), /5000/);
  const h = host({ els: { resultText: null } });
  // jouw ronde 1 tegen Prof: 1 en 4 jaar ernaast → −25 en −100 → 4975 tegen 4900, × 1 = −75
  const g = { code: "KABCDE", hp_max: 6000, state: "live", round: 2, round_at: new Date(Date.now() + 5000).toISOString(), hp: 6000, opp_hp: 5925, opp_name: "Prof",
    mine: [4975], theirs: [4900], my_years: [1944], their_years: [1941], answers: [1945] };
  const r = KO._.showHtml(h, g, 1);
  assert.match(r, /<div class="ks-s me win"><strong>4975<\/strong><small><span class="ks-pen delta-badge veryclose" data-v="-25">−25<\/span><\/small>/);
  assert.match(r, /<div class="ks-s op lose"><strong class="dmg">−75<\/strong><small><span class="ks-pen delta-badge near" data-v="-100">−100<\/span><\/small>/);
  // 7 tegen 1251 jaar: 4825 tegen 0 → −4825 (geen goud: minder dan een hele ronde)
  const far = KO._.showHtml(h, { ...g, mine: [0], theirs: [4825], my_years: [694], their_years: [1938] }, 1);
  assert.match(far, /<div class="ks-s me lose"><strong class="dmg">−4825<\/strong><small><span class="ks-pen delta-badge farthest" data-v="-5000">−5000<\/span>/);
  assert.match(far, /<span class="ks-pen delta-badge close" data-v="-175">−175<\/span>/);
  // het verloop bij veel rondes: kleiner
  const n = 13, many = { ...g, state: "done", mine: Array(n).fill(4975), theirs: Array(n).fill(4900), my_years: Array(n).fill(1944), their_years: Array(n).fill(1941), answers: Array(n).fill(1945) };
  assert.match(KO._.lifeHtml(h, many), /class="ko-life many lots"/);
  // teksten
  assert.equal(KO.copy("nl").mins, "±5 min"); assert.equal(KO.copy("de").mins, "±5 Min.");
  assert.match(KO.copy("nl").liveSub("Tim"), /6000 levens/);
  // geen betaalde hints: de ronde krijgt noHints mee, game.js zet de knoppen én de toetsen uit, ko_submit stuurt 0; de gokregel toont 25 per jaar
  assert.match(KOSRC, /ko: true, noHints: true, perYear: PER_YEAR, top: TOP \}/);
  assert.match(KOSRC, /p_hints: 0 \}\);/);
  for (const fn of ["requestCenturyHint", "requestLastDigit", "requestLaterClue", "requestDirectionHint"]) assert.match(GAME, new RegExp(`function ${fn}\\(\\) \\{\\n  if \\([^\\n]*state\\.duel\\?\\.noHints\\) return;`), `${fn}: uit bij noHints`);
  assert.match(GAME, /els\.hintBtnCentury\.hidden = noHints \|\| state\.done/);
  assert.match(GAME, /const penalty = state\.duel\?\.perYear \? Math\.min\(state\.duel\.top, state\.duel\.perYear \* Math\.abs\(g\.diff\)\) : GUESS_PENALTIES\[g\.cls\] \|\| 0;/);
  assert.match(KOSRC, /body\[data-ko\] #hint-row, body\[data-ko\] #live-score/);
  assert.doesNotMatch(KOSRC, /🎯|ks-tb|\bPEN\b|RULES|rulesOf|g\.rules|drawP/, "de oude regels zijn weg");
});

test("ko.js — ⚔️ duel-prestaties (db/224): op het K.O.-scherm een vak voor het kaartje, alleen bij een vers spel tegen een mens en met account", () => {
  assert.match(KOSRC, /\(fresh && !g\.bot && H\.loggedIn && H\.duelAchv \? `<div class="ko-achv"><\/div>` : ""\)/, "niet tegen een bot, niet bij terugkijken, niet anoniem");
  assert.match(KOSRC, /if \(box && typeof H\.duelAchv === "function"\) H\.duelAchv\(box\)\?\.catch\?\.\(\(\) => \{\}\);/);
  assert.match(KOSRC, /\.ko-achv:empty \{ display: none; \}/, "geen unlock: geen lege ruimte");
  assert.match(GAME, /duelAchv: \(box\) => checkDuelAchievements\(box\),/, "game.js geeft de host de functie mee");
});

// 🤖 db/226 bots met karakter (mockup "Bots met karakter" v3, zijn keuze 22/11: Pip, Robo en Prof met hun trekje)
test("ko.js — 🤖 db/226 bots met karakter: zinnen in vijf talen, begroeting, statusregel, hooguit één bubbel per ronde, laatste woord", () => {
  const { KO: KB, Duel: DB, els } = loadBots();
  // 1. de zinnen: dezelfde bots en momenten in vijf talen, niets leeg, de voorwaarden en plekhouders kloppen
  const nl = KB.botCopy("nl");
  assert.deepEqual(Object.keys(nl).sort(), ["pip", "prof", "robo"]);
  for (const l of KB.langs()) {
    const c = KB.botCopy(l);
    assert.deepEqual(Object.keys(c).sort(), Object.keys(nl).sort(), `${l}: dezelfde bots`);
    for (const [bot, m] of Object.entries(c)) {
      assert.deepEqual(Object.keys(m).sort(), Object.keys(nl[bot]).sort(), `${l}.${bot}: dezelfde momenten`);
      for (const [k, v] of Object.entries(m)) for (const t of [].concat(v)) {
        assert.ok(typeof t === "string" && t.trim() && !/undefined|NaN/.test(t), `${l}.${bot}.${k}: leeg of kapot`);
        const cond = /^\w+\|/.test(t) ? t.split("|")[0] : "";
        assert.ok(["", "rond", "na1950", "voor1950"].includes(cond), `${l}.${bot}.${k}: voorwaarde ${cond}`);
        assert.equal(/\{y\}/.test(t), cond === "rond", `${l}.${bot}.${k}: {y} alleen bij een rond jaartal`);
      }
    }
    assert.ok(c.robo.hi.every((t) => t.includes("{p}")), `${l}: Robo noemt zijn winkans`);
    assert.ok(c.pip.think2 && !c.robo.think2 && !c.prof.think2, `${l}: alleen Pip leest het nog een keer`);
    assert.ok(KB.copy(l).firstWin("Prof").includes("Prof"), `${l}: eerste zege`);
  }
  // 2. begroeting: Robo rekent zijn winkans echt uit (elo: jij 1612, hij 1455), zonder account ??
  const now = Date.now(), iso = (ms) => new Date(now + ms).toISOString();
  let st = null;
  const h = host({ loggedIn: true, myRating: () => 1612, state: () => st, openModal: (id) => { els[id].hidden = false; }, closeModal: (id) => { els[id].hidden = true; },
    rpc: async () => null, flairHtml: (f) => `<i>${f}</i>` });
  DB.kit.setHost(h);
  DB._.applyList({ items: [], h2h: {}, targets: [], bots: BOTS.map((b) => ({ ...b })) });
  const g0 = { code: "KFUN01", state: "live", me: "a", bot: "robo", bot_elo: 1455, now: iso(0), round: 1, round_at: iso(-1000), opp_name: "Robo", opp_flair: "🤖",
    hp: 6000, opp_hp: 6000, mine: [], theirs: [] };
  assert.equal(KB._.botHi(h, g0), "Tegenstander gescand. Mijn winkans: 29%.");
  assert.equal(KB._.botHi({ ...h, loggedIn: false }, g0), "Tegenstander gescand. Mijn winkans: ??%.");
  assert.equal(KB._.botHi(h, { ...g0, bot: "nieuw" }), "", "een bot zonder zinnen zegt niets");
  // 3. de statusregel: Pip leest het kaartje en na 8 s nog een keer; Robo rekent; een onbekende bot: de gewone regel
  assert.equal(KB._.botThink(h, { ...g0, bot: "pip", round_at: iso(-3000) }), "Pip leest het kaartje");
  assert.equal(KB._.botThink(h, { ...g0, bot: "pip", round_at: iso(-9000) }), "Pip leest het nog een keer");
  assert.equal(KB._.botThink(h, { ...g0, round_at: iso(-9000) }), "Robo rekent");
  assert.equal(KB._.botThink(h, { ...g0, bot: "nieuw" }), null);
  st = { duel: { code: "KFUN01", round: 1, ko: true }, done: false };
  assert.match(KB._.stripHtml(h, { ...g0, bot: "pip", round_at: iso(-9000) }), /<span>Pip leest het nog een keer<\/span>/, "in de strook");
  // 4. na een ronde (Pip): hooguit één bubbel, alleen bij iets bijzonders, nooit twee rondes achter elkaar, geen zin twee keer
  const pip = { ...g0, code: "KFUN02", bot: "pip", round: 8, answers: [1912, 1642, 1969, 1517, 1889, 1945, 1066], my_years: [1915, 1650, 1969, 1530, 1880, 1945, 1070],
    their_years: [1850, 1600, 1969, 1200, 1700, 1945, 1000], mine: [4925, 4800, 5000, 4675, 4775, 5000, 4900], theirs: [3450, 3950, 5000, 0, 275, 5000, 3350] };
  const far = (y) => [`😬 ${y} klinkt toch altijd goed?`, "😬 Oei. Ik had het kaartje nog niet uit."];
  const r1 = KB._.botAfter(h, pip, 1);
  assert.ok(far(1850).includes(r1), `ronde 1: 62 jaar ernaast met 1850 (${r1})`);
  assert.equal(KB._.botAfter(h, pip, 2), "", "ronde 2: niets bijzonders (en vlak na ronde 1)");
  assert.ok(["🤯 Precies goed?! Hoe dan?", "🤯 Wauw! Leer je mij dat ook?"].includes(KB._.botAfter(h, pip, 3)), "ronde 3: jij precies goed");
  assert.equal(KB._.botAfter(h, pip, 4), "", "ronde 4: wel 317 jaar ernaast, maar net in ronde 3 gepraat");
  assert.equal(KB._.botAfter(h, pip, 5), "😭 Au! Mijn veertjes!", "ronde 5: een klap van 6750 (×1,5)");
  const r7 = KB._.botAfter(h, pip, 7);
  assert.ok(far(1000).includes(r7) && r7.replace("1000", "Y") !== r1.replace("1850", "Y"), `ronde 7: de andere zin (${r1} / ${r7})`);
  // Prof: na 1950 de weg kwijt (alleen de zin die bij het tijdvak past)
  const prof = { ...g0, code: "KFUN03", bot: "prof", round: 2, answers: [1974], my_years: [1975], their_years: [1900], mine: [4975], theirs: [3150] };
  assert.equal(KB._.botAfter(h, prof, 1), "😬 Na 1950 ben ik de weg kwijt.");
  assert.equal(KB._.botAfter(h, { ...prof, code: "KFUN04", answers: [1774], my_years: [1775], their_years: [1700] }, 1), "😬 Hm. Dat moet ik nazoeken.");
  assert.equal(KB._.botAfter(h, { ...prof, code: "KFUN05", state: "done" }, 1), "", "na afloop: het laatste woord, geen bubbel");
  // uitdoven: na 10 spellen tegen dezelfde bot alleen nog begroeting en laatste woord
  DB._.applyList({ items: [], h2h: {}, targets: [], bots: BOTS.map((b) => (b.key === "prof" ? { ...b, w: 6, l: 4 } : { ...b })) });
  assert.equal(KB._.botAfter(h, { ...prof, code: "KFUN06" }, 1), "", "10 spellen: geen bubbels meer");
  assert.match(KB._.botHi(h, { ...prof, code: "KFUN06" }), /student/, "maar wel hallo");
  // 5. het laatste woord en je eerste zege (de stand bij het begin telt; daarna krijgt hij in duel.js meteen zijn groene rand)
  DB._.applyList({ items: [], h2h: {}, targets: [], bots: BOTS.map((b) => ({ ...b })) });
  const live = { ...g0, code: "KFUN07", bot: "prof", bot_elo: 1800, opp_name: "Prof", opp_flair: "🧠" };
  st = { duel: { code: "KFUN07", round: 1, ko: true }, done: false };
  KB._.apply(h, live);
  const t = new Date().toISOString();
  const won = { ...live, state: "done", winner: "me", finished_at: t, now: t, hp: 5725, opp_hp: 0, mine: [5000], theirs: [3150], answers: [1974], my_years: [1974], their_years: [1900] };
  st = null;
  KB.review(h, won);
  let html = els["modal-ko"].innerHTML;
  assert.match(html, /<div class="ko-bandw"[^>]*>[^]*<span class="ko-bub say stay op" aria-hidden="true">U bent geslaagd\. Cum laude!<\/span><\/div><h2>K\.O\.! Jij wint<\/h2>/, "zijn laatste woord onder de band");
  assert.match(html, /<p class="bot-first"><span style="--h:\d+" class="dl-av hue won fl" aria-hidden="true"><i>🧠<\/i><\/span>Eerste zege op Prof<\/p>/, "je eerste zege op Prof");
  assert.equal(DB.kit.bots().find((b) => b.key === "prof").w, 1, "de stand in duel.js loopt mee: groene rand in de pop-up");
  KB.review(h, won);
  assert.equal(DB.kit.bots().find((b) => b.key === "prof").w, 1, "niet dubbel geteld");
  const before = DB.kit.bots().map((b) => b.w).join();
  KB.review(h, { ...won, code: "KFUNXX" });   // een zege die je niet live zag (terugzien vanuit Duels): niets tellen, geen eerste zege
  assert.equal(DB.kit.bots().map((b) => b.w).join(), before);
  assert.doesNotMatch(els["modal-ko"].innerHTML, /bot-first/);
  KB.review(h, { ...won, code: "KFUN08", winner: "opp", hp: 0, opp_hp: 3000 });
  html = els["modal-ko"].innerHTML;
  assert.match(html, /<span class="ko-bub say stay op" aria-hidden="true">Niet getreurd\. Er is altijd een herkansing\.<\/span>/, "verloren: hij troost je");
  assert.doesNotMatch(html, /bot-first/);
  const old = new Date(Date.now() - 10 * 60000).toISOString();
  KB.review(h, { ...won, code: "KFUN09", finished_at: old });
  assert.doesNotMatch(els["modal-ko"].innerHTML, /ko-bub say|bot-first/, "een oud spel terugzien: geen praatjes");
  // tegen een mens: niets van dit alles
  KB.review(h, { ...won, code: "KFUN10", bot: null, opp_name: "Sanne", opp_flair: "🦊" });
  assert.doesNotMatch(els["modal-ko"].innerHTML, /ko-bub say|bot-first/);
});
