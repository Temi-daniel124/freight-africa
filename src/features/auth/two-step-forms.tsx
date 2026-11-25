"use client";

import { Check, Copy, KeyRound, Lock, Mail, ShieldCheck, TriangleAlert } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { CodeInput } from "@/components/ui/code-input";
import { TextField } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { confirmTwoStep, sendTwoStepUnlockCode, skipTwoStep, startTwoStep, spendTwoStepBackup, verifyTwoStep, type BackupState, type CodeState, type ConfirmState, type EnrollStart, type UnlockCodeState } from "./two-step-actions";

const t = messages.auth.twoStep;
const s = messages.auth.staff;

function ErrorLine({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-label font-medium text-danger">
      <TriangleAlert aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.75} />
      {children}
    </p>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" onClick={() => void navigator.clipboard?.writeText(text).then(() => setCopied(true))} className={cn(buttonVariants({ variant: "tertiary", size: "text" }), "gap-1.5 self-start")}>
      {copied ? <Check aria-hidden className="size-4" strokeWidth={2} /> : <Copy aria-hidden className="size-4" strokeWidth={1.75} />}
      {copied ? t.copied : label}
    </button>
  );
}

function SixDigits({ id, label, pending, wrong, attempt }: { id: string; label: string; pending: boolean; wrong: boolean; attempt: number }) {
  const [code, setCode] = useState("");
  const holder = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(attempt);
  if (attempt !== seen) {
    setSeen(attempt);
    if (wrong) setCode("");
  }
  return (
    <div ref={holder}>
      <CodeInput
        id={id}
        name="code"
        length={6}
        label={label}
        value={code}
        attempt={attempt}
        state={wrong ? "error" : "idle"}
        disabled={pending}
        autoFocus
        describedBy={wrong ? `${id}-error` : undefined}
        onChange={(value) => {
          setCode(value);
          if (value.length === 6 && !pending) startTransition(() => holder.current?.closest("form")?.requestSubmit());
        }}
      />
    </div>
  );
}

/** A-12 Add two-step sign-in (optional): intro with Not now, then the authenticator, then backup codes. */
export function AddTwoStep({ next }: { next: string }) {
  const [started, setStarted] = useState(false);
  if (!started) {
    return (
      <div className="flex flex-col gap-6">
        <div className="grid size-14 place-items-center rounded-full bg-green-50 text-green-700">
          <KeyRound aria-hidden className="size-7" strokeWidth={1.75} />
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="text-title-1 text-ink">{t.addTitle}</h1>
          <p className="text-body text-ink-2">{t.addLead}</p>
          <p className="text-body-sm font-semibold text-green-800">{t.recommended}</p>
        </div>
        <div className="flex flex-col gap-3">
          <Button className="w-full" onClick={() => setStarted(true)}>
            {t.start}
          </Button>
          <form action={skipTwoStep}>
            <input type="hidden" name="next" value={next} />
            <Button type="submit" variant="secondary" className="w-full">
              {t.notNow}
            </Button>
          </form>
        </div>
      </div>
    );
  }
  return <Enroll next={next} />;
}

function Enroll({ next }: { next: string }) {
  const [start, setStart] = useState<EnrollStart | null>(null);
  const [state, action, pending] = useActionState(confirmTwoStep, { status: "idle", attempt: 0 } satisfies ConfirmState);
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    void startTwoStep().then(setStart);
  }, []);
  if (state.codes) return <BackupCodes codes={state.codes} next={next} />;
  if (!start) return <Skeleton className="h-80 w-full rounded-card" />;
  if (start.status === "error") return <ErrorLine>{t.failed}</ErrorLine>;
  const key = start.secret.replace(/(.{4})/g, "$1 ").trim();
  return (
    <form action={action} className="flex flex-col gap-5">
      <h1 className="text-title-1 text-ink">{t.addTitle}</h1>
      <input type="hidden" name="factorId" value={start.factorId} />
      <div className="flex flex-col items-start gap-4 sm:flex-row">
        {/* eslint-disable-next-line @next/next/no-img-element -- a data: QR code from Supabase */}
        <img src={start.qr} alt={t.scan} width={176} height={176} className="size-44 shrink-0 rounded-inner border border-line bg-white p-2" />
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-body-sm text-ink-2">{t.scan}</p>
          <p className="text-label text-ink-3">{t.keyLabel}</p>
          <p className="font-mono text-body-sm break-all text-ink">{key}</p>
          <CopyButton text={start.secret} label={t.copy} />
        </div>
      </div>
      <SixDigits id="two-step-enroll" label={t.codeLabel} pending={pending} wrong={state.status === "wrong"} attempt={state.attempt} />
      {state.status === "wrong" ? <ErrorLine id="two-step-enroll-error">{t.wrongCode}</ErrorLine> : null}
      {state.status === "error" ? <ErrorLine>{t.failed}</ErrorLine> : null}
      <Button type="submit" loading={pending} loadingLabel={t.confirming} loadingText className="w-full">
        {t.confirm}
      </Button>
    </form>
  );
}

function BackupCodes({ codes, next }: { codes: string[]; next: string }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-title-1 text-ink">{t.backupTitle}</h1>
        <p className="text-body-sm text-ink-2">{t.backupLead}</p>
      </div>
      <ol className="grid grid-cols-2 gap-2 rounded-inner bg-paper p-4">
        {codes.map((code) => (
          <li key={code} className="font-mono text-body-sm text-ink tabular">
            {code}
          </li>
        ))}
      </ol>
      <CopyButton text={codes.join("\n")} label={s.setup.copyCodes} />
      <Button className="w-full" onClick={() => window.location.assign(next)}>
        {t.done}
      </Button>
    </div>
  );
}

/** Sign-in with two-step on: the authenticator code, or a backup code if the phone is lost. */
export function VerifyTwoStep({ next }: { next: string }) {
  const [backup, setBackup] = useState(false);
  const [state, action, pending] = useActionState(verifyTwoStep, { status: "idle", attempt: 0 } satisfies CodeState);
  const [bState, bAction, bPending] = useActionState(spendTwoStepBackup, { status: "idle", attempt: 0 } satisfies BackupState);
  if (backup) {
    const error = bState.status === "wrong" ? t.backupWrong : bState.status === "tooMany" ? t.tooMany : bState.status === "error" ? t.failed : undefined;
    return (
      <form action={bAction} className="flex flex-col gap-5">
        <h1 className="text-title-1 text-ink">{t.useBackup}</h1>
        <input type="hidden" name="next" value={next} />
        <TextField id="two-step-backup" name="code" label={t.backupLabel} placeholder="ABCD-EFGH-JKMN-PQRS" autoCapitalize="characters" spellCheck={false} error={error} />
        <Button type="submit" loading={bPending} loadingLabel={t.confirming} loadingText className="w-full">
          {t.verify}
        </Button>
      </form>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="text-title-1 text-ink">{t.verifyTitle}</h1>
        <p className="text-body text-ink-2">{t.verifyLead}</p>
      </div>
      <input type="hidden" name="next" value={next} />
      <SixDigits id="two-step-verify" label={t.codeLabel} pending={pending} wrong={state.status === "wrong"} attempt={state.attempt} />
      {state.status === "wrong" ? <ErrorLine id="two-step-verify-error">{t.wrongCode}</ErrorLine> : null}
      {state.status === "error" ? <ErrorLine>{t.failed}</ErrorLine> : null}
      <Button type="submit" loading={pending} loadingLabel={t.confirming} loadingText className="w-full">
        {t.verify}
      </Button>
      <Button variant="tertiary" size="text" className="self-start" onClick={() => setBackup(true)}>
        {t.useBackup}
      </Button>
    </form>
  );
}

/** X00j: five wrong authenticator codes in a row locked two-step sign-in; an email code opens it. */
export function TwoStepLocked({ email, next, staff }: { email: string; next: string; staff: boolean }) {
  const l = t.locked;
  const [state, action, pending] = useActionState(sendTwoStepUnlockCode, { status: "idle" } satisfies UnlockCodeState);
  const steps = [
    { icon: Mail, text: l.stepEmail },
    { icon: KeyRound, text: l.stepSignIn },
    { icon: ShieldCheck, text: l.stepNotYou },
  ];
  return (
    <form action={action} className="flex flex-col">
      <span className="flex size-16 items-center justify-center rounded-tile bg-danger-100 text-danger">
        <Lock aria-hidden className="size-[30px]" strokeWidth={1.8} />
      </span>
      <h1 className="mt-2 text-title-1 text-ink">{l.title}</h1>
      <p className="mt-2 text-body text-ink-2">{l.lead.replace("{email}", email)}</p>
      <ul className="mt-[18px] rounded-card border border-line bg-surface px-4 py-1">
        {steps.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 border-b border-line py-3 text-label text-ink last:border-b-0">
            <Icon aria-hidden className="size-[18px] shrink-0 text-primary" strokeWidth={1.8} />
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <input type="hidden" name="next" value={next} />
      {state.status === "rateLimited" ? <div className="mt-4"><ErrorLine>{l.rateLimited}</ErrorLine></div> : null}
      {state.status === "error" ? <div className="mt-4"><ErrorLine>{t.failed}</ErrorLine></div> : null}
      <Button type="submit" loading={pending} loadingLabel={l.sending} loadingText className="mt-[18px] w-full">
        {l.send}
      </Button>
      {staff ? <p className="mt-3 text-center text-caption text-ink-3">{l.staffNote}</p> : null}
    </form>
  );
}
