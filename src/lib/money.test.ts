import { describe, expect, it } from "vitest";
import { formatNaira } from "./money";

describe("formatNaira", () => {
  it.each([
    [1030000, "₦1,030,000"],
    [80000, "₦80,000"],
    [0, "₦0"],
  ])("shows %d as %s", (value, expected) => {
    expect(formatNaira(value)).toBe(expected);
  });
});
