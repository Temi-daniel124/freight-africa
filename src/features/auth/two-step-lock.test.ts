import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// The database answers, as the migration 20261125190000 gives them.
const db = { allowed: true as boolean, justLocked: false as boolean, calls: [] as string[] };
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: () => ({
    rpc: async (name: string) => {
      db.calls.push(name);
      if (name === "fresh_try") return { data: db.allowed, error: null };
      if (name === "fresh_wrong") return { data: db.justLocked, error: null };
      return { data: null, error: null };
    },
  }),
}));
const sent: string[] = [];
vi.mock("./pin-session", () => ({
  sendSecurityEmail: async (_user: string, _email: string, kind: string) => {
    sent.push(kind);
  },
}));

import { securityEmail } from "./security-email";
import { checkAuthenticatorCode, isWrongCode } from "./two-step-lock";

const USER = "24242424-0000-4000-8000-000000000001";
const ok = async () => ({ error: null });
const wrong = async () => ({ error: { status: 422, code: "mfa_verification_failed" } });
const down = async () => ({ error: { status: 503, code: "unexpected_failure" } });

beforeEach(() => {
  db.allowed = true;
  db.justLocked = false;
  db.calls = [];
  sent.length = 0;
});

describe("authenticator lock (admin X00j)", () => {
  it("counts the try before the code is checked", async () => {
    const verify = vi.fn(ok);
    expect(await checkAuthenticatorCode(USER, "kemi@freight-africa.com", verify)).toBe("ok");
    expect(db.calls).toEqual(["fresh_try"]);
    expect(verify).toHaveBeenCalledOnce();
  });

  it("never checks a code while locked", async () => {
    db.allowed = false;
    const verify = vi.fn(ok);
    expect(await checkAuthenticatorCode(USER, "kemi@freight-africa.com", verify)).toBe("locked");
    expect(verify).not.toHaveBeenCalled();
    expect(sent).toEqual([]);
  });

  it("a wrong code is wrong until the fifth, which locks it and sends the alert once", async () => {
    expect(await checkAuthenticatorCode(USER, "kemi@freight-africa.com", wrong)).toBe("wrong");
    expect(sent).toEqual([]);
    db.justLocked = true;
    expect(await checkAuthenticatorCode(USER, "kemi@freight-africa.com", wrong)).toBe("locked");
    expect(sent).toEqual(["twoStepLocked"]);
  });

  it("gives the try back when the auth service fails (the code was never checked)", async () => {
    expect(await checkAuthenticatorCode(USER, "kemi@freight-africa.com", down)).toBe("error");
    expect(db.calls).toEqual(["fresh_try", "fresh_refund"]);
  });

  it("tells a wrong code from a failure", () => {
    expect(isWrongCode({ status: 422 })).toBe(true);
    expect(isWrongCode({ code: "mfa_verification_failed" })).toBe(true);
    expect(isWrongCode({ status: 500 })).toBe(false);
    expect(isWrongCode(null)).toBe(false);
  });

  it("the alert says what happened and carries the lock link", () => {
    const email = securityEmail("twoStepLocked", "kemi@freight-africa.com", "Chrome on Windows", "Lagos", "https://admin.freight-africa.com/auth/lock?t=abc");
    expect(email.subject).toBe("Two-step sign-in is locked on your account");
    expect(email.text).toContain("5 wrong authenticator codes in a row");
    expect(email.text).toContain("https://admin.freight-africa.com/auth/lock?t=abc");
    expect(email.html).toContain("Lock your account");
  });
});
