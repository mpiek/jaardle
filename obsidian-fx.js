// Obsidiaan-onthulling (ObsidianFx): de show die speelt als je de zesde trede van de prestige-track haalt (alle vijf de
// grind-reeksen op obsidiaan). Eén canvas, elke laag een pure functie van t, dus terugspoelbaar en met een vaste tijdlijn:
//   1 de stilte · 2 vijf reeksen · 3 de zwarte zon · 4 de breuk · 5 het zwarte glas · 6 jouw steen
// Apart bestand, net als RewardFx/HolidayFx: game.js draagt er niets van mee en haalt het pas op op het moment zelf (een
// speler ziet het hooguit één keer, na een server-check in game.js). Alle teksten, tellers en namen komen kant-en-klaar uit
// game.js (opts), zodat dit bestand niets van talen, de server of de prestatie-regels hoeft te weten.
// Beeld: ontwerpruimte 390×800 (telefoon-staand), geschaald naar het scherm; achtergrond, scheuren en scherven lopen over het
// hele canvas, dus ook op een liggend scherm. Geluid (WebAudio-synth) staat standaard uit; trillen alleen op toestellen die dat kunnen.
window.ObsidianFx = (() => {
  "use strict";

  /* ═══════════════════════ helpers ═══════════════════════ */
  const TAU = Math.PI * 2;
  const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, k) => a + (b - a) * k;
  const seg = (t, a, b) => clamp((t - a) / (b - a));
  const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  const easeOut = (k) => 1 - Math.pow(1 - k, 3);
  const easeIn = (k) => k * k * k;
  const easeIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const mixc = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const angDiff = (a, b) => { let d = a - b; d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI; return d; };
  const norm3 = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  /* ═══════════════════════ teksten (5 talen, alleen in dit lazy bestand) ═══════════════════════ */
  // De namen van de treden en de reeksen komen uit game.js (opts.tierNames / opts.capTitle); de rest van de show staat hier,
  // zodat de spelers die dit nooit zien er ook geen byte aan vertaling voor laden. tests/core.test.mjs bewaakt dat elke taal alles heeft.
  const LADDER_ICON = { games: "🎲", dailies: "📅", streak: "🔥", perfect: "💯", pure: "🧘" };
  const TX = {
    nl: { beats: ["VIJF REEKSEN.", "ZES TREDEN.", "ÉÉN STEEN."], sub: "ZESDE TREDE · ALLE VIJF DE REEKSEN", l1: "Vulkanisch glas.", l2: "Vuur dat stolde voordat het kristal kon worden.",
      first: "De eerste Obsidiaan ooit", maker: "Nummer 0 · de maker van Jaardle", nr: (n) => `Obsidiaan nr. ${n}`,
      age: (d, date) => `STEEN VAN ${d} ${d === 1 ? "DAG" : "DAGEN"} · SINDS ${date}`,
      wear: "Draag nu", share: "Deel je steen", next: "Verder", skip: "Overslaan", soundOn: "Geluid aan", soundOff: "Geluid uit",
      aria: "Onthulling: je hebt obsidiaan bereikt, de hoogste trede van de prestige-track", shareText: (n) => `${n} heeft Obsidiaan bereikt in Jaardle`,
      units: { games: "POTJES", dailies: "DAILIES", streak: "OP RIJ", perfect: "PERFECT", pure: "ZONDER HINT" } },
    en: { beats: ["FIVE SERIES.", "SIX TIERS.", "ONE STONE."], sub: "SIXTH TIER · ALL FIVE SERIES", l1: "Volcanic glass.", l2: "Fire that froze before it could become crystal.",
      first: "The first Obsidian ever", maker: "Number 0 · the maker of Jaardle", nr: (n) => `Obsidian no. ${n}`,
      age: (d, date) => `STONE OF ${d} ${d === 1 ? "DAY" : "DAYS"} · SINCE ${date}`,
      wear: "Wear it now", share: "Share your stone", next: "Continue", skip: "Skip", soundOn: "Sound on", soundOff: "Sound off",
      aria: "Reveal: you reached obsidian, the highest tier of the prestige track", shareText: (n) => `${n} reached Obsidian in Jaardle`,
      units: { games: "GAMES", dailies: "DAILIES", streak: "IN A ROW", perfect: "PERFECT", pure: "NO HINTS" } },
    de: { beats: ["FÜNF SERIEN.", "SECHS STUFEN.", "EIN STEIN."], sub: "SECHSTE STUFE · ALLE FÜNF SERIEN", l1: "Vulkanisches Glas.", l2: "Feuer, das erstarrte, bevor es Kristall werden konnte.",
      first: "Der erste Obsidian aller Zeiten", maker: "Nummer 0 · der Macher von Jaardle", nr: (n) => `Obsidian Nr. ${n}`,
      age: (d, date) => `STEIN VON ${d} ${d === 1 ? "TAG" : "TAGEN"} · SEIT ${date}`,
      wear: "Jetzt tragen", share: "Stein teilen", next: "Weiter", skip: "Überspringen", soundOn: "Ton an", soundOff: "Ton aus",
      aria: "Enthüllung: Du hast Obsidian erreicht, die höchste Stufe des Prestige-Tracks", shareText: (n) => `${n} hat in Jaardle Obsidian erreicht`,
      units: { games: "PARTIEN", dailies: "DAILIES", streak: "IN FOLGE", perfect: "PERFEKT", pure: "OHNE HINWEIS" } },
    es: { beats: ["CINCO SERIES.", "SEIS NIVELES.", "UNA PIEDRA."], sub: "SEXTO NIVEL · LAS CINCO SERIES", l1: "Vidrio volcánico.", l2: "Fuego que se enfrió antes de poder ser cristal.",
      first: "La primera Obsidiana de la historia", maker: "Número 0 · el creador de Jaardle", nr: (n) => `Obsidiana n.º ${n}`,
      age: (d, date) => `PIEDRA DE ${d} ${d === 1 ? "DÍA" : "DÍAS"} · DESDE EL ${date}`,
      wear: "Usar ahora", share: "Compartir tu piedra", next: "Continuar", skip: "Saltar", soundOn: "Sonido activado", soundOff: "Sonido desactivado",
      aria: "Revelación: has alcanzado la obsidiana, el nivel más alto del camino de prestigio", shareText: (n) => `${n} ha alcanzado la Obsidiana en Jaardle`,
      units: { games: "PARTIDAS", dailies: "DAILIES", streak: "SEGUIDOS", perfect: "PERFECTAS", pure: "SIN PISTAS" } },
    pt: { beats: ["CINCO SÉRIES.", "SEIS NÍVEIS.", "UMA PEDRA."], sub: "SEXTO NÍVEL · AS CINCO SÉRIES", l1: "Vidro vulcânico.", l2: "Fogo que esfriou antes de virar cristal.",
      first: "A primeira Obsidiana de todos os tempos", maker: "Número 0 · o criador do Jaardle", nr: (n) => `Obsidiana n.º ${n}`,
      age: (d, date) => `PEDRA DE ${d} ${d === 1 ? "DIA" : "DIAS"} · DESDE ${date}`,
      wear: "Usar agora", share: "Compartilhar sua pedra", next: "Continuar", skip: "Pular", soundOn: "Som ligado", soundOff: "Som desligado",
      aria: "Revelação: você alcançou a obsidiana, o nível mais alto da trilha de prestígio", shareText: (n) => `${n} alcançou a Obsidiana no Jaardle`,
      units: { games: "PARTIDAS", dailies: "DAILIES", streak: "SEGUIDOS", perfect: "PERFEITAS", pure: "SEM DICAS" } },
  };

  /* ═══════════════════════ vaste gegevens ═══════════════════════ */
  const DW = 390, DH = 800;                 // ontwerpruimte
  const EC = { x: 195, y: 336 };            // middelpunt van de gebeurtenis
  const BIG = 1600;                         // "oneindig" voor achtergrondvlakken buiten de ontwerpruimte
  const BRONZE = [192, 134, 64], SILVER = [184, 191, 201], GOLD = [244, 196, 48], PLAT = [143, 212, 205], DIAM = [159, 199, 255], OBS = [166, 143, 224];
  const TIERC = [BRONZE, SILVER, GOLD, PLAT, DIAM, OBS];
  const T = { rails: 3.6, sun: 9.9, hush: 12.2, crack: 12.6, hold: 13.75, brk: 14.0, shift: 17.4, end: 22.5 };
  const F_DISPLAY = (s) => `700 ${s}px "ObxSyncopate", "Arial Black", Arial, sans-serif`;
  const F_MONO = (s, w = 500) => `${w} ${s}px ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace`;
  const F_SERIF = (s, st = "italic") => `${st} 400 ${s}px "Iowan Old Style", Georgia, "Palatino Linotype", "Times New Roman", serif`;
  const F_UI = (s, w = 500) => `${w} ${s}px -apple-system, "Segoe UI", system-ui, sans-serif`;
  const F_EMOJI = (s) => `${s}px "JaardleEmoji", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  const fmtN = (n) => Math.round(n).toLocaleString(S && S.locale ? S.locale : undefined);

  /* ═══════════════════════ staat van één voorstelling ═══════════════════════ */
  let S = null;    // gezet door play(); alle tekenfuncties lezen hieruit

  /* ═══════════════════════ voorberekende werelden (lui, één keer) ═══════════════════════ */
  let STARS, DISC, DUST, EMB, CRACK, SHARDS, STONE, GRAIN, WORLD_R = 0;
  function cumLen(pts) { const c = [0]; for (let i = 1; i < pts.length; i++) c.push(c[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)); return c; }
  const CRACK_N = 9, CRACK_RANK = [0, 4, 2, 6, 1, 7, 3, 8, 5], CRACK_AT = [0, 0.45, 0.62, 0.74, 0.84, 0.92, 1.0, 1.07, 1.13];

  function buildWorld(need) {
    if (STARS && WORLD_R >= need) return;
    WORLD_R = need;
    STARS = (() => { const r = rng(11); return Array.from({ length: 260 }, () => ({ x: -520 + r() * 1430, y: -330 + r() * 1460, a: 0.2 + 0.6 * r(), s: 0.7 + r() * 1.1, p: r() * TAU })); })();
    DISC = (() => { const r = rng(21); return Array.from({ length: 1500 }, () => ({ u: r(), a0: r() * TAU, s: 0.9 + r() * 1.7, b: 0.4 + 0.6 * r() })); })();
    DISC.forEach((p) => { p.ci = p.u < 0.08 ? 0 : p.u < 0.2 ? 1 : p.u < 0.4 ? 2 : p.u < 0.65 ? 3 : p.u < 0.85 ? 4 : 5; });
    DUST = (() => { const r = rng(31); return Array.from({ length: 240 }, () => ({ a0: r() * TAU, r0: 240 + r() * 220, t0: r(), life: 2.0 + r() * 1.4, s: 0.9 + r() * 1.1 })); })();
    EMB = (() => { const r = rng(41); return Array.from({ length: 70 }, () => ({ x: 195 + (r() - 0.5) * 330, sp: 0.09 + r() * 0.1, o: r(), s: 0.9 + r() * 1.5, b: 0.5 + r() * 0.5 })); })();
    /* scheuren: 9 hoofdscheuren + ringscheuren + haarscheurtjes; de scherven volgen exact die lijnen. De lengte volgt het scherm. */
    const SEGS = Math.max(12, Math.min(22, Math.ceil(need / 50) + 1)), NSEG = SEGS % 2 ? SEGS + 1 : SEGS;
    const IDX = [];
    for (let i = 0; i <= NSEG; i += 2) IDX.push(i);
    CRACK = (() => {
      const r = rng(404);
      const base = r() * 0.5;
      const angs = Array.from({ length: CRACK_N }, (_, j) => base + (j + (r() - 0.5) * 0.4) / CRACK_N * TAU).sort((a, b) => a - b);
      const mains = angs.map((ang, j) => {
        const pts = [{ x: EC.x, y: EC.y }]; let rad = 0, off = 0;
        for (let k = 1; k <= NSEG; k++) {
          rad += 38 + r() * 20; off = clamp(off + (r() - 0.5) * 0.16, -0.2, 0.2);
          pts.push({ x: EC.x + Math.cos(ang + off) * rad, y: EC.y + Math.sin(ang + off) * rad });
        }
        return { pts, cum: cumLen(pts), t0: T.crack + CRACK_AT[CRACK_RANK[j]], subs: [] };
      });
      const rings = IDX.map((b) => mains.map((m, j) => {
        if (b === 0) return null;
        const m2 = mains[(j + 1) % CRACK_N], A = m.pts[b], B = m2.pts[b];
        const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
        const pts = [{ x: A.x, y: A.y }];
        for (const f of [0.34, 0.68]) pts.push({ x: A.x + dx * f + nx * (r() - 0.5) * 16, y: A.y + dy * f + ny * (r() - 0.5) * 16 });
        pts.push({ x: B.x, y: B.y });
        return { pts, cum: cumLen(pts), t0: Math.max(m.t0, m2.t0) + 0.55 * (b / NSEG) + 0.05 };
      }));
      mains.forEach((m) => {
        for (let k = 2; k <= Math.min(10, NSEG - 2); k++) if (r() < 0.3) {
          const p0 = m.pts[k], pp = m.pts[k - 1];
          let a = Math.atan2(p0.y - pp.y, p0.x - pp.x) + (r() < 0.5 ? -1 : 1) * (0.35 + r() * 0.3);
          const sp = [{ x: p0.x, y: p0.y }]; let x = p0.x, y = p0.y;
          for (let q = 0, n = 2 + Math.floor(r() * 2); q < n; q++) { const sl = 18 + r() * 14; a += (r() - 0.5) * 0.25; x += Math.cos(a) * sl; y += Math.sin(a) * sl; sp.push({ x, y }); }
          m.subs.push({ pts: sp, cum: cumLen(sp), t0: m.t0 + 0.55 * (k / NSEG) });
        }
      });
      return { mains, rings, IDX };
    })();
    SHARDS = (() => {
      const r = rng(808), out = [];
      for (let j = 0; j < CRACK_N; j++) {
        const j2 = (j + 1) % CRACK_N, Aj = CRACK.mains[j].pts, Bj = CRACK.mains[j2].pts;
        for (let q = 0; q < IDX.length - 1; q++) {
          const a = IDX[q], b = IDX[q + 1];
          let poly = Aj.slice(a, b + 1).concat(CRACK.rings[q + 1][j].pts.slice(1)).concat(Bj.slice(a, b).reverse());
          if (a > 0) poly = poly.concat(CRACK.rings[q][j].pts.slice(1, -1).reverse()); else poly.pop();
          let cx = 0, cy = 0; for (const p of poly) { cx += p.x; cy += p.y; } cx /= poly.length; cy /= poly.length;
          const ang = Math.atan2(cy - EC.y, cx - EC.x) + (r() - 0.5) * 0.5;
          out.push({ poly, cx, cy, dx: Math.cos(ang), dy: Math.sin(ang), v: (220 + 200 * r()) * (1 + 0.08 * q), fall: 150 + 300 * r(),
            grow: 0.6 + 0.7 * r(), spin: (r() - 0.5) * 3.2, delay: 0.03 * q + r() * 0.04, ph: r() * TAU });
        }
      }
      return out;
    })();
    /* de steen: onregelmatige, tweezijdig gepunte glasscherf (24 driehoeken, plat geschaduwd) */
    STONE = (() => {
      const r = rng(2026), V = [];
      V.push([0.08, -1.0, -0.04]);
      const A = [], B = [];
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + (r() - 0.5) * 0.36, rad = 0.4 * (0.78 + r() * 0.44); A.push(V.length); V.push([Math.cos(a) * rad, -0.52 + (r() - 0.5) * 0.14, Math.sin(a) * rad]); }
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + 0.14 + (r() - 0.5) * 0.36, rad = 0.46 * (0.78 + r() * 0.44); B.push(V.length); V.push([Math.cos(a) * rad, 0.34 + (r() - 0.5) * 0.16, Math.sin(a) * rad]); }
      const TOP = V.length; V.push([-0.15, 1.0, 0.07]);
      for (const v of V) v[0] += v[1] * 0.07;
      const tris = [];
      for (let k = 0; k < 6; k++) {
        const k2 = (k + 1) % 6;
        tris.push([0, A[k2], A[k]]);
        tris.push([A[k], A[k2], B[k]]);
        tris.push([A[k2], B[k2], B[k]]);
        tris.push([TOP, B[k], B[k2]]);
      }
      const em = new Map();
      tris.forEach((f, fi) => { for (let e = 0; e < 3; e++) { const i = f[e], j = f[(e + 1) % 3], key = i < j ? i * 64 + j : j * 64 + i; const o = em.get(key); if (o) o.f2 = fi; else em.set(key, { i, j, f1: fi, f2: -1 }); } });
      return { v: V, t: tris, glints: [TOP, 0, B[1], B[4], A[2]], edges: Array.from(em.values()) };
    })();
    GRAIN = (() => {
      const c = document.createElement("canvas"); c.width = c.height = 128;
      const g = c.getContext("2d"), im = g.createImageData(128, 128), r = rng(5);
      for (let i = 0; i < im.data.length; i += 4) { const v = (r() * 255) | 0; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
      g.putImageData(im, 0, 0); return c;
    })();
    cuesBuilt = false;
  }

  /* ═══════════════════════ tekst ═══════════════════════ */
  function trackedText(c, str, cx, y, track) {
    const ch = Array.from(str), w = ch.map((s) => c.measureText(s).width);
    const total = w.reduce((a, b) => a + b, 0) + track * (ch.length - 1);
    let x = cx - total / 2; c.textAlign = "left";
    for (let i = 0; i < ch.length; i++) { c.fillText(ch[i], x, y); x += w[i] + track; }
    return total;
  }
  function emoji(c, s, x, y, size) { c.font = F_EMOJI(size); c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(s, x, y); }

  /* ═══════════════════════ ACT I · de stilte ═══════════════════════ */
  const CARD = { x: 16, y: 300, w: 358, h: 118 };
  function pipRect(i) { const gap = 5, pw = (CARD.w - 28 - gap * 5) / 6; return { x: CARD.x + 14 + i * (pw + gap), y: CARD.y + 44, w: pw, h: 60 }; }

  function drawCapCard(c, t, f1, sc) {
    const fine = sc < 6;
    rr(c, CARD.x, CARD.y, CARD.w, CARD.h, 12);
    c.fillStyle = rgba(mixc([36, 28, 56], [22, 13, 40], f1), 1); c.fill();
    c.strokeStyle = rgba(mixc([66, 52, 104], [60, 44, 104], f1), 1); c.lineWidth = 1 / Math.max(1, sc * 0.4); c.stroke();
    if (fine) {
      c.textBaseline = "middle"; c.textAlign = "left"; c.fillStyle = "#f5f5f5";
      c.font = F_UI(15, 700); c.fillText(S.tx.capTitle, CARD.x + 14, CARD.y + 22);
      c.textAlign = "right"; c.fillStyle = "#b4a8d4"; c.font = F_UI(11, 500);
      c.fillText(t < 2.35 ? "5 / 6" : "6 / 6", CARD.x + CARD.w - 14, CARD.y + 22);
    }
    for (let i = 0; i < 6; i++) {
      const p = pipRect(i), cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      const last = i === 5, lit = !last || t >= 2.35;
      let s = 1;
      if (last) { for (const tb of [1.0, 1.34]) if (t > tb) s += 0.14 * Math.exp(-(t - tb) * 9) * (tb < 1.2 ? 1 : 0.7); }
      c.save(); c.translate(cx, cy); c.scale(s, s); c.translate(-cx, -cy);
      rr(c, p.x, p.y, p.w, p.h, 9);
      c.globalAlpha = lit ? 1 : 0.55;
      c.fillStyle = lit && last ? "#120a22" : "#2a2040"; c.fill();
      const col = TIERC[i];
      c.strokeStyle = lit ? rgba(col, 1) : "#4a3f66"; c.lineWidth = 1; c.stroke();
      if (lit) { rr(c, p.x + 1, p.y + 1, p.w - 2, p.h - 2, 8); c.strokeStyle = rgba(col, 0.9); c.lineWidth = 1; c.stroke(); }
      c.globalAlpha = 1;
      if (fine) {
        c.fillStyle = "#fff"; c.globalAlpha = lit ? 1 : 0.6;
        emoji(c, last ? (lit ? "🖤" : "🔒") : S.tx.rewardIcons[i], cx, p.y + 22, 19);
        c.font = F_UI(9.5, 500); c.textBaseline = "middle"; c.textAlign = "center";
        c.fillStyle = lit ? rgba(col, 1) : "#a79bc6"; c.fillText(S.tx.tiers[i], cx, p.y + 47);
        c.globalAlpha = 1;
      }
      c.restore();
    }
    if (fine) {
      const p = pipRect(5), cx = p.x + p.w / 2, cy = p.y + p.h / 2;
      for (const tb of [1.0, 1.34]) {
        const k = (t - tb) / 0.65;
        if (k > 0 && k < 1) { c.beginPath(); c.arc(cx, cy, 24 + 78 * easeOut(k), 0, TAU); c.strokeStyle = rgba(OBS, 0.55 * (1 - k)); c.lineWidth = 1.6; c.stroke(); }
      }
      const kc = seg(t, 1.9, 2.35);
      if (kc > 0 && t < 2.4) {
        c.save(); c.globalCompositeOperation = "lighter"; c.lineCap = "round";
        const pts = [[-9, -9], [-2, -2], [-7, 4], [3, 8], [-1, 13]];
        const n = Math.max(1, Math.ceil(kc * (pts.length - 1)));
        for (const [w, a] of [[5, 0.25], [1.6, 1]]) {
          c.beginPath(); c.moveTo(cx + pts[0][0], p.y + 22 + pts[0][1]);
          for (let q = 1; q <= n; q++) c.lineTo(cx + pts[q][0], p.y + 22 + pts[q][1]);
          c.strokeStyle = w > 2 ? rgba(OBS, a) : rgba([255, 250, 255], a); c.lineWidth = w; c.stroke();
        }
        c.restore();
      }
      const kf = seg(t, 2.35, 2.95);
      if (kf > 0 && kf < 1) {
        c.save(); c.globalCompositeOperation = "lighter";
        const g = c.createRadialGradient(cx, cy, 0, cx, cy, 120 * easeOut(kf) + 10);
        g.addColorStop(0, rgba([255, 250, 255], 0.95 * (1 - kf))); g.addColorStop(0.4, rgba(OBS, 0.5 * (1 - kf))); g.addColorStop(1, rgba(OBS, 0));
        c.fillStyle = g; c.fillRect(cx - 140, cy - 140, 280, 280); c.restore();
      }
    }
  }

  function actI(c, t) {
    /* een sluier over de échte pagina: het spel dimt tot alleen de prestige-balk overblijft */
    const f1 = sstep(0.0, 1.4, t), solid = 0.92 * f1 + 0.08 * sstep(1.4, 2.4, t);
    c.fillStyle = `rgba(3,1,8,${solid})`; c.fillRect(-BIG, -BIG, DW + 2 * BIG, DH + 2 * BIG);
    c.save(); c.globalAlpha = f1;
    const g = c.createRadialGradient(195, 360, 30, 195, 360, 470);
    g.addColorStop(0, "#1a0f33"); g.addColorStop(0.5, "#0b0617"); g.addColorStop(1, "rgba(3,1,8,0)");
    c.fillStyle = g; c.fillRect(-BIG, -BIG, DW + 2 * BIG, DH + 2 * BIG); c.restore();
    const pip = pipRect(5), px = pip.x + pip.w / 2, py = pip.y + pip.h / 2;
    const zp = easeIn(seg(t, 2.4, 3.65)), sc = Math.exp(zp * Math.log(90));
    c.save();
    c.translate(lerp(px, EC.x, zp), lerp(py, EC.y, zp)); c.scale(sc, sc); c.translate(-px, -py);
    drawCapCard(c, t, f1, sc);
    c.restore();
  }

  /* ═══════════════════════ achtergrond ═══════════════════════ */
  const SB = [[], [], [], [], []];
  function stars(c, t, a0) {
    c.save(); c.globalCompositeOperation = "lighter";
    for (const b of SB) b.length = 0;
    for (const s of STARS) { const q = Math.round(a0 * s.a * (0.65 + 0.35 * Math.sin(t * 1.3 + s.p)) * 4 / 0.8); if (q > 0) SB[Math.min(4, q)].push(s.x, s.y, s.s); }
    for (let i = 1; i < 5; i++) { const b = SB[i]; if (!b.length) continue; c.fillStyle = `rgba(215,200,255,${(i / 4) * 0.8})`; c.beginPath(); for (let k = 0; k < b.length; k += 3) c.rect(b[k], b[k + 1], b[k + 2], b[k + 2]); c.fill(); }
    c.restore();
  }
  function voidBg(c, t) {
    c.fillStyle = "#030108"; c.fillRect(-BIG, -BIG, DW + 2 * BIG, DH + 2 * BIG);
    const g = c.createRadialGradient(EC.x, EC.y, 0, EC.x, EC.y, 540);
    g.addColorStop(0, "rgb(26,14,52)"); g.addColorStop(0.55, "rgb(9,5,20)"); g.addColorStop(1, "rgb(3,1,8)");
    c.fillStyle = g; c.fillRect(-BIG, -BIG, DW + 2 * BIG, DH + 2 * BIG);
    stars(c, t, 1);
  }

  /* ═══════════════════════ ACT II · vijf reeksen ═══════════════════════ */
  const RX = [39, 117, 195, 273, 351], RY0 = 660, yN = (k) => 596 - 88 * k, RYT = 596 - 88 * 5, POW = 1.7, DUR = 4.5;
  const tStart = (i) => 3.9 + Math.abs(i - 2) * 0.09;
  const headY = (i, t) => RY0 - (RY0 - RYT) * Math.pow(seg(t, tStart(i), tStart(i) + DUR), POW);
  const nodeT = (i, k) => tStart(i) + DUR * Math.pow((RY0 - yN(k)) / (RY0 - RYT), 1 / POW);
  function ladderValue(L, y) {
    if (y >= yN(0)) return L.steps[0] * clamp((RY0 - y) / (RY0 - yN(0)));
    for (let k = 0; k < 5; k++) if (y >= yN(k + 1)) return lerp(L.steps[k], L.steps[k + 1], (yN(k) - y) / 88);
    return L.steps[5];
  }
  const BEATS = [[4.0, 6.0, 0], [6.0, 8.2, 1], [8.3, 10.0, 2]];

  function rails(c, t) {
    const A = sstep(3.45, 4.0, t) * (1 - sstep(8.8, 9.5, t));
    const topA = sstep(3.45, 4.0, t) * (1 - sstep(9.3, 9.8, t));
    c.save();
    for (let i = 0; i < 5; i++) {
      const x = RX[i], hy = headY(i, t), L = S.ladders[i];
      c.lineCap = "round";
      c.strokeStyle = rgba(OBS, 0.17 * A); c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, RY0); c.lineTo(x, RYT); c.stroke();
      for (let k = 0; k < 5; k++) {
        const y1 = k === 0 ? RY0 : yN(k - 1), y2 = yN(k);
        if (hy < y1) { c.strokeStyle = rgba(TIERC[k], 0.6 * A); c.lineWidth = 2; c.beginPath(); c.moveTo(x, y1); c.lineTo(x, Math.max(hy, y2)); c.stroke(); }
      }
      let lastLit = -1;
      for (let k = 0; k < 5; k++) if (hy <= yN(k) + 0.5) lastLit = k;
      c.save(); c.globalCompositeOperation = "lighter";
      if (hy > RYT + 0.5 && t < 9) {
        const col = lastLit >= 0 ? TIERC[lastLit] : [255, 255, 255];
        const g = c.createLinearGradient(x, hy, x, hy + 90); g.addColorStop(0, rgba(mixc(col, [255, 255, 255], 0.5), 0.9 * A)); g.addColorStop(1, rgba(col, 0));
        c.strokeStyle = g; c.lineWidth = 3; c.beginPath(); c.moveTo(x, hy); c.lineTo(x, hy + 90); c.stroke();
        const hg = c.createRadialGradient(x, hy, 0, x, hy, 16); hg.addColorStop(0, `rgba(255,255,255,${A})`); hg.addColorStop(0.25, rgba(mixc(col, [255, 255, 255], 0.4), 0.7 * A)); hg.addColorStop(1, rgba(col, 0));
        c.fillStyle = hg; c.fillRect(x - 18, hy - 18, 36, 36);
      }
      c.restore();
      for (let k = 0; k < 6; k++) {
        const y = yN(k), nt = nodeT(i, k), tau = t - nt, lit = tau >= 0;
        const al = k === 5 ? topA : A;
        if (al <= 0.01) continue;
        if (k < 5) {
          if (!lit) { c.beginPath(); c.arc(x, y, 6, 0, TAU); c.fillStyle = rgba([11, 6, 23], al); c.fill(); c.strokeStyle = rgba(OBS, 0.35 * al); c.lineWidth = 1.2; c.stroke(); }
          else {
            const col = TIERC[k], s = 1 + 0.55 * Math.exp(-tau * 13);
            c.save(); c.globalCompositeOperation = "lighter";
            const g = c.createRadialGradient(x, y, 0, x, y, 20); g.addColorStop(0, rgba(col, 0.55 * al)); g.addColorStop(1, rgba(col, 0));
            c.fillStyle = g; c.fillRect(x - 22, y - 22, 44, 44); c.restore();
            c.beginPath(); c.arc(x, y, 6.5 * s, 0, TAU); c.fillStyle = rgba(col, al); c.fill();
            c.beginPath(); c.arc(x, y, 2.4 * s, 0, TAU); c.fillStyle = rgba([255, 255, 255], 0.9 * al); c.fill();
            if (tau < 0.55) { const q = tau / 0.55; c.beginPath(); c.arc(x, y, 8 + 28 * easeOut(q), 0, TAU); c.strokeStyle = rgba(col, 0.85 * (1 - q) * al); c.lineWidth = 2 * (1 - q) + 0.5; c.stroke(); }
          }
        } else {
          const ring = lit ? 1 : 0.4;
          c.beginPath(); c.arc(x, y, 9, 0, TAU); c.fillStyle = rgba([0, 0, 0], al); c.fill();
          c.strokeStyle = rgba(OBS, (0.55 + 0.45 * ring) * al); c.lineWidth = 2; c.stroke();
          if (lit && tau < 0.8) {
            const q = tau / 0.8; c.beginPath(); c.arc(x, y, 38 - 29 * easeOut(q), 0, TAU); c.strokeStyle = rgba(OBS, 0.9 * (1 - q) * al); c.lineWidth = 2; c.stroke();
          }
        }
      }
      const val = ladderValue(L, hy), tc = lastLit >= 0 ? TIERC[lastLit] : [236, 230, 255];
      c.textAlign = "center"; c.textBaseline = "middle";
      c.globalAlpha = A; c.fillStyle = "#fff"; emoji(c, L.ico, x, 690, 20);
      c.font = F_MONO(15.5, 600); c.fillStyle = rgba(mixc(tc, [255, 255, 255], 0.35), 1); c.fillText(fmtN(val), x, 722);
      c.font = F_MONO(8.5); c.fillStyle = rgba(OBS, 0.85); trackedText(c, L.unit, x, 742, 0.8);
      c.globalAlpha = 1;
    }
    c.font = F_DISPLAY(14); c.textBaseline = "middle";
    for (const [a, b, n] of BEATS) {
      const al = sstep(a, a + 0.5, t) * (1 - sstep(b - 0.35, b, t));
      if (al <= 0.01) continue;
      c.fillStyle = rgba([236, 230, 255], 0.92 * al); trackedText(c, S.tx.beats[n], 195, 98, 5);
    }
    c.restore();
  }

  const starR = (t) => (t < T.sun ? 3 + 40 * easeIn(seg(t, 9.3, 9.9)) : 43 * (1 - easeOut(seg(t, 9.9, 10.15))));
  function beams(c, t) {
    c.save(); c.globalCompositeOperation = "lighter"; c.lineCap = "round";
    const p = easeIO(seg(t, 8.75, 9.55)), fade = 1 - sstep(9.75, 10.05, t);
    if (p > 0 && fade > 0) {
      for (let i = 0; i < 5; i++) {
        const x0 = RX[i], y0 = RYT, cx = x0, cy = 250, x1 = EC.x, y1 = EC.y;
        const col = TIERC[i];
        for (const [w, a, cc] of [[7, 0.14, col], [2.6, 0.7, mixc(col, [255, 255, 255], 0.3)], [1, 0.95, [255, 255, 255]]]) {
          c.strokeStyle = rgba(cc, a * fade); c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0);
          const n = Math.max(2, Math.round(26 * p));
          for (let q = 1; q <= n; q++) { const u = (q / n) * p, v = 1 - u; c.lineTo(v * v * x0 + 2 * v * u * cx + u * u * x1, v * v * y0 + 2 * v * u * cy + u * u * y1); }
          c.stroke();
        }
      }
    }
    const r = starR(t);
    if (t > 9.25 && r > 0.5) {
      const g = c.createRadialGradient(EC.x, EC.y, 0, EC.x, EC.y, r * 3.6);
      g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.18, "rgba(255,250,255,.95)"); g.addColorStop(0.4, rgba(OBS, 0.45)); g.addColorStop(1, rgba(OBS, 0));
      c.fillStyle = g; c.fillRect(EC.x - r * 3.7, EC.y - r * 3.7, r * 7.4, r * 7.4);
    }
    c.restore();
  }

  /* ═══════════════════════ ACT III · de zwarte zon ═══════════════════════ */
  const sunR = (t) => (t < T.sun ? 0 : 10 + 66 * easeOut(seg(t, 9.9, 11.5)) + 8 * seg(t, 11.5, 12.6));
  const DCOL = [[255, 238, 255], [232, 204, 255], [196, 160, 255], [160, 120, 232], [126, 86, 200], [96, 52, 160]];
  const DB = Array.from({ length: 24 }, () => []);
  function discParticles(c, t, R, da, near) {
    c.globalCompositeOperation = "lighter";
    for (const b of DB) b.length = 0;
    const cp = Math.cos(-0.22), sp = Math.sin(-0.22);
    for (const p of DISC) {
      const rr0 = 1.28 + 1.9 * Math.pow(p.u, 1.6), r = R * rr0;
      const a = p.a0 + 2.4 * Math.pow(1.28 / rr0, 1.5) * (t - 9.9) * 1.7, sa = Math.sin(a);
      if ((sa > 0) !== near) continue;
      const aq = Math.round(clamp(p.b * da * (0.7 + 0.5 * Math.cos(a + 0.6)) * 0.95) * 3); if (!aq) continue;
      const x = Math.cos(a) * r, y = sa * r * 0.21;
      DB[p.ci * 4 + aq].push(EC.x + x * cp - y * sp, EC.y + x * sp + y * cp, p.s);
    }
    for (let i = 0; i < 24; i++) {
      const b = DB[i]; if (!b.length) continue;
      c.fillStyle = rgba(DCOL[i >> 2], ((i & 3) / 3) * 0.95); c.beginPath();
      for (let k = 0; k < b.length; k += 3) c.rect(b[k], b[k + 1], b[k + 2], b[k + 2]);
      c.fill();
    }
  }
  function discBand(c, R, da, near) {
    c.save(); c.globalCompositeOperation = "lighter"; c.translate(EC.x, EC.y); c.rotate(-0.22);
    for (const [k, w, a, col] of [[1.45, 7, 0.17, [255, 232, 255]], [1.95, 12, 0.12, [190, 150, 255]], [2.55, 18, 0.07, [140, 90, 220]]]) {
      c.beginPath(); c.ellipse(0, 0, R * k, R * k * 0.21, 0, near ? 0 : Math.PI, near ? Math.PI : TAU);
      c.lineWidth = w; c.strokeStyle = rgba(col, a * da); c.stroke();
    }
    c.restore();
  }
  const DUB = [[], [], [], []];
  function dust(c, t, R) {
    const e = sstep(10.0, 10.7, t) * (1 - sstep(12.0, 12.3, t)); if (e <= 0.01) return;
    c.globalCompositeOperation = "lighter";
    for (const b of DUB) b.length = 0;
    for (const p of DUST) {
      const ph = (((t - 9.9) / p.life + p.t0) % 1 + 1) % 1, k = Math.pow(ph, 1.35);
      const r = lerp(p.r0, R * 1.05, k), a = p.a0 + 3.4 * k, aq = Math.round(Math.sin(ph * Math.PI) * e * 3); if (!aq) continue;
      DUB[aq].push(EC.x + Math.cos(a) * r, EC.y + Math.sin(a) * r * 0.92, p.s);
    }
    for (let i = 1; i < 4; i++) { const b = DUB[i]; if (!b.length) continue; c.fillStyle = rgba([212, 192, 255], (i / 3) * 0.85); c.beginPath(); for (let k = 0; k < b.length; k += 3) c.rect(b[k], b[k + 1], b[k + 2], b[k + 2]); c.fill(); }
  }
  function sun(c, t) {
    let R = sunR(t); if (R <= 0.5) return;
    R += Math.sin(t * 55) * 0.7 * sstep(11, 12.2, t) * (t < T.hush ? 1 : 0);
    const da = sstep(10.2, 10.9, t) * (1 - sstep(12.15, 12.55, t));
    const ra = sstep(9.95, 10.35, t) * (t > T.hush && t < T.crack ? 0.72 + 0.28 * Math.sin(t * 38) : 1);
    c.save();
    c.globalCompositeOperation = "lighter";
    const g = c.createRadialGradient(EC.x, EC.y, R * 0.95, EC.x, EC.y, R * 3.5);
    g.addColorStop(0, rgba(OBS, 0.44 * ra)); g.addColorStop(0.35, rgba([120, 70, 200], 0.17 * ra)); g.addColorStop(1, rgba([60, 30, 120], 0));
    c.fillStyle = g; c.fillRect(EC.x - R * 3.6, EC.y - R * 3.6, R * 7.2, R * 7.2);
    if (da > 0.01) { discBand(c, R, da, false); discParticles(c, t, R, da, false); }
    c.globalCompositeOperation = "source-over";
    c.fillStyle = "#000"; c.beginPath(); c.arc(EC.x, EC.y, R, 0, TAU); c.fill();
    c.globalCompositeOperation = "lighter";
    c.beginPath(); c.arc(EC.x, EC.y, R * 1.03, 0, TAU); c.lineWidth = 9; c.strokeStyle = rgba(OBS, 0.08 * ra); c.stroke();
    c.lineWidth = 3.4; c.strokeStyle = rgba([220, 200, 255], 0.22 * ra); c.stroke();
    for (let i = 0; i < 48; i++) {
      const a0 = (i / 48) * TAU, beam = 0.55 + 0.45 * Math.cos(a0 - 2.4);
      c.beginPath(); c.arc(EC.x, EC.y, R * 1.03, a0, a0 + (1.2 / 48) * TAU);
      c.strokeStyle = rgba([255, 246, 255], ra * beam); c.lineWidth = 1.4 + 0.8 * beam; c.stroke();
    }
    if (da > 0.01) { discBand(c, R, da, true); discParticles(c, t, R, da, true); }
    dust(c, t, R);
    c.restore();
  }

  /* ═══════════════════════ ACT IV · de breuk ═══════════════════════ */
  function strokePart(c, pts, cum, frac) {
    if (frac <= 0) return;
    const L = cum[cum.length - 1] * frac; c.beginPath(); c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      if (cum[i] <= L) c.lineTo(pts[i].x, pts[i].y);
      else { const k = (L - cum[i - 1]) / (cum[i] - cum[i - 1]); c.lineTo(lerp(pts[i - 1].x, pts[i].x, k), lerp(pts[i - 1].y, pts[i].y, k)); break; }
    }
    c.stroke();
  }
  function cracks(c, t, o) {
    const hold = sstep(T.hold, T.brk, t), pr = (m) => easeOut(seg(t, m.t0, m.t0 + 0.55));
    let gs = 0; for (const m of CRACK.mains) gs += pr(m); gs /= CRACK_N;
    const lk = 0.7 + 0.3 * sstep(12.6, 13.9, t) + 0.5 * hold;
    c.save(); c.globalCompositeOperation = "lighter"; c.lineCap = "round"; c.lineJoin = "round";
    if (!o.pre) {
      const R = 80 + 320 * gs, g = c.createRadialGradient(EC.x, EC.y, 0, EC.x, EC.y, R);
      g.addColorStop(0, `rgba(255,250,255,${clamp(0.7 * gs * lk)})`); g.addColorStop(0.35, `rgba(190,150,255,${clamp(0.3 * gs * lk)})`); g.addColorStop(1, "rgba(80,40,160,0)");
      c.fillStyle = g; c.fillRect(EC.x - R, EC.y - R, R * 2, R * 2);
    }
    for (const [w, a, col, ox] of [[7, 0.07, OBS, 0], [1.5, 0.45, [90, 205, 255], -0.9], [1.5, 0.45, [255, 90, 170], 0.9], [1.1, 1, [255, 255, 255], 0]]) {
      c.save(); c.translate(ox, 0); c.strokeStyle = rgba(col, clamp(a * lk)); c.lineWidth = w;
      for (const m of CRACK.mains) {
        strokePart(c, m.pts, m.cum, pr(m));
        for (const s of m.subs) strokePart(c, s.pts, s.cum, easeOut(seg(t, s.t0, s.t0 + 0.35)));
      }
      for (let q = 1; q < CRACK.rings.length; q++) for (const rg of CRACK.rings[q]) strokePart(c, rg.pts, rg.cum, easeOut(seg(t, rg.t0, rg.t0 + 0.3)));
      c.restore();
    }
    c.restore();
  }
  function getSnap() {
    if (S.snap) return S.snap;
    const cv = document.createElement("canvas"); cv.width = Math.round(S.w * S.dpr); cv.height = Math.round(S.h * S.dpr);
    renderTo(cv.getContext("2d"), S.w, S.h, S.dpr, 13.97, { pre: true });
    return (S.snap = cv);
  }
  function shards(c, t) {
    const t0 = t - T.brk; if (t0 < 0 || t0 > 1.8) return;
    const snap = getSnap(), v = S.view;
    for (const s of SHARDS) {
      const tt = Math.max(0, t0 - s.delay), al = 1 - sstep(0.35, 1.05, tt);
      if (al <= 0.01) continue;
      const dist = s.v * tt + 900 * tt * tt, ox = s.dx * dist, oy = s.dy * dist + s.fall * tt * tt, sc = 1 + s.grow * Math.pow(tt, 1.3);
      c.save();
      c.translate(s.cx + ox, s.cy + oy); c.rotate(s.spin * tt); c.scale(sc, sc); c.translate(-s.cx, -s.cy);
      c.beginPath(); c.moveTo(s.poly[0].x, s.poly[0].y); for (let i = 1; i < s.poly.length; i++) c.lineTo(s.poly[i].x, s.poly[i].y); c.closePath();
      c.globalAlpha = al; c.save(); c.clip();
      c.drawImage(snap, -v.ox / v.k, -v.oy / v.k, v.W / v.k, v.H / v.k);
      c.fillStyle = "rgba(6,3,16,.42)"; c.fill();
      c.fillStyle = `rgba(215,200,255,${0.03 + 0.13 * Math.max(0, Math.sin(tt * 7 + s.ph))})`; c.fill();
      c.restore();
      c.globalCompositeOperation = "lighter"; c.lineWidth = 1.3; c.strokeStyle = `rgba(235,225,255,${0.7 * Math.min(1, tt * 8)})`; c.stroke();
      c.restore();
    }
  }
  function flashBehind(c, t) {
    const f = sstep(13.99, 14.02, t) * Math.pow(1 - sstep(14.04, 14.85, t), 1.6); if (f < 0.004) return;
    const a = S.reduced ? f * 0.35 : f, g = c.createRadialGradient(EC.x, EC.y, 0, EC.x, EC.y, 540);
    g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.5, `rgba(226,212,255,${a * 0.9})`); g.addColorStop(1, `rgba(150,110,255,${a * 0.7})`);
    c.fillStyle = g; c.fillRect(-BIG, -BIG, DW + 2 * BIG, DH + 2 * BIG);
  }
  function shock(c, t) {
    const k = seg(t, 14.0, 14.9); if (k <= 0 || k >= 1 || S.reduced) return;
    c.save(); c.globalCompositeOperation = "lighter";
    for (const [d, col, w] of [[0, [255, 255, 255], 7], [0.1, [190, 160, 255], 4]]) {
      const q = seg(t, 14.0 + d, 14.9 + d); if (q <= 0 || q >= 1) continue;
      c.beginPath(); c.arc(EC.x, EC.y, 20 + (WORLD_R + 120) * easeOut(q), 0, TAU); c.lineWidth = w * (1 - q) + 0.8; c.strokeStyle = rgba(col, 0.85 * Math.pow(1 - q, 1.4)); c.stroke();
    }
    c.restore();
  }
  function flash(c, W, H, t) {
    const f = sstep(13.955, 13.995, t) * (1 - sstep(14.02, 14.14, t)); if (f <= 0.004) return;
    c.fillStyle = `rgba(255,252,255,${S.reduced ? f * 0.35 : f})`; c.fillRect(0, 0, W, H);
  }

  /* ═══════════════════════ ACT V + VI · het zwarte glas ═══════════════════════ */
  const PALI = [BRONZE, GOLD, PLAT, DIAM, OBS, [222, 112, 190]].map((c) => c.map((v) => v / 255));
  function irid(h) { const x = h * 6, i = Math.floor(x) % 6, k = x - Math.floor(x), a = PALI[i], b = PALI[(i + 1) % 6]; return [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)]; }
  const LK = norm3(-0.45, 0.78, 0.44);
  const D = 2.9;

  function shadeAt(nx, ny, nz, vx, vy, vz, t, sw, warm) {
    const d = clamp(vx * nx + vy * ny + vz * nz);
    const rx = 2 * d * nx - vx, ry = 2 * d * ny - vy, rz = 2 * d * nz - vz;
    const az = Math.atan2(rx, rz), up = ry * 0.5 + 0.5;
    /* zwart glas: bijna alles is weerkaatsing, en die is zwak tot je scheef kijkt */
    const F = 0.16 + 0.84 * Math.pow(1 - d, 3);
    let R = 0.05 + 0.22 * up * up, G = 0.03 + 0.12 * up * up, B = 0.12 + 0.55 * up * up;
    const low = sstep(-0.5, -0.95, ry);
    R += (warm[0] / 255) * 0.7 * low; G += (warm[1] / 255) * 0.5 * low; B += (warm[2] / 255) * 0.5 * low;
    const kk = sstep(0.95, 0.99, rx * LK[0] + ry * LK[1] + rz * LK[2]);
    R += 5 * kk; G += 5 * kk; B += 5.6 * kk;
    const vwin = sstep(-0.2, 0.0, ry) * sstep(0.92, 0.68, ry);
    const kw = sstep(0.2, 0.09, Math.abs(angDiff(az, 0.95))) * vwin;
    R += 3.4 * kw; G += 3.6 * kw; B += 4.4 * kw;
    const kt = sstep(0.07, 0.025, Math.abs(angDiff(az, -2.35))) * vwin;
    R += 2 * kt; G += 1.6 * kt; B += 3.6 * kt;
    const k3 = (sstep(0.05, 0.015, Math.abs(angDiff(az, 2.05))) + sstep(0.04, 0.012, Math.abs(angDiff(az, -0.55)))) * vwin;
    R += 1.8 * k3; G += 1.7 * k3; B += 2.6 * k3;
    for (let i = 0; i < sw.length; i++) {
      const s = sw[i]; if (s.a < 0.01) continue;
      const ks = sstep(0.42, 0.12, Math.abs(angDiff(az, s.az))) * sstep(-0.6, -0.2, ry) * sstep(0.97, 0.55, ry) * s.a;
      R += s.c[0] * ks * 5; G += s.c[1] * ks * 5; B += s.c[2] * ks * 5;
    }
    let r = R * F, g = G * F, b = B * F;
    const fr = Math.pow(1 - d, 2.5), h = ((0.5 + (0.5 * Math.atan2(nx, nz)) / Math.PI + ny * 0.35 + t * 0.02) % 1 + 1) % 1, ir = irid(h), m = 0.012 + 0.34 * fr;
    r += ir[0] * m; g += ir[1] * m; b += ir[2] * m;
    return [(1 - Math.exp(-r * 1.9)) * 255, (1 - Math.exp(-g * 1.9)) * 255, (1 - Math.exp(-b * 1.9)) * 255];
  }

  function drawStone(c, cx, cy, half, rotY, tx, tz, t, sw, warm, glints, bands) {
    const V = STONE.v, n = V.length, P = new Array(n);
    const cY = Math.cos(rotY), sY = Math.sin(rotY), cX = Math.cos(tx), sX = Math.sin(tx), cZ = Math.cos(tz), sZ = Math.sin(tz);
    for (let i = 0; i < n; i++) {
      const v = V[i], x1 = v[0] * cY + v[2] * sY, z1 = -v[0] * sY + v[2] * cY;
      const y2 = v[1] * cX - z1 * sX, z2 = v[1] * sX + z1 * cX;
      const x3 = x1 * cZ - y2 * sZ, y3 = x1 * sZ + y2 * cZ, k = D / (D - z2);
      P[i] = { x: x3, y: y3, z: z2, sx: cx + x3 * half * k, sy: cy - y3 * half * k };
    }
    const faces = [], vis = new Array(STONE.t.length).fill(false), FN = new Array(STONE.t.length);
    STONE.t.forEach((f, fi) => {
      const a = P[f[0]], b = P[f[1]], d = P[f[2]];
      const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z, vx = d.x - a.x, vy = d.y - a.y, vz = d.z - a.z;
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      const mx = (a.x + b.x + d.x) / 3, my = (a.y + b.y + d.y) / 3, mz = (a.z + b.z + d.z) / 3;
      if (nx * mx + ny * my + nz * mz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      FN[fi] = [nx, ny, nz];
      const vx0 = -mx, vy0 = -my, vz0 = D - mz, vl = Math.hypot(vx0, vy0, vz0);
      if ((nx * vx0 + ny * vy0 + nz * vz0) / vl <= 0.001) return;
      vis[fi] = true; faces.push({ a, b, d, nx, ny, nz, depth: mz });
    });
    faces.sort((p, q) => p.depth - q.depth);
    c.save(); c.lineJoin = "round";
    for (const f of faces) {
      const vs = [f.a, f.b, f.d], cols = vs.map((p) => {
        let vx = -p.x, vy = -p.y, vz = D - p.z; const vl = Math.hypot(vx, vy, vz); vx /= vl; vy /= vl; vz /= vl;
        return shadeAt(f.nx, f.ny, f.nz, vx, vy, vz, t, sw, warm);
      });
      const lum = cols.map((q) => 0.3 * q[0] + 0.59 * q[1] + 0.11 * q[2]);
      let lo = 0, hi = 0; for (let i = 1; i < 3; i++) { if (lum[i] < lum[lo]) lo = i; if (lum[i] > lum[hi]) hi = i; }
      c.beginPath(); c.moveTo(f.a.sx, f.a.sy); c.lineTo(f.b.sx, f.b.sy); c.lineTo(f.d.sx, f.d.sy); c.closePath();
      let fill;
      if (lo === hi || (vs[lo].sx === vs[hi].sx && vs[lo].sy === vs[hi].sy)) fill = rgba(cols[0], 1);
      else { fill = c.createLinearGradient(vs[lo].sx, vs[lo].sy, vs[hi].sx, vs[hi].sy); fill.addColorStop(0, rgba(cols[lo], 1)); fill.addColorStop(1, rgba(cols[hi], 1)); }
      c.fillStyle = fill; c.strokeStyle = typeof fill === "string" ? fill : rgba(cols[hi], 1); c.lineWidth = 0.9; c.fill(); c.stroke();
    }
    /* de vijf tierkleuren glijden als lichtbanden over het glas (alleen binnen de steen) */
    if (bands && bands.length) {
      c.save(); c.beginPath();
      for (const f of faces) { c.moveTo(f.a.sx, f.a.sy); c.lineTo(f.b.sx, f.b.sy); c.lineTo(f.d.sx, f.d.sy); c.closePath(); }
      c.clip(); c.globalCompositeOperation = "lighter";
      const w = 46 * (half / 150), nl = Math.hypot(0.42, 1), nx = 0.42 / nl, ny = 1 / nl;
      for (const b of bands) {
        if (b.a < 0.01) continue;
        const y0 = lerp(cy + half * 1.25, cy - half * 1.25, b.p);
        const g = c.createLinearGradient(cx - nx * w, y0 - ny * w, cx + nx * w, y0 + ny * w);
        g.addColorStop(0, rgba(b.c, 0)); g.addColorStop(0.5, rgba(b.c, 0.6 * b.a)); g.addColorStop(1, rgba(b.c, 0));
        c.fillStyle = g; c.fillRect(cx - half, cy - half * 1.4, half * 2, half * 2.8);
      }
      c.restore();
    }
    /* randen: binnenranden vangen licht naar mate de hoek scherper is, het silhouet krijgt een zachte gloed */
    c.globalCompositeOperation = "lighter";
    for (const e of STONE.edges) {
      const v1 = vis[e.f1], v2 = e.f2 >= 0 ? vis[e.f2] : false;
      if (!v1 && !v2) continue;
      const a = P[e.i], b = P[e.j], sil = v1 !== v2;
      let al, w;
      if (sil) { al = 0.55; w = 1.2; }
      else { const n1 = FN[e.f1], n2 = FN[e.f2]; al = clamp(0.03 + (1 - (n1[0] * n2[0] + n1[1] * n2[1] + n1[2] * n2[2])) * 1.3, 0, 0.45); w = 0.9; }
      c.strokeStyle = `rgba(205,190,255,${al})`; c.lineWidth = w; c.beginPath(); c.moveTo(a.sx, a.sy); c.lineTo(b.sx, b.sy); c.stroke();
      if (sil) { c.strokeStyle = "rgba(150,120,255,.14)"; c.lineWidth = 3.6; c.stroke(); }
    }
    if (glints) {
      for (const gi of STONE.glints) {
        const p = P[gi], a = sstep(0.8, 1, Math.sin(t * 1.4 + gi * 2.3)) * sstep(-0.4, 0.2, p.z);
        if (a < 0.03) continue;
        const sz = (10 + 16 * a) * (half / 150);
        const g = c.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, sz * 0.55); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, "rgba(180,160,255,0)");
        c.fillStyle = g; c.fillRect(p.sx - sz, p.sy - sz, sz * 2, sz * 2);
        c.strokeStyle = `rgba(255,255,255,${0.9 * a})`; c.lineWidth = 1;
        c.beginPath(); c.moveTo(p.sx - sz, p.sy); c.lineTo(p.sx + sz, p.sy); c.moveTo(p.sx, p.sy - sz * 1.3); c.lineTo(p.sx, p.sy + sz * 1.3); c.stroke();
      }
    }
    c.restore();
  }

  function stoneLayout(t) {
    const rev = Math.max(0, t - T.brk), lay = easeIO(seg(t, T.shift, 19.2)), dolly = easeOut(seg(rev, 0, 3.2));
    const baseHalf = lerp(176, 138, lay), baseCy = lerp(EC.y, 236, lay);
    const bob = Math.sin(t * 0.9) * 4 * sstep(0, 1, rev);
    return { cx: 195, cy: baseCy + bob, half: baseHalf * lerp(0.42, 1, dolly), floorY: baseCy + baseHalf + 26, lay, rev };
  }
  const stoneRot = (t) => { const rev = Math.max(0, t - T.brk); return 0.4 + 0.3 * rev + 5.2 * (1 - Math.exp(-rev * 0.85)) + S.spin; };

  let REFL = null;
  const REFL_H = 150;
  function floorFx(c, t, L, warm, sw) {
    const fy = L.floorY, rot = stoneRot(t), tx = 0.12 + 0.03 * Math.sin(t * 0.5), tz = 0.05 * Math.sin(t * 0.37);
    const lit = sstep(0, 0.6, L.rev);
    /* spiegeling: in een eigen laag getekend en met een verloop weggemaskerd, zodat er geen harde rand ontstaat */
    const m = c.getTransform(), sx = Math.hypot(m.a, m.b), ow = Math.ceil(DW * sx), oh = Math.ceil(REFL_H * sx);
    if (!REFL || REFL.width !== ow || REFL.height !== oh) { REFL = document.createElement("canvas"); REFL.width = ow; REFL.height = oh; }
    const o = REFL.getContext("2d");
    o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = "source-over"; o.clearRect(0, 0, ow, oh);
    o.setTransform(sx, 0, 0, sx, 0, -fy * sx);
    o.save(); o.translate(0, fy * 2 - 8); o.scale(1, -1);
    drawStone(o, L.cx, L.cy, L.half, rot, tx, tz, t, sw, warm, false);
    o.restore();
    o.setTransform(1, 0, 0, 1, 0, 0); o.globalCompositeOperation = "destination-in";
    const mg = o.createLinearGradient(0, 0, 0, oh); mg.addColorStop(0, "rgba(0,0,0,.42)"); mg.addColorStop(0.55, "rgba(0,0,0,.12)"); mg.addColorStop(1, "rgba(0,0,0,0)");
    o.fillStyle = mg; o.fillRect(0, 0, ow, oh); o.globalCompositeOperation = "source-over";
    c.save(); c.globalAlpha = lit; c.drawImage(REFL, 0, fy, DW, REFL_H); c.restore();
    /* gloed */
    c.save(); c.globalCompositeOperation = "lighter"; c.translate(195, fy + 4); c.scale(1, 0.16);
    const gg = c.createRadialGradient(0, 0, 0, 0, 0, 240); gg.addColorStop(0, rgba(warm, 0.62 * lit)); gg.addColorStop(0.45, rgba(mixc(warm, OBS, 0.5), 0.22 * lit)); gg.addColorStop(1, rgba(OBS, 0));
    c.fillStyle = gg; c.fillRect(-240, -240, 480, 480); c.restore();
    /* kleurringen over de vloer: vijf tiers + de witte klap */
    c.save(); c.globalCompositeOperation = "lighter";
    const rings = [[0, [255, 255, 255]]].concat(TIERC.slice(0, 5).map((col, i) => [1.2 + 0.3 * i, col]));
    for (const [at, col] of rings) {
      const k = (L.rev - at) / 1.7; if (k <= 0 || k >= 1) continue;
      const rx = 26 + 240 * easeOut(k);
      c.beginPath(); c.ellipse(195, fy + 4, rx, rx * 0.17, 0, 0, TAU);
      c.strokeStyle = rgba(col, 0.8 * Math.pow(1 - k, 1.3)); c.lineWidth = 2.4 * (1 - k) + 0.6; c.stroke();
    }
    c.restore();
  }

  function rays(c, t, L, warm) {
    const lit = sstep(0, 1.2, L.rev); if (lit <= 0.01) return;
    c.save(); c.globalCompositeOperation = "lighter"; c.translate(L.cx, L.cy - 10);
    const reach = Math.max(620, WORLD_R * 1.3);
    const g = c.createRadialGradient(0, 0, 10, 0, 0, reach * 0.9); g.addColorStop(0, rgba(mixc(OBS, warm, 0.25), 0.34)); g.addColorStop(1, rgba(OBS, 0));
    c.fillStyle = g;
    for (let i = 0; i < 14; i++) {
      const a = t * 0.045 + i * (TAU / 14) + hash(i) * 0.3, w = 0.045 + 0.05 * hash(i + 9);
      c.globalAlpha = lit * 0.34 * (0.55 + 0.45 * Math.sin(t * 0.9 + i * 1.7));
      c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a - w) * reach, Math.sin(a - w) * reach); c.lineTo(Math.cos(a + w) * reach, Math.sin(a + w) * reach); c.closePath(); c.fill();
    }
    c.restore();
  }

  function embers(c, t, L, warm) {
    c.save(); c.globalCompositeOperation = "lighter";
    const top = -20, bot = L.floorY + 18, lit = 0.5 + 0.5 * sstep(0, 1.2, L.rev);
    for (const e of EMB) {
      const ph = (((t * e.sp + e.o) % 1) + 1) % 1, y = bot - ph * (bot - top);
      const x = e.x + Math.sin(ph * 7 + e.o * 20) * (8 + 14 * ph) + (e.x - 195) * 0.25 * ph;
      const heat = Math.pow(1 - ph, 1.4), col = mixc([150, 112, 255], mixc([255, 150, 60], warm, 0.45 * (1 - sstep(0, 6, L.rev))), clamp(heat * 1.15));
      const al = Math.pow(Math.sin(ph * Math.PI), 0.7) * 0.9 * e.b * lit, r = e.s * (0.5 + 0.5 * heat);
      c.fillStyle = rgba(col, al * 0.2); c.beginPath(); c.arc(x, y, r * 3, 0, TAU); c.fill();
      c.fillStyle = rgba(mixc(col, [255, 255, 255], 0.35), al); c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    c.restore();
  }

  /* titel + tekstblok */
  let titleGlow = null, titleGlowKey = "";
  function titleFit(c, word) {
    let size = 30; c.font = F_DISPLAY(size);
    const chars = Array.from(word);
    while (size > 14 && chars.reduce((a, ch) => a + c.measureText(ch).width, 0) + 7 * (chars.length - 1) > 330) { size -= 1; c.font = F_DISPLAY(size); }
    return size;
  }
  function getTitleGlow(word, size) {
    const key = word + size;
    if (titleGlow && titleGlowKey === key) return titleGlow;
    const cv = document.createElement("canvas"); cv.width = DW * 2; cv.height = 140; const g = cv.getContext("2d"); g.scale(2, 2);
    g.font = F_DISPLAY(size); g.textBaseline = "middle"; g.fillStyle = "rgba(166,143,224,.9)"; g.shadowColor = "rgba(166,143,224,.95)";
    for (const b of [26, 14]) { g.shadowBlur = b; trackedText(g, word, 195, 35, 7); }
    titleGlowKey = key; return (titleGlow = cv);
  }
  function titleWord(c, t, y) {
    const word = Array.from(S.word), size = titleFit(c, S.word);
    c.font = F_DISPLAY(size); c.textBaseline = "middle"; c.textAlign = "center";
    const w = word.map((s) => c.measureText(s).width), track = 7, total = w.reduce((a, b) => a + b, 0) + track * (word.length - 1);
    const done = sstep(19.0, 19.5, t);
    if (done > 0.01) { c.save(); c.globalCompositeOperation = "lighter"; c.globalAlpha = 0.5 * done * (0.8 + 0.2 * Math.sin(t * 1.6)); c.drawImage(getTitleGlow(S.word, size), 0, y - 35, DW, 70); c.restore(); }
    let x = 195 - total / 2;
    const sheen = seg(t, 19.6, 21.0), sheenX = lerp(-40, DW + 40, easeIO(sheen));
    for (let i = 0; i < word.length; i++) {
      const p = easeOut(seg(t, 18.2 + i * 0.09, 18.2 + i * 0.09 + 0.8)), cxm = x + w[i] / 2; x += w[i] + track;
      if (p <= 0.001) continue;
      c.save(); c.translate(cxm, y + (1 - p) * 10); const s = 1 + (1 - p) * 0.5; c.scale(s, s); c.globalAlpha = p;
      const ab = (1 - p) * (1 - p) * 10;
      c.globalCompositeOperation = "lighter"; c.fillStyle = "rgba(255,40,110,.5)"; c.fillText(word[i], -ab, 0); c.fillStyle = "rgba(40,170,255,.5)"; c.fillText(word[i], ab, 0);
      c.globalCompositeOperation = "source-over";
      const g = c.createLinearGradient(0, -size / 2, 0, size / 2);
      g.addColorStop(0, "#ffffff"); g.addColorStop(0.46, "#d9ceff"); g.addColorStop(0.5, "#2b2050"); g.addColorStop(0.56, "#8e7bd6"); g.addColorStop(1, "#e8e0ff");
      c.fillStyle = g; c.fillText(word[i], 0, 0);
      if (sheen > 0 && sheen < 1) {
        const gx = sheenX - cxm, sg = c.createLinearGradient(gx - 38, -size / 2, gx + 38, size / 2);
        sg.addColorStop(0, "rgba(255,255,255,0)"); sg.addColorStop(0.5, "rgba(255,255,255,.95)"); sg.addColorStop(1, "rgba(255,255,255,0)");
        c.fillStyle = sg; c.fillText(word[i], 0, 0);
      }
      c.restore();
    }
  }
  function copyBlock(c, t) {
    const A = (a, d = 0.6) => easeOut(seg(t, a, a + d));
    c.save(); c.textBaseline = "middle";
    let a = A(19.4);
    if (a > 0) { c.globalAlpha = a; c.font = F_MONO(9.5, 500); c.fillStyle = "#bfb0ee"; trackedText(c, S.tx.sub, 195, 506, 2.0); }
    a = A(19.9);
    if (a > 0) { c.globalAlpha = a; c.font = F_SERIF(14.5); c.fillStyle = "#ddd5f7"; c.textAlign = "center"; c.fillText(S.tx.l1, 195, 534); c.fillText(S.tx.l2, 195, 554); }
    a = A(20.4, 0.7);
    if (a > 0) { c.globalAlpha = 1; const g = c.createLinearGradient(195 - 110 * a, 0, 195 + 110 * a, 0); g.addColorStop(0, "rgba(166,143,224,0)"); g.addColorStop(0.5, "rgba(205,189,255,.9)"); g.addColorStop(1, "rgba(166,143,224,0)"); c.fillStyle = g; c.fillRect(195 - 110 * a, 578, 220 * a, 1); }
    a = A(20.7);
    if (a > 0) {
      c.globalAlpha = a; c.fillStyle = "#f2ecff"; let sz = 15; c.font = F_DISPLAY(sz); const nm = (S.name || "").toUpperCase();
      while (sz > 9 && c.measureText(nm).width + 7 * nm.length > 330) { sz -= 1; c.font = F_DISPLAY(sz); }
      trackedText(c, nm, 195, 604, 7);
    }
    a = A(21.0);
    if (a > 0 && S.rankLine) {
      c.globalAlpha = a; c.font = F_SERIF(14.5); c.textAlign = "center";
      c.fillStyle = S.rankGold ? "#f4c430" : "#cdbdff"; c.fillText(S.rankLine, 195, 629);
    }
    a = A(21.3);
    if (a > 0) {
      c.globalAlpha = a;
      for (let i = 0; i < 5; i++) {
        c.fillStyle = "#fff"; emoji(c, S.ladders[i].ico, RX[i], 658, 15);
        c.font = F_MONO(12.5, 600); c.fillStyle = rgba(mixc(TIERC[i], [255, 255, 255], 0.35), 1); c.textAlign = "center"; c.fillText(fmtN(S.ladders[i].steps[5]), RX[i], 679);
      }
    }
    a = A(21.6);
    if (a > 0 && S.ageLine) { c.globalAlpha = a * 0.9; c.font = F_MONO(8.5); c.fillStyle = "#a094c4"; trackedText(c, S.ageLine, 195, 706, 1.2); }
    c.restore();
  }

  function reveal(c, t) {
    const L = stoneLayout(t), rev = L.rev, cool = sstep(0, 6, rev), warm = mixc([255, 122, 42], [150, 110, 255], cool);
    const lit = sstep(0, 0.5, rev);
    c.fillStyle = "#030108"; c.fillRect(-BIG, -BIG, DW + 2 * BIG, DH + 2 * BIG);
    const g = c.createRadialGradient(195, L.cy, 10, 195, L.cy, 440);
    g.addColorStop(0, "rgba(78,44,140,.7)"); g.addColorStop(0.5, "rgba(26,12,52,.55)"); g.addColorStop(1, "rgba(3,1,8,0)");
    c.fillStyle = g; c.fillRect(-BIG, -BIG, DW + 2 * BIG, DH + 2 * BIG);
    stars(c, t, 0.55);
    rays(c, t, L, warm);
    const sw = TIERC.slice(0, 5).map((col, i) => { const p = seg(rev, 1.1 + 0.3 * i, 2.7 + 0.3 * i); return { az: lerp(-1.5, 1.7, p), a: Math.pow(Math.sin(Math.PI * p), 1.2), c: col.map((v) => v / 255) }; });
    floorFx(c, t, L, warm, sw);
    /* halo achter de steen: zonder rand verdwijnt zwart glas in het zwart */
    c.save(); c.globalCompositeOperation = "lighter";
    const hg = c.createRadialGradient(L.cx, L.cy, L.half * 0.2, L.cx, L.cy, L.half * 1.7);
    hg.addColorStop(0, rgba(OBS, 0.3 * lit)); hg.addColorStop(0.5, rgba([90, 60, 180], 0.12 * lit)); hg.addColorStop(1, rgba(OBS, 0));
    c.fillStyle = hg; c.fillRect(L.cx - L.half * 1.8, L.cy - L.half * 1.8, L.half * 3.6, L.half * 3.6); c.restore();
    const bands = TIERC.slice(0, 5).map((col, i) => { const p = seg(rev, 1.2 + 0.3 * i, 2.6 + 0.3 * i); return { p: easeIO(p), a: Math.pow(Math.sin(Math.PI * p), 1.1), c: col }; });
    { const p = seg(rev, 3.1, 4.0); bands.push({ p: easeIO(p), a: 0.7 * Math.sin(Math.PI * p), c: [255, 255, 255] }); }
    drawStone(c, L.cx, L.cy, L.half, stoneRot(t), 0.12 + 0.03 * Math.sin(t * 0.5), 0.05 * Math.sin(t * 0.37), t, sw, warm, true, bands);
    embers(c, t, L, warm);
    titleWord(c, t, 470);
    const st = seg(t, 19.0, 20.2);
    if (st > 0 && st < 1) {
      c.save(); c.globalCompositeOperation = "lighter"; const w = 40 + 330 * easeOut(st), a = Math.sin(Math.PI * st);
      const lg = c.createLinearGradient(195 - w, 0, 195 + w, 0); lg.addColorStop(0, "rgba(205,189,255,0)"); lg.addColorStop(0.5, `rgba(255,255,255,${0.9 * a})`); lg.addColorStop(1, "rgba(205,189,255,0)");
      c.fillStyle = lg; c.fillRect(195 - w, 469, w * 2, 2); c.restore();
    }
    copyBlock(c, t);
    const hint = sstep(21.5, 22.4, t) * (S.touched ? 0 : 1);
    if (hint > 0.01) {
      c.save(); c.globalAlpha = hint * (0.35 + 0.35 * Math.sin(t * 3)); c.font = F_UI(26, 300); c.fillStyle = "#cdbdff"; c.textAlign = "center"; c.textBaseline = "middle";
      const dx = 3 * Math.sin(t * 3); c.fillText("‹", 28 - dx, L.cy); c.fillText("›", 362 + dx, L.cy); c.restore();
    }
  }

  /* ═══════════════════════ scène + nabewerking ═══════════════════════ */
  function shakeAmt(t) {
    if (S.reduced) return 0;
    let a = sstep(10.2, 12.2, t) * (1 - sstep(12.2, 12.3, t)) * 3.0;
    a += sstep(12.62, 13.9, t) * (1 - sstep(14.0, 14.05, t)) * 4.5;
    a += sstep(13.99, 14.02, t) * (1 - sstep(14.0, 14.9, t)) * 9;
    return a;
  }
  function scene(c, t, o) {
    const sk = o.pre ? 0 : shakeAmt(t);
    c.save();
    if (sk > 0) { const f = Math.floor(t * 50); c.translate((hash(f) - 0.5) * 2 * sk, (hash(f + 17.3) - 0.5) * 2 * sk); }
    if (t < 3.7) actI(c, t); else voidBg(c, t);
    if (t > 3.4 && t < 9.95) rails(c, t);
    if (t > 8.7 && t < 10.2) beams(c, t);
    if (t >= T.sun && t < T.brk) sun(c, t);
    if (t >= T.crack && t < T.brk + (o.pre ? 0.1 : 0)) cracks(c, t, o);
    if (t >= 13.99 && !o.pre) { reveal(c, t); flashBehind(c, t); shock(c, t); shards(c, t); }
    c.restore();
  }
  function post(c, W, H, t) {
    const g = c.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.25, W / 2, H * 0.45, Math.max(W, H) * 0.78);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.6)"); c.fillStyle = g; c.fillRect(0, 0, W, H);
    if (t < 3.5) return;   // de grein hoort bij het zwarte beeld, niet bij de sluier over de pagina
    c.save(); c.globalAlpha = 0.055; c.globalCompositeOperation = "screen";
    const ox = Math.floor(hash(Math.floor(t * 24)) * 128), oy = Math.floor(hash(Math.floor(t * 24) + 5) * 128);
    c.fillStyle = c.createPattern(GRAIN, "repeat"); c.translate(-ox, -oy); c.fillRect(ox, oy, W, H); c.restore();
  }
  // Tekent op een canvas van W×H css-px (met dpr). `o.pre` = alleen het beeld vlak vóór de breuk (voor de scherven).
  function renderTo(c, W, H, dpr, t, o) {
    o = o || {};
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = "source-over";
    c.clearRect(0, 0, W, H);
    const k = Math.min(W / DW, H / DH), ox = (W - DW * k) / 2, oy = (H - DH * k) / 2;
    const prev = S.view; S.view = { k, ox, oy, W, H };
    c.save(); c.translate(ox, oy); c.scale(k, k);
    scene(c, t, o);
    c.restore();
    if (!o.pre) { post(c, W, H, t); flash(c, W, H, t); }
    S.view = prev || S.view;
  }

  /* ═══════════════════════ geluid (standaard uit) ═══════════════════════ */
  const AU = { ctx: null };
  const PENTA = [293.66, 349.23, 440, 523.25, 659.25];
  function auInit() {
    if (AU.ctx) { if (AU.ctx.state === "suspended") AU.ctx.resume(); return; }
    try {
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      const x = new C(); AU.ctx = x;
      const master = x.createGain(); master.gain.value = 0;
      const comp = x.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.25;
      master.connect(comp); comp.connect(x.destination);
      const bus = x.createGain(); bus.connect(master);
      const send = x.createGain(); send.gain.value = 0.5; const dl = x.createDelay(1.2); dl.delayTime.value = 0.31;
      const fb = x.createGain(); fb.gain.value = 0.46; const lp = x.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 2400;
      const wet = x.createGain(); wet.gain.value = 0.55;
      bus.connect(send); send.connect(dl); dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(master);
      const nb = x.createBuffer(1, x.sampleRate * 2, x.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      AU.noise = nb; AU.bus = bus; AU.master = master;
      const osc = (type, f, dest, g, det) => { const o = x.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det || 0; const gg = x.createGain(); gg.gain.value = g; o.connect(gg); gg.connect(dest); o.start(); return o; };
      const dLP = x.createBiquadFilter(); dLP.type = "lowpass"; dLP.frequency.value = 320; const dG = x.createGain(); dG.gain.value = 0; dLP.connect(dG); dG.connect(bus);
      AU.drone = [osc("sine", 55, dLP, 1), osc("triangle", 55, dLP, 0.5, 7), osc("sine", 82.4, dLP, 0.25, -5)]; AU.dG = dG;
      const rs = x.createBufferSource(); rs.buffer = nb; rs.loop = true; const rBP = x.createBiquadFilter(); rBP.type = "bandpass"; rBP.Q.value = 1.2; rBP.frequency.value = 300;
      const rG = x.createGain(); rG.gain.value = 0; rs.connect(rBP); rBP.connect(rG); rG.connect(bus); rs.start(); AU.rBP = rBP; AU.rG = rG;
      const pLP = x.createBiquadFilter(); pLP.type = "lowpass"; pLP.frequency.value = 250; const pG = x.createGain(); pG.gain.value = 0; pLP.connect(pG); pG.connect(bus);
      [73.42, 110, 146.83, 174.61, 220, 329.63].forEach((f, i) => osc(i % 2 ? "triangle" : "sine", f, pLP, [1, 0.8, 0.7, 0.45, 0.4, 0.2][i], (i - 2.5) * 3));
      AU.pLP = pLP; AU.pG = pG;
    } catch (e) { AU.ctx = null; }
  }
  function auUpdate(t, run) {
    const x = AU.ctx; if (!x || !AU.master) return; const now = x.currentTime, on = S.sound && run;
    const set = (p, v) => p.setTargetAtTime(v, now, 0.09);
    set(AU.master.gain, on ? 0.85 : 0);
    const droneEnv = t < 1.4 ? 0 : t < 3.6 ? lerp(0, 0.1, seg(t, 1.4, 3.6)) : t < 9.9 ? lerp(0.1, 0.22, seg(t, 3.6, 9.9)) : t < 12.2 ? lerp(0.22, 0.42, seg(t, 9.9, 12.2)) : t < 12.55 ? 0 : t < 14.0 ? lerp(0.12, 0.3, seg(t, 12.55, 14)) : lerp(0.05, 0, seg(t, 14, 16));
    set(AU.dG.gain, run ? droneEnv : 0);
    const f = 55 * (1 - 0.12 * seg(t, 9.9, 12.2)); AU.drone.forEach((o, i) => o.frequency.setTargetAtTime([f, f, f * 1.5][i], now, 0.1));
    set(AU.rG.gain, run ? (t < 5.5 ? 0 : t < 9.9 ? lerp(0, 0.04, seg(t, 5.5, 9)) : t < 12.2 ? lerp(0.04, 0.16, seg(t, 9.9, 12.2)) : 0) : 0);
    AU.rBP.frequency.setTargetAtTime(300 * Math.pow(13, seg(t, 5.5, 12.2)), now, 0.08);
    const padEnv = t < 14 ? 0 : t < 17 ? lerp(0, 0.085, seg(t, 14, 17)) : t < 22.5 ? 0.09 : lerp(0.09, 0, seg(t, 22.5, 27));
    set(AU.pG.gain, run ? padEnv : 0);
    AU.pLP.frequency.setTargetAtTime(250 + 2550 * sstep(14, 19, t), now, 0.1);
  }
  function ping(f, g, dec, type) { const x = AU.ctx, now = x.currentTime, o = x.createOscillator(); o.type = type || "sine"; o.frequency.value = f; const e = x.createGain(); e.gain.setValueAtTime(0, now); e.gain.linearRampToValueAtTime(g, now + 0.005); e.gain.exponentialRampToValueAtTime(0.0001, now + dec); o.connect(e); e.connect(AU.bus); o.start(now); o.stop(now + dec + 0.05); }
  function bell(f, g, dec) { ping(f, g, dec); ping(f * 2.01, g * 0.35, dec * 0.7); ping(f * 3.98, g * 0.12, dec * 0.4); }
  function thump(f0, f1, g, dec) { const x = AU.ctx, now = x.currentTime, o = x.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(f0, now); o.frequency.exponentialRampToValueAtTime(f1, now + dec * 0.7); const e = x.createGain(); e.gain.setValueAtTime(0, now); e.gain.linearRampToValueAtTime(g, now + 0.008); e.gain.exponentialRampToValueAtTime(0.0001, now + dec); o.connect(e); e.connect(AU.bus); o.start(now); o.stop(now + dec + 0.05); }
  function burst(type, f, q, g, dec, f2) { const x = AU.ctx, now = x.currentTime, s = x.createBufferSource(); s.buffer = AU.noise; const bp = x.createBiquadFilter(); bp.type = type; bp.frequency.setValueAtTime(f, now); if (f2) bp.frequency.exponentialRampToValueAtTime(f2, now + dec); bp.Q.value = q; const e = x.createGain(); e.gain.setValueAtTime(0, now); e.gain.linearRampToValueAtTime(g, now + 0.006); e.gain.exponentialRampToValueAtTime(0.0001, now + dec); s.connect(bp); bp.connect(e); e.connect(AU.bus); s.start(now, Math.random() * 1.4); s.stop(now + dec + 0.05); }

  let CUES = [], cuesBuilt = false;
  function buildCues() {
    if (cuesBuilt) return; cuesBuilt = true; CUES = [];
    const cue = (t, fn, hap) => CUES.push({ t, fn, hap });
    cue(1.00, () => thump(70, 34, 0.55, 0.3), [35]);
    cue(1.34, () => thump(64, 32, 0.4, 0.3), [55]);
    cue(1.95, () => { burst("highpass", 3000, 0.7, 0.1, 0.06); ping(1900, 0.02, 0.2); });
    cue(2.35, () => { thump(120, 30, 0.8, 1.2); burst("bandpass", 2400, 0.8, 0.25, 0.5, 8000); bell(587, 0.07, 2.5); }, [90]);
    for (let k = 0; k < 5; k++) cue(nodeT(2, k), () => bell(PENTA[k], 0.045, 1.6), k === 4 ? [25] : [8]);
    cue(nodeT(2, 5), () => { thump(95, 28, 0.7, 0.9); burst("lowpass", 1400, 0.6, 0.22, 0.9, 90); }, [45]);
    cue(8.75, () => burst("bandpass", 300, 1.0, 0.12, 0.9, 3500));
    cue(9.9, () => { burst("lowpass", 3200, 0.7, 0.35, 0.7, 120); thump(200, 30, 0.9, 1.6); }, [60, 40, 60]);
    CRACK.mains.forEach((m) => cue(m.t0, () => { burst("highpass", 2800 + Math.random() * 1200, 0.8, 0.13, 0.05); ping(2400 + Math.random() * 1500, 0.02, 0.25); }, [12]));
    cue(13.75, () => ping(1760, 0.03, 0.5), [25]);
    cue(14.0, () => {
      thump(70, 24, 1.0, 2.2); burst("bandpass", 1400, 0.5, 0.42, 1.4, 300);
      for (let i = 0; i < 20; i++) setTimeout(() => AU.ctx && S && ping(2200 + Math.random() * 4800, 0.024, 0.45), 20 + Math.random() * 1250);
    }, [400]);
    for (let i = 0; i < 5; i++) cue(15.2 + 0.3 * i, () => bell(PENTA[i] * 2, 0.06, 2.8), [20]);
    for (let i = 0; i < 9; i++) cue(18.2 + 0.09 * i, () => ping(2600 + i * 60, 0.012, 0.06));
    cue(19.1, () => bell(146.83, 0.09, 5), [40]);
    for (let n = 0; n < 8; n++) { const f = [587.33, 698.46, 880, 1046.5, 1318.5, 1568][n % 6]; cue(15.6 + n * 0.85, () => ping(f, 0.018, 2.2)); }
  }
  function fireCues(prev, now) {
    if (now - prev > 0.3 || now <= prev) return;
    for (const q of CUES) if (q.t > prev && q.t <= now) {
      if (AU.ctx && S.sound) { try { q.fn(); } catch (e) {} }
      if (S.haptic && q.hap && navigator.vibrate) { try { navigator.vibrate(q.hap); } catch (e) {} }
    }
  }

  /* ═══════════════════════ voorstelling ═══════════════════════ */
  const CSS = `
.obx { padding: 0; display: block; background: transparent; touch-action: pan-y; }
.obx .obx-cv { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: grab; touch-action: pan-y; }
.obx .obx-cv:active { cursor: grabbing; }
.obx-pill { position: absolute; z-index: 2; display: inline-flex; align-items: center; justify-content: center; min-height: 44px; min-width: 44px; padding: 0 16px; border-radius: 999px;
  border: 1px solid rgba(166, 143, 224, .6); background: rgba(10, 6, 22, .72); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); color: #ece6ff;
  font: 500 12px/1 ui-monospace, "SF Mono", Menlo, Consolas, monospace; letter-spacing: .06em; cursor: pointer; }
.obx-pill:hover { border-color: #cdbdff; background: rgba(24, 14, 48, .85); }
.obx-skip { top: max(10px, env(safe-area-inset-top)); right: 12px; }
.obx-snd { top: max(10px, env(safe-area-inset-top)); left: 12px; padding: 0; font-size: 18px; }
.obx-actions { position: absolute; z-index: 2; left: 50%; bottom: max(14px, env(safe-area-inset-bottom)); transform: translateX(-50%); width: min(358px, calc(100% - 24px)); display: flex; gap: 8px; }
.obx-btn { flex: 1 1 0; min-height: 46px; border-radius: 13px; border: 1px solid rgba(166, 143, 224, .45); background: rgba(14, 9, 30, .78); -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px);
  color: #ece6ff; font: 500 15px/1.1 -apple-system, "Segoe UI", system-ui, sans-serif; padding: 0 8px; cursor: pointer; }
.obx-btn:hover { border-color: #cdbdff; }
.obx-btn.pri { flex: 1.5 1 0; background: linear-gradient(180deg, #cdbdff, #a68fe0); color: #120a26; border-color: #cdbdff; font-weight: 600; }
.obx button:focus-visible { outline: 2px solid #cdbdff; outline-offset: 3px; }
.obx-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }`;
  let cssDone = false;
  function injectCss() { if (cssDone) return; cssDone = true; const st = document.createElement("style"); st.id = "obx-css"; st.textContent = CSS; document.head.appendChild(st); }

  async function loadFont(url) {
    try {
      if (!url || !window.FontFace) return;
      const ff = new FontFace("ObxSyncopate", `url(${url}) format("woff2")`, { weight: "700" });
      await Promise.race([ff.load().then((f) => document.fonts.add(f)), new Promise((r) => setTimeout(r, 2500))]);
    } catch (e) {}
  }

  // play(opts) → { done: Promise<string>, destroy(), seek(t), state() }
  //   opts.host        het .modal-element (al in de DOM en zichtbaar)
  //   opts.lang        taalcode van het spel (nl, en, de, es, pt); opts.locale de Intl-code (nl-NL, …)
  //   opts.tierNames   de zes tredenamen in die taal (brons … obsidiaan); opts.capTitle de naam van de prestige-track
  //   opts.rewardIcons de vijf beloning-icoontjes van brons t/m diamant
  //   opts.ladders     [{ key, steps[6] }] ×5 (games, dailies, streak, perfect, pure); de drempels van trede 6 staan op steps[5]
  //   opts.name        je weergavenaam
  //   opts.claim       Promise (of waarde) met { rank, first_play, claimed_at } van de server, of null; de show wacht er niet op
  //   opts.wearable    kan de speler 🖤 nu dragen? (niet bij een voorvertoning)
  //   opts.sound       start-stand van het geluid; opts.onSound(on) bij een wissel; opts.reduced = stilstaand eindbeeld
  //   opts.onAction(naam)  "wear" | "done"; opts.fontUrl het lettertype van de titel
  async function play(opts) {
    injectCss();
    const host = opts.host, L = TX[opts.lang] || TX.en;
    const tx = { ...L, word: opts.tierNames[5], tiers: opts.tierNames, rewardIcons: opts.rewardIcons, capTitle: opts.capTitle, shareText: L.shareText(opts.name || ""), site: "JAARDLE.COM" };
    S = { host, tx, ladders: opts.ladders.map((l) => ({ ico: LADDER_ICON[l.key], unit: L.units[l.key], steps: l.steps })), name: opts.name || "", word: (opts.tierNames[5] || "OBSIDIAN").toUpperCase(),
      rankLine: "", rankGold: false, ageLine: "", locale: opts.locale,
      reduced: !!opts.reduced, sound: !!opts.sound, haptic: opts.haptic !== false, t: 0, playing: true, w: 390, h: 800, dpr: 1,
      spin: 0, spinV: 0, drag: false, touched: false, snap: null, view: { k: 1, ox: 0, oy: 0, W: 390, H: 800 }, dead: false, actionsShown: false };
    titleGlow = null;
    host.classList.add("obx");
    host.setAttribute("aria-label", tx.aria);
    host.innerHTML = `<canvas class="obx-cv" aria-hidden="true"></canvas><div class="obx-sr" role="status" aria-live="polite"></div>` +
      `<button type="button" class="obx-pill obx-snd" aria-pressed="${S.sound}" aria-label="${S.sound ? tx.soundOff : tx.soundOn}">${S.sound ? "🔊" : "🔇"}</button>` +
      `<button type="button" class="obx-pill obx-skip" hidden>${tx.skip} ▸▸</button>` +
      `<div class="obx-actions" hidden>${opts.wearable ? `<button type="button" class="obx-btn pri" data-act="wear">🖤 ${tx.wear}</button>` : ""}<button type="button" class="obx-btn" data-act="share">${tx.share}</button><button type="button" class="obx-btn" data-act="done">${tx.next}</button></div>`;
    const cv = host.querySelector(".obx-cv"), ctx = cv.getContext("2d"), skip = host.querySelector(".obx-skip"), snd = host.querySelector(".obx-snd"), actions = host.querySelector(".obx-actions"), live = host.querySelector(".obx-sr");
    await loadFont(opts.fontUrl);
    if (S.dead || !host.isConnected || host.hidden) return null;

    function size() {
      const r = host.getBoundingClientRect(); S.w = Math.max(1, r.width); S.h = Math.max(1, r.height);
      let dpr = Math.min(window.devicePixelRatio || 1, 2);
      while (dpr > 1 && S.w * S.h * dpr * dpr > 5.5e6) dpr -= 0.25;   // zware schermen: iets minder pixels, de show blijft vloeiend
      S.dpr = dpr; cv.width = Math.round(S.w * dpr); cv.height = Math.round(S.h * dpr); S.snap = null;
      const k = Math.min(S.w / DW, S.h / DH), ox = (S.w - DW * k) / 2, oy = (S.h - DH * k) / 2;
      const corner = Math.max(Math.hypot(-ox / k - EC.x, -oy / k - EC.y), Math.hypot((S.w - ox) / k - EC.x, -oy / k - EC.y), Math.hypot(-ox / k - EC.x, (S.h - oy) / k - EC.y), Math.hypot((S.w - ox) / k - EC.x, (S.h - oy) / k - EC.y));
      buildWorld(Math.max(560, corner + 40));
      buildCues();
      draw();
    }
    function draw() { if (!S.dead) renderTo(ctx, S.w, S.h, S.dpr, S.t); }
    size();
    const ro = window.ResizeObserver ? new ResizeObserver(size) : null; if (ro) ro.observe(host); else window.addEventListener("resize", size);

    let resolveDone, raf = 0, last = performance.now();
    const done = new Promise((r) => { resolveDone = r; });
    function showActions() {
      if (S.actionsShown) return; S.actionsShown = true; actions.hidden = false; skip.hidden = true;
      live.textContent = `${S.word}. ${S.name} ${S.rankLine}`.trim();
      const first = actions.querySelector(".pri"); if (first && !S.reduced) try { first.focus({ preventScroll: true }); } catch (e) {}
    }
    function finish() { S.t = T.end; showActions(); draw(); }
    function loop(now) {
      if (S.dead) return;
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      if (!S.drag && Math.abs(S.spinV) > 0.001) { S.spin += S.spinV * dt; S.spinV *= Math.exp(-2.6 * dt); }
      if (S.playing && !document.hidden) { const prev = S.t; S.t += dt; fireCues(prev, S.t); }
      if (S.t >= 2.0 && S.t < 21.5 && skip.hidden && !S.actionsShown) skip.hidden = false;
      if (S.t >= 22.0) showActions();
      if (!document.hidden) draw();
      auUpdate(S.t, S.playing && !document.hidden);
      raf = requestAnimationFrame(loop);
    }
    // schermlezers: één korte aankondiging zodra de show begint (de rest is beeld)
    live.textContent = tx.aria;
    /* de gegevens van de server (volgnummer, hoe lang al): de show wacht er niet op; komen ze later, dan staan ze er vanaf dat moment */
    const applyInfo = (info) => {
      if (S.dead) return;
      if (!info) { const w = actions.querySelector('[data-act="wear"]'); if (w && opts.requireClaim) w.remove(); return; }
      const rank = Number(info.rank);
      if (Number.isFinite(rank)) { S.rankLine = rank === 0 ? tx.maker : rank === 1 ? tx.first : tx.nr(rank); S.rankGold = rank <= 1; }
      const a = Date.parse(info.first_play), b = Date.parse(info.claimed_at);
      if (a && b && b >= a) {
        const days = Math.max(1, Math.round((b - a) / 864e5)), date = new Intl.DateTimeFormat(opts.locale || undefined, { day: "numeric", month: "short", year: "numeric" }).format(a).replace(/\./g, "");
        S.ageLine = tx.age(days, date.toUpperCase());
      }
      if (S.reduced) draw();
    };
    Promise.resolve(opts.claim).then(applyInfo, () => applyInfo(null));
    if (S.reduced) { S.playing = false; finish(); }
    else raf = requestAnimationFrame(loop);

    const onSkip = () => { if (S.t < T.end) { finish(); } };
    skip.addEventListener("click", onSkip);
    snd.addEventListener("click", () => {
      S.sound = !S.sound; snd.setAttribute("aria-pressed", String(S.sound)); snd.textContent = S.sound ? "🔊" : "🔇";
      snd.setAttribute("aria-label", S.sound ? tx.soundOff : tx.soundOn);
      if (S.sound) auInit(); if (opts.onSound) { try { opts.onSound(S.sound); } catch (e) {} }
    });
    if (S.sound) auInit();
    // ESC: tijdens de show eerst naar het eindbeeld (één per ongeluk ingedrukte toets sluit dit eenmalige moment niet); daarna sluit het spel zelf.
    const onKey = (e) => { if (e.key === "Escape" && S.t < T.end) { e.stopImmediatePropagation(); e.preventDefault(); finish(); } };
    document.addEventListener("keydown", onKey, true);
    // steen draaien (pijltoetsen werken ook)
    let dragX = 0, lastMove = 0;
    cv.addEventListener("pointerdown", (e) => { if (S.t < 15.5) return; S.drag = true; S.touched = true; dragX = e.clientX; S.spinV = 0; lastMove = performance.now(); try { cv.setPointerCapture(e.pointerId); } catch (x) {} });
    cv.addEventListener("pointermove", (e) => { if (!S.drag) return; const dx = e.clientX - dragX; dragX = e.clientX; S.spin += dx * 0.011; const n = performance.now(); S.spinV = (dx * 0.011) / Math.max(0.008, (n - lastMove) / 1000); lastMove = n; if (S.reduced) draw(); });
    const endDrag = () => { S.drag = false; S.spinV = clamp(S.spinV, -9, 9); };
    cv.addEventListener("pointerup", endDrag); cv.addEventListener("pointercancel", endDrag);
    const onArrow = (e) => { if (S.t >= 15.5 && (e.key === "ArrowLeft" || e.key === "ArrowRight") && !e.target.closest?.("button")) { S.touched = true; S.spin += (e.key === "ArrowLeft" ? -1 : 1) * 0.35; if (S.reduced) draw(); } };
    document.addEventListener("keydown", onArrow);
    const onVis = () => { if (AU.ctx) { if (document.hidden) AU.ctx.suspend(); else if (S.sound) AU.ctx.resume(); } };
    document.addEventListener("visibilitychange", onVis);

    actions.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const act = b.dataset.act;
      if (act === "share") { sharePoster(tx, b); return; }
      if (opts.onAction) opts.onAction(act);
    });

    function destroy() {
      if (S.dead) return; S.dead = true; cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey, true); document.removeEventListener("keydown", onArrow); document.removeEventListener("visibilitychange", onVis);
      if (ro) ro.disconnect(); else window.removeEventListener("resize", size);
      if (AU.ctx) { try { AU.master.gain.setTargetAtTime(0, AU.ctx.currentTime, 0.05); const c = AU.ctx; AU.ctx = null; setTimeout(() => { try { c.close(); } catch (e) {} }, 400); } catch (e) { AU.ctx = null; } }
      host.classList.remove("obx"); host.innerHTML = "";
      resolveDone("closed");
    }
    return { done, destroy, state: () => S, draw,
      seek: (t) => {   // test-hook: naar een willekeurig moment (ook terug); de show blijft daar staan
        S.playing = false; S.t = clamp(t, 0, 40); S.actionsShown = S.t >= 22; actions.hidden = !S.actionsShown; skip.hidden = S.t < 2 || S.t >= 21.5; draw();
      } };
  }

  // Deelkaart (9:16) van het eindbeeld. Web Share met bestand waar dat kan, anders een download.
  async function sharePoster(tx, btn) {
    try {
      const W = 1080, H = 2216, pc = document.createElement("canvas"); pc.width = W; pc.height = H;
      const keep = { t: S.t, spin: S.spin, snap: S.snap, view: S.view, touched: S.touched };
      S.touched = true; renderTo(pc.getContext("2d"), W, H, 1, T.end);
      S.t = keep.t; S.spin = keep.spin; S.snap = keep.snap; S.view = keep.view; S.touched = keep.touched;
      const out = document.createElement("canvas"); out.width = 1080; out.height = 1994; const g = out.getContext("2d");
      g.drawImage(pc, 0, 139, 1080, 1994, 0, 0, 1080, 1994);
      g.fillStyle = "rgba(205,189,255,.85)"; g.font = F_MONO(24, 500); g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(tx.site.split("").join(" "), 540, 1994 - 46);
      const blob = await new Promise((res) => out.toBlob(res, "image/png"));
      if (!blob) return;
      const file = new File([blob], "jaardle-obsidiaan.png", { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], text: tx.shareText, title: tx.word }); return; } catch (e) { if (e && e.name === "AbortError") return; }
      }
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "jaardle-obsidiaan.png"; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    } catch (e) { /* delen is een extraatje: een fout mag de onthulling niet storen */ }
  }

  return { play, TX, _renderAt(canvas, t, o) { /* test-hook: één beeld op een los canvas */ S = o; const dpr = o.dpr || 1; canvas.width = o.w * dpr; canvas.height = o.h * dpr; buildWorld(Math.max(560, o.need || 560)); buildCues(); renderTo(canvas.getContext("2d"), o.w, o.h, dpr, t); } };
})();
