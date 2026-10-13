// Voltreffer-vieringen (VoltrefferFx): een eigen soort viering voor een winst in één gok, die het vuurwerk vervangt.
// "In de roos" (🎯): de beloning voor de hoogste Perfectionist-trede (250 perfecte scores). "Eclips": de beloning voor
// capstone-obsidiaan. Mockups en keuzes: 12–13/10/2026 (jaardle-tools/mockups/voltreffer-perfectionist en -obsidiaan). Apart bestand, net als RewardFx/HolidayFx: game.js
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
    // follow: game.js schuift deze laag per frame mee met de jaartal-pil (alles hier hangt aan de pil)
    return [{ end: END, follow: true, draw(ctx, t, W, H) {
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


  // ── Eclips (obsidiaan) ───────────────────────────────────────────────────────────────────────────────────────────
  // De beloning van capstone-obsidiaan (alle vijf de reeksen op de top), gekozen 13/10/2026 uit de mockup
  // jaardle-tools/mockups/voltreffer-obsidiaan (concept Eclips, knal ×2). Eigen blok met eigen hulpjes (rgba op [r,g,b],
  // blit met alfa): letterlijk de mockup-laag, alleen de meet-teller is eruit.
  const eclips = (() => {
    const TAU = Math.PI * 2;
    const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
    const seg = (t, a, b) => clamp((t - a) / (b - a));
    const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
    const eo = (k) => 1 - Math.pow(1 - clamp(k), 3);
    const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
    function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    // palet: zwart vulkaanglas met een violette glans (flair-fx.css); licht thema = diepere violet op crème
    const OBS = [166, 143, 224], GLASS = [7, 4, 15], OBS_L = [93, 63, 184], OBS_LD = [67, 44, 143], INK = [22, 11, 44];
    function setup(W, H, opts) {
      const o = opts || {}, dark = (o.theme || "dark") !== "light";
      const mk = o.makeCanvas || ((w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; });
      const a = o.anchor && o.anchor.w ? o.anchor : null;
      const A = a ? { x: a.x + a.w / 2, y: a.y + a.h / 2, w: a.w, h: a.h } : { x: W / 2, y: H * 0.52, w: 72, h: 30 };
      const mw = Math.min(W, 560);
      const card = o.card && o.card.w ? o.card : { x: (W - mw) / 2 + 16, y: A.y - 44, w: mw - 32, h: 196 };
      return { dark, mk, A, card, seed: (o.seed == null ? 7 : o.seed) | 0, S: clamp(Math.min(W, H) / 400, 0.6, 1.6) };
    }
    // zachte gloed-sprite: dekkende kern tot `core`, dan uitdovend naar dezelfde tint met alfa 0 (nooit naar zwart)
    function glow(mk, col, core = 0.06, size = 64, stops) {
      const c = mk(size, size), g = c.getContext("2d"), h = size / 2, rg = g.createRadialGradient(h, h, 0, h, h, h);
      if (stops) for (const [p, cc, a] of stops) rg.addColorStop(p, rgba(cc, a));
      else { rg.addColorStop(0, rgba(col, 1)); rg.addColorStop(core, rgba(col, 1)); rg.addColorStop(0.35, rgba(col, 0.35)); rg.addColorStop(1, rgba(col, 0)); }
      g.fillStyle = rg; g.fillRect(0, 0, size, size);
      return c;
    }
    // (zet globalAlpha daarna terug: de laag erna tekent met zijn eigen rgba-alfa)
    const blit = (ctx, sp, x, y, d, a) => { if (a <= 0.003 || d <= 0) return; ctx.globalAlpha = clamp(a); ctx.drawImage(sp, x - d / 2, y - d / 2, d, d); ctx.globalAlpha = 1; };
    // gebundeld tekenen: deeltjes per emmer (kleur × alfa-trede) in één pad
    function flushRects(ctx, buckets, cols, steps, aMax) {
      for (let i = 0; i < buckets.length; i++) {
        const b = buckets[i]; if (!b.length) continue;
        ctx.fillStyle = rgba(cols[(i / steps) | 0], ((i % steps) + 1) / steps * aMax); ctx.beginPath();
        for (let k = 0; k < b.length; k += 3) ctx.rect(b[k], b[k + 1], b[k + 2], b[k + 2]);
        ctx.fill(); b.length = 0;
      }
    }
    const done = (ctx) => { ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; };

    /* ═══════════ 1 · Eclips: het licht gaat even weg, en komt terug met een knal ═══════════
       Een sluier dimt de pagina (het minst over de kaart), boven de kaart vormt zich een zwarte schijf met een violette
       corona en de gekantelde ring met het lichtpunt uit het flair-effect. Dan de diamantring: een lichtpunt zwelt aan de
       rand, en op TX barst de schijf: vonken als komeetstrepen (het vuurwerk-recept: gesloten vorm met luchtweerstand en
       zwaartekracht, gebundeld per kleur × zes alfa-treden), een flits, één korte opflits over het scherm, de zon die terug
       is als heldere kern, twee schokringen en negen scherfjes van de schijf. De sluier trekt weg terwijl de vonken uitdoven.
       opts.knal = 1 | 2 | 3 → ~100 / ~200 / ~300 vonken (standaard 2). */
    function eclips(W0, H0, opts) {
      const C = setup(W0, H0, opts), { dark, mk, S } = C;
      const KNAL = clamp(Math.round((opts && opts.knal) || 2), 1, 3), NS = 100 * KNAL;
      const TX = 1.75, END = 3.9;   // de knal op TX; de langste vonk leeft 1,75 s
      const r = rng(C.seed * 31 + 1);
      const RING = Array.from({ length: 240 }, () => ({ u: r(), a0: r() * TAU, s: 0.9 + r() * 1.5, b: 0.45 + 0.55 * r() }));
      const BEAMS = Array.from({ length: 16 }, (_, i) => ({ a: (i / 16) * TAU + (r() - 0.5) * 0.3, w: 0.06 + 0.07 * r(), L: 1.9 + 1.5 * r(), ph: r() * TAU, f: 0.7 + 0.5 * r() }));
      const STARS0 = Array.from({ length: 80 }, () => ({ x: r(), y: r(), a: 0.3 + 0.7 * r(), s: 0.8 + r() * 1.2, p: r() * TAU }));
      // vonken: drie types zoals FW_TYPES (pioen, chrysant, knetter); bol geprojecteerd op het vlak (veel aan de rand)
      const TYPES = [{ speed: 265, k: 2.3, g: 210, life: [1.15, 1.6], tau: 0.055, core: 0.3, tw: 0 }, { speed: 300, k: 2.5, g: 190, life: [1.3, 1.75], tau: 0.1, core: 0.25, tw: 0 }, { speed: 250, k: 2.4, g: 230, life: [1.2, 1.7], tau: 0.05, core: 0.5, tw: 0.4 }];
      const SP = Array.from({ length: NS }, (_, i) => {
        const T = TYPES[i % 3], ang = r() * TAU, z = r() * 2 - 1, f = Math.sqrt(1 - z * z), v = T.speed * f * (0.82 + r() * 0.24);
        return { T, ang, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, life: T.life[0] + r() * (T.life[1] - T.life[0]), ci: r() < T.core ? 0 : 1, seed: (r() * 1e4) | 0 };
      });
      // de schijf breekt in negen scherfjes zwart glas (onregelmatige drie- en vierhoeken, maat in eenheden van R)
      const DEB = Array.from({ length: 9 }, (_, i) => {
        const n = r() < 0.4 ? 4 : 3, a = (i / 9) * TAU + (r() - 0.5) * 0.5, d = 0.2 + r() * 0.6, sz = 0.24 + r() * 0.22, vs = [];
        for (let k = 0; k < n; k++) { const aa = (k / n) * TAU + (r() - 0.5) * 1.0, rr = sz * (0.6 + 0.5 * r()); vs.push(Math.cos(aa) * rr, Math.sin(aa) * rr); }
        return { a, d, vs, v: 190 + r() * 170, spin: (r() - 0.5) * 9 };
      });
      const FAM = dark ? ["#fff6ff", "#b08cff"] : ["#2b1a66", "#6a40d8"];   // kern + tint, zoals een vuurwerk-familie
      const spGlow = glow(mk, dark ? OBS : OBS_L, 0.04, 96);
      const spFlash = glow(mk, dark ? [245, 238, 255] : OBS_L, 0.03, 96);
      const spDia = glow(mk, null, 0, 64, dark ? [[0, [255, 255, 255], 1], [0.1, [255, 250, 255], 1], [0.3, [205, 189, 255], 0.55], [1, OBS, 0]] : [[0, [255, 255, 255], 1], [0.08, [255, 255, 255], 1], [0.22, OBS_L, 0.8], [1, OBS_LD, 0]]);
      const spPt = glow(mk, null, 0, 32, dark ? [[0, [255, 255, 255], 1], [0.24, [255, 255, 255], 1], [0.42, [205, 189, 255], 0.9], [0.7, [143, 108, 255], 0.5], [1, OBS, 0]] : [[0, [255, 255, 255], 1], [0.22, [255, 255, 255], 1], [0.4, [106, 64, 216], 0.9], [1, INK, 0]]);
      const RCOL = dark ? [[236, 212, 255], [196, 160, 255], [126, 86, 200]] : [[120, 90, 220], [90, 60, 190], [60, 30, 140]];
      const BK = Array.from({ length: 9 }, () => []), SB = Array.from({ length: 3 }, () => []);
      const AD = -0.62;   // hoek van de diamantring (rechtsboven)
      let G = null;
      function init(W, H) {
        const R = clamp(Math.min(W, H) * 0.105, 30, 72), cd = C.card;
        const cy = Math.max(R * 1.9 + 6, Math.min(cd.y - R * 2.0, H * 0.34));
        const stars = STARS0.map((s) => ({ x: s.x * W, y: s.y * H, a: s.a, s: s.s * S, p: s.p })).filter((s) => !(s.x > cd.x - 8 && s.x < cd.x + cd.w + 8 && s.y > cd.y - 8 && s.y < cd.y + cd.h + 8));
        // vonken in schermpixels: vertrek op de rand van de schijf, snelheid en zwaartekracht geschaald op de schermmaat
        const sp = SP.map((p) => ({ T: p.T, x0: W / 2 + Math.cos(p.ang) * R, y0: cy + Math.sin(p.ang) * R, vx: p.vx * S, vy: p.vy * S, k: p.T.k, g: p.T.g * S, life: p.life, ci: p.ci, seed: p.seed }));
        const buf = { x: new Float32Array(NS), y: new Float32Array(NS), tx: new Float32Array(NS), ty: new Float32Array(NS), b: new Int8Array(NS), g: new Uint8Array(NS) };   // kladruimte per frame
        G = { W, H, R, cx: W / 2, cy, stars, sp, buf, veil: null, beam: null, ccx: cd.x + cd.w / 2, ccy: cd.y + cd.h / 2 };
      }
      // gesloten vorm: x(s) = x0 + vx·E, y(s) = y0 + (g/k)·s + (vy − g/k)·E, E = (1 − e^(−ks))/k (fwKin)
      function kin(p, s) { const ek = Math.exp(-p.k * s), E = (1 - ek) / p.k, gk = p.g / p.k; return [p.x0 + p.vx * E, p.y0 + gk * s + (p.vy - gk) * E, p.vx * ek, gk + (p.vy - gk) * ek]; }
      function sparks(ctx, t) {
        const s0 = t - TX; if (s0 < 0 || s0 > 1.76) return;
        const tick = (t * 26) | 0, w0 = 2.2 * S, B = G.buf, sp = G.sp, N = sp.length, cd = C.card;
        // één keer per frame per vonk: kop, staart (pos − v·tau) en alfa-trede. Boven de uitslagkaart doven ze sneller
        // (tot 40 %), zodat de kaart leesbaar blijft terwijl de vonken eroverheen vallen.
        for (let i = 0; i < N; i++) {
          const p = sp[i]; B.b[i] = -1;
          if (s0 > p.life) continue;
          const u = s0 / p.life;
          if (p.T.tw && u > p.T.tw && (p.seed + tick) % 3 === 0) continue;   // knetter: om de paar frames overslaan
          const q = kin(p, s0); let a = u < 0.5 ? 1 : 2 - 2 * u;
          if (q[0] > cd.x && q[0] < cd.x + cd.w) a *= 1 - 0.6 * sstep(cd.y - 8, cd.y + 36, q[1]);
          B.x[i] = q[0]; B.y[i] = q[1]; B.tx[i] = q[0] - q[2] * p.T.tau; B.ty[i] = q[1] - q[3] * p.T.tau;
          B.b[i] = Math.min(5, (a * 6) | 0); B.g[i] = s0 <= p.life * 0.75 && a > 0.55 ? 1 : 0;
        }
        ctx.lineCap = "round";
        if (dark) {   // gloed-pas: brede, vage streep in de tint
          let m = 0; ctx.beginPath();
          for (let i = 0; i < N; i++) if (B.b[i] >= 0 && B.g[i]) { ctx.moveTo(B.tx[i], B.ty[i]); ctx.lineTo(B.x[i], B.y[i]); m++; }
          if (m) { ctx.globalAlpha = 0.16; ctx.lineWidth = w0 * 3.4; ctx.strokeStyle = FAM[1]; ctx.stroke(); }
        }
        for (let c = 0; c < 2; c++) for (let b = 0; b < 6; b++) {   // kern + tint × zes alfa-treden = hooguit 12 strokes
          let m = 0; ctx.beginPath();
          for (let i = 0; i < N; i++) { if (B.b[i] !== b || sp[i].ci !== c) continue; ctx.moveTo(B.tx[i], B.ty[i]); ctx.lineTo(B.x[i], B.y[i]); m++; }
          if (!m) continue;
          ctx.globalAlpha = (b + 1) / 6; ctx.lineWidth = w0 * (0.45 + 0.55 * (b + 1) / 6); ctx.strokeStyle = FAM[c]; ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      function ring(ctx, t, R, ca, near, cx, cy) {
        const cp = Math.cos(-0.22), sp = Math.sin(-0.22);
        for (const p of RING) {
          const rr0 = 1.45 + 1.5 * Math.pow(p.u, 1.5), rad = R * rr0, a = p.a0 + 1.9 * Math.pow(1.45 / rr0, 1.5) * t, sa = Math.sin(a);
          if ((sa > 0) !== near) continue;
          const aq = Math.round(clamp(p.b * ca * (0.65 + 0.35 * Math.cos(a + 0.6))) * 3); if (!aq) continue;
          const x = Math.cos(a) * rad, y = sa * rad * 0.24, ci = p.u < 0.3 ? 0 : p.u < 0.65 ? 1 : 2;
          BK[ci * 3 + aq - 1].push(cx + x * cp - y * sp, cy + x * sp + y * cp, p.s * S);
        }
        flushRects(ctx, BK, RCOL, 3, dark ? 0.95 : 0.85);
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-0.22);
        for (const [k, w, a] of [[1.7, 5, 0.16], [2.4, 9, 0.09]]) {
          ctx.beginPath(); ctx.ellipse(0, 0, R * k, R * k * 0.24, 0, near ? 0 : Math.PI, near ? Math.PI : TAU);
          ctx.lineWidth = w * S; ctx.strokeStyle = rgba(dark ? [200, 170, 255] : OBS_L, a * ca); ctx.stroke();
        }
        ctx.restore();
        const ap = t * 1.5 + 0.8, sp2 = Math.sin(ap);
        if ((sp2 > 0) === near) { const rad = R * 1.95, x = Math.cos(ap) * rad, y = sp2 * rad * 0.24; blit(ctx, spPt, cx + x * cp - y * sp, cy + x * sp + y * cp, R * (near ? 0.5 : 0.34), ca); }
      }
      return [{
        end: END,
        draw(ctx, t, W, H) {
          if (!G || G.W !== W || G.H !== H) init(W, H);
          const { R, cx, cy } = G, lk = dark ? "lighter" : "source-over";
          const v = sstep(0, 0.6, t) * (1 - sstep(TX, TX + 0.55, t));   // het licht komt terug mét de knal
          if (v > 0.003) {
            if (!G.veil) {
              const g = ctx.createRadialGradient(G.ccx, G.ccy, Math.min(W, H) * 0.14, G.ccx, G.ccy, Math.max(W, H) * 0.72);
              if (dark) { g.addColorStop(0, "rgba(0,0,0,.28)"); g.addColorStop(1, "rgba(0,0,0,.64)"); }
              else { g.addColorStop(0, "rgba(26,12,60,.14)"); g.addColorStop(1, "rgba(26,12,60,.5)"); }
              G.veil = g;
            }
            ctx.globalAlpha = v; ctx.fillStyle = G.veil; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1;
          }
          ctx.globalCompositeOperation = lk;
          if (dark && v > 0.01) {
            for (const s of G.stars) { const q = Math.round(v * s.a * (0.6 + 0.4 * Math.sin(t * 2.2 + s.p)) * 3); if (q > 0) SB[q - 1].push(s.x, s.y, s.s); }
            flushRects(ctx, SB, [[215, 200, 255]], 3, 0.8);
          }
          const rd = R * eo(seg(t, 0.1, 0.7)), ca = sstep(0.45, 1.05, t) * (1 - sstep(TX, TX + 0.18, t));
          if (ca > 0.003) {
            blit(ctx, spGlow, cx, cy, R * 7.2, ca * (dark ? 0.55 : 0.42));
            if (!G.beam) { const g = ctx.createRadialGradient(0, 0, R * 0.9, 0, 0, R * 3.5); g.addColorStop(0, rgba(dark ? OBS : OBS_L, 0.32)); g.addColorStop(1, rgba(dark ? OBS : OBS_L, 0)); G.beam = g; }
            ctx.save(); ctx.translate(cx, cy); ctx.fillStyle = G.beam;
            for (let grp = 0; grp < 2; grp++) {
              ctx.beginPath();
              for (let i = 0; i < BEAMS.length; i++) {
                const b = BEAMS[i], pulse = 0.5 + 0.5 * Math.sin(t * b.f + b.ph); if ((pulse > 0.5) !== (grp === 0)) continue;
                const a = b.a + t * 0.07, L = b.L * R;
                ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - b.w) * L, Math.sin(a - b.w) * L); ctx.lineTo(Math.cos(a + b.w) * L, Math.sin(a + b.w) * L); ctx.closePath();
              }
              ctx.globalAlpha = ca * (grp ? 0.35 : 0.75) * (dark ? 1 : 0.8); ctx.fill();
            }
            ctx.restore();
            ring(ctx, t, R, ca, false, cx, cy);
          }
          if (t < TX && rd > 0.5) {   // de zwarte schijf met een dunne lichte rand
            ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
            ctx.fillStyle = rgba(GLASS, 1); ctx.beginPath(); ctx.arc(cx, cy, rd, 0, TAU); ctx.fill();
            ctx.globalCompositeOperation = lk;
            const ra = sstep(0.35, 0.8, t);
            ctx.beginPath(); ctx.arc(cx, cy, rd * 1.03, 0, TAU);
            ctx.lineWidth = 8 * S; ctx.strokeStyle = rgba(dark ? OBS : OBS_L, 0.1 * ra); ctx.stroke();
            ctx.lineWidth = 2.2 * S; ctx.strokeStyle = rgba(dark ? [225, 208, 255] : OBS_L, (dark ? 0.55 : 0.85) * ra); ctx.stroke();
          }
          if (ca > 0.003) ring(ctx, t, R, ca, true, cx, cy);
          // de diamantring: een lichtpunt zwelt aan de rand, vlak voor de knal
          const kd = seg(t, TX - 0.28, TX);
          if (kd > 0 && kd < 1) {
            const a = Math.pow(kd, 0.7), px = cx + Math.cos(AD) * R * 1.02, py = cy + Math.sin(AD) * R * 1.02;
            blit(ctx, spDia, px, py, R * (0.7 + 2.0 * kd), a);
            const L = R * (0.5 + 1.8 * a); ctx.globalAlpha = a * 0.9; ctx.lineWidth = 1.2 * S; ctx.strokeStyle = dark ? "rgba(255,255,255,1)" : rgba(OBS_LD, 1);
            ctx.beginPath(); ctx.moveTo(px - L, py); ctx.lineTo(px + L, py); ctx.moveTo(px, py - L * 0.7); ctx.lineTo(px, py + L * 0.7); ctx.stroke(); ctx.globalAlpha = 1;
          }
          if (t >= TX) {
            const s0 = t - TX;
            // het licht komt terug: één korte opflits over het hele scherm, de flits (0,9 op donker, 0,3 op licht, zoals
            // fwPalette) die voorbij de schokring reikt, en de zon die terug is als heldere kern waar de schijf zat
            const wash = Math.pow(1 - seg(s0, 0, 0.22), 1.5);
            if (wash > 0.01) { ctx.globalAlpha = (dark ? 0.2 : 0.3) * wash; ctx.fillStyle = dark ? "#f4eeff" : "#ffffff"; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
            blit(ctx, spFlash, cx, cy, R * (8 + 12 * eo(seg(s0, 0, 0.3))), (dark ? 0.9 : 0.3) * Math.pow(1 - seg(s0, 0, 0.42), 1.3));
            blit(ctx, spFlash, cx, cy, R * (2.6 + 1.6 * eo(seg(s0, 0, 0.5))), (dark ? 0.85 : 0.45) * (1 - sstep(0.12, 1.3, s0)));
            // twee schokringen: eerst hard en snel, dan uitlopend; de eerste met een brede gloed eronder
            for (const [d, col, w, gw] of [[0, dark ? [255, 255, 255] : OBS_LD, 12, 1], [0.07, dark ? OBS : OBS_L, 7, 0]]) {
              const q = seg(s0, d, 0.9 + d); if (q <= 0 || q >= 1) continue;
              const rad = R * (1.2 + 5.3 * (1 - Math.pow(1 - q, 3.5))), a = 0.9 * Math.pow(1 - q, 1.2);
              ctx.beginPath(); ctx.arc(cx, cy, rad, 0, TAU);
              if (gw) { ctx.lineWidth = (w * 3 * (1 - q) + 2) * S; ctx.strokeStyle = rgba(dark ? OBS : OBS_L, 0.18 * a); ctx.stroke(); }
              ctx.lineWidth = (w * (1 - q) + 0.8) * S; ctx.strokeStyle = rgba(col, a); ctx.stroke();
            }
            // de schijf breekt: negen scherfjes zwart glas met een lichte rand, eerst snel naar buiten, dan weg (één pad)
            const dal = 1 - sstep(0.2, 0.6, s0);
            if (dal > 0.02) {
              const ek = (1 - Math.exp(-2.2 * s0)) / 2.2;
              ctx.beginPath();
              for (const d of DEB) {
                const rr = d.d * R + d.v * S * ek, px = cx + Math.cos(d.a) * rr, py = cy + Math.sin(d.a) * rr + 70 * S * s0 * s0, rot = d.spin * s0, cs = Math.cos(rot), sn = Math.sin(rot);
                for (let k = 0; k < d.vs.length; k += 2) { const x = d.vs[k] * R, y = d.vs[k + 1] * R, X = px + x * cs - y * sn, Y = py + x * sn + y * cs; if (k) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); }
                ctx.closePath();
              }
              ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = dal; ctx.fillStyle = rgba(GLASS, dark ? 0.92 : 0.8); ctx.fill();
              ctx.globalCompositeOperation = lk; ctx.lineWidth = 1.2 * S; ctx.strokeStyle = rgba(dark ? [235, 222, 255] : OBS_L, 0.85); ctx.stroke(); ctx.globalAlpha = 1;
            }
            sparks(ctx, t);
            blit(ctx, spGlow, cx, cy, R * 5, 0.4 * sstep(0.25, 0.6, s0) * (1 - sstep(1.0, 2.1, s0)));
          }
          done(ctx);
        },
      }];
    }
    return eclips;
  })();

  const LAYERS = { roos, eclips };
  return {
    ids: Object.keys(LAYERS),
    has: (id) => Object.prototype.hasOwnProperty.call(LAYERS, id),
    build(id, W, H, opts) { return LAYERS[id](W, H, { seed: 1, theme: "dark", ...(opts || {}) }); },
  };
})();
