import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { demoAllowed, verificationProvider } from "./provider";

afterEach(() => vi.unstubAllEnvs());

describe("verification provider (D039)", () => {
  it("uses the demo provider off production", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(verificationProvider(false)?.kind).toBe("demo");
  });
  it("uses the demo provider for demo accounts in production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(demoAllowed(true)).toBe(true);
    expect(verificationProvider(true)?.kind).toBe("demo");
  });
  it("has nothing for real people in production until Didit is connected", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("DIDIT_API_KEY", "");
    expect(verificationProvider(false)).toBeNull();
  });
});
