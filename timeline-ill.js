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
  const LV = { book: 3, dragons: 5, black: 6 };   // de tekenstand per stijl (3 = volle lijst + gouden beginletter, 5 = + draken, 6 = zwart)
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

  // ── de rand op de echte maat van de kaart (W × H css-px); m = breedte van de rand, lv = tekenstand (3, 5 of 6), hand = de kaart in je hand ──
  function svg(W, H, m, seed, lv, cat, hand) {
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
    `<linearGradient id="ill-goldu" gradientUnits="userSpaceOnUse" x1="-1" y1="-1" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".5" stop-color="#e2b24a"/><stop offset="1" stop-color="#a87420"/></linearGradient></defs></svg>`;
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
/* buiten Timeline (de kluis, de pop-up): de basismaten van een kaart, zodat het voorbeeld niet van timeline.js afhangt; tekst = grijze balkjes */
.jc-prev, .jc-hero { --tl-back: #1976d2; --tl-back-2: #1565c0; text-align: left; font-size: 16px; line-height: 1.5; }
.jc-prev .tl-c { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 0.3rem; width: 8.1rem; height: 12.4rem; box-sizing: border-box;
  padding: 0.6rem 0.65rem; border: 1px solid; border-radius: 12px; box-shadow: 0 6px 14px -9px rgba(0, 0, 0, 0.55); }
.jc-prev .tl-c:not(.tl-ill) { background: var(--card); color: var(--fg); border-color: var(--border); }
.jc-prev .tl-y { font-size: 1.45rem; font-weight: 800; line-height: 1.05; font-variant-numeric: tabular-nums; }
.jc-prev .tl-s { position: absolute; top: 0.45rem; right: 0.45rem; font-size: 1.05rem; line-height: 1; }
.jc-prev .tl-t { display: block; font-size: 0.78rem; line-height: 1.3; }
.jc-sk { display: block; height: 0.42em; margin: 0.42em 0; border-radius: 3px; background: color-mix(in srgb, var(--fg) 22%, transparent); }
.jc-sk.s1 { width: 58%; } .jc-sk.s2 { width: 86%; } .jc-sk.s3 { width: 72%; } .jc-sk.s4 { width: 80%; } .jc-sk.s5 { width: 44%; }
.jc-sk-cat { display: inline-block; width: 4.2em; height: 0.5em; margin: 0; vertical-align: middle; }
.jc-hero .tl-handin { position: relative; width: 15rem; height: 13.4rem; isolation: isolate; }
.jc-hero .tl-back { position: absolute; inset: 0; z-index: -1; border-radius: 16px; background-color: var(--tl-back);
  background-image: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.09) 0 5px, transparent 5px 11px);
  box-shadow: inset 0 0 0 5px var(--tl-back-2), inset 0 0 0 6.5px rgba(255, 255, 255, 0.5), 0 8px 20px rgba(0, 0, 0, 0.4); }
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
    if (!lv || !INI.test(ch)) return esc(s);
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
      const W = el.offsetWidth, H = el.offsetHeight;
      if (!W || !H) return;
      const hand = el.classList.contains("tl-card"), lv = +el.dataset.jc, seed = +el.dataset.jcs, cat = +el.dataset.jcc;
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
      `<span class="tl-s" aria-hidden="true">${esc(suit)}</span><span class="tl-t">${lv ? `<span class="ill-ini">B</span>` : ""}${SK(5)}</span></div></div>`;
  }
  function hero(style, cat = 1, suit = "⚔️") {
    const lv = lvOf(style) || 3;
    return `<div class="jc-hero"><div class="tl-handin"><div class="tl-back b2"></div><div class="tl-back b1"></div>` +
      `<div class="tl-card tl-ill"${attrs(1429, cat, lv)}><div class="tl-suit"><i aria-hidden="true">${esc(suit)}</i><i class="jc-sk jc-sk-cat"></i></div>` +
      `<p class="tl-txt"><span class="ill-ini">B</span>${SK(4)}</p><span class="tl-q" aria-hidden="true">????</span></div></div></div>`;
  }

  return { lvOf, attrs, text, harvest, paint, preview, hero, inject, svg };
})();
