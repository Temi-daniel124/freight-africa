"use client";

import {
  CircleAlert,
  CircleCheck,
  Package,
  Truck,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useActionState, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { chooseRole } from "./actions";
import type { JoiningAs, RoleState } from "./roles";

type RoleText = { title: string; text: string };
export type RoleFormText = {
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

const icons: Record<JoiningAs, LucideIcon> = {
  shipper: Package,
  owner: Truck,
};

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="flex items-center gap-1 text-caption text-danger">
      <CircleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
      {children}
    </p>
  );
}

function Agreement({
  name,
  error,
  defaultChecked,
  children,
  help,
}: {
  name: string;
  error?: string;
  defaultChecked: boolean;
  children: ReactNode;
  help?: string;
}) {
  const errorId = `onboarding-${name}-error`;
  const helpId = help ? `onboarding-${name}-help` : undefined;
  return (
    <div className="flex flex-col gap-helper">
      <label className="flex cursor-pointer items-start gap-3 py-1 text-body text-ink">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [error ? errorId : null, helpId].filter(Boolean).join(" ") ||
            undefined
          }
          className="mt-px size-6 shrink-0 cursor-pointer accent-green-700"
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

// A-03 What brings you here? One choice, the agreements (F-10), one button.
export function RoleForm({
  t,
  choices,
  preset,
  agreed,
  termsHref,
  privacyHref,
}: RoleFormProps) {
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
    <form action={action} noValidate className="flex flex-col gap-8">
      {invalid ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-inner bg-danger-100 p-4 text-body text-danger"
        >
          <CircleAlert
            aria-hidden
            className="mt-0.5 size-5 shrink-0"
            strokeWidth={1.75}
          />
          {t.errors.summary}
        </p>
      ) : state.status === "error" ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-inner bg-danger-100 p-4 text-body text-danger"
        >
          <CircleAlert
            aria-hidden
            className="mt-0.5 size-5 shrink-0"
            strokeWidth={1.75}
          />
          {t.errors.failed}
        </p>
      ) : null}

      <fieldset
        className="flex flex-col gap-3"
        aria-describedby={
          invalid && state.missing.role ? "onboarding-role-error" : undefined
        }
      >
        <legend className="sr-only">{t.rolesLabel}</legend>
        {choices.map((choice) => {
          const Icon = icons[choice];
          const selected = role === choice;
          return (
            <label
              key={choice}
              className={cn(
                "relative flex min-h-24 cursor-pointer items-center gap-3 rounded-card border bg-surface p-4 transition-colors motion-standard has-focus-visible:ring-4 has-focus-visible:ring-green-100 sm:p-5",
                selected
                  ? "border-2 border-green-700 bg-green-50 p-[15px] sm:gap-4 sm:p-[19px]"
                  : "border-line-strong hover:bg-green-50 sm:gap-4",
                invalid && state.missing.role && !selected && "border-danger",
              )}
            >
              <input
                type="radio"
                name="role"
                value={choice}
                checked={selected}
                onChange={() => setRole(choice)}
                className="sr-only"
              />
              <span
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-inner sm:size-14",
                  selected
                    ? "bg-green-700 text-white"
                    : "bg-green-50 text-green-700",
                )}
              >
                <Icon
                  aria-hidden
                  className="size-6 sm:size-7"
                  strokeWidth={1.75}
                />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-body-lg font-semibold text-ink">
                  {t.roles[choice].title}
                </span>
                <span className="text-body text-ink-2">
                  {t.roles[choice].text}
                </span>
              </span>
              <CircleCheck
                aria-hidden
                className={cn(
                  "size-6 shrink-0 text-green-700",
                  selected ? "opacity-100" : "opacity-0",
                )}
                strokeWidth={1.75}
              />
            </label>
          );
        })}
        {invalid && state.missing.role ? (
          <FieldError id="onboarding-role-error">{t.errors.role}</FieldError>
        ) : null}
        <p className="pt-1 text-body text-ink-2">{t.driver}</p>
      </fieldset>

      {agreed ? (
        // Already agreed on an earlier visit; the server checks again before saving anything.
        <>
          <input type="hidden" name="terms" value="on" />
          <input type="hidden" name="whatsapp" value="on" />
        </>
      ) : (
        // The rule sits on a wrapper: a fieldset draws its legend over its own border.
        <div className="border-t border-line pt-6">
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-4 text-label text-ink-2">
              {t.agreeTitle}
            </legend>
            <Agreement
              key={`terms-${state.attempt}`}
              name="terms"
              defaultChecked={state.values.terms}
              error={
                invalid && state.missing.terms ? t.errors.terms : undefined
              }
            >
              {before}
              <Link
                href={termsHref}
                className="font-semibold text-green-700 underline"
              >
                {t.termsLink}
              </Link>
              {between}
              <Link
                href={privacyHref}
                className="font-semibold text-green-700 underline"
              >
                {t.privacyLink}
              </Link>
              {after}
            </Agreement>
            <Agreement
              key={`whatsapp-${state.attempt}`}
              name="whatsapp"
              defaultChecked={state.values.whatsapp}
              help={t.whatsappHelp}
              error={
                invalid && state.missing.whatsapp
                  ? t.errors.whatsapp
                  : undefined
              }
            >
              {t.whatsapp}
            </Agreement>
            <Agreement
              key={`marketing-${state.attempt}`}
              name="marketing"
              defaultChecked={state.values.marketing}
            >
              {t.marketing}
            </Agreement>
          </fieldset>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        loading={pending}
        loadingLabel={t.saving}
      >
        {t.submit}
      </Button>
    </form>
  );
}
