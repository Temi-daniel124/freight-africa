"""Makes the 1200 px portrait hero photos (600-1023 px screens) from the Unsplash originals.

Usage:  python scripts/photos/export-portrait.py <folder with the originals> public/photos

For each photo it finds where the existing 828 px phone portrait was cut from the original, cuts the
same framing at 1200 x 1739, finds the areas we blurred in the 828 file (number plates, billboards) by
comparing it with the original, blurs the same areas, and saves AVIF and WebP under the size budget
(DESIGN_SYSTEM.md 6.2: 180 KB for the 1200 px portrait). Originals: public/photos/CREDITS.md.
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter, ImageOps

PHOTOS = {"truck-park": "truck-park.jpg", "lagos": "lagos.jpg", "okene": "okene.jpg", "ibadan": "ibadan.jpg"}
WIDTH, HEIGHT = 1200, 1739  # same 828:1200 shape as the phone file
BUDGET = 180 * 1024


def gray(im, size):
    return ImageOps.grayscale(im.resize(size, Image.Resampling.LANCZOS))


def _ssd_map(image, template):
    """Sum of squared differences of `template` at every position in `image` (FFT correlation)."""
    import numpy as np

    th, tw = template.shape
    ih, iw = image.shape
    size = (ih + th, iw + tw)
    corr = np.fft.irfft2(np.fft.rfft2(image, size) * np.conj(np.fft.rfft2(template, size)), size)[:ih - th + 1, :iw - tw + 1]
    sq = np.pad(np.cumsum(np.cumsum(image**2, 0), 1), ((1, 0), (1, 0)))
    window = sq[th:, tw:] - sq[:-th, tw:] - sq[th:, :-tw] + sq[:-th, :-tw]
    return window - 2 * corr + (template**2).sum()


def locate(original, phone):
    """Finds the crop (width, height, x, y in original pixels) the 828 x 1200 phone file was cut from."""
    import numpy as np

    target = np.asarray(gray(phone, (104, 150)), dtype=np.float64)
    ow, oh = original.size
    best = None
    for percent in range(50, 101):
        crop_h = oh * percent / 100
        if crop_h * 828 / 1200 > ow:
            continue
        scale = 150 / crop_h
        small = np.asarray(gray(original, (round(ow * scale), round(oh * scale))), dtype=np.float64)
        ssd = _ssd_map(small, target)
        y, x = np.unravel_index(np.argmin(ssd), ssd.shape)
        score = ssd[y, x] / target.size
        if best is None or score < best[0]:
            best = (score, crop_h, x / scale, y / scale)
    score, crop_h, x, y = best
    # Fine search at a larger size around the coarse answer.
    target = np.asarray(gray(phone, (414, 600)), dtype=np.float64)
    fine = None
    for step in np.linspace(-0.012, 0.012, 13):
        h = crop_h * (1 + step)
        scale = 600 / h
        small = np.asarray(gray(original, (round(ow * scale), round(oh * scale))), dtype=np.float64)
        x0, y0 = round(x * scale), round(y * scale)
        pad = 16
        top, left = max(0, y0 - pad), max(0, x0 - pad)
        region = small[top : min(small.shape[0], y0 + 600 + pad), left : min(small.shape[1], x0 + 414 + pad)]
        if region.shape[0] < 600 or region.shape[1] < 414:
            continue
        ssd = _ssd_map(region, target)
        dy, dx = np.unravel_index(np.argmin(ssd), ssd.shape)
        value = ssd[dy, dx] / target.size
        if fine is None or value < fine[0]:
            fine = (value, h, (left + dx) / scale, (top + dy) / scale)
    _, crop_h, x, y = fine
    print(f"  match error {fine[0]:.1f} (coarse {score:.1f})")
    return crop_h * 828 / 1200, crop_h, x, y


def _local_std(a, r):
    import numpy as np

    k = 2 * r + 1
    pad = np.pad(a, r, mode="edge")
    c1 = np.pad(np.cumsum(np.cumsum(pad, 0), 1), ((1, 0), (1, 0)))
    c2 = np.pad(np.cumsum(np.cumsum(pad**2, 0), 1), ((1, 0), (1, 0)))
    box = lambda c: c[k:, k:] - c[:-k, k:] - c[k:, :-k] + c[:-k, :-k]
    mean = box(c1) / k**2
    return np.sqrt(np.maximum(box(c2) / k**2 - mean**2, 0))


def blur_mask(original_crop, phone):
    """Where the original has texture but our phone file is flat: the patches we blurred (plates, signs).
    Edges that merely moved by a pixel in resampling have texture in both, so they are not picked up."""
    import numpy as np

    ours = np.asarray(ImageOps.grayscale(phone), dtype=np.float64)
    theirs = np.asarray(ImageOps.grayscale(original_crop.resize(phone.size, Image.Resampling.LANCZOS)), dtype=np.float64)
    s_ours, s_theirs = _local_std(ours, 3), _local_std(theirs, 3)
    flat = (s_theirs > 6) & (s_ours < 0.3 * s_theirs)
    mask = Image.fromarray((flat * 255).astype(np.uint8))
    # Join the flagged pixels of one patch, drop specks, and grow a little to cover the whole plate or sign.
    mask = mask.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(11))
    return mask


def save(image, path, fmt):
    for quality in range(70, 30, -4):
        image.save(path, fmt, quality=quality, **({"speed": 6} if fmt == "AVIF" else {"method": 6}))
        if path.stat().st_size <= BUDGET:
            return quality
    return quality


def main(originals, out):
    for name, file in PHOTOS.items():
        original = Image.open(originals / file).convert("RGB")
        phone = Image.open(out / f"hero-{name}-828.webp").convert("RGB")
        crop_w, crop_h, x, y = locate(original, phone)
        box = tuple(round(v) for v in (x, y, x + crop_w, y + crop_h))
        crop = original.crop(box)
        portrait = crop.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS)

        mask = blur_mask(crop, phone)
        covered = sum(1 for v in mask.getdata() if v) / (mask.width * mask.height)
        if covered:
            big_mask = mask.resize((WIDTH, HEIGHT), Image.Resampling.BILINEAR).filter(ImageFilter.GaussianBlur(4))
            portrait = Image.composite(portrait.filter(ImageFilter.GaussianBlur(14)), portrait, big_mask)

        qa = save(portrait, out / f"hero-{name}-1200.avif", "AVIF")
        qw = save(portrait, out / f"hero-{name}-1200.webp", "WEBP")
        sizes = [(out / f"hero-{name}-1200.{ext}").stat().st_size // 1024 for ext in ("avif", "webp")]
        print(f"{name}: crop {box} of {original.size}, blurred {covered:.1%} of the frame, avif q{qa} {sizes[0]} KB, webp q{qw} {sizes[1]} KB")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
