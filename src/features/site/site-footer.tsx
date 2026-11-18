import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { CorridorText } from "@/components/ui/corridor-text";
import messages from "@/messages/en.json";

const t = messages.site;

const linkClass = "mb-3 block text-body-sm leading-5 font-normal text-ink-2 hover:text-ink";

// Footer (Gate 3 target): logo and line, then Routes, Legal and Contact.
export function SiteFooter() {
  return (
    <footer className="bg-surface pt-16 pb-8">
      <div className="mx-auto max-w-300 px-5 lg:px-6">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-footer lg:gap-12">
          <div className="col-span-2 lg:col-span-1">
            <Logo variant="primary-green" className="h-9" />
            <p className="mt-4 max-w-80 text-body text-wrap text-ink-2">{messages.home.hero.lead}</p>
          </div>
          <div>
            <h2 className="mb-4 text-label leading-4 font-bold tracking-normal text-ink">{t.footer.routes}</h2>
            <ul>
              {t.corridors.map((corridor) => (
                <li key={corridor.slug} className={linkClass}>
                  <CorridorText text={corridor.name} />
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-4 text-label leading-4 font-bold tracking-normal text-ink">{t.footer.legal}</h2>
            <Link href="/legal/privacy" className={linkClass}>
              {t.footer.privacy}
            </Link>
            <Link href="/legal/terms" className={linkClass}>
              {t.footer.terms}
            </Link>
          </div>
          <div>
            <h2 className="mb-4 text-label leading-4 font-bold tracking-normal text-ink">{t.footer.contact}</h2>
            <a href={`mailto:${t.contactEmail}`} className={linkClass}>
              {t.contactEmail}
            </a>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-label leading-4 font-normal tracking-normal text-ink-3 lg:flex-row lg:justify-between">
          <p>{t.footer.copyright}</p>
          {/* Credits for the photos: public/photos/CREDITS.md */}
          <p>{t.footer.photos}</p>
        </div>
      </div>
    </footer>
  );
}
