// Not part of the regular suite: the approved Gate 4 target next to the build, same width (375 and 1440
// only, DEVELOPMENT-WORKFLOW 1A). Then: python scripts/compare-side-by-side.py <compare dir>
import { pathToFileURL } from "node:url";
import { test } from "@playwright/test";

const DIR = "docs/design/targets/gate-4";
const pairs = [
  { name: "home", target: "app.html", build: "/dev/home" },
  { name: "components", target: "components.html", build: "/dev/components" },
];
for (const w of [375, 1440]) {
  for (const { name, target, build } of pairs) {
    test(`${name} ${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: name === "home" ? (w < 1024 ? 844 : 900) : 900 });
      await page.goto(pathToFileURL(`${DIR}/${target}`).href);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${DIR}/compare/.t-${name}-${w}.png`, fullPage: true });
      await page.goto(build, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      // The build's input autofocuses; the target draws its focused field statically.
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${DIR}/compare/.b-${name}-${w}.png`, fullPage: true });
    });
  }
}

// The first-visit Home and each other shell, build only (the target draws them on the component sheet).
for (const w of [375, 1440]) {
  for (const role of ["new", "owner", "ownerDriver", "driver", "agent", "staff"]) {
    test(`shell ${role} ${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: w < 1024 ? 844 : 900 });
      await page.goto(`/dev/home?role=${role}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${DIR}/compare/shell-${role}-${w}.png` });
    });
  }
}
