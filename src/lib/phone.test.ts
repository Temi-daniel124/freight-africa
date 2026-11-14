import { describe, expect, it } from "vitest";
import { formatNigerianPhone, normaliseNigerianPhone } from "./phone";

describe("formatNigerianPhone", () => {
  it("drops the leading zero and groups the digits", () => {
    expect(formatNigerianPhone("08031234567")).toBe("803 123 4567");
  });

  it("formats part of a number as it is typed", () => {
    expect(formatNigerianPhone("8031")).toBe("803 1");
  });
});

describe("normaliseNigerianPhone", () => {
  it.each(["08031234567", "8031234567", "+234 803 123 4567", "2348031234567"])("reads %s", (input) => {
    expect(normaliseNigerianPhone(input)).toBe("+2348031234567");
  });

  it.each(["0803123456", "080312345678", "01234567890", "hello"])("refuses %s", (input) => {
    expect(normaliseNigerianPhone(input)).toBeNull();
  });
});
