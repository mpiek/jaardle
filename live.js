// /live.js (19/11/2026, db/206): Realtime voor ingelogde spelers. Lui geladen door game.js (liveSync) als de browser niets te doen heeft.
// - u:<uid>  je eigen privé-kanaal: de server meldt {code} als een duel van jou verandert (aangenomen, gespeeld, ingetrokken …),
//            en (event 'ko', db/208) alles over een ⚡ knock-out → "jaardle:ko-rt" → /ko.js.
//            Dat gaat als "jaardle:duel-rt" naar game.js, dezelfde route als een duel-seintje uit sw.js (Duel.pushed).
// - online   aanwezigheid: wie er nu op Jaardle is, onder md5(uid) = dezelfde sleutel k als de gezichtjes in duel_list.
//            Live.isOn(k) → groen stipje; bij elke wijziging "jaardle:online".
// Alleen verbonden zolang de tab in beeld is: 15 s weg = niet meer online, 60 s weg = verbinding dicht (kost dan niets).
// Alles via window.sbRealtime (de brug in index.template.html); zonder brug doet deze module niets.
(() => {
  if (window.Live) return;
  const RT = window.sbRealtime;
  const HIDE_UNTRACK_MS = 15000, HIDE_CLOSE_MS = 60000;
  let uid = null, myK = null, own = null, onl = null, tracked = false;
  let online = new Set(), tUntrack = null, tClose = null;

  // md5 (RFC 1321) van een korte ASCII-tekst, als hex: alleen voor de sleutel md5(uid) (WebCrypto kent geen md5).
  function md5(str) {
    const K = [], S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
    const bytes = [];
    for (let i = 0; i < str.length; i++) bytes.push(str.charCodeAt(i) & 255);
    const bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let i = 0; i < 8; i++) bytes.push(i < 4 ? (bitLen >>> (8 * i)) & 255 : 0);
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let o = 0; o < bytes.length; o += 64) {
      const M = [];
      for (let i = 0; i < 16; i++) M[i] = bytes[o + 4 * i] | (bytes[o + 4 * i + 1] << 8) | (bytes[o + 4 * i + 2] << 16) | (bytes[o + 4 * i + 3] << 24);
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        const tmp = D; D = C; C = B;
        const x = (A + F + K[i] + M[g]) | 0, s = S[(i >> 4) * 4 + (i % 4)];
        B = (B + ((x << s) | (x >>> (32 - s)))) | 0;
        A = tmp;
      }
      a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
    }
    return [a0, b0, c0, d0].map((v) => [0, 1, 2, 3].map((j) => ((v >>> (8 * j)) & 255).toString(16).padStart(2, "0")).join("")).join("");
  }

  const emit = () => { try { window.dispatchEvent(new CustomEvent("jaardle:online")); } catch (e) {} };
  const visible = () => document.visibilityState !== "hidden";

  function readOnline() {
    if (!onl) return;
    let st = {};
    try { st = onl.presenceState() || {}; } catch (e) {}
    const next = new Set(Object.keys(st).filter((k) => k && k !== myK));
    const same = next.size === online.size && [...next].every((k) => online.has(k));
    online = next;
    if (!same) emit();
  }
  function track() {
    if (!onl || tracked || !visible()) return;
    tracked = true;
    onl.track({}).catch?.(() => { tracked = false; });
  }
  function untrack() {
    if (!onl || !tracked) return;
    tracked = false;
    onl.untrack().catch?.(() => {});
  }

  async function connect() {
    if (!RT || !uid || own) return;
    try { await RT.setAuth(); } catch (e) {}
    if (!uid || own) return;   // intussen uitgelogd of al verbonden
    own = RT.channel("u:" + uid, { config: { private: true } })
      .on("broadcast", { event: "duel" }, (m) => {
        const code = m?.payload?.code;
        try { window.dispatchEvent(new CustomEvent("jaardle:duel-rt", { detail: typeof code === "string" ? code : null })); } catch (e) {}
      })
      .on("broadcast", { event: "ko" }, (m) => {   // ⚡ Knock-out (db/208): {code, k[, n|next]}
        const p = m?.payload;
        if (p && typeof p.code === "string") try { window.dispatchEvent(new CustomEvent("jaardle:ko-rt", { detail: p })); } catch (e) {}
      })
      .subscribe();
    onl = RT.channel("online", { config: { private: true, presence: { key: myK } } });   // eerst vastleggen: SUBSCRIBED kan meteen komen
    onl.on("presence", { event: "sync" }, readOnline);
    onl.subscribe((status) => { if (status === "SUBSCRIBED") track(); });
  }
  function disconnect() {
    tracked = false;
    for (const ch of [own, onl]) if (ch) { try { RT.remove(ch); } catch (e) {} }
    own = onl = null;
    if (online.size) { online = new Set(); emit(); }
  }

  // Tab weg: na 15 s niet meer "online", na 60 s de verbinding dicht. Terug in beeld: meteen weer verbinden en online.
  document.addEventListener("visibilitychange", () => {
    clearTimeout(tUntrack); clearTimeout(tClose);
    if (!uid) return;
    if (visible()) { if (own) track(); else connect(); return; }
    tUntrack = setTimeout(untrack, HIDE_UNTRACK_MS);
    tClose = setTimeout(disconnect, HIDE_CLOSE_MS);
  });

  window.Live = {
    // game.js (liveSync) bij elke auth-wissel: zelfde speler = niets, andere of uitgelogd = opnieuw.
    setUser(next) {
      next = next || null;
      if (next === uid) return;
      disconnect();
      uid = next; myK = uid ? md5(uid) : null;
      if (uid && visible()) connect();
    },
    isOn: (k) => !!k && online.has(k),
    online: () => new Set(online),
    _: { md5 },   // voor de tests
  };
})();
