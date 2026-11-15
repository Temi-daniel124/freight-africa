# InterFA.woff2

Inter 4.1.1 (SIL Open Font License 1.1, see `OFL.txt`), subset for Freight Africa (D032):

- Axes kept: `opsz` 14–32 (optical sizes), `wght` limited to 400–800.
- Characters: Basic Latin and Latin-1, the naira sign `₦` (U+20A6), the arrows ← → ↑ ↓, and the letters needed later for Hausa, Yoruba and Igbo (ɓ ɗ ƙ Ɓ Ɗ Ƙ ẹ ọ ṣ ị ụ ṅ ǹ and the
  combining accents and dot below).
- OpenType features kept: kern, liga, calt, ccmp, locl, mark, mkmk, tnum, pnum, case, cv05, cv08, ss02,
  ss04.
- Size: 57 KB, one file, preloaded.

Rebuilt with (Python fonttools, run anywhere except as a Docker step):

```
pyftsubset InterVariable.woff2 --unicodes="U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0300-0304,U+0308,U+0323,U+2000-206F,U+20A6,U+20AC,U+2122,U+2190-2193,U+2212,U+2215,U+21C4,U+0181,U+0198,U+0199,U+018A,U+0253,U+0257,U+1EB8-1EB9,U+1ECA-1ECD,U+1E62-1E63,U+1EE4-1EE5,U+1E44-1E45,U+01F8-01F9,U+FEFF,U+FFFD" --layout-features="kern,liga,calt,ccmp,locl,mark,mkmk,tnum,pnum,case,cv05,cv08,ss02,ss04" --flavor=woff2 --output-file=inter-fa.woff2
fonttools varLib.instancer inter-fa.woff2 wght=400:800 -o inter-fa.ttf
pyftsubset inter-fa.ttf --unicodes="*" --layout-features="*" --flavor=woff2 --output-file=InterFA.woff2
```

Inter has no `⇄` (U+21C4), so the subset doesn't either (checked 15 Nov 2026); corridor names draw it as a
Lucide icon through `src/components/ui/corridor-text.tsx`.

Add a character to the `--unicodes` list (and rebuild) before using it anywhere in the interface.
