// Tests voor live.js (db/206): md5-sleutel, verbinden op het eigen kanaal + aanwezigheid, seintjes doorgeven, online-stipjes,
// en loskoppelen als de tab weg is. Realtime zelf is een nep (window.sbRealtime).
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(dir, "..", "live.js"), "utf8");

function setup() {
  const listeners = {}, docListeners = {}, events = [];
  const chans = [];
  const fakeRT = {
    setAuth: async () => {},
    remove: (ch) => { ch.removed = true; },
    channel(name, opts) {
      const ch = { name, opts, handlers: [], tracks: 0, untracks: 0, removed: false, state: {} };
      ch.on = (type, filter, fn) => { ch.handlers.push({ type, filter, fn }); return ch; };
      ch.subscribe = (cb) => { ch.cb = cb; if (cb) cb("SUBSCRIBED"); return ch; };
      ch.track = async () => { ch.tracks++; };
      ch.untrack = async () => { ch.untracks++; };
      ch.presenceState = () => ch.state;
      chans.push(ch);
      return ch;
    },
  };
  const win = {
    sbRealtime: fakeRT,
    addEventListener: (t, f) => { (listeners[t] ||= []).push(f); },
    dispatchEvent: (e) => { events.push(e); (listeners[e.type] || []).forEach((f) => f(e)); },
  };
  const doc = { visibilityState: "visible", addEventListener: (t, f) => { (docListeners[t] ||= []).push(f); } };
  class CE { constructor(type, init) { this.type = type; this.detail = init?.detail; } }
  const fn = new Function("window", "document", "CustomEvent", "setTimeout", "clearTimeout", SRC);
  fn(win, doc, CE, setTimeout, clearTimeout);
  const setVis = (v) => { doc.visibilityState = v; (docListeners.visibilitychange || []).forEach((f) => f()); };
  return { win, chans, events, setVis, Live: win.Live };
}
const md5 = (s) => createHash("md5").update(s).digest("hex");
const flush = () => new Promise((r) => setImmediate(r));

test("md5 = Node's md5 (de sleutel moet gelijk zijn aan md5(uid) uit duel_list)", () => {
  const { Live } = setup();
  for (const s of ["", "abc", "8b0e3c2a-1f4d-4e5a-9b7c-123456789abc", "x".repeat(56), "y".repeat(64)]) assert.equal(Live._.md5(s), md5(s));
});

test("zonder account niets; met account het eigen privé-kanaal en 'online' met md5(uid)", async () => {
  const { Live, chans } = setup();
  Live.setUser(null);
  await flush();
  assert.equal(chans.length, 0);
  const uid = "11111111-2222-4333-8444-555555555555";
  Live.setUser(uid);
  await flush();
  assert.deepEqual(chans.map((c) => c.name), ["u:" + uid, "online"]);
  assert.equal(chans[0].opts.config.private, true);
  assert.equal(chans[1].opts.config.private, true);
  assert.equal(chans[1].opts.config.presence.key, md5(uid));
  assert.equal(chans[1].tracks, 1, "meldt zich online na SUBSCRIBED");
  Live.setUser(uid);   // zelfde speler: niets opnieuw
  await flush();
  assert.equal(chans.length, 2);
});

test("seintje op het eigen kanaal → jaardle:duel-rt met de code", async () => {
  const { Live, chans, events } = setup();
  Live.setUser("u1");
  await flush();
  const h = chans[0].handlers.find((x) => x.type === "broadcast" && x.filter.event === "duel");
  h.fn({ payload: { code: "ABC123" } });
  h.fn({ payload: { code: 5 } });   // rommel: geen code
  const rt = events.filter((e) => e.type === "jaardle:duel-rt").map((e) => e.detail);
  assert.deepEqual(rt, ["ABC123", null]);
});

test("aanwezigheid: anderen online (niet jezelf), event alleen bij een verandering", async () => {
  const { Live, chans, events } = setup();
  Live.setUser("me");
  await flush();
  const onl = chans[1], sync = onl.handlers.find((x) => x.type === "presence").fn;
  onl.state = { [md5("me")]: [{}], k1: [{}], k2: [{}] };
  sync();
  assert.equal(Live.isOn("k1"), true);
  assert.equal(Live.isOn(md5("me")), false);
  assert.equal(Live.isOn(""), false);
  const n = events.filter((e) => e.type === "jaardle:online").length;
  sync();   // zelfde stand
  assert.equal(events.filter((e) => e.type === "jaardle:online").length, n);
  onl.state = { k1: [{}] };
  sync();
  assert.equal(Live.isOn("k2"), false);
  assert.equal(events.filter((e) => e.type === "jaardle:online").length, n + 1);
});

test("tab weg: 15 s = niet meer online, 60 s = verbinding dicht; terug = opnieuw verbonden", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { Live, chans, setVis } = setup();
    Live.setUser("me");
    await flush();
    setVis("hidden");
    mock.timers.tick(15000);
    assert.equal(chans[1].untracks, 1);
    mock.timers.tick(45000);
    assert.equal(chans[0].removed && chans[1].removed, true);
    setVis("visible");
    await flush();
    assert.equal(chans.length, 4, "nieuwe kanalen na terugkomen");
    // kort weg en terug: geen untrack, gewoon weer online
    setVis("hidden");
    mock.timers.tick(5000);
    setVis("visible");
    mock.timers.tick(60000);
    assert.equal(chans[3].removed, false);
    assert.equal(chans[3].untracks, 0);
  } finally { mock.timers.reset(); }
});

test("uitloggen: kanalen dicht en niemand meer online", async () => {
  const { Live, chans } = setup();
  Live.setUser("me");
  await flush();
  chans[1].state = { k1: [{}] };
  chans[1].handlers.find((x) => x.type === "presence").fn();
  assert.equal(Live.isOn("k1"), true);
  Live.setUser(null);
  assert.equal(chans[0].removed && chans[1].removed, true);
  assert.equal(Live.isOn("k1"), false);
});
