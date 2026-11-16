import { describe, expect, it } from "vitest";
import { DEFAULT_NEXT, safeNext } from "./next-path";

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/app/ship/trips/42")).toBe("/app/ship/trips/42");
    expect(safeNext("/invite/abc?x=1")).toBe("/invite/abc?x=1");
  });

  it("falls back to /app for anything that could leave the site", () => {
    for (const value of [undefined, null, "", "app", "https://evil.example", "//evil.example", "/\\evil.example", "/\u0000x"]) {
      expect(safeNext(value)).toBe(DEFAULT_NEXT);
    }
  });

  it("never returns to the sign-in pages", () => {
    expect(safeNext("/auth")).toBe(DEFAULT_NEXT);
    expect(safeNext("/auth/code")).toBe(DEFAULT_NEXT);
  });
});
