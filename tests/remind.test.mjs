// Tests voor remind.js (het dagelijkse seintje): welke uren je mag kiezen en wanneer het eerste seintje komt, rond de
// nieuwe daily (00:00 Amsterdam) in andere tijdzones. Alles in lokale tijd van dit proces, dus onafhankelijk van TZ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

globalThis.window = globalThis;
globalThis.matchMedia ??= () => ({ matches: false });
const dir = dirname(fileURLToPath(import.meta.url));
(0, eval)(readFileSync(join(dir, "..", "remind.js"), "utf8"));
const R = globalThis.Remind;

const at = (h, m = 0) => new Date(2026, 10, 2, h, m).getTime();          // een maandag in november, lokale tijd
const until = (now, h) => Math.round((new Date(2026, 10, h >= 24 ? 3 : 2, h % 24, 0).getTime() - now) / 1000);   // seconden tot h:00 lokaal
const blocked = (info) => info.hours.filter((x) => !x.ok).map((x) => x.h);

test("seintje: alleen uren met minstens 2 uur tot de nieuwe daily; het streepje alleen als de nieuwe daily tussen 7 en 22 valt", () => {
  const now = at(10);
  const ams = R.hoursInfo(now, until(now, 24));       // Amsterdam: nieuwe daily om middernacht
  assert.deepEqual(blocked(ams), []);
  assert.equal(ams.resetH, null);
  const lon = R.hoursInfo(now, until(now, 23));       // Londen: 23:00
  assert.deepEqual(blocked(lon), [22]);
  const ny = R.hoursInfo(now, until(now, 18));        // New York: 18:00
  assert.deepEqual(blocked(ny), [17]);
  assert.equal(ny.resetH, 18);
  const la = R.hoursInfo(now, until(now, 15));        // Los Angeles: 15:00
  assert.deepEqual(blocked(la), [14]);
  const syd = R.hoursInfo(at(12), until(at(12), 24 + 10));   // Sydney: 10:00 (morgen)
  assert.deepEqual(blocked(syd), [9]);
  assert.equal(syd.resetH, 10);
  assert.equal(R.nearestOk(ny, 17, 1), 18, "met de pijltjes naar rechts óver het gearceerde uur heen");
  assert.equal(R.nearestOk(ny, 17, -1), 16, "en naar links ook");
});

test("seintje: het eerste bericht komt pas bij de volgende daily, niet bij die van vandaag die je al speelde", () => {
  const now = at(10);
  assert.equal(R.firstDay(now, until(now, 24), 19), "tomorrow", "Amsterdam 19:00 hoort nog bij vandaag → morgen");
  assert.equal(R.firstDay(now, until(now, 18), 19), "today", "New York: om 19:00 staat de nieuwe er al → vanavond");
  assert.equal(R.firstDay(now, until(now, 18), 8), "tomorrow");
  assert.equal(R.firstDay(at(23), until(at(23), 24), 7), "tomorrow");
});
