#!/usr/bin/env node
// npm run check:layout (founder fix 2i): every screen at 320, 375, 768, 1024, 1280 and 1440 px, signed in
// as the demo accounts (and the long-name business), against a running server. It fails on:
//   - sideways scroll;
//   - text wider than its box without an ellipsis;
//   - a child more than 1 px outside its card;
//   - touch targets under 44 px below 1024 px (an invisible ::before hit area counts);
//   - nav labels that wrap;
//   - from 768 px, a button or text block wider than 560 px, unless it sits in a table, a map or a list row
//     (combined brief §4: on wider screens nothing stretches edge to edge).
// Usage: BASE_URL=http://localhost:3100 node --env-file=.env.founder.local scripts/check-layout.mjs
// The demo PIN comes from the git-ignored .env.founder.local (DEMO_PIN); it is never printed.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const PIN = process.env.DEMO_PIN;
const OUT = process.env.LAYOUT_SHOTS ?? "test-results/layout";
const WIDTHS = [320, 375, 768, 1024, 1280, 1440];
const INBOX = (tag) => `temmydaniel124+fa-${tag}@gmail.com`;

const ACCOUNTS = [
  { login: INBOX("shipper"), pages: ["/app/ship", "/app/ship/trips", "/app/ship/payments", "/app/ship/team", "/app/ship/places", "/app/ship/settings"] },
  { login: INBOX("owner"), pages: ["/app/haul", "/app/haul/trucks", "/app/haul/drivers", "/app/haul/team", "/app/haul/earnings", "/app/haul/settings"] },
  { login: INBOX("very-long-email-address-for-layout-checks"), pages: ["/app/haul", "/app/haul/team", "/app/haul/settings"] },
  { login: INBOX("driver"), pages: ["/app/drive", "/app/drive/me"] },
];
const PUBLIC = ["/auth/welcome", "/auth?mode=signin", "/auth?mode=start", "/invite/not-a-real-invite"];

if (!/^\d{6}$/.test(PIN ?? "")) {
  console.error("DEMO_PIN is needed (node --env-file=.env.founder.local ...).");
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

/** Runs in the page: returns a list of problems. */
function audit(width) {
  const problems = [];
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth + 1) problems.push(`sideways scroll: ${doc.scrollWidth - doc.clientWidth}px`);
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const name = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""} "${(el.textContent ?? "").trim().slice(0, 40)}"`;
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el) || el.closest("[aria-hidden=true], svg, [data-layout-ignore]")) continue;
    const s = getComputedStyle(el);
    // Screen-reader-only text is clipped on purpose.
    if (s.clip !== "auto" && s.clip !== "" || el.closest(".sr-only")) continue;
    const texts = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (!texts.length || el.clientWidth === 0 || s.textOverflow === "ellipsis" || s.overflowX === "auto" || s.overflowX === "scroll") continue;
    const box = el.getBoundingClientRect();
    for (const node of texts) {
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (r.right > box.right + 1 || r.left < box.left - 1) {
        problems.push(`text overflows without an ellipsis: ${name(el)}`);
        break;
      }
    }
  }
  for (const card of document.querySelectorAll(".rounded-card, .rounded-tile")) {
    if (!visible(card)) continue;
    const box = card.getBoundingClientRect();
    for (const child of card.querySelectorAll("*")) {
      if (!visible(child) || child.closest("[popover], [role=dialog]") !== card.closest("[popover], [role=dialog]")) continue;
      const s = getComputedStyle(child);
      if (s.position === "fixed" || s.position === "absolute") continue;
      const r = child.getBoundingClientRect();
      if (r.left < box.left - 1 || r.right > box.right + 1) {
        problems.push(`outside its card by ${Math.round(Math.max(box.left - r.left, r.right - box.right))}px: ${name(child)}`);
        break;
      }
    }
  }
  if (width < 1024) {
    for (const el of document.querySelectorAll("a[href], button, [role=button], [role=switch], [role=tab], input:not([type=hidden]), select")) {
      if (!visible(el) || el.closest("[data-layout-ignore]") || el.matches("input[type=checkbox], input[type=radio]")) continue;
      const r = el.getBoundingClientRect();
      const before = getComputedStyle(el, "::before");
      let w = r.width;
      let h = r.height;
      if (before.position === "absolute" && before.content !== "none") {
        const px = (v) => (v.endsWith("px") ? -Math.min(0, parseFloat(v)) : 0);
        w += px(before.left) + px(before.right);
        h += px(before.top) + px(before.bottom);
      }
      // A link inside running text is not a tap target of its own.
      if (el.tagName === "A" && getComputedStyle(el).display === "inline") continue;
      if (w < 43.5 || h < 43.5) problems.push(`touch target ${Math.round(w)}×${Math.round(h)}: ${name(el)}`);
    }
  }
  if (width >= 768) {
    const wide = "table, [role=table], [role=grid], [role=row], [data-map], .maplibregl-map, [data-list-row], li, [data-layout-wide]";
    for (const el of document.querySelectorAll("button, [role=button], a[href], p, h1, h2, h3, h4, blockquote")) {
      if (!visible(el) || el.closest("[data-layout-ignore]") || el.closest(wide)) continue;
      // Only buttons styled as buttons: a link counts when it is a block (a button-looking link).
      if (el.tagName === "A" && getComputedStyle(el).display.startsWith("inline") && !el.matches("[class*=rounded-button]")) continue;
      const w = el.getBoundingClientRect().width;
      if (w > 560.5) problems.push(`wider than 560 px (${Math.round(w)}px): ${name(el)}`);
    }
  }
  for (const link of document.querySelectorAll("nav a")) {
    if (!visible(link)) continue;
    for (const span of link.querySelectorAll("span, :scope")) {
      const text = [...span.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("").trim();
      if (!text) continue;
      const lh = parseFloat(getComputedStyle(span).lineHeight) || 20;
      const range = document.createRange();
      range.selectNodeContents(span);
      const lines = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top)));
      if (lines.size > 1 || span.getBoundingClientRect().height > lh * 1.6 + 8) problems.push(`nav label wraps: "${text}"`);
    }
  }
  return [...new Set(problems)];
}

async function signIn(page, login) {
  await page.goto(`${BASE}/auth?mode=signin`, { waitUntil: "networkidle" });
  await page.fill("#auth-login", login);
  await page.click("button[type=submit]");
  await page.waitForURL(/\/auth\/pin/, { timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.keyboard.type(PIN, { delay: 60 });
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 60000 });
}

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "chrome" });
// A protected Vercel preview: open its share link first, which sets the access cookie for the context.
async function newContext() {
  const context = await browser.newContext();
  if (process.env.SHARE_URL) {
    const page = await context.newPage();
    await page.goto(process.env.SHARE_URL, { waitUntil: "domcontentloaded" });
    await page.close();
  }
  return context;
}
let failures = 0;
async function check(context, path, tag) {
  for (const width of WIDTHS) {
    const page = await context.newPage();
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(400);
    const problems = await page.evaluate(audit, width);
    const file = `${OUT}/${tag}${path.replace(/[^a-z0-9]+/gi, "_")}-${width}.png`;
    if (problems.length) {
      failures += problems.length;
      await page.screenshot({ path: file, fullPage: true });
      console.log(`✗ ${path} @${width} (${tag})\n    ${problems.slice(0, 12).join("\n    ")}${problems.length > 12 ? `\n    … ${problems.length - 12} more` : ""}`);
    } else {
      console.log(`✓ ${path} @${width} (${tag})`);
    }
    await page.close();
  }
}

{
  const context = await newContext();
  await context.addCookies([{ name: "fa_welcome_seen", value: "1", url: BASE }]);
  for (const path of PUBLIC) await check(context, path, "public");
  await context.close();
}
for (const account of ACCOUNTS) {
  const context = await newContext();
  const page = await context.newPage();
  await signIn(page, account.login);
  await page.close();
  for (const path of account.pages) await check(context, path, account.login.split("+fa-")[1].split("@")[0]);
  await context.close();
}
await browser.close();
console.log(failures ? `\n${failures} layout problems. Screenshots in ${OUT}.` : "\nNo layout problems.");
process.exit(failures ? 1 : 0);
