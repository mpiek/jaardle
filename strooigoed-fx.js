// Strooigoed (StrooigoedFx): de win-viering die je met het Sinterklaas-event verdient en daarna het hele jaar als viering
// kunt kiezen. Drie handenvol snoepgoed worden laag over de vloer de kamer in gestrooid (van links, van rechts, dan van twee
// kanten tegelijk): kruidnoten, chocolademunten, schuimpjes, marsepein en een chocoladeletter vliegen in een boogje naar
// binnen, stuiteren, rollen uit, blijven even liggen en worden dan in een golfje weggegrist. Alleen het snoepgoed: geen
// hand, geen figuren. Het blijft de hele tijd onder de uitslag (jaartal + score), ook terwijl die nog omhoogschuift.
// Eigen bestand (niet in holiday-fx.js, dat iedereen op een feestdag laadt): alleen wie de viering heeft haalt het ooit op
// (loadStrooigoedFx / loadFxOf in game.js), en het is klein genoeg om bij de winst zelf te laden. Zelfde contract als
// HolidayFx: has / ids / build → lagen { end, draw(ctx, t, W, H) } voor runFx. Gebruikt currentTheme() uit game.js.
// De tekeningen staan één keer in dit bestand, als inline-SVG (ICONS: viewBox 24, leesbaar vanaf 16 px). De pagina kan ze zo
// in de HTML zetten (voortgangsregel, kluis; de maat komt uit de CSS van wie ze plaatst). Het canvas tekent dezelfde vormen
// (paint) één keer naar sprites en zet daarna per frame alleen plaatjes neer: geen paden, verlopen of shadowBlur per snoepje.
// paint kent alleen <path>, <circle> en <ellipse> met fill, stroke, stroke-width, stroke-linecap en opacity; de test bewaakt
// dat er niets anders in ICONS staat.
window.StrooigoedFx = (() => {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, u) => a + (b - a) * u;
  const SVG = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
  const ICONS = {
    // kruidnoot: bolletje met een dikkere, donkere onderrand en vier losse barstjes (bewust scheef verdeeld: geen gezichtje)
    kruidnoot: SVG('<circle cx="12" cy="12.8" r="9.4" fill="#8f5423"/><circle cx="12" cy="11.5" r="8.8" fill="#bd7a35"/><ellipse cx="9.5" cy="8.8" rx="4.8" ry="3.6" fill="#d39755"/><ellipse cx="8.3" cy="7.5" rx="1.8" ry="1.1" fill="#ecc089"/><path d="M13.8 7.3l1.9 1.6M10.4 11.2l1 1.7M15.2 13.4l1.6 1.9M8.3 16.2l2.2.5" fill="none" stroke="#8f5423" stroke-width="1.2" stroke-linecap="round"/>'),
    // chocolademunt in goudfolie: rand, ring, ster en twee glansjes
    munt: SVG('<circle cx="12" cy="12" r="10.4" fill="#c4860f"/><circle cx="12" cy="12" r="9" fill="#f6c63c"/><circle cx="12" cy="12" r="6.9" fill="none" stroke="#dc9f1a" stroke-width="1"/><path d="M12 7.6l1.18 3.08 3.29.17-2.57 2.07.86 3.18L12 14.3l-2.76 1.8.86-3.18-2.57-2.07 3.29-.17z" fill="#dc9f1a"/><path d="M5.5 9.4A7.4 7.4 0 0 1 10.9 4.7" fill="none" stroke="#fff6cf" stroke-width="1.6" stroke-linecap="round"/><path d="M18.3 15.4a7.2 7.2 0 0 1-2.5 2.7" fill="none" stroke="#fff6cf" stroke-width="1.2" stroke-linecap="round" opacity=".7"/>'),
    // schuimpje: gespoten bloemetje met een krul (roze; geel en mint zijn dezelfde vorm in een andere kleur, zie TINTS)
    schuimpje: SVG('<path d="M19.85 15.25a3.43 3.43 0 0 1-4.6 4.6 3.43 3.43 0 0 1-6.5 0 3.43 3.43 0 0 1-4.6-4.6 3.43 3.43 0 0 1 0-6.5 3.43 3.43 0 0 1 4.6-4.6 3.43 3.43 0 0 1 6.5 0 3.43 3.43 0 0 1 4.6 4.6 3.43 3.43 0 0 1 0 6.5z" fill="#ffb3cb" stroke="#ec7fa5" stroke-width="1"/><circle cx="11.5" cy="11.4" r="6" fill="#ffd0df"/><path d="M12 12c.9-1.6 3.3-1 3.3 1.1 0 2.4-2.6 3.9-5 3-2.6-1-3.6-4.2-2-6.6" fill="none" stroke="#ec7fa5" stroke-width="1.1" stroke-linecap="round"/><ellipse cx="8.7" cy="7.9" rx="1.7" ry="1.1" fill="#fff" opacity=".85"/>'),
    // marsepein: een peertje met een blos, een kruidnagel als steeltje en een blaadje
    marsepein: SVG('<path d="M12 5.2c1.9 0 3.1 1.4 3.3 3.2.2 1.5.8 2.4 1.9 3.6 1.3 1.4 2.1 2.8 2.1 4.6 0 3.5-3.2 5.6-7.3 5.6s-7.3-2.1-7.3-5.6c0-1.8.8-3.2 2.1-4.6 1.1-1.2 1.7-2.1 1.9-3.6.2-1.8 1.4-3.2 3.3-3.2z" fill="#f3cd58" stroke="#d39a2b" stroke-width=".9"/><ellipse cx="14.7" cy="17.5" rx="3.6" ry="3.2" fill="#dd9f33" opacity=".5"/><ellipse cx="8.9" cy="16.2" rx="3.2" ry="3.8" fill="#f07a68" opacity=".72"/><ellipse cx="10.4" cy="9.3" rx="1" ry="1.8" fill="#fff8d8" opacity=".85"/><path d="M12 5.6c0-1.2.2-2.2.8-3.1" fill="none" stroke="#6a3d1c" stroke-width="1.5" stroke-linecap="round"/><path d="M12.9 3.9c1.2-2 3.5-2.5 5.2-1.6-.9 2.1-3.3 2.9-5.2 1.6z" fill="#62a34a"/>'),
    // chocoladeletter: een dikke S van melkchocolade met een schaduwkant en een lichte rand
    letter: SVG('<path d="M17.5 8.4c-.4-2.2-2.5-3.6-5.1-3.6-3 0-5.2 1.6-5.2 4.1 0 5.3 10.5 2.5 10.5 7.6 0 2.5-2.3 4.1-5.3 4.1-2.8 0-4.9-1.4-5.4-3.7" fill="none" stroke="#5e361c" stroke-width="5"/><path d="M17 7.7c-.4-2.2-2.5-3.6-5.1-3.6-3 0-5.2 1.6-5.2 4.1 0 5.3 10.5 2.5 10.5 7.6 0 2.5-2.3 4.1-5.3 4.1-2.8 0-4.9-1.4-5.4-3.7" fill="none" stroke="#8a5430" stroke-width="5"/><path d="M15.9 6.6c-.4-2.2-2.5-3.6-5.1-3.6-3 0-5.2 1.6-5.2 4.1 0 5.3 10.5 2.5 10.5 7.6 0 2.5-2.3 4.1-5.3 4.1-2.8 0-4.9-1.4-5.4-3.7" fill="none" stroke="#b57b48" stroke-width="1.1" stroke-linecap="round"/>'),
  };
  // Schuimpjes in drie kleuren: de roze tekening met de drie tinten vervangen (vlak, rand, binnenkant).
  const TINTS = [null, ["#ffe08a", "#dba63a", "#fff0bd"], ["#b4e6c4", "#63b585", "#d9f5e1"]];
  const tinted = (svg, t) => (t ? svg.replace(/#ffb3cb/g, t[0]).replace(/#ec7fa5/g, t[1]).replace(/#ffd0df/g, t[2]) : svg);

  // Per soort: px = maat bij schaal 1, e = hoeveel snelheid een stuiter overhoudt, hops = aantal stuiters, grip = hoeveel vaart
  // er per stuiter overblijft, wild = hoe grillig het ketst (een kruidnoot springt alle kanten op), roll = uitrollen in s,
  // spin = tollen in de lucht (rad/s), turn = hoeveel het meedraait bij het uitrollen (een munt rolt echt) en lie = hoe scheef
  // het hooguit blijft liggen (rad): het tolt en rolt vrij, maar komt zo uit dat het licht van alle snoepjes in rust van
  // dezelfde kant komt en de letter leesbaar blijft.
  const KINDS = {
    kruidnoot: { px: 21, e: 0.5, hops: 3, grip: 0.62, wild: 0.5, roll: 0.22, spin: 9, turn: 0.55, lie: 0.55 },
    munt:      { px: 27, e: 0.36, hops: 2, grip: 0.7, wild: 0.1, roll: 0.5, spin: 5, turn: 1, lie: 0.5 },
    schuimpje: { px: 25, e: 0.42, hops: 2, grip: 0.55, wild: 0.3, roll: 0.16, spin: 7, turn: 0.3, lie: 0.6 },
    marsepein: { px: 28, e: 0.3, hops: 2, grip: 0.5, wild: 0, roll: 0.14, spin: 4, turn: 0.2, lie: 1.1 },
    letter:    { px: 30, e: 0.22, hops: 1, grip: 0.45, wild: 0, roll: 0.12, spin: 2.5, turn: 0, lie: 0.4 },
  };

  // Eén tekening op het canvas, `size` px groot rond de oorsprong. Lijnen zoals SVG ze standaard tekent (miter, grens 4),
  // zodat het plaatje op het canvas en de inline-SVG hetzelfde zijn.
  function paint(ctx, svg, size) {
    ctx.save(); ctx.scale(size / 24, size / 24); ctx.translate(-12, -12); ctx.lineJoin = "miter"; ctx.miterLimit = 4;
    svg.replace(/<(path|circle|ellipse)\b([^>]*)\/>/g, (_, tag, attrs) => {
      const a = {}; attrs.replace(/([\w-]+)="([^"]*)"/g, (__, k, v) => { a[k] = v; });
      let p;
      if (tag === "path") p = new Path2D(a.d);
      else { p = new Path2D(); if (tag === "circle") p.arc(+a.cx, +a.cy, +a.r, 0, TAU); else p.ellipse(+a.cx, +a.cy, +a.rx, +a.ry, 0, 0, TAU); }
      ctx.globalAlpha = a.opacity ? +a.opacity : 1;
      if (a.fill && a.fill !== "none") { ctx.fillStyle = a.fill; ctx.fill(p); }
      if (a.stroke) { ctx.strokeStyle = a.stroke; ctx.lineWidth = +a["stroke-width"] || 1; ctx.lineCap = a["stroke-linecap"] || "butt"; ctx.stroke(p); }
      return "";
    });
    ctx.restore();
  }
  // Sprite op dubbele resolutie (runFx tekent op hooguit dpr 2), met 2 px lucht voor het draaien. px = de grootste maat
  // waarop hij getekend wordt; kleiner tekenen blijft scherp.
  function sprite(svg, px) {
    const c = document.createElement("canvas"), n = Math.ceil(px * 2) + 4;
    c.width = c.height = n;
    const g = c.getContext("2d"); g.translate(n / 2, n / 2); g.scale(2, 2); paint(g, svg, px);
    return { img: c, k: n / 2 / px };     // k: hoeveel groter het plaatje is dan de tekening
  }
  // Zachte slagschaduw: één ronde verloop-sprite, plat getekend onder elk snoepje.
  function shadowSprite() {
    const c = document.createElement("canvas"); c.width = c.height = 32;
    const g = c.getContext("2d"), rg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    rg.addColorStop(0, "rgba(0,0,0,.9)"); rg.addColorStop(0.45, "rgba(0,0,0,.5)"); rg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = rg; g.fillRect(0, 0, 32, 32);
    return c;
  }
  // Kleine vaste toevalsbron (mulberry32): met opts.seed is een worp herhaalbaar (tests, voorbeeldframes).
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) | 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }
  // Waar houdt de uitslag op? De onderkant van de score-regel (onder het jaartal) op zijn EINDplek, en hoeveel lager hij nu
  // nog staat: na een verse winst klapt het toetsenbord 1,5 s in en schuift de kaart zolang omhoog. Geen kaart in beeld
  // (voorvertoning in de kluis): de bovenste helft blijft vrij.
  function resultEdge(H) {
    try {
      const el = document.querySelector("#result-text .score-line") || document.querySelector("#result-text .year-pill"), r = el && el.getBoundingClientRect && el.getBoundingClientRect();
      if (r && r.height > 0) {
        const bar = document.querySelector("#play-bar.collapsing"), drop = (bar && bar.offsetHeight) || 0;
        return { end: r.bottom - drop, drop };
      }
    } catch (e) {}
    return { end: H * 0.5, drop: 0 };
  }
  // De CSS-"ease" (cubic-bezier .25,.1,.25,1) waarmee het toetsenbord inklapt: tijd 0..1 → hoe ver het dicht is.
  function ease(x) {
    x = clamp(x, 0, 1);
    let lo = 0, hi = 1;
    for (let i = 0; i < 16; i++) { const t = (lo + hi) / 2; if (0.75 * t * (1 - t) + t * t * t < x) lo = t; else hi = t; }
    const t = (lo + hi) / 2, u = 1 - t;
    return 0.3 * u * u * t + 3 * u * t * t + t * t * t;
  }

  function strooigoedLayers({ W, H, opts }) {
    const R = rng(opts.seed != null ? opts.seed : (Math.random() * 4294967296) >>> 0), rnd = (a, b) => a + R() * (b - a);
    const S = clamp(Math.min(W, H) / 400, 0.6, 1.5), light = currentTheme() === "light";
    const G = 3000 * S;                                                    // zwaartekracht in px/s²: een vlotte worp
    // De vloer is de onderste strook van het scherm, met diepte: achteraan ligt het hoger en is het kleiner.
    const band = clamp(0.16 * H, 104 * S, 160 * S), floorTop = H - band, floorBot = H - 13 * S;
    // Het snoepgoed blijft onder de uitslag: het plafond is de onderkant van de score-regel plus wat lucht, ook terwijl de
    // kaart nog omhoogschuift (ceilAt). Geen snoepje komt er met zijn bovenkant boven; is er weinig ruimte, dan wordt de worp
    // vlakker. Staat de uitslag zelfs op zijn eindplek nog in de weg (heel laag scherm), dan houdt het op: 60 px boven de vloer.
    const edge = resultEdge(H), ceilEnd = Math.min(edge.end + 10 * S, floorTop - 60 * S);
    const ceilAt = (t) => ceilEnd + edge.drop * (1 - ease(t / 1.5));
    const hand = clamp((floorTop - ceilEnd) * 0.4, 40 * S, 115 * S);       // hoe hoog boven de vloer de worp vertrekt
    // Drie handenvol: van links, van rechts, en dan van twee kanten tegelijk. De eerste wacht tot de uitslag boven de vloer
    // uit is (op een laag scherm staat de kaart bij de winst nog helemaal onderin).
    let go = 0.12;
    while (go < 1.5 && ceilAt(go) > floorTop - 26 * S) go += 0.02;
    const THROWS = [go, go + 0.34, go + 0.68];

    // Rustplekken: drie verspringende rijen met wat willekeur, zodat het gelijkmatig ligt (geen kluiten, geen rooster).
    // Hoeveel: naar de oppervlakte van de vloer, zodat het op een laag of smal scherm niet voller wordt (telefoon: ±33).
    const cols = clamp(Math.round(0.93 * W * band / (1500 * S * S) / 3), 8, 24), spots = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < cols; c++) {
      spots.push({ r, d: clamp((r + rnd(-0.12, 1.12)) / 3, 0, 1), x: W * (0.035 + 0.93 * (c + (r % 2 ? 0.72 : 0.28) + rnd(-0.4, 0.4)) / cols) });
    }
    // De mix: vooral kruidnoten, daartussen munten en schuimpjes, een paar peertjes en vooraan een of twee letters (links en
    // rechts van het midden, waar ze opvallen). De rest wordt door elkaar geschud over de overige plekken.
    const N = spots.length, front = [], others = [], bag = [];
    spots.forEach((sp, i) => (sp.r === 2 ? front : others).push(i));
    const letterSpots = (N >= 30 ? [0.27, 0.73] : [0.5]).map((fx) => front.reduce((b, i) => (Math.abs(spots[i].x / W - fx) < Math.abs(spots[b].x / W - fx) ? i : b)));
    others.push(...front.filter((i) => !letterSpots.includes(i)));
    for (let i = others.length - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [others[i], others[j]] = [others[j], others[i]]; }
    for (const [kind, share] of [["munt", 0.17], ["schuimpje", 0.2], ["marsepein", 0.08]]) for (let i = Math.round(N * share); i > 0; i--) bag.push(kind);

    // Sprites: één per soort (schuimpje in drie kleuren), op de grootste maat die voorkomt.
    const MAXK = 1.13, sprites = {};
    for (const k of Object.keys(KINDS)) sprites[k] = (k === "schuimpje" ? TINTS : [null]).map((t) => sprite(tinted(ICONS[k], t), KINDS[k].px * S * MAXK));
    const shadow = shadowSprite();

    const pieces = [];
    let lastRest = 0;
    const make = (si, kind) => {
      const spot = spots[si], K = KINDS[kind], size = K.px * S * lerp(0.84, 1.1, spot.d) * rnd(0.94, 1.02), rad = size / 2;
      const xEnd = clamp(spot.x, rad + 5 * S, W - rad - 5 * S);              // waar het komt te liggen: helemaal binnen beeld
      const fromLeft = xEnd / W > 0.5 + rnd(-0.16, 0.16);                    // elk snoepje landt ver van wie het gooit: het vliegt de kamer door
      const h = spot.r === 2 || (spot.r === 1 && R() < 0.3) ? 2 : fromLeft ? 0 : 1;
      const yf = lerp(floorTop + 12 * S, floorBot, spot.d) - rad * 0.8;      // middelpunt in rust
      const xs = fromLeft ? -rad - rnd(4, 16) * S : W + rad + rnd(4, 16) * S;
      let t0 = THROWS[h] + rnd(0, 0.14);
      while (t0 < go + 2 && ceilAt(t0) + rad > yf - 8 * S) t0 += 0.02;      // past het nog niet onder de uitslag door, dan gaat het een tel later
      // vertrekpunt: de eerste hand komt laag (de kaart staat dan nog laag), en nooit boven het plafond
      const ys = Math.min(Math.max(floorTop - hand * (h === 0 ? 0.5 : 1) + rnd(-9, 9) * S, ceilAt(t0) + rad), yf - 8 * S);
      // boogje: zo hoog als deze worp wil, maar de hele weg omhoog onder het plafond van dat moment (dat zelf nog stijgt)
      let rise = rnd(h === 0 ? 14 : 24, h === 0 ? 52 : 96) * S;
      const clear = (r) => {
        const v = Math.sqrt(2 * G * r), ta = v / G;
        for (let i = 1; i <= 6; i++) { const q = ta * i / 6; if (ys - v * q + G * q * q / 2 - rad < ceilAt(t0 + q)) return false; }
        return true;
      };
      while (rise > 4 * S && !clear(rise)) rise *= 0.8;
      const vy0 = -Math.sqrt(2 * G * rise), tf = Math.sqrt(2 * (yf - ys + rise) / G), T0 = -vy0 / G + tf, vImp = G * tf;
      // stuiters + uitrollen; de horizontale vaart volgt uit waar het moet komen te liggen
      const hops = [];
      let wsum = T0, grip = 1;
      for (let k = 1; k <= K.hops; k++) {
        const u = vImp * Math.pow(K.e, k) * rnd(0.85, 1.1), T = 2 * u / G;
        grip *= K.grip * (1 + K.wild * rnd(-0.6, 0.5));
        if (k > 1 && R() < K.wild * 0.3) grip *= -0.5;                      // af en toe ketst er een terug
        hops.push({ u, T, grip }); wsum += grip * T;
      }
      const rollG = grip * K.grip; wsum += rollG * K.roll / 2;
      const vx = (xEnd - xs) / wsum, dir = Math.sign(vx);
      // draaien: tollend door de lucht, bij elke stuiter mee met de rolrichting, en uitrollend tot stilstand
      const spin0 = (R() < 0.75 ? dir : -dir) * rnd(0.45, 1) * K.spin;
      let x = xs + vx * T0, a = spin0 * T0, s = T0;
      for (const hp of hops) { hp.x = x; hp.a = a; hp.s = s; hp.vx = vx * hp.grip; hp.w = clamp(hp.vx / rad * 0.5, -K.spin * 1.2, K.spin * 1.2) * rnd(0.7, 1.1); x += hp.vx * hp.T; a += hp.w * hp.T; s += hp.T; }
      const vr = vx * rollG, rollA = (vr * K.roll / 2) / rad * K.turn;
      const a0 = rnd(-K.lie, K.lie) - a - rollA;                             // beginhoek: zo dat het in rust hooguit `lie` scheef ligt
      const p = { kind, K, size, rad, d: spot.d, t0, xs, ys, yf, vx, vy0, T0, hops, a0, spin0, xr: x, ar: a, sr: s, vr, rollA, xEnd,
        img: sprites[kind][(R() * sprites[kind].length) | 0], flip: kind === "munt" ? { ph: rnd(0, TAU), w: rnd(9, 14) } : null,
        rest: t0 + s + K.roll, pick: 0, glint: 0 };
      lastRest = Math.max(lastRest, p.rest);
      pieces.push(p);
    };
    letterSpots.forEach((si) => make(si, "letter"));
    others.forEach((si, i) => make(si, bag[i] || "kruidnoot"));
    pieces.sort((p, q) => p.d - q.d);                                        // achteraan eerst: wat vooraan ligt komt erbovenop

    // Even blijven liggen, dan worden ze weggegrist: een golfje van links naar rechts.
    const PICK = 0.24, pick0 = Math.max(go + 2.85, lastRest + 0.45), coins = pieces.filter((p) => p.flip);
    let END = 0;
    for (const p of pieces) {
      p.pick = pick0 + 0.46 * (p.xEnd / W) + rnd(0, 0.2);                       // van links naar rechts, met wat willekeur
      END = Math.max(END, p.pick + PICK + 0.05);
    }
    // Elke munt glinstert één keer terwijl hij ligt, om de beurt (in de volgorde waarin ze tot rust kwamen).
    coins.slice().sort((p, q) => p.rest - q.rest).forEach((p, i, a) => { p.glint = Math.max(p.rest + 0.1, lerp(a[0].rest + 0.25, pick0 - 0.45, (i + rnd(0.2, 0.8)) / a.length)); });
    const shadowA = light ? 0.2 : 0.34, glintCol = light ? "#fffdf0" : "#fff6d8";

    return [{ end: END, draw(ctx, t, W2, H2) {
      const kx = W2 / W, oy = H2 - H;                                         // scherm gedraaid of venster versleept: mee met de onderrand
      // 1) waar is elk snoepje nu?
      for (const p of pieces) {
        const s = t - p.t0;
        p.on = s >= 0 && t < p.pick + PICK;
        if (!p.on) continue;
        let x, y, a, fl = 1;
        if (s < p.T0) {
          x = p.xs + p.vx * s; y = p.ys + p.vy0 * s + G * s * s / 2; a = p.a0 + p.spin0 * s;
          if (p.flip) fl = Math.cos(p.flip.ph + p.flip.w * s);
        } else {
          let hp = null;
          for (const h of p.hops) if (s < h.s + h.T) { hp = h; break; }
          if (hp) {
            const q = s - hp.s;
            x = hp.x + hp.vx * q; y = p.yf - hp.u * q + G * q * q / 2; a = p.a0 + hp.a + hp.w * q;
            if (p.flip && hp === p.hops[0]) { const m = 1 - q / hp.T; fl = 1 - (1 - Math.cos(p.flip.ph + p.flip.w * s)) * m * m; }   // de munt valt plat
          } else {
            const q = clamp((s - p.sr) / p.K.roll, 0, 1), e = q * (2 - q);
            x = p.xr + p.vr * p.K.roll / 2 * e; y = p.yf; a = p.a0 + p.ar + p.rollA * e;
          }
        }
        let sc = 1, al = 1;
        const u = (t - p.pick) / PICK;
        if (u > 0) { y -= 15 * S * u * (2 - u); sc = 1 - u * u; al = 1 - u * u * u; }   // weggegrist: een hupje en weg
        p.x = x * kx; p.y = y + oy; p.a = a; p.fl = fl; p.sc = sc; p.al = al; p.h = Math.max(0, p.yf - y);
      }
      // 2) schaduwen eerst (onder alles), dan het snoepgoed van achter naar voor
      for (const p of pieces) {
        if (!p.on || p.x < -40 || p.x > W2 + 40) continue;
        const lift = clamp(p.h / (110 * S), 0, 1), w = p.size * (1.15 - 0.35 * lift) * p.sc, hh = w * 0.34;
        ctx.globalAlpha = shadowA * (1 - 0.75 * lift) * p.al;
        ctx.drawImage(shadow, p.x - w / 2, p.yf + oy + p.rad * 0.72 - hh / 2, w, hh);
      }
      for (const p of pieces) {
        if (!p.on || p.x < -40 || p.x > W2 + 40) continue;
        const d = p.size * p.img.k * p.sc;
        ctx.globalAlpha = p.al;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
        if (p.fl !== 1) ctx.scale(Math.max(0.14, Math.abs(p.fl)), 1);
        ctx.drawImage(p.img.img, -d / 2, -d / 2, d, d);
        ctx.restore();
      }
      // 3) glinstering op de munten: een vierpuntig sterretje dat even opflitst
      ctx.fillStyle = glintCol;
      for (const p of coins) {
        const u = (t - p.glint) / 0.36;
        if (u <= 0 || u >= 1 || !p.on) continue;
        const r = p.rad * 0.8 * Math.sin(u * Math.PI), gx = p.x - p.rad * 0.3, gy = p.y - p.rad * 0.34, n = r * 0.16;
        ctx.globalAlpha = Math.sin(u * Math.PI);
        ctx.beginPath(); ctx.moveTo(gx, gy - r); ctx.quadraticCurveTo(gx + n, gy - n, gx + r, gy); ctx.quadraticCurveTo(gx + n, gy + n, gx, gy + r);
        ctx.quadraticCurveTo(gx - n, gy + n, gx - r, gy); ctx.quadraticCurveTo(gx - n, gy - n, gx, gy - r); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } }];
  }

  const LAYERS = { strooigoed: strooigoedLayers };
  return {
    has: (id) => Object.prototype.hasOwnProperty.call(LAYERS, id),
    ids: Object.keys(LAYERS),
    build(id, W, H, opts) { return LAYERS[id]({ W, H, opts: opts || {} }); },   // opts.seed: een vaste worp (tests, voorbeeldframes)
    ICONS,   // { kruidnoot, munt, schuimpje, marsepein, letter }: inline-SVG als tekst
    paint,   // paint(ctx, ICONS.x, px): dezelfde tekening op een eigen canvas
  };
})();
