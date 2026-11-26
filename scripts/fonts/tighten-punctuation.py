"""Pull the comma and full stop closer to the letter before them in JakartaFA.woff2.

Combined brief §4, step 5: in headings there was a visible gap before commas and full stops ("Good
morning , Adaeze"). The cause is the glyphs, not the CSS: Plus Jakarta Sans draws the comma 80 units and
the full stop 103 units (of 1000) after the glyph's start, and has no kerning pair for them, while
headings are tracked −0.025 to −0.04em. Letters close up, the punctuation keeps its own wide gap, and the
gap reads as a space.

This moves both outlines 40 units left and narrows their advance by the same 40, so the space after
them is unchanged. The ellipsis is built from three full stops, so its components move back by 40 to keep
it exactly as it was. Advances vary through gvar phantom points (the build drops HVAR), so the change holds
at every weight.

Usage (Python fonttools and brotli):
    python scripts/fonts/tighten-punctuation.py src/app/fonts/JakartaFA.woff2
build-jakarta.py runs it on its output, so a rebuild keeps the fix.
"""

import sys

from fontTools.ttLib import TTFont

SHIFT = 40
GLYPHS = ("comma", "period")


def tighten(path):
    font = TTFont(path)
    glyf, hmtx = font["glyf"], font["hmtx"]
    for name in GLYPHS:
        glyph = glyf[name]
        assert not glyph.isComposite(), name
        glyph.coordinates.translate((-SHIFT, 0))
        glyph.recalcBounds(glyf)
        advance, _ = hmtx[name]
        hmtx[name] = (advance - SHIFT, glyph.xMin)
    for name in font.getGlyphOrder():
        glyph = glyf[name]
        if glyph.isComposite() and name not in GLYPHS:
            moved = False
            for component in glyph.components:
                if component.glyphName in GLYPHS:
                    component.x += SHIFT
                    moved = True
            if moved:
                glyph.recalcBounds(glyf)
                hmtx[name] = (hmtx[name][0], glyph.xMin)
    font.flavor = "woff2"
    font.save(path)
    print("tightened", ", ".join(GLYPHS), "by", SHIFT, "in", path)


if __name__ == "__main__":
    tighten(sys.argv[1])
