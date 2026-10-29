/* Jaardle — Spelerskaartje (mockup "Spelerskaartje" v4, 28/10/2026; server: get_player_card, db/145).
   Tik op een naam in het 🏆-bord: de rij klapt open met een klein kaartje, drie tabs om te swipen (✨ Vitrine · 🏟️ Team · 🪎 Verzameld).
   Lui geladen bij de eerste tik (togglePlayerCard in game.js): CSS, teksten in vijf talen en het tekenen zitten hier, zodat het
   laden van de pagina niets extra kost. Gebruikt de globals van game.js (ACHV_SERIES, ACHV_TROPHIES, capstoneTier, t, lang, …).
   Alleen wat de server bijhoudt: geen ✨ perfecte week (rekent de browser uit), en van de iconische jaren alleen het aantal
   (een jaar dat vandaag bijkomt zou het antwoord van vandaag verraden). */
(() => {
  const T = {
    nl: {
      tab_vit: "✨ Vitrine", tab_team: "🏟️ Team", tab_col: "🪎 Verzameld",
      prestige: "Prestige", no_prestige: "Nog geen prestige-trede", since: (d) => `Speelt sinds ${d}`, close: "Dichtklappen",
      err: "Dit kaartje kon niet laden.", once: "eenmalig", of_n: (n, m) => `${n} van ${m}`, flairs: "Flairs", earned: (n) => `${n} verdiend`,
      no_award: "Nog geen weekprijs.", no_find: "Nog geen vondst", streak_short: "Dagen op rij",
      w1: "weekwinst", w2: "2e plek", w3: "3e plek", dz: "dagzeges",
      s_dailies: "Dailies", s_streak: "Beste streak", s_games: "Potjes", s_perfect: "Perfecte 100", s_pure: "Zonder hint", s_rating: "Rating-piek", s_years: "Iconische jaren",
    },
    en: {
      tab_vit: "✨ Showcase", tab_team: "🏟️ Team", tab_col: "🪎 Collection",
      prestige: "Prestige", no_prestige: "No prestige tier yet", since: (d) => `Playing since ${d}`, close: "Collapse",
      err: "This card couldn't load.", once: "one-off", of_n: (n, m) => `${n} of ${m}`, flairs: "Flairs", earned: (n) => `${n} earned`,
      no_award: "No weekly award yet.", no_find: "No find yet", streak_short: "Days in a row",
      w1: "week wins", w2: "2nd place", w3: "3rd place", dz: "daily wins",
      s_dailies: "Dailies", s_streak: "Best streak", s_games: "Games", s_perfect: "Perfect 100", s_pure: "No hints", s_rating: "Peak rating", s_years: "Iconic years",
    },
    de: {
      tab_vit: "✨ Vitrine", tab_team: "🏟️ Team", tab_col: "🪎 Sammlung",
      prestige: "Prestige", no_prestige: "Noch keine Prestige-Stufe", since: (d) => `Spielt seit ${d}`, close: "Zuklappen",
      err: "Diese Karte konnte nicht geladen werden.", once: "einmalig", of_n: (n, m) => `${n} von ${m}`, flairs: "Flairs", earned: (n) => `${n} verdient`,
      no_award: "Noch kein Wochenpreis.", no_find: "Noch kein Fund", streak_short: "Tage in Folge",
      w1: "Wochensiege", w2: "2. Platz", w3: "3. Platz", dz: "Tagessiege",
      s_dailies: "Dailys", s_streak: "Beste Serie", s_games: "Spiele", s_perfect: "Perfekte 100", s_pure: "Ohne Hinweis", s_rating: "Höchstwertung", s_years: "Ikonische Jahre",
    },
    es: {
      tab_vit: "✨ Vitrina", tab_team: "🏟️ Equipo", tab_col: "🪎 Colección",
      prestige: "Prestigio", no_prestige: "Aún sin nivel de prestigio", since: (d) => `Juega desde ${d}`, close: "Plegar",
      err: "No se pudo cargar esta tarjeta.", once: "única", of_n: (n, m) => `${n} de ${m}`, flairs: "Distintivos", earned: (n) => `${n} conseguidos`,
      no_award: "Aún sin premio semanal.", no_find: "Aún sin hallazgo", streak_short: "Días seguidos",
      w1: "victorias semanales", w2: "2.º puesto", w3: "3.er puesto", dz: "victorias diarias",
      s_dailies: "Diarios", s_streak: "Mejor racha", s_games: "Partidas", s_perfect: "100 perfectos", s_pure: "Sin pistas", s_rating: "Puntuación máx.", s_years: "Años icónicos",
    },
    pt: {
      tab_vit: "✨ Vitrine", tab_team: "🏟️ Equipe", tab_col: "🪎 Coleção",
      prestige: "Prestígio", no_prestige: "Ainda sem nível de prestígio", since: (d) => `Joga desde ${d}`, close: "Recolher",
      err: "Não foi possível carregar este cartão.", once: "única", of_n: (n, m) => `${n} de ${m}`, flairs: "Distintivos", earned: (n) => `${n} conquistados`,
      no_award: "Ainda sem prêmio semanal.", no_find: "Ainda sem achado", streak_short: "Dias seguidos",
      w1: "vitórias semanais", w2: "2º lugar", w3: "3º lugar", dz: "vitórias diárias",
      s_dailies: "Diários", s_streak: "Melhor sequência", s_games: "Partidas", s_perfect: "100 perfeitos", s_pure: "Sem dicas", s_rating: "Pontuação máx.", s_years: "Anos icônicos",
    },
  };
  const tx = (k) => { const d = T[lang] || T.en; return d[k] != null ? d[k] : T.en[k]; };

  // Hergebruikt de echte bouwstenen: .rc-* (carrousel van het eindscherm), .achv-tring/.achv-ttier en de trede-kleuren
  // (.achv-t1…6 → --tc, .cap-<trede> → --pc), het vondst-zegel (.vd-stamp/.vd-st). Hier alleen wat het kaartje zelf nodig heeft.
  const CSS = `
.pc.pc-inline { position: relative; display: flex; flex-direction: column; gap: 0.6rem; margin: 7px 0 6px; padding: 11px 12px;
  border-radius: 12px; background: var(--card); border: 1px solid var(--border); box-shadow: var(--shadow-pop); }
.pc.pc-inline::before { content: ""; position: absolute; top: -7px; left: 4.4rem; width: 12px; height: 12px; background: var(--card);
  border-left: 1px solid var(--border); border-top: 1px solid var(--border); transform: rotate(45deg); }
.pc.pc-noarrow::before { display: none; }
#recap-team-board .pc.pc-inline { box-shadow: none; }   /* de carrousel van het eindscherm knipt de zijkanten af: geen halve schaduw */
.pc-wait { margin: 0; min-height: 2.4rem; display: grid; place-items: center; color: var(--muted); font-size: 0.8rem; }
.pc-wait::after { content: ""; width: 1.1rem; height: 1.1rem; border-radius: 50%; border: 2px solid var(--border); border-top-color: var(--accent); animation: pc-spin 0.8s linear infinite; }
@keyframes pc-spin { to { transform: rotate(360deg); } }
.pc-err { margin: 0; font-size: 0.8rem; color: var(--muted); }
.pc-line { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; font-size: 0.76rem; color: var(--muted); }
.pc-line > span:first-child { white-space: nowrap; }
.pc-line b { color: var(--pc, var(--muted)); text-transform: capitalize; }
.pc-line-r { display: inline-flex; align-items: center; gap: 0.35rem; min-width: 0; text-align: right; }
.pc-shut { appearance: none; border: 0; background: none; color: var(--muted); font: inherit; font-size: 0.85rem; line-height: 1; padding: 0;
  min-width: 1.6rem; min-height: 1.6rem; margin: -0.4rem -0.45rem -0.4rem 0; border-radius: 6px; cursor: pointer; flex: none; }
.pc-shut:hover { background: var(--card-soft); color: var(--fg); }
.pc-shut:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.pc .rc-tabs { margin: 0 0 0.6rem; gap: 0.5rem; }
.pc .rc-tabs .rc-tab { font-size: 0.74rem; letter-spacing: 0.02em; white-space: nowrap; }
.pc .rc-slide { display: flex; flex-direction: column; gap: 0.55rem; padding: 4px 3px 2px; }
.pc-vit { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.75rem 0.35rem; }
.pc-m { display: flex; flex-direction: column; align-items: center; gap: 0.12rem; min-width: 0; text-align: center; }
.pc-m .achv-tring, .pc-m .vd-st { width: 46px; height: 46px; margin-bottom: 0.2rem; }
.pc-m .achv-tring:not(.tiered) { border-radius: 50%; box-shadow: 0 0 0 2px var(--border); }
.pc-m .vd-st-fl { font-size: 22px; }
.pc-m b { font-size: 0.74rem; line-height: 1.2; hyphens: auto; overflow-wrap: break-word; max-width: 100%; }
.pc-m small { font-size: 0.66rem; line-height: 1.2; color: var(--muted); font-variant-numeric: tabular-nums; }
.pc-m small i { font-style: normal; font-weight: 700; color: var(--tc); text-transform: capitalize; }
.pc-m.vd-r3 small i { color: var(--rar); }
.pc-empty { margin: 0; font-size: 0.8rem; color: var(--muted); }
.pc-team { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.35rem; }
.pc-tc { display: flex; flex-direction: column; align-items: center; gap: 0.05rem; padding: 0.5rem 0.15rem 0.45rem; border-radius: 10px; background: var(--card-soft); text-align: center; }
.pc-tc i { font-style: normal; font-size: 1.1rem; line-height: 1.2; }
.pc-tc b { font-size: 1rem; line-height: 1.15; font-variant-numeric: tabular-nums; }
.pc-tc span { font-size: 0.64rem; color: var(--muted); line-height: 1.2; }
.pc-tc.zero { opacity: 0.45; }
.pc-aw { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.pc-aw span { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.55rem; border-radius: 999px; font-size: 0.72rem; background: var(--card-soft); border: 1px solid var(--border); white-space: nowrap; }
.pc-aw b { font-variant-numeric: tabular-nums; }
.pc-rows { display: flex; flex-direction: column; }
.pc-r { display: flex; align-items: center; justify-content: space-between; gap: 0.6rem; min-height: 2.6rem; padding: 0.3rem 0; }
.pc-r + .pc-r { border-top: 1px solid var(--border); }
.pc-r-l { display: flex; flex-direction: column; min-width: 0; font-size: 0.8rem; font-weight: 600; line-height: 1.25; }
.pc-r-l small { font-size: 0.7rem; font-weight: 400; color: var(--muted); font-variant-numeric: tabular-nums; }
.pc-r-l small i { font-style: normal; font-weight: 700; color: var(--tc); text-transform: capitalize; }
.pc-r-x { flex: none; display: flex; align-items: center; }
.pc-r-x > * + * { margin-left: -6px; }
.pc-r-x .vd-st, .pc-r-x .achv-tring { width: 28px; height: 28px; border-radius: 50%; box-shadow: 0 0 0 2px var(--card); }
.pc-r-x .achv-tring.tiered { box-shadow: 0 0 0 2px var(--tc); }
.pc-r-x .vd-stamp .vd-st { box-shadow: 0 0 0 1.5px var(--rar); }
.pc-r-x .vd-st-fl { font-size: 13px; }
.pc-r-x .pc-gl { font-size: 1.05rem; line-height: 1; margin-left: 0.1rem; }
.pc-r-x .pc-gl .emoji-anim { width: 1.1em; height: 1.1em; vertical-align: -0.2em; }
.pc-r-x .pc-more { margin-left: 0.3rem; font-size: 0.72rem; font-weight: 600; color: var(--muted); }
.lb-row.pf-open, .lb-wk-restrow.pf-open { box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--accent) 55%, transparent); }
.lb-pod-spot.pf-open .lb-pod-name { text-decoration: underline 2px color-mix(in srgb, var(--accent) 70%, transparent); text-underline-offset: 3px; }
@media (prefers-reduced-motion: reduce) { .pc-wait::after { animation: none; } }
`;
  let cssOn = false;
  function ensureCss() {
    if (cssOn || document.getElementById("pc-css")) { cssOn = true; return; }
    const st = document.createElement("style");
    st.id = "pc-css";
    st.textContent = CSS;
    document.head.appendChild(st);
    cssOn = true;
  }

  // Het antwoord van get_player_card → een prestaties-object zoals achvNormalize het maakt (zodat alle helpers van game.js
  // er gewoon op werken). De jaren komen alleen als aantal: een lijst nullen van die lengte (achvValue telt alleen .length).
  function prep(data) {
    const a = achvNormalize({ ...(data.a || {}), years: Array(Math.max(0, Number(data.years_n) || 0)).fill(0) });
    const ev = data.ev || {};
    return { a, ev, stamps: (e) => Number(ev[e.id]) || 0, since: data.since || null, podium: data.podium || {}, dz: Number(data.dz) || 0, aw: data.aw || {} };
  }

  // ── ✨ Vitrine: de zes zeldzaamste dingen ──
  // Eerst de trede (obsidiaan … brons); een legendarische vondst telt als net onder obsidiaan. Bij gelijke trede de reeks of
  // trofee die moeilijker te halen is (RARE). De titel-trofeeën (Obsidiaan, Legende) staan al als JM/GM vóór de naam.
  const RARE = ["rating", "perfect", "spicy", "pure", "first_try", "nailbiter", "zigzag", "last_gasp", "eras", "fun", "streak", "years", "dailies", "games"];
  const ONE_OFF = { flawless: 35, saver: 25 };   // ongetierd: Vlekkeloos tussen platina en goud, Reddingsactie tussen goud en zilver
  const rareIdx = (k) => { const i = RARE.indexOf(k); return i < 0 ? RARE.length : i; };
  function vitrine(c) {
    const a = c.a, items = [];
    for (const s of ACHV_SERIES) {
      if (s.key === "rating" && a.rating == null) continue;
      const n = achvValue(a, s), tier = achvTier(n, s.steps);
      if (tier > 0) items.push({ k: "s", s, n, tier, score: tier * 10, key: s.key });
    }
    for (const tr of ACHV_TROPHIES) {
      if (tr.key === "perfect_week" || tr.titleCode) continue;
      if (tr.tiers) {
        const tier = trophyTierOf(a, tr);
        if (tier > 0) items.push({ k: "t", tr, n: achvTrophyCount(a, tr), tier, score: tier * 10, key: tr.key });
      } else if (ONE_OFF[tr.key] && achvTrophyDone(a, tr)) items.push({ k: "t", tr, n: 0, tier: 0, score: ONE_OFF[tr.key], key: tr.key });
    }
    for (const id of a.finds || []) if (VONDST_BY_ID[id]) items.push({ k: "v", v: VONDST_BY_ID[id], score: 55, key: "v:" + id });
    if (window.SeasonEvent) for (const ev of EVENTS) {
      const n = c.stamps(ev), tier = eventTier(ev, n);
      if (tier > 0) items.push({ k: "e", ev, n, tier, score: tier * 10 - 1, key: "e:" + ev.id });
    }
    return items.sort((x, y) => y.score - x.score || rareIdx(x.key) - rareIdx(y.key)).slice(0, 6);
  }

  const SEAL_BASE = `<svg viewBox="0 0 100 100" class="achv-art achv-art-stamp" aria-hidden="true"><use href="#achv-stamp-base"/></svg>`;
  const seal = (v) => `<span class="vd-stamp vd-r3"><span class="vd-st">${SEAL_BASE}<span class="vd-st-fl">${flairGlyphHtml(v.flair)}</span></span></span>`;
  const evArt = (ev) => `<svg viewBox="0 0 100 100" class="achv-art" aria-hidden="true"><use href="#achv-art-${ev.id}"/></svg>`;
  const tierName = (tier) => escHtml(achvTierName(tier - 1));
  const evName = (ev) => escHtml(eventCopy(ev.id)?.achName || ev.id);
  function medal(it) {
    if (it.k === "v") return `<div class="pc-m vd-r3">${seal(it.v)}<b>${escHtml(vondstName(it.v))}</b><small><i>${escHtml(t("find_tier_3"))}</i></small></div>`;
    const ring = (art) => `<span class="achv-tring${it.tier ? " tiered" : ""}">${art}</span>`;
    if (it.k === "e") return `<div class="pc-m achv-t${it.tier}">${ring(evArt(it.ev))}<b>${evName(it.ev)}</b>` +
      `<small><i>${tierName(it.tier)}</i> · ${fmtN(it.n)}/${fmtN(eventTotal(it.ev))}</small></div>`;
    if (it.k === "s") {
      const val = it.s.key === "years" ? `${fmtN(it.n)}/${fmtN(ACHV_YEARS.length)}` : fmtN(it.n);
      return `<div class="pc-m achv-t${it.tier}">${ring(achvBadgeHtml(it.s.art))}<b>${escHtml(tx("s_" + it.s.key))}</b><small><i>${tierName(it.tier)}</i> · ${val}</small></div>`;
    }
    return `<div class="pc-m achv-t${it.tier}">${ring(achvBadgeHtml(it.tr.art))}<b>${escHtml(t(it.tr.i18n))}</b>` +
      `<small>${it.tier ? `<i>${tierName(it.tier)}</i> · ×${fmtN(it.n)}` : escHtml(tx("once"))}</small></div>`;
  }
  const slideVit = (c) => { const its = vitrine(c);
    return its.length ? `<div class="pc-vit">${its.map(medal).join("")}</div>` : `<p class="pc-empty">${escHtml(tx("no_prestige"))}</p>`; };

  // ── 🏟️ Team: weekpodium en dagzeges in dit team, en de weekprijzen ──
  function slideTeam(c) {
    const cell = (icon, n, lbl, x) => `<div class="pc-tc${n ? "" : " zero"}"><i aria-hidden="true">${icon}</i><b>${fmtN(n)}${x ? "×" : ""}</b><span>${escHtml(tx(lbl))}</span></div>`;
    const p = c.podium;
    const chips = WEEK_AWARDS.filter((d) => Number(c.aw[d.kind]) > 0).map((d) => {
      const n = Number(c.aw[d.kind]);
      return d.kind === "streak" ? `<span>${d.icon} ${escHtml(tx("streak_short"))} <b>${fmtN(n)}</b></span>`
        : `<span>${d.icon} ${escHtml(t("aw_" + d.kind))} <b>×${fmtN(n)}</b></span>`;
    }).join("");
    return `<div class="pc-team">${cell("🥇", Number(p.w1) || 0, "w1", true)}${cell("🥈", Number(p.w2) || 0, "w2", true)}${cell("🥉", Number(p.w3) || 0, "w3", true)}${cell("🏆", c.dz, "dz", false)}</div>` +
      (chips ? `<div class="pc-aw">${chips}</div>` : `<p class="pc-empty">${escHtml(tx("no_award"))}</p>`);
  }

  // ── 🪎 Verzameld: per verzameling één regel, telling links, munten rechts ──
  function slideCol(c) {
    const a = c.a, more = (n) => (n > 0 ? `<span class="pc-more">+${fmtN(n)}</span>` : "");
    const row = (cls, name, sub, right) => `<div class="pc-r${cls}"><span class="pc-r-l">${name}<small>${sub}</small></span><span class="pc-r-x">${right}</span></div>`;
    const ys = ACHV_SERIES.find((s) => s.key === "years"), yn = a.years.length, yt = achvTier(yn, ys.steps);
    const finds = (a.finds || []).map((id) => VONDST_BY_ID[id]).filter(Boolean);
    const flairs = earnedFlairsOf(a, c.stamps).sort((x, y) => flairRank(y) - flairRank(x));   // zeldzaamste vooraan
    const evRows = !window.SeasonEvent ? "" : EVENTS.map((ev) => {
      const n = c.stamps(ev), tier = eventTier(ev, n);
      if (!n) return "";
      return row(` achv-t${tier}`, evName(ev), `${tier ? `<i>${tierName(tier)}</i> · ` : ""}${escHtml(tx("of_n")(fmtN(n), fmtN(eventTotal(ev))))}`,
        `<span class="achv-tring${tier ? " tiered" : ""}">${evArt(ev)}</span>`);
    }).join("");
    return `<div class="pc-rows">` +
      row(` achv-t${yt}`, escHtml(t("achv_years")), `${yt ? `<i>${tierName(yt)}</i> · ` : ""}${escHtml(tx("of_n")(fmtN(yn), fmtN(ACHV_YEARS.length)))}`,
        `<span class="achv-tring${yt ? " tiered" : ""}">${achvBadgeHtml(ys.art)}</span>`) +
      row("", escHtml(t("achv_finds")), escHtml(finds.length ? tx("of_n")(fmtN(finds.length), fmtN(VONDSTEN.length)) : tx("no_find")),
        finds.slice(0, 4).map(seal).join("") + more(finds.length - 4)) +
      evRows +
      row("", escHtml(tx("flairs")), escHtml(tx("earned")(fmtN(flairs.length))),
        flairs.slice(0, 6).map((f) => `<span class="pc-gl">${flairGlyphHtml(f)}</span>`).join("") + more(flairs.length - 6)) +
      `</div>`;
  }

  // Zeldzaamheid van een flair = zijn plek in REWARD_ORDER (oplopend zeldzaam; vondsten staan vlak voor obsidiaan).
  const flairRank = (f) => REWARD_ORDER.indexOf(Object.keys(REWARDS).find((k) => REWARDS[k].cat === "flair" && REWARDS[k].emoji === f) || "");
  function sinceText(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    // Dit jaar: alleen de maand ("sinds augustus"); daarvoor kort met jaar ("sinds aug 2026"), zodat de regel op 360 px past.
    const opts = d.getFullYear() === new Date().getFullYear() ? { month: "long" } : { month: "short", year: "numeric" };
    try { return tx("since")(new Intl.DateTimeFormat(LANGS[lang].intl, opts).format(d)); } catch (e) { return ""; }
  }
  const TABS = ["tab_vit", "tab_team", "tab_col"];
  function html(c, tab) {
    const ct = capstoneTier(c.a), cap = ct ? ` cap-${ACHV_TIER_KEYS[ct - 1]}` : "";
    const capTxt = ct ? `${escHtml(tx("prestige"))} <b>${tierName(ct)}</b>` : escHtml(tx("no_prestige"));
    const tabs = TABS.map((k, i) => (i ? `<span class="rc-sep" aria-hidden="true"></span>` : "") +
      `<button type="button" role="tab" class="rc-tab" data-i="${i}" aria-selected="${i === tab}">${escHtml(tx(k))}</button>`).join("");
    return `<div class="pc-line${cap}"><span>${capTxt}</span><span class="pc-line-r">${escHtml(sinceText(c.since))}` +
      `<button type="button" class="pc-shut" aria-label="${escHtml(tx("close"))}">✕</button></span></div>` +
      `<div class="rc"><div class="rc-tabs" role="tablist">${tabs}</div><div class="rc-track" tabindex="0">` +
      `<div class="rc-slide" role="tabpanel">${slideVit(c)}</div><div class="rc-slide" role="tabpanel">${slideTeam(c)}</div><div class="rc-slide" role="tabpanel">${slideCol(c)}</div></div></div>`;
  }

  // Carrousel zoals op het eindscherm: tik op een tab, swipe (scroll-snap), of sleep met de muis. De gekozen tab gaat terug
  // naar game.js (onTab), zodat de volgende speler op dezelfde tab opent.
  function mount(host, tab, onTab) {
    const track = host.querySelector(".rc-track"), tabs = [...host.querySelectorAll(".rc-tab")], last = tabs.length - 1;
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const step = () => track.clientWidth || 1;
    const cur = () => Math.max(0, Math.min(last, Math.round(track.scrollLeft / step())));
    const sel = (i) => { tabs.forEach((b, j) => b.setAttribute("aria-selected", String(i === j))); onTab?.(i); };
    const goTo = (i, smooth) => track.scrollTo({ left: Math.max(0, Math.min(last, i)) * step(), behavior: smooth && !reduced ? "smooth" : "auto" });
    let raf = 0;
    track.addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => sel(cur())); }, { passive: true });
    tabs.forEach((b) => b.addEventListener("click", () => goTo(Number(b.dataset.i), true)));
    track.addEventListener("pointerdown", (e) => {
      if (e.pointerType !== "mouse" || e.button !== 0 || e.target.closest("button, [role=button]")) return;
      const sx = e.clientX, sl = track.scrollLeft;
      track.classList.add("dragging");
      const move = (ev) => { track.scrollLeft = sl - (ev.clientX - sx); };
      const up = () => {
        window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
        track.classList.remove("dragging");
        goTo(cur(), true);
      };
      window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
    });
    track.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault(); e.stopPropagation();
      goTo(cur() + (e.key === "ArrowRight" ? 1 : -1), true);
    });
    if (tab > 0) goTo(tab, false);
  }

  // host = het lege kaartje dat game.js al onder de rij zette. data = het antwoord van get_player_card (null/undefined = fout).
  function render(host, data, opts) {
    ensureCss();
    injectAchvSvg();
    if (window.SeasonEvent) injectEventArt();
    if (!data) { host.innerHTML = `<p class="pc-err">${escHtml(tx("err"))}</p>`; return; }
    const tab = Math.max(0, Math.min(2, Number(opts?.tab) || 0));
    host.innerHTML = html(prep(data), tab);
    host.querySelector(".pc-shut").addEventListener("click", () => opts?.close?.());
    mount(host, tab, opts?.onTab);
  }

  window.PlayerCard = { T, render, prep, vitrine, ensureCss };
})();
