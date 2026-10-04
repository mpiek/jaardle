// Gebeurtenis-vieringen (EventFx): een eigen animatie voor een bepaald FEIT, niet voor een datum.
// De daily-feiten komen elk 3 tot 10 keer terug in het schema, dus de koppeling loopt via de
// (bevroren) feit-hash van het antwoord: EVENT_FX in game.js. Zelfde opzet als holiday-fx.js:
// apart bestand dat alleen wordt geladen als het winnende feit een animatie heeft (op ruim 95%
// van de dagen nooit). Elke laag: draw(ctx, t, W, H) op de runFx-lus; vormen als vector, geen
// emoji, donker en licht. Gebruikt currentTheme() uit game.js. Mockups: 4/10/2026.
window.EventFx = (() => {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;
  const scaleOf = (W, H) => clamp(Math.min(W, H) / 400, 0.6, 1.5);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const easeOut = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const easeIn = (x) => { x = clamp(x, 0, 1); return x * x; };
  const easeInOut = (x) => { x = clamp(x, 0, 1); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
  const hexA = (col, a) => { const n = parseInt(col.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
  // in/uit-fade rond een laag: 0 → 1 in `a` s, en weer 0 in de laatste `b` s
  const fadeIO = (t, end, a = 0.4, b = 0.6) => clamp(t / a, 0, 1) * clamp((end - t) / b, 0, 1);
  function sparkle(ctx, r) { ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke(); }
  function rrect(ctx, x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  // Gloed-sprite (ronde radial gradient naar dezelfde tint met alfa 0), gecachet per kleur.
  const spriteCache = new Map();
  function glowSprite(col, soft = false) {
    const key = col + (soft ? "s" : "");
    if (spriteCache.has(key)) return spriteCache.get(key);
    const s = document.createElement("canvas"); s.width = s.height = 32;
    const g = s.getContext("2d"), rg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    rg.addColorStop(0, col); rg.addColorStop(soft ? 0.08 : 0.35, col); rg.addColorStop(1, hexA(col, 0));
    g.fillStyle = rg; g.fillRect(0, 0, 32, 32);
    spriteCache.set(key, s); return s;
  }
  const glow = (ctx, col, x, y, d, a, soft) => { ctx.globalAlpha = clamp(a, 0, 1); ctx.drawImage(glowSprite(col, soft), x - d / 2, y - d / 2, d, d); };
  // lineaire luchtweerstand + zwaartekracht (gesloten vorm), zie vuurwerk
  function kin(p, s) {
    const ek = Math.exp(-p.k * s), E = (1 - ek) / p.k, gk = p.g / p.k;
    return [p.x0 + p.vx * E, p.y0 + gk * s + (p.vy - gk) * E, p.vx * ek, gk + (p.vy - gk) * ek];
  }
  function mixHex(a, b, k) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  }

  // ── Berlijnse Muur (1987 "tear down this wall" · 1990 hereniging) ───────────
  // Vier kolommen betonpanelen met graffiti. Vanuit het midden kantelen ze één voor één
  // naar buiten weg en het ochtendlicht komt erdoor. Brokstukken vliegen, stof stijgt op.
  function wallLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), HS = H / 844, END = 4.6;
    const c = P.dark
      ? { slab: "#aeb5bc", slabLo: "#8f979e", cap: "#6c747b", edge: "rgba(0,0,0,.35)", paint: ["#ff5fa2", "#6ea8ff", "#f4c430", "#4caf50", "#ff9800", "#ab47bc"], dawn: "#ffc45c", dawnHi: "#ffe9a8", dust: "#c9ccd0" }
      : { slab: "#8d949b", slabLo: "#747b82", cap: "#4f565d", edge: "rgba(0,0,0,.4)", paint: ["#d81b60", "#1e63c4", "#c9962a", "#2e7d32", "#ef6c00", "#8e24aa"], dawn: "#f0952c", dawnHi: "#ffcf6e", dust: "#8d949b" };
    const cols = 4, rows = 5, pw = W / cols, ph = H * 0.115, y0 = H * 0.34, wallH = rows * ph;
    const panels = [];
    for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
      const cx = (k + 0.5) * pw, cy = y0 + (r + 0.5) * ph;
      const dist = Math.hypot((cx - W / 2) / (W / 2), ((cy - (y0 + wallH / 2)) / (wallH / 2)) * 0.6);
      const art = Array.from({ length: 3 }, () => ({ k: pick(["stripe", "dot", "tri", "zig"]), x: rnd(0.15, 0.85), y: rnd(0.25, 0.8), s: rnd(0.16, 0.3), col: pick(c.paint) }));
      const start = 1.2 + dist * 1.35 + rnd(0, 0.2);
      const chunks = Array.from({ length: 2 }, (_, j) => {
        const dir = cx < W / 2 ? -1 : 1, ang = rnd(0.2, 1.1);
        return { x0: cx, y0: cy, vx: dir * Math.cos(ang) * rnd(160, 330) * HS, vy: -Math.sin(ang) * rnd(160, 320) * HS, k: 0.7, g: 900 * HS, w: rnd(7, 14) * S, h: rnd(5, 10) * S, rot: rnd(0, TAU), vr: rnd(-8, 8), col: j ? c.slabLo : c.slab };
      });
      panels.push({ r, k, cx, cy, start, dir: cx < W / 2 ? -1 : 1, art, chunks });
    }
    const puffs = Array.from({ length: 10 }, () => ({ x: rnd(0.15, 0.85) * W, y: y0 + wallH * rnd(0.55, 0.95), birth: rnd(1.5, 2.9), life: rnd(1.4, 2), d: rnd(44, 80) * S }));
    const rays = Array.from({ length: 10 }, (_, i) => ({ a: -Math.PI + 0.25 + (i / 9) * (Math.PI - 0.5), w: rnd(0.05, 0.09), ph: rnd(0, TAU) }));
    function drawPanel(ctx, p, t, fade) {
      const rise = easeOut((t - 0.06 * p.r) / 0.5);
      if (rise <= 0) return;
      const s = t - p.start;
      let rot = 0, dy = 0, dx = 0, a = rise;
      if (s < 0 && s > -0.28) dx = Math.sin(t * 90) * 1.6 * S * (1 + s / 0.28);
      if (s > 0) {
        rot = p.dir * Math.min(1.9, 1.25 * s * s + 0.3 * s);
        dy = 650 * HS * Math.pow(Math.max(0, s - 0.7), 2);
        a *= 1 - clamp((s - 1.05) / 0.5, 0, 1);
      }
      if (a <= 0) return;
      const x = p.cx - pw / 2 + 0.5, y = p.cy - ph / 2 + 0.5 + (1 - rise) * 26 * S + dy, w = pw - 1, h = ph - 1;
      const px = p.dir > 0 ? x + w : x, py = y + h;
      ctx.save(); ctx.globalAlpha = a * fade; ctx.translate(px + dx, py); ctx.rotate(rot); ctx.translate(-px, -py);
      ctx.fillStyle = c.slab; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = c.slabLo; ctx.globalAlpha = a * fade * 0.55; ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
      ctx.globalAlpha = a * fade; ctx.fillStyle = c.cap; ctx.fillRect(x, y, w, 4 * S);
      if (p.r === 0) { rrect(ctx, x - 1, y - 7 * S, w + 2, 12 * S, 6 * S); ctx.fill(); ctx.fillStyle = c.slab; ctx.globalAlpha = a * fade * 0.35; rrect(ctx, x + 4, y - 5 * S, w - 8, 4 * S, 2 * S); ctx.fill(); ctx.globalAlpha = a * fade; }
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      ctx.globalAlpha = a * fade * 0.92;
      for (const g of p.art) {
        const gx = x + g.x * w, gy = y + g.y * h, gs = g.s * w;
        ctx.fillStyle = g.col; ctx.strokeStyle = g.col; ctx.lineWidth = 3.2 * S; ctx.lineCap = "round"; ctx.lineJoin = "round";
        if (g.k === "dot") { ctx.beginPath(); ctx.arc(gx, gy, gs * 0.55, 0, TAU); ctx.fill(); }
        else if (g.k === "tri") { ctx.beginPath(); ctx.moveTo(gx, gy - gs * 0.6); ctx.lineTo(gx + gs * 0.6, gy + gs * 0.5); ctx.lineTo(gx - gs * 0.6, gy + gs * 0.5); ctx.closePath(); ctx.fill(); }
        else if (g.k === "stripe") { ctx.beginPath(); ctx.moveTo(gx - gs, gy); ctx.quadraticCurveTo(gx, gy - gs * 0.7, gx + gs, gy); ctx.stroke(); }
        else { ctx.beginPath(); ctx.moveTo(gx - gs, gy); for (let i = 1; i <= 4; i++) ctx.lineTo(gx - gs + i * gs * 0.5, gy + (i % 2 ? -1 : 1) * gs * 0.35); ctx.stroke(); }
      }
      ctx.restore();
      ctx.globalAlpha = a * fade; ctx.strokeStyle = c.edge; ctx.lineWidth = 1; ctx.strokeRect(x, y, w, h);
      ctx.restore(); stats.drawn++;
    }
    return [{ end: END, draw(ctx, t, W2, H2) {
      const fade = clamp((END - t) / 0.7, 0, 1), q = easeInOut((t - 1.3) / 2.3), cy = y0 + wallH * 0.55;
      // ochtendlicht achter de muur
      if (q > 0) {
        ctx.globalCompositeOperation = P.comp;
        glow(ctx, c.dawn, W2 / 2, cy, W2 * (0.7 + 1.1 * q), (P.dark ? 0.6 : 0.4) * q * fade); stats.drawn++;
        glow(ctx, c.dawnHi, W2 / 2, cy, W2 * (0.25 + 0.5 * q), (P.dark ? 0.55 : 0.35) * q * fade); stats.drawn++;
        ctx.fillStyle = c.dawnHi;
        for (const r of rays) {
          ctx.globalAlpha = (P.dark ? 0.16 : 0.12) * q * fade * (0.6 + 0.4 * Math.sin(t * 1.3 + r.ph));
          ctx.beginPath(); ctx.moveTo(W2 / 2, cy); ctx.lineTo(W2 / 2 + Math.cos(r.a - r.w) * H2 * 1.1, cy + Math.sin(r.a - r.w) * H2 * 1.1); ctx.lineTo(W2 / 2 + Math.cos(r.a + r.w) * H2 * 1.1, cy + Math.sin(r.a + r.w) * H2 * 1.1); ctx.closePath(); ctx.fill(); stats.drawn++;
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      }
      for (const p of panels) drawPanel(ctx, p, t, fade);
      // een spleet licht vlak voor de eerste val
      const cr = clamp((t - 0.7) / 0.5, 0, 1) * clamp((1.9 - t) / 0.5, 0, 1);
      if (cr > 0) {
        ctx.globalCompositeOperation = P.comp; ctx.strokeStyle = c.dawnHi; ctx.lineCap = "round"; ctx.globalAlpha = cr * fade; ctx.lineWidth = 3.2 * S;
        ctx.beginPath(); ctx.moveTo(W2 / 2, y0 + wallH * 0.1); let yy = y0 + wallH * 0.1;
        for (let i = 1; i <= 8; i++) { yy = y0 + wallH * (0.1 + 0.8 * i / 8 * clamp((t - 0.7) / 0.5, 0, 1)); ctx.lineTo(W2 / 2 + (i % 2 ? -1 : 1) * 5 * S, yy); }
        ctx.stroke(); ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1; stats.drawn++;
      }
      // brokstukken
      for (const p of panels) for (const ch of p.chunks) {
        const s = t - p.start - 0.12; if (s < 0 || s > 1.5) continue;
        const q2 = kin(ch, s); if (q2[1] > H2 + 20) continue;
        ctx.globalAlpha = clamp(1.5 - s, 0, 1) * fade; ctx.save(); ctx.translate(q2[0], q2[1]); ctx.rotate(ch.rot + ch.vr * s);
        ctx.fillStyle = ch.col; ctx.fillRect(-ch.w / 2, -ch.h / 2, ch.w, ch.h); ctx.restore(); stats.drawn++;
      }
      // stof
      for (const f of puffs) {
        const s = t - f.birth; if (s < 0 || s > f.life) continue;
        const u = s / f.life; glow(ctx, c.dust, f.x, f.y - 40 * S * u, f.d * (0.6 + 0.9 * u), 0.4 * (1 - u) * fade, false); stats.drawn++;
      }
      ctx.globalAlpha = 1;
    } }];
  }

  // ── 95 stellingen (1517): hamer, vier spijkers, en dan vliegen de blaadjes ───
  function thesesLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), HS = H / 844, END = 4.8;
    const c = P.dark
      ? { wood: "#8a5d34", woodLo: "#6b4526", plank: "rgba(0,0,0,.38)", iron: "#2b2b2b", ironHi: "#7a7a7a", paper: "#efe0b4", ink: "#3a2a18", nail: "#e4e4e4", chip: "#c79a62", head: "#8e969e", headHi: "#c9d0d6", handle: "#a8763f" }
      : { wood: "#7a5530", woodLo: "#5a3b1f", plank: "rgba(0,0,0,.4)", iron: "#262626", ironHi: "#5a5a5a", paper: "#f0e0b0", ink: "#3a2a18", nail: "#3a3a3a", chip: "#7a5530", head: "#5f666d", headHi: "#9aa2a9", handle: "#8a5d2e" };
    const dw = W * 0.74, dx = (W - dw) / 2, ar = dw / 2, dTop = H * 0.12, dBot = H * 0.62, dH = dBot - dTop;
    const sw = dw * 0.6, sh = Math.min(sw * 1.18, dH * 0.58), scx = W / 2, scy = dTop + dH * 0.55;
    const nails = [[-0.4, -0.42], [0.4, -0.42], [0.4, 0.42], [-0.4, 0.42]].map(([a, b]) => [scx + a * sw, scy + b * sh]);
    const HIT = [1.3, 1.8, 2.25, 2.65], BURST = 2.78;
    const lines = Array.from({ length: 9 }, (_, i) => ({ y: -0.2 + i * 0.1, w: rnd(0.55, 0.85) }));
    const chips = nails.flatMap(([nx, ny], i) => Array.from({ length: 4 }, () => { const a = rnd(0, TAU), v = rnd(60, 150) * HS; return { x0: nx, y0: ny, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60 * HS, k: 1.4, g: 700 * HS, s: rnd(1.4, 2.6) * S, t0: HIT[i] }; }));
    const slips = Array.from({ length: 34 }, () => { const a = rnd(0, TAU), v = rnd(180, 520) * HS; return { x0: scx, y0: scy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 160 * HS, k: 1.1, g: 520 * HS, rot: rnd(0, TAU), vr: rnd(-6, 6), w: rnd(13, 19) * S, flip: rnd(2, 5), ph: rnd(0, TAU) }; });
    function doorPath(ctx) {
      ctx.beginPath(); ctx.moveTo(dx, dBot); ctx.lineTo(dx, dTop + ar); ctx.arc(W / 2, dTop + ar, ar, Math.PI, 0); ctx.lineTo(dx + dw, dBot); ctx.closePath();
    }
    function hammer(ctx, a) {         // a: 0 = op de spijker, 1 = opgeheven; kop boven het nulpunt, steel schuin omhoog
      ctx.save(); ctx.translate(0, -40 * S * a); ctx.rotate(-0.55 * a); ctx.scale(1.55, 1.55);
      ctx.strokeStyle = c.handle; ctx.lineWidth = 6 * S; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(0, -14 * S); ctx.lineTo(54 * S, -64 * S); ctx.stroke();
      ctx.fillStyle = c.head; ctx.fillRect(-14 * S, -22 * S, 28 * S, 15 * S);
      ctx.fillStyle = c.headHi; ctx.fillRect(-14 * S, -22 * S, 28 * S, 4 * S);
      ctx.restore();
    }
    return [{ end: END, draw(ctx, t, W2, H2) {
      const fade = fadeIO(t, END, 0.01, 0.6), din = easeOut(t / 0.55);
      ctx.save(); ctx.globalAlpha = din * fade; ctx.translate(W2 / 2, dBot); ctx.scale(0.92 + 0.08 * din, 0.92 + 0.08 * din); ctx.translate(-W2 / 2, -dBot);
      doorPath(ctx); ctx.fillStyle = c.wood; ctx.fill();
      ctx.save(); doorPath(ctx); ctx.clip();
      ctx.fillStyle = c.woodLo; for (let i = 0; i < 6; i += 2) ctx.fillRect(dx + (i / 6) * dw, dTop, dw / 6, dH);
      ctx.strokeStyle = c.plank; ctx.lineWidth = 1.6 * S; ctx.beginPath(); for (let i = 1; i < 6; i++) { ctx.moveTo(dx + (i / 6) * dw, dTop); ctx.lineTo(dx + (i / 6) * dw, dBot); } ctx.stroke();
      for (const yf of [0.3, 0.8]) { const yy = dTop + dH * yf; ctx.fillStyle = c.iron; ctx.fillRect(dx, yy - 7 * S, dw, 14 * S); ctx.fillStyle = c.ironHi; for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(dx + dw * (0.08 + i * 0.14), yy, 2 * S, 0, TAU); ctx.fill(); } }
      ctx.restore();
      doorPath(ctx); ctx.strokeStyle = c.iron; ctx.lineWidth = 3 * S; ctx.stroke(); ctx.restore(); stats.drawn += 6;
      // het blad
      const nDone = HIT.filter((h) => t >= h).length, arr = easeOut((t - 0.45) / 0.5);
      if (arr > 0) {
        const wob = (1 - nDone / 4) * 0.05 * Math.sin(t * 5), shake = (nDone ? Math.max(0, 1 - (t - HIT[nDone - 1]) / 0.12) : 0) * 1.6 * S;
        ctx.save(); ctx.globalAlpha = arr * fade; ctx.translate(scx, scy + shake); ctx.rotate(wob); const sc = 1.45 - 0.45 * arr; ctx.scale(sc, sc);
        ctx.fillStyle = "rgba(0,0,0,.28)"; ctx.fillRect(-sw / 2 + 3 * S, -sh / 2 + 4 * S, sw, sh);
        ctx.fillStyle = c.paper; ctx.fillRect(-sw / 2, -sh / 2, sw, sh);
        ctx.fillStyle = c.ink; ctx.font = `700 ${Math.round(sh * 0.2)}px Georgia, "Times New Roman", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("95", 0, -sh * 0.33);
        ctx.strokeStyle = c.ink; ctx.globalAlpha = arr * fade * 0.55; ctx.lineWidth = 1.5 * S; ctx.beginPath();
        for (const l of lines) { ctx.moveTo(-sw * 0.38, sh * l.y); ctx.lineTo(-sw * 0.38 + sw * 0.76 * l.w, sh * l.y); }
        ctx.stroke(); ctx.restore(); stats.drawn += 4;
      }
      // spijkers
      for (let i = 0; i < 4; i++) {
        const [nx, ny] = nails[i], done = t >= HIT[i];
        if (arr <= 0) break;
        ctx.globalAlpha = arr * fade; ctx.fillStyle = c.nail;
        if (!done) { ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.beginPath(); ctx.arc(nx + 2 * S, ny + 3 * S, 4.5 * S, 0, TAU); ctx.fill(); ctx.fillStyle = c.nail; }
        ctx.beginPath(); ctx.arc(nx, ny, (done ? 3.2 : 4.5) * S, 0, TAU); ctx.fill(); stats.drawn++;
      }
      // de hamer tikt de vier spijkers in
      const tH0 = 0.9, tH1 = HIT[3] + 0.55;
      if (t > tH0 && t < tH1) {
        let hx, hy, a;
        const idx = HIT.findIndex((h) => t < h + 0.2);
        if (idx < 0) { hx = nails[3][0]; hy = nails[3][1]; a = 0.3 + 0.7 * easeIn((t - HIT[3] - 0.2) / 0.3); hx += 40 * S * (a - 0.3); hy -= 40 * S * (a - 0.3); }
        else {
          const prev = idx === 0 ? [nails[0][0] + 90 * S, nails[0][1] - 150 * S] : nails[idx - 1], cur = nails[idx], th = HIT[idx];
          const tMoveA = idx === 0 ? tH0 : HIT[idx - 1] + 0.18, tMoveB = th - 0.3, m = easeInOut((t - tMoveA) / Math.max(0.05, tMoveB - tMoveA));
          hx = prev[0] + (cur[0] - prev[0]) * m; hy = prev[1] + (cur[1] - prev[1]) * m;
          const s = t - th;
          if (s < -0.3) a = 1; else if (s < -0.12) a = 1; else if (s < 0) a = 1 - easeIn((s + 0.12) / 0.12); else a = 0.35 * easeOut(s / 0.18);
          if (idx === 0 && t < tMoveB) a = 1;
        }
        ctx.save(); ctx.globalAlpha = fade * clamp((t - tH0) / 0.25, 0, 1); ctx.translate(hx, hy); hammer(ctx, clamp(a, 0, 1)); ctx.restore(); stats.drawn += 3;
      }
      // inslag: ring + splinters
      for (let i = 0; i < 4; i++) {
        const s = t - HIT[i]; if (s < 0 || s > 0.4) continue; const u = s / 0.4;
        ctx.globalAlpha = (1 - u) * 0.8 * fade; ctx.strokeStyle = c.paper; ctx.lineWidth = 2 * S; ctx.beginPath(); ctx.arc(nails[i][0], nails[i][1], (4 + 20 * u) * S, 0, TAU); ctx.stroke(); stats.drawn++;
      }
      for (const ch of chips) {
        const s = t - ch.t0; if (s < 0 || s > 0.9) continue; const q = kin(ch, s);
        ctx.globalAlpha = clamp(1 - s / 0.9, 0, 1) * fade; ctx.fillStyle = c.chip; ctx.fillRect(q[0], q[1], ch.s, ch.s); stats.drawn++;
      }
      // na de vierde slag: de stellingen waaien uit
      for (const sl of slips) {
        const s = t - BURST; if (s < 0 || s > 2.1) continue; const q = kin(sl, s); if (q[1] > H2 + 24) continue;
        const fl = Math.abs(Math.cos(sl.ph + s * sl.flip)), a = clamp(2.1 - s, 0, 1) * clamp(s / 0.06, 0, 1) * fade;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(q[0], q[1]); ctx.rotate(sl.rot + sl.vr * s * 0.5);
        ctx.fillStyle = c.paper; ctx.fillRect(-sl.w / 2, -sl.w * 0.32 * (0.25 + 0.75 * fl), sl.w, sl.w * 0.64 * (0.25 + 0.75 * fl));
        ctx.strokeStyle = c.ink; ctx.globalAlpha = a * 0.5; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-sl.w * 0.35, 0); ctx.lineTo(sl.w * 0.35, 0); ctx.stroke(); ctx.restore(); stats.drawn++;
      }
      ctx.globalAlpha = 1;
    } }];
  }

  // ── Vesuvius (79): de uitbarsting, met de “pijnboom” van Plinius ────────────
  function vesuviusLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), HS = H / 844, END = 4.8;
    const c = P.dark
      ? { rock: "#4a3a35", rim: "#8a6e64", glow: "#ff8a2a", flash: "#fff1b8", ember: ["#fff1b8", "#ffd76a", "#ff9d2e", "#ff5a14"], plume: "#aa9f98", plumeLow: "#715f57", ash: "#c0b7b0", lava: "#ff7a1a", lavaCore: "#ffe29a" }
      : { rock: "#4a3a35", rim: "#2d2320", glow: "#e65a00", flash: "#ffb347", ember: ["#ffb347", "#ff8a1f", "#e04a00", "#9c2a00"], plume: "#6d625c", plumeLow: "#3d322d", ash: "#5b524c", lava: "#e04a00", lavaCore: "#ffc34d" };
    const ax = W * 0.55, ay = H * 0.6, cw = W * 0.08;
    const T0 = 0.7;
    const embers = Array.from({ length: 92 }, (_, i) => { const a = rnd(-0.6, 0.6), v = rnd(380, 820) * HS; return { x0: ax + rnd(-cw, cw) * 0.7, y0: ay, vx: Math.sin(a) * v, vy: -Math.cos(a) * v, k: 0.9, g: 640 * HS, birth: T0 + 0.05 + Math.pow(i / 92, 1.25) * 2.7, life: rnd(1.5, 2.4), r: rnd(2, 4) * S }; });
    const puffs = Array.from({ length: 32 }, (_, i) => ({ birth: T0 + 0.15 + i * 0.08, dir: i % 2 ? 1 : -1, spread: rnd(0.5, 1), wob: rnd(0, TAU) }));
    const ash = Array.from({ length: 46 }, () => ({ x: rnd(0, 1), delay: rnd(1.3, 3.2), vy: rnd(60, 130) * HS, sway: rnd(6, 16) * S, ph: rnd(0, TAU), s: rnd(1.6, 3) * S }));
    const streaks = [[-0.5, 0.36, 0.84], [0.5, 0.78, 0.9], [0, 0.56, 0.95]].map(([o, tx, ty]) => ({ x0: ax + o * cw, tx: W * tx, ty: H * ty, ph: rnd(0, TAU) }));
    function cone(ctx) {
      ctx.beginPath(); ctx.moveTo(-10, H + 10); ctx.lineTo(-10, H * 0.9); ctx.lineTo(W * 0.14, H * 0.8); ctx.lineTo(W * 0.24, H * 0.745); ctx.lineTo(W * 0.33, H * 0.805);
      ctx.quadraticCurveTo(W * 0.42, H * 0.76, ax - cw, ay + 2); ctx.lineTo(ax - cw * 0.55, ay - 6 * S); ctx.lineTo(ax + cw * 0.55, ay - 6 * S); ctx.lineTo(ax + cw, ay + 2);
      ctx.quadraticCurveTo(W * 0.82, H * 0.78, W + 10, H * 0.92); ctx.lineTo(W + 10, H + 10); ctx.closePath();
    }
    return [{ end: END, draw(ctx, t, W2, H2) {
      const fade = fadeIO(t, END, 0.01, 0.8), rise = easeOut(t / 0.7), pulse = 0.75 + 0.25 * Math.sin(t * 7);
      // schijnsel van onder (alleen na de uitbarsting)
      const ig = clamp((t - T0) / 0.5, 0, 1);
      ctx.globalCompositeOperation = P.comp;
      if (ig > 0) { glow(ctx, c.glow, ax, ay - 20 * S, W2 * (0.9 + 0.2 * pulse), (P.dark ? 0.5 : 0.32) * ig * fade); stats.drawn++; }
      const fl = clamp((t - T0) / 0.12, 0, 1) * clamp((T0 + 0.6 - t) / 0.45, 0, 1);
      if (fl > 0) { glow(ctx, c.flash, ax, ay, W2 * (0.25 + 0.7 * (1 - fl)), fl * 0.8 * fade); stats.drawn++; }
      ctx.globalCompositeOperation = "source-over";
      // berg
      ctx.save(); ctx.translate(0, (1 - rise) * 50 * S); cone(ctx); ctx.globalAlpha = rise * fade; ctx.fillStyle = c.rock; ctx.fill();
      ctx.strokeStyle = c.rim; ctx.lineWidth = 2 * S; ctx.stroke();
      // lava stroomt omlaag
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const s of streaks) {
        const g = clamp((t - T0 - 0.25) / 1.9, 0, 1); if (g <= 0) continue;
        ctx.beginPath(); ctx.moveTo(s.x0, ay);
        const n = 12; for (let i = 1; i <= n * g; i++) { const u = i / n; ctx.lineTo(s.x0 + (s.tx - s.x0) * u + Math.sin(s.ph + u * 9) * 5 * S, ay + (s.ty - ay) * Math.pow(u, 0.9)); }
        ctx.strokeStyle = c.lava; ctx.globalAlpha = fade * (0.7 + 0.3 * pulse); ctx.lineWidth = 4 * S; ctx.stroke();
        ctx.strokeStyle = c.lavaCore; ctx.globalAlpha = fade * 0.8; ctx.lineWidth = 1.4 * S; ctx.stroke(); stats.drawn += 2;
      }
      ctx.restore();
      // pluim: eerst omhoog, dan de paraplu
      for (const pf of puffs) {
        const s = t - pf.birth; if (s < 0) continue;
        const rise2 = 0.36 * H2 * (1 - Math.exp(-s * 0.85)), y = ay - 6 * S - rise2, sp = clamp((s - 0.9) / 2.2, 0, 1) * easeInOut(clamp((rise2 / (0.3 * H2)), 0, 1));
        const x = ax + Math.sin(pf.wob + s * 1.4) * 5 * S + pf.dir * pf.spread * (170 * S) * sp, r = (22 + 46 * easeOut(s / 2.2)) * S;
        const a = clamp(s / 0.3, 0, 1) * (0.8 - 0.25 * clamp(s / 3, 0, 1)) * fade;
        glow(ctx, s < 0.9 ? c.plumeLow : c.plume, x, y, r * 2.4, a, false); stats.drawn++;
      }
      ctx.globalAlpha = 1;
      // vonken en gloeiende brokken
      ctx.globalCompositeOperation = P.comp;
      for (const em of embers) {
        const s = t - em.birth; if (s < 0 || s > em.life) continue; const q = kin(em, s), u = s / em.life; if (q[1] > H2 + 10) continue;
        const col = c.ember[Math.min(3, (u * 4) | 0)];
        glow(ctx, col, q[0], q[1], em.r * (P.dark ? 6 : 4.2), (1 - u * 0.7) * fade, false); stats.drawn++;
      }
      ctx.globalCompositeOperation = "source-over";
      // aswolkjes die neerdwarrelen
      ctx.fillStyle = c.ash;
      for (const a of ash) {
        const s = t - a.delay; if (s < 0) continue; const y = 0.08 * H2 + a.vy * s; if (y > H2) continue;
        ctx.globalAlpha = clamp(s / 0.4, 0, 1) * 0.7 * fade; ctx.fillRect(a.x * W2 + Math.sin(a.ph + s * 1.5) * a.sway, y, a.s, a.s); stats.drawn++;
      }
      ctx.globalAlpha = 1;
    } }];
  }

  // ── Gloeilamp (1879): een slinger lampjes gaat één voor één aan ─────────────
  function edisonLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), END = 4.8;
    const c = P.dark
      ? { wire: "#9a8f80", glass: "255,255,255", glassLine: "rgba(255,255,255,.55)", base: "#b9aa8e", baseDark: "#7c6f58", cold: "#7a6a58", hot: "#ffb340", halo: "#ffcf5a", ray: "#ffe29a", mote: ["#ffe29a", "#ffcf5a", "#fff6dc"] }
      : { wire: "#4a4036", glass: "120,90,40", glassLine: "rgba(60,50,40,.65)", base: "#5b5043", baseDark: "#3a322a", cold: "#8a7a68", hot: "#e08a00", halo: "#ff9d1a", ray: "#d97a00", mote: ["#d97a00", "#e0a020", "#b8860b"] };
    const wireY = (x) => H * 0.09 + H * 0.05 * (1 - Math.pow(2 * x / W - 1, 2));
    const bulbs = [{ u: 0.5, r: 32 * S, drop: H * 0.12, t0: 0.7, hero: true }].concat([0.09, 0.23, 0.37, 0.63, 0.77, 0.91].map((u) => ({ u, r: 13 * S, drop: 18 * S, t0: 1.3 + Math.abs(u - 0.5) * 5, hero: false })));
    const motes = Array.from({ length: 26 }, () => ({ birth: rnd(1.3, 3.6), x: W * rnd(0.3, 0.7), y: H * rnd(0.14, 0.26), vy: rnd(24, 52) * S, ph: rnd(0, TAU), s: rnd(1.6, 2.8) * S, col: pick(c.mote) }));
    function litOf(b, t) {
      const s = t - b.t0; if (s < 0) return 0;
      const ramp = clamp(s / 0.9, 0, 1);
      return ramp * (s < 0.8 ? 0.55 + 0.45 * Math.sin(s * 45) : 1);
    }
    function bulb(ctx, r, lit) {
      // glas + hals
      ctx.fillStyle = `rgba(${c.glass},${0.1 + 0.2 * lit})`; ctx.strokeStyle = c.glassLine; ctx.lineWidth = Math.max(1, r * 0.07);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-r * 0.46, r * 0.84); ctx.lineTo(-r * 0.4, r * 1.38); ctx.lineTo(r * 0.4, r * 1.38); ctx.lineTo(r * 0.46, r * 0.84); ctx.fill(); ctx.stroke();
      // schroefvoet
      ctx.fillStyle = c.base; ctx.fillRect(-r * 0.42, r * 1.38, r * 0.84, r * 0.55);
      ctx.strokeStyle = c.baseDark; ctx.lineWidth = Math.max(1, r * 0.08); ctx.beginPath(); for (let i = 1; i < 3; i++) { ctx.moveTo(-r * 0.42, r * (1.38 + i * 0.18)); ctx.lineTo(r * 0.42, r * (1.38 + i * 0.18)); } ctx.stroke();
      ctx.fillStyle = c.baseDark; ctx.beginPath(); ctx.arc(0, r * 1.96, r * 0.16, 0, TAU); ctx.fill();
      // filament: de verkoolde hoefijzer-lus
      ctx.strokeStyle = lit > 0.04 ? mixHex(c.cold, c.hot, clamp(lit, 0, 1)) : c.cold; ctx.lineWidth = Math.max(1.2, r * 0.1); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-r * 0.2, r * 0.95); ctx.lineTo(-r * 0.2, -r * 0.05); ctx.arc(0, -r * 0.05, r * 0.2, Math.PI, 0); ctx.lineTo(r * 0.2, r * 0.95); ctx.stroke();
    }
    return [{ end: END, draw(ctx, t, W2, H2) {
      const fade = fadeIO(t, END, 0.4, 0.7), cable = clamp(t / 0.5, 0, 1);
      ctx.globalAlpha = fade * cable; ctx.strokeStyle = c.wire; ctx.lineWidth = 2 * S; ctx.lineCap = "round"; ctx.beginPath();
      for (let x = -4; x <= W2 + 4; x += 10) ctx.lineTo(x, wireY(x) - (1 - cable) * 40 * S); ctx.stroke(); stats.drawn++;
      for (const b of bulbs) {
        const x = b.u * W2, wy = wireY(x) - (1 - cable) * 40 * S, by = wy + b.drop, lit = litOf(b, t);
        ctx.globalAlpha = fade * cable; ctx.strokeStyle = c.wire; ctx.lineWidth = (b.hero ? 2.4 : 1.6) * S; ctx.beginPath(); ctx.moveTo(x, wy); ctx.lineTo(x, by); ctx.stroke();
        const sw = Math.sin(t * 1.8 + b.u * 9) * 0.035 * (b.hero ? 1 : 1.4);
        // de lamp hangt aan zijn schroefvoet: omgekeerd getekend, glas onder, zwaait een beetje
        ctx.save(); ctx.translate(x, by + b.r * 1.96); ctx.rotate(Math.PI + sw); ctx.globalAlpha = fade * cable; bulb(ctx, b.r, lit); ctx.restore(); stats.drawn += 4;
        if (lit > 0.02) {
          const cx = x, cy = by + b.r * 1.96 + b.r * 0.05;
          ctx.globalCompositeOperation = P.comp;
          glow(ctx, c.halo, cx, cy, b.r * (b.hero ? 13 : 8) * (0.7 + 0.3 * lit), (P.dark ? 0.6 : 0.36) * lit * fade, false); stats.drawn++;
          if (b.hero) { glow(ctx, c.halo, cx, cy, W2 * 1.5 * (0.5 + 0.5 * lit), (P.dark ? 0.18 : 0.1) * lit * fade, false); stats.drawn++; }
          ctx.strokeStyle = c.ray; ctx.lineWidth = Math.max(1.2, b.r * 0.085); ctx.lineCap = "round"; ctx.globalAlpha = 0.75 * lit * fade;
          ctx.beginPath(); for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU + 0.26, r0 = b.r * 1.28, r1 = b.r * (1.28 + 0.42 * lit * (0.8 + 0.2 * Math.sin(t * 6 + i))); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); } ctx.stroke(); stats.drawn++;
          ctx.globalCompositeOperation = "source-over";
        }
      }
      for (const m of motes) {
        const s = t - m.birth; if (s < 0 || s > 2.4) continue;
        ctx.globalCompositeOperation = P.comp; ctx.globalAlpha = Math.sin((s / 2.4) * Math.PI) * 0.8 * fade; ctx.fillStyle = m.col;
        ctx.beginPath(); ctx.arc(m.x + Math.sin(m.ph + s * 1.6) * 10 * S, m.y + m.vy * s * 0.6, m.s, 0, TAU); ctx.fill(); stats.drawn++;
      }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    } }];
  }

  // ── Stoomtrein (1825 Stockton & Darlington · 1869 gouden spijker) ───────────
  // Een stoomlocomotief met tender en wagen rijdt over de onderrand van links naar rechts,
  // de wielen draaien, de drijfstang zwaait, stoompluimen blijven achter.
  function steamTrainLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), END = 4.7, sc = S * 2.1;
    const c = P.dark
      ? { body: "#3d8f55", bodyDark: "#2c6b3f", brass: "#f0c050", black: "#2f2f2f", rim: "rgba(255,255,255,.38)", wheel: "#d9473a", spoke: "#7a1f18", cab: "#d8c9a8", rail: "#aab3bb", sleeper: "#7a5430", steam: "#f2f2f2", coal: "#161616", wagon: "#9a6a3a", wagonDark: "#6b4526", win: "#12161a" }
      : { body: "#1f6b3c", bodyDark: "#164d2b", brass: "#b8860b", black: "#1f1f1f", rim: "rgba(0,0,0,.35)", wheel: "#b3261e", spoke: "#5e100b", cab: "#c9b88a", rail: "#4f565d", sleeper: "#6b4526", steam: "#9aa3ab", coal: "#101010", wagon: "#8a5d34", wagonDark: "#5a3b1f", win: "#12161a" };
    const railY = H * 0.8, x0 = -48 * sc, x1 = W + 112 * sc, T0 = 0.15, T1 = 4.4;
    const trainX = (t) => { const u = clamp((t - T0) / (T1 - T0), 0, 1); return x0 + (x1 - x0) * (0.7 * u + 0.3 * easeInOut(u)); };
    const puffs = []; for (let b = 0.3; b < T1 - 0.2; b += 0.095) puffs.push({ birth: b, x: trainX(b) + 22 * sc, wob: rnd(0, TAU), d: rnd(0.8, 1.25) });
    function wheel(ctx, R, phi) {
      ctx.fillStyle = c.wheel; ctx.strokeStyle = c.black; ctx.lineWidth = Math.max(1, R * 0.16); ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = c.spoke; ctx.lineWidth = Math.max(1, R * 0.12); ctx.beginPath();
      for (let i = 0; i < 6; i++) { const a = phi + i * Math.PI / 3; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * R * 0.88, Math.sin(a) * R * 0.88); } ctx.stroke();
      ctx.fillStyle = c.black; ctx.beginPath(); ctx.arc(0, 0, R * 0.2, 0, TAU); ctx.fill();
    }
    function train(ctx, phi) {
      const wheels = [[-18, 9, -9], [-2, 9, -9], [14, 9, -9], [-56, 8, -8], [-41, 8, -8], [-98, 8, -8], [-78, 8, -8]];
      // wagen
      ctx.fillStyle = c.wagonDark; ctx.fillRect(-106, -23, 34, 12); ctx.fillStyle = c.wagon; ctx.fillRect(-106, -23, 34, 8);
      ctx.strokeStyle = c.wagonDark; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 1; i < 4; i++) { ctx.moveTo(-106 + i * 8.5, -23); ctx.lineTo(-106 + i * 8.5, -15); } ctx.stroke();
      ctx.fillStyle = c.black; ctx.fillRect(-72, -14, 12, 1.6); ctx.fillRect(-64, -14, 4, 1.6);
      // tender
      ctx.fillStyle = c.bodyDark; ctx.fillRect(-62, -26, 26, 13); ctx.fillStyle = c.coal; ctx.beginPath(); ctx.ellipse(-49, -26, 12, 5.5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = c.black; ctx.fillRect(-36, -14, 3, 1.8);
      // frame, ketel, rookkamer
      ctx.fillStyle = c.black; ctx.fillRect(-34, -17, 62, 4);
      ctx.fillStyle = c.body; rrect(ctx, -16, -34, 42, 18, 6); ctx.fill();
      ctx.fillStyle = c.bodyDark; ctx.fillRect(-14, -21, 38, 4);
      ctx.fillStyle = c.brass; for (const bx of [-4, 8, 19]) ctx.fillRect(bx, -34, 2.2, 18);
      ctx.fillStyle = c.black; ctx.fillRect(22, -34, 6, 18);
      // schoorsteen met kap, dom
      ctx.beginPath(); ctx.moveTo(20, -34); ctx.lineTo(20, -46); ctx.lineTo(16, -50); ctx.lineTo(16, -54); ctx.lineTo(28, -54); ctx.lineTo(28, -50); ctx.lineTo(24, -46); ctx.lineTo(24, -34); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c.brass; ctx.beginPath(); ctx.arc(2, -34, 5.5, Math.PI, 0); ctx.fill();
      // cabine
      ctx.fillStyle = c.cab; ctx.fillRect(-35, -44, 19, 30); ctx.fillStyle = c.black; ctx.fillRect(-38, -48, 25, 4);
      ctx.fillStyle = c.win; ctx.fillRect(-31, -40, 11, 11);
      // koeienvanger
      ctx.fillStyle = c.black; ctx.beginPath(); ctx.moveTo(28, -15); ctx.lineTo(40, -2); ctx.lineTo(28, -2); ctx.closePath(); ctx.fill();
      // wielen + drijfstang
      for (const [wx, R, wy] of wheels) { ctx.save(); ctx.translate(wx, wy); wheel(ctx, R, phi * (9 / R)); ctx.restore(); }
      const pin = (wx) => [wx + Math.cos(phi) * 5, -9 + Math.sin(phi) * 5];
      ctx.strokeStyle = c.black; ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.beginPath(); const a = pin(-18), b = pin(14); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.fillStyle = c.brass; for (const wx of [-18, -2, 14]) { const q = pin(wx); ctx.beginPath(); ctx.arc(q[0], q[1], 2, 0, TAU); ctx.fill(); }
    }
    return [{ end: END, draw(ctx, t, W2, H2) {
      const fade = fadeIO(t, END, 0.3, 0.5), rise = easeOut(t / 0.5);
      // rails + dwarsliggers
      ctx.globalAlpha = fade * rise; ctx.fillStyle = c.sleeper;
      for (let x = (t * 0) % (26 * S); x < W2; x += 26 * S) ctx.fillRect(x, railY + 3 * S, 15 * S, 5 * S);
      ctx.fillStyle = c.rail; ctx.fillRect(0, railY, W2, 3 * S); ctx.fillRect(0, railY + 8 * S, W2, 2 * S); stats.drawn += 3;
      // stoom
      for (const p of puffs) {
        const s = t - p.birth; if (s < 0 || s > 1.9) continue;
        const u = s / 1.9, x = p.x - 20 * S * s * p.d + Math.sin(p.wob + s * 3) * 4 * S, y = railY - 54 * sc - 78 * S * s * p.d;
        glow(ctx, c.steam, x, y, (14 + 52 * easeOut(u)) * S * 1.7, (P.dark ? 0.75 : 0.6) * (1 - u) * fade, false); stats.drawn++;
      }
      // trein
      const x = trainX(t), phi = x / (9 * sc);
      ctx.globalAlpha = fade; ctx.save(); ctx.translate(x, railY); ctx.scale(sc, sc);
      train(ctx, phi); ctx.restore(); stats.drawn += 40;
      ctx.globalAlpha = 1;
    } }];
  }

  // ── Curiosity op Mars (2012): parachute, skycrane, stof, rover ──────────────
  function curiosityLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), HS = H / 844, END = 5.0;
    const c = P.dark
      ? { ground: "#b5502e", ground2: "#8f3c20", rock: "#6d2f18", chute: "#e8641b", chuteW: "#fff4e6", line: "rgba(255,255,255,.55)", stage: "#d9d9d9", stageD: "#8d8d8d", flame: "#ffb300", flameC: "#fff3c4", rover: "#ececec", roverD: "#6b6b6b", tyre: "#2b2b2b", tyreRim: "#9a9a9a", dust: "#e08a5e", glint: "#ffffff" }
      : { ground: "#a8431f", ground2: "#7d2f14", rock: "#5a2410", chute: "#d9540f", chuteW: "#ffffff", line: "rgba(40,30,20,.6)", stage: "#7a828a", stageD: "#4a5057", flame: "#ff8f00", flameC: "#ffe9a8", rover: "#8c949c", roverD: "#4a5057", tyre: "#1f1f1f", tyreRim: "#6b6b6b", dust: "#a8431f", glint: "#c9962a" };
    const U = S * 1.7, gy = H * 0.89, cx = W * 0.5, T_REL = 1.7, T_LOW = 2.4, T_TOUCH = 3.4, T_CUT = 3.55;
    const rocks = Array.from({ length: 7 }, (_, i) => ({ x: (0.06 + i * 0.145 + rnd(-0.03, 0.03)) * W, r: rnd(4, 9) * S, dy: rnd(2, 12) * S }));
    const puffs = Array.from({ length: 18 }, (_, i) => ({ birth: i < 8 ? 2.55 + rnd(0, 0.8) : 3.3 + rnd(0, 0.35), dir: Math.random() < 0.5 ? -1 : 1, sp: rnd(60, 150) * S, d: rnd(50, 90) * S, life: rnd(1.3, 1.9) }));
    const stageY = (t) => {
      if (t < T_REL) return -0.34 * H + (0.3 * H + 0.34 * H) * easeOut(t / T_REL);
      if (t < T_CUT) return 0.3 * H + 0.28 * H * easeOut((t - T_REL) / 0.8);
      const s = t - T_CUT; return 0.58 * H - 0.95 * H * s * s * 0.9;
    };
    const stageX = (t) => cx + Math.sin(t * 2.6) * 8 * S * (t < T_REL ? 1 : 0.3) + (t > T_CUT ? (t - T_CUT) * (t - T_CUT) * 0.5 * W : 0);
    const roverBottom = (t) => {            // y van de wielbodem
      const sy = stageY(t);
      if (t < T_LOW) return sy + 54 * U;
      if (t < T_TOUCH) { const k = easeInOut((t - T_LOW) / (T_TOUCH - T_LOW)); return (sy + 54 * U) * (1 - k) + (gy - 1 * S) * k; }
      return gy - 1 * S;
    };
    function chute(ctx, w, h) {                  // dop met acht banen, apex boven de oorsprong
      const hw = w / 2;
      for (let k = 0; k < 8; k++) {
        const xa = -hw + (k / 8) * w, xb = -hw + ((k + 1) / 8) * w;
        ctx.fillStyle = k % 2 ? c.chuteW : c.chute; ctx.beginPath(); ctx.moveTo(0, -h);
        ctx.quadraticCurveTo(xa * 1.12, -h * 0.85, xa, 0); ctx.lineTo(xb, 0); ctx.quadraticCurveTo(xb * 1.12, -h * 0.85, 0, -h); ctx.fill();
      }
    }
    function descentStage(ctx, thrust, t) {
      const S = U;
      ctx.fillStyle = c.stageD; ctx.fillRect(-26 * S, -8 * S, 52 * S, 16 * S); ctx.fillStyle = c.stage; ctx.fillRect(-26 * S, -8 * S, 52 * S, 7 * S);
      for (const sx of [-22, 22]) { ctx.fillStyle = c.stageD; ctx.beginPath(); ctx.arc(sx * S, 4 * S, 6 * S, 0, TAU); ctx.fill(); }
      for (const nx of [-14, -5, 5, 14]) { ctx.fillStyle = c.stageD; ctx.beginPath(); ctx.moveTo((nx - 3) * S, 8 * S); ctx.lineTo((nx + 3) * S, 8 * S); ctx.lineTo((nx + 4) * S, 14 * S); ctx.lineTo((nx - 4) * S, 14 * S); ctx.closePath(); ctx.fill(); }
      if (thrust > 0.02) {
        for (const nx of [-14, -5, 5, 14]) {
          const L = (16 + 18 * (0.6 + 0.4 * Math.sin(t * 40 + nx))) * S * thrust;
          ctx.fillStyle = c.flame; ctx.beginPath(); ctx.moveTo((nx - 3.5) * S, 14 * S); ctx.lineTo((nx + 3.5) * S, 14 * S); ctx.lineTo(nx * S, 14 * S + L); ctx.closePath(); ctx.fill();
          ctx.fillStyle = c.flameC; ctx.beginPath(); ctx.moveTo((nx - 1.8) * S, 14 * S); ctx.lineTo((nx + 1.8) * S, 14 * S); ctx.lineTo(nx * S, 14 * S + L * 0.55); ctx.closePath(); ctx.fill();
        }
      }
    }
    function rover(ctx, mast) {                  // oorsprong = midden, onderkant van de wielen op y = 0
      const S = U;
      const R = 5.5 * S;
      ctx.strokeStyle = c.roverD; ctx.lineWidth = 2 * S; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(-15 * S, -R); ctx.lineTo(0, -R * 1.1); ctx.lineTo(15 * S, -R); ctx.stroke();
      for (const wx of [-16, 0, 16]) { ctx.fillStyle = c.tyre; ctx.beginPath(); ctx.arc(wx * S, -R, R, 0, TAU); ctx.fill(); ctx.fillStyle = c.tyreRim; ctx.beginPath(); ctx.arc(wx * S, -R, R * 0.4, 0, TAU); ctx.fill(); }
      ctx.fillStyle = c.roverD; ctx.fillRect(-24 * S, -2 * R - 14 * S, 48 * S, 14 * S); ctx.fillStyle = c.rover; ctx.fillRect(-24 * S, -2 * R - 14 * S, 48 * S, 8 * S);
      ctx.fillStyle = c.roverD; ctx.fillRect(-34 * S, -2 * R - 12 * S, 11 * S, 6 * S);        // RTG achterop
      ctx.strokeStyle = c.roverD; ctx.lineWidth = 2 * S; ctx.beginPath(); ctx.moveTo(14 * S, -2 * R - 14 * S); ctx.lineTo(14 * S, -2 * R - 30 * S); ctx.stroke();
      ctx.save(); ctx.translate(14 * S, -2 * R - 33 * S); ctx.rotate(mast); ctx.fillStyle = c.rover; ctx.fillRect(-6 * S, -4 * S, 12 * S, 8 * S); ctx.fillStyle = c.tyre; ctx.beginPath(); ctx.arc(-2 * S, 0, 1.6 * S, 0, TAU); ctx.arc(2 * S, 0, 1.6 * S, 0, TAU); ctx.fill(); ctx.restore();
      ctx.fillStyle = c.rover; ctx.beginPath(); ctx.ellipse(-8 * S, -2 * R - 18 * S, 5 * S, 2.4 * S, -0.5, 0, TAU); ctx.fill();   // schotel
    }
    return [{ end: END, draw(ctx, t, W2, H2) {
      const fade = fadeIO(t, END, 0.01, 0.7), up = (1 - easeOut(t / 0.8)) * 0.12 * H2;
      // marsbodem
      ctx.globalAlpha = fade; ctx.fillStyle = c.ground2; ctx.beginPath(); ctx.moveTo(-5, H2 + 5); ctx.lineTo(-5, gy - 16 * S + up); ctx.quadraticCurveTo(W2 * 0.3, gy - 30 * S + up, W2 * 0.62, gy - 14 * S + up); ctx.quadraticCurveTo(W2 * 0.85, gy - 4 * S + up, W2 + 5, gy - 18 * S + up); ctx.lineTo(W2 + 5, H2 + 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c.ground; ctx.beginPath(); ctx.moveTo(-5, H2 + 5); ctx.lineTo(-5, gy + 2 * S + up); ctx.quadraticCurveTo(W2 * 0.35, gy - 8 * S + up, W2 * 0.7, gy + 2 * S + up); ctx.quadraticCurveTo(W2 * 0.9, gy + 6 * S + up, W2 + 5, gy - 4 * S + up); ctx.lineTo(W2 + 5, H2 + 5); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c.rock; for (const r of rocks) { ctx.beginPath(); ctx.ellipse(r.x, gy + 8 * S + r.dy + up, r.r * 1.3, r.r * 0.8, 0, 0, TAU); ctx.fill(); } stats.drawn += 9;
      const sy = stageY(t), sx = stageX(t), thrust = t < 1.5 ? 0 : clamp((t - 1.5) / 0.35, 0, 1);
      // parachute + capsule
      if (t < T_REL + 0.9) {
        const rel = Math.max(0, t - T_REL), tw = t < T_REL ? Math.sin(t * 2.6) * 0.05 : 0;
        const cw = W2 * 0.46, ch = cw * 0.38, lineL = H2 * 0.14, px = sx + rel * 140 * S, py = sy - lineL - rel * 300 * S * (1 + rel);
        ctx.save(); ctx.globalAlpha = fade * clamp(1 - rel / 0.85, 0, 1); ctx.translate(px, py); ctx.rotate(tw + rel * 0.5); chute(ctx, cw, ch);
        ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); for (let k = 0; k < 8; k += 2) { const xa = -cw / 2 + (k / 8) * cw; ctx.moveTo(xa, 0); ctx.lineTo(rel > 0 ? 0 : sx - px, rel > 0 ? lineL * 0.9 : lineL); }
        ctx.moveTo(cw / 2, 0); ctx.lineTo(rel > 0 ? 0 : sx - px, rel > 0 ? lineL * 0.9 : lineL); ctx.stroke(); ctx.restore(); stats.drawn += 12;
      }
      // landingsstof
      ctx.globalCompositeOperation = "source-over";
      for (const p of puffs) {
        const s = t - p.birth; if (s < 0 || s > p.life) continue; const u = s / p.life;
        glow(ctx, c.dust, cx + p.dir * p.sp * Math.sqrt(s) * 1.4, gy + 4 * S - 12 * S * u + up, p.d * (0.5 + 1.1 * u), (P.dark ? 0.55 : 0.5) * (1 - u) * fade, false); stats.drawn++;
      }
      // skycrane + kabels + rover
      const rb = roverBottom(t), rx = cx, thr = t > T_CUT ? 1 : thrust * (t > T_LOW ? 0.9 : 1);
      if (t < T_CUT + 1.4) {
        const sa = fade * clamp(1 - (t - T_CUT - 0.5) / 0.9, 0, 1);
        if (t < T_CUT) {
          // kabels
          ctx.globalAlpha = fade; ctx.strokeStyle = c.line; ctx.lineWidth = 1.2 * S; ctx.beginPath();
          for (const o of [-14, 0, 14]) { ctx.moveTo(sx + o * U, sy + 10 * U); ctx.lineTo(rx + o * U * 0.9, rb - 30 * U); } ctx.stroke(); stats.drawn++;
          ctx.save(); ctx.globalAlpha = fade; ctx.translate(rx, rb); rover(ctx, 0); ctx.restore(); stats.drawn += 12;
        }
        ctx.save(); ctx.globalAlpha = sa; ctx.translate(sx, sy); if (t > T_CUT) ctx.rotate((t - T_CUT) * 0.9); ctx.globalCompositeOperation = "source-over"; descentStage(ctx, thr, t); ctx.restore(); stats.drawn += 14;
        if (thr > 0.05) { ctx.globalCompositeOperation = P.comp; glow(ctx, c.flame, sx, sy + 26 * U, 120 * U * thr, 0.45 * sa, false); ctx.globalCompositeOperation = "source-over"; }
      }
      if (t >= T_CUT) { ctx.save(); ctx.globalAlpha = fade; ctx.translate(rx, gy - 1 * S + up); rover(ctx, Math.sin((t - T_CUT) * 2.8) * 0.5 * clamp((t - 3.8) / 0.5, 0, 1)); ctx.restore(); stats.drawn += 12; }
      // het moment dat de kabels doorgaan
      const cf = clamp((t - T_CUT) / 0.05, 0, 1) * clamp((T_CUT + 0.35 - t) / 0.3, 0, 1);
      if (cf > 0) { ctx.globalCompositeOperation = P.comp; glow(ctx, c.flameC, cx, gy - 40 * S, 80 * S, 0.8 * cf * fade, false); ctx.globalCompositeOperation = "source-over"; }
      // een glimp van de camera
      if (t > 4.0 && t < 4.7) { const k = Math.sin((t - 4.0) / 0.7 * Math.PI); ctx.globalAlpha = k * fade; ctx.strokeStyle = c.glint; ctx.lineWidth = 1.6 * S; ctx.save(); ctx.translate(cx + 14 * U, gy - 11 * U - 45 * U + up); sparkle(ctx, 9 * U * k); ctx.restore(); stats.drawn++; }
      ctx.globalAlpha = 1;
    } }];
  }

  // ── Penicilline (1928): schimmel in een petrischaal, de bacteriën wijken ────
  function penicillinLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), END = 4.9;
    const c = P.dark
      ? { rim: "rgba(220,240,255,.55)", rimIn: "rgba(255,255,255,.18)", agar: "#f0cf70", agar2: "#e0b24a", clear: "#fff0b8", bact: "#fff7ea", bactLine: "rgba(150,90,40,.55)", mold: ["#2f9e8a", "#3fb59d", "#6fcfb8"], fuzz: "#e8f6ee", spark: "#ffe9a8", shadow: "rgba(0,0,0,.35)" }
      : { rim: "rgba(40,70,90,.6)", rimIn: "rgba(255,255,255,.5)", agar: "#e9c466", agar2: "#d3a844", clear: "#f8e3a0", bact: "#fffaf0", bactLine: "rgba(130,80,30,.65)", mold: ["#1f7d6b", "#2a9884", "#4fb8a1"], fuzz: "#f2fbf6", spark: "#a9781a", shadow: "rgba(0,0,0,.2)" };
    const cx = W / 2, cy = H * 0.44, R = Math.min(W * 0.38, H * 0.24), mx = cx + 0.3 * R, my = cy - 0.36 * R, Zmax = 1.02 * R;
    const bact = Array.from({ length: 74 }, (_, i) => {
      const r = R * 0.9 * Math.sqrt((i + 0.5) / 74), a = i * 2.39996 + rnd(-0.2, 0.2), x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      return { x, y, r: rnd(3.2, 5.6) * S, d: Math.hypot(x - mx, y - my), ph: rnd(0, TAU) };
    });
    const mold = Array.from({ length: 14 }, (_, i) => { const a = (i / 14) * TAU + rnd(-0.2, 0.2), k = rnd(0.35, 0.8); return { a, k, s: rnd(0.4, 0.62), col: pick(c.mold) }; });
    const spores = Array.from({ length: 16 }, () => ({ a: rnd(0, TAU), k: rnd(0.8, 1.15), s: rnd(1, 2.2) * S }));
    return [{ end: END, draw(ctx, t, W2, H2) {
      const fade = fadeIO(t, END, 0.4, 0.7), din = easeOut(t / 0.5);
      const mr = 0.17 * R * easeOut((t - 0.8) / 1.0), Z = Zmax * easeOut((t - 1.5) / 2.1);
      ctx.globalAlpha = din * fade;
      ctx.fillStyle = c.shadow; ctx.beginPath(); ctx.arc(cx + 3 * S, cy + 5 * S, R + 6 * S, 0, TAU); ctx.fill();
      const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R); g.addColorStop(0, c.agar); g.addColorStop(1, c.agar2);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      // de schone zone rond de schimmel
      if (Z > 0) {
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
        ctx.globalAlpha = din * fade * 0.55; ctx.fillStyle = c.clear; ctx.beginPath(); ctx.arc(mx, my, Z, 0, TAU); ctx.fill();
        ctx.globalAlpha = din * fade * 0.6; ctx.strokeStyle = c.clear; ctx.lineWidth = 2 * S; ctx.beginPath(); ctx.arc(mx, my, Z, 0, TAU); ctx.stroke(); ctx.restore();
      }
      // bacteriën
      for (const b of bact) {
        const a = clamp(1 - (Z - b.d + 2 * S) / (0.14 * R), 0, 1); if (a <= 0.02) continue;
        const rr = b.r * (1 + 0.1 * Math.sin(t * 5 + b.ph)) * (0.5 + 0.5 * a);
        ctx.globalAlpha = din * fade * a; ctx.fillStyle = c.bact; ctx.strokeStyle = c.bactLine; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, TAU); ctx.fill(); ctx.stroke(); stats.drawn++;
      }
      // schimmel
      if (mr > 0.5) {
        glow(ctx, "#ffffff", mx, my, mr * 3.6, 0.35 * din * fade, false);
        for (const m of mold) { ctx.globalAlpha = din * fade * 0.95; ctx.fillStyle = m.col; ctx.beginPath(); ctx.arc(mx + Math.cos(m.a) * mr * m.k, my + Math.sin(m.a) * mr * m.k, mr * m.s, 0, TAU); ctx.fill(); }
        ctx.fillStyle = c.fuzz; for (const sp of spores) { ctx.globalAlpha = din * fade * 0.9; ctx.beginPath(); ctx.arc(mx + Math.cos(sp.a) * mr * sp.k, my + Math.sin(sp.a) * mr * sp.k, sp.s, 0, TAU); ctx.fill(); }
        stats.drawn += 12;
      }
      // schaalrand
      ctx.globalAlpha = din * fade; ctx.strokeStyle = c.rim; ctx.lineWidth = 5 * S; ctx.beginPath(); ctx.arc(cx, cy, R + 2 * S, 0, TAU); ctx.stroke();
      ctx.strokeStyle = c.rimIn; ctx.lineWidth = 3 * S; ctx.beginPath(); ctx.arc(cx, cy, R - 4 * S, -2.6, -1.5); ctx.stroke(); stats.drawn += 4;
      // klaar: een gouden glinstering rond de schaal
      if (t > 3.7) {
        ctx.strokeStyle = c.spark; ctx.lineWidth = 1.5 * S;
        for (const [a, ph] of [[-2.2, 0], [-0.6, 1.4], [0.9, 2.6], [2.4, 3.9]]) {
          const k = Math.abs(Math.sin((t - 3.7) * 3 + ph)) * clamp((t - 3.7) / 0.3, 0, 1); ctx.globalAlpha = k * fade;
          ctx.save(); ctx.translate(cx + Math.cos(a) * (R + 14 * S), cy + Math.sin(a) * (R + 14 * S)); sparkle(ctx, 8 * S * k + 2 * S); ctx.restore(); stats.drawn++;
        }
      }
      ctx.globalAlpha = 1;
    } }];
  }

  // ── Relativiteitstheorie (1905): een raster buigt rond een massa, licht volgt ─
  function einsteinLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), HS = H / 844, END = 4.9;
    const c = P.dark
      ? { grid: "rgba(110,168,255,.62)", gridHi: "rgba(160,200,255,.9)", orb: "#ffd76a", orbHi: "#fff6dc", ray: "#fff6dc", rayGlow: "#9cc4ff", text: "#fff1b8", sym: ["#ffd76a", "#9cc4ff", "#ffffff"] }
      : { grid: "rgba(36,86,196,.42)", gridHi: "rgba(20,60,160,.8)", orb: "#c9962a", orbHi: "#f0d078", ray: "#d97a00", rayGlow: "#d97a00", text: "#1d3f8f", sym: ["#1d3f8f", "#a9781a", "#2456c4"] };
    const cx = W / 2, cy = H * 0.46, sig = W * 0.34;
    const vlines = Array.from({ length: 9 }, (_, i) => ({ v: true, p: (i / 8) * W })), hlines = Array.from({ length: 17 }, (_, j) => ({ v: false, p: (j / 16) * H }));
    const SYMS = ["E", "m", "c²", "Δ", "π", "∞", "√", "γ", "ħ", "≈", "Σ", "λ", "E=mc²"];
    const syms = Array.from({ length: 16 }, () => { const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), v = rnd(55, 150) * S; return { a, v, birth: rnd(2.0, 3.8), txt: pick(SYMS), size: rnd(17, 27) * S, col: pick(c.sym), rot: rnd(-0.4, 0.4) }; });
    const warp = (x, y, A) => { const dx = x - cx, dy = y - cy, f = A * Math.exp(-Math.pow(Math.hypot(dx, dy) / sig, 2)); return [cx + dx * (1 - f), cy + dy * (1 - f)]; };
    const rays = [{ y: cy - 0.1 * H, dir: 1, t0: 1.7 }, { y: cy + 0.17 * H, dir: -1, t0: 2.1 }];
    return [{ end: END, draw(ctx, t, W2, H2) {
      const fade = fadeIO(t, END, 0.01, 0.7), A = 0.8 * easeInOut((t - 0.4) / 1.5), gin = easeOut(t / 0.4);
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.globalAlpha = gin * fade; ctx.strokeStyle = c.grid; ctx.lineWidth = 1.6 * S;
      for (const L of vlines.concat(hlines)) {
        ctx.beginPath(); const N = 44;
        for (let i = 0; i <= N; i++) { const u = i / N, x = L.v ? L.p : u * W2, y = L.v ? u * H2 : L.p, q = warp(x, y, A); ctx.lineTo(q[0], q[1]); }
        ctx.stroke(); stats.drawn++;
      }
      // de massa
      const oa = easeOut((t - 0.3) / 0.5) * fade;
      ctx.globalCompositeOperation = P.comp; glow(ctx, c.orb, cx, cy, 120 * S * (0.9 + 0.1 * Math.sin(t * 3)), 0.6 * oa, false); ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = oa; const og = ctx.createRadialGradient(cx - 3 * S, cy - 3 * S, 1, cx, cy, 13 * S); og.addColorStop(0, c.orbHi); og.addColorStop(1, c.orb); ctx.fillStyle = og; ctx.beginPath(); ctx.arc(cx, cy, 12 * S, 0, TAU); ctx.fill(); stats.drawn += 2;
      // lichtstralen volgen de gebogen ruimte
      for (const r of rays) {
        const u = (t - r.t0) / 1.7; if (u < 0 || u > 1.25) continue;
        const N = 60, head = clamp(u, 0, 1) * N, trail = 22; ctx.beginPath(); let hx = 0, hy = 0;
        for (let i = Math.max(0, head - trail); i <= head; i += 1) { const xx = r.dir > 0 ? (i / N) * W2 : W2 - (i / N) * W2, q = warp(xx, r.y, A); ctx.lineTo(q[0], q[1]); hx = q[0]; hy = q[1]; }
        const fa = clamp((1.25 - u) / 0.25, 0, 1) * fade; ctx.globalAlpha = 0.9 * fa; ctx.strokeStyle = c.ray; ctx.lineWidth = 2.4 * S; ctx.stroke();
        ctx.globalCompositeOperation = P.comp; glow(ctx, c.rayGlow, hx, hy, 34 * S, 0.9 * fa, false); ctx.globalCompositeOperation = "source-over"; stats.drawn += 2;
      }
      // E = mc²
      const ta = easeOut((t - 2.3) / 0.6) * fade;
      if (ta > 0) {
        ctx.save(); ctx.globalAlpha = ta; ctx.translate(W2 / 2, H2 * 0.82); const sc = 0.85 + 0.15 * easeOut((t - 2.3) / 0.6); ctx.scale(sc, sc);
        ctx.font = `italic 700 ${Math.round(50 * S)}px Georgia, "Times New Roman", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = c.text;
        if (P.dark) { ctx.globalAlpha = ta * 0.35; ctx.fillText("E = mc²", 0, 2 * S); ctx.fillText("E = mc²", 2 * S, 0); ctx.globalAlpha = ta; }
        ctx.fillText("E = mc²", 0, 0); ctx.restore(); stats.drawn += 2;
      }
      // symbolen stijgen op uit de massa
      for (const s of syms) {
        const q = t - s.birth; if (q < 0 || q > 2.1) continue;
        ctx.save(); ctx.globalAlpha = Math.sin((q / 2.1) * Math.PI) * 0.9 * fade; ctx.translate(cx + Math.cos(s.a) * s.v * q, cy + Math.sin(s.a) * s.v * q - 20 * S * q); ctx.rotate(s.rot);
        ctx.font = `italic ${Math.round(s.size)}px Georgia, "Times New Roman", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = s.col; ctx.fillText(s.txt, 0, 0); ctx.restore(); stats.drawn++;
      }
      ctx.globalAlpha = 1;
    } }];
  }

  // ── Lumière (1895): de eerste filmvoorstelling, de trein komt op je af ──────
  // Projectorbundel naar een flikkerend scherm, filmstroken schuiven langs de randen,
  // op het doek rijdt een trein recht op het publiek af: de silhouetten schrikken terug.
  function lumiereLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), END = 4.8;
    const c = P.dark
      ? { screen: "#e9dcb4", ink: "#2a2118", ink2: "#5a4a34", strip: "#1d1d1d", stripRim: "rgba(255,255,255,.3)", hole: "#efe3c0", frame: "#c9b88a", beam: "255,244,214", beamA: 0.1, head: "#0a0a0a", headRim: "rgba(255,255,255,.28)", dust: "#fff4d6", lamp: "#fffbe8" }
      : { screen: "#efe2b8", ink: "#2a2118", ink2: "#6a5a40", strip: "#1d1d1d", stripRim: "rgba(0,0,0,.5)", hole: "#d9cc9f", frame: "#bfae7c", beam: "255,225,150", beamA: 0.16, head: "#0d0d0d", headRim: "rgba(0,0,0,.4)", dust: "#8a6a10", lamp: "#fffbe8" };
    const sx0 = W * 0.15, sx1 = W * 0.85, sw = sx1 - sx0, sh = sw * 0.62, sy0 = H * 0.07, sy1 = sy0 + sh;
    const noise = (n) => { const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const dust = Array.from({ length: 24 }, () => ({ u: rnd(0.05, 0.95), v: rnd(0.15, 0.95), ph: rnd(0, TAU), s: rnd(1, 2.2) * S, sp: rnd(0.2, 0.6) }));
    const heads = Array.from({ length: 7 }, (_, i) => ({ x: (0.09 + i * 0.136) * W + rnd(-6, 6) * S, r: rnd(15, 19) * S, d: 3.0 + rnd(0, 0.35), ph: rnd(0, TAU) }));
    const stripW = W * 0.075, frameH = stripW * 1.25, strips = [0, W - stripW];
    function trainFront(ctx, k, shake) {       // oorsprong = onderkant midden, k = schaal in px per eenheid
      ctx.save(); ctx.translate(shake, 0);
      ctx.fillStyle = c.ink; ctx.fillRect(-34 * k, -74 * k, 68 * k, 70 * k);                       // cabine
      ctx.fillStyle = c.ink2; ctx.beginPath(); ctx.arc(0, -42 * k, 28 * k, 0, TAU); ctx.fill();    // rookkamer
      ctx.fillStyle = c.ink; ctx.beginPath(); ctx.arc(0, -42 * k, 22 * k, 0, TAU); ctx.fill();
      ctx.fillRect(-7 * k, -100 * k, 14 * k, 30 * k); ctx.fillRect(-11 * k, -106 * k, 22 * k, 7 * k);   // schoorsteen
      ctx.fillStyle = c.screen; ctx.beginPath(); ctx.arc(0, -66 * k, 6 * k, 0, TAU); ctx.fill();   // lamp
      ctx.fillStyle = c.ink; ctx.beginPath(); ctx.moveTo(-30 * k, -4 * k); ctx.lineTo(30 * k, -4 * k); ctx.lineTo(10 * k, 14 * k); ctx.lineTo(-10 * k, 14 * k); ctx.closePath(); ctx.fill();   // koeienvanger
      ctx.fillRect(-44 * k, -26 * k, 10 * k, 26 * k); ctx.fillRect(34 * k, -26 * k, 10 * k, 26 * k);                                                 // wielen
      ctx.restore();
    }
    return [{ end: END, draw(ctx, t, W2, H2) {
      const fade = fadeIO(t, END, 0.01, 0.5), on = clamp((t - 0.15) / 0.3, 0, 1) * clamp((END - 0.2 - t) / 0.25, 0, 1);
      if (on <= 0) return;
      const fi = Math.floor(t * 14), fl = 0.86 + 0.14 * noise(fi);
      // filmstroken langs de randen
      for (let k = 0; k < 2; k++) {
        const x = strips[k], off = (t * 95 * S) % frameH;
        ctx.globalAlpha = on * fade * 0.92; ctx.fillStyle = c.strip; ctx.fillRect(x, 0, stripW, H2);
        ctx.strokeStyle = c.stripRim; ctx.lineWidth = 1; ctx.strokeRect(x, 0, stripW, H2);
        ctx.fillStyle = c.frame; ctx.globalAlpha = on * fade * 0.55;
        for (let y = -frameH + off; y < H2; y += frameH) ctx.fillRect(x + stripW * 0.2, y + frameH * 0.12, stripW * 0.6, frameH * 0.76);
        ctx.globalAlpha = on * fade * 0.9; ctx.strokeStyle = c.hole; ctx.lineWidth = stripW * 0.1; ctx.setLineDash([stripW * 0.12, stripW * 0.16]);
        ctx.beginPath(); ctx.moveTo(x + stripW * 0.09, -off); ctx.lineTo(x + stripW * 0.09, H2); ctx.moveTo(x + stripW * 0.91, -off); ctx.lineTo(x + stripW * 0.91, H2); ctx.stroke(); ctx.setLineDash([]);
        stats.drawn += 22;
      }
      // projectorbundel
      ctx.globalCompositeOperation = P.comp; ctx.fillStyle = `rgba(${c.beam},${c.beamA * on * fade * fl})`;
      ctx.beginPath(); ctx.moveTo(W2 / 2 - 7 * S, H2 + 4); ctx.lineTo(W2 / 2 + 7 * S, H2 + 4); ctx.lineTo(sx1, sy1); ctx.lineTo(sx0, sy1); ctx.closePath(); ctx.fill(); stats.drawn++;
      ctx.fillStyle = c.dust;
      for (const d of dust) {
        const q = (d.v + t * d.sp * 0.1) % 1, yy = sy1 + (H2 - sy1) * (1 - q), half = (sw / 2) * (1 - q * 0 ) * (0.1 + 0.9 * (1 - (yy - sy1) / (H2 - sy1 + 1))) + 8 * S;
        ctx.globalAlpha = on * fade * (0.25 + 0.5 * Math.abs(Math.sin(d.ph + t * 3))); ctx.beginPath(); ctx.arc(W2 / 2 + (d.u - 0.5) * 2 * half, yy, d.s, 0, TAU); ctx.fill(); stats.drawn++;
      }
      ctx.globalCompositeOperation = "source-over";
      // het doek
      ctx.save(); ctx.beginPath(); ctx.rect(sx0, sy0, sw, sh); ctx.clip();
      ctx.globalAlpha = on * fade * fl; ctx.fillStyle = c.screen; ctx.fillRect(sx0, sy0, sw, sh);
      const vx = sx0 + sw / 2, vy = sy0 + sh * 0.5;
      ctx.globalAlpha = on * fade * 0.5 * fl; ctx.strokeStyle = c.ink2; ctx.lineWidth = 2 * S; ctx.beginPath();
      ctx.moveTo(vx - 4 * S, vy); ctx.lineTo(sx0 + sw * 0.12, sy1); ctx.moveTo(vx + 4 * S, vy); ctx.lineTo(sx0 + sw * 0.88, sy1);
      for (let i = 0; i < 7; i++) { const q = Math.pow(i / 7, 1.8), yy = vy + (sy1 - vy) * q, w = 4 + (sw * 0.38 - 4) * q; ctx.moveTo(vx - w, yy); ctx.lineTo(vx + w, yy); } ctx.stroke();
      const tu = clamp((t - 0.7) / 2.6, 0, 1), k = (0.25 + 1.5 * tu * tu) * S * 0.55;
      ctx.globalAlpha = on * fade * fl; if (t > 0.7) { ctx.save(); ctx.translate(vx, vy + 22 * k + (sy1 - vy) * 0.4 * tu * tu); trainFront(ctx, k, tu > 0.6 ? Math.sin(t * 60) * 0.8 * S : 0); ctx.restore(); }
      if (tu > 0.55) { ctx.globalAlpha = on * fade * 0.5 * (tu - 0.55); ctx.fillStyle = c.screen; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(vx + (i - 1) * 24 * k, vy - 90 * k - i * 8 * k, 16 * k, 0, TAU); ctx.fill(); } }
      // korrel, krassen, vignet
      ctx.globalAlpha = on * fade * 0.5; ctx.strokeStyle = c.ink; ctx.lineWidth = 1; ctx.beginPath();
      for (let i = 0; i < 4; i++) { if (noise(fi * 7 + i) < 0.5) continue; const x = sx0 + noise(fi * 3 + i * 11) * sw; ctx.moveTo(x, sy0); ctx.lineTo(x + (noise(fi + i) - 0.5) * 6, sy1); } ctx.stroke();
      ctx.fillStyle = c.ink; for (let i = 0; i < 14; i++) { ctx.globalAlpha = on * fade * 0.4; ctx.fillRect(sx0 + noise(fi * 5 + i) * sw, sy0 + noise(fi * 9 + i * 3) * sh, 2 * S, 2 * S); }
      const vg = ctx.createRadialGradient(vx, vy, sh * 0.3, vx, vy, sw * 0.72); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(30,20,10,.55)");
      ctx.globalAlpha = on * fade; ctx.fillStyle = vg; ctx.fillRect(sx0, sy0, sw, sh);
      ctx.restore(); stats.drawn += 12;
      ctx.globalAlpha = on * fade; ctx.strokeStyle = c.strip; ctx.lineWidth = 3 * S; ctx.strokeRect(sx0, sy0, sw, sh);
      // publiek
      for (const h of heads) {
        const s = t - h.d, rea = s > 0 ? easeOut(s / 0.18) * (1 - easeInOut((s - 0.5) / 0.6) * 0.5) : 0, y = H2 - 6 * S - rea * 18 * S, tilt = rea * 0.28 * (h.x < W2 / 2 ? -1 : 1);
        ctx.save(); ctx.globalAlpha = on * fade; ctx.translate(h.x, y); ctx.rotate(tilt); ctx.fillStyle = c.head; ctx.strokeStyle = c.headRim; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(0, h.r * 1.9, h.r * 1.5, h.r * 1.1, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(0, 0, h.r, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore(); stats.drawn += 2;
        if (rea > 0.4 && s < 0.9) { ctx.globalAlpha = on * fade * clamp(1 - s / 0.9, 0, 1); ctx.fillStyle = c.dust; ctx.font = `700 ${Math.round(20 * S)}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillText("!", h.x, y - h.r * 1.3 - 4 * S); stats.drawn++; }
      }
      ctx.globalAlpha = 1;
    } }];
  }

  // ── Bayeux-wandtapijt (1066): een geborduurde strook rolt voorbij ───────────
  function tapestryLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), END = 4.9, u = S * 1.7;
    const c = P.dark
      ? { linen: "#efe3c6", linenLo: "#e2d3ae", ink: "#3a2a1a", terra: "#b5532c", blue: "#2f6a96", olive: "#7b8a3a", must: "#d9a82a", skin: "#e8c9a0", shadow: "rgba(0,0,0,.4)", comet: ["#d9a82a", "#b5532c", "#2f6a96"] }
      : { linen: "#e3d3a8", linenLo: "#d4c18f", ink: "#3a2a1a", terra: "#a8452a", blue: "#27608b", olive: "#6f7d30", must: "#c99a1e", skin: "#e0be92", shadow: "rgba(0,0,0,.28)", comet: ["#c99a1e", "#a8452a", "#27608b"] };
    const cy = H * 0.7, bh = 94 * S * 1.05, Lc = W * 1.75, T0 = 0.15, T1 = 4.5;
    const scroll = (t) => (Lc + W) * clamp((t - T0) / (T1 - T0), 0, 1);
    const cols = [c.terra, c.blue, c.olive, c.must];
    const figs = [
      { k: "ship", x: 0.08 * W, col: 0 }, { k: "ship", x: 0.4 * W, col: 1 },
      { k: "horse", x: 0.78 * W, col: 0 }, { k: "horse", x: 0.98 * W, col: 1 }, { k: "horse", x: 1.18 * W, col: 2 },
      { k: "king", x: 1.46 * W, col: 3 },
      { k: "archer", x: 1.7 * W, col: 1 },
    ];
    const arrows = Array.from({ length: 6 }, (_, i) => ({ x: 1.7 * W + 14 * u, y: -6 * u + rnd(-14, 4) * u, v: rnd(180, 260) * S, ph: i * 0.55 }));
    function outline(ctx) { ctx.strokeStyle = c.ink; ctx.lineWidth = Math.max(1, 1.4 * u / 1.7); ctx.lineJoin = "round"; ctx.lineCap = "round"; }
    function ship(ctx, col, t) {
      const A = cols[col], B = cols[(col + 2) % 4], bob = Math.sin(t * 3 + col) * 1.2;
      ctx.save(); ctx.translate(0, bob);
      ctx.fillStyle = A; ctx.beginPath(); ctx.moveTo(-40, -6); ctx.quadraticCurveTo(-30, 8, 0, 8); ctx.quadraticCurveTo(30, 8, 42, -8); ctx.lineTo(-40, -6); ctx.closePath(); ctx.fill(); outline(ctx); ctx.stroke();
      ctx.beginPath(); ctx.arc(44, -12, 5, Math.PI * 0.4, Math.PI * 1.9); ctx.stroke();                          // drakenkop
      ctx.beginPath(); ctx.moveTo(-40, -6); ctx.quadraticCurveTo(-46, -14, -42, -20); ctx.stroke();
      for (let i = 0; i < 7; i++) { ctx.fillStyle = cols[(i + col) % 4]; ctx.beginPath(); ctx.arc(-30 + i * 10, -3, 3.4, 0, TAU); ctx.fill(); ctx.stroke(); }   // schilden
      ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(0, -48); ctx.stroke();
      for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? B : A; ctx.fillRect(-17 + i * 6.8, -46, 6.8, 32); } ctx.strokeRect(-17, -46, 34, 32);
      ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-24 + i * 14, 4); ctx.lineTo(-30 + i * 14, 14); } ctx.stroke();
      ctx.strokeStyle = c.blue; ctx.beginPath(); for (let i = 0; i <= 12; i++) ctx.lineTo(-48 + i * 8, 15 + (i % 2 ? 2.5 : -1)); ctx.stroke();
      ctx.restore();
    }
    function horse(ctx, col, t, rider) {
      const A = cols[col], B = cols[(col + 1) % 4], g = Math.sin(t * 9 + col * 2);
      outline(ctx); ctx.fillStyle = A;
      ctx.beginPath(); ctx.moveTo(-16, -3); ctx.quadraticCurveTo(-26, 0, -24, 10); ctx.stroke();                              // staart
      ctx.beginPath(); ctx.moveTo(-9, 5); ctx.lineTo(-13 - g * 4, 17); ctx.moveTo(-3, 6); ctx.lineTo(-5 + g * 4, 17); ctx.moveTo(8, 6); ctx.lineTo(11 - g * 4, 17); ctx.moveTo(14, 4); ctx.lineTo(19 + g * 4, 15); ctx.stroke();   // poten
      ctx.beginPath(); ctx.ellipse(0, 0, 18, 8.5, 0, 0, TAU); ctx.fill(); ctx.stroke();                                            // romp
      ctx.beginPath(); ctx.moveTo(10, -4); ctx.lineTo(20, -19); ctx.lineTo(27, -17); ctx.lineTo(24, -8); ctx.lineTo(16, 1); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(28, -15, 6.5, 3.2, 0.5, 0, TAU); ctx.fill(); ctx.stroke();                                      // kop
      ctx.fillStyle = B; ctx.fillRect(-12, -7, 18, 5); ctx.strokeRect(-12, -7, 18, 5);                                              // zadeldek
      // ruiter
      ctx.fillStyle = B; ctx.fillRect(-3, -25, 8, 18); ctx.strokeRect(-3, -25, 8, 18);
      ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(1.5, -29, 4.2, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = c.ink; ctx.beginPath(); ctx.moveTo(-3, -30); ctx.lineTo(1.5, -39); ctx.lineTo(6, -30); ctx.closePath(); ctx.fill();   // helm
      ctx.fillStyle = cols[(col + 2) % 4]; ctx.beginPath(); ctx.moveTo(6, -23); ctx.lineTo(15, -23); ctx.lineTo(15, -13); ctx.lineTo(10.5, -5); ctx.lineTo(6, -13); ctx.closePath(); ctx.fill(); ctx.stroke();   // schild
      ctx.beginPath(); ctx.moveTo(5, -20); ctx.lineTo(38, -36); ctx.stroke();                                                        // speer
      ctx.fillStyle = c.terra; ctx.beginPath(); ctx.moveTo(38, -36); ctx.lineTo(46, -38); ctx.lineTo(41, -31); ctx.closePath(); ctx.fill();
    }
    function king(ctx, col, t) {
      horse(ctx, col, t, true);
      ctx.fillStyle = c.must; ctx.strokeStyle = c.ink; ctx.beginPath(); ctx.moveTo(-3, -33); ctx.lineTo(-3, -41); ctx.lineTo(0, -37); ctx.lineTo(1.5, -43); ctx.lineTo(3, -37); ctx.lineTo(6, -41); ctx.lineTo(6, -33); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    function archer(ctx, col, t) {
      const A = cols[col], pull = 0.5 + 0.5 * Math.sin(t * 2.4);
      outline(ctx); ctx.fillStyle = A; ctx.fillRect(-5, -26, 9, 22); ctx.strokeRect(-5, -26, 9, 22);
      ctx.fillStyle = c.skin; ctx.beginPath(); ctx.arc(0, -31, 4.6, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(-7, 12); ctx.moveTo(2, -4); ctx.lineTo(8, 12); ctx.stroke();
      ctx.beginPath(); ctx.arc(10, -16, 15, -1.1, 1.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(10 + Math.cos(-1.1) * 15, -16 + Math.sin(-1.1) * 15); ctx.lineTo(10 - 6 * pull, -16); ctx.lineTo(10 + Math.cos(1.1) * 15, -16 + Math.sin(1.1) * 15); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-2, -18); ctx.lineTo(24, -16); ctx.stroke();
    }
    function comet(ctx, t) {
      const fl = 0.85 + 0.15 * Math.sin(t * 6);
      ctx.lineCap = "round"; ctx.lineWidth = 3.2 * fl;
      for (let i = 0; i < 3; i++) { ctx.strokeStyle = c.comet[i]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(18, -6 - i * 4, 34, -2 + i * 3, 56 + i * 6, -14 + i * 10); ctx.stroke(); }
      ctx.fillStyle = c.must; ctx.strokeStyle = c.ink; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 0, 6, 0, TAU); ctx.fill(); ctx.stroke();
    }
    return [{ end: END, draw(ctx, t, W2, H2) {
      const fade = fadeIO(t, END, 0.35, 0.6), sc = scroll(t), dy = (1 - easeOut(t / 0.5)) * 30 * S;
      const top = cy - bh + dy, hgt = bh * 2;
      ctx.globalAlpha = fade; ctx.fillStyle = c.shadow; ctx.fillRect(0, top + 6 * S, W2, hgt);
      ctx.fillStyle = c.linen; ctx.fillRect(0, top, W2, hgt);
      ctx.fillStyle = c.linenLo; ctx.globalAlpha = fade * 0.5; ctx.beginPath(); for (let y = top + 4 * S; y < top + hgt; y += 5 * S) { ctx.moveTo(0, y); ctx.lineTo(W2, y); } ctx.lineWidth = 1; ctx.strokeStyle = c.linenLo; ctx.stroke();
      // friezen boven en onder: zigzag + stippen, schuift mee
      const per = 20 * S, off = sc % (per * 2), fh = 18 * S;
      for (const [yy, dir] of [[top + fh * 0.5, 1], [top + hgt - fh * 0.5, -1]]) {
        ctx.globalAlpha = fade; ctx.lineWidth = 2.6 * S; ctx.lineJoin = "miter";
        for (const [col, ph] of [[c.terra, 0], [c.blue, per]]) {
          ctx.strokeStyle = col; ctx.beginPath();
          for (let x = -per * 2 - off + ph; x < W2 + per; x += per) { ctx.lineTo(x, yy + (((x - ph + off) / per) % 2 ? -1 : 1) * 5 * S * dir); } ctx.stroke();
        }
        ctx.fillStyle = c.must; ctx.beginPath(); for (let x = -per - off % per; x < W2 + per; x += per) { ctx.moveTo(x + 3 * S, yy); ctx.arc(x, yy, 3 * S, 0, TAU); } ctx.fill(); stats.drawn += 4;
      }
      ctx.globalAlpha = fade; ctx.strokeStyle = c.ink; ctx.lineWidth = 2 * S; ctx.beginPath(); ctx.moveTo(0, top + fh); ctx.lineTo(W2, top + fh); ctx.moveTo(0, top + hgt - fh); ctx.lineTo(W2, top + hgt - fh); ctx.stroke();
      // de strook zelf
      ctx.save(); ctx.beginPath(); ctx.rect(0, top, W2, hgt); ctx.clip();
      const sceneY = cy + 20 * u + dy;
      for (const f of figs) {
        const x = W2 + f.x - sc; if (x < -90 * u || x > W2 + 90 * u) continue;
        ctx.save(); ctx.globalAlpha = fade; ctx.translate(x, f.k === "ship" ? sceneY + 4 * u : sceneY); ctx.scale(u, u);
        if (f.k === "ship") ship(ctx, f.col, t); else if (f.k === "horse") horse(ctx, f.col, t, true); else if (f.k === "king") king(ctx, f.col, t); else archer(ctx, f.col, t);
        ctx.restore(); stats.drawn += 12;
      }
      { const x = W2 + 0.62 * W - sc; if (x > -80 * u && x < W2 + 80 * u) { ctx.save(); ctx.globalAlpha = fade; ctx.translate(x, top + fh + 18 * u); ctx.scale(u, u); comet(ctx, t); ctx.restore(); stats.drawn += 4; } }
      { const x = W2 + 1.46 * W - sc; if (x > -120 * u && x < W2 + 120 * u) {
        ctx.save(); ctx.globalAlpha = fade; ctx.fillStyle = c.ink; ctx.font = `700 ${Math.round(13 * u)}px Georgia, "Times New Roman", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("HIC HAROLD REX", x, top + fh + 11 * u); ctx.restore(); stats.drawn++; } }
      // pijlen
      ctx.fillStyle = c.ink; ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5 * S;
      for (const a of arrows) {
        const s = t - 1.8 - a.ph; if (s < 0) continue; const ax = W2 + a.x - sc + a.v * s, ay = sceneY + a.y * u - 28 * Math.sin(Math.min(1, s / 1.2) * Math.PI) * S;
        if (ax > W2 + 20) continue; ctx.globalAlpha = fade; ctx.beginPath(); ctx.moveTo(ax - 12 * S, ay + 2 * S); ctx.lineTo(ax + 4 * S, ay - 1 * S); ctx.stroke(); stats.drawn++;
      }
      ctx.restore();
      ctx.globalAlpha = fade; ctx.strokeStyle = c.ink; ctx.lineWidth = 1.5 * S; ctx.strokeRect(-2, top, W2 + 4, hgt);
      ctx.globalAlpha = 1;
    } }];
  }

  // ── Eiffeltoren (1889): hij groeit omhoog en gaat fonkelen ──────────────────
  function eiffelLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), END = 4.9;
    const c = P.dark
      ? { iron: "#9b8670", ironHi: "#d9c3a3", lat: "rgba(40,28,18,.6)", beam: "255,236,170", beamA: 0.18, spark: "#ffe9a8", sparkGlow: "#ffd76a", plat: "#6f5a45", edge: "rgba(255,240,210,.5)" }
      : { iron: "#5a4636", ironHi: "#8b7155", lat: "rgba(255,255,255,.3)", beam: "201,150,42", beamA: 0.14, spark: "#a9781a", sparkGlow: "#c9962a", plat: "#2f2118", edge: "rgba(20,10,0,.55)" };
    const cx = W / 2, baseY = H * 0.97, topY = H * 0.34, th = baseY - topY, w0 = W * 0.24;
    const hw = (u) => w0 * (Math.exp(-3.6 * u) * 0.93 + 0.07 * (1 - u));
    const yOf = (u) => baseY - u * th;
    const N = 44, levels = [0.19, 0.38, 0.9];
    const arch = 0.12 * th, aw = 0.62 * hw(0);
    const tw = [];
    while (tw.length < 64) {
      const u = Math.pow(Math.random(), 1.25) * 0.94 + 0.03, xr = rnd(-0.88, 0.88);
      if (u < 0.13 && Math.abs(xr * hw(u)) < aw * 1.05) continue;
      tw.push({ u, x: cx + xr * hw(u), ph: rnd(0, TAU), sp: rnd(5, 11), r: rnd(3, 6.5) * S });
    }
    function outline(ctx) {
      ctx.beginPath();
      for (let i = 0; i <= N; i++) { const u = i / N; ctx.lineTo(cx - hw(u), yOf(u)); }
      for (let i = N; i >= 0; i--) { const u = i / N; ctx.lineTo(cx + hw(u), yOf(u)); }
      ctx.closePath();
      ctx.moveTo(cx - aw, baseY); ctx.bezierCurveTo(cx - aw, baseY - arch * 0.55, cx - aw * 0.45, baseY - arch, cx, baseY - arch); ctx.bezierCurveTo(cx + aw * 0.45, baseY - arch, cx + aw, baseY - arch * 0.55, cx + aw, baseY); ctx.closePath();
    }
    return [{ end: END, draw(ctx, t, W2, H2) {
      const fade = fadeIO(t, END, 0.2, 0.7), prog = easeOut((t - 0.2) / 1.9);
      if (prog <= 0) return;
      ctx.save(); ctx.beginPath(); ctx.rect(0, baseY - prog * th - 4 * S, W2, th * prog + 10 * S + (H2 - baseY)); ctx.clip();
      outline(ctx); ctx.globalAlpha = fade * 0.95; ctx.fillStyle = c.iron; ctx.fill("evenodd");
      ctx.save(); outline(ctx); ctx.clip("evenodd");
      ctx.globalAlpha = fade; ctx.strokeStyle = c.lat; ctx.lineWidth = 1.3 * S; ctx.beginPath();
      for (let k = 0; k < 16; k++) { const u1 = k / 16 * 0.97, u2 = (k + 1) / 16 * 0.97, h1 = hw(u1) * 1.02, h2 = hw(u2) * 1.02;
        ctx.moveTo(cx - h1, yOf(u1)); ctx.lineTo(cx + h2, yOf(u2)); ctx.moveTo(cx + h1, yOf(u1)); ctx.lineTo(cx - h2, yOf(u2)); ctx.moveTo(cx - h1, yOf(u1)); ctx.lineTo(cx + h1, yOf(u1)); }
      ctx.stroke(); ctx.globalAlpha = fade * 0.5; ctx.fillStyle = c.ironHi; ctx.fillRect(cx - 1.5 * S, topY, 3 * S, th);
      ctx.restore();
      ctx.globalAlpha = fade; ctx.strokeStyle = c.edge; ctx.lineWidth = 1.4 * S; outline(ctx); ctx.stroke();
      ctx.fillStyle = c.plat; for (const u of levels) { const hh = hw(u) + 7 * S; ctx.fillRect(cx - hh, yOf(u) - 3 * S, hh * 2, 6 * S); ctx.fillStyle = c.ironHi; ctx.fillRect(cx - hh, yOf(u) - 3 * S, hh * 2, 1.6 * S); ctx.fillStyle = c.plat; }
      ctx.strokeStyle = c.iron; ctx.lineWidth = 2 * S; ctx.beginPath(); ctx.moveTo(cx, topY); ctx.lineTo(cx, topY - 14 * S); ctx.stroke();
      ctx.restore(); stats.drawn += 18;
      // bakenlicht boven op de top zodra hij af is
      const ts = t - 2.0;
      if (ts > 0) {
        const tipY = topY - 14 * S, ba = clamp(ts / 0.4, 0, 1) * fade, th0 = ts * 1.5;
        ctx.globalCompositeOperation = P.comp; ctx.fillStyle = `rgba(${c.beam},${c.beamA * ba})`;
        for (let i = 0; i < 2; i++) { const a = th0 + i * Math.PI, L = H2 * 0.85, w = 0.075;
          ctx.beginPath(); ctx.moveTo(cx, tipY); ctx.lineTo(cx + Math.cos(a - w) * L, tipY + Math.sin(a - w) * L * 0.55); ctx.lineTo(cx + Math.cos(a + w) * L, tipY + Math.sin(a + w) * L * 0.55); ctx.closePath(); ctx.fill(); stats.drawn++; }
        const fl = clamp(1 - ts / 0.5, 0, 1); glow(ctx, c.sparkGlow, cx, tipY, 60 * S * (1 + fl * 2), (0.5 + 0.5 * fl) * ba, false); stats.drawn++;
        ctx.globalCompositeOperation = "source-over";
      }
      // het fonkelen
      ctx.strokeStyle = c.spark; ctx.lineWidth = 1.4 * S; ctx.lineCap = "round";
      for (const w of tw) {
        if (w.u > prog) continue; const b = Math.pow(Math.max(0, Math.sin(t * w.sp + w.ph)), 4) * clamp((t - 0.8) / 0.5, 0, 1); if (b < 0.04) continue;
        const y = yOf(w.u);
        if (P.dark) { ctx.globalCompositeOperation = "lighter"; glow(ctx, c.sparkGlow, w.x, y, w.r * 6, b * 0.9 * fade, false); ctx.globalCompositeOperation = "source-over"; }
        ctx.globalAlpha = b * fade; ctx.save(); ctx.translate(w.x, y); sparkle(ctx, w.r * (0.5 + b)); ctx.restore(); stats.drawn += 2;
      }
      ctx.globalAlpha = 1;
    } }];
  }

  const LAYERS = {
    wall: wallLayers, theses: thesesLayers, vesuvius: vesuviusLayers, edison: edisonLayers,
    railway: steamTrainLayers, curiosity: curiosityLayers, penicillin: penicillinLayers, einstein: einsteinLayers,
    lumiere: lumiereLayers, tapestry: tapestryLayers, eiffel: eiffelLayers,
  };
  // Anker: de groene jaartal-pil op de uitslagkaart (viewport-coördinaten; het fx-canvas is position:fixed).
  function anchor() {
    const el = document.querySelector("#result-text .year-pill");
    if (!el) return { x: innerWidth / 2, y: innerHeight * 0.55, w: 72, h: 28 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  }
  const paletteOf = (theme) => ({ dark: theme !== "light", comp: theme !== "light" ? "lighter" : "source-over" });
  return {
    has: (id) => Object.prototype.hasOwnProperty.call(LAYERS, id),
    ids: Object.keys(LAYERS),
    build(id, W, H, opts) {
      return LAYERS[id]({ W, H, P: paletteOf(currentTheme()), stats: { drawn: 0 }, opts: opts || {}, anchors: { get pill() { return anchor(); } } });
    },
  };
})();
