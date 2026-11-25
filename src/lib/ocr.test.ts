import { describe, expect, it } from "vitest";
import { findExpiry, findPlate } from "./ocr";

describe("reading a plate from a photo", () => {
  it("finds Nigerian plates in the usual shapes", () => {
    expect(findPlate("LAGOS\nLSR 305 GH\nCENTRE OF EXCELLENCE")).toBe("LSR305GH");
    expect(findPlate("kja-482-xa")).toBe("KJA482XA");
    expect(findPlate("ABJ 77 KD")).toBe("ABJ77KD");
  });
  it("fixes O and 0, I and 1 where the shape says which", () => {
    expect(findPlate("KAN 2I9 BT")).toBe("KAN219BT");
    expect(findPlate("EKY 1O8 T7")).toBeNull();
    expect(findPlate("APP 640 Q0")).toBe("APP640QO");
  });
  it("says nothing when there is no plate", () => {
    expect(findPlate("Federal Republic of Nigeria")).toBeNull();
  });
});

describe("reading an expiry date from a paper", () => {
  it("prefers the date by Expiry", () => {
    expect(findExpiry("Date of issue 12/03/2026\nExpiry date: 11/03/2027")).toBe("2027-03-11");
    expect(findExpiry("VALID UNTIL 30 SEPT 2027 issued 01 OCT 2026")).toBe("2027-09-30");
  });
  it("otherwise takes the latest date", () => {
    expect(findExpiry("01-02-2026 ... 31-01-2027")).toBe("2027-01-31");
  });
  it("ignores impossible dates", () => {
    expect(findExpiry("Expires 31/02/2027")).toBeNull();
  });
});
