import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("lets the later Tailwind class win", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("drops false values", () => {
    expect(cn("flex", false && "hidden")).toBe("flex");
  });
});
