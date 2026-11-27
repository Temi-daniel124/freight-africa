#!/usr/bin/env node
// Screenshots mockup files alone: node scripts/shot-mockup.mjs <set> <name>[,<name>...] [width]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const [set, names, w] = process.argv.slice(2);
const out = `test-results/mockups/${set}/alone`;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
const page = await browser.newPage();
for (const name of names.split(",")) {
  const width = Number(w ?? (name.startsWith("D") ? 1440 : 390));
  await page.setViewportSize({ width, height: width > 600 ? 900 : 844 });
  await page.goto(pathToFileURL(resolve(`docs/design/reference/${set}-mockups/screens/${name}.html`)).href, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  console.log(`${out}/${name}.png`);
}
await browser.close();
