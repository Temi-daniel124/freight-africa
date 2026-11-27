import { afterEach, describe, expect, it, vi } from "vitest";
import { goToCheckout } from "./go";

describe("goToCheckout (D048 review)", () => {
  const assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });
  afterEach(() => assign.mockClear());

  it("opens our own pages and https checkouts", () => {
    goToCheckout("/app/pay/demo/demo-co-1?back=%2Fapp");
    goToCheckout("https://checkout.bachs.example/pay/123");
    expect(assign).toHaveBeenCalledTimes(2);
  });

  it("never opens another host through a protocol-relative path or another scheme", () => {
    for (const url of ["//evil.example/pay", "/\evil.example", "http://evil.example", "javascript:alert(1)", "https:///x"]) goToCheckout(url);
    expect(assign).not.toHaveBeenCalled();
  });
});
