"use client";

import { CircleCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldShell, inputClasses, inputErrorClasses, TextField } from "@/components/ui/field";
import { PhotoField } from "@/features/trucks/photo-field";
import { findExpiry, readText } from "@/lib/ocr";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { licenceUploadTicket, sendLicence, type LicenceState } from "./actions";

const t = messages.drivers.licence;

/** D-ON-03 Driver's licence: a photo, the expiry date, and the number if they want to type it. */
export function LicenceForm({ home }: { home: string }) {
  // The expiry is read from the licence photo on the phone and only prefills the date (founder brief, section 4).
  async function prefillLicence(image: Blob) {
    const date = findExpiry(await readText(image));
    const input = document.getElementById("licence-expires") as HTMLInputElement | null;
    if (date && input && !input.value) input.value = date;
  }

  const [state, action, pending] = useActionState(sendLicence, { status: "idle", errors: {} } satisfies LicenceState);
  if (state.status === "sent") {
    return (
      <div className="flex flex-col items-start gap-4">
        <CircleCheck aria-hidden className="size-10 text-success" strokeWidth={1.5} />
        <p className="text-body text-ink">{t.sent}</p>
        <Link href={home} className={buttonVariants({ className: "w-full" })}>
          {t.home}
        </Link>
      </div>
    );
  }
  const e = state.errors;
  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <PhotoField name="licence" label={t.photo} help={t.photoHelp} ticket={licenceUploadTicket} bucket="fleet" error={e.photo ? t.errors.photo : undefined} onPicked={(image) => void prefillLicence(image)} />
      <FieldShell id="licence-expires" label={t.expires} error={e.expires === "expired" ? t.errors.expired : e.expires ? t.errors.expires : undefined}>
        <input id="licence-expires" name="expires" type="date" className={cn(inputClasses, e.expires && inputErrorClasses)} />
      </FieldShell>
      <TextField id="licence-number" name="number" label={t.number} autoCapitalize="characters" spellCheck={false} error={e.number ? t.errors.number : undefined} />
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
