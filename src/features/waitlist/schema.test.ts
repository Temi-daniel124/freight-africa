import { describe, expect, it } from "vitest";
import { checkTrucks, waitlistSchema, type WaitlistInput } from "./schema";

const base: WaitlistInput = {
  name: "  Ngozi Okafor ",
  phone: "0803 123 4567",
  email: "",
  role: "shipper",
  corridors: ["lagos-kano"],
  consent: "on",
};

const fieldErrors = (input: WaitlistInput) => {
  const result = waitlistSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((issue) => issue.message);
};

describe("waitlistSchema", () => {
  it("normalises a sender's details", () => {
    expect(waitlistSchema.parse(base)).toEqual({
      name: "Ngozi Okafor",
      phone: "+2348031234567",
      email: null,
      role: "shipper",
      corridors: ["lagos-kano"],
      trucks: null,
      consent: "on",
      source: "website",
    });
  });

  it("lower-cases the email", () => {
    expect(waitlistSchema.parse({ ...base, email: " Ngozi@Example.COM " }).email).toBe("ngozi@example.com");
  });

  it("needs a number of trucks from an owner", () => {
    expect(fieldErrors({ ...base, role: "owner", trucks: "" })).toEqual(["trucks"]);
    expect(fieldErrors({ ...base, role: "owner", trucks: "1001" })).toEqual(["trucks"]);
    expect(waitlistSchema.parse({ ...base, role: "owner", trucks: "12" }).trucks).toBe(12);
  });

  it("checks trucks on their own, so the error shows with the others", () => {
    expect(checkTrucks("owner", "")).toBe("invalid");
    expect(checkTrucks("owner", "2.5")).toBe("invalid");
    expect(checkTrucks("owner", " 40 ")).toBe(40);
    expect(checkTrucks("shipper", "")).toBeNull();
  });

  it("ignores a number of trucks from a sender", () => {
    expect(waitlistSchema.parse({ ...base, trucks: "4" }).trucks).toBeNull();
  });

  it("reports each bad field", () => {
    expect(fieldErrors({ ...base, name: "N", phone: "12345", email: "ngozi@", consent: undefined as unknown as "on" }).sort()).toEqual(
      ["consent", "email", "name", "phone"],
    );
  });

  it("refuses an unknown corridor or role", () => {
    expect(waitlistSchema.safeParse({ ...base, corridors: ["lagos-accra" as "lagos-kano"] }).success).toBe(false);
    expect(fieldErrors({ ...base, role: "driver" as "shipper" })).toEqual(["role"]);
  });

  it("drops a malformed source instead of failing", () => {
    expect(waitlistSchema.parse({ ...base, source: "<script>" }).source).toBe("website");
    expect(waitlistSchema.parse({ ...base, source: "whatsapp" }).source).toBe("whatsapp");
  });
});
