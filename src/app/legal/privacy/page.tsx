import type { Metadata } from "next";
import { LegalPage } from "@/features/legal/legal-page";
import messages from "@/messages/en.json";

export const metadata: Metadata = {
  title: messages.meta.privacyTitle,
  description: messages.meta.privacyDescription,
  alternates: { canonical: "/legal/privacy" },
};

export default function PrivacyPage() {
  const t = messages.legal.privacy;
  return <LegalPage title={t.title} intro={t.intro} sections={t.sections} />;
}
