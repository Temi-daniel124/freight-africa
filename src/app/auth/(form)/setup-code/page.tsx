import type { Metadata } from "next";
import { SetupCodeForm } from "@/features/driver/setup-code-form";
import messages from "@/messages/en.json";

export const metadata: Metadata = { title: messages.driverInstall.code.title, robots: { index: false, follow: false } };

// DV05d: the iPhone home-screen app starts signed out; the one-time setup code signs it in (D052).
export default function SetupCodePage() {
  return <SetupCodeForm />;
}
