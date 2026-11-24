import { afterEach, describe, expect, it, vi } from "vitest";
import { agentsEnabled, parseJoiningAs } from "./roles";

afterEach(() => vi.unstubAllEnvs());

describe("what you're joining as", () => {
  it("accepts only the two sign-up choices (D043)", () => {
    expect(parseJoiningAs("shipper")).toBe("shipper");
    expect(parseJoiningAs("owner")).toBe("owner");
    expect(parseJoiningAs("agent")).toBeNull();
    expect(parseJoiningAs("owner_driver")).toBeNull();
    expect(parseJoiningAs("driver")).toBeNull();
    expect(parseJoiningAs("staff")).toBeNull();
    expect(parseJoiningAs(undefined)).toBeNull();
  });

  it("keeps the agents master switch", () => {
    expect(agentsEnabled()).toBe(true);
    vi.stubEnv("AGENTS_ENABLED", "off");
    expect(agentsEnabled()).toBe(false);
  });
});
