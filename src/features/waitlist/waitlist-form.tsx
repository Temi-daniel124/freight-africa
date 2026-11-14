"use client";

import { CircleAlert, CircleCheck, Copy, MessageCircle } from "lucide-react";
import Link from "next/link";
import { use, useActionState, useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { TextField } from "@/components/ui/field";
import { PhoneField } from "@/components/ui/phone-field";
import { RoadLine } from "@/components/ui/road-line";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { formatNigerianPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import type messages from "@/messages/en.json";
import { joinWaitlist } from "./actions";
import { waitlistRoles, type WaitlistRole } from "./options";
import type { WaitlistState } from "./state";

type WaitlistCopy = typeof messages.waitlist;
type Corridor = { slug: string; name: string };
type SearchParams = Record<string, string | string[] | undefined>;

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");

const SHARE_URL = "https://freight-africa.com/?ref=share";

type WaitlistFormProps = { searchParams: Promise<SearchParams>; t: WaitlistCopy; corridors: Corridor[] };

export function WaitlistForm({ searchParams, t, corridors }: WaitlistFormProps) {
  const params = use(searchParams);
  const role = first(params.role);
  const initial: WaitlistState = {
    status: "idle",
    errors: {},
    values: {
      name: "",
      phone: first(params.phone),
      email: "",
      role: (waitlistRoles as readonly string[]).includes(role) ? role : "shipper",
      corridors: [],
      trucks: "",
      consent: false,
      source: first(params.ref) || first(params.utm_source),
    },
    attempt: 0,
  };
  const [state, action, pending] = useActionState(joinWaitlist, initial);

  if (state.status === "joined" || state.status === "duplicate") return <Success state={state} t={t} />;

  // Re-mounting on each attempt restores the typed values into the fields.
  return <Fields key={state.attempt} state={state} action={action} pending={pending} t={t} corridors={corridors} />;
}

type FieldsProps = { state: WaitlistState; action: (formData: FormData) => void; pending: boolean; t: WaitlistCopy; corridors: Corridor[] };

function Fields({ state, action, pending, t, corridors }: FieldsProps) {
  const { values, errors } = state;
  const [role, setRole] = useState<WaitlistRole>(values.role as WaitlistRole);
  const [picked, setPicked] = useState<string[]>(values.corridors);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "invalid") formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [state.status]);

  const roleOptions = waitlistRoles.map((value) => ({ value, label: t.roles[value] }));
  const banner =
    state.status === "invalid" ? t.errors.summary : state.status === "rate_limited" ? t.errors.rateLimited : state.status === "error" ? t.errors.failed : null;

  return (
    <form ref={formRef} action={action} noValidate className="flex flex-col gap-5">
      {banner ? (
        <p role="alert" className="flex items-start gap-3 rounded-inner bg-danger-100 p-4 text-body text-danger">
          <CircleAlert aria-hidden className="mt-px size-5 shrink-0" strokeWidth={1.75} />
          {banner}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-label text-ink-2">{t.roleLabel}</span>
        <SegmentedControl label={t.roleLabel} options={roleOptions} value={role} onChange={setRole} />
        <input type="hidden" name="role" value={role} />
      </div>

      <TextField
        id="waitlist-name"
        name="name"
        label={t.name}
        placeholder={t.namePlaceholder}
        autoComplete="name"
        defaultValue={values.name}
        error={errors.name ? t.errors.name : undefined}
        required
      />
      <PhoneField
        id="waitlist-phone"
        name="phone"
        label={t.phone}
        helper={t.phoneHelper}
        defaultValue={values.phone}
        error={errors.phone ? t.errors.phone : undefined}
        required
      />
      <TextField
        id="waitlist-email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        label={t.email}
        placeholder={t.emailPlaceholder}
        helper={t.emailHelper}
        defaultValue={values.email}
        error={errors.email ? t.errors.email : undefined}
      />
      {role === "owner" ? (
        <TextField
          id="waitlist-trucks"
          name="trucks"
          type="number"
          inputMode="numeric"
          min={1}
          max={1000}
          label={t.trucks}
          placeholder={t.trucksPlaceholder}
          defaultValue={values.trucks}
          error={errors.trucks ? t.errors.trucks : undefined}
          className="tabular"
          required
        />
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="pb-2 text-label text-ink-2">{t.corridorsLabel}</legend>
        <div className="flex flex-wrap gap-2">
          {corridors.map((corridor) => {
            const selected = picked.includes(corridor.slug);
            return (
              <Chip
                key={corridor.slug}
                selected={selected}
                onClick={() => setPicked(selected ? picked.filter((slug) => slug !== corridor.slug) : [...picked, corridor.slug])}
              >
                {corridor.name}
              </Chip>
            );
          })}
        </div>
        <p className="pt-helper text-caption text-ink-2">{t.corridorsHelper}</p>
        {picked.map((slug) => (
          <input key={slug} type="hidden" name="corridors" value={slug} />
        ))}
      </fieldset>

      <div className="flex flex-col gap-helper">
        <label className="flex cursor-pointer items-start gap-3 py-2 text-body text-ink">
          <input
            type="checkbox"
            name="consent"
            defaultChecked={values.consent}
            aria-invalid={errors.consent ? true : undefined}
            aria-describedby={errors.consent ? "waitlist-consent-error" : undefined}
            className="mt-px size-6 shrink-0 cursor-pointer accent-green-700"
          />
          <span>
            {t.consent}{" "}
            <Link href="/legal/privacy" className="font-semibold text-green-700 underline">
              {t.consentLink}
            </Link>
            .
          </span>
        </label>
        {errors.consent ? (
          <p id="waitlist-consent-error" className="flex items-center gap-1 text-caption text-danger">
            <CircleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
            {t.errors.consent}
          </p>
        ) : null}
      </div>

      {/* Honeypot for bots; hidden from people and screen readers. */}
      <div aria-hidden className="sr-only">
        <label htmlFor="waitlist-website">{t.honeypot}</label>
        <input id="waitlist-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <input type="hidden" name="source" value={values.source} />

      <Button type="submit" loading={pending} loadingLabel={t.submitting} className="w-full">
        {t.submit}
      </Button>
    </form>
  );
}

function Success({ state, t }: { state: WaitlistState; t: WaitlistCopy }) {
  const [copied, setCopied] = useState(false);
  const joined = state.status === "joined";
  const phone = state.phone ? `+234 ${formatNigerianPhone(state.phone)}` : "";
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${t.shareText} ${SHARE_URL}`)}`;

  return (
    <div className="flex flex-col gap-6" role="status">
      <div className="flex flex-col gap-3">
        <CircleCheck aria-hidden className="size-10 text-success" strokeWidth={1.75} />
        <h2 className="text-title-1 text-ink">{joined ? fill(t.joinedTitle, { name: state.firstName ?? "" }) : t.duplicateTitle}</h2>
        <p className="type-copy text-ink-2">{joined ? fill(t.joinedText, { phone }) : t.duplicateText}</p>
        {joined && state.email ? <p className="type-copy text-ink-2">{fill(t.emailSent, { email: state.email })}</p> : null}
      </div>
      <RoadLine progress={100} />
      <div className="flex flex-col gap-3">
        <h3 className="text-title-2 text-ink">{t.shareTitle}</h3>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants(), "w-full")}>
          <MessageCircle aria-hidden className="size-5" strokeWidth={1.75} />
          {t.shareWhatsApp}
        </a>
        <Button
          variant="secondary"
          className="w-full"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(SHARE_URL);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          <Copy aria-hidden className="size-5" strokeWidth={1.75} />
          <span aria-live="polite">{copied ? t.copied : t.copyLink}</span>
        </Button>
        <Link href="/" className={cn(buttonVariants({ variant: "tertiary", size: "text" }), "self-center")}>
          {t.backHome}
        </Link>
      </div>
    </div>
  );
}
