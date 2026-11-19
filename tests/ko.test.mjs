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
  for (const l of langs) assert.ok(W.Duel.copy(l).koOpt && W.Duel.copy(l).koSub("Tim").includes("Tim"), `duel.js ${l}: koOpt/koSub`);
});

test("ko.js — ronde-factor ×1 ×1 ×1,5 ×2 ×2,5 ×3, zelfde als _ko_mult in db/208", () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 9].map(KO._.mult), [1, 1, 1.5, 2, 2.5, 3, 3]);
  const f = join(dir, "..", "..", "jaardle-tools", "db", "208_ko.sql");
  if (existsSync(f)) assert.match(readFileSync(f, "utf8"), /when p_round <= 2 then 1 when p_round = 3 then 1\.5 when p_round = 4 then 2 when p_round = 5 then 2\.5 else 3/);
});

test("ko.js — de levensstrook: jouw en hun levens, de ronde-factor, wat de ander doet (nooit jaren)", () => {
  const g = { code: "KABCDE", state: "live", round: 3, hp: 92, opp_hp: 64, opp_name: "Sanne", opp_flair: null, mine: [92, 81], theirs: [84, 89], opp_done: false, deadline: null };
  const s = KO._.stripHtml(host(), g);
  assert.match(s, /--hp:92/); assert.match(s, /--hp:64/);
  assert.match(s, /<b>R3<\/b><span class="up">×1,5<\/span>/);
  assert.match(s, /Sanne denkt na/);
  assert.doesNotMatch(s, /19\d\d/, "geen jaartallen");
  // de klok: Sanne klaar, jij nog niet
  const c = KO._.stripHtml(host(), { ...g, opp_done: true, deadline: new Date(Date.now() + 12000).toISOString() });
  assert.match(c, /Sanne is klaar ✓/); assert.match(c, /ko-clock/);
  // leeglopen na een ronde: --was = de oude stand
  const d = KO._.stripHtml(host(), g, { drain: { r: 2, who: "opp", me: 100, op: 64 } });
  assert.match(d, /ko-side me drain" style="--hp:92;--was:100"/);
  assert.match(d, /Ronde 2 voor Sanne/);
});

test("ko.js — de ronde-uitslag: verschil × factor = schade, bij gelijk geen schade", () => {
  const h = host({ els: { resultText: null } });
  const g = { code: "KABCDE", state: "live", round: 4, round_at: new Date(Date.now() + 5000).toISOString(), hp: 66, opp_hp: 92, opp_name: "Sanne", mine: [92, 81, 81], theirs: [84, 89, 98] };
  const r = KO._.resultHtml(h, g, 3);
  assert.match(r, /98 − 81 = 17, × 1,5 in ronde 3 = 26/);
  assert.match(r, /<em>−26<\/em>/);
  assert.match(r, /Ronde 4 begint over/);
  const t = KO._.resultHtml(h, { ...g, mine: [92, 81, 90], theirs: [84, 89, 90] }, 3);
  assert.match(t, /Ronde 3: gelijk/); assert.match(t, /Geen schade/);
});

test("db/208 ↔ ko.js — elke RPC die ko.js aanroept bestaat, met de juiste argumentnamen", { skip: !existsSync(join(dir, "..", "..", "jaardle-tools", "db", "208_ko.sql")) }, () => {
  const sql = readFileSync(join(dir, "..", "..", "jaardle-tools", "db", "208_ko.sql"), "utf8");
  const calls = [...KOSRC.matchAll(/call\("(ko_[a-z]+)", \{([^}]*)\}/g)].map((m) => [m[1], [...m[2].matchAll(/(p_[a-z]+):/g)].map((x) => x[1])]);
  assert.deepEqual([...new Set(calls.map((c) => c[0]))].sort(), ["ko_answer", "ko_cancel", "ko_get", "ko_guess", "ko_invite", "ko_rematch", "ko_submit"]);
  for (const [fn, args] of calls) {
    const def = sql.match(new RegExp(`create or replace function public\\.${fn}\\(([^)]*)\\)`, "i"));
    assert.ok(def, `${fn} bestaat niet in db/208`);
    const params = [...def[1].matchAll(/(p_[a-z]+)\s/g)].map((x) => x[1]);
    assert.deepEqual(params.sort(), [...args].sort(), `${fn}: argumenten`);
  }
  assert.match(sql, /grant execute on function public\.ko_invite[\s\S]*to authenticated;/);
  assert.doesNotMatch(sql, /to anon/, "anoniem mag niets");
});

test("game.js / duel.js / live.js ↔ ko.js — lui geladen, rondes en seintjes gaan naar ko.js", () => {
  assert.match(GAME, /const loadKoFile = fxLoader\("\/ko\.js", "KO"\);/);
  assert.match(GAME, /const loadKo = \(\) => loadDuel\(\)\.then\(loadKoFile\);/, "eerst duel.js (Duel.kit)");
  assert.match(GAME, /"jaardle:ko-rt", \(e\) => loadKo\(\)\.then\(\(K\) => K\.event\(duelHost\(\), e\.detail\)\)/);
  assert.match(GAME, /if \(state\.duel\?\.ko\) window\.KO\?\.guessed\?\.\(state\);/);
  assert.match(GAME, /koTimeout: \(\) => \{ if \(state\?\.duel\?\.ko && !state\.done\) finishGame\(false, true\); \}/);
  assert.match(DUEL, /if \(st\?\.duel\?\.ko\) \{ H\.ko\?\.\(\)\.then\(\(K\) => K\.sync\(H\)\)/);
  assert.match(DUEL, /if \(dl\.ko\) return H\.ko\?\.\(\)\.then\(\(K\) => K\.roundDone\(H, st\)\)/);
  assert.match(DUEL, /isOn\(t\.k\) \? koOptHtml\(T, t\) : ""/, "Live alleen bij een vriend die online is");
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
  const doc = { hidden: false, head: { appendChild() {} }, body: { setAttribute() {}, appendChild(e) { if (e.id) els[e.id] = e; } },
    getElementById: (id) => els[id] || null, querySelector: () => null, querySelectorAll: () => [], createElement: mk };
  const localStorage = { getItem: (k) => (k === "jaardle:duelsfx" && on ? "1" : null) };
  const ctx = vm.createContext({ window: win, document: doc, localStorage, performance: { now: () => 0 }, Float32Array, String, Object, Array, Math, Date, Number, JSON, Intl, Set, Map, URL,
    encodeURIComponent, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {} });
  vm.runInContext(DUEL, ctx);
  vm.runInContext(KOSRC, ctx);
  return { KO: win.KO, log };
}
const ARGS = { tick: [3], hit: [26, true], ko: [true], want: [0] };

test("ko.js — knock-out-geluid: negen klanken, stil en zonder fout zonder vinkje of zonder Web Audio, elk moment één keer", () => {
  const { KO: K1, log } = loadAudio(true);
  assert.deepEqual([...Object.keys(K1._.SFX)].sort(), ["clock", "count", "draw", "go", "hit", "invite", "ko", "tick", "want"]);
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
    assert.ok(r.end - 10 < 3, "alles is binnen 3 s uitgeklonken");
  }
  // schade: de klap valt als de balk zakt (ko-drop wacht 0,5 s) en is harder bij meer schade
  assert.ok(/ko-drop 0\.35s ease-out 0\.5s both/.test(KOSRC) && /A\.thud\(b, 0\.5,/.test(KOSRC) && /A\.swish\(b, 0\.5,/.test(KOSRC), "klap op 0,5 s, gelijk met ko-drop");
  const peak = (x) => { log.gains.length = 0; K1._.sfx(`p:${x}`, "hit", x, false); return Math.max(...log.gains); };
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
  const { KO: K3, log } = loadAudio(true);
  const opened = [];
  const h = host({ state: () => null, openModal: (id) => opened.push(id), closeModal() {} });
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
  // de haakjes in de code: ⚡ bij de start van ronde 1, de klok alleen als jij nog speelt, tikken alleen als je niet klaar bent
  assert.match(KOSRC, /tStart = setTimeout\(\(\) => \{ sfx\(`go:\$\{g\.code\}`, "go"\); startRound\(g\); \}/);
  assert.match(KOSRC, /if \(!st\.done && end - now\(\) > 1000\) sfx\(`dl:\$\{rk\}`, "clock"\);/);
  assert.match(KOSRC, /if \(s > 0 && s <= 5 && !H\.state\(\)\?\.done\) sfx\(`t:\$\{rk\}:\$\{s\}`, "tick", s\);/);
  assert.match(KOSRC, /if \(a !== b\) sfx\(`res:\$\{g\.code\}:\$\{r\}`, "hit", x, a < b\);/);
  assert.match(DUEL, /au: \{ bus: sfxBus, play: sfx, nap: auNap, swish, ring, tick, thud \}/, "de motor blijft in duel.js");
});
