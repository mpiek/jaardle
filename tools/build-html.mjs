// Genereert de per-taal HTML-mirrors (/, /en, /de, …) uit index.template.html.
// Bron-van-waarheid voor strings + taallijst is game.js zelf: we lezen 'm in,
// strippen de init()-aanroep en evalueren 'm met gestubde browser-globals (net
// als tests/core.test.mjs) zodat we de échte I18N/LANGS-objecten te pakken hebben.
// Eén plek, geen duplicatie. Draaien:  npm run build   (of: node tools/build-html.mjs)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = "https://jaardle.nl";

// --- 1. game.js inladen zonder z'n auto-init / netwerk / DOM --------------------
function loadGameModule() {
  const noopEl = {
    classList: { toggle() {}, add() {}, remove() {}, contains: () => false },
    querySelectorAll: () => [], addEventListener() {}, setAttribute() {},
    after() {}, appendChild() {}, remove() {}, hidden: true, style: {}, dataset: {},
    textContent: "", innerHTML: "",
  };
  const sandbox = {
    document: {
      getElementById: () => noopEl, querySelector: () => null, querySelectorAll: () => [],
      documentElement: {}, addEventListener() {}, createElement: () => ({ ...noopEl }),
    },
    location: { pathname: "/", search: "", hostname: "localhost", origin: "http://localhost" },
    history: { replaceState() {} },
    navigator: { languages: ["nl"], language: "nl" },
    requestAnimationFrame: () => {},
    localStorage: {
      _: {}, getItem(k) { return k in this._ ? this._[k] : null; },
      setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; },
      key(i) { return Object.keys(this._)[i] ?? null; },
      get length() { return Object.keys(this._).length; },
    },
  };
  for (const [k, v] of Object.entries(sandbox)) {
    try { globalThis[k] = v; }
    catch { Object.defineProperty(globalThis, k, { value: v, configurable: true, writable: true }); }
  }
  globalThis.window = globalThis;

  let src = readFileSync(join(ROOT, "game.js"), "utf8");
  src = src.replace(/\ninit\(\)\.catch\([\s\S]*$/, "\n"); // strip init() + alles erna
  src += `\n;globalThis.__BUILD = { I18N, LANGS, LANG_CODES, DEFAULT_LANG };`;
  (0, eval)(src); // indirecte eval → sloppy global scope (game.js heeft geen 'use strict')
  return globalThis.__BUILD;
}

// --- 2. helpers ----------------------------------------------------------------
const escAttr = (s) => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const urlFor = (path) => BASE_URL + "/" + path; // path "" → "https://jaardle.nl/"

function hreflangBlock(LANGS, LANG_CODES, DEFAULT_LANG) {
  const lines = LANG_CODES.map(
    (c) => `<link rel="alternate" hreflang="${c}" href="${urlFor(LANGS[c].path)}">`
  );
  lines.push(`<link rel="alternate" hreflang="x-default" href="${urlFor(LANGS[DEFAULT_LANG].path)}">`);
  return lines.join("\n");
}

// Vul de {{…}}-tokens voor één taal. str-keys uit I18N met fallback op DEFAULT_LANG.
function render(template, code, mod) {
  const { I18N, LANGS, LANG_CODES, DEFAULT_LANG } = mod;
  const strings = I18N[code];
  const get = (key) => {
    const v = strings[key] != null ? strings[key] : I18N[DEFAULT_LANG][key];
    if (typeof v !== "string") {
      throw new Error(`I18N["${code}"]["${key}"] is geen string (token verwacht tekst/HTML)`);
    }
    return v;
  };
  const meta = LANGS[code];
  return template
    .replace(/\{\{html\}\}/g, meta.html)
    .replace(/\{\{url\}\}/g, urlFor(meta.path))
    .replace(/\{\{intl\}\}/g, meta.intl)
    .replace(/\{\{og\}\}/g, meta.og)
    .replace(/\{\{hreflang\}\}/g, hreflangBlock(LANGS, LANG_CODES, DEFAULT_LANG))
    .replace(/\{\{json:([\w.-]+)\}\}/g, (_, k) => JSON.stringify(get(k)))
    .replace(/\{\{i18nhtml:([\w.-]+)\}\}/g, (_, k) => get(k))          // ruwe HTML
    .replace(/\{\{i18n:([\w.-]+)\}\}/g, (_, k) => escAttr(get(k)));    // tekst/attribuut
}

function sitemap(LANGS, LANG_CODES) {
  const urls = LANG_CODES.map((c) =>
    `  <url>\n    <loc>${urlFor(LANGS[c].path)}</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>`
  ).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// --- 3. bouwen -----------------------------------------------------------------
const mod = loadGameModule();
const template = readFileSync(join(ROOT, "index.template.html"), "utf8");

// sanity: nog onvervangbare tokens overgebleven?
const leftover = (s) => (s.match(/\{\{[^}]+\}\}/g) || []);

let count = 0;
for (const code of mod.LANG_CODES) {
  const html = render(template, code, mod);
  const missing = leftover(html);
  if (missing.length) throw new Error(`Onbekende tokens voor "${code}": ${[...new Set(missing)].join(", ")}`);

  const path = mod.LANGS[code].path;
  const outDir = path ? join(ROOT, path) : ROOT;
  if (path) mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
  console.log(`✓ ${path ? path + "/" : ""}index.html  (${code})`);
  count++;
}

writeFileSync(join(ROOT, "sitemap.xml"), sitemap(mod.LANGS, mod.LANG_CODES));
console.log(`✓ sitemap.xml  (${mod.LANG_CODES.length} URL's)`);
console.log(`\n${count} taal-mirror(s) gegenereerd uit index.template.html.`);
