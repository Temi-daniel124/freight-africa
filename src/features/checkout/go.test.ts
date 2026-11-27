import { describe, expect, it } from "vitest";
import { safeCheckoutUrl } from "./go";

describe("safeCheckoutUrl (D048 review)", () => {
  it("allows our own pages and https checkouts", () => {
    expect(safeCheckoutUrl("/app/pay/demo/demo-co-1?back=%2Fapp")).toBe(true);
    expect(safeCheckoutUrl("https://checkout.bachs.example/pay/123")).toBe(true);
  });

  it("refuses protocol-relative paths and other schemes", () => {
    for (const url of ["//evil.example/pay", "/\\evil.example", "http://evil.example", "javascript:alert(1)", "https:///x"]) expect(safeCheckoutUrl(url)).toBe(false);
  });
});
