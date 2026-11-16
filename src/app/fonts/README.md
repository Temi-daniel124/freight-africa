# JakartaFA.woff2

Plus Jakarta Sans (SIL Open Font License 1.1, see `OFL.txt`), in a Freight Africa subset (D034). It is a
modified version, so the family inside the file is named "Plus Jakarta Sans FA".

- Axis kept: `wght` 400–800, one variable file, about 20 KB, preloaded.
- Characters: Basic Latin and Latin-1, the naira sign `₦` (the designer's own), the arrows ← → ↑ ↓, and
  the letters needed later for Hausa, Yoruba and Igbo (ɓ ɗ ƙ Ɓ Ɗ Ƙ ẹ ọ ṣ ị ụ ṅ ǹ Ǹ and the combining
  accents and dot below).
- Added by us, because the original lacks them: `ɓ ɗ ƙ Ɓ Ɗ Ƙ ǹ Ǹ`. They are built by the script from the
  font's own b d k B D K n N at both ends of the weight range, so they thicken with the rest. The
  lowercase letters are sound; the three capitals deserve a type designer's eye before Hausa ships.
- OpenType features kept: kern, liga, calt, ccmp, locl, mark, mkmk, tnum, pnum, case.

Rebuild (Python fonttools; the original is `ofl/plusjakartasans/PlusJakartaSans[wght].ttf` in
https://github.com/google/fonts):

```
python scripts/fonts/build-jakarta.py "PlusJakartaSans[wght].ttf" src/app/fonts/JakartaFA.woff2
```

The font has no `⇄` (U+21C4); corridor names draw it as a Lucide icon through
`src/components/ui/corridor-text.tsx`.

Add a character to `UNICODES` in the script (and rebuild) before using it anywhere in the interface.
`font-coverage.test.ts` fails if the interface uses a character the file lacks.

The previous typeface (Inter, D032) is kept only for the private comparison page, as
`public/dev-fonts/inter-fa.woff2`.
