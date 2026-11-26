"""Builds src/app/fonts/JakartaFA.woff2, the Freight Africa subset of Plus Jakarta Sans (D034).

Usage:  python scripts/fonts/build-jakarta.py "PlusJakartaSans[wght].ttf" src/app/fonts/JakartaFA.woff2

The original (SIL Open Font License 1.1) is ofl/plusjakartasans in https://github.com/google/fonts.
What this does, in order:
  1. Keeps weights 400 to 800 of the variable font.
  2. Adds the letters the original lacks for Hausa and Igbo: ɓ ɗ ƙ Ɓ Ɗ Ƙ ǹ Ǹ. Each is built from the
     font's own letter (b d k B D K n N) at both ends of the weight range, so it thickens with the rest.
  3. Subsets to the characters and features Freight Africa uses, and renames the family
     "Plus Jakarta Sans FA", since it is a modified version.
The naira sign is the designer's own and is untouched.
"""
import importlib.util
import sys
from pathlib import Path

from fontTools import subset
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent
from fontTools.ttLib.tables.TupleVariation import TupleVariation
from fontTools.varLib import instancer

UNICODES = (
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0300-0304,U+0308,U+0323,"
    "U+2000-206F,U+20A6,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+0181,U+0198,U+0199,U+018A,U+0253,"
    "U+0257,U+1EB8-1EB9,U+1ECA-1ECD,U+1E62-1E63,U+1EE4-1EE5,U+1E44-1E45,U+01F8-01F9,U+FEFF,U+FFFD"
)
FEATURES = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk", "tnum", "pnum", "case"]
LIGHT, HEAVY = 400, 800


def contours_of(font, name):
    """The glyph as a list of contours, each a list of (x, y, on_curve)."""
    glyph = font["glyf"][name]
    coords, ends, flags = glyph.getCoordinates(font["glyf"])
    out, start = [], 0
    for end in ends:
        out.append([(round(coords[i][0]), round(coords[i][1]), bool(flags[i] & 1)) for i in range(start, end + 1)])
        start = end + 1
    return out


def glyph_from(contours):
    pen = TTGlyphPen(None)
    for contour in contours:
        # TrueType contours are closed quadratic paths; qCurveTo with a trailing None keeps the points as given.
        pen.qCurveTo(*[(x, y) for x, y, _ in contour], None) if not any(on for _, _, on in contour) else draw(pen, contour)
    return pen.glyph(dropImpliedOnCurves=False)


def draw(pen, contour):
    # Start from an on-curve point and replay the rest, grouping off-curve runs.
    first = next(i for i, p in enumerate(contour) if p[2])
    points = contour[first:] + contour[:first]
    pen.moveTo(points[0][:2])
    run = []
    for x, y, on in points[1:]:
        run.append((x, y))
        if on:
            pen.lineTo(run[0]) if len(run) == 1 else pen.qCurveTo(*run)
            run = []
    if run:
        pen.qCurveTo(*run, points[0][:2])
    pen.closePath()


def stem_top(contours, side):
    """The flat top of the tallest vertical stem: (contour index, index of its left point, x0, x1, y).
    `side` picks the leftmost or rightmost such top when a letter has more than one (K has stem and arm)."""
    found = []
    for ci, contour in enumerate(contours):
        top = max(y for _, y, _ in contour)
        n = len(contour)
        for i in range(n):
            a, b = contour[i], contour[(i + 1) % n]
            if a[2] and b[2] and a[1] == top and b[1] == top and b[0] > a[0]:
                found.append((top, ci, i, a[0], b[0]))
    tallest = max(f[0] for f in found)
    tops = [f for f in found if f[0] >= tallest - 2]
    top, ci, i, x0, x1 = (min if side == "left" else max)(tops, key=lambda f: f[3])
    return ci, i, x0, x1, top


def hook_right(contours, stem):
    """Bends the top of an ascender stem over to the right (ɓ ɗ ƙ). `stem` is the stroke thickness."""
    ci, i, x0, x1, top = stem_top(contours, "left" if stem["side"] == "left" else "right")
    t = x1 - x0
    thin = round(t * 0.9)  # horizontal strokes are a little lighter than stems
    inner = round(t * 0.62)
    outer = t + inner
    reach = inner + round(t * 0.62)
    contour = contours[ci]
    hook = [
        (x0, top - outer, True),
        (x0, top, False),
        (x0 + outer, top, True),
        (x1 + reach, top, True),
        (x1 + reach, top - thin, True),
        (x1 + inner, top - thin, True),
        (x1, top - thin, False),
        (x1, top - thin - inner, True),
    ]
    j = (i + 1) % len(contour)
    contours[ci] = contour[:i] + hook + contour[i + 2 :] if j == i + 1 else hook + contour[1:-1]
    return x1 + reach


def flag(x_from, x_to, top, t, direction):
    """A bar at cap height that turns down into a short tail: the hook of Ɓ Ɗ (to the left) and Ƙ (to the right)."""
    thin = round(t * 0.86)
    inner = round(t * 0.7)
    outer = thin + inner
    tail = top - outer - round(t * 0.55)  # where the tail ends
    if direction < 0:  # bar runs left from x_from to x_to, tail at the left end
        return [
            (x_to, tail, True),
            (x_to, top - outer, True),
            (x_to, top, False),
            (x_to + outer, top, True),
            (x_from, top, True),
            (x_from, top - thin, True),
            (x_to + outer, top - thin, True),
            (x_to + thin, top - thin, False),
            (x_to + thin, top - outer, True),
            (x_to + thin, tail, True),
        ]
    return [
        (x_from, top, True),
        (x_to - outer, top, True),
        (x_to, top, False),
        (x_to, top - outer, True),
        (x_to, tail, True),
        (x_to - thin, tail, True),
        (x_to - thin, top - outer, True),
        (x_to - thin, top - thin, False),
        (x_to - outer, top - thin, True),
        (x_from, top - thin, True),
    ]


def build_hooked(font, base, kind):
    """Returns (contours, advance) for one master."""
    contours = contours_of(font, base)
    advance, lsb = (round(v) for v in font["hmtx"][base])
    if kind == "ascender":  # ɓ ɗ ƙ
        side = "right" if base == "d" else "left"
        right = hook_right(contours, {"side": side})
        advance = max(advance, right + round(lsb * 0.6))
        return contours, advance
    if kind == "cap-left":  # Ɓ Ɗ: the top bar runs out to the left of the stem and curls down
        _, _, x0, x1, top = stem_top(contours, "left")
        t = x1 - x0
        reach = round(t * 2.0)
        shift = max(0, reach - lsb + round(lsb * 0.5))
        moved = [[(x + shift, y, on) for x, y, on in contour] for contour in contours]
        moved.append(flag(x0 + shift + round(t * 0.5), x0 + shift - reach, top, t, -1))
        return moved, advance + shift
    # Ƙ: the upper arm ends in a bar to the right that curls down
    _, _, s0, s1, _ = stem_top(contours, "left")
    _, _, a0, a1, top = stem_top(contours, "right")
    t = s1 - s0
    reach = round(t * 2.2)
    contours.append(flag(a0 + round((a1 - a0) * 0.35), a1 + reach, top, t, 1))
    return contours, advance + round(reach * 0.8)


def bounds(font, name):
    glyph_set = font.getGlyphSet()
    pen = DecomposingRecordingPen(glyph_set)
    glyph_set[name].draw(pen)
    xs = [x for _, pts in pen.value for x, _ in pts]
    ys = [y for _, pts in pen.value for _, y in pts]
    return min(xs), min(ys), max(xs), max(ys)


def accent_offset(font, base, accent, reference):
    """Where to put `accent` over `base`: centred, at the height the font itself uses on `reference`."""
    b0, _, b1, _ = bounds(font, base)
    a0, _, a1, _ = bounds(font, accent)
    ref = font["glyf"][reference]
    dy = next(c.y for c in ref.components if c.glyphName == accent) if ref.isComposite() else 0
    return round((b0 + b1) / 2 - (a0 + a1) / 2), round(dy)


def add_glyph(font, name, code, glyph, advance, lsb):
    font.setGlyphOrder(font.getGlyphOrder() + [name])
    font["glyf"][name] = glyph
    font["hmtx"][name] = (advance, lsb)
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap[code] = name
    classes = font["GDEF"].table.GlyphClassDef if "GDEF" in font else None
    if classes:
        classes.classDefs[name] = 1


def main(source, target):
    variable = instancer.instantiateVariableFont(TTFont(source), {"wght": (LIGHT, HEAVY)}, inplace=False)
    light = instancer.instantiateVariableFont(TTFont(source), {"wght": LIGHT}, inplace=False)
    heavy = instancer.instantiateVariableFont(TTFont(source), {"wght": HEAVY}, inplace=False)
    cmap = variable.getBestCmap()
    region = {"wght": (0.0, 1.0, 1.0)}
    # Advance widths of the new glyphs vary through gvar's phantom points; HVAR would need an entry each.
    if "HVAR" in variable:
        del variable["HVAR"]

    hooked = [("uni0253", 0x0253, "b", "ascender"), ("uni0257", 0x0257, "d", "ascender"), ("uni0199", 0x0199, "k", "ascender"),
              ("uni0181", 0x0181, "B", "cap-left"), ("uni018A", 0x018A, "D", "cap-left"), ("uni0198", 0x0198, "K", "cap-right")]
    for name, code, base, kind in hooked:
        if code in cmap:
            continue
        (c400, adv400), (c800, adv800) = build_hooked(light, base, kind), build_hooked(heavy, base, kind)
        flat400 = [p for contour in c400 for p in contour]
        flat800 = [p for contour in c800 for p in contour]
        assert [len(c) for c in c400] == [len(c) for c in c800] and [p[2] for p in flat400] == [p[2] for p in flat800], name
        glyph = glyph_from(c400)
        glyph.recalcBounds(variable["glyf"])
        add_glyph(variable, name, code, glyph, adv400, glyph.xMin)
        deltas = [(round(b[0] - a[0]), round(b[1] - a[1])) for a, b in zip(flat400, flat800)]
        deltas += [(0, 0), (adv800 - adv400, 0), (0, 0), (0, 0)]  # phantom points: left, right, top, bottom
        variable["gvar"].variations[name] = [TupleVariation(region, deltas)]

    for name, code, base, accent, reference in [("uni01F9", 0x01F9, "n", "gravecomb", "ograve"), ("uni01F8", 0x01F8, "N", "gravecomb.case", "Ograve")]:
        if code in cmap:
            continue
        if accent not in variable.getGlyphOrder():
            accent = "gravecomb"
        (x400, y400), (x800, y800) = accent_offset(light, base, accent, reference), accent_offset(heavy, base, accent, reference)
        glyph = Glyph()
        glyph.numberOfContours = -1
        glyph.components = []
        for component, x, y in ((base, 0, 0), (accent, x400, y400)):
            part = GlyphComponent()
            part.glyphName, part.x, part.y, part.flags = component, x, y, 0x0204 if component == base else 0x0004
            glyph.components.append(part)
        glyph.recalcBounds(variable["glyf"])
        adv400, adv800 = round(light["hmtx"][base][0]), round(heavy["hmtx"][base][0])
        add_glyph(variable, name, code, glyph, adv400, light["hmtx"][base][1])
        deltas = [(0, 0), (x800 - x400, y800 - y400), (0, 0), (adv800 - adv400, 0), (0, 0), (0, 0)]
        variable["gvar"].variations[name] = [TupleVariation(region, deltas)]

    # The non-breaking hyphen (U+2011, as in "6‑digit") draws the font's own hyphen; the original has no
    # glyph for it, so browsers would fall back to another font for that one character.
    for table in variable["cmap"].tables:
        if table.isUnicode() and 0x2011 not in table.cmap:
            table.cmap[0x2011] = table.cmap[ord("-")]
    variable["maxp"].numGlyphs = len(variable.getGlyphOrder())
    # The subsetter expects an entry for every glyph, including ones that don't vary (spaces).
    for glyph_name in variable.getGlyphOrder():
        if glyph_name not in variable["gvar"].variations:
            variable["gvar"].variations[glyph_name] = []

    for record in list(variable["name"].names):
        if record.nameID in (1, 16):
            variable["name"].setName("Plus Jakarta Sans FA", record.nameID, record.platformID, record.platEncID, record.langID)
        elif record.nameID in (3, 4):
            variable["name"].setName("Plus Jakarta Sans FA", record.nameID, record.platformID, record.platEncID, record.langID)
        elif record.nameID == 6:
            variable["name"].setName("PlusJakartaSansFA", 6, record.platformID, record.platEncID, record.langID)

    options = subset.Options()
    options.layout_features = FEATURES
    options.flavor = "woff2"
    options.notdef_outline = True
    subsetter = subset.Subsetter(options)
    subsetter.populate(unicodes=subset.parse_unicodes(UNICODES))
    subsetter.subset(variable)
    variable.flavor = "woff2"
    variable.save(target)
    print("saved", target)
    # Combined brief §4: the comma and full stop sit too far from the letter before them in headings.
    spec = importlib.util.spec_from_file_location("tighten", Path(__file__).with_name("tighten-punctuation.py"))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.tighten(target)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
