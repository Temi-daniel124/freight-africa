import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { RoadLine } from "@/components/ui/road-line";
import { SiteFooter } from "@/features/site/site-footer";
import { SiteHeader } from "@/features/site/site-header";
import { publicSignInHref } from "@/lib/hosts";
import messages from "@/messages/en.json";

export const metadata: Metadata = { title: messages.meta.notFoundTitle, robots: { index: false } };

export default function NotFound() {
  const t = messages.notFound;
  return (
    <>
      <SiteHeader nav={messages.site.nav} homeLabel={messages.site.homeLabel} signInHref={publicSignInHref()} />
      <main className="flex min-h-dvh items-center px-4 pt-24 pb-16">
        <div className="mx-auto flex w-full max-w-text flex-col items-center gap-6 text-center">
          <RoadLine progress={50} className="max-w-64" />
          <h1 className="type-h2 text-ink">{t.title}</h1>
          <p className="type-lead text-ink-2">{t.text}</p>
          <Link href="/" className={buttonVariants({ className: "max-sm:w-full" })}>
            {t.action}
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
