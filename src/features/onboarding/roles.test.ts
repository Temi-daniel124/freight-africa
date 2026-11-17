import { afterEach, describe, expect, it, vi } from "vitest";
import { agentsEnabled, parseJoiningAs } from "./roles";

afterEach(() => vi.unstubAllEnvs());

describe("what you're joining as", () => {
  it("accepts only the three choices", () => {
    expect(parseJoiningAs("shipper")).toBe("shipper");
    expect(parseJoiningAs("owner")).toBe("owner");
    expect(parseJoiningAs("agent")).toBe("agent");
    expect(parseJoiningAs("driver")).toBeNull();
    expect(parseJoiningAs("staff")).toBeNull();
    expect(parseJoiningAs(undefined)).toBeNull();
  });

  it("offers agents unless they are switched off", () => {
    expect(agentsEnabled()).toBe(true);
    vi.stubEnv("AGENTS_ENABLED", "off");
    expect(agentsEnabled()).toBe(false);
  });
});
