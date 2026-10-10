// Bewaakt het dagelijkse Discord-bericht (tools/discord-daily.mjs + .github/workflows/discord-daily.yml):
// geen antwoord in de tekst, een link naar het spel, en geen planner in de workflow (de dagelijkse post draait via pg_cron).
// Draaien:  node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { amsterdamParts, dayNumber, buildPayload, escapeMd } from "../tools/discord-daily.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const puzzle = (year, en) => ({ year, facts: [{ en }] });

test("dagnummer: 6 juni 2026 is #1", () => {
  assert.equal(dayNumber("2026-06-06"), 1);
  assert.equal(dayNumber("2026-10-08"), 125);   // zoals in het spel ("Dag #125")
  assert.equal(dayNumber("2026-10-09"), 126);
});

test("Amsterdamse datum en uur, zomer- en wintertijd", () => {
  assert.deepEqual(amsterdamParts(new Date("2026-10-09T04:17:00Z")), { date: "2026-10-09", hour: 6 });   // CEST = UTC+2
  assert.deepEqual(amsterdamParts(new Date("2026-11-09T05:17:00Z")), { date: "2026-11-09", hour: 6 });   // CET = UTC+1
  assert.deepEqual(amsterdamParts(new Date("2026-10-09T22:30:00Z")), { date: "2026-10-10", hour: 0 });   // na middernacht: volgende dag
  assert.deepEqual(amsterdamParts(new Date("2026-10-09T05:17:00Z")), { date: "2026-10-09", hour: 7 });
});

test("de workflow is alleen met de hand te starten: geen schedule (pg_cron in de database post al), secret nooit geprint", () => {
  const yml = readFileSync(join(root, ".github/workflows/discord-daily.yml"), "utf8");
  const live = yml.split("\n").filter((l) => !l.trim().startsWith("#")).join("\n");   // commentaar telt niet mee
  assert.match(live, /workflow_dispatch:/);
  assert.doesNotMatch(live, /schedule:|cron:/, "geen planner hier: twee planners naast elkaar posten dubbel");
  assert.match(live, /secrets\.DISCORD_DAILY_WEBHOOK/);
  assert.match(live, /--check-webhook/);
  assert.doesNotMatch(live, /echo[^\n]*DISCORD_DAILY_WEBHOOK/, "de secret mag nooit geprint worden");
  assert.match(yml, /pg_cron/, "de opmerking bovenin verwijst naar waar de planning wél zit");
});

test("bericht: vraag, link naar het spel, geen antwoord, geen mentions", () => {
  const p = buildPayload(puzzle(1773, "Colonists dump tea into Boston Harbor in protest against British taxes."), "2026-10-09");
  const e = p.embeds[0];
  assert.equal(e.title, "📅 Jaardle #126");
  assert.equal(e.url, "https://jaardle.com/?ref=discord");
  assert.match(e.description, /\[Play today's Jaardle\]\(https:\/\/jaardle\.com\/\?ref=discord\)/, "een klikbare link in de tekst zelf");
  assert.match(e.description, /> Colonists dump tea/);
  assert.doesNotMatch(JSON.stringify(p), /1773/);
  assert.deepEqual(p.allowed_mentions, { parse: [] });
  assert.match(e.footer.text, /9 Oct 2026/);
  assert.ok(!/yesterday/i.test(e.description), "geen antwoord van gisteren");
});

test("weigert te posten als het antwoordjaar in de vraag staat — zonder het jaar in de melding te zetten", () => {
  assert.throws(() => buildPayload(puzzle(1773, "Colonists dump tea in 1773 as a protest."), "2026-10-09"), (e) => {
    assert.match(e.message, /antwoordjaar/);
    assert.doesNotMatch(e.message, /1773/, "de Actions-logs zijn openbaar");
    return true;
  });
  // een ander getal, of een jaar als onderdeel van een groter getal, is geen antwoord
  assert.doesNotThrow(() => buildPayload(puzzle(1773, "A junta governs the country for the next 17 years."), "2026-10-09"));
  assert.doesNotThrow(() => buildPayload(puzzle(1773, "The ship carries 17730 barrels."), "2026-10-09"));
  assert.doesNotThrow(() => buildPayload(puzzle(44, "A dictator is assassinated on the Ides of March."), "2026-10-09"));
  assert.throws(() => buildPayload(puzzle(44, "In 44 BC a dictator is assassinated."), "2026-10-09"));
});

test("onverwachte antwoorden van de RPC leveren een fout op, geen half bericht", () => {
  assert.throws(() => buildPayload(null, "2026-10-09"));
  assert.throws(() => buildPayload({ year: 1900, facts: [] }, "2026-10-09"));
  assert.throws(() => buildPayload(puzzle(1900, "x".repeat(901)), "2026-10-09"), /lang/);
});

test("Discord-markdown in de clue wordt onschadelijk gemaakt", () => {
  assert.equal(escapeMd("a *b* _c_ ~d~ `e` ||f|| [g] <h>"), "a \\*b\\* \\_c\\_ \\~d\\~ \\`e\\` \\|\\|f\\|\\| \\[g\\] \\<h\\>");
  const p = buildPayload(puzzle(1900, "A *bold* claim about ||secrets||."), "2026-10-09");
  assert.match(p.embeds[0].description, /> A \\\*bold\\\* claim about \\\|\\\|secrets\\\|\\\|\./);
});
