import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/legal-page";
import messages from "@/messages/en.json";

export const metadata: Metadata = {
  title: messages.meta.termsTitle,
  description: messages.meta.termsDescription,
  alternates: { canonical: "/legal/terms" },
};

export default function TermsPage() {
  const t = messages.legal.terms;
  return <LegalPage title={t.title} intro={t.intro} sections={t.sections} />;
}
