"""Builds the font files for the private comparison page at /dev/fonts.

Usage:  python scripts/fonts/build-bakeoff.py <folder with the original variable .ttf files> public/dev-fonts

For each candidate it makes one static file per weight (400 to 800), subset to the same characters as
InterFA.woff2. Where a font has no naira sign, one is drawn from that font's own capital N and the two
bars of its equals sign, and the family is renamed ("FA ... Naira"), as the SIL Open Font License asks
of a modified version. Originals come from https://github.com/google/fonts (ofl/<family>).
"""
import json
import sys
from pathlib import Path

from fontTools import subset
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

NAIRA = 0x20A6
WEIGHTS = [400, 500, 600, 700, 800]
# The same character list as src/app/fonts/README.md.
UNICODES = (
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0300-0304,U+0308,U+0323,"
    "U+2000-206F,U+20A6,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+0181,U+0198,U+0199,U+018A,U+0253,"
    "U+0257,U+1EB8-1EB9,U+1ECA-1ECD,U+1E62-1E63,U+1EE4-1EE5,U+1E44-1E45,U+01F8-01F9,U+FEFF,U+FFFD"
)
CHECK = {"₦": 0x20A6, "→": 0x2192, "ɓ": 0x253, "ɗ": 0x257, "ƙ": 0x199, "ẹ": 0x1EB9, "ọ": 0x1ECD, "ṣ": 0x1E63, "ị": 0x1ECB, "ụ": 0x1EE5, "ṅ": 0x1E45, "ǹ": 0x1F9}

# key, source file, family name on the page, axes pinned besides weight, optional display cut
FONTS = [
    ("geist", "Geist.ttf", "Geist", {}, None),
    ("jakarta", "Jakarta.ttf", "Plus Jakarta Sans", {}, None),
    ("manrope", "Manrope.ttf", "Manrope", {}, None),
    ("onest", "Onest.ttf", "Onest", {}, None),
    # Google Sans Flex has optical sizes; text is cut at 18 and headlines (700, 800) at 36.
    ("gsf", "GSF.ttf", "Google Sans Flex", {"opsz": 18, "wdth": 100, "ROND": 0, "slnt": 0}, {"opsz": 36, "wdth": 100, "ROND": 0, "slnt": 0}),
]


def bounds(font, name):
    glyph_set = font.getGlyphSet()
    pen = DecomposingRecordingPen(glyph_set)
    glyph_set[name].draw(pen)
    xs, ys = [], []
    for _, points in pen.value:
        for x, y in points:
            xs.append(x)
            ys.append(y)
    return min(xs), min(ys), max(xs), max(ys), pen


def draw_naira(font):
    """N with two bars: bar thickness and spacing come from the font's own equals sign."""
    cmap = font.getBestCmap()
    n_name, eq_name = cmap[ord("N")], cmap[ord("=")]
    n_x0, _, n_x1, n_top, n_pen = bounds(font, n_name)
    _, eq_y0, _, eq_y1, eq_pen = bounds(font, eq_name)

    # The equals sign is two bars; the lower bar's top edge is the lowest y that is not the bottom.
    ys = sorted({round(y) for _, pts in eq_pen.value for _, y in pts})
    eq_thickness = ys[1] - ys[0]
    eq_gap = (eq_y1 - eq_y0) - 2 * eq_thickness
    # Bars a little lighter than the equals sign and set wider apart, so the N stays open at heavy weights
    # (the proportions type designers use for the naira sign).
    thickness = round(eq_thickness * 0.62)
    gap = round(max(eq_gap, n_top * 0.2))
    middle = n_top / 2
    overshoot = round(font["head"].unitsPerEm * 0.045)
    left, right = n_x0 - overshoot, n_x1 + overshoot

    pen = TTGlyphPen(None)
    n_pen.replay(pen)
    for bottom in (middle - gap / 2 - thickness, middle + gap / 2):
        # Clockwise, like the font's own outer contours, so the bars join the N instead of cutting it.
        pen.moveTo((left, bottom))
        pen.lineTo((left, bottom + thickness))
        pen.lineTo((right, bottom + thickness))
        pen.lineTo((right, bottom))
        pen.closePath()

    order = font.getGlyphOrder()
    font.setGlyphOrder(order + ["naira"])
    font["glyf"]["naira"] = pen.glyph()
    advance, lsb = font["hmtx"][n_name]
    font["hmtx"]["naira"] = (advance, lsb - overshoot)
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap[NAIRA] = "naira"
    if "GDEF" in font and font["GDEF"].table.GlyphClassDef:
        font["GDEF"].table.GlyphClassDef.classDefs["naira"] = 1


def rename(font, family, weight):
    full = f"{family} {weight}"
    for record in list(font["name"].names):
        if record.nameID in (1, 16):
            font["name"].setName(family, record.nameID, record.platformID, record.platEncID, record.langID)
        elif record.nameID in (3, 4):
            font["name"].setName(full, record.nameID, record.platformID, record.platEncID, record.langID)
        elif record.nameID == 6:
            font["name"].setName(full.replace(" ", ""), 6, record.platformID, record.platEncID, record.langID)


def build(source: Path, out: Path):
    report = {}
    for key, file, family, pinned, display in FONTS:
        original = TTFont(source / file)
        cmap = original.getBestCmap()
        had_naira = NAIRA in cmap
        report[key] = {
            "family": family,
            "nairaDrawn": not had_naira,
            "missing": [char for char, code in CHECK.items() if code not in cmap and not (code == NAIRA)],
            "files": {},
        }
        cuts = [("text", pinned, WEIGHTS)] + ([("display", display, [700, 800])] if display else [])
        for cut, axes, weights in cuts:
            for weight in weights:
                font = instancer.instantiateVariableFont(TTFont(source / file), {**axes, "wght": weight}, inplace=False)
                if not had_naira:
                    draw_naira(font)
                    rename(font, f"FA {family} Naira", weight)
                options = subset.Options()
                options.layout_features = ["kern", "liga", "calt", "ccmp", "locl", "mark", "mkmk", "tnum", "pnum", "case"]
                options.flavor = "woff2"
                options.notdef_outline = True
                options.name_IDs = ["*"]
                subsetter = subset.Subsetter(options)
                subsetter.populate(unicodes=subset.parse_unicodes(UNICODES))
                subsetter.subset(font)
                name = f"{key}-{cut}-{weight}.woff2"
                font.flavor = "woff2"
                font.save(out / name)
                report[key]["files"][f"{cut}-{weight}"] = (out / name).stat().st_size
    (out / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for key, entry in report.items():
        print(key, "naira drawn" if entry["nairaDrawn"] else "has naira", "missing", "".join(entry["missing"]) or "none", sum(entry["files"].values()) // 1024, "KB")


if __name__ == "__main__":
    target = Path(sys.argv[2])
    target.mkdir(parents=True, exist_ok=True)
    build(Path(sys.argv[1]), target)
