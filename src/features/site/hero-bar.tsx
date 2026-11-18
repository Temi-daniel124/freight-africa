"use client";

import { ArrowRight, ChevronDown, CircleAlert, Package, Truck, WifiOff } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { corridorSlugs } from "@/features/waitlist/options";
import { formatNigerianPhone, normaliseNigerianPhone } from "@/lib/phone";
import { useOnline } from "@/lib/use-online";
import { cn } from "@/lib/utils";

type Corridor = { slug: string; name: string };
type Role = "shipper" | "owner";

type HeroBarText = {
  roleLabel: string;
  roleSend: string;
  roleOwn: string;
  routeLabel: string;
  phoneLabel: string;
  phonePlaceholder: string;
  submit: string;
  sending: string;
  note: string;
  errorPhone: string;
  offline: string;
};

/** Preview-only: start the bar in a given state (the /dev/landing-states page). Never set on the real page. */
export type HeroBarPreview = { role?: Role; corridor?: string; phone?: string; invalid?: boolean; sending?: boolean; offline?: boolean };

type HeroBarProps = { t: HeroBarText; corridors: Corridor[]; preview?: HeroBarPreview };

// Corridor names are stored with ⇄ (two-way); the bar shows them as stops joined by arrows (Gate 2 target).
const stops = (name: string) => name.split(" ⇄ ");

/**
 * The waitlist bar on the hero photo's bottom edge (Gate 2). It starts the sign-up and hands it to
 * /waitlist, prefilled with the role, the route (corridor_interest) and the number: the name and the
 * consent tick are collected there, and so are validation, duplicates and the ?ref= source (src/proxy.ts
 * keeps the share link in a cookie). A plain GET form, so it works without JavaScript.
 */
export function HeroBar({ t, corridors, preview }: HeroBarProps) {
  const online = useOnline() && !preview?.offline;
  const [role, setRole] = useState<Role>(preview?.role ?? "shipper");
  const [corridor, setCorridor] = useState(preview?.corridor ?? corridorSlugs[0]);
  const [phone, setPhone] = useState(preview?.phone ?? "");
  const [invalid, setInvalid] = useState(preview?.invalid ?? false);
  const [sending, setSending] = useState(preview?.sending ?? false);
  const phoneRef = useRef<HTMLInputElement>(null);
  const route = corridors.find((item) => item.slug === corridor) ?? corridors[0];

  const submit = (event: FormEvent<HTMLFormElement>) => {
    if (!online || sending) {
      event.preventDefault();
      return;
    }
    if (!normaliseNigerianPhone(phone)) {
      event.preventDefault();
      setInvalid(true);
      phoneRef.current?.focus();
      return;
    }
    // The browser now opens /waitlist; the button shows it's on its way.
    setSending(true);
  };

  const roles = [
    { value: "shipper", label: t.roleSend, Icon: Package },
    { value: "owner", label: t.roleOwn, Icon: Truck },
  ] as const;

  return (
    <form action="/waitlist" method="get" onSubmit={submit} noValidate className="rounded-card bg-surface p-2.5 text-ink shadow-bar lg:rounded-sheet lg:p-3">
      <div className="flex items-center gap-1 p-0.5 pb-2.5 lg:p-1 lg:pb-3">
        <div role="radiogroup" aria-label={t.roleLabel} className="flex flex-1 gap-1 lg:flex-none">
          {roles.map(({ value, label, Icon }) => (
            <label
              key={value}
              className={cn(
                "inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-pill px-3.5 text-body-sm whitespace-nowrap transition-colors has-focus-visible:ring-4 has-focus-visible:ring-green-100 max-[22.5rem]:gap-1.5 max-[22.5rem]:px-2.5 max-[22.5rem]:text-label lg:h-9 lg:flex-none",
                role === value ? "bg-green-50 text-green-700" : "text-ink-2 hover:text-ink",
              )}
            >
              <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
              <Icon aria-hidden className="size-4 max-[22.5rem]:hidden" strokeWidth={1.75} />
              {label}
            </label>
          ))}
        </div>
        <p className="ml-auto hidden pr-2 text-label font-medium tracking-normal text-ink-3 lg:block">{t.note}</p>
      </div>

      <div className="grid grid-cols-1 gap-1.5 rounded-tray bg-paper p-1.5 lg:grid-cols-waitlist lg:gap-2 lg:rounded-tile lg:p-2">
        {/* Route: a native select laid over the field, so the list is the phone's own picker. */}
        <label className="relative flex min-w-0 flex-col gap-0.5 rounded-field border border-line bg-surface px-4 pt-2.25 pb-2.5 has-focus-visible:border-green-700 has-focus-visible:ring-4 has-focus-visible:ring-green-500/16">
          <span className="text-caption font-semibold tracking-normal text-ink-3">{t.routeLabel}</span>
          <span className="flex min-w-0 items-center gap-2 text-control font-semibold whitespace-nowrap">
            {/* Inline text and icons, so a long route ends in an ellipsis instead of being cut off. */}
            <span className="min-w-0 truncate">
              {stops(route.name).map((stop, index) => (
                <span key={stop}>
                  {index > 0 ? <ArrowRight aria-hidden className="relative -top-0.5 mx-2 inline-block size-4 align-middle text-green-500" strokeWidth={1.75} /> : null}
                  {stop}
                </span>
              ))}
            </span>
            <ChevronDown aria-hidden className="ml-auto size-4.5 shrink-0 text-ink-3" strokeWidth={1.75} />
          </span>
          <select
            name="corridors"
            value={corridor}
            onChange={(event) => setCorridor(event.target.value)}
            aria-label={t.routeLabel}
            className="absolute inset-0 size-full cursor-pointer appearance-none rounded-field opacity-0"
          >
            {corridors.map((item) => (
              <option key={item.slug} value={item.slug}>
                {stops(item.name).join(" → ")}
              </option>
            ))}
          </select>
        </label>

        <label
          className={cn(
            "flex min-w-0 flex-col gap-0.5 rounded-field border bg-surface px-4 pt-2.25 pb-2.5 focus-within:border-green-700 focus-within:ring-4 focus-within:ring-green-500/16",
            invalid ? "border-danger focus-within:border-danger focus-within:ring-danger-100" : "border-line",
          )}
        >
          <span className="text-caption font-semibold tracking-normal text-ink-3">{t.phoneLabel}</span>
          <span className="flex items-center text-control font-semibold">
            <span className="tabular mr-0.5 border-r border-line pr-2.5 font-bold text-ink-2">+234</span>
            <input
              ref={phoneRef}
              id="hero-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              placeholder={t.phonePlaceholder}
              value={phone}
              onChange={(event) => {
                setPhone(formatNigerianPhone(event.target.value));
                if (invalid) setInvalid(false);
              }}
              aria-invalid={invalid ? true : undefined}
              aria-describedby={invalid ? "hero-phone-error" : undefined}
              className="tabular min-w-0 flex-1 bg-transparent pl-2.5 text-control font-semibold text-ink outline-none placeholder:font-medium placeholder:text-ink-3"
            />
          </span>
        </label>

        <Button
          type="submit"
          disabled={!online}
          loading={sending}
          loadingLabel={t.sending}
          className="h-auto min-h-14 rounded-field px-7 text-control font-bold hover:translate-y-0 lg:min-h-15"
        >
          {t.submit}
          <ArrowRight aria-hidden className="size-4.5" strokeWidth={1.75} />
        </Button>
      </div>

      {invalid ? (
        <p id="hero-phone-error" role="alert" className="flex items-center gap-1 px-2 pt-2.5 pb-0.5 text-caption text-danger">
          <CircleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
          {t.errorPhone}
        </p>
      ) : !online ? (
        <p role="status" className="flex items-center gap-2 px-2 pt-2.5 pb-0.5 text-caption font-medium text-warning">
          <WifiOff aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
          {t.offline}
        </p>
      ) : (
        <p className="pt-2.5 pb-0.5 text-center text-caption font-medium tracking-normal text-wrap text-ink-3 lg:hidden">{t.note}</p>
      )}
    </form>
  );
}
