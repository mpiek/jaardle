#!/usr/bin/env python3
"""Bouw de zelf-gehoste kleuren-emoji-webfont (fonts/jaardle-emoji.woff2).

Waarom: het spel is ontworpen op de Noto/Android-emojiset (de bewegende webp's in
/emoji/ zijn óók Noto). Op Windows/Apple wijkt de systeem-emojiset daarvan af,
waardoor de statische emoji anders ogen dan het ontwerp en dan de animaties.
Een gesubsette Noto-COLRv1-webfont vooraan in de font-stack trekt dat recht op
alle Chromium/Firefox-browsers (heel Windows + Linux). Safari/Apple ondersteunt
COLRv1 niet en valt terug op de mooie Apple-set — geen regressie.

Bron van waarheid voor de tekens is game.js + index.template.html (de taal-mirrors
worden daaruit gegenereerd, dus die hoeven niet gescand). Zo groeit de subset
vanzelf mee als er een flair/hint-emoji bijkomt: draai dit script opnieuw.

Vereist: fontTools + brotli (pip), en het COLRv1-bronfont (zie SRC_FONT hieronder;
download eenmalig van googlefonts/noto-emoji → fonts/Noto-COLRv1.ttf, niet gecommit).

Uitvoer:
  fonts/jaardle-emoji.woff2   — de gesubsette webfont (wél committen)
  print naar stdout: de unicode-range voor de @font-face in style.css
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_FONT = ROOT / "fonts" / "Noto-COLRv1.ttf"       # bronfont (niet gecommit)
OUT = ROOT / "fonts" / "jaardle-emoji.woff2"
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
        "--layout-features=*",          # GSUB-ligaturen (ZWJ/vlag-sequenties) behouden
        "--flavor=woff2",
        f"--output-file={OUT}",
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
    print("→ pyftsubset (%d codepoints)…" % len(cps), file=sys.stderr)
    subprocess.run(cmd, check=True)
    kb = OUT.stat().st_size / 1024
    print(f"✓ {OUT.name}: {kb:.0f} KB, {len(cps)} codepoints", file=sys.stderr)

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
