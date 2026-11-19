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
