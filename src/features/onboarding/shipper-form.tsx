"use client";

import { TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import messages from "@/messages/en.json";
import { setUpShipper, type ShipperState } from "./shipper-actions";

const t = messages.onboarding.shipper;

/** A-04 Tell us who's sending: name, Myself or A business, and Start booking. */
export function ShipperForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState(setUpShipper, {
    status: "idle",
    errors: {},
    values: { name, as: "myself", businessName: "", cac: "" },
  } satisfies ShipperState);
  const [as, setAs] = useState(state.values.as);
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <TextField id="shipper-name" name="name" label={t.name} defaultValue={state.values.name} autoComplete="name" required error={state.errors.name ? t.errors.name : undefined} />
      <div className="flex flex-col gap-2">
        <span className="text-label text-ink">{t.sendingAs}</span>
        <input type="hidden" name="as" value={as} />
        <SegmentedControl
          label={t.sendingAs}
          value={as}
          onChange={setAs}
          options={[
            { value: "myself", label: t.myself },
            { value: "business", label: t.business },
          ]}
        />
      </div>
      {as === "business" ? (
        <>
          <TextField
            id="shipper-business"
            name="businessName"
            label={t.businessName}
            defaultValue={state.values.businessName}
            autoComplete="organization"
            error={state.errors.businessName ? t.errors.businessName : undefined}
          />
          <TextField
            id="shipper-cac"
            name="cac"
            label={t.cac}
            helper={t.cacHelp}
            defaultValue={state.values.cac}
            autoCapitalize="characters"
            spellCheck={false}
            error={state.errors.cac ? t.errors.cac : undefined}
          />
        </>
      ) : null}
      {state.status === "error" ? (
        <p role="alert" className="flex items-start gap-1.5 text-label font-medium text-danger">
          <TriangleAlert aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.75} />
          {t.errors.failed}
        </p>
      ) : null}
      <Button type="submit" loading={pending} loadingLabel={t.saving} loadingText className="w-full">
        {t.submit}
      </Button>
    </form>
  );
}
