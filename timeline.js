// 🗓️ Timeline (alpha, 22/11/2026): jaardle.com/timeline. Eerst een losse pagina ("maak maar, maar laten we het nog niet promoten …
// gewoon achter jaardle.com/timeline als alpha mode"); dezelfde dag een pagina van de app zelf, zoals /duels/ (zijn "zelfde bovenscherm
// als duels dat je ook profiel enzo hebt want is 1 account"): game.js laadt dit bestand lui (op /timeline/ of bij een tik op de deur op
// de Duels-pagina) en roept open(host) aan. Dit zet het scherm (#modal-tl, een .modal in <main>) en het logo + 🔈 in de kop (#mode-tabs);
// profiel, 🌐 en de deur zijn van game.js. Nog alpha: noindex (build-html.mjs).
// Mockups: https://claude.ai/artifact/8deX6CCXoyNo5RLdM6ymz1 (het spel, v5), https://claude.ai/artifact/4f3dCFfBmN2X4iQ9cRguoo (de kop).
// Server: db/226 get_timeline_deck(lang); sinds db/233 (23/11) get_timeline_deck2 (met id), record_timeline_run (de server telt je run
// na uit de volgorde waarin je legde en geeft meteen het bord: je team deze week, of jij en de bots) en get_timeline_board (ander team).
// Mockup van 23/11 (treden, momenten, teambord): https://claude.ai/artifact/Y9tR8rKK9Umx3RDQq8z9vw
// Hoe het werkt: leg elke nieuwe kaart in het goede gat van je tijdlijn, door te slepen of op een + te tikken. De kaart draait dan om
// en laat het jaar zien. Fout kost een ❤️, na drie fouten is het klaar.
// Bewaard: het record en de geluidsstand per toestel (localStorage), en sinds db/233 elke run op de server (timeline_runs: je beste van
// de week voor het bord, je beste ooit voor het record, ook op een ander toestel). Geen plays, geen rating, geen trofeeën.
// Meetpunten (GoatCounter, site jaardle-events, zoals gcCount in game.js): timeline-start, timeline-end-<band>, timeline-share,
// timeline-deck-op, timeline-board-team / timeline-board-bots (het bord op het eindscherm), timeline-chase-tap / timeline-chase-top.
// Wie haal je in? (db/238, 24/11; mockup https://claude.ai/artifact/NpQmmWBiJ4qNhZ2kut55r1): tijdens een run staat naast je score een
// chipje met wie je hierna inhaalt. Het bord komt mee met de stapel (get_timeline_deck2), dus geen extra aanroep; tik = de stand als pop-up.
(() => {
  "use strict";
  const SB = { url: "https://xyvvkxbhkijjwcvpojru.supabase.co", key: "sb_publishable_eWAfRlKW7HCpZgyaYaxbbg__0DWxFsa" };
  const REC_KEY = "jaardle:timeline:rec", SND_KEY = "jaardle:timeline:snd";
  const SUIT = { 1: "⚔️", 2: "⚖️", 3: "🙏", 4: "🔬", 5: "🎨", 6: "⛵", 7: "🌋", 8: "🤝" };

  const T = {
    nl: {
      sound: "Geluid", cue: "Sleep de kaart naar zijn plek, of tik op een +", earlier: "eerder", later: "later",
      left: "nog", good: "goed", lives: (n) => `${n} van 3 levens`, newCard: "Nieuwe kaart", first: "Leg vooraan", last: "Leg achteraan",
      between: (a, b) => `Leg tussen ${a} en ${b}`, streak: (n) => `🔥 ${n} op rij!`, tight: "Op het randje!", goesEarlier: "← Hoort eerder",
      goesLater: "Hoort later →", placed: (n) => (n === 1 ? "kaart goed gelegd" : "kaarten goed gelegd"), record: "🏆 Nieuw record!",
      yourRec: (r) => `Je record: ${r}`, share: "Deel", copied: "✓ Gekopieerd", again: "Nog een keer", deckDone: "Je hebt de hele stapel gelegd!",
      loading: "Kaarten schudden…", error: "De kaarten konden niet geladen worden.", retry: "Opnieuw", bc: "v.Chr.", wrong: "fout",
      cats: ["Oorlog", "Politiek", "Religie", "Wetenschap", "Kunst", "Ontdekking", "Ramp", "Samenleving"],
      shareHead: (n, rec) => `Jaardle Timeline: 🗓️ ${n} ${n === 1 ? "kaart" : "kaarten"}${rec ? " (record!)" : ""}`,
    },
    en: {
      sound: "Sound", cue: "Drag the card to its place, or tap a +", earlier: "earlier", later: "later",
      left: "deck", good: "correct", lives: (n) => `${n} of 3 lives`, newCard: "New card", first: "Place at the start", last: "Place at the end",
      between: (a, b) => `Place between ${a} and ${b}`, streak: (n) => `🔥 ${n} in a row!`, tight: "Close call!", goesEarlier: "← Goes earlier",
      goesLater: "Goes later →", placed: (n) => (n === 1 ? "card placed correctly" : "cards placed correctly"), record: "🏆 New record!",
      yourRec: (r) => `Your record: ${r}`, share: "Share", copied: "✓ Copied", again: "Play again", deckDone: "You placed the whole deck!",
      loading: "Shuffling cards…", error: "The cards couldn't be loaded.", retry: "Try again", bc: "BC", wrong: "wrong",
      cats: ["War", "Politics", "Religion", "Science", "Art", "Discovery", "Disaster", "Society"],
      shareHead: (n, rec) => `Jaardle Timeline: 🗓️ ${n} ${n === 1 ? "card" : "cards"}${rec ? " (record!)" : ""}`,
    },
    de: {
      sound: "Ton", cue: "Zieh die Karte an ihren Platz oder tippe auf ein +", earlier: "früher", later: "später",
      left: "noch", good: "richtig", lives: (n) => `${n} von 3 Leben`, newCard: "Neue Karte", first: "Ganz vorne ablegen", last: "Ganz hinten ablegen",
      between: (a, b) => `Zwischen ${a} und ${b} ablegen`, streak: (n) => `🔥 ${n} in Folge!`, tight: "Knapp!", goesEarlier: "← Gehört früher",
      goesLater: "Gehört später →", placed: (n) => (n === 1 ? "Karte richtig gelegt" : "Karten richtig gelegt"), record: "🏆 Neuer Rekord!",
      yourRec: (r) => `Dein Rekord: ${r}`, share: "Teilen", copied: "✓ Kopiert", again: "Nochmal", deckDone: "Du hast den ganzen Stapel gelegt!",
      loading: "Karten werden gemischt…", error: "Die Karten konnten nicht geladen werden.", retry: "Nochmal versuchen", bc: "v. Chr.", wrong: "falsch",
      cats: ["Krieg", "Politik", "Religion", "Wissenschaft", "Kunst", "Entdeckung", "Katastrophe", "Gesellschaft"],
      shareHead: (n, rec) => `Jaardle Timeline: 🗓️ ${n} ${n === 1 ? "Karte" : "Karten"}${rec ? " (Rekord!)" : ""}`,
    },
    es: {
      sound: "Sonido", cue: "Arrastra la carta a su lugar o toca un +", earlier: "antes", later: "después",
      left: "quedan", good: "aciertos", lives: (n) => `${n} de 3 vidas`, newCard: "Carta nueva", first: "Colocar al principio", last: "Colocar al final",
      between: (a, b) => `Colocar entre ${a} y ${b}`, streak: (n) => `🔥 ¡${n} seguidas!`, tight: "¡Por los pelos!", goesEarlier: "← Va antes",
      goesLater: "Va después →", placed: (n) => (n === 1 ? "carta bien colocada" : "cartas bien colocadas"), record: "🏆 ¡Nuevo récord!",
      yourRec: (r) => `Tu récord: ${r}`, share: "Compartir", copied: "✓ Copiado", again: "Otra vez", deckDone: "¡Has colocado todo el mazo!",
      loading: "Barajando cartas…", error: "No se pudieron cargar las cartas.", retry: "Reintentar", bc: "a. C.", wrong: "mal",
      cats: ["Guerra", "Política", "Religión", "Ciencia", "Arte", "Descubrimiento", "Catástrofe", "Sociedad"],
      shareHead: (n, rec) => `Jaardle Timeline: 🗓️ ${n} ${n === 1 ? "carta" : "cartas"}${rec ? " (¡récord!)" : ""}`,
    },
    pt: {
      sound: "Som", cue: "Arraste a carta até o lugar certo ou toque em um +", earlier: "antes", later: "depois",
      left: "restam", good: "acertos", lives: (n) => `${n} de 3 vidas`, newCard: "Carta nova", first: "Colocar no início", last: "Colocar no fim",
      between: (a, b) => `Colocar entre ${a} e ${b}`, streak: (n) => `🔥 ${n} seguidas!`, tight: "Por um triz!", goesEarlier: "← Vem antes",
      goesLater: "Vem depois →", placed: (n) => (n === 1 ? "carta no lugar certo" : "cartas no lugar certo"), record: "🏆 Novo recorde!",
      yourRec: (r) => `Seu recorde: ${r}`, share: "Compartilhar", copied: "✓ Copiado", again: "Jogar de novo", deckDone: "Você colocou o baralho inteiro!",
      loading: "Embaralhando as cartas…", error: "Não foi possível carregar as cartas.", retry: "Tentar de novo", bc: "a.C.", wrong: "errado",
      cats: ["Guerra", "Política", "Religião", "Ciência", "Arte", "Descoberta", "Desastre", "Sociedade"],
      shareHead: (n, rec) => `Jaardle Timeline: 🗓️ ${n} ${n === 1 ? "carta" : "cartas"}${rec ? " (recorde!)" : ""}`,
    },
  };

  // Past kaart c in gat i van de lijn? Hetzelfde jaar telt aan beide kanten als goed.
  // Het bord op het eindscherm (db/233). Zo min mogelijk tekst (zijn "liever geen tekst, meer emoji's, scheelt vertalingen").
  const T2 = {
    nl: { you: "jij", bot: "bot", vsBots: "Jij en de bots", botsCap: "In een team speel je tegen vrienden in plaats van bots.",
      wk: (d, h) => `deze week · nog ${d >= 1 ? d + " d" : h + " u"}` },
    en: { you: "you", bot: "bot", vsBots: "You and the bots", botsCap: "In a team you play against friends instead of bots.",
      wk: (d, h) => `this week · ${d >= 1 ? d + "d" : h + "h"} left` },
    de: { you: "du", bot: "Bot", vsBots: "Du und die Bots", botsCap: "In einem Team spielst du gegen Freunde statt gegen Bots.",
      wk: (d, h) => `diese Woche · noch ${d >= 1 ? d + " T" : h + " Std."}` },
    es: { you: "tú", bot: "bot", vsBots: "Tú y los bots", botsCap: "En un equipo juegas contra amigos en lugar de bots.",
      wk: (d, h) => `esta semana · quedan ${d >= 1 ? d + " d" : h + " h"}` },
    pt: { you: "você", bot: "bot", vsBots: "Você e os bots", botsCap: "Em uma equipe você joga contra amigos em vez de bots.",
      wk: (d, h) => `esta semana · faltam ${d >= 1 ? d + " d" : h + " h"}` },
  };
  for (const c in T2) Object.assign(T[c], T2[c]);
  // Het chipje (db/238): op het scherm alleen gezicht, naam en getal (en "jij"); deze zinnen zijn voor schermlezers en de pop-up.
  const T3 = {
    nl: { chNext: (who, v) => `Hierna haal je ${who} in (${v}). Tik voor de stand.`, chTop: "Je staat bovenaan. Tik voor de stand.",
      chSelf: "je beste van deze week", chRec: "je record", close: "Sluiten" },
    en: { chNext: (who, v) => `Next to pass: ${who} (${v}). Tap for the standings.`, chTop: "You're on top. Tap for the standings.",
      chSelf: "your best this week", chRec: "your record", close: "Close" },
    de: { chNext: (who, v) => `Als Nächstes überholst du ${who} (${v}). Tippen für den Stand.`, chTop: "Du bist ganz oben. Tippen für den Stand.",
      chSelf: "deine Bestleistung dieser Woche", chRec: "dein Rekord", close: "Schließen" },
    es: { chNext: (who, v) => `Próximo a superar: ${who} (${v}). Toca para ver la clasificación.`, chTop: "Vas en cabeza. Toca para ver la clasificación.",
      chSelf: "tu mejor marca de esta semana", chRec: "tu récord", close: "Cerrar" },
    pt: { chNext: (who, v) => `Próximo a passar: ${who} (${v}). Toque para ver a classificação.`, chTop: "Você está no topo. Toque para ver a classificação.",
      chSelf: "seu melhor desta semana", chRec: "seu recorde", close: "Fechar" },
  };
  for (const c in T3) Object.assign(T[c], T3[c]);
  // ↻ naast de hartjes (24/11, zijn "restart knop … cirkel pijltje naar zichzelf met wel pop-up voor confirmation, onze stijl"): halverwege een
  // run eerst de vraag. De run eindigt dan op wat je goed had en telt als score, zoals wanneer je daar je laatste hartje verloor. Niet
  // "je 12 tellen mee": dat las als "die kaarten blijven liggen" (zijn "dubbelzinnig").
  const T4 = {
    nl: { restart: "Opnieuw beginnen", rstQ: "Opnieuw beginnen?", rstSub: (n) => `Deze run eindigt op ${n}.`, rstYes: "Opnieuw", rstNo: "Verder" },
    en: { restart: "Start over", rstQ: "Start over?", rstSub: (n) => `This run ends at ${n}.`, rstYes: "Restart", rstNo: "Continue" },
    de: { restart: "Neu anfangen", rstQ: "Neu anfangen?", rstSub: (n) => `Dieser Lauf endet bei ${n}.`, rstYes: "Neu starten", rstNo: "Weiter" },
    es: { restart: "Empezar de nuevo", rstQ: "¿Empezar de nuevo?", rstSub: (n) => `Esta partida termina con ${n}.`, rstYes: "Reiniciar", rstNo: "Seguir" },
    pt: { restart: "Começar de novo", rstQ: "Começar de novo?", rstSub: (n) => `Esta partida termina com ${n}.`, rstYes: "Reiniciar", rstNo: "Continuar" },
  };
  for (const c in T4) Object.assign(T[c], T4[c]);

  // De reeks in treden (23/11): dezelfde zes als de streak-vlam van de daily (brons · zilver · goud · platina · diamant · obsidiaan), op
  // 3 · 5 · 10 · 15 · 20 · 30 op rij. Het getal goed kleurt naar zijn eigen trede. Na 30 blijft het obsidiaan; elke 5 stijgen er emoji op
  // als belletjes, 3 meer per keer (9, 12 … tot 24), de sets om de beurt (zijn "elke 5 na 30"). Alleen tekens uit ons emoji-font.
  const TIERS = [3, 5, 10, 15, 20, 30];
  const tierOf = (n) => TIERS.filter((m) => n >= m).length;   // 0 … 6
  const BUB_SETS = [["🤯", "🔥", "✨"], ["🚀", "☄️", "🔥", "✨"], ["🌟", "💎", "⚡", "✨"], ["🐐", "🏆", "🎉", "🔥", "✨"]];
  const bubOf = (n) => (n > 30 && n % 5 === 0 ? BUB_SETS[((n - 35) / 5) % BUB_SETS.length] : null);
  const bubN = (n) => Math.min(24, 9 + (3 * (n - 35)) / 5);
  const isStep = (n) => TIERS.includes(n) || !!bubOf(n);
  // Wie haal je in? (db/238): de doelen van een run, uit het bord van deze week en je record. De anderen met hun beste run van de week;
  // jouw eigen rij = je beste van deze week ("jij"); je record (🏆) alleen als het hoger is (anders is het hetzelfde moment). Wie op 0
  // staat, is geen doel. chaseNext: het eerstvolgende doel bij n goed = het laagste getal ≥ n (gelijk is nog niet ingehaald), met
  // iedereen die op dat getal staat; null = je staat boven iedereen (👑).
  function chaseMarks(board, best) {
    const rows = board && Array.isArray(board.rows) ? board.rows : [], me = rows.find((r) => r && r.me), wb = me ? +me.v || 0 : 0;
    const out = rows.filter((r) => r && !r.me && +r.v > 0).map((r) => ({ kind: r.bot ? "bot" : "p", name: String(r.name || ""), flair: r.flair || null, v: +r.v }));
    if (wb > 0) out.push({ kind: "self", name: String(me.name || ""), flair: me.flair || null, v: wb });
    if (+best > wb) out.push({ kind: "rec", name: "", flair: null, v: +best });
    return out;
  }
  function chaseNext(marks, n) {
    const ahead = (marks || []).filter((m) => m.v >= n);
    if (!ahead.length) return null;
    const v = Math.min(...ahead.map((m) => m.v));
    return { v, items: ahead.filter((m) => m.v === v) };
  }
  const chaseKey = (g) => (g ? g.v + ":" + g.items.map((m) => m.kind + m.name).join(",") : "top");
  const fits = (line, i, c) => (i === 0 || line[i - 1].y <= c.y) && (i === line.length || c.y <= line[i].y);
  const rightIdx = (line, c) => line.filter((x) => x.y <= c.y).length;
  const shareText = (L, n, marks, isRec) => `${L.shareHead(n, isRec)}\n📊 ${marks.map((m) => (m ? "🟩" : "🟥")).join("")}\njaardle.com/timeline`;
  const endBand = (n) => (n < 5 ? "0-4" : n < 10 ? "5-9" : n < 20 ? "10-19" : "20+");

  const CSS = String.raw`/* ═══ 🗓️ Timeline (alpha, /timeline.js) ═══ */
:root { --tl: #1976d2; --tl-back: #1976d2; --tl-back-2: #1565c0; --tl-ch: clamp(10rem, 100dvh - 30rem, 13.5rem);
  /* de kaart in je hand is altijd even hoog, hoe lang de tekst ook is (26/11: de tafel sprong mee met elke tekst); is het scherm hoog
     genoeg (de tafel staat al op zijn grootst), dan krijgt hij de ruimte die over is, tot 16rem */
  --tl-hh: clamp(12.2rem, 100dvh - 31.5rem, 16rem);
  --tl-era: linear-gradient(90deg, var(--purple), var(--blue) 30%, var(--green) 52%, var(--yellow) 74%, var(--orange)); }
/* de Timeline-pagina (/timeline/): het scherm op de plek van het spel, zoals de Duels-pagina. game.js zet body[data-tlhome] en het adres;
   het spel en de voet-knoppen gaan zolang weg, de kop (#mode-tabs) blijft: profiel, 🌐, de deur (hier naar Jaardle), dan ons logo en 🔈. */
[data-tlhome] main > :not(#modal-tl):not(#mode-tabs), [data-tlhome] #help-btn, [data-tlhome] #day-label { display: none !important; }
#modal-tl.tl-page { position: static; inset: auto; z-index: auto; display: flex; flex-direction: column; align-items: stretch; padding: 0; }
.kop-tl { display: none; }
body[data-tlhome] #mode-tabs { display: flex; }
[data-tlhome] #mode-tabs > :is(.jl-mid, .mode-seg) { display: none; }
[data-tlhome] .kop-tl { flex: 1; min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 0.3rem; }
/* het logo: het woord met een tijdlijn in de kleuren van de tijd eronder, en alpha; echt in het midden van de kop als er ruimte is (center()) */
.tl-logo { justify-self: center; min-width: 0; display: flex; align-items: center; gap: 0.45rem; margin: 0; font-size: 1rem; transform: translateX(var(--kd-dx, 0px)); }
.tl-logo-in { display: inline-flex; flex-direction: column; align-items: stretch; gap: 4px; line-height: 1; color: var(--fg); }
.tl-logo-txt { font-size: 0.98rem; font-weight: 900; letter-spacing: 0.13em; text-transform: uppercase; padding-left: 0.13em; }
.tl-logo-line { position: relative; height: 8px; }
.tl-logo-line::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; height: 3px; margin-top: -1.5px; border-radius: 2px; background: var(--tl-era); }
.tl-logo-line i { position: absolute; top: 50%; width: 8px; height: 8px; margin: -4px 0 0 -4px; border-radius: 50%; box-shadow: 0 0 0 2px var(--bg); }
.tl-logo-line i:nth-child(1) { left: 6%; background: var(--purple); }
.tl-logo-line i:nth-child(2) { left: 50%; background: var(--green); }
.tl-logo-line i:nth-child(3) { left: 94%; background: var(--orange); }
.tl-alpha { padding: 0.08rem 0.4rem; border: 1px solid var(--border); border-radius: 999px; font-size: 0.62rem; font-weight: 800; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--muted); }
/* 🔈 zoals op Duels: een rondje van 1.95rem (31 px), even groot als het poppetje links (23/11, één maat voor de hele bovenregel);
   ↻ naast de hartjes is hetzelfde rondje */
.tl-rst, .tl-snd { flex: none; display: grid; place-items: center; width: 1.95rem; height: 1.95rem; padding: 0; color: var(--muted); background: transparent; border: 1px solid var(--border); border-radius: 50%; }
.tl-rst:hover, .tl-snd:hover { filter: none; color: var(--fg); background: var(--card-soft); }
.tl-rst:focus-visible, .tl-snd:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.tl-rst svg, .tl-snd svg { width: 1.05rem; height: 1.05rem; }
.tl-snd .on, .tl-snd[aria-pressed="true"] .off { display: none; }
.tl-snd[aria-pressed="true"] .on { display: inline; }
.tl-snd[aria-pressed="false"] { opacity: 0.6; }

/* boven lees je (je hartjes en de nieuwe kaart), direct daaronder de tafel waar je schuift en tikt */
.tl-game { position: relative; display: flex; flex-direction: column; }
.tl-hud { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.45rem; padding: 0.4rem 0.75rem 0.4rem 0.55rem;
  background: var(--card); border: 1px solid var(--border); border-radius: 14px; }
.tl-hl { flex: none; display: flex; align-items: center; gap: 0.4rem; }
.tl-hearts { display: flex; gap: 0.25rem; }
.tl-heart { position: relative; display: grid; place-items: center; width: 2.15rem; height: 2.15rem; font-size: 1.75rem; line-height: 1; }
.tl-heart.lost > span { filter: grayscale(1); opacity: 0.28; }
.tl-heart img { position: absolute; inset: -0.15rem; width: 2.45rem; height: 2.45rem; }
.tl-heart.breaking > span { opacity: 0; }
.tl-stand { display: flex; align-items: center; gap: 0.6rem; }
.tl-streak { --st: var(--flame); display: inline-flex; align-items: center; gap: 0.15rem; height: 1.9rem; padding: 0 0.55rem 0 0.35rem; border-radius: 999px;
  font-weight: 800; font-size: 0.95rem; color: var(--st); background: color-mix(in srgb, var(--st) 15%, transparent); font-variant-numeric: tabular-nums; }
.tl-streak > img, .tl-streak .tl-fl { width: 1.35rem; height: 1.35rem; font-size: 1.1rem; line-height: 1.35rem; text-align: center; }
.tl-streak .flm { font-size: 0.95rem; }
.tl-streak .flm > img { width: 1.35rem; height: 1.35rem; }
.tl-score { display: flex; align-items: baseline; gap: 0.3rem; font-variant-numeric: tabular-nums; }
.tl-score b { font-size: 1.75rem; font-weight: 800; line-height: 1; }
.tl-score span { font-size: 0.8rem; font-weight: 600; color: var(--muted); }
.tl-bump { animation: tl-bump 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.5) both; }
@keyframes tl-bump { from { transform: scale(1.6); } to { transform: none; } }

/* je hand: de nieuwe kaart met de stapel erachter */
.tl-hand { position: relative; z-index: 2; display: grid; place-items: center; padding: 0.35rem 0 1.9rem; }
.tl-handin { position: relative; width: min(16.5rem, 80%); height: var(--tl-hh); isolation: isolate; }
.tl-back { position: absolute; inset: 0; z-index: -1; border-radius: 16px; background-color: var(--tl-back);
  background-image: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.09) 0 5px, transparent 5px 11px);
  box-shadow: inset 0 0 0 5px var(--tl-back-2), inset 0 0 0 6.5px rgba(255, 255, 255, 0.5), var(--shadow-pop); }
.tl-back.b1 { transform: translate(9px, 5px) rotate(4deg); }
.tl-back.b2 { transform: translate(17px, 10px) rotate(8deg); }
.tl-left { position: absolute; right: calc(100% + 0.8rem); top: 50%; transform: translateY(-50%); font-size: 0.72rem; font-weight: 700; line-height: 1.2;
  text-align: center; color: var(--muted); font-variant-numeric: tabular-nums; }
.tl-left b { display: block; font-size: 1rem; color: var(--fg); }
.tl-card { position: relative; display: flex; flex-direction: column; gap: 0.55rem; height: 100%; padding: 0.8rem 1rem 0.95rem; color: var(--fg);
  background: var(--card); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow-pop); transform: rotate(-1.5deg);
  touch-action: none; user-select: none; -webkit-user-select: none; cursor: grab; }
.tl-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.tl-suit { display: flex; align-items: center; gap: 0.4rem; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.tl-suit i { font-style: normal; font-size: 1.3rem; letter-spacing: 0; }
.tl-txt { flex: 1 1 0; min-height: 0; overflow: hidden; margin: 0; font-size: 1.05rem; font-weight: 600; line-height: 1.32; overflow-wrap: anywhere; hyphens: auto; }
/* past de tekst niet (fitHand): eerst kleiner, dan zonder ????, en de allerlangste scrolt in de kaart (wiel of vinger; leggen kan ook met een tik op een +) */
.tl-card.tl-long .tl-q { display: none; }
.tl-card.tl-scroll .tl-txt { overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; touch-action: pan-y; padding-right: 0.2rem; }
.tl-q { align-self: center; padding: 0.2rem 0.85rem 0.2rem 1.1rem; border-radius: 999px; border: 1.5px dashed color-mix(in srgb, var(--muted) 70%, transparent);
  color: var(--muted); font-weight: 800; letter-spacing: 0.3em; }
.tl-card.tl-drag { z-index: 30; cursor: grabbing; box-shadow: 0 22px 40px -12px rgba(0, 0, 0, 0.6); transition: none; }
.tl-card.tl-deal { animation: tl-deal 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) both; }
@keyframes tl-deal { from { transform: translate(1.2rem, 0.5rem) rotate(8deg); opacity: 0; } to { transform: rotate(-1.5deg); opacity: 1; } }
.tl-cue { margin: 0; text-align: center; font-size: 0.8rem; color: var(--muted); }
.tl-cue.gone { visibility: hidden; }
.tl-msg { display: grid; place-items: center; gap: 0.75rem; min-height: 12.2rem; text-align: center; color: var(--muted); }

/* de tafel: je tijdlijn, horizontaal, met een + tussen elke twee kaarten; de lijn loopt door de kleuren van de tijd */
.tl-tablewrap { position: relative; margin: 0.35rem -1rem 0; }
.tl-ends { display: flex; justify-content: space-between; padding: 0 1rem; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.tl-row { overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: thin; padding: 2.1rem 0 0.7rem; }   /* boven de kaarten: ruimte voor de zwevende melding */
/* met een muis sleep je de tafel zelf heen en weer (een vinger scrolt hem al vanzelf) */
@media (hover: hover) and (pointer: fine) { .tl-row { cursor: grab; } }
.tl-row.tl-pan { cursor: grabbing; user-select: none; -webkit-user-select: none; }
.tl-row.tl-pan .tl-slot { pointer-events: none; }
.tl-strip { position: relative; display: flex; align-items: center; width: max-content; padding: 0 1rem; }
.tl-strip::before { content: ""; position: absolute; left: 1rem; right: 1rem; top: 50%; height: 3px; margin-top: -1.5px; border-radius: 2px; background: var(--tl-era); opacity: 0.55; }
.tl-c { position: relative; z-index: 1; flex: none; display: flex; flex-direction: column; gap: 0.35rem; width: 7.6rem; height: var(--tl-ch); padding: 0.6rem 0.65rem 0.65rem;
  background: var(--card); border: 1px solid var(--border); border-radius: 12px; box-shadow: 0 6px 14px -9px rgba(0, 0, 0, 0.55); }
.tl-c .tl-y { font-size: 1.45rem; font-weight: 800; line-height: 1.05; font-variant-numeric: tabular-nums; padding-right: 1.3rem; }
.tl-c .tl-y small { display: block; margin-top: 0.1rem; font-size: 0.66rem; font-weight: 700; color: var(--muted); }
.tl-c .tl-s { position: absolute; top: 0.45rem; right: 0.45rem; font-size: 1.05rem; line-height: 1; }
/* lange woorden (gezondheidsredenen) breken af in plaats van van de kaart te vallen */
.tl-c .tl-t { font-size: 0.78rem; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 8; -webkit-box-orient: vertical; overflow: hidden;
  overflow-wrap: anywhere; hyphens: auto; }
.tl-c.tl-bad .tl-y { color: var(--red-text); }
.tl-c.tl-bad .tl-s { visibility: hidden; }
.tl-c .tl-x, .tl-c .tl-v { position: absolute; top: 0.32rem; right: 0.32rem; z-index: 2; display: grid; place-items: center; width: 1.4rem; height: 1.4rem;
  border-radius: 50%; font-size: 0.78rem; font-weight: 900; color: #fff; }
.tl-c .tl-x { background: var(--red); }
.tl-c .tl-v { background: var(--green); animation: tl-v 1.2s ease-out both; }
@keyframes tl-v { 0% { transform: scale(0); } 20% { transform: scale(1.25); } 35%, 75% { transform: none; opacity: 1; } 100% { transform: scale(0.6); opacity: 0; } }
.tl-slot { position: relative; z-index: 1; flex: none; display: grid; place-items: center; width: 2.6rem; height: var(--tl-ch); margin: 0; padding: 0; color: var(--muted);
  background: transparent; border: 0; border-radius: 12px; cursor: pointer; transition: width 0.18s ease, background-color 0.18s ease; }
.tl-slot::before { content: "+"; display: grid; place-items: center; width: 1.8rem; height: 1.8rem; border-radius: 50%; background: var(--bg);
  border: 1.5px dashed color-mix(in srgb, var(--muted) 75%, transparent); font-size: 1.15rem; font-weight: 700; line-height: 1; color: var(--muted); }
.tl-slot:hover, .tl-slot:focus-visible { filter: none; outline: none; background: color-mix(in srgb, var(--accent) 10%, transparent); }
.tl-slot:hover::before, .tl-slot:focus-visible::before, .tl-slot.tl-open::before { background: var(--accent); color: var(--on-accent); border: 1.5px solid var(--accent); }
.tl-slot.tl-open { width: 7.9rem; background: color-mix(in srgb, var(--accent) 12%, transparent); }
.tl-busy .tl-slot { pointer-events: none; }
/* omdraaien, goed en fout */
.tl-c.tl-reveal { animation: tl-flip 0.5s cubic-bezier(0.3, 0.7, 0.3, 1) both; }
@keyframes tl-flip { 0% { transform: perspective(700px) rotateY(88deg); } 65% { transform: perspective(700px) rotateY(-10deg); } 100% { transform: none; } }
.tl-c.tl-reveal.tl-good { animation: tl-flip 0.5s cubic-bezier(0.3, 0.7, 0.3, 1) both, tl-glow 1.4s ease-out 0.2s both; }
@keyframes tl-glow { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--green) 60%, transparent); } 35% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--green) 28%, transparent); }
  100% { box-shadow: 0 6px 14px -9px rgba(0, 0, 0, 0.55); } }
.tl-c.tl-reveal.tl-good .tl-y { animation: tl-goody 1.4s ease-out both; }
@keyframes tl-goody { 0%, 40% { color: var(--green-text); } 100% { color: var(--fg); } }
.tl-c.tl-reveal.tl-bad { animation: tl-flip 0.5s cubic-bezier(0.3, 0.7, 0.3, 1) both, tl-shake 0.5s ease-in-out 0.5s both; }
@keyframes tl-shake { 15%, 85% { transform: translateX(-3px); } 30%, 70% { transform: translateX(6px); } 50% { transform: translateX(-7px); } }
.tl-fly { position: fixed; z-index: 50; margin: 0; pointer-events: none; transform-origin: 0 0; }
/* de melding zweeft boven de kaart die je net legde en gaat mee als hij verschuift */
.tl-float { position: absolute; left: 50%; bottom: calc(100% + 0.2rem); z-index: 6; white-space: nowrap; font-size: 1rem; font-weight: 900; line-height: 1;
  pointer-events: none; text-shadow: 0 0 6px var(--bg), 0 0 3px var(--bg), 0 0 2px var(--bg); transform: translateX(-50%); animation: tl-float 1.25s ease-out both; }
.tl-float.good { color: var(--green-text); font-size: 1.2rem; }
.tl-float.bad { color: var(--red-text); }
.tl-float.hot { color: var(--flame); }
@keyframes tl-float { 0% { opacity: 0; transform: translate(-50%, 0.6rem) scale(0.85); } 18% { opacity: 1; transform: translate(-50%, 0) scale(1.08); }
  70% { opacity: 1; transform: translate(-50%, -0.35rem) scale(1); } 100% { opacity: 0; transform: translate(-50%, -0.9rem); } }
/* klaar: de uitslag op de plek van je hand */
.tl-end { display: flex; flex-direction: column; align-items: stretch; margin: 0.1rem 0 0.4rem; padding: 0.8rem 0.8rem 0.9rem; text-align: center;
  background: var(--card); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow-pop); }
.tl-end-top { display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
.tl-end-top > span:last-child { display: flex; flex-direction: column; align-items: flex-start; gap: 0.05rem; text-align: left; }
.tl-end-n { font-size: 3rem; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.tl-end-l { font-size: 0.95rem; color: var(--muted); }
.tl-end-all { margin-bottom: 0.3rem; }
.tl-end-rec { font-weight: 800; color: var(--gold-text); }
.tl-end-rec.old { color: var(--muted); font-weight: 600; }
.tl-end-rec.wait { visibility: hidden; }
.tl-end-acts { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; margin-top: 0.7rem; }
.tl-end-acts button { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; }
.tl-end-acts svg { width: 1rem; height: 1rem; }

/* ═══ 23/11: de reeks in treden, momenten die meegroeien, en je team deze week (mockup https://claude.ai/artifact/Y9tR8rKK9Umx3RDQq8z9vw) ═══
   De treden = die van de streak-vlam van de daily (.flm s1–s6 in style.css): 3 brons · 5 zilver · 10 goud · 15 platina · 20 diamant ·
   30 obsidiaan. --st = de kleur van de trede: pil, melding, gloed om de kaart, vonken, en ook het getal goed (dat kleurt naar zijn eigen
   trede, zijn "dan is dat de benchmark van: oh die kleur is super goed"). */
:is(.tl-streak, .tl-float, .tl-c, .tl-fxl, .tl-pulse, .tl-score b, .tl-end-n)[data-t="1"] { --st: var(--achv-bronze); }
:is(.tl-streak, .tl-float, .tl-c, .tl-fxl, .tl-pulse, .tl-score b, .tl-end-n)[data-t="2"] { --st: var(--achv-silver); }
:is(.tl-streak, .tl-float, .tl-c, .tl-fxl, .tl-pulse, .tl-score b, .tl-end-n)[data-t="3"] { --st: var(--achv-gold); }
:is(.tl-streak, .tl-float, .tl-c, .tl-fxl, .tl-pulse, .tl-score b, .tl-end-n)[data-t="4"] { --st: var(--achv-plat); }
:is(.tl-streak, .tl-float, .tl-c, .tl-fxl, .tl-pulse, .tl-score b, .tl-end-n)[data-t="5"] { --st: var(--achv-diamond); }
:is(.tl-streak, .tl-float, .tl-c, .tl-fxl, .tl-pulse, .tl-score b, .tl-end-n)[data-t="6"] { --st: var(--achv-obsidian); }
.tl-score b[data-t], .tl-end-n[data-t] { color: var(--st); }
.tl-float.good:not([data-t="0"]) { color: var(--st); }   /* in een reeks (vanaf 3) ook de gewone +1 */
.tl-float.hot { display: inline-flex; align-items: center; gap: 0.2rem; color: var(--st, var(--flame)); text-shadow: none;
  filter: drop-shadow(0 0 2px var(--bg)) drop-shadow(0 0 4px var(--bg)); animation: tl-hot 1.7s cubic-bezier(0.2, 0.9, 0.3, 1) both; }
.tl-float.hot .flm { font-size: 0.8em; }   /* de vlam uit de balk naast de tekst, in de kleur van de trede */
.tl-float.hot[data-t="1"] { font-size: 1.1rem; }
.tl-float.hot[data-t="2"] { font-size: 1.15rem; }
.tl-float.hot[data-t="3"] { font-size: 1.22rem; }
.tl-float.hot[data-t="4"] { font-size: 1.28rem; }
.tl-float.hot[data-t="5"] { font-size: 1.34rem; }
.tl-float.hot[data-t="6"] { font-size: 1.4rem; filter: drop-shadow(0 0 2px var(--bg)) drop-shadow(0 0 7px color-mix(in srgb, var(--st) 70%, transparent)); }
@keyframes tl-hot { 0% { opacity: 0; transform: translate(-50%, 0.8rem) scale(0.55); } 14% { opacity: 1; transform: translate(-50%, 0) scale(1.25); }
  28%, 78% { opacity: 1; transform: translate(-50%, 0) scale(1); } 100% { opacity: 0; transform: translate(-50%, -0.4rem) scale(1); } }
/* vanaf zilver een lichtstreep over de letters (het vlammetje erbuiten, anders wordt hij doorzichtig); bij obsidiaan golven de letters */
.tl-float.hot:is([data-t="2"], [data-t="3"], [data-t="4"], [data-t="5"]) b {
  background: linear-gradient(100deg, var(--st) 0 36%, #fff 50%, var(--st) 64% 100%); background-size: 280% 100%; background-position: 100% 0;
  -webkit-background-clip: text; background-clip: text; color: transparent; animation: tl-shine 0.9s ease-in-out 0.3s both; }
@keyframes tl-shine { to { background-position: 0 0; } }
.tl-float.hot[data-t="6"] b span { display: inline-block; white-space: pre; animation: tl-wave 0.7s ease-in-out calc(0.25s + var(--i) * 45ms) both; }
@keyframes tl-wave { 0%, 100% { transform: none; } 40% { transform: translateY(-0.4em) scale(1.15); } 70% { transform: translateY(0.08em); } }
.tl-c.tl-reveal.tl-good:not([data-t="0"])[data-t] { animation: tl-flip 0.5s cubic-bezier(0.3, 0.7, 0.3, 1) both, tl-glowt 1.4s ease-out 0.2s both; }
@keyframes tl-glowt { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--st) 70%, transparent); }
  35% { box-shadow: 0 0 0 7px color-mix(in srgb, var(--st) 32%, transparent), 0 0 26px 4px color-mix(in srgb, var(--st) 40%, transparent); }
  100% { box-shadow: 0 6px 14px -9px rgba(0, 0, 0, 0.55); } }
/* de pil: een nieuwe trede schiet één keer op met een ring (vanaf diamant schokt hij), elke kaart ertussen flakkert de vlam; vanaf 30
   een vaste violette gloed (geen puls) */
.tl-streak.tl-lvl { animation: tl-lvl-ring 0.9s ease-out both; }
.tl-streak.tl-lvl:is([data-t="5"], [data-t="6"]) { animation: tl-lvl-ring 0.9s ease-out both, tl-jolt 0.5s ease-in-out both; }
.tl-streak.tl-lvl .flm > :first-child { animation: tl-lvl 0.9s cubic-bezier(0.2, 0.9, 0.3, 1.4) both; }
.tl-streak.tl-tick .flm > :first-child { animation: tl-tick 0.4s ease-out both; }
.tl-streak.tl-aura { box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--st) 55%, transparent), 0 0 14px 1px color-mix(in srgb, var(--st) 40%, transparent); }
@keyframes tl-lvl { 0% { transform: scale(1); } 28% { transform: scale(1.55); } 100% { transform: scale(1); } }
@keyframes tl-lvl-ring { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--st) 60%, transparent); } 100% { box-shadow: 0 0 0 0.7rem transparent; } }
@keyframes tl-jolt { 15%, 55% { transform: translateX(-3px) rotate(-3deg); } 35%, 75% { transform: translateX(3px) rotate(3deg); } }
@keyframes tl-tick { 40% { transform: scale(1.25); } }
/* na een goede kaart tekent het spel na 650 ms opnieuw (de volgende kaart): --el = hoe lang het moment al loopt, zodat de animaties
   doorlopen in plaats van opnieuw te beginnen of weg te vallen */
.tl-c.tl-reveal, .tl-c.tl-reveal .tl-y, .tl-c .tl-v, .tl-float, .tl-streak.tl-lvl, .tl-streak.tl-lvl .flm > :first-child { animation-delay: calc(0s - var(--el, 0ms)); }
.tl-c.tl-reveal.tl-good { animation-delay: calc(0s - var(--el, 0ms)), calc(0.2s - var(--el, 0ms)); }
.tl-c.tl-reveal.tl-good:not([data-t="0"])[data-t] { animation-delay: calc(0s - var(--el, 0ms)), calc(0.2s - var(--el, 0ms)); }
.tl-streak.tl-lvl:is([data-t="5"], [data-t="6"]) { animation-delay: calc(0s - var(--el, 0ms)), calc(0s - var(--el, 0ms)); }
.tl-float.hot:is([data-t="2"], [data-t="3"], [data-t="4"], [data-t="5"]) b { animation-delay: calc(0.3s - var(--el, 0ms)); }
.tl-float.hot[data-t="6"] b span { animation-delay: calc(0.25s + var(--i) * 45ms - var(--el, 0ms)); }
.tl-float.hot, .tl-c.tl-reveal.tl-good .tl-y { animation-delay: calc(0s - var(--el, 0ms)); }
.tl-pulse { animation-delay: calc(0.2s - var(--el, 0ms)); }
/* de effectlaag: over het hele scherm (fixed), zodat de tafel (overflow-x) de vonken niet afknipt; weg na 1,8 s (met belletjes 3,6 s) */
.tl-fxl { position: fixed; inset: 0; z-index: 60; overflow: hidden; pointer-events: none; }
.tl-spk { position: absolute; width: var(--s); height: var(--s); margin: calc(var(--s) / -2) 0 0 calc(var(--s) / -2); border-radius: 50%;
  background: radial-gradient(circle, #fff 0 14%, var(--st) 38%, color-mix(in srgb, var(--st) 0%, transparent) 72%);
  box-shadow: 0 0 9px 2px color-mix(in srgb, var(--st) 55%, transparent); animation: tl-spk var(--du) cubic-bezier(0.15, 0.7, 0.3, 1) var(--dl) both; }
.tl-spk.st { border-radius: 0; box-shadow: none; background: linear-gradient(#fff, var(--st));
  clip-path: polygon(50% 0, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0 50%, 40% 40%); }
@keyframes tl-spk { 0% { opacity: 1; transform: translateY(0) rotate(var(--a)) translateX(0) scale(0.4); }
  12% { transform: translateY(0) rotate(var(--a)) translateX(calc(var(--d) * 0.25)) scale(1.15); } 65% { opacity: 1; }
  100% { opacity: 0; transform: translateY(var(--g)) rotate(var(--a)) translateX(var(--d)) scale(0.3); } }
.tl-ring { position: absolute; width: 9rem; height: 9rem; margin: -4.5rem 0 0 -4.5rem; border-radius: 50%;
  box-shadow: 0 0 0 3px var(--st), 0 0 18px 2px color-mix(in srgb, var(--st) 60%, transparent); animation: tl-ring 0.8s ease-out var(--dl, 0s) both; }
@keyframes tl-ring { from { opacity: 0.95; transform: scale(0.25); } to { opacity: 0; transform: scale(1.35); } }
/* obsidiaan (30): het scherm licht één tel op in de kleur van de trede, vanuit de kaart */
.tl-vig { position: absolute; inset: 0; animation: tl-vig 1.5s ease-out both;
  background: radial-gradient(circle at var(--x) var(--y), color-mix(in srgb, var(--st) 45%, transparent) 0, color-mix(in srgb, var(--st) 16%, transparent) 40%,
    color-mix(in srgb, var(--st) 6%, transparent) 100%); }
@keyframes tl-vig { 0% { opacity: 0; } 16% { opacity: 1; } 100% { opacity: 0; } }
/* na 30, elke 5: emoji stijgen op als belletjes (buiten = omhoog, binnen = wiegen); geen tekst, dus niets te vertalen */
.tl-bub { position: absolute; z-index: 2; margin-left: calc(var(--fs) / -2); font-size: var(--fs); line-height: 1;
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--st) 55%, transparent)); animation: tl-bub-up var(--du) cubic-bezier(0.3, 0.6, 0.5, 1) var(--dl) both; }
.tl-bub > i { display: block; font-style: normal; animation: tl-bub-sway var(--sw) ease-in-out var(--dl) infinite alternate; }
@keyframes tl-bub-up { 0% { opacity: 0; transform: translateY(0) scale(0.3); } 12% { opacity: 1; transform: translateY(-1rem) scale(1.1); }
  22% { transform: translateY(calc(var(--h) * 0.2)) scale(1); } 72% { opacity: 1; } 100% { opacity: 0; transform: translateY(var(--h)) scale(0.85); } }
@keyframes tl-bub-sway { from { transform: translateX(calc(var(--x) * -1)) rotate(-9deg); } to { transform: translateX(var(--x)) rotate(9deg); } }
/* vanaf goud een lichtpuls vanaf de kaart over de tijdlijn (in de strip, achter de kaarten) */
.tl-pulse { position: absolute; top: 50%; z-index: 0; width: var(--w); height: 6px; margin: -3px 0 0 calc(var(--w) / -2); border-radius: 3px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--st) 25%, #fff 50%, var(--st) 75%, transparent);
  box-shadow: 0 0 12px 2px color-mix(in srgb, var(--st) 50%, transparent); animation: tl-pulse 1s ease-out 0.2s both; }
@keyframes tl-pulse { 0% { opacity: 1; transform: scaleX(0.05); } 60% { opacity: 1; } 100% { opacity: 0; transform: scaleX(1); } }

/* je team deze week (db/233): de rijen van het 🏆-bord (.lb-row uit style.css), iets compacter; zonder team jij en de bots */
.tl-tb { margin-top: 0.7rem; padding-top: 0.65rem; border-top: 1px solid var(--border); text-align: left; }
.tl-tb-wait { min-height: 7rem; }
.tl-tb-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.4rem; }
.tl-tb-head .lb-poolpick-wrap, .tl-tb-head .lb-poolpick-nm, .tl-tb-team { min-width: 0; font-size: 0.92rem; font-weight: 700; }
.tl-tb-wk { flex: none; font-size: 0.75rem; font-weight: 600; color: var(--muted); }
.tl-tb .lb-table { gap: 3px; }
.tl-tb .lb-row { grid-template-columns: 1.7rem minmax(0, 1fr) auto; gap: 0.5rem; padding: 0.32rem 0.55rem; font-size: 0.92rem; }
.tl-tb .lb-row .lb-val { min-width: 2.2rem; justify-content: flex-end; }
.tl-tb .lb-tag.lb-bot { color: var(--muted); }
.tl-tb-gap { text-align: center; font-size: 0.8rem; line-height: 0.9; letter-spacing: 0.25em; color: var(--muted); }
.tl-tb-cap { margin: 0.45rem 0 0; font-size: 0.78rem; color: var(--muted); text-align: center; }
.tl-tb .lb-row.tl-up { position: relative; z-index: 1; animation: tl-up 1.5s ease-out 0.55s both; }
@keyframes tl-up { 0% { box-shadow: inset 0 0 0 2px var(--accent); } 100% { box-shadow: inset 0 0 0 2px transparent; } }

/* Wie haal je in? (db/238, 24/11): het chipje naast je score met wie je hierna inhaalt. Haal je hem in, dan schiet hij omhoog weg en
   schuift de volgende eronder vandaan; bovenaan 👑. Staat het chipje er, dan valt het woordje "goed" weg (het getal blijft). */
/* De balk is een container: op een smalle telefoon (390 heeft 335 px binnenin, 375 maar 320) past de naam er niet bij, dan blijven
   het gezicht en het getal over. Wie geen flair heeft, krijgt dan de eerste letter in een rondje; met naam is dat rondje niet nodig. */
.tl-hud { container: tl-hud / inline-size; }
.tl-nextw { display: inline-grid; min-width: 0; }
.tl-nextw > * { grid-area: 1 / 1; }
.tl-next { --nx: var(--border); display: inline-flex; align-items: center; gap: 0.28rem; min-width: 0; max-width: 7.4rem; height: 1.9rem;
  padding: 0 0.6rem 0 0.3rem; border: 1px solid var(--nx); border-radius: 999px; background: var(--card-soft); color: var(--fg);
  font: inherit; font-size: 0.8rem; font-weight: 700; line-height: 1; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.tl-next:hover { border-color: var(--muted); }
.tl-next:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.tl-next-f { flex: none; display: grid; place-items: center; width: 1.3rem; height: 1.3rem; font-size: 1.05rem; line-height: 1; }
/* zonder flair: de eerste letter in een rondje */
.tl-next-f.ini { border-radius: 50%; background: color-mix(in srgb, var(--fg) 14%, transparent); font-size: 0.68rem; font-weight: 800; color: var(--muted); }
.tl-next-f.ini.named { display: none; }
@container tl-hud (max-width: 20.5rem) { .tl-next-n { display: none; } .tl-next-f.ini.named { display: grid; }
  /* "jij" is kort genoeg: die blijft staan, zonder letter (anders stond er "J" voor jezelf) */
  .tl-next.self .tl-next-n { display: block; } .tl-next.self .tl-next-f.ini.named { display: none; } }
/* sinds ↻ naast de hartjes staat: met de 🔥-pil erbij past de naam pas vanaf ±23rem (anders bleef er van "Jake" alleen "." over) */
@container tl-hud (max-width: 23rem) { .tl-stand:has(.tl-streak) .tl-next:not(.self) .tl-next-n { display: none; }
  .tl-stand:has(.tl-streak) .tl-next-f.ini.named { display: grid; } .tl-stand:has(.tl-streak) .tl-next.self .tl-next-f.ini.named { display: none; } }
/* en op een smalle telefoon (360) iets kleinere hartjes en kortere tussenruimtes, anders valt het getal uit het chipje */
@container tl-hud (max-width: 20.5rem) { .tl-heart { width: 1.9rem; height: 1.9rem; font-size: 1.55rem; } .tl-heart img { width: 2.2rem; height: 2.2rem; }
  .tl-hl { gap: 0.3rem; } .tl-stand { gap: 0.45rem; } }
.tl-next-n { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600; color: var(--muted);
  line-height: 1.3; }   /* met de 1 van .tl-next knipte overflow de staartjes af: "jij" las als "ııı" (26/11) */
.tl-next b { flex: none; font-weight: 800; font-variant-numeric: tabular-nums; }
/* twee (of meer) op hetzelfde getal: de flairs schuiven over elkaar */
.tl-next-f + .tl-next-f { margin-left: -0.55rem; }
/* jij zelf (je beste van deze week) en je record: in jouw kleur */
.tl-next.self { --nx: color-mix(in srgb, var(--accent) 55%, transparent); }
.tl-next.self .tl-next-n { color: var(--accent); }
/* gelijk: nog één kaart en je staat erboven */
.tl-next.eq { --nx: var(--accent); animation: tl-next-eq 1.1s ease-in-out infinite; }
@keyframes tl-next-eq { 50% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 30%, transparent); } }
/* bovenaan */
.tl-next.top { --nx: color-mix(in srgb, #f4c430 60%, transparent); background: color-mix(in srgb, #f4c430 16%, var(--card-soft)); padding: 0 0.45rem; }
/* het inhalen */
.tl-next.in { animation: tl-next-in 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.35) both; }
.tl-next.out { z-index: 1; pointer-events: none; animation: tl-next-out 0.5s cubic-bezier(0.5, 0, 0.75, 0) forwards; }
@keyframes tl-next-in { from { opacity: 0; transform: translateY(85%) scale(0.85); } to { opacity: 1; transform: none; } }
@keyframes tl-next-out { 0% { opacity: 1; transform: none; } 30% { opacity: 1; transform: translateY(-10%) scale(1.06); }
  100% { opacity: 0; transform: translateY(-140%) scale(0.8); } }
@media (prefers-reduced-motion: reduce) { .tl-next.in, .tl-next.out, .tl-next.eq { animation: none; } .tl-next.out { display: none; } }

/* het weekbord als pop-up: de rijen van het eindscherm; jouw rij telt live mee met een stipje */
.tl-wkpop .modal-header h2 { flex: 1; min-width: 0; display: flex; align-items: center; }   /* niet krimpen tot de inhoud: dan kapt de teamkiezer zijn naam af */
.tl-wkpop-sub { margin: 0 0 0.45rem; font-size: 0.75rem; font-weight: 600; color: var(--muted); }
.tl-wkpop .modal-body { gap: 0; }
/* ↻ halverwege een run: de vraag, in de vorm van de pop-ups van Duels (rondje met het teken, kop, één regel, twee knoppen) */
.modal-card.tl-ask { max-width: 20rem; display: flex; flex-direction: column; align-items: center; gap: 0.55rem; padding: 1.3rem 1.1rem 1.1rem; text-align: center; outline: none; }
.tl-ask-ico { display: grid; place-items: center; width: 3.2rem; height: 3.2rem; border-radius: 50%; color: var(--tl);
  background: color-mix(in srgb, var(--tl) 15%, transparent); }
.tl-ask-ico svg { width: 1.75rem; height: 1.75rem; }
.tl-ask h2 { margin: 0.1rem 0 0; font-size: 1.2rem; line-height: 1.2; text-wrap: balance; }
.tl-ask p { margin: 0; font-size: 0.9rem; color: var(--muted); }
.tl-ask-acts { align-self: stretch; display: flex; gap: 0.5rem; margin-top: 0.45rem; }
.tl-ask-acts button { flex: 1; min-width: 0; padding: 0.65rem 0.6rem; }
.tl-ask-acts .tl-ask-no { color: var(--fg); background: var(--card-soft); box-shadow: inset 0 0 0 1px var(--border); }
.lb-live { display: inline-block; width: 0.42rem; height: 0.42rem; margin-left: 0.35rem; border-radius: 50%; background: #2f9e6f; vertical-align: 0.12em;
  animation: lb-live 1.4s ease-in-out infinite; }
@keyframes lb-live { 50% { opacity: 0.35; } }
@media (prefers-reduced-motion: reduce) { .lb-live { animation: none; } }

@media (prefers-reduced-motion: reduce) {
  .tl-c.tl-reveal, .tl-c.tl-reveal .tl-y, .tl-card.tl-deal, .tl-bump, .tl-float, .tl-c .tl-v { animation: none !important; }
  .tl-slot { transition: none; }
  .tl-streak.tl-lvl, .tl-streak.tl-lvl .flm > :first-child, .tl-streak.tl-tick .flm > :first-child, .tl-float.hot b, .tl-float.hot b span,
  .tl-tb .lb-row.tl-up { animation: none !important; }
  .tl-float.hot b { color: var(--st); background: none; }
  .tl-fxl, .tl-pulse { display: none; }
}

/* 📱 Dwars (26/11, zijn "laten we de app ook goed maken voor landscape modus, vooral bij timelines vinden mensen dat fijn"; mockup
   https://claude.ai/artifact/E2vXQtRXkj2D6WPAEZqtjw, zijn keuze "balk naast de kop"). Rechtop begon de tafel op een telefoon dwars pas op
   394 px (scherm 350): je zag je kaart, maar niet waar hij heen moest. Nu: de balk (hartjes, ↻, stand) naast de kop, je hand links, de
   tafel rechts, alles in één scherm; je sleept naar rechts (pick() opent pas een gat als je vinger boven de tafel is).
   #modal-tl en .tl-game doen niet mee (display: contents), zodat kop, balk, hand en tafel één raster van <main> zijn. Algemene regels
   (breder <main>, geen "Inloggen" naast het poppetje) staan in style.css. */
@media (orientation: landscape) and (max-height: 540px) {
  :root { --tl-ch: clamp(8.5rem, 100dvh - 8.2rem, 13.5rem); --tl-hh: clamp(9rem, 100dvh - 5.4rem, 16rem); }
  [data-tlhome] main { display: grid; grid-template-columns: 17.2rem minmax(0, 1fr) 20rem; grid-template-rows: auto 1fr;
    grid-template-areas: "kop kop hud" "hand table table"; column-gap: 0.9rem; align-items: start; min-height: 100dvh; box-sizing: border-box; }
  [data-tlhome] main > #mode-tabs { grid-area: kop; align-self: center; margin-bottom: 0.35rem; }
  #modal-tl.tl-page, .tl-game { display: contents; }
  .tl-hud { grid-area: hud; align-self: center; margin-bottom: 0.35rem; }
  .tl-hand { grid-area: hand; padding: 0.25rem 1.45rem 0.45rem 0; justify-items: end; }
  .tl-handin { width: 13.4rem; }
  .tl-end { grid-area: hand; margin-top: 0.1rem; }
  .tl-tablewrap { grid-area: table; margin: 0 -1rem 0 0; }
  .tl-msg { grid-column: 1 / -1; }
  /* het zinnetje bij je eerste kaart: rechtsonder in de (dan nog lege) tafel, niet onder je hand */
  .tl-cue { grid-area: table; z-index: 3; align-self: end; justify-self: end; max-width: 15rem; margin: 0 0 1.6rem; text-align: right; line-height: 1.3;
    text-wrap: balance; }
  .tl-cue.gone { display: none; }
  /* de tafel begint midden in het scherm: kaarten die er links half af vallen, vervagen in plaats van af te breken */
  .tl-row { -webkit-mask-image: linear-gradient(90deg, transparent, #000 1.4rem); mask-image: linear-gradient(90deg, transparent, #000 1.4rem); }
  .tl-ends { padding-left: 0.6rem; }
  /* klaar, in de smalle kolom: eerst het getal en de knoppen, dan het bord (dat mag onder de vouw) */
  .tl-end-acts { order: 1; margin-top: 0.55rem; flex-wrap: nowrap; }
  .tl-end .tl-tb { order: 2; }
  .tl-end-acts .tl-share { flex: none; }
  .tl-end-acts .tl-again { flex: 1 1 auto; min-width: 0; white-space: nowrap; }
}
/* een lage tafel: minder regels, zodat er geen halve regel onderaan blijft hangen (8 regels + "v.Chr." vragen ±193 px kaart = 324 px scherm) */
@media (orientation: landscape) and (max-height: 330px) { .tl-c .tl-t { -webkit-line-clamp: 7; } }
@media (orientation: landscape) and (max-height: 305px) { .tl-c .tl-t { -webkit-line-clamp: 6; } }
`;

  window.JaardleTimeline = { T, fits, rightIdx, shareText, endBand, SUIT, CSS, open, setLang, tierOf, isStep, bubOf, bubN, chaseMarks, chaseNext };

  // ── de staat: H = wat game.js meegeeft (taal, openModal/closeModal, meetpunten); root = het scherm (#modal-tl) ──
  let H = null, root = null, LANG = "en", L = T.en;
  const PAGE_ID = "modal-tl";
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, String(v)); } catch (e) {} return null; };
  let snd = ls(SND_KEY) !== "0";
  let REC = Number(ls(REC_KEY)) || 0;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const yTxt = (y) => (y < 0 ? `${-y} ${L.bc}` : String(y));
  const yHtml = (y) => (y < 0 ? `${-y}<small>${L.bc}</small>` : String(y));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = () => !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const isMobile = () => (H && H.isMobile ? H.isMobile() : /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));

  // Meetpunten naar de aparte events-site: gcCount van game.js (count.js bouwt de URL, die wisselt het adres); zonder host zelf
  function gc(path, title) {
    if (H && H.gc) { H.gc(path, title); return; }
    try {
      const g = window.goatcounter, tag = document.querySelector("script[data-goatcounter-events]");
      const main = tag && tag.dataset.goatcounter, events = tag && tag.dataset.goatcounterEvents;
      if (!g || !g.url || !main || !events || (g.filter && g.filter())) return;
      const url = g.url({ path, title, event: true });
      if (!url || !url.startsWith(main)) return;
      const to = events + url.slice(main.length);
      if (!(navigator.sendBeacon && navigator.sendBeacon(to))) new Image().src = to;
    } catch (e) {}
  }

  // ── geluid: de tik en de bam van de knock-out, en korte toontjes voor goed, een reeks en een record ──
  // "streak" met de trede erbij: elke trede een hele toon hoger. "obsidian": de eigen klank vanaf 30 (size 3 = 30 zelf, 2 = de
  // belletjes elke 5, 1 = elke kaart na 30).
  const SFX = {};
  let AC = null;
  function play(name, arg) {
    if (!snd) return;
    try {
      if (name === "tick" || name === "bam") {
        SFX[name] = SFX[name] || new Audio(name === "tick" ? "/sfx/ko-tick.mp3" : "/sfx/ko-bam.mp3");
        const a = SFX[name].cloneNode();
        a.volume = name === "bam" ? 0.5 : 0.65;
        a.play().catch(() => {});
        return;
      }
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      if (name === "obsidian") { obsidianSound(AC, AC.destination, arg || 3); return; }
      const k = name === "streak" ? Math.pow(2, (2 * Math.max(0, (arg || 1) - 1)) / 12) : 1;
      const notes = ({ good: [660, 990], streak: [784, 1175, 1568], record: [523, 659, 784, 1047], pass: [1319, 1760], top: [1047, 1319, 1568, 2093] }[name] || [])
        .map((f) => f * k);
      notes.forEach((f, i) => {
        const o = AC.createOscillator(), g = AC.createGain(), t0 = AC.currentTime + i * 0.09;
        o.type = "triangle"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
        o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + 0.32);
      });
    } catch (e) {}
  }

  // 💜 obsidiaan = de lat (zijn "beter geluidje van obsidiaan, wat langer"): een lage dreun, een loopje omhoog (C-E-G-C-E-G) en een
  // akkoord (C add9) dat naklinkt met glinstertjes en galm (zijn "laatste synth iets te hard": het akkoord zachter dan het loopje).
  // size 3 = 30 (±2,8 s) · 2 = elke 5 na 30 (±1,9 s, zonder dreun) · 1 = elke kaart na 30 (twee noten, ±0,8 s).
  function obsidianSound(ctx, dest, size) {
    const t0 = ctx.currentTime + 0.02;
    const comp = ctx.createDynamicsCompressor(), out = ctx.createGain();
    out.gain.value = 0.8; out.connect(comp).connect(dest);
    const rev = ctx.createConvolver(), len = Math.round(ctx.sampleRate * 2.2), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rev.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.3; rev.connect(wet).connect(out);
    const note = (f, s, dur, vol, type = "triangle", det = 0, hold = 0) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = f; o.detune.value = det;
      g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(vol, s + 0.02);
      if (hold) g.gain.linearRampToValueAtTime(vol * 0.75, s + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
      o.connect(g); g.connect(out); g.connect(rev); o.start(s); o.stop(s + dur + 0.05);
    };
    if (size === 1) {
      [1567.98, 2093].forEach((f, i) => note(f, t0 + i * 0.08, 0.45, 0.15));
      [3136, 4186].forEach((f, i) => note(f, t0 + 0.2 + i * 0.12, 0.25, 0.015, "sine"));
      return;
    }
    if (size === 3) {
      const b = ctx.createOscillator(), bg = ctx.createGain();
      b.type = "sine"; b.frequency.setValueAtTime(110, t0); b.frequency.exponentialRampToValueAtTime(55, t0 + 0.6);
      bg.gain.setValueAtTime(0.0001, t0); bg.gain.exponentialRampToValueAtTime(0.4, t0 + 0.02); bg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
      b.connect(bg).connect(out); b.start(t0); b.stop(t0 + 1);
    }
    const arp = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98];
    arp.forEach((f, i) => note(f, t0 + i * 0.075, 0.5, 0.12));
    const ch = t0 + arp.length * 0.075, hold = size === 3 ? 1 : 0.35, clen = size === 3 ? 2.6 : 1.5;
    [523.25, 783.99, 1046.5, 1174.66, 1567.98].forEach((f) => { note(f, ch, clen, 0.04, "triangle", -7, hold); note(f, ch, clen, 0.03, "sine", 7, hold); });
    [2093, 2637, 3136, 4186, 3136, 2637, 3136, 4186, 3136, 4186].slice(0, size === 3 ? 10 : 5).forEach((f, i) => note(f, ch + 0.12 + i * 0.14, 0.3, 0.017, "sine"));
  }

  // ── het moment bij een goede kaart: per trede één laag meer, in de kleur van de trede (--st), in een vaste laag over het scherm ──
  //   brons 3 vonken · zilver 5 + glans op de letters · goud 10 + lichtpuls over de tijdlijn · platina 15 + schokring · diamant 20 +
  //   sterretjes · obsidiaan 30 + twee ringen en het scherm kort violet. Ertussen 3 vonkjes; na 30 sterretjes en 2 belletjes 🔥✨, elke 5
  //   een hele zwerm. Hooguit ±35 elementen tegelijk, alleen CSS (win-effecten: nooit canvas en CSS mengen).
  const FX = { 1: { n: 8, d: 46 }, 2: { n: 12, d: 56 }, 3: { n: 16, d: 66, line: 360 }, 4: { n: 20, d: 74, ring: 1, line: 520 },
    5: { n: 24, d: 84, ring: 1, line: 760, star: true }, 6: { n: 32, d: 96, ring: 2, line: 1400, star: true, vig: true } };
  function burst(card, t, n) {
    if (!card || !t || reduced()) return 0;
    const bub = bubOf(n);
    const spec = bub ? { n: 24, d: 88, ring: 1, line: 760, star: true, bub, bn: bubN(n) } : isStep(n) ? FX[t]
      : n > 30 ? { n: 6, d: 34, star: true, bub: ["🔥", "✨"], bn: 2, small: true } : { n: 3, d: 26 };
    // de kaart draait nog om (rotateY): het midden uit getBoundingClientRect, de maat uit offsetWidth/-Height
    const b = card.getBoundingClientRect(), w = card.offsetWidth, h = card.offsetHeight;
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2, top = cy - h / 2 + 6, R = Math.random;
    let html = "";
    for (let i = 0; i < spec.n; i++) {   // vonken uit de zijkanten van de kaart, schuin weg: de melding erboven blijft leesbaar
      const side = i % 2 ? 1 : -1, a = (i % 2 ? -62 : -178) + (60 * (Math.floor(i / 2) + R() * 0.8)) / Math.ceil(spec.n / 2);
      const ox = cx + side * (0.44 + R() * 0.08) * w, oy = top + R() * h * 0.35, sz = (spec.d > 40 ? 8 : 6) + R() * (spec.d > 40 ? 6 : 3), st = spec.star && i % 3 === 0;
      html += `<i class="tl-spk${st ? " st" : ""}" style="left:${ox.toFixed(1)}px;top:${oy.toFixed(1)}px;--a:${a.toFixed(0)}deg;--d:${(spec.d * (0.7 + R() * 0.6)).toFixed(0)}px;` +
        `--g:${(18 + R() * 22).toFixed(0)}px;--s:${(st ? sz * 1.5 : sz).toFixed(1)}px;--du:${(0.75 + R() * 0.5).toFixed(2)}s;--dl:${(0.15 + R() * 0.1).toFixed(2)}s"></i>`;
    }
    for (let r = 0; r < (spec.ring || 0); r++) html += `<i class="tl-ring" style="left:${cx.toFixed(0)}px;top:${cy.toFixed(0)}px;--dl:${0.2 + r * 0.18}s"></i>`;
    if (spec.vig) html = `<i class="tl-vig" style="--x:${cx.toFixed(0)}px;--y:${cy.toFixed(0)}px"></i>` + html;
    for (let i = 0; i < (spec.bn || 0); i++) {   // belletjes: boven de melding beginnen, wiegend omhoog
      const fs = spec.small ? 1 + R() * 0.3 : 1.1 + R() * 1.1, rise = -(spec.small ? 90 + R() * 50 : 170 + R() * 140);
      html += `<span class="tl-bub" style="left:${(cx + (R() - 0.5) * w * 1.3).toFixed(0)}px;top:${(top - (spec.small ? 34 : 46)).toFixed(0)}px;` +
        `--fs:${fs.toFixed(2)}rem;--h:${rise.toFixed(0)}px;--du:${(1.5 + R() * 0.9).toFixed(2)}s;--dl:${(0.2 + (spec.small ? 0.1 * i : R() * 0.9)).toFixed(2)}s;` +
        `--sw:${(0.45 + R() * 0.35).toFixed(2)}s;--x:${(5 + R() * 9).toFixed(0)}px"><i>${spec.bub[i % spec.bub.length]}</i></span>`;
    }
    const lay = document.createElement("div");
    lay.className = "tl-fxl"; lay.dataset.t = t; lay.setAttribute("aria-hidden", "true");
    lay.innerHTML = html;
    document.body.appendChild(lay);
    setTimeout(() => lay.remove(), spec.bn ? 3600 : 1800);
    if (spec.line) pulse(card, t, spec.line);
    return spec.line || 0;
  }
  // de lichtpuls in de strip zelf (achter de kaarten, over de lijn); na een hertekening zet draw() hem terug met --el
  function pulse(card, t, w) {
    const strip = card && card.parentElement;
    if (!strip || !w) return;
    const p = document.createElement("i");
    p.className = "tl-pulse"; p.dataset.t = t; p.setAttribute("aria-hidden", "true");
    p.style.cssText = `left:${card.offsetLeft + card.offsetWidth / 2}px;--w:${w}px`;
    strip.appendChild(p);
    setTimeout(() => p.remove(), 1400);
  }

  // ── de stapel van de server (db/226): ±54 kaarten, de volgende alvast in de achtergrond ──
  // db/233: get_timeline_deck2 geeft er een id bij (de server telt je run daarmee na); bestaat hij nog niet (404), dan de oude, zonder bord
  let DECK2 = true;
  const post = (fn, body) => fetch(SB.url + "/rest/v1/rpc/" + fn, {
    method: "POST",
    headers: { apikey: SB.key, Authorization: "Bearer " + SB.key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  // db/238: get_timeline_deck2 geeft ook het bord van deze week en je beste run ooit mee (voor het chipje), in dezelfde aanroep. Met een
  // account via H.rpc, met je sessie: dan kent de server je team (je gekozen team, anders je oudste, zoals pickActivePool in game.js).
  // Zonder account met je speler-id. Kent de server de nieuwe parameters nog niet (vóór db/238), dan de aanroep met alleen p_lang.
  let DECK238 = true;
  const hasSession = () => { try { return !!localStorage.getItem("sb-" + new URL(SB.url).hostname.split(".")[0] + "-auth-token"); } catch (e) { return false; } };
  const activePool = () => ls("jaardle:activePool") || null;   // ACTIVE_POOL_KEY in game.js
  async function deck238() {
    const args = { p_lang: LANG, p_client: (H && H.clientId && H.clientId()) || null, p_pool: activePool() };
    if (H && H.rpc && hasSession()) {
      try { return await H.rpc("get_timeline_deck2", args); }
      catch (e) { if (e && e.code === "PGRST202") DECK238 = false; return null; }
    }
    const r = await post("get_timeline_deck2", args);
    if (r.status === 404) { DECK238 = false; return null; }
    return r.ok ? r.json() : null;
  }
  async function fetchDeck() {
    let id = null, d = null, board = null, best = 0;
    const at = performance.now();
    if (DECK2 && DECK238) {
      let j = null;
      try { j = await deck238(); } catch (e) { j = null; }   // mislukt: deze keer de gewone stapel, zonder chipje
      if (j && Array.isArray(j.cards)) {
        id = j.id || null; d = j.cards; best = +j.best || 0;
        board = j.board && Array.isArray(j.board.rows) ? j.board : null;
      }
    }
    if (DECK2 && !d) {
      const r = await post("get_timeline_deck2", { p_lang: LANG });
      if (r.status === 404) DECK2 = false;
      else if (!r.ok) throw new Error("get_timeline_deck2 " + r.status);
      else { const j = await r.json(); id = (j && j.id) || null; d = j && j.cards; }
    }
    if (!DECK2) {
      const r = await post("get_timeline_deck", { p_lang: LANG });
      if (!r.ok) throw new Error("get_timeline_deck " + r.status);
      d = await r.json();
    }
    if (!Array.isArray(d) || d.length < 10) throw new Error("lege stapel");
    const cards = d.filter((c) => c && Number.isFinite(c.y) && c.t).map((c, k) => ({ y: c.y, t: String(c.t), c: c.c, k }));
    return { id: cards.length === d.length ? id : null, cards, board, best, at };   // viel er een kaart af, dan klopt de volgorde niet meer met de server
  }
  // Het bord voor het chipje: het nieuwste dat we hebben. Een stapel die al onderweg was toen je vorige run werd opgeslagen, kan die run nog
  // missen; daarom telt bij een stapel het moment van vragen, en bij record_timeline_run (of een ander team) het moment van antwoord.
  let CB = { board: null, at: -1 }, BEST = 0;
  function keepBoard(board, at) { if (board && Array.isArray(board.rows) && at >= CB.at) CB = { board, at }; }
  const chaseFor = () => (CB.board ? chaseMarks(CB.board, Math.max(REC, BEST)) : null);
  let nextDeck = null;
  const prefetch = () => { if (!nextDeck) { nextDeck = fetchDeck(); nextDeck.catch(() => { nextDeck = null; }); } };

  // ── tekenen ──
  const SND_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 9.3h3.4l4.6-3.9v13.2l-4.6-3.9H3.5z" fill="currentColor"/>` +
    `<g class="on" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M15 9.3a3.9 3.9 0 0 1 0 5.4"/><path d="M17.7 6.7a7.6 7.6 0 0 1 0 10.6"/></g>` +
    `<g class="off" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M15.4 9.6l4.8 4.8M20.2 9.6l-4.8 4.8"/></g></svg>`;
  const SHARE_SVG = `<svg viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M352 224c53 0 96-43 96-96s-43-96-96-96-96 43-96 96c0 4 .2 8 .7 11.9l-94.1 47C145 174.6 124.8 160 96 160c-53 0-96 43-96 96s43 96 96 96c28.8 0 49-14.6 62.6-30.9l94.1 47c-.5 3.9-.7 7.8-.7 11.9 0 53 43 96 96 96s96-43 96-96-43-96-96-96c-28.8 0-49 14.6-62.6 30.9l-94.1-47c.5-3.9 .7-7.8 .7-11.9s-.2-8-.7-11.9l94.1-47C303 209.4 323.2 224 352 224z"/></svg>`;
  // ↻: een pijl die rond gaat naar zichzelf, in de lijnen van 🔈
  const RST_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="M20.2 12.6A8.2 8.2 0 1 1 18.2 6.6"/><path d="M18.1 2.5l.1 4.1-4.1-.7"/></g></svg>`;
  // in de kop van game.js (#mode-tabs), achter profiel, 🌐 en de deur: het logo en 🔈
  const kopHtml = () => `<h2 class="tl-logo"><span class="tl-logo-in"><span class="tl-logo-txt">Timeline</span><span class="tl-logo-line" aria-hidden="true"><i></i><i></i><i></i></span></span>` +
    `<span class="tl-alpha">alpha</span></h2><button type="button" class="tl-snd" aria-pressed="${snd}" aria-label="${esc(L.sound)}" title="${esc(L.sound)}">${SND_SVG}</button>`;
  function hudHtml(s, o) {
    const hearts = [0, 1, 2].map((i) => {
      const br = o.breakIdx === i;
      return `<span class="tl-heart${i >= s.lives ? " lost" : ""}${br ? " breaking" : ""}"><span>❤️</span>${br ? `<img src="/emoji/heartbreak.webp" alt="">` : ""}</span>`;
    }).join("");
    // de pil in de kleur van de trede (de vlam = .flm sN uit style.css); het getal goed in de kleur van zijn eigen trede
    const t = tierOf(s.streak), st = tierOf(s.n);
    const fire = o.fire ? `<img src="/emoji/fire.webp" alt="">` : t ? `<span class="flm-g">🔥</span>` : `<span class="tl-fl">🔥</span>`;
    const streak = s.streak >= 2 ? `<span class="tl-streak${o.lvl ? " tl-lvl" : o.tick ? " tl-tick" : ""}${s.streak >= 30 ? " tl-aura" : ""}" data-t="${t}">` +
      `${t ? `<span class="flm s${t}">${fire}</span>` : fire}${s.streak}</span>` : "";
    // db/238: wie je hierna inhaalt; staat het chipje er, dan valt "goed" weg (het getal blijft)
    const chip = !s.done && s.chase ? chipsHtml(s) : "";
    // ↻ direct naast de hartjes (zijn "naast de 3 hartjes")
    const rst = `<button type="button" class="tl-rst" aria-label="${esc(L.restart)}" title="${esc(L.restart)}">${RST_SVG}</button>`;
    return `<div class="tl-hud"><span class="tl-hl"><span class="tl-hearts" role="img" aria-label="${esc(L.lives(s.lives))}">${hearts}</span>${rst}</span>` +
      `<span class="tl-stand">${streak}<span class="tl-score"><b class="${o.bump ? "tl-bump" : ""}"${st ? ` data-t="${st}"` : ""}>${s.n}</b>` +
      `${chip ? "" : `<span>${esc(L.good)}</span>`}</span>${chip ? `<span class="tl-nextw">${chip}</span>` : ""}</span></div>`;
  }
  // ── het chipje (db/238): gezicht (flair, 🏆, of de eerste letter), naam en getal. Op een smalle telefoon zet de CSS de naam uit ──
  const flairGlyph = (raw) => (H && H.flairGlyph ? H.flairGlyph(raw) : /^v:/.test(raw) ? "" : esc(String(raw).split("~")[0]));
  function faceHtml(m, named) {
    if (m.kind === "rec") return `<span class="tl-next-f">🏆</span>`;
    const f = m.flair ? flairGlyph(m.flair) : "";
    if (f) return `<span class="tl-next-f">${f}</span>`;
    const ch = [...(m.name || (m.kind === "self" ? L.you : "?"))][0] || "?";
    return `<span class="tl-next-f ini${named ? " named" : ""}">${esc(ch.toUpperCase())}</span>`;
  }
  // cls " out" = het chipje dat je net inhaalde (schiet omhoog weg), " in" = het nieuwe; el = hoe lang het inhalen al bezig is
  function chipHtml(g, n, cls, el) {
    const st = el != null ? ` style="animation-delay:${-Math.round(el)}ms"` : "", gone = cls === " out" ? ` aria-hidden="true" tabindex="-1"` : "";
    if (!g) return `<button type="button" class="tl-next top${cls}"${st}${gone} aria-label="${esc(L.chTop)}"><span class="tl-next-f">👑</span></button>`;
    const one = g.items.length === 1 ? g.items[0] : null, mine = g.items.every((m) => m.kind === "self" || m.kind === "rec");
    const name = one ? (one.kind === "self" ? L.you : one.kind === "rec" ? "" : one.name) : "";
    const who = g.items.map((m) => (m.kind === "self" ? L.chSelf : m.kind === "rec" ? L.chRec : m.name)).join(" + ");
    return `<button type="button" class="tl-next${mine ? " self" : ""}${g.v === n ? " eq" : ""}${cls}"${st}${gone} aria-label="${esc(L.chNext(who, g.v))}">` +
      g.items.map((m) => faceHtml(m, !!name)).join("") + (name ? `<span class="tl-next-n">${esc(name)}</span>` : "") + `<b>${g.v}</b></button>`;
  }
  function chipsHtml(s) {
    const g = chaseNext(s.chase, s.n), p = s.pass, el = p ? performance.now() - p.t0 : Infinity;
    return el < 560 ? chipHtml(p.from, s.n - 1, " out", el) + chipHtml(g, s.n, " in", el) : chipHtml(g, s.n, "");
  }
  const suit = (c) => SUIT[c] || "🗓️";
  const frontHtml = (c, deal) => `<div class="tl-card tl-front${deal ? " tl-deal" : ""}" tabindex="0" aria-label="${esc(L.newCard + ": " + c.t)}">` +
    `<div class="tl-suit"><i aria-hidden="true">${suit(c.c)}</i>${esc(L.cats[(c.c || 0) - 1] || "")}</div><p class="tl-txt">${esc(c.t)}</p><span class="tl-q" aria-hidden="true">????</span></div>`;
  const handHtml = (s, o) => `<div class="tl-hand"><div class="tl-handin"><div class="tl-back b2"></div><div class="tl-back b1"></div>${s.cur ? frontHtml(s.cur, o.deal) : ""}` +
    `<span class="tl-left">${esc(L.left)}<b>${s.pile.length}</b></span></div></div><p class="tl-cue${s.marks.length ? " gone" : ""}">${esc(L.cue)}</p>`;
  // de kaart in je hand heeft een vaste hoogte (--tl-hh), dus de tekst past zich aan de kaart aan i.p.v. andersom: eerst een paar stapjes
  // kleiner, dan zonder ???? en nog wat kleiner, en past hij dan nog niet (de allerlangste teksten van vóór 1500, tot ±500 tekens) dan scrolt
  // hij in de kaart. Na elke draw() en als het venster van maat verandert.
  const FIT = [1, 0.95, 0.9], FIT_LONG = [0.95, 0.9, 0.85, 0.8, 0.76, 0.72];   // rem; 1.05 = de gewone maat (.tl-txt). Liever zonder ???? dan piepklein
  function fitHand() {
    const card = root && root.querySelector(".tl-card.tl-front"), t = card && card.querySelector(".tl-txt");
    if (!t) return;
    const over = () => t.scrollHeight > t.clientHeight + 1;
    card.classList.remove("tl-long", "tl-scroll"); t.style.fontSize = "";
    if (!over()) return;
    for (const f of FIT) { t.style.fontSize = f + "rem"; if (!over()) return; }
    card.classList.add("tl-long");
    for (const f of FIT_LONG) { t.style.fontSize = f + "rem"; if (!over()) return; }
    card.classList.add("tl-scroll");
  }
  // de melding boven de kaart: bij een mijlpaal de vlam van de trede naast de tekst (zijn "naast 30 op rij die juist gekleurde vlammetjes");
  // bij obsidiaan elke letter apart (ze golven)
  function floatHtml(f) {
    if (f.cls !== "hot") return `<span class="tl-float ${f.cls}" data-t="${f.t || 0}" role="status">${esc(f.text)}</span>`;
    const txt = f.text.replace(/^🔥\s*/, ""), letters = f.t >= 6 ? [...txt].map((ch, i) => `<span style="--i:${i}">${esc(ch)}</span>`).join("") : esc(txt);
    return `<span class="tl-float hot" data-t="${f.t}" role="status" aria-label="${esc(f.text)}"><span class="flm s${f.t}" aria-hidden="true">` +
      `<img src="/emoji/fire.webp" alt=""></span><b aria-hidden="true">${letters}</b></span>`;
  }
  function cardHtml(c, o) {
    const rev = o.reveal === c.k, bad = c.ok === false;
    return `<div class="tl-c${bad ? " tl-bad" : ""}${rev ? " tl-reveal" + (bad ? "" : " tl-good") : ""}" data-k="${c.k}"${rev && !bad && o.ct ? ` data-t="${o.ct}"` : ""}>` +
      `<span class="tl-y">${yHtml(c.y)}</span>` +
      `<span class="tl-s" aria-hidden="true">${suit(c.c)}</span><span class="tl-t">${esc(c.t)}</span>` +
      (bad ? `<span class="tl-x" aria-label="${esc(L.wrong)}">✕</span>` : rev ? `<span class="tl-v" aria-hidden="true">✓</span>` : "") +
      (o.float && o.float.k === c.k ? floatHtml(o.float) : "") + `</div>`;
  }
  function tableHtml(s, o) {
    const line = s.line;
    const slot = (i) => (s.done ? "" : `<button type="button" class="tl-slot" data-i="${i}" aria-label="${esc(i === 0 ? L.first : i === line.length ? L.last : L.between(yTxt(line[i - 1].y), yTxt(line[i].y)))}"></button>`);
    return `<div class="tl-tablewrap"><div class="tl-ends"><span>← ${esc(L.earlier)}</span><span>${esc(L.later)} →</span></div>` +
      `<div class="tl-row${s.phase !== "idle" ? " tl-busy" : ""}"><div class="tl-strip">` + line.map((c, i) => slot(i) + cardHtml(c, o)).join("") + slot(line.length) + `</div></div></div>`;
  }
  // het eindscherm: getal (in de kleur van zijn trede) | wat het was, daaronder het bord, dan Deel en Nog een keer. Zolang de server je
  // run natelt (recWait) staan de recordregel en de plek van het bord al klaar, zodat er niets verspringt.
  const endHtml = (s) => {
    const st = tierOf(s.n);
    const rec = s.recWait ? `<span class="tl-end-rec wait" aria-hidden="true">·</span>`
      : s.rec ? `<span class="tl-end-rec">${esc(L.record)}</span>` : `<span class="tl-end-rec old">${esc(L.yourRec(s.prevRec))}</span>`;
    return `<div class="tl-end" aria-live="polite">${s.deckDone ? `<span class="tl-end-l tl-end-all">${esc(L.deckDone)}</span>` : ""}` +
      `<div class="tl-end-top"><span class="tl-end-n"${st ? ` data-t="${st}"` : ""}>${s.n}</span><span><span class="tl-end-l">${esc(L.placed(s.n))}</span>${rec}</span></div>` +
      boardHtml(s) +
      `<div class="tl-end-acts"><button type="button" class="tl-share">${SHARE_SVG}<span>${esc(L.share)}</span></button><button type="button" class="tl-again">${esc(L.again)}</button></div></div>`;
  };
  // ── je team deze week (db/233): de rijen van het 🏆-bord (naamcel en medailles van game.js); groot team = de top 3, dan jij met je buren ──
  const MEDAL = ["🥇", "🥈", "🥉"];
  function boardRowHtml(r, rank, delta) {
    const nm = H && H.nameCell ? H.nameCell({ display_name: r.name || "", flair: r.flair || null, title: r.title || null, is_me: !!r.me }, rank)
      : esc(r.name || "") + (r.flair ? ` ${esc(r.flair)}` : "") + (r.me ? ` <span class="lb-tag">${esc(L.you)}</span>` : "");
    return `<div class="lb-row${r.me ? " lb-me" : ""}${rank <= 3 ? " lb-top" + rank : ""}${delta > 0 ? " tl-up" : ""}"${delta > 0 ? ` data-d="${delta}"` : ""}>` +
      `<span class="lb-rank">${MEDAL[rank - 1] || rank}</span><span class="lb-name">${nm}${r.bot ? ` <span class="lb-tag lb-bot">${esc(L.bot)}</span>` : ""}</span>` +
      `<span class="lb-val">${r.v}${delta > 0 ? `<span class="wk-delta up">▲${delta}</span>` : ""}${r.live ? `<i class="lb-live" aria-hidden="true"></i>` : ""}</span></div>`;
  }
  function wkLeft(ends) {
    const ms = Date.parse(ends) - Date.now();
    return L.wk(Math.floor(ms / 864e5), Math.max(1, Math.ceil(ms / 36e5)));
  }
  function boardHtml(s) {
    if (s.recWait) return `<div class="tl-tb tl-tb-wait" aria-hidden="true"></div>`;
    const b = s.board, rows = b && b.rows;
    if (!rows || !rows.length) return "";
    const rankOf = (v) => 1 + rows.filter((r) => r.v > v).length, me = rows.findIndex((r) => r.me);
    // omhoog: je plek met je weekbeste van vóór deze run (prev_wk) tegen die van nu
    let delta = 0;
    if (me >= 0 && s.prevWk != null && rows[me].v > s.prevWk) delta = 1 + rows.filter((r) => !r.me && r.v > s.prevWk).length - rankOf(rows[me].v);
    const show = rows.length <= 6 ? rows.map((r, i) => i) : [...new Set([0, 1, 2, me - 1, me, me + 1])].filter((i) => i >= 0 && i < rows.length).sort((a, c) => a - c);
    let html = "", prev = -1;
    for (const i of show) {
      if (i > prev + 1) html += `<div class="tl-tb-gap" aria-hidden="true">· · ·</div>`;
      html += boardRowHtml(rows[i], rankOf(rows[i].v), rows[i].me ? delta : 0);
      prev = i;
    }
    const head = b.team ? ((H && H.poolPickerHtml && H.poolPickerHtml()) || `<span class="tl-tb-team">${esc(b.team)}</span>`) : `<span class="tl-tb-team">${esc(L.vsBots)}</span>`;
    return `<div class="tl-tb"><div class="tl-tb-head">${head}<span class="tl-tb-wk">${esc(wkLeft(b.ends))}</span></div><div class="lb-table">${html}</div>` +
      (b.team ? "" : `<p class="tl-tb-cap">${esc(L.botsCap)}</p>`) + `</div>`;
  }
  // jij stijgt: je rij begint op je oude plek en schuift omhoog; wie je inhaalt zakt één rij
  function climb() {
    const me = root.querySelector(".tl-tb .lb-row.tl-up");
    if (!me || reduced()) return;
    const rows = [...root.querySelectorAll(".tl-tb .lb-row")], i = rows.indexOf(me), h = me.offsetHeight + 3;
    const passed = rows.slice(i + 1, i + 1 + (+me.dataset.d || 0));
    const opt = { duration: 650, delay: 450, easing: "cubic-bezier(0.3, 0.7, 0.2, 1)", fill: "backwards" };
    try {
      me.animate([{ transform: `translateY(${h * passed.length}px)` }, { transform: "none" }], opt);
      passed.forEach((r) => r.animate([{ transform: `translateY(${-h}px)` }, { transform: "none" }], opt));
    } catch (e) {}
  }
  const gameHtml = (s, o = {}) => `<div class="tl-game"${o.el ? ` style="--el:${Math.round(o.el)}ms"` : ""}>${hudHtml(s, o)}${s.done ? endHtml(s) : handHtml(s, o)}${tableHtml(s, o)}</div>`;
  const msgHtml = (text, retry) => `<div class="tl-game"><div class="tl-msg"><p>${esc(text)}</p>${retry ? `<button type="button" class="tl-retry">${esc(L.retry)}</button>` : ""}</div></div>`;

  // ── het spel ──
  let G = null;
  function newGame(deck) {
    const pile = deck.cards.slice(), fi = pile.findIndex((c) => c.y > 1000 && c.y < 1950);   // een begin uit het midden: aan beide kanten ruimte
    const first = pile.splice(fi >= 0 ? fi : 0, 1)[0];
    return { pile, line: [first], cur: pile.shift(), lives: 3, n: 0, streak: 0, marks: [], done: false, deckDone: false, phase: "idle", rec: false, prevRec: REC,
      deckId: deck.id, moves: [], fx: null, recWait: false, board: null, prevWk: null, chase: null, pass: null };
  }
  function draw(o = {}) {
    const row0 = root.querySelector(".tl-row"), left = row0 ? row0.scrollLeft : 0, game = root.querySelector(".tl-game");
    // het moment van de laatste goede kaart loopt door na een hertekening (de volgende kaart, het eindscherm): --el = hoe lang al
    const m = G && G.fx, el = m ? performance.now() - m.t0 : 0;
    if (m && o.reveal == null && el < 1800) o = { ...o, reveal: m.k, ct: m.ct, float: m.float, lvl: m.lvl && el < 900, el };
    const html = G ? gameHtml(G, o) : msgHtml(o.error ? L.error : L.loading, !!o.error);
    if (game) game.outerHTML = html; else root.insertAdjacentHTML("beforeend", html);
    fitHand();
    const row = root.querySelector(".tl-row");
    if (row) row.scrollLeft = left;
    if (o.show != null) ensureVisible(o.show);
    if (o.el && m.line && el < 1200) pulse(root.querySelector(`.tl-c[data-k="${m.k}"]`), m.ct, m.line);
    if (G && G.done && G.board && G.board.team && H && H.wirePoolPicker) {   // het team wisselen = dezelfde kiezer als bij het teambord van de daily
      const g = G, tb = root.querySelector(".tl-tb");
      if (tb) H.wirePoolPicker(tb, () => switchTeam(g));
    }
    if (o.climb) climb();
  }
  function ensureVisible(k) {
    const row = root.querySelector(".tl-row"), el = root.querySelector(`.tl-c[data-k="${k}"]`);
    if (!row || !el) return;
    const a = el.offsetLeft, b = a + el.offsetWidth;
    if (a < row.scrollLeft + 16 || b > row.scrollLeft + row.clientWidth - 16) row.scrollLeft = Math.max(0, a - (row.clientWidth - el.offsetWidth) / 2);
  }
  let loading = false;
  async function start() {
    G = null;
    loading = true;
    draw();
    try {
      const deck = await (nextDeck || fetchDeck());
      nextDeck = null;
      G = newGame(deck);
      keepBoard(deck.board, deck.at);
      BEST = Math.max(BEST, deck.best || 0);
      G.chase = chaseFor();
      draw({ deal: true });
      gc("timeline-start", "Timeline: run started");
    } catch (e) {
      nextDeck = null;
      draw({ error: true });
    }
    loading = false;
  }
  // de kaart vliegt van je hand naar het gat (een kloon; de echte kaart is dan al weg)
  async function fly(fromEl, from, slot) {
    const to = slot.getBoundingClientRect(), ref = root.querySelector(".tl-c"), r = ref.getBoundingClientRect();
    const fl = fromEl.cloneNode(true);
    fl.classList.remove("tl-drag", "tl-deal", "tl-front");
    fl.classList.add("tl-fly");
    fl.removeAttribute("tabindex");
    Object.assign(fl.style, { left: from.left + "px", top: from.top + "px", width: from.width + "px", height: from.height + "px", transform: "none" });
    document.body.appendChild(fl);
    fromEl.style.visibility = "hidden";
    const tx = to.left + to.width / 2 - r.width / 2 - from.left, ty = to.top + to.height / 2 - r.height / 2 - from.top;
    try {
      await fl.animate([{ transform: "none" }, { transform: `translate(${tx}px, ${ty}px) scale(${r.width / from.width}, ${r.height / from.height})` }],
        { duration: reduced() ? 1 : 340, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "forwards" }).finished;
    } catch (e) {}
    fl.remove();
  }
  async function place(i, fromRect) {
    if (!G || G.phase !== "idle" || G.done || !G.cur) return;
    const hand = root.querySelector(".tl-card.tl-front"), slot = root.querySelector(`.tl-slot[data-i="${i}"]`);
    if (!hand || !slot) return;
    G.phase = "busy";
    const c = G.cur, ok = fits(G.line, i, c), j = rightIdx(G.line, c);
    await fly(hand, fromRect || hand.getBoundingClientRect(), slot);
    play("tick");
    G.line.splice(i, 0, { ...c, ok });
    G.cur = null;
    G.marks.push(ok);
    G.moves.push(i);   // db/233: de server telt je run na uit deze zetten
    if (ok) {
      G.n++; G.streak++;
      if (G.chase) {   // db/238: ingehaald? Het oude chipje schiet weg, het nieuwe komt eronder vandaan; het toontje na dat van de kaart
        const was = chaseNext(G.chase, G.n - 1), now = chaseNext(G.chase, G.n);
        if (chaseKey(was) !== chaseKey(now)) {
          G.pass = { from: was, t0: performance.now() };
          setTimeout(() => play(now ? "pass" : "top"), 280);
          if (!now) gc("timeline-chase-top", "Timeline: passed everyone on the board this week");
        }
      }
      const s = G.streak, t = tierOf(s), step = isStep(s);
      const a = G.line[i - 1], b = G.line[i + 1], tight = a && b && b.y - a.y <= 10;
      const f = step ? ["hot", L.streak(s)] : tight ? ["good", L.tight] : ["good", "+1"];
      const float = { k: c.k, cls: f[0], text: f[1], t };
      G.fx = { k: c.k, ct: t, float, lvl: step && t > 0, t0: performance.now(), line: 0 };
      draw({ reveal: c.k, ct: t, bump: true, fire: s >= 2, lvl: step && t > 0, tick: !step && t > 0, float, show: c.k });
      G.fx.line = burst(root.querySelector(`.tl-c[data-k="${c.k}"]`), t, s);
      if (s >= 30) play("obsidian", s === 30 ? 3 : bubOf(s) ? 2 : 1);
      else play(step ? "streak" : "good", t);
      await wait(650);
    } else {
      G.fx = null;
      G.lives--; G.streak = 0;
      draw({ reveal: c.k, breakIdx: G.lives, float: { k: c.k, cls: "bad", text: j < i ? L.goesEarlier : L.goesLater }, show: c.k });
      play("bam");
      await wait(1050);
      // de kaart schuift naar waar hij hoort
      const before = root.querySelector(`.tl-c[data-k="${c.k}"]`).getBoundingClientRect();
      G.line.splice(i, 1);
      G.line.splice(j, 0, { ...c, ok: false });
      draw({ breakIdx: G.lives, show: c.k });
      const el = root.querySelector(`.tl-c[data-k="${c.k}"]`), after = el.getBoundingClientRect();
      if (!reduced()) {
        try {
          await el.animate([{ transform: `translate(${before.left - after.left}px, ${before.top - after.top}px)` }, { transform: "none" }],
            { duration: 480, easing: "cubic-bezier(0.3, 0.7, 0.2, 1)" }).finished;
        } catch (e) {}
      }
      await wait(250);
    }
    if (G.lives <= 0 || !G.pile.length) {
      G.done = true; G.deckDone = G.lives > 0; G.phase = "idle"; G.prevRec = REC;
      // met een stapel-id telt de server na en zegt hij of het een record is (ook van een ander toestel); anders alleen dit toestel
      const live = isLive(G);
      G.recWait = live;
      if (!live) { G.rec = G.n > REC; if (G.rec) { REC = G.n; ls(REC_KEY, REC); } }
      draw({});
      const row = root.querySelector(".tl-row");
      if (row) row.scrollLeft = 0;
      if (!live && G.rec) play("record");
      if (live) finishRun(G);
      gc("timeline-end-" + endBand(G.n), `Timeline: ended with ${endBand(G.n)} correct`);
      if (G.deckDone) gc("timeline-deck-op", "Timeline: placed the whole deck");
      prefetch();
      return;
    }
    G.cur = G.pile.shift();
    G.phase = "idle";
    draw({ deal: true });
    if (G.pile.length < 3) prefetch();
  }

  // ── de run naar de server (db/233): één verzoek aan het eind; geeft je record (prev_best) en het bord terug ──
  const isLive = (g) => !!(g.deckId && H && H.rpc && ((H.user && H.user()) || (H.clientId && H.clientId())));
  async function finishRun(g) {
    let res = null;
    try {
      const pool = H.pool ? await H.pool() : null;
      res = await Promise.race([
        H.rpc("record_timeline_run", { p_deck: g.deckId, p_moves: g.moves, p_client: (H.clientId && H.clientId()) || null, p_pool: (pool && pool.id) || null }),
        wait(8000).then(() => null),
      ]);
    } catch (e) { res = null; }
    const best = Math.max(g.prevRec, (res && res.prev_best) || 0);
    g.prevRec = best; g.rec = g.n > best; g.recWait = false;
    REC = Math.max(REC, g.n, best); ls(REC_KEY, REC);
    g.board = res && res.board && Array.isArray(res.board.rows) ? res.board : null;
    g.prevWk = res ? res.prev_wk : null;
    keepBoard(g.board, performance.now());
    if (G && G !== g && !G.done && g.board) G.chase = chaseFor();   // al een nieuwe run: die jaagt voortaan op het verse bord
    if (G !== g) return;   // al een nieuw potje
    draw({ climb: true });
    if (g.rec) play("record");
    if (g.board) gc("timeline-board-" + (g.board.team ? "team" : "bots"), "Timeline: board on the end screen (" + (g.board.team ? "team" : "bots") + ")");
  }
  async function switchTeam(g) {
    try {
      const pool = H.pool ? await H.pool() : null;
      const b = await H.rpc("get_timeline_board", { p_pool: (pool && pool.id) || null, p_client: (H.clientId && H.clientId()) || null });
      keepBoard(b, performance.now());
      if (G === g && b && Array.isArray(b.rows)) { g.board = b; g.prevWk = null; draw({}); }
    } catch (e) {}
  }

  // ── de stand van deze week als pop-up (tik op het chipje, db/238): de rijen van het eindscherm; jouw rij telt live mee (groen stipje) ──
  const WK_ID = "modal-tlwk";
  function weekRows(board, n) {
    const rows = board.rows.map((r) => ({ ...r })), me = rows.find((r) => r.me);
    if (me) { if (n > me.v) { me.v = n; me.live = true; } }
    else if (n > 0) rows.push({ name: (H && H.myName && H.myName()) || "", flair: (H && H.myFlair && H.myFlair()) || null, me: true, v: n, live: true });
    return rows.sort((a, b) => b.v - a.v || (a.live ? 1 : 0) - (b.live ? 1 : 0));   // gelijk: wie er al stond blijft boven
  }
  function weekHtml() {
    const b = CB.board, rows = weekRows(b, G && !G.done ? G.n : 0);
    const head = b.team ? ((H && H.poolPickerHtml && H.poolPickerHtml()) || esc(b.team)) : esc(L.vsBots);
    const list = rows.map((r) => boardRowHtml(r, 1 + rows.filter((x) => x.v > r.v).length, 0)).join("");
    return `<div class="modal-backdrop" data-close></div><div class="modal-card tl-wkpop">` +
      `<header class="modal-header"><h2 id="tlwk-title">${head}</h2><button type="button" class="modal-close" data-close aria-label="${esc(L.close)}">✕</button></header>` +
      `<div class="modal-body"><p class="tl-wkpop-sub">${esc(wkLeft(b.ends))}</p><div class="lb-table">${list}</div>` +
      (b.team ? "" : `<p class="tl-tb-cap">${esc(L.botsCap)}</p>`) + `</div></div>`;
  }
  function fillWeek(el) {
    el.innerHTML = weekHtml();
    if (CB.board.team && H && H.wirePoolPicker) H.wirePoolPicker(el, () => weekSwitch(el));
  }
  function openWeek() {
    if (!CB.board || !H) return;
    gc("timeline-chase-tap", "Timeline: standings opened from the chip");
    let el = document.getElementById(WK_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = WK_ID; el.className = "modal"; el.hidden = true;
      el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "tlwk-title");
      el.addEventListener("click", (e) => { if (e.target.closest("[data-close]")) H.closeModal(WK_ID); });
      document.body.appendChild(el);   // als laatste: boven het Timeline-scherm
    }
    fillWeek(el);
    H.openModal(WK_ID, { over: true });   // over: Timeline eronder blijft open; ✕, Esc en de achtergrond = terug naar je run
  }
  // een ander team gekozen in de pop-up: dat bord, en de rest van je run jaag je op dat team
  async function weekSwitch(el) {
    try {
      const pool = H.pool ? await H.pool() : null;
      const b = await H.rpc("get_timeline_board", { p_pool: (pool && pool.id) || null, p_client: (H.clientId && H.clientId()) || null });
      if (!b || !Array.isArray(b.rows)) return;
      keepBoard(b, performance.now());
      if (G && !G.done) G.chase = chaseFor();
      if (!el.hidden) fillWeek(el);
      if (G && !G.done && G.phase === "idle") draw();
    } catch (e) {}
  }

  // ── ↻ naast de hartjes: een nieuwe stapel. Halverwege een run (er ligt al iets) eerst de vraag; zonder zetten, op het eindscherm of na een
  // laadfout meteen. Nooit terwijl een kaart onderweg is: place() rekent na zijn pauzes nog op G. ──
  const ASK_ID = "modal-tlrst";
  function askRestart() {
    if (loading || drag) return;
    if (!G || G.done || !G.moves.length) { start(); return; }
    if (G.phase !== "idle") return;
    let el = document.getElementById(ASK_ID);
    if (!el) {
      el = document.createElement("div");
      el.id = ASK_ID; el.className = "modal"; el.hidden = true;
      el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "tlrst-title");
      el.addEventListener("click", (e) => {
        if (e.target.closest(".tl-ask-yes")) { H.closeModal(ASK_ID); restartRun(); return; }
        if (e.target.closest("[data-close]")) { H.closeModal(ASK_ID); const b = root.querySelector(".tl-hud .tl-rst"); if (b) b.focus(); }
      });
      document.body.appendChild(el);   // als laatste: boven het Timeline-scherm
    }
    el.innerHTML = `<div class="modal-backdrop" data-close></div><div class="modal-card tl-ask" tabindex="-1"><span class="tl-ask-ico">${RST_SVG}</span>` +
      `<h2 id="tlrst-title">${esc(L.rstQ)}</h2>${G.n ? `<p>${esc(L.rstSub(G.n))}</p>` : ""}` +
      `<div class="tl-ask-acts"><button type="button" class="tl-ask-yes">${esc(L.rstYes)}</button><button type="button" class="tl-ask-no" data-close>${esc(L.rstNo)}</button></div></div>`;
    H.openModal(ASK_ID, { over: true });   // over: Timeline eronder blijft open; Verder, Esc en de achtergrond = terug naar je run
    const card = el.querySelector(".tl-ask");   // de focus in de pop-up (Tab = Opnieuw), zonder ring om een knop na een tik
    if (card) card.focus({ preventScroll: true });
  }
  // de run stopt hier en telt mee zoals een gewoon einde (de server telt de zetten tot nu na); dan meteen een nieuwe stapel
  function restartRun() {
    const g = G;
    if (!g || g.done || g.phase !== "idle") return;
    g.done = true;
    if (g.n > 0) {
      if (isLive(g)) finishRun(g);   // G is dan al de nieuwe run: finishRun tekent niets, werkt alleen je record en het chipje bij
      else if (g.n > REC) { REC = g.n; ls(REC_KEY, REC); }
    }
    gc("timeline-restart", "Timeline: restarted mid-run");
    start();
  }

  // slepen: de kaart volgt je vinger; boven de tafel gaat het dichtstbijzijnde gat open; loslaten = leggen
  let drag = null;
  function pick() {
    const row = root.querySelector(".tl-row");
    if (!row) return;
    // dwars (26/11) staat je hand links náást de tafel: pas een gat openen als je vinger boven de tafel is (anders legde een klein
    // schuifje de kaart helemaal links), en pas naar links scrollen als je al op de tafel was (anders schoof hij weg terwijl je
    // er vanaf links op kwam). Rechtop begint je vinger midden boven de tafel, dus daar verandert niets.
    const rr = row.getBoundingClientRect(), near = drag.py > rr.top - 90 && drag.py < rr.bottom + 40 && drag.px > rr.left - 24;
    if (drag.onRow == null) drag.onRow = drag.x0 > rr.left - 24;   // rechtop begin je altijd boven de tafel
    if (!drag.onRow && drag.px > rr.left + 60) drag.onRow = true;
    let best = -1, bd = 1e9;
    if (near) root.querySelectorAll(".tl-slot").forEach((s) => { const r = s.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - drag.px); if (d < bd) { bd = d; best = +s.dataset.i; } });
    if (near && drag.slot >= 0 && best !== drag.slot) {   // niet heen en weer springen terwijl het gat opengaat
      const cur = root.querySelector(`.tl-slot[data-i="${drag.slot}"]`);
      if (cur) { const r = cur.getBoundingClientRect(); if (Math.abs(r.left + r.width / 2 - drag.px) - bd < 34) best = drag.slot; }
    }
    if (best !== drag.slot) {
      root.querySelectorAll(".tl-slot.tl-open").forEach((s) => s.classList.remove("tl-open"));
      const s = best >= 0 && root.querySelector(`.tl-slot[data-i="${best}"]`);
      if (s) s.classList.add("tl-open");
      drag.slot = best;
    }
    if (near) { if (drag.px < rr.left + 44) { if (drag.onRow) row.scrollLeft -= 9; } else if (drag.px > rr.right - 44) row.scrollLeft += 9; }
  }
  const loop = () => { if (!drag) return; pick(); drag.raf = requestAnimationFrame(loop); };
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag; drag = null; cancelAnimationFrame(d.raf);
    if (d.moved && d.slot >= 0) { place(d.slot, d.card.getBoundingClientRect()); return; }
    d.card.classList.remove("tl-drag"); d.card.style.transform = "";
    root.querySelectorAll(".tl-slot.tl-open").forEach((s) => s.classList.remove("tl-open"));
  };
  // slepen en tikken: één keer, op het scherm zelf (ensurePage)
  function listen(root) {
    let fitRaf = 0;   // een ander venster (of de adresbalk van een telefoon) = een andere --tl-hh: de tekst opnieuw passen
    addEventListener("resize", () => { cancelAnimationFrame(fitRaf); fitRaf = requestAnimationFrame(fitHand); });
    root.addEventListener("pointerdown", (e) => {
      const card = e.target.closest(".tl-card.tl-front");
      if (!card || !G || G.phase !== "idle" || G.done) return;
      const sb = e.target.closest(".tl-scroll .tl-txt");   // het scrollbalkje van een lange tekst pakken = scrollen, niet de kaart slepen
      if (sb && e.offsetX > sb.clientWidth) return;
      drag = { card, id: e.pointerId, x0: e.clientX, y0: e.clientY, px: e.clientX, py: e.clientY, moved: false, slot: -1, raf: 0 };
      try { card.setPointerCapture(e.pointerId); } catch (err) {}
    });
    root.addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (!drag.moved) { if (Math.hypot(dx, dy) < 6) return; drag.moved = true; drag.card.classList.remove("tl-deal"); drag.card.classList.add("tl-drag"); loop(); }
      drag.px = e.clientX; drag.py = e.clientY;
      drag.card.style.transform = `translate(${dx}px, ${dy}px) rotate(${Math.max(-7, Math.min(7, dx / 30))}deg) scale(1.03)`;
    });
    root.addEventListener("pointerup", endDrag);
    root.addEventListener("pointercancel", endDrag);
    // muis: de tafel slepen om je kaarten terug te zien, ook na afloop. Een vinger scrolt hem al; een sleep is nooit een tik op een gat.
    let pan = null, panClick = false;
    root.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0 || drag) return;
      const row = e.target.closest(".tl-row");
      if (row && row.scrollWidth > row.clientWidth) pan = { row, id: e.pointerId, x0: e.clientX, l0: row.scrollLeft, on: false };
    });
    root.addEventListener("pointermove", (e) => {
      if (!pan || e.pointerId !== pan.id) return;
      const dx = e.clientX - pan.x0;
      if (!pan.on) {
        if (Math.abs(dx) < 5) return;
        pan.on = true;
        pan.row.classList.add("tl-pan");
        try { pan.row.setPointerCapture(e.pointerId); } catch (err) {}
        try { getSelection().removeAllRanges(); } catch (err) {}
      }
      pan.row.scrollLeft = pan.l0 - dx;
    });
    const endPan = (e) => {
      if (!pan || e.pointerId !== pan.id) return;
      if (pan.on) { pan.row.classList.remove("tl-pan"); panClick = true; setTimeout(() => { panClick = false; }, 0); }
      pan = null;
    };
    root.addEventListener("pointerup", endPan);
    root.addEventListener("pointercancel", endPan);
    root.addEventListener("click", (e) => { if (panClick) { panClick = false; e.stopPropagation(); e.preventDefault(); } }, true);
    root.addEventListener("click", async (e) => {
      const s = e.target.closest(".tl-slot");
      if (s) { place(+s.dataset.i); return; }
      if (e.target.closest(".tl-again, .tl-retry")) { start(); return; }
      if (e.target.closest(".tl-rst")) { askRestart(); return; }
      if (e.target.closest(".tl-next")) { openWeek(); return; }
      const sh = e.target.closest(".tl-share");
      if (sh && G) {
        const txt = shareText(L, G.n, G.marks, G.rec), lab = sh.querySelector("span"), was = lab.textContent;
        gc("timeline-share", "Timeline: shared");
        if (isMobile() && navigator.share) { try { await navigator.share({ text: txt }); } catch (err) {} return; }
        const done = () => { lab.textContent = L.copied; setTimeout(() => { lab.textContent = was; }, 1600); };
        try { await navigator.clipboard.writeText(txt); } catch (err) {}
        done();
      }
    });
  }

  // ── het scherm en de kop ──
  function ensureCss() {
    if (document.getElementById("tl-css")) return;
    const st = document.createElement("style");
    st.id = "tl-css"; st.textContent = CSS;
    document.head.appendChild(st);
  }
  function ensurePage() {
    root = document.getElementById(PAGE_ID);
    if (root) return root;
    root = document.createElement("section");
    root.id = PAGE_ID; root.className = "modal tl-page tl"; root.hidden = true;
    root.setAttribute("aria-label", "Timeline");
    (document.querySelector("main") || document.body).appendChild(root);
    listen(root);
    return root;
  }
  function ensureKop() {
    let k = document.getElementById("kop-tl");
    const nav = document.getElementById("mode-tabs");
    if (!nav) return null;
    if (!k) {
      k = document.createElement("div");
      k.id = "kop-tl"; k.className = "kop-tl";
      nav.appendChild(k);
      k.addEventListener("click", (e) => {
        const b = e.target.closest(".tl-snd");
        if (b) { snd = !snd; ls(SND_KEY, snd ? "1" : "0"); b.setAttribute("aria-pressed", String(snd)); }
      });
      if (window.ResizeObserver) { const ro = new ResizeObserver(() => center()); ro.observe(k); }
    }
    k.innerHTML = kopHtml();
    return k;
  }
  // het logo echt in het midden van de kop als er ruimte is, zoals bij Duels (centerLogo in duel.js): het woord, niet woord + alpha;
  // nooit dichter dan 6 px bij de deur of 🔈
  function center() {
    const k = document.getElementById("kop-tl"), nav = document.getElementById("mode-tabs"), lg = k && k.querySelector(".tl-logo");
    if (!k || !nav || !lg || !k.offsetParent) return;
    lg.style.setProperty("--kd-dx", "0px");
    const r = lg.getBoundingClientRect(), w = lg.querySelector(".tl-logo-in").getBoundingClientRect(), n = nav.getBoundingClientRect();
    const door = document.getElementById("world-door"), snb = k.querySelector(".tl-snd");
    const lo = (door && door.offsetParent ? door.getBoundingClientRect().right : r.left) + 6 - r.left;
    const hi = (snb ? snb.getBoundingClientRect().left : n.right) - 6 - r.right;
    const want = n.left + n.width / 2 - (w.left + w.width / 2);
    lg.style.setProperty("--kd-dx", (hi < lo ? 0 : Math.round(Math.min(hi, Math.max(lo, want)))) + "px");
  }
  function useLang(l) { LANG = T[l] ? l : "en"; L = T[LANG]; }
  // game.js: de deur op de Duels-pagina of het adres /timeline/. Een lopend potje gaat gewoon verder waar je was.
  function open(host) {
    H = host;
    useLang(H.lang);
    ensureCss(); ensurePage(); ensureKop();
    H.openModal(PAGE_ID);
    try { document.documentElement.removeAttribute("data-tlload"); } catch (e) {}   // het 🗓️-laadscherm (head-script)
    center();
    if (G || loading) draw(); else start();
  }
  // 🌐 op de Timeline-pagina: de teksten in de nieuwe taal; kaarten die al op tafel liggen blijven, de volgende stapel komt in de nieuwe taal
  function setLang(l) {
    if (!H) return;
    H.lang = l;
    useLang(l);
    nextDeck = null;
    ensureKop();
    center();
    if (root) draw();
  }
})();
