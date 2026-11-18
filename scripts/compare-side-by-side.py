"""Pairs target and build screenshots: python scripts/compare-side-by-side.py docs/design/targets/gate-1/compare"""
import glob
import os
import sys

from PIL import Image, ImageDraw, ImageFont

folder = sys.argv[1]
try:
    font = ImageFont.truetype("C:/Windows/Fonts/segoeuib.ttf", 20)
except OSError:
    font = ImageFont.load_default()
for target in sorted(glob.glob(os.path.join(folder, ".t-*.png"))):
    name = os.path.basename(target)[3:-4]
    build = os.path.join(folder, f".b-{name}.png")
    if not os.path.exists(build):
        continue
    a, b = Image.open(target).convert("RGB"), Image.open(build).convert("RGB")
    gap, top = 24, 40
    out = Image.new("RGB", (a.width + b.width + gap, max(a.height, b.height) + top), "#d9dfda")
    draw = ImageDraw.Draw(out)
    draw.text((8, 10), f"TARGET  {name}", fill="#0f1a14", font=font)
    draw.text((a.width + gap + 8, 10), f"BUILD  {name}", fill="#0f1a14", font=font)
    out.paste(a, (0, top))
    out.paste(b, (a.width + gap, top))
    out.save(os.path.join(folder, f"{name}.png"), optimize=True)
    print(name, a.size, b.size)
