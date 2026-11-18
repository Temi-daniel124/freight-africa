// Not part of the regular suite: renders the approved Gate 1 target next to the build, same width, same state.
// Run with: npx playwright test e2e/compare-gate-1.spec.ts
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { test, type Page } from "@playwright/test";
import { sealPending } from "../src/features/auth/pending-seal";

const DIR = "docs/design/targets/gate-1";
const secret = /^CODE_HMAC_SECRET="?([^"\s]+)/m.exec(readFileSync(".env.local", "utf8"))?.[1] ?? "";
const widths = [320, 375, 768, 1280, 1440];
const height = (w: number) => (w >= 1024 ? 900 : 844);

async function shot(page: Page, path: string, w: number) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.screenshot({ path, fullPage: w < 1024 });
}

for (const w of widths) {
  test(`sign-in ${w}`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: height(w) });
    await page.goto(pathToFileURL(`${DIR}/signin.html`).href);
    await shot(page, `${DIR}/compare/.t-signin-${w}.png`, w);
    await page.goto("/auth", { waitUntil: "networkidle" });
    // Wait for the page to finish starting up, or the typed address is cleared.
    await page.waitForTimeout(1500);
    await page.getByLabel("Email address").click();
    await page.getByLabel("Email address").pressSequentially("ngozi.okafor@gmail.com");
    await shot(page, `${DIR}/compare/.b-signin-${w}.png`, w);
  });
  test(`code ${w}`, async ({ page, context, baseURL }) => {
    await page.setViewportSize({ width: w, height: height(w) });
    await page.goto(pathToFileURL(`${DIR}/code.html`).href);
    await shot(page, `${DIR}/compare/.t-code-${w}.png`, w);
    await context.addCookies([{ name: "fa_auth_pending", value: sealPending({ channel: "email", to: "ngozi.okafor@gmail.com", next: "/app", length: 6, sentAt: Date.now() }, secret), url: `${baseURL}/auth` }]);
    await page.clock.install();
    await page.goto("/auth/code", { waitUntil: "networkidle" });
    // Six one-second ticks, each given a moment to render, so the countdown reads 0:24 like the target.
    for (let i = 0; i < 6; i++) {
      await page.clock.runFor(1000);
      await page.waitForTimeout(50);
    }
    const code = page.getByLabel("6‑digit code");
    await code.click();
    await code.pressSequentially("482");
    await shot(page, `${DIR}/compare/.b-code-${w}.png`, w);
  });
}
