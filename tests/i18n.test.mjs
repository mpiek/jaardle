// Volledigheidstest voor de meertalige strings. Faalt als een taal een key mist
// of een andere vorm heeft (string vs functie vs object) dan de brontaal. Dit is
// het vangnet dat voorkomt dat een vergeten DE-string stilletjes in de NL-fallback
// verdwijnt. Draaien:  node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// game.js inladen zonder init/DOM (zelfde truc als core.test.mjs / build-html.mjs)
const noopEl = {
  classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
  querySelectorAll: () => [], addEventListener() {}, setAttribute() {},
  after() {}, appendChild() {}, remove() {}, hidden: true, style: {}, dataset: {},
  textContent: "", innerHTML: "",
};
function setGlobal(k, v) {
  try { globalThis[k] = v; }
  catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); }
}
setGlobal("document", {
  getElementById: () => noopEl, querySelector: () => null, querySelectorAll: () => [],
  documentElement: {}, addEventListener() {}, createElement: () => ({ ...noopEl }),
});
setGlobal("window", globalThis);
setGlobal("location", { pathname: "/", search: "", hostname: "localhost", origin: "http://localhost" });
setGlobal("history", { replaceState() {} });
setGlobal("navigator", { languages: ["nl"], language: "nl" });
setGlobal("requestAnimationFrame", () => {});
setGlobal("localStorage", {
  _: {}, getItem(k) { return k in this._ ? this._[k] : null; },
  setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; },
  key(i) { return Object.keys(this._)[i] ?? null; },
  get length() { return Object.keys(this._).length; },
});

const dir = dirname(fileURLToPath(import.meta.url));
let src = readFileSync(join(dir, "..", "game.js"), "utf8");
src = src.replace(/\ninit\(\)\.catch\([\s\S]*$/, "\n");
src += `\n;globalThis.__T = { I18N, LANGS, LANG_CODES, DEFAULT_LANG };`;
(0, eval)(src);
const { I18N, LANGS, LANG_CODES, DEFAULT_LANG } = globalThis.__T;

// shape: hoe we een waarde vergelijken qua "vorm" tussen talen
const shape = (v) =>
  typeof v === "function" ? "function"
  : (v && typeof v === "object") ? `object(${Object.keys(v).sort().join(",")})`
  : typeof v;

test("elke taal in LANGS heeft een I18N-blok", () => {
  for (const code of LANG_CODES) {
    assert.ok(I18N[code], `I18N mist een blok voor taal "${code}"`);
  }
});

test("DEFAULT_LANG is een geldige taal", () => {
  assert.ok(LANG_CODES.includes(DEFAULT_LANG), `DEFAULT_LANG "${DEFAULT_LANG}" staat niet in LANGS`);
});

test("LANGS-entries hebben alle vereiste velden", () => {
  for (const code of LANG_CODES) {
    for (const field of ["label", "flag", "html", "intl", "og", "path"]) {
      assert.ok(field in LANGS[code], `LANGS["${code}"] mist veld "${field}"`);
    }
  }
});

test("elke taal heeft een vlag-SVG in flags/", () => {
  for (const code of LANG_CODES) {
    const file = join(dir, "..", "flags", `${LANGS[code].flag}.svg`);
    assert.ok(existsSync(file), `flags/${LANGS[code].flag}.svg ontbreekt (LANGS["${code}"])`);
  }
});

test("elke taal heeft elke key van de brontaal, met dezelfde vorm", () => {
  const baseKeys = Object.keys(I18N[DEFAULT_LANG]);
  for (const code of LANG_CODES) {
    if (code === DEFAULT_LANG) continue;
    const keys = new Set(Object.keys(I18N[code]));
    for (const key of baseKeys) {
      assert.ok(keys.has(key), `Taal "${code}" mist key "${key}"`);
      assert.equal(
        shape(I18N[code][key]), shape(I18N[DEFAULT_LANG][key]),
        `Taal "${code}" key "${key}" heeft een andere vorm dan ${DEFAULT_LANG}`
      );
    }
    // ook andersom: geen extra keys die de brontaal niet kent (tikfout-vanger)
    for (const key of keys) {
      assert.ok(key in I18N[DEFAULT_LANG], `Taal "${code}" heeft onbekende extra key "${key}"`);
    }
  }
});
