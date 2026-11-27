#!/usr/bin/env node
// npm run compare:mockups -- <set> [filter] (combined brief: open the mockup next to the build before merging).
// Screenshots each approved mockup (docs/design/reference/<set>-mockups/screens) and the screen that
// implements it, at the mockup's width (390 phone, 1440 desktop), and writes one side-by-side image per
// pair to test-results/mockups/<set>/. It does not judge: a person looks at every pair.
// Usage: BASE_URL=https://<preview> SHARE_URL=<share link> node --env-file=.env.founder.local scripts/compare-mockups.mjs sender P0
// The demo PIN comes from the git-ignored .env.founder.local (DEMO_PIN); it is never printed.
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [set = "sender", filter = ""] = process.argv.slice(2);
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PIN = process.env.DEMO_PIN;
const OUT = `test-results/mockups/${set}`;
const INBOX = (tag) => `temmydaniel124+fa-${tag}@gmail.com`;
const pairs = JSON.parse(readFileSync(`scripts/mockup-pairs/${set}.json`, "utf8")).filter(
  (p) => p.path && (!filter || p.mock.startsWith(filter)),
);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
const contexts = new Map();

async function signIn(page, login) {
  await page.goto(`${BASE}/auth?mode=signin`, { waitUntil: "networkidle" });
  await page.fill("#auth-login", login);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/auth\/pin/, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.keyboard.type(PIN, { delay: 60 });
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 60000 });
}

async function contextFor(account) {
  const key = account ?? "public";
  if (contexts.has(key)) return contexts.get(key);
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  if (process.env.SHARE_URL) {
    const page = await context.newPage();
    await page.goto(process.env.SHARE_URL, { waitUntil: "domcontentloaded" });
    await page.close();
  }
  if (account) {
    if (!/^\d{6}$/.test(PIN ?? "")) throw new Error("DEMO_PIN is needed (node --env-file=.env.founder.local ...).");
    const page = await context.newPage();
    await signIn(page, INBOX(account));
    await page.close();
  }
  contexts.set(key, context);
  return context;
}

async function shot(context, url, width, height, cookies = []) {
  const page = await context.newPage();
  if (cookies.length) await context.addCookies(cookies.map(([name, value]) => ({ name, value, url: BASE })));
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForTimeout(600);
  const png = await page.screenshot({ fullPage: true });
  await page.close();
  return png.toString("base64");
}

const composer = await browser.newPage();
for (const pair of pairs) {
  const width = pair.width ?? (pair.mock.startsWith("D") ? 1440 : 390);
  const height = width > 600 ? 900 : 844;
  const mockUrl = pathToFileURL(resolve(`docs/design/reference/${set}-mockups/screens/${pair.mock}.html`)).href;
  const mock = await shot(await contextFor(null), mockUrl, width, height);
  const build = await shot(await contextFor(pair.account), `${BASE}${pair.path}`, width, height, pair.cookies);
  await composer.setViewportSize({ width: width * 2 + 24, height: 400 });
  await composer.setContent(
    `<body style="margin:0;background:#d9dfda;font:600 14px system-ui;display:flex;gap:24px;align-items:flex-start">
      <figure style="margin:0"><figcaption style="padding:8px">MOCKUP ${pair.mock}</figcaption><img src="data:image/png;base64,${mock}"></figure>
      <figure style="margin:0"><figcaption style="padding:8px">BUILD ${pair.path}</figcaption><img src="data:image/png;base64,${build}"></figure>
    </body>`,
  );
  await composer.screenshot({ path: `${OUT}/${pair.mock}-${width}.png`, fullPage: true });
  console.log(`${pair.mock} @${width} → ${OUT}/${pair.mock}-${width}.png`);
}
await browser.close();
