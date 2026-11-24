"use client";

import { CircleCheck, Lock, TriangleAlert } from "lucide-react";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FieldShell, inputClasses, inputErrorClasses, TextField } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { lookUpAccount, saveAbout, saveBankAccount, type AboutState, type BankState, type Lookup } from "./owner-actions";

const t = messages.onboarding.owner;

function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-1.5 text-label font-medium text-danger">
      <TriangleAlert aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.75} />
      {children}
    </p>
  );
}

type Option = { id: string; name: string };
type AboutDefaults = { name: string; companyName: string; drives: boolean; base: string; routes: string[]; hasOrg: boolean };

/** T-ON-02 About you and your business. */
export function AboutForm({ cities, corridors, defaults }: { cities: Option[]; corridors: Option[]; defaults: AboutDefaults }) {
  const [state, action, pending] = useActionState(saveAbout, { status: "idle", errors: {} } satisfies AboutState);
  const [as, setAs] = useState<"myself" | "company">(defaults.companyName ? "company" : "myself");
  const [drives, setDrives] = useState<"yes" | "no">(defaults.drives ? "yes" : "no");
  const e = state.errors;
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <TextField id="owner-name" name="name" label={t.about.name} defaultValue={defaults.name} autoComplete="name" error={e.name ? t.about.errors.name : undefined} />
      {defaults.hasOrg ? null : (
        <div className="flex flex-col gap-2">
          <span className="text-label text-ink">{t.about.runAs}</span>
          <input type="hidden" name="as" value={as} />
          <SegmentedControl label={t.about.runAs} value={as} onChange={setAs} options={[{ value: "myself", label: t.about.myself }, { value: "company", label: t.about.company }]} />
        </div>
      )}
      {!defaults.hasOrg && as === "company" ? (
        <>
          <TextField id="owner-company" name="companyName" label={t.about.companyName} autoComplete="organization" error={e.companyName ? t.about.errors.companyName : undefined} />
          <TextField id="owner-cac" name="cac" label={t.about.cac} helper={t.about.cacHelp} autoCapitalize="characters" spellCheck={false} error={e.cac ? t.about.errors.cac : undefined} />
        </>
      ) : null}
      <div className="flex flex-col gap-2">
        <span className="text-label text-ink">{t.about.drives}</span>
        <input type="hidden" name="drives" value={drives} />
        <SegmentedControl label={t.about.drives} value={drives} onChange={setDrives} options={[{ value: "yes", label: t.about.yes }, { value: "no", label: t.about.no }]} />
        <p className="text-label font-normal text-ink-3">{t.about.drivesHelp}</p>
      </div>
      <FieldShell id="owner-base" label={t.about.base} error={e.base ? t.about.errors.base : undefined}>
        <select id="owner-base" name="base" defaultValue={defaults.base} aria-invalid={e.base ? true : undefined} className={cn(inputClasses, e.base && inputErrorClasses, "appearance-auto")}>
          <option value="">{t.about.baseChoose}</option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.name}
            </option>
          ))}
        </select>
      </FieldShell>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-label text-ink">{t.about.routes}</legend>
        <p className="-mt-1 text-label font-normal text-ink-3">{t.about.routesHelp}</p>
        <div className="flex flex-col gap-2">
          {corridors.map((corridor) => (
            <label key={corridor.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-field border border-line-strong px-3.5 py-2.5 text-body-sm text-ink has-checked:border-green-700 has-checked:bg-green-50">
              <input type="checkbox" name="routes" value={corridor.id} defaultChecked={defaults.routes.includes(corridor.id)} className="size-5 shrink-0 accent-green-700" />
              {corridor.name}
            </label>
          ))}
        </div>
        {e.routes ? <ErrorLine>{t.about.errors.routes}</ErrorLine> : null}
      </fieldset>
      {state.status === "error" ? <ErrorLine>{t.about.errors.failed}</ErrorLine> : null}
      <Button type="submit" loading={pending} loadingLabel={t.about.saving} loadingText className="w-full">
        {t.about.submit}
      </Button>
    </form>
  );
}

/** T-ON-04 Bank account: the name appears as the tenth digit is typed, from the bank, never typed. */
export function BankForm({ banks }: { banks: { code: string; name: string }[] }) {
  const [state, action, pending] = useActionState(saveBankAccount, { status: "idle", errors: {} } satisfies BankState);
  const [bank, setBank] = useState("");
  const [number, setNumber] = useState("");
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [checking, setChecking] = useState(false);
  useEffect(() => {
    if (!bank || number.length !== 10) return;
    let live = true;
    void lookUpAccount(bank, number).then((result) => {
      if (live) {
        setLookup(result);
        setChecking(false);
      }
    });
    return () => {
      live = false;
    };
  }, [bank, number]);
  const notFound = lookup?.status === "notFound" || state.status === "notFound";
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FieldShell id="bank-code" label={t.bank.bank} error={state.errors.bank ? t.bank.errors.bank : undefined}>
        <select
          id="bank-code"
          name="bank"
          value={bank}
          onChange={(event) => {
            setBank(event.target.value);
            setLookup(null);
            setChecking(event.target.value !== "" && number.length === 10);
          }}
          className={cn(inputClasses, state.errors.bank && inputErrorClasses, "appearance-auto")}
        >
          <option value="">{t.bank.bankChoose}</option>
          {banks.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </FieldShell>
      <TextField
        id="bank-number"
        name="number"
        label={t.bank.number}
        helper={t.bank.numberHelp}
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        value={number}
        onChange={(event) => {
          const digits = event.target.value.replace(/\D/g, "").slice(0, 10);
          setNumber(digits);
          setLookup(null);
          setChecking(digits.length === 10 && bank !== "");
        }}
        error={state.errors.number ? t.bank.errors.number : undefined}
        className="tabular tracking-kv"
      />
      <div aria-live="polite">
        {checking ? <p className="text-body-sm text-ink-3">{t.bank.checking}</p> : null}
        {lookup?.status === "found" ? (
          <div className={cn("rounded-inner px-4 py-3", lookup.matches === true ? "bg-success-100" : lookup.matches === false ? "bg-warning-100" : "bg-paper")}>
            <p className="font-bold text-ink">{lookup.name}</p>
            <p className={cn("mt-0.5 flex items-center gap-1.5 text-body-sm", lookup.matches === true ? "text-success" : lookup.matches === false ? "text-warning" : "text-ink-2")}>
              {lookup.matches === true ? <CircleCheck aria-hidden className="size-4" strokeWidth={2} /> : lookup.matches === false ? <TriangleAlert aria-hidden className="size-4" strokeWidth={2} /> : null}
              {lookup.matches === true ? t.bank.match : lookup.matches === false ? t.bank.noMatch : t.bank.unchecked}
            </p>
          </div>
        ) : null}
        {notFound ? <ErrorLine>{t.bank.notFound}</ErrorLine> : null}
        {lookup?.status === "error" || state.status === "error" ? <ErrorLine>{t.bank.errors.failed}</ErrorLine> : null}
      </div>
      <p className="flex items-start gap-2.5 text-body-sm text-ink-2">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-green-700" strokeWidth={1.75} />
        {t.bank.hold}
      </p>
      <Button type="submit" loading={pending} loadingLabel={t.bank.saving} loadingText className="w-full" disabled={lookup?.status !== "found"}>
        {t.bank.submit}
      </Button>
    </form>
  );
}
