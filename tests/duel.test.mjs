// Tests voor ⚔️ Duels (/duel.js, lui geladen; server db/185). Geen DB, geen DOM: duel.js draait in een vm met een kale window.
// Draaien:  cd yeardle-nl && node --test tests/
import { test } from "node:test";
import vm from "node:vm";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(dir, "..", "duel.js"), "utf8");
const GAME = readFileSync(join(dir, "..", "game.js"), "utf8");
const TPL = readFileSync(join(dir, "..", "index.template.html"), "utf8");

function loadDuel() {
  const head = { kids: [], appendChild(e) { this.kids.push(e); } };
  const win = {};
  const doc = { head, getElementById: () => null, querySelector: () => null, createElement: () => ({ setAttribute() {}, textContent: "" }) };
  vm.runInContext(SRC, vm.createContext({ window: win, document: doc, String, Object, Array, Math, Date, Number, JSON, Intl, Set, Map, encodeURIComponent, setTimeout }));
  return win.Duel;
}
const D = loadDuel();
const X = D._;
const plain = (x) => JSON.parse(JSON.stringify(x));   // objecten uit de vm zijn van een ander "realm": zo vergelijkt deepEqual ze gewoon
const host = (o = {}) => ({ lang: "nl", intl: "nl-NL", loggedIn: false, myName: () => null, ...o });

test("duel.js — teksten in vijf talen met dezelfde sleutels, niets leeg of kapot", () => {
  const langs = D.langs();
  assert.deepEqual(plain([...langs].sort()), ["de", "en", "es", "nl", "pt"]);
  const nl = D.copy("nl");
  const sample = (v) => (typeof v === "function" ? v("Noor", 3, 2, "w") : v);
  for (const l of langs) {
    const c = D.copy(l);
    assert.deepEqual(Object.keys(c).sort(), Object.keys(nl).sort(), `${l}: zelfde sleutels als nl`);
    for (const [k, v] of Object.entries(c)) {
      assert.equal(typeof v, typeof nl[k], `${l}.${k}: zelfde soort`);
      const s = sample(v);
      assert.ok(typeof s === "string" && s.trim() && !/undefined|NaN|\[object/.test(s), `${l}.${k}: leeg of kapot (${s})`);
    }
    if (l !== "nl") assert.notEqual(c.newBtn, nl.newBtn, `${l}: vertaald`);
    assert.match(c.shInvite("Noor"), /^⚔️ /, `${l}: de uitnodiging begint met het zwaard`);
    assert.ok(c.left(23, 0) !== c.left(0, 40));
  }
  assert.equal(D.copy("xx").title, D.copy("en").title, "onbekende taal → Engels");
});

test("duel.js — uitslag: hoogste score per ronde, niet gespeeld verliest, gelijk → totaal", () => {
  const o = X.outcome([87, 74, 6, 100, 72], [95, 52, 38, 92, 85]);
  assert.deepEqual([o.w, o.l, o.res], [2, 3, "l"]);
  assert.deepEqual(plain(o.per), ["l", "w", "l", "w", "l"]);
  assert.equal(o.a, 339); assert.equal(o.b, 362);
  // Bram wint de eerste 3 en stopt; Noor speelde alles: de 2 rondes die Bram liet liggen zijn voor Noor, het duel 3–2 voor Bram.
  const stop = X.outcome([40, 40, 40, 40, 40], [90, 90, 90]);
  assert.deepEqual([stop.w, stop.l, stop.res], [2, 3, "l"], "drie gewonnen rondes blijven gewonnen");
  assert.deepEqual(plain(X.outcome([], []).per), ["n", "n", "n", "n", "n"], "allebei niet gespeeld = niemand");
  assert.equal(X.outcome([], []).res, "d");
  const tie = X.outcome([50, 60, 70, 80, 90], [60, 50, 70, 70, 95]);
  assert.deepEqual([tie.w, tie.l], [2, 2]); assert.equal(tie.res, "w", "2–2 met één gelijke ronde: het totaal beslist (350 tegen 345)");
  assert.equal(X.outcome([50, 50], [50, 50]).res, "d");
  assert.deepEqual(plain(X.stand([95, 52], [87, 74, 6, 100, 72])), { w: 1, l: 1, n: 2 }, "tussenstand: alleen rondes die jullie allebei speelden");
  assert.deepEqual(plain(X.stand([95, 52], [])), { w: 0, l: 0, n: 0 });
});

test("duel.js — tegels: de score van de ander pas na je eigen ronde; klaar = alles; onthulling klapt elke ronde om", () => {
  const active = { status: "active", mine: [95, 52], theirs: [87], their_done: 5 };
  const h = X.tilesHtml(active, { fresh: 1 });
  assert.equal((h.match(/class="duel-rd /g) || []).length, 5);
  assert.match(h, /class="duel-rd w"><small>R1<\/small><b>95<\/b><span>87<\/span>/);
  assert.match(h, /class="duel-rd mine new"><small>R2<\/small><b>52<\/b><span>\?<\/span>/, "de ander speelde R2 al, maar die score kwam (nog) niet mee: ?");
  assert.equal((h.match(/<span>\?<\/span>/g) || []).length, 4, "rondes die de ander al speelde: ?");
  const wait = X.tilesHtml({ status: "active", mine: [95, 52, 87, 92, 85], theirs: [87, 74], their_done: 2 });
  assert.equal((wait.match(/<span>–<\/span>/g) || []).length, 3, "je wacht op de ander: rondes die die nog niet speelde, –");
  const notYet = X.tilesHtml({ status: "active", mine: [95], theirs: [], their_done: 0 });
  assert.ok(!notYet.includes("?"), "de ander speelde nog niets: geen ?");
  const done = X.tilesHtml({ status: "done", mine: [87, 74, 6, 100, 72], theirs: [95, 52, 38, 92, 85] });
  assert.match(done, /duel-rd l"><small>R1<\/small><b>87<\/b><span>95<\/span>/);
  const timeout = X.tilesHtml({ status: "done", mine: [87], theirs: [] });
  assert.match(timeout, /duel-rd w"><small>R1<\/small><b>87<\/b><span>–<\/span>/); assert.equal((timeout.match(/duel-rd todo/g) || []).length, 4);
  const flip = X.tilesHtml({ status: "done", mine: [95, 52, 38, 92, 85], theirs: [87, 74, 6, 100, 72] }, { flip: true });
  assert.equal((flip.match(/class="fv"/g) || []).length, 5); assert.match(flip, /data-r="w" style="--i:0"/); assert.match(flip, /data-r="l" style="--i:1"/);
  assert.equal((flip.match(/<span>\?<\/span><i class="fv">/g) || []).length, 5, "vóór het omklappen: ?");
});

test("duel.js — tijd, groeperen per tegenstander, link", () => {
  const T = D.copy("nl"), now = Date.parse("2026-11-14T12:00:00Z");
  assert.equal(X.leftText(T, "2026-11-15T11:30:00Z", now), "nog 23 u");
  assert.equal(X.leftText(T, "2026-11-14T12:40:00Z", now), "nog 40 min");
  assert.equal(X.leftText(T, "2026-11-14T11:00:00Z", now), "nog 0 min");
  const items = [
    { code: "AAAAAA", status: "done", opp: "b", me: "c", c_name: "Noor", o_name: "Bram", finished_at: "2026-11-12T20:00:00Z", mine: [1], theirs: [2] },
    { code: "BBBBBB", status: "done", opp: "l", me: "o", c_name: "Lotte", o_name: "Noor", finished_at: "2026-11-13T20:00:00Z", mine: [3], theirs: [2] },
    { code: "CCCCCC", status: "done", opp: "b", me: "o", c_name: "Bram", o_name: "Noor", finished_at: "2026-11-14T08:00:00Z", mine: [5], theirs: [1] },
    { code: "DDDDDD", status: "active", opp: "b", me: "c" },
  ];
  const g = X.groupsOf(items);
  assert.deepEqual(plain(g.map((x) => x.k)), ["b", "l"], "nieuwste tegenstander eerst; lopende duels niet");
  assert.deepEqual(plain(g[0].ds.map((d) => d.code)), ["CCCCCC", "AAAAAA"]);
  assert.equal(X.LINK("K7QX2M"), "https://jaardle.com/?duel=K7QX2M");
});

test("duel.js — pop-up bij een link: aannemen (met naamveld zonder account), eigen link, al aangenomen, verlopen, revanche voor een ander", () => {
  X.setHost(host());
  const base = { code: "K7QX2M", c_name: "Noor<b>", deadline: new Date(Date.now() + 23.5 * 3600e3).toISOString() };
  const inv = X.popBody(D.copy("nl"), { ...base, me: null, status: "open", can_accept: true });
  assert.match(inv, /Noor&lt;b&gt; daagt je uit/, "namen ge-escaped");
  assert.match(inv, /id="duel-name-acc"/); assert.match(inv, /data-act="accept"/); assert.match(inv, /data-act="decline"/); assert.match(inv, /Nog 23 u om aan te nemen/);
  X.setHost(host({ loggedIn: true, myName: () => "Bram" }));
  assert.ok(!X.popBody(D.copy("nl"), { ...base, me: null, status: "open", can_accept: true }).includes("duel-name-acc"), "ingelogd met naam: geen naamveld");
  X.setHost(host());
  assert.match(X.popBody(D.copy("nl"), { ...base, me: "c", status: "open" }), /Dit is je eigen uitdaging[^]*data-act="send"/);
  assert.match(X.popBody(D.copy("nl"), { ...base, me: null, status: "active", o_name: "Sanne" }), /Sanne nam deze uitdaging al aan[^]*Daag zelf iemand uit/);
  assert.match(X.popBody(D.copy("nl"), { ...base, me: null, status: "expired" }), /verlopen[^]*Daag Noor&lt;b&gt; uit/);
  assert.match(X.popBody(D.copy("nl"), { ...base, me: null, status: "open", can_accept: false, locked: true }), /Deze revanche is voor iemand anders/);
  assert.match(X.popBody(D.copy("nl"), null), /Deze duellink klopt niet/);
});

test("duel.js — CSS: één <style>, geen fixed, minder beweging, klein bestand", () => {
  assert.ok(!/position:\s*fixed/.test(D.css));
  assert.match(D.css, /prefers-reduced-motion: reduce/);
  const used = new Set([...D.css.matchAll(/var\((--duel[a-z0-9-]*)/g)].map((m) => m[1])), defined = new Set([...D.css.matchAll(/(--duel[a-z0-9-]*)\s*:/g)].map((m) => m[1]));
  for (const u of used) assert.ok(defined.has(u), `${u} gebruikt maar niet gedefinieerd`);
  assert.ok(SRC.length < 110000, `het lui geladen bestand blijft klein (${SRC.length})`);
});

test("game.js ↔ duel.js — lui geladen, menu-item, link, duelronde telt niet en gaat naar duel_submit", () => {
  assert.match(GAME, /const loadDuel = fxLoader\("\/duel\.js", "Duel"\);/);
  assert.ok(!/<script[^>]+duel\.js/.test(TPL), "duel.js staat niet in de pagina: alleen lui");
  assert.match(TPL, /<button class="menu-item" role="menuitem" data-action="duels" data-i18n="menu_duels">\{\{i18n:menu_duels\}\}<\/button>/);
  assert.equal((GAME.match(/menu_duels: "⚔️ /g) || []).length, 5, "menu-label in vijf talen");
  assert.match(GAME, /else if \(action === "duels"\) openDuels\(\);/);
  assert.match(GAME, /"modal-login", "modal-duels"\]/, "één paneel tegelijk");
  assert.match(GAME, /if \(!hash \|\| state\.duel\) return Promise\.resolve\(\);/, "geen record_play voor een duelronde");
  assert.match(GAME, /if \(state\.duel\) loadDuel\(\)\.then\(\(D\) => D\.roundDone\(duelHost\(\), doneState, fresh\)\)/);
  assert.match(GAME, /if \(state\.duel\) localStorage\.setItem\(DUEL_BOARD_KEY\(state\.duel\.code, state\.duel\.round\), JSON\.stringify\(board\)\);/);
  assert.match(GAME, /\? `\$\{window\.location\.pathname\}\?duel=\$\{state\.duel\.code\}`/, "het duelscherm: ?duel= in de adresbalk, geen ?p=");
  assert.match(GAME, /duelsAfterLogin\(\);/); assert.match(GAME, /rpc\("duel_claim", \{ p_client: clientId\(\) \}\)/, "na inloggen: anonieme duels naar je account");
  assert.match(GAME, /lbParams\.get\("duel"\)/); assert.match(GAME, /D\.openInvite\(duelHost\(\), duelCode\)/);
  assert.match(GAME, /else if \(duelKnown\(\)\) setTimeout/, "het stipje: alleen wie duels heeft vraagt het na");
  for (const k of ["startRound", "newFree", "duelBoard", "dropDuelBoard", "dailyDone", "renderMenuDot", "showConfetti", "toEvent", "score", "flairHtml", "myFlair", "openLogin", "ready"]) {
    assert.ok(new RegExp(`\\b${k}\\b`).test(GAME.slice(GAME.indexOf("function duelHost()"), GAME.indexOf("function openDuels()"))), `duelHost mist ${k}`);
  }
});

test("db/185 ↔ duel.js — elke RPC die duel.js aanroept bestaat, met de juiste argumentnamen", { skip: !existsSync(join(dir, "..", "..", "jaardle-tools", "db", "185_duels.sql")) }, () => {
  const sql = readFileSync(join(dir, "..", "..", "jaardle-tools", "db", "185_duels.sql"), "utf8");
  const calls = [...SRC.matchAll(/call\("(duel_[a-z]+)", \{([^}]*)\}/g)].map((m) => [m[1], [...m[2].matchAll(/(p_[a-z]+):/g)].map((x) => x[1])]);
  assert.ok(calls.length >= 8);
  for (const [fn, args] of calls) {
    const def = sql.match(new RegExp(`create function public\\.${fn}\\(([^)]*)\\)`));
    assert.ok(def, `${fn} bestaat niet in db/185`);
    const params = [...def[1].matchAll(/(p_[a-z]+)\s/g)].map((x) => x[1]);
    assert.ok(params.includes("p_client"), `${fn}: p_client (call() stuurt hem altijd mee)`);
    for (const a of args) assert.ok(params.includes(a), `${fn}: argument ${a} bestaat niet`);
  }
});

test("duel.js v2 — duelscherm, eindstand, uitleg, link, flair en account-moment", () => {
  X.setHost(host({ flairHtml: (f) => `<span class="fl">${f}</span>`, myFlair: () => "🦊", loggedIn: true, myName: () => "Noor" }));
  const T = D.copy("nl");
  const vs = X.vsInner(T, { me: "c", c_name: "Noor", o_name: "Bram", o_flair: "🐢", mine: [95, 52], theirs: [87], their_done: 3, status: "active" }, { big: "1–0", small: "nog 21 u", cells: ["w", "p", "cur", "", ""] });
  assert.match(vs, /<span class="side me"><span class="dl-av fl" aria-hidden="true"><span class="fl">🦊<\/span><\/span><span><b>Jij<\/b><small>147 pt<\/small>/, "jij: je flair en je punten");
  assert.match(vs, /<span class="side op"><span class="dl-av fl" aria-hidden="true"><span class="fl">🐢<\/span><\/span><span><b>Bram<\/b><small>87 pt<\/small>/, "de ander: flair en alleen de zichtbare punten");
  assert.equal((vs.match(/duel-cell/g) || []).length, 6);
  X.setHost(host());
  const noFlair = X.vsInner(T, { me: "o", c_name: "Noor", o_name: "Bram", mine: [], theirs: [], their_done: 0, status: "active" }, { big: "0–0", small: "" });
  assert.match(noFlair, /<span class="side op"><span class="dl-av" aria-hidden="true">N<\/span>/, "zonder flair: de beginletter");
  assert.match(noFlair, /0\/5 gespeeld/);
  // de uitnodiging zonder account: "Al een account? Log in"; met account niet
  const inv = { code: "K7QX2M", c_name: "Noor", c_flair: "🦊", me: null, status: "open", can_accept: true, deadline: new Date(Date.now() + 5e7).toISOString() };
  X.setHost(host({ flairHtml: (f) => `<i>${f}</i>` }));
  assert.match(X.popBody(T, inv), /<h2><i>🦊<\/i> Noor daagt je uit<\/h2>/); assert.match(X.popBody(T, inv), /data-act="login"[^>]*>Al een account\? Log in</);
  assert.match(X.popBody(T, { ...inv, rematch: true }), /Noor wil revanche/);
  X.setHost(host({ loggedIn: true, myName: () => "Bram" }));
  assert.ok(!X.popBody(T, inv).includes('data-act="login"'));
  // jouw stand per tegenstander
  const items = [{ status: "done", opp: "b", mine: [9, 9, 9], theirs: [1, 1, 1] }, { status: "done", opp: "b", mine: [1], theirs: [9, 9] }, { status: "done", opp: "x", mine: [9], theirs: [1] }, { status: "active", opp: "b" }];
  assert.deepEqual(plain(X.h2hOf(items, "b")), [1, 1]);
  // CSS: duelscherm, duelkleur, nudges weg, eindstand, link
  for (const sel of ["[data-duelpage] #mode-tabs { display: none; }", "[data-arena] {", ".duel-top {", ".duel-vs {", ".ep {", ".dl-link {", ".dl-steps li::before", ".dl-stats {", "[data-duelpage] #catchup-bar"]) assert.ok(D.css.includes(sel), `CSS mist ${sel}`);
  assert.ok(!D.css.includes(".duel-bar {"), "de dunne balk is weg");
  assert.ok(!D.css.includes(".tab.duel-tab"), "geen tabblad-variant (gekozen: eigen duelscherm)");
});
