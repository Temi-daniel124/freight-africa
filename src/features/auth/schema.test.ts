import { describe, expect, it } from "vitest";
import { parseCode, parseDestination, parseEmail } from "./schema";

describe("parseEmail", () => {
  it("trims and lower-cases", () => {
    expect(parseEmail("  Ngozi.Okafor@Example.com ")).toBe("ngozi.okafor@example.com");
  });
  it("refuses what isn't an email", () => {
    expect(parseEmail("ngozi")).toBeNull();
    expect(parseEmail("ngozi@")).toBeNull();
    expect(parseEmail(`${"a".repeat(250)}@x.com`)).toBeNull();
  });
});

describe("parseDestination", () => {
  it("normalises a Nigerian mobile for WhatsApp", () => {
    expect(parseDestination("whatsapp", "0803 123 4567")).toBe("+2348031234567");
    expect(parseDestination("whatsapp", "0123 456 789")).toBeNull();
  });
});

describe("parseCode", () => {
  it("accepts six digits however they were pasted", () => {
    expect(parseCode("482916")).toBe("482916");
    expect(parseCode("482 916")).toBe("482916");
    expect(parseCode("482-916")).toBe("482916");
  });
  it("refuses anything else", () => {
    expect(parseCode("48291")).toBeNull();
    expect(parseCode("4829167")).toBeNull();
    expect(parseCode("abcdef")).toBeNull();
  });
  it("follows the length the project sends", () => {
    expect(parseCode("4829 1673", 8)).toBe("48291673");
    expect(parseCode("482916", 8)).toBeNull();
  });
});
