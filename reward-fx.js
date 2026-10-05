// Beloning-vieringen (RewardFx): de canvas-lagen van de Scheurkalender (een gekozen viering voor daily-winsten,
// verdiend met 120 dailies) en de Wimpels (de winst die een perfecte week compleet maakt), plus de canvas-confetti
// die in dat tweede geval de CSS-confetti vervangt (canvas náást CSS-animaties kost 10-15 fps, zie runFx).
// Apart bestand, net als HolidayFx: game.js draagt er niets van mee en haalt het pas op als het nodig is (een
// gekozen kalender, of een winst die een perfecte week afmaakt) — op alle andere dagen wordt het nooit geladen.
// Gebruikt currentTheme() uit game.js. Elke laag: { end, draw(ctx, t, W, H) } op de runFx-lus; vormen als vector.
// De datums, weekdagletters en de emoji van de flair-confetti komen kant-en-klaar uit game.js (opts), zodat dit
// bestand niets van talen of tijdzones hoeft te weten.
window.RewardFx = (() => {
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };
  const easeOut = (u) => 1 - Math.pow(1 - clamp(u), 3);
  const easeIn = (u) => clamp(u) ** 2;
  const easeInOut = (u) => { u = clamp(u); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
  const bounceOut = (x) => {
    const n = 7.5625, d = 2.75; x = clamp(x);
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  };
  const FONT = "system-ui, sans-serif";
  const EMOJI_FONT = '"JaardleEmoji", -apple-system, system-ui, sans-serif';
  const dark = () => currentTheme() !== "light";

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // ── Scheurkalender ────────────────────────────────────────────────────────────
  // Na een daily-winst scheurt het blad van de puzzeldatum los en waait weg; eronder ligt het blad van de dag erna.
  // Bij een Voltreffer (first try) waait de hele week mee: zeven bladen na elkaar. De bladen dragen de datum van de
  // PUZZEL (labels uit game.js, in de taal van het spel en met timeZone "UTC"), niet de klok van het toestel.
  function calColors() {
    return dark()
      ? { board: "#3a3540", edge: "#2b272f", paper: "#f6f0e0", back: "#e6dec8", ink: "#2a2420", ink2: "#7a6f60", head: "#c8453b", hink: "#fff", shadow: "rgba(0,0,0,.55)", wind: "rgba(255,255,255,.32)", coil: "#b7b2c0" }
      : { board: "#d9cfba", edge: "#b9ad94", paper: "#fffdf6", back: "#f1ead9", ink: "#2a2420", ink2: "#7a6f60", head: "#b13f35", hink: "#fff", shadow: "rgba(70,50,15,.30)", wind: "rgba(60,45,15,.30)", coil: "#8d8577" };
  }
  function drawPage(ctx, x, y, w, h, lab, C, front) {
    ctx.save();
    ctx.fillStyle = front ? C.paper : C.back; ctx.shadowColor = C.shadow; ctx.shadowBlur = front ? 7 : 3; ctx.shadowOffsetY = 2;
    rr(ctx, x, y, w, h, 7); ctx.fill(); ctx.shadowColor = "transparent";
    if (front) {
      const hh = h * 0.2;
      ctx.save(); rr(ctx, x, y, w, h, 7); ctx.clip(); ctx.fillStyle = C.head; ctx.fillRect(x, y, w, hh); ctx.restore();
      ctx.fillStyle = "rgba(0,0,0,.28)";
      for (const k of [0.18, 0.82]) { ctx.beginPath(); ctx.arc(x + w * k, y + hh * 0.42, 3.1, 0, TAU); ctx.fill(); }
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = C.hink; ctx.font = `700 ${Math.round(h * 0.07)}px ${FONT}`; ctx.fillText(`${lab.mon} ${lab.y}`, x + w / 2, y + hh * 0.56);
      ctx.fillStyle = C.ink; ctx.font = `800 ${Math.round(h * 0.47)}px ${FONT}`; ctx.fillText(String(lab.d), x + w / 2, y + hh + (h - hh) * 0.47);
      ctx.fillStyle = C.ink2; ctx.font = `600 ${Math.round(h * 0.072)}px ${FONT}`; ctx.fillText(lab.wd, x + w / 2, y + h - h * 0.09);
    } else {
      // achterkant van het blad: een paar lijnen, geen tekst (die zou gespiegeld staan)
      ctx.strokeStyle = "rgba(0,0,0,.08)"; ctx.lineWidth = 1;
      for (let k = 1; k < 6; k++) { ctx.beginPath(); ctx.moveTo(x + 10, y + (h * k) / 6); ctx.lineTo(x + w - 10, y + (h * k) / 6); ctx.stroke(); }
    }
    ctx.restore();
  }
  // Eén blad: kruld een stukje omhoog, wordt door een windvlaag losgescheurd en zweeft kantelend naar rechts weg.
  function flight(ctx, t, i, g, C, first, label) {
    const { px, py, pw, ph, W, H } = g, T = 0.5 + (first ? i * 0.17 : 0), D = first ? 1.7 + 0.25 * ((i * 0.37) % 1) : 2.0, a = (t - T) / D;
    if (a >= 1) return;
    let rot = 0, cx = px + pw / 2, cy = py + ph / 2, sx = 1, sc = 1, al = 1;
    if (a > 0) {
      const curl = clamp(a / 0.2), fly = clamp((a - 0.12) / 0.88), ang = -0.3 * easeOut(curl), seed = (i * 0.61803) % 1;
      cx = px + (pw / 2) * Math.cos(ang) - (ph / 2) * Math.sin(ang); cy = py + (pw / 2) * Math.sin(ang) + (ph / 2) * Math.cos(ang); rot = ang;
      if (fly > 0) {
        const e = easeIn(fly) * 0.5 + fly * 0.5;
        cx += (W * 0.75 + pw * 0.6 + seed * W * 0.15) * e;   // de windvlaag draagt het blad naar rechts
        cy += H * (-0.05 * Math.sin(Math.min(1, fly * 1.7) * Math.PI) + 0.2 * Math.pow(fly, 1.5)) + Math.sin(fly * 9 + seed * 6) * H * 0.015 * fly;   // eerst op, dan zakkend als een blad
        rot += -(1.8 + seed * 1.2) * easeInOut(fly);
        sx = Math.cos(fly * (2.4 + seed * 1.2) * Math.PI); sc = 1 + 0.1 * fly;
      }
      al = a > 0.85 ? 1 - (a - 0.85) / 0.15 : 1;
    }
    ctx.save(); ctx.globalAlpha *= clamp(al); ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(Math.max(0.03, Math.abs(sx)) * sc, sc);
    drawPage(ctx, -pw / 2, -ph / 2, pw, ph, label, C, sx >= 0);
    ctx.restore();
  }
  function calendarLayers({ opts }) {
    const first = !!opts.first, labels = opts.labels, N = first ? 7 : 1, END = first ? 4.6 : 4.0;
    return [{ end: END, draw(ctx, t, W, H) {
      const C = calColors();
      const pw = Math.min(188, W * 0.54), ph = pw * 1.1, px = (W - pw) / 2, py = H * 0.12, g = { px, py, pw, ph, W, H };
      ctx.save(); ctx.globalAlpha = clamp(1 - smooth((t - (END - 0.55)) / 0.55));
      // plank + dikte van de stapel + spijker
      ctx.save(); ctx.shadowColor = C.shadow; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6; ctx.fillStyle = C.board; rr(ctx, px - 9, py - 15, pw + 18, ph + 38, 10); ctx.fill(); ctx.restore();
      ctx.fillStyle = C.edge; rr(ctx, px + 4, py + ph + 1, pw - 8, 5, 2); ctx.fill(); rr(ctx, px + 8, py + ph + 7, pw - 16, 4, 2); ctx.fill();
      ctx.strokeStyle = C.coil; ctx.lineWidth = 2.4;
      for (const k of [0.18, 0.82]) { ctx.beginPath(); ctx.ellipse(px + pw * k, py - 2, 4.6, 7, 0, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = C.coil; ctx.beginPath(); ctx.arc(px + pw / 2, py - 9, 2.6, 0, TAU); ctx.fill();
      // het blad van de dag erna (onderaan), dan de stapel: wat het eerst weggaat ligt bovenop
      drawPage(ctx, px, py, pw, ph, labels[N], C, true);
      for (let i = N - 1; i >= 0; i--) flight(ctx, t, i, g, C, first, labels[i]);
      // de windvlagen
      const w0 = 0.45, w1 = first ? 3.1 : 2.3;
      if (t > w0 && t < w1 + 1) {
        ctx.save(); ctx.lineCap = "round"; ctx.strokeStyle = C.wind;
        for (let k = 0; k < (first ? 11 : 7); k++) {
          const T = w0 + ((k * 0.37) % 1) * (w1 - w0) * 0.8, u = (t - T) / 0.9; if (u < 0 || u > 1) continue;
          const y0 = H * (0.1 + ((k * 0.173) % 0.6)), head = lerp(-30, W + 30, easeOut(u)), len = 70 + ((k * 53) % 70);
          ctx.globalAlpha = Math.sin(u * Math.PI) * 0.9; ctx.lineWidth = 1.3 + (k % 3) * 0.5;
          ctx.beginPath(); ctx.moveTo(head - len, y0 + Math.sin(head * 0.03 + k) * 5);
          ctx.quadraticCurveTo(head - len * 0.5, y0 - 8 + Math.sin(k) * 6, head, y0 + Math.sin(k * 2) * 4); ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    } }];
  }

  // ── Wimpels ───────────────────────────────────────────────────────────────────
  // Een slinger van zeven wimpels valt boven in beeld, één per weekdag (de letters komen uit game.js), de zevende
  // in goud met een glans en een ring van sterretjes. Alleen de bovenste ~14% van het scherm: komt dus bóvenop elke
  // andere viering (het bier zit onderin, het vuurwerk daaronder) zonder ermee te botsen.
  const BUN_COL = ["#6ea8ff", "#4caf50", "#26a69a", "#ff9800", "#e53935", "#ab47bc"];
  function star4(ctx, x, y, r, rot = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.beginPath();
    for (let k = 0; k < 8; k++) { const rad = k % 2 ? r * 0.34 : r, a = (k * Math.PI) / 4; ctx.lineTo(Math.sin(a) * rad, -Math.cos(a) * rad); }
    ctx.closePath(); ctx.restore();
  }
  function buntingLayers({ opts }) {
    const letters = opts.letters, END = 4.4, n = 7, y0 = 26, sag = 34;
    return [{ end: END, draw(ctx, t, W) {
      const light = !dark();
      ctx.save(); ctx.globalAlpha = clamp(1 - smooth((t - (END - 0.6)) / 0.6));
      const P = (u) => ({ x: lerp(-12, W + 12, u), y: y0 + 4 * sag * u * (1 - u) });
      ctx.strokeStyle = light ? "#6d6555" : "rgba(235,230,245,.78)"; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-12, y0); ctx.quadraticCurveTo(W / 2, y0 + 2 * sag, W + 12, y0); ctx.stroke();
      const pw = Math.min(38, (W / n) * 0.86), ph = pw * 1.3;
      for (let i = 0; i < n; i++) {
        const u = 0.09 + i * (0.82 / (n - 1)), b = P(u), gold = i === 6, Ti = 0.25 + i * 0.15, a = t - Ti;
        if (a < 0) continue;
        const fall = -100 * (1 - bounceOut(clamp(a / 0.7))), sw = 0.5 * Math.exp(-2.6 * a) * Math.cos(10 * a) + 0.055 * Math.sin(2.1 * t + i * 1.1) * clamp(a);
        ctx.save(); ctx.translate(b.x, b.y + fall); ctx.rotate(sw);
        ctx.beginPath(); ctx.moveTo(-pw / 2, 0); ctx.lineTo(pw / 2, 0);
        ctx.quadraticCurveTo(pw * 0.2, ph * 0.55, 0, ph); ctx.quadraticCurveTo(-pw * 0.2, ph * 0.55, -pw / 2, 0); ctx.closePath();
        if (gold) { const gr = ctx.createLinearGradient(0, 0, 0, ph); gr.addColorStop(0, "#ffe27a"); gr.addColorStop(1, "#d39a14"); ctx.fillStyle = gr; } else ctx.fillStyle = BUN_COL[i];
        ctx.shadowColor = "rgba(0,0,0,.3)"; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2; ctx.fill(); ctx.shadowColor = "transparent";
        ctx.save(); ctx.clip(); ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(-pw / 2, 0, pw, 4);
        if (gold && a > 1.0) {   // een glans veegt over de gouden wimpel
          const s = clamp((a - 1.0) / 0.7); ctx.fillStyle = "rgba(255,255,255,.6)";
          ctx.save(); ctx.translate(lerp(-pw, pw, s), 0); ctx.rotate(0.5); ctx.fillRect(-4, -10, 8, ph + 30); ctx.restore();
        }
        ctx.restore();
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = gold ? "#4a3200" : "#fff";
        ctx.font = `800 ${Math.round(pw * 0.4)}px ${FONT}`; ctx.fillText(letters[i], 0, ph * 0.26);
        if (gold) { ctx.fillStyle = "#7a5200"; star4(ctx, 0, ph * 0.6, pw * 0.2); ctx.fill(); }
        ctx.restore();
        if (gold && a > 0.85 && a < 1.9) {   // ring + sterretjes rond de gouden wimpel
          const s = (a - 0.85) / 1.05;
          ctx.save(); ctx.globalAlpha *= clamp(1 - s); ctx.strokeStyle = "#ffd54d"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(b.x, b.y + ph * 0.5, 10 + s * 54, 0, TAU); ctx.stroke();
          for (let k = 0; k < 8; k++) {
            const ang = k * 0.785 + 0.3, d = 14 + s * 64; ctx.fillStyle = "#ffd54d";
            star4(ctx, b.x + Math.cos(ang) * d, b.y + ph * 0.5 + Math.sin(ang) * d, 5 * (1 - s * 0.6), s * 3); ctx.fill();
          }
          ctx.restore();
        }
      }
      ctx.restore();
    } }];
  }

  // ── Canvas-confetti ───────────────────────────────────────────────────────────
  // Dezelfde confetti als de CSS-versie (80 stukjes van 8×14 px, 2,5-4,5 s vallen, 720° draaien), maar op het canvas,
  // zodat de wimpels ervoor op dezelfde lus kunnen. Met `emoji` regent je flair (zilver-capstone), zoals in de CSS-versie.
  function confettiLayers({ opts }) {
    const colors = ["#4caf50", "#ab47bc", "#f4c430", "#ff9800", "#e53935", "#8b5a2b", "#6ea8ff"], emoji = opts.emoji || null;
    const pieces = Array.from({ length: 80 }, () => ({
      x: Math.random(), delay: Math.random() * 0.6, dur: 2.5 + Math.random() * 2, col: colors[(Math.random() * colors.length) | 0],
    }));
    return [{ end: 0.6 + 4.5, draw(ctx, t, W, H) {
      if (emoji) { ctx.font = `22px ${EMOJI_FONT}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; }
      for (const p of pieces) {
        const u = (t - p.delay) / p.dur; if (u <= 0 || u >= 1) continue;
        ctx.globalAlpha = u > 0.9 ? clamp((1 - u) / 0.1) : 1;
        ctx.save(); ctx.translate(p.x * W, -20 + 1.05 * H * u); ctx.rotate(u * 4 * Math.PI);
        if (emoji) ctx.fillText(emoji, 0, 0); else { ctx.fillStyle = p.col; ctx.fillRect(-4, -7, 8, 14); }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    } }];
  }

  const LAYERS = { calendar: calendarLayers, bunting: buntingLayers, confetti: confettiLayers };
  return {
    has: (id) => Object.prototype.hasOwnProperty.call(LAYERS, id),
    ids: Object.keys(LAYERS),
    build(id, W, H, opts) { return LAYERS[id]({ W, H, opts: opts || {} }); },
  };
})();
