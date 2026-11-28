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
// horen alleen in de HTML, dus het spel hoeft ze niet mee te laden. Elke taal moet er zijn (de build stopt anders).
// 22/11/2026 (zijn vraag over vindbaarheid, "bouw het"): ook een eigen <h1> en introtekst (intro_h1/intro_html, de verborgen
// .site-intro bovenaan). Met alleen een eigen <title> was /duels/ voor Google bijna een kopie van de hoofdpagina. Op een
// subpagina haalt de build de data-i18n-attributen van die twee weg, anders zet applyLang() er bij het laden de tekst van de
// hoofdpagina overheen (Google draait de JS ook). Gevolg: na een taalwissel op de pagina zelf blijft die verborgen intro in de
// oude taal staan, tot de volgende keer laden.
// at/next/label (22/11/2026): de deur naast 🌐 gaat rond Jaardle → Duels → Timeline → Jaardle. at = deze pagina (data-at op #world-door,
// style.css kiest daarmee tegel en stipje), next = de pagina achter de deur (de echte link), label = de naam daarvan (aria-label; voor
// Duels de vertaling door_duels uit I18N). noindex: de pagina staat niet in de sitemap en krijgt <meta name="robots" content="noindex">.
// icon (28/11/2026): het eigen favicon van de pagina (de tegel uit de deur: DU/EL, TI/ME), als /favicon-<naam>.svg, -96.png en -192.png.
// listdle.com (en Google's favicon-dienst) nemen het favicon van de pagina, geen og:image, dus kreeg /timeline/ daar het groene JA/AR
// (zijn "als ik daar /timeline indien zie ik het normale groen logo ipv het blauwe"). Geen deelplaatje: een groot plaatje bij een
// gedeelde uitslag vond hij storend. Zonder icon het Jaardle-icoon; de skins (kerst enz.) zetten alleen dat om (zie het season-script).
// ldName (24/11/2026): de naam in de structured data (ld+json), zodat Google /duels/ en /timeline/ als eigen spel ziet en niet als
// nog een "Jaardle". Krijgt get(key) voor een vertaling; zonder ldName is het "Jaardle".
const PAGES = [
  { dir: "", at: "j", next: "duels", strings: null },
  // aliases: extra adressen die alleen doorsturen (22/11, zijn "ja doe maar": wie jaardle.com/duel intikt, belandt niet op een 404).
  { dir: "duels", at: "d", next: "timeline", label: "Timeline", aliases: ["duel"], image: "/og-duel.jpg", icon: "/favicon-duels",
    ldName: (get) => `Jaardle ${get("door_duels")}`, strings: {
    nl: { meta_title: "Jaardle Duels — daag een vriend uit: wie raadt het jaar het best?",
      meta_share_title: "⚔️ Jaardle-duel: daag een vriend uit",
      meta_desc: "Daag een vriend uit voor een Jaardle-duel: jullie raden het jaar van dezelfde 5 historische gebeurtenissen, van makkelijk naar moeilijk. Per ronde wint de hoogste score. Gratis, zonder account.",
      intro_h1: "Jaardle Duels — geschiedenisquiz één tegen één: wie raadt het jaartal het best?",
      intro_html: "Daag een vriend uit voor een duel in Jaardle, het spel waarin je het jaartal van een historische gebeurtenis raadt. Bij <strong>Best of 5</strong> spelen jullie dezelfde vijf gebeurtenissen, van makkelijk naar moeilijk, wanneer het jullie uitkomt binnen 24 uur. Per ronde wint de hoogste score. Bij <strong>Knock-out</strong> speel je live, tegen een vriend die online is of tegen een bot. Elk jaar ernaast kost punten, en het verschil gaat van de levensbalk van de ander af tot iemand knock-out gaat. Gratis en zonder account. Met een account tellen je duels mee voor je eigen duelrating." },
    en: { meta_title: "Jaardle Duels — challenge a friend: who guesses the year best?",
      meta_share_title: "⚔️ Jaardle Duel: challenge a friend",
      meta_desc: "Challenge a friend to a Jaardle duel: you both guess the year of the same 5 historic events, from easy to hard. The highest score wins each round. Free, no account needed.",
      intro_h1: "Jaardle Duels — a 1v1 history quiz: who guesses the year best?",
      intro_html: "Challenge a friend to a duel in Jaardle, the game where you guess the year of a historic event. In <strong>Best of 5</strong> you both play the same five events, from easy to hard, whenever it suits you within 24 hours. The highest score wins each round. In <strong>Knockout</strong> you play live, against a friend who is online or against a bot. Every year you are off costs points, and the difference comes off the other player's health bar until someone is knocked out. Free, no account needed. With an account, your duels count toward your own duel rating." },
    de: { meta_title: "Jaardle-Duelle — fordere jemanden heraus: wer errät das Jahr am besten?",
      meta_share_title: "⚔️ Jaardle-Duell: fordere jemanden heraus",
      meta_desc: "Fordere Freunde zu einem Jaardle-Duell heraus: Ihr ratet das Jahr derselben 5 historischen Ereignisse, von leicht bis schwer. Pro Runde gewinnt die höchste Punktzahl. Kostenlos, ohne Konto.",
      intro_h1: "Jaardle-Duelle — Geschichtsquiz eins gegen eins: wer errät das Jahr am besten?",
      intro_html: "Fordere Freunde zu einem Duell in Jaardle heraus, dem Spiel, in dem du das Jahr eines historischen Ereignisses errätst. Bei <strong>Best of 5</strong> spielt ihr dieselben fünf Ereignisse, von leicht bis schwer, wann ihr wollt, innerhalb von 24 Stunden. Pro Runde gewinnt die höchste Punktzahl. Beim <strong>Knock-out</strong> spielst du live, gegen jemanden, der gerade online ist, oder gegen einen Bot. Jedes Jahr daneben kostet Punkte, und der Unterschied geht von der Lebensleiste des anderen ab, bis jemand K.o. ist. Kostenlos und ohne Konto. Mit Konto zählen deine Duelle für dein eigenes Duell-Rating." },
    es: { meta_title: "Duelos de Jaardle — reta a un amigo: ¿quién adivina mejor el año?",
      meta_share_title: "⚔️ Duelo de Jaardle: reta a un amigo",
      meta_desc: "Reta a un amigo a un duelo de Jaardle: adivináis el año de los mismos 5 acontecimientos históricos, de fácil a difícil. En cada ronda gana la puntuación más alta. Gratis, sin cuenta.",
      intro_h1: "Duelos de Jaardle — quiz de historia uno contra uno: ¿quién adivina mejor el año?",
      intro_html: "Reta a un amigo a un duelo en Jaardle, el juego en el que adivinas el año de un acontecimiento histórico. En <strong>Al mejor de 5</strong> jugáis los mismos cinco acontecimientos, de fácil a difícil, cuando os venga bien dentro de 24 horas. En cada ronda gana la puntuación más alta. En <strong>K.O.</strong> juegas en vivo, contra un amigo que esté conectado o contra un bot. Cada año de diferencia cuesta puntos, y la diferencia se resta de la barra de vida del otro hasta que alguien queda K.O. Gratis y sin cuenta. Con una cuenta, tus duelos cuentan para tu propio rating de duelos." },
    pt: { meta_title: "Duelos do Jaardle — desafie um amigo: quem adivinha melhor o ano?",
      meta_share_title: "⚔️ Duelo do Jaardle: desafie um amigo",
      meta_desc: "Desafie um amigo para um duelo do Jaardle: vocês adivinham o ano dos mesmos 5 acontecimentos históricos, do mais fácil ao mais difícil. Em cada rodada vence a maior pontuação. Grátis, sem conta.",
      intro_h1: "Duelos do Jaardle — quiz de história um contra um: quem adivinha melhor o ano?",
      intro_html: "Desafie um amigo para um duelo no Jaardle, o jogo em que você adivinha o ano de um acontecimento histórico. No <strong>Melhor de 5</strong>, vocês jogam os mesmos cinco acontecimentos, do mais fácil ao mais difícil, quando quiserem, dentro de 24 horas. Em cada rodada vence a maior pontuação. No <strong>Nocaute</strong> você joga ao vivo, contra um amigo que esteja online ou contra um bot. Cada ano de diferença custa pontos, e a diferença sai da barra de vida do outro até alguém ser nocauteado. Grátis e sem conta. Com uma conta, seus duelos contam para o seu próprio rating de duelos." },
  } },
  // 🗓️ Timeline (22/11/2026): eerst een losse alpha-pagina, nu een pagina van de app (zijn "zelfde bovenscherm als duels dat je ook profiel
  // enzo hebt want is 1 account"). Titel en kop per taal met het eigen woord voor tijdlijn. Eerst alpha met noindex; sinds 24/11 vindbaar
  // en in de sitemap (Search Console: "Excluded by 'noindex' tag").
  { dir: "timeline", at: "t", next: "", label: "Jaardle", icon: "/favicon-timeline", ldName: () => "Jaardle Timeline", strings: {
    nl: { meta_title: "Jaardle Timeline — leg de geschiedenis op volgorde (tijdlijn-spel)",
      meta_share_title: "🗓️ Jaardle Timeline: leg de geschiedenis op volgorde",
      meta_desc: "Leg historische gebeurtenissen op de goede plek in je tijdlijn. Elke kaart draait om en laat het jaar zien. Drie fouten en je bent af. Gratis, zonder account.",
      intro_h1: "Jaardle Timeline — het tijdlijn-spel: welke gebeurtenis kwam eerst?",
      intro_html: "Leg elke nieuwe gebeurtenis op de goede plek in je tijdlijn, door hem te slepen of op een + te tikken. De kaart draait om en laat het jaar zien. Goed gelegd telt mee, fout kost een hartje; na drie fouten is het klaar. Hoe verder je komt, hoe kleiner de gaten. Gratis en zonder account." },
    en: { meta_title: "Jaardle Timeline — put history in order (timeline game)",
      meta_share_title: "🗓️ Jaardle Timeline: put history in order",
      meta_desc: "Place historic events in the right spot on your timeline. Each card flips over to reveal its year. Three mistakes and you're out. Free, no account needed.",
      intro_h1: "Jaardle Timeline — the timeline game: which event came first?",
      intro_html: "Place each new event in the right spot on your timeline by dragging it or tapping a +. The card flips over and shows its year. A correct placement counts, a wrong one costs a heart; after three mistakes the run is over. The further you get, the smaller the gaps. Free, no account needed." },
    de: { meta_title: "Jaardle Timeline — bring die Geschichte in die richtige Reihenfolge (Zeitstrahl-Spiel)",
      meta_share_title: "🗓️ Jaardle Timeline: bring die Geschichte in die richtige Reihenfolge",
      meta_desc: "Lege historische Ereignisse an die richtige Stelle deines Zeitstrahls. Jede Karte dreht sich um und zeigt ihr Jahr. Drei Fehler und du bist raus. Kostenlos, ohne Konto.",
      intro_h1: "Jaardle Timeline — das Zeitstrahl-Spiel: Was kam zuerst?",
      intro_html: "Lege jedes neue Ereignis an die richtige Stelle deines Zeitstrahls, indem du es ziehst oder auf ein + tippst. Die Karte dreht sich um und zeigt das Jahr. Richtig gelegt zählt, ein Fehler kostet ein Herz; nach drei Fehlern ist die Runde vorbei. Je weiter du kommst, desto kleiner die Lücken. Kostenlos und ohne Konto." },
    es: { meta_title: "Jaardle Timeline — ordena la historia (juego de línea del tiempo)",
      meta_share_title: "🗓️ Jaardle Timeline: ordena la historia",
      meta_desc: "Coloca acontecimientos históricos en el lugar correcto de tu línea del tiempo. Cada carta se da la vuelta y muestra su año. Tres errores y quedas fuera. Gratis, sin cuenta.",
      intro_h1: "Jaardle Timeline — el juego de la línea del tiempo: ¿qué pasó primero?",
      intro_html: "Coloca cada nuevo acontecimiento en el lugar correcto de tu línea del tiempo, arrastrándolo o tocando un +. La carta se da la vuelta y muestra el año. Si aciertas, suma; si fallas, pierdes un corazón; tras tres errores, la partida termina. Cuanto más avanzas, más pequeños son los huecos. Gratis y sin cuenta." },
    pt: { meta_title: "Jaardle Timeline — coloque a história em ordem (jogo de linha do tempo)",
      meta_share_title: "🗓️ Jaardle Timeline: coloque a história em ordem",
      meta_desc: "Coloque acontecimentos históricos no lugar certo da sua linha do tempo. Cada carta vira e mostra o ano. Três erros e você está fora. Grátis, sem conta.",
      intro_h1: "Jaardle Timeline — o jogo da linha do tempo: o que veio primeiro?",
      intro_html: "Coloque cada novo acontecimento no lugar certo da sua linha do tempo, arrastando-o ou tocando em um +. A carta vira e mostra o ano. Acertou, conta; errou, perde um coração; depois de três erros, a partida acaba. Quanto mais longe você vai, menores ficam os espaços. Grátis e sem conta." },
  } },
];
const PAGE_KEYS = ["meta_title", "meta_share_title", "meta_desc", "intro_h1", "intro_html"];

// Extra <head>-regels van een subpagina: een groot deelplaatje (WhatsApp, Discord, X). De hoofdpagina heeft er (nog) geen.
function pageHead(page) {
  const robots = page.noindex ? `<meta name="robots" content="noindex">\n` : "";
  if (!page.image) return robots + `<meta name="twitter:card" content="summary">`;
  const img = BASE_URL + page.image;
  return robots + [
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
  let tpl = template;
  if (page.strings) {   // subpagina: de eigen <h1> en intro mogen niet door applyLang() vervangen worden (zie PAGES)
    for (const attr of [' data-i18n="intro_h1"', ' data-i18n-html="intro_html"']) {
      if (!tpl.includes(attr)) throw new Error(`Template mist${attr} (nodig voor de eigen intro van /${page.dir}/)`);
      tpl = tpl.replace(attr, "");
    }
  }
  return tpl
    .replace(/\{\{csp\}\}/g, csp)
    .replace(/\{\{gameSrc\}\}/g, gameSrc)
    .replace(/\{\{manifestHref\}\}/g, meta.path ? `/${meta.path}/manifest.webmanifest` : "/manifest.webmanifest")
    .replace(/\{\{html\}\}/g, meta.html)
    .replace(/\{\{url\}\}/g, pageUrl(meta.path, page.dir))
    // de deur naast 🌐: waar je bent, waar hij heen gaat en hoe die pagina heet (zie PAGES)
    .replace(/\{\{doorAt\}\}/g, page.at)
    .replace(/\{\{doorLabel\}\}/g, () => escAttr(page.label || get("door_duels")))
    .replace(/\{\{href:next\}\}/g, () => pageUrl(meta.path, page.next).slice(BASE_URL.length))
    // {{href:duels}} → het pad van een pagina in deze taal ("/nl/duels/", "/duels/"): echte links voor crawlers.
    .replace(/\{\{href:([\w-]*)\}\}/g, (_, dir) => {
      if (dir && !PAGES.some((p) => p.dir === dir)) throw new Error(`{{href:${dir}}}: geen pagina /${dir}/ in PAGES`);
      return pageUrl(meta.path, dir).slice(BASE_URL.length);
    })
    .replace(/\{\{intl\}\}/g, meta.intl)
    .replace(/\{\{og\}\}/g, meta.og)
    .replace(/\{\{hreflang\}\}/g, hreflangBlock(LANGS, LANG_CODES, DEFAULT_LANG, page.dir))
    .replace(/\{\{pageHead\}\}/g, pageHead(page))
    // het favicon van de pagina (PAGES.icon): alleen de <link>-regels in de head, de JA/AR-tegel in de deur (<img src>) blijft Jaardle
    .replace(/(<link rel="(?:icon|apple-touch-icon)"[^>]*? href=")\/favicon(?=\.svg|-\d)/g, (_, a) => a + (page.icon || "/favicon"))
    .replace(/\{\{ldName\}\}/g, () => JSON.stringify(page.ldName ? page.ldName(get) : "Jaardle"))
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
  const urls = PAGES.filter((page) => !page.noindex).flatMap((page) => LANG_CODES.map((c) =>
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
  const gaps = mod.LANG_CODES.filter((c) => !page.strings[c] || PAGE_KEYS.some((k) => typeof page.strings[c][k] !== "string"));
  if (gaps.length) throw new Error(`Pagina /${page.dir}/ mist teksten voor: ${gaps.join(", ")}`);
}

for (const page of PAGES) {
  if (!["j", "d", "t"].includes(page.at) || !PAGES.some((p) => p.dir === page.next)) throw new Error(`Pagina /${page.dir}/: at of next klopt niet`);
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

// Doorstuuradressen (PAGES[].aliases): GitHub Pages kent geen echte 301, dus een klein HTML-bestand per taal dat meteen doorstuurt
// (location.replace, met ?query en #hash erbij; meta-refresh als vangnet zonder JS). noindex + canonical naar het echte adres, niet
// in de sitemap. Ook onder /en/ (zoals de hoofdpagina's daar een alias hebben).
function aliasHtml(target, htmlLang) {
  return `<!doctype html>
<html lang="${htmlLang}">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<link rel="canonical" href="${BASE_URL}${target}">
<title>Jaardle</title>
<script>location.replace(${JSON.stringify(target)} + location.search + location.hash);</script>
<meta http-equiv="refresh" content="0; url=${target}">
</head>
<body><a href="${target}">Jaardle</a></body>
</html>
`;
}
for (const page of PAGES) for (const alias of page.aliases || []) {
  if (PAGES.some((p) => p.dir === alias)) throw new Error(`Alias /${alias}/ botst met een echte pagina`);
  for (const code of mod.LANG_CODES) {
    const path = mod.LANGS[code].path;
    const target = pageUrl(path, page.dir).slice(BASE_URL.length);
    for (const base of path ? [path] : ["", code]) {
      const rel = [base, alias].filter(Boolean).join("/");
      mkdirSync(join(ROOT, rel), { recursive: true });
      writeFileSync(join(ROOT, rel, "index.html"), aliasHtml(target, mod.LANGS[code].html));
      console.log(`✓ ${rel}/index.html  (doorsturen → ${target})`);
    }
  }
}

writeFileSync(join(ROOT, "sitemap.xml"), sitemap(mod.LANGS, mod.LANG_CODES));
console.log(`✓ sitemap.xml  (${mod.LANG_CODES.length * PAGES.filter((p) => !p.noindex).length} URL's)`);
console.log(`\n${count} pagina's (taal × pagina) gegenereerd uit index.template.html.`);
