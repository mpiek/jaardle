/* Het kerst-event "Kerstkaart" (14–27 dec 2026; EVENTS in game.js): het UI-blok voor /season-event.js, in een eigen lui bestand omdat
   season-event.js op zijn groottegrens zit. Wordt geladen ná season-event.js (game.js ensureEventUi, EVENTS[].ui) en zet zich daar neer met
   SeasonEvent.add(): de teksten in vijf talen (zelfde sleutels als Spooktober; namen per taal gekozen; Sneeuw = de tweede
   "fx" met eigen teksten onder fx2), het zegel voor Prestaties (een kersttruitje met een boompje in de gewone badgestijl, id achv-art-kerst)
   en de kleuren + de stempelvorm. Bron: ~/Games/jaardle-tools/mockups/kerst
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
        "feest": "🌟 Kerstfeest",
        "fx2": "❄️ Sneeuw"
      },
      "popEyebrow": "Kerstbeloning",
      "popSub": {
        "flair": "Je kerstboom voor op het leaderboard. Blijft van jou, ook na kerst.",
        "fx": "Een lichtsnoer rond je flair, zichtbaar op elk bord. Blijft van jou.",
        "feest": "Sneeuw en sterretjes bij elke winst. Je zet 'm zelf aan of uit.",
        "fx2": "Langzaam dwarrelende sneeuw rond je flair, zichtbaar op elk bord. Blijft van jou."
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
        "feest": "🌟 Christmas party",
        "fx2": "❄️ Snowfall"
      },
      "popEyebrow": "Christmas reward",
      "popSub": {
        "flair": "Your Christmas tree for the leaderboard. Yours to keep, even after Christmas.",
        "fx": "Fairy lights around your flair, visible on every board. Yours to keep.",
        "feest": "Snow and stars with every win. You turn it on or off yourself.",
        "fx2": "Slowly falling snow around your flair, visible on every board. Yours to keep."
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
        "feest": "🌟 Weihnachtsfest",
        "fx2": "❄️ Schneefall"
      },
      "popEyebrow": "Weihnachtsbelohnung",
      "popSub": {
        "flair": "Dein Weihnachtsbaum für die Bestenliste. Er gehört dir, auch nach Weihnachten.",
        "fx": "Eine Lichterkette um dein Flair, sichtbar auf jeder Bestenliste. Sie gehört dir.",
        "feest": "Schnee und Sterne bei jedem Sieg. Du schaltest es selbst ein oder aus.",
        "fx2": "Langsam fallender Schnee um dein Flair, sichtbar auf jeder Bestenliste. Er gehört dir."
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
        "feest": "🌟 Fiesta navideña",
        "fx2": "❄️ Nevada"
      },
      "popEyebrow": "Recompensa de Navidad",
      "popSub": {
        "flair": "Tu árbol de Navidad para la clasificación. Te lo quedas para siempre.",
        "fx": "Unas lucecitas alrededor de tu distintivo, visibles en todas las clasificaciones. Te las quedas.",
        "feest": "Nieve y estrellas en cada victoria. Tú decides si la activas.",
        "fx2": "Nieve que cae despacio alrededor de tu distintivo, visible en todas las clasificaciones. Te la quedas."
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
        "feest": "🌟 Festa de Natal",
        "fx2": "❄️ Neve"
      },
      "popEyebrow": "Recompensa de Natal",
      "popSub": {
        "flair": "Sua árvore de Natal para o placar. É sua para sempre.",
        "fx": "Um pisca-pisca em volta do seu distintivo, visível em todos os placares. É seu para sempre.",
        "feest": "Neve e estrelas a cada vitória. Você liga ou desliga quando quiser.",
        "fx2": "Neve caindo devagar em volta do seu distintivo, visível em todos os placares. É sua para sempre."
      },
      "popGroupSub": "Sua árvore e seu pisca-pisca, para usar juntos.",
      "hookLine": "Você ganhou o distintivo de árvore de Natal. Com uma conta gratuita você pode usá-lo."
    }
  };
  window.SeasonEvent.add("kerst", { copy, art: "<g id=\"achv-art-kerst\"><use href=\"#achv-tile-base\"/><path d=\"M50 25L64 42.5H58L70.5 58H62.5L76 74H24L37.5 58H29.5L42 42.5H36ZM45.5 74H54.5V82H45.5ZM50 14.5L51.8 19.1L56.7 19.3L52.9 22.4L54.1 27.2L50 24.5L45.9 27.2L47.1 22.4L43.3 19.3L48.2 19.1Z\" fill=\"#241329\" stroke=\"#241329\" stroke-width=\"3\" stroke-linejoin=\"round\"/><path d=\"M45.5 74H54.5V82H45.5Z\" fill=\"#8a5a24\"/><path d=\"M50 25L64 42.5H58L70.5 58H62.5L76 74H24L37.5 58H29.5L42 42.5H36Z\" fill=\"#6db06d\"/><path d=\"M50 25L64 42.5H58L70.5 58H62.5L76 74H50Z\" fill=\"#3f9a3a\"/><path d=\"M50 14.5L51.8 19.1L56.7 19.3L52.9 22.4L54.1 27.2L50 24.5L45.9 27.2L47.1 22.4L43.3 19.3L48.2 19.1Z\" fill=\"#ffd54d\"/><circle cx=\"45.5\" cy=\"38\" r=\"3\" fill=\"#e05a4e\"/><circle cx=\"35\" cy=\"68\" r=\"3\" fill=\"#e05a4e\"/><circle cx=\"39.5\" cy=\"53.5\" r=\"3\" fill=\"#ffd54d\"/><circle cx=\"57.5\" cy=\"51.5\" r=\"3\" fill=\"#ffd54d\"/><circle cx=\"63.5\" cy=\"68\" r=\"3\" fill=\"#f2e8c9\"/></g>" }, "\n/* kerst (/event-kerst.js): goud zoals de lampjes van de skin, licht thema rood; stempel = een kerstboompje met drie uitgesneden ballen */\n[data-ev=\"kerst\"] { --ev-pk: #ffc34d; --ev-pk-ink: #241600; --ev-pk-soft: rgba(255, 195, 77, 0.15); --ev-stamp: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 84'%3E%3Cdefs%3E%3Cmask id='m'%3E%3Crect width='96' height='84' fill='%23fff'/%3E%3Cg fill='%23000'%3E%3Ccircle cx='41' cy='37' r='3.6'/%3E%3Ccircle cx='56' cy='52' r='3.8'/%3E%3Ccircle cx='38' cy='62' r='3.8'/%3E%3Ccircle cx='60' cy='68' r='3.4'/%3E%3C/g%3E%3C/mask%3E%3C/defs%3E%3Cg mask='url(%23m)'%3E%3Cpath d='M48 6L62 24H56L70 42H62L78 66H18L34 42H26L40 24H34Z'/%3E%3Crect x='42' y='66' width='12' height='12' rx='1.5'/%3E%3C/g%3E%3C/svg%3E\"); }\nhtml[data-theme=\"light\"] [data-ev=\"kerst\"], html[data-theme=\"parchment\"] [data-ev=\"kerst\"] { --ev-pk: #c42f2f; --ev-pk-ink: #fff; --ev-pk-soft: rgba(196, 47, 47, 0.12); }\n");
  window.EventKerst = true;
})();
