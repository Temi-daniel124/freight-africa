import type { Metadata } from "next";
import { AudienceSwitch } from "@/features/site/audience-switch";
import { EscrowStory } from "@/features/site/escrow-story";
import { Faq, faqStructuredData } from "@/features/site/faq";
import { FinalBand } from "@/features/site/final-band";
import { Hero } from "@/features/site/hero";
import { HowItWorks } from "@/features/site/how-it-works";
import { JsonLd } from "@/features/site/json-ld";
import { Pricing } from "@/features/site/pricing";
import { ProofStrip } from "@/features/site/proof-strip";
import { RoutesMap } from "@/features/site/routes-map";
import { SectionHeading } from "@/features/site/section-heading";
import { SiteFooter } from "@/features/site/site-footer";
import { SiteHeader } from "@/features/site/site-header";
import { stepIllustrations } from "@/features/site/step-illustrations";
import messages from "@/messages/en.json";

export const metadata: Metadata = { alternates: { canonical: "/" } };

const home = messages.home;

const organization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: messages.meta.name,
  url: "https://freight-africa.com",
  logo: "https://freight-africa.com/brand/png/app-icon-1024.png",
  email: messages.site.contactEmail,
  areaServed: "NG",
};

export default function HomePage() {
  return (
    <>
      <SiteHeader nav={messages.site.nav} homeLabel={messages.site.homeLabel} />
      <main>
        <Hero />
        <ProofStrip />
        <HowItWorks
          heading={<SectionHeading id="how-title" title={home.how.title} lead={home.how.lead} />}
          steps={home.how.steps}
          illustrations={stepIllustrations.map((Illustration, index) => <Illustration key={index} />)}
        />
        <EscrowStory heading={<SectionHeading id="escrow-title" title={home.escrow.title} lead={home.escrow.lead} />} t={home.escrow} />
        <AudienceSwitch heading={<SectionHeading id="audience-title" title={home.audience.title} />} t={home.audience} />
        <RoutesMap
          heading={<SectionHeading id="routes-title" title={home.routes.title} lead={home.routes.lead} />}
          corridors={messages.site.corridors}
          status={home.routes.status}
          mapLabel={home.routes.mapLabel}
        />
        <Pricing heading={<SectionHeading id="pricing-title" title={home.pricing.title} lead={home.pricing.lead} />} t={home.pricing} />
        <Faq />
        <FinalBand />
      </main>
      <SiteFooter />
      <JsonLd data={organization} />
      <JsonLd data={faqStructuredData} />
    </>
  );
}
