#!/usr/bin/env node
// Signs in as a demo account and saves what a path returns (PDFs, JSON), for checking a preview.
// Usage: BASE_URL=https://<preview> SHARE_URL=<share link> node --env-file=.env.founder.local scripts/fetch-as.mjs shipper /app/ship/statements/2026-11/pdf out.pdf
// The demo PIN comes from the git-ignored .env.founder.local (DEMO_PIN); it is never printed.
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";

const [account, path, out = "test-results/fetched.bin"] = process.argv.slice(2);
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PIN = process.env.DEMO_PIN;
if (!account || !path || !/^\d{6}$/.test(PIN ?? "")) throw new Error("account, path and DEMO_PIN are needed");

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
const context = await browser.newContext();
const page = await context.newPage();
if (process.env.SHARE_URL) await page.goto(process.env.SHARE_URL, { waitUntil: "domcontentloaded" });
await page.goto(`${BASE}/auth?mode=signin`, { waitUntil: "networkidle" });
await page.fill("#auth-login", `temmydaniel124+fa-${account}@gmail.com`);
await page.click("button[type=submit]");
await page.waitForURL(/\/auth\/pin/, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.keyboard.type(PIN, { delay: 60 });
await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 60000 });
const response = await context.request.get(`${BASE}${path}`);
writeFileSync(out, await response.body());
console.log(response.status(), response.headers()["content-type"], "→", out);
await browser.close();
