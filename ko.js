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
  const ID = "modal-ko", HP = 150;   // db/210: 150 levens (één ronde haalt je nooit van vol naar 0)

  const TXT = {
    nl: { react: "Reageer", rxL: "Lachen|Wow|Mooi|Oef|Goed gespeeld|Ik moet gaan", resultOf: (r) => `Uitslag ronde ${r}`, replay: "Nog eens zien", start: "Start", lifeAria: (n, m, a, b) => `Levens per ronde: jij van ${m} naar ${a}, ${n} van ${m} naar ${b}`,
      live: "Live · knock-out", liveSub: (n) => `Nu tegelijk, 150 levens · ${n} is online`, tag: "Knock-out", noResp: "Geen reactie",
      waitH: (n) => `Wachten op ${n}…`, waitP: "Neemt die binnen een minuut aan, dan begint het meteen.", left: (s) => `nog ${s} s`, cancel: "Annuleer",
      lateH: (n) => `${n} reageert niet`, declH: (n) => `${n} kan nu niet`, lateP: "Misschien zit die niet achter de telefoon.", busyH: (n) => `${n} speelt nu een knock-out`, busyP: "Probeer het zo nog eens, of speel om de beurt.", coolP: "Over een paar minuten kun je het weer vragen.", again: "⚡ Nog eens vragen",
      turn: "⚔️ Speel om de beurt", turnSub: (n) => `5 rondes, ${n} speelt wanneer het uitkomt`, never: "Laat maar",
      invH: (n) => `${n} wil nú een knock-out`, lives: "levens", same: "1 gok per ronde", mins: "±3 min", join: "Doe mee", notNow: "Niet nu",
      startH: "Knock-out!", revH: "Revanche!", startP: "Ronde 1 begint zo", roundN: (r) => `Ronde ${r}`,
      guessing: (n) => `${n} gokt`, thinking: (n) => `${n} denkt na`, oppDone: (n) => `${n} is klaar ✓`, waitOpp: (n) => `Wachten op ${n}`,
      rFor: (r, n) => `Ronde ${r} voor ${n}`, rForMe: (r) => `Ronde ${r} voor jou`, rTie: (r) => `Ronde ${r}: gelijk`, you: "Jij",
      
      koWin: "K.O.! Jij wint", koLoss: (n) => `K.O. ${n} wint`, draw: "Gelijkspel",
      koPWin: (n, r, hp) => `${n} ging in ronde ${r} naar 0. Jij hield ${hp} levens over.`, koPLoss: (n, r, hp) => `Jij ging in ronde ${r} naar 0. ${n} hield ${hp} levens over.`,
      gaveUp: (n) => `${n} stopte.`, youGaveUp: "Je stopte.", drawP: "Na 12 rondes even veel levens.",
      rematch: "⚡ Revanche", wantsToo: "wil ook", rematchWait: (n) => `Wacht op ${n}…`, rematchHint: "Druk je allebei, dan begint hij meteen", toDuels: "Naar Duels",
      isKo: (n) => `${n} is knock-out`, youKo: "Jij bent knock-out", gone: "Deze knock-out is gestopt.", err: "Dat lukte niet. Probeer het nog eens.", close: "Sluiten",
      oppGuessed: (n) => `${n} heeft gegokt ✓`,
      back: "Terug", hpLine: (a, n, b) => `Levens: jij ${a}, ${n} ${b}` },
    en: { react: "React", rxL: "Laugh|Wow|Nice|Oof|Good game|Got to go", resultOf: (r) => `Round ${r} result`, replay: "Watch again", start: "Start", lifeAria: (n, m, a, b) => `Lives per round: you from ${m} to ${a}, ${n} from ${m} to ${b}`,
      live: "Live · knockout", liveSub: (n) => `Right now, 150 lives · ${n} is online`, tag: "Knockout", noResp: "No answer",
      waitH: (n) => `Waiting for ${n}…`, waitP: "If they accept within a minute, it starts right away.", left: (s) => `${s} s left`, cancel: "Cancel",
      lateH: (n) => `${n} isn't answering`, declH: (n) => `${n} can't right now`, lateP: "Maybe they're away from their phone.", busyH: (n) => `${n} is in a knockout right now`, busyP: "Try again in a bit, or play in turns.", coolP: "You can ask again in a few minutes.", again: "⚡ Ask again",
      turn: "⚔️ Play in turns", turnSub: (n) => `5 rounds, ${n} plays whenever it suits`, never: "Never mind",
      invH: (n) => `${n} wants a knockout now`, lives: "lives", same: "1 guess per round", mins: "±3 min", join: "Join", notNow: "Not now",
      startH: "Knockout!", revH: "Rematch!", startP: "Round 1 starts in a moment", roundN: (r) => `Round ${r}`,
      guessing: (n) => `${n} is guessing`, thinking: (n) => `${n} is thinking`, oppDone: (n) => `${n} is done ✓`, waitOpp: (n) => `Waiting for ${n}`,
      rFor: (r, n) => `Round ${r} to ${n}`, rForMe: (r) => `Round ${r} to you`, rTie: (r) => `Round ${r}: a tie`, you: "You",
      
      koWin: "K.O.! You win", koLoss: (n) => `K.O. ${n} wins`, draw: "A draw",
      koPWin: (n, r, hp) => `${n} hit 0 in round ${r}. You had ${hp} lives left.`, koPLoss: (n, r, hp) => `You hit 0 in round ${r}. ${n} had ${hp} lives left.`,
      gaveUp: (n) => `${n} stopped.`, youGaveUp: "You stopped.", drawP: "Same lives after 12 rounds.",
      rematch: "⚡ Rematch", wantsToo: "wants one too", rematchWait: (n) => `Waiting for ${n}…`, rematchHint: "If you both tap, it starts right away", toDuels: "To Duels",
      isKo: (n) => `${n} is knocked out`, youKo: "You're knocked out", gone: "This knockout has stopped.", err: "That didn't work. Please try again.", close: "Close",
      oppGuessed: (n) => `${n} has guessed ✓`,
      back: "Rejoin", hpLine: (a, n, b) => `Lives: you ${a}, ${n} ${b}` },
    de: { react: "Reagieren", rxL: "Lachen|Wow|Stark|Autsch|Gut gespielt|Muss los", resultOf: (r) => `Ergebnis Runde ${r}`, replay: "Noch mal ansehen", start: "Start", lifeAria: (n, m, a, b) => `Leben pro Runde: du von ${m} auf ${a}, ${n} von ${m} auf ${b}`,
      live: "Live · Knock-out", liveSub: (n) => `Jetzt gleichzeitig, 150 Leben · ${n} ist online`, tag: "Knock-out", noResp: "Keine Antwort",
      waitH: (n) => `Warte auf ${n}…`, waitP: "Nimmt die Person innerhalb einer Minute an, geht es sofort los.", left: (s) => `noch ${s} s`, cancel: "Abbrechen",
      lateH: (n) => `${n} antwortet nicht`, declH: (n) => `${n} kann gerade nicht`, lateP: "Vielleicht ist das Handy gerade weg.", busyH: (n) => `${n} spielt gerade einen Knock-out`, busyP: "Versuch es gleich noch mal oder spielt abwechselnd.", coolP: "In ein paar Minuten kannst du wieder fragen.", again: "⚡ Noch mal fragen",
      turn: "⚔️ Abwechselnd spielen", turnSub: (n) => `5 Runden, ${n} spielt, wann es passt`, never: "Lass gut sein",
      invH: (n) => `${n} will jetzt einen Knock-out`, lives: "Leben", same: "1 Tipp pro Runde", mins: "±3 Min.", join: "Mitmachen", notNow: "Nicht jetzt",
      startH: "Knock-out!", revH: "Revanche!", startP: "Runde 1 beginnt gleich", roundN: (r) => `Runde ${r}`,
      guessing: (n) => `${n} rät`, thinking: (n) => `${n} überlegt`, oppDone: (n) => `${n} ist fertig ✓`, waitOpp: (n) => `Warte auf ${n}`,
      rFor: (r, n) => `Runde ${r} für ${n}`, rForMe: (r) => `Runde ${r} für dich`, rTie: (r) => `Runde ${r}: unentschieden`, you: "Du",
      
      koWin: "K.O.! Du gewinnst", koLoss: (n) => `K.O. ${n} gewinnt`, draw: "Unentschieden",
      koPWin: (n, r, hp) => `${n} fiel in Runde ${r} auf 0. Du hattest noch ${hp} Leben.`, koPLoss: (n, r, hp) => `Du fielst in Runde ${r} auf 0. ${n} hatte noch ${hp} Leben.`,
      gaveUp: (n) => `${n} hat aufgehört.`, youGaveUp: "Du hast aufgehört.", drawP: "Nach 12 Runden gleich viele Leben.",
      rematch: "⚡ Revanche", wantsToo: "will auch", rematchWait: (n) => `Warte auf ${n}…`, rematchHint: "Tippt ihr beide, geht es sofort los", toDuels: "Zu den Duellen",
      isKo: (n) => `${n} ist knock-out`, youKo: "Du bist knock-out", gone: "Dieser Knock-out wurde beendet.", err: "Das hat nicht geklappt. Versuch es noch mal.", close: "Schließen",
      oppGuessed: (n) => `${n} hat getippt ✓`,
      back: "Zurück", hpLine: (a, n, b) => `Leben: du ${a}, ${n} ${b}` },
    es: { react: "Reaccionar", rxL: "Risa|Guau|Genial|Uf|Buena partida|Me tengo que ir", resultOf: (r) => `Resultado de la ronda ${r}`, replay: "Ver otra vez", start: "Inicio", lifeAria: (n, m, a, b) => `Vidas por ronda: tú de ${m} a ${a}, ${n} de ${m} a ${b}`,
      live: "En vivo · K.O.", liveSub: (n) => `Ahora a la vez, 150 vidas · ${n} está en línea`, tag: "K.O.", noResp: "Sin respuesta",
      waitH: (n) => `Esperando a ${n}…`, waitP: "Si acepta en un minuto, empieza enseguida.", left: (s) => `quedan ${s} s`, cancel: "Cancelar",
      lateH: (n) => `${n} no responde`, declH: (n) => `${n} no puede ahora`, lateP: "Quizá no está con el móvil.", busyH: (n) => `${n} está jugando un K.O. ahora`, busyP: "Inténtalo dentro de un rato o jugad por turnos.", coolP: "Podrás volver a preguntar en unos minutos.", again: "⚡ Volver a preguntar",
      turn: "⚔️ Jugar por turnos", turnSub: (n) => `5 rondas, ${n} juega cuando le venga bien`, never: "Déjalo",
      invH: (n) => `${n} quiere un K.O. ahora`, lives: "vidas", same: "1 intento por ronda", mins: "±3 min", join: "Jugar", notNow: "Ahora no",
      startH: "¡K.O.!", revH: "¡Revancha!", startP: "La ronda 1 empieza enseguida", roundN: (r) => `Ronda ${r}`,
      guessing: (n) => `${n} está adivinando`, thinking: (n) => `${n} está pensando`, oppDone: (n) => `${n} ha terminado ✓`, waitOpp: (n) => `Esperando a ${n}`,
      rFor: (r, n) => `Ronda ${r} para ${n}`, rForMe: (r) => `Ronda ${r} para ti`, rTie: (r) => `Ronda ${r}: empate`, you: "Tú",
      
      koWin: "¡K.O.! Ganas tú", koLoss: (n) => `K.O. Gana ${n}`, draw: "Empate",
      koPWin: (n, r, hp) => `${n} llegó a 0 en la ronda ${r}. Te quedaban ${hp} vidas.`, koPLoss: (n, r, hp) => `Llegaste a 0 en la ronda ${r}. A ${n} le quedaban ${hp} vidas.`,
      gaveUp: (n) => `${n} lo dejó.`, youGaveUp: "Lo dejaste.", drawP: "Mismas vidas tras 12 rondas.",
      rematch: "⚡ Revancha", wantsToo: "también quiere", rematchWait: (n) => `Esperando a ${n}…`, rematchHint: "Si pulsáis los dos, empieza enseguida", toDuels: "A Duelos",
      isKo: (n) => `${n} está K.O.`, youKo: "Estás K.O.", gone: "Este K.O. se ha detenido.", err: "No ha funcionado. Inténtalo otra vez.", close: "Cerrar",
      oppGuessed: (n) => `${n} ya ha respondido ✓`,
      back: "Volver", hpLine: (a, n, b) => `Vidas: tú ${a}, ${n} ${b}` },
    pt: { react: "Reagir", rxL: "Risada|Uau|Boa|Ops|Bom jogo|Preciso ir", resultOf: (r) => `Resultado da rodada ${r}`, replay: "Ver de novo", start: "Início", lifeAria: (n, m, a, b) => `Vidas por rodada: você de ${m} para ${a}, ${n} de ${m} para ${b}`,
      live: "Ao vivo · nocaute", liveSub: (n) => `Agora ao mesmo tempo, 150 vidas · ${n} está online`, tag: "Nocaute", noResp: "Sem resposta",
      waitH: (n) => `Esperando ${n}…`, waitP: "Se aceitar em um minuto, começa na hora.", left: (s) => `faltam ${s} s`, cancel: "Cancelar",
      lateH: (n) => `${n} não responde`, declH: (n) => `${n} não pode agora`, lateP: "Talvez esteja longe do celular.", busyH: (n) => `${n} está em um nocaute agora`, busyP: "Tente de novo daqui a pouco ou jogue por turnos.", coolP: "Você pode perguntar de novo em alguns minutos.", again: "⚡ Perguntar de novo",
      turn: "⚔️ Jogar por turnos", turnSub: (n) => `5 rodadas, ${n} joga quando puder`, never: "Deixa pra lá",
      invH: (n) => `${n} quer um nocaute agora`, lives: "vidas", same: "1 chute por rodada", mins: "±3 min", join: "Jogar", notNow: "Agora não",
      startH: "Nocaute!", revH: "Revanche!", startP: "A rodada 1 já vai começar", roundN: (r) => `Rodada ${r}`,
      guessing: (n) => `${n} está chutando`, thinking: (n) => `${n} está pensando`, oppDone: (n) => `${n} terminou ✓`, waitOpp: (n) => `Esperando ${n}`,
      rFor: (r, n) => `Rodada ${r} para ${n}`, rForMe: (r) => `Rodada ${r} para você`, rTie: (r) => `Rodada ${r}: empate`, you: "Você",
      
      koWin: "K.O.! Você venceu", koLoss: (n) => `K.O. ${n} venceu`, draw: "Empate",
      koPWin: (n, r, hp) => `${n} chegou a 0 na rodada ${r}. Você ficou com ${hp} vidas.`, koPLoss: (n, r, hp) => `Você chegou a 0 na rodada ${r}. ${n} ficou com ${hp} vidas.`,
      gaveUp: (n) => `${n} parou.`, youGaveUp: "Você parou.", drawP: "Mesmas vidas após 12 rodadas.",
      rematch: "⚡ Revanche", wantsToo: "também quer", rematchWait: (n) => `Esperando ${n}…`, rematchHint: "Se os dois tocarem, começa na hora", toDuels: "Para Duelos",
      isKo: (n) => `${n} levou nocaute`, youKo: "Você levou nocaute", gone: "Este nocaute parou.", err: "Não deu certo. Tente de novo.", close: "Fechar",
      oppGuessed: (n) => `${n} já chutou ✓`,
      back: "Voltar", hpLine: (a, n, b) => `Vidas: você ${a}, ${n} ${b}` },
  };

  const CSS = String.raw`/* ═══ ⚡ Knock-out (/ko.js, db/208) ═══ */
:root { --ko-me: var(--db-me); --ko-lag: #f2c14e; --ko-max: #ffb020; }
html[data-theme="light"] { --ko-lag: #d9a21b; --ko-max: #a86400; }
#duel-vs.ko { --ko-op: hsl(var(--h, 30) 58% 46%); display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: end; gap: 0.2rem 0.55rem;
  padding: 0.55rem 0.7rem 0.5rem; margin-bottom: 0.6rem; border-radius: 12px; background: var(--card); overflow: hidden; }
html[data-theme="light"] #duel-vs.ko { --ko-op: hsl(var(--h, 30) 58% 42%); }
.ko-side { --col: var(--ko-me); position: relative; min-width: 0; display: flex; flex-direction: column; gap: 0.3rem; }
.ko-fly { position: absolute; bottom: -1.35rem; right: 0.15rem; font-size: 1.15rem; font-weight: 900; line-height: 1; color: var(--duel-loss); pointer-events: none;
  text-shadow: 0 0 6px var(--card), 0 0 2px var(--card); animation: ko-fly 1.9s ease-out 0.4s both; }   /* de schade springt op bij de balk die leegloopt */
.ko-side.op .ko-fly { right: auto; left: 0.15rem; }
.ko-ghost { position: fixed; z-index: 62; display: flex; align-items: center; justify-content: center; pointer-events: none; white-space: nowrap; font-variant-numeric: tabular-nums; }
.ko-ghost.dmg { font-size: 1.3rem; font-weight: 900; color: var(--duel-loss); text-shadow: 0 0 6px var(--card), 0 0 2px var(--card); }
.ko-ghost.dmg.max { font-size: 1.6rem; color: var(--ko-max); text-shadow: 0 0 14px color-mix(in srgb, var(--ko-max) 60%, transparent), 0 0 2px var(--card); }
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
.duel-go.ko-rev { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; }
.ko-want { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.1rem 0.55rem 0.1rem 0.35rem; border-radius: 999px; font-size: 0.78rem; font-weight: 700;
  background: color-mix(in srgb, var(--duel-arena-on) 16%, transparent); animation: ko-tick 0.6s ease-in-out infinite alternate; }
.duel-inv .ko-count { margin: 0; font-size: 3.2rem; font-weight: 900; line-height: 1; color: var(--duel-arena); font-variant-numeric: tabular-nums; }
.dl-opt.ko-opt b { color: var(--duel-arena); }
body[data-ko] #guesses .penalty, body[data-ko] #live-score, body[data-ko] #hint-count, body[data-ko] #hint-btn-direction, body[data-ko] #guesses .guess-row:nth-child(n+2) { display: none; }   /* één gok per ronde */
/* ── de uitslag van een ronde: een laag over het hele scherm (20/11, zijn "superimposed, net als confetti"). Zo min mogelijk tekst:
   bovenaan het echte jaar (groen) tussen jullie gokken (kleur van de afstand, zoals de gokregels), daaronder groot de punten met alleen de
   hint-chips, in het midden de factor, onderin de namen. De levens blijven boven de laag (body.ko-showing): daar landt de schade. ±40
   elementen + 14 deeltjes (spans, geen canvas). Max-schade = goud (--ko-max), geen tekst. */
.ko-show { --op: hsl(var(--h, 30) 72% 66%); position: fixed; inset: 0; z-index: 60; display: flex; flex-direction: column; justify-content: center; gap: 1.6rem;
  padding: var(--top, 9rem) max(1rem, env(safe-area-inset-right, 0px)) max(1.6rem, env(safe-area-inset-bottom, 0px)) max(1rem, env(safe-area-inset-left, 0px));
  overflow: hidden; text-align: center; background: color-mix(in srgb, var(--bg) 76%, transparent); -webkit-backdrop-filter: blur(5px); backdrop-filter: blur(5px);
  cursor: pointer; animation: ko-show-in 0.25s ease-out both; }
html[data-theme="light"] .ko-show { --op: hsl(var(--h, 30) 62% 38%); }
.ko-show.out { animation: ko-show-out 0.4s ease-in both; pointer-events: none; }
body.ko-showing #duel-vs.ko { position: relative; z-index: 61; }
.ks-row { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 0 0.5rem; }
.ks-g { display: flex; justify-content: center; min-width: 0; }
.ks-yr { min-width: 0; padding: 0.22rem 0.7rem; font-size: 1.3rem; font-weight: 900; line-height: 1.15; }
.ks-yr.none { border-radius: 999px; color: var(--muted); background: var(--card-soft); }
.ks-yr.ks-ans { font-size: 1.55rem; padding: 0.25rem 0.85rem; box-shadow: 0 0 18px color-mix(in srgb, var(--green) 45%, transparent); }
.ks-f { font-size: 1.9rem; font-weight: 900; line-height: 1; color: var(--duel-arena); font-variant-numeric: tabular-nums; }
.ks-s { --col: var(--duel-me); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.35rem; min-width: 0; min-height: 6rem; }
.ks-s.op { --col: var(--op); }
.ks-s strong { font-size: clamp(2.3rem, 12.6vw, 3.4rem); font-weight: 900; line-height: 1; letter-spacing: -0.01em; font-variant-numeric: tabular-nums; color: var(--fg); white-space: nowrap;
  transition: opacity 0.3s, color 0.3s, text-shadow 0.3s; }
.ks-s.win strong { color: var(--col); text-shadow: 0 0 22px color-mix(in srgb, var(--col) 60%, transparent), 0 0 3px color-mix(in srgb, var(--col) 45%, transparent); }
.ks-s.lose strong { opacity: 0.4; }
.ks-s strong.hit, .ks-s strong.neg, .ks-s strong.dmg { opacity: 1; text-shadow: none; }
.ks-s strong.neg, .ks-s strong.dmg { color: var(--duel-loss); }
.ks-s strong.dmg { text-shadow: 0 0 18px color-mix(in srgb, var(--duel-loss) 50%, transparent); }
.ks-s strong.dmg.max { color: var(--ko-max); text-shadow: 0 0 26px color-mix(in srgb, var(--ko-max) 65%, transparent), 0 0 4px color-mix(in srgb, var(--ko-max) 50%, transparent); }
.ks-s small { display: flex; justify-content: center; flex-wrap: wrap; gap: 0.3rem; min-height: 1.45rem; }
.ks-hint.used { opacity: 0.55; transition: opacity 0.3s; }
.ks-hint { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.08rem 0.45rem; border-radius: 999px; font-size: 0.8rem; font-weight: 800; line-height: 1.2;
  color: var(--duel-loss); background: color-mix(in srgb, var(--duel-loss) 15%, transparent); font-variant-numeric: tabular-nums; }
/* de namen, in de banden van de duelopening (eigen kleur, streepjes, schuine kant); de verliezer van de ronde wordt grijs */
.ks-names { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-inline: calc(-1 * max(1rem, env(safe-area-inset-left, 0px))); }
.ks-nb { position: relative; display: flex; align-items: center; gap: 0.5rem; min-width: 0; height: 2.9rem; padding: 0 1.4rem 0 0.9rem; overflow: hidden; color: #fff;
  background: linear-gradient(90deg, hsl(222 66% 26%), hsl(222 64% 46%)); clip-path: polygon(0 0, 100% 0, calc(100% - 1.1rem) 100%, 0 100%);
  transition: filter 0.3s; animation: ks-in-l 0.42s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
.ks-nb.op { justify-content: flex-end; padding: 0 0.9rem 0 1.4rem; background: linear-gradient(270deg, hsl(var(--h, 30) 58% 24%), hsl(var(--h, 30) 58% 42%));
  clip-path: polygon(1.1rem 0, 100% 0, 100% 100%, 0 100%); animation-name: ks-in-r; animation-delay: 0.08s; }
.ks-nb::after { content: ""; position: absolute; inset: 0; background: repeating-linear-gradient(-66deg, rgba(255, 255, 255, 0.07) 0 2px, transparent 2px 15px); }
.ks-nb b { position: relative; z-index: 1; min-width: 0; font-size: 0.95rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap; }
.ks-nb .db-av { position: relative; z-index: 1; flex: none; width: 1.9rem; height: 1.9rem; font-size: 1.05rem; background: rgba(255, 255, 255, 0.16); box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.85); }
.ks-nb.lose { filter: grayscale(0.75) brightness(0.7); }
.ks-bit { position: absolute; z-index: 63; margin: -0.25rem 0 0 -0.25rem; border-radius: 50%; pointer-events: none; }
.ks-shake { animation: ks-shake 0.36s ease-out both; }
.ks-bam { animation: ks-bam 0.5s cubic-bezier(0.2, 0.9, 0.3, 1) both; }
.ks-wait { visibility: hidden; }
.ks-pop { animation: ko-pop 0.34s ease-out both; }
/* na de laag: één regel in de pagina (tik = nog eens zien); in een lopend spel loopt hij vol tot de volgende ronde */
.ko-after { position: relative; overflow: hidden; display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; width: 100%; min-height: 2.75rem;
  margin: 0.6rem 0 0; padding: 0.35rem 0.85rem; border: 0; border-radius: 10px; font: inherit; font-size: 0.9rem; color: var(--muted); text-align: left;
  background: var(--card-soft); cursor: pointer; }
.ko-after::before { content: ""; position: absolute; inset: 0; background: color-mix(in srgb, var(--duel-arena) 20%, transparent); transform-origin: left; animation: ko-fill var(--dur, 3s) linear both; }
.ko-after.still::before { display: none; }
.ko-after > * { position: relative; }
.ka-l { display: inline-flex; align-items: center; gap: 0.55rem; }
.ka-l > b { color: var(--fg); font-variant-numeric: tabular-nums; }
.ka-who { --col: var(--duel-me); display: inline-flex; align-items: center; gap: 0.35rem; }
.ka-who.op { --col: hsl(var(--h, 30) 58% 46%); }
.ka-who .db-av { width: 1.5rem; height: 1.5rem; font-size: 0.85rem; }
.ko-after em { font-style: normal; font-weight: 900; color: var(--duel-loss); font-variant-numeric: tabular-nums; }
.ko-after em.max { color: var(--ko-max); }
.ko-after em.tie { color: var(--muted); }
.ko-after .n { flex: none; font-weight: 700; color: var(--fg); font-variant-numeric: tabular-nums; }
/* ── het K.O.-eindscherm (A, zijn keuze 20/11): het levensverloop, onder elke ronde de factor en de schade ── */
.ko-life { --op: hsl(var(--h, 30) 72% 66%); --opl: hsl(var(--h, 30) 62% 56%); align-self: stretch; display: flex; flex-direction: column; gap: 0.2rem; }
html[data-theme="light"] .ko-life { --op: hsl(var(--h, 30) 62% 38%); --opl: hsl(var(--h, 30) 58% 46%); }
.kl-key { display: flex; justify-content: center; gap: 1rem; font-size: 0.76rem; font-weight: 700; color: var(--muted); }
.kl-key span { display: inline-flex; align-items: center; gap: 0.35rem; }
.kl-key i { width: 0.9rem; height: 3px; border-radius: 2px; background: var(--duel-me); }
.kl-key i.op { background: var(--opl); }
.ko-life svg { display: block; width: 100%; height: auto; overflow: visible; }
.ko-life .kl-ax { stroke: color-mix(in srgb, var(--muted) 35%, transparent); stroke-width: 1; stroke-dasharray: 3 4; }
.ko-life polyline { fill: none; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
.ko-life polyline.me { stroke: var(--duel-me); }
.ko-life polyline.op { stroke: var(--opl); }
.ko-life circle.me { fill: var(--duel-me); }
.ko-life circle.op { fill: var(--opl); }
.ko-life circle.me, .ko-life circle.op { stroke: var(--card); stroke-width: 2; }
.ko-life circle.out { fill: var(--card); stroke: var(--duel-loss); stroke-width: 2.5; }
.ko-life text { font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums; }
.ko-life text.me { fill: var(--duel-me); }
.ko-life text.op { fill: var(--op); }
.ko-life text.out { fill: var(--duel-loss); }
.kl-x { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); }
.kl-c { display: flex; flex-direction: column; align-items: center; gap: 0.05rem; line-height: 1.2; font-variant-numeric: tabular-nums; }
.kl-c b { font-size: 0.74rem; color: var(--fg); }
.kl-c small { font-size: 0.7rem; color: var(--muted); }
.kl-c em { font-style: normal; font-size: 0.78rem; font-weight: 800; color: var(--muted); }
.kl-c em.me { color: var(--duel-me); }
.kl-c em.op { color: var(--op); }
.kl-c em.max { color: var(--ko-max); text-shadow: 0 0 8px color-mix(in srgb, var(--ko-max) 70%, transparent); }
.ko-life.many .kl-c small { display: none; }   /* veel rondes: alleen ronde en schade */
.ko-life.many .kl-c b, .ko-life.many .kl-c em { font-size: 0.64rem; }
/* ── reacties: het knopje rechts in de levensstrook, de rij (zwevend onder de strook, of open op het eindscherm), de bubbels ── */
#duel-vs.ko { position: relative; overflow: visible; }   /* de bubbel mag boven de strook uit; de klokbalk rondt zelf af */
#duel-vs.ko .ko-clock { border-radius: 0 0 12px 12px; overflow: hidden; }
#duel-vs.ko .ko-st { padding-inline: 2.4rem; min-height: 2.2rem; }   /* ruimte voor het knopje; de status blijft in het midden */
.ko-rx-btn { position: absolute; right: 0.3rem; bottom: 0.25rem; display: grid; place-items: center; width: 2.6rem; height: 2.6rem; padding: 0; border: 0; border-radius: 50%;
  color: var(--muted); background: transparent; cursor: pointer; }
.ko-rx-btn svg { width: 1.4rem; height: 1.4rem; }
.ko-rx-btn:hover { color: var(--fg); filter: none; }
.ko-rx-btn[aria-expanded="true"] { color: var(--duel-arena); background: var(--card-soft); }
.ko-rx-btn:disabled { opacity: 0.35; cursor: default; }
.ko-rx-btn:focus-visible, .ko-rx button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.ko-rx { position: relative; display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 0.3rem; align-self: stretch; }
.ko-rx button { height: 2.75rem; min-width: 0; display: grid; place-items: center; padding: 0; border: 0; border-radius: 10px; font: inherit; font-size: 1.35rem; line-height: 1;
  color: var(--fg); background: var(--card-soft); cursor: pointer; }
.ko-rx button.w { font-size: 0.92rem; font-weight: 800; letter-spacing: 0.02em; }
.ko-rx button:hover { filter: none; background: color-mix(in srgb, var(--fg) 10%, var(--card-soft)); }
.ko-rx.cool button, .ko-rx.out button { opacity: 0.38; pointer-events: none; }
.ko-rx.cool button.sent { opacity: 1; box-shadow: inset 0 0 0 2px var(--duel-me); }
.ko-rx.cool::after { content: ""; position: absolute; left: 0.2rem; right: 0.2rem; bottom: -0.3rem; height: 3px; border-radius: 2px; background: var(--duel-me); transform-origin: left;
  animation: ko-run 2s linear both; }
.ko-rx.float { position: absolute; z-index: 6; top: calc(100% + 0.4rem); left: 0; right: 0; padding: 0.4rem; border-radius: 14px; background: var(--card);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.32), 0 0 0 1px var(--border); }
.ko-rx.float::before { content: ""; position: absolute; top: -0.4rem; right: 1.2rem; width: 0.8rem; height: 0.42rem; background: var(--card); clip-path: polygon(50% 0, 100% 100%, 0 100%); }
.ko-bub { --col: var(--duel-me); position: absolute; z-index: 7; bottom: calc(100% + 0.5rem); display: flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.6rem;
  border-radius: 14px; font-size: 1.5rem; font-weight: 900; line-height: 1.05; white-space: nowrap; color: var(--fg); background: var(--card);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3), inset 0 0 0 2px var(--col); pointer-events: none; animation: ko-bub 2.5s ease-out both; }
.ko-bub::after { content: ""; position: absolute; top: calc(100% - 1px); width: 0.8rem; height: 0.5rem; background: var(--col); clip-path: polygon(0 0, 100% 0, 50% 100%); }
.ko-side.me .ko-bub { left: -0.15rem; }
.ko-side.me .ko-bub::after { left: 0.55rem; }
.ko-side.op .ko-bub { --col: var(--ko-op); right: -0.15rem; }
.ko-side.op .ko-bub::after { right: 0.55rem; }
.ko-bub.w { font-size: 1.05rem; padding-block: 0.45rem; }
.ko-bub i { font-style: normal; font-size: 0.74rem; font-weight: 900; padding: 0.08rem 0.38rem; border-radius: 999px; color: #fff; background: var(--col); }
.ko-bub i.bump { animation: ko-pop 0.34s ease-out both; }
.ko-bandw { position: relative; align-self: stretch; }   /* het eindscherm: de bubbel komt onder de band uit, bij het gezichtje van wie hem stuurde */
.ko-bandw .ko-bub { top: calc(100% - 0.7rem); bottom: auto; }
.ko-bandw .ko-bub::after { top: auto; bottom: calc(100% - 1px); clip-path: polygon(50% 0, 100% 100%, 0 100%); }
.ko-bandw .ko-bub.me { left: 1rem; }
.ko-bandw .ko-bub.me::after { left: 0.9rem; }
.ko-bandw .ko-bub.op { --col: hsl(var(--h, 30) 58% 46%); right: 1rem; }
.ko-bandw .ko-bub.op::after { right: 0.9rem; }
@keyframes ko-bub { 0% { opacity: 0; transform: translateY(6px) scale(0.6); } 10% { opacity: 1; transform: none; } 88% { opacity: 1; transform: none; } 100% { opacity: 0; transform: translateY(-4px); } }
@keyframes ko-show-in { from { opacity: 0; } }
@keyframes ko-show-out { to { opacity: 0; } }
@keyframes ks-in-l { from { transform: translateX(-105%); } }
@keyframes ks-in-r { from { transform: translateX(105%); } }
@keyframes ks-shake { 0%, 100% { transform: none; } 20% { transform: translateX(-7px) rotate(-3deg); } 45% { transform: translateX(6px) rotate(2deg); } 70% { transform: translateX(-3px); } }
@keyframes ks-bam { 0% { transform: scale(1.5); } 25% { transform: scale(0.92) translateX(-9px) rotate(-4deg); } 45% { transform: scale(1.06) translateX(8px) rotate(3deg); }
  65% { transform: translateX(-4px); } 100% { transform: none; } }
@keyframes ko-run { from { transform: scaleX(1); } to { transform: scaleX(0); } }
@keyframes ko-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes ko-dot { 0%, 60%, 100% { opacity: 0.3; transform: none; } 30% { opacity: 1; transform: translateY(-2px); } }
@keyframes ko-tick { to { transform: scale(1.12); } }
@keyframes ko-low { to { opacity: 0.55; } }
@keyframes ko-fly { 0% { opacity: 0; transform: translateY(6px) scale(0.8); } 15% { opacity: 1; transform: none; } 75% { opacity: 1; } 100% { opacity: 0; transform: translateY(-12px); } }
@keyframes ko-pop { 0% { opacity: 0; transform: scale(0.5); } 60% { opacity: 1; transform: scale(1.25); } 100% { transform: none; } }
@keyframes ko-drop { from { width: calc(var(--was) * 1%); } to { width: calc(var(--hp) * 1%); } }
@media (prefers-reduced-motion: reduce) {
  .ko-dots i, .ko-t.last, .ko-side.low .ko-fill, .ko-want, .ko-show, .ko-show.out, .ks-nb, .ks-pop, .ks-shake, .ks-bam { animation: none; }
  .ko-fly { display: none; }   /* zonder animatie bleef het getal onder de balk staan, over de status heen */
  .ko-bub, .ko-bub i.bump { animation: none; }
  .ko-rx.cool::after { animation-duration: 0.01s; }
  .ko-side.drain .ko-fill, .ko-side.drain .ko-lag { animation-duration: 0.01s; }
}`;

  let H = null, cur = null, skew = 0, oppN = 0, shownRes = null, sentRound = null, revNext = null, counting = null, endWait = null, endFor = null;
  const endSeen = new Set();   // K.O.-eindschermen die al in beeld waren: weggeklikt = niet terug (feedback 20/11: Tim kreeg ze steeds opnieuw)
  let tClock = null, tTick = null, tStart = null, tPop = null;
  const tx = () => TXT[H?.lang] || TXT.en;
  const esc = K.esc;
  const now = () => Date.now() + skew;
  const at = (iso) => (iso ? Date.parse(iso) : 0);
  const mult = (r) => (r <= 2 ? 1 : r === 3 ? 1.5 : r === 4 ? 2 : r === 5 ? 2.5 : 3);
  const CAP = 100;   // db/210: schade per ronde hooguit 100, ná de factor (zelfde als _ko_dmg)
  const dmgOf = (a, b, r) => Math.min(CAP, Math.round(Math.abs(a - b) * mult(r)));
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
  function clearTimers() { [tClock, tTick, tStart, tPop].forEach((t) => { clearInterval(t); clearTimeout(t); }); tClock = tTick = tStart = tPop = null; endWait = null; stopAnim(); }
  let anim = [], animGen = 0;   // de stappen van playResult
  function stopAnim() {
    anim.forEach(clearTimeout); anim = []; animGen++;
    document.querySelectorAll(".ko-ghost, .ks-bit, .ko-show").forEach((e) => e.remove());
    document.body.classList?.remove("ko-showing");
  }

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
    clash: (b) => { A.thud(b, 0, 260, 70, 0.32, 0.16); A.tick(b, 0, 3000, 0.1, 0.03); },   // de uitslag: het hoogste getal botst op het lagere
    bam: (b) => { A.thud(b, 0, 150, 38, 0.85, 0.42); A.swish(b, 0, 0.3, 1800, 220, 0.2, 0.06, 0, 0); },   // de max: een harde klap
    want: (b, at = 0) => { A.ring(b, at, 2349, 0.09); A.ring(b, at + 0.09, 2794, 0.08); },   // de ander wil revanche: belletje
    rx: (b) => A.ring(b, 0, 1568, 0.06),   // een reactie van de ander: een zacht tikje
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
    clearInterval(tPop); tPop = null; endFor = null;
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
    clearInterval(tPop); tPop = null; endFor = null;
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
    const why = !r.ok && /busy|cooldown/.exec(r.e || "");   // db/213: die speelt nu een knock-out, of zei net nee
    if (why) return showLate({ state: why[0], opp: k, opp_name: name });
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
    const T = tx(), n = oppName(g), s = g.state;
    // nog eens vragen alleen als die niet reageerde (bij "Niet nu", bezet of te vaak gevraagd zegt de server toch nee: db/213)
    const h = s === "busy" ? T.busyH(n) : s === "declined" || s === "cooldown" ? T.declH(n) : T.lateH(n);
    const p = s === "busy" ? T.busyP : s === "declined" || s === "cooldown" ? T.coolP : T.lateP;
    pop(band(g, T.noResp, " ko-idle") + `<h2>${esc(h)}</h2><p>${esc(p)}</p>` +
      (s === "expired" ? `<button type="button" class="duel-go" data-ko="again">${esc(T.again)}</button><button type="button" class="duel-go ko-alt" data-ko="turn">${esc(T.turn)}</button>`
        : `<button type="button" class="duel-go" data-ko="turn">${esc(T.turn)}</button>`) +
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
    countdown(el.querySelector(".ko-left"), at(g.invite_until), (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`, () => closePop());
  }
  // Ronde 1 (of de revanche) begint: kort aftellen, dan het rondescherm
  function showCount(g, rev) {
    const T = tx();
    const el = pop(band(g, rev ? T.revH : T.tag) + `<h2>${esc(rev ? T.revH : T.startH)}</h2><p class="ko-count">3</p><p>${esc(T.startP)}</p>`, () => {});
    countdown(el.querySelector(".ko-count"), at(g.round_at), (s) => { if (s > 0) sfx(`c:${g.code}:${s}`, "count"); return s > 0 ? String(s) : "⚡"; });
  }

  // ── reacties (20/11, mockup Reacties; zijn "die reacties waren leuk"): zes vaste, geen vrije tekst; gg en g2g zijn in elke taal hetzelfde.
  // Sturen kan in de ronde (het knopje rechts in de levensstrook, ook tijdens de uitslag-laag) en op het K.O.-eindscherm (de rij onder
  // Revanche). De ander ziet een bubbel uit jouw gezichtje (2,5 s); dezelfde reactie binnen die tijd = ×2, ×3. Limiet (ook op de server,
  // db/214 ko_react): 1 per 2 s, hooguit 6 per ronde; na het spel nog 5 minuten. Niets wordt opgeslagen.
  const RX = ["😂", "🤯", "🔥", "😬", "gg", "g2g"], RXGAP = 2000, RXMAX = 6, RXLIFE = 2500;
  const RXI = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="10.5" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/>` +
    `<circle cx="7.8" cy="11.6" r="1.15" fill="currentColor"/><circle cx="13.2" cy="11.6" r="1.15" fill="currentColor"/>` +
    `<path d="M7.2 15.2a3.9 3.9 0 0 0 6.6 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>` +
    `<path d="M20 2v5M17.5 4.5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  const isW = (e) => /^[a-z0-9]+$/.test(e);
  let rxOpen = false, rxN = 0, rxKey = null, rxAt = 0;
  const rxCounted = new Set();
  const rxKeyOf = (g) => `${g.code}:${g.state === "live" ? g.round : 0}`;
  const rxOk = (g) => !!g && (g.state === "live" || (g.state === "done" && at(g.finished_at) > now() - 300000));
  const rxWait = (g) => Date.now() - rxAt < RXGAP || (rxKey === rxKeyOf(g) && rxN >= RXMAX);   // net gestuurd, of op (tot de volgende ronde)
  const rxRow = (T, cls = "") => `<div class="ko-rx${cls}" role="group" aria-label="${esc(T.react)}">` +
    RX.map((e, i) => `<button type="button"${isW(e) ? ' class="w"' : ""} data-ko="rx" data-rx="${i}" aria-label="${esc(T.rxL.split("|")[i])}" title="${esc(T.rxL.split("|")[i])}">${e}</button>`).join("") + `</div>`;
  // jij stuurt reactie i (vanaf het knopje in de strook, of de rij op het eindscherm: row)
  function react(i, row) {
    const g = cur;
    if (!g || !rxOk(g) || !(i >= 0 && i < RX.length)) return;
    const key = rxKeyOf(g);
    if (rxKey !== key) { rxKey = key; rxN = 0; }
    if (rxWait(g)) return;
    rxAt = Date.now(); rxN++;
    if (!rxCounted.has(g.code)) { rxCounted.add(g.code); K.gc("ko-rx", "Knockout: reaction sent"); }
    bubble("me", i);
    if (row) {   // de rij op het eindscherm: 2 s grijs met een lijntje dat leegloopt; na 6 grijs
      row.classList.add("cool"); row.querySelector(`[data-rx="${i}"]`)?.classList.add("sent");
      setTimeout(() => { row.classList.remove("cool"); row.querySelectorAll(".sent").forEach((b) => b.classList.remove("sent")); if (rxN >= RXMAX && rxKey === key) row.classList.add("out"); }, RXGAP);
    } else {   // het knopje in de strook: dicht, 2 s grijs (na 6: tot de volgende ronde)
      rxOpen = false;
      const btn = document.querySelector("#duel-vs .ko-rx-btn");
      document.querySelector("#duel-vs .ko-rx.float")?.remove();
      if (btn) { btn.setAttribute("aria-expanded", "false"); btn.disabled = true; if (rxN < RXMAX) setTimeout(() => { if (btn.isConnected) btn.disabled = false; }, RXGAP); }
    }
    call("ko_react", { p_code: g.code, p_i: i });   // te snel, op of dicht: de server zegt nee, de ander ziet dan niets
  }
  // een bubbel uit het gezichtje van wie hem stuurde: op het eindscherm onder de band, anders in de levensstrook
  function bubble(who, i) {
    const el = document.getElementById(ID), end = el && !el.hidden && endFor === cur?.code ? el.querySelector(".ko-bandw") : null;
    const host = end || document.querySelector(`#duel-vs .ko-side.${who}`);
    if (!host) return;
    const old = [...host.children].find((x) => x.classList.contains("ko-bub") && (!end || x.classList.contains(who)));
    if (old && +old.dataset.rx === i && Date.now() - (+old.dataset.t || 0) < RXLIFE) {   // dezelfde nog eens: ×n
      const n = +old.dataset.n + 1;
      old.dataset.n = n; old.dataset.t = Date.now();
      old.querySelector("i")?.remove();
      old.insertAdjacentHTML("beforeend", `<i class="bump">×${n}</i>`);
      old.style.animation = "none"; void old.offsetWidth; old.style.animation = "";
      return;
    }
    old?.remove();
    const b = document.createElement("span");
    b.className = `ko-bub${isW(RX[i]) ? " w" : ""}${end ? " " + who : ""}`; b.dataset.rx = i; b.dataset.n = 1; b.dataset.t = Date.now();
    b.setAttribute("aria-hidden", "true"); b.textContent = RX[i];
    host.appendChild(b);
    setTimeout(() => { if (+b.dataset.t + RXLIFE <= Date.now() + 30) b.remove(); }, RXLIFE + 50);
  }

  // ── het rondescherm ──
  function stripHtml(g, { drain = null } = {}) {
    const T = tx(), st = H.state(), n = oppName(g), r = g.round;
    const max = g.hp_max || HP, pc = (v) => Math.round((v / max) * 1000) / 10;   // de balk in procenten van de levens
    const side = (who, name, av, hp, was) => {
      const cls = ["ko-side", who, hp <= max / 4 ? "low" : "", was != null && was !== hp ? "drain" : ""].filter(Boolean).join(" ");
      const hit = was != null && was !== hp;
      return `<div class="${cls}" style="--hp:${pc(hp)};--was:${pc(was ?? hp)}"><span class="ko-who">${av}<b>${esc(name)}</b>` +
        `<b class="ko-n${hit ? " hit" : ""}">${hp}</b></span><span class="ko-bar"><i class="ko-lag"></i><i class="ko-fill"></i></span>` +
        (hit ? `<span class="ko-fly" aria-hidden="true">−${was - hp}</span>` : "") + `</div>`;
    };
    const me = K.dbAv(K.meFlair(), K.meNameOr(T, T.you)), op = K.dbAv(g.opp_flair, n);
    const pips = (k) => `<span class="ko-pips" aria-hidden="true">${[0, 1, 2, 3, 4, 5].map((i) => `<i${i < k ? ' class="on"' : ""}></i>`).join("")}</span>`;
    let status = "", clock = "";
    const playing = g.state === "live" && st?.duel?.ko && st.duel.code === g.code && st.duel.round === r;
    const rr = drain ? drain.r : r;
    if (drain?.hold) status = "";   // de laag speelt nog: niets verklappen (ook de K.O. niet)
    else if (g.state === "done") status = g.winner === "me" ? esc(T.isKo(n)) : g.winner === "opp" ? esc(T.youKo) : esc(T.draw);
    else if (drain) status = drain.who ? esc(drain.who === "me" ? T.rForMe(drain.r) : T.rFor(drain.r, n)) : esc(T.rTie(drain.r));   // hold: de laag speelt nog, niets verklappen
    else if (playing && g.deadline) {
      status = st.done ? `<span>${esc(T.waitOpp(n))}</span><span class="ko-t">…</span>` : `<span>${esc(T.oppGuessed(n))}</span><span class="ko-t">…</span>`;
      clock = `<div class="ko-clock"><i></i></div>`;
    } else if (playing) status = `<span class="ko-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>${esc(T.thinking(n))}</span>`;
    const hold = drain?.hold;   // playResult: de balk wacht op de schade die eraan komt
    return side("me", T.you, me, hold ? drain.me : g.hp, hold ? null : drain?.me) + `<span class="ko-mid"><b>R${rr}</b><span class="${mult(rr) > 1 ? "up" : ""}">×${esc(fmtM(mult(rr)))}</span></span>` +
      side("op", n, op, hold ? drain.op : g.opp_hp, hold ? null : drain?.op) + `<div class="ko-st${clock ? " clock" : ""}">${status}</div>${clock}` +
      (rxOk(g) ? `<button type="button" class="ko-rx-btn" aria-expanded="${rxOpen}" aria-label="${esc(T.react)}"${rxWait(g) ? " disabled" : ""}>${RXI}</button>` +
        (rxOpen && !rxWait(g) ? rxRow(T, " float") : "") : "");
  }
  function drawTop(g) {
    const T = tx(), dt = K.tx(H.lang), tabs = document.getElementById("mode-tabs"), card = document.getElementById("event-card");
    document.body.setAttribute("data-duelpage", "");
    document.body.setAttribute("data-arena", "");
    document.body.setAttribute("data-ko", "");   // CSS: één gokregel, geen puntenteller
    document.getElementById("ko-hintnote")?.remove();   // de zin "een hint geeft … de punten" is weg (20/11: verwarrend)
    let top = document.getElementById("duel-top");
    if (!top && tabs) {
      top = document.createElement("div");
      top.id = "duel-top"; top.className = "duel-top";
      tabs.before(top);
    }
    if (top) {
      top.innerHTML = `<div class="duel-left"><button type="button" class="duel-exit" aria-label="${esc(dt.exit)}">${K.exitHtml()}</button>${K.sndHtml(dt)}</div>` +
        `<button type="button" class="duel-title duel-home dl-logo" aria-label="${esc(dt.toDuels)}">${K.logoHtml(dt)}</button>` +
        `<span class="duel-round"><span class="dl-th">⚡ ${esc(T.tag)}</span><span>${esc(T.roundN(g ? g.round : H.state()?.duel?.round || 1))}</span></span>`;
      K.setHost(H); K.armSnd(top);   // 🔈 ook hier (20/11): dezelfde knop als op de Duels-pagina (H: game.js bewaart de keuze)
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
    vs.onmousedown = (e) => { if (e.target.closest(".ko-rx-btn, .ko-rx")) e.preventDefault(); };   // de focus blijft waar hij was (Enter = gok)
    vs.onclick = (e) => {
      const b = e.target.closest(".ko-rx button[data-rx]");
      if (b) return react(+b.dataset.rx);
      const t = e.target.closest(".ko-rx-btn");
      if (!t || t.disabled) return;
      rxOpen = !rxOpen;
      t.setAttribute("aria-expanded", String(rxOpen));
      vs.querySelector(".ko-rx.float")?.remove();
      if (rxOpen) t.insertAdjacentHTML("afterend", rxRow(tx(), " float"));
    };
    if (rxWait(cur) && !(rxKey === rxKeyOf(cur) && rxN >= RXMAX)) setTimeout(() => { const t = vs.querySelector(".ko-rx-btn"); if (t && !rxWait(cur)) t.disabled = false; }, RXGAP - (Date.now() - rxAt) + 20);
    if (opts?.drain && !opts.drain.hold) tickDown(vs);
    armClock();
  }
  // de levens bij de balk tellen razendsnel af, gelijk met de balk die zakt (ko-drop: 0,5 s wachten, dan 0,35 s), geen sprong (20/11)
  function tickDown(vs) {
    if (typeof requestAnimationFrame !== "function") return;
    vs.querySelectorAll(".ko-side.drain").forEach((sd) => {
      const n = sd.querySelector(".ko-n"), max = cur?.hp_max || HP;
      const from = Math.round((parseFloat(sd.style.getPropertyValue("--was")) / 100) * max), to = Number(n?.textContent);
      if (!n || !(from > to)) return;
      n.textContent = String(from);
      const g0 = animGen;
      setTimeout(() => {
        const t0 = performance.now();
        const f = (t) => { if (g0 !== animGen || !n.isConnected) return; const k = Math.min(1, (t - t0) / 350); n.textContent = String(Math.round(from + (to - from) * k)); if (k < 1) requestAnimationFrame(f); };
        requestAnimationFrame(f);
      }, 500);
    });
  }
  // de klok (alleen als iemand klaar is): tekst + balk; op 0 zelf klaar (verloren), daarna laat de server afrekenen
  function armClock() {
    clearInterval(tClock); tClock = null;
    const g = cur, st = H.state();
    if (!g || g.state !== "live" || !g.deadline || st?.duel?.round !== g.round) return;
    const end = at(g.deadline), span = 15000, rk = `${g.code}:${g.round}`;
    if (end - now() > 1000) sfx(`dl:${rk}`, "clock");   // de klok begint: allebei hetzelfde geluid (ook wie al gokte en wacht)
    const tick = () => {
      const ms = Math.max(0, end - now()), s = Math.ceil(ms / 1000);
      const t = document.querySelector("#duel-vs .ko-t"), bar = document.querySelector("#duel-vs .ko-clock > i");
      if (t) { t.textContent = String(s); t.classList.toggle("last", s > 0 && s <= 5); }
      if (s > 0 && s <= 5) sfx(`t:${rk}:${s}`, "tick", s);   // de laatste 5 s: allebei de tik-tak
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
    oppN = 0; shownRes = null; sentRound = null; counting = null; rxOpen = false;
    const p = g.puzzle;
    if (!p) return refresh(g.code);
    K.gc("ko-round-" + Math.min(g.round, 6), "Knockout: round " + Math.min(g.round, 6));
    // terug in een ronde die je al open had (via Duels, 20/11): je bord zoals je het achterliet (de gok, de hints), anders kon je opnieuw
    // gokken en waren je hints gratis; al gegokt = meteen weer "Wachten op …" (ko_submit nog eens geeft gewoon de stand)
    H.startRound({ mode: "free", hashes: p.hashes, event: H.toEvent(p), board: H.duelBoard?.(g.code, g.round) || null, potId: `k${g.code}${g.round}`,
                   duel: { code: g.code, round: g.round, opp: oppName(g), ko: true } });
  }
  // ── de uitslag van een ronde: een laag over het hele scherm (20/11, zijn "superimposed, net als confetti"; referentie GeoGuessr-duels,
  // in Jaardle-stijl). Zo min mogelijk tekst (zijn wens): bovenaan het echte jaar (groen) tussen jullie gokken (in de kleur van de afstand,
  // zoals de gokregels), daaronder groot de punten met alleen de hints als chips, in het midden de factor. Het hoogste getal vliegt op het
  // lagere en botst; dat telt door naar minpunten (het verschil), dan × de factor tot de schade (de max: goud, geen tekst), en die vliegt
  // naar de levensbalk, die boven de laag blijft. Tik = meteen het eindbeeld. Daarna blijft in de pagina één regel (tik = nog eens zien).
  const band5 = (d) => (d === 0 ? "correct" : d <= 2 ? "veryclose" : d <= 5 ? "near" : d <= 10 ? "close" : d <= 25 ? "warm" : d <= 50 ? "cool"
    : d <= 200 ? "far" : d <= 599 ? "distant" : "farthest");   // = classify() in game.js
  const fmtN = (v) => (v < 0 ? `−${-v}` : String(v));
  // het hinttotaal van de server (ko_submit p_hints) terug in losse hints: 🏛️ 20, 🔢 10, ⏩ 3 per stuk (hooguit 6). Die som is eenduidig
  // (rest bij delen door 3: 2 = 🏛️, 1 = 🔢, 0 = geen van beide of allebei vanaf 30); klopt hij niet, dan één chip met het totaal.
  function hintParts(t) {
    if (!(t > 0)) return [];
    const m = t % 3, both = m === 0 && t >= 30, c = m === 2 || both, d = m === 1 || both, l = (t - (c ? 20 : 0) - (d ? 10 : 0)) / 3;
    if (!(l >= 0 && l <= 6 && Number.isInteger(l))) return [["", t]];
    return [...(c ? [["🏛️", 20]] : []), ...(d ? [["🔢", 10]] : []), ...(l ? [["⏩", 3 * l]] : [])];
  }
  // ronde r van g: beide kanten (punten, gok, hints, afstand), het verschil, de schade, en wie hem krijgt (who: "me" = jij, "op" = de ander)
  function roundOf(g, r) {
    const a = g.mine[r - 1], b = g.theirs[r - 1], m = mult(r), d = Math.abs(a - b), raw = Math.round(d * m), ans = g.answers?.[r - 1];
    const side = (pts, y, h) => ({ pts, y: y ?? null, h: h || 0, off: y == null || ans == null ? null : Math.abs(y - ans) });
    return { r, m, d, x: Math.min(CAP, raw), max: d > 0 && raw >= CAP, ans, who: a > b ? "op" : a < b ? "me" : null,
             a: side(a, g.my_years?.[r - 1], g.my_hints?.[r - 1]), b: side(b, g.their_years?.[r - 1], g.their_hints?.[r - 1]) };
  }
  // de levens na elke ronde, vanaf de start (zoals de server: de schade eraf, niet onder 0)
  function hpPath(g) {
    const max = g.hp_max || HP, out = [[max, max]];
    let a = max, b = max;
    for (let i = 0; i < Math.min(g.mine.length, g.theirs.length); i++) {
      const x = dmgOf(g.mine[i], g.theirs[i], i + 1);
      if (g.mine[i] < g.theirs[i]) a = Math.max(0, a - x); else if (g.mine[i] > g.theirs[i]) b = Math.max(0, b - x);
      out.push([a, b]);
    }
    return out;
  }
  const chipsHtml = (p) => hintParts(p.h).map(([e, v]) => `<span class="ks-hint">${e ? `<span aria-hidden="true">${e}</span>` : ""}−${v}</span>`).join("");
  // het eindbeeld van de laag (afspelen zet alles eerst terug op het begin)
  function showHtml(g, q) {
    const T = tx(), n = oppName(g), lo = q.who;
    const yr = (p) => (p.y == null ? `<b class="ks-yr none">—</b>` : `<b class="ks-yr delta-badge ${p.off == null ? "" : band5(p.off)}">${esc(fmtN(p.y))}</b>`);
    const sc = (p, who) => `<div class="ks-s ${who}${lo ? (lo === who ? " lose" : " win") : ""}">` +
      (lo === who ? `<strong class="dmg${q.max ? " max" : ""}">−${q.x}</strong>` : `<strong>${fmtN(p.pts)}</strong>`) + `<small>${chipsHtml(p)}</small></div>`;
    return `<div class="ks-row ks-top"><div class="ks-g me">${yr(q.a)}</div><b class="ks-yr ks-ans delta-badge correct">${q.ans == null ? "?" : esc(fmtN(q.ans))}</b>` +
      `<div class="ks-g op">${yr(q.b)}</div></div><div class="ks-row ks-mid">${sc(q.a, "me")}<b class="ks-f">×${esc(fmtM(q.m))}</b>${sc(q.b, "op")}</div>` +
      `<div class="ks-names"><div class="ks-nb me${lo === "me" ? " lose" : ""}">${K.dbAv(K.meFlair(), K.meNameOr(T, T.you))}<b>${esc(T.you)}</b></div>` +
      `<div class="ks-nb op${lo === "op" ? " lose" : ""}"><b>${esc(n)}</b>${K.dbAv(g.opp_flair, n)}</div></div>`;
  }
  // wat er na de laag in de pagina blijft: één regel (tik = nog eens zien); tijdens de pauze loopt hij vol tot de volgende ronde
  function lineHtml(g, q) {
    const T = tx(), n = oppName(g), live = g.state === "live" && g.round > q.r;
    const hit = q.who ? `<span class="ka-who ${q.who}">${q.who === "op" ? K.dbAv(g.opp_flair, n) : K.dbAv(K.meFlair(), K.meNameOr(T, T.you))}<em class="${q.max ? "max" : ""}">−${q.x}</em></span>` : `<em class="tie">0</em>`;
    return `<button type="button" class="ko-after${live ? "" : " still"}" style="--h:${hue(g)}${live ? `;--dur:${Math.max(0, at(g.round_at) - now())}ms` : ""}" title="${esc(T.replay)}">` +
      `<span class="ka-l"><b>R${q.r}</b>${hit}</span>${live ? `<span class="n">R${g.round} · ×${esc(fmtM(mult(g.round)))}</span>` : ""}</button>`;
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
  const reduced = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } };
  // ronde r is afgerekend: de laag (of meteen het eindbeeld als er te weinig tijd is), de regel in de pagina, en in een lopend spel de
  // volgende ronde op round_at. gone() = de laag is weg (bij de laatste ronde komt dan de K.O.).
  function showResult(g, r, gone) {
    if (shownRes === `${g.code}:${r}`) return false;
    shownRes = `${g.code}:${r}`;
    const q = roundOf(g, r), was = hpPath(g)[r - 1] || [g.hp, g.opp_hp];
    const drain = { r, who: q.who === "op" ? "me" : q.who === "me" ? "opp" : null, me: was[0], op: was[1] };   // who = wie de ronde won
    const el = placeCard(lineHtml(g, q));
    const again = el.querySelector(".ko-after");
    if (again) again.onclick = () => {   // nog eens zien (de balk blijft staan)
      if (!document.querySelector(".ko-show")) overlay(g, q, { hit() {}, left: g.state === "live" && g.round > r ? at(g.round_at) - now() : Infinity });
    };
    let hitDone = false;
    const hit = () => { if (hitDone) return; hitDone = true; drawStrip({ drain }); if (q.who) sfx(`res:${g.code}:${r}`, "hit", q.x, q.who === "me"); };
    const left = g.state === "live" ? at(g.round_at) - now() : Infinity;
    if (left < 2200) { hit(); gone?.(); }
    else {
      drawStrip({ drain: { ...drain, hold: true } });   // de balk wacht op de schade die eraan komt
      overlay(g, q, { hit, gone, left });
    }
    if (g.state === "live") {
      clearInterval(tStart);
      tStart = setInterval(() => { if (now() >= at(g.round_at)) { clearInterval(tStart); tStart = null; startRound(g); } }, 250);
    }
    return true;
  }
  // de laag zelf. o.hit() = de levensbalk zakt (één keer), o.gone() = de laag is weg, o.left = ms tot de volgende ronde (past het
  // afspelen er niet in, of minder beweging: meteen het eindbeeld)
  function overlay(g, q, o) {
    stopAnim();
    const vs = document.getElementById("duel-vs");
    if (vs && vs.getBoundingClientRect().top < 0) scrollTo(0, Math.max(0, scrollY + vs.getBoundingClientRect().top - 8));   // de levens in beeld: daar landt de schade
    const ov = document.createElement("div");
    ov.className = "ko-show"; ov.setAttribute("role", "status"); ov.setAttribute("aria-label", tx().resultOf(q.r));
    ov.style.setProperty("--h", hue(g));
    if (vs) ov.style.setProperty("--top", `${Math.round(vs.getBoundingClientRect().bottom + 14)}px`);
    ov.innerHTML = showHtml(g, q);
    document.body.appendChild(ov);
    document.body.classList.add("ko-showing");
    const later = (ms, fn) => { const g0 = animGen; anim.push(setTimeout(() => { if (g0 === animGen && ov.isConnected) fn(); }, ms)); };
    const onKey = (e) => { if (e.key === "Escape") fin(800); };
    const leave = () => { ov.classList.add("out"); later(400, () => { ov.remove(); document.body.classList.remove("ko-showing"); document.removeEventListener("keydown", onKey); o.gone?.(); }); };
    function fin(read) {   // het eindbeeld (tik, Escape, minder beweging, te weinig tijd); daarna nog even lezen en weg
      anim.forEach(clearTimeout); anim = []; animGen++;
      document.querySelectorAll(".ko-ghost, .ks-bit").forEach((e) => e.remove());
      ov.innerHTML = showHtml(g, q);
      o.hit();
      later(read, leave);
    }
    ov.onclick = () => fin(1200);
    document.addEventListener("keydown", onKey);
    const $ = (sel) => ov.querySelector(sel), lo = q.who, wi = lo === "op" ? "me" : lo === "me" ? "op" : null;
    // de tijdlijn: de hints komen één voor één (zijn idee 20/11), daarna schuift de rest op (T0). Bij 3 hints iets vlotter, zodat het
    // in de pauze van 8 s past; daarna minstens tot de balk gezakt is (T0 + 3600), en weg uiterlijk 0,5 s voor de volgende ronde
    const parts = { me: hintParts(q.a.h), op: hintParts(q.b.h) }, hn = Math.max(parts.me.length, parts.op.length), HS = hn >= 3 ? 450 : 600;
    const T0 = hn ? 1700 + hn * HS : 1650, left = o.left ?? Infinity;
    if (reduced() || left < T0 + 3600 + 500) return fin(Math.max(800, Math.min(2500, left - 1500)));
    const S = { me: $(".ks-s.me"), op: $(".ks-s.op") }, N = { me: S.me.querySelector("strong"), op: S.op.querySelector("strong") };
    const C = { me: S.me.querySelector("small"), op: S.op.querySelector("small") }, P = { me: q.a, op: q.b };
    const pop = (els) => els.forEach((e) => { if (!e) return; e.classList.remove("ks-wait", "ks-pop"); void e.offsetWidth; e.classList.add("ks-pop"); });
    const shake = (e, cls = "ks-shake") => { e.classList.remove("ks-shake", "ks-bam"); void e.offsetWidth; e.classList.add(cls); };
    // from → to, met het echte minteken. Optellen remt af; aftellen gaat lineair en razendsnel, zodat je elk getal ziet langskomen
    // (20/11, zijn "opeens veranderende getallen houd ik niet van, liever extreem snel omlaag tellen"): 18 ms per punt, 300–cap ms
    const down = (d, cap = 700) => Math.min(cap, Math.max(300, Math.abs(d) * 18));
    const count = (n, from, to, ms, step, lin = to < from) => {
      const g0 = animGen, t0 = performance.now();
      const f = (t) => { if (g0 !== animGen) return; const k = Math.min(1, (t - t0) / ms), v = Math.round(from + (to - from) * (lin ? k : 1 - (1 - k) ** 3)); n.textContent = fmtN(v); step?.(v); if (k < 1) requestAnimationFrame(f); };
      requestAnimationFrame(f);
    };
    // beginstand: alles nog weg, de getallen op 0
    [$(".ks-ans"), ...ov.querySelectorAll(".ks-g > *"), $(".ks-f"), C.me, C.op].forEach((e) => e?.classList.add("ks-wait"));
    for (const k of ["me", "op"]) { S[k].classList.remove("win", "lose"); N[k].className = ""; N[k].textContent = "0"; }
    ov.querySelectorAll(".ks-nb").forEach((e) => e.classList.remove("lose"));
    later(250, () => pop([$(".ks-ans")]));   // het echte jaar
    later(520, () => pop([...ov.querySelectorAll(".ks-g.me > *")]));   // jouw gok
    later(680, () => pop([...ov.querySelectorAll(".ks-g.op > *"), $(".ks-f")]));   // die van de ander, en de factor
    later(950, () => { for (const k of ["me", "op"]) count(N[k], 0, P[k].pts + P[k].h, 650); });   // de punten tellen op
    // de hints, één voor één: de chip springt op en botst op je eigen getal, dat zakt (eerst je eigen hints, dan pas de ander)
    for (const k of ["me", "op"]) {
      let v = P[k].pts + P[k].h;
      parts[k].forEach(([, c], i) => {
        const t = 1700 + i * HS, chip = () => C[k].children[i];
        later(t, () => { C[k].classList.remove("ks-wait"); [...C[k].children].forEach((x, j) => x.classList.toggle("ks-wait", j > i)); pop([chip()]); });
        later(t + 170, () => { const ch = chip(); if (ch) { ghost(ch, N[k], ch.textContent, 280, "shot"); ch.classList.add("used"); } });
        later(t + 450, () => {
          const from = v; v -= c;
          burst(ov, N[k], ["var(--duel-loss)", "#fff"], 8, 0.6); shake(S[k]); sfx(`hint:${g.code}:${q.r}:${k}:${i}`, "clash");
          count(N[k], from, v, down(c, 360));
        });
      });
    }
    later(T0 + 550, () => { if (!lo) return; S[wi].classList.add("win"); S[lo].classList.add("lose"); ov.querySelector(`.ks-nb.${lo}`)?.classList.add("lose"); });
    if (!lo) {   // gelijk: ze botsen in het midden, geen schade
      later(T0 + 900, () => { for (const k of ["me", "op"]) ghost(N[k], $(".ks-f"), N[k].textContent, 480, "shot"); });
      later(T0 + 1380, () => { burst(ov, $(".ks-f"), ["var(--muted)", "var(--ko-lag)"]); sfx(`clash:${g.code}:${q.r}`, "clash"); o.hit(); });
      later(Math.min(T0 + 2650, left - 500), leave);
      return;
    }
    later(T0 + 900, () => { N[wi].style.opacity = "0.35"; ghost(N[wi], N[lo], N[wi].textContent, 520, "shot"); });   // het hoogste getal vliegt op het lagere
    later(T0 + 1420, () => {   // de botsing: het lagere getal telt door naar minpunten (het verschil)
      N[wi].style.opacity = "";
      burst(ov, N[lo], [getComputedStyle(S[wi]).getPropertyValue("--col").trim() || "#6ea8ff", "var(--ko-lag)", "#fff"]);
      sfx(`clash:${g.code}:${q.r}`, "clash");
      N[lo].className = "hit"; shake(S[lo]);
      count(N[lo], P[lo].pts, P[lo].pts - P[wi].pts, down(P[wi].pts), (v) => N[lo].classList.toggle("neg", v < 0));
    });
    later(T0 + 2200, () => { pop([$(".ks-f")]); if (q.x !== q.d) count(N[lo], -q.d, -q.x, down(q.x - q.d, 500)); });   // × de factor: verder aftellen
    later(T0 + 2700, () => {   // = de schade; de max (goud) met een harde klap
      N[lo].className = q.max ? "dmg max" : "dmg";
      if (q.max) { shake(S[lo], "ks-bam"); sfx(`bam:${g.code}:${q.r}`, "bam"); }   // geen plop bij gewone schade: het getal telde al af
    });
    later(T0 + 3100, () => {   // naar de levensbalk, die dan zakt
      const bar = document.querySelector(`#duel-vs .ko-side.${lo} .ko-bar`);
      if (bar) ghost(N[lo], bar, `−${q.x}`, 500, q.max ? "dmg max" : "dmg");
      o.hit();
    });
    later(Math.max(T0 + 3600, Math.min(T0 + 4150, left - 500)), leave);
  }
  // de botsing: 14 deeltjes (spans in de laag, geen canvas); n en reach kleiner voor een hint
  function burst(ov, at0, cols, n = 14, reach = 1) {
    if (!at0 || !document.body.animate) return;
    const r = at0.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (let k = 0; k < n; k++) {
      const el = document.createElement("i"), ang = (k / n) * Math.PI * 2 + Math.random() * 0.4, dist = (34 + Math.random() * 46) * reach, sz = (5 + Math.random() * 6) * Math.max(0.7, reach);
      el.className = "ks-bit";
      Object.assign(el.style, { left: `${cx}px`, top: `${cy}px`, width: `${sz}px`, height: `${sz}px`, background: cols[k % cols.length] });
      ov.appendChild(el);
      el.animate([{ transform: "translate(0, 0) scale(1)", opacity: 1 }, { transform: `translate(${Math.cos(ang) * dist}px, ${Math.sin(ang) * dist}px) scale(0.3)`, opacity: 0 }],
        { duration: 520 + Math.random() * 260, easing: "cubic-bezier(0.1, 0.7, 0.3, 1)", fill: "forwards" }).onfinish = () => el.remove();
    }
  }
  // een getal dat van from naar to vliegt (vast op het scherm, los van scrollen); niet als een van beide niet in beeld is.
  // "shot" = het hoogste getal dat op het lagere afgaat (met een aanloopje); anders krimpt het onderweg en verdwijnt bij aankomst
  function ghost(from, to, text, ms, cls = "") {
    if (!from || !to) return;
    const p = from.getBoundingClientRect(), q = to.getBoundingClientRect();
    const seen = (r) => r.width && r.bottom > 0 && r.top < innerHeight;
    if (!seen(p) || !seen(q) || !document.body.animate) return;
    const el = document.createElement("span"), cs = getComputedStyle(from), shot = cls === "shot";
    el.className = `ko-ghost ${cls}`; el.textContent = text; el.setAttribute("aria-hidden", "true");
    // los per eigenschap: Chrome geeft de afkorting font leeg terug bij font-variant-numeric (dan vloog er een klein getal)
    if (!cls || shot) for (const k of ["fontSize", "fontWeight", "fontFamily", "lineHeight", "letterSpacing", "color", "textShadow"]) el.style[k] = cs[k];
    Object.assign(el.style, { left: `${p.left}px`, top: `${p.top}px`, width: `${p.width}px`, height: `${p.height}px` });
    document.body.appendChild(el);
    const dx = q.left + q.width / 2 - (p.left + p.width / 2), dy = q.top + q.height / 2 - (p.top + p.height / 2), end = `translate(${dx}px, ${dy}px)`;
    const frames = shot ? [{ transform: "none" }, { transform: `translate(${dx * 0.15}px, -6px) scale(1.12)`, offset: 0.25 }, { transform: `${end} scale(1.05)` }]
      : [{ transform: "none", opacity: 1 }, { transform: `${end} scale(0.75)`, opacity: 1, offset: 0.85 }, { transform: `${end} scale(0.5)`, opacity: 0 }];
    el.animate(frames, { duration: ms, easing: shot ? "cubic-bezier(0.5, 0, 0.9, 0.5)" : "cubic-bezier(0.55, 0, 0.7, 0.4)", fill: "forwards" }).onfinish = () => el.remove();
  }
  // het levensverloop (eindscherm A, zijn keuze 20/11): twee lijnen van de start naar het eind, onder elke ronde de factor en de schade
  // (in de kleur van wie hem kreeg; de max in goud). Ook voor Duels (KO.lifeHtml).
  function lifeHtml(g) {
    const T = tx(), n = oppName(g), max = g.hp_max || HP, hp = hpPath(g), N = hp.length, W = 300, Hh = 104;
    const y = (v) => 8 + (1 - v / max) * (Hh - 16), x = (i) => ((i + 0.5) * W) / N;
    const pts = (k) => hp.map((h, i) => `${x(i).toFixed(1)},${y(h[k]).toFixed(1)}`).join(" ");
    const last = hp[N - 1], lx = x(N - 1);
    let ya = y(last[0]), yb = y(last[1]);
    if (Math.abs(ya - yb) < 14) { const m = (ya + yb) / 2; ya = m + (last[0] >= last[1] ? -7 : 7); yb = m + (last[0] >= last[1] ? 7 : -7); }   // eindgetallen niet op elkaar
    const dot = (k, cls) => `<circle class="${last[k] === 0 ? "out" : cls}" cx="${lx.toFixed(1)}" cy="${y(last[k]).toFixed(1)}" r="${last[k] === 0 ? 5 : 4.5}"/>`;
    const lab = (k, cls, yy) => `<text class="${last[k] === 0 ? "out" : cls}" x="${(lx + 9).toFixed(1)}" y="${(yy + 4).toFixed(1)}">${last[k]}</text>`;
    const svg = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${esc(T.lifeAria(n, max, last[0], last[1]))}">` +
      `<line class="kl-ax" x1="0" x2="${W}" y1="${y(max)}" y2="${y(max)}"/><line class="kl-ax" x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}"/>` +
      `<polyline class="op" points="${pts(1)}"/><polyline class="me" points="${pts(0)}"/>${dot(1, "op")}${dot(0, "me")}${lab(0, "me", ya)}${lab(1, "op", yb)}</svg>`;
    const cols = hp.map((h, i) => {
      if (!i) return `<span class="kl-c"><b>${esc(T.start)}</b><small>❤️ ${max}</small></span>`;
      const q = roundOf(g, i);
      return `<span class="kl-c"><b>R${i}</b><small>×${esc(fmtM(q.m))}</small><em class="${q.who || ""}${q.max ? " max" : ""}">${q.who ? "−" + q.x : "0"}</em></span>`;
    }).join("");
    return `<div class="ko-life${N > 8 ? " many" : ""}" style="--h:${hue(g)};--n:${N}"><div class="kl-key"><span><i></i>${esc(T.you)}</span><span><i class="op"></i>${esc(n)}</span></div>` +
      `${svg}<div class="kl-x">${cols}</div></div>`;
  }
  function showEnd(g) {
    const T = tx(), n = oppName(g), r = Math.max(g.mine.length, g.theirs.length), won = g.winner === "me";
    const gave = g.mine.length === g.theirs.length && r > 0 && g.hp > 0 && g.opp_hp > 0 && g.winner;   // opgegeven
    const p = gave ? (won ? T.gaveUp(n) : T.youGaveUp) : !g.winner ? T.drawP : won ? T.koPWin(n, r, g.hp) : T.koPLoss(n, r, g.opp_hp);
    const want = g.re_opp ? `<span class="ko-want"><span aria-hidden="true">${K.flairEmoji?.(g.opp_flair) || "⚡"}</span> ${esc(T.wantsToo)}</span>` : "";
    const fresh = at(g.finished_at) > now() - 120000;
    const big = fresh && sfx(`ko:${g.code}`, g.winner ? "ko" : "draw", won);   // één keer per spel, niet bij een oude K.O.
    if (fresh && g.re_opp && !g.re_me && !g.next) sfx(`want:${g.code}`, "want", big ? 1.2 : 0);   // samen met de gong: na de gong
    pop(`<div class="ko-bandw" style="--h:${hue(g)}">${band(g, "K.O.", ` ko-end${won ? "" : " lost"}`)}</div>` +
      `<h2>${esc(!g.winner ? T.draw : won ? T.koWin : T.koLoss(n))}</h2><p>${esc(p)}</p>` +
      (Math.min(g.mine.length, g.theirs.length) ? lifeHtml(g) : "") +
      (fresh && !g.next ? (g.re_me ? `<button type="button" class="duel-go" disabled>${esc(T.rematchWait(n))}</button>`
        : `<button type="button" class="duel-go ko-rev" data-ko="re">${esc(T.rematch)}${want}</button>`) + `<p class="ko-alt-sub">${esc(T.rematchHint)}</p>` : "") +
      (rxOk(g) ? rxRow(T, rxKey === rxKeyOf(g) && rxN >= RXMAX ? " out" : "") : "") +
      `<button type="button" class="duel-no" data-ko="duels">${esc(T.toDuels)}</button>`,
      async (act, b) => {
        if (act === "rx") return react(+b.dataset.rx, b.closest(".ko-rx"));
        if (act === "re") { b.disabled = true; K.gc("ko-rematch", "Knockout: rematch"); const r2 = await call("ko_rematch", { p_code: g.code }); if (r2.ok && r2.v) apply(r2.v); return; }
        closePop(); H.switchMode("daily"); K.openList(H, {});
      });
    endFor = g.code; endSeen.add(g.code);
  }

  // ── de stand van de server op het scherm ──
  function apply(g, k) {
    if (!g || !g.code) return;
    skew = at(g.now) - Date.now();
    const prev = cur;
    cur = g;
    // het Duels-scherm toont een spel dat loopt (KO.liveHtml): begint of stopt er een, dan tekent duel.js de lijst opnieuw
    if (prev?.code !== g.code || (prev?.state === "live") !== (g.state === "live")) try { window.dispatchEvent(new CustomEvent("jaardle:ko-live")); } catch (e) {}
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
        // de laatste ronde speelt nog af: een tweede "klaar" (het seintje én het antwoord op je gok) wacht gewoon mee; showEnd neemt
        // dan de nieuwste stand (cur). Zonder dit sprong het scherm meteen naar de K.O. (feedback 20/11)
        if (endWait === g.code) return;
        if (r && st.done && shownRes !== `${g.code}:${r}` && g.theirs.length >= r) {   // eerst de laatste ronde (de laag, de balk), dan de K.O.
          clearTimeout(tStart);
          endWait = g.code;
          const end = () => { endWait = null; if (cur && cur.code === g.code) showEnd(cur); };
          const fb = setTimeout(() => { if (endWait === g.code) end(); }, 9000);   // vangnet: de laag werd onderbroken
          showResult(g, r, () => { clearTimeout(fb); clearTimeout(tStart); tStart = setTimeout(() => { if (endWait === g.code) end(); }, 500); });
          return;
        }
        drawStrip();
      }
      // Al gezien en weggeklikt: niet opnieuw (een revanche-knop van de ander, een nageleverd seintje, een laat bericht). Alleen wie nog
      // op het spelscherm staat krijgt hem één keer terug als de ander net om revanche vraagt, zolang dat kan (2 min)
      const el = document.getElementById(ID), open = !!(el && !el.hidden && endFor === g.code);
      const reNew = here && g.re_opp && !g.re_me && !(prev && prev.code === g.code && prev.re_opp) && at(g.finished_at) > now() - 120000;
      if (endSeen.has(g.code) && !open && !reNew) return;
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
    const r = await call("ko_submit", { p_code: dl.code, p_round: dl.round, p_year: st.guesses?.[0]?.year ?? null, p_hints: H.koHints?.() || 0 });
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
      const st = H.state();
      if (cur && cur.code !== p.code && cur.state === "live" && st?.duel?.ko && st.duel.code === cur.code) return;   // je speelt nu: niet storen
      if (p.replayed && p.k !== "invite" && !(cur && cur.code === p.code)) return;   // nageleverd over een ander (oud) spel: niets mee doen
      if (p.k === "rx") {   // een reactie van de ander (db/214): alleen een bubbel; nageleverd (replay) of over een ander spel: niets
        if (!p.replayed && cur && cur.code === p.code && Number.isInteger(p.i) && p.i >= 0 && p.i < RX.length) { bubble("op", p.i); sfx(`rx:${p.code}:${Date.now()}`, "rx"); }
        return;
      }
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
    // ?ko=CODE (de pushmelding van een uitnodiging, db/213): de stand ophalen; net na het laden is de sessie soms nog niet terug
    async open(host, code, tries = 4) {
      H = host; ensureCss();
      const r = await call("ko_get", { p_code: code });
      if (r.ok && r.v) return apply(r.v);
      if (tries > 1 && !/not_found|not_yours/.test(r.e || "")) setTimeout(() => window.KO.open(host, code, tries - 1), 1500);
    },
    // het ▾-menu van Duels: de Live-keuze bij een vriend die online is
    optHtml(lang, k, name) {
      const T = TXT[lang] || TXT.en;
      return `<button type="button" class="dl-opt ko-opt" data-act="ko" data-k="${esc(k)}"><span class="mo-e" aria-hidden="true">⚡</span>` +
        `<span><b>${esc(T.live)}</b><small>${esc(T.liveSub(name))}</small></span></button>`;
    },
    // Duels (terugzien, punt 8): het levensverloop van een afgelopen knock-out, en zijn eindscherm (zonder revanche als hij oud is)
    lifeHtml(host, g) { H = host; ensureCss(); return lifeHtml(g); },
    review(host, g) { H = host; ensureCss(); showEnd(g); },
    // Duels (20/11, zijn melding: "live op het duel-logo gedrukt, dan kun je niet meer terug in de game"): het spel dat nu loopt, als kaart
    // bovenaan (de hele kaart = terug) en als gezichtje dat "loopt"; resume = de verse stand ophalen, apply zet je terug in de ronde
    live: () => (cur && cur.state === "live" ? cur : null),
    liveHtml(host) {
      H = host; ensureCss();
      const g = cur;
      if (!g || g.state !== "live") return "";
      const T = tx(), n = oppName(g);
      K.setHost(H);
      const bandH = K.bandHtml(T, n, g.opp_flair).replace('<span class="vb-badge">⚔️</span>', '<span class="vb-badge ko-z">⚡</span>');
      const sub = g.opp_done ? `<em>${esc(T.oppGuessed(n))}</em>` : esc(T.hpLine(g.hp, n, g.opp_hp));
      return `<div class="dl-card turn ko-live" data-act="kolive">${bandH}<div class="dl-card-f"><small><b>⚡ ${esc(T.tag)} · ${esc(T.roundN(g.round))}</b><br>${sub}</small>` +
        `<button type="button" class="dl-go" data-act="kolive">${esc(T.back)}</button></div></div>`;
    },
    resume(host) {
      H = host; ensureCss();
      const g = cur;
      if (!g || g.state !== "live") return;
      K.gc("ko-resume", "Knockout: back into the game from Duels");
      call("ko_get", { p_code: g.code }).then((r) => apply(r.ok && r.v ? r.v : g));
    },
    css: CSS, copy: (l) => TXT[l], langs: () => Object.keys(TXT),
    _: { mult, SFX, sfx, hintParts, roundOf, hpPath, apply: (h, g) => { H = h; apply(g); }, stripHtml: (h, g, o) => { H = h; return stripHtml(g, o); },
         showHtml: (h, g, r) => { H = h; return showHtml(g, roundOf(g, r)); }, lineHtml: (h, g, r) => { H = h; return lineHtml(g, roundOf(g, r)); }, lifeHtml: (h, g) => { H = h; return lifeHtml(g); } },
  };
})();
