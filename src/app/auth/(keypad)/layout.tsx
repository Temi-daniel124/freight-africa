import type { Metadata } from "next";
import type { ReactNode } from "react";

// Sign-in pages are for people, not search engines.
export const metadata: Metadata = { robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

// D044 PIN screens (A-11, A-13): the keypad fills the phone; from 768 px a centred card on the paper.
export default function KeypadLayout({ children }: { children: ReactNode }) {
  return <main className="min-h-dvh bg-paper md:grid md:place-items-center md:px-4">{children}</main>;
}
