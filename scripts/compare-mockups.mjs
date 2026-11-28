#!/usr/bin/env node
// npm run check:mockups -- <role> [filter] (closing brief §2: every mockup screen gets a compare image).
// For EVERY file in docs/design/reference/<role>-mockups/screens it screenshots the mockup and the build at
// the mockup's own width (390 phone, 1440 desktop, 794 PDF page; read from the mockup itself) and writes
// docs/acceptance/mockup-compare/<role>/<screen>.png, side by side. The pairs file
// scripts/mockup-pairs/<role>.json says which path shows each screen, in the state the mockup draws
// (?preview= or a /dev sample), signed in as which demo account. A screen without a pair, or whose
// build shows "We can't find that page", is listed as a failure and the script exits 1.
// It also writes docs/acceptance/mockup-compare/<role>/COVERAGE.md. It does not judge looks: a person
// looks at every image.
// Usage: BASE_URL=http://localhost:3017 node --env-file=.env.founder.local scripts/compare-mockups.mjs owner [O1]
// PDF pairs ({"pdf": "/path"}) need PDF_PYTHON pointing at a Python with PyMuPDF (scripts/pdf-to-png.py).
// The demo PIN comes from the git-ignored .env.founder.local (DEMO_PIN); it is never printed.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [role = "sender", filter = ""] = process.argv.slice(2);
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PIN = process.env.DEMO_PIN;
const OUT = process.env.OUT_DIR ?? `docs/acceptance/mockup-compare/${role}`;
const INBOX = (tag) => `temmydaniel124+fa-${tag}@gmail.com`;
const SCREENS = `docs/design/reference/${role}-mockups/screens`;
const NOT_FOUND = /We can.t find that page|This page could not be found|404: This page/;

const pairs = new Map(JSON.parse(readFileSync(`scripts/mockup-pairs/${role}.json`, "utf8")).map((p) => [p.mock, p]));
const screens = readdirSync(SCREENS).filter((f) => f.endsWith(".html")).map((f) => f.replace(/\.html$/, "")).sort();
const chosen = screens.filter((s) => !filter || s.startsWith(filter));
for (const extra of pairs.keys()) if (!screens.includes(extra)) console.warn(`pair for ${extra} has no mockup file`);
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

/** The mockup's own width: phone frames are 390, PDF pages 794, everything else 1440. */
async function mockWidth(url) {
  const page = await (await contextFor(null)).newPage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(url);
  const width = await page.evaluate(() => (document.querySelector(".doc") ? 794 : document.querySelector(".ph, .phone") ? 390 : 1440));
  await page.close();
  return width;
}

async function shot(context, url, width, height, cookies = []) {
  const page = await context.newPage();
  if (cookies.length) await context.addCookies(cookies.map(([name, value]) => ({ name, value, url: BASE })));
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Pages with a live map never go quiet: after 30 s, take the page as loaded.
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => page.waitForLoadState("load"));
  await page.waitForTimeout(url.startsWith("file:") ? 500 : 1500);
  const text = url.startsWith("file:") ? "" : await page.evaluate(() => document.body?.innerText ?? "");
  const png = await page.screenshot({ fullPage: true });
  await page.close();
  return { png: png.toString("base64"), missing: NOT_FOUND.test(text) };
}

async function pdfShot(context, path) {
  const res = await context.request.get(`${BASE}${path}`);
  if (!res.ok() || !(res.headers()["content-type"] ?? "").includes("pdf")) return { png: "", missing: true };
  const dir = join(tmpdir(), `fa-pdf-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "doc.pdf");
  writeFileSync(file, await res.body());
  execFileSync(process.env.PDF_PYTHON ?? "python", ["scripts/pdf-to-png.py", file, join(dir, "doc.png"), "794"]);
  const png = readFileSync(join(dir, "doc.png")).toString("base64");
  rmSync(dir, { recursive: true, force: true });
  return { png, missing: false };
}

const composer = await browser.newPage();
const rows = [];
let failures = 0;
for (const mock of chosen) {
  const pair = pairs.get(mock);
  const mockUrl = pathToFileURL(resolve(`${SCREENS}/${mock}.html`)).href;
  const width = pair?.width ?? (await mockWidth(mockUrl));
  const height = width > 600 && width !== 794 ? 900 : 844;
  if (!pair || (!pair.path && !pair.pdf)) {
    rows.push([mock, "", "NO PAIR"]);
    failures++;
    console.log(`${mock}: no pair`);
    continue;
  }
  const m = await shot(await contextFor(null), mockUrl, width, height);
  const context = await contextFor(pair.account);
  const b = pair.pdf ? await pdfShot(context, pair.pdf) : await shot(context, `${BASE}${pair.path}`, width, height, pair.cookies);
  const where = pair.pdf ?? pair.path;
  await composer.setViewportSize({ width: width * 2 + 24, height: 400 });
  await composer.setContent(
    `<body style="margin:0;background:#d9dfda;font:600 14px system-ui;display:flex;gap:24px;align-items:flex-start">
      <figure style="margin:0"><figcaption style="padding:8px">MOCKUP ${mock}</figcaption><img src="data:image/png;base64,${m.png}"></figure>
      <figure style="margin:0"><figcaption style="padding:8px">BUILD ${where.replace(/&/g, "&amp;")}${pair.account ? ` (as ${pair.account})` : ""}</figcaption>${b.png ? `<img src="data:image/png;base64,${b.png}" style="width:${width}px">` : "<p style='padding:8px'>no PDF</p>"}</figure>
    </body>`,
  );
  await composer.screenshot({ path: `${OUT}/${mock}.png`, fullPage: true });
  const status = b.missing ? "PAGE NOT FOUND" : (pair.status ?? "built");
  if (b.missing) failures++;
  rows.push([mock, where, status, pair.note ?? ""]);
  console.log(`${mock} @${width} ${status} → ${OUT}/${mock}.png`);
}
await browser.close();

if (!filter) {
  const done = rows.filter((r) => !/NO PAIR|NOT FOUND/.test(r[2])).length;
  writeFileSync(
    `${OUT}/COVERAGE.md`,
    `# ${role}: ${done} of ${screens.length} screens compared\n\nMade by \`npm run check:mockups -- ${role}\` against ${BASE.includes("localhost") ? "a local server on main" : BASE}. Status: built (the screen at its route or /dev preview), later (UI built, backend in a later phase, /dev only, see DIFFERENCES.md).\n\n| Screen | Build | Status | Note |\n| --- | --- | --- | --- |\n${rows.map((r) => `| ${r[0]} | \`${r[1]}\` | ${r[2]} | ${r[3] ?? ""} |`).join("\n")}\n`,
  );
}
console.log(`${rows.length - failures} of ${rows.length} compared; ${failures} failing`);
process.exit(failures ? 1 : 0);
