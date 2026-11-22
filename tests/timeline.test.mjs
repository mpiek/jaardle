// Tests voor /timeline.js (🗓️ Timeline, alpha, db/226): de spelregels (gat past, waar hij wél hoort), de taalkeuze, de teksten in alle
// vijf talen, de deeltekst, en de losse pagina timeline/index.html (CSP-hash van het inline script, noindex, niet in de sitemap).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
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

test("taal: ?lang= gaat voor, dan jaardle:lang, dan de browser, anders Engels", () => {
  const { pickLang } = core();
  assert.equal(pickLang("?lang=de", "nl", ["pt-BR"]), "de");
  assert.equal(pickLang("", "pt", ["de-DE"]), "pt");
  assert.equal(pickLang("", null, ["nl-BE", "en"]), "nl");
  assert.equal(pickLang("", null, ["fr-FR", "es-ES"]), "es");
  assert.equal(pickLang("?lang=fr", "xx", ["ja"]), "en");
  assert.equal(pickLang("", null, []), "en");
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

test("de deeltekst: score, blokjes in speelvolgorde en het adres", () => {
  const { T, shareText, endBand } = core();
  const s = shareText(T.nl, 11, [true, true, false, true], true);
  assert.equal(s, "Jaardle Timeline: 🗓️ 11 kaarten (record!)\n📊 🟩🟩🟥🟩\njaardle.com/timeline");
  assert.match(shareText(T.en, 1, [true], false), /^Jaardle Timeline: 🗓️ 1 card\n/);
  assert.deepEqual([0, 4, 5, 9, 10, 19, 20, 55].map(endBand), ["0-4", "0-4", "5-9", "5-9", "10-19", "10-19", "20+", "20+"]);
});

test("timeline/index.html: de CSP kent het inline script, noindex, en hij staat niet in de sitemap", () => {
  const html = readFileSync(join(ROOT, "timeline", "index.html"), "utf8");
  const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1];
  assert.ok(csp, "CSP-meta");
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.ok(inline.length >= 1, "het thema-script");
  for (const body of inline) {
    const h = `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`;
    assert.ok(csp.includes(h), `hash ${h} ontbreekt in de CSP (inline script veranderd?)`);
  }
  assert.match(csp, /connect-src[^;]*https:\/\/xyvvkxbhkijjwcvpojru\.supabase\.co/);
  assert.match(html, /<meta name="robots" content="noindex">/);
  assert.match(html, /<script src="\/timeline\.js\?v=\d+" defer><\/script>/);
  assert.doesNotMatch(readFileSync(join(ROOT, "sitemap.xml"), "utf8"), /timeline/);
});
