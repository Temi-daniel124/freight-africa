import { describe, expect, it } from "vitest";
import { accountHref, accountLabel } from "./accounts";
import { parseContact } from "./contact";

describe("parseContact", () => {
  it("reads a Nigerian mobile number in any usual form", () => {
    expect(parseContact("0803 123 4567")).toEqual({ phone: "+2348031234567" });
    expect(parseContact("+234 803 123 4567")).toEqual({ phone: "+2348031234567" });
  });
  it("reads an email in lower case", () => {
    expect(parseContact(" Ada@Example.COM ")).toEqual({ email: "ada@example.com" });
  });
  it("refuses anything else", () => {
    expect(parseContact("")).toBeNull();
    expect(parseContact("12345")).toBeNull();
    expect(parseContact("ada@example")).toBeNull();
  });
});

describe("account labels and shells (A-09)", () => {
  it("names each account the way the switcher shows it", () => {
    expect(accountLabel({ kind: "shipper", role: "owner", is_driver: false })).toBe("Sender");
    expect(accountLabel({ kind: "shipper", role: "admin", is_driver: false })).toBe("Sender · Admin");
    expect(accountLabel({ kind: "transporter", role: "owner", is_driver: true })).toBe("Truck owner who drives");
    expect(accountLabel({ kind: "transporter", role: "manager", is_driver: false })).toBe("Truck owner · Manager");
    expect(accountLabel({ kind: "transporter", role: "driver", is_driver: true })).toBe("Driver");
  });
  it("opens the right shell", () => {
    expect(accountHref({ kind: "shipper", role: "viewer" })).toBe("/app/ship");
    expect(accountHref({ kind: "transporter", role: "manager" })).toBe("/app/haul");
    expect(accountHref({ kind: "transporter", role: "driver" })).toBe("/app/drive");
  });
});
