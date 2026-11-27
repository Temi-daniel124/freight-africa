"use client";

import { TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { AuthActions, AuthBody, AuthTop } from "@/features/auth/auth-frame";
import { AvatarRow } from "@/features/settings/avatar-row";
import messages from "@/messages/en.json";
import { setUpShipper, type ShipperState } from "./shipper-actions";

const t = messages.onboarding.shipper;

/**
 * A-04 Tell us who's sending (mockup P06b): avatar, name, Myself or A business, and Start booking.
 * The mockup's phone number is left out until phone numbers can be verified (Phase 4, WhatsApp codes):
 * a profile phone must be verified (DATA-MODEL profiles), and each booking asks for its own contacts.
 */
export function ShipperForm({ name, avatar }: { name: string; avatar: string | null }) {
  const [state, action, pending] = useActionState(setUpShipper, {
    status: "idle",
    errors: {},
    values: { name, as: "myself", businessName: "", cac: "" },
  } satisfies ShipperState);
  const [as, setAs] = useState(state.values.as);
  return (
    <form action={action} className="flex flex-1 flex-col" noValidate>
      <AuthTop back="/onboarding/role" middle={<span />} end={<span className="text-label whitespace-nowrap text-ink-3">{t.lastStep}</span>} />
      <AuthBody className="px-5 pt-4.5 md:px-0">
        <h1 className="text-title-1 text-ink">{t.title}</h1>
        <p className="mt-2 text-body text-ink-2">{t.lead}</p>

        <p className="mt-5.5 mb-2 text-body-sm text-ink">{t.avatar}</p>
        <AvatarRow name={state.values.name || name} current={avatar} label={t.avatar} moreLabel={t.moreAvatars} fewerLabel={t.fewerAvatars} />

        <div className="mt-5.5 flex flex-col gap-5">
          <TextField id="shipper-name" name="name" label={t.name} defaultValue={state.values.name} autoComplete="name" required error={state.errors.name ? t.errors.name : undefined} />
          <div className="flex flex-col">
            <span className="mb-2 text-body-sm text-ink">{t.sendingAs}</span>
            <input type="hidden" name="as" value={as} />
            <SegmentedControl
              label={t.sendingAs}
              value={as}
              onChange={setAs}
              appearance="app"
              className="w-full [&>*]:flex-1"
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
                label={
                  <>
                    {t.cac} <span className="font-medium text-ink-3">{t.optional}</span>
                  </>
                }
                helper={t.cacHelp}
                placeholder="RC 1234567"
                defaultValue={state.values.cac}
                autoCapitalize="characters"
                spellCheck={false}
                error={state.errors.cac ? t.errors.cac : undefined}
              />
            </>
          ) : null}
        </div>
        {state.status === "error" ? (
          <p role="alert" className="mt-5 flex items-start gap-1.5 text-label font-medium text-danger">
            <TriangleAlert aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.75} />
            {t.errors.failed}
          </p>
        ) : null}
      </AuthBody>
      <AuthActions className="px-5 pt-3.5 md:mt-8 md:px-0">
        <Button type="submit" loading={pending} loadingLabel={t.saving} loadingText className="w-full">
          {t.submit}
        </Button>
      </AuthActions>
    </form>
  );
}
