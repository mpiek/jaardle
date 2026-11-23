// 🗓️ Timeline (alpha, 22/11/2026): jaardle.com/timeline. Eerst een losse pagina ("maak maar, maar laten we het nog niet promoten …
// gewoon achter jaardle.com/timeline als alpha mode"); dezelfde dag een pagina van de app zelf, zoals /duels/ (zijn "zelfde bovenscherm
// als duels dat je ook profiel enzo hebt want is 1 account"): game.js laadt dit bestand lui (op /timeline/ of bij een tik op de deur op
// de Duels-pagina) en roept open(host) aan. Dit zet het scherm (#modal-tl, een .modal in <main>) en het logo + 🔈 in de kop (#mode-tabs);
// profiel, 🌐 en de deur zijn van game.js. Nog alpha: noindex (build-html.mjs).
// Mockups: https://claude.ai/artifact/8deX6CCXoyNo5RLdM6ymz1 (het spel, v5), https://claude.ai/artifact/4f3dCFfBmN2X4iQ9cRguoo (de kop).
// Server: db/226 get_timeline_deck(lang), alleen lezen.
// Hoe het werkt: leg elke nieuwe kaart in het goede gat van je tijdlijn, door te slepen of op een + te tikken. De kaart draait dan om
// en laat het jaar zien. Fout kost een ❤️, na drie fouten is het klaar.
// Bewaard: alleen het record en de geluidsstand, per toestel (localStorage). Geen plays, geen rating, geen trofeeën.
// Meetpunten (GoatCounter, site jaardle-events, zoals gcCount in game.js): timeline-start, timeline-end-<band>, timeline-share,
// timeline-deck-op.
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
  const fits = (line, i, c) => (i === 0 || line[i - 1].y <= c.y) && (i === line.length || c.y <= line[i].y);
  const rightIdx = (line, c) => line.filter((x) => x.y <= c.y).length;
  const shareText = (L, n, marks, isRec) => `${L.shareHead(n, isRec)}\n📊 ${marks.map((m) => (m ? "🟩" : "🟥")).join("")}\njaardle.com/timeline`;
  const endBand = (n) => (n < 5 ? "0-4" : n < 10 ? "5-9" : n < 20 ? "10-19" : "20+");

  const CSS = String.raw`/* ═══ 🗓️ Timeline (alpha, /timeline.js) ═══ */
:root { --tl: #1976d2; --tl-back: #1976d2; --tl-back-2: #1565c0; --tl-ch: clamp(10rem, 100dvh - 30rem, 13.5rem);
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
/* 🔈 zoals op Duels: een rondje van 1.95rem (31 px), even groot als het poppetje links (23/11, één maat voor de hele bovenregel) */
.tl-snd { flex: none; display: grid; place-items: center; width: 1.95rem; height: 1.95rem; padding: 0; color: var(--muted); background: transparent; border: 1px solid var(--border); border-radius: 50%; }
.tl-snd:hover { filter: none; color: var(--fg); background: var(--card-soft); }
.tl-snd:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.tl-snd svg { width: 1.05rem; height: 1.05rem; }
.tl-snd .on, .tl-snd[aria-pressed="true"] .off { display: none; }
.tl-snd[aria-pressed="true"] .on { display: inline; }
.tl-snd[aria-pressed="false"] { opacity: 0.6; }

/* boven lees je (je hartjes en de nieuwe kaart), direct daaronder de tafel waar je schuift en tikt */
.tl-game { position: relative; display: flex; flex-direction: column; }
.tl-hud { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.45rem; padding: 0.4rem 0.75rem 0.4rem 0.55rem;
  background: var(--card); border: 1px solid var(--border); border-radius: 14px; }
.tl-hearts { display: flex; gap: 0.25rem; }
.tl-heart { position: relative; display: grid; place-items: center; width: 2.15rem; height: 2.15rem; font-size: 1.75rem; line-height: 1; }
.tl-heart.lost > span { filter: grayscale(1); opacity: 0.28; }
.tl-heart img { position: absolute; inset: -0.15rem; width: 2.45rem; height: 2.45rem; }
.tl-heart.breaking > span { opacity: 0; }
.tl-stand { display: flex; align-items: center; gap: 0.6rem; }
.tl-streak { display: inline-flex; align-items: center; gap: 0.15rem; height: 1.9rem; padding: 0 0.55rem 0 0.35rem; border-radius: 999px; font-weight: 800;
  font-size: 0.95rem; color: var(--flame); background: color-mix(in srgb, var(--flame) 15%, transparent); font-variant-numeric: tabular-nums; }
.tl-streak img, .tl-streak .tl-fl { width: 1.35rem; height: 1.35rem; font-size: 1.1rem; line-height: 1.35rem; text-align: center; }
.tl-score { display: flex; align-items: baseline; gap: 0.3rem; font-variant-numeric: tabular-nums; }
.tl-score b { font-size: 1.75rem; font-weight: 800; line-height: 1; }
.tl-score span { font-size: 0.8rem; font-weight: 600; color: var(--muted); }
.tl-bump { animation: tl-bump 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.5) both; }
@keyframes tl-bump { from { transform: scale(1.6); } to { transform: none; } }

/* je hand: de nieuwe kaart met de stapel erachter */
.tl-hand { position: relative; z-index: 2; display: grid; place-items: center; padding: 0.35rem 0 1.9rem; }
.tl-handin { position: relative; width: min(16.5rem, 80%); min-height: 12.2rem; isolation: isolate; }
.tl-back { position: absolute; inset: 0; z-index: -1; border-radius: 16px; background-color: var(--tl-back);
  background-image: repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.09) 0 5px, transparent 5px 11px);
  box-shadow: inset 0 0 0 5px var(--tl-back-2), inset 0 0 0 6.5px rgba(255, 255, 255, 0.5), var(--shadow-pop); }
.tl-back.b1 { transform: translate(9px, 5px) rotate(4deg); }
.tl-back.b2 { transform: translate(17px, 10px) rotate(8deg); }
.tl-left { position: absolute; right: calc(100% + 0.8rem); top: 50%; transform: translateY(-50%); font-size: 0.72rem; font-weight: 700; line-height: 1.2;
  text-align: center; color: var(--muted); font-variant-numeric: tabular-nums; }
.tl-left b { display: block; font-size: 1rem; color: var(--fg); }
.tl-card { position: relative; display: flex; flex-direction: column; gap: 0.55rem; min-height: 12.2rem; padding: 0.8rem 1rem 0.95rem; color: var(--fg);
  background: var(--card); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow-pop); transform: rotate(-1.5deg);
  touch-action: none; user-select: none; -webkit-user-select: none; cursor: grab; }
.tl-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.tl-suit { display: flex; align-items: center; gap: 0.4rem; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
.tl-suit i { font-style: normal; font-size: 1.3rem; letter-spacing: 0; }
.tl-txt { flex: 1; margin: 0; font-size: 1.05rem; font-weight: 600; line-height: 1.32; overflow-wrap: anywhere; hyphens: auto; }
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
.tl-end { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; margin: 0.1rem 0 0.4rem; padding: 1rem 1rem 1.1rem; text-align: center;
  background: var(--card); border: 1px solid var(--border); border-radius: 16px; box-shadow: var(--shadow-pop); }
.tl-end-n { font-size: 3rem; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.tl-end-l { font-size: 0.95rem; color: var(--muted); }
.tl-end-rec { margin-top: 0.35rem; font-weight: 800; color: var(--gold-text); }
.tl-end-rec.old { color: var(--muted); font-weight: 600; }
.tl-end-acts { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.5rem; margin-top: 0.75rem; }
.tl-end-acts button { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; }
.tl-end-acts svg { width: 1rem; height: 1rem; }
@media (prefers-reduced-motion: reduce) {
  .tl-c.tl-reveal, .tl-c.tl-reveal .tl-y, .tl-card.tl-deal, .tl-bump, .tl-float, .tl-c .tl-v { animation: none !important; }
  .tl-slot { transition: none; }
}
`;

  window.JaardleTimeline = { T, fits, rightIdx, shareText, endBand, SUIT, CSS, open, setLang };

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
  const SFX = {};
  let AC = null;
  function play(name) {
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
      const notes = { good: [660, 990], streak: [784, 1175, 1568], record: [523, 659, 784, 1047] }[name] || [];
      notes.forEach((f, i) => {
        const o = AC.createOscillator(), g = AC.createGain(), t0 = AC.currentTime + i * 0.09;
        o.type = "triangle"; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.3);
        o.connect(g).connect(AC.destination); o.start(t0); o.stop(t0 + 0.32);
      });
    } catch (e) {}
  }

  // ── de stapel van de server (db/226): ±54 kaarten, de volgende alvast in de achtergrond ──
  async function fetchDeck() {
    const r = await fetch(SB.url + "/rest/v1/rpc/get_timeline_deck", {
      method: "POST",
      headers: { apikey: SB.key, Authorization: "Bearer " + SB.key, "Content-Type": "application/json" },
      body: JSON.stringify({ p_lang: LANG }),
    });
    if (!r.ok) throw new Error("get_timeline_deck " + r.status);
    const d = await r.json();
    if (!Array.isArray(d) || d.length < 10) throw new Error("lege stapel");
    return d.filter((c) => c && Number.isFinite(c.y) && c.t).map((c, k) => ({ y: c.y, t: String(c.t), c: c.c, k }));
  }
  let nextDeck = null;
  const prefetch = () => { if (!nextDeck) { nextDeck = fetchDeck(); nextDeck.catch(() => { nextDeck = null; }); } };

  // ── tekenen ──
  const SND_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 9.3h3.4l4.6-3.9v13.2l-4.6-3.9H3.5z" fill="currentColor"/>` +
    `<g class="on" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M15 9.3a3.9 3.9 0 0 1 0 5.4"/><path d="M17.7 6.7a7.6 7.6 0 0 1 0 10.6"/></g>` +
    `<g class="off" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M15.4 9.6l4.8 4.8M20.2 9.6l-4.8 4.8"/></g></svg>`;
  const SHARE_SVG = `<svg viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M352 224c53 0 96-43 96-96s-43-96-96-96-96 43-96 96c0 4 .2 8 .7 11.9l-94.1 47C145 174.6 124.8 160 96 160c-53 0-96 43-96 96s43 96 96 96c28.8 0 49-14.6 62.6-30.9l94.1 47c-.5 3.9-.7 7.8-.7 11.9 0 53 43 96 96 96s96-43 96-96-43-96-96-96c-28.8 0-49 14.6-62.6 30.9l-94.1-47c.5-3.9 .7-7.8 .7-11.9s-.2-8-.7-11.9l94.1-47C303 209.4 323.2 224 352 224z"/></svg>`;
  // in de kop van game.js (#mode-tabs), achter profiel, 🌐 en de deur: het logo en 🔈
  const kopHtml = () => `<h2 class="tl-logo"><span class="tl-logo-in"><span class="tl-logo-txt">Timeline</span><span class="tl-logo-line" aria-hidden="true"><i></i><i></i><i></i></span></span>` +
    `<span class="tl-alpha">alpha</span></h2><button type="button" class="tl-snd" aria-pressed="${snd}" aria-label="${esc(L.sound)}" title="${esc(L.sound)}">${SND_SVG}</button>`;
  function hudHtml(s, o) {
    const hearts = [0, 1, 2].map((i) => {
      const br = o.breakIdx === i;
      return `<span class="tl-heart${i >= s.lives ? " lost" : ""}${br ? " breaking" : ""}"><span>❤️</span>${br ? `<img src="/emoji/heartbreak.webp" alt="">` : ""}</span>`;
    }).join("");
    const streak = s.streak >= 2 ? `<span class="tl-streak">${o.fire ? `<img src="/emoji/fire.webp" alt="">` : `<span class="tl-fl">🔥</span>`}${s.streak}</span>` : "";
    return `<div class="tl-hud"><span class="tl-hearts" role="img" aria-label="${esc(L.lives(s.lives))}">${hearts}</span>` +
      `<span class="tl-stand">${streak}<span class="tl-score"><b class="${o.bump ? "tl-bump" : ""}">${s.n}</b><span>${esc(L.good)}</span></span></span></div>`;
  }
  const suit = (c) => SUIT[c] || "🗓️";
  const frontHtml = (c, deal) => `<div class="tl-card tl-front${deal ? " tl-deal" : ""}" tabindex="0" aria-label="${esc(L.newCard + ": " + c.t)}">` +
    `<div class="tl-suit"><i aria-hidden="true">${suit(c.c)}</i>${esc(L.cats[(c.c || 0) - 1] || "")}</div><p class="tl-txt">${esc(c.t)}</p><span class="tl-q" aria-hidden="true">????</span></div>`;
  const handHtml = (s, o) => `<div class="tl-hand"><div class="tl-handin"><div class="tl-back b2"></div><div class="tl-back b1"></div>${s.cur ? frontHtml(s.cur, o.deal) : ""}` +
    `<span class="tl-left">${esc(L.left)}<b>${s.pile.length}</b></span></div></div><p class="tl-cue${s.marks.length ? " gone" : ""}">${esc(L.cue)}</p>`;
  function cardHtml(c, o) {
    const rev = o.reveal === c.k, bad = c.ok === false;
    return `<div class="tl-c${bad ? " tl-bad" : ""}${rev ? " tl-reveal" + (bad ? "" : " tl-good") : ""}" data-k="${c.k}"><span class="tl-y">${yHtml(c.y)}</span>` +
      `<span class="tl-s" aria-hidden="true">${suit(c.c)}</span><span class="tl-t">${esc(c.t)}</span>` +
      (bad ? `<span class="tl-x" aria-label="${esc(L.wrong)}">✕</span>` : rev ? `<span class="tl-v" aria-hidden="true">✓</span>` : "") +
      (o.float && o.float.k === c.k ? `<span class="tl-float ${o.float.cls}" role="status">${esc(o.float.text)}</span>` : "") + `</div>`;
  }
  function tableHtml(s, o) {
    const line = s.line;
    const slot = (i) => (s.done ? "" : `<button type="button" class="tl-slot" data-i="${i}" aria-label="${esc(i === 0 ? L.first : i === line.length ? L.last : L.between(yTxt(line[i - 1].y), yTxt(line[i].y)))}"></button>`);
    return `<div class="tl-tablewrap"><div class="tl-ends"><span>← ${esc(L.earlier)}</span><span>${esc(L.later)} →</span></div>` +
      `<div class="tl-row${s.phase !== "idle" ? " tl-busy" : ""}"><div class="tl-strip">` + line.map((c, i) => slot(i) + cardHtml(c, o)).join("") + slot(line.length) + `</div></div></div>`;
  }
  const endHtml = (s) => `<div class="tl-end" aria-live="polite">${s.deckDone ? `<span class="tl-end-l">${esc(L.deckDone)}</span>` : ""}<span class="tl-end-n">${s.n}</span>` +
    `<span class="tl-end-l">${esc(L.placed(s.n))}</span>` + (s.rec ? `<span class="tl-end-rec">${esc(L.record)}</span>` : `<span class="tl-end-rec old">${esc(L.yourRec(s.prevRec))}</span>`) +
    `<div class="tl-end-acts"><button type="button" class="tl-share">${SHARE_SVG}<span>${esc(L.share)}</span></button><button type="button" class="tl-again">${esc(L.again)}</button></div></div>`;
  const gameHtml = (s, o = {}) => `<div class="tl-game">${hudHtml(s, o)}${s.done ? endHtml(s) : handHtml(s, o)}${tableHtml(s, o)}</div>`;
  const msgHtml = (text, retry) => `<div class="tl-game"><div class="tl-msg"><p>${esc(text)}</p>${retry ? `<button type="button" class="tl-retry">${esc(L.retry)}</button>` : ""}</div></div>`;

  // ── het spel ──
  let G = null;
  function newGame(deck) {
    const pile = deck.slice(), fi = pile.findIndex((c) => c.y > 1000 && c.y < 1950);   // een begin uit het midden: aan beide kanten ruimte
    const first = pile.splice(fi >= 0 ? fi : 0, 1)[0];
    return { pile, line: [first], cur: pile.shift(), lives: 3, n: 0, streak: 0, marks: [], done: false, deckDone: false, phase: "idle", rec: false, prevRec: REC };
  }
  function draw(o = {}) {
    const row0 = root.querySelector(".tl-row"), left = row0 ? row0.scrollLeft : 0, game = root.querySelector(".tl-game");
    const html = G ? gameHtml(G, o) : msgHtml(o.error ? L.error : L.loading, !!o.error);
    if (game) game.outerHTML = html; else root.insertAdjacentHTML("beforeend", html);
    const row = root.querySelector(".tl-row");
    if (row) row.scrollLeft = left;
    if (o.show != null) ensureVisible(o.show);
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
    if (ok) {
      G.n++; G.streak++;
      const a = G.line[i - 1], b = G.line[i + 1], tight = a && b && b.y - a.y <= 10;
      const f = [3, 5, 10, 15, 20, 30].includes(G.streak) ? ["hot", L.streak(G.streak)] : tight ? ["good", L.tight] : ["good", "+1"];
      draw({ reveal: c.k, bump: true, fire: G.streak >= 2, float: { k: c.k, cls: f[0], text: f[1] }, show: c.k });
      play(f[0] === "hot" ? "streak" : "good");
      await wait(650);
    } else {
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
      G.done = true; G.deckDone = G.lives > 0; G.phase = "idle"; G.prevRec = REC; G.rec = G.n > REC;
      if (G.rec) { REC = G.n; ls(REC_KEY, REC); }
      draw({});
      const row = root.querySelector(".tl-row");
      if (row) row.scrollLeft = 0;
      if (G.rec) play("record");
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

  // slepen: de kaart volgt je vinger; boven de tafel gaat het dichtstbijzijnde gat open; loslaten = leggen
  let drag = null;
  function pick() {
    const row = root.querySelector(".tl-row");
    if (!row) return;
    const rr = row.getBoundingClientRect(), near = drag.py > rr.top - 90 && drag.py < rr.bottom + 40;
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
    if (near) { if (drag.px < rr.left + 44) row.scrollLeft -= 9; else if (drag.px > rr.right - 44) row.scrollLeft += 9; }
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
    root.addEventListener("pointerdown", (e) => {
      const card = e.target.closest(".tl-card.tl-front");
      if (!card || !G || G.phase !== "idle" || G.done) return;
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
    root.addEventListener("click", async (e) => {
      const s = e.target.closest(".tl-slot");
      if (s) { place(+s.dataset.i); return; }
      if (e.target.closest(".tl-again, .tl-retry")) { start(); return; }
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
