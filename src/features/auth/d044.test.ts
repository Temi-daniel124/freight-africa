import { describe, expect, it, vi } from "vitest";
import { deviceLabel } from "./device-label";
import { lockLinkToken, readLockLinkToken } from "./lock-link";
import { parseLogin } from "./login-name";
import { internalEmailFor, isInternalEmail, realEmail } from "./phone-account";
import { pinIsWeak } from "./pin-rules";
import { readUnlockToken, unlockToken, unlockTokenValid } from "./unlock-token";

vi.stubEnv("CODE_HMAC_SECRET", "test-secret-for-d044-unit-tests");

const USER = "18181818-0000-4000-8000-000000000001";

describe("obvious PINs are refused (D044)", () => {
  it.each(["000000", "111111", "123456", "234567", "987654", "654321", "121212", "123123", "112233", "12345", "1234567", "12a456"])("refuses %s", (pin) => {
    expect(pinIsWeak(pin)).toBe(true);
  });
  it.each(["480157", "730264", "915382"])("accepts %s", (pin) => {
    expect(pinIsWeak(pin)).toBe(false);
  });
});

describe("the app lock (D044)", () => {
  it("opens the app for this person and session until the lock period passes", () => {
    const now = Date.UTC(2026, 10, 25, 9, 0);
    const token = unlockToken(USER, "session-a", 15, now);
    expect(unlockTokenValid(token, USER, "session-a", now + 14 * 60_000)).toBe(true);
    expect(unlockTokenValid(token, USER, "session-a", now + 15 * 60_000 + 1)).toBe(false);
    expect(readUnlockToken(token, USER, "session-a", now)).toBe(15);
  });
  it("can't be reused by another session or person, or edited", () => {
    const now = Date.now();
    const token = unlockToken(USER, "session-a", 15, now);
    expect(unlockTokenValid(token, USER, "session-b", now)).toBe(false);
    expect(unlockTokenValid(token, "someone-else", "session-a", now)).toBe(false);
    const [expires, , mac] = token.split(".");
    expect(unlockTokenValid(`${Number(expires) + 3600}.15.${mac}`, USER, "session-a", now)).toBe(false);
    expect(unlockTokenValid(`${expires}.600.${mac}`, USER, "session-a", now)).toBe(false);
    expect(unlockTokenValid(undefined, USER, "session-a", now)).toBe(false);
  });
});

describe("Lock your account links", () => {
  it("name one account for 7 days and can't be forged", () => {
    const now = Date.now();
    const token = lockLinkToken(USER, now);
    expect(readLockLinkToken(token, now)).toBe(USER);
    expect(readLockLinkToken(token, now + 8 * 86_400_000)).toBeNull();
    expect(readLockLinkToken(token.replace(USER, "18181818-0000-4000-8000-000000000002"), now)).toBeNull();
    expect(readLockLinkToken("nonsense", now)).toBeNull();
  });
});

describe("signing in with email or phone", () => {
  it("reads an email or a Nigerian mobile number", () => {
    expect(parseLogin(" Ada@OkaforFoods.ng ")).toEqual({ kind: "email", login: "ada@okaforfoods.ng" });
    expect(parseLogin("0803 123 4567")).toEqual({ kind: "phone", login: "2348031234567" });
    expect(parseLogin("+234 803 123 4567")).toEqual({ kind: "phone", login: "2348031234567" });
    expect(parseLogin("12345")).toBeNull();
    expect(parseLogin("ada@")).toBeNull();
  });
});

describe("phone-only accounts", () => {
  it("carry an internal address that is never shown", () => {
    const email = internalEmailFor("8f1c2d3e-0000-4000-8000-000000000009");
    expect(isInternalEmail(email)).toBe(true);
    expect(realEmail(email)).toBe("");
    expect(realEmail("ada@okaforfoods.ng")).toBe("ada@okaforfoods.ng");
  });
});

describe("device names in the new-sign-in email", () => {
  it("say the browser and the phone", () => {
    expect(deviceLabel("Mozilla/5.0 (Linux; Android 13; TECNO) AppleWebKit/537.36 Chrome/124 Mobile Safari/537.36")).toBe("Chrome on Android");
    expect(deviceLabel("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1")).toBe("Safari on iPhone");
    expect(deviceLabel("")).toBe("a new device");
  });
});
