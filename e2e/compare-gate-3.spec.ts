// Not part of the regular suite: renders the approved Gate 3 target next to the build (from How it works to
// the end of the footer), same width. Then: python scripts/compare-side-by-side.py <compare dir>
import { pathToFileURL } from "node:url";
import { test } from "@playwright/test";

const DIR = "docs/design/targets/gate-3";
for (const w of [320, 375, 768, 1280, 1440]) {
  test(`sections ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(pathToFileURL(`${DIR}/sections.html`).href);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const targetHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({ path: `${DIR}/compare/.t-sections-${w}.png`, fullPage: true });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    // Bring every lazy image in, then hide the fixed header so it doesn't sit over the sections.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
      window.scrollTo(0, 0);
    });
    // Lazy photos (the closing band) must have arrived before the screenshot.
    await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0), null, { timeout: 30_000 });
    await page.addStyleTag({ content: "header{visibility:hidden!important}" });
    await page.waitForTimeout(800);
    const top = await page.evaluate(() => Math.round(document.getElementById("how-it-works")!.getBoundingClientRect().top + window.scrollY));
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    console.log(w, "target", targetHeight, "build", total - top);
    await page.screenshot({ path: `${DIR}/compare/.b-sections-${w}.png`, fullPage: true, clip: { x: 0, y: top, width: w, height: Math.min(targetHeight, total - top) } });
  });
}
