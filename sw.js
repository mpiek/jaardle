/* Service worker van Jaardle: alleen voor seintjes (web push: het dagelijkse, remind.js en db/137, en duel-seintjes, duel.js en db/189). Bewust géén fetch-handler
   en geen cache: het spel komt altijd vers van het net, dus nooit een oude game.js die blijft hangen. Wordt pas geregistreerd
   als iemand het seintje aanzet. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Een duel-seintje (db/204) toont rechts het gezichtje van de tegenstander, zoals in de Duels-lijst: een rondje in zijn kleur
// (faceHue op naam) met zijn flair, zonder flair zijn beginletter. Hier getekend, dus zonder netwerk; lukt dat niet, dan het
// gewone icoon. Effecten en eigen tekeningen niet (de Edge Function stuurt dan geen emoji: beginletter). iPhone toont geen icoon.
const FACE_HUES = [8, 28, 42, 168, 190, 262, 292, 330];   // = FACE_HUES in game.js (een test bewaakt dat)
function faceHue(name) {
  let h = 0;
  const s = String(name || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return FACE_HUES[h % FACE_HUES.length];
}
// De achtergrond van .dl-av.hue in het donkere thema: color-mix(in srgb, hsl(h 65% 52%) 38%, #2c2c2c).
function faceBg(h) {
  const s = 0.65, l = 0.52, k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const ch = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return `rgb(${[0, 8, 4].map((n) => Math.round(ch(n) * 255 * 0.38 + 44 * 0.62)).join(",")})`;
}
async function faceIcon(face) {
  try {
    if (!face || !face.n || typeof OffscreenCanvas !== "function") return null;
    const S = 192, cv = new OffscreenCanvas(S, S), x = cv.getContext("2d");
    if (!x) return null;
    x.fillStyle = faceBg(faceHue(face.n));
    x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, 2 * Math.PI); x.fill();
    const emo = typeof face.f === "string" && face.f ? face.f : null;
    const glyph = emo || ([...String(face.n)][0] || "?").toUpperCase();
    x.font = emo ? `${Math.round(S * 0.54)}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`
      : `700 ${Math.round(S * 0.5)}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    x.fillStyle = "#f5f5f5";
    x.textAlign = "center";
    x.textBaseline = "alphabetic";
    const m = x.measureText(glyph);   // precies in het midden: op de echte omtrek van het teken, niet op de regel
    const up = m.actualBoundingBoxAscent || S * 0.36, down = m.actualBoundingBoxDescent || 0;
    x.fillText(glyph, S / 2 + ((m.actualBoundingBoxLeft || 0) - (m.actualBoundingBoxRight || 0)) / 2, S / 2 + (up - down) / 2);
    const u8 = new Uint8Array(await (await cv.convertToBlob({ type: "image/png" })).arrayBuffer());
    let bin = "";
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return "data:image/png;base64," + btoa(bin);
  } catch (err) { return null; }
}

// Een duel-seintje terwijl je Jaardle open en in beeld hebt: geen systeemmelding (daar tikt niemand op, en Android/Chrome rekenen
// dat als ongewenst: "te veel meldingen"). De pagina krijgt het door (game.js → Duel.pushed: Duels-scherm vers, anders het stipje)
// en een oude melding over dat duel gaat weg. Apple (iPhone, Safari) eist bij elk bericht een melding, anders zegt hij het
// abonnement op: daar altijd tonen. Chrome eist er geen zolang een Jaardle-tab in beeld is.
async function inApp(tag, code) {
  try {
    const sub = await self.registration.pushManager.getSubscription();
    if (!sub || /push\.apple\.com/.test(sub.endpoint)) return false;
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (!tabs.some((c) => c.visibilityState === "visible" && c.focused)) return false;
    for (const c of tabs) c.postMessage({ jaardle: "duel-push", code });
    for (const n of await self.registration.getNotifications({ tag })) n.close();
    return true;
  } catch (err) { return false; }
}

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil((async () => {
    const duel = /^jaardle-duel-(.+)$/.exec(d.tag || "");
    if (duel && await inApp(d.tag, duel[1])) return;
    // Nooit langer dan 2 s op het gezichtje wachten: het seintje gaat altijd.
    const face = d.face ? await Promise.race([faceIcon(d.face), new Promise((ok) => setTimeout(() => ok(null), 2000))]) : null;
    await self.registration.showNotification(d.title || "Jaardle", {
      body: d.body || "",
      icon: face || "/favicon-192.png?v=2",
      badge: "/badge-96.png",
      tag: d.tag || "jaardle-daily",   // een nieuw seintje vervangt het vorige (een duel heeft een eigen tag per duel)
      renotify: !!d.tag && !d.quiet,   // een nieuw duel-seintje over hetzelfde duel trilt opnieuw…
      silent: !!d.quiet,   // …behalve "de ander is klaar" vlak na een eerder seintje over dat duel (db/204): stil vervangen
      data: { url: d.url || "/" },
    });
  })());
});

// Tik op het seintje: een open Jaardle-tab naar voren halen (en naar de daily sturen), anders een nieuwe openen.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of tabs) {
      if (new URL(c.url).origin !== self.location.origin) continue;
      try { await c.focus(); if ("navigate" in c) await c.navigate(url); return; } catch (err) {}
    }
    await self.clients.openWindow(url);
  })());
});
