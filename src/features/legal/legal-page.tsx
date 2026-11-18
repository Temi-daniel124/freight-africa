import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { SiteFooter } from "@/features/site/site-footer";
import { SiteHeader } from "@/features/site/site-header";
import { appHref } from "@/lib/hosts";
import messages from "@/messages/en.json";

type Section = { title: string; body: string[] };
type LegalPageProps = { title: string; intro: string; sections: Section[] };

const contact = messages.site.contactEmail;

// Replaces {contact} and {privacy} in legal copy with links.
function rich(text: string): ReactNode {
  return text.split(/(\{contact\}|\{privacy\})/).map((part, index) => {
    if (part === "{contact}")
      return (
        <a key={index} href={`mailto:${contact}`} className="font-semibold break-all text-green-700 underline">
          {contact}
        </a>
      );
    if (part === "{privacy}")
      return (
        <Link key={index} href="/legal/privacy" className="font-semibold text-green-700 underline">
          {messages.legal.privacyLinkText}
        </Link>
      );
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export function LegalPage({ title, intro, sections }: LegalPageProps) {
  return (
    <>
      <SiteHeader nav={messages.site.nav} homeLabel={messages.site.homeLabel} signInHref={appHref()} />
      <main className="px-4 pt-24 pb-16 lg:pt-32 lg:pb-24">
        <article className="mx-auto flex max-w-text flex-col gap-8">
          <header className="flex flex-col gap-3">
            <p className="text-label text-ink-2">{messages.legal.version}</p>
            <h1 className="type-h2 text-ink">{title}</h1>
            <p className="type-lead text-ink-2">{intro}</p>
          </header>
          {sections.map((section) => (
            <section key={section.title} className="flex flex-col gap-3">
              <h2 className="type-h3 text-ink">{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph} className="type-copy text-ink-2">
                  {rich(paragraph)}
                </p>
              ))}
            </section>
          ))}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
