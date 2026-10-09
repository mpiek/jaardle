/* Het Halloween-katje (lui geladen, alleen met de Halloween-skin): een vlak zwart silhouet met grote witte ogen. Hij doet niets functioneels:
   hij zit, knippert, miauwt af en toe, gaapt, slaapt, rekt zich uit en reageert op wat jij doet. Ontwerp: de kat-mockup (artifact
   "Spooktober-kat"); de CSS hieronder is daar 1-op-1 uit overgenomen en onder de skin gescopet.
   Standen (klasse op .sk-cat): .meow .yawn .drowsy .asleep .wake .pet .hear .watch .flick .purr .grump .intro; .hallow = 31 oktober
   (vurige ogen, slaapt niet); .hat = draagt een heksenhoed (de hoogste beloning van het event). Het kopje in de balk/strook/het menu
   (SeasonCat.head) gebruikt dezelfde klassen; de strook krijgt .cheer (winst) of .comfort (verlies) van game.js.
   Reageert op je spel via SeasonCat.type() (cijfers) en SeasonCat.guess() (een geaccepteerde gok), nooit op warm of koud: dat zou de
   Richting-hint gratis weggeven. */
window.SeasonCat = (() => {
  const SIT = `<svg class="cat-sit" viewBox="-2 0 52 64" aria-hidden="true" focusable="false"><g class="cat-tail"><path d="M36 61.2C45 62.6 50.6 54.4 47.6 46.4C46.2 42.6 43 43.2 43.6 45.8" fill="none" stroke="#0b0910" stroke-width="3.4" stroke-linecap="round"/></g><path d="M19.2 30C18.6 36 15.6 40 13.6 46C11.6 51 10.6 56 11 60.4C11.2 62.6 13 63.4 15.4 63.4L33.8 63.4C36.4 63.4 38.2 62.4 38.2 60C38.4 54 36.6 48 33.6 43C31.6 39.6 29.6 36 29 30Z" fill="#0b0910"/><g fill="#0b0910"><ellipse cx="18.2" cy="63" rx="1.9" ry="1.3"/><ellipse cx="21.6" cy="63.4" rx="1.9" ry="1.3"/><ellipse cx="26.4" cy="63.4" rx="1.9" ry="1.3"/><ellipse cx="29.8" cy="63" rx="1.9" ry="1.3"/></g><g class="cat-gap" fill="none" stroke-width=".5" stroke-linecap="round"><path d="M21.6 47C21.2 52 21.4 57 21.8 62"/><path d="M26.4 47C26.8 52 26.6 57 26.2 62"/></g><g class="cat-hd"><g transform="translate(-2.4 -3.4) scale(1.1)"><g class="cat-ear-l"><path d="M12.2 20C11.6 13.8 12.4 8.2 14.4 3.2C18 5.6 21 9.2 22.6 13.8Z" fill="#0b0910" stroke="#0b0910" stroke-width="1.2" stroke-linejoin="round"/></g><g class="cat-ear-r"><path d="M35.8 20C36.4 13.8 35.6 8.2 33.6 3.2C30 5.6 27 9.2 25.4 13.8Z" fill="#0b0910" stroke="#0b0910" stroke-width="1.2" stroke-linejoin="round"/></g><path d="M10.8 23.5C10.8 16.2 16.2 11.4 24 11.4C31.8 11.4 37.2 16.2 37.2 23.5C37.2 25.4 37.8 27 39.4 29.6C37 29.2 35.6 29.6 34.6 30.6C31.6 32.6 27.6 33.2 24 33.2C20.4 33.2 16.4 32.6 13.4 30.6C12.4 29.6 11 29.2 8.6 29.6C10.2 27 10.8 25.4 10.8 23.5Z" fill="#0b0910"/><g class="cat-eyes"><g class="fire"><ellipse cx="18" cy="21" rx="6.4" ry="8.2"/><ellipse cx="30" cy="21" rx="6.4" ry="8.2"/></g><g class="cat-ball"><circle cx="18" cy="22.4" r="4.5" fill="#fbf7ff"/><circle cx="30" cy="22.4" r="4.5" fill="#fbf7ff"/></g><g class="cat-pup"><circle cx="18.25" cy="22.9" r="1.55" fill="#0b0910"/><circle cx="30.25" cy="22.9" r="1.55" fill="#0b0910"/></g></g><g class="cat-happy" fill="none" stroke="#fbf7ff" stroke-width="1.35" stroke-linecap="round"><path d="M14.1 23.7Q18 18.5 21.9 23.7"/><path d="M26.1 23.7Q30 18.5 33.9 23.7"/></g><g class="cat-closed" fill="none" stroke="#fbf7ff" stroke-width="1.35" stroke-linecap="round"><path d="M14.1 21.3Q18 26.3 21.9 21.3"/><path d="M26.1 21.3Q30 26.3 33.9 21.3"/></g><rect x="23.1" y="26.5" width="1.8" height=".75" rx=".375" fill="#cfc4e6"/><g class="cat-mouth"><ellipse cx="24" cy="29.6" rx="2.1" ry="2.6" fill="#ee5f88"/><ellipse cx="24" cy="30.7" rx="1.2" ry="1" fill="#ff9db8"/></g><g class="cat-tongue"><path d="M24.6 28.2q2.6 -.1 2.4 2.2q-.2 1.6 -1.6 1.4q-1.4 -.2 -1.3 -1.8Z" fill="#f48fb0"/></g><g class="cat-wh" fill="none" stroke="#cfc4e6" stroke-width=".5" stroke-linecap="round"><path d="M9.6 26.8Q4 25 -1.4 25.6"/><path d="M9 28.4Q3.6 28.6 -1.8 30.2"/><path d="M10 29.8Q5.6 31.6 1 34.6"/><path d="M38.4 26.8Q44 25 49.4 25.6"/><path d="M39 28.4Q44.4 28.6 49.8 30.2"/><path d="M38 29.8Q42.4 31.6 47 34.6"/></g><g class="acc acc-hat"><g transform="rotate(14 29 12)"><path d="M22.6 11.6 28.6 1.8Q29.6-1.2 34-2.4 30.9-.6 30.9 2.6L35.4 11.6Z" fill="#0b0910"/><path d="M25 7.6H33.4L34.9 10.5H23.3Z" fill="#ff8a1f"/><ellipse cx="29" cy="11.9" rx="10.2" ry="2.2" fill="#0b0910"/></g></g></g></g><g class="cat-wave" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" fill="none"><path d="M44 8.4q3.4 3.8 0 7.6"/><path d="M48.4 5.4q5.2 6.8 0 13.6"/></g><g><path class="cat-heart h1" d="M0 -1.4C-3.6 -5 -6.4 -1 0 3.6C6.4 -1 3.6 -5 0 -1.4Z" fill="#ff6f9c"/><path class="cat-heart h2" d="M0 -1.4C-3.6 -5 -6.4 -1 0 3.6C6.4 -1 3.6 -5 0 -1.4Z" fill="#ff8fb4"/><path class="cat-heart h3" d="M0 -1.4C-3.6 -5 -6.4 -1 0 3.6C6.4 -1 3.6 -5 0 -1.4Z" fill="#ff6f9c"/></g></svg>`;
  const NAP = `<svg class="cat-nap" viewBox="-2 0 52 64" aria-hidden="true" focusable="false"><g class="cat-nb"><path d="M8 61.8C6 52 12 43.4 25 41.4C35 39.8 45 42 48 51C49.4 55.6 48 61.8 43 61.8Z" fill="#0b0910"/><path d="M46.4 50.6C52.4 52.4 52 60.8 44 62.4C38 63.6 30 63.2 23 62.6" fill="none" stroke="#0b0910" stroke-width="3.4" stroke-linecap="round"/></g><g class="cat-nh"><g transform="translate(-4.6 30.2) scale(.95) rotate(-5 24 26)"><g class="cat-ear-l"><path d="M12.2 20C11.6 13.8 12.4 8.2 14.4 3.2C18 5.6 21 9.2 22.6 13.8Z" fill="#0b0910" stroke="#0b0910" stroke-width="1.2" stroke-linejoin="round"/></g><g class="cat-ear-r"><path d="M35.8 20C36.4 13.8 35.6 8.2 33.6 3.2C30 5.6 27 9.2 25.4 13.8Z" fill="#0b0910" stroke="#0b0910" stroke-width="1.2" stroke-linejoin="round"/></g><path d="M10.8 24C10.8 16.4 16.2 11.4 24 11.4C31.8 11.4 37.2 16.4 37.2 24C37.2 29.4 32 33.4 24 33.4C16 33.4 10.8 29.4 10.8 24Z" fill="#0b0910"/><g class="cat-shut" fill="none" stroke="#fbf7ff" stroke-width="1.35" stroke-linecap="round"><path d="M14.1 21.3Q18 26.3 21.9 21.3"/><path d="M26.1 21.3Q30 26.3 33.9 21.3"/></g><rect x="23.1" y="26.5" width="1.8" height=".75" rx=".375" fill="#cfc4e6"/><g class="cat-mouth"><ellipse cx="24" cy="29.6" rx="2.1" ry="2.6" fill="#ee5f88"/><ellipse cx="24" cy="30.7" rx="1.2" ry="1" fill="#ff9db8"/></g><g class="cat-tongue"><path d="M24.6 28.2q2.6 -.1 2.4 2.2q-.2 1.6 -1.6 1.4q-1.4 -.2 -1.3 -1.8Z" fill="#f48fb0"/></g><g class="cat-wh" fill="none" stroke="#cfc4e6" stroke-width=".5" stroke-linecap="round"><path d="M9.6 26.8Q4 25 -1.4 25.6"/><path d="M9 28.4Q3.6 28.6 -1.8 30.2"/><path d="M10 29.8Q5.6 31.6 1 34.6"/></g><g class="acc acc-hat"><g transform="rotate(14 29 12)"><path d="M22.6 11.6 28.6 1.8Q29.6-1.2 34-2.4 30.9-.6 30.9 2.6L35.4 11.6Z" fill="#0b0910"/><path d="M25 7.6H33.4L34.9 10.5H23.3Z" fill="#ff8a1f"/><ellipse cx="29" cy="11.9" rx="10.2" ry="2.2" fill="#0b0910"/></g></g></g></g><g class="cat-zzz" fill="none" stroke="#b79cff" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path class="z1" d="M27 24h5l-5 6.2h5"/><path class="z2" d="M34.6 14.6h4.2l-4.2 5.2h4.2"/><path class="z3" d="M42 6.4h3.4l-3.4 4.2h3.4"/></g></svg>`;
  const STRETCH = `<svg class="cat-stretch" viewBox="-2 0 52 64" aria-hidden="true" focusable="false"><g class="cat-tail"><path d="M41.6 28C40.6 20 44 12.4 48.4 10.2C51.4 8.8 52.8 12 50.4 12.8" fill="none" stroke="#0b0910" stroke-width="3.4" stroke-linecap="round"/></g><path d="M15 49C22 44 29 36 34 28.5C36.5 25 41.5 24.5 43 29C44 33 43.2 42 43.6 52C43.8 57 44.6 60.4 46.4 62.4L38.4 62.4C37.6 58.4 37 54 37 49C32 51 26 56.6 21 59C18 60.4 14 60 14 56.6C14 53 14.4 51 15 49Z" fill="#0b0910"/><path d="M4 59.4C3 61 4 62.6 6.4 62.6L19 62.6C21 62.6 22 61 21 59.4C20 57.6 17 57 14 57.4L8 58C6 58.2 4.6 58.6 4 59.4Z" fill="#0b0910"/><g fill="#0b0910"><ellipse cx="5" cy="61.2" rx="2" ry="1.4"/><ellipse cx="8.4" cy="62" rx="2" ry="1.3"/></g><g class="cat-hd"><g transform="translate(-5.7 30.4) scale(.8)"><g class="cat-ear-l"><path d="M12.2 20C11.6 13.8 12.4 8.2 14.4 3.2C18 5.6 21 9.2 22.6 13.8Z" fill="#0b0910" stroke="#0b0910" stroke-width="1.2" stroke-linejoin="round"/></g><g class="cat-ear-r"><path d="M35.8 20C36.4 13.8 35.6 8.2 33.6 3.2C30 5.6 27 9.2 25.4 13.8Z" fill="#0b0910" stroke="#0b0910" stroke-width="1.2" stroke-linejoin="round"/></g><path d="M10.8 23.5C10.8 16.2 16.2 11.4 24 11.4C31.8 11.4 37.2 16.2 37.2 23.5C37.2 25.4 37.8 27 39.4 29.6C37 29.2 35.6 29.6 34.6 30.6C31.6 32.6 27.6 33.2 24 33.2C20.4 33.2 16.4 32.6 13.4 30.6C12.4 29.6 11 29.2 8.6 29.6C10.2 27 10.8 25.4 10.8 23.5Z" fill="#0b0910"/><g class="cat-eyes"><g class="fire"><ellipse cx="18" cy="21" rx="6.4" ry="8.2"/><ellipse cx="30" cy="21" rx="6.4" ry="8.2"/></g><g class="cat-ball"><circle cx="18" cy="22.4" r="4.5" fill="#fbf7ff"/><circle cx="30" cy="22.4" r="4.5" fill="#fbf7ff"/></g><g class="cat-pup"><circle cx="18.25" cy="22.9" r="1.55" fill="#0b0910"/><circle cx="30.25" cy="22.9" r="1.55" fill="#0b0910"/></g></g><g class="cat-happy" fill="none" stroke="#fbf7ff" stroke-width="1.35" stroke-linecap="round"><path d="M14.1 23.7Q18 18.5 21.9 23.7"/><path d="M26.1 23.7Q30 18.5 33.9 23.7"/></g><g class="cat-closed" fill="none" stroke="#fbf7ff" stroke-width="1.35" stroke-linecap="round"><path d="M14.1 21.3Q18 26.3 21.9 21.3"/><path d="M26.1 21.3Q30 26.3 33.9 21.3"/></g><rect x="23.1" y="26.5" width="1.8" height=".75" rx=".375" fill="#cfc4e6"/><g class="cat-mouth"><ellipse cx="24" cy="29.6" rx="2.1" ry="2.6" fill="#ee5f88"/><ellipse cx="24" cy="30.7" rx="1.2" ry="1" fill="#ff9db8"/></g><g class="cat-tongue"><path d="M24.6 28.2q2.6 -.1 2.4 2.2q-.2 1.6 -1.6 1.4q-1.4 -.2 -1.3 -1.8Z" fill="#f48fb0"/></g><g class="cat-wh" fill="none" stroke="#cfc4e6" stroke-width=".5" stroke-linecap="round"><path d="M9.6 26.8Q4 25 -1.4 25.6"/><path d="M9 28.4Q3.6 28.6 -1.8 30.2"/><path d="M10 29.8Q5.6 31.6 1 34.6"/><path d="M38.4 26.8Q44 25 49.4 25.6"/><path d="M39 28.4Q44.4 28.6 49.8 30.2"/><path d="M38 29.8Q42.4 31.6 47 34.6"/></g><g class="acc acc-hat"><g transform="rotate(14 29 12)"><path d="M22.6 11.6 28.6 1.8Q29.6-1.2 34-2.4 30.9-.6 30.9 2.6L35.4 11.6Z" fill="#0b0910"/><path d="M25 7.6H33.4L34.9 10.5H23.3Z" fill="#ff8a1f"/><ellipse cx="29" cy="11.9" rx="10.2" ry="2.2" fill="#0b0910"/></g></g></g></g></svg>`;
  // Alleen het kopje (balk en strook van het event, menu): dezelfde ogen/oortjes, dus het knippert en kijkt mee met de CSS hieronder.
  const HEAD = `<svg class="cat-head" viewBox="7 0 34 34.4" aria-hidden="true" focusable="false"><g class="cat-hd"><g class="cat-ear-l"><path d="M12.2 20C11.6 13.8 12.4 8.2 14.4 3.2C18 5.6 21 9.2 22.6 13.8Z" fill="#0b0910" stroke="#0b0910" stroke-width="1.2" stroke-linejoin="round"/></g><g class="cat-ear-r"><path d="M35.8 20C36.4 13.8 35.6 8.2 33.6 3.2C30 5.6 27 9.2 25.4 13.8Z" fill="#0b0910" stroke="#0b0910" stroke-width="1.2" stroke-linejoin="round"/></g><path d="M10.8 23.5C10.8 16.2 16.2 11.4 24 11.4C31.8 11.4 37.2 16.2 37.2 23.5C37.2 25.4 37.8 27 39.4 29.6C37 29.2 35.6 29.6 34.6 30.6C31.6 32.6 27.6 33.2 24 33.2C20.4 33.2 16.4 32.6 13.4 30.6C12.4 29.6 11 29.2 8.6 29.6C10.2 27 10.8 25.4 10.8 23.5Z" fill="#0b0910"/><g class="cat-eyes"><g class="cat-ball"><circle cx="18" cy="22.4" r="4.5" fill="#fbf7ff"/><circle cx="30" cy="22.4" r="4.5" fill="#fbf7ff"/></g><g class="cat-pup"><circle cx="18.25" cy="22.9" r="1.55" fill="#0b0910"/><circle cx="30.25" cy="22.9" r="1.55" fill="#0b0910"/></g></g><g class="cat-happy" fill="none" stroke="#fbf7ff" stroke-width="1.35" stroke-linecap="round"><path d="M14.1 23.7Q18 18.5 21.9 23.7"/><path d="M26.1 23.7Q30 18.5 33.9 23.7"/></g><g class="cat-closed" fill="none" stroke="#fbf7ff" stroke-width="1.35" stroke-linecap="round"><path d="M14.1 21.3Q18 26.3 21.9 21.3"/><path d="M26.1 21.3Q30 26.3 33.9 21.3"/></g><rect x="23.1" y="26.5" width="1.8" height=".75" rx=".375" fill="#cfc4e6"/><g class="cat-mouth"><ellipse cx="24" cy="29.6" rx="2.1" ry="2.6" fill="#ee5f88"/><ellipse cx="24" cy="30.7" rx="1.2" ry="1" fill="#ff9db8"/></g><g class="cat-tongue"><path d="M24.6 28.2q2.6 -.1 2.4 2.2q-.2 1.6 -1.6 1.4q-1.4 -.2 -1.3 -1.8Z" fill="#f48fb0"/></g><g class="acc acc-hat"><g transform="rotate(14 29 12)"><path d="M22.6 11.6 28.6 1.8Q29.6-1.2 34-2.4 30.9-.6 30.9 2.6L35.4 11.6Z" fill="#0b0910"/><path d="M25 7.6H33.4L34.9 10.5H23.3Z" fill="#ff8a1f"/><ellipse cx="29" cy="11.9" rx="10.2" ry="2.2" fill="#0b0910"/></g></g></g></svg>`;
  // De verlopen van de vurige ogen (31 oktober); de poses verwijzen ernaar met url(#skk-eye) en url(#skk-glow).
  const DEFS = `<svg viewBox="0 0 1 1" aria-hidden="true" focusable="false"><defs><radialGradient id="skk-eye" r=".55"><stop offset="0" stop-color="#fff6c0"/><stop offset=".5" stop-color="#ffbf1f"/><stop offset="1" stop-color="#ff6400"/></radialGradient><radialGradient id="skk-glow" cy=".58"><stop offset=".45" stop-color="#ff9a00" stop-opacity=".9"/><stop offset=".72" stop-color="#ff4d00" stop-opacity=".45"/><stop offset="1" stop-color="#ff2000" stop-opacity="0"/></radialGradient></defs></svg>`;
  const CSS = `/* Het Halloween-katje: puur voor de gezelligheid, naast je score. Ontwerp en tempo: zie de kat-mockup; gedrag: season-cat.js. */
html[data-season="halloween"] .sk-cat {position:absolute;left:0;top:-8px;z-index:4;width:46px;height:56px;padding:0;margin:0;color:var(--muted);background:none;border:0;border-radius:14px;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation;filter:drop-shadow(0 0 1.1px rgba(205,170,255,0.95)) }
html[data-season="halloween"][data-theme="light"] .sk-cat {filter:drop-shadow(0 0 0.6px rgba(90,60,140,0.55)) }
html[data-season="halloween"] .sk-cat:hover {background:none }
html[data-season="halloween"] .sk-cat svg {position:absolute;left:0;top:0;width:100%;height:100%;display:block;overflow:visible;pointer-events:none }
html[data-season="halloween"] .sk-cat .cat-sit {transform-origin:50% 100% }
html[data-season="halloween"] .sk-cat .cat-nap {opacity:0 }
html[data-season="halloween"] .sk-cat .cat-nap,
html[data-season="halloween"] .sk-cat .cat-sit {transition:opacity 0.45s ease }
html[data-season="halloween"] .sk-cat.asleep .cat-nap {opacity:1 }
html[data-season="halloween"] .sk-cat.asleep .cat-sit {opacity:0 }
html[data-season="halloween"] .cat-happy,
html[data-season="halloween"] .cat-closed,
html[data-season="halloween"] .cat-wave,
html[data-season="halloween"] .cat-heart {opacity:0 }
html[data-season="halloween"] .cat-mouth,
html[data-season="halloween"] .cat-tongue {transform-box:fill-box;transform-origin:50%0;transform:scale(0) }
html[data-season="halloween"] .cat-ear-l,
html[data-season="halloween"] .cat-ear-r,
html[data-season="halloween"] .cat-hd,
html[data-season="halloween"] .cat-eyes,
html[data-season="halloween"] .cat-tail {transform-box:fill-box }
html[data-season="halloween"] .cat-hd {transform-origin:50% 100% }
html[data-season="halloween"] .cat-ear-l,
html[data-season="halloween"] .cat-ear-r {transform-origin:50% 100% }
html[data-season="halloween"] .cat-eyes {transform-origin:50% 55% }
html[data-season="halloween"] .cat-tail {transform-origin:2% 98% }
html[data-season="halloween"] .cat-wh {stroke:var(--fg);opacity:0.8 }
html[data-season="halloween"] .cat-gap {stroke:var(--bg) }
html[data-season="halloween"] .cat-tail {animation:skk-tail 3.4s ease-in-out infinite alternate }
html[data-season="halloween"] .cat-eyes {animation:skk-blink 6.5s infinite }
html[data-season="halloween"] .cat-pup {animation:skk-glance 9s ease-in-out infinite }
html[data-season="halloween"] .cat-hd {animation:skk-look 11s ease-in-out infinite }
html[data-season="halloween"] .cat-ear-l {animation:skk-twitch-l 7.3s infinite }
html[data-season="halloween"] .cat-ear-r {animation:skk-twitch-r 9.1s 2s infinite }
@keyframes skk-tail{from{transform:rotate(-7deg)}to{transform:rotate(10deg)}}
@keyframes skk-blink{0%,93%,100%{transform:scaleY(1)}95.5%{transform:scaleY(0.08)}}
@keyframes skk-glance{0%,22%,100%{transform:none}28%,40%{transform:translate(-1.7px,-0.2px)}46%,60%{transform:none}66%,80%{transform:translate(1.7px,-0.4px)}86%{transform:none}}
@keyframes skk-look{0%,38%,100%{transform:none}46%{transform:rotate(5deg)}58%{transform:rotate(-4deg) translateY(-0.4px)}70%{transform:none}}
@keyframes skk-twitch-l{0%,91%,100%{transform:none}93%{transform:rotate(-9deg)}95.5%{transform:rotate(2deg)}97%{transform:none}}
@keyframes skk-twitch-r{0%,90%,100%{transform:none}92%{transform:rotate(10deg)}94.5%{transform:rotate(-2deg)}96.5%{transform:none}}
@keyframes skk-eo{0%,7%{opacity:1}8%,87%{opacity:0}88%,100%{opacity:1}}
@keyframes skk-ac{0%,7%{opacity:0}8%,87%{opacity:1}88%,100%{opacity:0}}
html[data-season="halloween"] .meow .cat-hd {animation:skk-hd 1.5s ease-in-out both }
html[data-season="halloween"] .meow .cat-mouth {animation:skk-mouth 1.5s ease-in-out both }
html[data-season="halloween"] .meow .cat-eyes {animation:skk-eo 1.5s both }
html[data-season="halloween"] .meow .cat-happy {animation:skk-ac 1.5s both }
html[data-season="halloween"] .meow .cat-pup {animation:none }
html[data-season="halloween"] .meow .cat-ear-r {animation:skk-ear 1.5s ease-in-out both }
html[data-season="halloween"] .meow .cat-wave {animation:skk-wave 1.5s ease-out both }
html[data-season="halloween"] .meow .cat-smile {animation:skk-eo 1.5s both }
@keyframes skk-hd{0%,100%{transform:none}14%{transform:translateY(-1.2px) rotate(-7deg)}70%{transform:translateY(-0.8px) rotate(-5deg)}88%{transform:rotate(-1deg)}}
@keyframes skk-mouth{0%,8%,100%{transform:scale(0)}18%,36%{transform:scale(1,1)}44%{transform:scale(0.85,0.3)}54%,70%{transform:scale(1,0.95)}82%{transform:scale(0.8,0.2)}90%{transform:scale(0)}}
@keyframes skk-ear{0%,100%{transform:none}30%{transform:rotate(9deg)}40%{transform:rotate(-3deg)}52%{transform:rotate(8deg)}64%{transform:none}}
@keyframes skk-wave{0%,12%{opacity:0;transform:translateX(-2px)}28%{opacity:0.95;transform:none}62%{opacity:0.55}90%,100%{opacity:0;transform:translateX(2px)}}
html[data-season="halloween"] .yawn .cat-hd {animation:skk-yawn-h 1.6s ease-in-out both }
html[data-season="halloween"] .yawn .cat-mouth {animation:skk-yawn-m 1.6s ease-in-out both }
html[data-season="halloween"] .yawn .cat-eyes {animation:skk-eo 1.6s both }
html[data-season="halloween"] .yawn .cat-happy {animation:skk-ac 1.6s both }
html[data-season="halloween"] .yawn .cat-pup {animation:none }
html[data-season="halloween"] .yawn .cat-smile {animation:skk-eo 1.6s both }
html[data-season="halloween"] .drowsy .cat-eyes {animation:skk-droop 2s ease-in both }
html[data-season="halloween"] .drowsy .cat-closed {animation:skk-closed-in 2s steps(1,end) both }
html[data-season="halloween"] .drowsy .cat-pup {animation:none }
html[data-season="halloween"] .drowsy .cat-hd {animation:skk-nod 2s ease-in-out both }
html[data-season="halloween"] .drowsy .cat-tail {animation-duration:6s }
@keyframes skk-yawn-h{0%,100%{transform:none}25%,70%{transform:translateY(-1.6px) rotate(-9deg)}}
@keyframes skk-yawn-m{0%,100%{transform:scale(0)}22%,68%{transform:scale(1.35,1.5)}88%{transform:scale(0.5,0.2)}}
@keyframes skk-droop{0%{transform:scaleY(1)}25%{transform:scaleY(0.45)}38%{transform:scaleY(0.9)}62%{transform:scaleY(0.4)}80%{transform:scaleY(0.12);opacity:1}82%,100%{transform:scaleY(0.12);opacity:0}}
@keyframes skk-closed-in{0%,79%{opacity:0}80%,100%{opacity:1}}
@keyframes skk-nod{0%,100%{transform:none}30%{transform:rotate(6deg) translateY(1.4px)}50%{transform:rotate(1deg)}78%{transform:rotate(7deg) translateY(1.8px)}}
html[data-season="halloween"] .cat-nb,
html[data-season="halloween"] .cat-nh {transform-box:fill-box;transform-origin:50% 100% }
html[data-season="halloween"] .asleep .cat-nb {animation:skk-breathe 3.8s ease-in-out infinite alternate }
html[data-season="halloween"] .asleep .cat-nh {animation:skk-breathe-h 3.8s ease-in-out infinite alternate }
html[data-season="halloween"] .cat-zzz {stroke:var(--muted) }
html[data-season="halloween"] .cat-zzz path {opacity:0;transform-box:fill-box;transform-origin:50% 50% }
html[data-season="halloween"] .asleep .cat-zzz .z1 {animation:skk-z 3.8s ease-in-out infinite }
html[data-season="halloween"] .asleep .cat-zzz .z2 {animation:skk-z 3.8s 1.1s ease-in-out infinite }
html[data-season="halloween"] .asleep .cat-zzz .z3 {animation:skk-z 3.8s 2.2s ease-in-out infinite }
@keyframes skk-breathe{from{transform:scale(1,1)}to{transform:scale(1.012,1.06)}}
@keyframes skk-breathe-h{from{transform:translateY(0)}to{transform:translateY(-0.7px)}}
@keyframes skk-z{0%{opacity:0;transform:translate(0,6px) scale(0.7)}25%{opacity:1}72%{opacity:0.9}100%{opacity:0;transform:translate(3px,-8px) scale(1.1)}}
html[data-season="halloween"] .sk-cat .cat-stretch {opacity:0;transition:opacity 0.4s ease;transform-origin:90% 100% }
html[data-season="halloween"] .sk-cat.wake .cat-stretch {opacity:1;animation:skk-bow 1.7s ease-in-out both }
html[data-season="halloween"] .sk-cat.wake .cat-sit {opacity:0 }
html[data-season="halloween"] .wake .cat-stretch .cat-tail {animation:skk-tail-up 1.7s ease-in-out both }
@keyframes skk-bow{0%{transform:scale(1,0.97)}45%{transform:scale(1.03,1.03) rotate(-1.5deg)}100%{transform:none}}
@keyframes skk-tail-up{0%,30%{transform:rotate(8deg)}60%{transform:rotate(-6deg)}100%{transform:rotate(3deg)}}
html[data-season="halloween"] .pet .cat-hd {animation:skk-pet 1.6s ease-in-out both }
html[data-season="halloween"] .pet .cat-eyes {animation:skk-eo 1.6s both }
html[data-season="halloween"] .pet .cat-happy {animation:skk-ac 1.6s both }
html[data-season="halloween"] .pet .cat-pup {animation:none }
html[data-season="halloween"] .pet .cat-tongue {animation:skk-tongue 1.6s ease-in-out both }
html[data-season="halloween"] .pet .cat-tail {animation-duration:0.5s }
html[data-season="halloween"] .cat-heart {transform:translate(24px,8px) }
html[data-season="halloween"] .pet .cat-heart.h1 {animation:skk-heart1 1.6s ease-out both }
html[data-season="halloween"] .pet .cat-heart.h2 {animation:skk-heart2 1.6s 0.2s ease-out both }
html[data-season="halloween"] .pet .cat-heart.h3 {animation:skk-heart3 1.6s 0.38s ease-out both }
@keyframes skk-pet{0%,100%{transform:none}15%,82%{transform:rotate(5deg) translateY(1.4px)}30%{transform:rotate(3deg) translateY(1px)}45%{transform:rotate(6deg) translateY(1.6px)}60%{transform:rotate(3.5deg) translateY(1.2px)}}
@keyframes skk-tongue{0%,14%{transform:scale(0)}24%,76%{transform:scale(1)}90%,100%{transform:scale(0)}}
@keyframes skk-heart1{0%{opacity:0;transform:translate(14px,10px) scale(0.4)}20%{opacity:1}100%{opacity:0;transform:translate(6px,-10px) scale(1.15)}}
@keyframes skk-heart2{0%{opacity:0;transform:translate(24px,7px) scale(0.4)}20%{opacity:1}100%{opacity:0;transform:translate(26px,-15px) scale(1.3)}}
@keyframes skk-heart3{0%{opacity:0;transform:translate(34px,10px) scale(0.4)}20%{opacity:1}100%{opacity:0;transform:translate(44px,-9px) scale(1.05)}}
html[data-season="halloween"] .sk-cat.intro {animation:skk-in 1.15s cubic-bezier(0.2,0.9,0.3,1) both }
@keyframes skk-in{from{opacity:0;transform:translateX(-84px) translateY(6px)}55%{opacity:1;transform:translateX(6px) translateY(0)}75%{transform:translateX(-2px) translateY(-5px)}to{transform:none}}
html[data-season="halloween"] .acc {display:none }
html[data-season="halloween"] .hat .acc-hat {display:inline }
html[data-season="halloween"] .hat .cat-zzz {transform:translate(5px,-3px) }
html[data-season="halloween"] .cat-gap {stroke:#2b2338 }
html[data-season="halloween"] .sk-cat :is(.cat-sit,.cat-nap,.cat-stretch) {transition-duration:0.15s }
html[data-season="halloween"] #play-bar.collapsing .sk-cat {opacity:0;transition:opacity 0.15s }
html[data-season="halloween"][data-theme="gold"] :is(.sk-cat,.cat-head) {filter:drop-shadow(0 0 1.1px rgba(244,196,48,0.75)) }
html[data-season="halloween"] .cat-head * {animation:none }
html[data-season="halloween"] .cat-head :where(.cat-eyes) {animation:skk-blink1 0.5s 0.9s both }
html[data-season="halloween"] .cat-pup circle {transform-box:fill-box;transform-origin:center }
html[data-season="halloween"] .hear .cat-sit .cat-hd {animation:skk-tilt 1.2s ease-in-out both }
html[data-season="halloween"] .hear .cat-sit .cat-ear-l {animation:skk-perk-l 1.2s ease-in-out both }
html[data-season="halloween"] .hear .cat-sit .cat-ear-r {animation:skk-perk-r 1.2s ease-in-out both }
html[data-season="halloween"] .hear .cat-sit .cat-pup {animation:none }
html[data-season="halloween"] .hear .cat-sit .cat-pup circle {animation:skk-wide 1.2s ease-in-out both }
html[data-season="halloween"] .flick .cat-nap .cat-ear-r {animation:skk-flick 0.8s ease-out both }
html[data-season="halloween"] .watch .cat-sit .cat-pup {animation:skk-watch 0.25s ease-out both }
html[data-season="halloween"] .watch .cat-sit .cat-hd {animation:skk-watch-hd 0.5s ease-out both }
html[data-season="halloween"] .purr .cat-sit {animation:skk-purr 0.1s linear infinite alternate }
html[data-season="halloween"] .purr .cat-sit .cat-hd {animation:skk-content 0.5s ease-out both }
html[data-season="halloween"] .purr .cat-sit .cat-eyes {animation:none;opacity:0 }
html[data-season="halloween"] .purr .cat-sit .cat-happy {opacity:1 }
html[data-season="halloween"] .purr .cat-sit .cat-tail {animation-duration:6s }
html[data-season="halloween"] .purr .cat-wave {animation:skk-hum 1s ease-in-out infinite }
html[data-season="halloween"] .grump .cat-sit .cat-hd {animation:skk-away 2.2s ease-in-out both }
html[data-season="halloween"] .grump .cat-sit .cat-ear-l {animation:skk-flat-l 2.2s ease-in-out both }
html[data-season="halloween"] .grump .cat-sit .cat-ear-r {animation:skk-flat-r 2.2s ease-in-out both }
html[data-season="halloween"] .grump .cat-sit .cat-eyes {animation:skk-squint 2.2s ease-in-out both }
html[data-season="halloween"] .grump .cat-sit .cat-pup {animation:skk-side 2.2s ease-in-out both }
html[data-season="halloween"] .grump .cat-sit .cat-tail {animation:skk-lash 0.3s ease-in-out 7 alternate }
html[data-season="halloween"] .grump .cat-sit .cat-tail path {animation:skk-puff 2.2s ease-in-out both }
html[data-season="halloween"] .sk-cat .fire {display:none }
html[data-season="halloween"] .hallow .fire {display:inline }
html[data-season="halloween"] .hallow .fire ellipse {fill:url(#skk-glow)none;transform-box:fill-box;transform-origin:50% 72%;animation:skk-flame 1.7s ease-in-out infinite }
html[data-season="halloween"] .hallow .fire ellipse+ellipse {animation-duration:1.3s;animation-delay:-0.6s }
html[data-season="halloween"] .hallow .cat-ball circle {fill:url(#skk-eye)#ffb21f }
html[data-season="halloween"] .hallow :is(.cat-happy,.cat-closed,.cat-shut) {stroke:#ffb21f }
html[data-season="halloween"] .hallow .cat-pup circle {transform:scale(0.42,1.5) }
html[data-season="halloween"] .hallow.hear .cat-sit .cat-pup circle {animation-name:skk-wide-slit }
html[data-season="halloween"] .evs {position:relative }
html[data-season="halloween"] .evs .cat-head {overflow:visible }
html[data-season="halloween"] .cheer .cat-head {transform-origin:50% 100%;animation:skk-hop 1.6s ease-in-out 3 both }
html[data-season="halloween"] .cheer .cat-head .cat-eyes {animation:none;opacity:0 }
html[data-season="halloween"] .cheer .cat-head .cat-happy {opacity:1 }
html[data-season="halloween"] .cheer .cat-head .cat-mouth {animation:skk-grin 1.6s ease-in-out 3 both }
html[data-season="halloween"] .cheer .cat-head .cat-ear-l {animation:skk-perk-l 1.6s ease-in-out 3 both }
html[data-season="halloween"] .cheer .cat-head .cat-ear-r {animation:skk-perk-r 1.6s ease-in-out 3 both }
html[data-season="halloween"] .evs::before,
html[data-season="halloween"] .evs::after {content:"";position:absolute;top:6px;left:6px;width:9px;height:9px;opacity:0;pointer-events:none;clip-path:var(--fx-star);background:radial-gradient(circle,var(--fx-core)0 24%,var(--fx-edge) 85%) }
html[data-season="halloween"] .evs::after {left:38px }
html[data-season="halloween"] .evs.cheer::before {animation:skk-star-l 1.6s 0.15s ease-out 3 both }
html[data-season="halloween"] .evs.cheer::after {animation:skk-star-r 1.6s 0.35s ease-out 3 both }
html[data-season="halloween"] .comfort .cat-head .cat-hd {animation:skk-tilt-soft 2.6s ease-in-out 2 both }
html[data-season="halloween"] .comfort .cat-head .cat-eyes {animation:skk-slow-blink 2.6s ease-in-out 2 both }
html[data-season="halloween"] .comfort .cat-head .cat-ear-l {animation:skk-soft-l 2.6s ease-in-out 2 both }
html[data-season="halloween"] .comfort .cat-head .cat-ear-r {animation:skk-soft-r 2.6s ease-in-out 2 both }
html[data-season="halloween"] .evs-pip.ring {animation:skk-ring 0.9s ease-out 2 }
@keyframes skk-flame{0%,100%{opacity:0.75;transform:none}17%{opacity:1;transform:scale(1.04,1.16)}34%{opacity:0.82;transform:scale(0.97,1.04)}52%{opacity:0.95;transform:scale(1.02,1.2)}70%{opacity:0.68;transform:scale(0.98,1.02)}86%{opacity:0.9;transform:scale(1.03,1.12)}}
@keyframes skk-blink1{0%,100%{transform:none}50%{transform:scaleY(0.08)}}
@keyframes skk-tilt{0%,100%{transform:none}22%,70%{transform:rotate(-9deg) translateY(-0.6px)}}
@keyframes skk-perk-l{0%,100%{transform:none}18%,72%{transform:rotate(6deg) scale(1.1)}}
@keyframes skk-perk-r{0%,100%{transform:none}18%,72%{transform:rotate(-6deg) scale(1.1)}}
@keyframes skk-wide{0%,100%{transform:none}18%,72%{transform:scale(1.45)}}
@keyframes skk-wide-slit{0%,100%{transform:scale(0.42,1.5)}18%,72%{transform:scale(1.3)}}
@keyframes skk-flick{0%,100%{transform:none}22%{transform:rotate(18deg)}48%{transform:rotate(-4deg)}70%{transform:rotate(7deg)}}
@keyframes skk-watch{to{transform:translate(1.7px,0.9px)}}
@keyframes skk-watch-hd{to{transform:rotate(2.5deg)}}
@keyframes skk-purr{to{transform:translateY(0.4px)}}
@keyframes skk-content{to{transform:rotate(3deg) translateY(0.6px)}}
@keyframes skk-hum{0%,100%{opacity:0.2}50%{opacity:0.85}}
@keyframes skk-away{0%,100%{transform:none}15%,80%{transform:rotate(-7deg) translateX(-1px)}}
@keyframes skk-flat-l{0%,100%{transform:none}12%,82%{transform:rotate(-34deg) scaleY(0.78)}}
@keyframes skk-flat-r{0%,100%{transform:none}12%,82%{transform:rotate(34deg) scaleY(0.78)}}
@keyframes skk-squint{0%,100%{transform:none}12%,82%{transform:scaleY(0.42)}}
@keyframes skk-side{0%,100%{transform:none}15%,82%{transform:translate(-1.8px,0.2px)}}
@keyframes skk-lash{from{transform:rotate(-12deg)}to{transform:rotate(16deg)}}
@keyframes skk-puff{0%,100%{stroke-width:3.4}12%,82%{stroke-width:6.2}}
@keyframes skk-hop{0%,100%{transform:none}10%{transform:scale(1.04,0.93)}24%{transform:translateY(-11%) scale(0.97,1.05)}38%{transform:scale(1.05,0.94)}50%{transform:translateY(-7%)}62%{transform:scale(1.02,0.97)}74%{transform:none}}
@keyframes skk-grin{0%,100%{transform:scale(0)}12%,80%{transform:scale(1.1,0.85)}}
@keyframes skk-star-l{from{opacity:0;transform:translate(6px,8px) scale(0.3)}30%{opacity:1}to{opacity:0;transform:translate(-4px,-6px) scale(1.1) rotate(60deg)}}
@keyframes skk-star-r{from{opacity:0;transform:translate(-6px,8px) scale(0.3)}30%{opacity:1}to{opacity:0;transform:translate(4px,-7px) scale(1.2) rotate(-70deg)}}
@keyframes skk-slow-blink{0%,100%{transform:none}30%,58%{transform:scaleY(0.1)}}
@keyframes skk-tilt-soft{0%,100%{transform:none}25%,72%{transform:rotate(7deg)}}
@keyframes skk-soft-l{0%,100%{transform:none}25%,72%{transform:rotate(-14deg)}}
@keyframes skk-soft-r{0%,100%{transform:none}25%,72%{transform:rotate(14deg)}}
@keyframes skk-ring{from{box-shadow:0 0 0 0 var(--ev-pk, var(--accent))}to{box-shadow:0 0 0 6px transparent}}
@keyframes skk-plop{from{opacity:0;transform:scale(0)}50%{opacity:1}to{transform:none}}
html[data-season="halloween"] .sk-cat:is(.asleep,.wake) .cat-sit *,
html[data-season="halloween"] .sk-cat:not(.asleep) .cat-nap *,
html[data-season="halloween"] .sk-cat:not(.wake) .cat-stretch * {animation-play-state:paused }
html[data-season="halloween"] #play-bar { position: relative; }
html[data-season="halloween"] .hatnew .acc-hat { transform-box: fill-box; transform-origin: 50% 100%; animation: skk-plop 0.6s cubic-bezier(0.2, 1.6, 0.4, 1) both; }
@media (prefers-reduced-motion: reduce) {
  html[data-season="halloween"] :is(.sk-cat, .cat-head, .evs-pip), html[data-season="halloween"] :is(.sk-cat, .cat-head) *,
  html[data-season="halloween"] .evs::before, html[data-season="halloween"] .evs::after { animation: none !important; transition: none !important; }
  html[data-season="halloween"] .cat-zzz path { opacity: 0.85; }
}
`;
  const VISITS_KEY = "jaardle:season:halloween:cat";   // hoe vaak hij al binnenhupte (de eerste drie bezoeken)
  const BUSY = ["asleep", "drowsy", "yawn", "wake", "meow", "pet", "hear", "purr", "grump"];   // dan reageert hij niet op typen of een gok
  const STATES = ["meow", "yawn", "drowsy", "wake", "pet", "hear", "watch", "purr", "grump"];
  // Echt tempo: ±30–50 s wakker (één miauw na 14–26 s), dan gapen (1,6 s) + slaperig (2 s) en 90–150 s slapen, dan rekken (1,7 s).
  // Op 31 oktober slaapt hij niet en miauwt hij telkens opnieuw.
  const PACE = { awake: [30000, 50000], sleep: [90000, 150000], meowAt: [14000, 26000] };

  let el = null, style = null, timers = [], live = false, night = false, streak = 0, lastTap = 0, watchT = 0, introT = 0, afterWake = null;
  const rnd = (a) => a[0] + Math.random() * (a[1] - a[0]);
  const reduced = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  // Wacht met een stap tot de tab én het speelveld in beeld zijn (na afloop klapt #play-bar in; dan hoeft er niets te gebeuren).
  function later(fn, ms) {
    const id = setTimeout(() => {
      timers = timers.filter((x) => x !== id);
      if (!el) return;
      if (document.hidden || !el.offsetParent) later(fn, 4000); else fn();
    }, ms);
    timers.push(id);
  }
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const has = (c) => el.classList.contains(c);
  const busy = () => BUSY.some(has);
  const drop = () => STATES.forEach((c) => el.classList.remove(c));
  function flash(c, ms) {
    el.classList.remove(c); void el.offsetWidth; el.classList.add(c);
    later(() => { if (el) el.classList.remove(c); }, ms);
  }

  // wakker → (miauw) → gaap → slaperig → slaapt → rekt zich → wakker …
  function mew() {
    later(() => {
      if (!busy()) { el.classList.remove("watch"); flash("meow", 1500); }
      if (night) mew();
    }, rnd(PACE.meowAt));
  }
  function awake() {
    clear(); drop(); el.classList.remove("asleep");
    mew();
    if (!night) later(sleepy, rnd(PACE.awake));
  }
  function sleepy() {
    clear(); drop();
    flash("yawn", 1600);
    later(() => { el.classList.remove("yawn"); el.classList.add("drowsy"); }, 1650);
    later(() => el.classList.add("asleep"), 3650);
    later(() => el.classList.remove("drowsy"), 4300);
    later(() => wake(), 4300 + rnd(PACE.sleep));
  }
  function wake(next) {
    clear();
    el.classList.remove("asleep"); el.classList.add("wake");
    afterWake = next || awake;
    later(() => { el.classList.remove("wake"); const f = afterWake; afterWake = null; f(); }, 1700);
  }
  // wat een tik doet: één of twee = aaien, drie keer snel = spinnen, zes keer snel = genoeg (oren plat, dikke staart)
  function pet() { clear(); drop(); flash("pet", 1600); later(awake, 1700); }
  function purr() { clear(); drop(); el.classList.add("purr"); later(() => { el.classList.remove("purr"); awake(); }, 1900); }
  function grump() { clear(); drop(); streak = 0; flash("grump", 2200); later(awake, 2300); }
  function tap() {
    if (!el) return;
    const now = Date.now();
    streak = now - lastTap < 900 ? streak + 1 : 1;
    lastTap = now;
    if (has("grump")) return;                                   // even uitboeken: niet opnieuw beginnen
    if (has("wake")) { afterWake = pet; return; }               // midden in het rekken: eerst afmaken, dan aaien
    if (has("asleep")) { streak = 0; clear(); drop(); wake(pet); return; }
    if (streak >= 6) { grump(); return; }
    if (has("purr")) return;                                    // spinnen wordt afgemaakt
    if (streak >= 3) { purr(); return; }
    if (has("pet")) return;                                     // spam-tikken: het aaien wordt afgemaakt, niet opnieuw gestart
    pet();
  }
  // Typen houdt hem wakker (de slaaptimer begint opnieuw) en hij kijkt naar je invoer.
  function stay() {
    if (night) return;
    clear(); mew(); later(sleepy, rnd(PACE.awake));
  }
  function type() {
    if (!el || !live || busy()) return;
    stay();
    el.classList.add("watch");
    clearTimeout(watchT);
    watchT = setTimeout(() => { if (el) el.classList.remove("watch"); }, 1600);
  }
  // Na een geaccepteerde gok spitst hij zijn oren en houdt hij zijn kopje schuin; slaapt hij, dan trilt alleen één oortje.
  // Hij reageert op elke gok hetzelfde: nooit op warm of koud.
  function guess() {
    if (!el || !live) return;
    if (has("asleep")) flash("flick", 800);
    else if (!busy()) { stay(); el.classList.remove("watch"); flash("hear", 1200); }
  }
  function set(o) {
    if (el && o && "hat" in o) el.classList[o.hat ? "add" : "remove"]("hat");
  }

  // Hoe vaak hij al binnenhupte: de eerste drie bezoeken (zonder localStorage: nooit).
  function introWanted() {
    try {
      const n = Number(localStorage.getItem(VISITS_KEY)) || 0;
      localStorage.setItem(VISITS_KEY, String(n + 1));
      return n < 3;
    } catch (e) { return false; }
  }

  // opts: { night: 31 oktober, hat: draagt een heksenhoed }
  function mount(opts) {
    const bar = document.getElementById("play-bar");
    if (!bar || el) return;
    style = document.createElement("style");
    style.setAttribute("data-season-cat", "");
    style.textContent = CSS;
    document.head.appendChild(style);
    el = document.createElement("div");
    el.className = "sk-cat";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = SIT + NAP + STRETCH + DEFS;
    night = !!(opts && opts.night);
    if (night) el.classList.add("hallow");
    if (opts && opts.hat) el.classList.add("hat");
    live = !reduced();
    const intro = live && introWanted();
    if (intro) el.classList.add("intro");
    bar.insertBefore(el, bar.firstChild);
    if (!live) { el.classList.add("asleep"); return; }   // minder beweging: hij slaapt stil, geen timers, geen tikken
    el.addEventListener("click", tap);
    if (intro) introT = setTimeout(() => { if (el) el.classList.remove("intro"); }, 1300);
    awake();
  }
  function unmount() {
    clear(); clearTimeout(watchT); clearTimeout(introT);
    if (el) el.remove();
    if (style) style.remove();
    el = style = null; live = false; streak = 0; afterWake = null;
  }
  return { mount, unmount, type, guess, set, css: CSS, head: HEAD };
})();
