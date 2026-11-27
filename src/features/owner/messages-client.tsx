"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { markDriverMessageRead, replyToDriver } from "./actions";

const m = messages.driverMessages;

/** O19d New / All, a segmented control. */
export function MessageTabs({ newLabel, allLabel, newPanel, allPanel }: { newLabel: string; allLabel: string; newPanel: ReactNode; allPanel: ReactNode }) {
  const [tab, setTab] = useState<"new" | "all">("new");
  return (
    <>
      <div role="tablist" className="mb-3 grid grid-cols-2 gap-1 rounded-pill bg-[#E9EBE5] p-1">
        {(["new", "all"] as const).map((k) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("h-10 rounded-pill text-body-sm font-semibold", tab === k ? "bg-surface text-ink shadow-raised" : "text-ink-2")}>
            {k === "new" ? newLabel : allLabel}
          </button>
        ))}
      </div>
      <div role="tabpanel">{tab === "new" ? newPanel : allPanel}</div>
    </>
  );
}

/** O19e the reply: quick replies fill the box; the reply goes to the driver's Notifications. */
export function ReplyBox({ id, name, existing, unread }: { id: string; name: string; existing: string | null; unread: boolean }) {
  const router = useRouter();
  const [text, setText] = useState(existing ?? "");
  const [pending, start] = useTransition();
  useEffect(() => {
    if (unread) void markDriverMessageRead(id);
  }, [id, unread]);
  const send = () =>
    start(async () => {
      const r = await replyToDriver(id, text);
      if (r.status !== "ok") return void toast.error(messages.checkout.error);
      toast(m.sent);
      router.refresh();
    });
  return (
    <>
      <p className="mt-1 text-meta text-ink-3">{m.quick}</p>
      <div className="flex flex-wrap gap-2">
        {m.quickList.map((q) => (
          <button key={q} type="button" onClick={() => setText((t) => (t.startsWith(q) ? t : `${q}${t ? ` ${t}` : ""}`))} className={cn("h-11 rounded-pill border px-4 text-body-sm font-semibold", text.startsWith(q) ? "border-green-900 bg-green-900 text-white" : "border-line bg-surface text-ink")}>
            {q}
          </button>
        ))}
      </div>
      <label className="sr-only" htmlFor={`reply-${id}`}>
        {m.placeholder}
      </label>
      <textarea id={`reply-${id}`} rows={3} value={text} maxLength={1000} placeholder={m.placeholder} onChange={(e) => setText(e.target.value)} className="w-full rounded-card border border-line-field bg-surface px-4.5 py-4 text-body text-ink outline-none focus:border-green-700 focus:shadow-focus" />
      <p className="text-caption text-ink-3">{m.replyNote.replace("{name}", name)}</p>
      <div className="fixed inset-x-0 bottom-0 z-20 bg-paper px-5 pt-3 pb-[max(env(safe-area-inset-bottom),24px)] lg:static lg:mt-3 lg:px-0">
        <Button className="w-full" loading={pending} disabled={!text.trim()} onClick={send}>
          <Send aria-hidden strokeWidth={1.8} />
          {m.send}
        </Button>
      </div>
    </>
  );
}
