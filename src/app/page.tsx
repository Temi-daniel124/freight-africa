import type { Metadata } from "next";
import { Audience } from "@/features/site/audience";
import { Faq, faqStructuredData } from "@/features/site/faq";
import { FinalBand } from "@/features/site/final-band";
import { Hero } from "@/features/site/hero";
import { HowItWorks } from "@/features/site/how-it-works";
import { JsonLd } from "@/features/site/json-ld";
import { PaymentBand } from "@/features/site/payment-band";
import { Pricing } from "@/features/site/pricing";
import { Routes } from "@/features/site/routes";
import { SiteFooter } from "@/features/site/site-footer";
import { SiteHeader } from "@/features/site/site-header";
import { appHref } from "@/lib/hosts";
import messages from "@/messages/en.json";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const home = messages.home;

const SITE = "https://freight-africa.com";

// Google reads the logo and the site name from these (Organization and WebSite structured data).
const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE}/#organization`,
  name: messages.meta.name,
  url: SITE,
  logo: { "@type": "ImageObject", url: `${SITE}/brand/png/app-icon-1024.png`, width: 1024, height: 1024 },
  image: `${SITE}/brand/web/og-image-1200x630.png`,
  description: messages.meta.description,
  email: messages.site.contactEmail,
  areaServed: { "@type": "Country", name: "Nigeria" },
};

const website = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE}/#website`,
  name: messages.meta.name,
  url: SITE,
  inLanguage: "en-NG",
  publisher: { "@id": `${SITE}/#organization` },
};

export default function HomePage() {
  return (
    <>
      <SiteHeader nav={messages.site.nav} homeLabel={messages.site.homeLabel} signInHref={appHref()} />
      {/* Built to the approved Gate 2 and Gate 3 targets (docs/design/targets): white page, inset hero and bands. */}
      <main className="bg-surface">
        <Hero />
        <HowItWorks />
        <PaymentBand />
        <Audience />
        <Routes />
        <Pricing label={home.labels.pricing} t={home.pricing} />
        <Faq />
        <FinalBand />
      </main>
      <SiteFooter />
      <JsonLd data={organization} />
      <JsonLd data={website} />
      <JsonLd data={faqStructuredData} />
    </>
  );
}
