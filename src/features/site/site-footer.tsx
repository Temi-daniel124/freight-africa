import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import messages from "@/messages/en.json";

const t = messages.site;

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="mx-auto grid max-w-site gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-12 lg:px-6 lg:py-16">
        <div className="lg:col-span-3">
          <Logo className="h-10" />
        </div>
        <div className="flex flex-col gap-3 lg:col-span-4">
          <h2 className="text-label text-ink-2">{t.footer.routes}</h2>
          <ul className="flex flex-col gap-2">
            {t.corridors.map((corridor) => (
              <li key={corridor.slug} className="text-body text-ink">
                {corridor.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-3 lg:col-span-2">
          <h2 className="text-label text-ink-2">{t.footer.legal}</h2>
          <ul className="-mt-3 flex flex-col">
            <li>
              <Link href="/legal/privacy" className="inline-flex min-h-12 items-center text-body text-ink hover:underline">
                {t.footer.privacy}
              </Link>
            </li>
            <li>
              <Link href="/legal/terms" className="inline-flex min-h-12 items-center text-body text-ink hover:underline">
                {t.footer.terms}
              </Link>
            </li>
          </ul>
        </div>
        <div className="flex flex-col gap-3 lg:col-span-3">
          <h2 className="text-label text-ink-2">{t.footer.contact}</h2>
          <a href={`mailto:${t.contactEmail}`} className="-mt-3 inline-flex min-h-12 items-center self-start text-body text-ink hover:underline">
            {t.contactEmail}
          </a>
        </div>
        <p className="text-caption text-ink-2 sm:col-span-2 lg:col-span-12">{t.footer.copyright}</p>
      </div>
    </footer>
  );
}
