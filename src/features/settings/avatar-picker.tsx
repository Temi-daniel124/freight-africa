"use client";

import { Check } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { setAvatar } from "./actions";
import { AVATARS, avatarSrc } from "./avatars";

const t = messages.settings.picture;

/** "Choose your picture" (D045): 3D faces; until one is chosen, initials. */
export function AvatarPicker({ name, current }: { name: string; current: string | null }) {
  const [, start] = useTransition();
  const [chosen, setChosen] = useOptimistic(current);
  const pick = (key: string | null) =>
    start(async () => {
      setChosen(key);
      const { ok } = await setAvatar(key);
      if (!ok) toast.error(t.failed);
    });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar name={name} src={avatarSrc(chosen)} size={56} />
        <p className="min-w-0 text-body-sm text-ink-2">{t.lead}</p>
      </div>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6" aria-label={t.title}>
        {AVATARS.map((key, i) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => pick(key)}
              aria-pressed={chosen === key}
              aria-label={t.face.replace("{n}", String(i + 1))}
              className={cn("relative grid aspect-square w-full place-items-center rounded-tile border bg-green-50 transition-colors", chosen === key ? "border-green-700 ring-2 ring-green-700/30" : "border-line hover:border-line-strong")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- small local faces */}
              <img src={`/avatars/${key}.webp`} alt="" className="size-4/5" />
              {chosen === key ? (
                <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-green-700 text-white">
                  <Check aria-hidden className="size-3.5" strokeWidth={2.5} />
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {chosen ? (
        <button type="button" onClick={() => pick(null)} className="min-h-11 self-start text-body-sm font-semibold text-green-700">
          {t.useInitials}
        </button>
      ) : null}
    </div>
  );
}
