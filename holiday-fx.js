// Feestdag- en hoogtijdag-vieringen (HolidayFx): de canvas-lagen voor de gewone winst.
// Apart bestand zodat game.js er niets van meedraagt: het wordt pas geladen op een
// dag waarop er iets te vieren valt (zie loadHolidayFx/warmHolidayFx in game.js) en
// op alle andere dagen nooit opgehaald. De datumlogica (holidayFxFor, historicFxFor,
// HISTORIC_FX) blijft in game.js. Gebruikt currentTheme() uit game.js.
// Elke laag: draw(ctx, t, W, H) op de runFx-lus; vormen als vector, geen emoji.
window.HolidayFx = (() => {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2, PHI = 0.6180339887;
  const scaleOf = (W, H) => clamp(Math.min(W, H) / 400, 0.6, 1.5);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  // ── Paletten per feestdag (donker / licht) ──────────────────────────────────
  // Op crème hebben pastel, wit en goud een donkerder tint of een randje nodig.
  function palette(theme) {
    const dark = theme !== "light";
    return {
      dark, comp: dark ? "lighter" : "source-over",
      guess7: ["#4caf50", "#ab47bc", "#f4c430", "#ff9800", "#e53935", "#8b5a2b", "#6ea8ff"],
      newyear: dark ? { streamers: ["#f4c430", "#ffe9b0", "#d3dce2", "#ffffff"], glitter: ["#ffd76a", "#fff6dc", "#e6ebf0"] }
                    : { streamers: ["#b8860b", "#d8b46a", "#8a949e", "#5f6a75"], glitter: ["#c9962a", "#8a6a10", "#6b7680"] },
      hearts: dark ? ["#e53935", "#ff5fa2", "#ff8fb3", "#ffd1dc"] : ["#c62828", "#e53935", "#e91e63", "#f06292"],
      carnival: ["#4caf50", "#f4c430", "#ab47bc", "#ff5fa2", "#ff9800", "#6ea8ff"],
      eggs: dark ? ["#ffd1dc", "#c5e1a5", "#fff59d", "#b3e5fc", "#e1bee7", "#ffe0b2"] : ["#f48fb1", "#9ccc65", "#ffd54f", "#4fc3f7", "#ba68c8", "#ffb74d"],
      eggLine: dark ? "rgba(0,0,0,.18)" : "rgba(60,40,20,.35)",
      pumpkin: { body: "#ff9800", side: "#f57c00", deep: "#ef6c00", stem: "#6d8b3a", face: dark ? "#1a1a1a" : "#3e2723" },
      ghost: dark ? { fill: "rgba(255,255,255,.92)", line: null, eye: "#37474f" } : { fill: "#fbfbfb", line: "#9e9e9e", eye: "#546e7a" },
      snow: dark ? { dots: ["#ffffff", "#e3f2ff", "#b3e5fc"], flakes: ["#ffffff", "#e3f2ff"], star: "#ffd76a" }
                 : { dots: ["#9dc7ea", "#7fb8e6", "#b0d4ef"], flakes: ["#5c9fd6", "#7fb8e6"], star: "#c9962a" },
      // ronde 2
      eid: dark ? { lantern: ["#f4c430", "#26a69a", "#ffb74d"], glow: "#ffe9b0", moon: "#ffe9b0", star: "#fff6dc" }
                : { lantern: ["#b8860b", "#00796b", "#ef6c00"], glow: "#ffe082", moon: "#c9962a", star: "#8a6a10" },
      diwali: dark ? { clay: "#a1552b", clayDark: "#6d3a1a", flame: "#ffb300", flameCore: "#fff3c4", spark: ["#ffd76a", "#ffb300", "#ff7043"], petals: ["#ff9800", "#ffc107", "#ff7043"] }
                   : { clay: "#8d4a26", clayDark: "#5d2f14", flame: "#ff8f00", flameCore: "#fff3c4", spark: ["#c9962a", "#ef6c00", "#d84315"], petals: ["#ef6c00", "#f9a825", "#e64a19"] },
      lunar: dark ? { body: "#e53935", bodyDark: "#9f1c1c", gold: "#f4c430", glitter: ["#ffd76a", "#fff6dc"] }
                  : { body: "#c62828", bodyDark: "#7f0000", gold: "#b8860b", glitter: ["#c9962a", "#8a6a10"] },
      kings: dark ? { gold: "#f4c430", goldDeep: "#c9962a", purple: "#8e24aa", red: "#c62828", star: "#fff6dc", trail: "#ffd76a" }
                  : { gold: "#b8860b", goldDeep: "#8a6a10", purple: "#6a1b9a", red: "#b71c1c", star: "#c9962a", trail: "#c9962a" },
      pride: ["#e53935", "#ff9800", "#fdd835", "#43a047", "#1e88e5", "#8e24aa"],
      // historische hoogtijdagen
      rome: dark ? { leaf: "#7cb342", vein: "#c9a227", stem: "#9ccc65", numeral: ["#e8dcc0", "#f4c430", "#cfd8dc"] }
                 : { leaf: "#558b2f", vein: "#8a6a10", stem: "#33691e", numeral: ["#6d5a3a", "#8a6a10", "#546e7a"] },
      moon: dark ? { star: "#ffffff", glow: "#e3f2ff", moon: "#d9d9d9", crater: "#b0b0b0", line: null, gold: "#f4c430", goldDark: "#c9962a", grey: "#cfd8dc", window: "#1a1a1a", leg: "#cfd8dc", flame: "#ffb300", dust: "#9e9e9e" }
                 : { star: "#6b7680", glow: "#c9d9e8", moon: "#cfd4da", crater: "#a9b1b9", line: "#7d8790", gold: "#d4a72c", goldDark: "#8a6a10", grey: "#5f6f7a", window: "#263238", leg: "#5f6f7a", flame: "#ef6c00", dust: "#a9b1b9" },
      gregorian: dark ? { page: "#f5efe0", line: null, band: "#e53935", ink: "#2b2b2b", cross: "#e53935" }
                      : { page: "#ffffff", line: "#bdbdbd", band: "#c62828", ink: "#222222", cross: "#c62828" },
      ides: dark ? { numeral: ["#c39bff", "#f4c430", "#e8dcc0"], leaf: "#7cb342", vein: "#c9a227" }
                 : { numeral: ["#6a1b9a", "#8a6a10", "#6d5a3a"], leaf: "#558b2f", vein: "#8a6a10" },
      everest: dark ? { rock: "#3a4450", rockDark: "#2a313a", snow: "#f2f6fa", flag: "#e53935", pole: "#e0e0e0", flakes: ["#ffffff", "#e3f2ff"] }
                    : { rock: "#5c6b7a", rockDark: "#46525e", snow: "#ffffff", flag: "#c62828", pole: "#455a64", flakes: ["#9dc7ea", "#7fb8e6"] },
      columbus: dark ? { sea: "#4f8fc6", seaDark: "#2f6a9e", hull: "#6d4c2a", sail: "#f3e9d2", cross: "#c62828", mast: "#3e2a15" }
                     : { sea: "#2f6a9e", seaDark: "#1f4f7a", hull: "#5a3d1e", sail: "#fffaf0", cross: "#c62828", mast: "#3e2a15" },
      flight: dark ? { wing: "#e8dcc0", body: "#b8a888", strut: "#9a8a6a", prop: "#d3dce2", cloud: "rgba(255,255,255,.10)" }
                   : { wing: "#5d4e37", body: "#8b7355", strut: "#6d5a3a", prop: "#546e7a", cloud: "rgba(60,50,40,.08)" },
      patrick: dark ? { greens: ["#2e7d32", "#43a047", "#66bb6a", "#81c784"], coin: "#f4c430", coinRim: "#c9962a" }
                    : { greens: ["#1b5e20", "#2e7d32", "#388e3c", "#43a047"], coin: "#d4a72c", coinRim: "#8a6a10" },
      muertos: dark ? { papel: ["#ff4fa3", "#ff9800", "#8e24aa", "#26a69a", "#fdd835", "#43a047"], hole: "rgba(26,26,26,.85)", string: "rgba(255,255,255,.5)", marigold: ["#ff9800", "#ffb300", "#ff7043"], bone: "#f5f5f5", line: null, socket: "#2a2233", petal: "#ff4fa3", accent: "#26a69a" }
                    : { papel: ["#e91e63", "#ef6c00", "#6a1b9a", "#00897b", "#f9a825", "#2e7d32"], hole: "rgba(244,241,234,.9)", string: "rgba(60,50,40,.5)", marigold: ["#ef6c00", "#f9a825", "#e64a19"], bone: "#fbfbfb", line: "#8d8d8d", socket: "#2a2233", petal: "#e91e63", accent: "#00897b" },
      // hoogtijdagen ronde 3
      galileo: dark
        ? { star: "#ffffff", glow: "#cfe3ff", bands: ["#e9d3a6", "#c79a62", "#f2e4c4", "#b5834f", "#dfbf8c", "#c29a6c", "#ecd8b0"], spot: "#b5502e", limb: "rgba(0,0,0,.5)", rim: null, axis: "rgba(255,255,255,.28)", moon: "#fff6dc", moonGlow: "#ffe9b0", fall: ["#ffffff", "#cfe3ff", "#fff6dc"] }
        : { star: "#5f6a78", glow: "#c9d9e8", bands: ["#c9a56a", "#a97a42", "#d9c08a", "#936230", "#bf9556", "#a67a48", "#cfb078"], spot: "#8f3a1c", limb: "rgba(40,20,0,.38)", rim: "#6f4a22", axis: "rgba(60,50,40,.4)", moon: "#8a6a10", moonGlow: "#ffd76a", fall: ["#6b7680", "#8a6a10", "#5f6a78"] },
      magna: dark
        ? { sheet: "#e8d9b0", edge: null, ink: "#3a2a18", rollHi: "#f3e7c4", rollMid: "#d6c08a", rollLow: "#a98f55", rollEnd: "#8a7340", wax: "#c0392b", waxDark: "#7d1712", init: "#2f5fb3", scrap: "#e8d9b0", quill: ["#f5efe0", "#d7ccb0", "#c9b88a"], spine: "#8a7340" }
        : { sheet: "#ecdcae", edge: "#8a6a30", ink: "#3a2a18", rollHi: "#f0e2b4", rollMid: "#d3b979", rollLow: "#a58a4c", rollEnd: "#7a6330", wax: "#b3261e", waxDark: "#6e120d", init: "#1d4f91", scrap: "#ecdcae", quill: ["#fbf6e8", "#cdbd92", "#b8a06a"], spine: "#7a6330" },
      rome476: dark
        ? { leaf: "#7cb342", vein: "#c9a227", stem: "#9ccc65", autumn: ["#d9822b", "#b5651d", "#c9a227"], stone: "#e4dccb", edge: "#8f8774", dust: "#bdb5a4" }
        : { leaf: "#558b2f", vein: "#8a6a10", stem: "#33691e", autumn: ["#b5651d", "#8f4a14", "#a9781a"], stone: "#8d8472", edge: "#463f33", dust: "#8d8472" },
      tut: dark
        ? { gold: "#f4c430", goldDeep: "#b8860b", goldHi: "#fff1b8", blue: "#2f6fd6", blueDark: "#183a85", kohl: "#15110c", glow: "#ffd76a", dust: ["#ffd76a", "#fff6dc", "#f4c430"], ankh: "#f4c430" }
        : { gold: "#c9962a", goldDeep: "#6e4f06", goldHi: "#f0d078", blue: "#1f58c0", blueDark: "#12337a", kohl: "#15110c", glow: "#ffe082", dust: ["#c9962a", "#8a6a10", "#a9781a"], ankh: "#8a6a10" },
      nobel: dark
        ? { gold: "#f4c430", goldHi: "#fff1b8", goldDeep: "#b8860b", coin: "#f4c430", coinRim: "#c9962a", ribbon: "#1d4f91", ribbonEdge: "#f1c40f", beam: "255,230,150", beamA: 0.26, glit: ["#ffd76a", "#fff6dc", "#ffffff"] }
        : { gold: "#c9962a", goldHi: "#f0d078", goldDeep: "#7a5a08", coin: "#d4a72c", coinRim: "#8a6a10", ribbon: "#1d4f91", ribbonEdge: "#e0b000", beam: "201,150,42", beamA: 0.18, glit: ["#c9962a", "#8a6a10", "#6b7680"] },
    };
  }

  // ── Vormen (getekend rond de oorsprong; de laag vertaalt/draait) ───────────
  function heart(ctx, s) {                 // twee cirkels + gekantelde ruit
    const a = s * 0.6;
    ctx.beginPath();
    ctx.arc(-a * 0.35, -a * 0.28, a * 0.5, 0, TAU);
    ctx.arc(a * 0.35, -a * 0.28, a * 0.5, 0, TAU);
    ctx.moveTo(-a * 0.83, -a * 0.05); ctx.lineTo(0, a * 0.8); ctx.lineTo(a * 0.83, -a * 0.05); ctx.closePath();
    ctx.fill();
  }
  function egg(ctx, w, h, col, pat, col2, line) {
    ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU);
    ctx.fillStyle = col; ctx.fill();
    ctx.save(); ctx.clip();
    ctx.fillStyle = col2;
    if (pat === 0) { ctx.fillRect(-w, -h * 0.22, 2 * w, h * 0.12); ctx.fillRect(-w, h * 0.08, 2 * w, h * 0.12); }
    else if (pat === 1) { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { ctx.beginPath(); ctx.arc(i * w * 0.28 + (j % 2 ? w * 0.14 : 0), j * h * 0.26, w * 0.09, 0, TAU); ctx.fill(); } }
    else { ctx.beginPath(); for (let i = 0; i <= 8; i++) { const x = -w / 2 + (w / 8) * i, y = (i % 2 ? -1 : 1) * h * 0.07; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.lineWidth = h * 0.09; ctx.strokeStyle = col2; ctx.stroke(); }
    ctx.restore();
    ctx.lineWidth = 1; ctx.strokeStyle = line; ctx.beginPath(); ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); ctx.stroke();
  }
  function pumpkin(ctx, r, P) {
    const c = P.pumpkin;
    ctx.fillStyle = c.stem; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-r * 0.12, -r * 1.25, r * 0.24, r * 0.4, r * 0.06) : ctx.rect(-r * 0.12, -r * 1.25, r * 0.24, r * 0.4); ctx.fill();
    ctx.fillStyle = c.deep; ctx.beginPath(); ctx.ellipse(-r * 0.55, 0, r * 0.45, r * 0.9, 0, 0, TAU); ctx.ellipse(r * 0.55, 0, r * 0.45, r * 0.9, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = c.side; ctx.beginPath(); ctx.ellipse(-r * 0.3, 0, r * 0.45, r * 0.95, 0, 0, TAU); ctx.ellipse(r * 0.3, 0, r * 0.45, r * 0.95, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = c.body; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.42, r, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = c.face;                                        // grijns
    ctx.beginPath(); ctx.moveTo(-r * 0.45, -r * 0.15); ctx.lineTo(-r * 0.15, -r * 0.15); ctx.lineTo(-r * 0.3, -r * 0.45); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(r * 0.45, -r * 0.15); ctx.lineTo(r * 0.15, -r * 0.15); ctx.lineTo(r * 0.3, -r * 0.45); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-r * 0.5, r * 0.25);
    for (let i = 1; i <= 6; i++) ctx.lineTo(-r * 0.5 + (r / 6) * i, r * 0.25 + (i % 2 ? r * 0.18 : 0));
    ctx.lineTo(r * 0.5, r * 0.55); ctx.lineTo(-r * 0.5, r * 0.55); ctx.closePath(); ctx.fill();
  }
  function ghost(ctx, r, P) {
    const g = P.ghost;
    ctx.beginPath(); ctx.arc(0, -r * 0.2, r, Math.PI, 0);
    ctx.lineTo(r, r * 0.9);
    for (let i = 0; i < 3; i++) ctx.arc(r - r * (2 / 3) * (i + 0.5), r * 0.9, r / 3, 0, Math.PI);
    ctx.closePath(); ctx.fillStyle = g.fill; ctx.fill();
    if (g.line) { ctx.lineWidth = 1; ctx.strokeStyle = g.line; ctx.stroke(); }
    ctx.fillStyle = g.eye; ctx.beginPath(); ctx.ellipse(-r * 0.35, -r * 0.3, r * 0.13, r * 0.2, 0, 0, TAU); ctx.ellipse(r * 0.35, -r * 0.3, r * 0.13, r * 0.2, 0, 0, TAU); ctx.fill();
  }
  function snowflake(ctx, r) {
    ctx.beginPath();
    for (let k = 0; k < 6; k++) {
      const a = k * Math.PI / 3, c = Math.cos(a), s = Math.sin(a);
      ctx.moveTo(0, 0); ctx.lineTo(c * r, s * r);
      for (const d of [-1, 1]) { const b = a + d * Math.PI / 3; ctx.moveTo(c * r * 0.55, s * r * 0.55); ctx.lineTo(c * r * 0.55 + Math.cos(b) * r * 0.3, s * r * 0.55 + Math.sin(b) * r * 0.3); }
    }
    ctx.stroke();
  }
  function star5(ctx, r) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  }
  function sparkle(ctx, r) { ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke(); }

  // Gloed-sprite (ronde radial gradient naar dezelfde tint met alfa 0), gecachet per kleur.
  const hexA = (col, a) => { const n = parseInt(col.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; };
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
  // lineaire luchtweerstand + zwaartekracht (gesloten vorm), zie vuurwerk
  function kin(p, s) {
    const ek = Math.exp(-p.k * s), E = (1 - ek) / p.k, gk = p.g / p.k;
    return [p.x0 + p.vx * E, p.y0 + gk * s + (p.vy - gk) * E, p.vx * ek, gk + (p.vy - gk) * ek];
  }

  // ── Mechanieken ─────────────────────────────────────────────────────────────
  // Vallen: items dalen lineair van boven naar onder met zwaai en (om)draai.
  function fallLayer(items, end, stats) {
    return { end, draw(ctx, t, W, H) {
      for (const it of items) {
        const u = (t - it.delay) / it.dur; if (u < 0 || u > 1) continue;
        const x = it.x * W + Math.sin(it.ph + u * it.swf) * it.sway, y = -it.top + (H + it.top + 30) * u;
        ctx.globalAlpha = (u < 0.88 ? 1 : 1 - (u - 0.88) / 0.12) * (it.alpha || 1);
        ctx.save(); ctx.translate(x, y); ctx.rotate(it.rot(u)); it.draw(ctx, u, t); ctx.restore(); stats.drawn++;
      }
      ctx.globalAlpha = 1;
    } };
  }
  // Stijgen: items zweven van onder naar boven, wiegend, en lossen bovenin op.
  function riseLayer(items, end, stats) {
    return { end, draw(ctx, t, W, H) {
      for (const it of items) {
        const s = t - it.delay; if (s < 0) continue;
        const y = H + 40 - it.vy * s; if (y < -80) continue;
        const x = it.x * W + Math.sin(it.ph + it.wob * s) * it.amp;
        ctx.globalAlpha = clamp(s / 0.25, 0, 1) * clamp((y - 0.05 * H) / (0.18 * H), 0, 1) * clamp((end - t) / 0.4, 0, 1);
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.cos(it.ph + it.wob * s) * it.tilt); it.draw(ctx, s); ctx.restore(); stats.drawn++;
      }
      ctx.globalAlpha = 1;
    } };
  }
  // Slingers (uit de confetti-mockup): krullinten met glansstreep.
  function streamerLayer(cols, count, W, H, S, delay0, end, stats) {
    const HS = H / 844, N = 16;
    const ribs = Array.from({ length: count }, (_, i) => ({ x: 0.06 + ((i * PHI) % 1) * 0.88, birth: delay0 + rnd(0, 0.9), vy: rnd(130, 190) * HS,
      len: rnd(160, 260) * S, amp: rnd(8, 16) * S, freq: rnd(0.05, 0.085), ph: rnd(0, TAU), drift: rnd(-22, 22) * S, w: rnd(3, 4.2) * S,
      col: cols[i % cols.length], wob: rnd(2.4, 3.8) }));
    return { end, draw(ctx, t, W2, H2) {
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      for (const r of ribs) {
        const s = t - r.birth; if (s < 0) continue;
        const hy = -r.len * 0.2 + r.vy * s, hx = r.x * W2 + r.drift * s;
        if (hy - r.len > H2) continue;
        const seg = r.len / N, pts = [];
        for (let i = 0; i <= N; i++) pts.push([hx + Math.sin(r.ph + i * seg * r.freq + s * r.wob) * r.amp * (0.2 + 0.8 * i / N), hy - i * seg]);
        const a = clamp(1 - Math.max(0, hy - H2) / r.len, 0, 1) * clamp((end - t) / 0.5, 0, 1);
        const trace = (ox) => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x + ox, y) : ctx.moveTo(x + ox, y)); ctx.stroke(); };
        ctx.globalAlpha = a; ctx.strokeStyle = r.col; ctx.lineWidth = r.w; trace(0);
        ctx.globalAlpha = a * 0.4; ctx.strokeStyle = "#ffffff"; ctx.lineWidth = r.w * 0.3; trace(-r.w * 0.22);
        stats.drawn += N;
      }
      ctx.globalAlpha = 1;
    } };
  }
  // Kanon (uit de confetti-mockup): twee party-poppers uit de onderhoeken.
  function cannonLayer(cols, W, H, S, end, stats) {
    const HS = H / 844, parts = [];
    for (const [fx, dir] of [[0.03, 1], [0.97, -1]]) for (let i = 0; i < 60; i++) {
      const ang = rnd(6, 26) * Math.PI / 180, v = rnd(1250, 1650) * HS;
      parts.push({ x0: fx * W, y0: H + 6, vx: Math.sin(ang) * v * dir, vy: -Math.cos(ang) * v, k: 1.5, g: 700 * HS,
        birth: rnd(0, 0.14), life: rnd(2.3, 2.9), w: rnd(6, 9) * S, h: rnd(9, 15) * S, rot: rnd(0, TAU), vr: rnd(-7, 7), ph: rnd(0, TAU), sw: rnd(1.6, 3.2), col: pick(cols) });
    }
    return { end, draw(ctx, t, W2, H2) {
      for (const p of parts) {
        const s = t - p.birth; if (s < 0 || s > p.life) continue;
        const q = kin(p, s), u = s / p.life, x = q[0] + Math.sin(p.ph + s * p.sw) * 12 * S * Math.min(1, s), y = q[1];
        if (y > H2 + 20) continue;
        ctx.globalAlpha = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3;
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot + p.vr * Math.min(s, 1.2) * Math.exp(-s * 0.6));
        ctx.fillStyle = p.col; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * (0.35 + 0.65 * Math.abs(Math.cos(p.ph + s * 6))));
        ctx.restore(); stats.drawn++;
      }
      ctx.globalAlpha = 1;
    } };
  }

  // ── Nieuwjaar: gouden en zilveren slingers door een regen van glitter ───────
  function newYearLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), c = P.newyear;
    const glitter = Array.from({ length: 70 }, () => ({ x: Math.random(), delay: rnd(0, 1.0), dur: rnd(2.2, 3.0), top: 20, sway: rnd(6, 14) * S, swf: rnd(5, 9), ph: rnd(0, TAU),
      rot: (u) => u * 3, r: rnd(2.2, 4.5) * S, tw: rnd(8, 14), col: pick(c.glitter),
      draw(ctx, u, t) { const k = 0.45 + 0.55 * Math.abs(Math.sin(this.ph + this.tw * t)); ctx.globalAlpha *= k; ctx.strokeStyle = this.col; ctx.lineWidth = 1.3 * S; sparkle(ctx, this.r); } }));
    const g = fallLayer(glitter, 3.6, stats);
    const gl = { end: 3.6, draw(ctx, t, W2, H2) { ctx.globalCompositeOperation = P.comp; g.draw(ctx, t, W2, H2); ctx.globalCompositeOperation = "source-over"; } };
    return [gl, streamerLayer(c.streamers, 12, W, H, S, 0, 3.6, stats)];
  }

  // ── Valentijn: hartjes zweven omhoog ────────────────────────────────────────
  function valentineLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), HS = H / 844;
    const items = Array.from({ length: 22 }, (_, i) => ({ x: 0.06 + ((i * PHI) % 1) * 0.88, delay: rnd(0, 1.1), vy: rnd(230, 340) * HS, ph: rnd(0, TAU), wob: rnd(1.4, 2.4), amp: rnd(8, 18) * S, tilt: 0.25,
      s: rnd(9, 20) * S, col: pick(P.hearts), draw(ctx) { ctx.fillStyle = this.col; heart(ctx, this.s); } }));
    return [riseLayer(items, 3.4, stats)];
  }

  // ── Carnaval: kanon in carnavalskleuren + serpentines ───────────────────────
  function carnivalLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H);
    return [cannonLayer(P.carnival, W, H, S, 3.2, stats), streamerLayer(P.carnival, 8, W, H, S, 0.25, 3.2, stats)];
  }

  // ── Pasen: beschilderde eieren tuimelen zachtjes omlaag ─────────────────────
  function easterLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H);
    const items = Array.from({ length: 26 }, (_, i) => {
      const ci = (Math.random() * P.eggs.length) | 0, w = rnd(13, 19) * S;
      return { x: 0.05 + ((i * PHI) % 1) * 0.9, delay: rnd(0, 0.8), dur: rnd(2.3, 3.0), top: 40, sway: rnd(8, 18) * S, swf: rnd(3, 5), ph: rnd(0, TAU),
        rot: (u) => Math.sin(this_ph(i) + u * 4) * 0.55, w, h: w * 1.3, col: P.eggs[ci], col2: P.eggs[(ci + 2 + ((Math.random() * 3) | 0)) % P.eggs.length], pat: i % 3,
        draw(ctx) { egg(ctx, this.w, this.h, this.col, this.pat, this.col2, P.eggLine); } };
    });
    return [fallLayer(items, 3.8, stats)];
  }
  const this_ph = (i) => i * 1.7;

  // ── Halloween: pompoenen tuimelen omlaag, spookjes zweven omhoog ────────────
  function halloweenLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), HS = H / 844;
    const pumpkins = Array.from({ length: 16 }, (_, i) => ({ x: 0.06 + ((i * PHI) % 1) * 0.88, delay: rnd(0, 0.9), dur: rnd(2.2, 3.0), top: 50, sway: rnd(6, 14) * S, swf: rnd(3, 5), ph: rnd(0, TAU),
      rot: ((r0, vr) => (u) => r0 + vr * u)(rnd(-0.4, 0.4), rnd(-2.5, 2.5)), r: rnd(9, 14) * S, draw(ctx) { pumpkin(ctx, this.r, P); } }));
    const ghosts = Array.from({ length: 5 }, (_, i) => ({ x: 0.12 + ((i * PHI + 0.3) % 1) * 0.76, delay: rnd(0.2, 1.4), vy: rnd(170, 240) * HS, ph: rnd(0, TAU), wob: rnd(1.2, 1.8), amp: rnd(14, 26) * S, tilt: 0.12,
      r: rnd(13, 18) * S, draw(ctx) { ghost(ctx, this.r, P); } }));
    return [fallLayer(pumpkins, 3.8, stats), riseLayer(ghosts, 3.8, stats)];
  }

  // ── Kerst: zachte sneeuwval met een paar sterretjes ─────────────────────────
  function xmasLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), c = P.snow;
    const dots = Array.from({ length: 90 }, () => ({ x: Math.random(), delay: rnd(0, 0.9), dur: rnd(2.4, 3.1), top: 10, sway: rnd(6, 16) * S, swf: rnd(2, 4), ph: rnd(0, TAU), rot: () => 0,
      r: rnd(1.4, 3.4) * S, col: pick(c.dots), alpha: rnd(0.6, 1), draw(ctx) { ctx.fillStyle = this.col; ctx.beginPath(); ctx.arc(0, 0, this.r, 0, TAU); ctx.fill(); } }));
    const flakes = Array.from({ length: 12 }, (_, i) => ({ x: 0.05 + ((i * PHI) % 1) * 0.9, delay: rnd(0, 0.9), dur: rnd(2.6, 3.2), top: 30, sway: rnd(10, 20) * S, swf: rnd(2, 3.5), ph: rnd(0, TAU),
      rot: ((vr) => (u) => vr * u)(rnd(-2, 2)), r: rnd(7, 12) * S, col: pick(c.flakes), draw(ctx) { ctx.strokeStyle = this.col; ctx.lineWidth = 1.4 * S; ctx.lineCap = "round"; snowflake(ctx, this.r); } }));
    const stars = Array.from({ length: 6 }, (_, i) => ({ x: 0.1 + ((i * PHI + 0.5) % 1) * 0.8, delay: rnd(0, 0.8), dur: rnd(2.8, 3.2), top: 30, sway: rnd(4, 10) * S, swf: 2, ph: rnd(0, TAU),
      rot: (u) => u * 1.5, r: rnd(5, 8) * S, tw: rnd(6, 10), draw(ctx, u, t) { ctx.globalAlpha *= 0.55 + 0.45 * Math.abs(Math.sin(this.ph + this.tw * t)); ctx.fillStyle = c.star; star5(ctx, this.r); } }));
    const inner = [fallLayer(dots, 4.0, stats), fallLayer(flakes, 4.0, stats), fallLayer(stars, 4.0, stats)];
    return [{ end: 4.0, draw(ctx, t, W2, H2) { ctx.globalCompositeOperation = P.comp; for (const l of inner) l.draw(ctx, t, W2, H2); ctx.globalCompositeOperation = "source-over"; } }];
  }

  // ── Ronde 2: extra vormen ───────────────────────────────────────────────────
  function rrect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fanous(ctx, w, h, col, glow) {         // Eid-lantaarn: kap, romp met verlicht venster, punt
    ctx.fillStyle = col;
    ctx.fillRect(-w * 0.06, -h * 0.5, w * 0.12, h * 0.1);
    ctx.fillRect(-w * 0.32, -h * 0.42, w * 0.64, h * 0.12);
    rrect(ctx, -w / 2, -h * 0.3, w, h * 0.6, w * 0.18); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-w * 0.3, h * 0.3); ctx.lineTo(0, h * 0.5); ctx.lineTo(w * 0.3, h * 0.3); ctx.closePath(); ctx.fill();
    const a = ctx.globalAlpha; ctx.globalAlpha = a * 0.9; ctx.fillStyle = glow;
    rrect(ctx, -w * 0.3, -h * 0.22, w * 0.6, h * 0.44, w * 0.14); ctx.fill(); ctx.globalAlpha = a;
  }
  function crescent(ctx, r, col) {                 // maansikkel, opening naar rechts
    ctx.fillStyle = col; ctx.beginPath();
    ctx.arc(0, 0, r, -1.115, 1.115, true);
    ctx.arc(r * 0.5, 0, r * 0.9, 1.637, 4.646, false);
    ctx.closePath(); ctx.fill();
  }
  function redLantern(ctx, r, c) {                 // Chinese lampion met gouden kap en kwast
    ctx.fillStyle = c.gold; ctx.fillRect(-r * 0.35, -r * 0.95, r * 0.7, r * 0.18); ctx.fillRect(-r * 0.3, r * 0.75, r * 0.6, r * 0.16);
    ctx.strokeStyle = c.gold; ctx.lineWidth = Math.max(1, r * 0.08); ctx.beginPath(); ctx.moveTo(0, r * 0.9); ctx.lineTo(0, r * 1.5); ctx.stroke();
    ctx.fillStyle = c.gold; ctx.beginPath(); ctx.moveTo(-r * 0.12, r * 1.45); ctx.lineTo(r * 0.12, r * 1.45); ctx.lineTo(r * 0.16, r * 1.85); ctx.lineTo(-r * 0.16, r * 1.85); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.body; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = c.bodyDark; ctx.lineWidth = Math.max(1, r * 0.07);
    for (const k of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.ellipse(k * r * 0.6, 0, Math.max(1, r * (1 - Math.abs(k)) * 0.5), r * 0.8, 0, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.beginPath(); ctx.ellipse(-r * 0.4, -r * 0.3, r * 0.16, r * 0.28, -0.4, 0, TAU); ctx.fill();
  }
  function diya(ctx, r, c, flick) {                // olielampje: kommetje + vlam
    ctx.fillStyle = c.clayDark; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.28, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = c.clay; ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.28, 0, 0, Math.PI); ctx.lineTo(-r, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.clayDark; ctx.beginPath(); ctx.ellipse(0, r * 0.05, r * 0.72, r * 0.16, 0, 0, TAU); ctx.fill();
    const fh = r * 1.05 * flick, fw = r * 0.32;
    ctx.fillStyle = c.flame; ctx.beginPath(); ctx.moveTo(0, -fh); ctx.bezierCurveTo(fw, -fh * 0.55, fw * 1.1, -r * 0.1, 0, r * 0.02); ctx.bezierCurveTo(-fw * 1.1, -r * 0.1, -fw, -fh * 0.55, 0, -fh); ctx.fill();
    ctx.fillStyle = c.flameCore; ctx.beginPath(); ctx.moveTo(0, -fh * 0.55); ctx.bezierCurveTo(fw * 0.45, -fh * 0.3, fw * 0.5, -r * 0.05, 0, r * 0.0); ctx.bezierCurveTo(-fw * 0.5, -r * 0.05, -fw * 0.45, -fh * 0.3, 0, -fh * 0.55); ctx.fill();
  }
  function crown(ctx, w, h, col, jewels) {
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(-w / 2, h * 0.5); ctx.lineTo(-w / 2, -h * 0.45); ctx.lineTo(-w / 6, -h * 0.05); ctx.lineTo(0, -h * 0.5); ctx.lineTo(w / 6, -h * 0.05); ctx.lineTo(w / 2, -h * 0.45); ctx.lineTo(w / 2, h * 0.5); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 3; i++) { ctx.fillStyle = jewels[i % jewels.length]; ctx.beginPath(); ctx.arc((i - 1) * w * 0.3, h * 0.22, h * 0.13, 0, TAU); ctx.fill(); }
  }
  function shamrock(ctx, r, col) {
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, r * 0.2); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(0, r * 0.1); ctx.quadraticCurveTo(r * 0.15, r * 0.7, r * 0.35, r * 1.15); ctx.stroke();
    for (const a of [-Math.PI / 2, Math.PI / 6, Math.PI * 5 / 6]) {
      const cx = Math.cos(a) * r * 0.5, cy = Math.sin(a) * r * 0.5;
      ctx.beginPath(); ctx.arc(cx + Math.cos(a + 0.9) * r * 0.22, cy + Math.sin(a + 0.9) * r * 0.22, r * 0.36, 0, TAU); ctx.arc(cx + Math.cos(a - 0.9) * r * 0.22, cy + Math.sin(a - 0.9) * r * 0.22, r * 0.36, 0, TAU); ctx.fill();
    }
  }
  function coin(ctx, r, c, flip) {
    const rx = Math.max(r * 0.12, r * Math.abs(flip));
    ctx.fillStyle = c.coin; ctx.beginPath(); ctx.ellipse(0, 0, rx, r, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = c.coinRim; ctx.lineWidth = Math.max(1, r * 0.14); ctx.stroke();
    if (rx > r * 0.5) { ctx.beginPath(); ctx.ellipse(0, 0, rx * 0.62, r * 0.62, 0, 0, TAU); ctx.stroke(); ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.ellipse(-rx * 0.35, -r * 0.35, rx * 0.2, r * 0.2, 0, 0, TAU); ctx.fill(); }
  }

  // ── Eid al-Fitr: maansikkel, fanous-lantaarns omhoog, zachte sterretjes ─────
  function eidLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), HS = H / 844, c = P.eid;
    const glow = glowSprite(c.glow, true);
    const lanterns = Array.from({ length: 7 }, (_, i) => ({ x: 0.1 + ((i * PHI + 0.15) % 1) * 0.8, delay: rnd(0, 1.2), vy: rnd(180, 260) * HS, ph: rnd(0, TAU), wob: rnd(1.0, 1.6), amp: rnd(6, 12) * S, tilt: 0.08,
      w: rnd(13, 19) * S, col: c.lantern[i % c.lantern.length], draw(ctx) { const d = this.w * 4; ctx.save(); ctx.globalAlpha *= 0.35; ctx.drawImage(glow, -d / 2, -d / 2, d, d); ctx.restore(); fanous(ctx, this.w, this.w * 1.6, this.col, c.glow); } }));
    const stars = Array.from({ length: 40 }, () => ({ x: Math.random(), delay: rnd(0, 1.2), dur: rnd(2.4, 3.2), top: 20, sway: rnd(4, 10) * S, swf: rnd(2, 4), ph: rnd(0, TAU), rot: (u) => u * 2, r: rnd(2, 4) * S, tw: rnd(6, 12), col: c.star,
      draw(ctx, u, t) { ctx.globalAlpha *= 0.5 + 0.5 * Math.abs(Math.sin(this.ph + this.tw * t)); ctx.strokeStyle = this.col; ctx.lineWidth = 1.2 * S; sparkle(ctx, this.r); } }));
    const rise = riseLayer(lanterns, 3.8, stats), fall = fallLayer(stars, 3.8, stats);
    return [{ end: 3.8, draw(ctx, t, W2, H2) {
      ctx.globalCompositeOperation = P.comp; fall.draw(ctx, t, W2, H2); ctx.globalCompositeOperation = "source-over";
      const a = clamp(t / 0.6, 0, 1) * clamp((3.8 - t) / 0.6, 0, 1), r = 26 * S, mx = W2 * 0.8, my = H2 * 0.14;
      ctx.globalAlpha = a * 0.5; const d = r * 5; ctx.globalCompositeOperation = P.comp; ctx.drawImage(glow, mx - d / 2, my - d / 2, d, d); ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = a; ctx.save(); ctx.translate(mx, my); ctx.rotate(-0.35); crescent(ctx, r, c.moon); ctx.restore();
      ctx.save(); ctx.translate(mx + r * 0.95, my - r * 0.55); ctx.fillStyle = c.moon; star5(ctx, r * 0.28); ctx.restore(); stats.drawn += 2;
      ctx.globalAlpha = 1;
      rise.draw(ctx, t, W2, H2);
    } }];
  }

  // ── Diwali: rij olielampjes onderin die één voor één aangaan, warme vonkjes ─
  function diwaliLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), c = P.diwali, n = 9;
    const glow = glowSprite(c.flame, true);
    const diyas = Array.from({ length: n }, (_, i) => ({ x: (i + 0.5) / n, birth: 0.12 * i, seed: rnd(0, TAU), r: rnd(12, 15) * S }));
    const sparks = Array.from({ length: 45 }, () => { const d = pick(diyas); return { dx: d.x, x0: 0, y0: 0, vx: rnd(-22, 22) * S, vy: rnd(-90, -170) * S, k: 1.2, g: -12 * S, birth: rnd(0.6, 2.8), life: rnd(0.9, 1.7), r: rnd(1.6, 3) * S, col: pick(c.spark), seed: (Math.random() * 1e4) | 0 }; });
    const petals = Array.from({ length: 30 }, () => ({ x: Math.random(), delay: rnd(0, 1.2), dur: rnd(2.6, 3.3), top: 20, sway: rnd(8, 16) * S, swf: rnd(2, 4), ph: rnd(0, TAU), rot: ((r0, vr) => (u) => r0 + vr * u)(rnd(0, TAU), rnd(-3, 3)),
      rx: rnd(2.5, 3.5) * S, col: pick(c.petals), draw(ctx) { ctx.fillStyle = this.col; ctx.beginPath(); ctx.ellipse(0, 0, this.rx, this.rx * 1.7, 0, 0, TAU); ctx.fill(); } }));
    const fall = fallLayer(petals, 3.9, stats);
    return [{ end: 3.9, draw(ctx, t, W2, H2) {
      fall.draw(ctx, t, W2, H2);
      const fadeOut = clamp((3.9 - t) / 0.6, 0, 1), baseY = H2 - 28 * S;
      ctx.globalCompositeOperation = P.comp;
      for (const d of diyas) {
        const s = t - d.birth; if (s < 0) continue;
        const sc = clamp(s / 0.25, 0, 1), flick = 0.85 + 0.15 * Math.sin(t * 17 + d.seed) + 0.05 * Math.sin(t * 31 + d.seed * 2);
        const x = d.x * W2;
        ctx.globalAlpha = 0.45 * sc * fadeOut; const g = d.r * 5 * flick; ctx.drawImage(glow, x - g / 2, baseY - d.r * 0.6 - g / 2, g, g);
        ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = sc * fadeOut;
        ctx.save(); ctx.translate(x, baseY); ctx.scale(0.6 + 0.4 * sc, 0.6 + 0.4 * sc); diya(ctx, d.r, c, flick); ctx.restore();
        ctx.globalCompositeOperation = P.comp; stats.drawn++;
      }
      for (const p of sparks) {
        const s = t - p.birth; if (s < 0 || s > p.life) continue;
        const u = s / p.life; if (u > 0.5 && (p.seed + ((t * 20) | 0)) % 4 === 0) continue;
        const q = kin(p, s), x = p.dx * W2 + q[0], y = baseY - 16 * S + q[1], dd = p.r / 0.35 * (1 - 0.3 * u);
        ctx.globalAlpha = (u < 0.6 ? 1 : (1 - u) / 0.4) * fadeOut; ctx.drawImage(glowSprite(p.col), x - dd / 2, y - dd / 2, dd, dd); stats.drawn++;
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    } }];
  }

  // ── Lunar Nieuwjaar: rode lampions omhoog, gouden glitter ───────────────────
  function lunarLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), HS = H / 844, c = P.lunar;
    const lanterns = Array.from({ length: 8 }, (_, i) => ({ x: 0.1 + ((i * PHI + 0.4) % 1) * 0.8, delay: rnd(0, 1.1), vy: rnd(200, 300) * HS, ph: rnd(0, TAU), wob: rnd(1.0, 1.7), amp: rnd(6, 14) * S, tilt: 0.1,
      r: rnd(11, 17) * S, draw(ctx) { redLantern(ctx, this.r, c); } }));
    const glitter = Array.from({ length: 40 }, () => ({ x: Math.random(), delay: rnd(0, 1.2), dur: rnd(2.4, 3.2), top: 20, sway: rnd(4, 10) * S, swf: rnd(3, 6), ph: rnd(0, TAU), rot: (u) => u * 3, r: rnd(2, 4) * S, tw: rnd(8, 14), col: pick(c.glitter),
      draw(ctx, u, t) { ctx.globalAlpha *= 0.5 + 0.5 * Math.abs(Math.sin(this.ph + this.tw * t)); ctx.strokeStyle = this.col; ctx.lineWidth = 1.2 * S; sparkle(ctx, this.r); } }));
    const fall = fallLayer(glitter, 3.8, stats);
    return [{ end: 3.8, draw(ctx, t, W2, H2) { ctx.globalCompositeOperation = P.comp; fall.draw(ctx, t, W2, H2); ctx.globalCompositeOperation = "source-over"; } }, riseLayer(lanterns, 3.8, stats)];
  }

  // ── Driekoningen: de ster trekt over met een glitterspoor, kroontjes dalen ──
  function kingsLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), c = P.kings;
    const T = 1.7, path = (u) => [(-0.08 + 1.16 * u) * W, (0.17 - 0.07 * u) * H];
    const trail = Array.from({ length: 44 }, (_, i) => ({ tb: (i / 44) * T, r: rnd(2, 4.5) * S, dx: rnd(-6, 6) * S, vy: rnd(20, 50) * S, ph: rnd(0, TAU), tw: rnd(8, 14) }));
    const crowns = Array.from({ length: 3 }, (_, i) => ({ x: [0.2, 0.5, 0.8][i], delay: 0.5 + i * 0.55, dur: rnd(2.4, 2.8), top: 50, sway: rnd(8, 14) * S, swf: 2.5, ph: rnd(0, TAU), rot: ((r0) => (u) => r0 + Math.sin(u * 5) * 0.25)(rnd(-0.2, 0.2)),
      w: rnd(24, 30) * S, jewels: [[c.red, c.purple], [c.purple, c.red], [c.red, c.purple]][i], draw(ctx) { crown(ctx, this.w, this.w * 0.7, c.gold, this.jewels); } }));
    const stars = Array.from({ length: 22 }, () => ({ x: Math.random(), delay: rnd(0.3, 1.5), dur: rnd(2.3, 3.0), top: 20, sway: rnd(6, 12) * S, swf: rnd(2, 4), ph: rnd(0, TAU), rot: (u) => u * 2.5, r: rnd(3.5, 6.5) * S, tw: rnd(6, 10), col: pick([c.gold, c.goldDeep, c.star]),
      draw(ctx, u, t) { ctx.globalAlpha *= 0.6 + 0.4 * Math.abs(Math.sin(this.ph + this.tw * t)); ctx.fillStyle = this.col; star5(ctx, this.r); } }));
    const fallC = fallLayer(crowns, 3.8, stats), fallS = fallLayer(stars, 3.8, stats), glow = glowSprite(c.trail, true);
    return [{ end: 3.8, draw(ctx, t, W2, H2) {
      ctx.globalCompositeOperation = P.comp;
      for (const p of trail) {
        const s = t - p.tb; if (s < 0 || s > 0.9) continue;
        const [px, py] = path(p.tb / T), u = s / 0.9;
        ctx.globalAlpha = (1 - u) * (0.55 + 0.45 * Math.abs(Math.sin(p.ph + p.tw * t)));
        ctx.strokeStyle = c.trail; ctx.lineWidth = 1.2 * S; ctx.save(); ctx.translate(px + p.dx, py + p.vy * s); sparkle(ctx, p.r * (1 - 0.5 * u)); ctx.restore(); stats.drawn++;
      }
      if (t < T + 0.5) {
        const u = clamp(t / T, 0, 1), [sx, sy] = path(u), a = clamp(t / 0.3, 0, 1) * clamp((T + 0.5 - t) / 0.5, 0, 1);
        const d = 90 * S; ctx.globalAlpha = a * 0.6; ctx.drawImage(glow, sx - d / 2, sy - d / 2, d, d);
        ctx.globalAlpha = a; ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.8); ctx.fillStyle = c.star; star5(ctx, 15 * S); ctx.restore(); stats.drawn++;
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      fallS.draw(ctx, t, W2, H2); fallC.draw(ctx, t, W2, H2);
    } }];
  }

  // ── Pride: regenboog trekt over de bovenkant, confetti in zes kleuren ───────
  function prideLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), cols = P.pride;
    const pieces = Array.from({ length: 70 }, () => ({ x: Math.random(), delay: rnd(0.4, 1.6), dur: rnd(2.0, 2.6), top: 20, sway: rnd(6, 14) * S, swf: rnd(3, 6), ph: rnd(0, TAU), rot: ((vr) => (u) => vr * u)(rnd(-8, 8)),
      w: rnd(5, 7) * S, h: rnd(9, 12) * S, col: pick(cols), draw(ctx, u) { ctx.fillStyle = this.col; ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h * (0.35 + 0.65 * Math.abs(Math.cos(this.ph + u * 12)))); } }));
    const fall = fallLayer(pieces, 3.7, stats);
    return [{ end: 3.7, draw(ctx, t, W2, H2) {
      const R = 0.54 * W2, cx = W2 / 2, cy = 0.08 * H2 + R, band = 7 * S;
      const prog = 1 - Math.pow(1 - clamp(t / 1.2, 0, 1), 3), a = 0.85 * clamp((3.7 - t) / 0.7, 0, 1);
      if (prog > 0.01 && a > 0) {
        ctx.lineCap = "butt"; ctx.globalAlpha = a;
        for (let i = 0; i < 6; i++) { ctx.strokeStyle = cols[i]; ctx.lineWidth = band + 0.6; ctx.beginPath(); ctx.arc(cx, cy, R - i * band, Math.PI, Math.PI + Math.PI * prog, false); ctx.stroke(); }
        stats.drawn += 6; ctx.globalAlpha = 1;
      }
      fall.draw(ctx, t, W2, H2);
    } }];
  }

  // ── St. Patrick: klavertjes en een paar gouden munten dwarrelen omlaag ──────
  function patrickLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), c = P.patrick;
    const clovers = Array.from({ length: 22 }, (_, i) => ({ x: 0.04 + ((i * PHI) % 1) * 0.92, delay: rnd(0, 1.0), dur: rnd(2.3, 3.0), top: 40, sway: rnd(8, 16) * S, swf: rnd(2.5, 4), ph: rnd(0, TAU), rot: ((r0, vr) => (u) => r0 + vr * u)(rnd(0, TAU), rnd(-2.5, 2.5)),
      r: rnd(7, 11) * S, col: pick(c.greens), draw(ctx) { shamrock(ctx, this.r, this.col); } }));
    const coins = Array.from({ length: 8 }, (_, i) => ({ x: 0.1 + ((i * PHI + 0.5) % 1) * 0.8, delay: rnd(0.2, 1.2), dur: rnd(2.2, 2.8), top: 30, sway: rnd(4, 10) * S, swf: 2, ph: rnd(0, TAU), rot: () => 0,
      r: rnd(6, 8) * S, spin: rnd(5, 9), draw(ctx, u) { coin(ctx, this.r, c, Math.cos(this.ph + u * this.spin)); } }));
    return [fallLayer(clovers, 3.7, stats), fallLayer(coins, 3.7, stats)];
  }

  // ── Día de Muertos: papel-picado-slinger, goudsbloemblaadjes, calaveras ─────
  function papelFlag(ctx, w, h, col, holeCol) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(w / 2, 0); ctx.lineTo(w / 2, h * 0.82);
    for (let i = 4; i >= 0; i--) ctx.lineTo(-w / 2 + (w / 4) * i - w / 8, h); // zigzag-franje
    ctx.lineTo(-w / 2, h * 0.82); ctx.closePath(); ctx.fill();
    ctx.fillStyle = holeCol;                                   // "uitgeknipte" gaatjes
    for (const [px, py, pr] of [[0, 0.3, 0.16], [-0.28, 0.55, 0.09], [0.28, 0.55, 0.09], [0, 0.66, 0.08], [-0.25, 0.22, 0.07], [0.25, 0.22, 0.07]]) {
      ctx.beginPath(); ctx.arc(px * w, py * h, pr * w, 0, TAU); ctx.fill();
    }
  }
  function calavera(ctx, r, c) {
    ctx.fillStyle = c.bone; ctx.beginPath(); ctx.arc(0, -r * 0.15, r, Math.PI, 0); ctx.lineTo(r, r * 0.25);
    ctx.quadraticCurveTo(r, r * 0.6, r * 0.55, r * 0.62); ctx.lineTo(r * 0.55, r * 0.95); ctx.lineTo(-r * 0.55, r * 0.95); ctx.lineTo(-r * 0.55, r * 0.62);
    ctx.quadraticCurveTo(-r, r * 0.6, -r, r * 0.25); ctx.closePath(); ctx.fill();
    if (c.line) { ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.stroke(); }
    for (const sx of [-0.42, 0.42]) {                          // bloem-oogkassen
      ctx.fillStyle = c.petal; for (let k = 0; k < 6; k++) { ctx.beginPath(); ctx.arc(sx * r + Math.cos(k * Math.PI / 3) * r * 0.3, -r * 0.2 + Math.sin(k * Math.PI / 3) * r * 0.3, r * 0.14, 0, TAU); ctx.fill(); }
      ctx.fillStyle = c.socket; ctx.beginPath(); ctx.arc(sx * r, -r * 0.2, r * 0.26, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = c.socket; ctx.beginPath(); ctx.moveTo(0, r * 0.25); ctx.lineTo(-r * 0.1, r * 0.48); ctx.lineTo(r * 0.1, r * 0.48); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c.socket; ctx.lineWidth = Math.max(1, r * 0.07);
    for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(k * r * 0.2, r * 0.66); ctx.lineTo(k * r * 0.2, r * 0.92); ctx.stroke(); }
    ctx.fillStyle = c.accent; ctx.beginPath(); ctx.arc(0, -r * 0.72, r * 0.12, 0, TAU); ctx.fill();
    for (const sx of [-0.3, 0.3]) { ctx.beginPath(); ctx.arc(sx * r, -r * 0.62, r * 0.07, 0, TAU); ctx.fill(); }
  }
  function muertosLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), c = P.muertos;
    const flags = Array.from({ length: 9 }, (_, i) => ({ u: (i + 0.5) / 9, col: c.papel[i % c.papel.length], ph: rnd(0, TAU), w: rnd(22, 28) * S }));
    const petals = Array.from({ length: 44 }, () => ({ x: Math.random(), delay: rnd(0.2, 1.4), dur: rnd(2.4, 3.1), top: 20, sway: rnd(8, 16) * S, swf: rnd(2, 4), ph: rnd(0, TAU), rot: ((r0, vr) => (u) => r0 + vr * u)(rnd(0, TAU), rnd(-3, 3)),
      rx: rnd(2.8, 4) * S, col: pick(c.marigold), draw(ctx) { ctx.fillStyle = this.col; ctx.beginPath(); ctx.ellipse(0, 0, this.rx, this.rx * 1.7, 0, 0, TAU); ctx.fill(); } }));
    const skulls = Array.from({ length: 4 }, (_, i) => ({ x: [0.18, 0.62, 0.4, 0.82][i], delay: 0.4 + i * 0.5, dur: rnd(2.5, 3.0), top: 50, sway: rnd(8, 14) * S, swf: 2.5, ph: rnd(0, TAU), rot: ((r0) => (u) => r0 + Math.sin(u * 5) * 0.3)(rnd(-0.25, 0.25)),
      r: rnd(12, 15) * S, draw(ctx) { calavera(ctx, this.r, c); } }));
    const fallP = fallLayer(petals, 3.9, stats), fallS = fallLayer(skulls, 3.9, stats);
    return [{ end: 3.9, draw(ctx, t, W2, H2) {
      const a = clamp(t / 0.5, 0, 1) * clamp((3.9 - t) / 0.7, 0, 1), y0 = 0.045 * H2, sag = 0.035 * H2;
      ctx.globalAlpha = a; ctx.strokeStyle = c.string; ctx.lineWidth = 1.2 * S;
      ctx.beginPath(); ctx.moveTo(-10, y0); ctx.quadraticCurveTo(W2 / 2, y0 + 2 * sag, W2 + 10, y0); ctx.stroke();
      for (const f of flags) {
        const x = f.u * W2, y = y0 + 4 * sag * f.u * (1 - f.u);     // hangt aan het koord (parabool)
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(f.ph + t * 2.2) * 0.08); papelFlag(ctx, f.w, f.w * 1.3, f.col, c.hole); ctx.restore(); stats.drawn++;
      }
      ctx.globalAlpha = 1;
      fallP.draw(ctx, t, W2, H2); fallS.draw(ctx, t, W2, H2);
    } }];
  }

  // ── Historische hoogtijdagen: de daily van die dag ís de gebeurtenis ────────
  function leaf(ctx, l, w, col, vein) {
    ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(0, 0, l, w, 0, 0, TAU); ctx.fill();
    if (vein) { ctx.strokeStyle = vein; ctx.lineWidth = Math.max(0.8, w * 0.25); ctx.beginPath(); ctx.moveTo(-l * 0.9, 0); ctx.lineTo(l * 0.9, 0); ctx.stroke(); }
  }
  // Stichting van Rome: lauwerkrans groeit blad voor blad om de jaartal-pil
  function romeLayers(e) {
    const { W, H, P, stats, anchors } = e, S = scaleOf(W, H), c = P.rome;
    const N = 9;
    const leaves = [];
    for (const side of [-1, 1]) for (let i = 0; i < N; i++) leaves.push({ a: Math.PI / 2 + side * (Math.PI * (i + 0.5) / N), side, t0: 0.15 + i * 0.09, alt: i % 2 ? 1 : -1 });
    const numerals = Array.from({ length: 22 }, (_, i) => ({ x: 0.05 + ((i * PHI) % 1) * 0.9, delay: rnd(0, 1.2), dur: rnd(2.4, 3.1), top: 30, sway: rnd(6, 14) * S, swf: rnd(2, 4), ph: rnd(0, TAU), rot: ((r0, vr) => (u) => r0 + vr * u)(rnd(-0.4, 0.4), rnd(-1.2, 1.2)),
      ch: pick(["I", "V", "X", "L", "C", "D", "M"]), size: rnd(15, 24) * S, col: pick(c.numeral),
      draw(ctx) { ctx.fillStyle = this.col; ctx.font = `700 ${this.size}px Georgia, "Times New Roman", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(this.ch, 0, 0); } }));
    const falling = Array.from({ length: 14 }, () => ({ x: Math.random(), delay: rnd(0.2, 1.4), dur: rnd(2.6, 3.2), top: 30, sway: rnd(10, 18) * S, swf: rnd(2, 3.5), ph: rnd(0, TAU), rot: ((r0, vr) => (u) => r0 + vr * u)(rnd(0, TAU), rnd(-2, 2)),
      l: rnd(6, 9) * S, draw(ctx) { leaf(ctx, this.l, this.l * 0.42, c.leaf, c.vein); } }));
    const fallN = fallLayer(numerals, 3.9, stats), fallL = fallLayer(falling, 3.9, stats);
    return [{ end: 3.9, draw(ctx, t, W2, H2) {
      fallN.draw(ctx, t, W2, H2); fallL.draw(ctx, t, W2, H2);
      const pill = anchors.pill, rx = pill.w / 2 + 14 * S, ry = pill.h / 2 + 11 * S;   // per frame: de kaart kan nog schuiven
      const fade = clamp((3.9 - t) / 0.7, 0, 1), prog = clamp((t - 0.1) / 1.0, 0, 1);
      ctx.globalAlpha = fade; ctx.strokeStyle = c.stem; ctx.lineWidth = 1.6 * S; ctx.lineCap = "round";
      ctx.beginPath(); ctx.ellipse(pill.x, pill.y, rx, ry, 0, Math.PI / 2, Math.PI / 2 + Math.PI * prog, false); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(pill.x, pill.y, rx, ry, 0, Math.PI / 2, Math.PI / 2 - Math.PI * prog, true); ctx.stroke();
      for (const lf of leaves) {
        const u = clamp((t - lf.t0) / 0.25, 0, 1); if (u <= 0) continue;
        const x = pill.x + Math.cos(lf.a) * rx, y = pill.y + Math.sin(lf.a) * ry;
        const tangent = Math.atan2(Math.cos(lf.a) * ry, -Math.sin(lf.a) * rx);
        ctx.save(); ctx.translate(x, y); ctx.rotate(tangent + lf.alt * 0.6); ctx.scale(u, u);
        leaf(ctx, 7.5 * S, 3.2 * S, c.leaf, c.vein); ctx.restore(); stats.drawn++;
      }
      ctx.globalAlpha = 1;
    } }];
  }
  // Maanlanding: maan komt op, sterren, de maanlander landt op het jaartal
  function lmDraw(ctx, s, c, thrust, t) {
    ctx.strokeStyle = c.leg; ctx.lineWidth = 1.4 * s; ctx.lineCap = "round";
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 7 * s, 4 * s); ctx.lineTo(d * 12 * s, 12 * s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(d * 9.5 * s, 12 * s); ctx.lineTo(d * 14.5 * s, 12 * s); ctx.stroke(); }
    ctx.fillStyle = c.gold; ctx.beginPath(); ctx.moveTo(-9 * s, -1 * s); ctx.lineTo(-6 * s, -5 * s); ctx.lineTo(6 * s, -5 * s); ctx.lineTo(9 * s, -1 * s); ctx.lineTo(9 * s, 5 * s); ctx.lineTo(-9 * s, 5 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c.goldDark; ctx.fillRect(-9 * s, 2 * s, 18 * s, 3 * s);
    ctx.fillStyle = c.grey; ctx.beginPath(); ctx.arc(0, -10 * s, 6 * s, 0, TAU); ctx.fill(); ctx.fillRect(-7 * s, -10 * s, 14 * s, 5 * s);
    ctx.fillStyle = c.window; ctx.beginPath(); ctx.arc(-2.5 * s, -11 * s, 1.6 * s, 0, TAU); ctx.fill();
    ctx.strokeStyle = c.grey; ctx.lineWidth = 1 * s; ctx.beginPath(); ctx.moveTo(4 * s, -16 * s); ctx.lineTo(4 * s, -21 * s); ctx.stroke();
    ctx.fillStyle = c.grey; ctx.beginPath(); ctx.arc(4 * s, -21.5 * s, 1.5 * s, 0, TAU); ctx.fill();
    if (thrust > 0) { const fl = (6 + 5 * Math.abs(Math.sin(t * 40))) * s * thrust; ctx.fillStyle = c.flame; ctx.beginPath(); ctx.moveTo(-3 * s, 5 * s); ctx.lineTo(3 * s, 5 * s); ctx.lineTo(0, 5 * s + fl); ctx.closePath(); ctx.fill(); }
  }
  function moonLayers(e) {
    const { W, H, P, stats, anchors } = e, S = scaleOf(W, H), c = P.moon;
    const stars = Array.from({ length: 40 }, () => ({ x: Math.random(), y: rnd(0.02, 0.5), r: rnd(0.8, 2) * S, ph: rnd(0, TAU), tw: rnd(2, 6) }));
    const craters = [[-0.35, -0.2, 0.18], [0.25, -0.35, 0.12], [0.3, 0.3, 0.2], [-0.15, 0.4, 0.1], [-0.55, 0.25, 0.09]];
    const glow = glowSprite(c.glow, true), mx = 0.8 * W, my = 0.15 * H, mr = 32 * S;
    const LAND = 2.2, sx = 0.22 * W, sy = -30 * S;
    const dust = Array.from({ length: 14 }, () => ({ vx: rnd(-90, 90) * S, vy: rnd(-40, -5) * S, r: rnd(3, 6) * S, life: rnd(0.5, 0.9) }));
    return [{ end: 4.0, draw(ctx, t, W2, H2) {
      const fade = clamp((4.0 - t) / 0.5, 0, 1);
      ctx.fillStyle = c.star;
      for (const s of stars) { ctx.globalAlpha = fade * clamp(t / 0.6, 0, 1) * (0.35 + 0.65 * Math.abs(Math.sin(s.ph + s.tw * t))); ctx.beginPath(); ctx.arc(s.x * W2, s.y * H2, s.r, 0, TAU); ctx.fill(); }
      stats.drawn += stars.length;
      const mu = 1 - Math.pow(1 - clamp(t / 1.0, 0, 1), 3), yy = my + (1 - mu) * 40 * S;
      ctx.globalAlpha = fade * mu * (P.dark ? 0.45 : 0.25); const d = mr * 5;
      ctx.globalCompositeOperation = P.comp; ctx.drawImage(glow, mx - d / 2, yy - d / 2, d, d); ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = fade * mu; ctx.fillStyle = c.moon; ctx.beginPath(); ctx.arc(mx, yy, mr, 0, TAU); ctx.fill();
      ctx.fillStyle = c.crater; for (const [cx, cy, cr] of craters) { ctx.beginPath(); ctx.arc(mx + cx * mr, yy + cy * mr, cr * mr, 0, TAU); ctx.fill(); }
      if (c.line) { ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(mx, yy, mr, 0, TAU); ctx.stroke(); }
      stats.drawn++;
      const pill = anchors.pill, ex = pill.x, ey = pill.y - pill.h / 2 - 12 * S;   // landingsplek: bovenop de pil, per frame
      const lu = clamp(t / LAND, 0, 1), le = lu < 0.5 ? 2 * lu * lu : 1 - Math.pow(-2 * lu + 2, 2) / 2;
      const lx = sx + (ex - sx) * le, ly = sy + (ey - sy) * le + (lu < 1 ? Math.sin(t * 6) * 2 * S : 0);
      ctx.globalAlpha = fade; ctx.save(); ctx.translate(lx, ly); ctx.rotate(lu < 1 ? (1 - lu) * 0.25 : 0); lmDraw(ctx, S, c, lu < 1 ? 1 : 0, t); ctx.restore(); stats.drawn++;
      const ds = t - LAND;
      if (ds >= 0) for (const p of dust) { const u = ds / p.life; if (u > 1) continue; ctx.globalAlpha = fade * 0.55 * (1 - u); ctx.fillStyle = c.dust; ctx.beginPath(); ctx.arc(ex + p.vx * ds, ey + 12 * S + p.vy * ds, p.r * (1 + u), 0, TAU); ctx.fill(); stats.drawn++; }
      ctx.globalAlpha = 1;
    } }];
  }
  // Gregoriaanse kalender: doorgestreepte blaadjes 5 t/m 14 oktober dwarrelen omlaag
  function calPage(ctx, w, h, num, c) {
    ctx.fillStyle = c.page; ctx.fillRect(-w / 2, -h / 2, w, h);
    if (c.line) { ctx.strokeStyle = c.line; ctx.lineWidth = 1; ctx.strokeRect(-w / 2, -h / 2, w, h); }
    ctx.fillStyle = c.band; ctx.fillRect(-w / 2, -h / 2, w, h * 0.22);
    ctx.fillStyle = c.page; for (const d of [-0.28, 0.28]) { ctx.beginPath(); ctx.arc(d * w, -h / 2 + h * 0.11, h * 0.05, 0, TAU); ctx.fill(); }
    ctx.fillStyle = c.ink; ctx.font = `700 ${h * 0.46}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(num), 0, h * 0.14);
    ctx.strokeStyle = c.cross; ctx.lineWidth = Math.max(1.2, h * 0.07); ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-w * 0.32, -h * 0.12); ctx.lineTo(w * 0.32, h * 0.4); ctx.moveTo(w * 0.32, -h * 0.12); ctx.lineTo(-w * 0.32, h * 0.4); ctx.stroke();
  }
  function gregorianLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), c = P.gregorian;
    const pages = Array.from({ length: 24 }, (_, i) => ({ x: 0.04 + ((i * PHI) % 1) * 0.92, delay: rnd(0, 1.3), dur: rnd(2.4, 3.1), top: 40, sway: rnd(10, 20) * S, swf: rnd(2, 3.5), ph: rnd(0, TAU), rot: ((r0, vr) => (u) => r0 + Math.sin(u * 4 + vr) * 0.35)(rnd(-0.3, 0.3), rnd(0, TAU)),
      num: 5 + (i % 10), h: rnd(20, 26) * S, flap: rnd(4, 7), draw(ctx, u) { ctx.scale(0.35 + 0.65 * Math.abs(Math.cos(this.ph + u * this.flap)), 1); calPage(ctx, this.h * 0.82, this.h, this.num, c); } }));
    return [fallLayer(pages, 3.9, stats)];
  }


  // ── Iden van maart (−44): Romeinse cijfers in keizerlijk purper en goud, laurier ─
  function idesLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), c = P.ides;
    const numerals = Array.from({ length: 26 }, (_, i) => ({ x: 0.05 + ((i * PHI) % 1) * 0.9, delay: rnd(0, 1.3), dur: rnd(2.4, 3.2), top: 30, sway: rnd(6, 14) * S, swf: rnd(2, 4), ph: rnd(0, TAU), rot: ((r0, vr) => (u) => r0 + vr * u)(rnd(-0.4, 0.4), rnd(-1.2, 1.2)),
      ch: pick(["I", "V", "X", "L", "C", "D", "M", "XV", "SPQR"]), size: rnd(15, 24) * S, col: pick(c.numeral),
      draw(ctx) { ctx.fillStyle = this.col; ctx.font = `700 ${this.size}px Georgia, "Times New Roman", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(this.ch, 0, 0); } }));
    const leaves = Array.from({ length: 16 }, () => ({ x: Math.random(), delay: rnd(0.2, 1.4), dur: rnd(2.6, 3.3), top: 30, sway: rnd(10, 18) * S, swf: rnd(2, 3.5), ph: rnd(0, TAU), rot: ((r0, vr) => (u) => r0 + vr * u)(rnd(0, TAU), rnd(-2, 2)),
      l: rnd(6, 9) * S, draw(ctx) { leaf(ctx, this.l, this.l * 0.42, c.leaf, c.vein); } }));
    return [fallLayer(numerals, 3.9, stats), fallLayer(leaves, 3.9, stats)];
  }
  // ── Everest (1953): een berg rijst onderin op, vlag op de top, sneeuw ───────
  function everestLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), c = P.everest;
    const dots = Array.from({ length: 70 }, () => ({ x: Math.random(), delay: rnd(0, 1.0), dur: rnd(2.4, 3.2), top: 10, sway: rnd(6, 16) * S, swf: rnd(2, 4), ph: rnd(0, TAU), rot: () => 0,
      r: rnd(1.2, 3) * S, col: pick(c.flakes), alpha: rnd(0.6, 1), draw(ctx) { ctx.fillStyle = this.col; ctx.beginPath(); ctx.arc(0, 0, this.r, 0, TAU); ctx.fill(); } }));
    const snow = fallLayer(dots, 4.0, stats);
    return [{ end: 4.0, draw(ctx, t, W2, H2) {
      const fade = clamp((4.0 - t) / 0.6, 0, 1), rise = 1 - Math.pow(1 - clamp(t / 1.2, 0, 1), 3);
      const mh = H2 * 0.34, base = H2 + 6, peakY = base - mh * rise, cx = W2 * 0.5;
      ctx.globalAlpha = fade;
      ctx.fillStyle = c.rockDark; ctx.beginPath(); ctx.moveTo(W2 * -0.05, base); ctx.lineTo(W2 * 0.28, peakY + mh * 0.35); ctx.lineTo(W2 * 0.55, base); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(W2 * 0.5, base); ctx.lineTo(W2 * 0.78, peakY + mh * 0.42); ctx.lineTo(W2 * 1.05, base); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c.rock; ctx.beginPath(); ctx.moveTo(W2 * 0.12, base); ctx.lineTo(cx, peakY); ctx.lineTo(W2 * 0.88, base); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c.snow; ctx.beginPath(); ctx.moveTo(cx, peakY);                       // sneeuwkap
      ctx.lineTo(cx + mh * 0.16, peakY + mh * 0.2); ctx.lineTo(cx + mh * 0.09, peakY + mh * 0.17); ctx.lineTo(cx + mh * 0.04, peakY + mh * 0.25);
      ctx.lineTo(cx - mh * 0.05, peakY + mh * 0.19); ctx.lineTo(cx - mh * 0.11, peakY + mh * 0.24); ctx.lineTo(cx - mh * 0.16, peakY + mh * 0.2); ctx.closePath(); ctx.fill();
      stats.drawn += 4;
      const fu = clamp((t - 1.3) / 0.4, 0, 1);                                               // vlag komt op de top
      if (fu > 0) {
        const ph = 22 * S * fu, fx = cx + 2 * S, fy = peakY + 2 * S;
        ctx.strokeStyle = c.pole; ctx.lineWidth = 1.6 * S; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - ph); ctx.stroke();
        const wave = Math.sin(t * 9) * 2 * S;
        ctx.fillStyle = c.flag; ctx.beginPath(); ctx.moveTo(fx, fy - ph); ctx.quadraticCurveTo(fx + 8 * S, fy - ph + wave - 2 * S, fx + 15 * S * fu, fy - ph + 4 * S + wave);
        ctx.quadraticCurveTo(fx + 8 * S, fy - ph + 6 * S - wave, fx, fy - ph + 9 * S); ctx.closePath(); ctx.fill(); stats.drawn++;
      }
      ctx.globalAlpha = 1;
      snow.draw(ctx, t, W2, H2);
    } }];
  }
  // ── Columbus (1492): drie scheepjes zeilen over de golven van links naar rechts ─
  function ship(ctx, s, c, big) {
    ctx.fillStyle = c.hull; ctx.beginPath(); ctx.moveTo(-14 * s, 0); ctx.lineTo(14 * s, 0); ctx.lineTo(10 * s, 7 * s); ctx.lineTo(-10 * s, 7 * s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c.mast; ctx.lineWidth = Math.max(1, 1.4 * s); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -(big ? 26 : 20) * s); ctx.stroke();
    ctx.fillStyle = c.sail; ctx.beginPath(); ctx.moveTo(-9 * s, -(big ? 24 : 18) * s); ctx.lineTo(9 * s, -(big ? 24 : 18) * s); ctx.quadraticCurveTo(12 * s, -12 * s, 9 * s, -4 * s); ctx.lineTo(-9 * s, -4 * s); ctx.quadraticCurveTo(-6 * s, -12 * s, -9 * s, -(big ? 24 : 18) * s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c.cross; ctx.lineWidth = Math.max(1, 1.6 * s); ctx.beginPath(); ctx.moveTo(0, -(big ? 22 : 16) * s); ctx.lineTo(0, -6 * s); ctx.moveTo(-6 * s, -(big ? 15 : 12) * s); ctx.lineTo(6 * s, -(big ? 15 : 12) * s); ctx.stroke();
  }
  function columbusLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), c = P.columbus;
    const ships = [{ y: 0.80, s: 1.0, v: 0.27, d: 0.0, big: true }, { y: 0.845, s: 0.78, v: 0.24, d: 0.35 }, { y: 0.885, s: 0.72, v: 0.22, d: 0.7 }];
    return [{ end: 4.4, draw(ctx, t, W2, H2) {
      const fade = clamp(t / 0.4, 0, 1) * clamp((4.4 - t) / 0.6, 0, 1);
      ctx.globalAlpha = fade;
      for (const [yf, col, ph, amp] of [[0.86, c.seaDark, 0, 5], [0.9, c.sea, 1.7, 6]]) {          // golven
        ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, H2);
        for (let x = 0; x <= W2; x += 6) ctx.lineTo(x, H2 * yf + Math.sin(x / (26 * S) + t * 2.2 + ph) * amp * S);
        ctx.lineTo(W2, H2); ctx.closePath(); ctx.fill();
      }
      for (const sh of ships) {
        const u = (t - sh.d) * sh.v; if (u < 0) continue;
        const x = -40 * S + (W2 + 80 * S) * u, y = H2 * sh.y + Math.sin(t * 2.2 + sh.d * 4) * 4 * S;
        ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(t * 2.2 + sh.d * 4) * 0.06); ship(ctx, sh.s * S, c, sh.big); ctx.restore(); stats.drawn++;
      }
      ctx.globalAlpha = 1;
    } }];
  }
  // ── Eerste vlucht (1903): tweedekkers glijden van links naar rechts ─────────
  function biplane(ctx, s, c, t) {
    // Zijaanzicht: romp, bovenvleugel boven de romp, ondervleugel eronder, stijlen,
    // staartvlak, wieltjes en een draaiende propellerschijf op de neus.
    ctx.lineCap = "round";
    ctx.strokeStyle = c.strut; ctx.lineWidth = Math.max(1, 1.1 * s);
    for (const dx of [-3, 5]) { ctx.beginPath(); ctx.moveTo(dx * s, -9 * s); ctx.lineTo(dx * s, 3 * s); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-3 * s, -9 * s); ctx.lineTo(5 * s, 3 * s); ctx.stroke();
    ctx.fillStyle = c.body;                                                              // romp
    ctx.beginPath(); ctx.moveTo(-16 * s, -2.5 * s); ctx.lineTo(10 * s, -3.5 * s); ctx.quadraticCurveTo(16 * s, -3 * s, 16 * s, 0); ctx.quadraticCurveTo(16 * s, 3 * s, 10 * s, 3 * s); ctx.lineTo(-16 * s, 1.5 * s); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-16 * s, -2.5 * s); ctx.lineTo(-13 * s, -9 * s); ctx.lineTo(-9 * s, -9 * s); ctx.lineTo(-8 * s, -3 * s); ctx.closePath(); ctx.fill();   // staartvin
    ctx.fillRect(-18 * s, -3 * s, 8 * s, 1.6 * s);                                       // hoogteroer
    ctx.fillStyle = c.wing;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-9 * s, -11 * s, 22 * s, 2.6 * s, 1.3 * s) : ctx.rect(-9 * s, -11 * s, 22 * s, 2.6 * s); ctx.fill();   // bovenvleugel
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(-7 * s, 2 * s, 18 * s, 2.4 * s, 1.2 * s) : ctx.rect(-7 * s, 2 * s, 18 * s, 2.4 * s); ctx.fill();       // ondervleugel
    ctx.fillStyle = c.strut; for (const dx of [-2, 6]) { ctx.beginPath(); ctx.arc(dx * s, 6 * s, 1.6 * s, 0, TAU); ctx.fill(); }   // wieltjes
    ctx.globalAlpha *= 0.55; ctx.fillStyle = c.prop;                                      // propellerschijf
    ctx.beginPath(); ctx.ellipse(17 * s, 0, 1.6 * s, 7 * s * (0.55 + 0.45 * Math.abs(Math.sin(t * 30))), 0, 0, TAU); ctx.fill();
    ctx.globalAlpha /= 0.55;
  }
  function flightLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), c = P.flight;
    const planes = Array.from({ length: 5 }, (_, i) => ({ y: 0.12 + ((i * PHI) % 1) * 0.5, s: rnd(0.75, 1.15), v: rnd(0.24, 0.34), d: i * 0.45, ph: rnd(0, TAU), bob: rnd(6, 12) * S }));
    const clouds = Array.from({ length: 6 }, (_, i) => ({ x: ((i * PHI + 0.3) % 1), y: 0.08 + ((i * 0.37) % 1) * 0.55, r: rnd(22, 40) * S, v: rnd(0.02, 0.05) }));
    return [{ end: 4.4, draw(ctx, t, W2, H2) {
      const fade = clamp(t / 0.4, 0, 1) * clamp((4.4 - t) / 0.6, 0, 1);
      ctx.fillStyle = c.cloud;
      for (const cl of clouds) { const x = ((cl.x + t * cl.v) % 1.2 - 0.1) * W2; ctx.globalAlpha = fade; ctx.beginPath(); ctx.arc(x, cl.y * H2, cl.r, 0, TAU); ctx.arc(x + cl.r * 0.8, cl.y * H2 + cl.r * 0.15, cl.r * 0.7, 0, TAU); ctx.arc(x - cl.r * 0.7, cl.y * H2 + cl.r * 0.2, cl.r * 0.6, 0, TAU); ctx.fill(); }
      for (const p of planes) {
        const u = (t - p.d) * p.v; if (u < 0) continue;
        const x = -60 * S + (W2 + 120 * S) * u, y = p.y * H2 + Math.sin(t * 1.6 + p.ph) * p.bob;
        ctx.globalAlpha = fade; ctx.save(); ctx.translate(x, y); ctx.rotate(Math.cos(t * 1.6 + p.ph) * 0.08 - 0.05); biplane(ctx, p.s * S, c, t); ctx.restore(); stats.drawn++;
      }
      ctx.globalAlpha = 1;
    } }];
  }

  // ── Gedeelde vormen ─────────────────────────────────────────────────────────
  const easeOut = (x) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
  const easeInOut = (x) => { x = clamp(x, 0, 1); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; };
  function mixHex(a, b, k) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (s) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
    return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
  }

  // ── 1. Galileo: Jupiter met vier manen langs de evenaarslijn ────────────────
  function jupiter(ctx, x, y, r, c) {
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
    const parts = [0.10, 0.14, 0.18, 0.16, 0.14, 0.16, 0.12];
    let yy = y - r;
    parts.forEach((p, i) => { ctx.fillStyle = c.bands[i]; ctx.fillRect(x - r, yy, 2 * r, p * 2 * r + 0.8); yy += p * 2 * r; });
    ctx.fillStyle = c.spot; ctx.beginPath(); ctx.ellipse(x - r * 0.28, y + r * 0.3, r * 0.3, r * 0.16, 0, 0, TAU); ctx.fill();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r * 1.05);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(0.55, "rgba(0,0,0,0)"); g.addColorStop(1, c.limb);
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
    ctx.restore();
    if (c.rim) { ctx.strokeStyle = c.rim; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); }
  }
  function galileoLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), c = P.galileo, END = 4.2;
    const stars = Array.from({ length: 46 }, () => ({ x: Math.random(), y: rnd(0.02, 0.62), r: rnd(0.8, 2) * S, ph: rnd(0, TAU), tw: rnd(2, 6) }));
    const jx = 0.5 * W, jy = 0.2 * H, jr = 22 * S;
    // omloopstraal in Jupiterstralen, omlooptijd in seconden (verhouding 1 : 2 : 4 : 9,4 zoals Io, Europa, Ganymedes, Callisto)
    const moons = [
      { a: 1.9, per: 1.6, ph: 0.6, r: 2.6, t0: 0.9 }, { a: 2.7, per: 3.2, ph: 2.4, r: 2.4, t0: 1.25 },
      { a: 3.8, per: 6.4, ph: 4.4, r: 3.0, t0: 1.6 }, { a: 5.6, per: 15, ph: 1.3, r: 2.8, t0: 1.95 },
    ];
    const sparks = Array.from({ length: 34 }, () => ({ x: Math.random(), delay: rnd(0.6, 1.8), dur: rnd(2.2, 2.9), top: 20, sway: rnd(4, 10) * S, swf: rnd(2, 4), ph: rnd(0, TAU), rot: (u) => u * 2, r: rnd(2, 4.2) * S, tw: rnd(6, 12), col: pick(c.fall),
      draw(ctx, u, t) { ctx.globalAlpha *= 0.5 + 0.5 * Math.abs(Math.sin(this.ph + this.tw * t)); ctx.strokeStyle = this.col; ctx.lineWidth = 1.2 * S; sparkle(ctx, this.r); } }));
    const fall = fallLayer(sparks, END, stats), glowJ = glowSprite(c.glow, true), glowM = glowSprite(c.moonGlow, true);
    return [{ end: END, draw(ctx, t, W2, H2) {
      const fade = clamp((END - t) / 0.5, 0, 1), mu = easeOut(t / 1.0), jyy = jy + (1 - mu) * 36 * S;
      ctx.fillStyle = c.star;
      for (const s of stars) { ctx.globalAlpha = fade * clamp(t / 0.6, 0, 1) * (0.35 + 0.65 * Math.abs(Math.sin(s.ph + s.tw * t))); ctx.beginPath(); ctx.arc(s.x * W2, s.y * H2, s.r, 0, TAU); ctx.fill(); }
      stats.drawn += stars.length;
      // de lijn waarop Galileo de manen zag staan
      ctx.globalAlpha = fade * mu * 0.8; ctx.strokeStyle = c.axis; ctx.lineWidth = 1; ctx.setLineDash([3 * S, 5 * S]);
      ctx.beginPath(); ctx.moveTo(jx - 6.4 * jr, jyy); ctx.lineTo(jx + 6.4 * jr, jyy); ctx.stroke(); ctx.setLineDash([]);
      const pos = (m) => { const th = TAU * (t / m.per) + m.ph; return { x: jx + m.a * jr * Math.sin(th), y: jyy + m.a * jr * 0.07 * Math.cos(th), depth: Math.cos(th) }; };
      const moon = (m, p) => {
        const s = t - m.t0; if (s < 0) return;
        const k = clamp(s / 0.3, 0, 1), d = m.r * S * 7;
        ctx.globalAlpha = fade * k * 0.8; ctx.globalCompositeOperation = P.comp; ctx.drawImage(glowM, p.x - d / 2, p.y - d / 2, d, d); ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = fade * k; ctx.fillStyle = c.moon; ctx.beginPath(); ctx.arc(p.x, p.y, m.r * S * k, 0, TAU); ctx.fill();
        if (s < 0.5) { const q = s / 0.5; ctx.globalAlpha = fade * (1 - q); ctx.strokeStyle = c.moon; ctx.lineWidth = 1.2 * S; ctx.save(); ctx.translate(p.x, p.y); sparkle(ctx, (5 + 9 * q) * S); ctx.restore(); }
        stats.drawn++;
      };
      const behind = [], front = [];
      for (const m of moons) { const p = pos(m); (p.depth < 0 && Math.abs(p.x - jx) < jr ? behind : front).push([m, p]); }
      for (const [m, p] of behind) moon(m, p);
      const d = jr * 5; ctx.globalAlpha = fade * mu * (P.dark ? 0.4 : 0.22); ctx.globalCompositeOperation = P.comp; ctx.drawImage(glowJ, jx - d / 2, jyy - d / 2, d, d); ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = fade * mu; jupiter(ctx, jx, jyy, jr, c); stats.drawn++;
      for (const [m, p] of front) moon(m, p);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = P.comp; fall.draw(ctx, t, W2, H2); ctx.globalCompositeOperation = "source-over";
    } }];
  }

  // ── 2. Magna Carta: perkament rolt uit, het wassen zegel valt erop ──────────
  function waxSeal(ctx, r, c) {
    ctx.fillStyle = c.wax; ctx.beginPath();
    for (let i = 0; i <= 48; i++) { const a = (i / 48) * TAU, rr = r * (1 + 0.05 * Math.sin(9 * a) + 0.035 * Math.sin(5 * a + 1)); i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(rr, 0); }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c.waxDark; ctx.lineWidth = r * 0.09; ctx.beginPath(); ctx.arc(0, 0, r * 0.74, 0, TAU); ctx.stroke();
    ctx.save(); ctx.translate(0, -r * 0.02); crown(ctx, r * 0.95, r * 0.62, c.waxDark, [c.wax]); ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = r * 0.1; ctx.lineCap = "round"; ctx.beginPath(); ctx.arc(0, 0, r * 0.9, Math.PI * 1.1, Math.PI * 1.4); ctx.stroke();
  }
  function scrollToy(ctx, w, h, c) {              // opgerold briefje met rood lintje
    ctx.fillStyle = c.scrap; ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.fillStyle = c.rollMid; ctx.beginPath(); ctx.ellipse(-w / 2, 0, h * 0.18, h / 2, 0, 0, TAU); ctx.ellipse(w / 2, 0, h * 0.18, h / 2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = c.wax; ctx.fillRect(-w * 0.08, -h / 2 - 0.5, w * 0.16, h + 1);
  }
  function quill(ctx, len, c) {                   // veer met ruggengraat
    ctx.fillStyle = c.col; ctx.beginPath(); ctx.moveTo(-len / 2, 0);
    ctx.quadraticCurveTo(-len * 0.1, -len * 0.3, len / 2, -len * 0.04); ctx.quadraticCurveTo(len * 0.1, len * 0.22, -len / 2, 0); ctx.fill();
    ctx.strokeStyle = c.spine; ctx.lineWidth = Math.max(1, len * 0.04); ctx.beginPath(); ctx.moveTo(-len * 0.58, len * 0.04); ctx.lineTo(len * 0.5, -len * 0.03); ctx.stroke();
  }
  function magnaLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), c = P.magna, END = 4.4;
    const sw = Math.min(0.64 * W, 300 * S), sx = (W - sw) / 2, sy = 0.11 * H, sh = Math.min(0.30 * H, 230 * S), rr = 7 * S;
    const U0 = 0.15, UD = 1.0, TS = 1.75, rows = 9;
    const lines = Array.from({ length: rows }, (_, i) => {
      const segs = []; let x = i === 0 ? 0.2 : 0.02;
      while (x < 0.94) { const w = rnd(0.06, 0.16); segs.push([x, Math.min(0.96, x + w)]); x += w + rnd(0.025, 0.04); }
      if (i === rows - 1) segs.length = Math.max(2, (segs.length * 0.5) | 0);
      return segs;
    });
    const finalSeal = { x: sx + sw * 0.72, y: sy + sh - 24 * S }, sr = 17 * S;
    const splat = Array.from({ length: 9 }, (_, i) => ({ a: (i / 9) * TAU + rnd(-0.2, 0.2), d: rnd(1.5, 2.3), r: rnd(1.4, 2.6) * S }));
    const scraps = Array.from({ length: 14 }, (_, i) => ({ x: 0.06 + ((i * PHI) % 1) * 0.88, delay: TS + 0.15 + rnd(0, 0.8), dur: rnd(1.7, 2.1), top: 30, sway: rnd(8, 16) * S, swf: rnd(2, 4), ph: rnd(0, TAU),
      rot: ((r0, vr) => (u) => r0 + vr * u)(rnd(-0.5, 0.5), rnd(-3, 3)), w: rnd(14, 20) * S, draw(ctx) { scrollToy(ctx, this.w, this.w * 0.42, c); } }));
    const quills = Array.from({ length: 10 }, (_, i) => ({ x: 0.08 + ((i * PHI + 0.3) % 1) * 0.84, delay: TS + 0.25 + rnd(0, 0.9), dur: rnd(1.8, 2.2), top: 30, sway: rnd(14, 24) * S, swf: rnd(2.5, 4), ph: rnd(0, TAU),
      rot: ((r0, vr) => (u) => r0 + Math.sin(u * 5 + vr) * 0.6)(rnd(-0.4, 0.4), rnd(0, TAU)), len: rnd(22, 32) * S, col: pick(c.quill), draw(ctx) { quill(ctx, this.len, { col: this.col, spine: c.spine }); } }));
    const fS = fallLayer(scraps, END, stats), fQ = fallLayer(quills, END, stats);
    const roll = (ctx, y, a) => {
      const x0 = sx - 5 * S, w = sw + 10 * S, g = ctx.createLinearGradient(0, y - rr, 0, y + rr);
      g.addColorStop(0, c.rollHi); g.addColorStop(0.5, c.rollMid); g.addColorStop(1, c.rollLow);
      ctx.globalAlpha = a; ctx.fillStyle = g; rrect(ctx, x0, y - rr, w, rr * 2, rr * 0.5); ctx.fill();
      ctx.fillStyle = c.rollEnd; for (const ex of [x0, x0 + w]) { ctx.beginPath(); ctx.ellipse(ex, y, rr * 0.45, rr, 0, 0, TAU); ctx.fill(); }
      ctx.strokeStyle = c.rollLow; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(x0, y, rr * 0.25, rr * 0.6, 0, 0, TAU); ctx.stroke();
    };
    return [{ end: END, draw(ctx, t, W2, H2) {
      const fade = clamp((END - t) / 0.6, 0, 1), u = easeInOut((t - U0) / UD);
      if (u > 0) {
        const curH = sh * u, y1 = sy + curH;
        ctx.globalAlpha = fade; ctx.save(); ctx.shadowColor = "rgba(0,0,0,.38)"; ctx.shadowBlur = 9 * S; ctx.shadowOffsetY = 2 * S;
        ctx.fillStyle = c.sheet; ctx.fillRect(sx, sy, sw, curH); ctx.restore();
        if (c.edge) { ctx.strokeStyle = c.edge; ctx.lineWidth = 1; ctx.strokeRect(sx, sy, sw, curH); }
        // regels: inkt verschijnt van links naar rechts, rij voor rij
        ctx.save(); ctx.beginPath(); ctx.rect(sx, sy, sw, Math.max(0, curH - rr)); ctx.clip();
        ctx.strokeStyle = c.ink; ctx.lineWidth = 1.6 * S; ctx.lineCap = "round";
        for (let i = 0; i < rows; i++) {
          const y = sy + 14 * S + (i + 0.5) * (sh - 34 * S) / rows, p = clamp((t - (U0 + 0.45 + i * 0.07)) / 0.28, 0, 1); if (p <= 0) continue;
          ctx.globalAlpha = fade * 0.75;
          for (const [a, b] of lines[i]) {
            if (a > p) break; const bb = Math.min(b, p);
            ctx.beginPath(); ctx.moveTo(sx + sw * (0.05 + 0.9 * a), y); ctx.quadraticCurveTo(sx + sw * (0.05 + 0.9 * (a + bb) / 2), y - 2.2 * S, sx + sw * (0.05 + 0.9 * bb), y); ctx.stroke(); stats.drawn++;
          }
          if (i === 0 && p > 0.1) { ctx.globalAlpha = fade; ctx.fillStyle = c.init; ctx.fillRect(sx + sw * 0.05, y - 7 * S, 15 * S, 15 * S); ctx.fillStyle = c.sheet; ctx.fillRect(sx + sw * 0.05 + 4 * S, y - 3 * S, 7 * S, 7 * S); }
        }
        ctx.restore();
        roll(ctx, sy, fade); roll(ctx, y1, fade); stats.drawn += 2;
      }
      // het zegel: valt, plet kort, gelei-ringetje en wasspatjes
      const s = t - TS;
      if (s > -0.05) {
        const fall = clamp((s + 0.05) / 0.27, 0, 1), land = s - 0.22;
        const y = finalSeal.y - (1 - fall * fall) * 120 * S, sc = 1 + 0.5 * (1 - fall) + (land > 0 ? 0.14 * Math.exp(-11 * land) * Math.cos(28 * land) : 0);
        if (land > 0 && land < 0.7) {
          const q = land / 0.7; ctx.globalAlpha = fade * 0.55 * (1 - q); ctx.strokeStyle = c.wax; ctx.lineWidth = 2 * S;
          ctx.beginPath(); ctx.arc(finalSeal.x, finalSeal.y, sr * (1.1 + 2.6 * q), 0, TAU); ctx.stroke();
          ctx.globalAlpha = fade * (1 - q); ctx.fillStyle = c.wax;
          for (const p of splat) { ctx.beginPath(); ctx.arc(finalSeal.x + Math.cos(p.a) * sr * (1 + p.d * q), finalSeal.y + Math.sin(p.a) * sr * (1 + p.d * q), p.r * (1 - 0.4 * q), 0, TAU); ctx.fill(); stats.drawn++; }
        }
        ctx.globalAlpha = fade * clamp((s + 0.05) / 0.1, 0, 1);
        if (land > 0) { ctx.strokeStyle = c.wax; ctx.lineWidth = sr * 0.5; ctx.lineCap = "butt"; for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(finalSeal.x + d * sr * 0.2, finalSeal.y + sr * 0.6); ctx.lineTo(finalSeal.x + d * sr * 0.95, finalSeal.y + sr * 2.3); ctx.stroke(); } }
        ctx.save(); ctx.translate(finalSeal.x, y); ctx.scale(sc, sc * (land > 0 ? 2 - sc : 1)); waxSeal(ctx, sr, c); ctx.restore(); stats.drawn++;
      }
      ctx.globalAlpha = 1;
      fS.draw(ctx, t, W2, H2); fQ.draw(ctx, t, W2, H2);
    } }];
  }

  // ── 3. De val van Rome: lauwerkrans waait weg, CDLXXVI brokkelt af ──────────
  function rome476Layers(e) {
    const { W, H, P, stats, anchors } = e, S = scaleOf(W, H), HS = H / 844, c = P.rome476, END = 4.2;
    const N = 9, WIND = 1.5;
    const leaves = [];
    for (const side of [-1, 1]) for (let i = 0; i < N; i++) leaves.push({ a: Math.PI / 2 + side * (Math.PI * (i + 0.5) / N), alt: i % 2 ? 1 : -1, t0: 0.1 + i * 0.045, tb: WIND + rnd(0, 1.3), vx: rnd(150, 250) * S, vy: rnd(-90, 10) * S, spin: rnd(-7, 7), col: pick(c.autumn) });
    const drift = Array.from({ length: 16 }, (_, i) => ({ y0: rnd(0.15, 0.85), tb: WIND + 0.1 + rnd(0, 1.6), dur: rnd(1.6, 2.3), amp: rnd(10, 22) * S, ph: rnd(0, TAU), l: rnd(6, 9) * S, spin: rnd(-6, 6), col: pick(c.autumn) }));
    const word = "CDLXXVI", size = 40 * S, step = size * 0.66, baseY = 0.27 * H;
    const letters = [...word].map((ch, i) => ({ ch, x: (i - (word.length - 1) / 2) * step, a0: 0.1 + i * 0.07, tc: 1.55 + i * 0.13, vx: rnd(-40, 70) * S, spin: rnd(-2.2, 2.2) }));
    const puffs = []; letters.forEach((l) => { for (let k = 0; k < 4; k++) puffs.push({ x: l.x + rnd(-0.3, 0.3) * step, tb: l.tc + k * 0.04, vx: rnd(-35, 35) * S, vy: rnd(-45, -8) * S, r0: rnd(2, 4) * S, life: rnd(0.55, 0.85) }); });
    return [{ end: END, draw(ctx, t, W2, H2) {
      const fade = clamp((END - t) / 0.5, 0, 1), cx = W2 / 2;
      const pill = anchors.pill, rx = pill.w / 2 + 14 * S, ry = pill.h / 2 + 11 * S;   // per frame: de kaart kan nog schuiven
      // letters
      ctx.font = `800 ${size}px Georgia, "Times New Roman", serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.lineJoin = "round";
      for (const l of letters) {
        const ap = easeOut((t - l.a0) / 0.5), s = t - l.tc; if (ap <= 0) continue;
        let x = cx + l.x, y = baseY + (1 - ap) * 14 * S, rot = 0, al = ap;
        if (s > 0) { x += l.vx * s; y += 0.5 * 1100 * HS * s * s; rot = l.spin * s; al = 1 - clamp(s / 1.0, 0, 1); }
        ctx.globalAlpha = fade * al; ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
        ctx.lineWidth = 2 * S; ctx.strokeStyle = c.edge; ctx.strokeText(l.ch, 0, 0);
        ctx.fillStyle = c.stone; ctx.fillText(l.ch, 0, 0); ctx.restore(); stats.drawn++;
      }
      ctx.fillStyle = c.dust;
      for (const p of puffs) { const s = t - p.tb; if (s < 0 || s > p.life) continue; const q = s / p.life; ctx.globalAlpha = fade * 0.45 * (1 - q); ctx.beginPath(); ctx.arc(cx + p.x + p.vx * s, baseY + 8 * S + p.vy * s, p.r0 * (1 + 2.2 * q), 0, TAU); ctx.fill(); stats.drawn++; }
      // krans: groeit snel, dan waait hij blad voor blad weg
      const ring = clamp(1 - (t - WIND) / 1.3, 0, 1), grow = clamp((t - 0.05) / 0.5, 0, 1);
      if (ring > 0) {
        ctx.globalAlpha = fade * ring; ctx.strokeStyle = c.stem; ctx.lineWidth = 1.6 * S; ctx.lineCap = "round";
        ctx.beginPath(); ctx.ellipse(pill.x, pill.y, rx, ry, 0, Math.PI / 2, Math.PI / 2 + Math.PI * grow, false); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(pill.x, pill.y, rx, ry, 0, Math.PI / 2, Math.PI / 2 - Math.PI * grow, true); ctx.stroke();
      }
      for (const lf of leaves) {
        const g = clamp((t - lf.t0) / 0.22, 0, 1); if (g <= 0) continue;
        const bx = pill.x + Math.cos(lf.a) * rx, by = pill.y + Math.sin(lf.a) * ry, tan = Math.atan2(Math.cos(lf.a) * ry, -Math.sin(lf.a) * rx) + lf.alt * 0.6;
        const s = t - lf.tb; let x = bx, y = by, rot = tan, al = 1, col = c.leaf, sc = g;
        if (s > 0) { x += lf.vx * s * (1 + 0.6 * s); y += lf.vy * s + 40 * HS * s * s; rot += lf.spin * s; al = 1 - clamp((s - 0.9) / 0.7, 0, 1); col = mixHex(c.leaf, lf.col, clamp(s / 0.35, 0, 1)); sc = 1 + 0.15 * clamp(s, 0, 1); }
        ctx.globalAlpha = fade * al; ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(sc, sc); leaf(ctx, 7.5 * S, 3.2 * S, col, s > 0 ? null : c.vein); ctx.restore(); stats.drawn++;
      }
      for (const d of drift) {
        const s = t - d.tb; if (s < 0 || s > d.dur) continue; const q = s / d.dur;
        const x = -20 * S + (W2 + 40 * S) * q, y = d.y0 * H2 + Math.sin(d.ph + q * 7) * d.amp;
        ctx.globalAlpha = fade * clamp(Math.min(q / 0.1, (1 - q) / 0.15), 0, 1); ctx.save(); ctx.translate(x, y); ctx.rotate(d.spin * s); leaf(ctx, d.l, d.l * 0.42, d.col, null); ctx.restore(); stats.drawn++;
      }
      ctx.globalAlpha = 1;
    } }];
  }

  // ── 4. Toetanchamon: kaarslicht, gouden stof, het masker licht op ───────────
  function ankh(ctx, h, col) {
    ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.3, h * 0.14); ctx.lineCap = "round";
    const lr = h * 0.2;
    ctx.beginPath(); ctx.ellipse(0, -h * 0.28, lr * 0.8, lr, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -h * 0.28 + lr); ctx.lineTo(0, h * 0.5); ctx.moveTo(-h * 0.26, -h * 0.02); ctx.lineTo(h * 0.26, -h * 0.02); ctx.stroke();
  }
  function wedjat(ctx, w, col) {                  // oog van Horus
    const h = w * 0.42;
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = Math.max(1.3, w * 0.09); ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.quadraticCurveTo(0, -h * 1.5, w / 2, h * 0.1); ctx.quadraticCurveTo(0, h * 0.9, -w / 2, 0); ctx.stroke();
    ctx.beginPath(); ctx.arc(w * 0.02, -h * 0.12, h * 0.3, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-w * 0.42, -h * 0.85); ctx.quadraticCurveTo(0, -h * 1.9, w * 0.48, -h * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w * 0.05, h * 0.55); ctx.lineTo(w * 0.05, h * 1.15); ctx.quadraticCurveTo(w * 0.05, h * 1.7, w * 0.32, h * 1.5); ctx.stroke();
  }
  function tutMask(ctx, u, c) {                   // ±17u breed, ±22u hoog
    const head = () => {
      ctx.beginPath(); ctx.moveTo(-9 * u, -21 * u); ctx.quadraticCurveTo(0, -24 * u, 9 * u, -21 * u);
      ctx.lineTo(17 * u, 3 * u); ctx.lineTo(15 * u, 17 * u); ctx.lineTo(8.5 * u, 17 * u); ctx.lineTo(8 * u, 4 * u);
      ctx.lineTo(-8 * u, 4 * u); ctx.lineTo(-8.5 * u, 17 * u); ctx.lineTo(-15 * u, 17 * u); ctx.lineTo(-17 * u, 3 * u); ctx.closePath();
    };
    head(); ctx.fillStyle = c.gold; ctx.fill();
    ctx.save(); head(); ctx.clip(); ctx.strokeStyle = c.blue; ctx.lineWidth = 1.7 * u; ctx.lineCap = "butt";
    for (let k = -7; k <= 7; k++) { if (k % 2 === 0) continue; const a = k * 0.105; ctx.beginPath(); ctx.moveTo(0, -15 * u); ctx.lineTo(Math.sin(a) * 42 * u, -15 * u + Math.cos(a) * 42 * u); ctx.stroke(); }
    ctx.restore();
    head(); ctx.strokeStyle = c.goldDeep; ctx.lineWidth = 0.7 * u; ctx.stroke();
    ctx.fillStyle = c.goldHi; ctx.beginPath(); ctx.ellipse(0, -2 * u, 7.4 * u, 10.2 * u, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = c.goldDeep; ctx.lineWidth = 0.5 * u; ctx.stroke();
    ctx.lineCap = "round";
    for (const d of [-1, 1]) {
      ctx.strokeStyle = c.blueDark; ctx.lineWidth = 1.2 * u; ctx.beginPath(); ctx.moveTo(d * 1.4 * u, -7.4 * u); ctx.quadraticCurveTo(d * 3.8 * u, -9 * u, d * 6.3 * u, -7 * u); ctx.stroke();
      ctx.fillStyle = "#fff8e6"; ctx.beginPath(); ctx.ellipse(d * 3.6 * u, -4.6 * u, 2.2 * u, 1.1 * u, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = c.kohl; ctx.beginPath(); ctx.arc(d * 3.6 * u, -4.6 * u, 0.8 * u, 0, TAU); ctx.fill();
      ctx.strokeStyle = c.kohl; ctx.lineWidth = 0.8 * u; ctx.beginPath(); ctx.ellipse(d * 3.6 * u, -4.6 * u, 2.3 * u, 1.2 * u, 0, Math.PI, TAU); ctx.moveTo(d * 5.7 * u, -4.6 * u); ctx.lineTo(d * 8.2 * u, -3.7 * u); ctx.stroke();
    }
    ctx.strokeStyle = c.goldDeep; ctx.lineWidth = 0.7 * u;
    ctx.beginPath(); ctx.moveTo(0, -3.4 * u); ctx.lineTo(-0.3 * u, 1.4 * u); ctx.moveTo(-1.5 * u, 2 * u); ctx.quadraticCurveTo(0, 2.9 * u, 1.5 * u, 2 * u); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-2.6 * u, 4.7 * u); ctx.quadraticCurveTo(0, 5.6 * u, 2.6 * u, 4.7 * u); ctx.moveTo(-1.8 * u, 5.8 * u); ctx.quadraticCurveTo(0, 6.5 * u, 1.8 * u, 5.8 * u); ctx.stroke();
    ctx.fillStyle = c.blueDark; ctx.beginPath(); ctx.ellipse(0, -14.4 * u, 1 * u, 2 * u, 0, 0, TAU); ctx.fill();   // uraeus
    ctx.fillStyle = c.goldDeep; ctx.beginPath(); ctx.arc(0, -16.6 * u, 1.1 * u, 0, TAU); ctx.fill();
    ctx.fillStyle = c.blueDark; ctx.beginPath(); ctx.moveTo(-1.9 * u, 9 * u); ctx.lineTo(1.9 * u, 9 * u); ctx.lineTo(1.5 * u, 19 * u); ctx.lineTo(-1.5 * u, 19 * u); ctx.closePath(); ctx.fill();   // baard
    ctx.fillStyle = c.gold; for (const y of [11, 13.4, 15.8, 18.2]) ctx.fillRect(-1.8 * u, y * u, 3.6 * u, 0.7 * u);
    ctx.fillStyle = c.goldDeep; ctx.beginPath(); ctx.ellipse(0, 19.5 * u, 2 * u, 1 * u, 0, 0, TAU); ctx.fill();
  }
  function tutLayers(e) {
    const { W, H, P, stats } = e, S = scaleOf(W, H), HS = H / 844, c = P.tut, END = 4.2;
    const glow = glowSprite(c.glow, true), mx = W / 2, my = 0.3 * H, u = 3.4 * S;
    const motes = Array.from({ length: 46 }, () => ({ x: rnd(0.08, 0.92), y: rnd(0.12, 0.58), vy: rnd(8, 26) * S, sx: rnd(4, 12) * S, ph: rnd(0, TAU), tw: rnd(3, 9), r: rnd(1.4, 3) * S, b: rnd(0.2, 1.2), col: pick(c.dust) }));
    const sym = [];
    for (let i = 0; i < 12; i++) sym.push({ x: 0.06 + ((i * PHI) % 1) * 0.88, delay: 0.7 + rnd(0, 1.0), dur: rnd(2.4, 3.0), top: 40, sway: rnd(8, 16) * S, swf: rnd(2, 4), ph: rnd(0, TAU), rot: ((r0, vr) => (v) => r0 + vr * v)(rnd(-0.3, 0.3), rnd(-0.9, 0.9)), h: rnd(18, 26) * S, draw(ctx) { ankh(ctx, this.h, c.ankh); } });
    for (let i = 0; i < 8; i++) sym.push({ x: 0.1 + ((i * PHI + 0.4) % 1) * 0.8, delay: 0.9 + rnd(0, 1.0), dur: rnd(2.4, 3.0), top: 40, sway: rnd(8, 16) * S, swf: rnd(2, 4), ph: rnd(0, TAU), rot: ((r0, vr) => (v) => r0 + vr * v)(rnd(-0.3, 0.3), rnd(-0.9, 0.9)), w: rnd(20, 28) * S, draw(ctx) { wedjat(ctx, this.w, c.ankh); } });
    const fall = fallLayer(sym, END, stats);
    return [{ end: END, draw(ctx, t, W2, H2) {
      const fade = clamp((END - t) / 0.6, 0, 1), rise = easeOut((t - 0.35) / 0.9);
      // kaarsvlam-gloed achter het masker
      const flick = 0.78 + 0.12 * Math.sin(t * 13) + 0.06 * Math.sin(t * 23 + 1), d = 230 * S * (0.6 + 0.4 * rise);
      ctx.globalAlpha = fade * rise * (P.dark ? 0.55 : 0.4) * flick; ctx.globalCompositeOperation = P.comp; ctx.drawImage(glow, mx - d / 2, my - d / 2, d, d); ctx.globalCompositeOperation = "source-over";
      // stof in het licht
      ctx.globalCompositeOperation = P.comp;
      for (const m of motes) {
        const s = t - 0.2; if (s < 0) continue; const x = m.x * W2 + Math.sin(m.ph + s * 0.9) * m.sx, y = m.y * H2 - m.vy * s;
        ctx.globalAlpha = fade * clamp(s / 0.6, 0, 1) * (0.25 + 0.75 * Math.abs(Math.sin(m.ph + m.tw * t))) * 0.9;
        const dd = m.r * 7 * (0.6 + m.b * 0.5); ctx.drawImage(glowSprite(m.col), x - dd / 2, y - dd / 2, dd, dd); stats.drawn++;
      }
      ctx.globalCompositeOperation = "source-over";
      // het masker komt uit het donker omhoog
      if (rise > 0) {
        ctx.globalAlpha = fade * rise; ctx.save(); ctx.translate(mx, my + (1 - rise) * 16 * S); ctx.scale(0.88 + 0.12 * rise, 0.88 + 0.12 * rise);
        tutMask(ctx, u, c); ctx.restore(); stats.drawn += 12;
      }
      ctx.globalAlpha = 1; fall.draw(ctx, t, W2, H2);
    } }];
  }

  // ── 5. Eerste Nobelprijzen: spotlights, medaille aan lint om het jaartal ────
  function medal(ctx, r, c) {
    ctx.strokeStyle = c.goldDeep; ctx.lineWidth = r * 0.11; ctx.beginPath(); ctx.ellipse(0, -r * 1.08, r * 0.17, r * 0.24, 0, 0, TAU); ctx.stroke();
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, c.goldHi); g.addColorStop(0.55, c.gold); g.addColorStop(1, c.goldDeep);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = c.goldDeep; ctx.lineWidth = r * 0.07; ctx.beginPath(); ctx.arc(0, 0, r * 0.8, 0, TAU); ctx.stroke();
    ctx.fillStyle = c.goldHi; star5(ctx, r * 0.5);
  }
  function nobelLayers(e) {
    const { W, H, P, stats, anchors } = e, S = scaleOf(W, H), HS = H / 844, c = P.nobel, END = 4.0;
    const hookY = -14 * S, mr = 19 * S, spread = Math.min(72 * S, W * 0.2);
    const beams = [{ x: 0.2, ph: 0.0 }, { x: 0.5, ph: 2.1 }, { x: 0.8, ph: 4.2 }];
    const coins = Array.from({ length: 16 }, (_, i) => ({ x: 0.06 + ((i * PHI) % 1) * 0.88, delay: 0.5 + rnd(0, 1.1), dur: rnd(2.2, 2.9), top: 30, sway: rnd(8, 16) * S, swf: rnd(2, 4), ph: rnd(0, TAU), rot: ((r0, vr) => (v) => r0 + vr * v)(rnd(-0.3, 0.3), rnd(-0.8, 0.8)),
      r: rnd(7, 10) * S, fl: rnd(7, 12), draw(ctx, v) { coin(ctx, this.r, c, Math.cos(this.ph + v * this.fl)); } }));
    const glit = Array.from({ length: 32 }, () => ({ x: Math.random(), delay: rnd(0.4, 1.4), dur: rnd(2.2, 3.0), top: 20, sway: rnd(6, 14) * S, swf: rnd(5, 9), ph: rnd(0, TAU), rot: (v) => v * 3, r: rnd(2.2, 4.2) * S, tw: rnd(8, 14), col: pick(c.glit),
      draw(ctx, v, t) { ctx.globalAlpha *= 0.45 + 0.55 * Math.abs(Math.sin(this.ph + this.tw * t)); ctx.strokeStyle = this.col; ctx.lineWidth = 1.3 * S; sparkle(ctx, this.r); } }));
    const fC = fallLayer(coins, END, stats), fG = fallLayer(glit, END, stats);
    return [{ end: END, draw(ctx, t, W2, H2) {
      const fade = clamp((END - t) / 0.6, 0, 1), bA = clamp(t / 0.5, 0, 1) * fade;
      const pill = anchors.pill, restY = pill.y - pill.h / 2 - 24 * S, hx = pill.x, L = restY - hookY;   // per frame: de kaart kan nog schuiven
      for (const b of beams) {
        const ax = b.x * W2, sway = Math.sin(t * 0.9 + b.ph) * 0.07 * W2, g = ctx.createLinearGradient(0, 0, 0, 0.85 * H2);
        g.addColorStop(0, `rgba(${c.beam},${c.beamA * bA})`); g.addColorStop(1, `rgba(${c.beam},0)`);
        ctx.globalAlpha = 1; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ax - 6 * S, -4); ctx.lineTo(ax + 6 * S, -4); ctx.lineTo(ax + 0.17 * W2 + sway, 0.85 * H2); ctx.lineTo(ax - 0.17 * W2 + sway, 0.85 * H2); ctx.closePath(); ctx.fill(); stats.drawn++;
      }
      ctx.globalCompositeOperation = P.comp; fG.draw(ctx, t, W2, H2); ctx.globalCompositeOperation = "source-over";
      const s = t - 0.25;
      if (s > 0) {
        const Lt = Math.max(0.05 * L, L * (1 - Math.exp(-4.5 * s) * Math.cos(10 * s))), th = 0.11 * Math.exp(-1.3 * s) * Math.sin(8 * s);
        const mx = hx + Lt * Math.sin(th), my = hookY + Lt * Math.cos(th), lx = mx - Math.sin(th) * mr * 1.25, ly = my - Math.cos(th) * mr * 1.25;
        ctx.globalAlpha = fade; ctx.lineCap = "butt";
        for (const d of [-1, 1]) {
          ctx.strokeStyle = c.ribbon; ctx.lineWidth = 11 * S; ctx.beginPath(); ctx.moveTo(hx + d * spread, hookY); ctx.lineTo(lx, ly); ctx.stroke();
          ctx.strokeStyle = c.ribbonEdge; ctx.lineWidth = 2.2 * S; ctx.beginPath(); ctx.moveTo(hx + d * spread, hookY); ctx.lineTo(lx, ly); ctx.stroke();
        }
        ctx.save(); ctx.translate(mx, my); ctx.rotate(-th); medal(ctx, mr, c); ctx.restore(); stats.drawn += 3;
        if (s > 1.0) {
          ctx.strokeStyle = c.goldHi; ctx.lineWidth = 1.4 * S;
          for (const [ox, oy, ph] of [[-0.45, -0.5, 0], [0.5, 0.35, 1.9]]) { const k = Math.abs(Math.sin(t * 5 + ph)); ctx.globalAlpha = fade * k; ctx.save(); ctx.translate(mx + ox * mr, my + oy * mr); sparkle(ctx, 6 * S * k + 2 * S); ctx.restore(); }
        }
      }
      ctx.globalAlpha = 1; fC.draw(ctx, t, W2, H2);
    } }];
  }

  const LAYERS = {
    newyear: newYearLayers, kings: kingsLayers, lunar: lunarLayers, eid: eidLayers, valentine: valentineLayers,
    patrick: patrickLayers, carnival: carnivalLayers, easter: easterLayers, pride: prideLayers, halloween: halloweenLayers,
    muertos: muertosLayers, diwali: diwaliLayers, xmas: xmasLayers,
    rome: romeLayers, moon: moonLayers, gregorian: gregorianLayers,
    ides: idesLayers, everest: everestLayers, columbus: columbusLayers, flight: flightLayers,
    galileo: galileoLayers, magna: magnaLayers, rome476: rome476Layers, tut: tutLayers, nobel: nobelLayers,
  };
  // Anker voor Rome/maanlanding: de groene jaartal-pil op de uitslagkaart, in
  // viewport-coördinaten (het fx-canvas is position:fixed). Ontbreekt hij, dan
  // het midden van het scherm.
  function anchor() {
    const el = document.querySelector("#result-text .year-pill");
    if (!el) return { x: innerWidth / 2, y: innerHeight * 0.55, w: 72, h: 28 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
  }
  return {
    has: (id) => Object.prototype.hasOwnProperty.call(LAYERS, id),
    ids: Object.keys(LAYERS),
    build(id, W, H) {
      return LAYERS[id]({ W, H, P: palette(currentTheme()), stats: { drawn: 0 }, anchors: { get pill() { return anchor(); } } });
    },
  };
})();
