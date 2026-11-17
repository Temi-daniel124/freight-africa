import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { CodeForm, type CodePreview } from "@/features/auth/code-form";
import { SignInForm } from "@/features/auth/sign-in-form";
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

// Every state of A-01 and A-02 on one page, for design review (DESIGN_SYSTEM.md section 20).
export default function SignInStatesPage() {
  // Development and preview only, like the component gallery.
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();

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
