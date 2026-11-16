import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CodeForm } from "@/features/auth/code-form";
import { readPendingCode } from "@/features/auth/pending";
import { formatNigerianPhone } from "@/lib/phone";
import messages from "@/messages/en.json";

export const metadata: Metadata = { title: messages.meta.codeTitle };

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label={messages.waitlist.loading}>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-14 w-full rounded-button" />
    </div>
  );
}

async function EnterCode() {
  // Without a code on its way there is nothing to enter (the page was opened directly, or 15 minutes passed).
  const pending = await readPendingCode();
  if (!pending) redirect("/auth");

  const to = pending.channel === "whatsapp" ? `+234 ${formatNigerianPhone(pending.to)}` : pending.to;
  return <CodeForm t={messages.auth.code} channel={pending.channel} to={to} length={pending.length} />;
}

// A-02 Enter code.
export default function CodePage() {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EnterCode />
    </Suspense>
  );
}
