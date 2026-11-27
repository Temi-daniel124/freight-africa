"use client";

import { Ellipsis, X } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { initialsOf } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { setAvatar } from "./actions";
import { AVATARS } from "./avatars";

const t = messages.settings.picture;

/**
 * P06b "Pick your avatar": two faces, the initials and a dashed "more" circle that opens all twelve
 * faces. A tap saves straight away (D045), as in Settings.
 */
export function AvatarRow({ name, current, label, moreLabel, fewerLabel }: { name: string; current: string | null; label: string; moreLabel: string; fewerLabel: string }) {
  const [, start] = useTransition();
  const [chosen, setChosen] = useOptimistic(current);
  const [open, setOpen] = useState(false);
  const pick = (key: string | null) =>
    start(async () => {
      setChosen(key);
      const { ok } = await setAvatar(key);
      if (!ok) toast.error(t.failed);
    });
  const faces = open ? AVATARS : AVATARS.slice(0, 2);
  const circle = (on: boolean) =>
    cn("grid size-15 shrink-0 place-items-center overflow-hidden rounded-full transition-shadow", on ? "border-[2.5px] border-green-700 bg-green-50 shadow-[0_0_0_3px_var(--color-green-100)]" : "bg-line-soft");
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2.5">
      {faces.map((key, i) => (
        <button key={key} type="button" onClick={() => pick(key)} aria-pressed={chosen === key} aria-label={t.face.replace("{n}", String(i + 1))} className={circle(chosen === key)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- small local faces */}
          <img src={`/avatars/${key}.webp`} alt="" className="size-14" />
        </button>
      ))}
      <button type="button" onClick={() => pick(null)} aria-pressed={chosen === null} aria-label={t.useInitials} className={cn(circle(chosen === null), "text-body font-semibold text-ink-2")}>
        {initialsOf(name || "FA")}
      </button>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? fewerLabel : moreLabel}
        className="grid size-15 shrink-0 place-items-center rounded-full border-field border-dashed border-line-strong text-ink-3"
      >
        {open ? <X aria-hidden className="size-5" strokeWidth={1.8} /> : <Ellipsis aria-hidden className="size-5" strokeWidth={1.8} />}
      </button>
    </div>
  );
}
