import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteFooter } from "@/features/site/site-footer";
import { SiteHeader } from "@/features/site/site-header";
import { appHref } from "@/lib/hosts";
import { WaitlistForm } from "@/features/waitlist/waitlist-form";
import messages from "@/messages/en.json";

export const metadata: Metadata = {
  title: messages.meta.waitlistTitle,
  description: messages.meta.waitlistDescription,
  alternates: { canonical: "/waitlist" },
};

const t = messages.waitlist;

function FormSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-label={t.loading} role="status">
      <Skeleton className="h-14 w-full rounded-pill" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full rounded-button" />
    </div>
  );
}

export default function WaitlistPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return (
    <>
      <SiteHeader nav={messages.site.nav} homeLabel={messages.site.homeLabel} signInHref={appHref()} showJoin={false} />
      <main className="px-4 pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="mx-auto flex max-w-text flex-col gap-8">
          <div className="flex flex-col gap-3">
            <h1 className="type-h2 text-ink">{t.title}</h1>
            <p className="type-lead text-ink-2">{t.lead}</p>
          </div>
          <div className="rounded-card bg-surface p-5 shadow-raised lg:p-8">
            <Suspense fallback={<FormSkeleton />}>
              <WaitlistForm searchParams={searchParams} t={t} corridors={messages.site.corridors} />
            </Suspense>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
