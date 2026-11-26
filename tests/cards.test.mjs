// 🃏 /timeline-ill.js (db/240, 26/11/2026): de tekenaar van de verluchte Timeline-kaarten. GEEN DOM: het bestand wordt in een vm geladen met een
// paar stubs; we testen wat het teruggeeft (markup, de SVG-rand) en hoe paint() met een nep-DOM omgaat.
import { test } from "node:test";
import vm from "node:vm";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const dir = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(dir, "..", "timeline-ill.js"), "utf8");
function load() {
  const injected = [];
  const doc = {
    head: { appendChild: (el) => injected.push(el) },
    body: { insertAdjacentHTML: (pos, html) => injected.push(html) },
    getElementById: () => null,
    createElement: () => ({}),
  };
  const ctx = { window: {}, document: doc };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  return { C: ctx.window.JaardleCards, injected };
}

test("🃏 timeline-ill.js — de stijlen, de attributen en de beginletter (alleen bij een letter, alles ge-escaped)", () => {
  const { C } = load();
  assert.deepEqual(["off", "book", "dragons", "black", "x"].map(C.lvOf), [0, 3, 5, 6, 0]);
  const a = C.attrs(1234, 6, 3);
  assert.match(a, /data-jc="3" data-jcs="1234" data-jcc="6" style="--ill-m:#[0-9a-f]{6};--ill-s:#[0-9a-f]{6}"/);
  assert.match(C.attrs(0, undefined, 5), /data-jcs="1" data-jcc="1"/, "geen sleutel of categorie: 1");
  assert.equal(C.text("Beleg van Orléans", 3), '<span class="ill-ini">B</span>eleg van Orléans');
  assert.equal(C.text("Éire wordt", 5), '<span class="ill-ini">É</span>ire wordt');
  assert.equal(C.text("'s-Hertogenbosch krijgt <stadsrechten>", 3), "'s-Hertogenbosch krijgt &lt;stadsrechten&gt;", "een aanhalingsteken: geen beginletter, wel escapen");
  assert.equal(C.text("1066: de slag", 3), "1066: de slag", "een cijfer: geen beginletter");
  assert.equal(C.text("Gewoon", 0), "Gewoon", "stand 0 = gewone tekst");
  assert.equal(C.text("<b>", 3), "&lt;b&gt;");
});

test("🃏 timeline-ill.js — de rand: geldige SVG voor elke stijl, categorie en maat, steeds dezelfde voor dezelfde kaart", () => {
  const { C } = load();
  for (const lv of [3, 5, 6]) for (const cat of [1, 2, 3, 4, 5, 6, 7, 8]) for (const [W, H, hand] of [[130, 200, false], [130, 136, false], [264, 256, true], [214, 144, true]]) {
    const svg = C.svg(W, H, hand ? 17 : 12.5, 77 + cat, lv, cat, hand);
    assert.ok(svg.startsWith('<svg class="tl-ills" viewBox="0 0 ') && svg.endsWith("</svg>"), `${lv}/${cat}/${W}`);
    assert.ok(!/NaN|undefined|Infinity/.test(svg), `geen NaN in ${lv}/${cat}/${W}x${H}`);
    const opens = (svg.match(/<g[ >]/g) || []).length, closes = (svg.match(/<\/g>/g) || []).length;
    assert.equal(opens, closes, `groepen sluiten (${lv}/${cat})`);
    const dragons = (svg.match(/class="ill-dbody"/g) || []).length / 2;   // lijf + kop per draak
    assert.equal(dragons, lv >= 5 ? 2 : 0, `draken bij ${lv}`);
  }
  assert.equal(C.svg(130, 200, 12.5, 5, 3, 1, false), C.svg(130, 200, 12.5, 5, 3, 1, false), "deterministisch");
  assert.notEqual(C.svg(130, 200, 12.5, 5, 3, 1, false), C.svg(130, 200, 12.5, 6, 3, 1, false), "een andere kaart = andere ranken");
  assert.match(C.svg(130, 200, 12.5, 5, 3, 3, false), /fill="#3a5fb0"/, "religie: azuur");
});

test("🃏 timeline-ill.js — paint(): CSS één keer, een rand per kaart op zijn maat, niets opnieuw als het al klopt, verhuizen uit de oude draw", () => {
  const { C, injected } = load();
  // een nep-kaart: offsetWidth/Height, dataset, één kind-svg via insertAdjacentHTML/prepend
  function card(W, H, cls = "tl-c") {
    const el = { offsetWidth: W, offsetHeight: H, dataset: { jc: "5", jcs: "42", jcc: "2" }, classList: { contains: (c) => c === cls }, kids: [],
      querySelector: () => el.kids[0] || null,
      insertAdjacentHTML(pos, html) { const k = html.match(/data-k="([^"]+)"/)[1]; el.kids = [{ html, dataset: { k }, remove() { el.kids = []; } }]; },
      prepend(node) { el.kids = [node]; } };
    return el;
  }
  const a = card(130, 200), b = card(264, 256, "tl-card"), zero = card(0, 0);
  const root = { querySelectorAll: (sel) => (sel === "[data-jc]" ? [a, b, zero] : []) };
  C.paint(root);
  assert.equal(injected.filter((x) => x && x.id === "jc-css").length, 1, "de CSS");
  assert.equal(injected.filter((x) => typeof x === "string" && x.includes('id="jc-defs"')).length, 1, "de verguldsel-gradiënten");
  assert.ok(a.kids[0] && b.kids[0] && !zero.kids[0], "een rand per zichtbare kaart, niet bij maat 0");
  assert.equal(a.kids[0].dataset.k, "5|42|2|130|200|0");
  assert.equal(b.kids[0].dataset.k, "5|42|2|264|256|1", "de hand heeft zijn eigen sleutel");
  const first = a.kids[0];
  C.paint(root);
  assert.equal(a.kids[0], first, "klopt al: niets opnieuw");
  C.paint(root);
  assert.equal(injected.filter((x) => x && x.id === "jc-css").length, 1, "CSS niet twee keer");
  // een nieuwe draw: de oude rand verhuist naar de nieuwe kaart op dezelfde sleutel
  const a2 = card(130, 200), keep = new Map([[first.dataset.k, first]]);
  C.paint({ querySelectorAll: (sel) => (sel === "[data-jc]" ? [a2] : []) }, keep);
  assert.equal(a2.kids[0], first, "verhuisd i.p.v. opnieuw ontleed");
  assert.equal(keep.size, 0);
});

test("🃏 timeline-ill.js — voorbeeldkaart (kluis) en hand (pop-up): zonder tekst om te vertalen", () => {
  const { C } = load();
  const off = C.preview("off"), book = C.preview("book"), hero = C.hero("dragons");
  assert.ok(!off.includes("tl-ill") && off.includes('class="tl-c"'), "Gewoon = een gewone kaart");
  assert.match(book, /class="tl-c tl-ill" data-jc="3"/);
  assert.match(hero, /class="tl-card tl-ill" data-jc="5"/);
  assert.ok(C.hero("off").includes('data-jc="3"'), "de held is altijd verlucht (de beloning)");
  for (const h of [off, book, hero]) assert.ok(!/[a-z]{4,}<\/span><\/span>|Orl|Beleg/.test(h), "geen echte feittekst");
});
