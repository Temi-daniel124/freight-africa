// Not part of the regular suite: screenshots of the slice 4 screens for the founder's review
// (375 and 1440, DEVELOPMENT-WORKFLOW 1A). Saved to docs/design/review/slice-4.
import { test } from "@playwright/test";

const DIR = "docs/design/review/slice-4";
for (const w of [375, 1440]) {
  test(`team ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: w < 1024 ? 844 : 900 });
    await page.goto("/dev/team", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${DIR}/team-${w}.png` });
    await page.getByRole("button", { name: "Invite someone" }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${DIR}/team-invite-${w}.png` });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /Okafor Foods Ltd|Switch account/ }).last().click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${DIR}/account-switcher-${w}.png` });
  });
  test(`invite ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto("/dev/invite", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${DIR}/invite-${w}.png`, fullPage: true });
  });
}
