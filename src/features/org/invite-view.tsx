import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { AcceptInviteForm } from "./accept-invite-form";

const t = messages.org.invite;

export type InviteInfo = { orgName: string; role: string; inviter: string | null; state: string } | null;

/** A-07's card: open (signed in or out), used, expired, or not found. */
export function InviteView({ invite, token, signedIn }: { invite: InviteInfo; token: string; signedIn: boolean }) {
  const home = (
    <Link href="/app" className={cn(buttonVariants({ size: "md", variant: "secondary" }), "w-full")}>
      {t.home}
    </Link>
  );
  if (!invite) {
    return (
      <EmptyState title={t.notFoundTitle} action={home}>
        {t.notFoundText}
      </EmptyState>
    );
  }
  if (invite.state !== "open") {
    return (
      <EmptyState title={invite.state === "used" ? t.usedTitle : t.closedTitle} action={home}>
        {t.closedText}
      </EmptyState>
    );
  }
  const role = (messages.org.roles[invite.role as keyof typeof messages.org.roles] ?? invite.role).toLowerCase();
  const line = (invite.inviter ? t.text.replace("{inviter}", invite.inviter) : t.textNoInviter).replace("{org}", invite.orgName).replace("{role}", role);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-title-1 text-ink">{t.title}</h1>
        <p className="text-body text-ink-2">{line}</p>
      </div>
      {signedIn ? (
        <AcceptInviteForm token={token} />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-center text-label font-normal text-ink-2">{t.signInText}</p>
          <Link href={`/auth?next=${encodeURIComponent(`/invite/${token}`)}`} className={cn(buttonVariants({ size: "md" }), "w-full")}>
            {t.signIn}
          </Link>
        </div>
      )}
    </div>
  );
}

export function InviteFrame({ children }: { children: ReactNode }) {
  return <div className="w-full max-w-md rounded-card bg-surface p-5 shadow-raised lg:p-8">{children}</div>;
}
