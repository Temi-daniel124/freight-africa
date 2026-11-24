import { describe, expect, it } from "vitest";
import { formatPlate } from "./plate";

describe("formatPlate", () => {
  it("spaces a Nigerian plate", () => expect(formatPlate("LSR123XY")).toBe("LSR 123 XY"));
  it("leaves other shapes alone", () => expect(formatPlate("ABC1234")).toBe("ABC1234"));
});
