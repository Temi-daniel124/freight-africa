import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("lets the later Tailwind class win", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("drops false values", () => {
    expect(cn("flex", false && "hidden")).toBe("flex");
  });

  it("keeps a font-size token next to a text colour", () => {
    expect(cn("text-label", "text-ink")).toBe("text-label text-ink");
  });

  it("keeps the field border width next to a border colour", () => {
    expect(cn("border-field", "border-line-strong")).toBe("border-field border-line-strong");
  });

  it("merges two font-size tokens", () => {
    expect(cn("text-label", "text-body")).toBe("text-body");
  });
});
