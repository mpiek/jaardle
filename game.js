const MAX_GUESSES = 6;
const FACTS_PER_PUZZLE = 1;
const MAX_EXTRA_HINTS = 2;
const MAX_DIRECTION_HINTS = 2;
// Twee gratis zelfde-tijd-extra's komen vrij bij gok 1 en gok 2 → gok-rij-index 0 en 1.
// Waarde = hoeveelste extra (1e/2e) bij die rij hoort.
const LATER_FREE_AT_ROW = { 0: 1, 1: 2 };
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
// Velden per taal: label (menu), html (<html lang>), intl (Intl + ld+json),
// og (og:locale), path (URL-segment; "" = root-taal).
const LANGS = {
  nl: { label: "🇳🇱 Nederlands", html: "nl", intl: "nl-NL", og: "nl_NL", path: "nl" },
  en: { label: "🇬🇧 English",    html: "en", intl: "en-GB", og: "en_GB", path: "" },
  de: { label: "🇩🇪 Deutsch",    html: "de", intl: "de-DE", og: "de_DE", path: "de" },
  es: { label: "🇪🇸 Español",    html: "es", intl: "es-ES", og: "es_ES", path: "es" },
  pt: { label: "🇧🇷 Português",  html: "pt", intl: "pt-BR", og: "pt_BR", path: "pt" },
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
  <li>Je krijgt een gebeurtenis uit een jaar en <span data-help="max-guesses"></span> pogingen om dat jaar te raden. In de carrousel komen er bij gok 1 en gok 2 <strong>gratis</strong> twee extra feiten uit hetzelfde jaar bij (💡 geel).</li>
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
  <li>You get an event from a year and <span data-help="max-guesses"></span> guesses to find that year. In the carousel, guesses 1 and 2 each add a <strong>free</strong> extra fact from the same year (💡 yellow).</li>
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
  <li>Du bekommst ein Ereignis aus einem Jahr und <span data-help="max-guesses"></span> Versuche, dieses Jahr zu erraten. Im Karussell kommen bei Versuch 1 und 2 jeweils <strong>gratis</strong> zwei zusätzliche Fakten aus demselben Jahr dazu (💡 gelb).</li>
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
  <li>Recibes un acontecimiento de un año y <span data-help="max-guesses"></span> intentos para adivinar ese año. En el carrusel, los intentos 1 y 2 añaden cada uno <strong>gratis</strong> dos datos adicionales del mismo año (💡 amarillo).</li>
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
  <li>Você recebe um acontecimento de um ano e <span data-help="max-guesses"></span> tentativas para adivinhar esse ano. No carrossel, as tentativas 1 e 2 adicionam cada uma <strong>grátis</strong> dois fatos extras do mesmo ano (💡 amarelo).</li>
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
    free_hint: "extra hint",
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
    free_hint: "extra hint",
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
    free_hint: "Extra-Hinweis",
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
    free_hint: "Pista extra",
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
    free_hint: "Dica extra",
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

// Aantal gratis "zelfde tijd"-extra's dat nu zichtbaar is: automatisch onthuld bij
// gok 1 en gok 2 (één per keer), ná afloop allemaal. Geen strafpunten.
function revealedExtraCount() {
  if (!state || !state.event) return 0;
  // Verlies: toon alle beschikbare extra's ter lering. Anders (spel + winst): de
  // twee gratis extra's die bij gok 1 en gok 2 vrijkomen.
  if (state.done && !state.won) return availableExtras();
  // De gratis extra komt alleen vrij als je ná een gok dóórspeelt: de gok die
  // het spel wint telt niet mee (die had de hint niet meer nodig). Zonder deze
  // aftrek kreeg je bij winst-in-1-gok tóch de "2e" hint (de extra) te zien.
  const g = state.guesses.length - (state.won ? 1 : 0);
  return Math.min(availableExtras(), (g >= 1 ? 1 : 0) + (g >= 2 ? 1 : 0));
}

// De carrousel ÍS de hint-deck. Volgorde: hoofdfeit → gratis zelfde-tijd-extra's
// (💡 geel, bij gok 1/2) → ⏩ "100 jaar later" → 🏛️ eeuw → 🔢 laatste cijfer.
// Betaalde hints staan als "tik om te onthullen"-slot (locked) en morphen naar hun
// inhoud zodra je betaalt. Ná afloop staat alles open om na te lezen.
function factSlides() {
  if (!state || !state.event) return [];
  const slides = state.event.facts.map((f) => ({ kind: "main", ...f }));
  // Gratis zelfde-tijd-extra's (geel), onthuld bij gok 1/2.
  const ex = revealedExtraCount();
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
  // Teller: ⏩ "100 jaar later" (altijd /2 zodra geladen — verraadt de toekomst-variant
  // niet) + 🧭 richtingen.
  const laterPart = availLater > 0 ? `⏩ ${state.laterCluesShown}/${availLater} · ` : "";
  els.hintCount.textContent = `${laterPart}🧭 ${state.directionsRevealed.length}/${MAX_DIRECTION_HINTS} ${t("dir_word")}`;
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
// De gratis zelfde-tijd-extra's bij gok 1/2 staan los hiervan (zie
// revealedExtraCount). Fallback "toekomst" als antwoordjaar+venster > nu.

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
      // Op de plekken waar een gratis (gele) zelfde-tijd-extra vrijkomt — gok 1 en 2,
      // dus rij-index 0 en 1 — een 💡 + grijs "extra hint"-label zodat je 't ziet
      // aankomen. De 💡 pulseert alleen op de eerstvolgende gok-plek.
      const needExtra = LATER_FREE_AT_ROW[idx];   // hoeveelste extra hoort bij deze rij
      if (!state.done && needExtra && availableExtras() >= needExtra) {
        const m = document.createElement("span");
        m.className = "free-hint-marker";
        const bulb = document.createElement("span");
        bulb.className = "free-hint-bulb" + (idx === state.guesses.length ? " next" : "");
        bulb.textContent = "💡";
        const lbl = document.createElement("span");
        lbl.className = "free-hint-label";
        // Altijd "extra hint" — ook op de eerste plek (gok 1). Eerder stond hier
        // "raad het jaar", maar het label hoort overal consistent "extra hint" te zijn.
        lbl.textContent = t("free_hint");
        m.append(bulb, lbl);
        row.appendChild(m);
      }
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

// Een sliert lampjes (💡) die van de zojuist gespeelde gok-rij omhoog naar de
// carrousel zwiert wanneer er een gratis hint vrijkomt. De beweging trekt het oog
// naar het nieuwe feit bovenin (i.p.v. een melding die je moet wegtikken). Vuurt
// élke keer — het is een korte, leuke beweging, geen blijvend merkteken. Uit bij
// prefers-reduced-motion.
function flyHintBulbs(fromEl, toEl) {
  if (!fromEl || !toEl) return;
  if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const sx = a.left + a.width * 0.5, sy = a.top + a.height * 0.5;   // start: midden gok-rij
  const tx = b.left + b.width * 0.5, ty = b.top + b.height * 0.55;  // doel: de carrousel
  const container = document.createElement("div");
  container.className = "bulb-stream";
  const N = 7;
  let maxEnd = 0;
  for (let i = 0; i < N; i++) {
    const bulb = document.createElement("span");
    bulb.className = "bulb";
    bulb.textContent = "💡";
    container.appendChild(bulb);
    const jx = (Math.random() - 0.5) * 38, jy = (Math.random() - 0.5) * 16;  // spreiding bij start
    const ex = (Math.random() - 0.5) * 44;                                   // spreiding bij carrousel
    const dir = i % 2 === 0 ? 1 : -1;
    const swirl = (46 + Math.random() * 44) * dir;                           // zijwaartse zwieer
    const midx = (sx + jx + tx + ex) / 2 + swirl, midy = (sy + jy + ty) / 2 - 12;
    const delay = i * 65, dur = 820 + Math.random() * 260;
    maxEnd = Math.max(maxEnd, delay + dur);
    bulb.animate([
      { transform: `translate(${sx + jx}px, ${sy + jy}px) scale(0.3) rotate(0deg)`, opacity: 0 },
      { transform: `translate(${sx + jx}px, ${sy + jy}px) scale(1) rotate(-8deg)`, opacity: 1, offset: 0.14 },
      { transform: `translate(${midx}px, ${midy}px) scale(1.05) rotate(${8 * dir}deg)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${tx + ex}px, ${ty}px) scale(0.5) rotate(0deg)`, opacity: 0 },
    ], { duration: dur, delay, easing: "cubic-bezier(0.4, 0, 0.2, 1)", fill: "forwards" });
  }
  document.body.appendChild(container);
  setTimeout(() => toEl.classList.add("hint-arrived"), Math.max(0, maxEnd - 240));
  // 'hint-arrived' moet blijven staan tot de catch-glow (1s) helemaal klaar is.
  setTimeout(() => { toEl.classList.remove("hint-arrived"); container.remove(); }, maxEnd + 900);
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

// Handelt de ?leaderboard- en ?join-deeplinks af zodra de auth-state binnen is.
// Uitgelogd → login-nudge (intentie blijft staan tot na login).
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
  const grid = flairPickerOpen
    ? `<div class="lb-flair-opts">${opt("", t("lb_flair_none"), " lb-flair-clear") + FLAIR_OPTIONS.map((e) => opt(e, e, "")).join("")}</div>`
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
  await renderRatingStats(body);
  await renderCenturyStats(body);
}

// ⚡ Rating-verloop (lichess-stijl): per dag de laatste elo uit de DB-historie
// (record_play appendt live, de nachtelijke replay herbouwt — een kleine
// ochtend-verschuiving is dus normaal). Alleen ingelogd; verbergt zich zolang
// er nog geen twee dagen aan punten zijn (één punt is geen lijn).
async function renderRatingStats(body) {
  let hist;
  try { hist = await rpc("get_my_rating_history", {}); } catch (e) { return; }
  if (!Array.isArray(hist) || hist.length < 2) return;
  if (document.getElementById("modal-stats").hidden) return;

  const pts = hist.map((p) => ({ t: Date.parse(p.d), d: p.d, elo: p.elo, n: p.n }));
  const first = pts[0], last = pts[pts.length - 1];
  const lo = Math.min(...pts.map((p) => p.elo)), hi = Math.max(...pts.map((p) => p.elo));
  const pad = Math.max(8, Math.round((hi - lo) * 0.15));   // ademruimte boven/onder de lijn
  const yLo = lo - pad, yHi = hi + pad;

  // Teken op de echte modalbreedte zodat de as-labels op ware grootte renderen
  // (een vaste brede viewBox zou op mobiel alles mee laten krimpen).
  const W = Math.max(280, Math.min(560, body.clientWidth || 480));
  const H = 170, L = 44, R = 10, T = 10, B = 22;
  const x = (t) => L + (W - L - R) * (t - first.t) / Math.max(1, last.t - first.t);
  const y = (e) => T + (H - T - B) * (yHi - e) / (yHi - yLo);

  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.elo).toFixed(1)}`).join("");
  const area = `${line}L${(W - R).toFixed(1)},${H - B}L${L},${H - B}Z`;
  const grid = [...new Set([yLo, Math.round((yLo + yHi) / 2), yHi])];

  const delta = last.elo - first.elo;
  const badge = delta === 0 ? "" :
    `<span class="rating-delta ${delta > 0 ? "up" : "down"}">${delta > 0 ? "+" : "−"}${Math.abs(delta)}</span>`;
  const sec = document.createElement("div");
  sec.className = "stats-section stats-rating";
  sec.innerHTML = `
    <h3 class="stats-heading">⚡ ${t("stats_rating")}</h3>
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
    </div>`;
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
function setModalUrl(param) {
  try {
    if (param) history.replaceState(null, "", window.location.pathname + "?" + param);
    else syncUrl();
  } catch (e) { /* sandbox / file:// */ }
}

function openModal(id) {
  document.getElementById(id).hidden = false;
  if (id === "modal-stats") renderStats();
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
  // Komt er bij deze gok een gratis zelfde-tijd-extra vrij (bij gok 1 → 1e, gok 2 → 2e)?
  // Herbouw de carrousel, schuif naar de nieuwe gele slide en geef de zojuist
  // gevulde gok-rij een korte gele "unlocked"-puls op de plek van de placeholder.
  const gl = state.guesses.length;
  // De gratis extra (+ lampjes-animatie) komt alleen vrij als je dóórspeelt: niet als
  // deze gok het spel wint of je laatste poging was — dan krijg je de hint niet.
  const willFinish = cls === "correct" || state.guesses.length >= MAX_GUESSES;
  const unlocksExtra = !state.done && !willFinish &&
    ((gl === 1 && availableExtras() >= 1) || (gl === 2 && availableExtras() >= 2));
  if (unlocksExtra) {
    renderEvent();
    const track = els.eventText.querySelector(".fact-track");
    if (track) void track.offsetWidth;
    goToSlide(state.event.facts.length + revealedExtraCount() - 1);
    const justRow = els.guesses.querySelectorAll(".guess-row")[gl - 1];
    const carousel = els.eventText.querySelector(".fact-carousel");
    if (justRow) {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        justRow.classList.add("hint-unlocked");
        flyHintBulbs(justRow, carousel);   // lampjes zwieren omhoog naar het nieuwe feit
      }));
    }
  }
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
    const target = state.mode === "free"
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
    renderMenu();
    await refreshPoolState();  // toont/verbergt de 🏆-knop + laadt je pool
    maybeOpenLeaderboardDeeplink();  // ?leaderboard / ?join afhandelen nu auth bekend is
    // Stats-modal open terwijl auth wisselt? Herteken met de juiste bron.
    const sm = document.getElementById("modal-stats");
    if (sm && !sm.hidden) renderStats();
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
  if (joinCode || new URLSearchParams(window.location.search).has("leaderboard")) {
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
