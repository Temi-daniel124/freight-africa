"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useActionState, useRef, useState, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  FieldShell,
  inputClasses,
  inputErrorClasses,
  TextField,
} from "@/components/ui/field";
import { findExpiry, findPlate, readText } from "@/lib/ocr";
import { formatPlate } from "@/lib/plate";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { addTruck, fleetUploadTicket, type AddTruckState } from "./actions";
import { PhotoField } from "./photo-field";

const t = messages.trucks.add;

type TruckType = {
  id: string;
  name: string;
  min: number;
  max: number;
  usual: number;
  goods: string[];
};
type Option = { id: string; name: string };

function Section({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-5 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-body-lg font-semibold tracking-close text-ink">
          {title}
        </h2>
        {help ? <p className="text-body-sm text-ink-2">{help}</p> : null}
      </div>
      {children}
    </section>
  );
}

function ErrorLine({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-1.5 text-label font-medium text-danger"
    >
      <TriangleAlert
        aria-hidden
        className="mt-px size-4 shrink-0"
        strokeWidth={1.75}
      />
      {children}
    </p>
  );
}

/** Capacity choices for a type, in tonnes: 5 t steps across its range, plus the usual one. */
function capacities(type: TruckType) {
  const values = new Set<number>([type.usual]);
  for (let kg = Math.ceil(type.min / 5000) * 5000; kg <= type.max; kg += 5000)
    values.add(kg);
  return [...values].sort((a, b) => a - b);
}

/** T-09 Add a truck: photos and taps, then Send for checking. */
export function AddTruckForm({
  types,
  goods,
  papers,
  corridors,
  defaultRoutes,
}: {
  types: TruckType[];
  goods: Option[];
  papers: { code: string; name: string; required: boolean }[];
  corridors: Option[];
  defaultRoutes: string[];
}) {
  const [state, action, pending] = useActionState(addTruck, {
    status: "idle",
    errors: {},
  } satisfies AddTruckState);
  const [typeId, setTypeId] = useState("");
  const plateRef = useRef<HTMLInputElement>(null);
  const [plateRead, setPlateRead] = useState(false);
  const type = types.find((item) => item.id === typeId);
  const [capacity, setCapacity] = useState<number | null>(null);
  const [excluded, setExcluded] = useState<string[]>([]);
  const e = state.errors;

  if (state.status === "sent") {
    return (
      <div className="flex flex-col items-start gap-4">
        <CircleCheck
          aria-hidden
          className="size-10 text-success"
          strokeWidth={1.5}
        />
        <div className="flex flex-col gap-1">
          <h2 className="text-title-2 text-ink">{t.sent.title}</h2>
          <p className="text-body text-ink-2">{t.sent.text}</p>
        </div>
        <Link
          href="/app/haul/trucks"
          className={buttonVariants({ className: "w-full" })}
        >
          {t.sent.list}
        </Link>
      </div>
    );
  }

  // Plate and expiry dates are read from the photos on the phone and only prefill the fields; the person
  // checks them, and what they confirm is saved (founder brief, section 4).
  async function prefillPlate(image: Blob) {
    const plate = findPlate(await readText(image));
    if (plate && plateRef.current && !plateRef.current.value) {
      plateRef.current.value = formatPlate(plate);
      setPlateRead(true);
    }
  }
  async function prefillExpiry(image: Blob, inputId: string) {
    const date = findExpiry(await readText(image));
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (date && input && !input.value) input.value = date;
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Section title={t.back}>
        <PhotoField
          name="back"
          label={t.back}
          help={t.backHelp}
          ticket={fleetUploadTicket}
          bucket="fleet"
          error={e.back ? t.errors.back : undefined}
          onPicked={(image) => void prefillPlate(image)}
        />
        <TextField
          ref={plateRef}
          id="truck-plate"
          name="plate"
          label={t.plate}
          helper={plateRead ? messages.ocr.check : t.plateHelp}
          autoCapitalize="characters"
          spellCheck={false}
          autoComplete="off"
          error={e.plate ? t.errors.plate : undefined}
        />
      </Section>

      <Section title={t.type}>
        <div
          role="radiogroup"
          aria-label={t.type}
          className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        >
          {types.map((item) => (
            <label
              key={item.id}
              className="flex min-h-12 cursor-pointer items-center rounded-field border border-line-strong px-3.5 py-2.5 text-body-sm font-semibold text-ink has-checked:border-green-700 has-checked:bg-green-50"
            >
              <input
                type="radio"
                name="type"
                value={item.id}
                className="sr-only"
                onChange={() => {
                  setTypeId(item.id);
                  setCapacity(item.usual);
                  setExcluded([]);
                }}
              />
              {item.name}
            </label>
          ))}
        </div>
        {e.type ? <ErrorLine>{t.errors.type}</ErrorLine> : null}
        {type ? (
          <div className="flex flex-col gap-2">
            <span className="text-label text-ink">{t.capacity}</span>
            <input type="hidden" name="capacity" value={capacity ?? ""} />
            <div className="flex flex-wrap gap-2">
              {capacities(type).map((kg) => (
                <button
                  key={kg}
                  type="button"
                  aria-pressed={capacity === kg}
                  onClick={() => setCapacity(kg)}
                  className={cn(
                    "min-h-11 rounded-pill border px-4 text-body-sm font-semibold tabular",
                    capacity === kg
                      ? "border-green-700 bg-green-700 text-white"
                      : "border-line-strong text-ink",
                  )}
                >
                  {messages.trucks.list.capacity.replace(
                    "{tonnes}",
                    String(kg / 1000),
                  )}
                </button>
              ))}
            </div>
            {e.capacity ? <ErrorLine>{t.errors.capacity}</ErrorLine> : null}
          </div>
        ) : null}
      </Section>

      <Section title={t.more} help={t.moreHelp}>
        <div className="grid grid-cols-2 gap-3">
          <PhotoField
            name="side"
            label={t.side}
            ticket={fleetUploadTicket}
            bucket="fleet"
            compact
          />
          <PhotoField
            name="front"
            label={t.front}
            ticket={fleetUploadTicket}
            bucket="fleet"
            compact
          />
        </div>
      </Section>

      {type ? (
        <Section title={t.goods} help={t.goodsHelp}>
          {/* Unticked goods are sent as the truck's exclusions. */}
          {excluded.map((id) => (
            <input key={id} type="hidden" name="excluded" value={id} />
          ))}
          <div className="flex flex-wrap gap-2">
            {goods
              .filter((item) => type.goods.includes(item.id))
              .map((item) => (
                <label
                  key={`${type.id}-${item.id}`}
                  className="flex min-h-11 cursor-pointer items-center gap-2 rounded-pill border border-line-strong px-4 text-body-sm text-ink has-checked:border-green-700 has-checked:bg-green-50"
                >
                  <input
                    type="checkbox"
                    checked={!excluded.includes(item.id)}
                    onChange={(event) =>
                      setExcluded((now) =>
                        event.target.checked
                          ? now.filter((id) => id !== item.id)
                          : [...now, item.id],
                      )
                    }
                    className="size-4 accent-green-700"
                  />
                  {item.name}
                </label>
              ))}
          </div>
        </Section>
      ) : null}

      <Section title={t.papers} help={t.papersHelp}>
        <div className="flex flex-col gap-5">
          {papers.map((paper) => {
            const error = e[paper.code as keyof typeof e];
            return (
              <div
                key={paper.code}
                className="flex flex-col gap-3 rounded-inner border border-line p-4"
              >
                <p className="flex items-center gap-2 text-body font-semibold text-ink">
                  {paper.name}
                  {paper.required ? null : (
                    <span className="rounded-pill bg-paper px-2 py-0.5 text-micro font-semibold text-ink-3">
                      {t.optional}
                    </span>
                  )}
                </p>
                {paper.code === "goods_in_transit" ? (
                  <p className="-mt-2 text-body-sm text-ink-2">{t.git}</p>
                ) : null}
                <PhotoField
                  name={`paper_${paper.code}`}
                  label={paper.name}
                  ticket={fleetUploadTicket}
                  bucket="fleet"
                  compact
                  onPicked={(image) => void prefillExpiry(image, `expires-${paper.code}`)}
                />
                <FieldShell
                  id={`expires-${paper.code}`}
                  label={t.expires}
                  error={
                    error
                      ? error === "expired"
                        ? t.errors.expired
                        : t.errors.paper
                      : undefined
                  }
                >
                  <input
                    id={`expires-${paper.code}`}
                    name={`expires_${paper.code}`}
                    type="date"
                    className={cn(inputClasses, error && inputErrorClasses)}
                  />
                </FieldShell>
              </div>
            );
          })}
        </div>
      </Section>

      <Section title={t.routes}>
        <div className="flex flex-col gap-2">
          {corridors.map((corridor) => (
            <label
              key={corridor.id}
              className="flex min-h-12 cursor-pointer items-center gap-3 rounded-field border border-line-strong px-3.5 py-2.5 text-body-sm text-ink has-checked:border-green-700 has-checked:bg-green-50"
            >
              <input
                type="checkbox"
                name="routes"
                value={corridor.id}
                defaultChecked={defaultRoutes.includes(corridor.id)}
                className="size-5 shrink-0 accent-green-700"
              />
              {corridor.name}
            </label>
          ))}
        </div>
        {e.routes ? <ErrorLine>{t.errors.routes}</ErrorLine> : null}
      </Section>

      {state.status === "plateTaken" ? (
        <ErrorLine>{t.errors.plateTaken}</ErrorLine>
      ) : null}
      {state.status === "error" ? (
        <ErrorLine>{t.errors.failed}</ErrorLine>
      ) : null}
      {state.status === "invalid" ? (
        <ErrorLine>{messages.onboarding.errors.summary}</ErrorLine>
      ) : null}
      <Button
        type="submit"
        loading={pending}
        loadingLabel={t.saving}
        loadingText
        className="w-full"
      >
        {t.submit}
      </Button>
    </form>
  );
}
