import localFont from "next/font/local";

// D034: the one typeface, Plus Jakarta Sans in a Freight Africa subset (naira sign, Hausa, Yoruba and
// Igbo letters), weights 400–800 in one variable file. To try another typeface, build its subset the
// same way (README.md here) and change the `src` line; everything else reads --font-brand.
export const brandFont = localFont({
  src: "./JakartaFA.woff2",
  variable: "--font-brand",
  weight: "400 800",
  display: "swap",
  preload: true,
  adjustFontFallback: "Arial",
  fallback: ["-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
});
