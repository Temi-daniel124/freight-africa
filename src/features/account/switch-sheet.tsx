"use client";

import { Check, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import { switchAccount } from "@/features/org/actions";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";

// P16a Switch account: only for people in more than one business; everyone else never sees it.

const a = messages.account;
export type SwitchAccount = { orgId: string; name: string; label: string; initials: string; active: boolean };

export function SwitchSheet({ accounts, startOpen = false }: { accounts: SwitchAccount[]; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      title={a.switch}
      description={a.switchText}
      trigger={
        <button type="button" className="min-h-11 text-body-sm font-semibold text-green-800">
          {a.switch}
        </button>
      }
    >
      <ul className="flex flex-col gap-2">
        {accounts.map((x) => (
          <li key={x.orgId}>
            <form action={switchAccount}>
              <input type="hidden" name="org" value={x.orgId} />
              <button
                type="submit"
                disabled={x.active}
                className={cn("flex w-full items-center gap-3 rounded-tile border p-3.5 text-left", x.active ? "border-green-700 bg-green-50" : "border-line bg-surface hover:border-line-strong")}
              >
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-icon text-body-sm font-semibold", x.active ? "bg-green-900 text-white" : "bg-paper text-ink")}>{x.initials}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-semibold text-ink">{x.name}</span>
                  <span className="block truncate text-meta text-ink-3">{x.label}</span>
                </span>
                {x.active ? <Check aria-hidden className="size-5 text-green-700" strokeWidth={2.2} /> : null}
              </button>
            </form>
          </li>
        ))}
        <li>
          <Link href="/onboarding/role" className="flex min-h-14 items-center gap-3 rounded-tile border border-dashed border-line-strong px-3.5 text-body font-semibold text-green-800">
            <Plus aria-hidden className="size-5" strokeWidth={1.8} />
            {a.addBusiness}
          </Link>
        </li>
      </ul>
      <p className="mt-3 text-caption text-ink-3">{a.switchNote}</p>
    </Sheet>
  );
}
