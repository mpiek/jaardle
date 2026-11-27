// 🃏 Verluchte Timeline-kaarten (JaardleCards, db/240, 26/11/2026): de kaartstijlen die je verdient op Kroniekschrijver-platina (1500 goed
// gelegde kaarten). Getijdenboek (een rand zoals in een getijdenboek: een balk in de kleuren van de categorie met een medaillon, ranken met
// klimopblad, gouden stipjes en krullen, een versierde beginletter), Draken (+ twee draken onderaan, een gouden kaartrand en parels) en
// Zwarte getijden (alles op zwart perkament). Mockups: https://claude.ai/artifact/3MfpKT1bvmhDqq4VCnA8q5 (de stijl, zijn "ja love die stijl")
// en https://claude.ai/artifact/EM4Sci7zR63Khac9Yrf4GU (als beloning).
// Apart bestand, zoals ObsidianFx: game.js haalt het pas op als je een stijl aan hebt (Timeline), de kluis-tab Kaarten opent of de beloning
// vrijspeelt. Het bevat de tekenaar, zijn CSS en het lettertype van de beginletter (fonts/jaardle-ini.woff2, een subset van
// UnifrakturMaguntia, OFL; zie fonts/LICENSE-UnifrakturMaguntia.txt).
// De categorie van een kaart kiest de kleuren en het embleem (die staat al op de kaart, dus de rand verraadt niets over het jaar); de stijl
// kiest hoeveel er getekend wordt. Elke kaart heeft een eigen toevalsgetal (zijn sleutel), dus geen twee ranken zijn gelijk.
window.JaardleCards = (() => {
  "use strict";
  // de tekenstand per stijl (3 = volle lijst + gouden beginletter, 5 = + draken, 6 = zwart; db/243: 8 = Glas-in-lood, 9 = Ouroboros)
  const LV = { glass: 8, book: 3, dragons: 5, black: 6, ouro: 9 };
  const NOINI = new Set([8]);   // Glas-in-lood (brons) is bewust kaal: geen verluchte beginletter
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const f2 = (n) => (Math.round(n * 100) / 100).toString();
  const rng = (seed) => { let x = (seed * 7919 + 13) % 2147483647 || 7; return () => (x = x * 16807 % 2147483647) / 2147483647; };

  // pigmenten per categorie (1 oorlog · 2 politiek · 3 religie · 4 wetenschap · 5 kunst · 6 ontdekking · 7 ramp · 8 samenleving):
  // m = hoofdkleur (balk, medaillon, beginletter), s = tweede kleur
  const CATC = {
    1: { m: "#b3262f", s: "#2c4c9c" }, 2: { m: "#2c4c9c", s: "#6b2a6e" }, 3: { m: "#3a5fb0", s: "#e8dcc0" }, 4: { m: "#3d7a4c", s: "#2c4c9c" },
    5: { m: "#b8364a", s: "#3d7a4c" }, 6: { m: "#2a6f8f", s: "#3d7a4c" }, 7: { m: "#8f1f1f", s: "#24201a" }, 8: { m: "#8a6230", s: "#b8364a" },
  };
  const GREEN = "#3d7a4c";
  // emblemen in een eenheidsvak [-1, 1]: zwaarden, kroon, kaars, astrolabium, lier, windroos, vlammen, stadspoort
  const EMB = {
    1: `<g fill="none" stroke-width=".2" stroke-linecap="round"><path d="M-.62-.62L.5.5M.62-.62L-.5.5"/><path d="M-.6.18L-.18.6M.6.18L.18.6" stroke-width=".16"/></g><circle cx="-.66" cy=".66" r=".14"/><circle cx=".66" cy=".66" r=".14"/>`,
    2: `<path d="M-.72.45V-.3L-.36.06L0-.62L.36.06L.72-.3V.45Z"/><circle cx="0" cy="-.74" r=".12"/><circle cx="-.74" cy="-.4" r=".1"/><circle cx=".74" cy="-.4" r=".1"/>`,
    3: `<rect x="-.2" y="-.12" width=".4" height=".84" rx=".04"/><path d="M0-.82Q.26-.42 0-.2Q-.26-.42 0-.82Z"/><path d="M-.45.72H.45" stroke-width=".14"/>`,
    4: `<g fill="none" stroke-width=".13"><circle r=".66"/><ellipse rx=".66" ry=".24" transform="rotate(-28)"/><path d="M0-.66V.66"/></g><circle r=".14"/>`,
    5: `<g fill="none" stroke-width=".16" stroke-linecap="round"><path d="M-.42-.66Q-.78.1-.2.62H.2Q.78.1.42-.66"/><path d="M-.52-.42H.52" stroke-width=".13"/><path d="M-.16-.4V.55M0-.4V.6M.16-.4V.55" stroke-width=".07"/></g>`,
    6: `<path d="M0-.85L.18-.18L.85 0L.18.18L0 .85L-.18.18L-.85 0L-.18-.18Z"/><path d="M.5-.5L.1-.1L.5.5L.1.1L-.5.5L-.1.1L-.5-.5L-.1-.1Z" opacity=".7"/>`,
    7: `<path d="M-.55.72Q-.85.05-.3-.3Q-.3.12-.08.18Q-.28-.38.12-.82Q.14-.3.38-.08Q.46-.34.4-.5Q.9.02.56.72Z"/>`,
    8: `<path d="M-.72.72V-.2L-.48-.42L-.24-.2V0H.24V-.2L.48-.42L.72-.2V.72Z"/><path d="M-.18.72V.28Q0 .06.18.28V.72Z" class="ill-door"/>`,
  };
  function roundel(cx, cy, r, cat) {
    const c = CATC[cat] || CATC[1];
    return `<circle cx="${f2(cx)}" cy="${f2(cy)}" r="${f2(r)}" fill="${c.m}" stroke="url(#ill-gold)" stroke-width="${f2(r * 0.16)}"/>` +
      `<g transform="translate(${f2(cx)} ${f2(cy)}) scale(${f2(r * 0.62)})" fill="url(#ill-goldu)" stroke="url(#ill-goldu)" stroke-width=".06">${EMB[cat] || EMB[1]}</g>`;
  }
  // klimopblad uit een getijdenboek: drie punten (twee lobben en een spitse top), met een inktrandje; gekleurde bladeren krijgen een witte nerf
  function ivy(x, y, deg, L, fill) {
    const p = (a, b) => `${f2(a * L)} ${f2(b * L)}`;
    const vein = fill.startsWith("url") ? `<path d="M0 0L${p(0, -0.62)}" class="ill-vein-g" fill="none"/>`
      : `<path d="M0 -.4L${p(0, -0.68)}M${p(-0.18, -0.45)}L0 ${f2(-0.3 * L)}L${p(0.18, -0.45)}" stroke="#fff" stroke-opacity=".8" stroke-width=".35" fill="none"/>`;
    return `<g transform="translate(${f2(x)} ${f2(y)}) rotate(${f2(deg + 90)})"><path class="ill-leaf" fill="${fill}" d="M0 0Q${p(-0.3, -0.04)} ${p(-0.52, -0.4)}Q${p(-0.32, -0.44)} ${p(-0.25, -0.57)}` +
      `Q${p(-0.12, -0.78)} 0 ${f2(-L)}Q${p(0.12, -0.78)} ${p(0.25, -0.57)}Q${p(0.32, -0.44)} ${p(0.52, -0.4)}Q${p(0.3, -0.04)} 0 0Z"/>${vein}</g>`;
  }
  // een haarrank die opkrult (logaritmisch naar binnen), met een gouden stipje (of een edelsteentje) aan een haartje
  function curl(px, py, vx, vy, s, sgn, gem) {
    const cxx = px + vx * 3 * s, cyy = py + vy * 3 * s, r0 = Math.hypot(px - cxx, py - cyy), f0 = Math.atan2(py - cyy, px - cxx), T = 1.75 * Math.PI;
    let d = `M${f2(px)} ${f2(py)}`, mid = null;
    for (let i = 1; i <= 22; i++) {
      const th = T * i / 22, r = r0 * (1 - 0.72 * th / T), x = cxx + r * Math.cos(f0 + sgn * th), y = cyy + r * Math.sin(f0 + sgn * th);
      d += `L${f2(x)} ${f2(y)}`;
      if (i === 8) mid = [x, y];
    }
    const ex = mid[0] + (mid[0] - cxx) * 0.9, ey = mid[1] + (mid[1] - cyy) * 0.9;
    const dot = gem ? `<circle cx="${f2(ex)}" cy="${f2(ey)}" r="${f2(1.15 * s)}" fill="${gem}" class="ill-dot"/><circle cx="${f2(ex - 0.35 * s)}" cy="${f2(ey - 0.35 * s)}" r="${f2(0.35 * s)}" fill="#fff" opacity=".85"/>`
      : `<circle cx="${f2(ex)}" cy="${f2(ey)}" r="${f2(0.95 * s)}" fill="url(#ill-gold)" class="ill-dot"/>`;
    return `<path d="${d}" class="ill-hair"/><path d="M${f2(mid[0])} ${f2(mid[1])}L${f2(ex)} ${f2(ey)}" class="ill-hair"/>` + dot;
  }
  // een rank van (x0,y0) naar (x1,y1); n = de normaal naar binnen; per golf twee bladeren in de holtes, daartussen een opgekrulde haarrank
  function vine(x0, y0, x1, y1, n, amp, s, R, start, o) {
    const dx = x1 - x0, dy = y1 - y0, len = Math.hypot(dx, dy);
    if (len < 4) return "";
    const ux = dx / len, uy = dy / len;
    const k = Math.max(1, Math.round(len / ((o.dense ? 24 : 30) * s)));
    const at = (t) => { const w = amp * Math.sin(2 * Math.PI * k * t); return [x0 + dx * t + n[0] * w, y0 + dy * t + n[1] * w]; };
    let d = "", leaves = "", hairs = "";
    const N = Math.ceil(len / 1.2);
    for (let i = 0; i <= N; i++) { const [x, y] = at(i / N); d += (i ? "L" : "M") + f2(x) + " " + f2(y); }
    const dirDeg = Math.atan2(uy, ux) * 180 / Math.PI;
    const second = o.c.s === "#e8dcc0" || o.c.s === "#24201a" ? GREEN : o.c.s;   // room en zwart zijn geen bladkleur
    const COLS = ["url(#ill-gold)", o.c.m, "url(#ill-gold)", second, "url(#ill-gold)", GREEN];
    for (let j = 0; j < 2 * k; j++) {
      const t = (j + 0.5) / (2 * k), sg = j % 2 ? -1 : 1, [x, y] = at(t);
      const out = Math.atan2(-n[1] * sg, -n[0] * sg) * 180 / Math.PI, diff = ((dirDeg - out + 540) % 360) - 180, deg = out + Math.sign(diff) * (30 + R() * 14);
      const L = (6.6 + R() * 1.2) * s * (sg > 0 ? 1 : 0.9), fill = COLS[(start + j) % COLS.length];
      const rad = deg * Math.PI / 180, bx = x + Math.cos(rad) * 1.1 * s, by = y + Math.sin(rad) * 1.1 * s;
      leaves += `<path d="M${f2(x)} ${f2(y)}L${f2(bx)} ${f2(by)}" class="ill-stem" stroke-width=".5"/>` + ivy(bx, by, deg, L, fill);
      const t2 = (j + 1) / (2 * k);
      if (t2 < 0.999) {
        const [qx, qy] = at(t2), side = sg, vx = -n[0] * side * 0.8 + ux * 0.6, vy = -n[1] * side * 0.8 + uy * 0.6;
        hairs += curl(qx, qy, vx, vy, s, (n[0] * uy - n[1] * ux) * side > 0 ? 1 : -1, o.gems && j % 2 ? [o.c.m, "#2c4c9c", GREEN][j % 3] : null);
      }
    }
    return `<path d="${d}" class="ill-stem" stroke-width=".8"/>` + hairs + leaves;
  }

  // ── een draak uit de marge (wyvern: lange staart die in een gouden blad eindigt, vleugel in de kleur van de categorie, open bek met tong).
  //    Naar rechts kijkend in een vak van ±65 × 22, grond op y = 21,4; de omtrek van het lijf komt uit een middenlijn met een dikte-verloop. ──
  function cRom(P, n) {
    const out = [];
    for (let i = 0; i < P.length - 1; i++) {
      const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
      for (let j = 0; j < n; j++) {
        const t = j / n, t2 = t * t, t3 = t2 * t;
        out.push([0, 1].map((a) => 0.5 * (2 * p1[a] + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t2 + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t3)));
      }
    }
    out.push(P[P.length - 1]);
    return out;
  }
  const DRAGON = (() => {
    const C = cRom([[3, 15], [9, 19.5], [16, 17.2], [22, 12.8], [30, 11.4], [37, 13.6], [42, 11.6], [45.2, 7], [49, 4.4], [53, 3.7]], 8);
    const w = (t) => (t < 0.18 ? 0.5 + (t / 0.18) * 1.8 : t < 0.5 ? 2.3 + ((t - 0.18) / 0.32) * 2.9 : t < 0.62 ? 5.2 : t < 0.86 ? 5.2 - ((t - 0.62) / 0.24) * 2.6 : 2.6 + ((t - 0.86) / 0.14) * 0.6);
    const L = [], R = [];
    C.forEach((p, i) => {
      const a = C[Math.max(0, i - 1)], b = C[Math.min(C.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const nx = -dy / d, ny = dx / d, h = w(i / (C.length - 1)) / 2;
      L.push([p[0] + nx * h, p[1] + ny * h]); R.push([p[0] - nx * h, p[1] - ny * h]);
    });
    const poly = [...L, ...R.reverse()].map((p, i) => (i ? "L" : "M") + f2(p[0]) + " " + f2(p[1])).join("") + "Z";
    const spots = C.filter((_, i) => i > C.length * 0.36 && i < C.length * 0.62 && i % 3 === 0).map((p) => `<circle cx="${f2(p[0])}" cy="${f2(p[1] - 0.9)}" r=".55" fill="url(#ill-gold)"/>`).join("");
    return { poly, spots };
  })();
  function dragon(x, y, k, flip, c) {
    const wing = c.m === GREEN ? c.s : c.m;
    return `<g transform="translate(${f2(x)} ${f2(y)}) scale(${f2(flip ? -k : k)} ${f2(k)})">` +
      `<path d="M36.4 10.6Q34 2.6 21.6-2.2Q23.8 1.6 24.2 3.2Q26.6 3.4 27.4 5.6Q29.8 5.8 30.4 8.2Q31.8 8.6 31.6 11.2Z" fill="${wing}" stroke="url(#ill-gold)" stroke-width=".7" stroke-linejoin="round"/>` +
      `<path d="M35 10.4L21.8-1.9M34.4 10.6L24.2 3.2M33.8 10.8L27.4 5.6M33.2 11L30.4 8.2" stroke="#f3d98a" stroke-width=".35" fill="none" opacity=".85"/>` +
      `<path d="M23.6 15.6L22.6 20.4M22.6 20.4L21 21.4M22.6 20.4L24.2 21.4M37.4 15.2L38.6 20M38.6 20L37.1 21.2M38.6 20L40.2 21" stroke="#2f6b2c" stroke-width="1.15" stroke-linecap="round" fill="none"/>` +
      `<path d="${DRAGON.poly}" fill="#4a8a3a" class="ill-dbody"/>` + DRAGON.spots + ivy(3, 15, 200, 5.6, "url(#ill-gold)") +
      `<path d="M56 4.6L63.6 5.2M63.6 5.2L64.9 4.3M63.6 5.2L64.9 6.1" stroke="#c0392b" stroke-width=".55" stroke-linecap="round" fill="none"/>` +
      `<path d="M52.4 2.2L49.6-.4L51.8 2.9Z" fill="url(#ill-gold)"/>` +
      `<path d="M51.6 1.9Q56 1 61 2.6L61.3 3.6L55.5 4ZM55.5 4L60 6.9Q56 6.8 52.6 5.7L52 4.4Z" fill="#4a8a3a" class="ill-dbody"/>` +
      `<circle cx="55.2" cy="2.85" r=".6" fill="#fff"/><circle cx="55.35" cy="2.85" r=".28" fill="#1a1208"/></g>`;
  }

  // ═══ db/243 (26/11/2026): twee stijlen erbij, op hun eigen trede van Kroniekschrijver: Glas-in-lood (tekenstand 8, brons, bewust kaal) en
  //     Ouroboros (9, diamant). Mockup: https://claude.ai/artifact/Wqj1T4w6JkWGgFaANgd6mz (daar heet Glas-in-lood B en Ouroboros C; A
  //     Schatbinding viel af: "anders te veel unlocks in hetzelfde thema"). Ze tekenen op het vlak binnen de rand (clientWidth). ═══
  const P = (x, y) => f2(x) + " " + f2(y);
  const second = (c) => (c.s === "#e8dcc0" || c.s === "#24201a" ? GREEN : c.s);   // room en zwart zijn geen glaskleur
  const hx = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hx(a), B = hx(b); return "#" + A.map((v, i) => Math.max(0, Math.min(255, Math.round(v + (B[i] - v) * t))).toString(16).padStart(2, "0")).join(""); };
  const tone = (c, t) => (t >= 0 ? mix(c, "#ffffff", t) : mix(c, "#000000", -t));
  function rr(x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    return `M${P(x + r, y)}H${f2(x + w - r)}A${f2(r)} ${f2(r)} 0 0 1 ${P(x + w, y + r)}V${f2(y + h - r)}A${f2(r)} ${f2(r)} 0 0 1 ${P(x + w - r, y + h)}` +
      `H${f2(x + r)}A${f2(r)} ${f2(r)} 0 0 1 ${P(x, y + h - r)}V${f2(y + r)}A${f2(r)} ${f2(r)} 0 0 1 ${P(x + r, y)}Z`;
  }
  const circ = (x, y, r) => `M${P(x - r, y)}a${f2(r)} ${f2(r)} 0 1 0 ${f2(2 * r)} 0a${f2(r)} ${f2(r)} 0 1 0 ${f2(-2 * r)} 0Z`;

  // ── Glas-in-lood (brons, de eenvoudige): de kaart is lood (CSS-achtergrond); daarop glas: een rand van lange stukken in de twee kleuren
  //    van de categorie en korte amberkleurige stukjes, een wit biesje, hoeken met een rondje, en een venster van licht glas met dunne ruitjes
  //    achter de tekst. Elk stuk glas heeft een iets andere tint, zoals oud glas. Bewust kaal: geen roosvenster, geen parels, geen beweging. ──
  function glass(W, H, seed, cat, hand) {
    const c = CATC[cat] || CATC[1], s2 = second(c), R = rng(seed), k = hand ? 1.3 : 1;
    const f = 11 * k, rad = hand ? 15 : 11, lw = 1.3 * k, fz = 7.4 * k, AMB = "#e3a437", WHT = "#ece8d5";
    const vr = (cl, a = 0.09) => tone(cl, (R() * 2 - 1) * a);
    const id = `jcg${Math.round(W)}x${Math.round(H)}${hand ? "h" : ""}`;   // zelfde maat = zelfde knipvorm, dus een dubbele id is onschuldig
    let fill = `<rect x="${f2(f)}" y="${f2(f)}" width="${f2(W - 2 * f)}" height="${f2(H - 2 * f)}" fill="url(#jd-gris)"/>`, lead = "";
    const rect = (xa, ya, xb, yb, cl) => {
      fill += `<rect x="${f2(Math.min(xa, xb))}" y="${f2(Math.min(ya, yb))}" width="${f2(Math.abs(xb - xa))}" height="${f2(Math.abs(yb - ya))}" fill="${cl}"/>`;
    };
    const line = (a, b) => `M${P(a[0], a[1])}L${P(b[0], b[1])}`;
    // de vier zijden: a loopt langs de zijde, b van de rand naar binnen
    const SIDES = [[f, W - f, (a, b) => [a, b]], [f, W - f, (a, b) => [a, H - b]], [f, H - f, (a, b) => [b, a]], [f, H - f, (a, b) => [W - b, a]]];
    const Ls = 4.8 * k, Lm = 13 * k;
    let li = 0;
    for (const [a0, a1, at] of SIDES) {
      const len = a1 - a0, n = Math.max(1, Math.round((len - Ls) / (Lm + Ls))), lm = (len - (n + 1) * Ls) / n;
      let a = a0;
      for (let i = 0; i < 2 * n + 1; i++) {
        const L = i % 2 ? lm : Ls, A = at(a, 0), B = at(a + L, fz);
        rect(A[0], A[1], B[0], B[1], i % 2 ? vr(li++ % 2 ? s2 : c.m) : vr(AMB, 0.06));
        if (i) lead += line(at(a, 0), at(a, fz));
        a += L;
      }
      const A = at(a0, fz), B = at(a1, f);
      rect(A[0], A[1], B[0], B[1], vr(WHT, 0.03));
      lead += line(at(a0, fz), at(a1, fz)) + line(at(a0, 0), at(a0, f)) + line(at(a1, 0), at(a1, f));
    }
    for (const [x, y] of [[0, 0], [W - f, 0], [0, H - f], [W - f, H - f]]) {
      rect(x, y, x + f, y + f, vr(tone(c.m, -0.22), 0.05));
      fill += `<path d="${circ(x + f / 2, y + f / 2, f * 0.26)}" fill="${vr(AMB, 0.05)}"/>`;
      lead += circ(x + f / 2, y + f / 2, f * 0.26);
    }
    lead += `M${P(f, f)}H${f2(W - f)}V${f2(H - f)}H${f2(f)}Z`;
    // ruitjes in het venster (licht lood): twee families schuine lijnen door het midden
    const px0 = f, py0 = f, pw = W - 2 * f, ph = H - 2 * f, gx = 22 * k, sl = 1.75;
    let lat = "";
    const clipSeg = (cc, sg) => {
      const yAt = (x) => py0 + ((x - cc) * sl) / sg;
      const y1 = yAt(px0), y2 = yAt(px0 + pw), ya = Math.max(py0, Math.min(y1, y2)), yb = Math.min(py0 + ph, Math.max(y1, y2));
      if (yb - ya < 1) return "";
      return line([cc + (sg * (ya - py0)) / sl, ya], [cc + (sg * (yb - py0)) / sl, yb]);
    };
    const c1 = px0 + pw / 2 - ph / 2 / sl, c2 = px0 + pw / 2 + ph / 2 / sl, span = Math.ceil((pw + ph / sl) / gx) + 1;
    for (let j = -span; j <= span; j++) lat += clipSeg(c1 + j * gx, 1) + clipSeg(c2 + j * gx, -1);
    const band = `${rr(0, 0, W, H, rad)}M${P(f, f)}V${f2(H - f)}H${f2(W - f)}V${f2(f)}Z`;
    return `<defs><clipPath id="${id}"><path d="${rr(0, 0, W, H, rad)}"/></clipPath></defs><g clip-path="url(#${id})">` + fill +
      `<path d="${lat}" fill="none" stroke="#8e998b" stroke-opacity=".5" stroke-width="${f2(0.7 * k)}"/>` +
      `<path d="${band}" fill="url(#jd-sun)" fill-rule="evenodd"/><path d="${band}" fill="url(#jd-seeds)" fill-rule="evenodd"/>` +
      `<path d="${lead}" fill="none" stroke="#2a2730" stroke-width="${f2(lw)}" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="${lead}" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="${f2(lw * 0.32)}" transform="translate(-.3 -.3)"/></g>`;
  }

  // ── Ouroboros (diamant): een draak ligt rond de kaart en bijt onderaan in zijn eigen staart, het oude teken van de tijd die rondgaat. Groen
  //    lijf met schubben, een gouden buik aan de buitenkant en kleine stekels aan de binnenkant; de kop zit van opzij bovenop (gouden horens,
  //    oog, tanden in de staart). Kraag en vleugel in de hoofdkleur van de categorie, zoals de vleugel van de Draken. ──
  function ouro(W, H, seed, cat, hand) {
    const c = CATC[cat] || CATC[1], k = hand ? 1.28 : 1, BODY = "#4c8a3b", INK = "#22170b";
    const T = 9 * k, i0 = T / 2 + 1.3 * k, rad = hand ? 15 : 11;
    const x0 = i0, y0 = i0, x1 = W - i0, y1 = H - i0, r = Math.max(4 * k, rad - i0 + 3 * k);
    const hu = 1.5 * T, xn = W / 2 + 0.7 * hu, xt = xn - 1.32 * hu, hy = y1 - 0.12 * hu;   // eenheid van de kop; nek; staartpunt (in de bek); kop-as
    const S = [
      ["L", xn, y1, x1 - r, y1], ["A", x1 - r, y1 - r, Math.PI / 2, 0], ["L", x1, y1 - r, x1, y0 + r], ["A", x1 - r, y0 + r, 0, -Math.PI / 2],
      ["L", x1 - r, y0, x0 + r, y0], ["A", x0 + r, y0 + r, -Math.PI / 2, -Math.PI], ["L", x0, y0 + r, x0, y1 - r], ["A", x0 + r, y1 - r, -Math.PI, -1.5 * Math.PI],
      ["L", x0 + r, y1, xt, y1],
    ];
    const lenOf = (s) => (s[0] === "L" ? Math.hypot(s[3] - s[1], s[4] - s[2]) : Math.abs(s[4] - s[3]) * r);
    const total = S.reduce((a, s) => a + lenOf(s), 0);
    const pts = [];
    let acc = 0;
    for (const s of S) {
      const L = lenOf(s), n = Math.max(1, Math.ceil(L / (s[0] === "L" ? 5 : 1.6)));
      for (let j = 0; j < n; j++) {
        const t = j / n;
        let x, y, tx, ty;
        if (s[0] === "L") { x = s[1] + (s[3] - s[1]) * t; y = s[2] + (s[4] - s[2]) * t; tx = (s[3] - s[1]) / L; ty = (s[4] - s[2]) / L; }
        else { const a = s[3] + (s[4] - s[3]) * t, dir = Math.sign(s[4] - s[3]); x = s[1] + r * Math.cos(a); y = s[2] + r * Math.sin(a); tx = -Math.sin(a) * dir; ty = Math.cos(a) * dir; }
        pts.push([x, y, ty, -tx, acc + L * t]);   // de normaal (ty, -tx) wijst naar binnen
      }
      acc += L;
    }
    pts.push([xt, y1, 0, -1, total]);
    const sm = (t) => t * t * (3 - 2 * t);
    const wOf = (s) => { const u = s / total; return T * (u < 0.05 ? 0.8 + 4 * u : u < 0.45 ? 1 : 1 - 0.68 * sm((u - 0.45) / 0.55)); };
    const Lp = [], Rp = [];
    for (const [x, y, nx, ny, s] of pts) { const h = wOf(s) / 2; Lp.push([x + nx * h, y + ny * h]); Rp.push([x - nx * h, y - ny * h]); }
    const body = "M" + Lp.map((p) => P(p[0], p[1])).join("L") + "Q" + P(xt - 0.9 * k, y1) + " " + P(...Rp[Rp.length - 1]) + "L" + Rp.reverse().map((p) => P(p[0], p[1])).join("L") + "Z";
    // een punt op de middellijn bij booglengte s (lineair tussen de monsters), met de normaal naar binnen
    const at = (sx) => {
      let lo = 0, hi = pts.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (pts[mid][4] <= sx) lo = mid; else hi = mid; }
      const a = pts[lo], b = pts[hi], t = b[4] > a[4] ? (sx - a[4]) / (b[4] - a[4]) : 0;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2], a[3]];
    };
    const off = (sx, f) => { const [x, y, nx, ny] = at(sx), d = wOf(sx) * f; return [x + nx * d, y + ny * d]; };
    // de rug ligt binnen (dan klopt hij met de kop, die rechtop staat): kleine gouden stekels naar binnen, naar de staart gestreken
    let spk = "";
    for (let sx = 0.03 * total; sx < 0.84 * total; sx += 4.3 * k) {
      const a = off(sx - 1.1 * k, 0.48), b = off(sx + 1.1 * k, 0.48), [x, y, nx, ny] = at(sx + 1.1 * k), hh = wOf(sx) * 0.5 + 1.4 * k * (wOf(sx) / T);
      spk += `M${P(...a)}L${P(x + nx * hh, y + ny * hh)}L${P(...b)}Z`;
    }
    // de buik ligt buiten: goud met dwarse schubben, een gouden rand om de kaart
    const bo = [], bi = [];
    for (const p of pts) { const w = wOf(p[4]); bo.push([p[0] - p[2] * w * 0.5, p[1] - p[3] * w * 0.5]); bi.push([p[0] - p[2] * w * 0.06, p[1] - p[3] * w * 0.06]); }
    const belly = "M" + bo.map((p) => P(p[0], p[1])).join("L") + "L" + bi.reverse().map((p) => P(p[0], p[1])).join("L") + "Z";
    const along = (u0, u1, f) => "M" + pts.filter((p) => p[4] >= u0 * total && p[4] <= u1 * total).map((p) => P(...off(p[4], f))).join("L");
    let g = `<path d="${spk}" fill="url(#ill-gold)" stroke="${INK}" stroke-width="${f2(0.35 * k)}" stroke-linejoin="round"/>`;
    g += `<path d="${body}" fill="${BODY}" stroke="${INK}" stroke-width="${f2(0.6 * k)}" stroke-linejoin="round"/>`;
    g += `<path d="${body}" fill="url(#jd-scale)"/>`;
    g += `<path d="${belly}" fill="url(#jd-belly)" stroke="${INK}" stroke-width="${f2(0.35 * k)}" stroke-opacity=".6"/>`;
    g += `<path d="${along(0.02, 0.5, -0.28)}" fill="none" stroke="#7a4e12" stroke-opacity=".75" stroke-width="${f2(T * 0.4)}" stroke-dasharray="${f2(0.5 * k)} ${f2(1.7 * k)}"/>`;
    // de glans die van staart naar kop loopt (bewegend, zie .jd-c-run in de CSS: alleen in je hand en op de kaart die je net legt)
    const runD = "M" + pts.slice().reverse().map((p) => P(p[0], p[1])).join("L");
    g += `<path d="${runD}" pathLength="100" class="jd-c-run glow" stroke-width="${f2(T * 1.25)}" stroke-dasharray="6 200"/>`;
    g += `<path d="${runD}" pathLength="100" class="jd-c-run" stroke-width="${f2(T * 0.42)}" stroke-dasharray="4 200"/>`;
    // de kop in eigen eenheden: x = vooruit (naar links op het scherm), y = omhoog; scale(-hu) draait dat om
    const sw = (px) => f2(px / hu);
    let h = `<g transform="translate(${P(xn, hy)}) scale(${f2(-hu)})">`;
    h += `<path d="M-.42.24Q-.56.82-.86 1.02Q-1.42 1.2-2.02 1.02Q-1.76.8-1.64.6Q-1.47.63-1.32.46Q-1.13.41-1.08.24Z" fill="${c.m}" stroke="url(#ill-gold)" stroke-width="${sw(0.75 * k)}" stroke-linejoin="round"/>`;
    h += `<path d="M-.86 1.02L-1.64.6M-.86 1.02L-1.32.46" stroke="#f3d98a" stroke-width="${sw(0.5 * k)}" fill="none" stroke-linecap="round"/>`;
    h += `<path d="M.5.62Q.18.78-.36.9Q.1.64.34.56Z" fill="url(#ill-gold)" stroke="${INK}" stroke-width="${sw(0.35 * k)}" stroke-linejoin="round"/>`;
    const HEAD = "M-.35.25Q.05.32.25.55Q.42.74.66.75Q.92.76 1.08.62Q1.3.48 1.62.44Q1.9.42 1.97.16Q1.99.03 1.84.04L1 .02L1.5-.27Q1.74-.36 1.75-.47Q1.72-.57 1.5-.57Q1-.55.55-.45Q.1-.36-.35-.25";
    h += `<path d="${HEAD}Z" fill="${BODY}"/><path d="${HEAD}Z" fill="url(#jd-cab)" opacity=".3"/>`;
    h += `<path d="${HEAD}" fill="none" stroke="${INK}" stroke-width="${sw(0.65 * k)}" stroke-linejoin="round"/>`;   // zonder de achterkant: die loopt over in de nek
    // de kraag achter de kop (kleur van de categorie) dekt de overgang naar de nek
    h += `<path d="M.32.44L-.28.66L.02.31L-.46.3L-.03.1L-.5-.06L-.03-.13L-.32-.38L.28-.42Q.45 0 .32.44Z" fill="${c.m}" stroke="url(#ill-gold)" stroke-width="${sw(0.5 * k)}" stroke-linejoin="round"/>`;
    h += `<path d="M.8.72Q.35.98-.26 1.16Q.28.8.56.66Z" fill="url(#ill-gold)" stroke="${INK}" stroke-width="${sw(0.4 * k)}" stroke-linejoin="round"/>`;
    h += `<path d="M1.64.04L1.76.04L1.7-.08ZM1.42.04L1.54.04L1.48-.08ZM1.2.03L1.32.03L1.26-.08ZM1.2-.1L1.3-.15L1.3-.03ZM1.36-.19L1.46-.25L1.46-.12Z" fill="#fffaf0" stroke="${INK}" stroke-width="${sw(0.25 * k)}" stroke-linejoin="round"/>`;
    h += `<ellipse cx="1.12" cy=".47" rx=".14" ry=".08" transform="rotate(-12 1.12 .47)" fill="#f6d36b" stroke="${INK}" stroke-width="${sw(0.35 * k)}"/>`;
    h += `<ellipse cx="1.13" cy=".47" rx=".025" ry=".07" fill="${INK}"/>`;
    h += `<path d="M.9.62Q1.1.71 1.31.56" fill="none" stroke="${INK}" stroke-width="${sw(0.7 * k)}" stroke-linecap="round"/>`;
    h += `<path d="M1.77.33Q1.82.37 1.85.3" fill="none" stroke="${INK}" stroke-width="${sw(0.55 * k)}" stroke-linecap="round"/></g>`;
    return g + h;
  }

  // ── de rand op de echte maat van de kaart (W × H css-px); m = breedte van de rand, lv = tekenstand (3, 5 of 6), hand = de kaart in je hand ──
  function svg(W, H, m, seed, lv, cat, hand) {
    if (lv >= 8) return `<svg class="tl-ills" viewBox="0 0 ${f2(W)} ${f2(H)}" aria-hidden="true" focusable="false">${(lv === 8 ? glass : ouro)(W, H, seed, cat, hand)}</svg>`;
    const s = m / 12.5, R = rng(seed), c = CATC[cat] || CATC[1], o = { c, dense: lv >= 4, gems: lv >= 5 };
    const bx = 2.6 * s, bw = 3.4 * s, rr = 2.6 * s, y0 = m * 0.75, y1 = H - m * 0.75, cx = bx + bw / 2, cr = m * 0.55;
    let g = "";
    g += vine(cx + rr + 0.5 * s, m * 0.5, W - cr - 3.4 * s, m * 0.5, [0, 1], 2.1 * s, s, R, 0, o);
    // onderaan: een rank, of vanaf Draken twee draken die elkaar aankijken (in je hand naast de ????, ze bewaken het jaar)
    const dk = (hand ? 0.6 : 0.73) * s, dw = 65 * dk, gy = H - 2.6 * s - 21.4 * dk;
    if (lv >= 5) {
      if (hand) g += dragon(cx + rr + 1.5 * s, gy, dk, false, c) + dragon(W - m * 1.05, gy, dk, true, c);
      else g += dragon(W / 2 - 1.5 * s - dw, gy, dk, false, c) + dragon(W / 2 + 1.5 * s + dw, gy, dk, true, c);
    } else g += vine(cx + rr + 0.5 * s, H - m * 0.5, W - cr - 3.4 * s, H - m * 0.5, [0, -1], 2.1 * s, s, R, 3, o);
    g += vine(W - m * 0.5, cr + 3.4 * s, W - m * 0.5, H - cr - 3.4 * s, [-1, 0], 2.1 * s, s, R, 1, o);
    // de balk: vakjes in de twee kleuren van de categorie, met wit lijnwerk en goud
    const n = Math.max(2, Math.round((y1 - y0) / (15 * s))), h = (y1 - y0) / n;
    for (let i = 0; i < n; i++) {
      const ya = y0 + i * h;
      g += `<rect x="${f2(bx)}" y="${f2(ya)}" width="${f2(bw)}" height="${f2(h)}" fill="${i % 2 ? c.s : c.m}"/>`;
      let wz = `M${f2(cx)} ${f2(ya + 1.5 * s)}`;
      for (let q = 1; q <= 4; q++) wz += `L${f2(cx + (q % 2 ? 0.8 : -0.8) * s)} ${f2(ya + 1.5 * s + q * (h - 3 * s) / 4)}`;
      g += `<path d="${wz}" stroke="${i % 2 && c.s === "#e8dcc0" ? c.m : "#fff"}" stroke-width=".35" fill="none" stroke-opacity=".85"/>`;
      if (i) g += `<rect x="${f2(bx - 0.4)}" y="${f2(ya - 0.6 * s)}" width="${f2(bw + 0.8)}" height="${f2(1.2 * s)}" fill="url(#ill-gold)"/>`;
    }
    g += `<rect x="${f2(bx)}" y="${f2(y0)}" width="${f2(bw)}" height="${f2(y1 - y0)}" fill="none" stroke="url(#ill-gold)" stroke-width=".8"/>`;
    if (lv >= 5) for (let yy = y0 + 4 * s; yy < y1 - 2 * s; yy += 4 * s) g += `<circle cx="${f2(bx + bw + 1.1 * s)}" cy="${f2(yy)}" r="${f2(0.55 * s)}" fill="#f4efe4" class="ill-dot"/>`;
    // gouden knopjes op de balkeinden, en midden op de balk een medaillon met het embleem van de categorie
    g += `<circle cx="${f2(cx)}" cy="${f2(y0 - 1.2 * s)}" r="${f2(2 * s)}" fill="url(#ill-gold)" class="ill-dot"/><circle cx="${f2(cx)}" cy="${f2(y1 + 1.2 * s)}" r="${f2(2 * s)}" fill="url(#ill-gold)" class="ill-dot"/>`;
    g += roundel(cx + 0.6 * s, (y0 + y1) / 2, 6.4 * s, cat);
    if (lv >= 4) {
      const flower = (x, y) => {
        let f = "";
        for (let k = 0; k < 5; k++) f += `<ellipse cx="${f2(x)}" cy="${f2(y - 1.5 * s)}" rx="${f2(1.1 * s)}" ry="${f2(1.6 * s)}" fill="${c.m}" transform="rotate(${k * 72} ${f2(x)} ${f2(y)})"/>`;
        return f + `<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(1.05 * s)}" fill="url(#ill-gold)"/>`;
      };
      g += flower(W - cr - 0.6 * s, cr + 0.4 * s) + (lv >= 5 && !hand ? "" : flower(W - cr - 0.6 * s, H - cr - 0.4 * s));
    }
    return `<svg class="tl-ills" viewBox="0 0 ${f2(W)} ${f2(H)}" aria-hidden="true" focusable="false">${g}</svg>`;
  }

  // ── de verguldsel-gradiënten (één keer in de pagina), de CSS en het lettertype van de beginletter ──
  const DEFS = `<svg id="jc-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden"><defs>` +
    `<linearGradient id="ill-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe9a6"/><stop offset=".45" stop-color="#dcab42"/><stop offset="1" stop-color="#97661a"/></linearGradient>` +
    `<linearGradient id="ill-goldu" gradientUnits="userSpaceOnUse" x1="-1" y1="-1" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".5" stop-color="#e2b24a"/><stop offset="1" stop-color="#a87420"/></linearGradient>` +
    // db/243: glans op de kop van de Ouroboros, het lichte glas achter de tekst, licht en belletjes op het gekleurde glas, schubben en buik van de draak
    `<radialGradient id="jd-cab" cx=".36" cy=".3" r=".78"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".32" stop-color="#fff" stop-opacity=".1"/>` +
    `<stop offset=".68" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></radialGradient>` +
    `<linearGradient id="jd-gris" x1="0" y1="0" x2=".3" y2="1"><stop offset="0" stop-color="#f7f9f3"/><stop offset="1" stop-color="#e2e8de"/></linearGradient>` +
    `<linearGradient id="jd-sun" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".42" stop-color="#fff" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>` +
    `<linearGradient id="jd-belly" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e3a0"/><stop offset=".5" stop-color="#e2b955"/><stop offset="1" stop-color="#b8862e"/></linearGradient>` +
    `<pattern id="jd-seeds" width="17" height="13" patternUnits="userSpaceOnUse"><g fill="#fff" fill-opacity=".32"><circle cx="3" cy="2.5" r=".45"/><circle cx="11.5" cy="5" r=".35"/>` +
    `<circle cx="7" cy="10" r=".5"/><circle cx="15" cy="11.5" r=".3"/></g><path d="M1 7.5l3.2-1.6M9 2l2.6-1.3M12 10.5l3-1.5" stroke="#fff" stroke-opacity=".16" stroke-width=".7" stroke-linecap="round"/></pattern>` +
    `<pattern id="jd-scale" width="3.4" height="2.8" patternUnits="userSpaceOnUse"><path d="M0 2.8A1.7 1.7 0 0 1 3.4 2.8M-1.7 1.4A1.7 1.7 0 0 1 1.7 1.4M1.7 1.4A1.7 1.7 0 0 1 5.1 1.4" ` +
    `fill="none" stroke="#000" stroke-opacity=".32" stroke-width=".45"/></pattern></defs></svg>`;
  const CSS = String.raw`/* ═══ 🃏 verluchte Timeline-kaarten (/timeline-ill.js) ═══ */
@font-face { font-family: "JaardleIni"; src: url("/fonts/jaardle-ini.woff2") format("woff2"); font-display: swap; }
/* perkament in beide thema's (een kaart is een ding op tafel), in donker iets gedempter; alleen Zwarte getijden (lv 6) is zwart.
   :is(.tl-c, .tl-card).tl-ill weegt zwaarder dan .tl-c/.tl-card van timeline.js, dus het maakt niet uit welk bestand het eerst laadt. */
:is(.tl-c, .tl-card).tl-ill { --fg: #2b2016; --muted: #6e5b40; --ill-ink: #3d2b18; --ill-line: #3d2b18; --red-text: #b3261e; color: var(--fg);
  background: radial-gradient(120% 90% at 50% 40%, #efe1bd 0%, #e3d0a2 62%, #cfb783 100%); border-color: #9c8550; }
html:is([data-theme="light"], [data-theme="parchment"]) :is(.tl-c, .tl-card).tl-ill { background: radial-gradient(120% 90% at 50% 40%, #fcf5e0 0%, #f4e7c4 62%, #e8d4a2 100%); border-color: #cdb47a; }
html :is(.tl-c, .tl-card).tl-ill[data-jc="6"] { --fg: #f1e6cc; --muted: #b9a888; --ill-ink: #d4af5c; --ill-line: #0d0a06; --red-text: #ff8a80;
  background: radial-gradient(120% 90% at 50% 35%, #2a2216 0%, #120e08 70%, #070503 100%); border-color: #8a6a2c; }
.tl-ill .ill-stem { fill: none; stroke: var(--ill-ink); stroke-linecap: round; }
.tl-ill .ill-hair { fill: none; stroke: var(--ill-ink); stroke-width: 0.4; stroke-linecap: round; }
.tl-ill .ill-leaf { stroke: var(--ill-line); stroke-width: 0.4; stroke-linejoin: round; }
.tl-ill .ill-vein-g { stroke: #8a5a12; stroke-width: 0.35; stroke-opacity: 0.7; }
.tl-ill .ill-dot { stroke: var(--ill-line); stroke-width: 0.25; }
.tl-ill .ill-dbody { stroke: var(--ill-line); stroke-width: 0.55; stroke-linejoin: round; }
.tl-ill .ill-door { fill: #1a1208; stroke: none; }
.tl-ill > .tl-ills { position: absolute; inset: 0; z-index: -1; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
/* tafelkaarten iets breder (7,6 → 8,1rem): de rand kost tekstruimte, en een feit moet heel leesbaar blijven */
.tl-c.tl-ill { width: 8.1rem; padding: 0.95rem 0.9rem 0.9rem 0.95rem; }
.tl-c.tl-ill:is([data-jc="5"], [data-jc="6"]) { padding-bottom: 1.3rem; }
.tl-c.tl-ill .tl-s { top: 0.9rem; right: 0.95rem; }
.tl-c.tl-ill :is(.tl-x, .tl-v) { top: 0.75rem; right: 0.75rem; }
.tl-ill-on .tl-slot.tl-open { width: 8.4rem; }
.tl-card.tl-ill { padding: 1.25rem 1.35rem 1.2rem 1.15rem; }
.tl-card.tl-ill .tl-q { border-color: color-mix(in srgb, var(--ill-ink) 70%, transparent); color: var(--muted); }
/* Draken en Zwarte getijden: de rand van de kaart zelf is goud; Zwarte getijden met een gouden jaartal en een gouden gloed */
.tl-ill:is([data-jc="5"], [data-jc="6"]) { border: 1.5px solid #c9973a; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.35), 0 7px 14px -9px rgba(0, 0, 0, 0.6); }
.tl-ill[data-jc="6"] { box-shadow: 0 0 0 1px #c9973a, 0 0 12px 1px rgba(212, 175, 92, 0.35), 0 7px 14px -9px rgba(0, 0, 0, 0.6); }
.tl-ill[data-jc="6"]:not(.tl-bad) .tl-y { color: #f0cf72; text-shadow: 0 1px 0 #3a2606; }   /* fout gelegd: het jaartal blijft rood */
/* de versierde beginletter: goud op een vlak in de twee kleuren van de categorie (--ill-m/--ill-s staan op de kaart) */
.tl-ill .ill-ini { float: left; display: grid; place-items: center; width: 1.12em; height: 1.12em; margin: 0.08em 0.14em 0 0;
  font-family: "JaardleIni", "UnifrakturMaguntia", serif; font-size: 1.9em; font-weight: 400; line-height: 1; color: #f7da7e; text-shadow: 0 1px 0 #4a2f08;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.6) 0.45px, transparent 0.9px) 0 0 / 3.5px 3.5px, linear-gradient(135deg, var(--ill-m) 50%, var(--ill-s) 50%);
  border: 1px solid #c9973a; border-radius: 1px; box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.25); }
.tl-card.tl-ill .ill-ini { font-size: 2em; }
/* ── db/243: Glas-in-lood (data-jc 8, brons) en Ouroboros (9, diamant). Ze tekenen op het vlak binnen de rand; de rand is ±10 px. ── */
.tl-c.tl-ill:is([data-jc="8"], [data-jc="9"]) { padding: 0.9rem 0.85rem 0.9rem 0.9rem; }
.tl-c.tl-ill:is([data-jc="8"], [data-jc="9"]) .tl-s { top: 0.85rem; right: 0.85rem; }
.tl-c.tl-ill[data-jc="9"] { padding-bottom: 1.5rem; }   /* de kop van de draak onderaan */
.tl-card.tl-ill:is([data-jc="8"], [data-jc="9"]) { padding: 1.2rem 1.3rem 1.25rem 1.2rem; }
.tl-card.tl-ill[data-jc="9"] { padding-bottom: 2.05rem; }
/* Glas-in-lood: de kaart zelf is lood; donkere tekst op het lichte glas, in beide thema's */
html :is(.tl-c, .tl-card).tl-ill[data-jc="8"] { --fg: #1d1b17; --muted: #55524a; --ill-ink: #3d2b18; --ill-line: #2a2730; --red-text: #b3261e; color: var(--fg);
  background: #2a2730; border: 1px solid #141217; box-shadow: 0 7px 14px -9px rgba(0, 0, 0, 0.6); }
/* Ouroboros: het perkament van het Getijdenboek, met een donker gouden randje */
:is(.tl-c, .tl-card).tl-ill[data-jc="9"] { border: 1px solid #8a6a2c; box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2), 0 7px 14px -9px rgba(0, 0, 0, 0.6); }
/* de glans van de Ouroboros loopt van de staart rond de kaart naar de kop: in je hand af en toe, op de kaart die je net goed legt één keer.
   De tafel staat stil. De vertraging telt --el mee (timeline.js tekent na een zet opnieuw; zo loopt de glans door i.p.v. opnieuw te beginnen). */
.tl-ill .jd-c-run { fill: none; stroke: #fffdf2; stroke-linecap: round; opacity: 0; }
.tl-ill .jd-c-run.glow { stroke: #ffe38a; stroke-opacity: 0.45; }
.tl-card.tl-ill[data-jc="9"] .jd-c-run { animation: jc-run-loop 7s cubic-bezier(0.45, 0.05, 0.4, 1) 1s infinite; }
.tl-c.tl-reveal.tl-good.tl-ill[data-jc="9"] .jd-c-run { animation: jc-run 1.5s cubic-bezier(0.45, 0.05, 0.4, 1) both; animation-delay: calc(0.4s - var(--el, 0ms)); }
@keyframes jc-run { 0% { opacity: 1; stroke-dashoffset: 8; } 94% { opacity: 1; } 100% { opacity: 0; stroke-dashoffset: -100; } }
@keyframes jc-run-loop { 0% { opacity: 1; stroke-dashoffset: 8; } 26% { opacity: 1; stroke-dashoffset: -100; } 27%, 100% { opacity: 0; stroke-dashoffset: -100; } }
@media (prefers-reduced-motion: reduce) { .tl-ill .jd-c-run { animation: none !important; } }
/* buiten Timeline (de kluis, de pop-up): de basismaten van een kaart, zodat het voorbeeld niet van timeline.js afhangt; tekst = grijze balkjes */
.jc-prev, .jc-hero { text-align: left; font-size: 16px; line-height: 1.5; }
.jc-prev .tl-c { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 0.3rem; width: 8.1rem; height: 12.4rem; box-sizing: border-box;
  padding: 0.6rem 0.65rem; border: 1px solid; border-radius: 12px; box-shadow: 0 6px 14px -9px rgba(0, 0, 0, 0.55); }
/* de gewone kaart: het karton uit style.css ("Timeline-karton"), met zijn binnenlijn, zoals in /timeline.js */
.jc-prev .tl-c:not(.tl-ill) { background: var(--tl-sheen), var(--tl-paper); color: var(--fg); border-color: var(--tl-edge); }
.jc-prev .tl-c:not(.tl-ill)::after { content: ""; position: absolute; inset: 3px; border: 1px solid var(--tl-line); border-radius: 8px; pointer-events: none; }
.jc-prev .tl-y { font-size: 1.45rem; font-weight: 800; line-height: 1.05; font-variant-numeric: tabular-nums; }
.jc-prev .tl-s { position: absolute; top: 0.45rem; right: 0.45rem; font-size: 1.05rem; line-height: 1; }
.jc-prev .tl-t { display: block; font-size: 0.78rem; line-height: 1.3; }
.jc-sk { display: block; height: 0.42em; margin: 0.42em 0; border-radius: 3px; background: color-mix(in srgb, var(--fg) 22%, transparent); }
.jc-sk.s1 { width: 58%; } .jc-sk.s2 { width: 86%; } .jc-sk.s3 { width: 72%; } .jc-sk.s4 { width: 80%; } .jc-sk.s5 { width: 44%; }
.jc-sk-cat { display: inline-block; width: 4.2em; height: 0.5em; margin: 0; vertical-align: middle; }
.jc-hero .tl-handin { position: relative; width: 15rem; height: 13.4rem; isolation: isolate; }
.jc-hero .tl-back { position: absolute; inset: 0; z-index: -1; border-radius: 16px; border: 6px solid var(--tl-paper); background-color: var(--tl-back);
  background-image: var(--tl-lattice); box-shadow: inset 0 0 0 3px var(--tl-back), inset 0 0 0 4px var(--tl-bline), 0 0 0 1px var(--tl-edge), 0 8px 20px rgba(0, 0, 0, 0.4); }
.jc-hero .tl-back.b1 { transform: translate(9px, 5px) rotate(4deg); }
.jc-hero .tl-back.b2 { transform: translate(17px, 10px) rotate(8deg); }
.jc-hero .tl-card { position: relative; display: flex; flex-direction: column; gap: 0.55rem; height: 100%; box-sizing: border-box; border: 1px solid; border-radius: 16px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4); transform: rotate(-1.5deg); }
.jc-hero .tl-suit { display: flex; align-items: center; gap: 0.4rem; font-size: 0.68rem; color: var(--muted); }
.jc-hero .tl-suit i { font-style: normal; font-size: 1.3rem; }
.jc-hero .tl-txt { flex: 1; margin: 0; font-size: 1.05rem; line-height: 1.32; }
.jc-hero .tl-q { align-self: center; padding: 0.2rem 0.85rem 0.2rem 1.1rem; border-radius: 999px; border: 1.5px dashed; font-weight: 800; letter-spacing: 0.3em; }
`;
  let ready = false;
  function inject() {
    if (ready) return;
    ready = true;
    const st = document.createElement("style");
    st.id = "jc-css";
    st.textContent = CSS;
    document.head.appendChild(st);
    if (!document.getElementById("jc-defs")) document.body.insertAdjacentHTML("beforeend", DEFS);
  }

  // ── voor timeline.js: de attributen en de tekst van een verluchte kaart, en het tekenen na elke draw ──
  const lvOf = (style) => LV[style] || 0;   // 0 = gewoon
  const pig = (cat) => { const c = CATC[cat] || CATC[1]; return `--ill-m:${c.m};--ill-s:${c.s}`; };
  // seed = de sleutel van de kaart (elke kaart zijn eigen ranken, steeds dezelfde)
  const attrs = (seed, cat, lv) => ` data-jc="${lv}" data-jcs="${Math.abs(Math.round(seed)) || 1}" data-jcc="${cat || 1}" style="${pig(cat)}"`;
  // de beginletter alleen bij een letter die het lettertype kent (een feit dat met een aanhalingsteken of cijfer begint: gewoon)
  const INI = /^[A-Za-zÀ-ÖØ-öø-ÿŒœ]$/;
  function text(t, lv) {
    const s = String(t || ""), ch = [...s][0] || "";
    if (!lv || NOINI.has(lv) || !INI.test(ch)) return esc(s);
    return `<span class="ill-ini">${esc(ch)}</span>${esc(s.slice(ch.length))}`;
  }
  const cache = new Map();   // getekende randen op sleutel (maat + stand + kaart): bij elke draw van timeline.js zelfde string, geen rekenwerk
  // keep = de randen van vóór de draw (harvest), op sleutel: die verhuizen naar de nieuwe kaarten i.p.v. opnieuw ontleed te worden
  function harvest(root) {
    const keep = new Map();
    root.querySelectorAll(".tl-ill > .tl-ills[data-k]").forEach((el) => keep.set(el.dataset.k, el));
    return keep;
  }
  function paint(root, keep) {
    inject();
    root.querySelectorAll("[data-jc]").forEach((el) => {
      const lv = +el.dataset.jc, nw = lv >= 8;   // db/243: de nieuwe stijlen tekenen op het vlak binnen de rand
      const W = (nw && el.clientWidth) || el.offsetWidth, H = (nw && el.clientHeight) || el.offsetHeight;
      if (!W || !H) return;
      const hand = el.classList.contains("tl-card"), seed = +el.dataset.jcs, cat = +el.dataset.jcc;
      const key = `${lv}|${seed}|${cat}|${W}|${H}|${hand ? 1 : 0}`;
      const cur = el.querySelector(":scope > .tl-ills");
      if (cur && cur.dataset.k === key) return;
      if (cur) cur.remove();
      const old = keep && keep.get(key);
      if (old) { keep.delete(key); el.prepend(old); return; }
      let html = cache.get(key);
      if (!html) {
        html = svg(W, H, hand ? 17 : 12.5, seed, lv, cat, hand).replace("<svg ", `<svg data-k="${key}" `);
        if (cache.size > 400) cache.clear();
        cache.set(key, html);
      }
      el.insertAdjacentHTML("afterbegin", html);
    });
  }

  // ── voor game.js: een voorbeeldkaart (kluis) en je hand (de beloning-pop-up), zonder tekst om te vertalen ──
  const SK = (n) => [1, 2, 3, 4, 5].slice(0, n).map((i) => `<i class="jc-sk s${i}"></i>`).join("");
  function preview(style, cat = 1, suit = "⚔️", seed = 1429) {
    const lv = lvOf(style);
    return `<div class="jc-prev"><div class="tl-c${lv ? " tl-ill" : ""}"${lv ? attrs(seed, cat, lv) : ""}><span class="tl-y">1429</span>` +
      `<span class="tl-s" aria-hidden="true">${esc(suit)}</span><span class="tl-t">${lv && !NOINI.has(lv) ? `<span class="ill-ini">B</span>` : ""}${SK(5)}</span></div></div>`;
  }
  function hero(style, cat = 1, suit = "⚔️") {
    const lv = lvOf(style) || 3;
    return `<div class="jc-hero"><div class="tl-handin"><div class="tl-back b2"></div><div class="tl-back b1"></div>` +
      `<div class="tl-card tl-ill"${attrs(1429, cat, lv)}><div class="tl-suit"><i aria-hidden="true">${esc(suit)}</i><i class="jc-sk jc-sk-cat"></i></div>` +
      `<p class="tl-txt">${NOINI.has(lv) ? "" : `<span class="ill-ini">B</span>`}${SK(4)}</p><span class="tl-q" aria-hidden="true">????</span></div></div></div>`;
  }

  return { lvOf, attrs, text, harvest, paint, preview, hero, inject, svg };
})();
