// /ko.js (19/11/2026, db/208): ⚡ Knock-out, een live duel met levens. Lui geladen (game.js loadKo) zodra het nodig is: Live kiezen
// in het ▾-menu van Duels, een seintje over een knock-out (live.js → "jaardle:ko-rt"), of een knock-out-ronde na herladen.
// Bouwt op /duel.js (Duel.kit: band, gezichtjes, logo, CSS) en op het gewone rondescherm van game.js (startRound met state.duel.ko);
// duel.js stuurt sync/roundDone van een knock-out-ronde hierheen.
// De server (db/208) is de baas: hij rekent rondes af, ook als de klok verloopt. Deze module laat alleen zien wat ko_get zegt:
// apply(g) brengt het scherm in lijn met de stand. Seintjes (event 'ko', k = invite | start | done | round | end | rematch | next |
// declined | cancelled | expired | g) zijn alleen een reden om opnieuw te kijken; k = 'g' (de ander gokte, n gokken) tekent direct.
(() => {
  if (window.KO) return;
  const D = window.Duel, K = D.kit;
  const ID = "modal-ko", HP = 100;

  const TXT = {
    nl: { live: "Live · knock-out", liveSub: (n) => `Nu tegelijk, 100 levens · ${n} is online`, tag: "Knock-out", noResp: "Geen reactie",
      waitH: (n) => `Wachten op ${n}…`, waitP: "Neemt die binnen 30 s aan, dan begint het meteen.", left: (s) => `nog ${s} s`, cancel: "Annuleer",
      lateH: (n) => `${n} reageert niet`, declH: (n) => `${n} kan nu niet`, lateP: "Misschien zit die niet achter de telefoon.", again: "⚡ Nog eens vragen",
      turn: "⚔️ Speel om de beurt", turnSub: (n) => `5 rondes, ${n} speelt wanneer het uitkomt`, never: "Laat maar",
      invH: (n) => `${n} wil nú een knock-out`, lives: "levens", same: "dezelfde vraag, tegelijk", mins: "±5 min", join: "Doe mee", notNow: "Niet nu",
      startH: "Knock-out!", revH: "Revanche!", startP: "Ronde 1 begint zo", roundN: (r) => `Ronde ${r}`,
      guessing: (n) => `${n} gokt`, thinking: (n) => `${n} denkt na`, oppDone: (n) => `${n} is klaar ✓`, waitOpp: (n) => `Wachten op ${n}`,
      rFor: (r, n) => `Ronde ${r} voor ${n}`, rForMe: (r) => `Ronde ${r} voor jou`, rTie: (r) => `Ronde ${r}: gelijk`, you: "Jij", youL: "jij",
      math: (a, b, d, m, r, x) => `${a} − ${b} = ${d}, × ${m} in ronde ${r} = ${x}`, tieMath: "Geen schade",
      next: (r, s, m) => `Ronde ${r} begint over ${s} s · ×${m}`,
      koWin: "K.O.! Jij wint", koLoss: (n) => `K.O. ${n} wint`, draw: "Gelijkspel",
      koPWin: (n, r, hp) => `${n} ging in ronde ${r} naar 0. Jij hield ${hp} levens over.`, koPLoss: (n, r, hp) => `Jij ging in ronde ${r} naar 0. ${n} hield ${hp} levens over.`,
      gaveUp: (n) => `${n} stopte.`, youGaveUp: "Je stopte.", drawP: "Na 12 rondes even veel levens.",
      rematch: "⚡ Revanche", wantsToo: "wil ook", rematchWait: (n) => `Wacht op ${n}…`, rematchHint: "Druk je allebei, dan begint hij meteen", toDuels: "Naar Duels",
      isKo: (n) => `${n} is knock-out`, youKo: "Jij bent knock-out", gone: "Deze knock-out is gestopt.", err: "Dat lukte niet. Probeer het nog eens.", close: "Sluiten",
      itWas: "Het was" },
    en: { live: "Live · knockout", liveSub: (n) => `Right now, 100 lives · ${n} is online`, tag: "Knockout", noResp: "No answer",
      waitH: (n) => `Waiting for ${n}…`, waitP: "If they accept within 30 s, it starts right away.", left: (s) => `${s} s left`, cancel: "Cancel",
      lateH: (n) => `${n} isn't answering`, declH: (n) => `${n} can't right now`, lateP: "Maybe they're away from their phone.", again: "⚡ Ask again",
      turn: "⚔️ Play in turns", turnSub: (n) => `5 rounds, ${n} plays whenever it suits`, never: "Never mind",
      invH: (n) => `${n} wants a knockout now`, lives: "lives", same: "same question, same time", mins: "±5 min", join: "Join", notNow: "Not now",
      startH: "Knockout!", revH: "Rematch!", startP: "Round 1 starts in a moment", roundN: (r) => `Round ${r}`,
      guessing: (n) => `${n} is guessing`, thinking: (n) => `${n} is thinking`, oppDone: (n) => `${n} is done ✓`, waitOpp: (n) => `Waiting for ${n}`,
      rFor: (r, n) => `Round ${r} to ${n}`, rForMe: (r) => `Round ${r} to you`, rTie: (r) => `Round ${r}: a tie`, you: "You", youL: "you",
      math: (a, b, d, m, r, x) => `${a} − ${b} = ${d}, × ${m} in round ${r} = ${x}`, tieMath: "No damage",
      next: (r, s, m) => `Round ${r} starts in ${s} s · ×${m}`,
      koWin: "K.O.! You win", koLoss: (n) => `K.O. ${n} wins`, draw: "A draw",
      koPWin: (n, r, hp) => `${n} hit 0 in round ${r}. You had ${hp} lives left.`, koPLoss: (n, r, hp) => `You hit 0 in round ${r}. ${n} had ${hp} lives left.`,
      gaveUp: (n) => `${n} stopped.`, youGaveUp: "You stopped.", drawP: "Same lives after 12 rounds.",
      rematch: "⚡ Rematch", wantsToo: "wants one too", rematchWait: (n) => `Waiting for ${n}…`, rematchHint: "If you both tap, it starts right away", toDuels: "To Duels",
      isKo: (n) => `${n} is knocked out`, youKo: "You're knocked out", gone: "This knockout has stopped.", err: "That didn't work. Please try again.", close: "Close",
      itWas: "It was" },
    de: { live: "Live · Knock-out", liveSub: (n) => `Jetzt gleichzeitig, 100 Leben · ${n} ist online`, tag: "Knock-out", noResp: "Keine Antwort",
      waitH: (n) => `Warte auf ${n}…`, waitP: "Nimmt die Person innerhalb von 30 s an, geht es sofort los.", left: (s) => `noch ${s} s`, cancel: "Abbrechen",
      lateH: (n) => `${n} antwortet nicht`, declH: (n) => `${n} kann gerade nicht`, lateP: "Vielleicht ist das Handy gerade weg.", again: "⚡ Noch mal fragen",
      turn: "⚔️ Abwechselnd spielen", turnSub: (n) => `5 Runden, ${n} spielt, wann es passt`, never: "Lass gut sein",
      invH: (n) => `${n} will jetzt einen Knock-out`, lives: "Leben", same: "gleiche Frage, gleichzeitig", mins: "±5 Min.", join: "Mitmachen", notNow: "Nicht jetzt",
      startH: "Knock-out!", revH: "Revanche!", startP: "Runde 1 beginnt gleich", roundN: (r) => `Runde ${r}`,
      guessing: (n) => `${n} rät`, thinking: (n) => `${n} überlegt`, oppDone: (n) => `${n} ist fertig ✓`, waitOpp: (n) => `Warte auf ${n}`,
      rFor: (r, n) => `Runde ${r} für ${n}`, rForMe: (r) => `Runde ${r} für dich`, rTie: (r) => `Runde ${r}: unentschieden`, you: "Du", youL: "du",
      math: (a, b, d, m, r, x) => `${a} − ${b} = ${d}, × ${m} in Runde ${r} = ${x}`, tieMath: "Kein Schaden",
      next: (r, s, m) => `Runde ${r} beginnt in ${s} s · ×${m}`,
      koWin: "K.O.! Du gewinnst", koLoss: (n) => `K.O. ${n} gewinnt`, draw: "Unentschieden",
      koPWin: (n, r, hp) => `${n} fiel in Runde ${r} auf 0. Du hattest noch ${hp} Leben.`, koPLoss: (n, r, hp) => `Du fielst in Runde ${r} auf 0. ${n} hatte noch ${hp} Leben.`,
      gaveUp: (n) => `${n} hat aufgehört.`, youGaveUp: "Du hast aufgehört.", drawP: "Nach 12 Runden gleich viele Leben.",
      rematch: "⚡ Revanche", wantsToo: "will auch", rematchWait: (n) => `Warte auf ${n}…`, rematchHint: "Tippt ihr beide, geht es sofort los", toDuels: "Zu den Duellen",
      isKo: (n) => `${n} ist knock-out`, youKo: "Du bist knock-out", gone: "Dieser Knock-out wurde beendet.", err: "Das hat nicht geklappt. Versuch es noch mal.", close: "Schließen",
      itWas: "Es war" },
    es: { live: "En vivo · K.O.", liveSub: (n) => `Ahora a la vez, 100 vidas · ${n} está en línea`, tag: "K.O.", noResp: "Sin respuesta",
      waitH: (n) => `Esperando a ${n}…`, waitP: "Si acepta en 30 s, empieza enseguida.", left: (s) => `quedan ${s} s`, cancel: "Cancelar",
      lateH: (n) => `${n} no responde`, declH: (n) => `${n} no puede ahora`, lateP: "Quizá no está con el móvil.", again: "⚡ Volver a preguntar",
      turn: "⚔️ Jugar por turnos", turnSub: (n) => `5 rondas, ${n} juega cuando le venga bien`, never: "Déjalo",
      invH: (n) => `${n} quiere un K.O. ahora`, lives: "vidas", same: "la misma pregunta, a la vez", mins: "±5 min", join: "Jugar", notNow: "Ahora no",
      startH: "¡K.O.!", revH: "¡Revancha!", startP: "La ronda 1 empieza enseguida", roundN: (r) => `Ronda ${r}`,
      guessing: (n) => `${n} está adivinando`, thinking: (n) => `${n} está pensando`, oppDone: (n) => `${n} ha terminado ✓`, waitOpp: (n) => `Esperando a ${n}`,
      rFor: (r, n) => `Ronda ${r} para ${n}`, rForMe: (r) => `Ronda ${r} para ti`, rTie: (r) => `Ronda ${r}: empate`, you: "Tú", youL: "tú",
      math: (a, b, d, m, r, x) => `${a} − ${b} = ${d}, × ${m} en la ronda ${r} = ${x}`, tieMath: "Sin daño",
      next: (r, s, m) => `La ronda ${r} empieza en ${s} s · ×${m}`,
      koWin: "¡K.O.! Ganas tú", koLoss: (n) => `K.O. Gana ${n}`, draw: "Empate",
      koPWin: (n, r, hp) => `${n} llegó a 0 en la ronda ${r}. Te quedaban ${hp} vidas.`, koPLoss: (n, r, hp) => `Llegaste a 0 en la ronda ${r}. A ${n} le quedaban ${hp} vidas.`,
      gaveUp: (n) => `${n} lo dejó.`, youGaveUp: "Lo dejaste.", drawP: "Mismas vidas tras 12 rondas.",
      rematch: "⚡ Revancha", wantsToo: "también quiere", rematchWait: (n) => `Esperando a ${n}…`, rematchHint: "Si pulsáis los dos, empieza enseguida", toDuels: "A Duelos",
      isKo: (n) => `${n} está K.O.`, youKo: "Estás K.O.", gone: "Este K.O. se ha detenido.", err: "No ha funcionado. Inténtalo otra vez.", close: "Cerrar",
      itWas: "Era" },
    pt: { live: "Ao vivo · nocaute", liveSub: (n) => `Agora ao mesmo tempo, 100 vidas · ${n} está online`, tag: "Nocaute", noResp: "Sem resposta",
      waitH: (n) => `Esperando ${n}…`, waitP: "Se aceitar em 30 s, começa na hora.", left: (s) => `faltam ${s} s`, cancel: "Cancelar",
      lateH: (n) => `${n} não responde`, declH: (n) => `${n} não pode agora`, lateP: "Talvez esteja longe do celular.", again: "⚡ Perguntar de novo",
      turn: "⚔️ Jogar por turnos", turnSub: (n) => `5 rodadas, ${n} joga quando puder`, never: "Deixa pra lá",
      invH: (n) => `${n} quer um nocaute agora`, lives: "vidas", same: "a mesma pergunta, ao mesmo tempo", mins: "±5 min", join: "Jogar", notNow: "Agora não",
      startH: "Nocaute!", revH: "Revanche!", startP: "A rodada 1 já vai começar", roundN: (r) => `Rodada ${r}`,
      guessing: (n) => `${n} está chutando`, thinking: (n) => `${n} está pensando`, oppDone: (n) => `${n} terminou ✓`, waitOpp: (n) => `Esperando ${n}`,
      rFor: (r, n) => `Rodada ${r} para ${n}`, rForMe: (r) => `Rodada ${r} para você`, rTie: (r) => `Rodada ${r}: empate`, you: "Você", youL: "você",
      math: (a, b, d, m, r, x) => `${a} − ${b} = ${d}, × ${m} na rodada ${r} = ${x}`, tieMath: "Sem dano",
      next: (r, s, m) => `A rodada ${r} começa em ${s} s · ×${m}`,
      koWin: "K.O.! Você venceu", koLoss: (n) => `K.O. ${n} venceu`, draw: "Empate",
      koPWin: (n, r, hp) => `${n} chegou a 0 na rodada ${r}. Você ficou com ${hp} vidas.`, koPLoss: (n, r, hp) => `Você chegou a 0 na rodada ${r}. ${n} ficou com ${hp} vidas.`,
      gaveUp: (n) => `${n} parou.`, youGaveUp: "Você parou.", drawP: "Mesmas vidas após 12 rodadas.",
      rematch: "⚡ Revanche", wantsToo: "também quer", rematchWait: (n) => `Esperando ${n}…`, rematchHint: "Se os dois tocarem, começa na hora", toDuels: "Para Duelos",
      isKo: (n) => `${n} levou nocaute`, youKo: "Você levou nocaute", gone: "Este nocaute parou.", err: "Não deu certo. Tente de novo.", close: "Fechar",
      itWas: "Era" },
  };

  const CSS = String.raw`/* ═══ ⚡ Knock-out (/ko.js, db/208) ═══ */
:root { --ko-me: var(--db-me); --ko-lag: #f2c14e; }
html[data-theme="light"] { --ko-lag: #d9a21b; }
#duel-vs.ko { --ko-op: hsl(var(--h, 30) 58% 46%); display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: end; gap: 0.2rem 0.55rem;
  padding: 0.55rem 0.7rem 0.5rem; margin-bottom: 0.6rem; border-radius: 12px; background: var(--card); overflow: hidden; }
html[data-theme="light"] #duel-vs.ko { --ko-op: hsl(var(--h, 30) 58% 42%); }
.ko-side { --col: var(--ko-me); min-width: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.ko-side.op { --col: var(--ko-op); }
.ko-who { display: flex; align-items: center; gap: 0.4rem; min-width: 0; }
.ko-side.op .ko-who { flex-direction: row-reverse; }
.ko-who > b { min-width: 0; font-size: 0.86rem; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ko-n { margin-left: auto; font-size: 1.15rem; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.ko-side.op .ko-n { margin-left: 0; margin-right: auto; }
.ko-n.hit { color: var(--duel-loss); }
.ko-bar { position: relative; height: 0.7rem; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--muted) 22%, transparent); }
.ko-bar > i { position: absolute; top: 0; bottom: 0; left: 0; border-radius: inherit; }
.ko-side.op .ko-bar > i { left: auto; right: 0; }
.ko-lag { width: calc(var(--was, var(--hp)) * 1%); background: var(--ko-lag); }
.ko-fill { width: calc(var(--hp) * 1%); background: var(--col); }
.ko-side.low .ko-fill { animation: ko-low 0.9s ease-in-out infinite alternate; }
.ko-side.drain .ko-fill { animation: ko-drop 0.35s ease-out 0.5s both; }
.ko-side.drain .ko-lag { animation: ko-drop 0.7s ease-in 1.3s both; }
.ko-mid { align-self: center; display: flex; flex-direction: column; align-items: center; gap: 0.05rem; line-height: 1.1; }
.ko-mid b { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); white-space: nowrap; }
.ko-mid span { font-size: 0.95rem; font-weight: 800; color: var(--fg); font-variant-numeric: tabular-nums; }
.ko-mid span.up { color: var(--duel-arena); }
.ko-st { grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; gap: 0.4rem; min-height: 1.6rem; margin-top: 0.2rem; font-size: 0.8rem; color: var(--muted); }
.ko-st b { color: var(--fg); }
.ko-pips { display: inline-flex; gap: 3px; }
.ko-pips i { width: 6px; height: 6px; border-radius: 50%; background: color-mix(in srgb, var(--muted) 35%, transparent); }
.ko-pips i.on { background: var(--ko-op); }
.ko-dots { display: inline-flex; gap: 2px; }
.ko-dots i { width: 4px; height: 4px; border-radius: 50%; background: currentColor; animation: ko-dot 1.1s ease-in-out infinite; }
.ko-dots i:nth-child(2) { animation-delay: 0.15s; }
.ko-dots i:nth-child(3) { animation-delay: 0.3s; }
.ko-st.clock { color: var(--fg); font-weight: 600; }
.ko-t { min-width: 2.6em; padding: 0.05rem 0.45rem; border-radius: 999px; font-weight: 800; font-variant-numeric: tabular-nums; text-align: center;
  color: var(--duel-arena-on); background: var(--duel-arena); }
.ko-t.last { animation: ko-tick 0.5s ease-in-out infinite alternate; }
.ko-clock { grid-column: 1 / -1; height: 3px; margin: 0 -0.7rem -0.5rem; background: color-mix(in srgb, var(--muted) 18%, transparent); }
.ko-clock > i { display: block; height: 100%; background: var(--duel-arena); transform-origin: left; }
.ko-res { display: flex; flex-direction: column; gap: 0.55rem; text-align: center; }
.ko-dmg { margin: 0; font-size: 1.05rem; font-weight: 800; }
.ko-dmg .me { color: var(--duel-me); }
.ko-dmg .op { color: hsl(var(--h, 30) 72% 66%); }
html[data-theme="light"] .ko-dmg .op { color: hsl(var(--h, 30) 62% 38%); }
.ko-dmg em { font-style: normal; color: var(--duel-loss); }
.ko-math { margin: -0.3rem 0 0; font-size: 0.82rem; color: var(--muted); }
.ko-math b { color: var(--fg); }
.ko-next { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; min-height: 2.75rem; border-radius: 10px;
  font-size: 0.9rem; font-weight: 700; color: var(--fg); background: var(--card-soft); }
.ko-next::before { content: ""; position: absolute; inset: 0; background: color-mix(in srgb, var(--duel-arena) 22%, transparent); transform-origin: left; animation: ko-fill var(--dur, 5s) linear both; }
.ko-next > * { position: relative; }
.ko-wait { position: relative; align-self: stretch; display: flex; align-items: center; justify-content: center; min-height: 2.75rem; border-radius: 10px; overflow: hidden;
  font-size: 0.9rem; color: var(--muted); background: var(--card-soft); }
.ko-wait > i { position: absolute; inset: 0; background: color-mix(in srgb, var(--duel-arena) 22%, transparent); transform-origin: left; animation: ko-run var(--dur, 30s) linear both; }
.ko-wait > span { position: relative; }
.ko-wait b { color: var(--fg); font-variant-numeric: tabular-nums; }
.ko-rules { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.3rem; }
.ko-rules span { padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.78rem; color: var(--muted); background: var(--card-soft); white-space: nowrap; }
.ko-rules b { color: var(--fg); }
.ko-go { position: relative; overflow: hidden; }
.ko-go .ko-left { margin-left: 0.4rem; font-variant-numeric: tabular-nums; opacity: 0.85; font-weight: 600; }
.ko-go::after { content: ""; position: absolute; left: 0; bottom: 0; height: 3px; width: 100%; background: currentColor; opacity: 0.35; transform-origin: left; animation: ko-run var(--dur, 30s) linear both; }
.duel-inv .duel-go.ko-alt { color: var(--fg); background: transparent; box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--muted) 55%, transparent); }
.duel-inv .ko-alt-sub { margin-top: -0.4rem; font-size: 0.78rem; }
.vb .vb-badge.ko-z { font-size: 0.95rem; }
.vbf-tag.ko-tag { font-size: 0.8rem; letter-spacing: 0.12em; }
.vb.ko-end { --p: 64%; }
.vb.ko-end.lost { --p: 36%; }
.vb.ko-end:not(.lost) .vb-op, .vb.ko-end.lost .vb-me, .vb.ko-idle .vb-op { filter: grayscale(0.85) brightness(0.6); }
.vb.ko-end:not(.lost) .vb-side.op, .vb.ko-end.lost .vb-side.me, .vb.ko-idle .vb-side.op { filter: grayscale(1); opacity: 0.6; }
.ko-rounds { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.3rem; }
.ko-rounds span { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 0.76rem; font-variant-numeric: tabular-nums;
  background: var(--card-soft); color: var(--muted); }
.ko-rounds span.me b { color: var(--duel-me); }
.ko-rounds span.op b { color: hsl(var(--h, 30) 72% 66%); }
html[data-theme="light"] .ko-rounds span.op b { color: hsl(var(--h, 30) 62% 38%); }
.duel-go.ko-rev { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; }
.ko-want { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.1rem 0.55rem 0.1rem 0.35rem; border-radius: 999px; font-size: 0.78rem; font-weight: 700;
  background: color-mix(in srgb, var(--duel-arena-on) 16%, transparent); animation: ko-tick 0.6s ease-in-out infinite alternate; }
.duel-inv .ko-count { margin: 0; font-size: 3.2rem; font-weight: 900; line-height: 1; color: var(--duel-arena); font-variant-numeric: tabular-nums; }
.dl-opt.ko-opt b { color: var(--duel-arena); }
@keyframes ko-run { from { transform: scaleX(1); } to { transform: scaleX(0); } }
@keyframes ko-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes ko-dot { 0%, 60%, 100% { opacity: 0.3; transform: none; } 30% { opacity: 1; transform: translateY(-2px); } }
@keyframes ko-tick { to { transform: scale(1.12); } }
@keyframes ko-low { to { opacity: 0.55; } }
@keyframes ko-drop { from { width: calc(var(--was) * 1%); } to { width: calc(var(--hp) * 1%); } }
@media (prefers-reduced-motion: reduce) {
  .ko-dots i, .ko-t.last, .ko-side.low .ko-fill, .ko-want { animation: none; }
  .ko-side.drain .ko-fill, .ko-side.drain .ko-lag { animation-duration: 0.01s; }
}`;

  let H = null, cur = null, skew = 0, oppN = 0, shownRes = null, sentRound = null, revNext = null, counting = null;
  let tClock = null, tTick = null, tStart = null, tPop = null;
  const tx = () => TXT[H?.lang] || TXT.en;
  const esc = K.esc;
  const now = () => Date.now() + skew;
  const at = (iso) => (iso ? Date.parse(iso) : 0);
  const mult = (r) => (r <= 2 ? 1 : r === 3 ? 1.5 : r === 4 ? 2 : r === 5 ? 2.5 : 3);
  const fmtM = (m) => m.toLocaleString(H?.intl || "en");
  const oppName = (g) => g?.opp_name || "?";
  const hue = (g) => (H?.faceHue ? H.faceHue(oppName(g)) : 30);

  function ensureCss() {
    K.ensureCss();
    if (document.getElementById("ko-css")) return;
    const st = document.createElement("style");
    st.id = "ko-css"; st.textContent = CSS;
    document.head.appendChild(st);
  }
  async function call(fn, args) {
    try { return { ok: true, v: await H.rpc(fn, args) }; } catch (e) { return { ok: false, e: String(e?.message || e) }; }
  }
  function clearTimers() { [tClock, tTick, tStart, tPop].forEach((t) => { clearInterval(t); clearTimeout(t); }); tClock = tTick = tStart = tPop = null; }

  // ── geluid (19/11): alleen met ⚙️ ⚔️ Duel-geluid aan. De motor (bus, wakker maken, bouwstenen, de ⚔️-klang "hit") staat in duel.js
  // (K.au), de klanken van de knock-out hier. Elk moment klinkt één keer (heard: code:ronde:…), want apply() en drawStrip() lopen bij
  // elk seintje en elk antwoord opnieuw. Geen bus (uit, tab weg, geen Web Audio) = stil; een fout = stil.
  const A = K.au || {}, heard = new Set();
  function beep(b, at, f, g, dur) {   // een korte zuivere piep (driehoek: zacht, maar hij draagt op een telefoon)
    const x = b.context, t = x.currentTime + at, o = x.createOscillator(), e = x.createGain();
    o.type = "triangle"; o.frequency.value = f;
    e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.006); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(e); e.connect(b); o.start(t); o.stop(t + dur + 0.02);
  }
  function gong(b, at, f, g, len) {   // de grote klang van de K.O.: als ring in duel.js, maar lager en langer uitzingend
    const x = b.context, t = x.currentTime + at;
    for (const [r, a, d] of [[1, 1, 1], [1.47, 0.7, 0.8], [2.09, 0.5, 0.62], [2.76, 0.4, 0.5], [3.62, 0.28, 0.36], [4.95, 0.16, 0.24]]) {
      for (const det of [-6, 6]) {
        const o = x.createOscillator(), e = x.createGain();
        o.frequency.value = f * r; o.detune.value = det;
        e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g * a / 2, t + 0.004); e.gain.exponentialRampToValueAtTime(0.0001, t + len * d);
        o.connect(e); e.connect(b); o.start(t); o.stop(t + len * d + 0.02);
      }
    }
  }
  const SFX = {
    invite: (b) => { A.ring(b, 0, 1320, 0.14); A.ring(b, 0.16, 1760, 0.18); },   // je wordt uitgedaagd: ting-TING, omhoog
    count: (b) => beep(b, 0, 880, 0.2, 0.12),   // 3, 2, 1
    go: (b) => A.play(b, "hit"),   // ⚡: de ⚔️-klang van de opening van een duel
    clock: (b) => { beep(b, 0, 1397, 0.16, 0.08); beep(b, 0.12, 1397, 0.16, 0.12); },   // de ander is klaar, jouw klok loopt: piep-piep
    tick: (b, s) => A.tick(b, 0, s % 2 ? 2600 : 3400, 0.06 + (5 - s) * 0.02, 0.04),   // de laatste 5 s: tik-tak, steeds iets harder
    // schade: een doffe klap als de balk begint te zakken (ko-drop wacht 0,5 s), harder bij meer schade, aan de kant van wie hem krijgt
    hit: (b, x, me) => { const k = Math.min(1, x / 60), p = me ? -0.4 : 0.4; A.thud(b, 0.5, me ? 170 : 220, 45, 0.4 + 0.45 * k, 0.22 + 0.2 * k); A.swish(b, 0.5, 0.14, 1200, 260, 0.12 + 0.2 * k, 0.08, p, p); },
    ko: (b, won) => {   // K.O.: klap + gong (winst hoger, met de ⚔️-klang erbovenop; verlies lager en kaal), daarna een vallende zwiep
      A.thud(b, 0, 140, 36, 0.95, 0.6); A.tick(b, 0, 2400, 0.3, 0.09); gong(b, 0, won ? 247 : 175, 0.42, 2.6);
      if (won) A.ring(b, 0.01, 1180, 0.24);
      A.swish(b, 0.03, 0.9, 1600, 160, 0.14, 0.06, 0, 0);
    },
    draw: (b) => A.ring(b, 0, 1180, 0.16),   // gelijkspel: alleen een zachte klang
    want: (b, at = 0) => { A.ring(b, at, 2349, 0.09); A.ring(b, at + 0.09, 2794, 0.08); },   // de ander wil revanche: belletje
  };
  function sfx(key, kind, ...a) {   // true = dit moment is nieuw (ook met het geluid uit; dan blijft het gewoon stil)
    if (heard.has(key)) return false;
    heard.add(key);
    if (heard.size > 200) heard.delete(heard.values().next().value);
    try { const b = A.bus?.(); if (b) { SFX[kind](b, ...a); A.nap?.(15000); } } catch (e) {}
    return true;
  }

  // ── de pop-ups (uitnodiging, wachten, geen reactie, aftellen, K.O.) ──
  function band(g, tag, cls = "") {
    K.setHost(H);
    return K.bandHtml(tx(), oppName(g), g.opp_flair, { poster: true, tag })
      .replace('class="vb vbf', `class="vb vbf${cls}`).replace('<span class="vb-badge">⚔️</span>', '<span class="vb-badge ko-z">⚡</span>')
      .replace('class="vbf-tag"', 'class="vbf-tag ko-tag"');
  }
  function pop(inner, onClick) {
    clearInterval(tPop); tPop = null;
    let el = document.getElementById(ID);
    if (!el) {
      el = document.createElement("div");
      el.id = ID; el.className = "modal"; el.hidden = true;
      el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "ko-title");
      document.body.appendChild(el);
    }
    el.innerHTML = `<div class="modal-backdrop"></div><div class="modal-card duel-pop"><section class="duel-inv">${inner}</section></div>`;
    el.querySelector("h2")?.setAttribute("id", "ko-title");
    el.onclick = (e) => { const b = e.target.closest("[data-ko]"); if (b) onClick(b.dataset.ko, b); };
    if (el.hidden) H.openModal(ID, { over: true });
    return el;
  }
  function closePop() {
    clearInterval(tPop); tPop = null;
    const el = document.getElementById(ID);
    if (el && !el.hidden) H.closeModal(ID);
  }
  // een getal dat aftelt tot een moment (server-tijd); klaar() bij 0
  function countdown(el, until, fmt, klaar) {
    const tick = () => {
      const s = Math.max(0, Math.ceil((until - now()) / 1000));
      if (el) el.textContent = fmt(s);
      if (s <= 0) { clearInterval(tPop); tPop = null; klaar?.(); }
    };
    tick();
    tPop = setInterval(tick, 250);
  }

  // Jij daagt uit (▾ → Live bij een gezichtje dat online is)
  async function invite(host, k, name) {
    H = host; ensureCss();
    K.gc("ko-invite", "Knockout: invited");
    const r = await call("ko_invite", { p_k: k });
    if (!r.ok || !r.v) return pop(`<h2>${esc(tx().err)}</h2><button type="button" class="duel-no" data-ko="close">${esc(tx().close)}</button>`, () => closePop());
    apply(r.v);
  }
  function showWait(g) {
    const T = tx(), left = Math.max(0, at(g.invite_until) - now());
    const el = pop(band(g, T.tag) + `<h2>${esc(T.waitH(oppName(g)))}</h2><p>${esc(T.waitP)}</p>` +
      `<div class="ko-wait" style="--dur:${left}ms"><i></i><span><b class="ko-s"></b></span></div><button type="button" class="duel-no" data-ko="cancel">${esc(T.cancel)}</button>`,
      async (act) => { if (act === "cancel") { closePop(); await call("ko_cancel", { p_code: g.code }); } });
    countdown(el.querySelector(".ko-s"), at(g.invite_until), (s) => T.left(s), () => setTimeout(() => refresh(g.code), 1200));
  }
  function showLate(g) {
    const T = tx(), n = oppName(g);
    pop(band(g, T.noResp, " ko-idle") + `<h2>${esc(g.state === "declined" ? T.declH(n) : T.lateH(n))}</h2><p>${esc(T.lateP)}</p>` +
      `<button type="button" class="duel-go" data-ko="again">${esc(T.again)}</button><button type="button" class="duel-go ko-alt" data-ko="turn">${esc(T.turn)}</button>` +
      `<p class="ko-alt-sub">${esc(T.turnSub(n))}</p><button type="button" class="duel-no" data-ko="close">${esc(T.never)}</button>`,
      (act) => {
        if (act === "again") return invite(H, g.opp, n);
        closePop();
        if (act === "turn") { K.gc("ko-turn", "Knockout: fell back to a turn duel"); K.create(H, { forK: g.opp, forName: n }); }
      });
  }
  // Jij wordt uitgedaagd: overal in Jaardle, 30 s
  function showInvite(g) {
    const T = tx();
    const left = Math.max(0, at(g.invite_until) - now());
    sfx(`inv:${g.code}`, "invite");
    const el = pop(band(g, T.tag) + `<h2>${esc(T.invH(oppName(g)))}</h2>` +
      `<div class="ko-rules"><span>❤️ <b>${HP}</b> ${esc(T.lives)}</span><span>${esc(T.same)}</span><span>${esc(T.mins)}</span></div>` +
      `<button type="button" class="duel-go ko-go" data-ko="yes" style="--dur:${left}ms">${esc(T.join)}<span class="ko-left"></span></button>` +
      `<button type="button" class="duel-no" data-ko="no">${esc(T.notNow)}</button>`,
      async (act, b) => {
        b.disabled = true;
        K.gc(act === "yes" ? "ko-accept" : "ko-decline", act === "yes" ? "Knockout: accepted" : "Knockout: declined");
        const r = await call("ko_answer", { p_code: g.code, p_yes: act === "yes" });
        if (act !== "yes") return closePop();
        if (r.ok && r.v) apply(r.v); else closePop();
      });
    countdown(el.querySelector(".ko-left"), at(g.invite_until), (s) => `0:${String(s).padStart(2, "0")}`, () => closePop());
  }
  // Ronde 1 (of de revanche) begint: kort aftellen, dan het rondescherm
  function showCount(g, rev) {
    const T = tx();
    const el = pop(band(g, rev ? T.revH : T.tag) + `<h2>${esc(rev ? T.revH : T.startH)}</h2><p class="ko-count">3</p><p>${esc(T.startP)}</p>`, () => {});
    countdown(el.querySelector(".ko-count"), at(g.round_at), (s) => { if (s > 0) sfx(`c:${g.code}:${s}`, "count"); return s > 0 ? String(s) : "⚡"; });
  }

  // ── het rondescherm ──
  function stripHtml(g, { drain = null } = {}) {
    const T = tx(), st = H.state(), n = oppName(g), r = g.round;
    const side = (who, name, av, hp, was) => {
      const cls = ["ko-side", who, hp <= 25 ? "low" : "", was != null && was !== hp ? "drain" : ""].filter(Boolean).join(" ");
      return `<div class="${cls}" style="--hp:${hp};--was:${was ?? hp}"><span class="ko-who">${av}<b>${esc(name)}</b>` +
        `<b class="ko-n${was != null && was !== hp ? " hit" : ""}">${hp}</b></span><span class="ko-bar"><i class="ko-lag"></i><i class="ko-fill"></i></span></div>`;
    };
    const me = K.dbAv(K.meFlair(), K.meNameOr(T, T.you)), op = K.dbAv(g.opp_flair, n);
    const pips = (k) => `<span class="ko-pips" aria-hidden="true">${[0, 1, 2, 3, 4, 5].map((i) => `<i${i < k ? ' class="on"' : ""}></i>`).join("")}</span>`;
    let status = "", clock = "";
    const playing = g.state === "live" && st?.duel?.ko && st.duel.code === g.code && st.duel.round === r;
    const rr = drain ? drain.r : r;
    if (g.state === "done") status = g.winner === "me" ? esc(T.isKo(n)) : g.winner === "opp" ? esc(T.youKo) : esc(T.draw);
    else if (drain) status = drain.who ? esc(drain.who === "me" ? T.rForMe(drain.r) : T.rFor(drain.r, n)) : esc(T.rTie(drain.r));
    else if (playing && g.deadline) {
      status = st.done ? `<span>${esc(T.waitOpp(n))}</span>${pips(oppN)}<span class="ko-t">…</span>` : `<span>${esc(T.oppDone(n))}</span><span class="ko-t">…</span>`;
      clock = `<div class="ko-clock"><i></i></div>`;
    } else if (playing) status = oppN ? `<span class="ko-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${esc(T.guessing(n))}</span>${pips(oppN)}` : `<span>${esc(T.thinking(n))}</span>`;
    return side("me", T.you, me, g.hp, drain?.me) + `<span class="ko-mid"><b>R${rr}</b><span class="${mult(rr) > 1 ? "up" : ""}">×${esc(fmtM(mult(rr)))}</span></span>` +
      side("op", n, op, g.opp_hp, drain?.op) + `<div class="ko-st${clock ? " clock" : ""}">${status}</div>${clock}`;
  }
  function drawTop(g) {
    const T = tx(), dt = K.tx(H.lang), tabs = document.getElementById("mode-tabs"), card = document.getElementById("event-card");
    document.body.setAttribute("data-duelpage", "");
    document.body.setAttribute("data-arena", "");
    let top = document.getElementById("duel-top");
    if (!top && tabs) {
      top = document.createElement("div");
      top.id = "duel-top"; top.className = "duel-top";
      tabs.before(top);
    }
    if (top) {
      top.innerHTML = `<button type="button" class="duel-exit" aria-label="${esc(dt.exit)}">${K.exitHtml()}</button>` +
        `<button type="button" class="duel-title duel-home dl-logo" aria-label="${esc(dt.toDuels)}">${K.logoHtml(dt)}</button>` +
        `<span class="duel-round"><span class="dl-th">⚡ ${esc(T.tag)}</span><span>${esc(T.roundN(g ? g.round : H.state()?.duel?.round || 1))}</span></span>`;
      top.onclick = (e) => {   // eigen klik (de kop van duel.js heeft zijn luisteraar alleen als duel.js hem maakte)
        if (e.target.closest(".duel-exit")) { H.switchMode("daily"); return; }
        if (e.target.closest(".duel-home")) { H.switchMode("daily"); K.openList(H, {}); }
      };
    }
    let vs = document.getElementById("duel-vs");
    if (!vs && card) { vs = document.createElement("div"); vs.id = "duel-vs"; vs.setAttribute("role", "status"); card.before(vs); }
    return vs;
  }
  function drawStrip(opts) {
    const st = H.state();
    if (!cur || !st?.duel?.ko) return;
    const vs = drawTop(opts?.drain ? { ...cur, round: opts.drain.r } : cur);
    if (!vs) return;
    vs.className = "ko";
    vs.style.setProperty("--h", hue(cur));
    vs.innerHTML = stripHtml(cur, opts);
    armClock();
  }
  // de klok (alleen als iemand klaar is): tekst + balk; op 0 zelf klaar (verloren), daarna laat de server afrekenen
  function armClock() {
    clearInterval(tClock); tClock = null;
    const g = cur, st = H.state();
    if (!g || g.state !== "live" || !g.deadline || st?.duel?.round !== g.round) return;
    const end = at(g.deadline), span = 15000, rk = `${g.code}:${g.round}`;
    if (!st.done && end - now() > 1000) sfx(`dl:${rk}`, "clock");   // de ander is klaar en jij speelt nog
    const tick = () => {
      const ms = Math.max(0, end - now()), s = Math.ceil(ms / 1000);
      const t = document.querySelector("#duel-vs .ko-t"), bar = document.querySelector("#duel-vs .ko-clock > i");
      if (t) { t.textContent = String(s); t.classList.toggle("last", s > 0 && s <= 5); }
      if (s > 0 && s <= 5 && !H.state()?.done) sfx(`t:${rk}:${s}`, "tick", s);   // wie al klaar is en wacht, hoort niets
      if (bar) bar.style.transform = `scaleX(${Math.min(1, ms / span)})`;
      if (ms <= 0) {
        clearInterval(tClock); tClock = null;
        const s2 = H.state();
        if (s2?.duel?.ko && s2.duel.code === g.code && s2.duel.round === g.round && !s2.done) H.koTimeout?.();   // te laat: verloren (0–10)
        clearTimeout(tTick);
        tTick = setTimeout(() => refresh(g.code), 1300);   // de server rekent af (ook als de ander weg is)
      }
    };
    tick();
    tClock = setInterval(tick, 200);
  }

  function startRound(g) {
    clearTimers(); closePop();
    ["modal-duels", "modal-duel-pop", "modal-duel-end"].forEach((id) => { const el = document.getElementById(id); if (el && !el.hidden) H.closeModal(id); });
    oppN = 0; shownRes = null; sentRound = null; counting = null;
    const p = g.puzzle;
    if (!p) return refresh(g.code);
    K.gc("ko-round-" + Math.min(g.round, 6), "Knockout: round " + Math.min(g.round, 6));
    H.startRound({ mode: "free", hashes: p.hashes, event: H.toEvent(p), board: null, potId: `k${g.code}${g.round}`,
                   duel: { code: g.code, round: g.round, opp: oppName(g), ko: true } });
  }
  // de uitslag van ronde r in de uitslagkaart; daarna begint de volgende vanzelf (of de K.O.)
  function resultHtml(g, r) {
    const T = tx(), n = oppName(g), a = g.mine[r - 1], b = g.theirs[r - 1], d = Math.abs(a - b), x = Math.round(d * mult(r));
    const box = (side, av, name, v, won) => `<span class="jr-box ${side}${won ? " win" : ""}"><span class="jr-who">${av}<b>${esc(name)}</b></span><strong>${v}</strong></span>`;
    const head = a === b ? esc(T.rTie(r))   // "Ronde 3 voor Sanne · jij −26"
      : a > b ? `<span class="me">${esc(T.rForMe(r))}</span> · <span class="op">${esc(n)}</span> <em>−${x}</em>`
      : `<span class="op">${esc(T.rFor(r, n))}</span> · <span class="me">${esc(T.youL)}</span> <em>−${x}</em>`;
    const st = H.state(), rt = H.els.resultText, yp = rt?.querySelector(".year-pill");
    let html = `<div class="ko-res jr" style="--h:${hue(g)}"><div class="jr-sc">${box("me", K.dbAv(K.meFlair(), K.meNameOr(T, T.you)), T.you, a, a > b)}` +
      `${box("op", K.dbAv(g.opp_flair, n), n, b, b > a)}</div><p class="ko-dmg">${head}</p>` +
      `<p class="ko-math">${a === b ? esc(T.tieMath) : esc(T.math(Math.max(a, b), Math.min(a, b), d, fmtM(mult(r)), r, x))}${yp ? ` · ${esc(T.itWas)} ${yp.outerHTML}` : ""}</p>`;
    if (g.state === "live") html += `<div class="ko-next" style="--dur:${Math.max(0, at(g.round_at) - now())}ms"><span>${esc(T.next(g.round, "…", fmtM(mult(g.round))))}</span></div>`;
    return html + `</div>`;
  }
  function placeCard(html) {
    const res = H.els.result;
    res.querySelectorAll(".duel-card").forEach((e) => e.remove());
    res.classList.add("dv-res");
    H.els.nextBtn.hidden = true; H.els.shareBtn.hidden = true;
    const el = document.createElement("div");
    el.className = "duel-card jr-card";
    el.innerHTML = html;
    H.els.resultText.after(el);
    return el;
  }
  function showResult(g, r) {
    if (shownRes === `${g.code}:${r}`) return;
    shownRes = `${g.code}:${r}`;
    const a = g.mine[r - 1], b = g.theirs[r - 1], x = Math.round(Math.abs(a - b) * mult(r));
    const drain = { r, who: a > b ? "me" : a < b ? "opp" : null, me: a < b ? g.hp + x : g.hp, op: a > b ? g.opp_hp + x : g.opp_hp };
    drawStrip({ drain });
    if (a !== b) sfx(`res:${g.code}:${r}`, "hit", x, a < b);   // bij gelijk geen schade, geen klap
    const el = placeCard(resultHtml(g, r));
    if (g.state === "live") {
      const lab = el.querySelector(".ko-next span");
      const T = tx();
      const tick = () => { const s = Math.max(0, Math.ceil((at(g.round_at) - now()) / 1000)); if (lab) lab.textContent = T.next(g.round, s, fmtM(mult(g.round))); };
      tick();
      clearInterval(tStart);
      tStart = setInterval(() => { tick(); if (now() >= at(g.round_at)) { clearInterval(tStart); tStart = null; startRound(g); } }, 250);
    }
  }
  function showEnd(g) {
    const T = tx(), n = oppName(g), r = Math.max(g.mine.length, g.theirs.length), won = g.winner === "me";
    const gave = g.mine.length === g.theirs.length && r > 0 && g.hp > 0 && g.opp_hp > 0 && g.winner;   // opgegeven
    const chips = g.mine.map((a, i) => {
      const b = g.theirs[i]; if (b == null || a === b) return "";
      const x = Math.round(Math.abs(a - b) * mult(i + 1));
      return a > b ? `<span class="op">R${i + 1} <b>${esc(n)} −${x}</b></span>` : `<span class="me">R${i + 1} <b>${esc(T.youL)} −${x}</b></span>`;
    }).join("");
    const p = gave ? (won ? T.gaveUp(n) : T.youGaveUp) : !g.winner ? T.drawP : won ? T.koPWin(n, r, g.hp) : T.koPLoss(n, r, g.opp_hp);
    const want = g.re_opp ? `<span class="ko-want"><span aria-hidden="true">${K.flairEmoji?.(g.opp_flair) || "⚡"}</span> ${esc(T.wantsToo)}</span>` : "";
    const fresh = at(g.finished_at) > now() - 120000;
    const big = fresh && sfx(`ko:${g.code}`, g.winner ? "ko" : "draw", won);   // één keer per spel, niet bij een oude K.O.
    if (fresh && g.re_opp && !g.re_me && !g.next) sfx(`want:${g.code}`, "want", big ? 1.2 : 0);   // samen met de gong: na de gong
    pop(band(g, "K.O.", ` ko-end${won ? "" : " lost"}`) + `<h2>${esc(!g.winner ? T.draw : won ? T.koWin : T.koLoss(n))}</h2><p>${esc(p)}</p>` +
      (chips ? `<div class="ko-rounds" style="--h:${hue(g)}">${chips}</div>` : "") +
      (fresh && !g.next ? (g.re_me ? `<button type="button" class="duel-go" disabled>${esc(T.rematchWait(n))}</button>`
        : `<button type="button" class="duel-go ko-rev" data-ko="re">${esc(T.rematch)}${want}</button>`) + `<p class="ko-alt-sub">${esc(T.rematchHint)}</p>` : "") +
      `<button type="button" class="duel-no" data-ko="duels">${esc(T.toDuels)}</button>`,
      async (act, b) => {
        if (act === "re") { b.disabled = true; K.gc("ko-rematch", "Knockout: rematch"); const r2 = await call("ko_rematch", { p_code: g.code }); if (r2.ok && r2.v) apply(r2.v); return; }
        closePop(); H.switchMode("daily"); K.openList(H, {});
      });
  }

  // ── de stand van de server op het scherm ──
  function apply(g, k) {
    if (!g || !g.code) return;
    skew = at(g.now) - Date.now();
    const prev = cur;
    cur = g;
    const st = H.state(), here = !!(st?.duel?.ko && st.duel.code === g.code);
    if (g.state === "invite") return g.me === "b" ? showInvite(g) : showWait(g);
    if (g.state === "declined" || g.state === "expired" || g.state === "cancelled") {
      const el = document.getElementById(ID);
      if (g.me === "a" && g.state !== "cancelled" && el && !el.hidden) return showLate(g);
      if (el && !el.hidden && (!prev || prev.code === g.code)) closePop();
      return;
    }
    if (g.state === "gone") { if (here) { cur = null; H.switchMode("daily"); } return; }
    if (g.state === "done") {
      if (g.next) revNext = g.next;
      if (prev?.next !== g.next && g.next) return refresh(g.next);
      if (here) {
        const r = g.mine.length;
        if (r && st.done && shownRes !== `${g.code}:${r}` && g.theirs.length >= r) {   // eerst de laatste ronde (de balk loopt leeg), dan de K.O.
          showResult(g, r);
          clearTimeout(tStart);
          tStart = setTimeout(() => { if (cur && cur.code === g.code) showEnd(cur); }, 2400);
          return;
        }
        drawStrip();
      }
      return showEnd(g);
    }
    // live
    if (here && st.duel.round === g.round) {   // deze ronde loopt (of jij bent klaar en wacht)
      if (prev?.round !== g.round || prev?.code !== g.code) oppN = 0;
      if (g.opp_done && !st.done) oppN = Math.max(oppN, 1);
      if (st.done && sentRound !== `${g.code}:${g.round}`) return roundDone(H, st);   // na herladen: je score staat nog niet bij de server
      drawStrip();
      if (st.done) placeCard(`<p class="duel-note">${esc(tx().waitOpp(oppName(g)))}…</p>`);
      return;
    }
    if (here && st.duel.round === g.round - 1 && st.done) return showResult(g, g.round - 1);   // de vorige ronde is afgerekend
    // nog niet in deze knock-out (net aangenomen, revanche, of herladen): aftellen, dan de ronde
    if (counting === g.code) return;   // telt al af (het seintje én het antwoord zeggen hetzelfde)
    clearTimers();
    if (now() < at(g.round_at) - 400) {
      counting = g.code;
      showCount(g, g.code === revNext);
      tStart = setTimeout(() => { sfx(`go:${g.code}`, "go"); startRound(g); }, Math.max(0, at(g.round_at) - now()));   // ⚡ (de 0 haalt het scherm zelden)
    } else startRound(g);
  }
  // je score naar de server (na je laatste gok, of verloren op de klok)
  async function roundDone(host, st) {
    H = host; ensureCss();
    const dl = st.duel;
    if (!dl?.ko) return;
    sentRound = `${dl.code}:${dl.round}`;
    placeCard(`<p class="duel-note">${esc(tx().waitOpp(cur && cur.code === dl.code ? oppName(cur) : dl.opp || "?"))}…</p>`);
    const r = await call("ko_submit", { p_code: dl.code, p_round: dl.round, p_score: H.score() });
    if (H.state() !== st) return;
    if (r.ok && r.v) apply(r.v); else { sentRound = null; setTimeout(() => refresh(dl.code), 1500); }
  }
  async function refresh(code) {
    const r = await call("ko_get", { p_code: code });
    if (r.ok && r.v) apply(r.v);
  }

  // ── wat game.js en duel.js aanroepen ──
  window.KO = {
    invite,
    // live.js → game.js: een seintje over een knock-out
    event(host, p) {
      H = host; ensureCss();
      if (!p || typeof p.code !== "string") return;
      if (p.k === "g") {   // de ander gokte: alleen de stipjes
        if (cur && cur.code === p.code && Number.isInteger(p.n)) { oppN = Math.min(6, p.n); drawStrip(); }
        return;
      }
      if (p.k === "next" && typeof p.next === "string") { revNext = p.next; return refresh(p.next); }
      return refresh(p.code);
    },
    // duel.js sync() bij een knock-out-ronde (ook na herladen: dan eerst de stand ophalen)
    sync(host) {
      H = host; ensureCss();
      const st = H.state();
      if (!st?.duel?.ko) return;
      drawTop(cur && cur.code === st.duel.code ? cur : null);
      if (cur && cur.code === st.duel.code) drawStrip(); else refresh(st.duel.code);
    },
    roundDone,   // duel.js roundDone() bij een knock-out-ronde
    // game.js na elke gok in een knock-out-ronde: de ander ziet je stipjes
    guessed(st) {
      if (!st?.duel?.ko || !H) return;
      call("ko_guess", { p_code: st.duel.code, p_round: st.duel.round, p_n: (st.guesses || []).length });
    },
    // het ▾-menu van Duels: de Live-keuze bij een vriend die online is
    optHtml(lang, k, name) {
      const T = TXT[lang] || TXT.en;
      return `<button type="button" class="dl-opt ko-opt" data-act="ko" data-k="${esc(k)}"><span class="mo-e" aria-hidden="true">⚡</span>` +
        `<span><b>${esc(T.live)}</b><small>${esc(T.liveSub(name))}</small></span></button>`;
    },
    css: CSS, copy: (l) => TXT[l], langs: () => Object.keys(TXT),
    _: { mult, SFX, sfx, apply: (h, g) => { H = h; apply(g); }, stripHtml: (h, g, o) => { H = h; return stripHtml(g, o); }, resultHtml: (h, g, r) => { H = h; return resultHtml(g, r); } },
  };
})();
