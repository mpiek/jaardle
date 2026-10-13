// Voltreffer-vieringen (VoltrefferFx): een eigen soort viering voor een winst in één gok, die het vuurwerk vervangt.
// Eerste: "In de roos" (🎯), de beloning voor de hoogste Perfectionist-trede (250 perfecte scores). Mockup en keuze:
// 12–13/10/2026 (jaardle-tools/mockups/voltreffer-perfectionist). Apart bestand, net als RewardFx/HolidayFx: game.js
// draagt er niets van mee en haalt het pas op voor wie de viering heeft (of de voorvertoning ?fx=roos gebruikt).
// Elke laag: { end, draw(ctx, t, W, H) } op de runFx-lus, alles vector, en een zuivere functie van t (al het toeval komt
// uit een geseede PRNG bij het bouwen). Alles wat thema of plek is komt via opts uit game.js:
//   { anchor: {x,y,w,h} (de jaartal-pil, viewport-px, zonder de pop-schaal), card: {x,y,w,h} (#result),
//     theme: "light" | "dark" (de familie, currentTheme()), seed, knal: 1 | 2 | 3 (~90 / 180 / 270 vonken, standaard 2) }
window.VoltrefferFx = (() => {
  "use strict";
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, u) => a + (b - a) * u;
  const smooth = (u) => { u = clamp(u); return u * u * (3 - 2 * u); };

  // mulberry32: klein, snel, genoeg voor richtingen en vertragingen.
  function rng32(seed) {
    let a = (seed | 0) || 1;
    return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; };
  // Gloed-sprite (één keer gerenderd): kern tot `core` van de straal, dan uitdovend naar dezelfde tint met alfa 0.
  function sprite(hex, size, core, a0) {
    if (typeof document === "undefined" || !document.createElement) return null;
    const s = document.createElement("canvas"); s.width = s.height = size;
    const g = s.getContext && s.getContext("2d"); if (!g) return null;
    const r = size / 2, rg = g.createRadialGradient(r, r, 0, r, r, r);
    rg.addColorStop(0, rgba(hex, a0)); rg.addColorStop(core, rgba(hex, a0)); rg.addColorStop(0.42, rgba(hex, a0 * 0.28)); rg.addColorStop(1, rgba(hex, 0));
    g.fillStyle = rg; g.fillRect(0, 0, size, size); return s;
  }
  const blit = (ctx, sp, x, y, d) => { if (sp) ctx.drawImage(sp, x - d / 2, y - d / 2, d, d); };
  function rr(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  // Warm wit-goud op de donkere familie (mengt met "lighter"), donker brons-goud als inkt op de lichte (zoals fwPalette).
  function palette(theme) {
    return theme !== "light"
      ? { dark: true, comp: "lighter", flashA: 0.9, core: "#fff8e1", light: "#ffe9a6", gold: "#f4c430", deep: "#d9a21f", fam: ["#fff6d5", "#ffc94d"], bloom: "#ffd98a" }
      : { dark: false, comp: "source-over", flashA: 0.32, core: "#5c3d00", light: "#8a5c00", gold: "#a4731a", deep: "#7a5200", fam: ["#7a5200", "#b8860b"], bloom: "#d4a72c" };
  }
  function geom(W, H, o) {
    const A = o.anchor && o.anchor.w ? o.anchor : { x: W / 2 - 36, y: H * 0.56, w: 72, h: 28 };
    const C = o.card && o.card.w ? o.card : { x: 16, y: A.y - 46, w: W - 32, h: 196 };
    const S = clamp(Math.min(W, H) / 400, 0.8, 1.5);
    return { A, C, S, ax: A.x + A.w / 2, ay: A.y + A.h / 2 };
  }
  // Tekent een pad twee keer: binnen de kaart gedempt (alsof het erachter ligt), erbuiten vol. Zo blijft de uitslag leesbaar.
  function twoPass(ctx, C, W, H, dimA, fullA, path) {
    if (dimA > 0.004) { ctx.save(); ctx.beginPath(); ctx.rect(C.x, C.y, C.w, C.h); ctx.clip(); ctx.globalAlpha = dimA; path(); ctx.restore(); }
    if (fullA > 0.004) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(C.x, C.y, C.w, C.h); ctx.clip("evenodd"); ctx.globalAlpha = fullA; path(); ctx.restore(); }
  }

  // ── Vonken: het recept van het first-try-vuurwerk (game.js fireworksLayer/fwKin/fwDrawSparks) ────────────────────────
  const FW = {
    peony:   { speed: 265, k: 2.3, g: 210, life: [1.15, 1.6], tau: 0.055, core: 0.3,  twinkle: 0 },
    chrys:   { speed: 300, k: 2.5, g: 190, life: [1.3, 1.75], tau: 0.1,   core: 0.25, twinkle: 0 },
    crackle: { speed: 250, k: 2.4, g: 230, life: [1.2, 1.7],  tau: 0.05,  core: 0.5,  twinkle: 0.4 },
  };
  const FW_STEPS = 6;
  // x(s) = x0 + vx·E,  y(s) = y0 + (g/k)·s + (vy − g/k)·E,  E = (1 − e^(−ks))/k
  const kin = (p, s, x0, y0) => { const ek = Math.exp(-p.k * s), E = (1 - ek) / p.k, gk = p.g / p.k; return [x0 + p.vx * E, y0 + gk * s + (p.vy - gk) * E, p.vx * ek, gk + (p.vy - gk) * ek]; };
  // bol geprojecteerd op het vlak: veel vonken aan de rand, weinig in het midden
  function burst(rng, T, n, at, S, mul) {
    const sparks = [];
    for (let i = 0; i < n; i++) {
      const ang = rng() * TAU, z = rng() * 2 - 1, f = Math.sqrt(1 - z * z), v = T.speed * S * mul * f * (0.82 + rng() * 0.24);
      sparks.push({ vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, k: T.k, g: T.g * S, life: T.life[0] + rng() * (T.life[1] - T.life[0]),
        ci: rng() < T.core ? 0 : 1, seed: (rng() * 1e4) | 0, tau: T.tau, twinkle: T.twinkle });
    }
    return { at, sparks };
  }
  // Alle knallen samen gebundeld: één gloedpas (donker) + 2 kleuren × 6 alfa-treden = hooguit 13 stroke()-aanroepen per
  // frame, hoeveel vonken er ook zijn. Streepje van (pos − v·tau) naar pos; knetter = om de paar frames een vonk overslaan.
  function drawSparks(ctx, bursts, t, P, x0, y0, S) {
    const tick = (t * 26) | 0, w = 2.3 * S;
    ctx.globalCompositeOperation = P.comp; ctx.lineCap = "round";
    if (P.dark) {
      let m = 0; ctx.beginPath();
      for (const B of bursts) { const s = t - B.at; if (s < 0) continue;
        for (const p of B.sparks) { if (s > p.life * 0.75) continue; const q = kin(p, s, x0, y0); ctx.moveTo(q[0] - q[2] * p.tau, q[1] - q[3] * p.tau); ctx.lineTo(q[0], q[1]); m++; } }
      if (m) { ctx.globalAlpha = 0.16; ctx.lineWidth = w * 3.4; ctx.strokeStyle = P.fam[1]; ctx.stroke(); }
    }
    for (let c = 0; c < 2; c++) for (let b = 0; b < FW_STEPS; b++) {
      let m = 0; ctx.beginPath();
      for (const B of bursts) { const s = t - B.at; if (s < 0) continue;
        for (const p of B.sparks) {
          if (p.ci !== c || s > p.life) continue;
          const u = s / p.life, a = u < 0.5 ? 1 : 2 - 2 * u;
          if (Math.min(FW_STEPS - 1, (a * FW_STEPS) | 0) !== b) continue;
          if (p.twinkle && u > p.twinkle && (p.seed + tick) % 3 === 0) continue;
          const q = kin(p, s, x0, y0); ctx.moveTo(q[0] - q[2] * p.tau, q[1] - q[3] * p.tau); ctx.lineTo(q[0], q[1]); m++;
        } }
      if (!m) continue;
      ctx.globalAlpha = (b + 1) / FW_STEPS; ctx.lineWidth = w * (0.45 + 0.55 * (b + 1) / FW_STEPS); ctx.strokeStyle = P.fam[c]; ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
  }

  // ── In de roos ──────────────────────────────────────────────────────────────────────────────────────────────────────
  // Een schietschijf om het jaartal: de ringen schakelen van buiten naar binnen in (de schijf "wapent"), één schot komt van
  // linksboven en slaat precies in het midden in. Dáár knalt het, met de kracht van het vuurwerk: een flits, een knal van
  // kometen-vonken uit de pil, een kwart seconde later een kleinere knetter-naknal, en één harde schokgolf die elke ring laat
  // opgloeien. Daarna doven de ringen van buiten naar binnen; de halo om het jaartal blijft het langst. Binnen de kaart
  // staan de ringen gedempt, alsof de kaart erbovenop ligt (de vonken mogen wél over de kaart, net als de vuurwerkflits).
  function roos(W, H, o) {
    const { A, C, S, ax, ay } = geom(W, H, o), P = palette(o.theme), rng = rng32(o.seed);
    const rh = Math.max(A.w, A.h) / 2 + 6, R = Math.min(W * 0.47, 200 * S);
    const rings = [1, 2, 3, 4].map((k) => rh + (R - rh) * k / 4);
    const arm = (k) => 0.22 + (4 - k) * 0.14;                           // k = 0 is de halo om de pil (als laatste)
    const T_SHOT = 1.0, T_HIT = 1.22, T_SUB = T_HIT + 0.25, END = 3.6;
    const from = [ax - W * 0.62, ay - H * 0.46];
    // ×1 ≈ 90, ×2 ≈ 180 (standaard), ×3 ≈ 270 vonken. Hoofdknal pioen + chrysant op 1,3 × de vuurwerksnelheid (hij vult de
    // schijf tot de derde ring: een vuurwerkknal is één van negen, deze is de enige); naknal knetter op 0,7 ×.
    const knal = clamp(Math.round(o.knal || 2), 1, 3), N = 90 * knal, nP = Math.round(N * 0.5), nC = Math.round(N * 0.22);
    const bursts = [burst(rng, FW.peony, nP, T_HIT, S, 1.3), burst(rng, FW.chrys, nC, T_HIT, S, 1.3), burst(rng, FW.crackle, N - nP - nC, T_SUB, S, 0.7)];
    // flits = zachte bloei (0,9 op donker, 0,3 op licht, zoals het vuurwerk) + een witte hete kern op de pil. Op licht een
    // goudgloed i.p.v. donkere inkt: midden op het jaartal las een donkere flits als een vlek.
    const bloom = sprite(P.bloom, 128, 0.03, 1), hot = sprite("#ffffff", 64, 0.12, 1), haloSp = sprite(P.gold, 128, 0.02, 0.5);
    const waveR = (t) => rh + (R * 1.2 - rh) * (1 - Math.pow(1 - clamp((t - T_HIT) / 0.6), 4));   // snel weg, dan uitlopend
    const ringA = (k, r, t) => {
      if (t < arm(k)) return 0;
      const s = t - arm(k), base = (k ? 0.5 : 0.8) * (1 - 0.3 * smooth((t - 2.0) / 0.6));
      const spike = 0.5 * Math.exp(-s / 0.22);
      const flare = t > T_HIT ? 0.55 * Math.exp(-Math.pow((waveR(t) - r) / (16 * S), 2)) : 0;
      const off = k ? 2.15 + (4 - k) * 0.2 : 3.05;
      return clamp(base + spike + flare) * (1 - smooth((t - off) / 0.55));
    };
    const circle = (ctx, r) => { ctx.beginPath(); ctx.arc(ax, ay, r, 0, TAU); };
    // de halo volgt de vorm van de pil zelf (pilvormig, volle ronding), met een vaste marge rondom
    const halo = (ctx, pad) => { ctx.beginPath(); rr(ctx, A.x - pad, A.y - pad, A.w + 2 * pad, A.h + 2 * pad, (A.h + 2 * pad) / 2); };
    return [{ end: END, draw(ctx, t, W, H) {
      ctx.globalCompositeOperation = P.comp; ctx.lineCap = "round";
      for (let k = 1; k <= 4; k++) {   // de vier ringen; een opgloeiende ring krijgt een brede gloedstreep
        const r = rings[k - 1], a = ringA(k, r, t); if (a <= 0.004) continue;
        const s = t - arm(k), glowA = Math.max(0.5 * Math.exp(-s / 0.22), t > T_HIT ? 0.55 * Math.exp(-Math.pow((waveR(t) - r) / (16 * S), 2)) : 0);
        twoPass(ctx, C, W, H, a * 0.28, a, () => {
          if (glowA > 0.08) { circle(ctx, r); ctx.lineWidth = 9 * S; ctx.strokeStyle = P.gold; ctx.globalAlpha *= glowA * 0.45; ctx.stroke(); ctx.globalAlpha /= glowA * 0.45; }
          circle(ctx, r); ctx.lineWidth = 1.7 * S; ctx.strokeStyle = P.dark ? P.light : P.deep; ctx.stroke();
        });
      }
      { const a = ringA(0, rh, t);   // de halo om de pil (het "goud" van de schijf): altijd vol
        if (a > 0.004) { const s = t - arm(0), h = 0.6 * Math.exp(-s / 0.25) + (t > T_HIT ? 0.6 * Math.exp(-(t - T_HIT) / 0.5) : 0);
          ctx.globalAlpha = a * 0.5 * clamp(h); if (ctx.globalAlpha > 0.01) blit(ctx, haloSp, ax, ay, (A.w + 40) * 1.9);
          halo(ctx, 5); ctx.lineWidth = 2.2 * S; ctx.strokeStyle = P.dark ? P.core : P.deep; ctx.globalAlpha = a; ctx.stroke(); }
      }
      if (t > T_HIT && t < T_HIT + 0.6) {   // de schokgolf: dik en hard weg, dan dunner en uitdovend
        const u = (t - T_HIT) / 0.6, r = waveR(t);
        twoPass(ctx, C, W, H, 0.35 * (1 - u), 0.95 * (1 - u), () => { circle(ctx, r); ctx.lineWidth = (5.5 - 4 * u) * S; ctx.strokeStyle = P.dark ? P.core : P.deep; ctx.stroke(); });
      }
      if (t >= T_SHOT && t <= T_HIT) {   // het schot: een lichtpunt met streep, versnellend naar het midden
        const u = (t - T_SHOT) / (T_HIT - T_SHOT), e = u * u, e2 = Math.max(0, u - 0.1) ** 2;
        const x = lerp(from[0], ax, e), y = lerp(from[1], ay, e), qx = lerp(from[0], ax, e2), qy = lerp(from[1], ay, e2);
        ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(x, y);
        ctx.lineWidth = 7 * S; ctx.strokeStyle = P.gold; ctx.globalAlpha = 0.25; ctx.stroke();
        ctx.lineWidth = 2.4 * S; ctx.strokeStyle = P.dark ? P.core : P.deep; ctx.globalAlpha = 1; ctx.stroke();
      }
      // inslag: grote flits, kleinere flits bij de naknal, en de vonken
      const fh = (t - T_HIT) / 0.32;
      if (fh >= 0 && fh < 1) { ctx.globalCompositeOperation = P.comp; ctx.globalAlpha = P.flashA * Math.pow(1 - fh, 1.5); blit(ctx, bloom, ax, ay, (130 + 270 * fh) * S); }
      if (t >= T_SUB && t < T_SUB + 0.22) {
        const f = (t - T_SUB) / 0.22;
        ctx.globalCompositeOperation = P.comp; ctx.globalAlpha = P.flashA * 0.55 * (1 - f); blit(ctx, bloom, ax, ay, (60 + 140 * f) * S);
      }
      if (t >= T_HIT) drawSparks(ctx, bursts, t, P, ax, ay, S);
      // de hete kern ná de vonken: op licht dekt hij zo de kluit donkere vonken in het midden af (die las als een vlek)
      if (fh >= 0 && fh < 1) { ctx.globalCompositeOperation = P.comp; ctx.globalAlpha = (P.dark ? 1 : 0.85) * (1 - fh) * (1 - fh); blit(ctx, hot, ax, ay, (46 + 70 * fh) * S); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    } }];
  }

  const LAYERS = { roos };
  return {
    ids: Object.keys(LAYERS),
    has: (id) => Object.prototype.hasOwnProperty.call(LAYERS, id),
    build(id, W, H, opts) { return LAYERS[id](W, H, { seed: 1, theme: "dark", ...(opts || {}) }); },
  };
})();
