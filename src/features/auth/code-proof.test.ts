import { describe, expect, it } from "vitest";
import { codeProof, codeProofValid } from "./code-proof";

const secret = "test-secret";

describe("code proof (review of #85: /auth/done needs a just-confirmed code)", () => {
  it("is valid for the same person and session", () => {
    expect(codeProofValid(codeProof("u1", "s1", secret), "u1", "s1", secret)).toBe(true);
  });

  it("is refused when missing, for another session or person, tampered, or under another secret", () => {
    const proof = codeProof("u1", "s1", secret);
    expect(codeProofValid(undefined, "u1", "s1", secret)).toBe(false);
    expect(codeProofValid(proof, "u1", "s2", secret)).toBe(false);
    expect(codeProofValid(proof, "u2", "s1", secret)).toBe(false);
    expect(codeProofValid(`${proof}0`, "u1", "s1", secret)).toBe(false);
    expect(codeProofValid(proof, "u1", "s1", "other-secret")).toBe(false);
  });

  it("expires after 10 minutes", () => {
    const now = Date.now();
    const proof = codeProof("u1", "s1", secret, now);
    expect(codeProofValid(proof, "u1", "s1", secret, now + 9 * 60_000)).toBe(true);
    expect(codeProofValid(proof, "u1", "s1", secret, now + 11 * 60_000)).toBe(false);
  });
});
