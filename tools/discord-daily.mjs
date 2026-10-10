// De vraag van de dag als bericht in het Jaardle-Discordkanaal (algemeen). De DAGELIJKSE post draait niet hier maar in
// de database (pg_cron + pg_net, post_daily_discord(); de GitHub-planner liet runs uren te laat komen of weg). Dit script is
// de preview en de handmatige variant (workflow .github/workflows/discord-daily.yml, alleen met de hand te starten) en
// de bron van de tekst die de database nabootst — pas je de tekst aan, pas dan ook de SQL-functie aan.
//
//   node tools/discord-daily.mjs                      preview van vandaag (Amsterdamse datum), er wordt niets gepost
//   node tools/discord-daily.mjs --date 2026-10-03    preview van een andere dag
//   node tools/discord-daily.mjs --check-webhook      preview + controleren dat de webhook bestaat (post niets)
//   node tools/discord-daily.mjs --send               echt posten
//
// De webhook komt uit $DISCORD_DAILY_WEBHOOK (de GitHub-secret) of lokaal uit ~/Games/discord_daily_webhook.txt en
// wordt nooit geprint. De publieke Supabase-URL/key lezen we uit index.template.html, net als de pagina zelf.
//
// Wat er in het bericht staat: het hoofdfeit van de dag (Engels), een duidelijke link naar het spel en een
// uitnodiging om in ||spoilers|| te gokken. Het jaartal staat er nooit in — niet vandaag en niet gisteren; het script
// weigert te posten als het antwoord in de vraag voorkomt. LET OP: de Actions-logs van deze (publieke) repo zijn
// openbaar, dus ook foutmeldingen mogen het antwoordjaar nooit bevatten.
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://jaardle.com";
const LINK = `${SITE}/?ref=discord`;            // ?ref= laat GoatCounter "discord" als herkomst tonen
const EPOCH_MS = Date.UTC(2026, 5, 6);           // dag #1 (EPOCH in game.js)
const COLOR = 0x6ea8ff;                          // --accent van de app, zelfde als de changelog-posts
const MAX_CLUE = 900;                            // embed-beschrijving mag 4096; een veel langere clue is verdacht
const WEBHOOK_RE = /^https:\/\/(?:discord|discordapp)\.com\/api\/(?:v\d+\/)?webhooks\/\d+\/[\w-]+$/;
const UA = "DiscordBot (https://jaardle.com, 1.0)";

// --- pure functies (getest in tests/discord-daily.test.mjs) ---------------------------------------------------
// Datum + uur in Amsterdam voor een moment; de daily wisselt om middernacht Amsterdam (get_daily).
export function amsterdamParts(now = new Date()) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) };
}

export function dayNumber(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH_MS) / 86400000) + 1;
}

// Discord-markdown in de clue onschadelijk maken (een * of _ in de tekst mag niets vet/schuin maken).
export const escapeMd = (s) => s.replace(/[\\*_~`|[\]<>]/g, "\\$&");

export function buildPayload(puzzle, dateStr) {
  const year = puzzle?.year;
  const clue = String(puzzle?.facts?.[0]?.en ?? "").replace(/\s+/g, " ").trim();
  if (!Number.isInteger(year) || !clue) throw new Error("onverwacht antwoord van get_daily (geen jaar of geen clue)");
  if (clue.length > MAX_CLUE) throw new Error(`de clue is verdacht lang (${clue.length} tekens)`);
  // Het antwoord mag nooit in de vraag staan. (Geen jaartal in de foutmelding: de logs zijn openbaar.)
  if (new RegExp(`(?<![\\w.,-])${Math.abs(year)}(?!\\w)`).test(clue)) {
    throw new Error("het antwoordjaar staat in de clue; niet gepost");
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  const shown = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return {
    username: "Jaardle",
    allowed_mentions: { parse: [] },
    embeds: [{
      title: `📅 Jaardle #${dayNumber(dateStr)}`,
      url: LINK,
      description: [
        "**In which year?**",
        `> ${escapeMd(clue)}`,
        "",
        `▶ **[Play today's Jaardle](${LINK})**`,
        "Put your guess in ||spoilers|| and share your result squares after you play.",
      ].join("\n"),
      color: COLOR,
      footer: { text: `jaardle.com · ${shown} · events from Wikipedia (CC BY-SA 4.0)` },
    }],
  };
}

// --- netwerk / CLI -------------------------------------------------------------------------------------------
const die = (msg) => { console.error(`✖ ${msg}`); process.exit(1); };

function supabase() {
  const html = readFileSync(join(ROOT, "index.template.html"), "utf8");
  const url = html.match(/https:\/\/[a-z0-9]+\.supabase\.co/)?.[0];
  const key = html.match(/sb_publishable_[A-Za-z0-9_]+/)?.[0];
  if (!url || !key) die("Supabase-URL/key niet gevonden in index.template.html");
  return { url, key };
}

async function getDaily(dateStr) {
  const { url, key } = supabase();
  const r = await fetch(`${url}/rest/v1/rpc/get_daily`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", "User-Agent": UA },
    body: JSON.stringify({ d: dateStr }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) die(`get_daily(${dateStr}) gaf HTTP ${r.status}`);
  return r.json();
}

function webhookUrl() {
  let url = (process.env.DISCORD_DAILY_WEBHOOK || "").trim();
  if (!url) {
    const file = join(homedir(), "Games", "discord_daily_webhook.txt");
    try { url = readFileSync(file, "utf8").trim(); } catch { die(`geen $DISCORD_DAILY_WEBHOOK en kan ${file} niet lezen`); }
  }
  if (!WEBHOOK_RE.test(url)) die("de webhook ziet er niet uit als een Discord-webhook-URL");
  return url;
}

async function send(payload, url) {
  for (const attempt of [1, 2]) {
    const r = await fetch(`${url}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    if (r.ok) return r.json();
    const body = await r.text();
    if (r.status === 429 && attempt === 1) {
      const wait = Number(JSON.parse(body || "{}").retry_after ?? 2);
      await new Promise((ok) => setTimeout(ok, Math.min(wait, 10) * 1000 + 500));
      continue;
    }
    die(`Discord antwoordde HTTP ${r.status}: ${body.slice(0, 300)}`);
  }
}

function preview(payload) {
  const e = payload.embeds[0];
  console.log("─".repeat(60));
  console.log(e.title, "\n");
  console.log(e.description, "\n");
  console.log(`[${e.footer.text}]   (${e.description.length} tekens)`);
  console.log("─".repeat(60));
}

async function main() {
  const argv = process.argv.slice(2);
  const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const has = (name) => argv.includes(name);

  const day = opt("--date") ?? amsterdamParts().date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) die("--date moet YYYY-MM-DD zijn");

  const puzzle = await getDaily(day);
  if (!puzzle) die(`geen daily voor ${day} (toekomst of buiten bereik)`);
  let payload;
  try { payload = buildPayload(puzzle, day); } catch (e) { die(e.message); }
  preview(payload);

  if (has("--check-webhook")) {
    const r = await fetch(webhookUrl(), { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) die(`webhook-controle gaf HTTP ${r.status}`);
    const w = await r.json();
    console.log(`✔ webhook bestaat: naam "${w.name}", kanaal ${w.channel_id}. Er is niets gepost.`);
    return;
  }
  if (!has("--send")) { console.log("(alleen preview; er is niets gepost. Met --send wordt er echt gepost.)"); return; }
  const msg = await send(payload, webhookUrl());
  console.log(`✔ gepost (bericht-id ${msg.id}, kanaal ${msg.channel_id})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
