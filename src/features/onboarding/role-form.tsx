"use client";

import { Check, CircleAlert } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AuthActions, AuthBody, AuthTop } from "@/features/auth/auth-frame";
import { cn } from "@/lib/utils";
import { chooseRole } from "./actions";
import type { JoiningAs, RoleState } from "./roles";

type RoleText = { title: string; text: string };
export type RoleFormText = {
  step: string;
  title: string;
  lead: string;
  rolesLabel: string;
  roles: Record<JoiningAs, RoleText>;
  driver: string;
  agreeTitle: string;
  terms: string;
  termsLink: string;
  privacyLink: string;
  whatsapp: string;
  whatsappHelp: string;
  marketing: string;
  submit: string;
  saving: string;
  errors: {
    role: string;
    terms: string;
    whatsapp: string;
    summary: string;
    failed: string;
  };
};

type RoleFormProps = {
  t: RoleFormText;
  choices: JoiningAs[];
  /** Preselected from the link the person arrived by (?role=owner from "Join as a truck owner"). */
  preset: JoiningAs | null;
  /** They agreed on an earlier visit, so the boxes aren't asked again. */
  agreed: boolean;
  termsHref: string;
  privacyHref: string;
};

/** The owner card's truck (mockup P06): drawn, so it stays sharp at any size. */
function TruckArt() {
  return (
    <svg aria-hidden width="150" height="72" viewBox="0 0 200 96" fill="none" className="-mr-7.5 shrink-0">
      <ellipse cx="100" cy="90" rx="92" ry="5" className="fill-ink" opacity=".08" />
      <rect x="6" y="16" width="128" height="58" rx="7" className="fill-white stroke-line-strong" strokeWidth="1.5" />
      <rect x="6" y="56" width="128" height="7" className="fill-green-700" />
      <circle cx="34" cy="36" r="9" className="fill-green-50" />
      <path d="M138 32h27c4 0 7 2 9 5l13 18c1 2 2 4 2 6v13h-51z" className="fill-green-900" />
      <path d="M150 39h14c2 0 4 1 5 3l8 11h-27z" className="fill-green-300" />
      <rect x="2" y="72" width="192" height="6" rx="3" className="fill-ink" />
      {[32, 58, 166].map((cx) => (
        <g key={cx}>
          <circle cx={cx} cy="81" r="10" className="fill-ink" />
          <circle cx={cx} cy="81" r="4" className="fill-line-strong" />
        </g>
      ))}
    </svg>
  );
}

const art: Record<JoiningAs, ReactNode> = {
  shipper: <Image src="/art/box.webp" alt="" width={118} height={94} className="-mr-1.5 w-29.5 shrink-0 drop-shadow-[0_12px_14px_rgba(15,26,20,0.16)]" />,
  owner: <TruckArt />,
};

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-center gap-1 text-caption text-danger">
      <CircleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
      {children}
    </p>
  );
}

function Agreement({ name, error, defaultChecked, children, help }: { name: string; error?: string; defaultChecked: boolean; children: ReactNode; help?: string }) {
  const errorId = `onboarding-${name}-error`;
  const helpId = help ? `onboarding-${name}-help` : undefined;
  return (
    <div className="flex flex-col gap-helper">
      <label className="flex cursor-pointer items-start gap-3 py-1 text-body-sm font-normal text-ink">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={[error ? errorId : null, helpId].filter(Boolean).join(" ") || undefined}
          className="size-6 shrink-0 cursor-pointer rounded-check accent-green-700"
        />
        <span className="flex flex-col gap-1">
          <span>{children}</span>
          {help ? (
            <span id={helpId} className="text-caption text-ink-2">
              {help}
            </span>
          ) : null}
        </span>
      </label>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </div>
  );
}

/** Splits "I agree to the {terms} and the {privacy}." around its two links. */
function splitTerms(text: string): [string, string, string] {
  const [before, rest = ""] = text.split("{terms}");
  const [between, after = ""] = rest.split("{privacy}");
  return [before, between, after];
}

// A-03 What brings you here? (mockup P06): one choice, the agreements (F-10), one button.
export function RoleForm({ t, choices, preset, agreed, termsHref, privacyHref }: RoleFormProps) {
  const initial: RoleState = {
    status: "idle",
    missing: { role: false, terms: false, whatsapp: false },
    values: { role: preset, terms: false, whatsapp: false, marketing: false },
    attempt: 0,
  };
  const [state, action, pending] = useActionState(chooseRole, initial);
  const [role, setRole] = useState<JoiningAs | null>(state.values.role);
  const invalid = state.status === "invalid";
  const [before, between, after] = splitTerms(t.terms);

  return (
    <form action={action} noValidate className="flex flex-1 flex-col">
      <AuthTop middle={<span className="text-label text-ink-3">{t.step}</span>} />
      <AuthBody className="pt-7 md:px-0">
        <h1 className="text-title-1 text-balance text-ink">{t.title}</h1>
        <p className="type-signin-lead mt-2.5 text-ink-2">{t.lead}</p>

        {invalid || state.status === "error" ? (
          <p role="alert" className="mt-6 flex items-start gap-2 rounded-callout bg-danger-100 p-4 text-body text-danger">
            <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} />
            {invalid ? t.errors.summary : t.errors.failed}
          </p>
        ) : null}

        <fieldset className="mt-6.5 flex flex-col gap-3" aria-describedby={invalid && state.missing.role ? "onboarding-role-error" : undefined}>
          <legend className="sr-only">{t.rolesLabel}</legend>
          {choices.map((choice) => {
            const selected = role === choice;
            return (
              <label
                key={choice}
                className={cn(
                  "relative flex h-33 cursor-pointer items-center gap-3.5 overflow-hidden rounded-card border bg-surface px-4.5 transition-colors motion-standard has-focus-visible:ring-4 has-focus-visible:ring-green-100",
                  selected ? "border-2 border-green-700 px-4 shadow-[0_18px_36px_-24px_rgba(12,80,52,0.55)]" : "border-line-field hover:border-line-strong",
                  invalid && state.missing.role && !selected && "border-danger",
                )}
              >
                <input type="radio" name="role" value={choice} checked={selected} onChange={() => setRole(choice)} className="sr-only" />
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-[1.1875rem] leading-tight font-semibold tracking-[-0.02em] text-ink">{t.roles[choice].title}</span>
                  <span className="max-w-42.5 text-body-sm leading-[1.4] font-normal text-ink-2">{t.roles[choice].text}</span>
                </span>
                {art[choice]}
                <span
                  aria-hidden
                  className={cn("absolute top-3.5 right-3.5 grid size-6 place-items-center rounded-full", selected ? "bg-green-700 text-white" : "border-field border-line-strong bg-surface")}
                >
                  {selected ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
              </label>
            );
          })}
          {invalid && state.missing.role ? <FieldError id="onboarding-role-error">{t.errors.role}</FieldError> : null}
        </fieldset>
        <p className="mx-1 mt-4.5 text-body-sm font-normal text-ink-3">{t.driver}</p>

        {agreed ? (
          // Already agreed on an earlier visit; the server checks again before saving anything.
          <>
            <input type="hidden" name="terms" value="on" />
            <input type="hidden" name="whatsapp" value="on" />
          </>
        ) : (
          // F-10: the agreements are recorded per person, so they stay even though the mockup leaves them out.
          <fieldset className="mt-6 flex flex-col gap-3 border-t border-line pt-5">
            <legend className="sr-only">{t.agreeTitle}</legend>
            <Agreement key={`terms-${state.attempt}`} name="terms" defaultChecked={state.values.terms} error={invalid && state.missing.terms ? t.errors.terms : undefined}>
              {before}
              <Link href={termsHref} className="font-semibold text-green-700 underline">
                {t.termsLink}
              </Link>
              {between}
              <Link href={privacyHref} className="font-semibold text-green-700 underline">
                {t.privacyLink}
              </Link>
              {after}
            </Agreement>
            <Agreement
              key={`whatsapp-${state.attempt}`}
              name="whatsapp"
              defaultChecked={state.values.whatsapp}
              help={t.whatsappHelp}
              error={invalid && state.missing.whatsapp ? t.errors.whatsapp : undefined}
            >
              {t.whatsapp}
            </Agreement>
            <Agreement key={`marketing-${state.attempt}`} name="marketing" defaultChecked={state.values.marketing}>
              {t.marketing}
            </Agreement>
          </fieldset>
        )}
      </AuthBody>

      <AuthActions className="md:mt-8 md:px-0">
        <Button type="submit" className="w-full" loading={pending} loadingLabel={t.saving}>
          {t.submit}
        </Button>
      </AuthActions>
    </form>
  );
}
