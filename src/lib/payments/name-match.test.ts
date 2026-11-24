import { describe, expect, it } from "vitest";
import { nameMatchScore } from "./name-match";

describe("nameMatchScore", () => {
  it("matches the same person in another order with a business suffix", () => {
    expect(nameMatchScore("MUSA IBRAHIM TRANSPORT ENT", ["Ibrahim Musa"])).toBe(100);
  });
  it("matches the business name", () => {
    expect(nameMatchScore("MUSA HAULAGE LIMITED", ["Ibrahim Musa", "Musa Haulage Ltd"])).toBe(100);
  });
  it("scores a stranger low", () => {
    expect(nameMatchScore("CHUKWUDI OBI", ["Ibrahim Musa"])).toBe(0);
  });
  it("gives partial credit for a missing word", () => {
    expect(nameMatchScore("IBRAHIM ALIYU", ["Ibrahim Musa"])).toBe(50);
  });
});
