import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyStandardWebhook } from "./standard";

const key = Buffer.from("freight-africa-test-signing-key!");
const secret = `v1,whsec_${key.toString("base64")}`;
const now = Date.UTC(2026, 10, 15, 12, 0, 0);
const timestamp = String(now / 1000);
const body = JSON.stringify({ user: { phone: "+2348031234567" }, sms: { otp: "482916" } });

const sign = (id: string, time: string, text: string, signingKey = key) =>
  `v1,${createHmac("sha256", signingKey).update(`${id}.${time}.${text}`).digest("base64")}`;

describe("verifyStandardWebhook", () => {
  it("accepts a valid signature", () => {
    expect(verifyStandardWebhook(body, { id: "msg_1", timestamp, signature: sign("msg_1", timestamp, body) }, secret, now)).toBe(true);
  });

  it("accepts when one of several signatures matches (secret rotation)", () => {
    const signature = `v1,AAAA ${sign("msg_1", timestamp, body)}`;
    expect(verifyStandardWebhook(body, { id: "msg_1", timestamp, signature }, secret, now)).toBe(true);
  });

  it("rejects a bad signature, a changed body and a wrong key", () => {
    expect(verifyStandardWebhook(body, { id: "msg_1", timestamp, signature: "v1,AAAA" }, secret, now)).toBe(false);
    expect(verifyStandardWebhook(`${body} `, { id: "msg_1", timestamp, signature: sign("msg_1", timestamp, body) }, secret, now)).toBe(false);
    const other = sign("msg_1", timestamp, body, Buffer.from("another-key-another-key-another!"));
    expect(verifyStandardWebhook(body, { id: "msg_1", timestamp, signature: other }, secret, now)).toBe(false);
  });

  it("rejects missing headers", () => {
    expect(verifyStandardWebhook(body, { id: null, timestamp, signature: sign("msg_1", timestamp, body) }, secret, now)).toBe(false);
    expect(verifyStandardWebhook(body, { id: "msg_1", timestamp, signature: null }, secret, now)).toBe(false);
  });

  it("ignores a replay sent more than five minutes ago", () => {
    const old = String(now / 1000 - 6 * 60);
    expect(verifyStandardWebhook(body, { id: "msg_1", timestamp: old, signature: sign("msg_1", old, body) }, secret, now)).toBe(false);
  });
});
