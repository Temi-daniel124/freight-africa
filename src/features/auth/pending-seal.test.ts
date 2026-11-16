import { describe, expect, it } from "vitest";
import { openPending, sealPending, type PendingCode } from "./pending-seal";

const secret = "test-secret-test-secret-test-secret-0123";
const pending: PendingCode = { channel: "email", to: "ngozi.okafor@example.com", next: "/app/ship", length: 6 };

const forge = (data: unknown) => {
  const [, signature] = sealPending(pending, secret).split(".");
  return `${Buffer.from(JSON.stringify(data)).toString("base64url")}.${signature}`;
};

describe("pending code cookie", () => {
  it("round-trips what the server sealed", () => {
    expect(openPending(sealPending(pending, secret), secret)).toEqual(pending);
  });

  it("refuses a value the server didn't sign", () => {
    expect(openPending(undefined, secret)).toBeNull();
    expect(openPending("", secret)).toBeNull();
    expect(openPending(JSON.stringify(pending), secret)).toBeNull();
    expect(openPending(sealPending(pending, "another-secret-another-secret-012345"), secret)).toBeNull();
    expect(openPending(`${sealPending(pending, secret)}.extra`, secret)).toBeNull();
  });

  it("refuses changed details carrying an old signature", () => {
    // Pointing the check at someone else, or respelling the address to reset the count of wrong tries.
    expect(openPending(forge({ ...pending, to: "victim@example.com" }), secret)).toBeNull();
    expect(openPending(forge({ ...pending, to: "Ngozi.Okafor@example.com" }), secret)).toBeNull();
    expect(openPending(forge({ ...pending, next: "//evil.example" }), secret)).toBeNull();
  });

  it("rejects an address that isn't in its normal form, even when signed", () => {
    expect(openPending(sealPending({ ...pending, to: "Ngozi.Okafor@Example.com" }, secret), secret)).toBeNull();
    expect(openPending(sealPending({ channel: "whatsapp", to: "08031234567", next: "/app", length: 6 }, secret), secret)).toBeNull();
    expect(openPending(sealPending({ channel: "whatsapp", to: "+2348031234567", next: "/app", length: 6 }, secret), secret)?.to).toBe("+2348031234567");
  });

  it("re-checks the return path and the code length", () => {
    expect(openPending(sealPending({ ...pending, next: "/a/..//evil.example" }, secret), secret)?.next).toBe("/app");
    expect(openPending(sealPending({ ...pending, length: 99 }, secret), secret)?.length).toBe(6);
  });
});
