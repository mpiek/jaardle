/* Voorwerpjes bij de mascotte van een event (lui geladen met het katje, alleen met de skin): een paar kleine dingen die zelf leven (een kaars
   die flikkert, een ketel die borrelt, een spookje dat zweeft) en die meedoen als de mascotte ernaar kijkt of ertegenaan tikt. Dit bestand is
   de bewegingskant en weet niets van Halloween; de plaatjes, hun eigen leven en welke dag welk voorwerp heeft komen uit een lib per skin
   (props-halloween.js; voor kerst een props-xmas.js met dezelfde vorm, zie game.js SEASON_PROP_LIBS).
   spec = { id, kind, calm, svg | img, fx?, css? }. svg = inline plaatje, img = los bestand (dan wordt alleen het plaatje van de dag opgehaald),
   fx = extra <i>-lagen (gloed, bellen, sterretjes, ooglid) die je met % van het voorwerp plaatst (left/top = hun midden), css = de bewegingen van
   de lib (alles onder [data-prop="<id>"]). Het eigen leven draait op .in (zweven, gloed) en de <i>-lagen; de wiebel bij een tik op .sk-prop zelf:
   `kind` bepaalt die (round = rolt heen en weer, upright = wipt om en weer terug, flat = schuift en klappert na, float = zweeft weg en terug).
   `calm` = geen speelgoed: de mascotte snuffelt er alleen aan. .pulse = een korte uitbarsting van het eigen leven (de vlam waait weg, het borrelt
   harder): de lib-CSS legt per voorwerp uit wat dat is. Wat de mascotte zelf doet (pootje, kijken, snuffelen) staat in zijn eigen bestand.
   Plek: rechts van de mascotte, via --prop-x / --prop-y / --prop-w op de mascotte (standaard 46px / 1px / 30px); de lib-CSS gebruikt var(--w). */
window.SeasonProps = (() => {
  const KINDS = ["round", "upright", "flat", "float"];
  const CSS = `/* Voorwerpje bij de mascotte (season-props.js): alleen .sk-prop, dus bruikbaar onder elke skin */
.sk-prop {--w:var(--prop-w,30px);position:absolute;left:var(--prop-x,46px);bottom:var(--prop-y,1px);width:var(--w);height:var(--w);margin:0;padding:0;cursor:pointer;transform-origin:50% 100% }
.sk-prop::after {content:"";position:absolute;left:-4px;right:-8px;top:-8px;bottom:0 }
.sk-prop .in {position:absolute;left:0;top:0;width:100%;height:100%;display:block }
.sk-prop :is(svg,img) {position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none;user-select:none }
.sk-prop svg {overflow:visible }
.sk-prop img {object-fit:contain }
.sk-prop i {position:absolute;display:block;pointer-events:none;translate:-50% -50% }
.sk-prop.k-round {transform-origin:50% 50% }
.sk-prop.plop {animation:skp-plop 0.6s cubic-bezier(0.2,1.6,0.4,1) both }
.sk-prop.plop.late {animation-delay:0.9s }
.sk-prop.k-round.hit {animation:skp-roll 1.5s ease-out 0.46s both }
.sk-prop.k-upright.hit {animation:skp-tip 1.4s ease-out 0.46s both }
.sk-prop.k-flat.hit {animation:skp-flap 1.4s ease-out 0.46s both }
.sk-prop.k-float.hit {animation:skp-drift 1.9s ease-in-out 0.46s both }
.sk-prop.hop {animation:skp-hop 1.6s ease-in-out 0.12s 3 both }
@keyframes skp-plop{from{opacity:0;transform:translateY(-16px) scale(0.4)}55%{opacity:1;transform:translateY(1px) scale(1.12,0.9)}to{transform:none}}
@keyframes skp-roll{0%{transform:none}14%{transform:translateX(9px) rotate(45deg)}34%{transform:translateX(-3px) rotate(-15deg)}52%{transform:translateX(2px) rotate(10deg)}70%{transform:translateX(-1px) rotate(-3deg)}100%{transform:none}}
@keyframes skp-tip{0%{transform:none}12%{transform:rotate(22deg)}30%{transform:rotate(-8deg)}46%{transform:rotate(5deg)}62%{transform:rotate(-2.5deg)}80%{transform:rotate(1deg)}100%{transform:none}}
@keyframes skp-flap{0%{transform:none}14%{transform:translateX(5px) rotate(14deg)}32%{transform:translateX(-1px) rotate(-9deg)}52%{transform:translateX(2px) rotate(5deg)}74%{transform:rotate(-2deg)}100%{transform:none}}
@keyframes skp-drift{0%{transform:none}30%{transform:translate(8px,-6px) rotate(14deg)}60%{transform:translate(5px,-3px) rotate(-6deg)}100%{transform:none}}
@keyframes skp-hop{0%,100%{transform:none}24%{transform:translateY(-7px) rotate(-6deg)}38%{transform:scale(1.05,0.94)}50%{transform:translateY(-4px) rotate(4deg)}62%{transform:scale(1.02,0.97)}74%{transform:none}}
@media (prefers-reduced-motion: reduce) { .sk-prop, .sk-prop * { animation: none !important; transition: none !important; } }
`;
  let style = null, libStyle = null;
  function inject() {
    if (style) return;
    style = document.createElement("style");
    style.setAttribute("data-season-props", "");
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  // de bewegingen van de lib: één <style>, opnieuw gezet als er een andere lib-CSS komt
  function injectLib(css) {
    if (!css) return;
    if (!libStyle) { libStyle = document.createElement("style"); libStyle.setAttribute("data-season-props-lib", ""); document.head.appendChild(libStyle); }
    if (libStyle.textContent !== css) libStyle.textContent = css;
  }
  // make() geeft het knoopje terug, nog niet ingehangen
  function make(spec) {
    inject(); injectLib(spec.css);
    const n = document.createElement("div");
    n.className = "sk-prop k-" + (KINDS.includes(spec.kind) ? spec.kind : "upright") + (spec.calm ? " calm" : "");
    n.setAttribute("aria-hidden", "true");
    n.setAttribute("data-prop", spec.id || "");
    const base = spec.img ? `<img src="${spec.img}" alt="" draggable="false" decoding="async">` : spec.svg;   // src komt uit de lib (eigen bestand)
    n.innerHTML = `<span class="in">${base}${spec.fx || ""}</span>`;
    return n;
  }
  // Zoals make(), maar een plaatje-bestand eerst binnenhalen: een half geladen <img> springt in beeld terwijl het voorwerp erin valt (en Firefox
  // toont zolang de alt-tekst). Geeft null als het plaatje niet laadt: dan zit hij gewoon zonder.
  function load(spec) {
    if (!spec.img) return Promise.resolve(make(spec));
    return new Promise((resolve) => {
      const im = document.createElement("img");
      im.onload = () => resolve(make(spec));
      im.onerror = () => resolve(null);
      im.src = spec.img;
    });
  }
  // Een beweging (opnieuw) laten lopen: de andere bewegingen en de klasse zelf weg, reflow, klasse erop (één beweging tegelijk, anders speelt
  // de vorige opnieuw af zodra een klasse verdwijnt); stop = klasse weg (en dat is dan de rust).
  const MOVES = ["plop", "hit", "hop"];
  const restart = (n, c) => { n.classList.remove(c); void n.offsetWidth; n.classList.add(c); };
  function play(n, c) { if (!n) return; MOVES.forEach((m) => n.classList.remove(m)); n.classList.remove("late"); void n.offsetWidth; n.classList.add(c); }
  function stop(n, c) { if (n) { n.classList.remove(c); if (c === "plop") n.classList.remove("late"); } }
  // de uitbarsting van het eigen leven loopt naast de wiebel (geen onderdeel van MOVES) en kan steeds opnieuw
  function pulse(n) { if (n) restart(n, "pulse"); }
  function dispose() { if (style) style.remove(); if (libStyle) libStyle.remove(); style = libStyle = null; }
  return { make, load, play, stop, pulse, dispose, kinds: KINDS, css: CSS };
})();
