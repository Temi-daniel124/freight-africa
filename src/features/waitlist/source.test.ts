import { describe, expect, it } from "vitest";
import { cleanSource } from "./source";

describe("cleanSource", () => {
  it("keeps a plain link name, lower-cased", () => {
    expect(cleanSource("whatsapp")).toBe("whatsapp");
    expect(cleanSource(" Instagram ")).toBe("instagram");
    expect(cleanSource("qr-print.v1")).toBe("qr-print.v1");
  });

  it("drops anything that isn't a plain name", () => {
    expect(cleanSource(undefined)).toBeUndefined();
    expect(cleanSource("")).toBeUndefined();
    expect(cleanSource("<script>")).toBeUndefined();
    expect(cleanSource("a b")).toBeUndefined();
    expect(cleanSource("x".repeat(65))).toBeUndefined();
  });
});
