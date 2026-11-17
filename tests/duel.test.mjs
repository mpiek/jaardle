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
  assert.match(X.popBody(D.copy("nl"), { ...base, me: null, status: "open", can_accept: false, locked: true, rematch: true }), /Deze revanche is voor iemand anders/);
  assert.match(X.popBody(D.copy("nl"), { ...base, me: null, status: "open", can_accept: false, locked: true }), /Log in met je account om hem aan te nemen[^]*data-act="login"/, "directe uitdaging zonder account: eerst inloggen");
  X.setHost(host({ loggedIn: true, myName: () => "Sanne" }));
  assert.match(X.popBody(D.copy("nl"), { ...base, me: null, status: "open", can_accept: false, locked: true }), /Deze uitdaging is voor iemand anders/);
  X.setHost(host());
  assert.match(X.popBody(D.copy("nl"), null), /Deze duellink klopt niet/);
});

test("duel.js — CSS: één <style>, geen fixed, minder beweging, klein bestand", () => {
  assert.ok(!/position:\s*fixed/.test(D.css.replace(/#duel-intro \{[^}]*\}/, "")), "alleen de opening van een ronde ligt over het hele scherm");
  assert.match(D.css, /prefers-reduced-motion: reduce/);
  const used = new Set([...D.css.matchAll(/var\((--duel[a-z0-9-]*)/g)].map((m) => m[1])), defined = new Set([...D.css.matchAll(/(--duel[a-z0-9-]*)\s*:/g)].map((m) => m[1]));
  for (const u of used) assert.ok(defined.has(u), `${u} gebruikt maar niet gedefinieerd`);
  assert.ok(SRC.length < 182000, `het lui geladen bestand blijft klein (${SRC.length})`);   // db/189: +teamgenoten, seintjes, stand (≈ +7 KB gzip); db/190: +deelplaatje, toeschouwer, flair-effecten op het plaatje; alleen voor wie duelleert; 17/11: +de opening van een ronde (≈ +4 KB gzip)
});

test("game.js ↔ duel.js — lui geladen, menu-item, link, duelronde gaat naar duel_submit en telt als vrij potje", () => {
  assert.match(GAME, /const loadDuel = fxLoader\("\/duel\.js", "Duel"\);/);
  assert.ok(!/<script[^>]+duel\.js/.test(TPL), "duel.js staat niet in de pagina: alleen lui");
  assert.match(TPL, /<button class="menu-item" role="menuitem" data-action="duels" data-i18n="menu_duels">\{\{i18n:menu_duels\}\}<\/button>/);
  assert.equal((GAME.match(/menu_duels: "⚔️ /g) || []).length, 5, "menu-label in vijf talen");
  assert.match(GAME, /else if \(action === "duels"\) openDuels\(\);/);
  assert.match(GAME, /"modal-login", "modal-duels"\]/, "één paneel tegelijk");
  assert.match(GAME, /if \(!hash \|\| state\.duel\) return Promise\.resolve\(\);/, "geen record_play voor een duelronde (duel_submit schrijft de rij)");
  // db/200: een duelronde telt als een vrij potje, zonder rating. Dezelfde gegevens als record_play (playFields) gaan mee als
  // p_play; de ronde is niet meer "gedeeld" (anders tellen de lokale tellers en de potjes-events hem niet); zonder db/200 nog
  // eens zonder p_play. Geen ⚡-regel: de server schrijft het potje ongewaardeerd.
  assert.match(GAME, /p_fact_hash: hash,\n    \.\.\.playFields\(\),/, "record_play en duel_submit krijgen dezelfde gegevens");
  assert.match(GAME, /function duelPlayStart\(st\) \{\n  if \(st !== state \|\| !st\.done\) return null;/);
  { const fn = GAME.slice(GAME.indexOf("function duelPlayStart(st)"), GAME.indexOf("function openDuels()"));
    assert.ok(!/ratingLineStart|showLiveRating|refreshMyRating/.test(fn), "een duelronde raakt de rating niet: geen ⚡-regel");
    assert.match(fn, /checkAchievements\(\)/, "wel een unlock-kaartje");
    assert.match(fn, /ANON_PLAYED_KEY/, "en na inloggen gaan de duelpotjes mee (claimDevicePlays)"); }
  assert.match(GAME, /play: playFields\(\),/);
  assert.match(GAME, /done: \(id\) => \{\n      if \(id == null\) return;/, "geen rij (herladen, oude server): niets bijwerken");
  assert.ok(!/shared: true/.test(SRC), "een duelronde is geen gedeeld potje meer");
  assert.match(SRC, /call\("duel_submit", \{ p_code: dl\.code, p_round: dl\.round, p_score: score, p_play: sent \? sent\.play : null \}\)/);
  assert.match(SRC, /if \(!r\.ok && \/PGRST202\|schema cache\|p_play\/i\.test\(r\.e \|\| ""\)\) r = await call\("duel_submit", \{ p_code: dl\.code, p_round: dl\.round, p_score: score \}\);/, "server zonder db/200: de ronde telt nog");
  assert.match(SRC, /try \{ if \(sent\) sent\.done\(r\.ok && r\.v && r\.v\.play != null \? r\.v\.play : null\); \} catch \(e\) \{\}/);
  assert.match(SRC, /let sent = null; try \{ sent = H\.playStart \? H\.playStart\(st\) : null; \} catch \(e\) \{\}/, "het potje mag de ronde nooit tegenhouden");
  assert.match(GAME, /if \(state\.duel\) loadDuel\(\)\.then\(\(D\) => D\.roundDone\(duelHost\(\), doneState, fresh\)\)/);
  assert.match(GAME, /if \(state\.duel\) localStorage\.setItem\(DUEL_BOARD_KEY\(state\.duel\.code, state\.duel\.round\), JSON\.stringify\(board\)\);/);
  assert.match(GAME, /\? `\$\{window\.location\.pathname\}\?duel=\$\{state\.duel\.code\}`/, "het duelscherm: ?duel= in de adresbalk, geen ?p=");
  assert.match(GAME, /duelsAfterLogin\(\);/); assert.match(GAME, /rpc\("duel_claim", \{ p_client: clientId\(\) \}\)/, "na inloggen: anonieme duels naar je account");
  assert.match(GAME, /lbParams\.get\("duel"\)/); assert.match(GAME, /D\.openInvite\(duelHost\(\), duelCode\)/);
  assert.match(GAME, /else if \(duelKnown\(\)\) setTimeout/, "het stipje: alleen wie duels heeft vraagt het na");
  for (const k of ["startRound", "newFree", "duelBoard", "dropDuelBoard", "dailyDone", "renderMenuDot", "showConfetti", "toEvent", "score", "flairHtml", "myFlair", "openLogin", "ready", "playStart"]) {
    assert.ok(new RegExp(`\\b${k}\\b`).test(GAME.slice(GAME.indexOf("function duelHost()"), GAME.indexOf("function openDuels()"))), `duelHost mist ${k}`);
  }
});

test("db/185 + 189 + 200 ↔ duel.js — elke RPC die duel.js aanroept bestaat, met de juiste argumentnamen", { skip: !existsSync(join(dir, "..", "..", "jaardle-tools", "db", "200_duel_plays.sql")) }, () => {
  // de laatste definitie telt (db/189 maakt duel_create opnieuw, met p_for; db/200 duel_submit, met p_play)
  const sql = ["185_duels.sql", "186_duels_flair_claim.sql", "189_duel_push.sql", "200_duel_plays.sql"].map((f) => readFileSync(join(dir, "..", "..", "jaardle-tools", "db", f), "utf8")).join("\n");
  const calls = [...SRC.matchAll(/call\("(duel_[a-z]+)", \{([^}]*)\}/g)].map((m) => [m[1], [...m[2].matchAll(/(p_[a-z]+):/g)].map((x) => x[1])]);
  assert.ok(calls.length >= 8);
  assert.ok(calls.some(([fn, a]) => fn === "duel_create" && a.includes("p_for")), "direct uitdagen stuurt p_for");
  assert.ok(calls.some(([fn, a]) => fn === "duel_submit" && a.includes("p_play")), "een ronde stuurt het potje mee (p_play)");
  for (const [fn, args] of calls) {
    const defs = [...sql.matchAll(new RegExp(`create (?:or replace )?function public\\.${fn}\\(([^)]*)\\)`, "gi"))], def = defs[defs.length - 1];
    assert.ok(def, `${fn} bestaat niet in db/185–200`);
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

test("duel — GoatCounter-meetpunten over de hele trechter (via gcCount, site jaardle-events)", () => {
  for (const p of ["duel-create", "duel-rematch", "duel-invite-", "duel-copy-link", "duel-resend", "duel-withdraw", "duel-link-", "duel-accept", "duel-decline",
    "duel-login-invite", "duel-round-", "duel-done-first", "duel-done-second", "duel-reveal", "duel-tell", "duel-share-result", "duel-exit", "duel-help", "duel-login-end", "duel-login-list"]) {
    assert.ok(SRC.includes(`"${p}`), `meetpunt ${p} ontbreekt in duel.js`);
  }
  assert.match(GAME, /gcCount\("duel-list", /, "⋮ → Duels telt in game.js");
  assert.match(GAME, /gcCount\("duel-login-back", /, "terug na het inloggen (teller bij duel-login-invite|-end|-list) telt in game.js");
  assert.match(GAME.slice(GAME.indexOf("function duelHost()"), GAME.indexOf("function openDuels()")), /\bgc: gcCount\b/, "duel.js telt via gcCount (jaardle-events), niet zelf");
});

test("duel.js — de Duels-lijst verklapt geen ongeziene uitslag; jouw beurt en het groene vak staan boven 'Daag een vriend uit'", () => {
  X.setHost(host());
  const T = D.copy("nl"), soon = new Date(Date.now() + 5e7).toISOString(), now = new Date().toISOString();
  const lost = { code: "AAAAAA", status: "done", seen: false, opp: "b", me: "o", c_name: "Bram", o_name: "Noor", finished_at: now, mine: [95, 100, 92, 90, 63], theirs: [100, 95, 100, 82, 76] };
  const turn = { code: "BBBBBB", status: "active", opp: "l", me: "o", c_name: "Lotte", o_name: "Noor", deadline: soon, mine: [], theirs: [], their_done: 5 };
  // ongezien: geen stand, geen "verloren", geen blokjes; wel de uitnodiging om te tikken (het rode stipje blijft)
  const h = X.listBody(T, [lost, turn], "", null);
  assert.ok(!/verloren|dl-stats|dl-rec|2–3|0–1/.test(h), "niets van de uitslag in de lijst");
  assert.match(h, /has-new[^]*Uitslag binnen · tik om te onthullen/);
  assert.deepEqual(plain(X.h2hOf([lost], "b")), [0, 0], "telt ook niet mee in 'jullie a–b'");
  // gezien: dan wel stand, uitslag en blokjes
  const seen = X.listBody(T, [{ ...lost, seen: true }], "", null);
  assert.match(seen, /dl-stats[^]*<b>0<\/b><small>Gewonnen[^]*<b>1<\/b><small>Verloren/);
  assert.match(seen, /Vandaag: verloren 2–3/); assert.match(seen, /<b>0–1<\/b>/);
  assert.deepEqual(plain(X.h2hOf([{ ...lost, seen: true }], "b")), [0, 1]);
  // volgorde: jouw beurt vóór de grote knop; net verstuurd: het groene vak vóór de grote knop; naamveld: geen grote knop
  assert.ok(h.indexOf('data-act="play"') < h.indexOf('class="dl-new"'), "Speel boven Daag een vriend uit");
  const sent = X.listBody(T, [turn], `<div class="dl-sent">✓</div>`, null);
  assert.ok(sent.indexOf("dl-sent") < sent.indexOf('data-act="play"') && sent.indexOf('data-act="play"') < sent.indexOf('class="dl-new"'));
  assert.ok(!X.listBody(T, [turn], `<form class="dl-name"></form>`, null).includes('class="dl-new"'));
  assert.match(X.listBody(T, [], "", null), /dl-hero[^]*class="dl-new"/, "lege staat ongewijzigd");
});

test("duel.js v3 (db/189) — gezichtjes met jullie stand, kiezen → 'Daag X uit', loopt = geen keuze; zonder account alleen de link", () => {
  const T = D.copy("nl");
  X.setHost(host({ loggedIn: true, myName: () => "Noor", faceHue: (n) => (n === "Bram" ? 28 : 190), flairHtml: (f) => `<i>${f}</i>` }));
  const now = new Date().toISOString();
  X.applyList({
    items: [{ code: "AAAAAA", status: "done", seen: true, opp: "kb", me: "c", c_name: "Noor", o_name: "Bram", finished_at: now, mine: [9, 9, 9, 9, 9], theirs: [1, 1, 1, 1, 1] }],
    h2h: { kb: { w: 4, l: 2, n: 6, rw: 16, rl: 13, a: 2400, b: 2200, best: [4, 1] }, kj: { w: 1, l: 3, n: 4 } },
    targets: [{ k: "kb", name: "Bram", flair: "🦫", team: true, busy: null }, { k: "kj", name: "Joost", flair: null, team: true, busy: null },
              { k: "ks", name: "Sanne", flair: null, team: true, busy: null }, { k: "kl", name: "Lotte", flair: "🔥", team: true, busy: "LLLLLL" }],
  });
  let h = X.pickHtml(T, "<NEW>");
  assert.match(h, /Daag iemand uit/);
  assert.match(h, /data-face="kb" aria-pressed="false"><span class="dl-av fl hue" style="--h:28" aria-hidden="true"><i>🦫<\/i><\/span><b>Bram<\/b><small class="up">4–2<\/small>/, "Bram: flair, kleur zoals het histogram, groen 4–2");
  assert.match(h, /<b>Joost<\/b><small class="down">1–3<\/small>/); assert.match(h, /<b>Sanne<\/b><small class="new">nieuw<\/small>/);
  assert.match(h, /class="dl-face busy" data-face="kl"[^]*<small class="run">loopt<\/small>/);
  assert.match(h, /<NEW>/, "zonder keuze: de gewone knop (de link)");
  X.setPick("kb");
  h = X.pickHtml(T, "<NEW>");
  assert.ok(!h.includes("<NEW>"));
  assert.match(h, /Jij tegen Bram: <b>4–2<\/b>/); assert.match(h, /data-act="challenge" data-k="kb"[^>]*>[^]*Daag Bram uit/); assert.match(h, /data-act="new">Liever een link sturen/);
  X.setHost(host({ loggedIn: false }));
  assert.equal(X.pickHtml(T, "<NEW>"), "<NEW>", "zonder account geen gezichtjes");
  X.setPick(null);
  X.applyList({ items: [], h2h: {}, targets: [] });
});

test("duel.js v3 — een uitdaging aan jou bovenaan (Neem aan / ✕), je directe uitdaging onder Wacht, stand van de server", () => {
  const T = D.copy("nl"), soon = new Date(Date.now() + 5e7).toISOString();
  X.setHost(host({ loggedIn: true, myName: () => "Noor" }));
  const inc = { code: "IIIIII", status: "open", me: null, can_accept: true, locked: true, opp: "kl", c_name: "Lotte", c_flair: "🔥", deadline: soon };
  const out = { code: "OOOOOO", status: "open", me: "c", locked: true, opp: "kb", c_name: "Noor", for_name: "Bram", for_flair: "🦫", deadline: soon };
  X.applyList({ items: [inc, out], h2h: { kl: { w: 1, l: 1, n: 2 }, kb: { w: 4, l: 2, n: 6 } }, targets: [] });
  const h = X.listBody(T, [inc, out], "", null);
  assert.match(h, /Jouw beurt[^]*Lotte daagt je uit[^]*Jullie 1–1[^]*data-act="accept" data-code="IIIIII"[^]*data-act="decline" data-code="IIIIII"/);
  assert.match(h, /Wacht[^]*<b>Bram <small>· jullie 4–2<\/small><\/b><small>Uitgedaagd · Nog \d+ u om aan te nemen<\/small>[^]*data-act="withdraw" data-code="OOOOOO"/);
  assert.ok(h.indexOf("Lotte daagt je uit") < h.indexOf("Daag een vriend uit"), "eerst wat op je wacht");
  assert.match(h, /<div class="dl-stat w"><b>5<\/b>[^]*<div class="dl-stat l"><b>3<\/b>/, "je stand bovenin: over alle duels (server)");
  X.applyList({ items: [], h2h: {}, targets: [] });
});

test("duel.js v3 — seintjes-knop: niets zonder push, knop zonder toestemming, regel als ze aan staan", () => {
  X.setHost(host({ remindSupport: () => null }));
  assert.equal(X.bellHtml("Seintje als Bram begint", "aan"), "");
  X.setHost(host({ remindSupport: () => "push" }));   // geen Notification in de vm: nog niet aan
  assert.match(X.bellHtml("Seintje als Bram begint", "Je krijgt een seintje als Bram begint"), /<button type="button" class="dl-bell" data-act="push" data-on="Je krijgt een seintje als Bram begint">[^]*Seintje als Bram begint<\/button>/);
  const T = D.copy("nl");
  assert.equal(T.bellAcc("Bram"), "Seintje als Bram begint");
  assert.match(T.pushYes("Bram"), /meteen een seintje/);
  assert.match(D.css, /\.dl-av\.hue \{ color: var\(--fg\); background: color-mix\(in srgb, hsl\(var\(--h\) 65% 52%\) 38%, var\(--card-soft\)\); \}/, "zelfde achtergrond als .hist-face");
  for (const sel of [".dl-face {", ".dl-faces {", ".dl-vsline {", ".dl-bell {", ".dl-x {", ".dl-h2h-sub {", ".duel-inv .duel-h2h {"]) assert.ok(D.css.includes(sel), `CSS mist ${sel}`);
});

test("game.js / sw.js / remind.js ↔ db/189 — kleur, seintjes-schakelaar, rode stip voor een uitdaging, tag per duel", () => {
  const host = GAME.slice(GAME.indexOf("function duelHost()"), GAME.indexOf("function openDuels()"));
  for (const k of ["faceHue", "remindSupport", "remindOn", "openInstall", "onPushChange"]) assert.ok(new RegExp(`\\b${k}\\b`).test(host), `duelHost mist ${k}`);
  assert.match(TPL, /data-action="duel-push" data-i18n="menu_duel_push" hidden>\{\{i18n:menu_duel_push\}\}<\/button>/);
  assert.equal((GAME.match(/menu_duel_push: "⚔️ /g) || []).length, 5);
  assert.match(GAME, /if \(action === "duel-push"\) \{/); assert.match(GAME, /D\.pushToggle\(duelHost\(\)\)/);
  assert.match(GAME, /if \(!duelKnown\(\)\) duelInboxCheck\(\);/, "met een account zonder duels op dit toestel: één klein getal");
  assert.match(GAME, /rpc\("duel_inbox", \{ p_client: clientId\(\) \}\)/); assert.match(GAME, /15 \* 60 \* 1000/, "hooguit eens per kwartier");
  const SW = readFileSync(join(dir, "..", "sw.js"), "utf8"), RM = readFileSync(join(dir, "..", "remind.js"), "utf8");
  assert.match(SW, /tag: d\.tag \|\| "jaardle-daily"/);
  assert.match(RM, /if \(sub && !duelKeep\) await sub\.unsubscribe\(\);/, "het dagelijkse seintje uit laat zelf aangezette duel-seintjes staan");
  assert.match(SRC, /"jaardle:duelpush"/); assert.match(GAME, /"jaardle:duelpush"/); assert.match(RM, /"jaardle:duelpush"/);
  for (const p of ["duel-create-direct", "duel-create-team", "duel-push-on", "duel-push-off", "duel-push-denied"]) assert.ok(SRC.includes(`"${p}`), `meetpunt ${p}`);
});

// ── stap 2 (db/190, mockup v6): uitslag delen als plaatje + link, en de uitslag voor wie de link opent zonder mee te spelen ──
const FACE_HUES_GAME = JSON.parse(GAME.match(/const FACE_HUES = (\[[^\]]+\])/)[1]);
function faceHueGame(name) { let h = 0; const s = String(name || ""); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return FACE_HUES_GAME[h % FACE_HUES_GAME.length]; }

test("duel.js v4 — de kleuren van het plaatje zijn die van de gezichtjes; winnaar links; gelijke kleur schuift vast op", () => {
  assert.deepEqual(plain(X.HUES), FACE_HUES_GAME, "HUES in duel.js = FACE_HUES in game.js");
  X.setHost(host({ faceHue: faceHueGame }));
  assert.equal(faceHueGame("Noor"), faceHueGame("Bram"), "Noor en Bram hebben toevallig dezelfde kleur (zo test dit het opschuiven)");
  const spec = (c, o) => ({ code: "K7QX2M", status: "done", me: null, c_name: "Noor", o_name: "Bram", spec: { c, o, c_key: "kc", o_key: "ko" } });
  const win = X.duelSides(spec([95, 52, 87, 92, 85], [87, 74, 64, 100, 72]));
  const loss = X.duelSides(spec([87, 74, 64, 100, 72], [95, 52, 87, 92, 85]));
  assert.equal(win.a.name, "Noor"); assert.equal(loss.a.name, "Bram", "de winnaar staat links");
  assert.deepEqual([win.o.w, win.o.l, win.o.res], [3, 2, "w"]); assert.deepEqual([loss.o.w, loss.o.l], [3, 2]);
  assert.notEqual(win.a.hue, win.b.hue, "twee verschillende kleuren");
  assert.equal(win.a.hue, loss.b.hue, "Noor houdt haar kleur, wie er ook won"); assert.equal(win.b.hue, loss.a.hue);
  assert.equal(win.b.hue, faceHueGame("Bram"), "Bram (eerder in het alfabet) houdt de kleur van zijn gezichtje");
  const tie = X.duelSides(spec([90, 60, 80, 70, 85], [85, 65, 80, 75, 80]));
  assert.equal(tie.o.res, "d"); assert.equal(tie.a.name, "Noor", "gelijk: de uitdager links");
  // je eigen duel: jij en de ander
  const own = X.duelSides({ code: "K7QX2M", status: "done", me: "o", c_name: "Bram", o_name: "Noor", c_flair: "🦫", o_flair: "🎲~sparkle", mine: [95, 52, 87, 92, 85], theirs: [87, 74, 64, 100, 72] });
  assert.equal(own.a.name, "Noor"); assert.equal(own.a.flair, "🎲~sparkle"); assert.equal(own.b.flair, "🦫");
  assert.equal(X.flairEmoji("🎲~sparkle"), "🎲", "effect eraf"); assert.equal(X.flairEmoji("v:capibara"), null, "een vondst-tekening → beginletter"); assert.equal(X.flairEmoji(null), null);
});

test("duel.js v4 — pop-up voor een buitenstaander: uitslag met omdraaiende rondes, 'Daag zelf iemand uit'; teamgenoot: 'Daag <winnaar> uit'", () => {
  const T = D.copy("nl");
  const d = { code: "K7QX2M", status: "done", me: null, c_name: "Noor<b>", o_name: "Bram", finished_at: "2026-11-16T19:00:00Z",
    spec: { c: [95, 52, 87, 92, 85], o: [87, 74, 64, 100, 72], c_key: "kc", o_key: "ko" } };
  X.setHost(host({ faceHue: faceHueGame }));
  const anon = X.spectateBody(T, d);
  assert.match(anon, /🏆 Noor&lt;b&gt; wint 3–2 van Bram/, "kop met winnaar, ge-escaped");
  assert.match(anon, /class="side me win"[^]*Noor&lt;b&gt;[^]*class="side op"[^]*Bram/, "winnaar links met de gouden rand");
  assert.equal((anon.match(/class="sp-rd /g) || []).length, 5);
  assert.match(anon, /class="sp-rd wa" style="--i:0"><small>R1<\/small><b class="a">95<\/b><b class="b lo">87<\/b>/);
  assert.match(anon, /class="sp-rd wb" style="--i:1"><small>R2<\/small><b class="a lo">52<\/b><b class="b">74<\/b>/);
  assert.match(anon, /data-act="new">⚔️ Daag zelf iemand uit/); assert.match(anon, /data-act="sp-daily">Speel de daily van vandaag/);
  assert.match(anon, /Nieuw hier\?/, "zonder account: één zin over wat Jaardle is");
  assert.ok(!/sp-for/.test(anon), "zonder account geen directe uitdaging");
  // ingelogd, Noor is een teamgenoot (vrij) met een stand
  X.setHost(host({ faceHue: faceHueGame, loggedIn: true, myName: () => "Sanne" }));
  X.applyList({ items: [], targets: [{ k: "kc", name: "Noor", team: true, busy: null }], h2h: { kc: { w: 1, l: 2, n: 3 } } });
  const mate = X.spectateBody(T, d);
  assert.match(mate, /Jij tegen Noor&lt;b&gt; <b>1–2<\/b>/); assert.match(mate, /data-act="sp-for" data-k="kc" data-name="Noor&lt;b&gt;">⚔️ Daag Noor&lt;b&gt; uit/);
  assert.match(mate, /data-act="new">Daag iemand anders uit/); assert.ok(!/Nieuw hier/.test(mate));
  X.applyList({ items: [], targets: [{ k: "kc", name: "Noor", team: true, busy: "ABCDEF" }], h2h: {} });
  assert.ok(!/sp-for/.test(X.spectateBody(T, d)), "loopt er al een duel met de winnaar: geen directe uitdaging");
  X.applyList({ items: [], targets: [], h2h: {} });
  const tie = X.spectateBody(T, { ...d, spec: { ...d.spec, c: [90, 60, 80, 70, 85], o: [85, 65, 80, 75, 80] } });
  assert.match(tie, /Gelijkspel tussen Noor&lt;b&gt; en Bram/); assert.ok(!/class="side me win"/.test(tie), "gelijk: geen gouden rand");
  const pts = X.spectateBody(T, { ...d, spec: { ...d.spec, c: [50, 60, 70, 80, 90], o: [60, 50, 70, 70, 95] } });
  assert.match(pts, /wint op totaal van/); assert.match(pts, /<small>op totaal<\/small>/);
});

test("duel.js v4 — delen: plaatje + link als het toestel bestanden kan delen, anders tekst mét link; de link opent de uitslag", () => {
  const share = SRC.slice(SRC.indexOf("function share(host"), SRC.indexOf("async function markSeen"));
  assert.match(share, /shareImage\(s\.d, `\$\{line\}\\n\$\{url\}`\)/, "plaatje met regel + link");
  assert.match(share, /shareText\(T, `\$\{line\}\\n\$\{squares\(o\)\} · \$\{T\.shTotals\(o\.a, o\.b\)\}`, url, btn\)/, "zonder plaatje: tekst met de link (was zonder)");
  assert.match(SRC, /navigator\.canShare\(\{ files: \[file\], text \}\)/); assert.match(SRC, /navigator\.share\(\{ files: \[file\], text \}\)/);
  assert.match(SRC, /H\?\.isMobile\?\.\(\)/, "alleen op een telefoon (op een computer kopiëren, zoals nu)");
  const end = SRC.slice(SRC.indexOf("function renderEnd("), SRC.indexOf("function next(host)"));
  assert.equal((end.match(/prepShare\(d\)/g) || []).length, 2, "plaatje klaarzetten op de eindkaart en in de eindstand-pop-up");
  assert.match(SRC, /if \(!d \|\| d\.status !== "done" \|\| pngs\[d\.code\] \|\| !canShareFiles\(\)\) return;/, "alleen bij een afgelopen duel, één keer, en alleen waar het kan");
  const inv = SRC.slice(SRC.indexOf("async function openInvite("), SRC.indexOf("function popBody("));
  assert.match(inv, /if \(d && !d\.me && d\.status === "done" && d\.spec\)/, "buitenstaander + afgelopen duel → de uitslag");
  assert.ok(inv.indexOf("d.spec") > inv.indexOf("if (d && d.me &&"), "spelers zelf gaan eerst naar hun eigen duel");
  assert.match(SRC, /"\/favicon-192\.png"/); assert.match(SRC, /toBlob\(/);
  for (const p of ["duel-share-image", "duel-link-spectate", "duel-spectate-challenge", "duel-spectate-challenge-direct", "duel-spectate-daily"]) assert.ok(SRC.includes(`"${p}"`), `meetpunt ${p}`);
  assert.match(D.css, /\.sp\.rev \.sp-rd \{ animation: dsp-flip/); assert.match(D.css, /prefers-reduced-motion: reduce\) \{\n  \.sp\.rev \.sp-rd/, "omdraaien valt weg bij minder beweging");
  assert.ok(!/\?ref=/.test(SRC.slice(SRC.indexOf("const LINK"), SRC.indexOf("const LINK") + 80)), "geen ref aan de deellink");
});

test("duel.js v4 — het plaatje tekent je flair zoals in het spel: emoji of vondst-tekening, met elk effect uit flair-fx.css", () => {
  const FXCSS = readFileSync(join(dir, "..", "flair-fx.css"), "utf8");
  const ids = [...new Set([...FXCSS.matchAll(/\.fx-([a-z]+)\b/g)].map((m) => m[1]))];   // de klassen (keyframes heten fx-… zonder punt)
  assert.ok(ids.length >= 15, `effecten gevonden: ${ids}`);
  for (const id of ids) assert.ok(X.FX_IDS.includes(id), `effect ${id} uit flair-fx.css wordt niet getekend`);
  assert.deepEqual(plain(X.flairParts("v:martian-tripod~pendulum")), { em: null, vf: "v:martian-tripod", fx: "pendulum" });
  assert.deepEqual(plain(X.flairParts("🎲~sparkle")), { em: "🎲", vf: null, fx: "sparkle" });
  assert.deepEqual(plain(X.flairParts("🦫~onbekend")), { em: "🦫", vf: null, fx: null }, "onbekend effect (nieuwere server) → alleen de flair");
  assert.deepEqual(plain(X.flairParts(null)), { em: null, vf: null, fx: null });
  for (const id of X.FX_IDS) assert.ok(SRC.includes(`fx === "${id}"`) || ["glow", "aura"].includes(id), `drawFx kent ${id}`);
  assert.match(SRC, /halo = gl\.fx === "glow"[^]*gl\.fx === "aura"/, "gloed en aura als schaduw om de flair");
  assert.match(GAME.slice(GAME.indexOf("function duelHost()"), GAME.indexOf("function openDuels()")), /\bvondstImage,/, "game.js geeft de vondst-tekening als plaatje mee");
  assert.match(SRC, /tc\.getImageData\(0, 0, 1, 1\)/, "een tekening die het canvas onleesbaar maakt → beginletter, niet het hele plaatje kwijt");
});

test("duel.js — onder Wacht: een revanche staat er net als een directe uitdaging (geen linkveld); alleen een gewone link heeft het linkveld", () => {
  X.setHost(host({ loggedIn: true, myName: () => "Matthijs", faceHue: faceHueGame }));
  X.applyList({ items: [], targets: [], h2h: { ko: { w: 3, l: 1, n: 4 } } });
  const T = D.copy("nl"), soon = new Date(Date.now() + 20 * 3600e3).toISOString();
  const open = (o) => ({ code: "K7QX2M", status: "open", me: "c", c_name: "Matthijs", deadline: soon, mine: [], ...o });
  const html = (d) => X.listBody(T, [d], "", null);
  const rem = html(open({ for_name: "Maarten", for_flair: "🦫", rematch: true, locked: true, opp: "ko" }));
  assert.match(rem, /Maarten/); assert.match(rem, /Revanche · Nog \d+ u om aan te nemen/); assert.match(rem, /jullie 3–1/);
  assert.match(rem, /data-act="resend"[^>]*>Stuur link</); assert.ok(!/class="dl-link"/.test(rem), "geen linkveld bij een revanche");
  const dir = html(open({ for_name: "Tosti Tim", locked: true, opp: "kt" }));
  assert.match(dir, /Uitgedaagd · Nog \d+ u om aan te nemen/); assert.ok(!/class="dl-link"/.test(dir));
  const link = html(open({}));
  assert.match(link, /Je link/); assert.match(link, /class="dl-link"/, "een gewone link houdt het linkveld met Kopieer");
});

test("duel.js — een ingetrokken link staat niet in de Duels-lijst; verlopen en afgewezen wel (grijze rij onder Stand per tegenstander)", () => {
  X.setHost(host({ loggedIn: true, myName: () => "Matthijs" }));
  const T = D.copy("nl"), now = new Date().toISOString();
  const mine = (o) => ({ code: "WWWWWW", me: "c", c_name: "Matthijs", created_at: now, mine: [], ...o });
  const wd = mine({ status: "withdrawn" }), exp = mine({ code: "EEEEEE", status: "expired" }), decl = mine({ code: "DDDDDD", status: "declined", o_name: "Bram" });
  // de lijst van de server: de ingetrokken link valt eraf; alleen die → de lege staat (Jij vs ?), geen losse kop
  assert.deepEqual(plain(X.applyList({ items: [wd, exp], targets: [], h2h: {} }).map((d) => d.code)), ["EEEEEE"]);
  const only = X.listBody(T, X.applyList({ items: [wd], targets: [], h2h: {} }), "", null);
  assert.match(only, /dl-hero/); assert.ok(!/Stand per tegenstander|Verlopen/.test(only));
  // en ook wie hem toch meekrijgt tekent hem niet
  const h = X.listBody(T, [wd, exp, decl], "", null);
  assert.equal((h.match(/class="dl-res"/g) || []).length, 2, "twee grijze rijen: verlopen en afgewezen");
  assert.match(h, /Niemand nam hem aan/); assert.match(h, /Bram wees af/); assert.ok(!/Ingetrokken/.test(h));
  for (const l of ["nl", "en", "de", "es", "pt"]) assert.equal(D.copy(l).withdrawn, undefined, `${l}: de tekst "Ingetrokken" is weg`);
  assert.match(SRC, /duel_withdraw[^]{0,120}listItems = listItems\.filter\(\(x\) => x\.code !== code\)/, "na Intrekken is de rij meteen weg");
  X.applyList({ items: [], targets: [], h2h: {} });
});

test("duel.js — account-momenten zonder account: bij de uitslag wat je er met déze tegenstander aan hebt, in het Duels-scherm één regel, tijdens het wachten niets", () => {
  const T = D.copy("nl"), now = new Date().toISOString();
  X.setHost(host());
  const done = { code: "AAAAAA", status: "done", seen: true, opp: "kb", me: "o", c_name: "Bram", o_name: "Noor", finished_at: now, mine: [9, 9, 9, 9, 9], theirs: [1, 1, 1, 1, 1] };
  // de uitslag: heeft de ander een account met een naam (opp_acc, db/193), dan de regel met die naam; anders (ook een oudere server) de algemene
  assert.equal(X.keepHtml(T, { ...done, opp_acc: true }, " after"),
    `<div class="ep-keep after"><span>Met een account daag je Bram uit zonder link</span><button type="button" class="dl-mini" data-act="login">Maak een account</button></div>`);
  assert.match(X.keepHtml(T, done), /^<div class="ep-keep"><span>Bewaar je duels op al je toestellen<\/span>/);
  assert.match(X.keepHtml(T, { ...done, opp_acc: false }), /Bewaar je duels op al je toestellen/);
  assert.match(X.keepHtml(T, { ...done, me: "c", o_name: "<b>x", opp_acc: true }), /daag je &lt;b&gt;x uit/, "de naam is tekst, geen opmaak");
  for (const l of D.langs()) assert.ok(D.copy(l).keepVs("Bram").includes("Bram") && /^<u>[^<]+<\/u>/.test(D.copy(l).keepList), `${l}: naam in de regel, het werkwoord onderstreept`);
  // het Duels-scherm: de regel onder de knop, zodra je een uitslag zag van een duel tegen iemand met een account
  const withAcc = X.listBody(T, [{ ...done, opp_acc: true }], "", null);
  assert.match(withAcc, /class="dl-new"[^]*?<\/button><button type="button" class="dl-linkb dl-acct" data-act="login" data-code="AAAAAA"><u>Log in<\/u>, dan staan je tegenstanders hier en daag je ze uit met één tik<\/button>/);
  assert.ok(withAcc.indexOf("dl-acct") < withAcc.indexOf("Stand per tegenstander"), "boven je stand, direct onder de knop");
  assert.ok(!X.listBody(T, [done], "", null).includes("dl-acct"), "tegenstander zonder account (of een oudere server): geen regel");
  assert.ok(!X.listBody(T, [{ ...done, opp_acc: true, seen: false }], "", null).includes("dl-acct"), "een uitslag die je nog niet zag: de onthulling heeft haar eigen regel");
  assert.ok(!X.listBody(T, [{ ...done, opp_acc: true, status: "active", mine: [9], theirs: [1], deadline: now }], "", null).includes("dl-acct"), "een lopend duel telt nog niet");
  assert.ok(!X.listBody(T, [], "", null).includes("dl-acct"), "lege staat: alleen de uitleg");
  assert.ok(!X.listBody(T, [{ ...done, opp_acc: true }], `<form class="dl-name"></form>`, null).includes("dl-acct"), "met het naamveld open: alleen het naamveld");
  X.setHost(host({ loggedIn: true, myName: () => "Noor" }));
  assert.ok(!X.listBody(T, [{ ...done, opp_acc: true }], "", null).includes("dl-acct"), "met een account: geen regel");
  assert.equal(X.acctHtml(T, [{ ...done, opp_acc: true }]), "");
  X.setHost(host());
  // de eindstand-pop-up: alleen bij de uitslag (tijdens het wachten staan de seintjes-knop en "Laat X het weten" er al)
  assert.match(SRC, /if \(done && !H\.loggedIn\) inner \+= keepHtml\(T, d, af\);/);
  // inloggen parkeert het duel: uitnodiging, uitslag en Duels-scherm via dezelfde plek; game.js opent het daarna (duelsAfterLogin)
  assert.match(SRC, /const parkLogin = \(code\) => \{ if \(code\) writeJson\(PENDING_KEY, \{ code, at: Date\.now\(\) \}\); \};/);
  assert.match(SRC, /gc\("duel-login-end", [^)]*\); parkLogin\(d\.code\); close\(\); return H\.openLogin\?\.\(\);/);
  assert.match(SRC, /gc\("duel-login-list", [^)]*\); parkLogin\(code\); return H\.openLogin\?\.\(\);/);
  assert.match(SRC, /gc\("duel-login-invite", [^)]*\);\s+parkLogin\(code\);/);
  // je eigen afgelopen duel openen = het Duels-scherm bij dat duel (daar komt de terugkeer na het inloggen uit)
  assert.match(SRC, /if \(d && d\.me && \(d\.status === "active" \|\| d\.status === "done"\)\) \{[^]*?return openList\(H, \{ focus: d\.code \}\);/);
  // zonder account geduelleerd → game.js zet de duels bij de volgende login (opnieuw) over
  assert.match(SRC, /CLAIM_KEY = "jaardle:duelclaim"/); assert.match(GAME, /DUEL_CLAIM_KEY = "jaardle:duelclaim"/);
  assert.match(SRC, /if \(!H\?\.loggedIn\) \{ try \{ localStorage\.removeItem\(CLAIM_KEY\); \} catch \(e\) \{\} \}/);
  for (const sel of [".dl-acct {", ".dl-acct u {"]) assert.ok(D.css.includes(sel), `CSS mist ${sel}`);
  X.applyList({ items: [], targets: [], h2h: {} });
});

test("duel.js — 🏁› rechts op de kaart opent de eindstand (Deel uitslag) boven het Duels-scherm; een regel Vandaag/Gisteren kiest alleen; geen confetti", () => {
  X.setHost(host({ loggedIn: true, myName: () => "Noor" }));
  const T = D.copy("nl"), now = Date.now(), iso = (h) => new Date(now - h * 3600e3).toISOString();
  const duel = (code, h, o) => ({ code, status: "done", seen: true, opp: "kb", me: "o", c_name: "Bram", o_name: "Noor", finished_at: iso(h), mine: [9, 9, 9, 9, 9], theirs: [1, 1, 1, 1, 1], ...o });
  const a = duel("AAAAAA", 0), b = duel("BBBBBB", 26, { mine: [1, 1, 1, 1, 1], theirs: [9, 9, 9, 9, 9] });
  X.setGrp("kb");
  const h = X.listBody(T, [a, b], "", null);
  assert.match(h, /<div class="duel-head"><b>Vandaag, [^<]*<\/b><span class="duel-r">totaal 45–5<\/span><button type="button" class="dl-endb" data-act="end" data-code="AAAAAA" aria-label="Eindstand" title="Eindstand">🏁<span aria-hidden="true">›<\/span><\/button><\/div>/,
    "het knopje staat helemaal rechts in de kop van de kaart, voor het gekozen duel");
  assert.equal((h.match(/data-act="end"/g) || []).length, 1, "één knopje");
  assert.match(h, /data-sel="AAAAAA" data-grp-of="kb"[^>]*><span>Vandaag<\/span>/);
  assert.match(h, /data-sel="BBBBBB" data-grp-of="kb"[^>]*><span>Gisteren<\/span>/);
  for (const l of D.langs()) assert.ok(D.copy(l).final.trim(), `${l}: tekst voor het knopje (aria-label)`);
  assert.ok(!X.listBody(T, [{ ...a, seen: false }], "", null).includes('data-act="end"'), "een uitslag die je nog niet zag: de onthulling, geen knopje");
  X.setGrp(null);
  assert.ok(!X.listBody(T, [a, b], "", null).includes('data-act="end"'), "dichtgeklapt: geen knopje");
  const click = SRC.slice(SRC.indexOf("function onListClick"), SRC.indexOf("async function acceptFromList"));
  assert.match(click, /if \(b\.dataset\.grpOf\) \{ selInGrp\[b\.dataset\.grpOf\] = b\.dataset\.sel; renderList\(T, null\); return; \}/, "een regel kiest alleen: de kaart verspringt");
  assert.match(click, /if \(act === "end"\) \{[^]*?!unrevealed\(d\)[^]*?gc\("duel-result-open"[^]*?showEndPop\(T, d, \{ again: true \}\)/);
  assert.match(SRC, /o\.res === "w" && !again && !\(fresh && wonLast\)\) H\.showConfetti\(\)/, "opnieuw geopend: geen confetti");
  assert.match(SRC, /H\.openModal\("modal-duel-end", \{ over: true \}\)/, "de eindstand gaat bóven het Duels-scherm open");
  const om = GAME.slice(GAME.indexOf("function openModal(id, opts)"), GAME.indexOf("document.getElementById(id).hidden = false;", GAME.indexOf("function openModal(id, opts)")));
  assert.match(om, /if \(pid === id \|\| opts\?\.over\) continue;/, "openModal met over laat het open scherm staan (anders sluit het Duels-scherm en kom je bij Jaardle uit)");
  assert.match(GAME, /if \(de && !de\.hidden && dl && !dl\.hidden\) \{ closeModal\("modal-duel-end"\); return; \}/, "Esc sluit alleen de eindstand");
  assert.match(SRC.slice(0, SRC.indexOf("window.Duel")), /duel-result-open/, "meetpunt in de kopregel");
  X.setHost(host());
});

test("duel.js — de opening van een ronde: pil met de ronde, vanaf ronde 2 met de stand (jij eerst), in elke taal", () => {
  const d = { mine: [92, 61, 70], theirs: [85, 74, 88, 90, 60] };
  for (const l of D.langs()) {
    const T = D.copy(l);
    assert.equal(X.introLabel(T, d, 0), T.roundN(1), `${l}: ronde 1 zonder stand`);
    assert.equal(X.introLabel(T, d, 3), `${T.roundN(4)} · 1–2`, `${l}: ronde 4 met de stand over de rondes die jullie allebei speelden`);
  }
  // de ander speelde ronde 3 nog niet: die telt nog niet mee
  assert.equal(X.introLabel(D.copy("nl"), { mine: [92, 61, 70], theirs: [85, 74] }, 3), "Ronde 4/5 · 1–1");
});

test("duel.js — een seintje of link (?duel=) opent achter het ⚔️-laadscherm, nooit eerst de daily; en dat scherm gaat altijd weer weg", () => {
  // het head-script zet het vóór de eerste tekening, style.css tekent het
  assert.match(TPL, /\[\?&\]duel=\[A-Za-z0-9\]\/\.test\(location\.search\)\) \{\s*document\.documentElement\.setAttribute\("data-duelload"/);
  assert.match(TPL, /setTimeout\(function \(\) \{ document\.documentElement\.removeAttribute\("data-duelload"\); \}, 12000\)/, "vangnet in het head-script zelf");
  const CSS = readFileSync(join(dir, "..", "style.css"), "utf8");
  assert.match(CSS, /html\[data-duelload\]::after \{/);
  // game.js: bij een fout bij het laden van duel.js weg, en na 10 s altijd
  assert.match(GAME, /loadDuel\(\)\.then\(\(D\) => D\.openInvite\(duelHost\(\), duelCode\)\)\.catch\(uncoverDuel\)/);
  assert.match(GAME, /setTimeout\(uncoverDuel, 10000\)/);
  // duel.js: de opening neemt het over; een pop-up, het Duels-scherm of een ronde zonder opening haalt het weg
  assert.match(SRC, /function showPop\([^)]*\) \{\n    uncover\(\);/);
  assert.match(SRC, /async function openList\(host, opts = \{\}\) \{\n    H = host;\n    uncover\(\);/);
  assert.match(SRC, /if \(intro\) await intro\.covered; else uncover\(\);/);
  // tussen twee rondes de korte band, een ander duel de volle opening; een ronde die al liep zonder opening
  assert.match(SRC, /if \(m\.kind === "round"\) return play\(H, m\.code, null, "short"\);/);
  assert.match(SRC, /const begun = !!\(board && \(board\.done \|\| \(board\.guesses \|\| \[\]\)\.length\)\);/);
  // de band tussen rondes: geen zwart scherm, en tikken en toetsen gaan erdoorheen naar de nieuwe ronde
  assert.match(D.css, /#duel-intro\.short \{ pointer-events: none;/);
  assert.match(SRC, /coverAt = 0; holdTo = INTRO_MS\.bandIn \+ INTRO_MS\.bandHold;/);
  assert.match(SRC, /if \(!short\) \{ e\.preventDefault\(\); e\.stopImmediatePropagation\(\); \}/);
});
