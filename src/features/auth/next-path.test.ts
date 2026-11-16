import { describe, expect, it } from "vitest";
import { DEFAULT_NEXT, safeNext } from "./next-path";

describe("safeNext", () => {
  it("keeps paths on this site", () => {
    expect(safeNext("/app/ship/trips/42")).toBe("/app/ship/trips/42");
    expect(safeNext("/invite/abc?x=1")).toBe("/invite/abc?x=1");
    expect(safeNext("/app/../app/haul")).toBe("/app/haul");
  });

  it("falls back to /app for anything that could leave the site", () => {
    for (const value of [undefined, null, "", "app", "https://evil.example", "//evil.example", "/\\evil.example", "/\u0000x", "javascript:alert(1)"]) {
      expect(safeNext(value)).toBe(DEFAULT_NEXT);
    }
  });

  it("checks the path the browser will actually read, after dot segments are removed", () => {
    for (const value of ["/a/..//evil.example", "/..//evil.example/x", "/a/b/../..//evil.example", "/.//evil.example", "/a/..\\/evil.example", "/x/%2e%2e//evil.example"]) {
      const result = safeNext(value);
      expect(result.startsWith("//")).toBe(false);
      expect(result.includes("\\")).toBe(false);
      expect(new URL(result, "https://freight-africa.com").origin).toBe("https://freight-africa.com");
    }
    expect(safeNext("/a/..//evil.example")).toBe(DEFAULT_NEXT);
  });

  it("never returns to the sign-in pages", () => {
    expect(safeNext("/auth")).toBe(DEFAULT_NEXT);
    expect(safeNext("/auth/code")).toBe(DEFAULT_NEXT);
    expect(safeNext("/x/../auth/code")).toBe(DEFAULT_NEXT);
  });
});
