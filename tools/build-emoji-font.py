#!/usr/bin/env python3
"""Bouw de zelf-gehoste kleuren-emoji-webfonts (fonts/jaardle-emoji.woff2 en
fonts/jaardle-emoji-svg.woff2).

Waarom: het spel is ontworpen op de Noto/Android-emojiset (de bewegende webp's in
/emoji/ zijn óók Noto). Op Windows/Apple wijkt de systeem-emojiset daarvan af,
waardoor de statische emoji anders ogen dan het ontwerp en dan de animaties.
Een gesubsette Noto-COLRv1-webfont vooraan in de font-stack trekt dat recht op
alle Chromium/Firefox-browsers (heel Windows + Linux). De basisglyphs zijn leeg,
dus een browser zonder COLRv1 zou lege plekken tonen; de @font-face in style.css
laadt het font daarom alleen via tech(color-COLRv1) — de rest (Safari/iOS, alle
versies) krijgt gewoon de systeem-emoji.

Bron van waarheid voor de tekens is game.js + index.template.html (de taal-mirrors
worden daaruit gegenereerd, dus die hoeven niet gescand). Zo groeit de subset
vanzelf mee als er een flair/hint-emoji bijkomt: draai dit script opnieuw.

Safari/iOS leest geen COLRv1 maar wel OpenType-SVG. Daarom bouwt dit script
dezelfde subset een tweede keer met de tekeningen in een SVG-tabel
(jaardle-emoji-svg.woff2). Dat is de route waarlangs Google Fonts Noto zelf aan
Safari levert: maximum_color uit nanoemoji zet elke COLRv1-glyph om naar SVG.
Beide bestanden komen uit dezelfde codepoints en hebben dezelfde maten, dus de
indeling is op elk toestel gelijk. Het SVG-font is ruim twee keer zo zwaar en
gaat alleen naar browsers die het COLRv1-font niet kunnen lezen.

Stand 14/11/2026: het SVG-font staat als proef alleen aan met ?emoji=svg (het
head-script in index.template.html), tot het op een echte iPhone bekeken is.
Daar komt de face via document.fonts en gaat hij voor op die uit style.css,
dus de link werkt ook in Firefox. Chrome leest dit formaat niet en zou lege
plekken tekenen, vandaar de font-tech-check. Het bereik in het head-script is
ruim maar zonder de spatie: een font dat de spatie dekt wordt het hoofdfont
van elke regel en verschuift de regelhoogte (gemeten: 3 px in de uitleg-demo).
Voor iedereen aanzetten = een tweede bron in de @font-face in style.css,
`tech(color-SVG)` ná de COLRv1-bron (Firefox kan beide en moet de lichte
pakken), plus voorladen in het head-script; de proef-tak kan dan weg.

Vereist: fontTools + brotli (pip), en het COLRv1-bronfont (zie SRC_FONT hieronder;
download eenmalig van googlefonts/noto-emoji → fonts/Noto-COLRv1.ttf, niet gecommit).
Voor het SVG-font ook nanoemoji, in een eigen venv (zie NANO_BIN hieronder):
  python3 -m venv ~/.venvs/nanoemoji && ~/.venvs/nanoemoji/bin/pip install nanoemoji brotli opentype-sanitizer

Uitvoer:
  fonts/jaardle-emoji.woff2       — de gesubsette webfont, COLRv1 (wél committen)
  fonts/jaardle-emoji-svg.woff2   — dezelfde subset als OpenType-SVG (wél committen)
  print naar stdout: de unicode-range voor de @font-face in style.css
"""
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_FONT = ROOT / "fonts" / "Noto-COLRv1.ttf"       # bronfont (niet gecommit)
OUT = ROOT / "fonts" / "jaardle-emoji.woff2"
OUT_SVG = ROOT / "fonts" / "jaardle-emoji-svg.woff2"  # dezelfde subset voor Safari/iOS
# Map met maximum_color, ninja en pyftsubset van nanoemoji (JAARDLE_NANOEMOJI_BIN
# wijst een andere venv aan).
NANO_BIN = Path(os.environ.get("JAARDLE_NANOEMOJI_BIN", Path.home() / ".venvs" / "nanoemoji" / "bin"))

# Opties die beide fonts delen.
SUBSET_OPTS = [
    "--layout-features=*",          # GSUB-ligaturen (ZWJ/vlag-sequenties) behouden
    "--no-hinting",
    "--desubroutinize",
    # 0 = copyright, 13 = licentie-omschrijving, 14 = licentie-URL. De OFL
    # (clause 2) eist dat elke kopie — ook een gesubsette — de copyright-
    # notice en de licentie meedraagt; deze drie name-records zijn precies
    # het "machine-readable metadata field" dat de licentie daarvoor noemt.
    # Alle overige namen (familie, versie, trademark) gaan er wél uit: die
    # zijn overbodig, want @font-face adresseert het bestand rechtstreeks.
    # Naast het font staat fonts/OFL.txt met de volledige licentietekst.
    "--name-IDs=0,13,14",
    "--drop-tables+=DSIG",
]
SCAN = [ROOT / "game.js", ROOT / "index.template.html"]

VS16 = 0xFE0F   # variatieselector-16: dwingt emoji-presentatie af
ZWJ = 0x200D    # zero-width joiner: koppelt emoji tot één (bv. 🐦‍🔥)

# "Bare" BMP-symbolen die het spel als emoji gebruikt zónder VS16 maar die van
# nature emoji-presentatie hebben (Emoji_Presentation=Yes). Legacy/vaste set —
# nieuwe emoji zitten vrijwel altijd in het ≥U+1F000-blok en worden automatisch
# gedekt. Tekstsymbolen (← → ✓ ✕ ✖ ▾ ⌫ ≤ ≥ − …) horen hier NIET bij en blijven
# zo systeemtekst.
ALLOW_BARE = {
    0x23E9,  # ⏩ fast-forward (clue-knop)
    0x23F3,  # ⏳ zandloper
    0x2615,  # ☕ koffie
    0x26A1,  # ⚡ bliksem (rating)
    0x2728,  # ✨ sterren
    0x2795,  # ➕ plus (pool erbij)
    0x2B1B,  # ⬛ zwart vierkant (resultaat/legenda)
    0x2B1C,  # ⬜ wit vierkant
}


def collect_codepoints() -> set[int]:
    """Emoji-codepoints uit de bronbestanden: alles ≥U+1F000, plus elk teken dat
    direct door VS16 gevolgd wordt (expliciete emoji-presentatie, bv. ▶️ ☄️ ☀️),
    plus de vaste ALLOW_BARE-set. VS16 en ZWJ worden meegenomen zodat de
    ligaturen (🐦‍🔥) en presentatie-selectors intact blijven."""
    cps: set[int] = set()
    for path in SCAN:
        text = path.read_text(encoding="utf-8")
        for i, ch in enumerate(text):
            cp = ord(ch)
            nxt = ord(text[i + 1]) if i + 1 < len(text) else 0
            if cp >= 0x1F000 or cp in ALLOW_BARE or nxt == VS16:
                cps.add(cp)
    # Alleen relevant als er echt emoji zijn (dat is altijd zo): koppeltekens erbij.
    if cps:
        cps |= {VS16, ZWJ}
    return cps


def fmt_unicode_range(cps: set[int]) -> str:
    """Compacte CSS unicode-range: losse punten samengevoegd tot ranges."""
    out, i = [], 0
    s = sorted(cps)
    while i < len(s):
        j = i
        while j + 1 < len(s) and s[j + 1] == s[j] + 1:
            j += 1
        if i == j:
            out.append(f"U+{s[i]:X}")
        else:
            out.append(f"U+{s[i]:X}-{s[j]:X}")
        i = j + 1
    return ", ".join(out)


def build_svg_font(unicodes: str, cps: set[int]) -> None:
    """Dezelfde subset als OpenType-SVG (zie de module-docstring). Drie stappen:
    subset als TTF, maximum_color voegt de SVG-tabel toe, daarna COLR en CPAL
    eruit en opnieuw subsetten, zodat ook de losse laag-glyphs verdwijnen die
    alleen COLRv1 nodig had (±1.300 stuks).

    --notdef-outline: zonder de laag-glyphs heeft geen enkele glyph nog een
    omtrek en is de glyf-tabel leeg. De font-keuring van Firefox en Chrome (OTS)
    weigert zo'n font ("glyf: zero-length table"); met de omtrek van .notdef
    erin, zoals in het font dat Google Fonts aan Safari levert, komt het erdoor.
    De keuring draait hieronder mee, zodat dit niet ongemerkt terugkomt."""
    missing = [n for n in ("maximum_color", "ninja", "pyftsubset") if not (NANO_BIN / n).exists()]
    if missing:
        sys.exit(
            f"nanoemoji ontbreekt in {NANO_BIN} ({', '.join(missing)}).\n"
            "Installeer eenmalig:\n"
            "  python3 -m venv ~/.venvs/nanoemoji && ~/.venvs/nanoemoji/bin/pip install nanoemoji brotli opentype-sanitizer\n"
            "Zonder dit font lopen de twee bestanden uit de pas (iPhones missen dan de nieuwe emoji)."
        )
    env = {**os.environ, "PATH": f"{NANO_BIN}{os.pathsep}{os.environ.get('PATH', '')}"}
    with tempfile.TemporaryDirectory(prefix="jaardle-emoji-") as tmp:
        tmp = Path(tmp)
        sub, both = tmp / "sub.ttf", tmp / "both.ttf"
        subprocess.run(
            [str(NANO_BIN / "pyftsubset"), str(SRC_FONT), f"--unicodes={unicodes}", *SUBSET_OPTS, "--notdef-outline", f"--output-file={sub}"],
            check=True, env=env,
        )
        print("→ maximum_color (COLRv1 → SVG, ±1 minuut)…", file=sys.stderr)
        # --build_dir moet absoluut zijn; de uitvoer landt in die map.
        subprocess.run(
            [str(NANO_BIN / "maximum_color"), "--nobitmaps", "--build_dir", str(tmp / "mc"), "--output_file", both.name, str(sub)],
            check=True, env=env, cwd=tmp, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        subprocess.run(
            [str(NANO_BIN / "pyftsubset"), str(tmp / "mc" / both.name), f"--unicodes={unicodes}", *SUBSET_OPTS,
             "--notdef-outline", "--drop-tables+=COLR,CPAL", "--flavor=woff2", f"--output-file={OUT_SVG}"],
            check=True, env=env,
        )
    # Controle met de fontTools van nanoemoji: elke emoji heeft een SVG-tekening
    # en dezelfde breedte als in het COLRv1-font, en het font komt door de
    # keuring van de browsers (OTS).
    check = (
        "import sys\n"
        "import ots\n"
        "r = ots.sanitize(sys.argv[2], '/dev/null', capture_output=True)\n"
        "assert r.returncode == 0, 'OTS weigert het font: ' + (r.stderr or b'').decode()\n"
        "from fontTools.ttLib import TTFont\n"
        "a, b = TTFont(sys.argv[1]), TTFont(sys.argv[2])\n"
        "ca, cb = a.getBestCmap(), b.getBestCmap()\n"
        "assert set(ca) == set(cb), 'codepoints verschillen: %s' % sorted(set(ca) ^ set(cb))\n"
        "assert 'COLR' not in b and 'SVG ' in b\n"
        "gids = set()\n"
        "for d in b['SVG '].docList: gids |= set(range(d.startGlyphID, d.endGlyphID + 1))\n"
        "bare = [hex(c) for c, g in cb.items() if c not in (0x200D, 0xFE0F) and b.getGlyphID(g) not in gids]\n"
        "assert not bare, 'zonder SVG-tekening: %s' % bare\n"
        "wrong = [hex(c) for c in ca if a['hmtx'][ca[c]] != b['hmtx'][cb[c]]]\n"
        "assert not wrong, 'andere breedte: %s' % wrong\n"
        "assert (a['hhea'].ascent, a['hhea'].descent) == (b['hhea'].ascent, b['hhea'].descent)\n"
    )
    subprocess.run([str(NANO_BIN / "python3"), "-c", check, str(OUT), str(OUT_SVG)], check=True)
    kb = OUT_SVG.stat().st_size / 1024
    print(f"✓ {OUT_SVG.name}: {kb:.0f} KB, {len(cps)} codepoints, elke emoji getekend, maten gelijk, OTS akkoord", file=sys.stderr)


def main() -> int:
    if not SRC_FONT.exists():
        sys.exit(
            f"Bronfont ontbreekt: {SRC_FONT}\n"
            "Download eenmalig (niet committen):\n"
            "  curl -sL -o fonts/Noto-COLRv1.ttf "
            "https://github.com/googlefonts/noto-emoji/raw/main/fonts/Noto-COLRv1.ttf"
        )
    cps = collect_codepoints()
    unicodes = ",".join(f"U+{cp:X}" for cp in sorted(cps))
    OUT.parent.mkdir(exist_ok=True)
    cmd = [
        "pyftsubset", str(SRC_FONT),
        f"--unicodes={unicodes}",
        *SUBSET_OPTS,
        "--flavor=woff2",
        f"--output-file={OUT}",
    ]
    print("→ pyftsubset (%d codepoints)…" % len(cps), file=sys.stderr)
    subprocess.run(cmd, check=True)
    kb = OUT.stat().st_size / 1024
    print(f"✓ {OUT.name}: {kb:.0f} KB, {len(cps)} codepoints", file=sys.stderr)
    build_svg_font(unicodes, cps)

    # unicode-range automatisch in style.css bijwerken (tussen de markers), zodat
    # de @font-face-range nooit uit de pas loopt met het gesubsette font.
    rng = fmt_unicode_range(cps)
    css_path = ROOT / "style.css"
    css = css_path.read_text(encoding="utf-8")
    start, end = "/* EMOJI-RANGE:START */", "/* EMOJI-RANGE:END */"
    if start in css and end in css:
        pre = css.split(start)[0]
        post = css.split(end, 1)[1]
        css = f"{pre}{start}\n  unicode-range: {rng};\n  {end}{post}"
        css_path.write_text(css, encoding="utf-8")
        print(f"✓ style.css unicode-range bijgewerkt ({len(cps)} codepoints)", file=sys.stderr)
    else:
        print("\n! markers niet gevonden in style.css — plak de range handmatig:", file=sys.stderr)
        print(f"  unicode-range: {rng};")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
