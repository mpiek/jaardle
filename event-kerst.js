/* Het kerst-event "Kerstkaart" (14–27 dec 2026; EVENTS in game.js): het UI-blok voor /season-event.js, in een eigen lui bestand omdat
   season-event.js op zijn groottegrens zit. Wordt geladen ná season-event.js (game.js ensureEventUi, EVENTS[].ui) en zet zich daar neer met
   SeasonEvent.add(): de teksten in vijf talen (zelfde sleutels als Spooktober; namen per taal gekozen), het zegel voor Prestaties (een gebreid
   kersttruitje met een boompje, id achv-art-kerst, eigen ids krs-) en de kleuren + de stempelvorm. Bron: ~/Games/jaardle-tools/mockups/kerst
   (make_event_kerst.mjs); niet met de hand bewerken. */
(() => {
  const copy = {
    "nl": {
      "name": "Kerstkaart",
      "barLead": "Het is kersttijd!",
      "menu": "Kerstkaart",
      "achName": "Kerstkaart 2026",
      "rewardName": {
        "flair": "Kerstboom-flair",
        "fx": "🎇 Lichtjes",
        "feest": "❄️ Kerstfeest"
      },
      "popEyebrow": "Kerstbeloning",
      "popSub": {
        "flair": "Je kerstboom voor op het leaderboard. Blijft van jou, ook na kerst.",
        "fx": "Een lichtsnoer rond je flair, zichtbaar op elk bord. Blijft van jou.",
        "feest": "Sneeuw en sterretjes bij elke winst. Je zet 'm zelf aan of uit."
      },
      "popGroupSub": "Je kerstboom en je lichtjes, samen te dragen.",
      "hookLine": "Je kerstboom-flair is verdiend. Met een gratis account kun je hem dragen."
    },
    "en": {
      "name": "Christmas Card",
      "barLead": "It's Christmas time!",
      "menu": "Christmas Card",
      "achName": "Christmas Card 2026",
      "rewardName": {
        "flair": "Christmas tree flair",
        "fx": "🎇 Fairy lights",
        "feest": "❄️ Christmas party"
      },
      "popEyebrow": "Christmas reward",
      "popSub": {
        "flair": "Your Christmas tree for the leaderboard. Yours to keep, even after Christmas.",
        "fx": "Fairy lights around your flair, visible on every board. Yours to keep.",
        "feest": "Snow and stars with every win. You turn it on or off yourself."
      },
      "popGroupSub": "Your tree and your lights, to wear together.",
      "hookLine": "You earned the Christmas tree flair. A free account lets you wear it."
    },
    "de": {
      "name": "Weihnachtskarte",
      "barLead": "Es ist Weihnachtszeit!",
      "menu": "Weihnachtskarte",
      "achName": "Weihnachtskarte 2026",
      "rewardName": {
        "flair": "Weihnachtsbaum-Flair",
        "fx": "🎇 Lichterkette",
        "feest": "❄️ Weihnachtsfest"
      },
      "popEyebrow": "Weihnachtsbelohnung",
      "popSub": {
        "flair": "Dein Weihnachtsbaum für die Bestenliste. Er gehört dir, auch nach Weihnachten.",
        "fx": "Eine Lichterkette um dein Flair, sichtbar auf jeder Bestenliste. Sie gehört dir.",
        "feest": "Schnee und Sterne bei jedem Sieg. Du schaltest es selbst ein oder aus."
      },
      "popGroupSub": "Dein Baum und deine Lichterkette – trag beides zusammen.",
      "hookLine": "Du hast dir das Weihnachtsbaum-Flair verdient. Mit einem kostenlosen Konto kannst du es tragen."
    },
    "es": {
      "name": "Tarjeta navideña",
      "barLead": "¡Llegó la Navidad!",
      "menu": "Tarjeta navideña",
      "achName": "Tarjeta navideña 2026",
      "rewardName": {
        "flair": "Distintivo de árbol de Navidad",
        "fx": "🎇 Lucecitas",
        "feest": "❄️ Fiesta navideña"
      },
      "popEyebrow": "Recompensa de Navidad",
      "popSub": {
        "flair": "Tu árbol de Navidad para la clasificación. Te lo quedas para siempre.",
        "fx": "Unas lucecitas alrededor de tu distintivo, visibles en todas las clasificaciones. Te las quedas.",
        "feest": "Nieve y estrellas en cada victoria. Tú decides si la activas."
      },
      "popGroupSub": "Tu árbol y tus lucecitas, para lucirlos juntos.",
      "hookLine": "Has ganado el distintivo de árbol de Navidad. Con una cuenta gratuita puedes lucirlo."
    },
    "pt": {
      "name": "Cartão de Natal",
      "barLead": "Chegou o Natal!",
      "menu": "Cartão de Natal",
      "achName": "Cartão de Natal 2026",
      "rewardName": {
        "flair": "Distintivo de árvore de Natal",
        "fx": "🎇 Pisca-pisca",
        "feest": "❄️ Festa de Natal"
      },
      "popEyebrow": "Recompensa de Natal",
      "popSub": {
        "flair": "Sua árvore de Natal para o placar. É sua para sempre.",
        "fx": "Um pisca-pisca em volta do seu distintivo, visível em todos os placares. É seu para sempre.",
        "feest": "Neve e estrelas a cada vitória. Você liga ou desliga quando quiser."
      },
      "popGroupSub": "Sua árvore e seu pisca-pisca, para usar juntos.",
      "hookLine": "Você ganhou o distintivo de árvore de Natal. Com uma conta gratuita você pode usá-lo."
    }
  };
  window.SeasonEvent.add("kerst", { copy, art: "<clipPath id=\"krs-cl\"><circle cx=\"50\" cy=\"50\" r=\"46\"/></clipPath><clipPath id=\"krs-sc\"><use href=\"#krs-sp\"/></clipPath><radialGradient id=\"krs-bg\" cx=\"50\" cy=\"48\" r=\"40\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#6a3170\"/><stop offset=\"1\" stop-color=\"#6a3170\" stop-opacity=\"0\"/></radialGradient><linearGradient id=\"krs-b\" x1=\"29.5\" y1=\"0\" x2=\"70.5\" y2=\"0\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#e8323f\"/><stop offset=\".45\" stop-color=\"#c81e2e\"/><stop offset=\"1\" stop-color=\"#981428\"/></linearGradient><linearGradient id=\"krs-s\" x1=\"-6.8\" y1=\"0\" x2=\"6.8\" y2=\"0\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#e8323f\"/><stop offset=\".5\" stop-color=\"#c81e2e\"/><stop offset=\"1\" stop-color=\"#981428\"/></linearGradient><linearGradient id=\"krs-c\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#4fb072\"/><stop offset=\".5\" stop-color=\"#2f7a4a\"/><stop offset=\"1\" stop-color=\"#215c38\"/></linearGradient><linearGradient id=\"krs-v\" x1=\"0\" y1=\"58\" x2=\"0\" y2=\"78\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#5a0a1c\" stop-opacity=\"0\"/><stop offset=\"1\" stop-color=\"#5a0a1c\" stop-opacity=\".42\"/></linearGradient><radialGradient id=\"krs-h\" cx=\"38\" cy=\"33\" r=\"26\" gradientUnits=\"userSpaceOnUse\"><stop offset=\"0\" stop-color=\"#ff9d7a\" stop-opacity=\".3\"/><stop offset=\"1\" stop-color=\"#ffb199\" stop-opacity=\"0\"/></radialGradient><filter id=\"krs-f\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\"><feGaussianBlur stdDeviation=\"2.6\"/></filter><pattern id=\"krs-k\" x=\"4.4\" y=\"1.8\" width=\"4.8\" height=\"4\" patternUnits=\"userSpaceOnUse\"><path d=\"M.8 .3L2.4 1.7L4 .3\" fill=\"none\" stroke=\"#5a0a1c\" stroke-width=\".6\" stroke-linecap=\"round\" stroke-linejoin=\"round\" opacity=\".32\"/></pattern><path id=\"krs-st\" d=\"M0-1Q.16-.16 1 0Q.16.16 0 1Q-.16.16-1 0Q-.16-.16 0-1Z\"/><path id=\"krs-si\" d=\"M39.5 24.2L25.85 29.68 Q22.7 30.95 21.5 33.92 L9.58 63.4 22.19 68.5 29.5 50.41 L29.5 83.2H70.5L70.5 50.41 77.81 68.5 90.42 63.4 L78.5 33.92 Q77.3 30.95 74.15 29.68L60.5 24.2Q50 28 39.5 24.2Z\"/><path id=\"krs-bo\" d=\"M39.5 24.2L25.85 29.68 L29.5 50.41V77.6H70.5V50.41L74.15 29.68 L60.5 24.2Q50 30 39.5 24.2Z\"/><path id=\"krs-sp\" d=\"M-6.8 3.2Q-6.8 0 -4.35 -2.36L6.8 15.5V30H-6.8Z\"/><g id=\"achv-art-kerst\"><use href=\"#achv-tile-base\"/><g clip-path=\"url(#krs-cl)\"><circle cx=\"50\" cy=\"50\" r=\"46\" fill=\"url(#krs-bg)\"/><g transform=\"translate(50 50) scale(.96) translate(-50 -53)\"><use href=\"#krs-si\" fill=\"#ff9a3c\" stroke=\"#ff9a3c\" stroke-width=\"3\" opacity=\".5\" filter=\"url(#krs-f)\"/><use href=\"#krs-si\" fill=\"#241329\" stroke=\"#241329\" stroke-width=\"2\" stroke-linejoin=\"round\"/><path d=\"M39.5 24.2Q50 19.4 60.5 24.2Q50 34 39.5 24.2Z\" fill=\"#5e0d1c\"/><path d=\"M39.5 24.2Q50 19.4 60.5 24.2Q50 22.2 39.5 24.2Z\" fill=\"#215c38\"/><use href=\"#krs-bo\" fill=\"url(#krs-b)\"/><use href=\"#krs-bo\" fill=\"url(#krs-h)\"/><use href=\"#krs-bo\" fill=\"url(#krs-k)\"/><use href=\"#krs-bo\" fill=\"url(#krs-v)\"/><path d=\"M47.6 41.8l2.4 1.4l2.4 -1.4v4l-2.4 1.4l-2.4 -1.4zM42.8 45.8l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4v4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4zM38 49.8l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4v4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4zM42.8 53.8l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4v4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4zM38 57.8l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4v4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4zM33.2 61.8l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4v4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4z\" fill=\"#f2e8c9\" stroke=\"#cdbb8c\" stroke-width=\".45\" stroke-linejoin=\"round\"/><path d=\"M47.6 65.8l2.4 1.4l2.4 -1.4v3.4l-2.4 1.4l-2.4 -1.4z\" fill=\"#e0b23c\" stroke=\"#8a5a08\" stroke-width=\".4\" stroke-linejoin=\"round\"/><path d=\"M29.5 50.41L32.1 53.81L29.5 70.41ZM70.5 50.41L67.9 53.81L70.5 70.41Z\" fill=\"#5a0a1c\" opacity=\".4\"/><path d=\"M38.6 24.4Q50 39.6 61.4 24.4L61.4 23.6Q50 37 38.6 23.6Z\" fill=\"#5a0a1c\" opacity=\".4\"/><path d=\"M29.5 75.4H70.5V77.6H29.5Z\" fill=\"#5a0a1c\" opacity=\".3\"/><rect x=\"29.5\" y=\"76.6\" width=\"41\" height=\"6.6\" rx=\"1.3\" fill=\"url(#krs-c)\"/><path d=\"M33.23 77.4v5M36.95 77.4v5M40.68 77.4v5M44.41 77.4v5M48.14 77.4v5M51.86 77.4v5M55.59 77.4v5M59.32 77.4v5M63.05 77.4v5M66.77 77.4v5\" stroke=\"#1d5233\" stroke-width=\".8\" stroke-linecap=\"round\"/><g id=\"krs-sl\" transform=\"translate(29 33.5) rotate(22)\"><use href=\"#krs-sp\" fill=\"url(#krs-s)\"/><use href=\"#krs-sp\" fill=\"url(#krs-k)\"/><g clip-path=\"url(#krs-sc)\"><path d=\"M-7.2 21l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4l2.4 1.4l2.4 -1.4v4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4l-2.4 1.4l-2.4 -1.4z\" fill=\"#f2e8c9\" stroke=\"#cdbb8c\" stroke-width=\".45\"/></g><rect x=\"-6.4\" y=\"29.2\" width=\"12.8\" height=\"5.8\" rx=\"1.3\" fill=\"url(#krs-c)\"/><path d=\"M-4.1 29.9v4.4M-1.4 29.9v4.4M1.4 29.9v4.4M4.1 29.9v4.4\" stroke=\"#1d5233\" stroke-width=\".8\" stroke-linecap=\"round\"/><path d=\"M-6.8 28H6.8V30H-6.8Z\" fill=\"#5a0a1c\" opacity=\".3\"/></g><g transform=\"translate(100 0) scale(-1 1)\"><use href=\"#krs-sl\"/><path d=\"M22.32 31.88 L29.5 50.41 L22.19 68.5 L9.58 63.4 Z\" fill=\"#4a0716\" opacity=\".28\"/></g><path d=\"M38.6 23.6Q50 37.4 61.4 23.6L58.3 22.6Q50 31.6 41.7 22.6Z\" fill=\"url(#krs-c)\" stroke=\"#1d5233\" stroke-width=\".5\" stroke-linejoin=\"round\"/><path d=\"M43 25.6l1.6-1.9M46.3 28.4l.9-2.4M50 29.6v-2.6M53.7 28.4l-.9-2.4M57 25.6l-1.6-1.9\" stroke=\"#1d5233\" stroke-width=\".8\" stroke-linecap=\"round\"/><path d=\"M50 35L51.09 37.7L53.99 37.9L51.76 39.77L52.47 42.6L50 41.05L47.53 42.6L48.24 39.77L46.01 37.9L48.91 37.7Z\" fill=\"#ffd54d\" stroke=\"#8a5a08\" stroke-width=\".5\" stroke-linejoin=\"round\"/><path d=\"M37.6 25.9L26.35 30.68 Q23.9 31.85 22.46 34.74 L13.62 56.62\" fill=\"none\" stroke=\"#ffd9c8\" stroke-width=\"1\" stroke-linecap=\"round\" opacity=\".55\"/></g><g fill=\"#ffd54d\"><use href=\"#krs-st\" transform=\"translate(78.5 20.5) scale(3.8)\"/><use href=\"#krs-st\" transform=\"translate(19 21.5) scale(2.8)\"/><use href=\"#krs-st\" transform=\"translate(86 67) scale(2.4)\"/><circle cx=\"27\" cy=\"15.5\" r=\".7\"/><circle cx=\"68\" cy=\"14\" r=\".7\"/><circle cx=\"12.5\" cy=\"36\" r=\".7\"/><circle cx=\"14.5\" cy=\"72\" r=\".7\"/></g></g></g>" }, "\n/* kerst (/event-kerst.js): goud zoals de lampjes van de skin, licht thema rood; stempel = een kerstboompje met drie uitgesneden ballen */\n[data-ev=\"kerst\"] { --ev-pk: #ffc34d; --ev-pk-ink: #241600; --ev-pk-soft: rgba(255, 195, 77, 0.15); --ev-stamp: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 84'%3E%3Cdefs%3E%3Cmask id='m'%3E%3Crect width='96' height='84' fill='%23fff'/%3E%3Cg fill='%23000'%3E%3Ccircle cx='41' cy='37' r='3.6'/%3E%3Ccircle cx='56' cy='52' r='3.8'/%3E%3Ccircle cx='38' cy='62' r='3.8'/%3E%3Ccircle cx='60' cy='68' r='3.4'/%3E%3C/g%3E%3C/mask%3E%3C/defs%3E%3Cg mask='url(%23m)'%3E%3Cpath d='M48 6L62 24H56L70 42H62L78 66H18L34 42H26L40 24H34Z'/%3E%3Crect x='42' y='66' width='12' height='12' rx='1.5'/%3E%3C/g%3E%3C/svg%3E\"); }\nhtml[data-theme=\"light\"] [data-ev=\"kerst\"], html[data-theme=\"parchment\"] [data-ev=\"kerst\"] { --ev-pk: #c42f2f; --ev-pk-ink: #fff; --ev-pk-soft: rgba(196, 47, 47, 0.12); }\n");
  window.EventKerst = true;
})();
