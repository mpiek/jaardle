// Tests voor de laadroute van index.template.html: zelf-gehoste supabase-js (/vendor), de vroege dagpuzzel in de head en de
// bridge onderaan. GEEN netwerk, GEEN DOM: de inline scripts draaien we in een vm met een nepvenster.
// Draaien:  cd yeardle-nl && node --test tests/
import { test } from "node:test";
import vm from "node:vm";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f) => readFileSync(join(dir, f), "utf8");
const template = read("index.template.html");
const MIRRORS = ["index.html", "en/index.html", "nl/index.html", "de/index.html", "es/index.html", "pt/index.html"];

const inlineScripts = () => [...template.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const earlyScript = () => inlineScripts().find((b) => b.includes("window.sbEarly ="));
const bridgeScript = () => inlineScripts().find((b) => b.includes("window.sbAuth = {"));

// ── De bibliotheek staat in /vendor en is precies wat npm publiceert ─────────────────────────────────────────────────
test("supabase-js staat zelf gehost in /vendor: het bestand bestaat, klopt met de sha256 in vendor/README.md, en de licentie ligt ernaast", () => {
  const m = template.match(/<script src="\/vendor\/(supabase-js-(\d+\.\d+\.\d+)\.umd\.js)"><\/script>/);
  assert.ok(m, "de template laadt /vendor/supabase-js-<versie>.umd.js");
  const file = join(dir, "vendor", m[1]);
  assert.ok(existsSync(file), `${m[1]} ontbreekt in vendor/`);
  const body = readFileSync(file);
  const readme = read("vendor/README.md");
  const sha = createHash("sha256").update(body).digest("hex");
  assert.ok(readme.includes(sha), "vendor/README.md noemt de sha256 van dit bestand niet — bijgewerkt zonder de README te verversen?");
  assert.ok(readme.includes(`supabase-js ${m[2]}`), "de README noemt een andere versie dan de bestandsnaam");
  assert.match(body.toString("utf8"), /createClient/, "het UMD-bestand moet createClient aanbieden");
  assert.ok(existsSync(join(dir, "vendor", "LICENSE-supabase-js.txt")), "MIT-licentie van supabase-js moet meeliggen");
  assert.deepEqual(readdirSync(join(dir, "vendor")).filter((f) => f.endsWith(".umd.js")), [m[1]], "oude versies uit vendor/ opruimen");
});

test("geen externe script-host in de laadroute: alleen eigen bestanden en GoatCounter; CSP kent esm.sh niet meer", () => {
  for (const f of ["index.template.html", ...MIRRORS]) {
    const html = read(f);
    const hosts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map((x) => x[1]).filter((u) => /^(https?:)?\/\//.test(u));
    assert.deepEqual(hosts, ["//gc.zgo.at/count.js"], `${f}: alleen GoatCounter mag extern`);
    assert.ok(!/<script[^>]*type="module"/.test(html), `${f}: geen module-script meer (dat haalde de bibliotheek van esm.sh)`);
    assert.ok(!/import\s*\{[^}]*\}\s*from\s*["']https?:/.test(html), `${f}: geen import van een extern adres`);
  }
  for (const f of MIRRORS) {
    const csp = read(f).match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/)[1];
    const scriptSrc = csp.split(";").map((s) => s.trim()).find((s) => s.startsWith("script-src"));
    assert.ok(!/esm\.sh/.test(csp), `${f}: CSP noemt esm.sh nog`);
    assert.equal(scriptSrc.split(/\s+/).filter((t) => !t.startsWith("'sha256-")).join(" "), "script-src 'self' https://gc.zgo.at", `${f}: script-src = eigen bestanden + GoatCounter + hashes`);
  }
});

test("de CSP-hashes dekken alle vier de inline scripts (thema, skin, vroege puzzel, bridge) in elke taal", () => {
  for (const f of MIRRORS) {
    const html = read(f);
    const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/)[1];
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert.equal(scripts.length, 4, `${f}: verwacht 4 inline scripts`);
    for (const body of scripts) {
      const h = `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`;
      assert.ok(csp.includes(h), `${f}: hash ontbreekt voor een inline script dat met "${body.trim().slice(0, 40)}…" begint`);
    }
  }
});

// ── Preload van game.js, preconnect en de Supabase-gegevens ───────────────────────────────────────────────────────────
test("game.js: de preload in de head heeft exact dezelfde URL (met ?v=) als de <script> onderaan, in elke taal; één versienummer in de template", () => {
  assert.equal([...template.matchAll(/game\.js\?v=\d+/g)].length, 1, "in de template staat het versienummer van game.js op één plek");
  for (const f of MIRRORS) {
    const html = read(f);
    const script = html.match(/<script src="(\/game\.js\?v=\d+)"><\/script>/);
    const preload = html.match(/<link rel="preload" as="script" href="([^"]+)">/);
    assert.ok(script && preload, `${f}: script en preload aanwezig`);
    assert.equal(preload[1], script[1], `${f}: preload en script wijzen naar verschillende URL's (dubbel ophalen)`);
    assert.ok(html.indexOf(preload[0]) < html.indexOf('<script src="/vendor/'), `${f}: de preload moet vóór het synchrone Supabase-script staan, anders mist hij zijn doel`);
    assert.ok(html.indexOf('<script src="/vendor/') < html.indexOf(script[0]), `${f}: volgorde bibliotheek → bridge → game.js`);
    assert.ok(html.indexOf("window.sbAuth = {") > html.indexOf('<script src="/vendor/') && html.indexOf("window.sbAuth = {") < html.indexOf(script[0]));
  }
});

test("Supabase-URL: preconnect, window.sbConfig en CSP connect-src noemen precies dezelfde host; één sleutel", () => {
  const urls = new Set([...template.matchAll(/https:\/\/[a-z0-9]+\.supabase\.co/g)].map((m) => m[0]));
  assert.equal(urls.size, 1, "de template noemt één Supabase-URL");
  const [url] = urls;
  assert.ok(template.includes(`<link rel="preconnect" href="${url}" crossorigin>`), "preconnect met crossorigin (fetch() zonder cookies gebruikt de anonieme verbindingen)");
  assert.ok(template.includes(`window.sbConfig = { url: "${url}", key: "`));
  assert.equal([...template.matchAll(/sb_publishable_[A-Za-z0-9_]+/g)].length, 1, "de publieke sleutel staat op één plek");
  for (const f of MIRRORS) assert.match(read(f).match(/content="(default-src[^"]*)"/)[1], new RegExp(`connect-src 'self' ${url.replace(/\./g, "\\.")}`));
});

// ── De vroege dagpuzzel (head) ─────────────────────────────────────────────────────────────────────────────────────────
const CFG = { url: "https://xyvvkxbhkijjwcvpojru.supabase.co", key: "sb_publishable_test" };
function runEarly({ at = "2026-10-10T08:00:00Z", search = "", store = {}, fetchImpl, throwStorage = false, noFetch = false } = {}) {
  const fetches = [], when = new Date(at);
  const sandbox = {
    Intl, JSON, Promise, Error, RegExp,
    Date: class extends Date { constructor(...a) { if (a.length) super(...a); else super(when); } },
    location: { search },
    localStorage: { getItem: (k) => { if (throwStorage) throw new Error("SecurityError"); return k in store ? store[k] : null; } },
  };
  if (!noFetch) sandbox.fetch = (url, init) => { fetches.push({ url, init }); return fetchImpl ? fetchImpl(url, init) : Promise.resolve({ ok: true, json: async () => ({ year: 1815 }) }); };
  sandbox.window = sandbox;
  vm.runInNewContext(earlyScript().replace(/window\.sbConfig = \{[^}]*\};/, `window.sbConfig = ${JSON.stringify(CFG)};`), sandbox);
  return { w: sandbox, fetches };
}

test("vroege puzzel — zonder lokale opslag: één POST naar get_daily met de Amsterdamse dag, anon-sleutel, en window.sbEarly om aan te haken", async () => {
  const { w, fetches } = runEarly();
  assert.equal(fetches.length, 1);
  assert.equal(fetches[0].url, `${CFG.url}/rest/v1/rpc/get_daily`);
  assert.equal(fetches[0].init.method, "POST");
  assert.deepEqual({ ...fetches[0].init.headers }, { apikey: CFG.key, Authorization: `Bearer ${CFG.key}`, "Content-Type": "application/json" });
  assert.equal(fetches[0].init.body, JSON.stringify({ d: "2026-10-10" }));
  assert.equal(w.sbEarly.fn, "get_daily"); assert.equal(w.sbEarly.d, "2026-10-10");
  assert.deepEqual({ ...(await w.sbEarly.p) }, { year: 1815 }, "het antwoord is de JSON van de RPC");
});

test("vroege puzzel — de dag is die van Amsterdam (zomer-/wintertijd, vlak na middernacht), niet van het apparaat", () => {
  for (const [at, want] of [["2026-10-10T08:00:00Z", "2026-10-10"], ["2026-10-10T21:59:59Z", "2026-10-10"], ["2026-10-10T22:00:00Z", "2026-10-11"],
    ["2026-12-31T22:59:59Z", "2026-12-31"], ["2026-12-31T23:00:00Z", "2027-01-01"], ["2026-10-24T22:00:00Z", "2026-10-25"], ["2026-10-25T22:59:00Z", "2026-10-25"], ["2026-10-25T23:00:00Z", "2026-10-26"]]) {
    assert.equal(runEarly({ at }).w.sbEarly.d, want, at);
  }
});

test("vroege puzzel — overslaan: staat de dag al lokaal, gedeeld vrij spel (?p=), geen opslag of geen fetch; ander zoekargument telt niet mee", () => {
  assert.equal(runEarly({ store: { "jaardle:daily:2026-10-10": "{}" } }).fetches.length, 0, "dag staat al in de opslag");
  assert.equal(runEarly({ store: { "jaardle:daily:2026-10-09": "{}" } }).fetches.length, 1, "een andere dag in de opslag is niet genoeg");
  assert.equal(runEarly({ search: "?p=0123456789" }).fetches.length, 0, "?p= = gedeeld vrij spel");
  assert.equal(runEarly({ search: "?x=1&p=0123456789" }).fetches.length, 0);
  for (const s of ["?map=1", "?skin=halloween&evdate=2026-10-27", "?xp=1", "?ref=pwa"]) assert.equal(runEarly({ search: s }).fetches.length, 1, s);
  assert.doesNotThrow(() => runEarly({ throwStorage: true }), "localStorage dat gooit (privé-modus) breekt de pagina niet");
  assert.equal(runEarly({ throwStorage: true }).w.sbEarly, undefined);
  assert.doesNotThrow(() => runEarly({ noFetch: true }));
  assert.equal(runEarly({ noFetch: true }).w.sbEarly, undefined);
});

test("vroege puzzel — een fout (HTTP 500 of netwerk) geeft een afgewezen belofte zonder 'unhandled rejection'; de bridge valt dan terug", async () => {
  const unhandled = [];
  const on = (e) => unhandled.push(e);
  process.on("unhandledRejection", on);
  try {
    const a = runEarly({ fetchImpl: () => Promise.resolve({ ok: false, status: 500, json: async () => ({}) }) });
    const b = runEarly({ fetchImpl: () => Promise.reject(new Error("offline")) });
    await assert.rejects(a.w.sbEarly.p, /get_daily 500/);
    await assert.rejects(b.w.sbEarly.p, /offline/);
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(unhandled.length, 0);
  } finally { process.off("unhandledRejection", on); }
});

// ── De bridge (onderaan) ───────────────────────────────────────────────────────────────────────────────────────────────
function runBridge({ session = null, lib = true, early } = {}) {
  const events = [], calls = [], created = [];
  let authCb = null;
  const client = {
    rpc: async (fn, args) => { calls.push([fn, args]); return { data: { via: "client", fn }, error: null }; },
    auth: {
      getSession: () => Promise.resolve({ data: { session } }),
      onAuthStateChange: (cb) => { authCb = cb; },
      signInWithPassword: async (x) => ({ data: x, error: null }), signUp: async (x) => ({ data: x, error: null }),
      signInWithOAuth: async (x) => ({ data: x, error: null }), resetPasswordForEmail: async () => ({ data: {}, error: null }),
      updateUser: async () => ({ data: {}, error: null }), signOut: async () => ({ data: {}, error: null }),
    },
  };
  const sandbox = {
    Promise, Error,
    sbConfig: CFG, sbEarly: early,
    location: { origin: "https://jaardle.com", pathname: "/nl/" },
    Event: class { constructor(type) { this.type = type; } },
    CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } },
    dispatchEvent: (e) => { events.push(e); return true; },
  };
  if (lib) sandbox.supabase = { createClient: (url, key) => { created.push([url, key]); return client; } };
  sandbox.window = sandbox;
  vm.runInNewContext(bridgeScript(), sandbox);
  return { w: sandbox, events, calls, created, fireAuth: (ev, s) => authCb(ev, s) };
}
const tick = () => new Promise((r) => setTimeout(r, 0));
const SESSION = { user: { id: "u-1", email: "a@example.invalid", user_metadata: { avatar_url: "https://img/a.png", full_name: "Aussie Ann" } } };

test("bridge — maakt de client met de gegevens uit window.sbConfig, meldt sb-ready meteen (vóór game.js) en bewaart de sessie-stand voor game.js", async () => {
  const { w, events, created } = runBridge({ session: SESSION });
  assert.deepEqual(created, [[CFG.url, CFG.key]]);
  assert.deepEqual(events.map((e) => e.type), ["sb-ready"], "sb-ready direct; het sessie-event volgt async");
  assert.ok(w.sb && typeof w.sb.rpc === "function" && w.sbAuth && typeof w.sbAuth.signIn === "function");
  await tick();
  assert.deepEqual(events.map((e) => e.type), ["sb-ready", "sb-auth-changed"]);
  const want = { email: "a@example.invalid", uid: "u-1", avatar: "https://img/a.png", name: "Aussie Ann" };
  assert.deepEqual({ ...events[1].detail }, want);
  assert.deepEqual({ ...w.sbAuthState.user }, want, "game.js speelt dit af als het event al vuurde vóór zijn luisteraar");
  const anon = runBridge({ session: null });
  await tick();
  assert.deepEqual({ ...anon.w.sbAuthState }, { user: null }, "anoniem = bekend zonder gebruiker (anders is de stand 'nog onbekend' = undefined)");
  assert.equal(anon.events[1].detail, null);
});

test("bridge — PASSWORD_RECOVERY wordt sb-recovery; elke wijziging werkt sbAuthState bij", async () => {
  const { w, events, fireAuth } = runBridge({ session: null });
  await tick();
  fireAuth("PASSWORD_RECOVERY", SESSION);
  assert.ok(events.some((e) => e.type === "sb-recovery"));
  assert.equal(w.sbAuthState.user.uid, "u-1");
  fireAuth("SIGNED_OUT", null);
  assert.equal(w.sbAuthState.user, null);
});

test("bridge — rpc: de vroege get_daily wordt één keer hergebruikt (zelfde dag), anders en daarna gewoon de client; bij een fout in de vroege aanroep valt hij terug", async () => {
  const d = "2026-10-10";
  const mk = (p, day = d) => ({ fn: "get_daily", d: day, p });
  let r = runBridge({ early: mk(Promise.resolve({ year: 1815, via: "early" })) });
  assert.deepEqual({ ...(await r.w.sb.rpc("get_daily", { d })) }, { year: 1815, via: "early" });
  assert.equal(r.calls.length, 0, "geen tweede aanroep naar Supabase");
  assert.deepEqual({ ...(await r.w.sb.rpc("get_daily", { d })) }, { via: "client", fn: "get_daily" }, "één keer: de tweede vraag gaat gewoon naar de client");
  assert.equal(r.calls.length, 1);

  r = runBridge({ early: mk(Promise.resolve({ via: "early" })) });
  assert.equal((await r.w.sb.rpc("get_daily", { d: "2026-10-09" })).via, "client", "andere dag (inhaalpot) = gewoon");
  assert.equal((await r.w.sb.rpc("get_random_fact", {})).via, "client", "andere functie = gewoon");
  assert.equal(r.calls.length, 2);
  assert.equal((await r.w.sb.rpc("get_daily", { d })).via, "early", "de vroege staat nog klaar voor de échte vraag");

  r = runBridge({ early: mk(Promise.reject(new Error("offline"))) });
  assert.equal((await r.w.sb.rpc("get_daily", { d })).via, "client", "vroege aanroep mislukt → gewone aanroep");
  assert.equal(r.calls.length, 1);

  r = runBridge({});
  assert.equal((await r.w.sb.rpc("get_daily", { d })).via, "client", "zonder vroege aanroep (opslag had de dag) werkt alles als vanouds");
  assert.equal((await r.w.sb.rpc("get_x")).via, "client");
  assert.equal(r.calls[1][0], "get_x");
  assert.deepEqual({ ...r.calls[1][1] }, {}, "args default naar {}");
});

test("bridge — bibliotheek niet geladen: geen eeuwig wachten; sb-ready komt, rpc weigert met de bekende melding en er is geen sbAuth", async () => {
  const { w, events } = runBridge({ lib: false });
  assert.deepEqual(events.map((e) => e.type), ["sb-ready"]);
  assert.equal(w.sbAuth, undefined);
  await assert.rejects(w.sb.rpc("get_daily", { d: "2026-10-10" }), /Supabase nog niet geladen/);
});

test("de bridge dispatcht geen sb-auth-changed vóórdat sbAuthState klopt, en game.js leest precies die naam (contract tussen template en game.js)", () => {
  const b = bridgeScript(), g = read("game.js");
  assert.ok(b.indexOf("window.sbAuthState = { user };") < b.indexOf('new CustomEvent("sb-auth-changed"'));
  assert.match(g, /if \(window\.sbAuthState\) queueMicrotask\(\(\) => onAuthChanged\(\{ detail: window\.sbAuthState\.user \}\)\)/);
  assert.match(g, /window\.addEventListener\("sb-auth-changed", onAuthChanged\)/);
  assert.match(g, /\(auth\.user \|\| window\.sbAuthState\?\.user\) \? rpc\("get_my_daily_state"/);
});
