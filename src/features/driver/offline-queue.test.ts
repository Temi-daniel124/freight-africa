import { describe, expect, it } from "vitest";
import { createQueue, type QueuedAction, type SendResult } from "./offline-queue";

function memory() {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };
}
function queue() {
  let n = 0;
  let t = Date.UTC(2026, 10, 27, 7, 42);
  return createQueue(memory(), "q", () => new Date((t += 60_000)), () => `id-${++n}`);
}

describe("driver offline queue", () => {
  it("stamps each action with the time and place, in order", () => {
    const q = queue();
    const a = q.add({ tripId: "t1", kind: "arrived_pickup", place: { lat: 6.6, lng: 3.35, accuracy: 12 } });
    const b = q.add({ tripId: "t1", kind: "start_loading" });
    expect(a.seq).toBe(1);
    expect(b.seq).toBe(2);
    expect(a.at < b.at).toBe(true);
    expect(a.place).toEqual({ lat: 6.6, lng: 3.35, accuracy: 12 });
    expect(b.place).toBeNull();
    expect(q.pending().map((x) => x.kind)).toEqual(["arrived_pickup", "start_loading"]);
  });

  it("sends in order and stops at the first one that must wait", async () => {
    const q = queue();
    q.add({ tripId: "t1", kind: "arrived_pickup" });
    q.add({ tripId: "t1", kind: "start_loading" });
    q.add({ tripId: "t1", kind: "loading_photo" });
    const seen: string[] = [];
    const answers: SendResult[] = ["ok", "retry", "ok"];
    const r = await q.flush(async (a) => (seen.push(a.kind), answers[seen.length - 1]));
    expect(seen).toEqual(["arrived_pickup", "start_loading"]);
    expect(r).toEqual({ sent: 1, left: 2 });
    expect(q.pending()[0].kind).toBe("start_loading");
  });

  it("treats a network error as wait, and a refused action as gone", async () => {
    const q = queue();
    q.add({ tripId: "t1", kind: "arrived_pickup" });
    q.add({ tripId: "t1", kind: "start_loading" });
    expect(await q.flush(async () => Promise.reject(new Error("offline")))).toEqual({ sent: 0, left: 2 });
    const r = await q.flush(async (a) => (a.kind === "arrived_pickup" ? "drop" : "ok"));
    expect(r).toEqual({ sent: 1, left: 0 });
  });

  it("keeps the same id when sent again, so the server can ignore a repeat", async () => {
    const q = queue();
    const a = q.add({ tripId: "t1", kind: "loading_code", payload: { code: "518123" } });
    const ids: string[] = [];
    await q.flush(async (x: QueuedAction) => (ids.push(x.id), "retry"));
    await q.flush(async (x: QueuedAction) => (ids.push(x.id), "ok"));
    expect(ids).toEqual([a.id, a.id]);
  });

  it("runs one flush at a time", async () => {
    const q = queue();
    q.add({ tripId: "t1", kind: "arrived_pickup" });
    let calls = 0;
    const send = async () => (calls++, await new Promise((r) => setTimeout(r, 5)), "ok" as const);
    const [x, y] = await Promise.all([q.flush(send), q.flush(send)]);
    expect(calls).toBe(1);
    expect(x).toEqual(y);
  });

  it("keeps order after the queue empties", async () => {
    const q = queue();
    q.add({ tripId: "t1", kind: "arrived_pickup" });
    await q.flush(async () => "ok");
    expect(q.add({ tripId: "t1", kind: "start_loading" }).seq).toBe(2);
  });
});
