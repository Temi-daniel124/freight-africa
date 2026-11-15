import { describe, expect, it } from "vitest";
import { needsSession } from "./session";

describe("needsSession", () => {
  it("covers the signed-in areas", () => {
    for (const path of ["/app", "/app/ship", "/admin", "/admin/staff", "/auth", "/auth/code"]) {
      expect(needsSession(path)).toBe(true);
    }
  });

  it("leaves the public launch pages alone", () => {
    for (const path of ["/", "/waitlist", "/legal/privacy", "/apps", "/administrator", "/authors"]) {
      expect(needsSession(path)).toBe(false);
    }
  });
});
