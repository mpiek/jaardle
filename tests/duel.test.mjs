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
  vm.runInContext(SRC, vm.createContext({ window: win, document: doc, String, Object, Array, Math, Date, Number, JSON, Intl, Set, Map, URL, encodeURIComponent, setTimeout }));
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

test("duel.js — scorebord (19/11): de score van de ander pas na je eigen ronde (slotje), klaar = alles, rondes in de kleur van de winnaar, onthulling klapt om", () => {
  const T = D.copy("nl");
  X.setHost(host());
  const active = { status: "active", me: "c", c_name: "Noor", o_name: "Bram", mine: [95, 52], theirs: [87], their_done: 5 };
  const h = X.boardHtml(T, active, { cur: 2, fresh: 1, meta: "nog 21 u", peek: false });
  assert.equal((h.match(/class="db-c/g) || []).length, 10, "twee regels van vijf rondes");
  assert.match(h, /<span class="db-c w">95<\/span>/, "R1: jij won, in jouw kleur");
  assert.match(h, /<span class="db-c l">87<\/span>/, "R1: de ander verloor");
  assert.match(h, /<span class="db-c p new">52<\/span>/, "R2: gespeeld, uitslag nog niet bekend; net gespeeld = klapt om");
  assert.match(h, /<span class="db-c">\?<\/span>/, "de ander speelde R2 al, maar die score kwam (nog) niet mee: ?");
  assert.equal((h.match(/db-c seal/g) || []).length, 3, "rondes die de ander al speelde en jij nog niet: slotje");
  assert.match(h, /<span class="db-c seal cur">/, "de ronde die je nu speelt");
  assert.match(h, /<b class="db-n lead">1<\/b><\/div><div class="db-rw op">/, "jij staat voor: 1–0");
  const wait = X.boardHtml(T, { status: "active", mine: [95, 52, 87, 92, 85], theirs: [87, 74], their_done: 2 });
  assert.ok(!wait.includes("seal"), "de ander speelde nog niet verder: geen slotje");
  assert.equal((wait.match(/<span class="db-c p">/g) || []).length, 3, "jouw rondes waar de ander nog niet speelde: nog geen kleur");
  const notYet = X.boardHtml(T, { status: "active", mine: [95], theirs: [], their_done: 0 });
  assert.ok(!/<span class="db-c">\?<\/span>/.test(notYet) && !notYet.includes("seal"), "de ander speelde nog niets: geen ? en geen slotje");
  const done = X.boardHtml(T, { status: "done", mine: [87, 74, 6, 100, 72], theirs: [95, 52, 38, 92, 85] });
  assert.match(done, /<div class="db-rw op">[^]*<span class="db-c w">95<\/span>/, "R1 voor de ander: in zijn kleur");
  assert.match(done, /<b class="db-n lead champ">3<\/b><\/div><\/div>$/, "de winnaar: het eindcijfer met een gouden rand");
  const timeout = X.boardHtml(T, { status: "done", mine: [87], theirs: [] });
  assert.match(timeout, /<span class="db-c w">87<\/span>/); assert.equal((timeout.match(/>–</g) || []).length, 9, "niet gespeeld: –");
  const flip = X.boardHtml(T, { status: "done", mine: [95, 52, 38, 92, 85], theirs: [87, 74, 6, 100, 72] }, { flip: true });
  assert.equal((flip.match(/class="fv/g) || []).length, 12, "tien cellen en de twee eindcijfers klappen om");
  assert.match(flip, /<span class="db-c" style="--i:0">95<i class="fv w">95<\/i><\/span>/); assert.match(flip, /<span class="db-c" style="--i:0">\?<i class="fv l">87<\/i><\/span>/, "vóór het omklappen: ?");
  assert.match(flip, /<b class="db-n">\?<i class="fv lead">3<\/i><\/b>/); assert.ok(!flip.includes("champ"), "de gouden rand verklapt niets vóór het omdraaien");
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
  assert.equal(X.LINK("K7QX2M"), "https://jaardle.com/duels/?duel=K7QX2M", "de deellink gaat naar de Duels-pagina (eigen deelvoorbeeld)");
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
  assert.ok(SRC.length < 250000, `het lui geladen bestand blijft klein (${SRC.length})`);   // 19/11: +slepen met de muis (gezichtjes, carrousel) en één uitklapknop; 19/11: +"Om de beurt | ⚡ Live" na het kiezen van een vriend; 19/11: +⚡ Live in het ▾-menu en de haakjes naar /ko.js (de knock-out zelf staat in ko.js); 19/11: +online-stipjes bij de gezichtjes (db/206, live.js); 19/11: +duel-geluid (Web Audio, geen bestanden) + knop naast de ?; 19/11: +inklapbare koppen, gedempte band; 19/11: +scorebord, uitslag per ronde, tikbare kaarten, twee kanten bij een uitdaging (mockup v9 "mix"; gzip hoeft niet meer gemeten, zijn woorden);   // 18/11: +verversen bij kijken (logo als knop, tik op een lopend duel, terug in de app; ≈ +1 KB gzip); 18/11: +duelmodus 1900+ (▾-knop, pilletje, teksten; ≈ +2 KB gzip, db/202); 18/11: +de Duels-pagina (logo-zwaarden, thuisknop, uitleg als pop-up; ≈ +2 KB gzip); db/189: +teamgenoten, seintjes, stand (≈ +7 KB gzip); db/190: +deelplaatje, toeschouwer, flair-effecten op het plaatje; alleen voor wie duelleert; 17/11: +de opening van een ronde (≈ +4 KB gzip); 17/11: +bewaarde uitnodiging (≈ +1,2 KB gzip); 18/11: +de vraag van een ronde terugzien, met carrouselletje (≈ +3,5 KB gzip)
});

test("game.js ↔ duel.js — lui geladen, menu-item, link, duelronde gaat naar duel_submit en telt als vrij potje", () => {
  assert.match(GAME, /const loadDuel = fxLoader\("\/duel\.js", "Duel"\);/);
  assert.ok(!/<script[^>]+duel\.js/.test(TPL), "duel.js staat niet in de pagina: alleen lui");
  assert.match(TPL, /<button class="menu-item" role="menuitem" data-action="duels" data-i18n="menu_duels">\{\{i18n:menu_duels\}\}<\/button>/);
  assert.equal((GAME.match(/menu_duels: "⚔️ /g) || []).length, 5, "menu-label in vijf talen");
  assert.match(GAME, /else if \(action === "duels"\) openDuels\(\);/);
  assert.match(GAME, /"modal-leaderboard", "modal-recap", "modal-login"\];/, "één paneel tegelijk; de Duels-pagina is geen paneel (die blijft eronder staan)");
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
  const vs = X.boardHtml(T, { me: "c", c_name: "Noor", o_name: "Bram", o_flair: "🐢", mine: [95, 52], theirs: [87], their_done: 3, status: "active" });
  assert.match(vs, /<div class="db-rw me"><span class="db-who"><span class="db-av fl" aria-hidden="true"><span class="fl">🦊<\/span><\/span><b>Jij<\/b>/, "jij: je flair");
  assert.match(vs, /<div class="db-rw op"><span class="db-who"><span class="db-av fl" aria-hidden="true"><span class="fl">🐢<\/span><\/span><b>Bram<\/b>/, "de ander: zijn flair");
  X.setHost(host());
  const noFlair = X.boardHtml(T, { me: "o", c_name: "Noor", o_name: "Bram", mine: [], theirs: [], their_done: 0, status: "active" });
  assert.match(noFlair, /<div class="db-rw op"><span class="db-who"><span class="db-av" aria-hidden="true">N<\/span><b>Noor<\/b>/, "zonder flair: de beginletter");
  // de uitnodiging zonder account: "Al een account? Log in"; met account niet
  const inv = { code: "K7QX2M", c_name: "Noor", c_flair: "🦊", me: null, status: "open", can_accept: true, deadline: new Date(Date.now() + 5e7).toISOString() };
  X.setHost(host({ flairHtml: (f) => `<i>${f}</i>` }));
  assert.match(X.popBody(T, inv), /^<div class="vb vbf"[^]*<span class="vb-side op"><span class="vb-av fl" aria-hidden="true"><i>🦊<\/i><\/span><b>Noor<\/b>[^]*<span class="vbf-tag">5 rondes<\/span><\/div><h2>Noor daagt je uit<\/h2>/, "de uitnodiging: de twee kanten groot (zoals de opening), daaronder de titel"); assert.match(X.popBody(T, inv), /data-act="login"[^>]*>Al een account\? Log in</);
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
  assert.ok(h.indexOf('data-act="play"') < h.indexOf('class="dl-new dl-pickgo"'), "Speel boven Daag een vriend uit");
  const sent = X.listBody(T, [turn], `<div class="dl-sent">✓</div>`, null);
  assert.ok(sent.indexOf("dl-sent") < sent.indexOf('data-act="play"') && sent.indexOf('data-act="play"') < sent.indexOf('class="dl-new dl-pickgo"'));
  assert.ok(!X.listBody(T, [turn], `<form class="dl-name"></form>`, null).includes('class="dl-new dl-pickgo"'));
  assert.match(X.listBody(T, [], "", null), /dl-hero[^]*class="dl-new dl-pickgo"/, "lege staat: dezelfde knop");
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
  assert.match(h, /Jij tegen Bram: <b>4–2<\/b>/); assert.match(h, /class="dl-new dl-pickgo" data-act="modes" aria-expanded="false"[^>]*>[^]*Daag Bram uit/, "één grote knop die de vormen uitklapt");
  X.setModes(true);
  const hm = X.pickHtml(T, "<NEW>");
  X.setModes(false);
  assert.match(hm, /data-act="ko" data-k="kb"><span class="mo-e" aria-hidden="true">⚡<\/span><span><b>Knock-out · live<\/b><small>Bram krijgt een seintje en 1 minuut<\/small>/, "⚡ Knock-out, ook als Bram niet online is");
  assert.match(hm, /data-act="challenge" data-k="kb">[^]*<b>Normaal<\/b>/);
  assert.match(hm, /data-act="challenge" data-k="kb" data-theme="1900">/); assert.match(h, /data-act="new">Liever een link sturen/);
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
  assert.match(h, /Wacht[^]*<div class="dl-card out" data-act="resend" data-code="OOOOOO"><div class="vb"[^]*<b>Bram<\/b>[^]*<b>Bram is uitgedaagd<\/b><br>Jullie 4–2 · <em>nog \d+ u<\/em>[^]*data-act="withdraw" data-code="OOOOOO" aria-label="Intrekken"/,
    "je eigen uitdaging: dezelfde kaart met de twee kanten als een uitdaging aan jou (19/11), ✕ = intrekken");
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
  assert.match(rem, /<b>Maarten is uitgedaagd<\/b><br>Revanche · Jullie 3–1 · <em>nog \d+ u<\/em>/);
  assert.match(rem, /data-act="resend"[^>]*>Stuur link</); assert.ok(!/class="dl-link"/.test(rem), "geen linkveld bij een revanche");
  const dir = html(open({ for_name: "Tosti Tim", locked: true, opp: "kt" }));
  assert.match(dir, /<b>Tosti Tim is uitgedaagd<\/b><br><em>Nog \d+ u<\/em>/); assert.ok(!/class="dl-link"/.test(dir));
  for (const x of [rem, dir]) assert.match(x, /class="dl-card out"[^]*class="vb"/, "de band met de twee kanten");
  const link = html(open({}));
  assert.match(link, /<div class="dl-card out"[^]*<b>Je link<\/b>/); assert.match(link, /class="dl-link"/, "een gewone link houdt het linkveld met Kopieer");
  assert.match(link, /class="vb-side op"><span class="vb-av"[^>]*>\?<\/span><\/span>/, "een gewone link: ? aan de andere kant, zonder naam");
  assert.match(SRC, /if \(e\.target\.closest\("\.dl-link"\)\) return;/, "tik in het linkveld deelt niet");
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
  assert.match(withAcc, /class="dl-new dl-pickgo"[^]*?<\/button><button type="button" class="dl-linkb dl-acct" data-act="login" data-code="AAAAAA"><u>Log in<\/u>, dan staan je tegenstanders hier en daag je ze uit met één tik<\/button>/);
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
  // je eigen afgelopen duel openen = het Duels-scherm bij dat duel (daar komt de terugkeer na het inloggen uit); via een link of
  // seintje met de eindstand-pop-up erboven, na het inloggen zonder (dan zie je je tegenstander bij de gezichtjes)
  assert.match(SRC, /if \(d && d\.me && \(d\.status === "active" \|\| d\.status === "done"\)\) \{[^]*?return openList\(H, \{ focus: d\.code, end: afterLogin \? null : d \}\);/);
  assert.match(GAME, /D\.openInvite\(duelHost\(\), p\.code, \{ afterLogin: true \}\)/);
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
  assert.match(GAME, /if \(dl && !dl\.hidden\) \{\n\s+const over = [^\n]+\n\s+if \(over\.length\) \{ over\.forEach\(\(m\) => closeModal\(m\.id\)\); return; \}/, "Esc sluit alleen de eindstand (wat boven de Duels-pagina ligt)");
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
  assert.match(TPL, /\[\?&\]duel=\[A-Za-z0-9\]\/\.test\(location\.search\)( \|\| [^)]+\))?\) \{\s*document\.documentElement\.setAttribute\("data-duelload"/);
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

test("duel.js — een link-uitnodiging zonder antwoord blijft bewaard (17/11: terug naar WhatsApp, app later open → kon niet meer aannemen)", async () => {
  const store = {};
  const ls = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } };
  const win = {};
  const doc = { head: { appendChild() {} }, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ setAttribute() {}, textContent: "" }) };
  vm.runInContext(SRC, vm.createContext({ window: win, document: doc, localStorage: ls, String, Object, Array, Math, Date, Number, JSON, Intl, Set, Map, URL, encodeURIComponent, setTimeout }));
  const Y = win.Duel._, T = win.Duel.copy("nl"), KEY = Y.INVITE_KEY, soon = new Date(Date.now() + 3600e3).toISOString();
  const calls = [];
  let reply = null;
  Y.setHost({ lang: "nl", loggedIn: false, myName: () => null, clientId: () => "c1", rpc: async (fn, a) => { calls.push([fn, a.p_code]); return reply; } });
  const inv = { code: "ABC123", status: "open", me: null, can_accept: true, c_name: "Geert", opp: "kg", deadline: soon };
  // ✕ = later: hij staat in het Duels-scherm onder Jouw beurt, met Neem aan, en telt mee voor het stipje
  store[KEY] = JSON.stringify({ c: "ABC123", u: Date.now() + 3600e3, later: true });
  reply = inv;
  let v = await Y.withInvite({ items: [], news: 0 });
  assert.deepEqual(plain(v.items.map((x) => x.code)), ["ABC123"]);
  assert.equal(v.news, 1);
  assert.match(Y.listBody(T, v.items, "", null), /data-act="accept" data-code="ABC123"/);
  assert.ok(KEY in store);
  // staat hij al in de lijst (een directe uitdaging): geen extra aanroep, niet dubbel
  calls.length = 0;
  v = await Y.withInvite({ items: [inv], news: 1 });
  assert.equal(v.items.length, 1); assert.equal(calls.length, 0);
  // geen netwerk: bewaren voor de volgende keer
  Y.setHost({ lang: "nl", loggedIn: false, myName: () => null, clientId: () => "c1", rpc: async () => { throw new Error("offline"); } });
  v = await Y.withInvite({ items: [], news: 0 });
  assert.equal(v.items.length, 0); assert.ok(KEY in store, "offline: niet weggooien");
  // al aangenomen (door jou elders of iemand anders), afgewezen of verlopen: stil weg
  Y.setHost({ lang: "nl", loggedIn: false, myName: () => null, clientId: () => "c1", rpc: async () => reply });
  reply = { ...inv, status: "active", can_accept: false, o_name: "Bram" };
  v = await Y.withInvite({ items: [], news: 0 });
  assert.equal(v.items.length, 0); assert.ok(!(KEY in store));
  // de 24 uur voorbij: weg zonder aanroep
  store[KEY] = JSON.stringify({ c: "ABC123", u: Date.now() - 1 });
  calls.length = 0;
  Y.setHost({ lang: "nl", loggedIn: false, myName: () => null, clientId: () => "c1", rpc: async (fn) => { calls.push(fn); return reply; } });
  await Y.withInvite({ items: [], news: 0 });
  assert.equal(calls.length, 0); assert.ok(!(KEY in store));
  // de bedrading: bewaren bij het tonen, weg bij aannemen/afwijzen, ✕ = later, game.js toont hem bij het volgende openen opnieuw
  assert.match(SRC, /if \(d && incoming\(d\)\) inviteKeep\(d\); else inviteDrop\(code\);/);
  assert.match(SRC, /if \(later\) inviteKeep\(d, true\);/);
  assert.equal((SRC.match(/inviteDrop\(code\)/g) || []).length >= 5, true, "aannemen (pop-up + lijst), afwijzen (pop-up + lijst), link");
  assert.match(SRC, /applyList\(await withInvite\(r\.v\)\)/);
  assert.match(GAME, /else if \(duelInviteWaiting\(\) && !duelInviteWaiting\(\)\.later && !sharedHashes\) setTimeout\(\(\) => loadDuel\(\)\.then\(\(D\) => D\.resumeInvite\(duelHost\(\)\)\)/);
  assert.match(GAME, /localStorage\.getItem\("jaardle:duelInvite"\)/); assert.equal(KEY, "jaardle:duelInvite");
});

test("duel.js — ingelogd blijft ingelogd: geen naamveld of \"J\" (van Jij) door een te vroege host of een terugkeer naar de app", () => {
  // de host leest loggedIn live, en een ?duel=-link wacht eerst tot bekend is of je ingelogd bent
  assert.match(GAME, /get loggedIn\(\) \{ return !!auth\.user; \}/);
  assert.match(GAME, /authReady: \(\) => Promise\.race\(\[authResolvedP, /);
  assert.match(SRC, /await H\.authReady\?\.\(\);\s+if \(H\.loggedIn\) await H\.ensureIdentity/);
  // supabase-js meldt SIGNED_IN bij elke terugkeer naar de app: zelfde speler → niets wissen of opnieuw ophalen (naam en flair
  // blijven staan), alleen de daily naast de DB leggen (hooguit eens per 30 s) en het duel-stipje; het wissen staat ná die uitgang
  assert.match(GAME, /const prev = auth\.user, sameUser = auth\.resolved && \(prev\?\.uid \?\? null\) === \(e\.detail\?\.uid \?\? null\);/);
  const h = GAME.slice(GAME.indexOf("const onAuthChanged = async"));
  const exit = h.indexOf("if (sameUser) {"), wipe = h.indexOf("myFlair = null; myUsername = null;"), achv = h.indexOf("achvRefreshBaseline();"), pools = h.indexOf("await refreshPoolState();");
  assert.ok(exit > 0 && exit < wipe && exit < achv && exit < pools, "uitgang vóór het wissen en de zware aanroepen");
  assert.match(h.slice(exit, wipe), /if \(!reconcileFresh\(\)\) reconcileDailyProgress\(\);\s+duelsAfterLogin\(\);\s+return;/);
  // ook de volle route slaat een reconcile over die net (< 30 s, zelfde speler) al liep of waarvan het bord vers van de server kwam
  assert.match(GAME, /else if \(!reconcileFresh\(\)\) reconcileDailyProgress\(\); claimPlayOnLogin\(\)/);
  assert.match(GAME, /if \(answerYear == null\) return;\s+const hash = state\.hashes\?\.\[0\];\s+reconcileMark\(auth\.user\.uid\);/);
  assert.match(GAME, /\]\);\s+if \(me\) reconcileMark\(me\.uid\);/);
  // ingelogd maar toch een (leeg) naamveld: je profielnaam
  assert.match(SRC, /const name = \(inp && cleanName\(inp\.value\)\) \|\| myName\(\);/);
});

test("duel.js — een uitgespeeld duel via seintje of link: eindstand-pop-up boven het Duels-scherm, ook als je hem al zag (zonder confetti)", () => {
  assert.match(SRC, /if \(d && d\.status === "done"\) \{ openGrp = d\.opp \|\| oppName\(d\); selInGrp\[openGrp\] = d\.code; if \(!d\.seen \|\| opts\.end\) pop = d; \}/);
  assert.match(SRC, /if \(pop\) showEndPop\(T, pop, pop\.seen \? \{ again: true \} : \{ flip: true \}\);/);
});

test("duel.js — de vraag van een ronde terugzien: alleen rondes die je speelde (alles als het duel klaar is), tip dooft uit", () => {
  X.setHost(host({ t: (k) => ({ bc: "v.Chr.", source: "Bron:" })[k] }));
  const T = D.copy("nl");
  const q = (h) => [...new Set([...h.matchAll(/data-q="([A-Z2-9]{6})\.(\d)"/g)].map((m) => Number(m[2])))];
  // lopend: R1 en R2 gespeeld, de rest dicht (ook al speelde de ander verder)
  const act = { code: "ABCDEF", me: "c", status: "active", mine: [95, 52], theirs: [87], their_done: 5, c_name: "Noor", o_name: "Bram" };
  assert.deepEqual(q(X.boardHtml(T, act)), [0, 1]);
  assert.match(X.boardHtml(T, act), /<span class="db-c w" data-q="ABCDEF\.0" role="button" tabindex="0" aria-haspopup="dialog">95<\/span>/);
  assert.deepEqual(q(X.boardHtml(T, act, { peek: false })), [], "een kaart in de lijst is zelf de knop: geen vraag-tik op het bord");
  // klaar (ook na een time-out): alle vijf, ook in de onthulling
  const done = { ...act, status: "done", mine: [87], theirs: [] };
  assert.deepEqual(q(X.boardHtml(T, done)), [0, 1, 2, 3, 4]);
  assert.deepEqual(q(X.boardHtml(T, { ...done, mine: [1, 2, 3, 4, 5], theirs: [5, 4, 3, 2, 1] }, { flip: true })), [0, 1, 2, 3, 4]);
  // geen deelnemer (buitenstaander) of geen code: niets tikbaar
  assert.deepEqual(q(X.boardHtml(T, { ...done, me: null })), []);
  assert.equal(X.canPeek({ status: "done", mine: [] }, 0), false);
  // de tip alleen op verzoek (eindstand, Duels-scherm), en bij de onthulling pas ná het omdraaien
  assert.match(X.boardHtml(T, done, { hint: true }), /<p class="duel-tip">Tik op een ronde om de vraag terug te zien<\/p>$/);
  assert.ok(!X.boardHtml(T, done).includes("duel-tip"));
  assert.match(X.boardHtml(T, done, { hint: true, flip: true }), /class="duel-tip after"/);
  assert.ok(!X.boardHtml(T, { status: "done", mine: [1], theirs: [] }, { hint: true }).includes("duel-tip"), "niets tikbaar → geen tip");
});

test("duel.js — pop-up van een ronde: feit in jouw taal, jaartal (v.Chr.), beide scores, wie de ronde won, bron alleen als http(s)", () => {
  X.setHost(host({ t: (k) => ({ bc: "v.Chr.", source: "Bron:" })[k] }));
  const T = D.copy("nl");
  const d = { code: "ABCDEF", me: "o", status: "done", c_name: "Bram", o_name: "Noor", mine: [40, 90], theirs: [70, 90] };
  const p = { year: -44, facts: [{ nl: "Caesar <vermoord>", en: "Caesar murdered", source: "https://nl.wikipedia.org/wiki/Caesar" }] };
  const h = X.peekHtml(T, d, 0, p, "nl");
  assert.match(h, /<p class="rq-fact">Caesar &lt;vermoord&gt;<\/p>/, "eigen taal, ge-escaped");
  assert.match(h, /<p class="rq-year">44 v\.Chr\.<\/p>/);
  assert.match(h, /rq-sc me"><small>Jij<\/small><b>40<\/b>.*rq-sc op won"><small>Bram<\/small><b>70<\/b>/);
  assert.match(h, /<p class="rq-verdict">Deze is voor Bram\.<\/p>/);
  assert.match(h, /<a class="rq-src" href="https:\/\/nl\.wikipedia\.org\/wiki\/Caesar" target="_blank" rel="noopener">Bron: nl\.wikipedia\.org<\/a>/);
  assert.match(X.peekHtml(T, d, 1, { ...p, year: 1648 }, "nl"), /rq-year">1648<.*Gelijk\./);
  assert.match(X.peekHtml(T, d, 0, p, "de"), /Caesar murdered/, "geen Duits → Engels");
  assert.ok(!X.peekHtml(T, d, 0, { ...p, facts: [{ nl: "x", source: "javascript:alert(1)" }] }, "nl").includes("<a"), "geen javascript:-link");
  // één feit: geen puntjes; met 💡-extra's: een carrouselletje zoals in de ❓-uitleg (label + kleur per soort, emoji-puntjes)
  assert.ok(!h.includes("rq-dots"));
  X.setHost(host({ t: (k) => ({ main_label: "Dit jaar", extra_label: "Ook dit jaar", fun_label: "Gek maar waar", bc: "v.Chr." })[k] }));
  const car = X.peekHtml(T, d, 0, { ...p, extras: [{ nl: "Extra een" }, { nl: "Een grap", fun: true }, { en: "only en", tag: "d" }, { nl: "" }] }, "nl");
  assert.equal((car.match(/class="rq-fs /g) || []).length, 4, "hoofdfeit + 3 extra's (een lege valt weg)");
  assert.match(car, /rq-fs c-extra"><div class="rq-tag"><span aria-hidden="true">💡<\/span><span>Dit jaar<\/span><\/div><p class="rq-fact">Caesar/);
  assert.match(car, /rq-fs c-extra"><div class="rq-tag"><span aria-hidden="true">💡<\/span><span>Ook dit jaar<\/span><\/div><p class="rq-fact">Extra een/);
  assert.match(car, /rq-fs c-fun"><div class="rq-tag"><span aria-hidden="true">🎭<\/span><span>Gek maar waar/);
  assert.match(car, /rq-fs c-spook">.*<p class="rq-fact">only en</, "verhaal-kopje + terugval op Engels");
  assert.match(car, /<div class="rq-dots"><button type="button" data-i="0" class="on" aria-label="1\/4">💡<\/button><button type="button" data-i="1" aria-label="2\/4">💡/);
  assert.match(SRC, /\.rq-fs\.c-fun \{ --c: var\(--h-fun\); \}/);
  // de ander speelde de ronde (nog) niet: – en geen oordeel
  const half = X.peekHtml(T, { ...d, status: "active", theirs: [] }, 0, p, "nl");
  assert.match(half, /rq-sc op"><small>Bram<\/small><b>–<\/b>/); assert.ok(!half.includes("rq-verdict"));
});

test("duel.js — pop-up van een ronde ligt bóven het scherm eronder: openModal over, Esc sluit alleen die", () => {
  assert.equal(X.PEEK_ID, "modal-duel-q");
  assert.match(SRC, /H\.openModal\(PEEK_ID, \{ over: true \}\)/);
  // game.js: Esc sluit eerst alleen de vraag (vóór de eindstand-regel en vóór closeAllModals)
  const esc = GAME.slice(GAME.indexOf('if (e.key !== "Escape") return;'));
  const q = esc.indexOf('if (dq && !dq.hidden) { closeModal("modal-duel-q"); return; }'), all = esc.indexOf("closeAllModals();");
  assert.ok(q > 0 && q < esc.indexOf("const over = ") && q < all);
  // het Duels-scherm heeft de puzzels niet (duel_list): dan haalt een tik dat ene duel op
  assert.match(SRC, /if \(!rounds\?\.\[i\]\) \{[^\n]*\n\s+const r = await call\("duel_get", \{ p_code: code \}\);/);
});

// ── De Duels-pagina (/duels/, 18/11/2026): een eigen scherm met een eigen adres i.p.v. een pop-up ──────────────────────────
test("Duels-pagina — /duels/ opent het scherm, het adres volgt open/dicht, de pagina is geen paneel en heeft geen scroll-slot", () => {
  // het adres: /duels/ en /nl/duels/ herkennen; de basis houdt de taal uit het pad (of de root)
  assert.match(GAME, /function onDuelsPath\(\) \{ return \/\\\/duels\\\/\?\$\/\.test\(location\.pathname\); \}/);
  const re = /\/duels\/?$/;
  for (const [p, ok] of [["/duels/", true], ["/duels", true], ["/nl/duels/", true], ["/", false], ["/nl/", false], ["/duelsx/", false]]) assert.equal(re.test(p), ok, p);
  // init: zonder ?duel= opent /duels/ meteen het scherm (meetpunt duel-page); met ?duel= gaat de uitnodiging voor
  assert.match(GAME, /else if \(duelsLand\) \{[^]*?gcCount\("duel-page"[^]*?loadDuel\(\)\.then\(\(D\) => D\.openList\(duelHost\(\), \{\}\)\)\.catch\(uncoverDuel\);/);
  assert.match(GAME, /if \(!duelCode && !duelsLand\) uncoverDuel\(\);/, "het ⚔️-laadscherm blijft tot de pagina er staat");
  // het ⚔️-laadscherm in de head ook voor het pad (geen daily die eerst flitst)
  assert.match(TPL, /\/\[\?&\]duel=\[A-Za-z0-9\]\/\.test\(location\.search\) \|\| \/\\\/duels\\\/\?\$\/\.test\(location\.pathname\)/);
  // openModal/closeModal/closeAllModals: adres + body[data-duelshome], geen scroll-slot voor de pagina zelf
  assert.match(GAME, /if \(id === DUELS_PAGE\) duelsPageOpened\(\); else lockBodyScroll\(\);/);
  assert.match(GAME, /if \(id === DUELS_PAGE\) duelsPageSet\(false\);\n  if \(!\[\.\.\.document\.querySelectorAll\("\.modal"\)\]\.some\(\(m\) => !m\.hidden && m\.id !== DUELS_PAGE\)\) unlockBodyScroll\(\);/);
  assert.match(GAME, /duelsPageSet\(false\); \/\/ de Duels-pagina ging mee dicht/);
  // Esc op de pagina: eerst wat erboven ligt
  assert.match(GAME, /const over = \[\.\.\.document\.querySelectorAll\("\.modal:not\(\[hidden\]\)"\)\]\.filter\(\(m\) => m !== dl\);/);
  // duel.js: het scherm staat in <main>, met de kop van een duelronde, en de CSS verbergt het spel zolang
  assert.match(SRC, /el\.className = "modal dl-page";/);
  assert.match(SRC, /\(document\.querySelector\("main"\) \|\| document\.body\)\.appendChild\(el\);/);
  assert.match(SRC, /<div class="duel-top dl-top"><button type="button" class="duel-exit" data-close><\/button>/);
  assert.match(SRC, /\[data-duelshome\] main > :not\(#modal-duels\)/);
  assert.ok(!/modal-backdrop" data-close><\/div><div class="modal-card"><header class="modal-header"><h2 id="duels-title"/.test(SRC), "geen pop-up meer");
  // de kop: logo (de ⚔️ áchter het woord), thuisknop = ‹ + het Jaardle-icoontje (van de skin), "?" = een pop-up boven de pagina
  assert.match(SRC, /<span class="dl-logo-sw" aria-hidden="true">\$\{ICON\}<\/span><span class="dl-logo-txt">\$\{esc\(T\.title\)\}<\/span>/);
  assert.match(SRC, /\.dl-logo > \* \{ grid-area: 1 \/ 1; \}/, "zwaarden en woord op dezelfde plek: het woord ligt erover");
  assert.match(SRC, /link\[rel="icon"\]\[type="image\/svg\+xml"\][^\n]*\|\| "\/favicon\.svg\?v=2"/, "het icoontje van de skin als die er is");
  assert.ok(!/‹ \$\{esc\(T\.exit\)\}/.test(SRC), "geen \"‹ Jaardle\"-pil meer (pagina en ronde)");
  assert.match(SRC, /if \(act === "help"\) \{ gc\("duel-help", "Duel: how it works"\); return openHowto\(T\); \}/);
  assert.match(SRC, /H\.openModal\(HOWTO_ID, \{ over: true \}\)/, "de uitleg ligt bóven de pagina; dicht = terug op de pagina");
});

test("Duels-pagina — de build schrijft /duels/ in elke taal met een eigen titel, canonical, hreflang en deelplaatje", () => {
  const root = join(dir, "..");
  const read = (f) => readFileSync(join(root, f), "utf8");
  const pages = { "duels/index.html": ["en", "https://jaardle.com/duels/"], "en/duels/index.html": ["en", "https://jaardle.com/duels/"],
    "nl/duels/index.html": ["nl", "https://jaardle.com/nl/duels/"], "de/duels/index.html": ["de", "https://jaardle.com/de/duels/"],
    "es/duels/index.html": ["es", "https://jaardle.com/es/duels/"], "pt/duels/index.html": ["pt", "https://jaardle.com/pt/duels/"] };
  const main = read("nl/index.html");
  for (const [f, [lang, url]] of Object.entries(pages)) {
    assert.ok(existsSync(join(root, f)), `${f} bestaat (npm run build)`);
    const h = read(f);
    assert.match(h, new RegExp(`<html lang="${lang}">`), f);
    assert.match(h, new RegExp(`<link rel="canonical" href="${url}">`), f);
    assert.match(h, /<meta property="og:image" content="https:\/\/jaardle\.com\/og-duel\.jpg">/, f);
    assert.match(h, /<meta name="twitter:card" content="summary_large_image">/, f);
    assert.match(h, /<title>[^<]*(Duel|Duelo)[^<]*<\/title>/, f);
    assert.match(h, /<link rel="alternate" hreflang="x-default" href="https:\/\/jaardle\.com\/duels\/">/, f);
    // verder precies de hoofdpagina (zelfde scripts, CSP, game.js-versie): alleen de <head>-teksten verschillen
    const body = (x) => x.slice(x.indexOf("<body>"));
    if (lang === "nl") assert.equal(body(h), body(main), "zelfde <body> als /nl/");
    assert.equal(h.match(/content="(default-src[^"]*)"/)[1], main.match(/content="(default-src[^"]*)"/)[1], `${f}: zelfde CSP`);
  }
  assert.ok(existsSync(join(root, "og-duel.jpg")), "het deelplaatje staat in de repo");
  assert.ok(!/<meta property="og:image"/.test(main), "de hoofdpagina houdt (voorlopig) geen og:image");
  assert.match(read("sitemap.xml"), /<loc>https:\/\/jaardle\.com\/nl\/duels\/<\/loc>/);
});

test("db/201 ↔ duel.js — revanche volgt 'één duel per tweetal', intrekken telt een uur mee: elke fout van duel_create heeft een eigen melding", { skip: !existsSync(join(dir, "..", "..", "jaardle-tools", "db", "201_duel_limits.sql")) }, () => {
  const sql = readFileSync(join(dir, "..", "..", "jaardle-tools", "db", "201_duel_limits.sql"), "utf8");
  for (const code of ["'incoming:%'", "'running'", "'too_many_open'", "'too_many_recent'"]) assert.ok(sql.includes(`raise exception ${code}`), `db/201 geeft ${code}`);
  // incoming eerst testen (/running/ en /too_many_open/ mogen hem niet wegvangen), de naam ook bij een revanche (nameOf)
  assert.match(SRC, /const nm = forName \|\| nameOf\(rematch\) \|\| "\?", inc = \/incoming:\/\.test\(r\.e\);/);
  assert.match(SRC, /inc \? T\.errIncoming\(nm\) : \/too_many_open\/\.test\(r\.e\) \? T\.errMax : \/too_many_recent\/\.test\(r\.e\) \? T\.errRecent\s*: \/running\/\.test\(r\.e\) \? T\.errRunning\(nm\)/);
  for (const lang of ["nl", "en", "de", "es", "pt"]) {
    const T = D.copy(lang);
    assert.ok(T.errIncoming("Mike").includes("Mike") && T.errRunning("Mike").includes("Mike"), lang);
    assert.ok(/3/.test(T.errRecent) && T.errRecent !== T.errMax, lang);
  }
});

test("duel.js — duelmodus 1900+ (db/202): ▾ naast de grote knop, pilletje, uitnodiging, gok-guard in game.js", () => {
  X.setHost(host());
  const T = D.copy("nl");
  // dicht: de grote knop met rechts de ▾, geen lijstje; open: één regel 1900+ die met dezelfde actie meteen uitdaagt
  X.setModes(false);
  let h = X.goHtml(T, `data-act="new"`, T.newBtn);
  assert.match(h, /^<button type="button" class="dl-new dl-pickgo" data-act="modes" aria-expanded="false" aria-label="Meer duelvormen">[^]*?Daag een vriend uit/, "één knop die uitklapt, ook zonder gekozen vriend");
  assert.ok(!h.includes("dl-menu"));
  X.setModes(true);
  h = X.goHtml(T, `data-act="challenge" data-k="kb"`, T.challengeX("Bram"));
  assert.match(h, /aria-expanded="true"/);
  assert.match(h, /<div class="dl-menu">[^]*<button type="button" class="dl-opt" data-act="challenge" data-k="kb" data-theme="1900">[^]*?<b>1900\+<\/b><small>Alle 5 rondes uit 1900 tot nu<\/small>/);
  assert.match(h, /<button type="button" class="dl-opt" data-act="challenge" data-k="kb"><span class="mo-e" aria-hidden="true">⚔️<\/span><span><b>Normaal<\/b><small>5 rondes, om de beurt<\/small>/, "Normaal staat er ook tussen");
  X.setModes(false);
  // pilletje alleen bij een bekend thema (een oudere server stuurt geen theme)
  assert.equal(X.thHtml({ theme: "1900" }), `<span class="dl-th"><span aria-hidden="true">📻</span>1900+</span>`);
  assert.equal(X.thHtml({ theme: null }), "");
  assert.equal(X.thHtml({}), "");
  assert.equal(X.thHtml({ theme: "onbekend" }), "");
  // de uitnodiging: pilletje onder de titel en de eerste regel zegt over welke jaren het gaat
  const inv = { code: "AAAAAA", status: "open", me: null, can_accept: true, c_name: "Noor", deadline: new Date(Date.now() + 864e5).toISOString() };
  assert.match(X.popBody(T, { ...inv, theme: "1900" }), /Noor daagt je uit<\/h2><span class="dl-th">[^]*?<li><b>5 rondes<\/b> uit <b>1900 tot nu<\/b>/);
  assert.ok(!X.popBody(T, inv).includes("dl-th"));
  assert.match(X.popBody(T, inv), /<li><b>5 rondes<\/b>, van makkelijk naar moeilijk<\/li>/);
  for (const l of D.langs()) { const c = D.copy(l); assert.ok(c.eraPh(1900).startsWith("1900 – ") && c.inv1Era.includes("1900"), `${l}: 1900+-teksten`); }
  // game.js: een gok vóór state.duel.from wordt geweigerd, met de tekst in vijf talen
  // (de tekst staat in het lui geladen duel.js: game.js haalt hem op via window.Duel, met een terugval als duel.js er nog niet is)
  assert.match(GAME, /if \(state\?\.duel\?\.from && year < state\.duel\.from && !lines\.length\) lines\.push\(window\.Duel\?\.copy\?\.\(lang\)\?\.eraRefuse\?\.\(state\.duel\.from\) \|\| `📻 \$\{state\.duel\.from\}\+`\);/);
  for (const l of D.langs()) assert.match(D.copy(l).eraRefuse(1900), /^📻 .*1900/, `${l}: weigertekst`);
  // de server krijgt p_theme alleen bij een modus (zo blijft een gewoon duel werken tegen een server zonder db/202)
  assert.match(SRC, /\.\.\.\(theme && !rematch \? \{ p_theme: theme \} : \{\}\)/);
});

test("db/203 ↔ duel.js — hooguit 3 lopende duels per tweetal: uitdagen, revanche én een link aannemen; de melding noemt de naam", { skip: !existsSync(join(dir, "..", "..", "jaardle-tools", "db", "203_duel_pair3.sql")) }, () => {
  const sql = readFileSync(join(dir, "..", "..", "jaardle-tools", "db", "203_duel_pair3.sql"), "utf8");
  for (const fn of ["duel_create", "duel_accept", "duel_list"]) assert.match(sql, new RegExp(`FUNCTION public\\.${fn}\\(`), `db/203 raakt ${fn}`);
  assert.equal((sql.match(/\) >= 3 then\n\s+raise exception 'running';/g) || []).length, 2, "aanmaken en aannemen: running bij 3");
  assert.match(sql, /case when count\(\*\) >= 3 then \(array_agg\(x\.code order by x\.created_at desc\)\)\[1\] end/, "gezichtje pas bezig bij 3");
  // aannemen (Duels-scherm en pop-up) zegt waarom het niet lukt, met de naam van wie uitdaagde
  assert.match(SRC, /if \(\/running\/\.test\(r\.e\)\) listTop = `<p class="dl-msg duel-err">\$\{esc\(T\.errRunning\(\(d && d\.c_name\) \|\| "\?"\)\)\}<\/p>`;/);
  assert.match(SRC, /const full = \/running\/\.test\(r\.e\) && g\.ok && g\.v \? `<p class="duel-err">\$\{esc\(T\.errRunning\(g\.v\.c_name \|\| "\?"\)\)\}<\/p>` : "";/);
  for (const lang of ["nl", "en", "de", "es", "pt"]) assert.ok(/3/.test(D.copy(lang).errRunning("Mike")) && D.copy(lang).errRunning("Mike").includes("Mike"), lang);
});

// ── db/204: een duel-seintje toont rechts het gezichtje van de tegenstander (sw.js tekent het zelf, zonder netwerk) ──
function loadSw(canvas, env = {}) {
  const handlers = {}, shown = [], posted = [], closed = [];
  const tabs = (env.tabs || []).map((t) => ({ ...t, postMessage: (m) => posted.push(m) }));
  const self = {
    addEventListener: (t, f) => { handlers[t] = f; },
    registration: { showNotification: async (title, o) => { shown.push({ title, ...o }); },
      ...(env.endpoint ? { pushManager: { getSubscription: async () => ({ endpoint: env.endpoint }) } } : {}),
      getNotifications: async ({ tag }) => (env.open || []).filter((t) => t === tag).map((t) => ({ close: () => closed.push(t) })) },
    clients: { claim: async () => {}, matchAll: async () => tabs }, skipWaiting() {}, location: { origin: "https://jaardle.com" },
  };
  const ctx = vm.createContext({ self, String, Math, Promise, Uint8Array, setTimeout, btoa: (s) => Buffer.from(s, "binary").toString("base64"), ...(canvas ? { OffscreenCanvas: canvas } : {}) });
  vm.runInContext(readFileSync(join(dir, "..", "sw.js"), "utf8"), ctx);
  const push = async (payload) => {
    let p; handlers.push({ data: { json: () => payload, text: () => "" }, waitUntil: (x) => { p = x; } }); await p; return shown.at(-1);
  };
  return { ctx, push, shown, posted, closed };
}
function fakeCanvas(log) {
  return class { constructor(w, h) { log.size = [w, h]; }
    getContext() { return { set font(v) { log.font = v; }, set fillStyle(v) { (log.fills ||= []).push(v); }, beginPath() {}, arc() {}, fill() {},
      measureText: () => ({ actualBoundingBoxAscent: 70, actualBoundingBoxDescent: 0, actualBoundingBoxLeft: 40, actualBoundingBoxRight: 40 }),
      fillText(t, x, y) { log.text = t; log.at = [x, y]; } }; }
    async convertToBlob() { return { arrayBuffer: async () => new Uint8Array([137, 80, 78, 71]).buffer }; } };
}

test("sw.js (db/204) — duel-seintje met het gezichtje van de ander: zijn kleur, zijn flair of zijn beginletter; anders het gewone icoon", async () => {
  const SW = readFileSync(join(dir, "..", "sw.js"), "utf8");
  const { ctx } = loadSw();
  assert.deepEqual(plain(vm.runInContext("FACE_HUES", ctx)), FACE_HUES_GAME, "FACE_HUES in sw.js = game.js");
  for (const n of ["Geert", "Maarten", "Tosti Tim", "Jij", "é", ""]) assert.equal(ctx.faceHue(n), faceHueGame(n), n);
  // achtergrond = color-mix(in srgb, hsl(h 65% 52%) 38%, #2c2c2c) zoals .dl-av.hue in het donkere thema
  assert.equal(ctx.faceBg(8), "rgb(108,55,47)");   // hsl(8 65% 52%) = (212,74,53), × 0.38 + 44 × 0.62
  assert.equal(ctx.faceBg(190), "rgb(47,98,108)");   // hsl(190 65% 52%) = (53,186,212)

  // met flair: de emoji, gecentreerd, als data-URL (geen netwerk)
  let log = {};
  let n = await loadSw(fakeCanvas(log)).push({ title: "⚔️ Geert is begonnen", tag: "jaardle-duel-ABC", face: { n: "Geert", f: "🦕" } });
  assert.match(n.icon, /^data:image\/png;base64,/);
  assert.equal(log.text, "🦕"); assert.match(log.font, /Noto Color Emoji/);
  assert.deepEqual(log.size, [192, 192]); assert.deepEqual(log.at, [96, 131]);
  assert.equal(log.fills[0], ctx.faceBg(faceHueGame("Geert")), "achtergrond in de kleur van Geert");
  assert.equal(n.badge, "/badge-96.png"); assert.equal(n.tag, "jaardle-duel-ABC");
  // zonder flair: de beginletter, als hoofdletter (ook bij een naam die met een emoji of accent begint: het eerste teken)
  log = {};
  n = await loadSw(fakeCanvas(log)).push({ title: "x", face: { n: "élise", f: null } });
  assert.equal(log.text, "É"); assert.match(log.font, /^700 96px/);
  // het dagelijkse seintje, een browser zonder OffscreenCanvas of een tekenfout: het gewone icoon
  assert.equal((await loadSw(fakeCanvas({})).push({ title: "Daily" })).icon, "/favicon-192.png?v=2");
  assert.equal((await loadSw().push({ title: "x", face: { n: "Geert", f: "🦕" } })).icon, "/favicon-192.png?v=2");
  const broken = class { constructor() { throw new Error("nee"); } };
  const b = await loadSw(broken).push({ title: "x", tag: "jaardle-duel-ABC", face: { n: "Geert" } });
  assert.equal(b.icon, "/favicon-192.png?v=2"); assert.equal(b.title, "x");
  assert.ok(!/fetch\(|caches\./.test(SW), "sw.js haalt niets van het net en cachet niets");
});

test("duel.js — verversen bij kijken (18/11): het ⚔️ DUELS-logo, een tik op een lopend duel en terug in de app halen de lijst vers op", () => {
  for (const lang of ["nl", "en", "de", "es", "pt"]) assert.ok(D.copy(lang).refresh, `refresh in ${lang}`);
  assert.match(SRC, /<button type="button" class="dl-logo-btn" data-act="sync" title="\$\{esc\(T\.refresh\)\}">/, "het logo is een knop");
  assert.match(SRC, /if \(act === "sync"\) \{ gc\("duel-sync", "Duel: Duels logo tapped \(refresh\)"\); return syncList\(T, true\); \}/);
  assert.match(SRC, /if \(listSync \|\| \(!force && Date\.now\(\) - listAt < 4000\)\)/, "één tegelijk; zonder tik op het logo hooguit eens per 4 s");
  assert.match(SRC, /function applyList\(v\) \{\n    listAt = Date\.now\(\);/, "elke verse lijst telt (net geopend = al vers)");
  assert.match(SRC, /else \{ openWait\.add\(c\); syncCode = c; syncList\(T\); \}/, "openklappen van een lopend duel kijkt even vers");
  assert.match(SRC, /document\.visibilityState === "visible" && H && m && !m\.hidden\) syncList\(tx\(H\.lang\)\)/, "terug in de app alleen als het Duels-scherm open is");
  assert.match(SRC, /openWait\.has\(d\.code\) \|\| d\.code === focus\) && was\.get\(d\.code\) === "active" && d\.status === "done" && !d\.seen/, "net klaar en nog niet gezien → eindstand");
  assert.match(D.css, /\.dl-logo\.sync \.dl-logo-sw \{ animation: dl-clash/);
  assert.match(D.css, /prefers-reduced-motion: reduce\) \{ \.dl-logo\.sync \.dl-logo-sw \{ animation: none/);
});

test("sw.js (db/204) — geen systeemmelding voor een duel als Jaardle open en in beeld is (behalve bij Apple); 'klaar' vlak na een eerder seintje is stil", async () => {
  const FCM = "https://fcm.googleapis.com/fcm/send/x", APPLE = "https://web.push.apple.com/x";
  const duel = { title: "⚔️ Geert is klaar", tag: "jaardle-duel-ABC", face: { n: "Geert", f: null } };
  const inBeeld = [{ visibilityState: "visible", focused: true }];
  let sw = loadSw(null, { endpoint: FCM, tabs: inBeeld, open: ["jaardle-duel-ABC", "jaardle-daily"] });
  await sw.push(duel);
  assert.equal(sw.shown.length, 0, "in de app: geen melding");
  assert.deepEqual(plain(sw.posted), [{ jaardle: "duel-push", code: "ABC" }], "de pagina krijgt het door");
  assert.deepEqual(plain(sw.closed), ["jaardle-duel-ABC"], "een oude melding over dat duel gaat weg, andere niet");
  sw = loadSw(null, { endpoint: APPLE, tabs: inBeeld }); await sw.push(duel);
  assert.equal(sw.shown.length, 1, "Apple eist altijd een melding"); assert.equal(sw.posted.length, 0);
  sw = loadSw(null, { endpoint: FCM, tabs: [{ visibilityState: "visible", focused: false }, { visibilityState: "hidden", focused: false }] }); await sw.push(duel);
  assert.equal(sw.shown.length, 1, "Jaardle niet vooraan: gewoon de melding");
  sw = loadSw(null, { endpoint: FCM, tabs: inBeeld }); await sw.push({ title: "Daily", body: "x" });
  assert.equal(sw.shown.length, 1, "het dagelijkse seintje blijft altijd");
  // stil: vervangt zonder geluid of trilling
  sw = loadSw(null, { endpoint: FCM });
  const q = await sw.push({ ...duel, quiet: true });
  assert.equal(q.silent, true); assert.equal(q.renotify, false);
  const l = await sw.push(duel);
  assert.equal(l.silent, false); assert.equal(l.renotify, true);
  // de pagina: game.js luistert, duel.js ververst het Duels-scherm (met de eindstand als dat duel net klaar is) of het stipje
  assert.match(GAME, /if \(e\.data\?\.jaardle === "duel-push"\) loadDuel\(\)\.then\(\(D\) => D\.pushed\(duelHost\(\), e\.data\.code\)\)/);
  assert.match(SRC, /if \(m && !m\.hidden\) return syncList\(tx\(H\.lang\), true, code \|\| null\);\n    return checkNews\(H\);/);
  assert.match(SRC, /\(openWait\.has\(d\.code\) \|\| d\.code === focus\) && was\.get\(d\.code\) === "active"/);
});

test("duel.js — mix (19/11): logo bovenin een ronde = Duels-scherm, kaarten in de lijst zijn zelf de knop, uitslag van de ronde i.p.v. het gewone kopje", () => {
  const T = D.copy("nl");
  assert.match(SRC, /<button type="button" class="duel-title duel-home dl-logo" [^>]*>\$\{logoHtml\(T\)\}<\/button>/, "het ⚔️ DUELS-logo bovenin een ronde is een knop, met hetzelfde logo als de Duels-pagina");
  assert.match(SRC, /class="dl-logo-btn" data-act="sync" title="\$\{esc\(T\.refresh\)\}">\$\{logoHtml\(T\)\}<\/button>/, "… en de Duels-pagina gebruikt hetzelfde stukje");
  assert.ok(!/duelTitle/.test(SRC), "geen los ⚔️ DUEL-woord meer");
  assert.match(SRC, /if \(e\.target\.closest\("\.duel-home"\)\) \{ gc\("duel-home", "[^"]*"\); H\.switchMode\("daily"\); openList\(H, \{\}\); \}/, "… naar het Duels-scherm");
  assert.match(D.css, /#result\.dv-res #result-text \{ display: none; \}/, "het gewone kopje gaat weg zodra de uitslag van de ronde er staat");
  assert.match(SRC, /placeCard\(html, "jr-card"\);/);
  X.setHost(host());
  const later = new Date(Date.now() + 5e7).toISOString();
  const turn = { code: "TURN22", me: "o", status: "active", c_name: "Sanne", o_name: "Noor", mine: [100, 61], theirs: [95, 88], their_done: 5, deadline: later };
  const inc = { code: "INC333", me: null, status: "open", can_accept: true, c_name: "Lotte", deadline: later };
  const h = X.listBody(T, [inc, turn], "", null);
  assert.match(h, /<div class="dl-card turn" data-act="play" data-code="TURN22">/, "tik op het bord = Speel");
  assert.match(h, /<div class="dl-card inc" data-act="accept" data-code="INC333"><div class="vb"/, "tik op de uitdaging = Neem aan (met de twee kanten)");
  assert.match(h, /data-act="decline" data-code="INC333"/, "✕ blijft apart");
  assert.ok(!/data-q=/.test(h), "in de lijst geen vraag-tik op het bord");
  assert.match(SRC, /const card = b\.closest\?\.\("\.dl-card"\) \|\| b, btn = /, "aannemen vanaf de kaart: de knop erin, niet twee keer");
  for (const l of ["nl", "en", "de", "es", "pt"]) {
    const t = D.copy(l);
    assert.ok(t.rWin(3).includes("3") && t.rLoss(3, "Xq").includes("Xq") && t.rTie(3).includes("3") && t.barSub("Xq", "97", 3).includes("97"), l);
    assert.ok(t.bar && t.yet && t.itWas && t.decider && t.toDuels && t.fiveR, l);
  }
});

test("duel.js — het groene vak na het uitdagen kun je wegklikken (19/11): ✕ rechtsboven, weg = alleen het vak", () => {
  assert.match(SRC, /const sentX = \(T\) => `<button type="button" class="dl-x" data-act="sent-x" aria-label="\$\{esc\(T\.close\)\}"/);
  assert.equal((SRC.match(/<div class="dl-sent">\$\{sentX\(T\)\}/g) || []).length, 2, "beide groene vakken (directe uitdaging en link) hebben het ✕");
  assert.match(SRC, /if \(act === "sent-x"\) \{ listTop = ""; return renderList\(T, null\); \}/, "weg = alleen het vak, de uitdaging blijft");
  assert.match(D.css, /\.dl-sent > \.dl-x \{ position: absolute;/);
});

// ── ⚔️ Duel-geluid (19/11): standaard uit, vinkje in ⚙️, reist mee (db/205) ──
function fakeAudio() {
  const log = { nodes: 0, errs: [], src: [] };
  const param = (name) => {
    let last = -Infinity;
    const chk = (v, t, exp) => {
      if (!Number.isFinite(v) || !Number.isFinite(t) || t < 0) log.errs.push(`${name}: ${v}@${t}`);
      if (exp && !(v > 0)) log.errs.push(`${name}: exponentieel naar ${v} (gooit in een browser)`);
      if (t < last - 1e-9) log.errs.push(`${name}: tijd terug (${t} < ${last})`);
      last = t;
    };
    return { value: 1, setValueAtTime: (v, t) => chk(v, t, false), linearRampToValueAtTime: (v, t) => chk(v, t, false),
      exponentialRampToValueAtTime: (v, t) => chk(v, t, true), setTargetAtTime: (v, t, c) => { if (!(t >= 0 && c > 0)) log.errs.push(`${name}: setTarget`); } };
  };
  const node = (x = {}) => { log.nodes++; return { connect() {}, disconnect() {}, ...x }; };
  const source = (kind, x) => { const r = { kind }; log.src.push(r); return node({ ...x, start: (t, off = 0) => Object.assign(r, { t, off }), stop: (t) => { r.end = t; } }); };
  class Ctx {
    constructor() { this.currentTime = 10; this.sampleRate = 8000; this.state = "running"; this.destination = node(); }
    createGain() { return node({ gain: param("gain") }); }
    createDynamicsCompressor() { return node({ threshold: param("thr"), knee: param("knee"), ratio: param("ratio"), attack: param("att"), release: param("rel") }); }
    createBuffer(ch, n, rate) { const d = new Float32Array(n); return { duration: n / rate, getChannelData: () => d }; }
    createBufferSource() { return source("noise", { buffer: null }); }
    createOscillator() { return source("osc", { frequency: param("osc-f"), detune: param("det") }); }
    createBiquadFilter() { return node({ type: "", Q: param("Q"), frequency: param("filter-f") }); }
    createStereoPanner() { return node({ pan: param("pan") }); }
    resume() { return Promise.resolve(); }
    suspend() { return Promise.resolve(); }
  }
  return { Ctx, log };
}
function loadDuelAudio(on) {
  const A = fakeAudio(), win = { AudioContext: A.Ctx, addEventListener() {} };
  const doc = { hidden: false, head: { appendChild() {} }, getElementById: () => null, querySelector: () => null, createElement: () => ({ setAttribute() {}, textContent: "" }) };
  const localStorage = { getItem: (k) => (k === "jaardle:duelsfx" && on ? "1" : null) };
  vm.runInContext(SRC, vm.createContext({ window: win, document: doc, localStorage, performance: { now: () => 0 }, Float32Array, String, Object, Array, Math, Date, Number, JSON, Intl, Set, Map, URL,
    encodeURIComponent, setTimeout: () => 0, clearTimeout: () => {} }));
  return { D: win.Duel, log: A.log };
}

test("duel.js — duel-geluid: standaard uit, Web Audio zonder bestanden, op de tijden van de opening", () => {
  const off = loadDuelAudio(false);
  off.D.sfxTest();
  assert.equal(off.log.nodes, 0, "zonder vinkje: geen AudioContext, geen geluid");
  assert.match(SRC, /const sfxOn = \(\) => \{ try \{ return localStorage\.getItem\(SFX_KEY\) === "1"; \} catch \(e\) \{ return false; \} \};/, "alleen een expliciete 1 zet hem aan");
  assert.ok(!/new Audio\(|\.mp3|\.ogg|\.wav/.test(SRC), "geen geluidsbestanden");

  const { D: DA, log } = loadDuelAudio(true);
  DA.sfxTest();
  assert.ok(log.src.length > 0, "met vinkje: de botsing klinkt");
  const XA = DA._, bus = { connect() {}, disconnect() {}, gain: { setTargetAtTime() {} } };
  assert.deepEqual(plain(Object.keys(XA.SFX).sort()), ["bandIn", "bandOut", "hit", "in", "out", "skip", "still"]);
  for (const k of Object.keys(XA.SFX)) XA.SFX[k](bus, 0);
  assert.deepEqual(plain(log.errs), [], "geen ramp naar 0, geen tijd terug, geen NaN");
  for (const r of log.src) {
    assert.ok(r.t >= 10 && r.end > r.t, `${r.kind}: start en stop kloppen`);
    if (r.kind === "noise") assert.ok(r.off + (r.end - r.t) <= 2, "de ruis past in de buffer van 2 s");
    assert.ok(r.end - 10 < 2.5, "alles is binnen 2,5 s uitgeklonken");
  }
  // "in" eindigt op de botsing (INTRO_MS.hit), en "hit" begint daar
  log.src.length = 0;
  XA.SFX.in(bus);
  const hit = XA.INTRO_MS.hit / 1000;
  assert.ok(log.src.every((r) => Math.abs(r.end - (10 + hit + 0.02)) < 1e-6), "de zwiepen lopen tot de botsing");
  log.src.length = 0;
  XA.SFX.hit(bus, hit);
  assert.ok(log.src.every((r) => r.t >= 10 + hit - 1e-9) && log.src.some((r) => Math.abs(r.t - (10 + hit)) < 1e-9), "de klang valt op de botsing");
});

test("duel.js — duel-geluid in de opening: één bus per opening, wegschuiven klinkt, overslaan/weghalen dempt", () => {
  assert.equal((SRC.match(/const bus = sfxBus\(\);/g) || []).length, 1);
  assert.match(SRC, /if \(still\) sfx\(bus, "still"\);\n\s+else if \(short\) sfx\(bus, "bandIn"\);\n\s+else \{ sfx\(bus, "in"\); sfx\(bus, "hit", HIT \/ 1000\); \}/);
  assert.match(SRC, /if \(fast\) \{ sfxHush\(bus\); sfx\(sfxBus\(\), "skip"\); \}/);
  assert.match(SRC, /else if \(!still\) sfx\(bus, short \? "bandOut" : "out"\);/);
  assert.match(SRC, /kill\(\) \{ gone = true; off\(\); sfxHush\(bus, 0\.01\); el\.remove\(\); \}/);
  assert.match(SRC, /if \(!sfxOn\(\) \|\| document\.hidden\) return null;/, "uit of tabblad op de achtergrond: stil");
  assert.match(SRC, /if \(x\.state !== "running"\) setTimeout\(\(\) => \{ if \(x\.state !== "running"\) try \{ bus\.disconnect\(\); \} catch \(e\) \{\} \}, 300\);/, "niet wakker zonder tik: geen uitgestelde salvo");
  assert.match(SRC, /for \(const ev of \["pointerup", "touchend", "click", "keydown"\]\) window\.addEventListener\?\.\(ev,/, "een tik maakt het geluid wakker (iOS)");
});

test("game.js — ⚔️ Duel-geluid in ⚙️: vinkje bij de andere, standaard uit, reist mee als duelsfx (db/205)", () => {
  assert.match(TPL, /data-action="duel-push" data-i18n="menu_duel_push" hidden>\{\{i18n:menu_duel_push\}\}<\/button>\n\s+<!--[^\n]*-->\n\s+<button class="menu-item" role="menuitemcheckbox" aria-checked="false" data-action="duel-sfx" data-i18n="menu_duel_sfx" hidden>\{\{i18n:menu_duel_sfx\}\}<\/button>/);
  assert.equal((GAME.match(/menu_duel_sfx: "⚔️ /g) || []).length, 5, "vijf talen");
  assert.match(GAME, /const DUEL_SFX_KEY = "jaardle:duelsfx";/);
  assert.ok(SRC.includes('const SFX_KEY = "jaardle:duelsfx";'), "dezelfde sleutel in duel.js");
  assert.match(GAME, /function duelSfxOn\(\) \{ try \{ return localStorage\.getItem\(DUEL_SFX_KEY\) === "1"; \}/, "leeg = uit");
  assert.match(GAME, /prefChanged\("duelsfx", !!on\);/);
  assert.match(GAME, /duelsfx: \{ get: \(\) => \{ const v = lsGet\(DUEL_SFX_KEY\); return v == null \? undefined : v === "1"; \},/);
  assert.match(GAME, /if \(action === "duel-sfx"\) \{/);
  assert.match(GAME, /if \(on\) \{ if \(window\.Duel\) window\.Duel\.sfxTest\?\.\(\); else loadDuel\(\)/, "aanzetten = één keer de botsing, binnen de tik");
  assert.match(GAME, /syncDuelSfxUi\(\);\s+\/\/ ⚔️ Duel-geluid/, "renderMenu zet hem goed");
  for (const p of ["duel-sfx-on", "duel-sfx-off"]) assert.ok(GAME.includes(`"${p}"`), `meetpunt ${p}`);
});

test("duel.js — ⚔️ Duel-geluid ook als knop naast de ? op de Duels-pagina: hetzelfde vinkje", () => {
  assert.match(SRC, /<div class="dl-tools"><button type="button" class="dl-snd-btn" data-act="sfx" aria-pressed="false">\$\{SND\}<\/button>` \+\n\s+`<button type="button" class="dl-help-btn" data-act="help"/, "links naast de ?");
  assert.match(SRC, /sb\.setAttribute\("aria-label", T\.sound\); sb\.title = T\.sound; sb\.setAttribute\("aria-pressed", String\(sfxOn\(\)\)\);/, "stand bij het openen");
  assert.match(SRC, /if \(act === "sfx"\) \{[^]*?if \(H\.setSfx\) H\.setSfx\(on\);[^]*?if \(on\) sfxTest\(\);/, "game.js bewaart hem; aan = meteen de klang");
  assert.match(D.css, /\.dl-snd-btn\[aria-pressed="true"\] \.on \{ display: inline; \}/);
  assert.match(GAME, /setSfx: setDuelSfx,/);
  assert.match(GAME, /document\.querySelectorAll\('#modal-duels \.dl-snd-btn'\)\.forEach\(\(b\) => b\.setAttribute\("aria-pressed", String\(duelSfxOn\(\)\)\)\);/, "vinkje in ⚙️ verandert → knop ook");
});
