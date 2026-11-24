"use client";

import { Camera, CircleCheck, Lock, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { FieldShell, inputClasses, inputErrorClasses, TextField } from "@/components/ui/field";
import { shrinkImage as shrink } from "@/lib/shrink-image";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import type { CheckPurpose } from "@/lib/verification/provider";
import { identityUploadTicket, submitIdentity, type IdentityState } from "./actions";

const t = messages.onboarding.identity;

function ErrorLine({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <p id={id} role="alert" className="flex items-start gap-1.5 text-label font-medium text-danger">
      <TriangleAlert aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.75} />
      {children}
    </p>
  );
}

/** The identity check (mockup 2.3): ID type, name as on the ID, a photo with a preview, Submit for checking. */
export function IdentityForm({ purpose, home }: { purpose: CheckPurpose; home: string }) {
  const [state, action, pending] = useActionState(submitIdentity, { status: "idle", errors: {} } satisfies IdentityState);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => () => (preview ? URL.revokeObjectURL(preview) : undefined), [preview]);

  async function choose(file: File | undefined) {
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    setPhotoPath("");
    try {
      const blob = await shrink(file);
      if (blob.size > 8 * 1024 * 1024) throw new Error("too big");
      setPreview(URL.createObjectURL(blob));
      const ticket = await identityUploadTicket();
      if (ticket.status !== "ok") throw new Error("ticket");
      const { error } = await supabaseBrowser().storage.from("verification").uploadToSignedUrl(ticket.path, ticket.token, blob, { contentType: "image/jpeg" });
      if (error) throw error;
      setPhotoPath(ticket.path);
    } catch (error) {
      setPreview(null);
      setUploadError(error instanceof Error && error.message === "too big" ? t.errors.tooBig : t.errors.failed);
    } finally {
      setUploading(false);
    }
  }

  if (state.status === "sent" || state.status === "waiting") {
    return (
      <div className="flex flex-col items-start gap-4">
        <CircleCheck aria-hidden className="size-10 text-success" strokeWidth={1.5} />
        <div className="flex flex-col gap-1">
          <h2 className="text-title-2 text-ink">{state.status === "sent" ? t.sent.title : t.waiting.title}</h2>
          <p className="text-body text-ink-2">{state.status === "sent" ? t.sent.text : t.waiting.text}</p>
        </div>
        <Link href={home} className={buttonVariants({ className: "w-full" })}>
          {t.sent.home}
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <input type="hidden" name="purpose" value={purpose} />
      <input type="hidden" name="photoPath" value={photoPath} />
      <FieldShell id="identity-type" label={t.idType} error={state.errors.idType ? t.errors.idType : undefined}>
        <select
          id="identity-type"
          name="idType"
          defaultValue="nin_slip"
          aria-invalid={state.errors.idType ? true : undefined}
          className={cn(inputClasses, state.errors.idType && inputErrorClasses, "appearance-auto")}
        >
          {Object.entries(t.idTypes).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FieldShell>
      <TextField
        id="identity-name"
        name="name"
        label={t.nameOnId}
        autoComplete="name"
        autoCapitalize="characters"
        error={state.errors.name ? t.errors.name : undefined}
      />
      <div className="flex flex-col gap-2">
        <span className="text-label text-ink">{t.photo}</span>
        <input ref={input} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} onChange={(event) => void choose(event.target.files?.[0])} />
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="aspect-[3/2] w-full rounded-inner border border-line bg-paper object-contain" />
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex aspect-[3/2] w-full flex-col items-center justify-center gap-2 rounded-inner border border-dashed border-line-strong bg-paper text-body-sm font-semibold text-green-700 hover:border-green-700"
          >
            <Camera aria-hidden className="size-8" strokeWidth={1.5} />
            {t.takePhoto}
          </button>
        )}
        <p className="text-label font-normal text-ink-3">{t.photoHelp}</p>
        {preview ? (
          <Button variant="secondary" size="md" onClick={() => input.current?.click()} disabled={uploading} className="self-start">
            {t.retake}
          </Button>
        ) : null}
        {uploadError ? <ErrorLine>{uploadError}</ErrorLine> : null}
        {state.errors.photo && !photoPath ? <ErrorLine>{t.errors.photo}</ErrorLine> : null}
      </div>
      <p className="flex items-start gap-2.5 text-body-sm text-ink-2">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-green-700" strokeWidth={1.75} />
        {t.privacy}
      </p>
      {state.status === "error" ? <ErrorLine>{t.errors.failed}</ErrorLine> : null}
      <Button type="submit" loading={pending || uploading} loadingLabel={t.saving} loadingText className="w-full" disabled={uploading}>
        {t.submit}
      </Button>
    </form>
  );
}
