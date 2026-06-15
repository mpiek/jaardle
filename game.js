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
  nl: { label: "🇳🇱 Nederlands", html: "nl", intl: "nl-NL", og: "nl_NL", path: "" },
  en: { label: "🇬🇧 English",    html: "en", intl: "en-GB", og: "en_GB", path: "en" },
};
const LANG_CODES = Object.keys(LANGS);
// Brontaal: hieruit lenen we een string/feit als de huidige taal die mist (het
// meest complete blok). Los van de browser-detectie-fallback hieronder.
const DEFAULT_LANG = "nl";
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
  <li><strong>Swipe de carrousel voor meer hints</strong> — tik "Onthul" (kost punten): <strong>⏩ 100 jaar later</strong> en daarna <strong>⏩ 250 jaar later</strong> (gebeurtenissen ná het antwoord), <strong>🏛️ tijdvak</strong> (de eeuw) en <strong>🔢 laatste cijfer</strong> van het jaartal.</li>
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
  <li><strong>Swipe the carousel for more hints</strong> — tap "Reveal" (costs points): <strong>⏩ 100 years later</strong> then <strong>⏩ 250 years later</strong> (events after the answer), <strong>🏛️ era</strong> (the century) and the <strong>🔢 last digit</strong> of the year.</li>
  <li>Each guess shows a coloured badge with a range. Direction (↑/↓) stays hidden until you ask for it.</li>
  <li>Max <strong><span data-help="max-dir-hints"></span> direction hints</strong> (🧭) per puzzle. A direction hint reveals the arrow only on your latest guess.</li>
  <li>🟩 0 &nbsp; 🟪 1–2 &nbsp; 🟨 3–10 &nbsp; 🟧 11–25 &nbsp; 🟥 26–50 &nbsp; 🟫 51–200 &nbsp; ⬜ 201–599 &nbsp; ⬛ 600+</li>
  <li><strong>Score (0–100)</strong>: starts at 100, penalty per wrong guess: 🟪 <span data-penalty="veryclose"></span> · 🟨 <span data-penalty="close"></span> · 🟧 <span data-penalty="warm"></span> · 🟥 <span data-penalty="cool"></span> · 🟫 <span data-penalty="far"></span> · ⬜ <span data-penalty="distant"></span> · ⬛ <span data-penalty="farthest"></span>. The yellow extra facts are free; ⏩ <span data-penalty="later-clue"></span>, 🏛️ <span data-penalty="century-hint"></span>, 🔢 <span data-penalty="digit-hint"></span> and 🧭 <span data-penalty="dir-hint"></span> cost points. Lost = 0–10, based on your closest guess.</li>
  <li>Tiers: <span data-help="tiers"></span></li>
  <li><strong>Daily Jaardle</strong>: one puzzle a day, the same for everyone.</li>
  <li><strong>New game</strong>: endless rounds, a random event.</li>
  <li><strong>Keys</strong>: digits + Enter to guess, <kbd>−</kbd> for BC, <kbd>R</kbd> for a direction hint, <kbd>D</kbd>/<kbd>N</kbd> to switch.</li>`;

const I18N = {
  nl: {
    tab_daily: "Dagelijkse Jaardle", tab_free: "Nieuw spel",
    menu_stats: "📊 Statistieken", menu_login: "🔑 Inloggen", menu_logout: "Uitloggen", menu_loggedin: "Ingelogd",
    guess: "Gok", share: "Deel resultaat", next: "Nieuw rondje",
    hint_text: "💡 Extra hint", hint_dir: "🧭 Richting", hint_century: "🏛️ Eeuw",
    hint_later: "⏩ 100 jaar later", hint_later_250: "⏩ 250 jaar later", hint_digit: "🔢 Laatste cijfer",
    century_band: "🏛️ Tijdvak", bc: "v.Chr.",
    reveal: "Onthul",
    main_label: "Dit jaar", extra_label: "Ook dit jaar",
    century_label: "Tijdvak",
    digit_label: "Laatste cijfer",
    free_hint: "extra hint",
    score_label: "punten",
    later_label: "100 jaar later", later_label_250: "250 jaar later",
    later_future: "Dit is nog toekomst — 100 jaar later is nog niet geweest.",
    later_future_2: "Ook dát is nog niet geweest — het antwoord ligt dus in de afgelopen ~100 jaar.",
    later_future_250: "Ook 250 jaar later is nog niet geweest — het antwoord ligt in de afgelopen ~250 jaar.",
    later_none: "Verder geen gebeurtenis van rond honderd jaar later bekend.",
    later_none_250: "Verder geen gebeurtenis van rond 250 jaar later bekend.",
    help_summary: "Hoe werkt het?", stats_title: "📊 Statistieken",
    login_title: "Inloggen", login_google: "Doorgaan met Google", login_or: "of met e-mail",
    login_email: "E-mail", login_password: "Wachtwoord", login_submit: "Inloggen", login_register: "Registreren",
    login_note: `Inloggen verloopt via <a href="https://supabase.com/docs/guides/auth" target="_blank" rel="noopener">Supabase Auth</a> (Google). Wachtwoorden worden gehasht opgeslagen (bcrypt), nooit als platte tekst, en alleen jouw e-mail en spelscores worden bewaard — niet gedeeld met derden.`,
    footer_note: `Gebeurtenissen + Nederlandse vertalingen onder <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.nl" target="_blank" rel="noopener">CC BY-SA 4.0</a>, afgeleid van <a href="https://en.wikipedia.org/wiki/Main_Page" target="_blank" rel="noopener">Engelstalige Wikipedia</a> (machine-vertaald).`,
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
    menu_leaderboard: "🏆 Leaderboard", lb_title: "🏆 Leaderboard",
    lb_daily: "Daily", lb_overall: "Aller tijden",
    lb_stat_rating: "Rating", lb_stat_streak: "Streak",
    lb_stat_prev: "Vorige stat", lb_stat_next: "Volgende stat",
    lb_empty_daily: "Nog niemand heeft de daily van vandaag gespeeld.",
    lb_empty_daily_past: "Niemand uit je pool heeft deze daily gespeeld.",
    lb_daily_prev: "Vorige dag", lb_daily_next: "Volgende dag",
    lb_empty_overall: "Nog geen ranglijst — speel een paar potjes.",
    lb_not_member: "Je staat (nog) niet op een vriendenbord.",
    lb_sync: "⏳ Rating bijgewerkt over", lb_synced: "✨ Rating zojuist bijgewerkt",
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
    lb_join_q: (name) => `Pool "${name}" joinen?`,
    lb_switch_q: (cur, name) => `Je zit al in "${cur}". Overstappen naar "${name}"? Je verlaat dan "${cur}".`,
    recap_btn: "Verdeling & team",
    recap_title: "📊 Klaar voor vandaag", recap_dist_title: "🌍 Verdeling pogingen (iedereen)",
    recap_dist_empty: "Nog niemand heeft deze daily opgelost.",
    recap_team_title: "Teamstand vandaag", recap_today: "vandaag",
    recap_login: "Log in om je teamstand te zien.", recap_login_btn: "🔑 Inloggen",
    recap_pool_none: "Maak of join een pool om je vrienden hier te zien.", recap_pool_btn: "🏆 Pool maken of joinen",
    recap_acct_title: "Met een gratis account",
    recap_acct_1: "📊 Je statistieken & streak blijven bewaard",
    recap_acct_2: "☁️ Speel verder op al je apparaten",
    recap_acct_3: "🏆 Vergelijk je daily met vrienden in een pool",
    recap_acct_btn: "Inloggen of account maken",
    recap_acct_free: "Altijd 100% gratis — geen betaalde versie, geen advertenties.",
    tiers: { perfect: "Perfect", impressive: "Indrukwekkend", good: "Goed", solid: "Solide", justmade: "Net gehaald", lost: "Volgende keer beter" },
    dir_word: "richtingen",
    avg_word: "gem.",
    copy_prompt: "Kopieer dit:",
    cal_solved: (g, max) => `opgelost (${g}/${max})`,
    fact_stats: (s, hasScore) =>
      `🌍 ${s.games} ${s.games === 1 ? "speler" : "spelers"} · ${s.win_pct}% opgelost${hasScore ? ` · gem. score ${s.avg_score}/100` : ""} · gem. ${s.avg_guesses} pogingen · ${s.first_try_pct}% in één keer`,
    // SEO/meta — door tools/build-html.mjs in de <head> + het introblok gezet.
    meta_title: "Jaardle — raad het jaar",
    meta_share_title: "Jaardle — raad het jaar van historische gebeurtenissen",
    meta_desc: "Gratis Nederlands jaartal-puzzelspel in Wordle-stijl: raad in zes pogingen het jaar van een historische gebeurtenis. Dagelijkse puzzel of vrij spel.",
    intro_h1: "Jaardle — het dagelijkse jaartal-raadspel",
    intro_html: `Jaardle is een gratis puzzelspel in Wordle-stijl: je krijgt een historische gebeurtenis en raadt in een paar pogingen in welk jaar die plaatsvond. Speel elke dag dezelfde <strong>dagelijkse puzzel</strong> als iedereen, of oneindig <strong>vrij spel</strong>, vergelijk je score met vrienden en bouw je streak op.`,
    help_list: HELP_NL,
  },
  en: {
    tab_daily: "Daily Jaardle", tab_free: "New game",
    menu_stats: "📊 Statistics", menu_login: "🔑 Sign in", menu_logout: "Sign out", menu_loggedin: "Signed in",
    guess: "Guess", share: "Share result", next: "New round",
    hint_text: "💡 Extra hint", hint_dir: "🧭 Direction", hint_century: "🏛️ Century",
    hint_later: "⏩ 100 years later", hint_later_250: "⏩ 250 years later", hint_digit: "🔢 Last digit",
    century_band: "🏛️ Era", bc: "BC",
    reveal: "Reveal",
    main_label: "This year", extra_label: "Also this year",
    century_label: "Era",
    digit_label: "Last digit",
    free_hint: "extra hint",
    score_label: "points",
    later_label: "100 years later", later_label_250: "250 years later",
    later_future: "This is still the future — 100 years later hasn't happened yet.",
    later_future_2: "That hasn't happened yet either — so the answer is from the last ~100 years.",
    later_future_250: "250 years later hasn't happened yet either — so the answer is from the last ~250 years.",
    later_none: "No further event from around a hundred years later is known.",
    later_none_250: "No further event from around 250 years later is known.",
    help_summary: "How to play?", stats_title: "📊 Statistics",
    login_title: "Sign in", login_google: "Continue with Google", login_or: "or with email",
    login_email: "Email", login_password: "Password", login_submit: "Sign in", login_register: "Register",
    login_note: `Sign-in is handled by <a href="https://supabase.com/docs/guides/auth" target="_blank" rel="noopener">Supabase Auth</a> (Google). Passwords are stored hashed (bcrypt), never as plain text, and only your email and game scores are kept — not shared with third parties.`,
    footer_note: `Events + Dutch translations under <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.en" target="_blank" rel="noopener">CC BY-SA 4.0</a>, derived from <a href="https://en.wikipedia.org/wiki/Main_Page" target="_blank" rel="noopener">English Wikipedia</a> (machine-translated).`,
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
    menu_leaderboard: "🏆 Leaderboard", lb_title: "🏆 Leaderboard",
    lb_daily: "Daily", lb_overall: "All-time",
    lb_stat_rating: "Rating", lb_stat_streak: "Streak",
    lb_stat_prev: "Previous stat", lb_stat_next: "Next stat",
    lb_empty_daily: "Nobody has played today's daily yet.",
    lb_empty_daily_past: "Nobody in your pool played this daily.",
    lb_daily_prev: "Previous day", lb_daily_next: "Next day",
    lb_empty_overall: "No ranking yet — play a few rounds.",
    lb_not_member: "You're not on a friends board (yet).",
    lb_sync: "⏳ Rating updates in", lb_synced: "✨ Rating just updated",
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
    lb_join_q: (name) => `Join pool "${name}"?`,
    lb_switch_q: (cur, name) => `You're already in "${cur}". Switch to "${name}"? You'll leave "${cur}".`,
    recap_btn: "Distribution & team",
    recap_title: "📊 Done for today", recap_dist_title: "🌍 Guess distribution (everyone)",
    recap_dist_empty: "Nobody has solved this daily yet.",
    recap_team_title: "Today's team standings", recap_today: "today",
    recap_login: "Sign in to see your team standings.", recap_login_btn: "🔑 Sign in",
    recap_pool_none: "Create or join a pool to see your friends here.", recap_pool_btn: "🏆 Create or join a pool",
    recap_acct_title: "With a free account",
    recap_acct_1: "📊 Your stats & streak are saved",
    recap_acct_2: "☁️ Keep playing across all your devices",
    recap_acct_3: "🏆 Compare your daily with friends in a pool",
    recap_acct_btn: "Sign in or create account",
    recap_acct_free: "Always 100% free — no paid tier, no ads.",
    tiers: { perfect: "Perfect", impressive: "Impressive", good: "Good", solid: "Solid", justmade: "Just made it", lost: "Better luck next time" },
    dir_word: "directions",
    avg_word: "avg.",
    copy_prompt: "Copy this:",
    cal_solved: (g, max) => `solved (${g}/${max})`,
    fact_stats: (s, hasScore) =>
      `🌍 ${s.games} ${s.games === 1 ? "player" : "players"} · ${s.win_pct}% solved${hasScore ? ` · avg. score ${s.avg_score}/100` : ""} · avg. ${s.avg_guesses} guesses · ${s.first_try_pct}% first try`,
    // SEO/meta — used by tools/build-html.mjs for the <head> + intro block.
    meta_title: "Jaardle — guess the year",
    meta_share_title: "Jaardle — guess the year of historic events",
    meta_desc: "Free Wordle-style year-guessing puzzle: guess the year of a historic event in six tries. Daily puzzle or endless free play.",
    intro_h1: "Jaardle — the daily year-guessing game",
    intro_html: `Jaardle is a free Wordle-style puzzle game: you get a historic event and guess the year it happened in a few tries. Play the same <strong>daily puzzle</strong> as everyone else, or endless <strong>free play</strong>, compare your score with friends and build your streak.`,
    help_list: HELP_EN,
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
  const help = document.getElementById("help-list");
  if (help) help.innerHTML = t("help_list");
  renderHelpConstants();
  const langItem = document.querySelector('#menu-pop [data-action="lang"]');
  if (langItem) langItem.textContent = LANGS[nextLang()].label;
  if (els.dayLabel) els.dayLabel.textContent = `${t("day")} #${daysSince(EPOCH) + 1}`;
  renderMenu();
  if (state) {
    renderEvent();
    renderHintStatus();
    if (state.done) finishGame(state.won);
  }
  const sm = document.getElementById("modal-stats");
  if (sm && !sm.hidden) renderStats();
}

// Volgende taal in de cyclus (wrapt rond). Bij 2 talen = simpele toggle; bij 3+
// loop je er stap voor stap doorheen via het menu-item.
function nextLang() {
  return LANG_CODES[(LANG_CODES.indexOf(lang) + 1) % LANG_CODES.length];
}

function toggleLang() {
  lang = nextLang();
  applyLang();
  // Houd de URL in lijn met de taal: "/" voor de root-taal, "/en", "/de", …
  // (query zoals ?p=... blijft behouden). Direct bezoek werkt via de per-taal mirror.
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

function storageKey(mode) {
  return mode === "daily" ? `jaardle:daily:${todayKey()}` : `jaardle:free:current`;
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
  const g = state.guesses.length;
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
      // ⏩ (oranje): slot 0 = gebeurtenis uit ±100 jaar later, slot 1 = ±250 jaar later.
      // Slot 1 krijgt ⏩⏩ (dubbel): je springt ruim 2× zo ver vooruit in de tijd.
      slide.classList.add("slide-later");
      const is250 = s.slot === 1;
      const laterLabel = is250 ? t("later_label_250") : t("later_label");
      slide.appendChild(buildSlideTag("later-tag", "later-icon", is250 ? "⏩⏩" : "⏩", laterLabel));
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
    if (laterLbl) laterLbl.textContent = state.laterCluesShown >= 1 ? t("hint_later_250") : t("hint_later");
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
    { max: 500,      nl: "Oudheid",           en: "Antiquity" },
    { max: 1500,     nl: "Middeleeuwen",      en: "Middle Ages" },
    { max: 1600,     nl: "Renaissance",       en: "Renaissance" },
    { max: 1800,     nl: "Vroegmoderne tijd", en: "Early modern era" },
    { max: 2000,     nl: "Moderne tijd",      en: "Modern era" },
    { max: Infinity, nl: "21e eeuw",          en: "21st century" },
  ];
  const e = eras.find((x) => year < x.max);
  return e[lang] || e[DEFAULT_LANG];
}

// "100 jaar later"-clue (#8/#9). Een gebeurtenis uit exact antwoordjaar+100
// (deterministisch per antwoord-hash via get_century_clues) — grof tijdperk +
// impliciet richting (antwoord ligt vóór die gebeurtenis). Opgevraagd via de
// ⏩-knop (kost punten, tot 2) en getoond als oranje carrousel-slide. De gratis
// zelfde-tijd-extra's bij gok 1/2 staan los hiervan (zie revealedExtraCount).
// Fallback "toekomst" als jaar+100 > nu.

// We doen ALTIJD alsof er 2 clues zijn (zodra de data binnen is), zodat de teller
// "x/2" niets verraadt: een "x/1" zou anders al lekken dat het de toekomst-variant
// is (en dus dat het antwoord recent is) zónder dat je een clue gebruikt.
const LATER_CLUE_SLOTS = 2;
function availableLaterClues() {
  return state?.laterClues ? LATER_CLUE_SLOTS : 0;
}

// Tekst voor clue-slot i. Slot 0 = jaar+100, slot 1 = jaar+250. Elk slot is óf
// een toekomst-markering ({future:true}), óf het echte feit ({nl,en}), óf leeg
// (null → "geen bekend"). Valt terug op het oude {future,clues}-model voor een
// nog-niet-herladen client die de nieuwe RPC-respons nog niet kent.
function laterSlotText(i) {
  const cc = state?.laterClues;
  if (!cc) return null;
  if (Array.isArray(cc.slots)) {
    const slot = cc.slots[i];
    if (!slot) return i === 0 ? t("later_none") : t("later_none_250");
    if (slot.future) return i === 0 ? t("later_future") : t("later_future_250");
    return slot[lang] || slot[DEFAULT_LANG];
  }
  // Legacy: beide slots kwamen uit jaar+100.
  if (cc.future) return i === 0 ? t("later_future") : t("later_future_2");
  const f = (cc.clues || [])[i];
  if (f) return f[lang] || f[DEFAULT_LANG];
  return t("later_none");
}

// Onthul de volgende ⏩-clue (kost punten): voeg 'm als nieuwe oranje slide toe en
// schuif erheen.
function requestLaterClue() {
  if (state.done) return;
  if (state.laterCluesShown >= availableLaterClues()) return;
  state.laterCluesShown += 1;
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
  if (state.laterClues) { renderHintStatus(); return; }   // al gecachet
  const hash = state.hashes?.[0];
  if (!hash) return;
  let res = null;
  try { res = await rpc("get_century_clues", { p_hash: hash }); } catch (e) { /* offline */ }
  // De speler kan intussen van modus zijn gewisseld; alleen toepassen als de
  // puzzel nog dezelfde is.
  if (!state || state.hashes?.[0] !== hash) return;
  state.laterClues = res || { future: false, clues: [] };
  save();
  renderEvent();
  renderHintStatus();
}

function requestDirectionHint() {
  if (state.done) return;
  if (state.directionsRevealed.length >= MAX_DIRECTION_HINTS) return;
  if (state.guesses.length === 0) return;
  const latestIdx = state.guesses.length - 1;
  if (state.directionsRevealed.includes(latestIdx)) return;
  state.directionsRevealed.push(latestIdx);
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
  renderEvent();
  renderHintStatus();
  goToHintSlide("century");   // voeg de 🏛️-band-slide toe en schuif erheen
  updateLiveScore(true);
  save();
}

function requestLastDigit() {
  if (state.done || state.lastDigitRevealed) return;
  state.lastDigitRevealed = true;
  renderEvent();
  renderHintStatus();
  goToHintSlide("digit");   // voeg de 🔢-cijfer-slide toe en schuif erheen
  updateLiveScore(true);
  save();
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
  veryclose: 3,
  close: 5,
  warm: 8,
  cool: 11,
  far: 13,
  distant: 15,
  farthest: 23,
};
const DIRECTION_HINT_PENALTY = 5;
const CENTURY_HINT_PENALTY = 27;
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
      const showDir = state.done || revealedSet.has(idx);
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

function finishGame(won, fresh = false) {
  state.done = true;
  state.won = won;
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
    scoreLine.textContent = `${tier.emoji} ${tierLabel(tier)} · ${score}/100`;
    els.resultText.append(scoreLine);
  }
  els.source.innerHTML = ev.source
    ? `${t("source")} <a href="${ev.source}" target="_blank" rel="noopener">${displaySource(ev.source)}</a> · CC BY-SA`
    : "";
  els.nextBtn.hidden = state.mode !== "free";
  // De recap (verdeling + teamstand) is daily-only en blijft herbereikbaar via
  // deze knop, ook nadat je het popup-scherm hebt gesloten.
  if (els.recapBtn) els.recapBtn.hidden = state.mode !== "daily";
  renderHintStatus();
  if (fresh && won) showConfetti();
  if (fresh && state.mode === "daily") recordDailyResult(won);
  // Bij een verse pot: eerst de play wegschrijven, DAARNA de globale stats ophalen,
  // zodat je eigen zojuist gespeelde pot meetelt (en bij een fact zonder eerdere
  // plays niet games:0 -> niks toont). Faalt het wegschrijven, toon dan alsnog.
  const statsHash = state.hashes?.[0];
  // Na het wegschrijven van de verse play: globale stats tonen, en bij de daily
  // het recap-scherm openen (verdeling pogingen + teamstand van vandaag).
  const afterSend = () => {
    showFactStats(statsHash);
    if (fresh && state.mode === "daily") openDailyRecap();
  };
  if (fresh) sendTelemetry().then(afterSend, afterSend);
  else showFactStats(statsHash);
  startDailyCountdown();
}

// Eén rij per afgerond spel naar de DB (fire-and-forget). Idempotent per puzzel
// zodat herladen/heropenen niet dubbel telt. Geen PII — anon of JWT (server-side).
function sendTelemetry() {
  const hash = state.hashes?.[0];
  if (!hash) return Promise.resolve();
  const slot = state.mode === "daily" ? todayKey() : "free";
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
    p_puzzle_date: state.mode === "daily" ? todayKey() : null,
    p_score: computeScore(),
    p_guesses: state.guesses.map((g) => g.year),  // voor cross-device reconstructie
  })
    .then((id) => {
      invalidateHistory();  // verse stats bij volgende opening
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
  const slot = state.mode === "daily" ? todayKey() : "free";
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
    if (left <= 0) { el.textContent = t("daily_ready"); stopDailyCountdown(); return; }
    el.textContent = `${t("next_daily")} ${fmtCountdown(left)}`;
  };
  tick();
  dailyCountdownTimer = setInterval(tick, 1000);
}

// --- Vrienden-pools (custom leaderboards) ----------------------------------
// Elke ingelogde speler kan één pool hebben (max 1). De 🏆-knop is zichtbaar
// zodra je ingelogd bent; het paneel toont je pool (daily live + aller-tijden
// nachtelijk) of een lege staat (pool maken / joinen). Uitnodigen via een
// deelbare code/link (?join=CODE) met Ja/Nee-bevestiging. De rating blijft
// globaal; een pool filtert enkel wie je op het bord ziet.
let myPool = null;                    // {id,name,invite_code,is_owner,members} of null
let myUsername = null;                // zelfgekozen weergavenaam (profiles.username) of null
let myFlair = null;                   // zelfgekozen emoji-badge (profiles.flair) of null
// Vaste flair-keuzes — moet gelijklopen met de allow-list in set_my_flair (09d_flair.sql).
const FLAIR_OPTIONS = ["🔥", "🕊️", "🎩", "👑", "🦊", "🐢", "🚀", "🥸", "🧠", "🍀", "🌟", "⚡", "🎲", "🦉", "🦫", "💎", "🐉", "🦄", "🐙", "💅", "🍺"];
let lbSyncTimer = null;
let pendingOpenLeaderboard = false;   // ?leaderboard-deeplink
let pendingJoinCode = null;           // ?join=CODE-deeplink
let lbDailyDate = null;               // welke daily-dag het bord toont (browsen met ‹ ›)
let lbDailyReq = 0;                   // race-guard: alleen de laatste fetch mag renderen
let lbStatIndex = 0;                  // welke stat-kolom het all-time bord toont (‹ ›)
let lbOverall = [];                   // rating-bord (al geladen) — pagina 0
let lbPoolStats = null;               // win%/score/streak — lazy bij eerste swipe, daarna cache

function escHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// Seconden tot de volgende nachtelijke recompute (pg_cron 03:00 UTC).
function secsToNextSync() {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(3, 0, 0, 0);
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return Math.max(0, Math.round((next - now) / 1000));
}

function stopLbSync() {
  if (lbSyncTimer) { clearInterval(lbSyncTimer); lbSyncTimer = null; }
}

// Haal de pool van de ingelogde speler op; de 🏆-knop is zichtbaar zodra ingelogd.
async function refreshPoolState() {
  if (!auth.user) { myPool = null; renderMenu(); return; }
  try { const rows = await rpc("my_pool", {}); myPool = (Array.isArray(rows) && rows[0]) ? rows[0] : null; }
  catch (e) { myPool = null; }
  renderMenu();
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
const lbNameCell = (row) =>
  escHtml(row.display_name) +
  (row.flair ? ` <span class="lb-flair-badge">${escHtml(row.flair)}</span>` : "") +
  (row.is_me ? ` <span class="lb-tag">${t("lb_you")}</span>` : "");

// De swipebare stat-kolommen van het all-time bord. Elke pagina sorteert dezelfde
// ledenlijst aflopend op z'n stat. Rating komt uit get_pool_leaderboard (pagina 0,
// al geladen); win%/score/streak uit get_pool_stats (lazy, zie renderStatBoard).
// Win% en gem. score zijn vertekend bij weinig potjes (1 gewonnen = 100%), dus
// pas vanaf LB_MIN_RANKED_GAMES tellen die kolommen mee in de ranking. Spelers
// eronder staan onderaan, gedimd, met hun voortgang (x/min) i.p.v. een waarde.
const LB_MIN_RANKED_GAMES = 15;
const LB_STATS = [
  { key: "rating",    label: () => t("lb_stat_rating"), val: (r) => `${r.rating}${r.is_provisional ? "?" : ""}` },
  { key: "win_pct",   label: () => t("stat_winrate"),   val: (r) => `${r.win_pct}%`, gate: true },
  { key: "avg_score", label: () => t("stat_avgscore"),  val: (r) => `${r.avg_score}`, gate: true },
  { key: "streak",    label: () => t("lb_stat_streak"), val: (r) => `${r.streak}` },
];

const lbNameCmp = (a, b) =>
  String(a.display_name || "").localeCompare(String(b.display_name || ""), undefined, { sensitivity: "base" });
// Tiebreak bij gelijke stat-waarde: wie het eerst een daily speelde staat boven
// (zoals het daily-bord op created_at sorteert). Naam pas als laatste redmiddel.
const lbTieCmp = (a, b) => {
  const ta = a.first_played ? Date.parse(a.first_played) : Infinity;
  const tb = b.first_played ? Date.parse(b.first_played) : Infinity;
  return (ta - tb) || lbNameCmp(a, b);
};

function lbRow(rankCell, r, valCell, extraCls) {
  return `<div class="lb-row${r.is_me ? " lb-me" : ""}${extraCls || ""}">` +
    `<span class="lb-rank">${rankCell}</span>` +
    `<span class="lb-name">${lbNameCell(r)}</span>` +
    `<span class="lb-val">${valCell}</span></div>`;
}

function lbStatRows(list, valFn) {
  if (!list.length) return `<p class="lb-empty">${t("lb_empty_overall")}</p>`;
  return `<div class="lb-table">` +
    list.map((r, i) => lbRow(lbMedal(i + 1), r, valFn(r), "")).join("") + `</div>`;
}

// Gegate stat-bord (win%/score): gekwalificeerde spelers eerst, aflopend op de
// stat (tiebreak alfabetisch); spelers onder de drempel onderaan, gedimd, met
// hun potjes-voortgang i.p.v. een ranking-cijfer.
function lbGatedStatRows(list, stat) {
  if (!list.length) return `<p class="lb-empty">${t("lb_empty_overall")}</p>`;
  const ranked = list.filter((r) => (r.games || 0) >= LB_MIN_RANKED_GAMES)
    .sort((a, b) => (b[stat.key] - a[stat.key]) || lbTieCmp(a, b));
  const pending = list.filter((r) => (r.games || 0) < LB_MIN_RANKED_GAMES)
    .sort((a, b) => ((b.games || 0) - (a.games || 0)) || lbTieCmp(a, b));
  const rows = ranked.map((r, i) => lbRow(lbMedal(i + 1), r, stat.val(r), ""));
  rows.push(...pending.map((r) =>
    lbRow("·", r, `${r.games || 0}/${LB_MIN_RANKED_GAMES}`, " lb-prov")));
  return `<div class="lb-table">` + rows.join("") + `</div>`;
}

// Tekent het huidige stat-bord. Pagina 0 (Rating) gebruikt de al-geladen data.
// De overige stats worden pas opgehaald bij de eerste swipe ernaartoe, daarna
// gecached in lbPoolStats. Na de async fetch pakken we de dán-actuele stat (de
// gebruiker kan intussen verder geswiped zijn).
async function renderStatBoard() {
  const head = document.getElementById("lb-stat-heading");
  const content = document.getElementById("lb-stat-content");
  if (!head || !content) return;
  head.textContent = LB_STATS[lbStatIndex].label();
  if (lbStatIndex === 0) { content.innerHTML = lbStatRows(lbOverall, LB_STATS[0].val); return; }
  if (!lbPoolStats) {
    content.innerHTML = `<p class="lb-empty">${t("loading")}</p>`;
    let rows = [];
    try { rows = await rpc("get_pool_stats", { p_pool_id: myPool.id }); } catch (e) {}
    lbPoolStats = Array.isArray(rows) ? rows : [];
    if (document.getElementById("modal-leaderboard").hidden) return;
    head.textContent = LB_STATS[lbStatIndex].label();
    if (lbStatIndex === 0) { content.innerHTML = lbStatRows(lbOverall, LB_STATS[0].val); return; }
  }
  const stat = LB_STATS[lbStatIndex];
  if (stat.gate) { content.innerHTML = lbGatedStatRows(lbPoolStats, stat); return; }
  // Aflopend op de stat; bij gelijke waarde wint wie het eerst speelde (lbTieCmp),
  // anders zou de willekeurige RPC-volgorde bepalen wie boven staat.
  const list = [...lbPoolStats].sort((a, b) => (b[stat.key] - a[stat.key]) || lbTieCmp(a, b));
  content.innerHTML = lbStatRows(list, stat.val);
}

// Naam-editor: toont je zelfgekozen weergavenaam (profiles.username) met een
// wijzig-knop. Staat bovenaan het bord in beide states (met of zonder pool).
// myUsername wordt in renderLeaderboard opgehaald via get_my_username.
function flairPickerHtml() {
  const opt = (val, label, extra) =>
    `<button type="button" class="lb-flair-opt${extra || ""}${(myFlair || "") === val ? " sel" : ""}" data-flair="${escHtml(val)}" aria-label="${label}" title="${label}">${val || "✖"}</button>`;
  const buttons = opt("", t("lb_flair_none"), " lb-flair-clear") +
    FLAIR_OPTIONS.map((e) => opt(e, e, "")).join("");
  return `<div class="lb-flair">
      <span class="lb-namelabel">${t("lb_flair_label")}</span>
      <div class="lb-flair-opts">${buttons}</div>
    </div>`;
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
  document.querySelectorAll(".lb-flair-opt").forEach((b) => {
    b.onclick = () => setMyFlair(b.dataset.flair || "");
  });
}

// Sla de gekozen flair op (server valideert tegen de allow-list); lege string wist.
async function setMyFlair(flair) {
  if ((myFlair || "") === (flair || "")) return;   // al gekozen → niks doen
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

// Gebruikte hints als iconen (⏩ "100 jaar later", 🧭 richting, 🏛️ eeuw); leeg als geen.
function lbHintIcons(d) {
  const s = "⏩".repeat(d.text_hints || 0) + "🧭".repeat(d.dir_hints || 0) + (d.century_hint ? "🏛️" : "");
  return s ? `<span class="lb-hints">${s}</span>` : "";
}

// Alleen de inhoud van het daily-bord (tabel of lege staat) — de kop + ‹ ›-knoppen
// staan vast in renderLeaderboard, zodat browsen alleen dit deel ververst.
function dailyTableHtml(rows) {
  if (!rows.length) {
    return `<p class="lb-empty">${t(lbDailyDate === todayKey() ? "lb_empty_daily" : "lb_empty_daily_past")}</p>`;
  }
  return `<div class="lb-table">` + rows.map((r) =>
    `<div class="${lbRowCls(r.is_me)}"><span class="lb-rank">${lbMedal(r.rank)}</span>` +
    `<span class="lb-name">${lbNameCell(r)}</span>` +
    `<span class="lb-val">${r.won ? lbHintIcons(r) + r.score : "💀"}</span></div>`).join("") + `</div>`;
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
  prevBtn.disabled = lbDailyDate <= EPOCH_KEY;
  nextBtn.disabled = lbDailyDate >= todayKey();
  content.innerHTML = `<p class="lb-empty">${t("loading")}</p>`;
  const req = ++lbDailyReq;
  let rows = [];
  try { rows = await rpc("get_pool_daily_leaderboard", { p_pool_id: myPool.id, p_date: lbDailyDate }); } catch (e) {}
  if (req !== lbDailyReq || document.getElementById("modal-leaderboard").hidden) return;
  content.innerHTML = dailyTableHtml(Array.isArray(rows) ? rows : []);
}

// Hoofdpaneel: je pool + borden, of de lege staat (maken/joinen).
async function renderLeaderboard() {
  const body = document.getElementById("lb-body");
  stopLbSync();
  if (!auth.user) { body.innerHTML = `<p class="lb-empty">${t("lb_not_member")}</p>`; return; }
  body.innerHTML = `<p class="lb-empty">${t("loading")}</p>`;
  try { const rows = await rpc("my_pool", {}); myPool = (Array.isArray(rows) && rows[0]) ? rows[0] : null; } catch (e) {}
  try { myUsername = await rpc("get_my_username", {}) || null; } catch (e) {}
  try { myFlair = await rpc("get_my_flair", {}) || null; } catch (e) {}
  if (document.getElementById("modal-leaderboard").hidden) return;
  if (!myPool) { renderPoolEmptyState(body); return; }

  lbDailyDate = todayKey();   // begin altijd bij de daily van vandaag
  let overall = [];
  try { overall = await rpc("get_pool_leaderboard", { p_pool_id: myPool.id, p_min_games: 1 }); } catch (e) {}
  if (document.getElementById("modal-leaderboard").hidden) return;
  overall = Array.isArray(overall) ? overall : [];

  const inviteUrl = `https://jaardle.nl/?join=${myPool.invite_code}`;
  const renameBtnHtml = myPool.is_owner ? `<button id="lb-rename-btn" class="lb-pillbtn">${t("lb_rename")}</button>` : "";
  let html = nameEditorHtml() + `<div class="lb-poolhead">
      <div class="lb-poolname">${escHtml(myPool.name)}${myPool.is_owner ? ` <span class="lb-tag">${t("lb_owner_tag")}</span>` : ""}</div>
      <div class="lb-poolsub">${t("lb_members_n")(myPool.members)}</div>
      <div class="lb-poolactions">
        <button id="lb-invite-btn" class="lb-pillbtn">${t("lb_invite")}</button>
        ${renameBtnHtml}
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
      <p class="lb-sync" id="lb-sync"></p>
    </section>`;
  body.innerHTML = html;
  wireNameEditor();

  // Daily-bord + browsen naar vorige dagen (‹ ›).
  const prevBtn = document.getElementById("lb-daily-prev");
  const nextBtn = document.getElementById("lb-daily-next");
  prevBtn.onclick = () => { if (lbDailyDate > EPOCH_KEY) { lbDailyDate = shiftDateKey(lbDailyDate, -1); loadDailyBoard(); } };
  nextBtn.onclick = () => { if (lbDailyDate < todayKey()) { lbDailyDate = shiftDateKey(lbDailyDate, +1); loadDailyBoard(); } };
  loadDailyBoard();

  // All-time bord met swipebare stat-kolommen (Rating / Win% / Gem. score / Streak),
  // ‹ ›-nav net als de daily. Pagina 0 (Rating) hergebruikt de al-geladen data; de
  // andere stats worden lazy opgehaald bij de eerste swipe en daarna gecached.
  lbOverall = overall; lbStatIndex = 0; lbPoolStats = null;
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
    let r = "err"; try { r = await rpc("rename_pool", { p_name: name }); } catch (e) {}
    if (r === "ok") { await refreshPoolState(); renderLeaderboard(); }
  };
  document.getElementById("lb-leave-btn").onclick = async () => {
    if (!confirm(t("lb_leave_confirm"))) return;
    try { await rpc("leave_pool", {}); } catch (e) {}
    await refreshPoolState();
    renderLeaderboard();
  };

  // Tik de aftelklok tot de nachtelijke rating-update.
  const syncEl = document.getElementById("lb-sync");
  const tick = () => {
    if (document.getElementById("modal-leaderboard").hidden) { stopLbSync(); return; }
    const left = secsToNextSync();
    syncEl.textContent = left <= 0 ? t("lb_synced") : `${t("lb_sync")} ${fmtCountdown(left)}`;
  };
  tick();
  lbSyncTimer = setInterval(tick, 1000);
}

// Lege staat: een pool maken of joinen via code.
function renderPoolEmptyState(body) {
  body.innerHTML = nameEditorHtml() + `
    <p class="lb-empty">${t("lb_pool_none")}</p>
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
  document.getElementById("lb-create-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    let r = "err";
    try { r = await rpc("create_pool", { p_name: document.getElementById("lb-create-input").value }); } catch (err) {}
    if (r === "ok") { await refreshPoolState(); renderLeaderboard(); }
    else { status.textContent = r === "invalid_name" ? t("lb_err_name") : t("lb_err_generic"); status.className = "lb-name-status err"; status.hidden = false; }
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
  stopLbSync();
  body.innerHTML = `<p class="lb-empty">${t("loading")}</p>`;
  let info = null;
  try { const rows = await rpc("peek_pool", { p_code: code }); info = (Array.isArray(rows) && rows[0]) ? rows[0] : null; } catch (e) {}
  if (document.getElementById("modal-leaderboard").hidden) return;
  if (!info) {
    body.innerHTML = `<p class="lb-empty">${t("lb_err_code")}</p>`;
    setTimeout(() => { if (!document.getElementById("modal-leaderboard").hidden) renderLeaderboard(); }, 1500);
    return;
  }
  if (info.am_member) { renderLeaderboard(); return; }
  let cur = null;
  try { const rows = await rpc("my_pool", {}); cur = (Array.isArray(rows) && rows[0]) ? rows[0] : null; } catch (e) {}
  const q = cur ? t("lb_switch_q")(cur.name, info.name) : t("lb_join_q")(info.name);
  body.innerHTML = `<div class="lb-confirm">
      <p class="lb-confirm-q">${escHtml(q)}</p>
      <p class="lb-confirm-sub">${t("lb_members_n")(info.members)}</p>
      <div class="lb-confirm-actions">
        <button id="lb-join-yes" class="primary">${t("lb_yes")}</button>
        <button id="lb-join-no">${t("lb_no")}</button>
      </div></div>`;
  document.getElementById("lb-join-no").onclick = () => renderLeaderboard();
  document.getElementById("lb-join-yes").onclick = async () => {
    try { await rpc("join_pool", { p_code: code, p_confirm_switch: true }); } catch (e) {}
    await refreshPoolState();
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

// Verdeling van pogingen per aantal (1–6, alleen winsten — een verlies is altijd 6
// en zou de balken vertekenen). Jouw eigen resultaat van vandaag uitgelicht.
function recapDistHtml(buckets) {
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
  return `<section class="recap-section">${head}<div class="dist-chart">${rows}</div></section>`;
}

async function renderRecap() {
  const body = document.getElementById("recap-body");
  if (!body) return;
  body.innerHTML = `<p class="stats-empty">${t("loading")}</p>`;
  const dist = await fetchGlobalGuessDist();
  if (document.getElementById("modal-recap").hidden) return;
  if (auth.user) {
    // Ingelogd: toon de teamstand van vandaag onder de verdeling.
    body.innerHTML = recapDistHtml(dist) +
      `<section class="recap-section">` +
      `<h3 class="stats-heading">${t("recap_team_title")}</h3>` +
      `<div id="recap-team"></div></section>`;
    loadRecapTeam();
  } else {
    // Uitgelogd: wijs op de voordelen van een (gratis) account.
    body.innerHTML = recapDistHtml(dist) + recapAccountHtml();
    const btn = document.getElementById("recap-acct-btn");
    if (btn) btn.onclick = () => { closeAllModals(); openModal("modal-login"); };
  }
}

// Voordelen-blok voor uitgelogde spelers op het recap-scherm: een gecentreerd,
// omlijnd accent-kaartje dat als call-to-action opvalt.
function recapAccountHtml() {
  return `<div class="recap-account">
    <h3 class="stats-heading">${t("recap_acct_title")}</h3>
    <ul class="recap-perks">
      <li>${t("recap_acct_1")}</li>
      <li>${t("recap_acct_2")}</li>
      <li>${t("recap_acct_3")}</li>
    </ul>
    <div class="recap-cta"><button id="recap-acct-btn">${t("recap_acct_btn")}</button></div>
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
    try { const rows = await rpc("my_pool", {}); myPool = (Array.isArray(rows) && rows[0]) ? rows[0] : null; } catch (e) {}
    if (document.getElementById("modal-recap").hidden) return;
  }
  if (!myPool) {
    wrap.innerHTML = `<p class="lb-empty">${t("recap_pool_none")}</p>` +
      `<div class="recap-cta"><button id="recap-pool-btn">${t("recap_pool_btn")}</button></div>`;
    const btn = document.getElementById("recap-pool-btn");
    if (btn) btn.onclick = () => { closeAllModals(); openModal("modal-leaderboard"); };
    return;
  }
  wrap.innerHTML = `<p class="lb-empty">${t("loading")}</p>`;
  lbDailyDate = todayKey();   // stuurt de lege-staat-tekst van dailyTableHtml
  let rows = [];
  try { rows = await rpc("get_pool_daily_leaderboard", { p_pool_id: myPool.id, p_date: todayKey() }); } catch (e) {}
  if (document.getElementById("modal-recap").hidden) return;
  wrap.innerHTML = dailyTableHtml(Array.isArray(rows) ? rows : []);
}

// --- Daily history & stats ------------------------------------------------
// Ingelogd: de dagresultaten komen uit de DB (cross-device sync) via
// get_my_history(). Anon ziet geen stats — het ⋮-menu opent dan de login-modal
// als nudge. De lokale "jaardle:history" blijft als offline-vangnet bestaan,
// maar de getoonde statistieken komen voor ingelogde spelers uit de DB.
let myHistoryCache = null;     // [{date, won, score, guesses}] of null (niet geladen)
let myHistoryPromise = null;   // dedupe gelijktijdige fetches

async function fetchMyHistory() {
  try {
    const rows = await rpc("get_my_history", {});
    if (!Array.isArray(rows)) return [];
    return rows.map((r) => ({
      date: r.date,
      won: !!r.won,
      score: r.score ?? 0,
      guesses: r.guesses,
    }));
  } catch (e) {
    return [];
  }
}

function getMyHistory() {
  if (myHistoryCache) return Promise.resolve(myHistoryCache);
  if (!myHistoryPromise) {
    myHistoryPromise = fetchMyHistory().then((h) => {
      myHistoryCache = h;
      myHistoryPromise = null;
      return h;
    });
  }
  return myHistoryPromise;
}

function invalidateHistory() {
  myHistoryCache = null;
  myHistoryPromise = null;
}

// Reconstrueer het AFGERONDE dagbord uit de DB (alleen ingelogd). De DB bewaart de
// gegokte jaren (plays.guesses) + hint-aantallen; kleuren/afstanden leiden we af uit
// het antwoordjaar. Geeft een board-object of null (anon / geen DB-rij voor vandaag).
async function reconstructDailyBoard(answerYear) {
  if (!auth.user) return null;
  let row;
  try { row = await rpc("get_my_daily", { d: todayKey() }); } catch (e) { return null; }
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
    laterCluesShown: Math.max(0, Math.min(2, row.text_hints_used || 0)),
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
  const board = await reconstructDailyBoard(answerYear);
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
  const date = todayKey();
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
  // Streaks worden geteld op opeenvolgende kalenderdagen dat je hebt GESPEELD
  // (winst óf verlies, Duolingo-stijl); alleen een gemiste dag breekt de streak.
  const dateSet = new Set(history.map((e) => e.date));
  let best = 0, run = 0;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  let prev = null;
  for (const e of sorted) {
    if (prev && daysBetween(prev, e.date) === 1) run += 1;
    else run = 1;
    if (run > best) best = run;
    prev = e.date;
  }
  // Current streak: tel terug vanaf vandaag (of gister als vandaag nog niet gespeeld).
  let cur = 0;
  let cursor = todayKey();
  if (!dateSet.has(cursor)) cursor = shiftDay(cursor, -1);
  while (dateSet.has(cursor)) { cur += 1; cursor = shiftDay(cursor, -1); }
  return { total, won: winsN, winRate, avgScore, avgAttempts, currentStreak: cur, bestStreak: best };
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
  if (!auth.user) {
    // Vangnet: het menu gate't dit al (opent login), maar mocht de modal toch
    // open zijn zonder login, toon dan niets persoonlijks.
    body.innerHTML = `<p class="stats-empty">${t("stats_empty")}</p>`;
    return;
  }
  body.innerHTML = `<p class="stats-empty">${t("loading")}</p>`;
  const history = await getMyHistory();
  // Modal kan ondertussen gesloten/gewisseld zijn; alleen vullen als nog relevant.
  if (document.getElementById("modal-stats").hidden) return;
  if (history.length === 0) {
    // Geen daily, maar misschien wel vrije potjes -> toon de daily-leegmelding
    // onder een kopje en hang de free-sectie eronder.
    body.innerHTML = `<h3 class="stats-heading">${t("stats_daily")}</h3><p class="stats-empty">${t("stats_empty")}</p>`;
    await renderFreeStats(body);
    await renderCenturyStats(body);
    return;
  }
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
  await renderFreeStats(body);
  await renderCenturyStats(body);
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

// --- Menu + modals --------------------------------------------------------

// Auth-state placeholder; Supabase-wiring zit in de module-bridge in index.html.
const auth = { user: null };

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
    btn.innerHTML = `<span class="avatar">${guest}</span><span class="menu-label">${t("menu_login")}</span>` + caret;
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
    if (statsBtn) statsBtn.hidden = false;  // zichtbaar maar login-gated: klik opent login-nudge
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
  stopLbSync();
  setModalUrl(null);
}

function closeAllModals() {
  document.querySelectorAll(".modal").forEach((m) => (m.hidden = true));
  stopLbSync();
  setModalUrl(null);
}

async function doAuth(mode, e) {
  e.preventDefault();
  const form = document.getElementById("login-form");
  const err = document.getElementById("login-error");
  err.hidden = true;
  err.textContent = "";
  if (!window.sbAuth) {
    err.textContent = "Supabase nog aan het laden, probeer het opnieuw.";
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
        err.textContent = "Account aangemaakt — check je inbox om je e-mailadres te bevestigen.";
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

function friendlyAuthError(ex) {
  const code = ex?.code || "";
  const status = ex?.status || 0;
  const msg = (ex?.message || "").toLowerCase();
  if (code === "invalid_credentials" || msg.includes("invalid login credentials"))
    return "E-mail of wachtwoord klopt niet.";
  if (code === "email_not_confirmed")
    return "E-mailadres nog niet bevestigd — check je inbox.";
  if (code === "user_already_exists" || msg.includes("already registered"))
    return "Dit e-mailadres heeft al een account — kies Inloggen.";
  if (code === "weak_password" || msg.includes("password should be"))
    return "Wachtwoord te kort (minimaal 6 tekens).";
  if (code === "email_address_invalid" || msg.includes("invalid email") || msg.includes("invalid format"))
    return "Ongeldig e-mailadres.";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || status === 429)
    return "Te veel pogingen — probeer het later opnieuw.";
  if (code === "signup_disabled") return "Registreren is uitgeschakeld.";
  if (code === "provider_disabled") return "Deze inlogmethode staat niet aan.";
  if (msg.includes("failed to fetch") || msg.includes("networkerror"))
    return "Netwerkfout, controleer je verbinding.";
  return ex?.message || "Inloggen mislukt.";
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
  const unlocksExtra = !state.done &&
    ((gl === 1 && availableExtras() >= 1) || (gl === 2 && availableExtras() >= 2));
  if (unlocksExtra) {
    renderEvent();
    const track = els.eventText.querySelector(".fact-track");
    if (track) void track.offsetWidth;
    goToSlide(state.event.facts.length + revealedExtraCount() - 1);
    const justRow = els.guesses.querySelectorAll(".guess-row")[gl - 1];
    if (justRow) {
      requestAnimationFrame(() => requestAnimationFrame(() => justRow.classList.add("hint-unlocked")));
    }
  }
  updateLiveScore(true);   // tel zichtbaar omlaag bij deze (mis)gok
  if (cls === "correct") {
    finishGame(true, true);
  } else if (state.guesses.length >= MAX_GUESSES) {
    finishGame(false, true);
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
    localStorage.setItem(storageKey(state.mode), JSON.stringify({
      hashes: state.hashes,
      event: state.event,
      board: {
        guesses: state.guesses,
        done: state.done,
        won: state.won,
        laterCluesShown: state.laterCluesShown,
        directionsRevealed: state.directionsRevealed,
        centuryRevealed: state.centuryRevealed,
        lastDigitRevealed: state.lastDigitRevealed,
        laterClues: state.laterClues,
      },
    }));
  } catch (e) { /* storage may be unavailable */ }
}

function loadRecord(mode) {
  try {
    const raw = localStorage.getItem(storageKey(mode));
    if (!raw) return null;
    const r = JSON.parse(raw);
    return (r && Array.isArray(r.hashes) && r.event) ? r : null;
  } catch (e) {
    return null;
  }
}

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

async function doShare() {
  const text = shareText();
  const url = state.mode === "free"
    ? `https://jaardle.nl/?p=${buildShareToken()}`
    : "https://jaardle.nl/";
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
    const label = els.shareBtn.querySelector(".share-label") || els.shareBtn;
    label.textContent = t("lb_invite_copied");
    setTimeout(() => (label.textContent = t("share")), 1500);
  } catch (e) {
    prompt(t("copy_prompt"), `${text}\n${url}`);
  }
}

// Bepaal de puzzel (uit lokale cache of via RPC). Geeft { mode, hashes, event, board }
// of null (niet gevonden). Kan throwen bij netwerk/RPC-fout.
async function resolveRecord(mode, forceNew, sharedHashes) {
  if (sharedHashes) {
    const cached = loadRecord("free");
    if (cached && arraysEqual(cached.hashes, sharedHashes)) return { mode: "free", ...cached };
    const p = await rpc("get_facts_by_hashes", { hashes: sharedHashes });
    if (!p) return null;
    return { mode: "free", hashes: p.hashes, event: toEvent(p), board: null };
  }
  if (mode === "daily") {
    const cached = loadRecord("daily");   // bevat de puzzel (offline/instant) + bord
    if (cached) return { mode: "daily", ...cached };
    const p = await rpc("get_daily", { d: todayKey() });
    if (!p) return null;
    // Geen lokale cache (ander apparaat / cache gewist), maar ingelogd? Herstel het
    // afgeronde bord uit de DB zodat de dagpuzzel niet opnieuw speelbaar lijkt.
    const board = await reconstructDailyBoard(p.year);
    return { mode: "daily", hashes: p.hashes, event: toEvent(p), board };
  }
  // free
  if (!forceNew) {
    const cached = loadRecord("free");
    if (cached && !cached.board?.done) return { mode: "free", ...cached };
  }
  const p = await rpc("get_random_fact", {});
  if (!p) return null;
  return { mode: "free", hashes: p.hashes, event: toEvent(p), board: null };
}

async function startGame(mode, forceNew = false, sharedHashes = null) {
  if (forceNew) {
    try { localStorage.removeItem(storageKey(mode)); } catch (e) {}
  }
  setKeypadDisabled(true);
  setCardStatus(t("loading"));
  stopDailyCountdown();
  els.result.hidden = true;
  els.nextBtn.hidden = true;
  if (els.recapBtn) els.recapBtn.hidden = true;

  let record;
  try {
    record = await resolveRecord(mode, forceNew, sharedHashes);
  } catch (e) {
    console.error(e);
    setCardStatus(t("err_load"), () => startGame(mode, forceNew, sharedHashes));
    return;
  }
  if (!record) {
    if (sharedHashes) setCardStatus(t("err_share"), () => switchMode("daily"));
    else setCardStatus(t("err_none"), () => startGame(mode, forceNew, sharedHashes));
    return;
  }

  const b = record.board;
  state = {
    mode: record.mode,
    hashes: record.hashes,
    event: record.event,
    guesses: b?.guesses || [],
    done: !!b?.done,
    won: !!b?.won,
    laterCluesShown: Math.max(0, Math.min(2, b?.laterCluesShown || 0)),
    directionsRevealed: Array.isArray(b?.directionsRevealed) ? b.directionsRevealed : [],
    centuryRevealed: !!b?.centuryRevealed,
    lastDigitRevealed: !!b?.lastDigitRevealed,
    laterClues: b?.laterClues || null,
  };

  setKeypadDisabled(false);
  clearYear();
  factSlideIndex = 0;   // start altijd bij het hoofdfeit
  renderEvent();
  renderHintStatus();
  renderGuesses();
  updateLiveScore(false);   // zet de teller op de juiste waarde (100 vers, lager bij restore)
  save();
  syncUrl();
  loadLaterClues();   // async: vult/herrendert de clues zodra binnen

  if (state.done) finishGame(state.won);
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
  els.shareBtn.addEventListener("click", doShare);
  els.nextBtn.addEventListener("click", () => startGame("free", true));
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
  menuBtn.addEventListener("click", (e) => { e.stopPropagation(); toggleMenu(); });
  menuPop.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    toggleMenu(false);
    const action = btn.dataset.action;
    // Stats zijn login-gated: uitgelogd opent de login-modal als nudge.
    if (action === "stats") openModal(auth.user ? "modal-stats" : "modal-login");
    else if (action === "leaderboard") openModal("modal-leaderboard");
    else if (action === "login") openModal("modal-login");
    else if (action === "logout") doSignOut();
    else if (action === "lang") toggleLang();
  });
  document.addEventListener("click", (e) => {
    if (!menuPop.hidden && !menuPop.contains(e.target) && e.target !== menuBtn) {
      toggleMenu(false);
    }
  });
  renderMenu();

  // Modals: backdrop / ✕ knop / Escape.
  document.querySelectorAll(".modal [data-close]").forEach((el) => {
    el.addEventListener("click", () => closeAllModals());
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllModals();
  });
  const loginForm = document.getElementById("login-form");
  loginForm.addEventListener("submit", (e) => doAuth("signin", e));
  document.getElementById("login-register").addEventListener("click", (e) => doAuth("signup", e));
  document.getElementById("login-google").addEventListener("click", doGoogleSignIn);

  // Sync auth-state vanuit de Supabase module-bridge.
  window.addEventListener("sb-auth-changed", async (e) => {
    auth.user = e.detail
      ? { email: e.detail.email, uid: e.detail.uid, avatar: e.detail.avatar || null, name: e.detail.name || null }
      : null;
    invalidateHistory();   // andere speler / uitgelogd -> stats opnieuw laden
    renderMenu();
    await refreshPoolState();  // toont/verbergt de 🏆-knop + laadt je pool
    maybeOpenLeaderboardDeeplink();  // ?leaderboard / ?join afhandelen nu auth bekend is
    // Stats-modal open terwijl auth wisselt? Herteken met de juiste bron.
    const sm = document.getElementById("modal-stats");
    if (sm && !sm.hidden) renderStats();
    // Net ingelogd terwijl de dagpuzzel nog open staat? Herstel 'm uit de DB.
    // En: koppel een zojuist (anoniem) afgeronde pot aan dit account.
    if (auth.user) { maybeRestoreDailyAfterLogin(); claimPlayOnLogin(); }
  });

  // Tekst-box (Instagram-stijl): slepen bladert (muis óf touch, vanaf overal op de
  // kaart, ook de randen), en een tik in de linker- of rechterzone gaat terug/verder.
  // touch-action: pan-y (CSS) houdt verticaal scrollen intact.
  if (els.eventCard) {
    let sx = 0, sy = 0, dragging = false, active = false, slideCount = 1, width = 1;
    els.eventCard.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".fact-dot")) return;   // stippen doen hun eigen klik
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
}

function getSharedLocation() {
  const params = new URLSearchParams(window.location.search);
  const p = params.get("p");
  if (p === null) return null;
  return parseShareToken(p);  // array van 10-hex hashes, of null
}

init().catch((err) => {
  els.eventText.textContent = "Kon de gebeurtenis niet laden.";
  console.error(err);
});
