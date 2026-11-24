"use client";

import { Camera, TriangleAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { shrinkImage } from "@/lib/shrink-image";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";

const t = messages.trucks.add;

type Ticket =
  { status: "ok"; path: string; token: string } | { status: "error" };

/**
 * One photo: the camera (or a file), a preview, Retake. The photo goes straight to private storage with a
 * one-time address; the form only carries its path in a hidden field named `name`.
 */
export function PhotoField({
  name,
  label,
  help,
  error,
  ticket,
  bucket,
  compact = false,
  onUploaded,
}: {
  name: string;
  label: string;
  help?: string;
  error?: string;
  ticket: () => Promise<Ticket>;
  bucket: string;
  compact?: boolean;
  onUploaded?: (path: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [path, setPath] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(
    () => () => (preview ? URL.revokeObjectURL(preview) : undefined),
    [preview],
  );

  async function choose(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setFailed(false);
    setPath("");
    try {
      const blob = await shrinkImage(file);
      setPreview(URL.createObjectURL(blob));
      const t1 = await ticket();
      if (t1.status !== "ok") throw new Error("ticket");
      const { error: uploadError } = await supabaseBrowser()
        .storage.from(bucket)
        .uploadToSignedUrl(t1.path, t1.token, blob, {
          contentType: "image/jpeg",
        });
      if (uploadError) throw uploadError;
      setPath(t1.path);
      onUploaded?.(t1.path);
    } catch {
      setPreview(null);
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  const id = `photo-${name}`;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-label text-ink" id={`${id}-label`}>
        {label}
      </span>
      <input type="hidden" name={name} value={path} />
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-labelledby={`${id}-label`}
        onChange={(event) => void choose(event.target.files?.[0])}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className={cn(
            "w-full rounded-inner border border-line bg-paper object-cover",
            compact ? "aspect-[4/3]" : "aspect-[3/2]",
          )}
        />
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(
            "flex w-full flex-col items-center justify-center gap-2 rounded-inner border border-dashed bg-paper text-body-sm font-semibold text-green-700 hover:border-green-700",
            compact ? "aspect-[4/3]" : "aspect-[3/2]",
            error ? "border-danger" : "border-line-strong",
          )}
        >
          <Camera aria-hidden className="size-7" strokeWidth={1.5} />
          {busy ? t.uploading : t.takePhoto}
        </button>
      )}
      {help ? (
        <p className="text-label font-normal text-ink-3">{help}</p>
      ) : null}
      {preview ? (
        <Button
          variant="secondary"
          size="md"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="self-start"
        >
          {busy ? t.uploading : t.retake}
        </Button>
      ) : null}
      {failed || error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-label font-medium text-danger"
        >
          <TriangleAlert
            aria-hidden
            className="mt-px size-4 shrink-0"
            strokeWidth={1.75}
          />
          {failed ? t.errors.upload : error}
        </p>
      ) : null}
    </div>
  );
}
