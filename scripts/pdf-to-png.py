"""Renders page 1 of a PDF to a PNG of a given width (scripts/compare-mockups.mjs, PDF pairs).
Usage: python scripts/pdf-to-png.py in.pdf out.png 794  (needs PyMuPDF; a local tool, not an app dependency)."""
import sys

import pymupdf

src, out, width = sys.argv[1], sys.argv[2], int(sys.argv[3])
page = pymupdf.open(src)[0]
zoom = width / page.rect.width
page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom)).save(out)
