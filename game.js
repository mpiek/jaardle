const MAX_GUESSES = 6;
const FACTS_PER_PUZZLE = 1;
const MAX_EXTRA_HINTS = 2;
const MAX_DIRECTION_HINTS = 2;
const EPOCH = new Date(Date.UTC(2026, 5, 6));   // v1-launch: dag #1 = 2026-06-06
const EPOCH_KEY = EPOCH.toISOString().slice(0, 10);   // "2026-06-06" — eerste browsbare daily
const MIN_YEAR = -753;
const MAX_YEAR = new Date().getFullYear();

// --- i18n (meertalig) --------------------------------------------------------
// EÉN plek voor álle talen. Een taal toevoegen is puur configuratie:
//   1. voeg een entry toe aan LANGS hieronder,
//   2. voeg een volledig blok toe aan I18N (zelfde keys als de andere talen),
//   3. draai `npm run build` — dat genereert de per-taal HTML-mirror (/, /en, /de…)
//      uit index.template.html met de juiste <head>/SEO-tags en voorgerenderde tekst.
// De volledigheidstest (tests/i18n.test.mjs) faalt als een taal een key mist.
// Zie tools/build-html.mjs voor het build-script.
//
// Velden per taal: label (menu), flag (SVG in /flags, Kenney Flag Pack — geen
// emoji: Windows rendert vlag-emoji's als letterparen), html (<html lang>),
// intl (Intl + ld+json), og (og:locale), path (URL-segment; "" = root-taal).
const LANGS = {
  nl: { label: "Nederlands", flag: "NL", html: "nl", intl: "nl-NL", og: "nl_NL", path: "nl" },
  en: { label: "English",    flag: "GB", html: "en", intl: "en-GB", og: "en_GB", path: "" },
  de: { label: "Deutsch",    flag: "DE", html: "de", intl: "de-DE", og: "de_DE", path: "de" },
  es: { label: "Español",    flag: "ES", html: "es", intl: "es-ES", og: "es_ES", path: "es" },
  pt: { label: "Português",  flag: "BR", html: "pt", intl: "pt-BR", og: "pt_BR", path: "pt" },
};
const LANG_CODES = Object.keys(LANGS);
// Brontaal: hieruit lenen we een string/feit als de huidige taal die mist (het
// meest complete blok). Los van de browser-detectie-fallback hieronder.
const DEFAULT_LANG = "en";
// Wat een bezoeker krijgt als zijn browsertaal géén van onze talen matcht: het
// internationale publiek komt standaard in het Engels binnen.
const BROWSER_DEFAULT = "en";

// Taalkeuze: pad (/en) > ?lang= > opgeslagen voorkeur > browsertaal > BROWSER_DEFAULT.
let lang = (() => {
  try {
    const seg = location.pathname.replace(/\/+$/, "").split("/").filter(Boolean)[0];
    if (LANG_CODES.includes(seg)) return seg;
    const q = new URLSearchParams(location.search).get("lang");
    if (LANG_CODES.includes(q)) return q;
    const stored = localStorage.getItem("jaardle:lang");
    if (LANG_CODES.includes(stored)) return stored;
    const prefs = navigator.languages || [navigator.language || ""];
    for (const pref of prefs) {
      const code = String(pref).toLowerCase().split("-")[0];
      if (LANG_CODES.includes(code)) return code;
    }
    return BROWSER_DEFAULT;
  } catch (e) { return BROWSER_DEFAULT; }
})();

const HELP_NL = `
  <li>Je krijgt een gebeurtenis uit een jaar en <span data-help="max-guesses"></span> pogingen om dat jaar te raden. In de carrousel staan vanaf de start <strong>gratis</strong> twee extra feiten uit hetzelfde jaar (💡 geel) — swipe ernaartoe.</li>
  <li><strong>Swipe de carrousel voor meer hints</strong> — tik "Onthul" (kost punten): <strong>⏩ 100, 250, 500, 1000 en 1500 jaar later</strong> (gebeurtenissen ná het antwoord), <strong>🏛️ tijdvak</strong> (de eeuw) en <strong>🔢 laatste cijfer</strong> van het jaartal.</li>
  <li>Per gok zie je een gekleurde badge met range. Richting (↑/↓) is verborgen tot je 'm vraagt.</li>
  <li>Max <strong><span data-help="max-dir-hints"></span> richting-hints</strong> (🧭) per puzzel. Een richting-hint onthult pijl alleen op je laatste gok.</li>
  <li>🟩 0 &nbsp; 🟪 1–2 &nbsp; 🟨 3–10 &nbsp; 🟧 11–25 &nbsp; 🟥 26–50 &nbsp; 🟫 51–200 &nbsp; ⬜ 201–599 &nbsp; ⬛ 600+</li>
  <li><strong>Score (0–100)</strong>: start op 100, strafpunten per misgok: 🟪 <span data-penalty="veryclose"></span> · 🟨 <span data-penalty="close"></span> · 🟧 <span data-penalty="warm"></span> · 🟥 <span data-penalty="cool"></span> · 🟫 <span data-penalty="far"></span> · ⬜ <span data-penalty="distant"></span> · ⬛ <span data-penalty="farthest"></span>. De gele extra-feiten zijn gratis; ⏩ <span data-penalty="later-clue"></span>, 🏛️ <span data-penalty="century-hint"></span>, 🔢 <span data-penalty="digit-hint"></span> en 🧭 <span data-penalty="dir-hint"></span> kosten punten. Verloren = 0–10, o.b.v. je dichtste gok.</li>
  <li>Tiers: <span data-help="tiers"></span></li>
  <li><strong>Dagelijkse Jaardle</strong>: elke dag één puzzel die voor iedereen gelijk is.</li>
  <li><strong>Nieuw spel</strong>: oneindig rondjes, willekeurige gebeurtenis.</li>
  <li><strong>Toetsen</strong>: cijfers + Enter om te gokken, <kbd>−</kbd> voor v.Chr., <kbd>R</kbd> voor richting-hint, <kbd>D</kbd>/<kbd>N</kbd> om te wisselen.</li>`;
const HELP_EN = `
  <li>You get an event from a year and <span data-help="max-guesses"></span> guesses to find that year. From the start, the carousel holds two <strong>free</strong> extra facts from the same year (💡 yellow) — swipe to see them.</li>
  <li><strong>Swipe the carousel for more hints</strong> — tap "Reveal" (costs points): <strong>⏩ 100, 250, 500, 1000 and 1500 years later</strong> (events after the answer), <strong>🏛️ era</strong> (the century) and the <strong>🔢 last digit</strong> of the year.</li>
  <li>Each guess shows a coloured badge with a range. Direction (↑/↓) stays hidden until you ask for it.</li>
  <li>Max <strong><span data-help="max-dir-hints"></span> direction hints</strong> (🧭) per puzzle. A direction hint reveals the arrow only on your latest guess.</li>
  <li>🟩 0 &nbsp; 🟪 1–2 &nbsp; 🟨 3–10 &nbsp; 🟧 11–25 &nbsp; 🟥 26–50 &nbsp; 🟫 51–200 &nbsp; ⬜ 201–599 &nbsp; ⬛ 600+</li>
  <li><strong>Score (0–100)</strong>: starts at 100, penalty per wrong guess: 🟪 <span data-penalty="veryclose"></span> · 🟨 <span data-penalty="close"></span> · 🟧 <span data-penalty="warm"></span> · 🟥 <span data-penalty="cool"></span> · 🟫 <span data-penalty="far"></span> · ⬜ <span data-penalty="distant"></span> · ⬛ <span data-penalty="farthest"></span>. The yellow extra facts are free; ⏩ <span data-penalty="later-clue"></span>, 🏛️ <span data-penalty="century-hint"></span>, 🔢 <span data-penalty="digit-hint"></span> and 🧭 <span data-penalty="dir-hint"></span> cost points. Lost = 0–10, based on your closest guess.</li>
  <li>Tiers: <span data-help="tiers"></span></li>
  <li><strong>Daily Jaardle</strong>: one puzzle a day, the same for everyone.</li>
  <li><strong>New game</strong>: endless rounds, a random event.</li>
  <li><strong>Keys</strong>: digits + Enter to guess, <kbd>−</kbd> for BC, <kbd>R</kbd> for a direction hint, <kbd>D</kbd>/<kbd>N</kbd> to switch.</li>`;
const HELP_DE = `
  <li>Du bekommst ein Ereignis aus einem Jahr und <span data-help="max-guesses"></span> Versuche, dieses Jahr zu erraten. Im Karussell stehen von Anfang an <strong>gratis</strong> zwei zusätzliche Fakten aus demselben Jahr (💡 gelb) — wische einfach hin.</li>
  <li><strong>Wische durch das Karussell für mehr Hinweise</strong> — tippe auf „Aufdecken" (kostet Punkte): <strong>⏩ 100, 250, 500, 1000 und 1500 Jahre später</strong> (Ereignisse nach dem Antwortjahr), <strong>🏛️ Epoche</strong> (das Jahrhundert) und die <strong>🔢 letzte Ziffer</strong> des Jahres.</li>
  <li>Jeder Versuch zeigt ein farbiges Feld mit einer Spanne. Die Richtung (↑/↓) bleibt verborgen, bis du danach fragst.</li>
  <li>Max. <strong><span data-help="max-dir-hints"></span> Richtungshinweise</strong> (🧭) pro Rätsel. Ein Richtungshinweis zeigt den Pfeil nur bei deinem letzten Versuch.</li>
  <li>🟩 0 &nbsp; 🟪 1–2 &nbsp; 🟨 3–10 &nbsp; 🟧 11–25 &nbsp; 🟥 26–50 &nbsp; 🟫 51–200 &nbsp; ⬜ 201–599 &nbsp; ⬛ 600+</li>
  <li><strong>Punkte (0–100)</strong>: Start bei 100, Abzug pro Fehlversuch: 🟪 <span data-penalty="veryclose"></span> · 🟨 <span data-penalty="close"></span> · 🟧 <span data-penalty="warm"></span> · 🟥 <span data-penalty="cool"></span> · 🟫 <span data-penalty="far"></span> · ⬜ <span data-penalty="distant"></span> · ⬛ <span data-penalty="farthest"></span>. Die gelben Extra-Fakten sind gratis; ⏩ <span data-penalty="later-clue"></span>, 🏛️ <span data-penalty="century-hint"></span>, 🔢 <span data-penalty="digit-hint"></span> und 🧭 <span data-penalty="dir-hint"></span> kosten Punkte. Verloren = 0–10, basierend auf deinem besten Versuch.</li>
  <li>Stufen: <span data-help="tiers"></span></li>
  <li><strong>Tägliches Jaardle</strong>: ein Rätsel pro Tag, für alle gleich.</li>
  <li><strong>Neues Spiel</strong>: endlose Runden, ein zufälliges Ereignis.</li>
  <li><strong>Tasten</strong>: Ziffern + Enter zum Raten, <kbd>−</kbd> für v. Chr., <kbd>R</kbd> für einen Richtungshinweis, <kbd>D</kbd>/<kbd>N</kbd> zum Wechseln.</li>`;
const HELP_ES = `
  <li>Recibes un acontecimiento de un año y <span data-help="max-guesses"></span> intentos para adivinar ese año. Desde el inicio, el carrusel incluye <strong>gratis</strong> dos datos adicionales del mismo año (💡 amarillo) — desliza para verlos.</li>
  <li><strong>Desliza el carrusel para más pistas</strong> — toca «Revelar» (resta puntos): <strong>⏩ 100, 250, 500, 1000 y 1500 años después</strong> (acontecimientos posteriores a la respuesta), <strong>🏛️ época</strong> (el siglo) y la <strong>🔢 última cifra</strong> del año.</li>
  <li>Cada intento muestra una etiqueta de color con un margen. La dirección (↑/↓) permanece oculta hasta que la pidas.</li>
  <li>Máx. <strong><span data-help="max-dir-hints"></span> pistas de dirección</strong> (🧭) por puzle. Una pista de dirección revela la flecha solo en tu último intento.</li>
  <li>🟩 0 &nbsp; 🟪 1–2 &nbsp; 🟨 3–10 &nbsp; 🟧 11–25 &nbsp; 🟥 26–50 &nbsp; 🟫 51–200 &nbsp; ⬜ 201–599 &nbsp; ⬛ 600+</li>
  <li><strong>Puntos (0–100)</strong>: empiezas con 100, penalización por cada fallo: 🟪 <span data-penalty="veryclose"></span> · 🟨 <span data-penalty="close"></span> · 🟧 <span data-penalty="warm"></span> · 🟥 <span data-penalty="cool"></span> · 🟫 <span data-penalty="far"></span> · ⬜ <span data-penalty="distant"></span> · ⬛ <span data-penalty="farthest"></span>. Los datos extra amarillos son gratis; ⏩ <span data-penalty="later-clue"></span>, 🏛️ <span data-penalty="century-hint"></span>, 🔢 <span data-penalty="digit-hint"></span> y 🧭 <span data-penalty="dir-hint"></span> restan puntos. Perdida = 0–10, según tu intento más cercano.</li>
  <li>Niveles: <span data-help="tiers"></span></li>
  <li><strong>Jaardle diario</strong>: un puzle al día, igual para todos.</li>
  <li><strong>Partida nueva</strong>: rondas infinitas, un acontecimiento aleatorio.</li>
  <li><strong>Teclas</strong>: cifras + Enter para adivinar, <kbd>−</kbd> para a. C., <kbd>R</kbd> para una pista de dirección, <kbd>D</kbd>/<kbd>N</kbd> para cambiar.</li>`;
const HELP_PT = `
  <li>Você recebe um acontecimento de um ano e <span data-help="max-guesses"></span> tentativas para adivinhar esse ano. Desde o início, o carrossel traz <strong>grátis</strong> dois fatos extras do mesmo ano (💡 amarelo) — deslize para vê-los.</li>
  <li><strong>Deslize o carrossel para mais dicas</strong> — toque em "Revelar" (custa pontos): <strong>⏩ 100, 250, 500, 1000 e 1500 anos depois</strong> (acontecimentos posteriores à resposta), <strong>🏛️ era</strong> (o século) e o <strong>🔢 último algarismo</strong> do ano.</li>
  <li>Cada tentativa mostra uma etiqueta colorida com uma faixa. A direção (↑/↓) fica oculta até você pedir.</li>
  <li>Máx. <strong><span data-help="max-dir-hints"></span> dicas de direção</strong> (🧭) por quebra-cabeça. Uma dica de direção revela a seta apenas na sua última tentativa.</li>
  <li>🟩 0 &nbsp; 🟪 1–2 &nbsp; 🟨 3–10 &nbsp; 🟧 11–25 &nbsp; 🟥 26–50 &nbsp; 🟫 51–200 &nbsp; ⬜ 201–599 &nbsp; ⬛ 600+</li>
  <li><strong>Pontos (0–100)</strong>: começa em 100, penalidade por cada erro: 🟪 <span data-penalty="veryclose"></span> · 🟨 <span data-penalty="close"></span> · 🟧 <span data-penalty="warm"></span> · 🟥 <span data-penalty="cool"></span> · 🟫 <span data-penalty="far"></span> · ⬜ <span data-penalty="distant"></span> · ⬛ <span data-penalty="farthest"></span>. Os fatos extras amarelos são grátis; ⏩ <span data-penalty="later-clue"></span>, 🏛️ <span data-penalty="century-hint"></span>, 🔢 <span data-penalty="digit-hint"></span> e 🧭 <span data-penalty="dir-hint"></span> custam pontos. Perdido = 0–10, conforme sua tentativa mais próxima.</li>
  <li>Níveis: <span data-help="tiers"></span></li>
  <li><strong>Jaardle diário</strong>: um quebra-cabeça por dia, igual para todos.</li>
  <li><strong>Jogo novo</strong>: rodadas infinitas, um acontecimento aleatório.</li>
  <li><strong>Teclas</strong>: algarismos + Enter para adivinhar, <kbd>−</kbd> para a.C., <kbd>R</kbd> para uma dica de direção, <kbd>D</kbd>/<kbd>N</kbd> para alternar.</li>`;

// Inline envelope-icoon (monochroom, neemt de linkkleur over) voor de Contact-link.
const MAIL_ICON = `<svg viewBox="0 0 512 512" aria-hidden="true" style="width:.95em;height:.95em;vertical-align:-.13em;margin-right:.35em;fill:currentColor"><path d="M48 64C21.5 64 0 85.5 0 112c0 15.1 7.1 29.3 19.2 38.4L236.8 313.6c11.4 8.5 27 8.5 38.4 0L492.8 150.4c12.1-9.1 19.2-23.3 19.2-38.4c0-26.5-21.5-48-48-48L48 64zM0 176L0 384c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-208L294.4 339.2c-22.8 17.1-54 17.1-76.8 0L0 176z"/></svg>`;

const I18N = {
  nl: {
    tab_daily: "Dagelijkse Jaardle", tab_free: "Nieuw spel",
    menu_stats: "📊 Statistieken", menu_login: "🔑 Inloggen", menu_logout: "Uitloggen", menu_loggedin: "Ingelogd",
    menu_login_short: "Inloggen",
    menu_theme: "☀️ Licht thema",
    aria_guesses: "Pogingen", aria_year_input: "Ingevoerd jaar", aria_keypad: "Numeriek toetsenbord",
    aria_bc: "Voor Christus aan/uit", aria_backspace: "Wis laatste cijfer", aria_close: "Sluiten",
    hint_nudge: (p) => `Tip: 🔢 verklapt het laatste cijfer (−${p} punten)`,
    guess: "Gok", share: "Deel resultaat", next: "Nieuw rondje",
    hint_text: "💡 Extra hint", hint_dir: "🧭 Richting", hint_century: "🏛️ Eeuw",
    hint_later: "⏩ 100 jaar later", hint_later_n: (y) => `⏩ ${y} jaar later`, hint_digit: "🔢 Laatste cijfer",
    century_band: "🏛️ Tijdvak", bc: "v.Chr.",
    reveal: "Onthul",
    main_label: "Dit jaar", extra_label: "Ook dit jaar",
    century_label: "Tijdvak",
    digit_label: "Laatste cijfer",
    score_label: "punten",
    diff_easy: "Moeilijkheid: makkelijk", diff_med: "Moeilijkheid: gemiddeld", diff_hard: "Moeilijkheid: pittig",
    later_label: (y) => `${y} jaar later`,
    later_future: (y) => `${y} jaar later is nog niet geweest — het antwoord ligt in de afgelopen ~${y} jaar.`,
    later_none: (y) => `Geen gebeurtenis van rond ${y} jaar later bekend.`,
    help_summary: "Hoe werkt het?", stats_title: "📊 Statistieken",
    login_title: "Inloggen", login_google: "Doorgaan met Google", login_or: "of met e-mail",
    login_email: "E-mail", login_password: "Wachtwoord", login_submit: "Inloggen", login_register: "Registreren",
    login_forgot: "Wachtwoord vergeten?",
    login_reset_email_needed: "Vul eerst je e-mailadres in.",
    login_reset_sent: `Als er een account bij dit e-mailadres hoort, is er een reset-link verstuurd. <strong>Geen mail? Check je spam-/ongewenstmap.</strong>`,
    newpw_title: "Nieuw wachtwoord instellen", newpw_label: "Nieuw wachtwoord", newpw_submit: "Wachtwoord opslaan",
    newpw_success: "Je wachtwoord is bijgewerkt. Je bent nu ingelogd.",
    auth_same_password: "Kies een ander wachtwoord dan je oude.",
    login_check_spam: `Account aangemaakt — klik op de link in je inbox om je e-mailadres te bevestigen. <strong>Geen mail? Check je spam-/ongewenstmap.</strong>`,
    auth_loading: "Supabase laadt nog, probeer het opnieuw.",
    auth_invalid: "E-mail of wachtwoord klopt niet.",
    auth_unconfirmed: "E-mailadres nog niet bevestigd — check je inbox (en spam).",
    auth_exists: "Dit e-mailadres heeft al een account — kies Inloggen.",
    auth_weak: "Wachtwoord te kort (minimaal 6 tekens).",
    auth_email_invalid: "Ongeldig e-mailadres.",
    auth_rate: "Te veel pogingen — probeer het later opnieuw.",
    auth_signup_disabled: "Registreren is uitgeschakeld.",
    auth_provider_disabled: "Deze inlogmethode staat niet aan.",
    auth_network: "Netwerkfout, controleer je verbinding.",
    auth_failed: "Inloggen mislukt.",
    login_note: `Inloggen verloopt via <a href="https://supabase.com/docs/guides/auth" target="_blank" rel="noopener">Supabase Auth</a> (Google). Wachtwoorden worden gehasht opgeslagen (bcrypt), nooit als platte tekst, en alleen jouw e-mail en spelscores worden bewaard — niet gedeeld met derden.`,
    footer_note: `Gebeurtenissen van <a href="https://en.wikipedia.org/wiki/Main_Page" target="_blank" rel="noopener">Wikipedia</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.nl" target="_blank" rel="noopener">CC BY-SA 4.0</a> · <a href="mailto:contact@jaardle.com">${MAIL_ICON}Contact</a>`,
    day: "Dag", loading: "Laden…",
    err_load: "Kon de gebeurtenis niet laden.", err_share: "Deze gedeelde puzzel bestaat niet meer.",
    err_none: "Geen puzzel beschikbaar.", retry: "Opnieuw proberen",
    won_intro: "Goed geraden! Het was", lost_intro: "Helaas — het juiste jaar was", source: "Bron:",
    stats_empty: "Nog geen dagelijkse puzzels afgerond.",
    stats_daily: "Dagelijks", stats_free: "Vrij spelen",
    stat_played: "Gespeeld", stat_winrate: "Win-rate", stat_curstreak: "Huidige streak",
    stat_beststreak: "Beste streak", stat_avgscore: "Gem. score", stat_won: "Gewonnen",
    stat_last10: "Gem. laatste 10", stat_perfect: "Keer 100", stat_avgtries: "Gem. pogingen",
    fav_century: "Sterkste eeuw",
    century_fmt: (n, bc) => `${n}e eeuw${bc ? " v.Chr." : ""}`,
    cal_title: "Laatste maanden", cal_notsolved: "niet opgelost",
    fact_prev: "Vorig feit", fact_next: "Volgend feit",
    free_tag: "(vrij)", lost_share: "💀 Niet gekraakt",
    next_daily: "⏳ Volgende daily over", daily_ready: "✨ De nieuwe daily staat klaar!",
    free_again: "🎲 Nog een potje?", free_revenge: "🎲 Pak je revanche",
    menu_leaderboard: "🏆 Leaderboard", lb_title: "🏆 Leaderboard",
    lb_daily: "Daily", lb_overall: "Aller tijden",
    lb_stat_rating: "Rating", lb_stat_streak: "Streak", lb_stat_dailywins: "Dagzeges", lb_stat_perfect: "Perfect-rate", lb_scope_all: "alle games",
    lb_scope_pool: "sinds deelname",
    lb_stat_prev: "Vorige stat", lb_stat_next: "Volgende stat",
    lb_empty_daily: "Nog niemand heeft de daily van vandaag gespeeld.",
    lb_empty_daily_past: "Niemand uit je pool heeft deze daily gespeeld.",
    lb_daily_prev: "Vorige dag", lb_daily_next: "Volgende dag",
    lb_empty_overall: "Nog geen ranglijst — speel een paar potjes.",
    lb_not_member: "Je staat (nog) niet op een vriendenbord.",
    lb_you: "jij", lb_games_short: (n) => `${n} ${n === 1 ? "potje" : "potjes"}`,
    lb_pool_none: "Je zit nog in geen enkele pool.",
    lb_create_label: "Nieuwe pool maken", lb_create_ph: "naam van je pool", lb_create_btn: "Maken",
    lb_join_label: "Pool joinen met code", lb_join_ph: "code", lb_join_btn: "Joinen",
    lb_invite: "📢 Nodig uit", lb_leave: "Verlaten", lb_leave_confirm: "Weet je zeker dat je deze pool wilt verlaten?",
    lb_invite_copied: "✓ Gekopieerd!", lb_owner_tag: "beheerder",
    lb_rename: "✏️ Hernoemen", lb_rename_prompt: "Nieuwe naam voor de pool:",
    lb_invite_text: (name) => `🏆 Doe mee met "${name}" op Jaardle — raad elke dag het jaar van een historische gebeurtenis:`,
    lb_yes: "Ja", lb_no: "Nee", lb_err_code: "Onbekende code", lb_err_name: "Naam moet 2–30 tekens zijn", lb_err_generic: "Er ging iets mis",
    lb_myname: "Jouw naam:", lb_name_edit: "✏️ Wijzig", lb_name_unset: "(niet ingesteld)",
    lb_name_prompt: "Kies je weergavenaam (2–20 tekens; letters, cijfers, spatie, _ of -):",
    lb_name_taken: "Die naam is al bezet — kies een andere.",
    lb_name_invalid_length: "Naam moet tussen 2 en 20 tekens lang zijn.",
    lb_name_invalid_chars: "Alleen letters, cijfers, spatie, _ en - zijn toegestaan.",
    lb_name_err: "Kon je naam niet opslaan. Probeer het opnieuw.",
    lb_flair_label: "Flair:", lb_flair_none: "Geen flair", lb_flair_err: "Kon je flair niet opslaan.",
    lb_members_n: (n) => `${n} ${n === 1 ? "lid" : "leden"}`,
    lb_hidden_inactive: (n) => `${n} ${n === 1 ? "speler" : "spelers"} verborgen · 7+ dagen niet gespeeld`,
    lb_join_q: (name) => `Pool "${name}" joinen?`,
    lb_pool_add: "➕ Pool erbij", lb_add_back: "‹ Terug",
    lb_err_pool_limit: "Je zit al in het maximale aantal pools (5).",
    recap_btn: "Verdeling & team",
    recap_title: "📊 Klaar voor vandaag", recap_dist_title: "🌍 Verdeling pogingen (iedereen)",
    recap_dist_empty: "Nog niemand heeft deze daily opgelost.",
    recap_faster: (pct) => `🎯 Beter dan ${pct}% van de spelers vandaag`,
    recap_firstguess: (avg, mine) => `📏 Eerste gok zat er gemiddeld ${avg} jaar naast${mine != null ? ` · jij: ${mine}` : ""}`,
    recap_team_title: "Teamstand vandaag", recap_today: "vandaag",
    recap_login: "Log in om je teamstand te zien.", recap_login_btn: "🔑 Inloggen",
    recap_pool_none: "Maak of join een pool om je vrienden hier te zien.", recap_pool_btn: "🏆 Pool maken of joinen",
    recap_acct_title: "Met een gratis account",
    recap_acct_1: "📊 Je statistieken & streak blijven bewaard",
    recap_acct_2: "☁️ Speel verder op al je apparaten",
    recap_acct_3: "🏆 Vergelijk je daily met vrienden in een pool",
    recap_acct_btn: "Inloggen of account maken",
    recap_acct_free: "Altijd 100% gratis — geen betaalde versie, geen advertenties.",
    streak_won: (n) => n === 1 ? "🔥 Streak gestart — kom morgen terug!" : `🔥 ${n} dagen op rij!`,
    streak_lost: (n) => `💔 Streak van ${n} ${n === 1 ? "dag" : "dagen"} gebroken — morgen nieuwe kans!`,
    streak_saved: (n) => `🔥 Streak gered — ${n} ${n === 1 ? "dag" : "dagen"} op rij!`,
    streak_makeup_lost: "💔 Helaas — de streak is niet gered.",
    makeup_tag: "inhaaldag",
    makeup_title: "🔥 Je miste gisteren!",
    makeup_body: (streak, dayNum) => `Speel puzzel #${dayNum} van gisteren alsnog en red je streak van ${streak} ${streak === 1 ? "dag" : "dagen"}.`,
    makeup_cta: "Speel gisteren",
    makeup_play_today: "▶️ Speel nu de daily van vandaag",
    tiers: { perfect: "Perfect", impressive: "Indrukwekkend", good: "Goed", solid: "Solide", justmade: "Net gehaald", lost: "Volgende keer beter" },
    dir_word: "richtingen",
    avg_word: "gem.",
    copy_prompt: "Kopieer dit:",
    cal_solved: (g, max) => `opgelost (${g}/${max})`,
    band_warn: (jaren) => `Volgens je dichtste gok ligt het antwoord dichterbij; deze gok ligt er ${jaren} jaar vandaan — buiten het bereik. Toch gokken?`,
    fact_stats: (s, hasScore) =>
      `🌍 ${s.games} ${s.games === 1 ? "speler" : "spelers"} · ${s.win_pct}% opgelost${hasScore ? ` · gem. score ${s.avg_score}/100` : ""} · gem. ${s.avg_guesses} pogingen · ${s.first_try_pct}% in één keer`,
    rating_line: "Jouw rating",
    stats_rating: "Rating-verloop",
    rating_peak: "Hoogste",
    rating_low: "Laagste",
    menu_rating: "⚡ Rating",
    rating_empty: "Nog te weinig historie — na twee dagen spelen verschijnt hier je rating-grafiek.",
    rating_anon: "Je rating is gekoppeld aan je account — log in om je verloop te zien.",
    menu_achv: "🏅 Prestaties",
    achv_sect_series: "Reeksen", achv_sect_trophies: "Trofeeën",
    achv_tiers: { bronze: "brons", silver: "zilver", gold: "goud", platinum: "platina", diamond: "diamant" },
    achv_next: (k, tier) => `nog ${k} tot ${tier}`,
    achv_maxed: "hoogste trede behaald",
    achv_games: "Veelspeler", achv_games_n: (n) => `${n} ${n === 1 ? "potje" : "potjes"}`,
    achv_dailies: "Dagelijkse gast", achv_dailies_n: (n) => `${n} dailies`,
    achv_streak: "Streak", achv_streak_n: (n) => `beste reeks ${n} ${n === 1 ? "dag" : "dagen"}`,
    achv_perfect: "Perfectionist", achv_perfect_n: (n) => `${n} perfecte scores`,
    achv_pure: "Puurspeler", achv_pure_n: (n) => `${n} wins zonder hint`,
    achv_rating: "Rating", achv_rating_n: (n) => `piek ${n}`,
    achv_years: "Iconische jaren", achv_years_n: (n, total) => `${n}/${total} verzameld`,
    achv_t_first: "Voltreffer", achv_t_first_sub: "raak in gok 1",
    achv_t_last: "Ontsnapping", achv_t_last_sub: "win op gok 6",
    achv_t_saver: "Reddingsactie", achv_t_saver_sub: "red een streak met de inhaal-daily",
    achv_t_eras: "Tijdreiziger", achv_t_eras_sub: "win in elk van de 6 tijdperken",
    achv_t_eras_n: (n) => `${n} van 6 tijdperken`,
    achv_flair_note: (e, tier) => `bij ${tier} verdien je de ${e}-flair voor op het leaderboard`,
    achv_flair_note_flat: (e) => `hiermee verdien je de ${e}-flair voor op het leaderboard`,
    achv_anon_note: "🔒 Niet opgeslagen — met een account blijven je prestaties bewaard.",
    achv_year_locked: "nog niet ontdekt",
    achv_unlocked: "Prestatie behaald", achv_stamp_new: "Nieuwe zegel",
    achv_back: "‹ Prestaties",
    achv_events: {
      "-509": "Romeinse Republiek gesticht", "-44": "Moord op Julius Caesar", "476": "Val van Rome",
      "622": "De hidjra", "800": "Kroning van Karel de Grote", "1066": "Slag bij Hastings",
      "1215": "Magna Carta", "1347": "De Zwarte Dood", "1440": "Drukpers van Gutenberg",
      "1453": "Val van Constantinopel",
      "1492": "Columbus bereikt Amerika", "1517": "Luthers 95 stellingen", "1588": "Spaanse Armada",
      "1648": "Vrede van Westfalen", "1687": "Newtons Principia", "1776": "Amerikaanse onafhankelijkheid",
      "1789": "Franse Revolutie", "1815": "Slag bij Waterloo", "1859": "Darwins evolutietheorie",
      "1889": "De Eiffeltoren geopend", "1912": "Ondergang van de Titanic", "1929": "Beurskrach",
      "1945": "Einde Tweede Wereldoorlog", "1957": "Spoetnik", "1969": "De maanlanding",
      "1989": "Val van de Muur",
    },
    // SEO/meta — door tools/build-html.mjs in de <head> + het introblok gezet.
    meta_title: "Jaardle — raad het jaar",
    meta_share_title: "Jaardle — raad het jaar van historische gebeurtenissen",
    meta_desc: "Jaardle (jaar + Wordle) is een gratis dagelijks jaartal-raadspel in de stijl van Wordle: raad in zes pogingen het jaar van een historische gebeurtenis. Dagelijkse puzzel of vrij spel.",
    intro_h1: "Jaardle — het dagelijkse jaartal-raadspel",
    intro_html: `Jaardle is een gratis puzzelspel in Wordle-stijl: je krijgt een historische gebeurtenis en raadt in een paar pogingen in welk jaar die plaatsvond. Speel elke dag dezelfde <strong>dagelijkse puzzel</strong> als iedereen, of oneindig <strong>vrij spel</strong>, vergelijk je score met vrienden en bouw je streak op.`,
    help_list: HELP_NL,
  },
  en: {
    tab_daily: "Daily Jaardle", tab_free: "New game",
    menu_stats: "📊 Statistics", menu_login: "🔑 Sign in", menu_logout: "Sign out", menu_loggedin: "Signed in",
    menu_login_short: "Sign in",
    menu_theme: "☀️ Light theme",
    aria_guesses: "Guesses", aria_year_input: "Entered year", aria_keypad: "Numeric keypad",
    aria_bc: "BC toggle", aria_backspace: "Delete last digit", aria_close: "Close",
    hint_nudge: (p) => `Tip: 🔢 reveals the last digit (−${p} points)`,
    guess: "Guess", share: "Share result", next: "New round",
    hint_text: "💡 Extra hint", hint_dir: "🧭 Direction", hint_century: "🏛️ Century",
    hint_later: "⏩ 100 years later", hint_later_n: (y) => `⏩ ${y} years later`, hint_digit: "🔢 Last digit",
    century_band: "🏛️ Era", bc: "BC",
    reveal: "Reveal",
    main_label: "This year", extra_label: "Also this year",
    century_label: "Era",
    digit_label: "Last digit",
    score_label: "points",
    diff_easy: "Difficulty: easy", diff_med: "Difficulty: medium", diff_hard: "Difficulty: tough",
    later_label: (y) => `${y} years later`,
    later_future: (y) => `${y} years later hasn't happened yet — so the answer is within the last ~${y} years.`,
    later_none: (y) => `No event from around ${y} years later is known.`,
    help_summary: "How to play?", stats_title: "📊 Statistics",
    login_title: "Sign in", login_google: "Continue with Google", login_or: "or with email",
    login_email: "Email", login_password: "Password", login_submit: "Sign in", login_register: "Register",
    login_forgot: "Forgot password?",
    login_reset_email_needed: "Enter your email address first.",
    login_reset_sent: `If an account exists for this email, a reset link has been sent. <strong>No email? Check your spam/junk folder.</strong>`,
    newpw_title: "Set a new password", newpw_label: "New password", newpw_submit: "Save password",
    newpw_success: "Your password has been updated. You're now signed in.",
    auth_same_password: "Choose a different password from your old one.",
    login_check_spam: `Account created — click the link in your inbox to confirm your email. <strong>No email? Check your spam/junk folder.</strong>`,
    auth_loading: "Supabase is still loading, please try again.",
    auth_invalid: "Email or password is incorrect.",
    auth_unconfirmed: "Email not confirmed yet — check your inbox (and spam).",
    auth_exists: "This email already has an account — choose Sign in.",
    auth_weak: "Password too short (at least 6 characters).",
    auth_email_invalid: "Invalid email address.",
    auth_rate: "Too many attempts — please try again later.",
    auth_signup_disabled: "Registration is disabled.",
    auth_provider_disabled: "This sign-in method is not enabled.",
    auth_network: "Network error, check your connection.",
    auth_failed: "Sign-in failed.",
    login_note: `Sign-in is handled by <a href="https://supabase.com/docs/guides/auth" target="_blank" rel="noopener">Supabase Auth</a> (Google). Passwords are stored hashed (bcrypt), never as plain text, and only your email and game scores are kept — not shared with third parties.`,
    footer_note: `Events from <a href="https://en.wikipedia.org/wiki/Main_Page" target="_blank" rel="noopener">Wikipedia</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.en" target="_blank" rel="noopener">CC BY-SA 4.0</a> · <a href="mailto:contact@jaardle.com">${MAIL_ICON}Contact</a>`,
    day: "Day", loading: "Loading…",
    err_load: "Couldn't load the event.", err_share: "This shared puzzle no longer exists.",
    err_none: "No puzzle available.", retry: "Try again",
    won_intro: "Well guessed! It was", lost_intro: "Too bad — the year was", source: "Source:",
    stats_empty: "No daily puzzles finished yet.",
    stats_daily: "Daily", stats_free: "Free play",
    stat_played: "Played", stat_winrate: "Win rate", stat_curstreak: "Current streak",
    stat_beststreak: "Best streak", stat_avgscore: "Avg. score", stat_won: "Won",
    stat_last10: "Avg. last 10", stat_perfect: "Perfect 100s", stat_avgtries: "Avg. tries",
    fav_century: "Strongest century",
    century_fmt: (n, bc) => {
      const s = (n % 10 === 1 && n % 100 !== 11) ? "st"
              : (n % 10 === 2 && n % 100 !== 12) ? "nd"
              : (n % 10 === 3 && n % 100 !== 13) ? "rd" : "th";
      return `${n}${s} century${bc ? " BC" : ""}`;
    },
    cal_title: "Last few months", cal_notsolved: "not solved",
    fact_prev: "Previous fact", fact_next: "Next fact",
    free_tag: "(free)", lost_share: "💀 Not cracked",
    next_daily: "⏳ Next daily in", daily_ready: "✨ The new daily is ready!",
    free_again: "🎲 One more round?", free_revenge: "🎲 Take your revenge",
    menu_leaderboard: "🏆 Leaderboard", lb_title: "🏆 Leaderboard",
    lb_daily: "Daily", lb_overall: "All-time",
    lb_stat_rating: "Rating", lb_stat_streak: "Streak", lb_stat_dailywins: "Daily wins", lb_stat_perfect: "Perfect rate", lb_scope_all: "all games",
    lb_scope_pool: "since joining",
    lb_stat_prev: "Previous stat", lb_stat_next: "Next stat",
    lb_empty_daily: "Nobody has played today's daily yet.",
    lb_empty_daily_past: "Nobody in your pool played this daily.",
    lb_daily_prev: "Previous day", lb_daily_next: "Next day",
    lb_empty_overall: "No ranking yet — play a few rounds.",
    lb_not_member: "You're not on a friends board (yet).",
    lb_you: "you", lb_games_short: (n) => `${n} ${n === 1 ? "game" : "games"}`,
    lb_pool_none: "You're not in a pool yet.",
    lb_create_label: "Create a new pool", lb_create_ph: "your pool's name", lb_create_btn: "Create",
    lb_join_label: "Join a pool by code", lb_join_ph: "code", lb_join_btn: "Join",
    lb_invite: "📢 Invite", lb_leave: "Leave", lb_leave_confirm: "Are you sure you want to leave this pool?",
    lb_invite_copied: "✓ Copied!", lb_owner_tag: "owner",
    lb_rename: "✏️ Rename", lb_rename_prompt: "New name for the pool:",
    lb_invite_text: (name) => `🏆 Join "${name}" on Jaardle — guess the year of a historic event every day:`,
    lb_yes: "Yes", lb_no: "No", lb_err_code: "Unknown code", lb_err_name: "Name must be 2–30 characters", lb_err_generic: "Something went wrong",
    lb_myname: "Your name:", lb_name_edit: "✏️ Edit", lb_name_unset: "(not set)",
    lb_name_prompt: "Choose your display name (2–20 chars; letters, digits, space, _ or -):",
    lb_name_taken: "That name is taken — pick another.",
    lb_name_invalid_length: "Name must be between 2 and 20 characters.",
    lb_name_invalid_chars: "Only letters, digits, space, _ and - are allowed.",
    lb_name_err: "Couldn't save your name. Please try again.",
    lb_flair_label: "Flair:", lb_flair_none: "No flair", lb_flair_err: "Couldn't save your flair.",
    lb_members_n: (n) => `${n} ${n === 1 ? "member" : "members"}`,
    lb_hidden_inactive: (n) => `${n} ${n === 1 ? "player" : "players"} hidden · no play in 7+ days`,
    lb_join_q: (name) => `Join pool "${name}"?`,
    lb_pool_add: "➕ Add pool", lb_add_back: "‹ Back",
    lb_err_pool_limit: "You're already in the maximum number of pools (5).",
    recap_btn: "Distribution & team",
    recap_title: "📊 Done for today", recap_dist_title: "🌍 Guess distribution (everyone)",
    recap_dist_empty: "Nobody has solved this daily yet.",
    recap_faster: (pct) => `🎯 Better than ${pct}% of players today`,
    recap_firstguess: (avg, mine, avgN) => `📏 First guess was ${avg} year${avgN === 1 ? "" : "s"} off on average${mine != null ? ` · you: ${mine}` : ""}`,
    recap_team_title: "Today's team standings", recap_today: "today",
    recap_login: "Sign in to see your team standings.", recap_login_btn: "🔑 Sign in",
    recap_pool_none: "Create or join a pool to see your friends here.", recap_pool_btn: "🏆 Create or join a pool",
    recap_acct_title: "With a free account",
    recap_acct_1: "📊 Your stats & streak are saved",
    recap_acct_2: "☁️ Keep playing across all your devices",
    recap_acct_3: "🏆 Compare your daily with friends in a pool",
    recap_acct_btn: "Sign in or create account",
    recap_acct_free: "Always 100% free — no paid tier, no ads.",
    streak_won: (n) => n === 1 ? "🔥 Streak started — come back tomorrow!" : `🔥 ${n} days in a row!`,
    streak_lost: (n) => `💔 ${n}-day streak broken — new chance tomorrow!`,
    streak_saved: (n) => `🔥 Streak saved — ${n} ${n === 1 ? "day" : "days"} in a row!`,
    streak_makeup_lost: "💔 Sorry — the streak wasn't saved.",
    makeup_tag: "catch-up",
    makeup_title: "🔥 You missed yesterday!",
    makeup_body: (streak, dayNum) => `Play yesterday's puzzle #${dayNum} after all and save your ${streak}-day streak.`,
    makeup_cta: "Play yesterday",
    makeup_play_today: "▶️ Play today's daily now",
    tiers: { perfect: "Perfect", impressive: "Impressive", good: "Good", solid: "Solid", justmade: "Just made it", lost: "Better luck next time" },
    dir_word: "directions",
    avg_word: "avg.",
    copy_prompt: "Copy this:",
    cal_solved: (g, max) => `solved (${g}/${max})`,
    band_warn: (years) => `Your closest guess puts the answer nearer; this guess is ${years} years away — outside that range. Guess anyway?`,
    fact_stats: (s, hasScore) =>
      `🌍 ${s.games} ${s.games === 1 ? "player" : "players"} · ${s.win_pct}% solved${hasScore ? ` · avg. score ${s.avg_score}/100` : ""} · avg. ${s.avg_guesses} guesses · ${s.first_try_pct}% first try`,
    rating_line: "Your rating",
    stats_rating: "Rating progression",
    rating_peak: "Highest",
    rating_low: "Lowest",
    menu_rating: "⚡ Rating",
    rating_empty: "Not enough history yet — your rating graph appears after two days of play.",
    rating_anon: "Your rating is tied to your account — sign in to see your progression.",
    menu_achv: "🏅 Achievements",
    achv_sect_series: "Series", achv_sect_trophies: "Trophies",
    achv_tiers: { bronze: "bronze", silver: "silver", gold: "gold", platinum: "platinum", diamond: "diamond" },
    achv_next: (k, tier) => `${k} to go until ${tier}`,
    achv_maxed: "highest tier reached",
    achv_games: "Frequent player", achv_games_n: (n) => `${n} ${n === 1 ? "game" : "games"}`,
    achv_dailies: "Daily regular", achv_dailies_n: (n) => `${n} dailies`,
    achv_streak: "Streak", achv_streak_n: (n) => `best run ${n} ${n === 1 ? "day" : "days"}`,
    achv_perfect: "Perfectionist", achv_perfect_n: (n) => `${n} perfect scores`,
    achv_pure: "Purist", achv_pure_n: (n) => `${n} wins without hints`,
    achv_rating: "Rating", achv_rating_n: (n) => `peak ${n}`,
    achv_years: "Iconic years", achv_years_n: (n, total) => `${n}/${total} collected`,
    achv_t_first: "Bullseye", achv_t_first_sub: "correct on guess 1",
    achv_t_last: "Great escape", achv_t_last_sub: "win on guess 6",
    achv_t_saver: "Rescue mission", achv_t_saver_sub: "save a streak with the make-up daily",
    achv_t_eras: "Time traveller", achv_t_eras_sub: "win in each of the 6 eras",
    achv_t_eras_n: (n) => `${n} of 6 eras`,
    achv_flair_note: (e, tier) => `reach ${tier} to earn the ${e} flair for the leaderboard`,
    achv_flair_note_flat: (e) => `earns you the ${e} flair for the leaderboard`,
    achv_anon_note: "🔒 Not saved — with an account your achievements are kept.",
    achv_year_locked: "not discovered yet",
    achv_unlocked: "Achievement unlocked", achv_stamp_new: "New stamp",
    achv_back: "‹ Achievements",
    achv_events: {
      "-509": "Roman Republic founded", "-44": "Assassination of Julius Caesar", "476": "Fall of Rome",
      "622": "The Hijra", "800": "Coronation of Charlemagne", "1066": "Battle of Hastings",
      "1215": "Magna Carta", "1347": "The Black Death", "1440": "Gutenberg's printing press",
      "1453": "Fall of Constantinople",
      "1492": "Columbus reaches the Americas", "1517": "Luther's 95 Theses", "1588": "Spanish Armada",
      "1648": "Peace of Westphalia", "1687": "Newton's Principia", "1776": "American independence",
      "1789": "French Revolution", "1815": "Battle of Waterloo", "1859": "Darwin's theory of evolution",
      "1889": "Eiffel Tower opens", "1912": "Sinking of the Titanic", "1929": "Wall Street Crash",
      "1945": "End of World War II", "1957": "Sputnik", "1969": "The Moon landing",
      "1989": "Fall of the Berlin Wall",
    },
    // SEO/meta — used by tools/build-html.mjs for the <head> + intro block.
    meta_title: "Jaardle — guess the year",
    meta_share_title: "Jaardle — guess the year of historic events",
    meta_desc: "Jaardle is a free daily year-guessing game — a Yeardle for history, in the style of Wordle: guess the year of a historic event in six tries. Daily puzzle or endless free play.",
    intro_h1: "Jaardle — the daily year-guessing game",
    intro_html: `Jaardle is a free Wordle-style puzzle game: you get a historic event and guess the year it happened in a few tries. Play the same <strong>daily puzzle</strong> as everyone else, or endless <strong>free play</strong>, compare your score with friends and build your streak.`,
    help_list: HELP_EN,
  },
  de: {
    tab_daily: "Tägliches Jaardle", tab_free: "Neues Spiel",
    menu_stats: "📊 Statistiken", menu_login: "🔑 Anmelden", menu_logout: "Abmelden", menu_loggedin: "Angemeldet",
    menu_login_short: "Anmelden",
    menu_theme: "☀️ Helles Design",
    aria_guesses: "Versuche", aria_year_input: "Eingegebenes Jahr", aria_keypad: "Ziffernblock",
    aria_bc: "Vor Christus umschalten", aria_backspace: "Letzte Ziffer löschen", aria_close: "Schließen",
    hint_nudge: (p) => `Tipp: 🔢 verrät die letzte Ziffer (−${p} Punkte)`,
    guess: "Raten", share: "Ergebnis teilen", next: "Neue Runde",
    hint_text: "💡 Extra-Hinweis", hint_dir: "🧭 Richtung", hint_century: "🏛️ Jahrhundert",
    hint_later: "⏩ 100 Jahre später", hint_later_n: (y) => `⏩ ${y} Jahre später`, hint_digit: "🔢 Letzte Ziffer",
    century_band: "🏛️ Epoche", bc: "v. Chr.",
    reveal: "Aufdecken",
    main_label: "Dieses Jahr", extra_label: "Auch dieses Jahr",
    century_label: "Epoche",
    digit_label: "Letzte Ziffer",
    score_label: "Punkte",
    diff_easy: "Schwierigkeit: leicht", diff_med: "Schwierigkeit: mittel", diff_hard: "Schwierigkeit: knifflig",
    later_label: (y) => `${y} Jahre später`,
    later_future: (y) => `${y} Jahre später ist noch nicht gewesen — die Antwort liegt also in den letzten ~${y} Jahren.`,
    later_none: (y) => `Kein Ereignis von rund ${y} Jahren später bekannt.`,
    help_summary: "Wie funktioniert es?", stats_title: "📊 Statistiken",
    login_title: "Anmelden", login_google: "Mit Google fortfahren", login_or: "oder mit E-Mail",
    login_email: "E-Mail", login_password: "Passwort", login_submit: "Anmelden", login_register: "Registrieren",
    login_forgot: "Passwort vergessen?",
    login_reset_email_needed: "Gib zuerst deine E-Mail-Adresse ein.",
    login_reset_sent: `Falls ein Konto zu dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet. <strong>Keine E-Mail? Sieh im Spam-/Junk-Ordner nach.</strong>`,
    newpw_title: "Neues Passwort festlegen", newpw_label: "Neues Passwort", newpw_submit: "Passwort speichern",
    newpw_success: "Dein Passwort wurde aktualisiert. Du bist jetzt angemeldet.",
    auth_same_password: "Wähle ein anderes Passwort als dein altes.",
    login_check_spam: `Konto erstellt — klicke auf den Link in deinem Posteingang, um deine E-Mail-Adresse zu bestätigen. <strong>Keine E-Mail? Sieh im Spam-/Junk-Ordner nach.</strong>`,
    auth_loading: "Supabase lädt noch, bitte versuche es erneut.",
    auth_invalid: "E-Mail oder Passwort ist falsch.",
    auth_unconfirmed: "E-Mail-Adresse noch nicht bestätigt — sieh in deinem Posteingang (und Spam) nach.",
    auth_exists: "Diese E-Mail hat bereits ein Konto — wähle Anmelden.",
    auth_weak: "Passwort zu kurz (mindestens 6 Zeichen).",
    auth_email_invalid: "Ungültige E-Mail-Adresse.",
    auth_rate: "Zu viele Versuche — bitte später erneut versuchen.",
    auth_signup_disabled: "Registrierung ist deaktiviert.",
    auth_provider_disabled: "Diese Anmeldemethode ist nicht aktiviert.",
    auth_network: "Netzwerkfehler, prüfe deine Verbindung.",
    auth_failed: "Anmeldung fehlgeschlagen.",
    login_note: `Die Anmeldung läuft über <a href="https://supabase.com/docs/guides/auth" target="_blank" rel="noopener">Supabase Auth</a> (Google). Passwörter werden gehasht gespeichert (bcrypt), nie als Klartext, und nur deine E-Mail und Spielergebnisse werden gespeichert — nicht an Dritte weitergegeben.`,
    footer_note: `Ereignisse von <a href="https://en.wikipedia.org/wiki/Main_Page" target="_blank" rel="noopener">Wikipedia</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.de" target="_blank" rel="noopener">CC BY-SA 4.0</a> · <a href="mailto:contact@jaardle.com">${MAIL_ICON}Kontakt</a>`,
    day: "Tag", loading: "Lädt…",
    err_load: "Ereignis konnte nicht geladen werden.", err_share: "Dieses geteilte Rätsel existiert nicht mehr.",
    err_none: "Kein Rätsel verfügbar.", retry: "Erneut versuchen",
    won_intro: "Gut geraten! Es war", lost_intro: "Schade — das richtige Jahr war", source: "Quelle:",
    stats_empty: "Noch keine täglichen Rätsel abgeschlossen.",
    stats_daily: "Täglich", stats_free: "Freies Spiel",
    stat_played: "Gespielt", stat_winrate: "Gewinnrate", stat_curstreak: "Aktuelle Serie",
    stat_beststreak: "Beste Serie", stat_avgscore: "Ø Punkte", stat_won: "Gewonnen",
    stat_last10: "Ø letzte 10", stat_perfect: "100er", stat_avgtries: "Ø Versuche",
    fav_century: "Stärkstes Jahrhundert",
    century_fmt: (n, bc) => `${n}. Jahrhundert${bc ? " v. Chr." : ""}`,
    cal_title: "Letzte Monate", cal_notsolved: "nicht gelöst",
    fact_prev: "Vorheriger Fakt", fact_next: "Nächster Fakt",
    free_tag: "(frei)", lost_share: "💀 Nicht geknackt",
    next_daily: "⏳ Nächstes Daily in", daily_ready: "✨ Das neue Daily ist da!",
    free_again: "🎲 Noch eine Runde?", free_revenge: "🎲 Hol dir die Revanche",
    menu_leaderboard: "🏆 Bestenliste", lb_title: "🏆 Bestenliste",
    lb_daily: "Daily", lb_overall: "Allzeit",
    lb_stat_rating: "Rating", lb_stat_streak: "Serie", lb_stat_dailywins: "Tagessiege", lb_stat_perfect: "100er-Quote", lb_scope_all: "alle Spiele",
    lb_scope_pool: "seit Beitritt",
    lb_stat_prev: "Vorherige Statistik", lb_stat_next: "Nächste Statistik",
    lb_empty_daily: "Noch niemand hat das heutige Daily gespielt.",
    lb_empty_daily_past: "Niemand aus deinem Pool hat dieses Daily gespielt.",
    lb_daily_prev: "Vorheriger Tag", lb_daily_next: "Nächster Tag",
    lb_empty_overall: "Noch keine Rangliste — spiel ein paar Runden.",
    lb_not_member: "Du bist (noch) auf keiner Freundes-Bestenliste.",
    lb_you: "du", lb_games_short: (n) => `${n} ${n === 1 ? "Spiel" : "Spiele"}`,
    lb_pool_none: "Du bist noch in keinem Pool.",
    lb_create_label: "Neuen Pool erstellen", lb_create_ph: "Name deines Pools", lb_create_btn: "Erstellen",
    lb_join_label: "Pool per Code beitreten", lb_join_ph: "Code", lb_join_btn: "Beitreten",
    lb_invite: "📢 Einladen", lb_leave: "Verlassen", lb_leave_confirm: "Willst du diesen Pool wirklich verlassen?",
    lb_invite_copied: "✓ Kopiert!", lb_owner_tag: "Verwalter",
    lb_rename: "✏️ Umbenennen", lb_rename_prompt: "Neuer Name für den Pool:",
    lb_invite_text: (name) => `🏆 Mach mit bei "${name}" auf Jaardle — errate jeden Tag das Jahr eines historischen Ereignisses:`,
    lb_yes: "Ja", lb_no: "Nein", lb_err_code: "Unbekannter Code", lb_err_name: "Name muss 2–30 Zeichen lang sein", lb_err_generic: "Etwas ist schiefgelaufen",
    lb_myname: "Dein Name:", lb_name_edit: "✏️ Ändern", lb_name_unset: "(nicht festgelegt)",
    lb_name_prompt: "Wähle deinen Anzeigenamen (2–20 Zeichen; Buchstaben, Ziffern, Leerzeichen, _ oder -):",
    lb_name_taken: "Dieser Name ist vergeben — wähle einen anderen.",
    lb_name_invalid_length: "Name muss zwischen 2 und 20 Zeichen lang sein.",
    lb_name_invalid_chars: "Nur Buchstaben, Ziffern, Leerzeichen, _ und - sind erlaubt.",
    lb_name_err: "Name konnte nicht gespeichert werden. Bitte versuche es erneut.",
    lb_flair_label: "Flair:", lb_flair_none: "Kein Flair", lb_flair_err: "Flair konnte nicht gespeichert werden.",
    lb_members_n: (n) => `${n} ${n === 1 ? "Mitglied" : "Mitglieder"}`,
    lb_hidden_inactive: (n) => `${n} ${n === 1 ? "Spieler" : "Spieler"} ausgeblendet · 7+ Tage inaktiv`,
    lb_join_q: (name) => `Pool "${name}" beitreten?`,
    lb_pool_add: "➕ Pool dazu", lb_add_back: "‹ Zurück",
    lb_err_pool_limit: "Du bist schon in der maximalen Anzahl an Pools (5).",
    recap_btn: "Verteilung & Team",
    recap_title: "📊 Fertig für heute", recap_dist_title: "🌍 Verteilung der Versuche (alle)",
    recap_dist_empty: "Noch niemand hat dieses Daily gelöst.",
    recap_faster: (pct) => `🎯 Besser als ${pct}% der Spieler heute`,
    recap_firstguess: (avg, mine, avgN) => `📏 Erster Tipp im Schnitt ${avg} Jahr${avgN === 1 ? "" : "e"} daneben${mine != null ? ` · du: ${mine}` : ""}`,
    recap_team_title: "Team-Stand heute", recap_today: "heute",
    recap_login: "Melde dich an, um deinen Team-Stand zu sehen.", recap_login_btn: "🔑 Anmelden",
    recap_pool_none: "Erstelle einen Pool oder tritt einem bei, um deine Freunde hier zu sehen.", recap_pool_btn: "🏆 Pool erstellen oder beitreten",
    recap_acct_title: "Mit einem kostenlosen Konto",
    recap_acct_1: "📊 Deine Statistiken & Serie bleiben erhalten",
    recap_acct_2: "☁️ Spiele auf all deinen Geräten weiter",
    recap_acct_3: "🏆 Vergleiche dein Daily mit Freunden in einem Pool",
    recap_acct_btn: "Anmelden oder Konto erstellen",
    recap_acct_free: "Immer 100% kostenlos — keine Bezahlversion, keine Werbung.",
    streak_won: (n) => n === 1 ? "🔥 Serie gestartet — komm morgen wieder!" : `🔥 ${n} Tage in Folge!`,
    streak_lost: (n) => `💔 Serie von ${n} ${n === 1 ? "Tag" : "Tagen"} gerissen — morgen neue Chance!`,
    streak_saved: (n) => `🔥 Serie gerettet — ${n} ${n === 1 ? "Tag" : "Tage"} in Folge!`,
    streak_makeup_lost: "💔 Schade — die Serie wurde nicht gerettet.",
    makeup_tag: "Nachhol-Tag",
    makeup_title: "🔥 Du hast gestern verpasst!",
    makeup_body: (streak, dayNum) => `Spiel das gestrige Rätsel #${dayNum} doch noch und rette deine Serie von ${streak} ${streak === 1 ? "Tag" : "Tagen"}.`,
    makeup_cta: "Gestern spielen",
    makeup_play_today: "▶️ Jetzt das heutige Rätsel spielen",
    tiers: { perfect: "Perfekt", impressive: "Beeindruckend", good: "Gut", solid: "Solide", justmade: "Gerade so", lost: "Nächstes Mal besser" },
    dir_word: "Richtungen",
    avg_word: "Ø",
    copy_prompt: "Kopiere das:",
    cal_solved: (g, max) => `gelöst (${g}/${max})`,
    band_warn: (jahre) => `Laut deinem besten Tipp liegt die Antwort näher; dieser Tipp liegt ${jahre} Jahre entfernt — außerhalb der Spanne. Trotzdem raten?`,
    fact_stats: (s, hasScore) =>
      `🌍 ${s.games} Spieler · ${s.win_pct}% gelöst${hasScore ? ` · Ø Punkte ${s.avg_score}/100` : ""} · Ø ${s.avg_guesses} Versuche · ${s.first_try_pct}% beim ersten Versuch`,
    rating_line: "Dein Rating",
    stats_rating: "Ratingverlauf",
    rating_peak: "Höchstwert",
    rating_low: "Tiefstwert",
    menu_rating: "⚡ Rating",
    rating_empty: "Noch zu wenig Verlauf — nach zwei Spieltagen erscheint hier dein Rating-Diagramm.",
    rating_anon: "Dein Rating ist mit deinem Konto verknüpft — melde dich an, um deinen Verlauf zu sehen.",
    menu_achv: "🏅 Erfolge",
    achv_sect_series: "Serien", achv_sect_trophies: "Trophäen",
    achv_tiers: { bronze: "Bronze", silver: "Silber", gold: "Gold", platinum: "Platin", diamond: "Diamant" },
    achv_next: (k, tier) => `noch ${k} bis ${tier}`,
    achv_maxed: "höchste Stufe erreicht",
    achv_games: "Vielspieler", achv_games_n: (n) => `${n} ${n === 1 ? "Partie" : "Partien"}`,
    achv_dailies: "Stammgast", achv_dailies_n: (n) => `${n} tägliche Rätsel`,
    achv_streak: "Serie", achv_streak_n: (n) => `beste Serie ${n} ${n === 1 ? "Tag" : "Tage"}`,
    achv_perfect: "Perfektionist", achv_perfect_n: (n) => `${n} perfekte Ergebnisse`,
    achv_pure: "Purist", achv_pure_n: (n) => `${n} Siege ohne Hinweis`,
    achv_rating: "Rating", achv_rating_n: (n) => `Bestwert ${n}`,
    achv_years: "Ikonische Jahre", achv_years_n: (n, total) => `${n}/${total} gesammelt`,
    achv_t_first: "Volltreffer", achv_t_first_sub: "richtig beim 1. Versuch",
    achv_t_last: "Entkommen", achv_t_last_sub: "Sieg beim 6. Versuch",
    achv_t_saver: "Rettungsaktion", achv_t_saver_sub: "rette eine Serie mit dem Nachhol-Rätsel",
    achv_t_eras: "Zeitreisender", achv_t_eras_sub: "gewinne in allen 6 Epochen",
    achv_t_eras_n: (n) => `${n} von 6 Epochen`,
    achv_flair_note: (e, tier) => `ab ${tier} verdienst du das ${e}-Flair für die Bestenliste`,
    achv_flair_note_flat: (e) => `damit verdienst du das ${e}-Flair für die Bestenliste`,
    achv_anon_note: "🔒 Nicht gespeichert — mit einem Konto bleiben deine Erfolge erhalten.",
    achv_year_locked: "noch nicht entdeckt",
    achv_unlocked: "Erfolg freigeschaltet", achv_stamp_new: "Neue Briefmarke",
    achv_back: "‹ Erfolge",
    achv_events: {
      "-509": "Gründung der Römischen Republik", "-44": "Ermordung Julius Caesars", "476": "Untergang Roms",
      "622": "Die Hidschra", "800": "Krönung Karls des Großen", "1066": "Schlacht bei Hastings",
      "1215": "Magna Carta", "1347": "Der Schwarze Tod", "1440": "Gutenbergs Druckerpresse",
      "1453": "Eroberung Konstantinopels",
      "1492": "Kolumbus erreicht Amerika", "1517": "Luthers 95 Thesen", "1588": "Spanische Armada",
      "1648": "Westfälischer Friede", "1687": "Newtons Principia", "1776": "Amerikanische Unabhängigkeit",
      "1789": "Französische Revolution", "1815": "Schlacht bei Waterloo", "1859": "Darwins Evolutionstheorie",
      "1889": "Eröffnung des Eiffelturms", "1912": "Untergang der Titanic", "1929": "Börsenkrach",
      "1945": "Ende des Zweiten Weltkriegs", "1957": "Sputnik", "1969": "Die Mondlandung",
      "1989": "Fall der Mauer",
    },
    meta_title: "Jaardle — errate das Jahr",
    meta_share_title: "Jaardle — errate das Jahr historischer Ereignisse",
    meta_desc: "Jaardle ist ein kostenloses tägliches Jahreszahlen-Ratespiel — das Jahrdle der Geschichte, im Stil von Wordle: errate in sechs Versuchen das Jahr eines historischen Ereignisses. Tägliches Rätsel oder endloses freies Spiel.",
    intro_h1: "Jaardle — das tägliche Jahreszahlen-Ratespiel",
    intro_html: `Jaardle ist ein kostenloses Rätselspiel im Wordle-Stil: Du bekommst ein historisches Ereignis und errätst in wenigen Versuchen, in welchem Jahr es stattfand. Spiele jeden Tag dasselbe <strong>tägliche Rätsel</strong> wie alle anderen oder endloses <strong>freies Spiel</strong>, vergleiche deinen Punktestand mit Freunden und baue deine Serie auf.`,
    help_list: HELP_DE,
  },
  es: {
    tab_daily: "Jaardle diario", tab_free: "Partida nueva",
    menu_stats: "📊 Estadísticas", menu_login: "🔑 Iniciar sesión", menu_logout: "Cerrar sesión", menu_loggedin: "Sesión iniciada",
    menu_login_short: "Entrar",
    menu_theme: "☀️ Tema claro",
    aria_guesses: "Intentos", aria_year_input: "Año introducido", aria_keypad: "Teclado numérico",
    aria_bc: "Antes de Cristo sí/no", aria_backspace: "Borrar último dígito", aria_close: "Cerrar",
    hint_nudge: (p) => `Consejo: 🔢 revela el último dígito (−${p} puntos)`,
    guess: "Adivinar", share: "Compartir resultado", next: "Nueva ronda",
    hint_text: "💡 Pista extra", hint_dir: "🧭 Dirección", hint_century: "🏛️ Siglo",
    hint_later: "⏩ 100 años después", hint_later_n: (y) => `⏩ ${y} años después`, hint_digit: "🔢 Última cifra",
    century_band: "🏛️ Época", bc: "a. C.",
    reveal: "Revelar",
    main_label: "Este año", extra_label: "También este año",
    century_label: "Época",
    digit_label: "Última cifra",
    score_label: "Puntos",
    diff_easy: "Dificultad: fácil", diff_med: "Dificultad: media", diff_hard: "Dificultad: difícil",
    later_label: (y) => `${y} años después`,
    later_future: (y) => `${y} años después aún no ha ocurrido — así que la respuesta está en los últimos ~${y} años.`,
    later_none: (y) => `No se conoce ningún acontecimiento de unos ${y} años después.`,
    help_summary: "¿Cómo se juega?", stats_title: "📊 Estadísticas",
    login_title: "Iniciar sesión", login_google: "Continuar con Google", login_or: "o con correo electrónico",
    login_email: "Correo electrónico", login_password: "Contraseña", login_submit: "Iniciar sesión", login_register: "Registrarse",
    login_forgot: "¿Olvidaste tu contraseña?",
    login_reset_email_needed: "Introduce primero tu correo electrónico.",
    login_reset_sent: `Si existe una cuenta con este correo, se ha enviado un enlace para restablecerla. <strong>¿No ves el correo? Revisa tu carpeta de spam/correo no deseado.</strong>`,
    newpw_title: "Establecer una nueva contraseña", newpw_label: "Nueva contraseña", newpw_submit: "Guardar contraseña",
    newpw_success: "Tu contraseña se ha actualizado. Ya has iniciado sesión.",
    auth_same_password: "Elige una contraseña distinta de la anterior.",
    login_check_spam: `Cuenta creada — haz clic en el enlace de tu bandeja de entrada para confirmar tu correo. <strong>¿No ves el correo? Revisa tu carpeta de spam/correo no deseado.</strong>`,
    auth_loading: "Supabase aún se está cargando, inténtalo de nuevo.",
    auth_invalid: "El correo o la contraseña no son correctos.",
    auth_unconfirmed: "Correo aún sin confirmar — revisa tu bandeja de entrada (y spam).",
    auth_exists: "Este correo ya tiene una cuenta — elige Iniciar sesión.",
    auth_weak: "Contraseña demasiado corta (mínimo 6 caracteres).",
    auth_email_invalid: "Correo electrónico no válido.",
    auth_rate: "Demasiados intentos — inténtalo más tarde.",
    auth_signup_disabled: "El registro está desactivado.",
    auth_provider_disabled: "Este método de inicio de sesión no está activado.",
    auth_network: "Error de red, comprueba tu conexión.",
    auth_failed: "Error al iniciar sesión.",
    login_note: `El inicio de sesión funciona a través de <a href="https://supabase.com/docs/guides/auth" target="_blank" rel="noopener">Supabase Auth</a> (Google). Las contraseñas se guardan cifradas (bcrypt), nunca en texto plano, y solo se almacenan tu correo y tus resultados de juego — no se comparten con terceros.`,
    footer_note: `Acontecimientos de <a href="https://en.wikipedia.org/wiki/Main_Page" target="_blank" rel="noopener">Wikipedia</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.es" target="_blank" rel="noopener">CC BY-SA 4.0</a> · <a href="mailto:contact@jaardle.com">${MAIL_ICON}Contacto</a>`,
    day: "Día", loading: "Cargando…",
    err_load: "No se pudo cargar el acontecimiento.", err_share: "Este puzle compartido ya no existe.",
    err_none: "No hay ningún puzle disponible.", retry: "Reintentar",
    won_intro: "¡Bien adivinado! Era", lost_intro: "Vaya — el año correcto era", source: "Fuente:",
    stats_empty: "Aún no has completado ningún puzle diario.",
    stats_daily: "Diario", stats_free: "Partida libre",
    stat_played: "Jugadas", stat_winrate: "Aciertos", stat_curstreak: "Racha actual",
    stat_beststreak: "Mejor racha", stat_avgscore: "Puntos medios", stat_won: "Ganadas",
    stat_last10: "Media últimas 10", stat_perfect: "100 perfectos", stat_avgtries: "Intentos medios",
    fav_century: "Siglo más fuerte",
    century_fmt: (n, bc) => {
      const R = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
      let x = n, r = "";
      for (const [v, s] of R) while (x >= v) { r += s; x -= v; }
      return `siglo ${r}${bc ? " a. C." : ""}`;
    },
    cal_title: "Últimos meses", cal_notsolved: "no resuelto",
    fact_prev: "Dato anterior", fact_next: "Dato siguiente",
    free_tag: "(libre)", lost_share: "💀 No resuelto",
    next_daily: "⏳ Próximo diario en", daily_ready: "✨ ¡El nuevo diario ya está aquí!",
    free_again: "🎲 ¿Otra ronda?", free_revenge: "🎲 Tómate la revancha",
    menu_leaderboard: "🏆 Clasificación", lb_title: "🏆 Clasificación",
    lb_daily: "Diario", lb_overall: "Histórico",
    lb_stat_rating: "Puntuación", lb_stat_streak: "Racha", lb_stat_dailywins: "Victorias diarias", lb_stat_perfect: "% perfectos", lb_scope_all: "todas las partidas",
    lb_scope_pool: "desde tu ingreso",
    lb_stat_prev: "Estadística anterior", lb_stat_next: "Estadística siguiente",
    lb_empty_daily: "Nadie ha jugado todavía el diario de hoy.",
    lb_empty_daily_past: "Nadie de tu grupo jugó este diario.",
    lb_daily_prev: "Día anterior", lb_daily_next: "Día siguiente",
    lb_empty_overall: "Aún no hay clasificación — juega algunas rondas.",
    lb_not_member: "Todavía no estás en ninguna clasificación de amigos.",
    lb_you: "tú", lb_games_short: (n) => `${n} ${n === 1 ? "partida" : "partidas"}`,
    lb_pool_none: "Todavía no estás en ningún grupo.",
    lb_create_label: "Crear un grupo nuevo", lb_create_ph: "Nombre de tu grupo", lb_create_btn: "Crear",
    lb_join_label: "Unirse a un grupo con código", lb_join_ph: "Código", lb_join_btn: "Unirse",
    lb_invite: "📢 Invitar", lb_leave: "Salir", lb_leave_confirm: "¿Seguro que quieres salir de este grupo?",
    lb_invite_copied: "✓ ¡Copiado!", lb_owner_tag: "Administrador",
    lb_rename: "✏️ Renombrar", lb_rename_prompt: "Nuevo nombre para el grupo:",
    lb_invite_text: (name) => `🏆 Únete a "${name}" en Jaardle — adivina cada día el año de un acontecimiento histórico:`,
    lb_yes: "Sí", lb_no: "No", lb_err_code: "Código desconocido", lb_err_name: "El nombre debe tener entre 2 y 30 caracteres", lb_err_generic: "Algo salió mal",
    lb_myname: "Tu nombre:", lb_name_edit: "✏️ Cambiar", lb_name_unset: "(sin definir)",
    lb_name_prompt: "Elige tu nombre visible (2–20 caracteres; letras, cifras, espacios, _ o -):",
    lb_name_taken: "Ese nombre ya está cogido — elige otro.",
    lb_name_invalid_length: "El nombre debe tener entre 2 y 20 caracteres.",
    lb_name_invalid_chars: "Solo se permiten letras, cifras, espacios, _ y -.",
    lb_name_err: "No se pudo guardar el nombre. Inténtalo de nuevo.",
    lb_flair_label: "Distintivo:", lb_flair_none: "Sin distintivo", lb_flair_err: "No se pudo guardar el distintivo.",
    lb_members_n: (n) => `${n} ${n === 1 ? "miembro" : "miembros"}`,
    lb_hidden_inactive: (n) => `${n} ${n === 1 ? "jugador oculto" : "jugadores ocultos"} · sin jugar 7+ días`,
    lb_join_q: (name) => `¿Unirse al grupo "${name}"?`,
    lb_pool_add: "➕ Otro grupo", lb_add_back: "‹ Volver",
    lb_err_pool_limit: "Ya estás en el número máximo de grupos (5).",
    recap_btn: "Distribución y equipo",
    recap_title: "📊 Listo por hoy", recap_dist_title: "🌍 Distribución de intentos (todos)",
    recap_dist_empty: "Nadie ha resuelto todavía este diario.",
    recap_faster: (pct) => `🎯 Mejor que el ${pct}% de los jugadores de hoy`,
    recap_firstguess: (avg, mine, avgN) => `📏 El primer intento falló por ${avg} año${avgN === 1 ? "" : "s"} de media${mine != null ? ` · tú: ${mine}` : ""}`,
    recap_team_title: "Marcador del equipo hoy", recap_today: "hoy",
    recap_login: "Inicia sesión para ver el marcador de tu equipo.", recap_login_btn: "🔑 Iniciar sesión",
    recap_pool_none: "Crea un grupo o únete a uno para ver aquí a tus amigos.", recap_pool_btn: "🏆 Crear o unirse a un grupo",
    recap_acct_title: "Con una cuenta gratuita",
    recap_acct_1: "📊 Tus estadísticas y tu racha se conservan",
    recap_acct_2: "☁️ Sigue jugando en todos tus dispositivos",
    recap_acct_3: "🏆 Compara tu diario con tus amigos en un grupo",
    recap_acct_btn: "Iniciar sesión o crear cuenta",
    recap_acct_free: "Siempre 100% gratis — sin versión de pago, sin anuncios.",
    streak_won: (n) => n === 1 ? "🔥 ¡Racha iniciada — vuelve mañana!" : `🔥 ¡${n} días seguidos!`,
    streak_lost: (n) => `💔 Racha de ${n} ${n === 1 ? "día" : "días"} perdida — ¡mañana, otra oportunidad!`,
    streak_saved: (n) => `🔥 Racha salvada — ¡${n} ${n === 1 ? "día" : "días"} seguidos!`,
    streak_makeup_lost: "💔 Vaya — no se salvó la racha.",
    makeup_tag: "recuperación",
    makeup_title: "🔥 ¡Te saltaste ayer!",
    makeup_body: (streak, dayNum) => `Juega el reto #${dayNum} de ayer y salva tu racha de ${streak} ${streak === 1 ? "día" : "días"}.`,
    makeup_cta: "Jugar el de ayer",
    makeup_play_today: "▶️ Juega ahora el reto de hoy",
    tiers: { perfect: "Perfecto", impressive: "Impresionante", good: "Bien", solid: "Sólido", justmade: "Por los pelos", lost: "La próxima irá mejor" },
    dir_word: "direcciones",
    avg_word: "med.",
    copy_prompt: "Copia esto:",
    cal_solved: (g, max) => `resuelto (${g}/${max})`,
    band_warn: (anos) => `Según tu mejor intento, la respuesta está más cerca; este intento queda a ${anos} años — fuera del margen. ¿Adivinar de todos modos?`,
    fact_stats: (s, hasScore) =>
      `🌍 ${s.games} jugadores · ${s.win_pct}% resuelto${hasScore ? ` · puntos medios ${s.avg_score}/100` : ""} · ${s.avg_guesses} intentos de media · ${s.first_try_pct}% al primer intento`,
    rating_line: "Tu rating",
    stats_rating: "Evolución del rating",
    rating_peak: "Máximo",
    rating_low: "Mínimo",
    menu_rating: "⚡ Rating",
    rating_empty: "Aún no hay historial suficiente: tu gráfica de rating aparecerá tras dos días de juego.",
    rating_anon: "Tu rating está vinculado a tu cuenta: inicia sesión para ver tu evolución.",
    menu_achv: "🏅 Logros",
    achv_sect_series: "Series", achv_sect_trophies: "Trofeos",
    achv_tiers: { bronze: "bronce", silver: "plata", gold: "oro", platinum: "platino", diamond: "diamante" },
    achv_next: (k, tier) => `faltan ${k} para ${tier}`,
    achv_maxed: "nivel máximo alcanzado",
    achv_games: "Jugador asiduo", achv_games_n: (n) => `${n} ${n === 1 ? "partida" : "partidas"}`,
    achv_dailies: "Habitual del diario", achv_dailies_n: (n) => `${n} puzles diarios`,
    achv_streak: "Racha", achv_streak_n: (n) => `mejor racha ${n} ${n === 1 ? "día" : "días"}`,
    achv_perfect: "Perfeccionista", achv_perfect_n: (n) => `${n} puntuaciones perfectas`,
    achv_pure: "Purista", achv_pure_n: (n) => `${n} victorias sin pistas`,
    achv_rating: "Rating", achv_rating_n: (n) => `máximo ${n}`,
    achv_years: "Años icónicos", achv_years_n: (n, total) => `${n}/${total} coleccionados`,
    achv_t_first: "Pleno", achv_t_first_sub: "acierta al 1.er intento",
    achv_t_last: "Gran escape", achv_t_last_sub: "gana en el 6.º intento",
    achv_t_saver: "Rescate", achv_t_saver_sub: "salva una racha con el puzle de recuperación",
    achv_t_eras: "Viajero del tiempo", achv_t_eras_sub: "gana en cada una de las 6 épocas",
    achv_t_eras_n: (n) => `${n} de 6 épocas`,
    achv_flair_note: (e, tier) => `al llegar a ${tier} ganas el distintivo ${e} para la clasificación`,
    achv_flair_note_flat: (e) => `te hace ganar el distintivo ${e} para la clasificación`,
    achv_anon_note: "🔒 Sin guardar: con una cuenta tus logros se conservan.",
    achv_year_locked: "aún sin descubrir",
    achv_unlocked: "Logro conseguido", achv_stamp_new: "Sello nuevo",
    achv_back: "‹ Logros",
    achv_events: {
      "-509": "Fundación de la República romana", "-44": "Asesinato de Julio César", "476": "Caída de Roma",
      "622": "La Hégira", "800": "Coronación de Carlomagno", "1066": "Batalla de Hastings",
      "1215": "Carta Magna", "1347": "La Peste Negra", "1440": "La imprenta de Gutenberg",
      "1453": "Caída de Constantinopla",
      "1492": "Colón llega a América", "1517": "Las 95 tesis de Lutero", "1588": "Armada Invencible",
      "1648": "Paz de Westfalia", "1687": "Principia de Newton", "1776": "Independencia de EE. UU.",
      "1789": "Revolución francesa", "1815": "Batalla de Waterloo", "1859": "Teoría de la evolución de Darwin",
      "1889": "Inauguración de la Torre Eiffel", "1912": "Hundimiento del Titanic", "1929": "Crac del 29",
      "1945": "Fin de la Segunda Guerra Mundial", "1957": "Sputnik", "1969": "La llegada a la Luna",
      "1989": "Caída del Muro de Berlín",
    },
    meta_title: "Jaardle — adivina el año",
    meta_share_title: "Jaardle — adivina el año de acontecimientos históricos",
    meta_desc: "Jaardle es un juego diario y gratuito de adivinar años — el Añodle de la historia, al estilo de Wordle: adivina en seis intentos el año de un acontecimiento histórico. Puzle diario o partida libre infinita.",
    intro_h1: "Jaardle — el juego diario de adivinar años",
    intro_html: `Jaardle es un juego de puzles gratuito al estilo Wordle: recibes un acontecimiento histórico y adivinas en pocos intentos en qué año ocurrió. Juega cada día el mismo <strong>puzle diario</strong> que todos los demás o disfruta de la <strong>partida libre</strong> infinita, compara tu puntuación con tus amigos y construye tu racha.`,
    help_list: HELP_ES,
  },
  pt: {
    tab_daily: "Jaardle diário", tab_free: "Jogo novo",
    menu_stats: "📊 Estatísticas", menu_login: "🔑 Entrar", menu_logout: "Sair", menu_loggedin: "Conectado",
    menu_login_short: "Entrar",
    menu_theme: "☀️ Tema claro",
    aria_guesses: "Tentativas", aria_year_input: "Ano digitado", aria_keypad: "Teclado numérico",
    aria_bc: "Antes de Cristo liga/desliga", aria_backspace: "Apagar último dígito", aria_close: "Fechar",
    hint_nudge: (p) => `Dica: 🔢 revela o último dígito (−${p} pontos)`,
    guess: "Adivinhar", share: "Compartilhar resultado", next: "Nova rodada",
    hint_text: "💡 Dica extra", hint_dir: "🧭 Direção", hint_century: "🏛️ Século",
    hint_later: "⏩ 100 anos depois", hint_later_n: (y) => `⏩ ${y} anos depois`, hint_digit: "🔢 Último algarismo",
    century_band: "🏛️ Era", bc: "a.C.",
    reveal: "Revelar",
    main_label: "Este ano", extra_label: "Também neste ano",
    century_label: "Era",
    digit_label: "Último algarismo",
    score_label: "Pontos",
    diff_easy: "Dificuldade: fácil", diff_med: "Dificuldade: média", diff_hard: "Dificuldade: difícil",
    later_label: (y) => `${y} anos depois`,
    later_future: (y) => `${y} anos depois ainda não aconteceu — então a resposta está nos últimos ~${y} anos.`,
    later_none: (y) => `Não se conhece nenhum acontecimento de cerca de ${y} anos depois.`,
    help_summary: "Como jogar?", stats_title: "📊 Estatísticas",
    login_title: "Entrar", login_google: "Continuar com o Google", login_or: "ou com e-mail",
    login_email: "E-mail", login_password: "Senha", login_submit: "Entrar", login_register: "Cadastrar-se",
    login_forgot: "Esqueceu a senha?",
    login_reset_email_needed: "Digite primeiro o seu e-mail.",
    login_reset_sent: `Se houver uma conta com este e-mail, um link de redefinição foi enviado. <strong>Não recebeu? Veja na pasta de spam/lixo eletrônico.</strong>`,
    newpw_title: "Definir uma nova senha", newpw_label: "Nova senha", newpw_submit: "Salvar senha",
    newpw_success: "Sua senha foi atualizada. Você já está conectado.",
    auth_same_password: "Escolha uma senha diferente da anterior.",
    login_check_spam: `Conta criada — clique no link na sua caixa de entrada para confirmar seu e-mail. <strong>Não recebeu? Veja na pasta de spam/lixo eletrônico.</strong>`,
    auth_loading: "O Supabase ainda está carregando, tente novamente.",
    auth_invalid: "E-mail ou senha incorretos.",
    auth_unconfirmed: "E-mail ainda não confirmado — veja sua caixa de entrada (e spam).",
    auth_exists: "Este e-mail já tem uma conta — escolha Entrar.",
    auth_weak: "Senha muito curta (mínimo de 6 caracteres).",
    auth_email_invalid: "Endereço de e-mail inválido.",
    auth_rate: "Muitas tentativas — tente novamente mais tarde.",
    auth_signup_disabled: "O cadastro está desativado.",
    auth_provider_disabled: "Este método de login não está ativado.",
    auth_network: "Erro de rede, verifique sua conexão.",
    auth_failed: "Falha ao entrar.",
    login_note: `O login é feito através do <a href="https://supabase.com/docs/guides/auth" target="_blank" rel="noopener">Supabase Auth</a> (Google). As senhas são armazenadas com hash (bcrypt), nunca em texto puro, e apenas o seu e-mail e os resultados de jogo são guardados — não compartilhados com terceiros.`,
    footer_note: `Acontecimentos da <a href="https://en.wikipedia.org/wiki/Main_Page" target="_blank" rel="noopener">Wikipédia</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.pt_BR" target="_blank" rel="noopener">CC BY-SA 4.0</a> · <a href="mailto:contact@jaardle.com">${MAIL_ICON}Contato</a>`,
    day: "Dia", loading: "Carregando…",
    err_load: "Não foi possível carregar o acontecimento.", err_share: "Este quebra-cabeça compartilhado não existe mais.",
    err_none: "Nenhum quebra-cabeça disponível.", retry: "Tentar de novo",
    won_intro: "Boa! O ano era", lost_intro: "Que pena — o ano certo era", source: "Fonte:",
    stats_empty: "Você ainda não concluiu nenhum quebra-cabeça diário.",
    stats_daily: "Diário", stats_free: "Jogo livre",
    stat_played: "Jogadas", stat_winrate: "Acertos", stat_curstreak: "Sequência atual",
    stat_beststreak: "Melhor sequência", stat_avgscore: "Pontos médios", stat_won: "Vitórias",
    stat_last10: "Média últimas 10", stat_perfect: "100 perfeitos", stat_avgtries: "Tentativas médias",
    fav_century: "Século mais forte",
    century_fmt: (n, bc) => {
      const R = [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]];
      let x = n, r = "";
      for (const [v, s] of R) while (x >= v) { r += s; x -= v; }
      return `século ${r}${bc ? " a.C." : ""}`;
    },
    cal_title: "Últimos meses", cal_notsolved: "não resolvido",
    fact_prev: "Fato anterior", fact_next: "Próximo fato",
    free_tag: "(livre)", lost_share: "💀 Não resolvido",
    next_daily: "⏳ Próximo diário em", daily_ready: "✨ O novo diário já chegou!",
    free_again: "🎲 Mais uma rodada?", free_revenge: "🎲 Dê o troco",
    menu_leaderboard: "🏆 Classificação", lb_title: "🏆 Classificação",
    lb_daily: "Diário", lb_overall: "Geral",
    lb_stat_rating: "Pontuação", lb_stat_streak: "Sequência", lb_stat_dailywins: "Vitórias diárias", lb_stat_perfect: "% perfeitos", lb_scope_all: "todas as partidas",
    lb_scope_pool: "desde a entrada",
    lb_stat_prev: "Estatística anterior", lb_stat_next: "Próxima estatística",
    lb_empty_daily: "Ninguém jogou o diário de hoje ainda.",
    lb_empty_daily_past: "Ninguém do seu grupo jogou este diário.",
    lb_daily_prev: "Dia anterior", lb_daily_next: "Próximo dia",
    lb_empty_overall: "Ainda não há classificação — jogue algumas rodadas.",
    lb_not_member: "Você ainda não está em nenhuma classificação de amigos.",
    lb_you: "você", lb_games_short: (n) => `${n} ${n === 1 ? "partida" : "partidas"}`,
    lb_pool_none: "Você ainda não está em nenhum grupo.",
    lb_create_label: "Criar um grupo novo", lb_create_ph: "Nome do seu grupo", lb_create_btn: "Criar",
    lb_join_label: "Entrar em um grupo com código", lb_join_ph: "Código", lb_join_btn: "Entrar",
    lb_invite: "📢 Convidar", lb_leave: "Sair", lb_leave_confirm: "Tem certeza de que quer sair deste grupo?",
    lb_invite_copied: "✓ Copiado!", lb_owner_tag: "Administrador",
    lb_rename: "✏️ Renomear", lb_rename_prompt: "Novo nome para o grupo:",
    lb_invite_text: (name) => `🏆 Entre em "${name}" no Jaardle — adivinhe todo dia o ano de um acontecimento histórico:`,
    lb_yes: "Sim", lb_no: "Não", lb_err_code: "Código desconhecido", lb_err_name: "O nome deve ter entre 2 e 30 caracteres", lb_err_generic: "Algo deu errado",
    lb_myname: "Seu nome:", lb_name_edit: "✏️ Alterar", lb_name_unset: "(não definido)",
    lb_name_prompt: "Escolha seu nome visível (2–20 caracteres; letras, números, espaços, _ ou -):",
    lb_name_taken: "Esse nome já está em uso — escolha outro.",
    lb_name_invalid_length: "O nome deve ter entre 2 e 20 caracteres.",
    lb_name_invalid_chars: "Só são permitidos letras, números, espaços, _ e -.",
    lb_name_err: "Não foi possível salvar o nome. Tente de novo.",
    lb_flair_label: "Emblema:", lb_flair_none: "Sem emblema", lb_flair_err: "Não foi possível salvar o emblema.",
    lb_members_n: (n) => `${n} ${n === 1 ? "membro" : "membros"}`,
    lb_hidden_inactive: (n) => `${n} ${n === 1 ? "jogador oculto" : "jogadores ocultos"} · sem jogar há 7+ dias`,
    lb_join_q: (name) => `Entrar no grupo "${name}"?`,
    lb_pool_add: "➕ Outro grupo", lb_add_back: "‹ Voltar",
    lb_err_pool_limit: "Você já está no número máximo de grupos (5).",
    recap_btn: "Distribuição e equipe",
    recap_title: "📊 Pronto por hoje", recap_dist_title: "🌍 Distribuição de tentativas (todos)",
    recap_dist_empty: "Ninguém resolveu este diário ainda.",
    recap_faster: (pct) => `🎯 Melhor que ${pct}% dos jogadores hoje`,
    recap_firstguess: (avg, mine, avgN) => `📏 O primeiro palpite errou por ${avg} ano${avgN === 1 ? "" : "s"} em média${mine != null ? ` · você: ${mine}` : ""}`,
    recap_team_title: "Placar da equipe hoje", recap_today: "hoje",
    recap_login: "Entre para ver o placar da sua equipe.", recap_login_btn: "🔑 Entrar",
    recap_pool_none: "Crie um grupo ou entre em um para ver seus amigos aqui.", recap_pool_btn: "🏆 Criar ou entrar em um grupo",
    recap_acct_title: "Com uma conta gratuita",
    recap_acct_1: "📊 Suas estatísticas e sua sequência são preservadas",
    recap_acct_2: "☁️ Continue jogando em todos os seus dispositivos",
    recap_acct_3: "🏆 Compare seu diário com seus amigos em um grupo",
    recap_acct_btn: "Entrar ou criar conta",
    recap_acct_free: "Sempre 100% grátis — sem versão paga, sem anúncios.",
    streak_won: (n) => n === 1 ? "🔥 Sequência iniciada — volte amanhã!" : `🔥 ${n} dias seguidos!`,
    streak_lost: (n) => `💔 Sequência de ${n} ${n === 1 ? "dia" : "dias"} perdida — amanhã tem outra chance!`,
    streak_saved: (n) => `🔥 Sequência salva — ${n} ${n === 1 ? "dia" : "dias"} seguidos!`,
    streak_makeup_lost: "💔 Que pena — a sequência não foi salva.",
    makeup_tag: "recuperação",
    makeup_title: "🔥 Você perdeu ontem!",
    makeup_body: (streak, dayNum) => `Jogue o desafio #${dayNum} de ontem e salve sua sequência de ${streak} ${streak === 1 ? "dia" : "dias"}.`,
    makeup_cta: "Jogar o de ontem",
    makeup_play_today: "▶️ Jogue agora o desafio de hoje",
    tiers: { perfect: "Perfeito", impressive: "Impressionante", good: "Bem", solid: "Sólido", justmade: "Por pouco", lost: "A próxima vai melhor" },
    dir_word: "direções",
    avg_word: "méd.",
    copy_prompt: "Copie isto:",
    cal_solved: (g, max) => `resolvido (${g}/${max})`,
    band_warn: (anos) => `Pelo seu melhor palpite, a resposta está mais perto; este palpite fica a ${anos} anos — fora da faixa. Adivinhar mesmo assim?`,
    fact_stats: (s, hasScore) =>
      `🌍 ${s.games} jogadores · ${s.win_pct}% resolvido${hasScore ? ` · pontos médios ${s.avg_score}/100` : ""} · ${s.avg_guesses} tentativas em média · ${s.first_try_pct}% no primeiro palpite`,
    rating_line: "Seu rating",
    stats_rating: "Evolução do rating",
    rating_peak: "Máximo",
    rating_low: "Mínimo",
    menu_rating: "⚡ Rating",
    rating_empty: "Ainda não há histórico suficiente — seu gráfico de rating aparece após dois dias de jogo.",
    rating_anon: "Seu rating está vinculado à sua conta — faça login para ver sua evolução.",
    menu_achv: "🏅 Conquistas",
    achv_sect_series: "Séries", achv_sect_trophies: "Troféus",
    achv_tiers: { bronze: "bronze", silver: "prata", gold: "ouro", platinum: "platina", diamond: "diamante" },
    achv_next: (k, tier) => `faltam ${k} para ${tier}`,
    achv_maxed: "nível máximo alcançado",
    achv_games: "Jogador assíduo", achv_games_n: (n) => `${n} ${n === 1 ? "partida" : "partidas"}`,
    achv_dailies: "Frequentador do diário", achv_dailies_n: (n) => `${n} desafios diários`,
    achv_streak: "Sequência", achv_streak_n: (n) => `melhor sequência ${n} ${n === 1 ? "dia" : "dias"}`,
    achv_perfect: "Perfeccionista", achv_perfect_n: (n) => `${n} pontuações perfeitas`,
    achv_pure: "Purista", achv_pure_n: (n) => `${n} vitórias sem dicas`,
    achv_rating: "Rating", achv_rating_n: (n) => `pico ${n}`,
    achv_years: "Anos icônicos", achv_years_n: (n, total) => `${n}/${total} colecionados`,
    achv_t_first: "Na mosca", achv_t_first_sub: "acerte na 1ª tentativa",
    achv_t_last: "Grande escape", achv_t_last_sub: "vença na 6ª tentativa",
    achv_t_saver: "Resgate", achv_t_saver_sub: "salve uma sequência com o desafio de recuperação",
    achv_t_eras: "Viajante do tempo", achv_t_eras_sub: "vença em cada uma das 6 eras",
    achv_t_eras_n: (n) => `${n} de 6 eras`,
    achv_flair_note: (e, tier) => `ao chegar a ${tier} você ganha o emblema ${e} para o placar`,
    achv_flair_note_flat: (e) => `faz você ganhar o emblema ${e} para o placar`,
    achv_anon_note: "🔒 Não salvo — com uma conta suas conquistas ficam guardadas.",
    achv_year_locked: "ainda não descoberto",
    achv_unlocked: "Conquista desbloqueada", achv_stamp_new: "Selo novo",
    achv_back: "‹ Conquistas",
    achv_events: {
      "-509": "Fundação da República Romana", "-44": "Assassinato de Júlio César", "476": "Queda de Roma",
      "622": "A Hégira", "800": "Coroação de Carlos Magno", "1066": "Batalha de Hastings",
      "1215": "Magna Carta", "1347": "A Peste Negra", "1440": "A prensa de Gutenberg",
      "1453": "Queda de Constantinopla",
      "1492": "Colombo chega à América", "1517": "As 95 teses de Lutero", "1588": "Armada Espanhola",
      "1648": "Paz de Vestfália", "1687": "Principia de Newton", "1776": "Independência dos EUA",
      "1789": "Revolução Francesa", "1815": "Batalha de Waterloo", "1859": "Teoria da evolução de Darwin",
      "1889": "Inauguração da Torre Eiffel", "1912": "Naufrágio do Titanic", "1929": "Crash da bolsa",
      "1945": "Fim da Segunda Guerra Mundial", "1957": "Sputnik", "1969": "A chegada à Lua",
      "1989": "Queda do Muro de Berlim",
    },
    meta_title: "Jaardle — adivinhe o ano",
    meta_share_title: "Jaardle — adivinhe o ano de acontecimentos históricos",
    meta_desc: "Jaardle é um jogo diário e gratuito de adivinhar anos — o Anodle da história, no estilo de Wordle: adivinhe em seis tentativas o ano de um acontecimento histórico. Quebra-cabeça diário ou jogo livre infinito.",
    intro_h1: "Jaardle — o jogo diário de adivinhar anos",
    intro_html: `Jaardle é um jogo de quebra-cabeças gratuito no estilo Wordle: você recebe um acontecimento histórico e adivinha em poucas tentativas em que ano ele aconteceu. Jogue todo dia o mesmo <strong>quebra-cabeça diário</strong> que todo mundo ou aproveite o <strong>jogo livre</strong> infinito, compare sua pontuação com seus amigos e construa sua sequência.`,
    help_list: HELP_PT,
  },
};

function t(key) {
  const v = I18N[lang] && I18N[lang][key];
  return v != null ? v : I18N[DEFAULT_LANG][key];
}
function tierLabel(tier) {
  return (t("tiers") || {})[tier.key] || tier.label;
}

// Pas de gekozen taal toe op alle UI. Idempotent — kan altijd opnieuw.
function applyLang() {
  try { localStorage.setItem("jaardle:lang", lang); } catch (e) {}
  document.documentElement.lang = lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const v = t(el.dataset.i18n); if (v != null) el.textContent = v;
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const v = t(el.dataset.i18nHtml); if (v != null) el.innerHTML = v;
  });
  // aria-labels meevertalen (statische waarden komen uit de build; dit dekt
  // de taalwissel tijdens de sessie voor screenreader-gebruikers).
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const v = t(el.dataset.i18nAria); if (v != null) el.setAttribute("aria-label", v);
  });
  const help = document.getElementById("help-list");
  if (help) help.innerHTML = t("help_list");
  renderHelpConstants();
  renderLangMenu();
  updateDayLabel();
  renderMenu();
  if (state) {
    renderEvent();
    renderHintStatus();
    if (state.done) finishGame(state.won);
  }
  const sm = document.getElementById("modal-stats");
  if (sm && !sm.hidden) renderStats();
  const rm = document.getElementById("modal-rating");
  if (rm && !rm.hidden) renderRatingModal();
  const am = document.getElementById("modal-achv");
  if (am && !am.hidden) renderAchievements();
}

// Zichtbare taalkeuze in de header (redactle-stijl dropdown), gevuld uit LANGS —
// een nieuwe taal verschijnt hier dus vanzelf zodra 'ie in LANGS staat. De knop
// toont de huidige taalcode (🌐 NL ▾); de pop lijst alle talen met ✓ op de actieve.
function renderLangMenu() {
  const codeEl = document.querySelector("#lang-btn .lang-code");
  if (codeEl) codeEl.textContent = lang.toUpperCase();
  const pop = document.getElementById("lang-pop");
  if (!pop) return;
  pop.innerHTML = LANG_CODES.map((c) =>
    `<button class="lang-item${c === lang ? " active" : ""}" role="menuitem" data-lang="${c}">` +
    `<img class="lang-flag" src="/flags/${LANGS[c].flag}.svg" alt="" width="64" height="64">` +
    `${LANGS[c].label}${c === lang ? " ✓" : ""}</button>`).join("");
}

function toggleLangMenu(force) {
  const pop = document.getElementById("lang-pop");
  const btn = document.getElementById("lang-btn");
  if (!pop || !btn) return;
  const open = force !== undefined ? force : pop.hidden;
  pop.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
}

// Kies een taal expliciet (uit de dropdown). Houdt de URL in lijn: "/" voor de
// root-taal, "/en", "/de", … (query zoals ?p=... blijft behouden).
function setLang(code) {
  toggleLangMenu(false);
  if (!LANG_CODES.includes(code) || code === lang) return;
  lang = code;
  applyLang();
  try { history.replaceState(null, "", "/" + LANGS[lang].path + location.search); }
  catch (e) {}
}

// Debug-flag onthult WIP-features (account-menu, stats) zonder ze voor
// publieke users zichtbaar te maken. Aan op localhost, of via ?debug=1
// (blijft daarna in localStorage staan tot ?debug=0).
const DEBUG = (() => {
  const params = new URLSearchParams(location.search);
  if (params.get("debug") === "1") localStorage.setItem("jaardle:debug", "1");
  if (params.get("debug") === "0") localStorage.removeItem("jaardle:debug");
  return (
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    localStorage.getItem("jaardle:debug") === "1"
  );
})();
const els = {
  eventText: document.getElementById("event-text"),
  eventCard: document.getElementById("event-card"),
  diffHeat: document.getElementById("diff-heat"),
  scoreBox: document.getElementById("live-score"),
  scoreVal: document.querySelector("#live-score .live-score-val"),
  factPrev: document.getElementById("fact-prev"),
  factNext: document.getElementById("fact-next"),
  hintBtnLater: document.getElementById("hint-btn-later"),
  hintBtnDir: document.getElementById("hint-btn-direction"),
  hintBtnCentury: document.getElementById("hint-btn-century"),
  hintBtnDigit: document.getElementById("hint-btn-digit"),
  hintChipCentury: document.getElementById("hint-chip-century"),
  hintChipDigit: document.getElementById("hint-chip-digit"),
  hintCount: document.getElementById("hint-count"),
  guesses: document.getElementById("guesses"),
  input: document.getElementById("year-input"),
  keypad: document.getElementById("keypad"),
  signBtn: document.getElementById("sign-btn"),
  backspaceBtn: document.getElementById("backspace-btn"),
  guessBtn: document.getElementById("guess-btn"),
  result: document.getElementById("result"),
  resultText: document.getElementById("result-text"),
  revealRow: document.getElementById("reveal-row"),
  source: document.getElementById("event-source"),
  shareBtn: document.getElementById("share-btn"),
  recapBtn: document.getElementById("recap-btn"),
  nextBtn: document.getElementById("next-btn"),
  dayLabel: document.getElementById("day-label"),
  tabs: Array.from(document.querySelectorAll("#mode-tabs .tab")),
};

const MAX_DIGITS = 4;

function getYearString() {
  return els.input.textContent;
}

function setYearString(s) {
  els.input.textContent = s;
  updateSignBtn();
}

function clearYear() {
  setYearString("");
}

function appendDigit(d) {
  if (isKeypadDisabled()) return;
  const cur = getYearString();
  const neg = cur.startsWith("-");
  const digits = neg ? cur.slice(1) : cur;
  if (digits.length >= MAX_DIGITS) return;
  setYearString((neg ? "-" : "") + digits + d);
}

function backspaceYear() {
  if (isKeypadDisabled()) return;
  const cur = getYearString();
  const neg = cur.startsWith("-");
  const digits = neg ? cur.slice(1) : cur;
  if (digits.length === 0) {
    if (neg) setYearString("");
    return;
  }
  const trimmed = digits.slice(0, -1);
  setYearString((neg && trimmed.length > 0 ? "-" : "") + trimmed);
}

function toggleSign() {
  if (isKeypadDisabled()) return;
  const cur = getYearString();
  if (cur.startsWith("-")) setYearString(cur.slice(1));
  else if (cur.length > 0) setYearString("-" + cur);
  else setYearString("-");
}

function updateSignBtn() {
  const neg = getYearString().startsWith("-");
  els.signBtn.classList.toggle("negative", neg);
  els.signBtn.setAttribute("aria-pressed", neg ? "true" : "false");
}

function isKeypadDisabled() {
  return els.keypad.classList.contains("disabled");
}

function setKeypadDisabled(disabled) {
  els.keypad.classList.toggle("disabled", disabled);
  els.keypad.querySelectorAll("button").forEach((b) => (b.disabled = disabled));
}

let state = null;
let factSlideIndex = 0;   // actieve slide in de feiten-carrousel

// --- Supabase RPC-bridge (window.sb wordt in index.html gezet) ---------------
function rpc(fn, args) {
  if (window.sb?.rpc) return window.sb.rpc(fn, args || {});
  return Promise.reject(new Error("Supabase nog niet geladen"));
}
function whenSbReady() {
  return new Promise((resolve) => {
    if (window.sb) return resolve();
    window.addEventListener("sb-ready", () => resolve(), { once: true });
  });
}

function arraysEqual(a, b) {
  return Array.isArray(a) && Array.isArray(b) && a.length === b.length &&
    a.every((v, i) => v === b[i]);
}

// Een puzzle komt zo van de RPC's:
//   { year, hashes:[main,...extras], facts:[{hash,nl,en,source}], extras:[...] }
// state.event is de UI-vorm ({year, facts:[{nl,en}], extras:[{nl,en}], source});
// state.hashes is het share-token (main eerst).
function toEvent(puzzle) {
  const map = (f) => Object.fromEntries(LANG_CODES.map((c) => [c, f[c] || ""]));
  return {
    year: puzzle.year,
    facts: (puzzle.facts || []).map(map),
    extras: (puzzle.extras || []).map(map),
    source: puzzle.facts?.[0]?.source || "",
  };
}

// Laad/fout-status in de event-card.
function setCardStatus(msg, retry) {
  els.eventText.innerHTML = "";
  const p = document.createElement("p");
  p.className = "fact card-status";
  p.textContent = msg;
  els.eventText.appendChild(p);
  if (retry) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "retry-btn";
    b.textContent = t("retry");
    b.addEventListener("click", retry);
    els.eventText.appendChild(b);
  }
}

// Share-token = de puzzle-hashes aan elkaar (main eerst, dan extras). De server
// reconstrueert 'm via get_facts_by_hashes — geen index/jaar-afleiding meer.
function buildShareToken() {
  return (state?.hashes || []).join("");
}

// Parse share token (N × 10 hex) → array van hashes, of null.
function parseShareToken(token) {
  if (!/^[0-9a-f]+$/.test(token) || token.length % 10 !== 0 || token.length === 0) return null;
  return token.match(/.{10}/g);
}

// "Vandaag" in Europe/Amsterdam, zodat iedereen dezelfde dagpuzzel krijgt en het
// matcht met de server-gate in get_daily(). en-CA levert YYYY-MM-DD.
function todayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
}

function daysSince(epoch) {
  const [y, m, d] = todayKey().split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - epoch.getTime()) / 86400000);
}

// Seconden tot de volgende dagpuzzel = middernacht Europe/Amsterdam. We lezen de
// huidige wandklok in die zone, zodat het ook klopt rond zomer-/wintertijd.
function secsToNextDaily() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  let h = get("hour");
  if (h === 24) h = 0;  // en-GB geeft middernacht soms als 24
  return 86400 - (h * 3600 + get("minute") * 60 + get("second"));
}

function fmtCountdown(secs) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`;
}

function storageKey(mode, date) {
  return mode === "daily" ? `jaardle:daily:${date || todayKey()}` : `jaardle:free:current`;
}

// Slot voor de dedup-sleutels (jaardle:sent / jaardle:playid): de daily per dag,
// vrij spel per pot (potId). Voorheen was het vrije slot het vaste "free", maar
// get_random_fact sluit eerder gespeelde feiten niet uit — een herhaald feit
// bleef dan voorgoed hangen op de oude sleutel: geen record_play, geen elo,
// geen ⚡-regel. Per-pot blijft herladen idempotent én telt een repeat gewoon mee.
function potSlot() {
  return state.mode === "daily" ? (state.puzzleDate || todayKey()) : (state.potId || "free");
}

// Uniek id per vrij-spel-pot; gaat mee in save() zodat een herlaad-restore
// (en een tweede tab op dezelfde share-link) hetzelfde slot houdt.
function newPotId() {
  return "t" + Date.now().toString(36) + Math.floor(Math.random() * 1679616).toString(36);
}

// Dedup-sleutels van vervangen vrij-spel-potten (slot "free" van vóór het potId,
// of een ander potId) zijn dood gewicht zodra een nieuwe pot start; ruim ze op.
// Daily-slots zijn datums en blijven staan (claim-na-login moet blijven werken).
function pruneFreeSentKeys(keepPotId) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (!k || !(k.startsWith("jaardle:sent:") || k.startsWith("jaardle:playid:"))) continue;
      const slot = k.slice(k.lastIndexOf(":") + 1);
      if ((slot === "free" || slot[0] === "t") && slot !== keepPotId) localStorage.removeItem(k);
    }
  } catch (e) { /* storage may be unavailable */ }
}

// Speelt de huidige state een daily van GISTEREN (inhaalpot voor streak-reparatie)?
// De gewone daily heeft puzzleDate === vandaag; een inhaalpot een oudere datum.
function isMakeup(s = state) {
  return !!s && s.mode === "daily" && !!s.puzzleDate && s.puzzleDate !== todayKey();
}

// Dagnummer (#N sinds EPOCH) voor een YYYY-MM-DD-sleutel.
function dayNumForKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return Math.floor((Date.UTC(y, m - 1, d) - EPOCH.getTime()) / 86400000) + 1;
}

// Daglabel in de footer: #N van de nu actieve daily (vandaag, óf gisteren bij een
// inhaalpot — dan met een "· inhaaldag"-markering zodat spelers weten wat ze doen).
function updateDayLabel() {
  if (!els.dayLabel) return;
  const key = isMakeup(state) ? state.puzzleDate : todayKey();
  const tag = isMakeup(state) ? ` · ${t("makeup_tag")}` : "";
  els.dayLabel.textContent = `${t("day")} #${dayNumForKey(key)}${tag}`;
}

// Eenmalig: migreer state uit oude "yeardle-nl:" sleutels naar "jaardle:"
(function migrateLegacyStorage() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("yeardle-nl:")) {
        const newKey = "jaardle:" + k.slice("yeardle-nl:".length);
        if (localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, localStorage.getItem(k));
        }
        localStorage.removeItem(k);
      }
    }
  } catch (e) { /* private browsing etc. */ }
})();

function classify(diff) {
  const abs = Math.abs(diff);
  if (abs === 0) return "correct";
  if (abs <= 2) return "veryclose";
  if (abs <= 10) return "close";
  if (abs <= 25) return "warm";
  if (abs <= 50) return "cool";
  if (abs <= 200) return "far";
  if (abs <= 599) return "distant";
  return "farthest";
}

// Bovengrens van het bereik dat elke gok-badge toont (zie RANGE_LABELS): hoe ver
// het antwoord maximaal van die gok kan liggen. "farthest" (600+) is onbegrensd.
const BAND_OUTER = {
  veryclose: 2, close: 10, warm: 25, cool: 50, far: 200, distant: 599,
};

// Speelruimte bovenop de band-bovengrens: pas waarschuwen als de gok er duidelijk
// buiten valt, niet bij elke gok die net over de grens kruipt. Houdt de guard een
// failsafe tegen typefouten i.p.v. een betweter.
const BAND_SLACK = 30;

// Buiten-bereik-guard: je dichtste eerdere gok geeft via z'n badge het smalste
// bereik waarin het antwoord moet liggen. Ligt `year` daar duidelijk verder vandaan
// dan die bovengrens (+ speelruimte), dan kan het logisch gezien niet het antwoord
// zijn → waarschijnlijk een typefout. Geeft die afstand (jaren) TERUG, anders 0.
// Kijkt alleen naar eigen gokken (afstand is bekend uit eerdere feedback), niet naar
// het antwoord — verklapt dus niets.
function outOfBand(guesses, year) {
  const closest = (guesses || []).reduce(
    (b, g) => (b === null || Math.abs(g.diff) < Math.abs(b.diff)) ? g : b, null);
  if (!closest) return 0;
  const outer = BAND_OUTER[closest.cls];
  if (outer === undefined) return 0;   // farthest → geen bovengrens, geen guard
  const jump = Math.abs(year - closest.year);
  return jump > outer + BAND_SLACK ? jump : 0;
}

function displaySource(url) {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch (e) {
    return url;
  }
}

function emojiFor(cls) {
  return {
    correct: "🟩",
    veryclose: "🟪",
    close: "🟨",
    warm: "🟧",
    cool: "🟥",
    far: "🟫",
    distant: "⬜",
    farthest: "⬛",
  }[cls];
}

// Hoeveel gratis zelfde-tijd-extra's deze puzzel heeft (0–2).
function availableExtras() {
  if (!state || !state.event) return 0;
  return Math.min(state.event.extras.length, MAX_EXTRA_HINTS);
}

// De carrousel ÍS de hint-deck. Volgorde: hoofdfeit → gratis zelfde-tijd-extra's
// (💡 geel, vanaf de start) → ⏩ "100 jaar later" → 🏛️ eeuw → 🔢 laatste cijfer.
// Betaalde hints staan als "tik om te onthullen"-slot (locked) en morphen naar hun
// inhoud zodra je betaalt. Ná afloop staat alles open om na te lezen.
function factSlides() {
  if (!state || !state.event) return [];
  const slides = state.event.facts.map((f) => ({ kind: "main", ...f }));
  // Gratis zelfde-tijd-extra's (geel): vanaf de start zichtbaar — de start is het
  // enige rustige leesmoment; wat later "vrijkomt" wordt niet gelezen (de aandacht
  // zit dan bij het bord).
  const ex = availableExtras();
  for (let i = 0; i < ex; i++) {
    const f = state.event.extras[i];
    if (f) slides.push({ kind: "extra", ...f });
  }
  // Betaalde hints (⏩/🏛️/🔢) verschijnen als gekleurde slide zodra je ze opent.
  // Bij WINST tonen we alleen wat je echt opende (niet de ongebruikte spoilen);
  // bij VERLIES klappen we alles open, ter lering (het jaar is dan toch onthuld).
  const revealAll = state.done && !state.won;
  if (state.laterClues) {
    const shown = revealAll ? availableLaterClues() : state.laterCluesShown;
    for (let i = 0; i < shown; i++) {
      slides.push({ kind: "later", text: laterSlotText(i), slot: i });
    }
  }
  if (state.centuryRevealed || revealAll) {
    slides.push({ kind: "century", text: centuryBand(state.event.year), sub: eraName(state.event.year) });
  }
  if (state.lastDigitRevealed || revealAll) {
    slides.push({ kind: "digit", text: String(Math.abs(state.event.year) % 10) });
  }
  return slides;
}

// Kopje boven een clue-slide: emoji-icoon + label. Gedeeld door alle hint-slides.
function buildSlideTag(tagClass, iconClass, emoji, label) {
  const tag = document.createElement("div");
  tag.className = tagClass;
  const icon = document.createElement("span");
  icon.className = iconClass;
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = emoji;
  const lbl = document.createElement("span");
  lbl.textContent = label;
  tag.append(icon, lbl);
  return tag;
}

function factParagraph(text, extraClass) {
  const p = document.createElement("p");
  p.className = "fact" + (extraClass ? " " + extraClass : "");
  p.textContent = text;
  return p;
}

// Onthuld kort-en-krachtig getal/bereik (eeuw-band, laatste cijfer).
function hintValue(text) {
  const d = document.createElement("div");
  d.className = "hint-value";
  d.textContent = text;
  return d;
}

// Schuif naar de (laatste) carrousel-slide van een bepaald hint-type — gebruikt
// nadat een hint-knop een nieuwe slide heeft toegevoegd.
function goToHintSlide(kind) {
  const slides = factSlides();
  let idx = -1;
  slides.forEach((s, i) => { if (s.kind === kind) idx = i; });
  if (idx < 0) return;
  const track = els.eventText.querySelector(".fact-track");
  if (track) void track.offsetWidth;   // reflow → de schuif animeert i.p.v. springt
  goToSlide(idx);
}

// Moeilijkheids-pepertjes (alleen daily): band 1..3 uit get_daily → 🌶️ / 🌶️🌶️ /
// 🌶️🌶️🌶️ rechtsboven op de kaart, mini. Zelfde repeat-idioom als de ⏩'s; het
// label zit in de tooltip/aria en verschijnt op mobiel even inline (tik, plus
// een eenmalige cue bij de allereerste keer). Vrij spel/onbekende band → weg.
function renderDiffHeat() {
  const el = els.diffHeat;
  if (!el) return;
  const band = state?.mode === "daily" ? state.band : null;
  if (!band || band < 1 || band > 3) { el.hidden = true; return; }
  const label = t(["diff_easy", "diff_med", "diff_hard"][band - 1]);
  el.innerHTML = "";
  const word = document.createElement("span");
  word.className = "diff-heat-label";
  word.setAttribute("aria-hidden", "true");
  word.textContent = label;
  el.appendChild(word);
  el.appendChild(document.createTextNode("🌶️".repeat(band)));
  el.title = label;
  el.setAttribute("aria-label", label);
  el.hidden = false;
  maybeShowDiffHeatCue();
}

// Tik/cue: laat het label kort naast de pepertjes zien (mobiel heeft geen hover).
let diffHeatTimer = null;
function openDiffHeat(ms) {
  const el = els.diffHeat;
  if (!el || el.hidden) return;
  el.classList.add("open");
  clearTimeout(diffHeatTimer);
  diffHeatTimer = setTimeout(() => el.classList.remove("open"), ms);
}

// Eenmalig, daarna nooit meer vanzelf (cues moeten zichzelf uitdoven).
function maybeShowDiffHeatCue() {
  try {
    if (localStorage.getItem("jaardle:diffcue")) return;
    localStorage.setItem("jaardle:diffcue", "1");
    setTimeout(() => openDiffHeat(3000), 800);
  } catch (e) { /* geen storage → geen cue */ }
}

function renderEvent() {
  els.eventText.innerHTML = "";
  const slides = factSlides();
  factSlideIndex = Math.max(0, Math.min(factSlideIndex, slides.length - 1));

  const carousel = document.createElement("div");
  carousel.className = "fact-carousel";
  const track = document.createElement("div");
  track.className = "fact-track";
  slides.forEach((s) => {
    const slide = document.createElement("div");
    slide.className = "fact-slide";
    if (s.kind === "extra") {
      // Gele zelfde-tijd-extra: 💡 + label boven het feit.
      slide.classList.add("slide-extra");
      slide.appendChild(buildSlideTag("extra-tag", "extra-icon", "💡", t("extra_label")));
      slide.appendChild(factParagraph(s[lang] || s[DEFAULT_LANG], "fact-extra"));
    } else if (s.kind === "later") {
      // ⏩ (oranje): slot i = gebeurtenis uit ±LATER_WINDOWS[i] jaar later. Meer ⏩'s
      // naarmate je verder vooruitspringt (100→⏩, 250→⏩⏩, 500→⏩⏩⏩, 1000→⏩⏩⏩⏩).
      slide.classList.add("slide-later");
      const ff = "⏩".repeat(Math.min(s.slot + 1, 4));
      slide.appendChild(buildSlideTag("later-tag", "later-icon", ff, t("later_label")(laterWindow(s.slot))));
      slide.appendChild(factParagraph(s.text, "fact-later"));
    } else if (s.kind === "century") {
      // 🏛️ eeuw-band + grove periode (educatief): bv. "1500–1599" · "Renaissance".
      slide.classList.add("slide-century");
      slide.appendChild(buildSlideTag("century-tag", "century-icon", "🏛️", t("century_label")));
      slide.appendChild(hintValue(s.text));
      if (s.sub) {
        const sub = document.createElement("div");
        sub.className = "hint-sub";
        sub.textContent = s.sub;
        slide.appendChild(sub);
      }
    } else if (s.kind === "digit") {
      // 🔢 laatste cijfer (blauw).
      slide.classList.add("slide-digit");
      slide.appendChild(buildSlideTag("digit-tag", "digit-icon", "🔢", t("digit_label")));
      slide.appendChild(hintValue(s.text));
    } else {
      // Hoofdfeit: 💡 + "Dit jaar"-kopje, zelfde gele stijl als de zelfde-tijd-extra.
      slide.classList.add("slide-main");
      slide.appendChild(buildSlideTag("extra-tag", "extra-icon", "💡", t("main_label")));
      slide.appendChild(factParagraph(s[lang] || s[DEFAULT_LANG], ""));
    }
    track.appendChild(slide);
  });
  carousel.appendChild(track);
  els.eventText.appendChild(carousel);

  if (slides.length > 1) {
    const dots = document.createElement("div");
    dots.className = "fact-dots";
    // Stip = de emoji van z'n hint (💡 hoofdfeit/extra · ⏩ 100 jaar later ·
    // 🏛️ eeuw · 🔢 cijfer). Geen kleurvlakjes: de actieve emoji licht op, de rest
    // is gedimd. Het venster toont er maar een paar (zie positionDots) en schuift
    // mee met de actieve — een kleine carrousel. Zo zie je wélke hint waar staat.
    const track = document.createElement("div");
    track.className = "fact-dots-track";
    const DOT_EMOJI = { main: "💡", extra: "💡", later: "⏩", century: "🏛️", digit: "🔢" };
    slides.forEach((s, i) => {
      const d = document.createElement("button");
      d.type = "button";
      d.className = `fact-dot k-${s.kind}` + (i === factSlideIndex ? " active" : "");
      d.textContent = DOT_EMOJI[s.kind] || "•";
      d.setAttribute("aria-label", `${i + 1}/${slides.length}`);
      d.addEventListener("click", () => goToSlide(i));
      track.appendChild(d);
    });
    dots.appendChild(track);
    els.eventText.appendChild(dots);
  }
  // Grote ‹ ›-knoppen flankeren de kaart (klik links = terug, rechts = verder);
  // ze verschijnen pas zodra er meer dan één feit is.
  if (els.factPrev) els.factPrev.hidden = slides.length <= 1;
  if (els.factNext) els.factNext.hidden = slides.length <= 1;
  applyFactTransform(false);
  updateFactDots();
  renderDiffHeat();
}

// Verschuif de track naar de actieve slide (animate=false bij (her)opbouw).
function applyFactTransform(animate) {
  const track = els.eventText.querySelector(".fact-track");
  if (!track) return;
  track.style.transition = animate ? "transform 0.25s ease" : "none";
  track.style.transform = `translateX(${-factSlideIndex * 100}%)`;
}

// Schuif het emoji-stippen-venster zodat de actieve (zo veel mogelijk) in het
// midden staat. Het venster toont DOT_WIN stippen; bij ≤ DOT_WIN passen ze
// allemaal (geen schuif). DOT_SLOT moet exact de CSS-slotbreedte zijn.
const DOT_SLOT = 18;   // px — gelijk aan .fact-dot flex-basis
const DOT_WIN = 3;     // hoeveel stippen tegelijk zichtbaar
function positionDots() {
  const wrap = els.eventText.querySelector(".fact-dots");
  const track = els.eventText.querySelector(".fact-dots-track");
  if (!wrap || !track) return;
  const n = track.children.length;
  wrap.style.maxWidth = (Math.min(n, DOT_WIN) * DOT_SLOT) + "px";
  const start = Math.max(0, Math.min(factSlideIndex - 1, n - DOT_WIN));
  track.style.transform = `translateX(${-start * DOT_SLOT}px)`;
}

function updateFactDots() {
  els.eventText.querySelectorAll(".fact-dot")
    .forEach((d, i) => d.classList.toggle("active", i === factSlideIndex));
  positionDots();
  const n = factSlides().length;
  if (els.factPrev) els.factPrev.disabled = factSlideIndex <= 0;
  if (els.factNext) els.factNext.disabled = factSlideIndex >= n - 1;
}

function goToSlide(i) {
  const n = factSlides().length;
  factSlideIndex = Math.max(0, Math.min(i, n - 1));
  applyFactTransform(true);
  updateFactDots();
}


// Elke hint-knop is de trigger; een druk voegt een gekleurde slide toe aan de
// carrousel (⏩/🏛️/🔢). 🧭 richting wijst naar je laatste gok (pijl op de gok-rij).
function renderHintStatus() {
  const dirsLeft = MAX_DIRECTION_HINTS - state.directionsRevealed.length;
  const hasUnrevealedGuess =
    state.guesses.length > 0 &&
    !state.directionsRevealed.includes(state.guesses.length - 1);
  const availLater = availableLaterClues();
  if (els.hintBtnLater) {
    els.hintBtnLater.hidden = state.done || state.laterCluesShown >= availLater;
    // Het label volgt de vólgende onthulling: eerst "100 jaar later", daarna "250".
    const laterLbl = els.hintBtnLater.querySelector("[data-i18n]");
    if (laterLbl) laterLbl.textContent = t("hint_later_n")(laterWindow(state.laterCluesShown));
  }
  els.hintBtnDir.hidden = state.done || dirsLeft <= 0 || !hasUnrevealedGuess;
  if (els.hintBtnCentury) els.hintBtnCentury.hidden = state.done || state.centuryRevealed;
  if (els.hintBtnDigit) els.hintBtnDigit.hidden = state.done || state.lastDigitRevealed;
  // Gekochte 🏛️/🔢 morpht naar een waarde-chip op de knop-plek: de band/het cijfer
  // blijft in beeld tijdens het gokken (het "welke eeuw was het ook alweer?"-gat).
  // Chip = écht gekocht — de verlies-onthulling in de carrousel voegt er geen toe.
  renderHintChip(els.hintChipCentury, state.centuryRevealed, "🏛️",
    () => centuryBand(state.event.year), "century_label");
  renderHintChip(els.hintChipDigit, state.lastDigitRevealed, "🔢",
    () => String(Math.abs(state.event.year) % 10), "digit_label");
  // Teller: ⏩ "100 jaar later" (altijd /2 zodra geladen — verraadt de toekomst-variant
  // niet) + 🧭 richtingen.
  const laterPart = availLater > 0 ? `⏩ ${state.laterCluesShown}/${availLater} · ` : "";
  els.hintCount.textContent = `${laterPart}🧭 ${state.directionsRevealed.length}/${MAX_DIRECTION_HINTS} ${t("dir_word")}`;
}

// Vul één 🏛️/🔢-waarde-chip (zie renderHintStatus). value is lazy zodat er
// niets berekend wordt vóór onthulling of zonder geladen event.
function renderHintChip(el, revealed, emoji, value, labelKey) {
  if (!el) return;
  const show = !!(revealed && state?.event);
  el.hidden = !show;
  if (!show) return;
  const v = value();
  el.textContent = `${emoji} ${v}`;
  el.setAttribute("aria-label", `${t(labelKey)}: ${v}`);
}

// Honderdtal-blok van een jaartal als leesbaar bereik: 1850 → "1800–1899",
// 490 → "400–499", -500 → "500–401 v.Chr." (BC telt aflopend).
function centuryBand(year) {
  const start = Math.floor(year / 100) * 100;
  const end = start + 99;
  if (end < 0) return `${Math.abs(start)}–${Math.abs(end)} ${t("bc")}`;   // beide BC
  if (start < 0) return `${Math.abs(start)} ${t("bc")}–${end}`;           // over jaar 0 heen
  return `${start}–${end}`;
}

// Grove historische periode bij een jaartal — puur educatief naast de eeuw-band.
// Brede, herkenbare indeling (Westers, met fuzzy grenzen op eeuwgrenzen).
function eraName(year) {
  const eras = [
    { max: 500,      nl: "Oudheid",           en: "Antiquity",        de: "Antike",         es: "Antigüedad",          pt: "Antiguidade" },
    { max: 1500,     nl: "Middeleeuwen",      en: "Middle Ages",      de: "Mittelalter",    es: "Edad Media",          pt: "Idade Média" },
    { max: 1600,     nl: "Renaissance",       en: "Renaissance",      de: "Renaissance",    es: "Renacimiento",        pt: "Renascimento" },
    { max: 1800,     nl: "Vroegmoderne tijd", en: "Early modern era", de: "Frühe Neuzeit",  es: "Edad Moderna",        pt: "Idade Moderna" },
    { max: 2000,     nl: "Moderne tijd",      en: "Modern era",       de: "Moderne",        es: "Edad Contemporánea",  pt: "Idade Contemporânea" },
    { max: Infinity, nl: "21e eeuw",          en: "21st century",     de: "21. Jahrhundert", es: "Siglo XXI",          pt: "Século XXI" },
  ];
  const e = eras.find((x) => year < x.max);
  return e[lang] || e[DEFAULT_LANG];
}

// ⏩-clues: gebeurtenissen uit exact antwoordjaar + {100, 250, 500, 1000}
// (deterministisch per antwoord-hash via get_century_clues) — grof tijdperk +
// impliciet richting (antwoord ligt vóór die gebeurtenis). Opgevraagd via de
// ⏩-knop (kost punten, één per venster) en getoond als oranje carrousel-slides.
// De gratis zelfde-tijd-extra's staan los hiervan (die staan vanaf de start in de
// carrousel, zie factSlides). Fallback "toekomst" als antwoordjaar+venster > nu.

// ⏩-clue venster-afstanden (jaar ná het antwoord), in onthul-volgorde. Eén plek
// om een venster toe te voegen: labels/teksten zijn taal-geparametriseerd op het
// jaartal, en get_century_clues levert per venster kandidaat-feiten.
const LATER_WINDOWS = [100, 250, 500, 1000, 1500];
// We doen ALTIJD alsof alle vensters bestaan (zodra de data binnen is), zodat de
// teller "x/N" niets verraadt: een korter wordende teller zou al lekken dat een
// venster in de toekomst valt (en dus dat het antwoord recent is) zónder dat je
// een clue gebruikt.
const LATER_CLUE_SLOTS = LATER_WINDOWS.length;
function laterWindow(i) { return LATER_WINDOWS[i] ?? LATER_WINDOWS[LATER_WINDOWS.length - 1]; }
function availableLaterClues() {
  return state?.laterClues ? LATER_CLUE_SLOTS : 0;
}

// Tekst voor clue-slot i (venster = LATER_WINDOWS[i]). Elk slot is óf een
// toekomst-markering ({future:true}), óf het echte feit ({nl,en,de}), óf leeg
// (null → "geen bekend"). Teksten zijn per venster geparametriseerd op het
// jaartal, dus elk slot staat op zichzelf (geen aanname over andere slots).
// Valt terug op het oude {future,clues}-model voor een nog-niet-herladen client.
function laterSlotText(i) {
  const cc = state?.laterClues;
  if (!cc) return null;
  const y = laterWindow(i);
  // Nieuw: meerdere feiten uit exact jaar+venster + één gekozen index
  // (state.laterPick) zodat dezelfde slot stabiel blijft binnen één potje maar
  // varieert tussen potjes (zie chooseLaterPicks).
  if (Array.isArray(cc.slot_cands)) {
    const cand = cc.slot_cands[i];
    if (!cand) return t("later_none")(y);
    if (cand.future) return t("later_future")(y);
    const list = cand.facts || [];
    if (!list.length) return t("later_none")(y);
    const idx = (state.laterPick && state.laterPick[i]) || 0;
    const f = list[idx % list.length];
    return f[lang] || f[DEFAULT_LANG];
  }
  if (Array.isArray(cc.slots)) {
    const slot = cc.slots[i];
    if (!slot) return t("later_none")(y);
    if (slot.future) return t("later_future")(y);
    return slot[lang] || slot[DEFAULT_LANG];
  }
  // Legacy: alle slots kwamen uit jaar+100.
  if (cc.future) return t("later_future")(laterWindow(0));
  const f = (cc.clues || [])[i];
  if (f) return f[lang] || f[DEFAULT_LANG];
  return t("later_none")(y);
}

// Onthul de volgende ⏩-clue (kost punten): voeg 'm als nieuwe oranje slide toe en
// schuif erheen.
function requestLaterClue() {
  if (state.done) return;
  if (state.laterCluesShown >= availableLaterClues()) return;
  state.laterCluesShown += 1;
  markPaidHintUsed();
  renderEvent();
  renderHintStatus();
  goToHintSlide("later");
  updateLiveScore(true);
  save();
}

// Haal de clue(s) op (uit de board-cache of via RPC). Idempotent; herrendert
// carrousel + knoppen zodra de data binnen is.
async function loadLaterClues() {
  if (!state) return;
  // Al gecachet — maar herhaal de RPC als de cache uit een tijd met minder
  // vensters komt (bv. een potje dat over een deploy heen liep), zodat de nieuwe
  // 500/1000-slots alsnog gevuld raken.
  if (state.laterClues && (state.laterClues.slot_cands?.length || 0) >= LATER_CLUE_SLOTS) {
    renderHintStatus(); return;
  }
  const hash = state.hashes?.[0];
  if (!hash) return;
  let res = null;
  try { res = await rpc("get_century_clues", { p_hash: hash }); } catch (e) { /* offline */ }
  // De speler kan intussen van modus zijn gewisseld; alleen toepassen als de
  // puzzel nog dezelfde is.
  if (!state || state.hashes?.[0] !== hash) return;
  state.laterClues = res || { future: false, clues: [] };
  chooseLaterPicks();
  save();
  renderEvent();
  renderHintStatus();
}

// Kies één feit per ⏩-slot uit het kandidaten-venster. Oefenmodus: willekeurig
// (variatie bij replay van hetzelfde antwoord). Daily: altijd het dichtstbije
// (index 0) → deterministisch, dus dezelfde clue op al je apparaten. Eén keer
// gekozen en in state bewaard, zodat de slide stabiel blijft bij herrenderen en
// herladen.
function chooseLaterPicks() {
  const cc = state?.laterClues;
  if (!cc || !Array.isArray(cc.slot_cands)) return;
  if (Array.isArray(state.laterPick) && state.laterPick.length === cc.slot_cands.length) return;
  state.laterPick = cc.slot_cands.map((cand) => {
    const n = (cand && !cand.future && Array.isArray(cand.facts)) ? cand.facts.length : 0;
    if (n <= 1 || state.mode !== "free") return 0;
    return Math.floor(Math.random() * n);
  });
}

function requestDirectionHint() {
  if (state.done) return;
  if (state.directionsRevealed.length >= MAX_DIRECTION_HINTS) return;
  if (state.guesses.length === 0) return;
  const latestIdx = state.guesses.length - 1;
  if (state.directionsRevealed.includes(latestIdx)) return;
  state.directionsRevealed.push(latestIdx);
  markPaidHintUsed();
  renderHintStatus();
  renderGuesses();
  // Pop-animatie op het zojuist onthulde pijltje. Double-rAF zodat de
  // browser de fresh arrow eerst paint zonder class, dan de class als
  // state-overgang detecteert. Class blijft staan — keyframes eindigen
  // op scale(1) dus geen cleanup nodig.
  const rows = els.guesses.querySelectorAll(".guess-row");
  const arrow = rows[latestIdx]?.querySelector(".delta-badge .arrow");
  if (arrow) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      arrow.classList.add("just-revealed");
    }));
  }
  updateLiveScore(true);
  save();
}

function requestCenturyHint() {
  if (state.done || state.centuryRevealed) return;
  state.centuryRevealed = true;
  markPaidHintUsed();
  renderEvent();
  renderHintStatus();
  goToHintSlide("century");   // voeg de 🏛️-band-slide toe en schuif erheen
  updateLiveScore(true);
  save();
}

function requestLastDigit() {
  if (state.done || state.lastDigitRevealed) return;
  state.lastDigitRevealed = true;
  markPaidHintUsed();
  renderEvent();
  renderHintStatus();
  goToHintSlide("digit");   // voeg de 🔢-cijfer-slide toe en schuif erheen
  updateLiveScore(true);
  save();
}

// --- Hint-nudge -------------------------------------------------------------
// Eenmalig duwtje voor spelers die zonder hints stranden: bij gok 5 (één poging
// over), nog ver van het doel én geen enkele betaalde hint dit potje. Dooft
// zichzelf uit: nooit meer zodra ooit een hint is gebruikt, en max 3× ooit.
// (Data: 61% van de daily-verliezers was hintloos; winnaars pakken 🔢 3× vaker.)
const HINT_NUDGE_MAX = 3;

function markPaidHintUsed() {
  try { localStorage.setItem("jaardle:hintused", "1"); } catch (e) {}
  document.getElementById("hint-nudge")?.remove();
}

function maybeShowHintNudge() {
  if (state.done || state.guesses.length !== MAX_GUESSES - 1) return;
  if (state.laterCluesShown > 0 || state.directionsRevealed.length > 0 ||
      state.centuryRevealed || state.lastDigitRevealed) return;
  const closest = Math.min(...state.guesses.map((g) => Math.abs(g.diff)));
  if (closest <= 25) return;   // al warm — dan geen bemoeienis
  try {
    if (localStorage.getItem("jaardle:hintused")) return;
    const seen = Number(localStorage.getItem("jaardle:nudged") || 0);
    if (seen >= HINT_NUDGE_MAX) return;
    localStorage.setItem("jaardle:nudged", String(seen + 1));
  } catch (e) {}
  document.getElementById("hint-nudge")?.remove();
  const el = document.createElement("p");
  el.id = "hint-nudge";
  el.className = "hint-nudge";
  el.textContent = t("hint_nudge")(LAST_DIGIT_PENALTY);
  document.getElementById("hint-row")?.after(el);
  setTimeout(() => el.remove(), 8000);   // dooft vanzelf uit
}

const RANGE_LABELS = {
  veryclose: "1–2",
  close: "3–10",
  warm: "11–25",
  cool: "26–50",
  far: "51–200",
  distant: "201–599",
  farthest: "600+",
};

// Score: 100 - sum(penalty per wrong guess) - hint penalties.
const GUESS_PENALTIES = {
  correct: 0,
  veryclose: 2,
  close: 5,
  warm: 8,
  cool: 11,
  far: 13,
  distant: 15,
  farthest: 23,
};
// 5 → 3 (2026-07-14): audit liet zien dat 🧭 per punt het minst opleverde —
// gebruikers eindigden in rating én score structureel onder hintloze spelers.
// Loopt in de pas met de rating-straf 0.03 in graded_score (db/25).
const DIRECTION_HINT_PENALTY = 3;
// 27 → 23 (2026-07-11): data liet zien dat de eeuw-hint te duur was — gebruikers
// verloren er per saldo rating op t.o.v. hintloze spelers op dezelfde feiten.
// Loopt in de pas met de rating-straf 0.23 in graded_score (db/21).
const CENTURY_HINT_PENALTY = 23;
const LATER_CLUE_PENALTY = 3;   // per opgevraagde "100 jaar later"-clue (⏩-knop)
const LAST_DIGIT_PENALTY = 10;  // 🔢 laatste cijfer van het jaartal onthullen

// Verlies = geen harde 0, maar een lage band op basis van je dichtste gok.
// Zo krijgt de pechvogel die steeds vlak zat krediet (max 10), terwijl de
// verdwaalde speler op 0 blijft. Altijd onder een winst.
const LOSS_SCORES = {
  correct: 0, veryclose: 10, close: 6, warm: 4, cool: 2, far: 0, distant: 0, farthest: 0,
};

// Live "potentiële" score: 100 minus alle tot nu toe verdiende strafpunten
// (misgokken + opgevraagde hints). Vloer op 0. Gelijk aan de eindscore als je nú
// zou winnen — dit is wat de teller onder de stippen toont.
function liveScore() {
  let s = 100;
  for (const g of state.guesses) s -= GUESS_PENALTIES[g.cls] || 0;
  s -= state.directionsRevealed.length * DIRECTION_HINT_PENALTY;
  s -= state.laterCluesShown * LATER_CLUE_PENALTY;
  if (state.centuryRevealed) s -= CENTURY_HINT_PENALTY;
  if (state.lastDigitRevealed) s -= LAST_DIGIT_PENALTY;
  return Math.max(0, s);
}

function computeScore() {
  if (!state.won) {
    // Lage troost-band o.b.v. je dichtste gok — maar nooit méér dan je (door
    // straffen aangetaste) score. Zit je al op 0, dan blijft het 0.
    let band = 0;
    for (const g of state.guesses) band = Math.max(band, LOSS_SCORES[g.cls] || 0);
    return Math.min(band, liveScore());
  }
  return liveScore();
}

// De zichtbaar getoonde score (voor de tel-animatie). Telt bij een misgok/hint
// zichtbaar omlaag van de oude naar de nieuwe waarde.
let scoreShown = 100;

// Werk de live-score onder de stippen bij. animate=true → tel zichtbaar omlaag.
// Verborgen zodra het spel klaar is (het eindscherm toont dan de score).
function updateLiveScore(animate) {
  const box = els.scoreBox, val = els.scoreVal;
  if (!box || !val) return;
  if (!state || state.done) { box.hidden = true; return; }
  box.hidden = false;
  const target = liveScore();
  box.classList.toggle("low", target < 40);
  if (!animate || scoreShown === target) {
    scoreShown = target;
    val.textContent = target;
    return;
  }
  const from = scoreShown;
  const t0 = performance.now();
  const dur = 550;
  box.classList.add("ticking");
  function frame(now) {
    const p = Math.min(1, (now - t0) / dur);
    // ease-out zodat de laatste tellen rustig uitlopen
    const e = 1 - Math.pow(1 - p, 3);
    val.textContent = Math.round(from + (target - from) * e);
    if (p < 1) { requestAnimationFrame(frame); }
    else { scoreShown = target; val.textContent = target; box.classList.remove("ticking"); }
  }
  requestAnimationFrame(frame);
}

// Tiers: hoogste eerst. Eerste match wint.
const SCORE_TIERS = [
  { min: 100, key: "perfect",    label: "Perfect",            emoji: "🏆" },
  { min: 80,  key: "impressive", label: "Indrukwekkend",      emoji: "🥇" },
  { min: 60,  key: "good",       label: "Goed",               emoji: "🥈" },
  { min: 40,  key: "solid",      label: "Solide",             emoji: "🥉" },
  { min: 1,   key: "justmade",   label: "Net gehaald",        emoji: "😅" },
  { min: 0,   key: "lost",       label: "Volgende keer beter", emoji: "💀" },
];

const LOST_TIER = SCORE_TIERS.find((t) => t.key === "lost");

// Bij verlies altijd de verlies-tier (💀), ongeacht de 0–10-score — anders zou
// een verlies van 1+ de "Net gehaald"-tier pakken.
function scoreTier(score, won = true) {
  if (!won) return LOST_TIER;
  return SCORE_TIERS.find((t) => score >= t.min);
}

// Vul de uitleg-tekst met de actuele constanten (zo hoef je bij tweaks niks
// in de HTML te wijzigen).
function renderHelpConstants() {
  const map = {
    veryclose: GUESS_PENALTIES.veryclose,
    close:     GUESS_PENALTIES.close,
    warm:      GUESS_PENALTIES.warm,
    cool:      GUESS_PENALTIES.cool,
    far:       GUESS_PENALTIES.far,
    distant:   GUESS_PENALTIES.distant,
    farthest:  GUESS_PENALTIES.farthest,
    "later-clue": LATER_CLUE_PENALTY,
    "dir-hint": DIRECTION_HINT_PENALTY,
    "century-hint": CENTURY_HINT_PENALTY,
    "digit-hint": LAST_DIGIT_PENALTY,
  };
  document.querySelectorAll("[data-penalty]").forEach((el) => {
    const key = el.dataset.penalty;
    if (key in map) el.textContent = `-${map[key]}`;
  });
  const helpMap = {
    "max-guesses": MAX_GUESSES,
    "max-dir-hints": MAX_DIRECTION_HINTS,
  };
  document.querySelectorAll("[data-help]").forEach((el) => {
    const key = el.dataset.help;
    if (key in helpMap) el.textContent = String(helpMap[key]);
  });
  const tiers = document.querySelector('[data-help="tiers"]');
  if (tiers) {
    tiers.textContent = SCORE_TIERS.map((t) => {
      const range = t.min === 100 ? "100" : (t.min === 0 ? "0" : `${t.min}+`);
      return `${t.emoji} ${range}`;
    }).join(" · ");
  }
}

function renderDeltaBadge(badge, diff, cls, showDirection) {
  badge.textContent = "";
  if (cls === "correct") { badge.textContent = "✓"; return; }
  if (showDirection) {
    const arrow = document.createElement("span");
    arrow.className = "arrow";
    arrow.textContent = diff > 0 ? "↑" : "↓";
    badge.appendChild(arrow);
    badge.appendChild(document.createTextNode(` ${RANGE_LABELS[cls]}`));
  } else {
    badge.textContent = RANGE_LABELS[cls];
  }
}

function renderGuesses() {
  els.guesses.innerHTML = "";
  const revealedSet = new Set(state.directionsRevealed);
  for (let idx = 0; idx < MAX_GUESSES; idx++) {
    const g = state.guesses[idx];
    if (g) {
      const row = document.createElement("div");
      row.className = `guess-row ${g.cls}`;
      const yr = document.createElement("span");
      yr.className = "year";
      yr.textContent = g.year;
      const badge = document.createElement("span");
      badge.className = `delta-badge ${g.cls}`;
      // Pijl alleen op rijen waar de 🧭-hint is gebruikt — óók na afloop. Live wordt
      // het bord na finishGame niet herrenderd, dus "toon alles bij done" verscheen
      // alleen na een reload en wiste dan juist wáár je de hint had ingezet.
      const showDir = revealedSet.has(idx);
      renderDeltaBadge(badge, g.diff, g.cls, showDir);
      row.append(yr, badge);
      const penalty = GUESS_PENALTIES[g.cls] || 0;
      if (penalty > 0) {
        const pen = document.createElement("span");
        pen.className = "penalty";
        pen.textContent = `−${penalty}`;
        row.appendChild(pen);
      }
      els.guesses.appendChild(row);
    } else {
      const row = document.createElement("div");
      row.className = "guess-row empty";
      const slot = document.createElement("span");
      slot.className = "slot-num";
      slot.textContent = `${idx + 1}`;
      row.appendChild(slot);
      els.guesses.appendChild(row);
    }
  }
}

function showConfetti() {
  const colors = ["#4caf50", "#ab47bc", "#f4c430", "#ff9800", "#e53935", "#8b5a2b", "#6ea8ff"];
  const container = document.createElement("div");
  container.className = "confetti-container";
  for (let i = 0; i < 80; i++) {
    const piece = document.createElement("div");
    piece.className = "confetti-piece";
    piece.style.left = Math.random() * 100 + "vw";
    piece.style.background = colors[Math.floor(Math.random() * colors.length)];
    piece.style.animationDelay = Math.random() * 0.6 + "s";
    piece.style.animationDuration = 2.5 + Math.random() * 2 + "s";
    container.appendChild(piece);
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), 5000);
}

// Groots vuurwerk voor een first-try-winst: meerdere bursts die na elkaar
// ontploffen, elk een ring deeltjes die naar buiten schiet (met een beetje
// zwaartekracht). Bewust forser dan de confetti — dit is de zeldzame topscore.
function showFireworks() {
  // Wit spat het mooist op donker; op het lichte thema is het onzichtbaar → leigrijs.
  const spark = currentTheme() === "light" ? "#37474f" : "#ffffff";
  const colors = ["#4caf50", "#ab47bc", "#f4c430", "#ff9800", "#e53935", "#6ea8ff", "#ff5fa2", spark];
  const container = document.createElement("div");
  container.className = "fireworks-container";
  const bursts = 26;
  let maxEnd = 0;
  for (let b = 0; b < bursts; b++) {
    const cx = 8 + Math.random() * 84;             // vw
    const cy = 8 + Math.random() * 60;             // vh
    const color = colors[Math.floor(Math.random() * colors.length)];
    const delay = b * 0.16 + Math.random() * 0.14; // s, dicht op elkaar → veel tegelijk
    const particles = 36 + Math.floor(Math.random() * 20);
    const radius = 110 + Math.random() * 130;      // px
    const dur = 1.1 + Math.random() * 0.7;         // s
    maxEnd = Math.max(maxEnd, delay + dur);
    for (let i = 0; i < particles; i++) {
      const ang = (i / particles) * Math.PI * 2 + Math.random() * 0.25;
      const dist = radius * (0.55 + Math.random() * 0.45);
      const p = document.createElement("div");
      p.className = "firework-particle";
      p.style.left = cx + "vw";
      p.style.top = cy + "vh";
      const sz = 5 + Math.random() * 5;             // wat variatie in grootte
      p.style.width = p.style.height = `${sz}px`;
      p.style.color = color;                        // box-shadow gebruikt currentColor
      p.style.background = color;
      p.style.setProperty("--dx", `${Math.cos(ang) * dist}px`);
      p.style.setProperty("--dy", `${Math.sin(ang) * dist + 60}px`); // +zwaartekracht
      p.style.setProperty("--delay", `${delay}s`);
      p.style.setProperty("--dur", `${dur}s`);
      container.appendChild(p);
    }
  }
  document.body.appendChild(container);
  setTimeout(() => container.remove(), (maxEnd + 0.5) * 1000);
}

function finishGame(won, fresh = false) {
  state.done = true;
  state.won = won;
  document.getElementById("hint-nudge")?.remove();   // duwtje is niet meer relevant
  save();
  setKeypadDisabled(true);
  renderEvent();   // herbouw de carrousel: na afloop tonen we álle hints
  updateLiveScore(false);   // spel klaar → live-teller verbergen (eindscherm toont de score)
  els.result.hidden = false;
  els.revealRow.hidden = true;
  els.revealRow.innerHTML = "";
  const ev = state.event;
  const intro = won ? t("won_intro") : t("lost_intro");
  els.resultText.innerHTML = "";
  els.resultText.append(
    document.createTextNode(`${intro} `),
  );
  const yearBadge = document.createElement("span");
  yearBadge.className = "year-pill" + (fresh && won ? " win-pop" : "");
  yearBadge.textContent = ev.year;
  els.resultText.append(yearBadge);
  {
    const score = computeScore();
    const tier = scoreTier(score, won);
    const scoreLine = document.createElement("div");
    scoreLine.className = "score-line";
    // Alleen 🏆 (perfect) staat in ANIM_EMOJI en gaat bewegen; de andere
    // tier-emoji's komen als gewoon teken uit animEmojiHtml terug.
    scoreLine.innerHTML = `${animEmojiHtml(tier.emoji)} ${tierLabel(tier)} · ${score}/100`;
    armEmojiFallbacks(scoreLine);
    els.resultText.append(scoreLine);
  }
  els.source.innerHTML = ev.source
    ? `${t("source")} <a href="${ev.source}" target="_blank" rel="noopener">${displaySource(ev.source)}</a> · CC BY-SA`
    : "";
  // Verder-spelen-knop: in vrij spel het volgende rondje; na de daily de brug
  // naar vrij spel (na verlies als revanche geframed — hét "nog één potje"-moment).
  els.nextBtn.hidden = false;
  if (state.mode === "free") {
    els.nextBtn.textContent = t("next");
  } else if (isMakeup(state)) {
    // Inhaalpot afgerond → duw door naar de daily van vandaag (die houdt de streak
    // vanaf hier levend). De knop-handler herkent de inhaal-state.
    els.nextBtn.textContent = t("makeup_play_today");
  } else {
    els.nextBtn.innerHTML = withAnimEmoji(escHtml(t(won ? "free_again" : "free_revenge")));
    armEmojiFallbacks(els.nextBtn);
  }
  // De recap (verdeling + teamstand) is daily-only en blijft herbereikbaar via deze
  // knop — maar niet bij een inhaalpot (die telt niet mee op het dagbord van gisteren).
  if (els.recapBtn) els.recapBtn.hidden = state.mode !== "daily" || isMakeup(state);
  renderHintStatus();
  if (fresh && won) (state.guesses.length === 1 ? showFireworks : showConfetti)();
  if (fresh) recordAchvLocal();   // anonieme prestatie-tellers (vóór recordDailyResult — anders telt de seed vandaag dubbel)
  if (fresh && state.mode === "daily") recordDailyResult(won);
  appendStreakLine(won);   // 🔥-regel onder de score (daily-only; async, no-op bij free)
  // Bij een verse pot: eerst de play wegschrijven, DAARNA de globale stats ophalen,
  // zodat je eigen zojuist gespeelde pot meetelt (en bij een fact zonder eerdere
  // plays niet games:0 -> niks toont). Faalt het wegschrijven, toon dan alsnog.
  const statsHash = state.hashes?.[0];
  // Na het wegschrijven van de verse play: globale stats tonen, en bij de daily
  // het recap-scherm openen (verdeling pogingen + teamstand van vandaag).
  const afterSend = () => {
    showFactStats(statsHash);
    checkAchievements();   // unlock-regels op het eindscherm (ná record_play, dus de pot telt mee)
    // Recap (verdeling + teamstand van vandaag) hoort niet bij een inhaalpot.
    if (fresh && state.mode === "daily" && !isMakeup(state)) openDailyRecap();
  };
  if (fresh) sendTelemetry().then(afterSend, afterSend);
  else showFactStats(statsHash);
  if (isMakeup(state)) refreshMakeupBanner();   // gisteren nu gespeeld → banner weg
  else startDailyCountdown();
}

// Eén rij per afgerond spel naar de DB (fire-and-forget). Idempotent per puzzel
// zodat herladen/heropenen niet dubbel telt. Geen PII — anon of JWT (server-side).
function sendTelemetry() {
  const hash = state.hashes?.[0];
  if (!hash) return Promise.resolve();
  const slot = potSlot();
  const sentKey = `jaardle:sent:${hash}:${slot}`;
  if (localStorage.getItem(sentKey)) return Promise.resolve();
  try { localStorage.setItem(sentKey, "1"); } catch (e) {}
  const first = state.guesses[0];
  return rpc("record_play", {
    p_fact_hash: hash,
    p_attempts: Math.min(6, Math.max(1, state.guesses.length)),
    p_won: state.won,
    p_first_distance: first ? Math.abs(first.diff) : 0,
    p_text_hints_used: state.laterCluesShown,   // DB-kolom hergebruikt: # "100 jaar later"-clues
    p_dir_hints_used: state.directionsRevealed.length,
    p_century_hint_used: !!state.centuryRevealed,
    p_last_digit_used: !!state.lastDigitRevealed,
    p_mode: state.mode,
    p_puzzle_date: state.mode === "daily" ? (state.puzzleDate || todayKey()) : null,
    p_score: computeScore(),
    p_guesses: state.guesses.map((g) => g.year),  // voor cross-device reconstructie
  })
    .then((id) => {
      invalidateHistory();  // verse stats bij volgende opening
      showLiveRating();     // ⚡-regel op het eindscherm (alleen ingelogd)
      // Onthoud het rij-id zodat we de pot ná inloggen aan het account kunnen koppelen.
      try { if (id != null) localStorage.setItem(`jaardle:playid:${hash}:${slot}`, String(id)); } catch (e) {}
    })
    .catch(() => { try { localStorage.removeItem(sentKey); } catch (e) {} });
}

// Koppel een (anoniem) net-afgeronde pot aan het account dat zojuist inlogde, door
// de bestaande anon-rij om te punten via claim_play(id) — geen dubbele rij. Het
// id is door record_play teruggegeven en lokaal bewaard.
async function claimPlayOnLogin() {
  if (!auth.user || !state || !state.done) return;
  const hash = state.hashes?.[0];
  if (!hash) return;
  const slot = potSlot();
  const idKey = `jaardle:playid:${hash}:${slot}`;
  const id = localStorage.getItem(idKey);
  if (!id) return;
  let claimed = false;
  try { claimed = await rpc("claim_play", { p_id: Number(id) }); } catch (e) { return; }
  try { localStorage.removeItem(idKey); } catch (e) {}   // eenmalig proberen
  if (claimed) {
    invalidateHistory();
    if (!document.getElementById("modal-recap").hidden) renderRecap();  // pitch -> teamstand
  }
}

// Aftelklok tot de volgende dagpuzzel, onder de globale stats. Alleen in
// daily-modus; tikt elke seconde en stopt zodra de nieuwe daily klaarstaat.
let dailyCountdownTimer = null;
function stopDailyCountdown() {
  if (dailyCountdownTimer) { clearInterval(dailyCountdownTimer); dailyCountdownTimer = null; }
}
function startDailyCountdown() {
  stopDailyCountdown();
  els.result.querySelectorAll(".daily-countdown").forEach((e) => e.remove());
  if (state.mode !== "daily") return;
  const el = document.createElement("p");
  el.className = "daily-countdown";
  // Onder de Wikipedia-bron (#event-source). Valt terug op de actieknoppen/tekst
  // als de bron-regel onverhoopt ontbreekt.
  (els.source || document.getElementById("result-actions") || els.resultText).after(el);
  const tick = () => {
    const left = secsToNextDaily();
    if (left <= 0) {
      el.innerHTML = withAnimEmoji(t("daily_ready"));   // ✨ mag even fonkelen
      armEmojiFallbacks(el);
      stopDailyCountdown();
      return;
    }
    el.textContent = `${t("next_daily")} ${fmtCountdown(left)}`;
  };
  tick();
  dailyCountdownTimer = setInterval(tick, 1000);
}

// --- Inhaal-daily (streak-reparatie) ---------------------------------------
// Wie GISTEREN de daily miste, mag die vandaag (tot middernacht Europe/Amsterdam)
// alsnog spelen om z'n streak te redden. Alles sleutelt al op puzzle_date, dus een
// inhaalpot met puzzleDate=gisteren dicht het gat vanzelf in computeStats(). De
// pot telt NIET mee op het competitieve dagbord/dagzeges (server-side `late`-flag,
// db/26). We bieden 'm alleen aan bij een écht gat (gisteren niet gespeeld) mét
// een streak om te redden (eergisteren gewonnen).
const makeupDismissKey = () => `jaardle:makeupDismissed:${todayKey()}`;

async function makeupRepairInfo() {
  const yesterday = shiftDay(todayKey(), -1);
  const dayBefore = shiftDay(todayKey(), -2);
  // Gisteren mag niet vóór de eerste browsbare daily liggen.
  if (yesterday < EPOCH_KEY) return { eligible: false };
  let hist;
  try { hist = await dailyHistoryForDisplay(); } catch (e) { return { eligible: false }; }
  const played = new Set(hist.map((e) => e.date));
  const won = new Set(hist.filter((e) => e.won).map((e) => e.date));
  if (played.has(yesterday)) return { eligible: false };  // al gespeeld (win óf verlies)
  if (!won.has(dayBefore)) return { eligible: false };     // geen streak om te redden
  let streak = 0, c = dayBefore;
  while (won.has(c)) { streak += 1; c = shiftDay(c, -1); }
  return { eligible: true, streak, dayNum: dayNumForKey(yesterday), dateKey: yesterday };
}

let makeupCountdownTimer = null;
function stopMakeupCountdown() {
  if (makeupCountdownTimer) { clearInterval(makeupCountdownTimer); makeupCountdownTimer = null; }
}
function startMakeupCountdown() {
  stopMakeupCountdown();
  const span = document.querySelector("#makeup-banner .makeup-countdown");
  if (!span) return;
  const tick = () => {
    const left = secsToNextDaily();
    if (left <= 0) { stopMakeupCountdown(); refreshMakeupBanner(); return; }  // dag voorbij
    span.textContent = fmtCountdown(left);
  };
  tick();
  makeupCountdownTimer = setInterval(tick, 1000);
}

// Toon/verberg de inhaal-uitnodiging. Async: leest de (DB-)historie.
async function refreshMakeupBanner() {
  const el = document.getElementById("makeup-banner");
  if (!el) return;
  // Niet tijdens het spelen van de inhaalpot zelf, en niet als deze sessie 'm wegklikte.
  let dismissed = false;
  try { dismissed = !!localStorage.getItem(makeupDismissKey()); } catch (e) {}
  if (isMakeup(state) || dismissed) { stopMakeupCountdown(); el.hidden = true; return; }
  // Vóór het eerste auth-event weten we niet of de DB-historie (cross-device)
  // leidend is; toon dan nog niets — de sb-auth-changed-handler roept ons zo
  // opnieuw aan. Voorkomt de flits "speel gisteren!" die weer verdwijnt zodra
  // de DB meldt dat gisteren elders al gespeeld is.
  if (!auth.resolved) { el.hidden = true; return; }
  const info = await makeupRepairInfo();
  if (!info.eligible) { stopMakeupCountdown(); el.hidden = true; return; }
  el.innerHTML = `
    <span class="makeup-flame">${animEmojiHtml("🔥")}</span>
    <div class="makeup-text">
      <strong class="makeup-title">${escHtml(t("makeup_title"))}</strong>
      <span class="makeup-body">${escHtml(t("makeup_body")(info.streak, info.dayNum))}</span>
      <span class="makeup-left">⏳ <span class="makeup-countdown"></span></span>
    </div>
    <button class="makeup-cta" type="button">${escHtml(t("makeup_cta"))}</button>
    <button class="makeup-dismiss" type="button" aria-label="${escHtml(t("aria_close"))}">✕</button>`;
  armEmojiFallbacks(el);
  el.querySelector(".makeup-cta").onclick = startMakeup;
  el.querySelector(".makeup-dismiss").onclick = () => {
    try { localStorage.setItem(makeupDismissKey(), "1"); } catch (e) {}
    stopMakeupCountdown();
    el.hidden = true;
  };
  el.hidden = false;
  startMakeupCountdown();
}

// Start de inhaalpot van gisteren. Het daily-tabblad blijft actief (het ís een daily).
function startMakeup() {
  const yesterday = shiftDay(todayKey(), -1);
  stopMakeupCountdown();
  const el = document.getElementById("makeup-banner");
  if (el) el.hidden = true;
  els.tabs.forEach((tab) => tab.setAttribute("aria-selected", String(tab.dataset.mode === "daily")));
  startGame("daily", false, null, yesterday);
}

// --- Vrienden-pools (custom leaderboards) ----------------------------------
// Elke ingelogde speler kan in meerdere pools zitten (max LB_MAX_POOLS, cap ook
// in de DB — db/22). De UI toont altijd precies ÉÉN pool tegelijk (de "actieve",
// per apparaat onthouden in localStorage); wissel-chips verschijnen pas bij 2+
// pools, dus wie in één pool zit ziet het oude, ongewijzigde paneel. Het paneel
// toont je pool (daily live + aller-tijden nachtelijk) of een lege staat (pool
// maken / joinen). Uitnodigen via een deelbare code/link (?join=CODE) met
// Ja/Nee-bevestiging; joinen is additief (geen switch meer). De rating blijft
// globaal; een pool filtert enkel wie je op het bord ziet.
const LB_MAX_POOLS = 5;               // moet gelijklopen met de cap in join_pool/create_pool (db/22)
const ACTIVE_POOL_KEY = "jaardle:activePool";
let myPools = [];                     // alle pools van de speler, oudste eerst (my_pools)
let myPool = null;                    // de ACTIEVE pool {id,name,invite_code,is_owner,members,since} of null
let myUsername = null;                // zelfgekozen weergavenaam (profiles.username) of null
let myFlair = null;                   // zelfgekozen emoji-badge (profiles.flair) of null
let flairPickerOpen = false;          // flair-rooster ingeklapt tot je op ✏️ drukt (56 opties)
// Vaste flair-keuzes — moet gelijklopen met de allow-list in set_my_flair (09d_flair.sql).
const FLAIR_OPTIONS = ["🔥", "🕊️", "🎩", "👑", "🦊", "🐢", "🚀", "🥸", "🧠", "🍀", "🌟", "⚡", "🎲", "🦉", "🦫", "💎", "🐉", "🦄", "🐙", "💅", "🍻", "💥", "🎉", "🌌", "☄️", "🦞", "🍕", "☕",
  "🐐", "🦇", "🦖", "🐦‍🔥", "🦭", "🐺", "🐻", "🐼", "🐷", "🦁", "🐸", "🐧", "🐱", "🦈", "🦋", "🐍", "🐳", "🦥", "🦔", "🦩", "🐝", "🦀", "🦅", "🪿", "🫏", "🪰", "💩", "💀", "🍄", "🌈", "🫪", "🎻", "🪙"];
let pendingOpenLeaderboard = false;   // ?leaderboard-deeplink
let pendingOpenModal = null;          // ?rating / ?achievements-deeplink → modal-id
let pendingJoinCode = null;           // ?join=CODE-deeplink
let lbDailyDate = null;               // welke daily-dag het bord toont (browsen met ‹ ›)
let lbDailyReq = 0;                   // race-guard: alleen de laatste fetch mag renderen
let lbStatIndex = 0;                  // welke stat-kolom het all-time bord toont (‹ ›)
let lbOverall = [];                   // rating-bord (al geladen) — pagina 0, alleen actieve leden
let lbInactiveN = 0;                  // # leden verborgen wegens inactiviteit (7+ dagen) — "N verborgen"
let lbPoolStats = null;               // win%/score/streak — lazy bij eerste swipe, daarna cache

function escHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}


// Kies de actieve pool: de onthouden keuze als die nog bestaat, anders de oudste.
function pickActivePool() {
  let want = null;
  try { want = localStorage.getItem(ACTIVE_POOL_KEY); } catch (e) {}
  return myPools.find((p) => p.id === want) || myPools[0] || null;
}

function setActivePool(id) {
  try { localStorage.setItem(ACTIVE_POOL_KEY, id); } catch (e) {}
  myPool = myPools.find((p) => p.id === id) || myPools[0] || null;
}

// Haal álle pools van de ingelogde speler op en herbepaal de actieve.
async function fetchMyPools() {
  try { const rows = await rpc("my_pools", {}); myPools = Array.isArray(rows) ? rows : []; }
  catch (e) { myPools = []; }
  myPool = pickActivePool();
}

// Haal de pools van de ingelogde speler op; de 🏆-knop is zichtbaar zodra ingelogd.
async function refreshPoolState() {
  if (!auth.user) { myPools = []; myPool = null; renderMenu(); return; }
  await fetchMyPools();
  renderMenu();
}

// Wissel-chips tussen je pools — leeg (dus onzichtbaar) bij 0 of 1 pool, zodat
// de single-pool-flow er niets van merkt. De actieve pool is uitgelicht (.sel).
function poolChipsHtml() {
  if (myPools.length < 2) return "";
  return `<div class="lb-poolchips">` + myPools.map((p) =>
    `<button type="button" class="lb-chip${myPool && p.id === myPool.id ? " sel" : ""}" data-pool="${p.id}">${escHtml(p.name)}</button>`
  ).join("") + `</div>`;
}

function wirePoolChips(root, onSwitch) {
  root.querySelectorAll(".lb-chip[data-pool]").forEach((b) => {
    b.onclick = () => {
      if (myPool && b.dataset.pool === myPool.id) return;   // al actief
      setActivePool(b.dataset.pool);
      onSwitch();
    };
  });
}

// Handelt de ?leaderboard-, ?join-, ?rating- en ?achievements-deeplinks af zodra
// de auth-state binnen is. Uitgelogd → login-nudge bij bord/join (intentie blijft
// staan tot na login); rating en prestaties hebben een eigen anon-weergave en
// openen dus gewoon.
function maybeOpenLeaderboardDeeplink() {
  if (pendingJoinCode) {
    if (!auth.user) { openModal("modal-login"); return; }
    const code = pendingJoinCode; pendingJoinCode = null;
    try { localStorage.removeItem("jaardle:pendingJoin"); } catch (e) {}
    closeModal("modal-login");
    showJoinConfirm(code);
    return;
  }
  if (pendingOpenLeaderboard) {
    if (!auth.user) { openModal("modal-login"); return; }
    pendingOpenLeaderboard = false;
    closeModal("modal-login");
    openModal("modal-leaderboard");
    return;
  }
  if (pendingOpenModal) {
    const id = pendingOpenModal; pendingOpenModal = null;
    openModal(id);
  }
}

const lbMedal = (r) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : `${r}`);
const lbRowCls = (me) => (me ? "lb-row lb-me" : "lb-row");
// Podium-tint voor de top-3 (goud/zilver/koper) op alle borden.
const lbPodiumCls = (rank) => (rank >= 1 && rank <= 3 ? ` lb-top${rank}` : "");

// Flairs met een lokale Noto-animatie (/emoji/flair-*.webp): de nummer 1 van een
// bord draagt z'n flair geanimeerd. 🎩/🦫/🐷 hebben (nog) geen Noto-animatie en
// vallen terug op de CSS-"cheer" (.flair-fake-anim); 🔥 hergebruikt fire.webp.
const FLAIR_ANIM = {
  "🔥": "fire", "🕊️": "flair-dove", "👑": "flair-crown", "🦊": "flair-fox",
  "🐢": "flair-turtle", "🚀": "flair-rocket", "🥸": "flair-disguise", "🧠": "flair-brain",
  "🍀": "flair-clover", "🌟": "flair-glowing-star", "⚡": "flair-zap", "🎲": "flair-die",
  "🦉": "flair-owl", "💎": "flair-gem", "🐉": "flair-dragon", "🦄": "flair-unicorn",
  "🐙": "flair-octopus", "💅": "flair-nails", "🍻": "flair-beer",
  "💥": "flair-collision", "🎉": "flair-party", "🌌": "flair-milkyway",
  "☄️": "flair-comet", "🦞": "flair-lobster", "🍕": "flair-pizza", "☕": "flair-coffee",
  "🐐": "flair-goat", "🦇": "flair-bat", "🦖": "flair-trex", "🐦‍🔥": "flair-phoenix",
  "🦭": "flair-seal", "🐺": "flair-wolf", "🐻": "flair-bear", "🐼": "flair-panda",
  "🦁": "flair-lion", "🐸": "flair-frog", "🐧": "flair-penguin", "🐱": "flair-cat",
  "🦈": "flair-shark", "🦋": "flair-butterfly", "🐍": "flair-snake", "🐳": "flair-whale",
  "🦥": "flair-sloth", "🦔": "flair-hedgehog", "🦩": "flair-flamingo", "🐝": "flair-bee",
  "🦀": "flair-crab", "🪰": "flair-fly", "💩": "flair-poop", "💀": "flair-skull",
  "🍄": "flair-mushroom", "🎻": "flair-violin", "🪙": "flair-coin",
  "🦅": "flair-eagle", "🪿": "flair-goose", "🫏": "flair-donkey",
  "🌈": "flair-rainbow", "🫪": "flair-distorted",
  // Prestatie-flairs (unlockbaar via het 🏅-bord, gegate in set_my_flair/db33).
  "💯": "flair-hundred", "⏳": "flair-hourglass", "🗿": "flair-moai",
  "🦕": "flair-sauropod", "🥇": "flair-goldmedal",
};

// De 🥇 draagt z'n flair met trots: op rang 1 beweegt de flair (tenzij reduced-
// motion). Is er een Noto-webp → die; zo niet (🎩/🦫) → een CSS-"cheer" op het
// gewone teken zodat óók zij bewegen. Andere rijen tonen het statische teken.
function flairBadgeHtml(flair, rank) {
  if (!flair) return "";
  const animate = rank === 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches;
  const inner = animate ? flairPreviewHtml(flair) : escHtml(flair);
  return ` <span class="lb-flair-badge" data-flair="${escHtml(flair)}">${inner}</span>`;
}

// De geanimeerde vorm van een flair: de Noto-webp, of de CSS-cheer voor de
// flairs zonder webp (🐷/🎩/🦫).
function flairPreviewHtml(flair) {
  const file = FLAIR_ANIM[flair];
  return file
    ? `<img class="emoji-anim" src="/emoji/${file}.webp" alt="${escHtml(flair)}">`
    : `<span class="flair-fake-anim">${escHtml(flair)}</span>`;
}

// Hover over een flair-badge op een bord (of de teamstand in de recap) →
// animatie-voorproefje. Gedelegeerd op document: de borden re-renderen vaak.
// Rang 1 heeft al een permanente animatie in de badge en blijft af.
document.addEventListener("mouseover", (e) => {
  if (!(e.target instanceof Element)) return;
  const b = e.target.closest(".lb-flair-badge[data-flair]");
  if (!b || b.contains(e.relatedTarget) || b.querySelector(".emoji-anim, .flair-fake-anim")) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  b.dataset.preview = "1";
  b.innerHTML = flairPreviewHtml(b.dataset.flair);
});
document.addEventListener("mouseout", (e) => {
  if (!(e.target instanceof Element)) return;
  const b = e.target.closest(".lb-flair-badge[data-flair]");
  if (!b || !b.dataset.preview || b.contains(e.relatedTarget)) return;
  delete b.dataset.preview;
  b.textContent = b.dataset.flair;
});

const lbNameCell = (row, rank) =>
  escHtml(row.display_name) +
  flairBadgeHtml(row.flair, rank) +
  (row.is_me ? ` <span class="lb-tag">${t("lb_you")}</span>` : "");

// innerHTML + de laadfout-vangnetten voor eventuele geanimeerde flairs erin.
// Het nieuwe bord heeft zelden dezelfde hoogte als wat er stond: het rating-bord
// verbergt leden zonder potjes (games >= 1) terwijl get_pool_stats iedereen toont,
// en daily's verschillen per dag van deelnemers. Daarom vloeit de hoogte hier van
// oud naar nieuw i.p.v. te springen.
function setBoard(el, html) {
  clearTimeout(el._lbHeightTimer);
  const h0 = el.offsetHeight;   // mid-animatie = de zichtbare (geanimeerde) hoogte
  el.classList.remove("lb-loading");
  el.style.height = el.style.overflow = el.style.transition = "";
  el.innerHTML = html;
  armEmojiFallbacks(el);
  const h1 = el.offsetHeight;
  if (!h0 || h1 === h0 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  el.style.height = h0 + "px";
  el.style.overflow = "hidden";
  void el.offsetHeight;   // reflow, zodat de transition écht vanaf h0 vertrekt
  el.style.transition = "height 0.2s ease";
  el.style.height = h1 + "px";
  el._lbHeightTimer = setTimeout(() => {
    el.style.height = el.style.overflow = el.style.transition = "";
  }, 220);
}

// Wachtstand tijdens een fetch: laat de huidige tabel gedimd staan i.p.v. 'm te
// vervangen door één regel "Laden…" — anders klapt de lijst in en springt de
// modal heen en weer. Alleen als er nog geen tabel staat komt de laadtekst.
function setBoardLoading(el) {
  if (el.querySelector(".lb-table")) el.classList.add("lb-loading");
  else el.innerHTML = `<p class="lb-empty">${t("loading")}</p>`;
}

// De swipebare stat-kolommen van het all-time bord. Elke pagina sorteert dezelfde
// ledenlijst aflopend op z'n stat. Rating komt uit get_pool_leaderboard (pagina 0,
// al geladen); win%/score/streak uit get_pool_stats (lazy, zie renderStatBoard).
// Win%, gem. score en perfect-rate zijn vertekend bij weinig potjes (1 gewonnen
// = 100%), dus pas vanaf LB_MIN_RANKED_GAMES tellen die mee in de ranking. Spelers
// eronder staan onderaan, gedimd, met hun voortgang (x/min) i.p.v. een waarde.
const LB_MIN_RANKED_GAMES = 15;
// note: () => t("lb_scope_all") = bijschrift "alle games" voor stats die over
// daily + vrij spelen samen rekenen (rating telt óók alle plays mee — geen
// mode-filter in de elo-loop). Alleen Streak en Dagzeges zijn daily-only.
const LB_STATS = [
  // Rating eerst: de belangrijkste stat, en de openingspagina hergebruikt zo de
  // al-geladen get_pool_leaderboard-data (geen extra fetch bij openen).
  { key: "rating",      label: () => t("lb_stat_rating"),    val: (r) => `${r.rating}${r.is_provisional ? "?" : ""}`, note: () => t("lb_scope_all") },
  { key: "win_pct",     label: () => t("stat_winrate"),      val: (r) => `${r.win_pct}%`, gate: true, note: () => t("lb_scope_all") },
  { key: "avg_score",   label: () => t("stat_avgscore"),     val: (r) => `${r.avg_score}`, gate: true, note: () => t("lb_scope_all") },
  // Gem. pogingen: lager = beter (asc), en gegate net als win%/score want één
  // gewonnen potje in 1 gok zou anders bovenaan staan.
  { key: "avg_guesses", label: () => t("stat_avgtries"),     val: (r) => `${Number(r.avg_guesses || 0).toFixed(1)}`, gate: true, asc: true, note: () => t("lb_scope_all") },
  { key: "streak",      label: () => t("lb_stat_streak"),    val: (r) => `${r.streak}` },
  // Dagzeges tellen alleen dagen sinds je pool-lidmaatschap én met ≥2 deelnemers
  // die dag (db/23) — vandaar het bijschrift "sinds deelname".
  { key: "daily_wins",  label: () => t("lb_stat_dailywins"), val: (r) => `${r.daily_wins ?? 0}`, note: () => t("lb_scope_pool") },
  { key: "games",       label: () => t("stat_played"),       val: (r) => `${r.games}`, note: () => t("lb_scope_all") },
  // Perfect-rate: als rauwe teller was dit vrijwel een kloon van "Gespeeld"
  // (meer spelen = meer 100's); als percentage meet 'ie kwaliteit — daarom ook
  // gegated. Het absolute aantal blijft als klein bijschrift staan, maar telt
  // niet mee voor de ranking: sorteren gaat op sortVal en de medailles worden
  // gedeeld op alleen het percentage (rankVal), niet op de hele getoonde string.
  { key: "perfect",     label: () => t("lb_stat_perfect"),   gate: true,
    sortVal: (r) => (r.games ? (r.perfect || 0) / r.games : 0),
    rankVal: (r) => lbPerfectPct(r),
    val: (r) => `${lbPerfectPct(r)} <span class="lb-prov-n">${r.perfect ?? 0}×</span>`,
    note: () => t("lb_scope_all") },
];
const lbPerfectPct = (r) => `${(r.games ? ((r.perfect || 0) / r.games) * 100 : 0).toFixed(1)}%`;

const lbNameCmp = (a, b) =>
  String(a.display_name || "").localeCompare(String(b.display_name || ""), undefined, { sensitivity: "base" });
// Tiebreak bij gelijke stat-waarde: wie het eerst een daily speelde staat boven
// (zoals het daily-bord op created_at sorteert). Naam pas als laatste redmiddel.
const lbTieCmp = (a, b) => {
  const ta = a.first_played ? Date.parse(a.first_played) : Infinity;
  const tb = b.first_played ? Date.parse(b.first_played) : Infinity;
  return (ta - tb) || lbNameCmp(a, b);
};

function lbRow(rankCell, r, valCell, extraCls, rank) {
  return `<div class="lb-row${r.is_me ? " lb-me" : ""}${lbPodiumCls(rank)}${extraCls || ""}">` +
    `<span class="lb-rank">${rankCell}</span>` +
    `<span class="lb-name">${lbNameCell(r, rank)}</span>` +
    `<span class="lb-val">${valCell}</span></div>`;
}

// Competition-ranking over een al-gesorteerde lijst: wie dezelfde getoonde waarde
// heeft deelt de rang (en dus de medaille) — 100, 90, 90, 89 → 1, 2, 2, 4. De
// display-volgorde binnen een gelijkspel blijft staan; alleen het cijfer/de
// medaille wordt gedeeld. Tie = identieke getoonde string, zodat "zelfde getal →
// zelfde medaille" altijd klopt, los van verborgen sorteersleutels (bv. elo−2·rd).
function lbRanked(list, valFn) {
  let rank = 0, prev = null;
  return list.map((r, i) => {
    const v = valFn(r);
    if (i === 0 || v !== prev) { rank = i + 1; prev = v; }
    return [rank, r];
  });
}

function lbStatRows(list, valFn) {
  if (!list.length) return `<p class="lb-empty">${t("lb_empty_overall")}</p>`;
  return `<div class="lb-table">` +
    lbRanked(list, valFn).map(([rank, r]) => lbRow(lbMedal(rank), r, valFn(r), "", rank)).join("") + `</div>`;
}

// Gegate stat-bord (win%/score): gekwalificeerde spelers eerst, aflopend op de
// stat (tiebreak alfabetisch); spelers onder de drempel onderaan, gedimd, met
// hun potjes-voortgang i.p.v. een ranking-cijfer.
function lbGatedStatRows(list, stat) {
  if (!list.length) return `<p class="lb-empty">${t("lb_empty_overall")}</p>`;
  // asc-stats (gem. pogingen): lager = beter; een waarde van 0 betekent "nog geen
  // gewonnen potje" en hoort onderaan, niet bovenaan — dus naar Infinity.
  const sortKey = (r) => { const v = (stat.sortVal ? stat.sortVal(r) : r[stat.key]) || 0; return stat.asc && !v ? Infinity : v; };
  const ranked = list.filter((r) => (r.games || 0) >= LB_MIN_RANKED_GAMES)
    .sort((a, b) => (stat.asc ? sortKey(a) - sortKey(b) : sortKey(b) - sortKey(a)) || lbTieCmp(a, b));
  const pending = list.filter((r) => (r.games || 0) < LB_MIN_RANKED_GAMES)
    .sort((a, b) => ((b.games || 0) - (a.games || 0)) || lbTieCmp(a, b));
  const rows = lbRanked(ranked, stat.rankVal || stat.val).map(([rank, r]) => lbRow(lbMedal(rank), r, stat.val(r), "", rank));
  // Sub-drempel: toon de echte (gedimde) waarde — anders zijn de win%- en
  // score-pagina's identiek als iedereen ongerankt is en lijkt swipen vast te zitten.
  // Het games-aantal (x/15) staat als klein bijschrift zodat de drempel zichtbaar blijft.
  rows.push(...pending.map((r) =>
    lbRow("·", r,
      `${stat.val(r)} <span class="lb-prov-n">${r.games || 0}/${LB_MIN_RANKED_GAMES}</span>`,
      " lb-prov")));
  return `<div class="lb-table">` + rows.join("") + `</div>`;
}

// Tekent het huidige stat-bord. De rating-pagina hergebruikt de al-geladen
// get_pool_leaderboard-data; alle andere stats komen uit get_pool_stats —
// opgehaald bij de eerste swipe ernaartoe, daarna gecached in lbPoolStats. Na
// de async fetch pakken we de dán-actuele stat (de gebruiker kan intussen
// verder geswiped zijn).
// Stat-kop + optioneel bijschrift (bv. "alle games" zodat win%/score/pogingen
// niet als daily-only gelezen worden).
function setStatHead(head, stat) {
  const note = stat.note ? ` <span class="lb-stat-note">${escHtml(stat.note())}</span>` : "";
  head.innerHTML = escHtml(stat.label()) + note;
}

async function renderStatBoard() {
  const head = document.getElementById("lb-stat-heading");
  const content = document.getElementById("lb-stat-content");
  if (!head || !content) return;
  setStatHead(head, LB_STATS[lbStatIndex]);
  // Subtiele voetregel als er leden verborgen zijn wegens inactiviteit — verklaart
  // het gat tussen "N leden" (kopje) en het aantal rijen op het bord.
  const ratingRows = () => setBoard(content,
    lbStatRows(lbOverall, LB_STATS.find((s) => s.key === "rating").val) +
    (lbInactiveN > 0 ? `<p class="lb-hidden-note">${escHtml(t("lb_hidden_inactive")(lbInactiveN))}</p>` : ""));
  if (LB_STATS[lbStatIndex].key === "rating") { ratingRows(); return; }
  if (!lbPoolStats) {
    setBoardLoading(content);   // vorige tabel (zelfde leden) blijft gedimd staan
    const poolId = myPool.id;   // wisselt de gebruiker intussen van pool → gooi dit antwoord weg
    let rows = [];
    try { rows = await rpc("get_pool_stats", { p_pool_id: poolId }); } catch (e) {}
    if (myPool?.id !== poolId) return;
    // Zelfde inactiviteits-filter als het rating-bord: verberg leden die 7+ dagen
    // niet speelden (behalve jezelf). Nieuwelingen zonder potjes (games=0) blijven
    // staan zoals voorheen — die zijn "nog niet begonnen", niet "gestopt".
    // `is_active === false`: alleen bij expliciete false verbergen (oude RPC = geen filter).
    lbPoolStats = (Array.isArray(rows) ? rows : [])
      .filter((r) => !((r.games || 0) >= 1 && r.is_active === false && !r.is_me));
    if (document.getElementById("modal-leaderboard").hidden) return;
    setStatHead(head, LB_STATS[lbStatIndex]);
    if (LB_STATS[lbStatIndex].key === "rating") { ratingRows(); return; }
  }
  const stat = LB_STATS[lbStatIndex];
  if (stat.gate) { setBoard(content, lbGatedStatRows(lbPoolStats, stat)); return; }
  // Aflopend op de stat; bij gelijke waarde wint wie het eerst speelde (lbTieCmp),
  // anders zou de willekeurige RPC-volgorde bepalen wie boven staat.
  const list = [...lbPoolStats].sort((a, b) => (b[stat.key] - a[stat.key]) || lbTieCmp(a, b));
  setBoard(content, lbStatRows(list, stat.val));
}

// Naam-editor: toont je zelfgekozen weergavenaam (profiles.username) met een
// wijzig-knop. Staat bovenaan het bord in beide states (met of zonder pool).
// myUsername wordt in renderLeaderboard opgehaald via get_my_username.
// Flair-kiezer: standaard ingeklapt tot één regel (zelfde patroon als de naam-
// regel erboven) — met 56 opties zou het rooster de hele modal domineren.
// ✏️ klapt het rooster uit, kiezen (of ✕) klapt weer in.
function flairPickerHtml() {
  const cur = myFlair
    ? `<span class="lb-namecur">${escHtml(myFlair)}</span>`
    : `<span class="lb-namecur lb-noname">${t("lb_flair_none")}</span>`;
  const head = `<div class="lb-nameedit">
      <span class="lb-namelabel">${t("lb_flair_label")}</span>${cur}
      <button id="lb-flair-btn" class="lb-pillbtn" aria-expanded="${flairPickerOpen}">${flairPickerOpen ? "✕" : t("lb_name_edit")}</button>
    </div>`;
  const opt = (val, label, extra) =>
    `<button type="button" class="lb-flair-opt${extra || ""}${(myFlair || "") === val ? " sel" : ""}" data-flair="${escHtml(val)}" aria-label="${label}" title="${label}">${val || "✖"}</button>`;
  // Verdiende prestatie-flairs (💯⏳🗿🦕🥇) vooraan, met een gouden randje —
  // de server hergate ze in set_my_flair, dus dit is puur weergave.
  const earned = achvEarnedFlairs();
  const grid = flairPickerOpen
    ? `<div class="lb-flair-opts">${opt("", t("lb_flair_none"), " lb-flair-clear") +
        earned.map((e) => opt(e, e, " lb-flair-achv")).join("") +
        FLAIR_OPTIONS.map((e) => opt(e, e, "")).join("")}</div>`
    : "";
  return `<div class="lb-flair">${head}${grid}</div>`;
}

// Ververst alleen het naam+flair-blok (in- en uitklappen van de kiezer), zodat
// de borden eronder niet opnieuw hoeven te laden.
function rerenderIdentity() {
  const el = document.querySelector("#lb-body .lb-identity");
  if (!el) return;
  el.outerHTML = nameEditorHtml();
  wireNameEditor();
}

// Hover = voorproefje in de kiezer: de animatie van de flair speelt af.
// Desktop-suiker; op touch bestaat hover niet.
function wireFlairPreview(el, flair) {
  if (!flair || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  el.onmouseenter = () => { el.innerHTML = flairPreviewHtml(flair); };
  el.onmouseleave = () => { el.textContent = flair; };
}

function nameEditorHtml() {
  const cur = myUsername
    ? `<span class="lb-namecur">${escHtml(myUsername)}</span>`
    : `<span class="lb-namecur lb-noname">${t("lb_name_unset")}</span>`;
  return `<div class="lb-identity">
    <div class="lb-nameedit">
      <span class="lb-namelabel">${t("lb_myname")}</span>${cur}
      <button id="lb-name-btn" class="lb-pillbtn">${t("lb_name_edit")}</button>
    </div>
    ${flairPickerHtml()}
  </div>`;
}
function wireNameEditor() {
  const btn = document.getElementById("lb-name-btn");
  if (btn) btn.onclick = promptSetUsername;
  const fb = document.getElementById("lb-flair-btn");
  if (fb) fb.onclick = () => { flairPickerOpen = !flairPickerOpen; rerenderIdentity(); };
  document.querySelectorAll(".lb-flair-opt").forEach((b) => {
    b.onclick = () => setMyFlair(b.dataset.flair || "");
    wireFlairPreview(b, b.dataset.flair);
  });
  const cur = document.querySelector(".lb-flair .lb-namecur");
  if (cur && myFlair) wireFlairPreview(cur, myFlair);
}

// Sla de gekozen flair op (server valideert tegen de allow-list); lege string wist.
async function setMyFlair(flair) {
  if ((myFlair || "") === (flair || "")) { flairPickerOpen = false; rerenderIdentity(); return; }
  let status = "err";
  try { status = await rpc("set_my_flair", { p_flair: flair }); } catch (e) {}
  if (status === "ok") { myFlair = flair || null; renderLeaderboard(); return; }
  alert(t("lb_flair_err"));
}

// Vraag een nieuwe weergavenaam en sla 'm op via set_my_username. De server
// valideert (lengte 2–20, alleen [A-Za-z0-9 _-], hoofdletter-ongevoelig uniek)
// en geeft een status-code terug die we naar een melding mappen. Render-laag
// escapet de naam altijd (escHtml), dus geen HTML/script-injectie op het bord.
async function promptSetUsername() {
  const name = prompt(t("lb_name_prompt"), myUsername || "");
  if (name == null) return;   // geannuleerd
  let status = "err";
  try { status = await rpc("set_my_username", { p_name: name }); } catch (e) {}
  if (status === "ok") {
    myUsername = name.trim();
    renderLeaderboard();   // herlaadt bord → nieuwe naam verschijnt overal
    return;
  }
  const msg = {
    taken: t("lb_name_taken"),
    invalid_length: t("lb_name_invalid_length"),
    invalid_chars: t("lb_name_invalid_chars"),
  }[status] || t("lb_name_err");
  alert(msg);
}

// "YYYY-MM-DD" → korte gelokaliseerde datum (bv. "12 jun" / "12 Jun") voor de daily-kop.
function fmtDailyDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat(LANGS[lang].intl, { day: "numeric", month: "short" })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

// "YYYY-MM-DD" ± n dagen → nieuwe sleutel (UTC, dus geen DST-verschuiving).
function shiftDateKey(key, delta) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + delta)).toISOString().slice(0, 10);
}

// Gebruikte hints als iconen (⏩ "100 jaar later", 🧭 richting, 🏛️ eeuw, 🔢 laatste cijfer); leeg als geen.
// ≤2 hints: gewoon op één regel. >2: compact in een 2-rijig grid (kolom-flow) zodat de rij niet uitdijt.
function lbHintIcons(d) {
  const icons = [];
  for (let i = 0; i < (d.text_hints || 0); i++) icons.push("⏩");
  for (let i = 0; i < (d.dir_hints || 0); i++) icons.push("🧭");
  if (d.century_hint) icons.push("🏛️");
  if (d.last_digit) icons.push("🔢");
  if (!icons.length) return "";
  if (icons.length <= 2) return `<span class="lb-hints">${icons.join("")}</span>`;
  return `<span class="lb-hints lb-hints-grid">${icons.map((e) => `<i>${e}</i>`).join("")}</span>`;
}

// Afstand-code (0..7 uit de RPC) → kleur-klasse, in dezelfde volgorde als emojiFor/classify.
const LB_BLOCK_CLS = ["correct", "veryclose", "close", "warm", "cool", "far", "distant", "farthest"];

// De gokken als mini-blokjes (spoilervrij: alleen kleuren, net als de deel-blokjes).
// guess_blocks komt uit de RPC; leeg/null als de play geen opgeslagen gokken heeft.
function lbGuessBlocks(d) {
  const codes = Array.isArray(d.guess_blocks) ? d.guess_blocks : null;
  if (!codes || !codes.length) return "";
  return `<span class="lb-blocks">` +
    codes.map((c) => `<i class="lb-blk ${LB_BLOCK_CLS[c] || "farthest"}"></i>`).join("") +
    `</span>`;
}

// Alleen de inhoud van het daily-bord (tabel of lege staat) — de kop + ‹ ›-knoppen
// staan vast in renderLeaderboard, zodat browsen alleen dit deel ververst.
function dailyTableHtml(rows) {
  if (!rows.length) {
    return `<p class="lb-empty">${t(lbDailyDate === todayKey() ? "lb_empty_daily" : "lb_empty_daily_past")}</p>`;
  }
  return `<div class="lb-table">` + rows.map((r) =>
    `<div class="${lbRowCls(r.is_me)}${lbPodiumCls(r.rank)}"><span class="lb-rank">${lbMedal(r.rank)}</span>` +
    `<span class="lb-name">${lbNameCell(r, r.rank)}</span>` +
    `<span class="lb-val">${lbGuessBlocks(r)}<span class="lb-score">${r.won ? lbHintIcons(r) + r.score : "💀"}</span></span></div>`).join("") + `</div>`;
}

// Vroegste browsbare daily-dag: de startdag van de actieve pool (my_pools geeft
// `since` mee sinds db/23 — vóór die dag bestond de pool niet en is het bord per
// definitie leeg), met de epoch als vangnet zolang `since` ontbreekt.
function lbMinDailyDate() {
  const since = myPool?.since;
  return since && since > EPOCH_KEY ? since : EPOCH_KEY;
}

// Laadt het daily-bord voor lbDailyDate en werkt kop + pijl-knoppen bij. Een
// race-guard zorgt dat snel doorklikken alleen de laatste dag laat zien.
async function loadDailyBoard() {
  if (!myPool) return;
  const content = document.getElementById("lb-daily-content");
  const heading = document.getElementById("lb-daily-heading");
  const prevBtn = document.getElementById("lb-daily-prev");
  const nextBtn = document.getElementById("lb-daily-next");
  if (!content) return;
  heading.textContent = `${t("lb_daily")} ${fmtDailyDate(lbDailyDate)}`;
  prevBtn.disabled = lbDailyDate <= lbMinDailyDate();
  nextBtn.disabled = lbDailyDate >= todayKey();
  setBoardLoading(content);   // bij dag-bladeren blijft de vorige dag gedimd staan
  const req = ++lbDailyReq;
  let rows = [];
  try { rows = await rpc("get_pool_daily_leaderboard", { p_pool_id: myPool.id, p_date: lbDailyDate }); } catch (e) {}
  if (req !== lbDailyReq || document.getElementById("modal-leaderboard").hidden) return;
  setBoard(content, dailyTableHtml(Array.isArray(rows) ? rows : []));
}

// Hoofdpaneel: je pool + borden, of de lege staat (maken/joinen).
async function renderLeaderboard() {
  const body = document.getElementById("lb-body");
  flairPickerOpen = false;   // vol her-render (openen, pool-wissel) → kiezer weer dicht
  if (!auth.user) { body.innerHTML = `<p class="lb-empty">${t("lb_not_member")}</p>`; return; }
  body.innerHTML = `<p class="lb-empty">${t("loading")}</p>`;
  await fetchMyPools();
  try { myUsername = await rpc("get_my_username", {}) || null; } catch (e) {}
  try { myFlair = await rpc("get_my_flair", {}) || null; } catch (e) {}
  if (!achvCache) { try { await fetchAchievements(); } catch (e) {} }   // verdiende prestatie-flairs in de kiezer
  if (document.getElementById("modal-leaderboard").hidden) return;
  if (!myPool) { renderPoolEmptyState(body); return; }

  lbDailyDate = todayKey();   // begin altijd bij de daily van vandaag
  let overall = [];
  try { overall = await rpc("get_pool_leaderboard", { p_pool_id: myPool.id, p_min_games: 1 }); } catch (e) {}
  if (document.getElementById("modal-leaderboard").hidden) return;
  overall = Array.isArray(overall) ? overall : [];

  const inviteUrl = `https://jaardle.com/?join=${myPool.invite_code}`;
  const renameBtnHtml = myPool.is_owner ? `<button id="lb-rename-btn" class="lb-pillbtn">${t("lb_rename")}</button>` : "";
  // "Pool erbij" alleen onder de cap; bij 2+ pools verschijnen de wissel-chips.
  const addBtnHtml = myPools.length < LB_MAX_POOLS ? `<button id="lb-add-btn" class="lb-pillbtn">${t("lb_pool_add")}</button>` : "";
  let html = nameEditorHtml() + poolChipsHtml() + `<div class="lb-poolhead">
      <div class="lb-poolname">${escHtml(myPool.name)}${myPool.is_owner ? ` <span class="lb-tag">${t("lb_owner_tag")}</span>` : ""}</div>
      <div class="lb-poolsub">${t("lb_members_n")(myPool.members)}</div>
      <div class="lb-poolactions">
        <button id="lb-invite-btn" class="lb-pillbtn">${t("lb_invite")}</button>
        ${renameBtnHtml}
        ${addBtnHtml}
        <button id="lb-leave-btn" class="lb-pillbtn danger">${t("lb_leave")}</button>
      </div>
    </div>`;
  html += `<section class="lb-section">
      <div class="lb-dailynav">
        <button id="lb-daily-prev" class="lb-navbtn" aria-label="${t("lb_daily_prev")}" title="${t("lb_daily_prev")}">‹</button>
        <h3 class="lb-heading lb-daily-heading" id="lb-daily-heading"></h3>
        <button id="lb-daily-next" class="lb-navbtn" aria-label="${t("lb_daily_next")}" title="${t("lb_daily_next")}">›</button>
      </div>
      <div id="lb-daily-content"></div>
    </section>`;
  html += `<section class="lb-section">
      <div class="lb-dailynav">
        <button id="lb-stat-prev" class="lb-navbtn" aria-label="${t("lb_stat_prev")}" title="${t("lb_stat_prev")}">‹</button>
        <h3 class="lb-heading lb-stat-heading" id="lb-stat-heading"></h3>
        <button id="lb-stat-next" class="lb-navbtn" aria-label="${t("lb_stat_next")}" title="${t("lb_stat_next")}">›</button>
      </div>
      <div id="lb-stat-content"></div>
    </section>`;
  body.innerHTML = html;
  wireNameEditor();
  wirePoolChips(body, renderLeaderboard);
  const addBtn = document.getElementById("lb-add-btn");
  if (addBtn) addBtn.onclick = () => renderPoolEmptyState(body);

  // Daily-bord + browsen naar vorige dagen (‹ ›).
  const prevBtn = document.getElementById("lb-daily-prev");
  const nextBtn = document.getElementById("lb-daily-next");
  prevBtn.onclick = () => { if (lbDailyDate > lbMinDailyDate()) { lbDailyDate = shiftDateKey(lbDailyDate, -1); loadDailyBoard(); } };
  nextBtn.onclick = () => { if (lbDailyDate < todayKey()) { lbDailyDate = shiftDateKey(lbDailyDate, +1); loadDailyBoard(); } };
  loadDailyBoard();

  // All-time bord met swipebare stat-kolommen (Rating / Win% / … / Dagzeges),
  // ‹ ›-nav net als de daily. Opent op Rating — die hergebruikt de al-geladen
  // get_pool_leaderboard-data; de overige stats halen get_pool_stats pas op
  // bij de eerste swipe ernaartoe.
  // Verberg inactieve leden (laatste pot 7+ dagen geleden) — "verbergen tot terugkeer".
  // Jezelf zie je altijd (is_me), ook als je even niet speelde. `overall` bevat alleen
  // leden met games>=1, dus lbInactiveN telt echt-gestopte spelers, geen nieuwelingen.
  // `is_active !== false`: alleen verbergen bij een expliciete false, zodat een oude
  // RPC (zónder is_active, vóór db/27) niemand verbergt — deploy-volgorde-veilig.
  const activeOverall = overall.filter((r) => r.is_active !== false || r.is_me);
  lbInactiveN = overall.length - activeOverall.length;
  lbOverall = activeOverall; lbStatIndex = 0; lbPoolStats = null;
  const cycleStat = (d) => { lbStatIndex = (lbStatIndex + d + LB_STATS.length) % LB_STATS.length; renderStatBoard(); };
  document.getElementById("lb-stat-prev").onclick = () => cycleStat(-1);
  document.getElementById("lb-stat-next").onclick = () => cycleStat(+1);
  renderStatBoard();

  const inviteBtn = document.getElementById("lb-invite-btn");
  inviteBtn.onclick = () => shareInvite(inviteUrl, inviteBtn);
  const renameBtn = document.getElementById("lb-rename-btn");
  if (renameBtn) renameBtn.onclick = async () => {
    const name = prompt(t("lb_rename_prompt"), myPool.name);
    if (name == null) return;
    let r = "err"; try { r = await rpc("rename_pool", { p_name: name, p_pool_id: myPool.id }); } catch (e) {}
    if (r === "ok") { await refreshPoolState(); renderLeaderboard(); }
  };
  document.getElementById("lb-leave-btn").onclick = async () => {
    if (!confirm(t("lb_leave_confirm"))) return;
    try { await rpc("leave_pool", { p_pool_id: myPool.id }); } catch (e) {}
    try { localStorage.removeItem(ACTIVE_POOL_KEY); } catch (e) {}   // val terug op je oudste pool
    await refreshPoolState();
    renderLeaderboard();
  };
}

// Lege staat: een pool maken of joinen via code. Dubbelrol: mét pools is dit
// de "pool erbij"-weergave (terug-knop i.p.v. "je zit nergens in"-tekst en
// zonder naam-editor — die staat dan al in het hoofdpaneel).
function renderPoolEmptyState(body) {
  const adding = myPools.length > 0;
  const headHtml = adding
    ? `<button id="lb-add-back" class="lb-pillbtn">${t("lb_add_back")}</button>`
    : `<p class="lb-empty">${t("lb_pool_none")}</p>`;
  body.innerHTML = (adding ? "" : nameEditorHtml()) + headHtml + `
    <form class="lb-form" id="lb-create-form">
      <label class="lb-form-label">${t("lb_create_label")}</label>
      <div class="lb-form-row">
        <input id="lb-create-input" type="text" maxlength="30" autocomplete="off" placeholder="${t("lb_create_ph")}">
        <button type="submit">${t("lb_create_btn")}</button>
      </div>
    </form>
    <form class="lb-form" id="lb-join-form">
      <label class="lb-form-label">${t("lb_join_label")}</label>
      <div class="lb-form-row">
        <input id="lb-join-input" type="text" maxlength="6" autocomplete="off" placeholder="${t("lb_join_ph")}" style="text-transform:uppercase">
        <button type="submit">${t("lb_join_btn")}</button>
      </div>
    </form>
    <p class="lb-name-status" id="lb-pool-status" hidden></p>`;

  const status = document.getElementById("lb-pool-status");
  const backBtn = document.getElementById("lb-add-back");
  if (backBtn) backBtn.onclick = () => renderLeaderboard();
  document.getElementById("lb-create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    let r = "err";
    try { r = await rpc("create_pool", { p_name: document.getElementById("lb-create-input").value }); } catch (err) {}
    if (r === "ok") {
      await refreshPoolState();
      // De net-gemaakte pool is de jongste (my_pools sorteert oudste eerst) → actief.
      if (myPools.length) setActivePool(myPools[myPools.length - 1].id);
      renderLeaderboard();
      return;
    }
    status.textContent = r === "invalid_name" ? t("lb_err_name")
      : r === "too_many_pools" ? t("lb_err_pool_limit") : t("lb_err_generic");
    status.className = "lb-name-status err"; status.hidden = false;
  });
  document.getElementById("lb-join-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const code = document.getElementById("lb-join-input").value.trim().toUpperCase();
    if (code) showJoinConfirm(code);
  });
  wireNameEditor();
}

// Joinen bevestigen (Ja/Nee), met switch-waarschuwing als je al in een pool zit.
async function showJoinConfirm(code) {
  // Toon de modal zelf — NIET via openModal(), want dat triggert ook
  // renderLeaderboard(); die async fetch zou onze Ja/Nee-bevestiging in
  // #lb-body overschrijven (de bevestiging flitst dan even en verdwijnt).
  document.getElementById("modal-leaderboard").hidden = false;
  setModalUrl("leaderboard");
  const body = document.getElementById("lb-body");
  body.innerHTML = `<p class="lb-empty">${t("loading")}</p>`;
  let info = null;
  try { const rows = await rpc("peek_pool", { p_code: code }); info = (Array.isArray(rows) && rows[0]) ? rows[0] : null; } catch (e) {}
  if (document.getElementById("modal-leaderboard").hidden) return;
  if (!info) {
    body.innerHTML = `<p class="lb-empty">${t("lb_err_code")}</p>`;
    setTimeout(() => { if (!document.getElementById("modal-leaderboard").hidden) renderLeaderboard(); }, 1500);
    return;
  }
  const normCode = String(code).trim().toUpperCase();
  // Zet de pool met deze invite-code actief (bv. net gejoind of al lid).
  const activateByCode = () => {
    const p = myPools.find((x) => x.invite_code === normCode);
    if (p) setActivePool(p.id);
  };
  if (info.am_member) { await fetchMyPools(); activateByCode(); renderLeaderboard(); return; }
  // Joinen is additief (multi-pool) — geen switch-waarschuwing meer nodig.
  const q = t("lb_join_q")(info.name);
  body.innerHTML = `<div class="lb-confirm">
      <p class="lb-confirm-q">${escHtml(q)}</p>
      <p class="lb-confirm-sub">${t("lb_members_n")(info.members)}</p>
      <div class="lb-confirm-actions">
        <button id="lb-join-yes" class="primary">${t("lb_yes")}</button>
        <button id="lb-join-no">${t("lb_no")}</button>
      </div></div>`;
  document.getElementById("lb-join-no").onclick = () => renderLeaderboard();
  document.getElementById("lb-join-yes").onclick = async () => {
    let r = "err";
    try { r = await rpc("join_pool", { p_code: code, p_confirm_switch: true }); } catch (e) {}
    await refreshPoolState();
    if (r === "too_many_pools") {
      body.innerHTML = `<p class="lb-empty">${t("lb_err_pool_limit")}</p>`;
      setTimeout(() => { if (!document.getElementById("modal-leaderboard").hidden) renderLeaderboard(); }, 2000);
      return;
    }
    if (r === "ok" || r === "already_member") activateByCode();
    renderLeaderboard();
  };
}

// Deel de invite-link — exact als de deel-knop: native share op mobiel, op
// desktop kopiëren naar klembord met "Gekopieerd!"-feedback op de knop zelf.
async function shareInvite(url, btn) {
  const msg = `${t("lb_invite_text")(myPool ? myPool.name : "")}\n${url}`;
  if (navigator.share && isMobileDevice()) {
    try { await navigator.share({ text: msg }); return; } catch (e) { if (e.name === "AbortError") return; }
  }
  try {
    await navigator.clipboard.writeText(msg);
    if (btn) { const orig = t("lb_invite"); btn.textContent = t("lb_invite_copied"); setTimeout(() => { btn.textContent = orig; }, 1500); }
  } catch (e) {
    prompt(t("copy_prompt"), msg);
  }
}

// Globale statistieken van het hoofd-feit op het eindscherm.
async function showFactStats(hash) {
  els.result.querySelectorAll(".fact-stats").forEach((e) => e.remove());
  if (!hash) return;
  let s;
  try { s = await rpc("get_fact_stats", { h: hash }); } catch (e) { return; }
  if (!s || !s.games) return;
  const el = document.createElement("p");
  el.className = "fact-stats";
  const hasScore = s.avg_score != null;
  el.textContent = t("fact_stats")(s, hasScore);
  els.resultText.after(el);   // direct onder de score, boven de knoppen
}

// Live rating op het eindscherm (daily én vrij spel — op de daily laat hij zien
// dat élke pot je rating beweegt, met de 🎲-knop ernaast als deur naar meer).
// record_play werkt de speler-elo direct in de DB bij (indicatief; de nachtelijke
// recompute-replay blijft de bron van waarheid en mag het getal 's ochtends iets
// verschuiven). Delta t.o.v. de gecachete rating van vóór deze pot; zonder cache
// (net ingelogd) alleen het getal zelf.
async function showLiveRating() {
  if (!auth.user) return;
  const prev = auth.rating;
  let r;
  try { r = await rpc("get_my_rating"); } catch (e) { return; }
  if (!r || r.elo == null) return;
  auth.rating = r.elo;
  els.result.querySelectorAll(".rating-line").forEach((e) => e.remove());
  const delta = prev == null ? 0 : r.elo - prev;
  const el = document.createElement("p");
  el.className = "fact-stats rating-line";
  const label = document.createElement("span");
  label.innerHTML = `${animEmojiHtml("⚡")} ${escHtml(t("rating_line"))}: `;
  const num = document.createElement("span");
  num.className = "rating-num";
  num.textContent = String(prev ?? r.elo);
  el.append(label, num);
  if (prev != null) {
    const badge = document.createElement("span");
    badge.className = `rating-delta ${delta === 0 ? "zero" : delta > 0 ? "up" : "down"}`;
    badge.textContent = delta === 0 ? "±0" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)}`;
    el.append(badge);
  }
  // De regel is een deur naar de rating-modal (chevron als hint).
  const go = document.createElement("span");
  go.className = "rating-go";
  go.textContent = "›";
  el.append(go);
  el.classList.add("rating-line-link");
  el.setAttribute("role", "button");
  el.tabIndex = 0;
  el.title = t("stats_rating");
  const openRating = () => openModal("modal-rating");
  el.onclick = openRating;
  el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openRating(); } };
  els.resultText.after(el);
  // Tel het getal van oud naar nieuw (ease-out); de delta-badge popt via CSS
  // erachteraan. Bij reduced-motion of onbekende oude rating: meteen eindstand.
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  if (delta === 0 || reduced) { num.textContent = String(r.elo); return; }
  const dur = 1800, start = performance.now();
  (function tick(now) {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    num.textContent = String(Math.round(prev + delta * eased));
    if (p < 1) requestAnimationFrame(tick);
    else num.classList.add("rating-num-settled");   // korte flash op de eindstand
  })(start);
}

// Cache de huidige rating zodat de volgende free-mode-pot een delta kan tonen.
function refreshMyRating() {
  if (!auth.user) { auth.rating = null; return; }
  rpc("get_my_rating").then((r) => { auth.rating = r?.elo ?? null; }).catch(() => {});
}

// --- Daily-recap (eindscherm na afronden) ---------------------------------
// Popt automatisch op zodra je de daily afrondt: de GLOBALE verdeling van pogingen
// over alle spelers van deze daily (Wordle-stijl, jouw resultaat uitgelicht) + de
// teamstand van vandaag uit je pool. Sluiten via ✕/backdrop/Escape laat het
// resultaat eronder zien; de knop op het resultaatscherm heropent het.
function openDailyRecap() {
  const modal = document.getElementById("modal-recap");
  if (!modal) return;
  openModal("modal-recap");
}

// Globale verdeling voor het feit van vandaag: array van 6 getallen (winsten per
// aantal pogingen, [1..6]) over alle spelers. Faalt graceful naar nullen.
async function fetchGlobalGuessDist() {
  const hash = state.hashes?.[0];
  if (!hash) return [0, 0, 0, 0, 0, 0];
  let a;
  try { a = await rpc("get_fact_guess_distribution", { h: hash }); } catch (e) { return [0, 0, 0, 0, 0, 0]; }
  return Array.isArray(a) && a.length === 6 ? a.map((n) => Number(n) || 0) : [0, 0, 0, 0, 0, 0];
}

// Globale feit-stats voor de recap (o.a. avg_first_dist). Zelfde RPC als het
// eindscherm; faalt graceful naar null zodat de verdeling gewoon blijft werken.
async function fetchFactStatsSafe() {
  const hash = state.hashes?.[0];
  if (!hash) return null;
  try { return await rpc("get_fact_stats", { h: hash }); } catch (e) { return null; }
}

// Score-rang voor "Beter dan X%": {lower, same, total} van alle plays van dit
// feit t.o.v. jouw score (get_fact_score_rank, db/30). Verliezers tellen in de
// vergelijking mee (score is over winst én verlies vergelijkbaar), maar de regel
// zelf toont alleen bij winst — dus zonder winst geen fetch. Graceful naar null.
async function fetchScoreRankSafe() {
  const hash = state.hashes?.[0];
  if (!hash || !state.won) return null;
  try { return await rpc("get_fact_score_rank", { h: hash, s: computeScore() }); } catch (e) { return null; }
}

// "Beter dan X%": percentiel-rang van de speler op SCORE (0–100, mét hint- en
// misgok-straffen) tussen alle spelers van dit feit. Fijnmaziger dan pogingen:
// twee 3-poging-winsten met verschillend hintgebruik tellen nu verschillend.
// Je eigen play zit in de tellingen (same/total) en gaat eruit; gelijke scores
// van ánderen tellen in jouw voordeel, zodat een topscore 100% geeft — ook als
// meer spelers 'm in één keer hadden. Alleen bij winst en genoeg
// vergelijkingsdata; vloer op 1% zodat de hekkensluiter geen kille 0% ziet.
const FASTER_MIN_SAMPLE = 5;
function fasterThanHtml(rank) {
  if (!rank || !state.won) return "";
  const lower = Number(rank.lower) || 0, same = Number(rank.same) || 0, total = Number(rank.total) || 0;
  if (total < FASTER_MIN_SAMPLE) return "";
  const others = Math.max(1, total - 1);
  const pct = Math.min(100, Math.max(1, Math.round(((lower + Math.max(0, same - 1)) / others) * 100)));
  return `<p class="dist-faster">${t("recap_faster")(pct)}</p>`;
}

// Gemiddelde afstand van de eerste gok over álle spelers van dit feit (uit
// get_fact_stats.avg_first_dist), met jouw eigen eerste gok ernaast. Puur
// Jaardle-eigen: laat zien hoe scherp (of gok-en-maar) de eerste inschatting was.
// De getallen krijgen dezelfde afstandskleur als de gok-badges in het spel
// (classify → .dist-chip), zodat je in één blik ziet hoe warm/koud de gok was.
// Verborgen als er nog geen gemiddelde is (te weinig data → null vanuit renderRecap).
function firstGuessHtml(avgFirstDist) {
  if (avgFirstDist == null) return "";
  const avg = Math.round(avgFirstDist);
  const first = state.guesses[0];
  const mine = first ? Math.abs(first.diff) : null;
  const chip = (n) => `<span class="dist-chip ${classify(n)}">${n}</span>`;
  return `<p class="dist-firstguess">${t("recap_firstguess")(chip(avg), mine != null ? chip(mine) : null, avg)}</p>`;
}

// Verdeling van pogingen per aantal (1–6, alleen winsten — een verlies is altijd 6
// en zou de balken vertekenen). Jouw eigen resultaat van vandaag uitgelicht.
// Onder de grafiek eerst het "Beter dan X%"-oordeel, daaronder de eerste-gok-afstand.
function recapDistHtml(buckets, avgFirstDist, scoreRank) {
  const todayN = state.won ? Math.min(6, Math.max(1, state.guesses.length)) : null;
  const head = `<h3 class="stats-heading">${t("recap_dist_title")}</h3>`;
  if (!Array.isArray(buckets) || buckets.every((b) => b === 0)) {
    return `<section class="recap-section">${head}<p class="stats-empty">${t("recap_dist_empty")}</p></section>`;
  }
  const max = Math.max(...buckets);
  const rows = buckets.map((c, i) => {
    const guesses = i + 1;
    const pct = c === 0 ? 0 : Math.max(10, Math.round((c / max) * 100));
    const isToday = todayN === guesses;
    return `<div class="dist-row${isToday ? " dist-today" : ""}">` +
      `<span class="dist-label">${guesses}</span>` +
      `<span class="dist-track"><span class="dist-bar" style="width:${pct}%">${c}</span></span></div>`;
  }).join("");
  return `<section class="recap-section">${head}<div class="dist-chart">${rows}</div>` +
    `${fasterThanHtml(scoreRank)}${firstGuessHtml(avgFirstDist)}</section>`;
}

async function renderRecap() {
  const body = document.getElementById("recap-body");
  if (!body) return;
  body.innerHTML = `<p class="stats-empty">${t("loading")}</p>`;
  const [dist, stats, streak, scoreRank] = await Promise.all([
    fetchGlobalGuessDist(), fetchFactStatsSafe(), streakLineText(state.won), fetchScoreRankSafe(),
  ]);
  if (document.getElementById("modal-recap").hidden) return;
  // Gemiddelde eerste-gok-afstand alleen tonen bij genoeg spelers (anders is het
  // getal ruis); avg_first_dist ontbreekt tot de RPC live is → dan null = verborgen.
  const avgFD = stats && stats.games >= FASTER_MIN_SAMPLE ? stats.avg_first_dist : null;
  const streakHtml = streak ? `<p class="recap-streak">${withAnimEmoji(streak)}</p>` : "";
  // Delen hoort bij dít scherm (het Wordle-moment): direct onder de verdeling,
  // zodat je niet eerst de recap hoeft te sluiten om bij de deel-knop te komen.
  const shareHtml = `<div class="recap-cta recap-share"><button id="recap-share-btn">${SHARE_ICON} <span class="share-label">${t("share")}</span></button></div>`;
  if (auth.user) {
    // Ingelogd: toon de teamstand van vandaag onder de verdeling.
    body.innerHTML = streakHtml + recapDistHtml(dist, avgFD, scoreRank) + shareHtml +
      `<section class="recap-section">` +
      `<h3 class="stats-heading">${t("recap_team_title")}</h3>` +
      `<div id="recap-team"></div></section>`;
    loadRecapTeam();
  } else {
    // Uitgelogd: wijs op de voordelen van een (gratis) account.
    body.innerHTML = streakHtml + recapDistHtml(dist, avgFD, scoreRank) + shareHtml + recapAccountHtml();
    const btn = body.querySelector(".js-acct-btn");
    if (btn) btn.onclick = () => { closeAllModals(); openModal("modal-login"); };
  }
  armEmojiFallbacks(body);
  const sbtn = document.getElementById("recap-share-btn");
  if (sbtn) sbtn.onclick = () => doShare(sbtn);
}

// Voordelen-blok voor uitgelogde spelers op het recap-scherm: een gecentreerd,
// omlijnd accent-kaartje dat als call-to-action opvalt. Ook hergebruikt in de
// stats-modal (anon) — daarom een class i.p.v. id op de knop (kan 2× in de DOM).
function recapAccountHtml() {
  return `<div class="recap-account">
    <h3 class="stats-heading">${t("recap_acct_title")}</h3>
    <ul class="recap-perks">
      <li>${t("recap_acct_1")}</li>
      <li>${t("recap_acct_2")}</li>
      <li>${t("recap_acct_3")}</li>
    </ul>
    <div class="recap-cta"><button class="js-acct-btn">${t("recap_acct_btn")}</button></div>
    <p class="recap-free">${t("recap_acct_free")}</p>
  </div>`;
}

// Teamstand van vandaag in het recap-scherm: zelfde rijen als het daily-bord van
// het leaderboard. Niet ingelogd → login-nudge; ingelogd zonder pool → pool-nudge.
async function loadRecapTeam() {
  const wrap = document.getElementById("recap-team");
  if (!wrap) return;
  if (!auth.user) {
    wrap.innerHTML = `<p class="lb-empty">${t("recap_login")}</p>` +
      `<div class="recap-cta"><button id="recap-login-btn">${t("recap_login_btn")}</button></div>`;
    const btn = document.getElementById("recap-login-btn");
    if (btn) btn.onclick = () => { closeAllModals(); openModal("modal-login"); };
    return;
  }
  if (!myPool) {
    await fetchMyPools();
    if (document.getElementById("modal-recap").hidden) return;
  }
  if (!myPool) {
    wrap.innerHTML = `<p class="lb-empty">${t("recap_pool_none")}</p>` +
      `<div class="recap-cta"><button id="recap-pool-btn">${t("recap_pool_btn")}</button></div>`;
    const btn = document.getElementById("recap-pool-btn");
    if (btn) btn.onclick = () => { closeAllModals(); openModal("modal-leaderboard"); };
    return;
  }
  // Bij 2+ pools staan dezelfde wissel-chips boven het teambord; het bord zelf
  // zit in een eigen div zodat setBoard de chips niet wegvaagt.
  wrap.innerHTML = poolChipsHtml() + `<div id="recap-team-board"><p class="lb-empty">${t("loading")}</p></div>`;
  wirePoolChips(wrap, loadRecapTeam);
  lbDailyDate = todayKey();   // stuurt de lege-staat-tekst van dailyTableHtml
  const poolId = myPool.id;   // wisselt de gebruiker intussen van pool → gooi dit antwoord weg
  let rows = [];
  try { rows = await rpc("get_pool_daily_leaderboard", { p_pool_id: poolId, p_date: todayKey() }); } catch (e) {}
  if (document.getElementById("modal-recap").hidden || myPool?.id !== poolId) return;
  const board = document.getElementById("recap-team-board");
  if (board) setBoard(board, dailyTableHtml(Array.isArray(rows) ? rows : []));
}

// --- Prestaties (achievements) ----------------------------------------------
// Bord van 7 getrapte reeksen (brons→diamant) + 4 vlakke trofeeën + het
// iconische-jaren-album. Ingelogd = get_my_achievements() (db/33, retroactief
// uit plays); anoniem = lokale tellers (jaardle:achv) + de daily-historie.
// Unlock-detectie: snapshot-diff tegen jaardle:achvSeen — de eerste berekening
// is een stille baseline (retroactief toekennen zonder toast-regen), daarna
// geeft elke trede/trofee/zegel een rustige regel op het eindscherm.
// Badge-stijl: zie de stijlgids bij ACHV_SVG onderaan deze sectie.

// Spiegel van de lijst in db/33 (compute_achievements) — wijzig je 'm, wijzig
// beide (en schuif de laatste trede van de years-reeks mee: die = album vol).
const ACHV_YEARS = [-509, -44, 476, 622, 800, 1066, 1215, 1347, 1440, 1453, 1492, 1517,
  1588, 1648, 1687, 1776, 1789, 1815, 1859, 1889, 1912, 1929, 1945, 1957, 1969, 1989];
const ACHV_TIER_KEYS = ["bronze", "silver", "gold", "platinum", "diamond"];
// Reeksen: steps = de vijf treden; flair = {emoji, at} (0-based trede) — de
// server-gate in set_my_flair (db/33) moet dezelfde drempels hanteren.
// floor = ondergrens voor het voortgangsbalkje vóór de eerste trede (rating
// start op 1500, dus 0..1600 zou het balkje meteen vol tekenen).
const ACHV_SERIES = [
  { key: "games",   art: "dice",       steps: [10, 100, 1000, 5000, 25000] },
  { key: "dailies", art: "cal",        steps: [7, 30, 100, 365, 1000] },
  { key: "streak",  art: "flame",      steps: [7, 30, 100, 365, 1000], flair: { emoji: "⏳", at: 2 } },
  { key: "perfect", art: "100",        steps: [1, 10, 50, 250, 1000],  flair: { emoji: "💯", at: 2 } },
  { key: "pure",    art: "zen",        steps: [5, 25, 100, 500, 2000] },
  { key: "rating",  art: "bolt",       steps: [1600, 1700, 1800, 1900, 2000], floor: 1500, flair: { emoji: "🥇", at: 4 }, authOnly: true },
  { key: "years",   art: "albumcover", steps: [3, 8, 15, 20, 26], flair: { emoji: "🗿", at: 4 }, album: true },
];
const ACHV_TROPHIES = [
  { key: "first_try", i18n: "achv_t_first", art: "target" },
  { key: "last_gasp", i18n: "achv_t_last",  art: "chute" },
  { key: "saver",     i18n: "achv_t_saver", art: "buoy" },
  { key: "eras",      i18n: "achv_t_eras",  art: "timering", flair: { emoji: "🦕" } },
];
// Zegel-artwork per iconisch jaar (ids in ACHV_SVG).
const ACHV_YEAR_ART = {
  "-509": "zuil", "-44": "caesar", "476": "broken", "622": "camel", "800": "crown",
  "1066": "hastings", "1215": "charter", "1347": "skull", "1440": "press", "1453": "1453", "1492": "1492",
  "1517": "door", "1588": "armada", "1648": "scale", "1687": "apple", "1776": "bell",
  "1789": "guillotine", "1815": "1815", "1859": "finch", "1889": "eiffel", "1912": "berg",
  "1929": "crash", "1945": "victory", "1957": "sputnik", "1969": "1969", "1989": "wall",
};

function achvTier(n, steps) {           // 0 = nog geen trede, 5 = diamant
  let tier = 0;
  for (const s of steps) if (n >= s) tier += 1;
  return tier;
}
function achvTierName(i) { return (t("achv_tiers") || {})[ACHV_TIER_KEYS[i]] || ACHV_TIER_KEYS[i]; }
function achvValue(a, s) {
  if (s.key === "years") return a.years.length;
  if (s.key === "rating") return a.rating || 0;
  return a[s.key] || 0;
}
function achvTrophyDone(a, tr) {
  return tr.key === "eras" ? a.eras.every(Boolean) : !!a[tr.key];
}
// Zelfde 6 tijdperk-grenzen als eraName (en de eras-CTE in db/33).
function eraIndex(year) {
  if (year < 500) return 0;
  if (year < 1500) return 1;
  if (year < 1600) return 2;
  if (year < 1800) return 3;
  if (year < 2000) return 4;
  return 5;
}
function achvYearLabel(y) { return y < 0 ? `${-y} ${t("bc")}` : String(y); }
const fmtN = (n) => new Intl.NumberFormat(LANGS[lang].intl).format(n);

// ── data: één genormaliseerde vorm voor server (db/33) én lokaal ─────────────
let achvCache = null;   // laatste berekening voor de huidige identiteit (voedt ook de flair-kiezer)

function achvNormalize(a) {
  return {
    games: a.games || 0, dailies: a.dailies || 0, streak: a.streak || 0,
    perfect: a.perfect || 0, pure: a.pure || 0,
    rating: a.rating ?? null,
    years: (Array.isArray(a.years) ? a.years : []).slice().sort((x, y) => x - y),
    first_try: !!a.first_try, last_gasp: !!a.last_gasp, saver: !!a.saver,
    eras: Array.from({ length: 6 }, (_, i) => !!(a.eras || [])[i]),
  };
}

// Lokale tellers voor anonieme spelers. Eenmalig geseed uit de daily-historie
// (dailies/streak/perfect zijn daar al uit af te leiden); vrij-spel-potjes van
// vóór dit moment zijn lokaal nooit bijgehouden en tellen dus niet mee — de
// beperking van spelen zonder account (zie achv_anon_note).
const ACHV_LOCAL_KEY = "jaardle:achv";
function loadAchvLocal() {
  try { const o = JSON.parse(localStorage.getItem(ACHV_LOCAL_KEY)); return o && typeof o === "object" ? o : null; }
  catch (e) { return null; }
}
function saveAchvLocal(o) {
  try { localStorage.setItem(ACHV_LOCAL_KEY, JSON.stringify(o)); } catch (e) {}
}
function ensureAchvLocal() {
  let l = loadAchvLocal();
  if (l) return l;
  const hist = loadHistory();
  l = {
    games: hist.length,
    perfect: hist.filter((e) => e.won && e.score === 100).length,
    pure: 0, first_try: false, last_gasp: false, saver: false,
    eras: {}, years: {},
  };
  saveAchvLocal(l);
  return l;
}
// Tel een zojuist afgeronde (verse) anonieme pot mee — daily én vrij spel.
// Aanroepen vóór recordDailyResult, zodat de eerste seed vandaag niet dubbel telt.
function recordAchvLocal() {
  if (auth.user || !state || !state.event) return;
  const l = ensureAchvLocal();
  l.games = (l.games || 0) + 1;
  if (state.won) {
    if (computeScore() === 100) l.perfect = (l.perfect || 0) + 1;
    if (state.laterCluesShown === 0 && state.directionsRevealed.length === 0 &&
        !state.centuryRevealed && !state.lastDigitRevealed) l.pure = (l.pure || 0) + 1;
    if (state.guesses.length === 1) l.first_try = true;
    if (state.guesses.length === MAX_GUESSES) l.last_gasp = true;
    if (isMakeup(state)) l.saver = true;
    const y = state.event.year;
    (l.eras = l.eras || {})[eraIndex(y)] = true;
    if (ACHV_YEARS.includes(y)) (l.years = l.years || {})[y] = true;
  }
  saveAchvLocal(l);
}

// De actuele stand. Ingelogd: db/33 is de bron; de daily-afgeleiden (dailies/
// streak/perfect) worden opgehoogd met de gemergde daghistorie zodat het paneel
// nooit mínder toont dan de stats-modal (die merget lokale dagen ook al).
async function fetchAchievements() {
  const hist = await dailyHistoryForDisplay();
  const s = computeStats(hist);
  let a = null;
  if (auth.user) {
    try { const r = await rpc("get_my_achievements", {}); if (r) a = achvNormalize(r); } catch (e) {}
    if (!a) a = achvCache;          // offline → laatste bekende stand
    if (!a) return null;
  } else {
    const l = ensureAchvLocal();
    a = achvNormalize({
      games: l.games, perfect: l.perfect, pure: l.pure,
      first_try: l.first_try, last_gasp: l.last_gasp, saver: l.saver,
      years: Object.keys(l.years || {}).map(Number),
      eras: Array.from({ length: 6 }, (_, i) => !!(l.eras || {})[i]),
    });
  }
  a.dailies = Math.max(a.dailies, hist.length);
  a.streak = Math.max(a.streak, s.bestStreak);
  const histPerfect = hist.filter((e) => e.won && e.score === 100).length;
  a.perfect = Math.max(a.perfect, histPerfect);
  achvCache = a;
  return a;
}

// Welke prestatie-flairs zijn verdiend? (client-weergave; de server hergate in
// set_my_flair, dus dit hoeft alleen de kiezer te voeden.)
function achvEarnedFlairs() {
  const a = achvCache;
  if (!a || !auth.user) return [];
  const out = [];
  for (const s of ACHV_SERIES) {
    if (s.flair && achvTier(achvValue(a, s), s.steps) >= s.flair.at + 1) out.push(s.flair.emoji);
  }
  for (const tr of ACHV_TROPHIES) {
    if (tr.flair && achvTrophyDone(a, tr)) out.push(tr.flair.emoji);
  }
  return out;
}

// ── unlock-detectie: snapshot-diff per identiteit ─────────────────────────────
function achvSeenKey() { return `jaardle:achvSeen:${auth.user ? auth.user.uid : "anon"}`; }
function achvSnapshot(a) {
  const snap = { yearsList: a.years };
  for (const s of ACHV_SERIES) snap[s.key] = achvTier(achvValue(a, s), s.steps);
  for (const tr of ACHV_TROPHIES) snap[tr.key] = achvTrophyDone(a, tr) ? 1 : 0;
  return snap;
}
// Stille baseline (login/logout, eerste run): snapshot opslaan zonder regels.
async function achvRefreshBaseline() {
  const a = await fetchAchievements();
  if (!a) return;
  try { localStorage.setItem(achvSeenKey(), JSON.stringify(achvSnapshot(a))); } catch (e) {}
}
// Na een verse pot: bereken opnieuw, vergelijk met de vorige snapshot en zet
// rustige unlock-regels op het eindscherm (badge-mini + naam; tik = paneel).
async function checkAchievements() {
  const a = await fetchAchievements();
  if (!a || !state || !state.done) return;
  const key = achvSeenKey();
  let seen = null;
  try { seen = JSON.parse(localStorage.getItem(key)); } catch (e) {}
  const cur = achvSnapshot(a);
  try { localStorage.setItem(key, JSON.stringify(cur)); } catch (e) {}
  if (!seen || typeof seen !== "object") return;   // eerste keer: stil (retroactief)
  const lines = [];
  for (const s of ACHV_SERIES) {
    const prev = seen[s.key] || 0;
    if (cur[s.key] > prev) {
      lines.push({ art: s.art, tier: cur[s.key],
        text: `${t("achv_unlocked")}: ${t(`achv_${s.key}`)} · ${achvTierName(cur[s.key] - 1)}` });
    }
  }
  for (const tr of ACHV_TROPHIES) {
    if (cur[tr.key] && !seen[tr.key]) {
      lines.push({ art: tr.art, trophy: true, text: `${t("achv_unlocked")}: ${t(tr.i18n)}` });
    }
  }
  const seenYears = new Set(Array.isArray(seen.yearsList) ? seen.yearsList : []);
  for (const y of a.years) {
    if (!seenYears.has(y)) {
      const ev = (t("achv_events") || {})[String(y)] || "";
      lines.push({ art: ACHV_YEAR_ART[String(y)], stamp: true,
        text: `${t("achv_stamp_new")}: ${achvYearLabel(y)}${ev ? ` · ${ev}` : ""}` });
    }
  }
  if (!lines.length) return;
  els.resultText.querySelectorAll(".achv-line").forEach((e) => e.remove());
  for (const line of lines) {
    const el = document.createElement("div");
    el.className = "achv-line" + (line.tier ? ` achv-line-t${line.tier}` : "");
    el.innerHTML = `${achvBadgeHtml(line.art, line.stamp)}<span>${escHtml(line.text)}</span><span class="achv-go">›</span>`;
    el.setAttribute("role", "button");
    el.tabIndex = 0;
    const open = () => openModal("modal-achv");
    el.onclick = open;
    el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } };
    els.resultText.append(el);
  }
}

// ── paneel: bord (reeksen + trofeeën) en het album als enige sub-scherm ──────
function achvBadgeHtml(art, isStamp) {
  return `<svg viewBox="0 0 100 100" class="achv-art${isStamp ? " achv-art-stamp" : ""}" aria-hidden="true"><use href="#achv-art-${art}"/></svg>`;
}

// Voortgang binnen de rail (tick-posities 10/30/50/70/90%): tot de vorige trede
// vol, daarbinnen naar rato richting de volgende.
function achvRailPct(n, s) {
  const tier = achvTier(n, s.steps);
  if (tier >= 5) return 100;
  const prevStep = tier === 0 ? (s.floor || 0) : s.steps[tier - 1];
  const prevPos = tier === 0 ? 0 : 10 + 20 * (tier - 1);
  const nextPos = 10 + 20 * tier;
  const frac = Math.max(0, Math.min(1, (n - prevStep) / (s.steps[tier] - prevStep)));
  return prevPos + frac * (nextPos - prevPos);
}

function achvRowSub(a, s) {
  const n = achvValue(a, s);
  const shown = s.key === "rating" && a.rating == null ? "–" : fmtN(n);
  const unit = t(`achv_${s.key}_n`);
  const unitLine = s.key === "years" ? unit(n, ACHV_YEARS.length)
    : s.key === "rating" ? unit(shown) : unit(n);
  // Nog geen zichtbare rating (pot < 25): "nog 1.600 tot brons" zou vanaf 0
  // tellen terwijl je op 1500 start — laat het nog-stuk dan weg.
  if (s.key === "rating" && a.rating == null) return unitLine;
  const tier = achvTier(n, s.steps);
  const next = tier >= 5 ? t("achv_maxed")
    : t("achv_next")(fmtN(s.steps[tier] - n), achvTierName(tier));
  return `${unitLine} · ${next}`;
}

function achvDetailHtml(a, s) {
  const n = achvValue(a, s);
  const tier = achvTier(n, s.steps);
  const ticks = s.steps.map((step, i) => {
    const done = tier > i;
    return `<b class="achv-tick achv-tk${i}${done ? " done" : ""}" style="left:${10 + 20 * i}%"></b>`;
  }).join("");
  const labels = s.steps.map((step, i) =>
    `<span class="${tier === i ? "next" : ""}" style="left:${10 + 20 * i}%">${fmtN(step)}</span>`).join("");
  const pin = s.flair
    ? `<span class="achv-flairpin" style="left:${10 + 20 * s.flair.at}%">${s.flair.emoji}</span>` : "";
  const note = s.flair
    ? `<p class="achv-flairnote">${escHtml(t("achv_flair_note")(s.flair.emoji, achvTierName(s.flair.at)))}</p>` : "";
  return `<div class="achv-detail" hidden>
      <div class="achv-pinrow">${pin}</div>
      <div class="achv-rail"><i style="width:${achvRailPct(n, s).toFixed(1)}%"></i>${ticks}</div>
      <div class="achv-ticklabels">${labels}</div>
      ${note}</div>`;
}

function achvRowHtml(a, s) {
  const n = achvValue(a, s);
  const tier = achvTier(n, s.steps);
  const prevStep = tier === 0 ? (s.floor || 0) : s.steps[tier - 1];
  const barPct = tier >= 5 ? 100
    : Math.max(0, Math.min(100, ((n - prevStep) / (s.steps[tier] - prevStep)) * 100));
  const chip = tier > 0 ? `<span class="achv-chip">${escHtml(achvTierName(tier - 1))}</span>` : "";
  const chev = s.album ? `<span class="achv-chev">›</span>` : "";
  return `<div class="achv-row achv-t${tier}" data-key="${s.key}">
    <button class="achv-rowbtn" type="button" aria-expanded="false">
      <span class="achv-ring">${achvBadgeHtml(s.art)}</span>
      <span class="achv-body">
        <span class="achv-name">${escHtml(t(`achv_${s.key}`))}</span>
        <span class="achv-sub">${escHtml(achvRowSub(a, s))}</span>
        <span class="achv-bar"><i style="width:${barPct.toFixed(1)}%"></i></span>
      </span>
      ${chip}${chev}
    </button>
    ${s.album ? "" : achvDetailHtml(a, s)}
  </div>`;
}

function achvTrophyHtml(a, tr) {
  const done = achvTrophyDone(a, tr);
  let sub = t(`${tr.i18n}_sub`);
  if (tr.key === "eras" && !done) {
    const cnt = a.eras.filter(Boolean).length;
    if (cnt > 0) sub = t("achv_t_eras_n")(cnt);
  }
  const note = tr.flair ? ` title="${escHtml(t("achv_flair_note_flat")(tr.flair.emoji))}"` : "";
  return `<div class="achv-trophy${done ? "" : " locked"}"${note}>
      <span class="achv-tring">${achvBadgeHtml(tr.art)}</span>
      <span class="achv-tname">${escHtml(t(tr.i18n))}</span>
      <span class="achv-tsub">${escHtml(sub)}</span>
    </div>`;
}

async function renderAchievements() {
  const body = document.getElementById("achv-body");
  if (!body) return;
  body.innerHTML = `<p class="stats-empty">${t("loading")}</p>`;
  const a = await fetchAchievements();
  if (document.getElementById("modal-achv").hidden) return;
  if (!a) { body.innerHTML = `<p class="stats-empty">${t("err_load")}</p>`; return; }
  renderAchvBoard(body, a);
}

function achvAnonNoteHtml() {
  return auth.user ? "" : `<p class="achv-note">${escHtml(t("achv_anon_note"))}</p>`;
}

function renderAchvBoard(body, a) {
  const rows = ACHV_SERIES
    .filter((s) => !s.authOnly || auth.user)
    .map((s) => achvRowHtml(a, s)).join("");
  const trophies = ACHV_TROPHIES.map((tr) => achvTrophyHtml(a, tr)).join("");
  body.innerHTML = `
    <h3 class="stats-heading">${escHtml(t("achv_sect_series"))}</h3>
    <div class="achv-rows">${rows}</div>
    <h3 class="stats-heading">${escHtml(t("achv_sect_trophies"))}</h3>
    <div class="achv-trophies">${trophies}</div>
    ${achvAnonNoteHtml()}`;
  body.querySelectorAll(".achv-rowbtn").forEach((btn) => {
    btn.onclick = () => {
      const row = btn.closest(".achv-row");
      if (row.dataset.key === "years") { renderAchvAlbum(body, a); return; }
      const detail = row.querySelector(".achv-detail");
      if (!detail) return;
      const open = detail.hidden;
      detail.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
    };
  });
}

// Het album: 25 zegels, jaartal áltijd als bijschrift eronder — verzameld in
// kleur mét gebeurtenis, niet-ontdekt gedimd met een "?" (de kunst is de
// onthulling). Enige sub-scherm van het bord.
function renderAchvAlbum(body, a) {
  const got = new Set(a.years);
  const yearsSeries = ACHV_SERIES.find((s) => s.key === "years");
  const n = a.years.length;
  const tier = achvTier(n, yearsSeries.steps);
  const next = tier >= 5 ? t("achv_maxed")
    : t("achv_next")(fmtN(yearsSeries.steps[tier] - n), achvTierName(tier));
  const stamps = ACHV_YEARS.map((y) => {
    const has = got.has(y);
    const art = has ? ACHV_YEAR_ART[String(y)] : "locked";
    const ev = has ? ((t("achv_events") || {})[String(y)] || "") : t("achv_year_locked");
    return `<div class="achv-stamp${has ? "" : " locked"}">
        ${achvBadgeHtml(art, true)}
        <span class="achv-yr">${escHtml(achvYearLabel(y))}</span>
        <span class="achv-ev">${escHtml(ev)}</span>
      </div>`;
  }).join("");
  body.innerHTML = `
    <button class="achv-back lb-pillbtn" type="button">${escHtml(t("achv_back"))}</button>
    <p class="achv-albumhead">${escHtml(t("achv_years_n")(n, ACHV_YEARS.length))} · ${escHtml(next)}</p>
    <div class="achv-t${tier}">${achvDetailHtml(a, yearsSeries).replace(' hidden>', '>')}</div>
    <div class="achv-stamps">${stamps}</div>
    ${achvAnonNoteHtml()}`;
  body.querySelector(".achv-back").onclick = () => renderAchvBoard(body, a);
}

// De badge-artwork (SVG-defs) — één keer in de DOM gehangen bij init(). Stijl-
// gids: nachtpaars #3d2149 is de enige achtergrond, grond #241329, goud #c9a227,
// room #f2e8c9, accenten #ff9d2e/#ffd54d/#6db06d/#e05a4e; munt-logica (één focaal
// silhouet, leesbaar op 40px); zegels hebben een gouden rand, bord-tegels zijn
// randloos (de tier-ring komt uit de CSS). Toren-pad (achv-art-eiffel): Wikimedia
// Commons "Eiffel Tower Silhouette.svg", CC0. Goedgekeurd in de fiat-galerij
// van 23/7 — nieuwe badges in dezelfde taal tekenen.
const ACHV_SVG = "<svg width=\"0\" height=\"0\"><defs><g id=\"achv-stamp-base\"><circle cx=\"50\" cy=\"50\" r=\"48\" fill=\"#c9a227\"/><circle cx=\"50\" cy=\"50\" r=\"44\" fill=\"#3d2149\"/><circle cx=\"50\" cy=\"50\" r=\"39\" fill=\"none\" stroke=\"#c9a227\" stroke-opacity=\".55\" stroke-width=\"1.4\" stroke-dasharray=\"3 4\"/></g><clipPath id=\"achv-stamp-clip\"><circle cx=\"50\" cy=\"50\" r=\"44\"/></clipPath><g id=\"achv-tile-base\"><circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"#3d2149\"/><circle cx=\"50\" cy=\"50\" r=\"39\" fill=\"none\" stroke=\"#c9a227\" stroke-opacity=\".45\" stroke-width=\"1.4\" stroke-dasharray=\"3 4\"/></g><g id=\"achv-art-dice\"><use href=\"#achv-tile-base\"/><g transform=\"rotate(-8 50 50)\"><rect x=\"28\" y=\"28\" width=\"44\" height=\"44\" rx=\"9\" fill=\"#f2e8c9\"/><g fill=\"#3d2149\"><circle cx=\"39\" cy=\"39\" r=\"4\"/><circle cx=\"61\" cy=\"39\" r=\"4\"/><circle cx=\"50\" cy=\"50\" r=\"4\"/><circle cx=\"39\" cy=\"61\" r=\"4\"/><circle cx=\"61\" cy=\"61\" r=\"4\"/></g></g></g><g id=\"achv-art-cal\"><use href=\"#achv-tile-base\"/><rect x=\"28\" y=\"32\" width=\"44\" height=\"40\" rx=\"7\" fill=\"#f2e8c9\"/><path d=\"M28 39 a7 7 0 0 1 7 -7 h30 a7 7 0 0 1 7 7 v7 H28 Z\" fill=\"#c9a227\"/><rect x=\"36\" y=\"24\" width=\"4\" height=\"12\" rx=\"2\" fill=\"#8a5a24\"/><rect x=\"60\" y=\"24\" width=\"4\" height=\"12\" rx=\"2\" fill=\"#8a5a24\"/><g fill=\"#3d2149\" opacity=\".85\"><circle cx=\"38\" cy=\"55\" r=\"2.6\"/><circle cx=\"50\" cy=\"55\" r=\"2.6\"/><circle cx=\"62\" cy=\"55\" r=\"2.6\"/><circle cx=\"38\" cy=\"64\" r=\"2.6\"/><circle cx=\"50\" cy=\"64\" r=\"2.6\"/></g><circle cx=\"62\" cy=\"64\" r=\"4\" fill=\"#ff9d2e\"/></g><g id=\"achv-art-flame\"><use href=\"#achv-tile-base\"/><path d=\"M50 20 C44 32 56 38 52 48 C60 44 58 36 57 32 C68 42 72 56 67 67 C63 77 55 81 50 81 C45 81 37 77 33 67 C28 56 32 42 43 34 C41 42 43 47 47 51 C44 41 46 30 50 20 Z\" fill=\"#ff9d2e\"/><path d=\"M50 81 C44 81 40 74 42 66 C44 60 48 58 47 51 C52 58 50 62 53 66 C55 60 54 57 53 53 C58 60 61 68 58 74 C56 79 52 81 50 81 Z\" fill=\"#ffd54d\"/></g><g id=\"achv-art-100\"><use href=\"#achv-tile-base\"/><text x=\"50\" y=\"59\" text-anchor=\"middle\" font-size=\"27\" font-weight=\"800\" fill=\"#f2e8c9\" font-family=\"-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif\">100</text><path d=\"M34 67 L66 67\" stroke=\"#c9a227\" stroke-width=\"3\" stroke-linecap=\"round\"/></g><g id=\"achv-art-zen\"><use href=\"#achv-tile-base\"/><path d=\"M50 26 C56 36 56 48 50 57 C44 48 44 36 50 26 Z\" fill=\"#f2e8c9\"/><path d=\"M29 38 C40 40 48 48 50 59 C40 59 31 50 29 38 Z\" fill=\"#e8d9ae\"/><path d=\"M71 38 C60 40 52 48 50 59 C60 59 69 50 71 38 Z\" fill=\"#e8d9ae\"/><path d=\"M27 61 Q50 74 73 61 Q66 77 50 77 Q34 77 27 61 Z\" fill=\"#6db06d\"/></g><g id=\"achv-art-bolt\"><use href=\"#achv-tile-base\"/><path d=\"M56 19 L33 54 L47 54 L42 81 L67 44 L52 44 Z\" fill=\"#ffd54d\"/></g><g id=\"achv-art-albumcover\"><use href=\"#achv-tile-base\"/><path d=\"M50 30 C42 25 32 25 26 29 L26 70 C32 66 42 66 50 70 Z\" fill=\"#e8d9ae\"/><path d=\"M50 30 C58 25 68 25 74 29 L74 70 C68 66 58 66 50 70 Z\" fill=\"#f2e8c9\"/><rect x=\"32\" y=\"37\" width=\"12\" height=\"12\" rx=\"2\" fill=\"#6b4180\"/><rect x=\"56\" y=\"37\" width=\"12\" height=\"12\" rx=\"2\" fill=\"#c9a227\"/><rect x=\"32\" y=\"53\" width=\"12\" height=\"12\" rx=\"2\" fill=\"#6db06d\"/><rect x=\"56\" y=\"53\" width=\"12\" height=\"12\" rx=\"2\" fill=\"#e05a4e\"/><path d=\"M50 30 V70\" stroke=\"#8a5a24\" stroke-width=\"2\"/></g><g id=\"achv-art-target\"><use href=\"#achv-tile-base\"/><circle cx=\"50\" cy=\"52\" r=\"24\" fill=\"#f2e8c9\"/><circle cx=\"50\" cy=\"52\" r=\"16\" fill=\"#e05a4e\"/><circle cx=\"50\" cy=\"52\" r=\"8\" fill=\"#f2e8c9\"/><circle cx=\"50\" cy=\"52\" r=\"3.5\" fill=\"#3d2149\"/><path d=\"M50 52 L71 27 M71 27 l-9 1.5 M71 27 l-1.5 9\" stroke=\"#c9a227\" stroke-width=\"3\" stroke-linecap=\"round\"/></g><g id=\"achv-art-chute\"><use href=\"#achv-tile-base\"/><path d=\"M26 46 A24 24 0 0 1 74 46 L26 46 Z\" fill=\"#f2e8c9\"/><path d=\"M26 46 A24 24 0 0 1 50 22 A38 20 0 0 0 38 46 Z\" fill=\"#e8d9ae\"/><path d=\"M74 46 A24 24 0 0 0 50 22 A38 20 0 0 1 62 46 Z\" fill=\"#e8d9ae\"/><path d=\"M28 47 L46 68 M72 47 L54 68 M38 47 L48 68 M62 47 L52 68\" stroke=\"#c9a227\" stroke-width=\"1.6\"/><rect x=\"44\" y=\"66\" width=\"12\" height=\"11\" rx=\"2.5\" fill=\"#8a5a24\"/></g><g id=\"achv-art-buoy\"><use href=\"#achv-tile-base\"/><circle cx=\"50\" cy=\"50\" r=\"22\" fill=\"none\" stroke=\"#f2e8c9\" stroke-width=\"13\"/><circle cx=\"50\" cy=\"50\" r=\"22\" fill=\"none\" stroke=\"#e05a4e\" stroke-width=\"13\" stroke-dasharray=\"17.3 17.3\" stroke-dashoffset=\"8.6\"/><circle cx=\"50\" cy=\"50\" r=\"30\" fill=\"none\" stroke=\"#c9a227\" stroke-width=\"1.6\" stroke-dasharray=\"3 4\"/></g><g id=\"achv-art-timering\"><use href=\"#achv-tile-base\"/><g fill=\"none\" stroke-width=\"6.5\" stroke-linecap=\"round\"><path d=\"M75.9 51.8 A26 26 0 0 1 64.5 71.6\" stroke=\"#c9a227\"/><path d=\"M61.4 73.4 A26 26 0 0 1 38.6 73.4\" stroke=\"#e05a4e\"/><path d=\"M35.5 71.6 A26 26 0 0 1 24.1 51.8\" stroke=\"#6db06d\"/><path d=\"M24.1 48.2 A26 26 0 0 1 35.5 28.4\" stroke=\"#ff9d2e\"/><path d=\"M38.6 26.6 A26 26 0 0 1 61.4 26.6\" stroke=\"#f2e8c9\"/><path d=\"M64.5 28.4 A26 26 0 0 1 75.9 48.2\" stroke=\"#aeb6c2\"/></g><rect x=\"40\" y=\"33\" width=\"20\" height=\"3.4\" rx=\"1.7\" fill=\"#c9a227\"/><rect x=\"40\" y=\"63.6\" width=\"20\" height=\"3.4\" rx=\"1.7\" fill=\"#c9a227\"/><path d=\"M42 37 L58 37 L50 50 Z\" fill=\"#f2e8c9\"/><path d=\"M42 63.6 L58 63.6 L50 50.6 Z\" fill=\"#f2e8c9\"/><path d=\"M46 42 L54 42 L50 48.5 Z\" fill=\"#c9a227\"/><path d=\"M45 63.6 L55 63.6 L50 58 Z\" fill=\"#c9a227\"/></g><g id=\"achv-art-caesar\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><path d=\"M50 20 L57 44 L50 72 L43 44 Z\" fill=\"#f2e8c9\"/><path d=\"M50 20 C51.6 26 52.6 31 51.6 35.5 C50.9 38 48.7 37.6 48.4 35 C48 30.5 49 25 50 20 Z\" fill=\"#e05a4e\"/><circle cx=\"51.6\" cy=\"41\" r=\"1.7\" fill=\"#e05a4e\"/><circle cx=\"49.4\" cy=\"47\" r=\"1.2\" fill=\"#e05a4e\"/><rect x=\"38\" y=\"64\" width=\"24\" height=\"5\" rx=\"2.5\" fill=\"#c9a227\"/><rect x=\"46.5\" y=\"69\" width=\"7\" height=\"12\" rx=\"2\" fill=\"#8a5a24\"/><circle cx=\"50\" cy=\"83\" r=\"4\" fill=\"#c9a227\"/><g fill=\"#6db06d\"><ellipse cx=\"22\" cy=\"62\" rx=\"3\" ry=\"7\" transform=\"rotate(-58 22 62)\"/><ellipse cx=\"26\" cy=\"52\" rx=\"3\" ry=\"7\" transform=\"rotate(-38 26 52)\"/><ellipse cx=\"31\" cy=\"43\" rx=\"3\" ry=\"7\" transform=\"rotate(-20 31 43)\"/><ellipse cx=\"78\" cy=\"62\" rx=\"3\" ry=\"7\" transform=\"rotate(58 78 62)\"/><ellipse cx=\"74\" cy=\"52\" rx=\"3\" ry=\"7\" transform=\"rotate(38 74 52)\"/><ellipse cx=\"69\" cy=\"43\" rx=\"3\" ry=\"7\" transform=\"rotate(20 69 43)\"/></g></g></g><g id=\"achv-art-hastings\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><path d=\"M50 24 C36 24 30 40 30 56 L70 56 C70 40 64 24 50 24 Z\" fill=\"#aeb6c2\"/><rect x=\"47\" y=\"42\" width=\"6\" height=\"26\" rx=\"3\" fill=\"#8a93a1\"/><rect x=\"28\" y=\"56\" width=\"44\" height=\"6\" rx=\"3\" fill=\"#8a93a1\"/><g transform=\"rotate(38 50 50)\"><rect x=\"12\" y=\"49\" width=\"52\" height=\"2.6\" rx=\"1.3\" fill=\"#c9a227\"/><path d=\"M70 50.3 L60 44.5 L60 56.1 Z\" fill=\"#f2e8c9\"/><path d=\"M12 46 L18 50.3 L12 54.6 L16 50.3 Z\" fill=\"#f2e8c9\"/></g><path d=\"M14 86 L86 86 L86 74 L70 74 L66 68 L34 68 L30 74 L14 74 Z\" fill=\"#241329\"/></g></g><g id=\"achv-art-1453\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><path d=\"M74 20 a13 13 0 1 0 8 22 a10.5 10.5 0 1 1 -8 -22 Z\" fill=\"#f2e8c9\"/><circle cx=\"24\" cy=\"26\" r=\"1.3\" fill=\"#f2e8c9\"/><circle cx=\"36\" cy=\"18\" r=\"1\" fill=\"#f2e8c9\"/><circle cx=\"18\" cy=\"40\" r=\"1\" fill=\"#f2e8c9\"/><path d=\"M28 58 a22 22 0 0 1 44 0 Z\" fill=\"#6b4180\"/><rect x=\"47.6\" y=\"30\" width=\"4.8\" height=\"10\" fill=\"#6b4180\"/><circle cx=\"50\" cy=\"30\" r=\"3.4\" fill=\"#6b4180\"/><path d=\"M6 94 L6 62 L20 62 L20 54 L30 54 L30 62 L42 62 L42 70 L58 70 L58 62 L70 62 L70 54 L80 54 L80 62 L94 62 L94 94 Z\" fill=\"#241329\"/><path d=\"M42 70 L58 70 L58 94 L42 94 Z\" fill=\"#17091d\"/><path d=\"M50 88 C44 80 48 76 47 70 C52 74 51 77 54 80 C56 74 55 72 54 68 C60 74 60 80 58 84 C61 82 62 80 62 77 C65 84 60 90 50 88 Z\" fill=\"#ff9d2e\"/><path d=\"M51 85 C48 80 51 78 50.5 74 C54 78 53 82 54 84 C55 80 55 78 54.5 76 C57 80 56 84 51 85 Z\" fill=\"#ffd54d\"/></g></g><g id=\"achv-art-1492\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><path d=\"M26 20 l1.8 4.6 4.6 1.8 -4.6 1.8 -1.8 4.6 -1.8 -4.6 -4.6 -1.8 4.6 -1.8 Z\" fill=\"#f2e8c9\"/><circle cx=\"74\" cy=\"30\" r=\"1.3\" fill=\"#f2e8c9\"/><circle cx=\"64\" cy=\"20\" r=\"1\" fill=\"#f2e8c9\"/><rect x=\"49\" y=\"26\" width=\"2.4\" height=\"34\" fill=\"#8a5a24\"/><path d=\"M51 26 C63 32 65 46 63 56 L51 56 Z\" fill=\"#f2e8c9\"/><path d=\"M46 34 C38 38 36 48 37 56 L46 56 Z\" fill=\"#e8d9ae\"/><path d=\"M26 60 L74 60 C72 69 62 73 50 73 C38 73 28 69 26 60 Z\" fill=\"#6b4180\"/><rect x=\"26\" y=\"60\" width=\"48\" height=\"3.4\" fill=\"#c9a227\"/><g stroke=\"#7fb2d9\" stroke-width=\"2.4\" stroke-linecap=\"round\" fill=\"none\"><path d=\"M14 80 q6 -5 12 0 t12 0 t12 0 t12 0 t12 0 t12 0\"/><path d=\"M8 89 q6 -5 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0\"/></g></g></g><g id=\"achv-art-1815\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><circle cx=\"50\" cy=\"46\" r=\"28\" fill=\"#f2b64d\"/><path d=\"M6 94 L94 94 L94 82 C64 74 42 80 6 88 Z\" fill=\"#e8d9ae\"/><path d=\"M30 62 L46 66 L52 56 L38 50 Z\" fill=\"#241329\"/><path d=\"M32 58 L62 34 L68 41 L42 66 Z\" fill=\"#c9a227\"/><path d=\"M60 36 L66 43\" stroke=\"#8a5a24\" stroke-width=\"2.4\" stroke-linecap=\"round\"/><circle cx=\"31\" cy=\"61\" r=\"3.6\" fill=\"#c9a227\"/><circle cx=\"42\" cy=\"66\" r=\"13\" fill=\"none\" stroke=\"#8a5a24\" stroke-width=\"4.4\"/><path d=\"M42 54 V78 M31 66 H53 M34 58 L50 74 M50 58 L34 74\" stroke=\"#8a5a24\" stroke-width=\"2.6\"/><circle cx=\"42\" cy=\"66\" r=\"3.4\" fill=\"#8a5a24\"/><circle cx=\"66\" cy=\"74\" r=\"4.4\" fill=\"#241329\"/><circle cx=\"75\" cy=\"74\" r=\"4.4\" fill=\"#241329\"/><circle cx=\"70.5\" cy=\"67\" r=\"4.4\" fill=\"#241329\"/><circle cx=\"73\" cy=\"32\" r=\"5\" fill=\"#f2e8c9\" opacity=\".9\"/><circle cx=\"79\" cy=\"27\" r=\"3.4\" fill=\"#f2e8c9\" opacity=\".7\"/><circle cx=\"83\" cy=\"22\" r=\"2.2\" fill=\"#f2e8c9\" opacity=\".5\"/></g></g><g id=\"achv-art-1969\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><circle cx=\"30\" cy=\"24\" r=\"1.3\" fill=\"#f2e8c9\"/><circle cx=\"70\" cy=\"18\" r=\"1\" fill=\"#f2e8c9\"/><circle cx=\"80\" cy=\"34\" r=\"1.2\" fill=\"#f2e8c9\"/><circle cx=\"20\" cy=\"38\" r=\"1\" fill=\"#f2e8c9\"/><circle cx=\"50\" cy=\"92\" r=\"42\" fill=\"#e8e0cd\"/><circle cx=\"34\" cy=\"70\" r=\"5\" fill=\"#cfc5ac\"/><circle cx=\"58\" cy=\"80\" r=\"7\" fill=\"#cfc5ac\"/><circle cx=\"72\" cy=\"64\" r=\"3.5\" fill=\"#cfc5ac\"/><path d=\"M43 40 L57 40 L60 50 L40 50 Z\" fill=\"#c9a227\"/><rect x=\"45\" y=\"34\" width=\"10\" height=\"8\" rx=\"2\" fill=\"#f2e8c9\"/><path d=\"M42 50 L36 60 M58 50 L64 60\" stroke=\"#c9a227\" stroke-width=\"2.4\" stroke-linecap=\"round\"/><rect x=\"33\" y=\"59.4\" width=\"7\" height=\"2.6\" rx=\"1.3\" fill=\"#c9a227\"/><rect x=\"60\" y=\"59.4\" width=\"7\" height=\"2.6\" rx=\"1.3\" fill=\"#c9a227\"/></g></g><g id=\"achv-art-zuil\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><rect x=\"31\" y=\"20\" width=\"38\" height=\"5\" rx=\"2\" fill=\"#c9a227\"/><rect x=\"35\" y=\"25\" width=\"30\" height=\"6\" fill=\"#f2e8c9\"/><rect x=\"39\" y=\"31\" width=\"22\" height=\"34\" fill=\"#f2e8c9\"/><path d=\"M45 31 V65 M50 31 V65 M55 31 V65\" stroke=\"#cabf9b\" stroke-width=\"1.6\"/><rect x=\"35\" y=\"65\" width=\"30\" height=\"6\" fill=\"#f2e8c9\"/><rect x=\"31\" y=\"71\" width=\"38\" height=\"5\" rx=\"2\" fill=\"#c9a227\"/><path d=\"M10 94 L90 94 L90 81 L10 81 Z\" fill=\"#241329\"/></g></g><g id=\"achv-art-broken\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><path d=\"M39 44 L42 39 L47 43 L52 37 L58 42 L61 39 L61 44 Z\" fill=\"#f2e8c9\"/><rect x=\"39\" y=\"44\" width=\"22\" height=\"26\" fill=\"#f2e8c9\"/><path d=\"M45 46 V70 M50 46 V70 M55 46 V70\" stroke=\"#cabf9b\" stroke-width=\"1.6\"/><rect x=\"35\" y=\"70\" width=\"30\" height=\"6\" fill=\"#f2e8c9\"/><rect x=\"62\" y=\"70\" width=\"20\" height=\"11\" rx=\"5.5\" fill=\"#e8d9ae\" transform=\"rotate(10 72 76)\"/><path d=\"M8 94 L92 94 L92 83 L8 83 Z\" fill=\"#241329\"/></g></g><g id=\"achv-art-camel\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><path d=\"M28 20 l1.8 4.6 4.6 1.8 -4.6 1.8 -1.8 4.6 -1.8 -4.6 -4.6 -1.8 4.6 -1.8 Z\" fill=\"#f2e8c9\"/><circle cx=\"72\" cy=\"26\" r=\"1.2\" fill=\"#f2e8c9\"/><ellipse cx=\"50\" cy=\"54\" rx=\"17\" ry=\"9\" fill=\"#f2e8c9\"/><ellipse cx=\"52\" cy=\"44\" rx=\"9\" ry=\"7.5\" fill=\"#f2e8c9\"/><path d=\"M36 52 C30 48 29 40 31 32\" stroke=\"#f2e8c9\" stroke-width=\"6\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M31 32 C31 27 26 25 23 28 C21 30 22 33 25 34 L31 35 Z\" fill=\"#f2e8c9\"/><path d=\"M33 27 L34 23\" stroke=\"#f2e8c9\" stroke-width=\"2\" stroke-linecap=\"round\"/><path d=\"M66 52 C71 54 72 60 69 64\" stroke=\"#f2e8c9\" stroke-width=\"2.2\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M40 61 L39 78 M47 62 L47 78 M55 62 L55 78 M62 60 L63 77\" stroke=\"#f2e8c9\" stroke-width=\"3.6\" stroke-linecap=\"round\"/><path d=\"M4 94 L96 94 L96 80 Q70 72 50 80 Q30 88 4 80 Z\" fill=\"#241329\"/></g></g><g id=\"achv-art-crown\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><path d=\"M28 62 L28 42 L38 52 L50 34 L62 52 L72 42 L72 62 Z\" fill=\"#c9a227\"/><rect x=\"28\" y=\"62\" width=\"44\" height=\"8\" rx=\"2\" fill=\"#e0b62f\"/><circle cx=\"28\" cy=\"40\" r=\"3\" fill=\"#f2e8c9\"/><circle cx=\"50\" cy=\"31\" r=\"3\" fill=\"#f2e8c9\"/><circle cx=\"72\" cy=\"40\" r=\"3\" fill=\"#f2e8c9\"/><circle cx=\"50\" cy=\"66\" r=\"3\" fill=\"#e05a4e\"/></g></g><g id=\"achv-art-charter\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><rect x=\"28\" y=\"24\" width=\"44\" height=\"9\" rx=\"4.5\" fill=\"#e8d9ae\"/><rect x=\"32\" y=\"30\" width=\"36\" height=\"42\" rx=\"3\" fill=\"#f2e8c9\"/><path d=\"M38 40 H62 M38 47 H62 M38 54 H56\" stroke=\"#a89a74\" stroke-width=\"2\" stroke-linecap=\"round\"/><path d=\"M59 70 l2 11 M63 70 l-3 10\" stroke=\"#e05a4e\" stroke-width=\"2.4\" stroke-linecap=\"round\"/><circle cx=\"61\" cy=\"68\" r=\"6\" fill=\"#e05a4e\"/><circle cx=\"61\" cy=\"68\" r=\"2.4\" fill=\"#c14a40\"/></g></g><g id=\"achv-art-skull\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><circle cx=\"50\" cy=\"45\" r=\"19\" fill=\"#f2e8c9\"/><path d=\"M41 58 L59 58 L58 70 C55 72 45 72 42 70 Z\" fill=\"#f2e8c9\"/><circle cx=\"43\" cy=\"45\" r=\"5\" fill=\"#241329\"/><circle cx=\"57\" cy=\"45\" r=\"5\" fill=\"#241329\"/><path d=\"M50 51 L46.8 57 L53.2 57 Z\" fill=\"#241329\"/><path d=\"M46 63 V70 M50 63 V70 M54 63 V70\" stroke=\"#cabf9b\" stroke-width=\"1.8\"/></g></g><g id=\"achv-art-press\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><rect x=\"27\" y=\"24\" width=\"7\" height=\"54\" fill=\"#8a5a24\"/><rect x=\"66\" y=\"24\" width=\"7\" height=\"54\" fill=\"#8a5a24\"/><rect x=\"23\" y=\"19\" width=\"54\" height=\"8\" rx=\"3\" fill=\"#8a5a24\"/><rect x=\"46.5\" y=\"27\" width=\"7\" height=\"15\" fill=\"#c9a227\"/><path d=\"M45 30 H55 M45 34 H55 M45 38 H55\" stroke=\"#8a5a24\" stroke-width=\"1.6\"/><rect x=\"36\" y=\"42\" width=\"28\" height=\"7\" rx=\"2\" fill=\"#c9a227\"/><rect x=\"34\" y=\"56\" width=\"32\" height=\"20\" rx=\"2\" fill=\"#f2e8c9\"/><path d=\"M39 62 H61 M39 67 H61 M39 72 H53\" stroke=\"#a89a74\" stroke-width=\"2\" stroke-linecap=\"round\"/><rect x=\"24\" y=\"78\" width=\"52\" height=\"6\" rx=\"2\" fill=\"#241329\"/></g></g><g id=\"achv-art-door\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><path d=\"M28 82 L28 42 A22 22 0 0 1 72 42 L72 82 Z\" fill=\"#6b4180\"/><path d=\"M33 82 L33 44 A17 17 0 0 1 67 44 L67 82 Z\" fill=\"#4a2a56\"/><rect x=\"40\" y=\"40\" width=\"20\" height=\"27\" rx=\"2\" fill=\"#f2e8c9\" transform=\"rotate(-4 50 53)\"/><circle cx=\"50\" cy=\"43\" r=\"1.8\" fill=\"#c9a227\"/><path d=\"M45 49 H56 M45 54 H56 M45 59 H52\" stroke=\"#a89a74\" stroke-width=\"1.8\" stroke-linecap=\"round\"/><path d=\"M8 94 H92 V82 H8 Z\" fill=\"#241329\"/></g></g><g id=\"achv-art-armada\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><path d=\"M64 16 L54 32 L60 32 L50 48\" stroke=\"#ffd54d\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><g transform=\"rotate(-12 50 62)\"><path d=\"M28 60 L72 60 C70 68 62 72 50 72 C38 72 30 68 28 60 Z\" fill=\"#6b4180\"/><rect x=\"47\" y=\"34\" width=\"2.4\" height=\"26\" fill=\"#8a5a24\"/><path d=\"M49 34 C58 40 60 50 58 58 L49 58 Z\" fill=\"#e8d9ae\"/><path d=\"M45 40 C39 44 37 52 38 58 L45 58 Z\" fill=\"#d9c791\"/></g><g stroke=\"#7fb2d9\" stroke-width=\"2.6\" stroke-linecap=\"round\" fill=\"none\"><path d=\"M10 80 q7 -6 14 0 t14 0 t14 0 t14 0 t14 0 t14 0\"/><path d=\"M4 89 q7 -6 14 0 t14 0 t14 0 t14 0 t14 0 t14 0 t14 0\"/></g></g></g><g id=\"achv-art-scale\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><rect x=\"48.6\" y=\"26\" width=\"2.8\" height=\"44\" fill=\"#c9a227\"/><rect x=\"28\" y=\"30\" width=\"44\" height=\"3\" rx=\"1.5\" fill=\"#c9a227\"/><circle cx=\"50\" cy=\"26\" r=\"3.5\" fill=\"#f2e8c9\"/><path d=\"M30 33 L25 47 M30 33 L35 47\" stroke=\"#e8d9ae\" stroke-width=\"1.6\"/><path d=\"M22 47 a8.5 8.5 0 0 0 17 0 Z\" fill=\"#f2e8c9\"/><path d=\"M70 33 L65 44 M70 33 L75 44\" stroke=\"#e8d9ae\" stroke-width=\"1.6\"/><path d=\"M62 44 a8.5 8.5 0 0 0 17 0 Z\" fill=\"#f2e8c9\"/><path d=\"M38 74 L62 74 L57 68 L43 68 Z\" fill=\"#c9a227\"/></g></g><g id=\"achv-art-apple\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><path d=\"M58 16 C68 20 78 18 88 26\" stroke=\"#241329\" stroke-width=\"7\" fill=\"none\" stroke-linecap=\"round\"/><ellipse cx=\"60\" cy=\"27\" rx=\"7\" ry=\"3.5\" fill=\"#6db06d\" transform=\"rotate(-28 60 27)\"/><path d=\"M50 46 C50 40 53 36 57 34\" stroke=\"#8a5a24\" stroke-width=\"2.4\" fill=\"none\"/><path d=\"M50 48 C38 42 30 52 34 62 C37 70 44 74 50 72 C56 74 63 70 66 62 C70 52 62 42 50 48 Z\" fill=\"#e05a4e\"/><path d=\"M40 54 a7 7 0 0 1 5 -5\" stroke=\"#f2b64d\" stroke-width=\"2.4\" fill=\"none\" stroke-linecap=\"round\"/><path d=\"M36 30 l-3 6 M64 40 l3 6\" stroke=\"#e8d9ae\" stroke-width=\"2\" stroke-linecap=\"round\" opacity=\".6\"/></g></g><g id=\"achv-art-bell\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><rect x=\"34\" y=\"22\" width=\"32\" height=\"7\" rx=\"3.5\" fill=\"#8a5a24\"/><path d=\"M39 29 C39 26 61 26 61 29 L61 44 C61 56 67 58 70 64 L30 64 C33 58 39 56 39 44 Z\" fill=\"#c9a227\"/><rect x=\"27\" y=\"64\" width=\"46\" height=\"6\" rx=\"3\" fill=\"#e0b62f\"/><path d=\"M52 46 L56 55 L52 59 L56 64\" stroke=\"#241329\" stroke-width=\"2.2\" fill=\"none\" stroke-linecap=\"round\"/><circle cx=\"50\" cy=\"75\" r=\"3.5\" fill=\"#c9a227\"/></g></g><g id=\"achv-art-guillotine\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><rect x=\"35\" y=\"18\" width=\"5\" height=\"62\" fill=\"#8a5a24\"/><rect x=\"60\" y=\"18\" width=\"5\" height=\"62\" fill=\"#8a5a24\"/><rect x=\"32\" y=\"14\" width=\"36\" height=\"6\" rx=\"2.5\" fill=\"#8a5a24\"/><path d=\"M50 20 V27\" stroke=\"#c9a227\" stroke-width=\"1.8\"/><path d=\"M40 28 L60 28 L60 41 Z\" fill=\"#aeb6c2\"/><rect x=\"36\" y=\"58\" width=\"28\" height=\"6\" fill=\"#8a5a24\"/><circle cx=\"50\" cy=\"61\" r=\"4.2\" fill=\"#241329\"/><path d=\"M26 86 H74 V80 H26 Z\" fill=\"#241329\"/></g></g><g id=\"achv-art-finch\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><g fill=\"#f2e8c9\" stroke=\"#f2e8c9\" stroke-linecap=\"round\"><circle cx=\"29\" cy=\"57\" r=\"3\" stroke=\"none\"/><path d=\"M27 60 L21 66\" fill=\"none\" stroke-width=\"4.4\"/><path d=\"M26 61 L30 71\" fill=\"none\" stroke-width=\"3\"/><path d=\"M21 66 L24 74 M21 66 L17 73\" fill=\"none\" stroke-width=\"3\"/><circle cx=\"48\" cy=\"50\" r=\"3.2\" stroke=\"none\"/><path d=\"M47.5 53 L45 66\" fill=\"none\" stroke-width=\"4.6\"/><path d=\"M47 56 L51 65 M46.5 56 L42 64\" fill=\"none\" stroke-width=\"3\"/><path d=\"M45 66 L49 75 M45 66 L41 74\" fill=\"none\" stroke-width=\"3.2\"/><circle cx=\"70\" cy=\"44\" r=\"3.4\" stroke=\"none\"/><path d=\"M70 47.5 L69.5 64\" fill=\"none\" stroke-width=\"4.8\"/><path d=\"M70 52 L76 60 M70 52 L65 60\" fill=\"none\" stroke-width=\"3\"/><path d=\"M69.5 64 L75 75 M69.5 64 L65 75\" fill=\"none\" stroke-width=\"3.4\"/></g><path d=\"M10 82 H90\" stroke=\"#241329\" stroke-width=\"7\" stroke-linecap=\"round\"/></g></g><g id=\"achv-art-eiffel\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><circle cx=\"50\" cy=\"52\" r=\"32\" fill=\"#4a2a56\"/><circle cx=\"26\" cy=\"22\" r=\"1.3\" fill=\"#f2e8c9\"/><circle cx=\"74\" cy=\"18\" r=\"1.2\" fill=\"#f2e8c9\"/><circle cx=\"80\" cy=\"42\" r=\"1\" fill=\"#f2e8c9\"/><circle cx=\"20\" cy=\"44\" r=\"1\" fill=\"#f2e8c9\"/><g transform=\"translate(37.35,15) scale(0.034375)\"><path d=\"M371,1c0,1.7928,0,3.5856,0,5.6754c3.1156,0.2445,6.3162,1.6389,6.4228-3.3596c0.3531,2.0479,0.7062,4.0958,1.1506,6.6732c-2.4914,0.2529-4.7224,0.4794-7.3257,0.7436c-0.1255,1.4959-0.3484,2.9238-0.3499,4.352c-0.0223,21.8303-0.2111,43.6641,0.1733,65.4876c0.0652,3.7031,2.8299,7.3002,3.9487,11.0648c0.6826,2.297,1.0436,4.8735,0.7607,7.2297c-0.4067,3.3867,2.2062,7.6776-2.5941,10.0617c-0.3336,0.1657-0.1742,2.3479,0.3924,3.1329c3.2401,4.4883,3.2336,13.2663,0.1163,17.4642c-0.6358,0.8563-0.59,3.0179,0.0615,3.8931c2.897,3.8923,3.0266,13.6131,0.1478,17.1991c-0.6794,0.8462-0.9098,3.3442-0.6836,3.4353c4.4993,1.8116,1.9562,5.6888,2.6925,8.5564c0.3793,1.4774,0.6083,3.7155,1.5986,4.2039c12.0382,5.9364,18.5288,16.317,23.2351,28.2197c0.4892,1.2372,1.0104,2.4618,1.6767,4.0808c3.015,0,6.1187,0,9.5057,0c0,5.1783,0,9.9422,0,14.4297c-2.0557,0.9646-3.9575,1.857-5.8593,2.7493c1.4883,0.8992,2.9766,1.7984,5.1732,3.1254c0,4.6091,0,10.1639,0,16.047c-1.5847,0.2376-3.1574,0.4734-4.7447,0.7114c-1.5942,4.1084,1.0082,4.0649,3.7014,4.0146c2.4889-0.0465,4.9794-0.0099,8.2015-0.0099c0.6693,9.5112,1.3228,18.7991,1.8456,26.2295c-4.1078,3.606-7.3062,5.6669-9.5226,8.4969c-7.1563,9.1371-9.1574,20.2626-10.5312,31.3322c-0.9783,7.8829-1.1354,15.9439-0.846,23.8959c2.5145,69.0996,4.8686,138.2079,7.9481,207.2834c3.4505,77.3964,7.2257,154.7828,11.579,232.133c3.3885,60.2062,7.5691,120.3732,11.9834,180.5146c3.2673,44.5142,6.6931,89.0441,11.4969,133.4102c4.3712,40.37,10.6844,80.5303,16.1697,120.7791c0.7855,5.7638,1.7287,11.5063,2.6687,17.7203c7.3515,0,14.6183,0,21.7651,0c0.8004,4.2999,1.6515,8.0909,2.1089,11.9291c0.1024,0.8595-1.0937,2.6292-1.8301,2.7092c-4.3879,0.4767-6.4663,3.4833-7.6161,7.031c-3.408,10.5153-5.4131,21.1913-2.6185,32.2673c15.9972,63.4027,31.4259,126.9556,48.1893,190.1547c6.8099,25.6736,16.5431,50.5687,24.8087,75.863c0.9349,2.8607,2.542,3.3431,5.1542,3.3091c8.7884-0.1149,17.5792-0.0437,26.3507-0.0437c0,15.3308,0,30.0577,0,45.1138c3.3297,0.3149,6.3163,0.5974,9.6169,0.9095c-7.0198,9.2853-10.4893,25.4117-7.3981,33.9413c-0.9554,0.5508-1.9647,1.1327-3.1775,1.8319c10.9536,22.4906,21.7955,44.7814,32.6629,67.0597c31.6002,64.7809,63.2236,129.5507,94.7839,194.351c1.8188,3.7345,4.1771,6.1594,8.1887,8.0043c6.1494,2.8286,11.6587,7.0488,17.4405,10.679c-1.4589,6.6013,3.6301,9.3694,7.3774,12.9135c-1.3333,0.3334-2.6664,0.9567-4.0001,0.958C684,1921.0078,635,1921,586,1921c1.1193-4.0438,3.201-8.076-0.7626-11.923c-0.5778-0.561-0.3848-2.851,0.2827-3.6021c3.254-3.6606,4.5316-7.8728,4.5386-12.6567c0.0457-31.0323-10.3522-59.001-24.8798-85.8313c-30.874-57.0192-103.08-107.4421-175.689-112.4075c-60.7076-4.1514-114.576,11.485-162.1179,49.3146c-41.5111,33.0313-68.164,75.2056-77.6483,127.5934c-2.1008,11.6042-5.3472,23.9421,3.3321,34.8429c0.4419,0.5548,0.2975,2.312-0.2269,2.7843c-4.1758,3.7604-1.7248,7.8563-0.8289,11.8854c-49,0-98,0.0078-146.9999-0.0419C3.6664,1920.9568,2.3333,1920.3334,1,1920c3.6146-3.4304,8.4598-6.1499,7.3925-13.2753c6.372-3.5896,13.4044-7.3024,20.1397-11.4927c2.1027-1.3081,3.8861-3.6693,5.0007-5.9473c29.9281-61.1628,59.7509-122.3773,89.5889-183.5844c11.381-23.3461,22.7383-46.7039,34.1546-70.0326c1.4243-2.9103,2.392-5.4476,1.6747-9.0864c-0.9246-4.6901,0.3462-9.7689-0.1221-14.6034c-0.6998-7.2241-2.0268-14.4061-8.4045-20.6892c3.6515-0.332,6.5798-0.5984,10.0032-0.9097c0-14.8922,0-29.6169,0-45.1871c7.3595,0,14.7742,0.0011,22.1888-0.0004c8.2023-0.0016,7.9718-0.0938,10.9848-7.7145c20.2079-51.1115,32.0708-104.6132,45.36-157.7092c8.8488-35.3546,17.9749-70.642,26.491-106.0763c2.5739-10.7094,0.6228-21.54-3.8424-31.5874c-1.0218-2.2992-4.3841-3.5082-6.5254-5.3833c-0.9234-0.8085-2.186-2.1141-2.0802-3.0577c0.4133-3.6864,1.312-7.3185,2.1396-11.5261c6.9288,0,14.18,0,21.7236,0c2.7094-18.2045,5.6919-35.9119,7.9254-53.7131c5.4102-43.1206,10.9931-86.2308,15.5021-129.4501c3.3697-32.2986,5.2884-64.7524,7.6434-97.1525c3.0315-41.7084,6.0662-83.4186,8.6977-125.1534c2.097-33.2574,3.6509-66.5499,5.3405-99.8322c2.602-51.2566,5.1968-102.5138,7.6393-153.7781c2.2126-46.4393,4.4301-92.8802,6.2448-139.336c1.379-35.3001,2.4617-70.6198,2.9919-105.941c0.2055-13.6946-2.473-27.2204-9.26-39.4546c-2.4683-4.4493-5.2104-9.0273-11.9352-9.925c0.6554-9.2014,1.3083-18.3676,1.9683-27.6327c4.3059-0.5349,8.2806-0.9966,12.2256-1.6399c0.1522-0.0248,0.0194-1.7968,0.0194-2.9919c-1.7043-0.1716-3.1521-0.3174-5.0156-0.505c0-5.6203,0-11.176,0-16.4994c1.7855-0.9703,3.4507-1.8752,5.1159-2.7801c-1.7348-0.8528-3.4696-1.7057-5.7657-2.8345c0-4.1901,0-9.0668,0-14.3386c3.2409,0,6.3452,0,9.5052,0c3.7485-10.2509,8.1871-19.7142,16.465-26.7751c0.7602-0.6484,1.3844-1.6034,2.2567-1.9492c6.0888-2.4132,9.1331-6.4755,7.8633-13.2819c-0.1209-0.648,1.4228-1.4692,1.7392-2.3697c0.4335-1.2336,1.0584-3.0164,0.5144-3.8763c-3.378-5.3395-3.3705-11.843,0.165-17.8266c0.4951-0.8379,0.5005-2.4764,0.003-3.3075c-3.515-5.871-3.5817-12.7472-0.1718-17.7853c0.5429-0.8021,0.7231-2.817,0.2311-3.2044c-5.6829-4.4737-1.6049-10.4433-2.3514-15.611c-0.2892-2.0013,2.1177-4.2605,2.7246-6.5535c0.9317-3.52,1.896-7.1659,1.9294-10.7669c0.1837-19.8314,0.0887-39.6654,0.0893-59.4985c0.0001-1.7889,0-3.5777,0-5.5841c-2.639-0.2526-4.748-0.4544-7.4671-0.7146c0.3003-2.3036,0.5806-4.4544,0.7749-5.9445c1.7897,1.1066,3.6452,2.2539,6.5239,4.0338c0-3.5812,0-5.3726,0-7.164C368.3333,1,369.6667,1,371,1z M324.441,1328.0408c-11.922,72.7325-22.6619,145.1182-38.1751,216.7688c55.1111,0,110.597,0,165.2077,0c-12.8733-72.3667-25.707-144.5107-38.561-216.7688C383.658,1328.0408,354.2241,1328.0408,324.441,1328.0408z\" fill=\"#aeb6c2\"/></g><path d=\"M10 92 H90\" stroke=\"#241329\" stroke-width=\"8\" stroke-linecap=\"round\"/></g></g><g id=\"achv-art-berg\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><circle cx=\"24\" cy=\"22\" r=\"1.2\" fill=\"#f2e8c9\"/><circle cx=\"42\" cy=\"16\" r=\"1\" fill=\"#f2e8c9\"/><path d=\"M66 30 L76 48 L84 46 L80 64 L58 64 L62 46 Z\" fill=\"#f2e8c9\"/><path d=\"M58 64 L80 64 L74 88 L60 82 Z\" fill=\"#b9d2e8\" opacity=\".4\"/><g transform=\"rotate(7 30 58)\"><path d=\"M8 56 L52 56 L48 66 C36 70 18 68 12 62 Z\" fill=\"#17091d\"/><rect x=\"8\" y=\"53\" width=\"42\" height=\"2.6\" fill=\"#e8d9ae\"/><rect x=\"14\" y=\"42\" width=\"5\" height=\"11\" rx=\"1\" fill=\"#e0b62f\"/><rect x=\"14\" y=\"42\" width=\"5\" height=\"3\" fill=\"#241329\"/><rect x=\"23\" y=\"42\" width=\"5\" height=\"11\" rx=\"1\" fill=\"#e0b62f\"/><rect x=\"23\" y=\"42\" width=\"5\" height=\"3\" fill=\"#241329\"/><rect x=\"32\" y=\"42\" width=\"5\" height=\"11\" rx=\"1\" fill=\"#e0b62f\"/><rect x=\"32\" y=\"42\" width=\"5\" height=\"3\" fill=\"#241329\"/><rect x=\"41\" y=\"42\" width=\"5\" height=\"11\" rx=\"1\" fill=\"#e0b62f\"/><rect x=\"41\" y=\"42\" width=\"5\" height=\"3\" fill=\"#241329\"/></g><path d=\"M6 66 H94\" stroke=\"#7fb2d9\" stroke-width=\"2.8\" stroke-linecap=\"round\"/></g></g><g id=\"achv-art-crash\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><path d=\"M24 30 L38 44 L46 36 L58 52 L64 46 L72 62\" stroke=\"#ffd54d\" stroke-width=\"3.4\" fill=\"none\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><path d=\"M72 62 l-8 -2 M72 62 l1 -8\" stroke=\"#ffd54d\" stroke-width=\"3.4\" stroke-linecap=\"round\"/><circle cx=\"34\" cy=\"76\" r=\"5.5\" fill=\"#c9a227\"/><circle cx=\"47\" cy=\"80\" r=\"5.5\" fill=\"#c9a227\"/><circle cx=\"41\" cy=\"71\" r=\"5.5\" fill=\"#e0b62f\"/><path d=\"M6 94 H94 V88 H6 Z\" fill=\"#241329\"/></g></g><g id=\"achv-art-victory\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><circle cx=\"50\" cy=\"90\" r=\"30\" fill=\"#f2b64d\"/><path d=\"M42 16 L44 74\" stroke=\"#e8d9ae\" stroke-width=\"2.2\"/><path d=\"M42 16 L20 21 L41 28 Z\" fill=\"#e05a4e\"/><circle cx=\"58\" cy=\"46\" r=\"4.2\" fill=\"#17091d\"/><path d=\"M58 51 L55 64\" stroke=\"#17091d\" stroke-width=\"7\" stroke-linecap=\"round\"/><path d=\"M57 52 L47 40\" stroke=\"#17091d\" stroke-width=\"4.6\" stroke-linecap=\"round\"/><path d=\"M57 56 L48 52\" stroke=\"#17091d\" stroke-width=\"4.6\" stroke-linecap=\"round\"/><path d=\"M55 64 L50 78 M55 64 L61 77\" stroke=\"#17091d\" stroke-width=\"4.6\" stroke-linecap=\"round\"/><path d=\"M4 94 L96 94 L88 78 L72 82 L62 72 L46 78 L32 70 L16 80 Z\" fill=\"#241329\"/></g></g><g id=\"achv-art-sputnik\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><circle cx=\"24\" cy=\"26\" r=\"1.2\" fill=\"#f2e8c9\"/><circle cx=\"70\" cy=\"16\" r=\"1.4\" fill=\"#f2e8c9\"/><circle cx=\"82\" cy=\"34\" r=\"1\" fill=\"#f2e8c9\"/><circle cx=\"16\" cy=\"44\" r=\"1\" fill=\"#f2e8c9\"/><circle cx=\"50\" cy=\"132\" r=\"62\" fill=\"#3f6fa3\"/><path d=\"M18 112 a52 52 0 0 1 20 -32\" stroke=\"#7fb2d9\" stroke-width=\"3\" fill=\"none\" stroke-linecap=\"round\" opacity=\".7\"/><circle cx=\"42\" cy=\"38\" r=\"12\" fill=\"#e8d9ae\"/><circle cx=\"38\" cy=\"34\" r=\"3.4\" fill=\"#fffdf2\" opacity=\".8\"/><path d=\"M52 43 L76 62 M50 48 L66 72 M46 50 L52 76 M53 39 L80 48\" stroke=\"#e8d9ae\" stroke-width=\"2\" stroke-linecap=\"round\"/></g></g><g id=\"achv-art-wall\"><use href=\"#achv-stamp-base\"/><g clip-path=\"url(#achv-stamp-clip)\"><path d=\"M6 94 L6 44 L40 44 L36 52 L44 58 L38 66 L46 72 L42 94 Z\" fill=\"#a89f8c\"/><path d=\"M94 94 L94 44 L58 44 L64 52 L56 60 L62 68 L58 94 Z\" fill=\"#a89f8c\"/><path d=\"M6 56 H32 M6 68 H36 M6 80 H38 M66 56 H94 M62 68 H94 M62 80 H94\" stroke=\"#241329\" stroke-width=\"2\" opacity=\".5\"/><rect x=\"46\" y=\"48\" width=\"8\" height=\"5\" rx=\"1\" fill=\"#a89f8c\" transform=\"rotate(24 50 50)\"/><rect x=\"48\" y=\"62\" width=\"8\" height=\"5\" rx=\"1\" fill=\"#8f8674\" transform=\"rotate(-18 52 64)\"/></g></g><g id=\"achv-art-locked\"><circle cx=\"50\" cy=\"50\" r=\"48\" fill=\"#57456b\" opacity=\".5\"/><circle cx=\"50\" cy=\"50\" r=\"44\" fill=\"#2b1f38\"/><circle cx=\"50\" cy=\"50\" r=\"39\" fill=\"none\" stroke=\"#57456b\" stroke-width=\"1.4\" stroke-dasharray=\"3 4\"/><text x=\"50\" y=\"63\" text-anchor=\"middle\" font-size=\"38\" font-weight=\"700\" fill=\"#57456b\">?</text></g></defs></svg>";
function injectAchvSvg() {
  if (document.getElementById("achv-svg-defs")) return;
  const holder = document.createElement("div");
  holder.id = "achv-svg-defs";
  holder.setAttribute("aria-hidden", "true");
  holder.style.position = "absolute";
  holder.style.width = holder.style.height = "0";
  holder.innerHTML = ACHV_SVG;
  document.body.appendChild(holder);
}

// --- Daily history & stats ------------------------------------------------
// Ingelogd: de dagresultaten komen uit de DB (cross-device sync) via
// get_my_history(). Anon speelt op de lokale "jaardle:history" van dit
// apparaat — die ziet z'n eigen stats/streak dus ook, met een bewaar-CTA.
// Voor ingelogde spelers vult de lokale historie DB-gaten op (bv. de zojuist
// gespeelde pot die de server nog niet terugmeldt) — zie dailyHistoryForDisplay.
let myHistoryCache = null;     // [{date, won, score, guesses}] of null (niet geladen)
let myHistoryPromise = null;   // dedupe gelijktijdige fetches

async function fetchMyHistory() {
  // Gooit dóór bij een netwerk-/RPC-fout, zodat getMyHistory een mislukte fetch
  // niet als "lege historie" cachet (anders bevriest een transiente fout de
  // streak op 1 tot de volgende invalidate).
  const rows = await rpc("get_my_history", {});
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => ({
    date: r.date,
    won: !!r.won,
    score: r.score ?? 0,
    guesses: r.guesses,
  }));
}

function getMyHistory() {
  if (myHistoryCache) return Promise.resolve(myHistoryCache);
  if (!myHistoryPromise) {
    myHistoryPromise = fetchMyHistory().then((h) => {
      myHistoryCache = h;
      myHistoryPromise = null;
      return h;
    }).catch(() => {
      // Niet cachen: volgende aanroep probeert opnieuw. Val voor nú terug op
      // een lege lijst — de merge in dailyHistoryForDisplay vult 'm met local.
      myHistoryPromise = null;
      return [];
    });
  }
  return myHistoryPromise;
}

function invalidateHistory() {
  myHistoryCache = null;
  myHistoryPromise = null;
}

// De daghistorie zoals we 'm TONEN (stats, streak-regels). Anon: puur lokaal.
// Ingelogd: DB is leidend (cross-device), maar lokale dagen die de DB niet kent
// vullen aan — dekt de race waarin record_play nog onderweg is terwijl het
// eindscherm de streak al wil tonen, en werkt door in stats vlak na een pot.
async function dailyHistoryForDisplay() {
  const local = loadHistory();
  if (!auth.user) return local;
  const db = await getMyHistory();
  const map = new Map();
  for (const e of db) map.set(e.date, e);
  for (const e of local) if (!map.has(e.date)) map.set(e.date, e);
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

// De streak-regel voor het winmoment: bij winst de lopende streak (dag 1 krijgt
// een "kom morgen terug"), bij verlies wat er sneuvelde (alleen als er iets
// stónd — anders niets; het aftelklokje geeft de terugkeer-reden al).
async function streakLineText(won) {
  const s = computeStats(await dailyHistoryForDisplay());
  if (won) return s.currentStreak >= 1 ? t("streak_won")(s.currentStreak) : "";
  return s.yesterdayStreak > 0 ? t("streak_lost")(s.yesterdayStreak) : "";
}

// Zet de streak-regel op het eindscherm (onder de score). Async: de historie kan
// uit de DB komen; guard dat het spel intussen niet gewisseld/heropend is.
async function appendStreakLine(won) {
  if (!state || state.mode !== "daily") return;
  let line;
  if (isMakeup(state)) {
    // Inhaalpot: bij winst de (nu weer aaneengesloten) streak vieren als "gered",
    // bij verlies eerlijk melden dat de reparatie niet lukte.
    const s = computeStats(await dailyHistoryForDisplay());
    line = won ? t("streak_saved")(s.currentStreak) : t("streak_makeup_lost");
  } else {
    line = await streakLineText(won);
  }
  if (!line || !state || !state.done || state.mode !== "daily") return;
  els.resultText.querySelectorAll(".streak-line").forEach((e) => e.remove());
  const el = document.createElement("div");
  el.className = "streak-line";
  el.innerHTML = withAnimEmoji(line);   // eigen i18n-string + getal — veilig als HTML
  armEmojiFallbacks(el);
  els.resultText.append(el);
}

// Reconstrueer het AFGERONDE dagbord uit de DB (alleen ingelogd). De DB bewaart de
// gegokte jaren (plays.guesses) + hint-aantallen; kleuren/afstanden leiden we af uit
// het antwoordjaar. Geeft een board-object of null (anon / geen DB-rij voor vandaag).
async function reconstructDailyBoard(answerYear, d = todayKey()) {
  if (!auth.user) return null;
  let row;
  try { row = await rpc("get_my_daily", { d }); } catch (e) { return null; }
  if (!row || !Array.isArray(row.guesses) || row.guesses.length === 0) return null;
  const guesses = row.guesses.map((year) => {
    const diff = answerYear - year;
    return { year, diff, cls: classify(diff) };
  });
  const dir = Math.max(0, Math.min(2, row.dir_hints_used || 0));
  return {
    guesses,
    done: true,
    won: !!row.won,
    laterCluesShown: Math.max(0, Math.min(LATER_CLUE_SLOTS, row.text_hints_used || 0)),
    // We kennen alleen het AANTAL richting-hints, niet welke rijen; leg ze op de
    // laatste gokken. Voor de score telt enkel het aantal (.length).
    // NB: slice(-0) === slice(0) → hele array; vang dir=0 expliciet af.
    directionsRevealed: dir > 0 ? guesses.map((_, i) => i).slice(-dir) : [],
    centuryRevealed: !!row.century_hint_used,
    lastDigitRevealed: !!row.last_digit_used,
  };
}

// Net ingelogd terwijl de dagpuzzel nog open/onafgerond op het scherm staat?
// (logout → cache wissen → opnieuw inloggen.) Haal het afgeronde resultaat uit de DB.
async function maybeRestoreDailyAfterLogin() {
  if (!auth.user || !state || state.mode !== "daily" || state.done) return;
  const answerYear = state.event?.year;
  if (answerYear == null) return;
  const board = await reconstructDailyBoard(answerYear, state.puzzleDate || todayKey());
  if (!board) return;
  // Race-guard: kan tijdens de fetch gewisseld/afgerond zijn.
  if (!state || state.mode !== "daily" || state.done) return;
  state.guesses = board.guesses;
  state.laterCluesShown = board.laterCluesShown;
  state.directionsRevealed = board.directionsRevealed;
  state.centuryRevealed = board.centuryRevealed;
  state.lastDigitRevealed = board.lastDigitRevealed;
  setKeypadDisabled(true);
  renderEvent();
  renderHintStatus();
  renderGuesses();
  finishGame(board.won, false);  // fresh=false -> geen confetti/telemetrie/dubbeltelling
}

const HISTORY_KEY = "jaardle:history";

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function saveHistory(arr) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); } catch (e) {}
}

function recordDailyResult(won) {
  const date = (state && state.puzzleDate) || todayKey();
  const score = computeScore();
  const entry = {
    date,
    won,
    score,
    guesses: state.guesses.length,
    hintsUsed: state.laterCluesShown,
    dirsUsed: state.directionsRevealed.length,
  };
  const history = loadHistory().filter((e) => e.date !== date);
  history.push(entry);
  history.sort((a, b) => a.date.localeCompare(b.date));
  saveHistory(history);
}

function computeStats(history) {
  const total = history.length;
  const wins = history.filter((e) => e.won);
  const winsN = wins.length;
  const winRate = total ? Math.round((winsN / total) * 100) : 0;
  const avgScore = winsN ? Math.round(wins.reduce((s, e) => s + e.score, 0) / winsN) : 0;
  // Gem. pogingen alleen over winsten (een verlies is altijd 6 en zou 't vertekenen).
  const avgAttempts = winsN ? Math.round((wins.reduce((s, e) => s + (e.guesses || 0), 0) / winsN) * 10) / 10 : 0;
  // Streaks worden geteld op opeenvolgende kalenderdagen dat je hebt GEWONNEN;
  // zowel een gemiste dag als een verloren dag breekt de streak.
  const dateSet = new Set(history.map((e) => e.date));
  const wonSet = new Set(wins.map((e) => e.date));
  let best = 0, run = 0;
  const sortedWon = [...wins].sort((a, b) => a.date.localeCompare(b.date));
  let prev = null;
  for (const e of sortedWon) {
    if (prev && daysBetween(prev, e.date) === 1) run += 1;
    else run = 1;
    if (run > best) best = run;
    prev = e.date;
  }
  // Current streak: tel terug vanaf vandaag (of gister als vandaag nog niet
  // gespeeld). Een verlies vandaag laat de eerste stap falen → streak 0.
  let cur = 0;
  let cursor = todayKey();
  if (!dateSet.has(cursor)) cursor = shiftDay(cursor, -1);
  while (wonSet.has(cursor)) { cur += 1; cursor = shiftDay(cursor, -1); }
  // Streak t/m gisteren: wat er op het spel stond vóór de pot van vandaag.
  // Voedt de "streak van N gebroken"-regel op het eindscherm na een verlies.
  let yday = 0;
  let ycursor = shiftDay(todayKey(), -1);
  while (wonSet.has(ycursor)) { yday += 1; ycursor = shiftDay(ycursor, -1); }
  return { total, won: winsN, winRate, avgScore, avgAttempts, currentStreak: cur, bestStreak: best, yesterdayStreak: yday };
}

function shiftDay(yyyymmdd, delta) {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + delta);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

function daysBetween(a, b) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const ta = Date.UTC(ay, am - 1, ad);
  const tb = Date.UTC(by, bm - 1, bd);
  return Math.round((tb - ta) / 86400000);
}

async function renderStats() {
  const body = document.getElementById("stats-body");
  body.innerHTML = `<p class="stats-empty">${t("loading")}</p>`;
  // Anoniem: de lokale historie van dit apparaat (wordt bij elke daily al
  // bijgehouden) — zo ziet ook een speler zonder account z'n streak groeien.
  // Ingelogd: DB (cross-device), aangevuld met lokale dagen (zie helper).
  const history = await dailyHistoryForDisplay();
  // Modal kan ondertussen gesloten/gewisseld zijn; alleen vullen als nog relevant.
  if (document.getElementById("modal-stats").hidden) return;
  if (history.length === 0) {
    // Geen daily, maar misschien wel vrije potjes -> toon de daily-leegmelding
    // onder een kopje en hang de free-sectie eronder.
    body.innerHTML = `<h3 class="stats-heading">${t("stats_daily")}</h3><p class="stats-empty">${t("stats_empty")}</p>`;
  } else {
    const s = computeStats(history);
    body.innerHTML = `
    <h3 class="stats-heading">${t("stats_daily")}</h3>
    <div class="stats-grid">
      <div class="stat"><div class="num">${s.total}</div><div class="lbl">${t("stat_played")}</div></div>
      <div class="stat"><div class="num">${s.winRate}%</div><div class="lbl">${t("stat_winrate")}</div></div>
      <div class="stat"><div class="num">${s.currentStreak}</div><div class="lbl">${t("stat_curstreak")}</div></div>
      <div class="stat"><div class="num">${s.bestStreak}</div><div class="lbl">${t("stat_beststreak")}</div></div>
      <div class="stat"><div class="num">${s.avgScore}</div><div class="lbl">${t("stat_avgscore")}</div></div>
      <div class="stat"><div class="num">${s.avgAttempts}</div><div class="lbl">${t("stat_avgtries")}</div></div>
      <div class="stat"><div class="num">${s.won}</div><div class="lbl">${t("stat_won")}</div></div>
    </div>
  `;
    body.appendChild(renderCalendar(history));
  }
  if (!auth.user) {
    // Anon heeft z'n lokale stats nu gezien — daaronder de bewaar-pitch
    // (zelfde kaartje als op de recap): dít is het moment dat een account
    // iets tastbaars te bieden heeft.
    body.insertAdjacentHTML("beforeend", recapAccountHtml());
    const btn = body.querySelector(".js-acct-btn");
    if (btn) btn.onclick = () => { closeAllModals(); openModal("modal-login"); };
    return;   // free/century-stats zijn DB-gebonden (auth.uid) — niets voor anon
  }
  await renderFreeStats(body);
  await renderCenturyStats(body);
}

// ⚡ Eigen rating-modal (menu-item onder 📊 Statistieken): anon krijgt de
// account-pitch (rating ís het account-voordeel), ingelogd de grafiek — of een
// leegmelding zolang er nog geen lijn te tekenen is.
async function renderRatingModal() {
  const body = document.getElementById("rating-body");
  body.innerHTML = `<p class="stats-empty">${t("loading")}</p>`;
  if (!auth.user) {
    body.innerHTML = `<p class="stats-empty">${t("rating_anon")}</p>` + recapAccountHtml();
    const btn = body.querySelector(".js-acct-btn");
    if (btn) btn.onclick = () => { closeAllModals(); openModal("modal-login"); };
    return;
  }
  const drawn = await renderRatingStats(body);
  if (document.getElementById("modal-rating").hidden) return;
  if (!drawn) body.innerHTML = `<p class="stats-empty">${t("rating_empty")}</p>`;
}

// ⚡ Rating-verloop (lichess-stijl): per dag de laatste elo uit de DB-historie
// (record_play appendt live, de nachtelijke replay herbouwt — een kleine
// ochtend-verschuiving is dus normaal). Vult de rating-modal; geeft false zolang
// er nog geen twee dagen aan punten zijn (één punt is geen lijn) — de caller
// toont dan een leegmelding.
// Piek/dal komen apart uit get_my_rating_extremes (db/32): per pót i.p.v. per
// dag (de echte piek kan 's avonds alweer weggezakt zijn) en pas vanaf pot 25
// (zelfde grens als is_provisional op het bord) — geeft null tot die tijd.
async function renderRatingStats(body) {
  let hist, ext;
  try {
    [hist, ext] = await Promise.all([
      rpc("get_my_rating_history", {}),
      rpc("get_my_rating_extremes", {}).catch(() => null),
    ]);
  } catch (e) { return false; }
  if (!Array.isArray(hist) || hist.length < 2) return false;
  if (document.getElementById("modal-rating").hidden) return false;

  const pts = hist.map((p) => ({ t: Date.parse(p.d), d: p.d, elo: p.elo, n: p.n }));
  const first = pts[0], last = pts[pts.length - 1];
  const lo = Math.min(...pts.map((p) => p.elo)), hi = Math.max(...pts.map((p) => p.elo));
  const pad = Math.max(8, Math.round((hi - lo) * 0.15));   // ademruimte boven/onder de lijn
  const yLo = lo - pad, yHi = hi + pad;

  // Teken op de echte modalbreedte zodat de as-labels op ware grootte renderen
  // (een vaste brede viewBox zou op mobiel alles mee laten krimpen). Sinds de
  // eigen modal mag de grafiek ook hoger dan toen 'ie onderin de stats hing.
  const W = Math.max(280, Math.min(560, body.clientWidth || 480));
  const H = 210, L = 44, R = 10, T = 10, B = 22;
  const x = (t) => L + (W - L - R) * (t - first.t) / Math.max(1, last.t - first.t);
  const y = (e) => T + (H - T - B) * (yHi - e) / (yHi - yLo);

  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.elo).toFixed(1)}`).join("");
  const area = `${line}L${(W - R).toFixed(1)},${H - B}L${L},${H - B}Z`;
  const grid = [...new Set([yLo, Math.round((yLo + yHi) / 2), yHi])];

  const delta = last.elo - first.elo;
  const badge = delta === 0 ? "" :
    `<span class="rating-delta ${delta > 0 ? "up" : "down"}">${delta > 0 ? "+" : "−"}${Math.abs(delta)}</span>`;
  const extremes = ext && ext.hi && ext.lo ? `
    <p class="rating-extremes">📈 ${t("rating_peak")}: <strong>${ext.hi.elo}</strong> <span>(${fmtDailyDate(ext.hi.d)})</span>
      · 📉 ${t("rating_low")}: <strong>${ext.lo.elo}</strong> <span>(${fmtDailyDate(ext.lo.d)})</span></p>` : "";
  const sec = document.createElement("div");
  // Geen .stats-section en geen kop: de modaltitel (⚡ Rating) dekt de lading al.
  sec.className = "stats-rating";
  sec.innerHTML = `
    <p class="rating-cur"><span class="rating-num">${last.elo}</span>${badge}
      <span class="rating-range">${fmtDailyDate(first.d)} – ${fmtDailyDate(last.d)}</span></p>
    <div class="rating-chart">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t("stats_rating")}">
        <g class="grid">${grid.map((g) => `<line x1="${L}" x2="${W - R}" y1="${y(g).toFixed(1)}" y2="${y(g).toFixed(1)}"></line>` +
          `<text class="axis-lbl" x="${L - 6}" y="${(y(g) + 3.5).toFixed(1)}" text-anchor="end">${g}</text>`).join("")}</g>
        <text class="axis-lbl" x="${L}" y="${H - 6}">${fmtDailyDate(first.d)}</text>
        <text class="axis-lbl" x="${W - R}" y="${H - 6}" text-anchor="end">${fmtDailyDate(last.d)}</text>
        <path class="series-area" d="${area}"></path>
        <path class="series" d="${line}"></path>
        <circle class="end-dot" cx="${x(last.t).toFixed(1)}" cy="${y(last.elo).toFixed(1)}" r="3"></circle>
        <line class="hair" x1="0" x2="0" y1="${T}" y2="${H - B}"></line>
        <circle class="hover-dot" cx="0" cy="0" r="4"></circle>
      </svg>
      <div class="chart-tip" hidden></div>
    </div>${extremes}`;
  body.textContent = "";   // laadtekst van de pane weg
  body.appendChild(sec);

  // Crosshair + tooltip: de wijzer snapt naar de dichtstbijzijnde dag (je mikt
  // op een datum, niet op de 2px-lijn); pointer-events dekken ook touch-slepen.
  const svg = sec.querySelector("svg"), tip = sec.querySelector(".chart-tip");
  const hair = svg.querySelector(".hair"), dot = svg.querySelector(".hover-dot");
  const show = (clientX) => {
    const r = svg.getBoundingClientRect();
    const mx = (clientX - r.left) * W / r.width;   // scherm-px → viewBox-x
    let best = 0;
    for (let i = 1; i < pts.length; i++) {
      if (Math.abs(x(pts[i].t) - mx) < Math.abs(x(pts[best].t) - mx)) best = i;
    }
    const p = pts[best], px = x(p.t), py = y(p.elo);
    hair.setAttribute("x1", px); hair.setAttribute("x2", px); hair.style.opacity = 1;
    dot.setAttribute("cx", px); dot.setAttribute("cy", py); dot.style.opacity = 1;
    tip.textContent = "";
    const val = document.createElement("strong");
    val.textContent = String(p.elo);
    tip.append(val);
    if (best > 0) {
      const dd = p.elo - pts[best - 1].elo;
      const b = document.createElement("span");
      b.className = `rating-delta ${dd === 0 ? "zero" : dd > 0 ? "up" : "down"}`;
      b.textContent = dd === 0 ? "±0" : `${dd > 0 ? "+" : "−"}${Math.abs(dd)}`;
      tip.append(b);
    }
    tip.append(document.createTextNode(` · ${fmtDailyDate(p.d)} · 🎲 ${p.n}`));
    tip.hidden = false;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    tip.style.left = `${Math.min(Math.max(0, px * r.width / W - tw / 2), r.width - tw)}px`;
    tip.style.top = `${Math.max(0, py * r.height / H - th - 10)}px`;
  };
  svg.addEventListener("pointermove", (e) => show(e.clientX));
  svg.addEventListener("pointerdown", (e) => show(e.clientX));
  svg.addEventListener("pointerleave", () => {
    tip.hidden = true; hair.style.opacity = 0; dot.style.opacity = 0;
  });
  return true;
}

// Sterkste eeuw — over ALLE potjes (daily + free). Eén regel onderaan; verbergt
// zich als geen enkele eeuw >= 3 potjes heeft (RPC geeft dan null).
async function renderCenturyStats(body) {
  let c;
  try { c = await rpc("get_my_century_stats", {}); } catch (e) { return; }
  if (!c || c.century == null) return;
  if (document.getElementById("modal-stats").hidden) return;
  const bc = c.century < 0;
  const label = t("century_fmt")(Math.abs(c.century), bc);
  const avg = `${t("avg_word")} ${c.avg_score}`;
  const p = document.createElement("p");
  p.className = "stats-century";
  p.innerHTML = `🏛️ <strong>${t("fav_century")}:</strong> ${label} · ${avg}`;
  body.appendChild(p);
}

// Vrij-spelen-stats (aparte DB-aggregatie; geen streak — free heeft geen dagcadans).
// Hangt onder de daily-sectie; verbergt zichzelf als er nog geen free-potjes zijn.
async function renderFreeStats(body) {
  let f;
  try { f = await rpc("get_my_free_stats", {}); } catch (e) { return; }
  if (!f || !f.games) return;
  if (document.getElementById("modal-stats").hidden) return;
  const sec = document.createElement("div");
  sec.className = "stats-section";
  sec.innerHTML = `
    <h3 class="stats-heading">${t("stats_free")}</h3>
    <div class="stats-grid">
      <div class="stat"><div class="num">${f.games}</div><div class="lbl">${t("stat_played")}</div></div>
      <div class="stat"><div class="num">${f.win_pct ?? 0}%</div><div class="lbl">${t("stat_winrate")}</div></div>
      <div class="stat"><div class="num">${f.avg_score ?? 0}</div><div class="lbl">${t("stat_avgscore")}</div></div>
      <div class="stat"><div class="num">${f.avg_score_10 ?? 0}</div><div class="lbl">${t("stat_last10")}</div></div>
      <div class="stat"><div class="num">${f.perfect ?? 0}</div><div class="lbl">${t("stat_perfect")}</div></div>
      <div class="stat"><div class="num">${f.avg_attempts ?? "–"}</div><div class="lbl">${t("stat_avgtries")}</div></div>
      <div class="stat"><div class="num">${f.won}</div><div class="lbl">${t("stat_won")}</div></div>
    </div>
  `;
  body.appendChild(sec);
}

// Redactle-achtige bijdrage-grid: kolommen = weken, rijen = ma..zo. Gekleurd op
// gewonnen / verloren / niet gespeeld. Puur uit de lokale history — geen DB.
function renderCalendar(history) {
  const WEEKS = 17;
  const map = new Map(history.map((e) => [e.date, e]));
  let cur = shiftDay(todayKey(), -(WEEKS * 7 - 1));
  const [sy, sm, sd] = cur.split("-").map(Number);
  const mondayOffset = (new Date(Date.UTC(sy, sm - 1, sd)).getUTCDay() + 6) % 7; // 0 = ma
  cur = shiftDay(cur, -mondayOffset);
  const today = todayKey();
  const grid = document.createElement("div");
  grid.className = "cal-grid";
  while (cur <= today) {
    const e = map.get(cur);
    const cell = document.createElement("div");
    cell.className = "cal-cell " + (e ? (e.won ? "win" : "loss") : "none");
    const solved = t("cal_solved")(e?.guesses, MAX_GUESSES);
    cell.title = e ? `${cur} — ${e.won ? solved : t("cal_notsolved")}` : cur;
    grid.appendChild(cell);
    cur = shiftDay(cur, 1);
  }
  const wrap = document.createElement("div");
  wrap.className = "cal-wrap";
  const h = document.createElement("div");
  h.className = "cal-title";
  h.textContent = t("cal_title");
  wrap.append(h, grid);
  return wrap;
}

// --- Thema (licht/donker) --------------------------------------------------

// Donker is de default; licht is opt-in per apparaat (jaardle:theme). Het
// head-script in de template zet data-theme al vóór de stylesheet laadt (geen
// flits); hier alleen de wissel + vinkje in het menu + browserbalk-kleur.
const THEME_COLORS = { dark: "#1a1a1a", light: "#f4f1ea" };   // sync met --bg in style.css + head-script

function currentTheme() {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function applyTheme(theme) {
  if (theme === "light") document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
  try { localStorage.setItem("jaardle:theme", theme); } catch (e) {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = THEME_COLORS[theme];
  syncThemeCheck();
}

function syncThemeCheck() {
  const btn = document.querySelector('[data-action="theme"]');
  if (btn) btn.setAttribute("aria-checked", String(currentTheme() === "light"));
}

// --- Menu + modals --------------------------------------------------------

// Auth-state placeholder; Supabase-wiring zit in de module-bridge in index.html.
// `resolved` wordt true bij het eerste sb-auth-changed-event (vuurt óók voor anon):
// pas dan weten we welke historie-bron (DB of lokaal) gezaghebbend is.
const auth = { user: null, resolved: false };

// Het menu-knopje toont de account-staat: profielfoto (Google) / initiaal-cirkel
// (e-mail) / silhouet + "Inloggen" (uitgelogd) — i.p.v. de vaste ⋮.
function renderMenuButton() {
  const btn = document.getElementById("menu-btn");
  if (!btn) return;
  const guest = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4.42 0-8 2.69-8 6v1h16v-1c0-3.31-3.58-6-8-6Z"/></svg>';
  // Pijltje signaleert dat de knop een uitklapmenu opent (anders lijkt het
  // ingelogd alleen een avatar zonder klik-affordance).
  const caret = '<span class="menu-caret" aria-hidden="true">▾</span>';
  if (auth.user) {
    const initial = ((auth.user.name || auth.user.email || "?").trim().charAt(0) || "?").toUpperCase();
    if (auth.user.avatar) {
      btn.innerHTML = `<span class="avatar"><img alt="" referrerpolicy="no-referrer"></span>` + caret;
      const img = btn.querySelector("img");
      img.addEventListener("error", () => {   // foto onbereikbaar -> initiaal
        btn.innerHTML = `<span class="avatar initial">${initial}</span>` + caret;
      });
      img.src = auth.user.avatar;
    } else {
      btn.innerHTML = `<span class="avatar initial">${initial}</span>` + caret;
    }
    btn.setAttribute("aria-label", auth.user.email);
  } else {
    // Twee labels: CSS toont het korte onder 480px (i.p.v. helemaal geen —
    // een naamloos silhouet verstopte de hele login/pool-funnel op mobiel).
    btn.innerHTML = `<span class="avatar">${guest}</span><span class="menu-label">${t("menu_login")}</span><span class="menu-label-short">${t("menu_login_short")}</span>` + caret;
    btn.setAttribute("aria-label", t("menu_login"));
  }
}

function renderMenu() {
  renderMenuButton();
  const section = document.getElementById("menu-account");
  const items = document.getElementById("menu-pop");
  const statsBtn = items.querySelector('[data-action="stats"]');
  const lbBtn = items.querySelector('[data-action="leaderboard"]');
  if (lbBtn) lbBtn.hidden = !auth.user;  // 🏆 zichtbaar zodra ingelogd (pool maken/joinen kan iedereen)
  // Verwijder dynamische account-knoppen (action=login|logout) maar laat
  // statische knoppen (stats) staan.
  items.querySelectorAll('[data-action="login"], [data-action="logout"]').forEach((b) => b.remove());

  if (auth.user) {
    section.innerHTML = `<span class="email">${auth.user.email}</span>${t("menu_loggedin")}`;
    if (statsBtn) statsBtn.hidden = false;
    const out = document.createElement("button");
    out.className = "menu-item danger";
    out.role = "menuitem";
    out.dataset.action = "logout";
    out.textContent = t("menu_logout");
    items.appendChild(out);
  } else {
    section.innerHTML = "";
    if (statsBtn) statsBtn.hidden = false;  // anon ziet de lokale stats van dit apparaat + bewaar-CTA
    const inBtn = document.createElement("button");
    inBtn.className = "menu-item";
    inBtn.role = "menuitem";
    inBtn.dataset.action = "login";
    inBtn.textContent = t("menu_login");
    items.insertBefore(inBtn, items.firstChild);
  }
}

function toggleMenu(force) {
  const pop = document.getElementById("menu-pop");
  const btn = document.getElementById("menu-btn");
  const open = force !== undefined ? force : pop.hidden;
  pop.hidden = !open;
  btn.setAttribute("aria-expanded", String(open));
}

// Laat de URL het open scherm weerspiegelen (deelbaar/bookmarkbaar). null =
// herstel de basis-URL (kaal pad bij daily, ?p=token bij vrij spel) via syncUrl().
// modalUrlParam onthoudt het actieve scherm zodat een latere syncUrl (bv. de
// startGame die na een deeplink-open binnenkomt) 'm niet stilletjes wegpoetst.
let modalUrlParam = null;
function setModalUrl(param) {
  modalUrlParam = param;
  try {
    if (param) history.replaceState(null, "", window.location.pathname + "?" + param);
    else syncUrl();
  } catch (e) { /* sandbox / file:// */ }
}

function openModal(id) {
  document.getElementById(id).hidden = false;
  if (id === "modal-stats") renderStats();
  if (id === "modal-rating") { renderRatingModal(); setModalUrl("rating"); }
  if (id === "modal-achv") { renderAchievements(); setModalUrl("achievements"); }
  if (id === "modal-recap") renderRecap();
  if (id === "modal-leaderboard") { renderLeaderboard(); setModalUrl("leaderboard"); }
  if (id === "modal-login") {
    const err = document.getElementById("login-error");
    if (err) err.hidden = true;
    document.querySelector('#login-form input[name="email"]')?.focus();
    setModalUrl("auth=login");
  }
}

function closeModal(id) {
  document.getElementById(id).hidden = true;
  setModalUrl(null);
}

function closeAllModals() {
  document.querySelectorAll(".modal").forEach((m) => (m.hidden = true));
  setModalUrl(null);
}

async function doAuth(mode, e) {
  e.preventDefault();
  const form = document.getElementById("login-form");
  const err = document.getElementById("login-error");
  err.hidden = true;
  err.textContent = "";
  if (!window.sbAuth) {
    err.textContent = t("auth_loading");
    err.hidden = false;
    return;
  }
  const email = form.email.value.trim();
  const pw = form.password.value;
  const submitBtns = form.querySelectorAll("button");
  submitBtns.forEach((b) => (b.disabled = true));
  try {
    if (mode === "signup") {
      const data = await window.sbAuth.signUp(email, pw);
      // Met "Confirm email" aan retourneert signUp een user zonder session;
      // de gebruiker moet eerst de bevestigingsmail klikken.
      if (!data?.session) {
        form.reset();
        err.innerHTML = t("login_check_spam");
        err.hidden = false;
        return;
      }
    } else {
      await window.sbAuth.signIn(email, pw);
    }
    form.reset();
    closeAllModals();
  } catch (ex) {
    err.textContent = friendlyAuthError(ex);
    err.hidden = false;
  } finally {
    submitBtns.forEach((b) => (b.disabled = false));
  }
}

// "Wachtwoord vergeten?": stuur een reset-mail. Neutrale bevestiging (lekt niet
// of het e-mailadres bestaat), maar echte fouten (rate-limit, netwerk) tonen we wel.
async function doForgot() {
  const form = document.getElementById("login-form");
  const err = document.getElementById("login-error");
  err.hidden = true;
  err.textContent = "";
  if (!window.sbAuth?.resetPassword) {
    err.textContent = t("auth_loading");
    err.hidden = false;
    return;
  }
  const email = form.email.value.trim();
  if (!email) {
    err.textContent = t("login_reset_email_needed");
    err.hidden = false;
    form.email.focus();
    return;
  }
  const btn = document.getElementById("login-forgot");
  btn.disabled = true;
  try {
    await window.sbAuth.resetPassword(email);
    err.innerHTML = t("login_reset_sent");
    err.hidden = false;
  } catch (ex) {
    err.textContent = friendlyAuthError(ex);
    err.hidden = false;
  } finally {
    btn.disabled = false;
  }
}

// Recovery-scherm: nieuw wachtwoord instellen. supabase-js heeft de recovery-token
// al tot een sessie omgezet, dus updateUser werkt.
async function doUpdatePassword(e) {
  e.preventDefault();
  const form = document.getElementById("newpw-form");
  const err = document.getElementById("newpw-error");
  err.hidden = true;
  err.textContent = "";
  if (!window.sbAuth?.updatePassword) {
    err.textContent = t("auth_loading");
    err.hidden = false;
    return;
  }
  const pw = form.password.value;
  const btns = form.querySelectorAll("button");
  btns.forEach((b) => (b.disabled = true));
  try {
    await window.sbAuth.updatePassword(pw);
    form.reset();
    closeAllModals();
    const le = document.getElementById("login-error");
    // Toon een korte succesmelding via de login-foutregel als die zichtbaar is;
    // anders volstaat het sluiten (de gebruiker is nu ingelogd).
    alert(t("newpw_success"));
  } catch (ex) {
    err.textContent = friendlyAuthError(ex);
    err.hidden = false;
  } finally {
    btns.forEach((b) => (b.disabled = false));
  }
}

function friendlyAuthError(ex) {
  const code = ex?.code || "";
  const status = ex?.status || 0;
  const msg = (ex?.message || "").toLowerCase();
  if (code === "same_password" || msg.includes("should be different from the old password"))
    return t("auth_same_password");
  if (code === "invalid_credentials" || msg.includes("invalid login credentials"))
    return t("auth_invalid");
  if (code === "email_not_confirmed")
    return t("auth_unconfirmed");
  if (code === "user_already_exists" || msg.includes("already registered"))
    return t("auth_exists");
  if (code === "weak_password" || msg.includes("password should be"))
    return t("auth_weak");
  if (code === "email_address_invalid" || msg.includes("invalid email") || msg.includes("invalid format"))
    return t("auth_email_invalid");
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || status === 429)
    return t("auth_rate");
  if (code === "signup_disabled") return t("auth_signup_disabled");
  if (code === "provider_disabled") return t("auth_provider_disabled");
  if (msg.includes("failed to fetch") || msg.includes("networkerror"))
    return t("auth_network");
  return ex?.message || t("auth_failed");
}

async function doSignOut() {
  if (window.sbAuth) {
    try { await window.sbAuth.signOut(); } catch (e) {}
  }
}

async function doGoogleSignIn() {
  const err = document.getElementById("login-error");
  err.hidden = true;
  err.textContent = "";
  if (!window.sbAuth?.signInWithGoogle) {
    err.textContent = "Google-login niet beschikbaar.";
    err.hidden = false;
    return;
  }
  const btn = document.getElementById("login-google");
  btn.disabled = true;
  try {
    // Supabase redirect (geen popup): browser navigeert weg, sessie wordt
    // bij terugkomst door getSession() in index.html opgepikt.
    await window.sbAuth.signInWithGoogle();
  } catch (ex) {
    err.textContent = friendlyAuthError(ex);
    err.hidden = false;
  } finally {
    btn.disabled = false;
  }
}

function submitGuess() {
  if (state.done) return;
  const raw = getYearString().trim();
  if (raw === "" || raw === "-") {
    flashInput();
    return;
  }
  const year = parseInt(raw, 10);
  if (!Number.isFinite(year)) {
    flashInput();
    return;
  }
  if (year < MIN_YEAR || year > MAX_YEAR) {
    flashInput();
    return;
  }
  // Datzelfde jaar nog eens gokken levert niets op (zelfde feedback, verspilde
  // poging + strafpunten) → stilletjes weigeren, net als andere ongeldige invoer.
  // De gok staat al zichtbaar in de lijst, dus de flash maakt 't duidelijk genoeg.
  if (state.guesses.some((g) => g.year === year)) {
    flashInput();
    return;
  }
  // Buiten-bereik-guard: ligt deze gok verder van je dichtste eerdere gok dan het
  // bereik dat die gok's badge aangeeft (zie outOfBand), dan kan 't logisch gezien
  // niet kloppen → waarschijnlijk een typefout. Even bevestigen i.p.v. een poging +
  // strafpunten te verspillen; annuleren laat de invoer staan om te corrigeren.
  // Gebruikt alleen je eigen gokken (geen antwoord-info → verklapt niets).
  const oob = outOfBand(state.guesses, year);
  if (oob && !confirm(t("band_warn")(oob))) return;
  const diff = state.event.year - year;
  const cls = classify(diff);
  state.guesses.push({ year, diff, cls });
  clearYear();
  renderGuesses();
  // Pop-animatie op de zojuist toegevoegde penalty (zelfde double-rAF
  // truc als bij de richting-pijl).
  const rows = els.guesses.querySelectorAll(".guess-row");
  const pen = rows[state.guesses.length - 1]?.querySelector(".penalty");
  if (pen) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      pen.classList.add("just-added");
    }));
  }
  save();
  renderHintStatus();
  updateLiveScore(true);   // tel zichtbaar omlaag bij deze (mis)gok
  if (cls === "correct") {
    finishGame(true, true);
  } else if (state.guesses.length >= MAX_GUESSES) {
    finishGame(false, true);
  } else {
    maybeShowHintNudge();   // gok 5, ver mis, hintloos → eenmalig duwtje
  }
}

function flashInput() {
  els.input.classList.remove("flash");
  // force reflow so animation restarts
  void els.input.offsetWidth;
  els.input.classList.add("flash");
}

// Bewaar de hele puzzel + het bord, zodat herladen instant/offline werkt en de
// dagpuzzel niet opnieuw opgehaald hoeft te worden.
function save() {
  try {
    localStorage.setItem(storageKey(state.mode, state.puzzleDate), JSON.stringify({
      hashes: state.hashes,
      event: state.event,
      band: state.band ?? null,
      potId: state.potId ?? null,
      board: {
        guesses: state.guesses,
        done: state.done,
        won: state.won,
        laterCluesShown: state.laterCluesShown,
        directionsRevealed: state.directionsRevealed,
        centuryRevealed: state.centuryRevealed,
        lastDigitRevealed: state.lastDigitRevealed,
        laterClues: state.laterClues,
        laterPick: state.laterPick,
      },
    }));
  } catch (e) { /* storage may be unavailable */ }
}

function loadRecord(mode, date) {
  try {
    const raw = localStorage.getItem(storageKey(mode, date));
    if (!raw) return null;
    const r = JSON.parse(raw);
    return (r && Array.isArray(r.hashes) && r.event) ? r : null;
  } catch (e) {
    return null;
  }
}

// --- Geanimeerde emoji (Noto Emoji Animation, lokaal in /emoji/) -------------
// Alleen op eenmalige piekmomenten (streak-regel, perfecte score, daily-klaar) —
// nooit in permanente UI: blijvende beweging leidt af en went nooit. Bij
// prefers-reduced-motion of een laadfout valt alles terug op het gewone teken.
// die-once = flair-die met loopcount 1 (ANIM-chunk gepatcht): speelt één keer
// en blijft dan stilstaan — de knop is blijvende UI, dus geen eeuwige beweging.
const ANIM_EMOJI = { "🔥": "fire", "💔": "heartbreak", "🏆": "trophy", "✨": "sparkles", "⚡": "flair-zap", "🎲": "die-once" };

function animEmojiHtml(ch) {
  const name = ANIM_EMOJI[ch];
  if (!name || matchMedia("(prefers-reduced-motion: reduce)").matches) return ch;
  return `<img class="emoji-anim" src="/emoji/${name}.webp" alt="${ch}">`;
}

// Vervang bekende emoji-tekens in een (eigen i18n-)string door hun animatie.
function withAnimEmoji(str) {
  let out = str;
  for (const ch of Object.keys(ANIM_EMOJI)) out = out.replaceAll(ch, animEmojiHtml(ch));
  return out;
}

// Webp laadt niet (offline, oude Safari)? Zet het alt-teken terug in de tekst.
function armEmojiFallbacks(root) {
  root.querySelectorAll("img.emoji-anim").forEach((img) => {
    img.addEventListener("error", () => img.replaceWith(document.createTextNode(img.alt)), { once: true });
  });
}

// Zelfde deel-icoon als op het eindscherm (FA share-nodes, inline SVG) — voor
// de share-knop die renderRecap in de recap-modal zet.
const SHARE_ICON = '<svg class="btn-icon" viewBox="0 0 448 512" aria-hidden="true"><path fill="currentColor" d="M352 224c53 0 96-43 96-96s-43-96-96-96-96 43-96 96c0 4 .2 8 .7 11.9l-94.1 47C145 174.6 124.8 160 96 160c-53 0-96 43-96 96s43 96 96 96c28.8 0 49-14.6 62.6-30.9l94.1 47c-.5 3.9-.7 7.8-.7 11.9 0 53 43 96 96 96s96-43 96-96-43-96-96-96c-28.8 0-49 14.6-62.6 30.9l-94.1-47c.5-3.9 .7-7.8 .7-11.9s-.2-8-.7-11.9l94.1-47C303 209.4 323.2 224 352 224z"/></svg>';

function shareText() {
  const dayNum = daysSince(EPOCH) + 1;
  const tag = state.mode === "daily" ? `#${dayNum}` : t("free_tag");
  const guessScore = state.won ? `${state.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const grid = state.guesses.map((g) => emojiFor(g.cls)).join("");
  let intro;
  if (state.won) {
    const s = computeScore();
    const tier = scoreTier(s, true);
    intro = `Jaardle ${tag}: ${tier.emoji} ${tierLabel(tier)} (${s}/100)`;
  } else {
    const s = computeScore();
    intro = `Jaardle ${tag}: ${t("lost_share")} (${s}/100)`;
  }
  const statsParts = [`🎯 ${guessScore}`, `📊 ${grid}`];
  if (state.laterCluesShown > 0) statsParts.push(`⏩ ${state.laterCluesShown}`);
  if (state.directionsRevealed.length > 0) statsParts.push(`🧭 ${state.directionsRevealed.length}`);
  if (state.centuryRevealed) statsParts.push(`🏛️`);
  if (state.lastDigitRevealed) statsParts.push(`🔢`);
  return `${intro}\n${statsParts.join(" | ")}`;
}

// Native share-sheet alleen op echte mobiele toestellen. Op desktop (ook
// Windows/Edge, waar navigator.share bestaat) opent dat een nutteloze dialoog
// met e-mail e.d. — daar willen we gewoon kopiëren naar klembord.
function isMobileDevice() {
  if (navigator.userAgentData?.mobile != null) return navigator.userAgentData.mobile;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

async function doShare(btnEl) {
  // De "✓ Gekopieerd!"-feedback landt op de knop die je indrukte: het eind-
  // scherm (els.shareBtn) of de share-knop in de recap-modal.
  const btn = (btnEl && btnEl.nodeType === 1) ? btnEl : els.shareBtn;
  const text = shareText();
  const url = state.mode === "free"
    ? `https://jaardle.com/?p=${buildShareToken()}`
    : "https://jaardle.com/";
  if (navigator.share && isMobileDevice()) {
    try {
      await navigator.share({ text: `${text}\n${url}` });
      return;
    } catch (e) {
      if (e.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    const label = btn.querySelector(".share-label") || btn;
    label.textContent = t("lb_invite_copied");
    setTimeout(() => (label.textContent = t("share")), 1500);
  } catch (e) {
    prompt(t("copy_prompt"), `${text}\n${url}`);
  }
}

// Bepaal de puzzel (uit lokale cache of via RPC). Geeft { mode, hashes, event, board }
// of null (niet gevonden). Kan throwen bij netwerk/RPC-fout.
async function resolveRecord(mode, forceNew, sharedHashes, targetDate) {
  if (sharedHashes) {
    const cached = loadRecord("free");
    if (cached && arraysEqual(cached.hashes, sharedHashes)) return { mode: "free", ...cached };
    const p = await rpc("get_facts_by_hashes", { hashes: sharedHashes });
    if (!p) return null;
    return { mode: "free", hashes: p.hashes, event: toEvent(p), board: null, potId: newPotId() };
  }
  if (mode === "daily") {
    const d = targetDate || todayKey();   // targetDate = inhaalpot (gisteren); anders vandaag
    const cached = loadRecord("daily", d);   // bevat de puzzel (offline/instant) + bord
    if (cached) return { mode: "daily", puzzleDate: d, ...cached };
    const p = await rpc("get_daily", { d });
    if (!p) return null;
    // Geen lokale cache (ander apparaat / cache gewist), maar ingelogd? Herstel het
    // afgeronde bord uit de DB zodat de dagpuzzel niet opnieuw speelbaar lijkt.
    const board = await reconstructDailyBoard(p.year, d);
    return { mode: "daily", puzzleDate: d, hashes: p.hashes, band: p.band ?? null, event: toEvent(p), board };
  }
  // free
  if (!forceNew) {
    const cached = loadRecord("free");
    if (cached && !cached.board?.done) return { mode: "free", ...cached };
  }
  const p = await rpc("get_random_fact", {});
  if (!p) return null;
  return { mode: "free", hashes: p.hashes, event: toEvent(p), board: null, potId: newPotId() };
}

async function startGame(mode, forceNew = false, sharedHashes = null, targetDate = null) {
  if (forceNew) {
    try { localStorage.removeItem(storageKey(mode, targetDate)); } catch (e) {}
  }
  setKeypadDisabled(true);
  setCardStatus(t("loading"));
  stopDailyCountdown();
  els.result.hidden = true;
  els.nextBtn.hidden = true;
  if (els.recapBtn) els.recapBtn.hidden = true;

  let record;
  try {
    record = await resolveRecord(mode, forceNew, sharedHashes, targetDate);
  } catch (e) {
    console.error(e);
    setCardStatus(t("err_load"), () => startGame(mode, forceNew, sharedHashes, targetDate));
    return;
  }
  if (!record) {
    if (sharedHashes) setCardStatus(t("err_share"), () => switchMode("daily"));
    else setCardStatus(t("err_none"), () => startGame(mode, forceNew, sharedHashes, targetDate));
    return;
  }

  const b = record.board;
  state = {
    mode: record.mode,
    puzzleDate: record.puzzleDate || null,   // welke daily-dag (null bij vrij spel)
    // Per-pot dedup-slot (alleen vrij spel); oude records zonder potId krijgen er
    // hier alsnog een, zodat het legacy "free"-slot na deploy nergens meer opduikt.
    potId: record.potId || (record.mode !== "daily" ? newPotId() : null),
    band: record.band ?? null,               // moeilijkheids-band 1..3 (alleen daily, sinds db/29)
    hashes: record.hashes,
    event: record.event,
    guesses: b?.guesses || [],
    done: !!b?.done,
    won: !!b?.won,
    laterCluesShown: Math.max(0, Math.min(LATER_CLUE_SLOTS, b?.laterCluesShown || 0)),
    directionsRevealed: Array.isArray(b?.directionsRevealed) ? b.directionsRevealed : [],
    centuryRevealed: !!b?.centuryRevealed,
    lastDigitRevealed: !!b?.lastDigitRevealed,
    laterClues: b?.laterClues || null,
    laterPick: Array.isArray(b?.laterPick) ? b.laterPick : null,
  };

  setKeypadDisabled(false);
  clearYear();
  factSlideIndex = 0;   // start altijd bij het hoofdfeit
  renderEvent();
  renderHintStatus();
  renderGuesses();
  updateLiveScore(false);   // zet de teller op de juiste waarde (100 vers, lager bij restore)
  if (state.mode !== "daily") pruneFreeSentKeys(state.potId);
  save();
  syncUrl();
  loadLaterClues();   // async: vult/herrendert de clues zodra binnen

  if (state.done) finishGame(state.won);
  updateDayLabel();          // #N (+ inhaal-markering) van de nu actieve daily
  refreshMakeupBanner();     // toon/verberg de inhaal-uitnodiging (async, no-op bij free)
}

function syncUrl() {
  try {
    const target = modalUrlParam
      ? `${window.location.pathname}?${modalUrlParam}`
      : state.mode === "free"
        ? `${window.location.pathname}?p=${buildShareToken()}`
        : window.location.pathname;
    history.replaceState(null, "", target);
  } catch (e) { /* sandbox / file:// */ }
}

function switchMode(mode) {
  els.tabs.forEach((t) => {
    const selected = t.dataset.mode === mode;
    t.setAttribute("aria-selected", String(selected));
  });
  startGame(mode);
}

async function init() {
  applyLang();           // zet UI-taal + helptekst + daglabel (idempotent)
  injectAchvSvg();       // badge-artwork (SVG-defs) één keer in de DOM
  await whenSbReady();

  els.tabs.forEach((tab) => {
    tab.addEventListener("click", () => switchMode(tab.dataset.mode));
  });
  els.guessBtn.addEventListener("click", submitGuess);
  els.signBtn.addEventListener("click", toggleSign);
  els.backspaceBtn.addEventListener("click", backspaceYear);
  els.keypad.querySelectorAll("[data-digit]").forEach((btn) => {
    btn.addEventListener("click", () => appendDigit(btn.dataset.digit));
  });
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Niet onderscheppen wanneer iemand in een formulier-veld typt.
    const tag = e.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
    // Tab-shortcuts werken altijd, ook nadat de puzzel klaar is.
    if (e.key === "d" || e.key === "D") { switchMode("daily"); e.preventDefault(); return; }
    if (e.key === "n" || e.key === "N") { switchMode("free"); e.preventDefault(); return; }
    // ←/→ bladert door de carrousel (ook na afloop, om alle hints na te lezen).
    if (e.key === "ArrowLeft")  { goToSlide(factSlideIndex - 1); e.preventDefault(); return; }
    if (e.key === "ArrowRight") { goToSlide(factSlideIndex + 1); e.preventDefault(); return; }
    // C/L ná aankoop = spring naar de 🏛️/🔢-slide (ook na afloop, net als ←/→);
    // vóór aankoop kopen ze de hint (verderop).
    if ((e.key === "c" || e.key === "C") && state?.centuryRevealed)  { goToHintSlide("century"); e.preventDefault(); return; }
    if ((e.key === "l" || e.key === "L") && state?.lastDigitRevealed) { goToHintSlide("digit"); e.preventDefault(); return; }
    if (state && state.done) return;
    if (/^[0-9]$/.test(e.key)) { appendDigit(e.key); e.preventDefault(); }
    else if (e.key === "Backspace") { backspaceYear(); e.preventDefault(); }
    else if (e.key === "Enter") { submitGuess(); e.preventDefault(); }
    else if (e.key === "-" || e.key === "+") { toggleSign(); e.preventDefault(); }
    else if (e.key === "e" || e.key === "E") {
      if (els.hintBtnLater && !els.hintBtnLater.hidden) { requestLaterClue(); e.preventDefault(); }
    }
    else if (e.key === "r" || e.key === "R") {
      if (!els.hintBtnDir.hidden) { requestDirectionHint(); e.preventDefault(); }
    }
    else if (e.key === "c" || e.key === "C") {
      if (els.hintBtnCentury && !els.hintBtnCentury.hidden) { requestCenturyHint(); e.preventDefault(); }
    }
    else if (e.key === "l" || e.key === "L") {
      if (els.hintBtnDigit && !els.hintBtnDigit.hidden) { requestLastDigit(); e.preventDefault(); }
    }
  });
  els.shareBtn.addEventListener("click", () => doShare(els.shareBtn));
  els.nextBtn.addEventListener("click", () => {
    // Na een inhaalpot: naar de daily van vandaag (die houdt de streak levend).
    if (isMakeup(state)) { switchMode("daily"); return; }
    // Vanuit de daily wisselt het tabblad mee en loopt een onafgemaakt vrij spel
    // gewoon door; in vrij spel forceert de knop altijd een vers rondje.
    if (state?.mode === "daily") switchMode("free");
    else startGame("free", true);
  });
  // Hover laat de 🎲 dóórrollen: wissel de eenmalige die-once.webp voor de
  // loopende flair-die.webp en terug. Zo blijft de rustende knop stil (geen
  // eeuwige beweging) maar nodigt de rol-animatie uit zodra je 'm aanwijst.
  els.nextBtn.addEventListener("mouseenter", () => {
    const img = els.nextBtn.querySelector('img.emoji-anim[alt="🎲"]');
    if (img) img.src = "/emoji/flair-die.webp";
  });
  els.nextBtn.addEventListener("mouseleave", () => {
    const img = els.nextBtn.querySelector('img.emoji-anim[alt="🎲"]');
    if (img) img.src = "/emoji/die-once.webp";
  });
  if (els.recapBtn) els.recapBtn.addEventListener("click", () => openDailyRecap());
  if (els.hintBtnLater) els.hintBtnLater.addEventListener("click", requestLaterClue);
  els.hintBtnDir.addEventListener("click", requestDirectionHint);
  if (els.hintBtnCentury) els.hintBtnCentury.addEventListener("click", requestCenturyHint);
  if (els.hintBtnDigit) els.hintBtnDigit.addEventListener("click", requestLastDigit);
  // Waarde-chip tikken = terug naar de bijbehorende slide (daar staat bij 🏛️ ook
  // de periodenaam).
  if (els.hintChipCentury) els.hintChipCentury.addEventListener("click", () => goToHintSlide("century"));
  if (els.hintChipDigit) els.hintChipDigit.addEventListener("click", () => goToHintSlide("digit"));

  // Menu (⋮): toggle, items, en click-outside om te sluiten.
  // ⋮-menu (Statistieken + Inloggen) is voor iedereen zichtbaar.
  document.getElementById("menu-wrap").hidden = false;
  const menuBtn = document.getElementById("menu-btn");
  const menuPop = document.getElementById("menu-pop");
  menuBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleLangMenu(false); toggleMenu(); });
  menuPop.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;
    // Thema wisselt in-place; het menu blijft open zodat je het effect ziet
    // en zo weer terug kunt.
    if (action === "theme") {
      applyTheme(currentTheme() === "light" ? "dark" : "light");
      return;
    }
    toggleMenu(false);
    // Stats zijn er voor iedereen: anon ziet de lokale stats + bewaar-CTA.
    if (action === "stats") openModal("modal-stats");
    else if (action === "achievements") openModal("modal-achv");
    else if (action === "rating") openModal("modal-rating");
    else if (action === "leaderboard") openModal("modal-leaderboard");
    else if (action === "login") openModal("modal-login");
    else if (action === "logout") doSignOut();
  });
  document.addEventListener("click", (e) => {
    if (!menuPop.hidden && !menuPop.contains(e.target) && e.target !== menuBtn) {
      toggleMenu(false);
    }
  });

  // Taalkeuze (🌐): zichtbare dropdown rechts in de header, zelfde toggle/click-
  // outside-patroon als het ⋮-menu. Lijst komt uit LANGS (zie renderLangMenu).
  const langBtn = document.getElementById("lang-btn");
  const langPop = document.getElementById("lang-pop");
  langBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(false); toggleLangMenu(); });
  langPop.addEventListener("click", (e) => {
    const item = e.target.closest("[data-lang]");
    if (item) setLang(item.dataset.lang);
  });
  document.addEventListener("click", (e) => {
    if (!langPop.hidden && !langPop.contains(e.target) && !langBtn.contains(e.target)) {
      toggleLangMenu(false);
    }
  });
  renderMenu();
  syncThemeCheck();   // head-script kan het lichte thema al gezet hebben → vinkje bijzetten

  // Modals: backdrop / ✕ knop / Escape.
  document.querySelectorAll(".modal [data-close]").forEach((el) => {
    el.addEventListener("click", () => closeAllModals());
  });
  document.getElementById("help-btn")?.addEventListener("click", () => openModal("modal-help"));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
  });
  const loginForm = document.getElementById("login-form");
  loginForm.addEventListener("submit", (e) => doAuth("signin", e));
  document.getElementById("login-register").addEventListener("click", (e) => doAuth("signup", e));
  document.getElementById("login-google").addEventListener("click", doGoogleSignIn);
  document.getElementById("login-forgot").addEventListener("click", doForgot);
  document.getElementById("newpw-form").addEventListener("submit", doUpdatePassword);

  // Recovery-link geklikt (Supabase vuurt PASSWORD_RECOVERY via de module-bridge):
  // open het "nieuw wachtwoord"-scherm.
  window.addEventListener("sb-recovery", () => {
    closeAllModals();
    openModal("modal-newpw");
    document.querySelector('#newpw-form input[name="password"]')?.focus();
  });

  // Sync auth-state vanuit de Supabase module-bridge.
  window.addEventListener("sb-auth-changed", async (e) => {
    auth.user = e.detail
      ? { email: e.detail.email, uid: e.detail.uid, avatar: e.detail.avatar || null, name: e.detail.name || null }
      : null;
    auth.resolved = true;  // historie-bron is nu bekend (ook bij anon: detail=null)
    invalidateHistory();   // andere speler / uitgelogd -> stats opnieuw laden
    achvCache = null;      // prestaties horen bij de identiteit
    achvRefreshBaseline(); // stille snapshot (geen unlock-regen na login/wissel)
    renderMenu();
    await refreshPoolState();  // toont/verbergt de 🏆-knop + laadt je pool
    maybeOpenLeaderboardDeeplink();  // ?leaderboard / ?join afhandelen nu auth bekend is
    // Stats-/rating-modal open terwijl auth wisselt? Herteken met de juiste bron.
    const sm = document.getElementById("modal-stats");
    if (sm && !sm.hidden) renderStats();
    const rm = document.getElementById("modal-rating");
    if (rm && !rm.hidden) renderRatingModal();
    // Net ingelogd terwijl de dagpuzzel nog open staat? Herstel 'm uit de DB.
    // En: koppel een zojuist (anoniem) afgeronde pot aan dit account.
    refreshMyRating();  // rating-cache voor de ⚡-delta op het eindscherm
    if (auth.user) { maybeRestoreDailyAfterLogin(); claimPlayOnLogin(); }
    // Auth komt op een reload ná het herstellen van een afgerond dagbord binnen;
    // de streakregel is dan met local-only historie getekend (vaak "streak 1").
    // maybeRestoreDailyAfterLogin stopt bij state.done, dus herteken 'm hier met
    // de nu-gezaghebbende DB-historie (werkt ook bij uitloggen → terug naar local).
    if (state?.done && state.mode === "daily") appendStreakLine(state.won);
    // Historie-bron wisselde (login/logout) → herbeoordeel de inhaal-uitnodiging.
    refreshMakeupBanner();
  });

  // Pepertjes: tik toont het moeilijkheidslabel even (hover bestaat niet op mobiel).
  if (els.diffHeat) els.diffHeat.addEventListener("click", () => openDiffHeat(1800));

  // Tekst-box (Instagram-stijl): slepen bladert (muis óf touch, vanaf overal op de
  // kaart, ook de randen), en een tik in de linker- of rechterzone gaat terug/verder.
  // touch-action: pan-y (CSS) houdt verticaal scrollen intact.
  if (els.eventCard) {
    let sx = 0, sy = 0, dragging = false, active = false, slideCount = 1, width = 1;
    els.eventCard.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".fact-dot, .diff-heat")) return;   // stippen/pepertjes doen hun eigen klik
      slideCount = factSlides().length;
      if (slideCount <= 1) return;
      active = true; dragging = false;
      sx = e.clientX; sy = e.clientY;
      width = els.eventText.querySelector(".fact-carousel")?.clientWidth || els.eventCard.clientWidth || 1;
    });
    els.eventCard.addEventListener("pointermove", (e) => {
      if (!active) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (!dragging && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
        dragging = true;
        try { els.eventCard.setPointerCapture(e.pointerId); } catch (_) {}
      }
      if (dragging) {
        const track = els.eventText.querySelector(".fact-track");
        if (track) {
          track.style.transition = "none";
          track.style.transform = `translateX(calc(${-factSlideIndex * 100}% + ${dx}px))`;
        }
      }
    });
    const endDrag = (e) => {
      if (!active) return;
      active = false;
      if (dragging) {
        dragging = false;
        const dx = e.clientX - sx;
        const threshold = Math.min(60, width * 0.2);
        if (dx < -threshold) factSlideIndex = Math.min(factSlideIndex + 1, slideCount - 1);
        else if (dx > threshold) factSlideIndex = Math.max(factSlideIndex - 1, 0);
        applyFactTransform(true);
        updateFactDots();
      } else {
        // Tik zonder slepen → zone-navigatie: linker 40% terug, rechter 40% verder.
        const rect = els.eventCard.getBoundingClientRect();
        const rel = (e.clientX - rect.left) / rect.width;
        if (rel <= 0.4) goToSlide(factSlideIndex - 1);
        else if (rel >= 0.6) goToSlide(factSlideIndex + 1);
      }
    };
    els.eventCard.addEventListener("pointerup", endDrag);
    els.eventCard.addEventListener("pointercancel", endDrag);
  }

  // Diepe links /login en /register sturen (via redirect-stubs) door naar
  // ?auth=login|register. Vang dat op vóór startGame de URL opschoont.
  const wantAuth = new URLSearchParams(window.location.search).get("auth");

  // ?leaderboard-deeplink: markeer de intentie en schoon de URL op. De
  // sb-auth-changed-handler opent het bord zodra login + lidmaatschap bekend zijn.
  const lbParams = new URLSearchParams(window.location.search);
  const joinCode = lbParams.get("join");
  if (joinCode) {
    pendingJoinCode = joinCode.trim().toUpperCase().slice(0, 6);
    lbParams.delete("join");
    // Park de intentie zodat ze een page-reload overleeft: Google-login redirect
    // weg en terug (en gooit de ?join=-query weg), waardoor de in-memory variabele
    // verloren zou gaan. Wordt gewist zodra we de join-bevestiging tonen.
    try { localStorage.setItem("jaardle:pendingJoin", pendingJoinCode); } catch (e) {}
  } else {
    // Geen ?join= in de URL, maar misschien staat er nog een geparkeerde
    // join-intentie van vóór een OAuth-redirect. Herstel 'm dan.
    try {
      const stored = localStorage.getItem("jaardle:pendingJoin");
      if (stored) pendingJoinCode = stored;
    } catch (e) {}
  }
  if (lbParams.has("leaderboard")) {
    pendingOpenLeaderboard = true;
    lbParams.delete("leaderboard");
  }
  // ?rating / ?achievements: zelfde patroon — intentie parkeren, URL opschonen,
  // openen zodra auth bekend is (voorkomt een anon-flits voor ingelogde spelers).
  if (lbParams.has("rating")) { pendingOpenModal = "modal-rating"; lbParams.delete("rating"); }
  if (lbParams.has("achievements")) { pendingOpenModal = "modal-achv"; lbParams.delete("achievements"); }
  if (joinCode || pendingOpenLeaderboard || pendingOpenModal) {
    const qs = lbParams.toString();
    history.replaceState(null, "", window.location.pathname + (qs ? "?" + qs : "") + window.location.hash);
  }

  const sharedHashes = getSharedLocation();
  if (sharedHashes) {
    // Open een door iemand gedeeld vrij spel.
    els.tabs.forEach((t) => {
      t.setAttribute("aria-selected", String(t.dataset.mode === "free"));
    });
    startGame("free", false, sharedHashes);
  } else {
    switchMode("daily");
  }

  // Open de login-modal als /login of /register is bezocht (tenzij al ingelogd).
  // Login en registreren zitten in dezelfde modal.
  if ((wantAuth === "login" || wantAuth === "register") && !auth.user) {
    openModal("modal-login");
  }
  // Fallback voor de recovery-flow: als het PASSWORD_RECOVERY-event al vuurde vóór
  // onze listener bestond, opent ?auth=recovery het "nieuw wachtwoord"-scherm alsnog.
  if (wantAuth === "recovery") {
    openModal("modal-newpw");
    document.querySelector('#newpw-form input[name="password"]')?.focus();
  }
}

function getSharedLocation() {
  const params = new URLSearchParams(window.location.search);
  const p = params.get("p");
  if (p === null) return null;
  return parseShareToken(p);  // array van 10-hex hashes, of null
}

init().catch((err) => {
  // t() kan zelf stukgelopen zijn als de fout héél vroeg zat — val dan terug op NL.
  let msg = "Kon de gebeurtenis niet laden.";
  try { msg = t("err_load") || msg; } catch (e) {}
  els.eventText.textContent = msg;
  console.error(err);
});
