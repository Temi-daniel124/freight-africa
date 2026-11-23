import { describe, expect, it, vi } from "vitest";
import { dispatchNotifications, render, type Claimed, type DispatchDeps } from "./dispatch";

const row = (over: Partial<Claimed> = {}): Claimed => ({
  id: "n1",
  event: "system.test",
  channel: "email",
  template_code: "system.test",
  language: "en",
  payload: { reference: "FA-TEST1" },
  to_phone: null,
  to_email: "ops@freight-africa.com",
  attempts: 1,
  ...over,
});

function deps(queue: Claimed[], email?: DispatchDeps["email"]) {
  // A queue that hands each row out once, like claim_notifications().
  const pending = [...queue];
  const finished: { id: string; result: string }[] = [];
  const d: DispatchDeps = {
    claim: async (limit) => pending.splice(0, limit),
    template: async () => ({ subject: "Test {{reference}}", body: "Hello {{reference}} {{missing}}." }),
    finish: async (id, outcome) => {
      finished.push({ id, result: outcome.result });
    },
    email,
  };
  return { d, finished };
}

describe("render", () => {
  it("fills names from the payload and leaves unknown ones empty", () => {
    expect(render("Hello {{reference}} {{missing}}.", { reference: "FA-1" })).toBe("Hello FA-1 .");
  });
});

describe("dispatchNotifications", () => {
  it("sends a queued test notification exactly once, even when the dispatcher runs twice", async () => {
    const email = vi.fn(async () => "msg_1");
    const { d, finished } = deps([row()], email);
    expect(await dispatchNotifications(d)).toEqual({ claimed: 1, sent: 1, failed: 0, skipped: 0 });
    expect(await dispatchNotifications(d)).toEqual({ claimed: 0, sent: 0, failed: 0, skipped: 0 });
    expect(email).toHaveBeenCalledTimes(1);
    expect(email).toHaveBeenCalledWith("ops@freight-africa.com", "Test FA-TEST1", "Hello FA-TEST1 .", "n1");
    expect(finished).toEqual([{ id: "n1", result: "sent" }]);
  });

  it("reports a failed send so the database can retry it", async () => {
    const { d, finished } = deps([row()], async () => {
      throw new Error("Email not sent: rate_limit");
    });
    expect((await dispatchNotifications(d)).failed).toBe(1);
    expect(finished[0].result).toBe("failed");
  });

  it("retries an email when this deployment has no email sender, instead of dropping it", async () => {
    const { d, finished } = deps([row()]);
    expect((await dispatchNotifications(d)).failed).toBe(1);
    expect(finished).toEqual([{ id: "n1", result: "failed" }]);
  });

  it("skips channels that are not built yet instead of retrying them", async () => {
    const { d, finished } = deps([row({ id: "w1", channel: "whatsapp", to_email: null, to_phone: "+2348031234567" })]);
    expect((await dispatchNotifications(d)).skipped).toBe(1);
    expect(finished).toEqual([{ id: "w1", result: "skipped" }]);
  });
});
