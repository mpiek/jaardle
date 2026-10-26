/* Service worker van Jaardle: alleen voor het dagelijkse seintje (web push, zie remind.js en db/137). Bewust géén fetch-handler
   en geen cache: het spel komt altijd vers van het net, dus nooit een oude game.js die blijft hangen. Wordt pas geregistreerd
   als iemand het seintje aanzet. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Jaardle", {
    body: d.body || "",
    icon: "/favicon-192.png?v=2",
    badge: "/badge-96.png",
    tag: "jaardle-daily",   // een nieuw seintje vervangt het vorige
    renotify: false,
    data: { url: d.url || "/" },
  }));
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
