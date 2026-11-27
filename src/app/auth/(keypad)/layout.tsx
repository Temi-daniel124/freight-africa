import type { Metadata } from "next";
import type { ReactNode } from "react";

// Sign-in pages are for people, not search engines.
export const metadata: Metadata = { robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

// D044 PIN screens (A-11, A-13, mockups P05, P05b, D01b): each screen lays itself out on the paper.
export default function KeypadLayout({ children }: { children: ReactNode }) {
  return <main className="min-h-dvh bg-paper">{children}</main>;
}
