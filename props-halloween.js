/* De voorwerpjes van het Halloween-katje (lui geladen bij de skin, zie game.js SEASON_PROP_LIBS en season-props.js): twee kleine vriendjes die zelf
   leven en op de kat reageren: de lantaarn (flikkerend licht, de kat snuffelt eraan) en het spookje (zweeft, knippert, kijkt naar hem en schrikt als
   hij tikt). Rooster (SCHEDULE, op de datum van vandaag, voor iedereen en in elke spelstand hetzelfde, nooit gekoppeld aan het feit, dus geen hint):
   de eerste drie dagen van Spooktober (19-21 okt) zit hij nog alleen, dan vijf dagen de lantaarn (22-26 okt), dan het spookje als finale
   (27 okt t/m 1 nov, dus ook op Halloween zelf). items: id → { kind, calm?, svg | img, fx? }: kind = hoe het wiebelt als hij ertegenaan tikt,
   calm = hij snuffelt alleen (vuur), fx = overlay-lagen (<i>, <s>, <b>, een tweede kopie van het plaatje, of een svg; posities in % van het voorwerp),
   CSS_BY = per voorwerp een eigen blok regels en @keyframes (alleen onder [data-prop="<id>"], keyframes skh-<id>-*). De plaatjes (img) zijn losse
   WebP's van 128 px in /props/halloween/, alleen die van de dag wordt opgehaald. pick({ today }, forced): today = de datum (eventToday, dus ook
   ?evdate=); forced = ?prop=<id> (voorvertoning, buiten het rooster om).
   actors = de dingen in de kunstjes van het katje (season-cat.js), elk dag van het event: het herfstblaadje dat op zijn neus valt (Hatsjoe!) en
   het spinnetje aan een draadje (Bonk!). */
window.SeasonPropsHalloween = (() => {
  const P = (id) => `/props/halloween/${id}.webp`;
  const items = {
    ghost: { kind: "float", img: P("ghost"), fx: `<i class="cv"></i><i class="ey"></i><i class="ey"></i><i class="mo"></i>` },
    lantern: { kind: "upright", calm: true, img: P("lantern"), fx: `<i class="ha"></i><i class="fl"><s></s><b></b></i>` },
  };
  // [vanaf deze dag, voorwerp]: vóór de eerste datum niets, daarna blijft het laatste rooster-voorwerp staan
  const SCHEDULE = [["2026-10-22", "lantern"], ["2026-10-27", "ghost"]];
  // per voorwerp een eigen blok (regels + @keyframes, eigen prefix skh-<id>-): zo is één voorwerp los te vervangen of aan te passen
  const CSS_BY = {
    ghost: `[data-prop="ghost"]{--amb:skh-ghost-bob 3.8s ease-in-out infinite,skh-ghost-sway 5.3s ease-in-out infinite;--eye:skh-ghost-blink 14s ease-in-out infinite,skh-ghost-look 23s ease-in-out infinite}
[data-prop="ghost"] .in{transform-origin:50% 88%;animation:var(--amb)}
[data-prop="ghost"] .cv{left:50%;width:40%;height:17%;border-radius:30%;background:#fdf7f3}
[data-prop="ghost"] :is(.ey,.mo){border-radius:50%;background:#1c1814}
[data-prop="ghost"] :is(.cv,.ey){top:42.2%}
[data-prop="ghost"] .ey{left:39.5%;width:7.8%;height:8.4%;animation:var(--eye)}
[data-prop="ghost"] .ey+.ey{left:60.5%}
[data-prop="ghost"] .mo{left:50%;top:56%;width:7%;height:10%;opacity:0;scale:.3}
[data-prop="ghost"].pulse .in{animation:var(--amb),skh-ghost-boo 1.5s ease-out .5s 1}
[data-prop="ghost"].pulse .ey{animation:var(--eye),skh-ghost-wide 1.5s ease-out .5s 1}
[data-prop="ghost"].pulse .mo{animation:skh-ghost-oh 1.5s ease-out .5s 1}
@keyframes skh-ghost-bob{0%,100%{translate:0 0;filter:drop-shadow(0 0 1px #be8cff4d)}50%{translate:0 -9%;filter:drop-shadow(0 0 calc(var(--w)*.06) #cda0ff99)}}
@keyframes skh-ghost-sway{0%,100%{rotate:-2.5deg}50%{rotate:2.5deg}}
@keyframes skh-ghost-blink{0%,17%,18.5%,46%,47.5%,49%,50.5%,100%{width:7.8%;height:8.4%}17.5%,17.8%,46.5%,46.8%,49.5%,49.8%{width:10.5%;height:max(1.2px,2.4%)}}
@keyframes skh-ghost-look{0%,60%,80%,100%{transform:none}66%,74%{transform:translateX(-60%)}}
@keyframes skh-ghost-boo{0%,100%{scale:1}9%{scale:1.12 .84}22%{scale:.88 1.2}42%{scale:1.07 .93}65%{scale:.98 1.03}}
@keyframes skh-ghost-wide{0%,100%{scale:1}18%,55%{scale:1.5}}
@keyframes skh-ghost-oh{0%,100%{opacity:0;scale:.3}15%,55%{opacity:1;scale:1}}
`,
    lantern: `[data-prop="lantern"] .in{isolation:isolate}
[data-prop="lantern"] .ha{left:50%;top:62%;width:46%;height:60%;z-index:-1;border-radius:34%;box-shadow:0 0 calc(var(--w)*.17) calc(var(--w)*.03) #ffac486b;transform-origin:50% 100%;animation:skh-lantern-h 4.1s ease-in-out infinite}
[data-prop="lantern"] .fl{left:49.8%;top:64.3%;width:15%;height:18%;transform-origin:50% 100%}
[data-prop="lantern"] .fl :is(s,b){position:absolute;transform-origin:50% 100%;animation:skh-lantern-h 2.6s ease-in-out infinite}
[data-prop="lantern"] .fl s{left:-90%;top:-16%;width:280%;height:170%;background:radial-gradient(closest-side,#fff4d69e,#ffce784d 40%,#ffaa4600)}
[data-prop="lantern"] .fl b{inset:0;opacity:1!important;animation-name:skh-lantern-h,skh-lantern-w;animation-duration:2.6s,3.4s}
[data-prop="lantern"] .fl b::before{content:"";position:absolute;inset:17% 0 0;border-radius:0 50% 50% 50%;rotate:45deg;background:radial-gradient(#fff9dc,#ffe488 50%,#ffbd4d)}
[data-prop="lantern"].pulse .in{animation:skh-lantern-n 1.5s .5s}
[data-prop="lantern"].pulse .fl{animation:skh-lantern-f 1.5s .5s}
@keyframes skh-lantern-h{0%,100%{scale:1;opacity:.72}14%{scale:.93 1.14;opacity:1}32%{scale:1.05 .88;opacity:.6}52%{scale:.9 1.25;opacity:1}76%{scale:1.02 .95;opacity:.8}}
@keyframes skh-lantern-w{0%,100%{rotate:0deg}20%{rotate:-8deg}45%{rotate:5deg}65%{rotate:-4deg}85%{rotate:9deg}}
@keyframes skh-lantern-n{15%{filter:brightness(.7)}30%,56%{filter:brightness(.38) saturate(1.3)}82%{filter:brightness(1.2)}}
@keyframes skh-lantern-f{10%{transform:rotate(28deg) scale(.85,.7)}26%{transform:rotate(16deg) scale(.45,.38)}56%{transform:rotate(12deg) scale(.4,.34)}74%{transform:scale(.8,.75)}86%{transform:rotate(-4deg) scale(1.15,1.25)}}
`,
  };
  const CSS = `/* Het eigen leven van de Halloween-voorwerpjes (props-halloween.js); posities in % van het voorwerp, maat via var(--w) */
` + Object.values(CSS_BY).join("");
  const forDay = (today) => { let id = null; for (const [from, pid] of SCHEDULE) if (today >= from) id = pid; return id; };   // ISO-datums vergelijken als tekst
  function pick(ctx, forced) {
    const id = forced && Object.prototype.hasOwnProperty.call(items, forced) ? forced : ctx && /^\d{4}-\d{2}-\d{2}$/.test(ctx.today || "") ? forDay(ctx.today) : null;
    const it = id && items[id];
    return it ? { id, kind: it.kind, calm: !!it.calm, svg: it.svg, img: it.img, fx: it.fx, css: CSS } : null;
  }
  // De dingen in de kunstjes van het katje, getekend in de maten van de kat (viewBox -2 0 52 64) rond 0,0, plat zoals hij zelf: sneeze = wat er op
  // zijn neus valt, swat = wat er aan het draadje hangt (vast aan de bovenkant, y≈-4,4; .act-legs spartelen als het zwiept), thread = de kleur van
  // dat draadje. De beweging staat in season-cat.js; een ander event geeft hier alleen andere tekeningetjes.
  const actors = {
    sneeze: `<g class="act-leaf"><path d="M0 -3.8C2.65 -2.2 2.45 1.8 0 3.2C-2.3 1.9 -2.7 -1.8 0 -3.8Z" fill="#ff8a1f"/><path d="M0 -2.8L0 3.05M0 -.8L1.2 -1.75M0 .75L-1.3 -.25" fill="none" stroke="#c4560a" stroke-width=".42" stroke-linecap="round"/><path d="M0 3.05L.35 4.6" fill="none" stroke="#9c4a12" stroke-width=".6" stroke-linecap="round"/></g>`,
    swat: `<g class="act-spider"><g class="act-legs" fill="none" stroke="#0b0910" stroke-width=".7" stroke-linecap="round"><path d="M-1.6 -1.2Q-4.4 -4 -5.8 -1.6M-2.1 0Q-5.4 -1 -6.4 1.6M-2.1 1.3Q-5.2 2.8 -5.7 5.2M-1.6 2.5Q-3.8 4.8 -3.5 6.9"/><path d="M1.6 -1.2Q4.4 -4 5.8 -1.6M2.1 0Q5.4 -1 6.4 1.6M2.1 1.3Q5.2 2.8 5.7 5.2M1.6 2.5Q3.8 4.8 3.5 6.9"/></g><circle cy="1.3" r="3.1" fill="#0b0910"/><circle cy="-2.3" r="2.15" fill="#0b0910"/><circle cx="-.85" cy="-2.55" r=".82" fill="#fbf7ff"/><circle cx=".85" cy="-2.55" r=".82" fill="#fbf7ff"/><circle cx="-.7" cy="-2.35" r=".36" fill="#0b0910"/><circle cx="1" cy="-2.35" r=".36" fill="#0b0910"/></g>`,
    thread: "var(--act-silk)",
  };
  return { items, schedule: SCHEDULE, css: CSS, pick, actors };
})();
