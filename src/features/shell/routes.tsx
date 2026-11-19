import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import messages from "@/messages/en.json";
import { AppShell, ShellContent, ShellTopBar } from "./app-shell";
import { shellPages, shells, type PageKey, type ShellRole } from "./config";
import { PlaceholderPage } from "./placeholder-page";
import { ShipperHomeFirstVisit } from "./shipper-home";
import { getViewer, greetingFor } from "./viewer";

// Each role's routes (src/app/app/<base>/...) are one line each, built here from the shell config.

export const shellMetadata: Metadata = { robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

export function shellLayout(role: ShellRole) {
  return function ShellLayout({ children }: { children: ReactNode }) {
    const config = shells[role];
    return (
      <AppShell config={config} viewer={getViewer(config)}>
        {children}
      </AppShell>
    );
  };
}

/** The role's first tab: the greeting instead of a title (Gate 4). */
export function shellHome(role: ShellRole) {
  return function ShellHome() {
    const config = shells[role];
    const viewer = getViewer(config);
    // The clock is read only after the session (connection()) so the page is rendered per request.
    const greeting = viewer.then(() => greetingFor(new Date()));
    return (
      <>
        <ShellTopBar config={config} viewer={viewer} greeting={greeting} />
        <ShellContent>{role === "shipper" ? <ShipperHomeFirstVisit config={config} /> : <PlaceholderPage config={config} page={config.home} />}</ShellContent>
      </>
    );
  };
}

export function shellParams(role: ShellRole) {
  return function generateStaticParams() {
    return shellPages(shells[role]).map((page) => ({ page }));
  };
}

function isPage(role: ShellRole, page: string): page is PageKey {
  return (shellPages(shells[role]) as string[]).includes(page);
}

export function shellPageMetadata(role: ShellRole) {
  return async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
    const { page } = await params;
    return { ...shellMetadata, title: isPage(role, page) ? messages.shell.pages[page].title : undefined };
  };
}

async function SectionPage({ role, params }: { role: ShellRole; params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!isPage(role, page)) notFound();
  const config = shells[role];
  return (
    <>
      <ShellTopBar config={config} viewer={getViewer(config)} title={messages.shell.pages[page].title} />
      <ShellContent>
        <PlaceholderPage config={config} page={page} />
      </ShellContent>
    </>
  );
}

export function shellSection(role: ShellRole) {
  return function ShellSection({ params }: { params: Promise<{ page: string }> }) {
    return (
      <Suspense fallback={<Skeleton className="m-4 h-40 lg:m-8" />}>
        <SectionPage role={role} params={params} />
      </Suspense>
    );
  };
}
