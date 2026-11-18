// Not part of the regular suite: renders the approved Gate 2 target next to the build, same width, same state.
// Run with: npx playwright test e2e/compare-gate-2.spec.ts, then python scripts/compare-side-by-side.py <compare dir>
import { pathToFileURL } from "node:url";
import { test } from "@playwright/test";

const DIR = "docs/design/targets/gate-2";
const widths = [320, 375, 768, 1280, 1440];

for (const w of widths) {
  test(`hero ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: w >= 1024 ? 900 : 844 });
    await page.goto(pathToFileURL(`${DIR}/hero.html`).href);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.screenshot({ path: `${DIR}/compare/.t-hero-${w}.png`, fullPage: true });

    await page.goto("/", { waitUntil: "networkidle" });
    // The slow zoom on photo 1 would make the two photos differ in size; hold it still for the comparison.
    await page.addStyleTag({ content: ".animate-hero-zoom{animation:none!important}" });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    const phone = page.locator("#hero-phone");
    await phone.click();
    await phone.pressSequentially("8031234567");
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `${DIR}/compare/.b-hero-${w}.png`, clip: { x: 0, y: 0, width: w, height }, fullPage: true });
  });
}
