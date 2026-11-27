import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CodeForm, type CodePreview } from "@/features/auth/code-form";
import { SignInForm } from "@/features/auth/sign-in-form";
import { AuthArt } from "@/features/auth/auth-frame";
import { PinLocked, PinSet, PinUnlock } from "@/features/auth/pin-screens";
import { RoleForm } from "@/features/onboarding/role-form";
import { ShipperForm } from "@/features/onboarding/shipper-form";
import { InstallCard } from "@/features/welcome/install-card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { SendState } from "@/features/auth/state";
import messages from "@/messages/en.json";

export const metadata: Metadata = { title: messages.meta.signInStatesTitle, robots: { index: false, follow: false } };

const t = messages.authStates;
const codeText = { ...messages.auth.code, offline: messages.auth.offline };
const EMAIL = "ngozi.okafor@example.com";

function Frame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-label text-ink-2">{label}</h2>
      {/* `inert` keeps these samples from being tabbed into or submitted. */}
      <div inert className="rounded-card border border-line bg-surface p-5">
        {children}
      </div>
    </section>
  );
}

const send = (status: SendState["status"], value = ""): SendState => ({ status, channel: "email", value, attempt: 1 });

function SignIn({ state, offline, sending }: { state?: SendState; offline?: boolean; sending?: boolean }) {
  return (
    <SignInForm t={messages.auth} options={{ google: false, whatsapp: false }} next="/app" googleFailed={false} turnstileSiteKey={null} preview={{ state, offline, sending }} />
  );
}

function Code({ preview }: { preview: CodePreview }) {
  return <CodeForm t={codeText} channel="email" to={EMAIL} length={6} preview={{ seconds: 24, ...preview }} />;
}

/** The (form) layout's frame, for single screens: the same as src/app/auth/(form)/layout.tsx. */
function FormFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-paper">
      <AuthArt />
      <section className="relative flex min-h-dvh min-w-0 flex-1 flex-col lg:px-14 lg:py-10">
        <main className="flex flex-1 flex-col lg:items-center lg:justify-center">
          <div className="flex w-full flex-1 flex-col lg:max-w-105 lg:flex-none">{children}</div>
        </main>
      </section>
    </div>
  );
}

const face = (size: number) => <Avatar name="Adaeze Okafor" src="/avatars/face-01.webp" size={size} />;

/** One screen, full page, for side-by-side checks against the mockups (scripts/compare-mockups.mjs). */
function Single({ state }: { state: string }) {
  switch (state) {
    case "code":
      return (
        <FormFrame>
          <CodeForm t={codeText} channel="email" to="adaeze@okaforfoods.ng" length={6} preview={{ seconds: 24, code: "481" }} />
        </FormFrame>
      );
    case "pin-new":
      return <PinSet next="/app" avatar={face(64)} />;
    case "unlock":
      return <PinUnlock next="/app" phone={false} name="Adaeze Okafor" email="adaeze@okaforfoods.ng" avatar={face(76)} />;
    case "locked":
      return <PinLocked email="adaeze@okaforfoods.ng" back="/auth" action={<Button className="w-full">{messages.auth.pin.lockedEmail}</Button>} />;
    case "role":
      return (
        <div className="min-h-dvh bg-paper">
          <main className="mx-auto flex min-h-dvh w-full flex-col md:max-w-120 md:py-10">
            <RoleForm t={messages.onboarding} choices={["shipper", "owner"]} preset="shipper" agreed termsHref="/legal/terms" privacyHref="/legal/privacy" />
          </main>
        </div>
      );
    case "setup":
      return (
        <div className="min-h-dvh bg-paper">
          <main className="mx-auto flex min-h-dvh w-full flex-col md:max-w-120 md:py-10">
            <ShipperForm name="Adaeze Okafor" avatar="face-01" />
          </main>
        </div>
      );
    case "install":
      return (
        <div className="min-h-dvh bg-paper">
          <InstallCard preview />
        </div>
      );
    default:
      return null;
  }
}

// Every state of A-01 and A-02 on one page, for design review (DESIGN_SYSTEM.md section 20); ?state=… shows
// one screen full page.
export default async function SignInStatesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // Development and preview only, like the component gallery.
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  const state = (await searchParams).state;
  if (typeof state === "string") return <Single state={state} />;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 lg:px-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-title-1 text-ink">{t.title}</h1>
        <p className="text-body-lg text-ink-2">{t.intro}</p>
      </header>
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <Frame label={t.empty}>
          <SignIn />
        </Frame>
        <Frame label={t.typing}>
          <SignIn state={send("idle", "ngozi.okafor@exa")} />
        </Frame>
        <Frame label={t.sending}>
          <SignIn state={send("idle", EMAIL)} sending />
        </Frame>
        <Frame label={t.invalid}>
          <SignIn state={send("invalid", "ngozi.okafor@")} />
        </Frame>
        <Frame label={t.error}>
          <SignIn state={send("error", EMAIL)} />
        </Frame>
        <Frame label={t.rateLimited}>
          <SignIn state={send("rate_limited", EMAIL)} />
        </Frame>
        <Frame label={t.offline}>
          <SignIn state={send("idle", EMAIL)} offline />
        </Frame>
        <Frame label={t.codeSent}>
          <Code preview={{ seconds: 30 }} />
        </Frame>
        <Frame label={t.codeTyping}>
          <Code preview={{ code: "482" }} />
        </Frame>
        <Frame label={t.wrong}>
          <Code preview={{ verify: { status: "wrong", attempt: 1 }, seconds: 0 }} />
        </Frame>
        <Frame label={t.locked}>
          <Code preview={{ verify: { status: "locked", attempt: 5 }, locked: true }} />
        </Frame>
        <Frame label={t.expired}>
          <Code preview={{ expired: true }} />
        </Frame>
        <Frame label={t.success}>
          <Code preview={{ code: "482916", verify: { status: "ok", attempt: 1 } }} />
        </Frame>
      </div>
    </main>
  );
}
