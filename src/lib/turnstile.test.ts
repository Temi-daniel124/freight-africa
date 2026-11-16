import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { passesTurnstile, turnstileSiteKey } from "./turnstile";

const answer = (success: boolean) => vi.fn(async () => Response.json({ success }));

afterEach(() => vi.unstubAllEnvs());

const on = () => {
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "secret-key");
};

describe("Turnstile", () => {
  it("is off until both keys are set, and then lets everyone through unchecked", async () => {
    vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "site-key");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const fetcher = answer(false);
    expect(turnstileSiteKey()).toBeNull();
    expect(await passesTurnstile("", null, fetcher)).toBe(true);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("refuses a missing token without asking Cloudflare", async () => {
    on();
    const fetcher = answer(true);
    expect(await passesTurnstile("", "1.2.3.4", fetcher)).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends the secret, token and address, and follows Cloudflare's answer", async () => {
    on();
    const yes = answer(true);
    expect(await passesTurnstile("token-1", "1.2.3.4", yes)).toBe(true);
    const body = (yes.mock.calls[0] as unknown as [string, { body: URLSearchParams }])[1].body;
    expect(Object.fromEntries(body)).toEqual({ secret: "secret-key", response: "token-1", remoteip: "1.2.3.4" });
    expect(await passesTurnstile("token-2", null, answer(false))).toBe(false);
  });

  it("fails closed when Cloudflare can't be reached", async () => {
    on();
    const down = vi.fn(async () => {
      throw new Error("network");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await passesTurnstile("token", null, down)).toBe(false);
  });
});
