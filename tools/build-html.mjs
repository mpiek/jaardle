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
// De URL van een pagina in een taal: de hoofdpagina zoals altijd ("/", "/nl"), een subpagina met slash erachter ("/duels/", "/nl/duels/").
const pageUrl = (langPath, dir) => urlFor(dir ? (langPath ? `${langPath}/` : "") + `${dir}/` : langPath);

function hreflangBlock(LANGS, LANG_CODES, DEFAULT_LANG, dir = "") {
  const lines = LANG_CODES.map(
    (c) => `<link rel="alternate" hreflang="${c}" href="${pageUrl(LANGS[c].path, dir)}">`
  );
  lines.push(`<link rel="alternate" hreflang="x-default" href="${pageUrl(LANGS[DEFAULT_LANG].path, dir)}">`);
  return lines.join("\n");
}

// ⚔️ Subpagina's (18/11/2026): hetzelfde spel onder een eigen adres, met een eigen <title>, beschrijving en deelvoorbeeld.
// /duels/ opent meteen het Duels-scherm (game.js herkent het pad). De teksten staan hier en niet in de I18N van game.js: ze
// horen alleen in de <head>, dus het spel hoeft ze niet mee te laden. Elke taal moet er zijn (de build stopt anders).
const PAGES = [
  { dir: "", strings: null },
  { dir: "duels", image: "/og-duel.jpg", strings: {
    nl: { meta_title: "Jaardle Duels — daag een vriend uit: wie raadt het jaar het best?",
      meta_share_title: "⚔️ Jaardle-duel: daag een vriend uit",
      meta_desc: "Daag een vriend uit voor een Jaardle-duel: jullie raden het jaar van dezelfde 5 historische gebeurtenissen, van makkelijk naar moeilijk. Per ronde wint de hoogste score. Gratis, zonder account." },
    en: { meta_title: "Jaardle Duels — challenge a friend: who guesses the year best?",
      meta_share_title: "⚔️ Jaardle Duel: challenge a friend",
      meta_desc: "Challenge a friend to a Jaardle duel: you both guess the year of the same 5 historic events, from easy to hard. The highest score wins each round. Free, no account needed." },
    de: { meta_title: "Jaardle-Duelle — fordere jemanden heraus: wer errät das Jahr am besten?",
      meta_share_title: "⚔️ Jaardle-Duell: fordere jemanden heraus",
      meta_desc: "Fordere Freunde zu einem Jaardle-Duell heraus: Ihr ratet das Jahr derselben 5 historischen Ereignisse, von leicht bis schwer. Pro Runde gewinnt die höchste Punktzahl. Kostenlos, ohne Konto." },
    es: { meta_title: "Duelos de Jaardle — reta a un amigo: ¿quién adivina mejor el año?",
      meta_share_title: "⚔️ Duelo de Jaardle: reta a un amigo",
      meta_desc: "Reta a un amigo a un duelo de Jaardle: adivináis el año de los mismos 5 acontecimientos históricos, de fácil a difícil. En cada ronda gana la puntuación más alta. Gratis, sin cuenta." },
    pt: { meta_title: "Duelos do Jaardle — desafie um amigo: quem adivinha melhor o ano?",
      meta_share_title: "⚔️ Duelo do Jaardle: desafie um amigo",
      meta_desc: "Desafie um amigo para um duelo do Jaardle: vocês adivinham o ano dos mesmos 5 acontecimentos históricos, do mais fácil ao mais difícil. Em cada rodada vence a maior pontuação. Grátis, sem conta." },
  } },
];

// Extra <head>-regels van een subpagina: een groot deelplaatje (WhatsApp, Discord, X). De hoofdpagina heeft er (nog) geen.
function pageHead(page) {
  if (!page.image) return `<meta name="twitter:card" content="summary">`;
  const img = BASE_URL + page.image;
  return [
    `<meta property="og:image" content="${img}">`,
    `<meta property="og:image:width" content="1200">`,
    `<meta property="og:image:height" content="630">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:image" content="${img}">`,
  ].join("\n");
}

// Bouw de Content-Security-Policy. De inline scripts (thema, skin, vroege puzzel,
// Supabase-bridge) kunnen niet via 'self' worden toegestaan en op statische hosting
// (GitHub Pages) is er geen nonce — dus hashen we de exacte scriptinhoud (sha256) en
// zetten die in script-src. De hash wordt elke build vers berekend, dus een wijziging
// aan een inline script houdt 'm vanzelf kloppend. De Supabase-bibliotheek zelf staat
// in /vendor (dus 'self'); er is geen externe script-host meer nodig behalve GoatCounter.
// Hosts (Supabase, GoatCounter) lezen we uit de template zodat ze niet driften.
// NB: frame-ancestors werkt niet via <meta>; dat hoort thuis in een HTTP-header.
function buildCsp(template) {
  // Alle uitvoerbare inline scripts hashen: het thema-script in de <head>, de skin-, de
  // vroege-puzzel- en de bridge-scripts. (ld+json heeft een ander type, voert niet uit → geen hash.)
  const matches = [...template.matchAll(/<script(\s+type="module")?>([\s\S]*?)<\/script>/g)];
  const inlineBody = matches.map(([, , body]) => body).join("\n");
  if (!inlineBody.includes("window.sbAuth") || !inlineBody.includes("window.sbConfig")) {
    throw new Error("Inline Supabase-bridge (window.sbAuth) of -config (window.sbConfig) niet gevonden voor CSP-hash");
  }
  const hashes = matches.map(([, , body]) => {
    if (body.includes("{{")) {
      throw new Error("Inline script bevat {{tokens}}; CSP-hash zou niet kloppen met de output");
    }
    return `'sha256-${createHash("sha256").update(body, "utf8").digest("base64")}'`;
  });

  const supa = (template.match(/https:\/\/[a-z0-9]+\.supabase\.co/) || [])[0];
  const goat = (template.match(/data-goatcounter="(https:\/\/[^/"]+)/) || [])[1];
  const goatEv = (template.match(/data-goatcounter-events="(https:\/\/[^/"]+)/) || [])[1];   // aparte site voor de meetpunten (gcCount)
  if (!supa || !goat || !goatEv) throw new Error("Supabase/GoatCounter-host niet gevonden voor CSP");
  const supaWss = supa.replace(/^https:/, "wss:");

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    `script-src 'self' https://gc.zgo.at ${hashes.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",                       // inline style-attrs via innerHTML
    `img-src 'self' data: https://*.googleusercontent.com https://cdn.discordapp.com ${goat} ${goatEv}`,  // Google- en Discord-avatars + GoatCounter-pixel
    "font-src 'self'",
    `connect-src 'self' ${supa} ${supaWss} ${goat} ${goatEv}`,  // Supabase REST/auth + realtime (wss), GoatCounter-beacons
  ].join("; ");
}

// Vul de {{…}}-tokens voor één taal. str-keys uit I18N met fallback op DEFAULT_LANG.
function render(template, code, mod, csp, gameSrc, page = PAGES[0]) {
  const { I18N, LANGS, LANG_CODES, DEFAULT_LANG } = mod;
  const strings = { ...I18N[code], ...(page.strings ? page.strings[code] : null) };
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
    .replace(/\{\{gameSrc\}\}/g, gameSrc)
    .replace(/\{\{manifestHref\}\}/g, meta.path ? `/${meta.path}/manifest.webmanifest` : "/manifest.webmanifest")
    .replace(/\{\{html\}\}/g, meta.html)
    .replace(/\{\{url\}\}/g, pageUrl(meta.path, page.dir))
    .replace(/\{\{intl\}\}/g, meta.intl)
    .replace(/\{\{og\}\}/g, meta.og)
    .replace(/\{\{hreflang\}\}/g, hreflangBlock(LANGS, LANG_CODES, DEFAULT_LANG, page.dir))
    .replace(/\{\{pageHead\}\}/g, pageHead(page))
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
  const urls = PAGES.flatMap((page) => LANG_CODES.map((c) =>
    `  <url>\n    <loc>${pageUrl(LANGS[c].path, page.dir)}</loc>\n    <changefreq>daily</changefreq>\n    <priority>${page.dir ? "0.8" : "1.0"}</priority>\n  </url>`
  )).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

// --- 3. bouwen -----------------------------------------------------------------
const mod = loadGameModule();
const template = readFileSync(join(ROOT, "index.template.html"), "utf8");
const csp = buildCsp(template);   // taal-onafhankelijk; één keer berekenen
// De src van het game.js-<script> (met ?v=): de preload in de head gebruikt precies dezelfde URL, anders haalt de browser 'm dubbel op.
const gameSrc = (template.match(/<script src="(\/game\.js\?v=\d+)"><\/script>/) || [])[1];
if (!gameSrc) throw new Error('<script src="/game.js?v=N"> niet gevonden in de template (nodig voor {{gameSrc}})');

// sanity: nog onvervangbare tokens overgebleven?
const leftover = (s) => (s.match(/\{\{[^}]+\}\}/g) || []);

for (const page of PAGES) {
  if (!page.strings) continue;
  const gaps = mod.LANG_CODES.filter((c) => !page.strings[c] || ["meta_title", "meta_share_title", "meta_desc"].some((k) => typeof page.strings[c][k] !== "string"));
  if (gaps.length) throw new Error(`Pagina /${page.dir}/ mist teksten voor: ${gaps.join(", ")}`);
}

let count = 0;
for (const page of PAGES) for (const code of mod.LANG_CODES) {
  const html = render(template, code, mod, csp, gameSrc, page);
  const missing = leftover(html);
  if (missing.length) throw new Error(`Onbekende tokens voor "${code}": ${[...new Set(missing)].join(", ")}`);

  const path = mod.LANGS[code].path;
  const rel = [path, page.dir].filter(Boolean).join("/");
  const outDir = rel ? join(ROOT, rel) : ROOT;
  if (rel) mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), html);
  if (!page.dir) writeFileSync(join(outDir, "manifest.webmanifest"), manifestFor(code, mod));   // een subpagina deelt het manifest van haar taal
  console.log(`✓ ${rel ? rel + "/" : ""}index.html${page.dir ? "" : " + manifest.webmanifest"}  (${code})`);
  count++;

  // De root-taal (path "") krijgt ook een expliciete alias (/en) zodat oude
  // links + binnenkomende redirects niet 404'en. De canonical in de HTML wijst
  // al naar "/", dus Google consolideert de alias naar de root (geen duplicate).
  if (!path) {
    const alias = [code, page.dir].filter(Boolean).join("/");
    mkdirSync(join(ROOT, alias), { recursive: true });
    writeFileSync(join(ROOT, alias, "index.html"), html);
    console.log(`✓ ${alias}/index.html  (${code}, alias → /${page.dir ? page.dir + "/" : ""})`);
  }
}

writeFileSync(join(ROOT, "sitemap.xml"), sitemap(mod.LANGS, mod.LANG_CODES));
console.log(`✓ sitemap.xml  (${mod.LANG_CODES.length * PAGES.length} URL's)`);
console.log(`\n${count} pagina's (taal × pagina) gegenereerd uit index.template.html.`);
