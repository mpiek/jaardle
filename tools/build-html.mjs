// Genereert de per-taal HTML-mirrors (/, /en, /de, …) uit index.template.html.
// Bron-van-waarheid voor strings + taallijst is game.js zelf: we lezen 'm in,
// strippen de init()-aanroep en evalueren 'm met gestubde browser-globals (net
// als tests/core.test.mjs) zodat we de échte I18N/LANGS-objecten te pakken hebben.
// Eén plek, geen duplicatie. Draaien:  npm run build   (of: node tools/build-html.mjs)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE_URL = "https://jaardle.com";

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

// Bouw de Content-Security-Policy. Het inline Supabase-script kan niet via
// 'self' worden toegestaan en op statische hosting (GitHub Pages) is er geen
// nonce — dus hashen we de exacte scriptinhoud (sha256) en zetten die in
// script-src. De hash wordt elke build vers berekend, dus een wijziging aan het
// inline script (bv. de Supabase-versie pinnen) houdt 'm vanzelf kloppend.
// Hosts (Supabase, GoatCounter) lezen we uit de template zodat ze niet driften.
// NB: frame-ancestors werkt niet via <meta>; dat hoort thuis in een HTTP-header.
function buildCsp(template) {
  // Alle uitvoerbare inline scripts hashen: het thema-script in de <head> én de
  // module-bridge. (ld+json heeft een ander type, voert niet uit → geen hash.)
  const matches = [...template.matchAll(/<script(\s+type="module")?>([\s\S]*?)<\/script>/g)];
  if (!matches.some(([, mod]) => mod)) throw new Error("Inline module-script niet gevonden voor CSP-hash");
  const hashes = matches.map(([, , body]) => {
    if (body.includes("{{")) {
      throw new Error("Inline script bevat {{tokens}}; CSP-hash zou niet kloppen met de output");
    }
    return `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`;
  });

  const supa = (template.match(/https:\/\/[a-z0-9]+\.supabase\.co/) || [])[0];
  const goat = (template.match(/data-goatcounter="(https:\/\/[^/"]+)/) || [])[1];
  if (!supa || !goat) throw new Error("Supabase/GoatCounter-host niet gevonden voor CSP");
  const supaWss = supa.replace(/^https:/, "wss:");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    `script-src 'self' https://esm.sh https://gc.zgo.at ${hashes.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",                       // inline style-attrs via innerHTML
    `img-src 'self' data: https://*.googleusercontent.com ${goat}`,  // Google-avatars + GoatCounter-pixel
    "font-src 'self'",
    `connect-src 'self' ${supa} ${supaWss} ${goat}`,          // Supabase REST/auth + realtime (wss)
  ].join("; ");
}

// Vul de {{…}}-tokens voor één taal. str-keys uit I18N met fallback op DEFAULT_LANG.
function render(template, code, mod, csp) {
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
    .replace(/\{\{csp\}\}/g, csp)
    .replace(/\{\{manifestHref\}\}/g, meta.path ? `/${meta.path}/manifest.webmanifest` : "/manifest.webmanifest")
    .replace(/\{\{html\}\}/g, meta.html)
    .replace(/\{\{url\}\}/g, urlFor(meta.path))
    .replace(/\{\{intl\}\}/g, meta.intl)
    .replace(/\{\{og\}\}/g, meta.og)
    .replace(/\{\{hreflang\}\}/g, hreflangBlock(LANGS, LANG_CODES, DEFAULT_LANG))
    .replace(/\{\{json:([\w.-]+)\}\}/g, (_, k) => JSON.stringify(get(k)))
    .replace(/\{\{i18nhtml:([\w.-]+)\}\}/g, (_, k) => get(k))          // ruwe HTML
    .replace(/\{\{i18n:([\w.-]+)\}\}/g, (_, k) => escAttr(get(k)));    // tekst/attribuut
}

// Webmanifest per taal: start_url/id wijzen naar de eigen locale, zodat een
// speler die /de installeert ook in /de opent. ?ref=pwa → GoatCounter toont
// "pwa" als bron, dus we zien hoeveel spelers de app geïnstalleerd gebruiken.
function manifestFor(code, mod) {
  const { I18N, LANGS, DEFAULT_LANG } = mod;
  const meta = LANGS[code];
  const desc = I18N[code].meta_share_title ?? I18N[DEFAULT_LANG].meta_share_title;
  const base = meta.path ? `/${meta.path}/` : "/";
  return JSON.stringify({
    name: "Jaardle",
    short_name: "Jaardle",
    description: desc,
    id: base,
    start_url: `${base}?ref=pwa`,
    scope: "/",
    display: "standalone",
    background_color: "#1a1a1a",
    theme_color: "#1a1a1a",
    lang: meta.html,
    icons: [
      // ?v=2: cache-buster — de v1-iconen waren wazige upscales en het maskable
      // vulde het canvas niet (klein groen vierkant in Androids cirkel-mask).
      { src: "/favicon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { src: "/favicon-512.png?v=2", sizes: "512x512", type: "image/png" },
      { src: "/maskable-512.png?v=2", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }, null, 2) + "\n";
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
const csp = buildCsp(template);   // taal-onafhankelijk; één keer berekenen

// sanity: nog onvervangbare tokens overgebleven?
const leftover = (s) => (s.match(/\{\{[^}]+\}\}/g) || []);

let count = 0;
for (const code of mod.LANG_CODES) {
  const html = render(template, code, mod, csp);
  const missing = leftover(html);
  if (missing.length) throw new Error(`Onbekende tokens voor "${code}": ${[...new Set(missing)].join(", ")}`);

  const path = mod.LANGS[code].path;
  const outDir = path ? join(ROOT, path) : ROOT;
  if (path) mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
  writeFileSync(join(outDir, "manifest.webmanifest"), manifestFor(code, mod));
  console.log(`✓ ${path ? path + "/" : ""}index.html + manifest.webmanifest  (${code})`);
  count++;

  // De root-taal (path "") krijgt ook een expliciete alias (/en) zodat oude
  // links + binnenkomende redirects niet 404'en. De canonical in de HTML wijst
  // al naar "/", dus Google consolideert de alias naar de root (geen duplicate).
  if (!path) {
    mkdirSync(join(ROOT, code), { recursive: true });
    writeFileSync(join(ROOT, code, "index.html"), html);
    console.log(`✓ ${code}/index.html  (${code}, alias → /)`);
  }
}

writeFileSync(join(ROOT, "sitemap.xml"), sitemap(mod.LANGS, mod.LANG_CODES));
console.log(`✓ sitemap.xml  (${mod.LANG_CODES.length} URL's)`);
console.log(`\n${count} taal-mirror(s) gegenereerd uit index.template.html.`);
