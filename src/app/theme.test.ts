import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// DESIGN_SYSTEM.md section 5: the four breakpoints every screen is drawn for. Tailwind's own list is
// cleared (`--breakpoint-*: initial`), so a missing one would silently make `md:` classes do nothing.
const css = readFileSync(join(__dirname, "globals.css"), "utf8");
const theme = css.slice(css.indexOf("@theme {"), css.indexOf("@theme inline"));

function token(name: string) {
  return theme.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim();
}

describe("theme breakpoints", () => {
  it.each([
    ["sm", "37.5rem"],
    ["md", "48rem"],
    ["lg", "64rem"],
    ["xl", "90rem"],
  ])("defines %s as %s", (name, value) => {
    expect(token(`breakpoint-${name}`)).toBe(value);
  });
});

describe("theme weights (mockups: 500 and 600 for headings and emphasis)", () => {
  it("has no type token heavier than 600", () => {
    const weights = [...css.matchAll(/font-weight:\s*(\d+)/g)].map((m) => Number(m[1]));
    expect(weights.length).toBeGreaterThan(0);
    expect(Math.max(...weights)).toBeLessThanOrEqual(600);
  });
});

describe("theme colours (mockup fa.css)", () => {
  it.each([
    ["paper", "#f5f5f1"],
    ["green-900", "#083826"],
    ["green-700", "#0c5034"],
    ["line", "#e6e8e3"],
  ])("%s is %s", (name, value) => {
    expect(token(`color-${name}`)).toBe(value);
  });
});
