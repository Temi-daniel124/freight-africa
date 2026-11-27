// Driver trip actions work offline (driver-mockups rules): every action is stamped with the time and
// place on the phone, kept on the phone, and sent later in order. Each action carries its own id, which
// the server uses as the idempotency key, so sending it twice does no harm. Phase 4 adds the server side.

export type ActionKind = "arrived_pickup" | "start_loading" | "loading_photo" | "loading_code" | "start_trip" | "arrived_drop" | "delivery_photo" | "delivery_code" | "problem";
export type Place = { lat: number; lng: number; accuracy: number };
export type QueuedAction = { id: string; seq: number; tripId: string; kind: ActionKind; at: string; place: Place | null; payload: Record<string, unknown> };
/** What the server said: done, try again later (offline, 5xx), or never (refused: keep going without it). */
export type SendResult = "ok" | "retry" | "drop";
type Store = Pick<Storage, "getItem" | "setItem">;

export function createQueue(store: Store, key = "fa-trip-queue", now = () => new Date(), newId = () => crypto.randomUUID()) {
  let flushing: Promise<{ sent: number; left: number }> | null = null;
  const read = (): QueuedAction[] => {
    try {
      const list = JSON.parse(store.getItem(key) ?? "[]") as QueuedAction[];
      return Array.isArray(list) ? list.sort((a, b) => a.seq - b.seq) : [];
    } catch {
      return [];
    }
  };
  const write = (list: QueuedAction[]) => store.setItem(key, JSON.stringify(list));

  return {
    /** Stamps and keeps an action. The place is whatever the phone knew at that moment (or none). */
    add(input: { tripId: string; kind: ActionKind; place?: Place | null; payload?: Record<string, unknown> }): QueuedAction {
      const list = read();
      const seq = list.reduce((max, a) => Math.max(max, a.seq), Number(store.getItem(`${key}:seq`) ?? 0)) + 1;
      const action: QueuedAction = { id: newId(), seq, tripId: input.tripId, kind: input.kind, at: now().toISOString(), place: input.place ?? null, payload: input.payload ?? {} };
      write([...list, action]);
      // The sequence keeps rising even after the queue empties, so order holds across sends.
      store.setItem(`${key}:seq`, String(seq));
      return action;
    },
    pending: read,
    /** Sends in order; stops at the first "retry" so nothing overtakes it. One flush at a time. */
    flush(send: (action: QueuedAction) => Promise<SendResult>) {
      if (flushing) return flushing;
      flushing = (async () => {
        let sent = 0;
        try {
          for (const action of read()) {
            let result: SendResult;
            try {
              result = await send(action);
            } catch {
              result = "retry";
            }
            if (result === "retry") break;
            write(read().filter((a) => a.id !== action.id));
            if (result === "ok") sent += 1;
          }
        } finally {
          flushing = null;
        }
        return { sent, left: read().length };
      })();
      return flushing;
    },
  };
}
