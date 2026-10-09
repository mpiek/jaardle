// Bewaakt het dagelijkse Discord-bericht (tools/discord-daily.mjs + .github/workflows/discord-daily.yml):
// geen antwoord in de tekst, een link naar het spel, en een post per dag in het ochtendvenster, ook als geplande runs vallen of te laat komen
// en rond het verzetten van de klok. Draaien:  node --test tests/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { amsterdamParts, inWindow, dayNumber, buildPayload, escapeMd } from "../tools/discord-daily.mjs";

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

test("elke dag van het jaar vallen er minstens twee geplande runs in het venster 06:00-12:00 Amsterdam, en de eerste is vroeg", () => {
  const yml = readFileSync(join(root, ".github/workflows/discord-daily.yml"), "utf8");
  const crons = [...yml.matchAll(/- cron: "(\d+) (\d+) \* \* \*"/g)].map((m) => ({ min: +m[1], hour: +m[2] }));
  assert.ok(crons.length >= 3, "meerdere kansen per dag (GitHub laat geplande runs weleens vallen)");
  assert.ok(crons.every((c) => c.min !== 0), "niet op het hele uur starten");
  const window = yml.match(/--send --window (\d+-\d+)/)?.[1];
  assert.equal(window, "6-12");
  for (let day = Date.UTC(2026, 0, 1); day < Date.UTC(2028, 0, 1); day += 86400000) {
    const inside = crons
      .map((c) => day + c.hour * 3600000 + c.min * 60000)
      .filter((t) => inWindow(amsterdamParts(new Date(t)).hour, window))
      .sort((a, b) => a - b);
    const label = new Date(day).toISOString().slice(0, 10);
    assert.ok(inside.length >= 2, `${label}: maar ${inside.length} run(s) in het venster`);
    assert.ok(amsterdamParts(new Date(inside[0])).hour <= 6, `${label}: de eerste run in het venster komt pas na 07:00`);
  }
  assert.match(yml, /secrets\.DISCORD_DAILY_WEBHOOK/);
  assert.match(yml, /actions\/cache\/restore@v4[\s\S]*lookup-only: true/, "per dag onthouden dat er gepost is");
  assert.match(yml, /actions\/cache\/save@v4/);
  assert.doesNotMatch(yml, /echo[^\n]*DISCORD_DAILY_WEBHOOK/, "de secret mag nooit geprint worden");
});

test("inWindow: begin telt mee, einde niet; slechte invoer geeft een fout", () => {
  assert.equal(inWindow(5, "6-12"), false);
  assert.equal(inWindow(6, "6-12"), true);
  assert.equal(inWindow(11, "6-12"), true);
  assert.equal(inWindow(12, "6-12"), false);
  assert.throws(() => inWindow(7, "zes tot twaalf"));
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
