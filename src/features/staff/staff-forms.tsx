"use client";

import { Check, Copy, KeyRound, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { CodeInput } from "@/components/ui/code-input";
import { TextField } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import {
  acceptInvite,
  acceptStaffCode,
  confirmEnroll,
  spendBackupCode,
  startEnroll,
  verifyStaffCode,
  type BackupState,
  type ConfirmState,
  type EnrollStart,
  type InviteState,
  type VerifyState,
} from "./actions";

const t = messages.auth.staff;

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
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => setCopied(true));
      }}
      className={cn(buttonVariants({ variant: "tertiary", size: "text" }), "gap-1.5")}
    >
      {copied ? <Check aria-hidden className="size-4" strokeWidth={2} /> : <Copy aria-hidden className="size-4" strokeWidth={1.75} />}
      {copied ? t.setup.copied : label}
    </button>
  );
}

/** Six boxes that send as soon as the sixth digit is in (same behaviour as the sign-in code, A-02). */
function SixDigits({ id, label, pending, wrong, attempt }: { id: string; label: string; pending: boolean; wrong: boolean; attempt: number }) {
  const [code, setCode] = useState("");
  const formRef = useRef<HTMLFormElement | null>(null);
  const [seen, setSeen] = useState(attempt);
  if (attempt !== seen) {
    setSeen(attempt);
    if (wrong) setCode("");
  }
  return (
    <div
      ref={(node) => {
        formRef.current = node?.closest("form") ?? null;
      }}
    >
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
          if (value.length === 6 && !pending) startTransition(() => formRef.current?.requestSubmit());
        }}
      />
    </div>
  );
}

/** X-00 step 3: link the authenticator, confirm a code, then save the ten backup codes. */
export function EnrollFlow() {
  const [start, setStart] = useState<EnrollStart | null>(null);
  const [state, action, pending] = useActionState(confirmEnroll, { status: "idle", attempt: 0 } satisfies ConfirmState);
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current) return;
    asked.current = true;
    void startEnroll().then(setStart);
  }, []);

  if (state.codes) return <BackupCodes codes={state.codes} />;
  if (!start) {
    return (
      <div role="status" aria-label={t.setup.loading} className="flex flex-col gap-4">
        <Skeleton className="size-44 rounded-inner" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }
  if (start.status === "error") return <ErrorLine>{t.setup.startFailed}</ErrorLine>;

  const key = start.secret.replace(/(.{4})/g, "$1 ").trim();
  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="factorId" value={start.factorId} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* The QR code is an SVG data address made by Supabase Auth for this person only. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={start.qr} alt={t.setup.qrAlt} width={176} height={176} className="size-44 shrink-0 rounded-inner border border-line bg-white p-2" />
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-body-sm text-ink-2">{t.setup.scan}</p>
          <code className="rounded-field bg-paper px-3 py-2.5 font-mono text-body-sm tracking-kv break-words text-ink">{key}</code>
          <CopyButton text={start.secret} label={t.setup.copyKey} />
        </div>
      </div>
      <SixDigits id="staff-enroll-code" label={t.setup.label} pending={pending} wrong={state.status === "wrong"} attempt={state.attempt} />
      {state.status === "wrong" ? <ErrorLine id="staff-enroll-code-error">{t.setup.wrong}</ErrorLine> : null}
      {state.status === "error" ? <ErrorLine>{t.setup.failed}</ErrorLine> : null}
      <Button type="submit" loading={pending} loadingLabel={t.setup.checking} loadingText className="w-full">
        {t.setup.confirm}
      </Button>
    </form>
  );
}

function BackupCodes({ codes }: { codes: string[] }) {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [tried, setTried] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => titleRef.current?.focus(), []);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2 border-t border-line pt-5">
        <p className="text-caption font-semibold tracking-caps text-ink-3 uppercase">{t.setup.codesStep}</p>
        <h2 ref={titleRef} tabIndex={-1} className="text-title-2 text-ink outline-none">
          {t.setup.codesTitle}
        </h2>
        <p className="text-body-sm text-ink-2">{t.setup.codesText}</p>
      </div>
      <ol className="grid grid-cols-2 gap-2 rounded-inner bg-paper p-4">
        {codes.map((code) => (
          <li key={code} className="font-mono text-body-sm tracking-kv text-ink tabular">
            {code}
          </li>
        ))}
      </ol>
      <CopyButton text={codes.join("\n")} label={t.setup.copyCodes} />
      <label className="flex cursor-pointer items-start gap-3 py-1 text-body text-ink">
        <input
          type="checkbox"
          checked={saved}
          onChange={(event) => setSaved(event.target.checked)}
          aria-invalid={tried && !saved ? true : undefined}
          aria-describedby={tried && !saved ? "staff-saved-error" : undefined}
          className="mt-px size-6 shrink-0 cursor-pointer accent-green-700"
        />
        {t.setup.saved}
      </label>
      {tried && !saved ? <ErrorLine id="staff-saved-error">{t.setup.savedError}</ErrorLine> : null}
      <Button
        className="w-full"
        onClick={() => {
          setTried(true);
          // Two-step sign-in is already on (the code was confirmed); this only moves on once codes are saved.
          if (saved) router.replace("/admin");
        }}
      >
        {t.setup.turnOn}
      </Button>
    </div>
  );
}

/** Every later sign-in: the authenticator code. */
export function VerifyForm() {
  const [state, action, pending] = useActionState(verifyStaffCode, { status: "idle", attempt: 0 } satisfies VerifyState);
  return (
    <form action={action} className="flex flex-col gap-5">
      <SixDigits id="staff-verify-code" label={t.verify.label} pending={pending} wrong={state.status === "wrong"} attempt={state.attempt} />
      {state.status === "wrong" ? <ErrorLine id="staff-verify-code-error">{t.verify.wrong}</ErrorLine> : null}
      {state.status === "error" ? <ErrorLine>{t.verify.failed}</ErrorLine> : null}
      <Button type="submit" loading={pending} loadingLabel={t.verify.checking} loadingText className="w-full">
        {t.verify.submit}
      </Button>
      <p className="text-body-sm text-ink-2">
        {t.verify.lost}{" "}
        <Link href="/admin/recover" className="font-semibold text-green-700 underline-offset-4 hover:underline">
          {t.verify.useBackup}
        </Link>
      </p>
    </form>
  );
}

/** Lost authenticator: a backup code, then a new authenticator. */
export function RecoverForm() {
  const [state, action, pending] = useActionState(spendBackupCode, { status: "idle", attempt: 0 } satisfies BackupState);
  const error = state.status === "wrong" ? t.recover.wrong : state.status === "tooMany" ? t.recover.tooMany : state.status === "error" ? t.recover.failed : undefined;
  return (
    <form action={action} className="flex flex-col gap-5">
      <TextField
        key={state.attempt}
        id="staff-backup-code"
        name="code"
        label={t.recover.label}
        placeholder={t.recover.placeholder}
        autoComplete="one-time-code"
        autoCapitalize="characters"
        spellCheck={false}
        autoFocus
        error={error}
        className="font-mono tracking-kv uppercase"
      />
      <Button type="submit" loading={pending} loadingLabel={t.recover.checking} loadingText className="w-full">
        <KeyRound aria-hidden strokeWidth={1.75} />
        {t.recover.submit}
      </Button>
      <p className="text-body-sm text-ink-2">{t.recover.none}</p>
      <Link href="/admin/verify" className={cn(buttonVariants({ variant: "tertiary", size: "text" }), "self-start")}>
        {t.recover.back}
      </Link>
    </form>
  );
}

/** X-00 step 1 → 2: accept the invite once signed in with the invited email. */
export function InviteForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(acceptInvite, { status: "idle" } satisfies InviteState);
  const error = state.status === "used" ? t.invite.used : state.status === "otherEmail" ? t.invite.otherEmail : state.status === "error" ? t.invite.failed : undefined;
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {error ? <ErrorLine>{error}</ErrorLine> : null}
      <Button type="submit" loading={pending} className="w-full">
        {t.invite.continue}
      </Button>
    </form>
  );
}

/** X-00 step 4: the staff code. */
export function StaffCodeForm() {
  const [agreed, setAgreed] = useState(false);
  const [tried, setTried] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <form
      action={async () => {
        setPending(true);
        await acceptStaffCode();
      }}
      onSubmit={(event) => {
        setTried(true);
        if (!agreed) event.preventDefault();
      }}
      className="flex flex-col gap-5"
    >
      <label className="flex cursor-pointer items-start gap-3 py-1 text-body text-ink">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          aria-invalid={tried && !agreed ? true : undefined}
          aria-describedby={tried && !agreed ? "staff-code-error" : undefined}
          className="mt-px size-6 shrink-0 cursor-pointer accent-green-700"
        />
        {t.code.agree}
      </label>
      {tried && !agreed ? <ErrorLine id="staff-code-error">{t.code.agreeError}</ErrorLine> : null}
      <Button type="submit" loading={pending} className="w-full">
        {t.code.continue}
      </Button>
    </form>
  );
}
