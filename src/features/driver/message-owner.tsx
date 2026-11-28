"use client";

import { Loader, MessageSquare, TriangleAlert, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SuccessCheck } from "@/components/ui/motion";
import { Sheet } from "@/components/ui/sheet";
import { sendDriverMessage } from "@/features/owner/actions";
import { supabaseBrowser } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { useMoving } from "./use-moving";

// DV32b Message your owner and DV32c Message sent (D051). A reason, a short text or a voice note; the
// owner never shows their number, and replies arrive in Notifications. Not live chat; SOS for danger.

const t = messages.driverMe;
const REASONS = ["repair", "day_off", "papers", "other"] as const;

export function MessageOwner({ orgId, orgName, userId }: { orgId: string; orgName: string; userId: string }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]>("repair");
  const [text, setText] = useState("");
  const [voice, setVoice] = useState<{ blob: Blob; seconds: number } | null>(null);
  const [recording, setRecording] = useState(false);
  const [pending, start] = useTransition();
  const recorder = useRef<MediaRecorder | null>(null);
  const startedAt = useRef(0);
  const moving = useMoving(open && !sent);

  const holdStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const parts: Blob[] = [];
      rec.ondataavailable = (e) => parts.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const seconds = Math.min(180, Math.max(1, Math.round((Date.now() - startedAt.current) / 1000)));
        setVoice({ blob: new Blob(parts, { type: rec.mimeType || "audio/webm" }), seconds });
        setRecording(false);
      };
      startedAt.current = Date.now();
      rec.start();
      recorder.current = rec;
      setRecording(true);
    } catch {
      toast.error(t.noMic);
    }
  };
  const holdEnd = () => {
    if (recorder.current?.state === "recording") recorder.current.stop();
  };

  const send = () =>
    start(async () => {
      let voicePath: string | undefined;
      if (voice) {
        const ext = voice.blob.type.includes("ogg") ? "ogg" : voice.blob.type.includes("mp4") ? "m4a" : "webm";
        voicePath = `${orgId}/${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabaseBrowser().storage.from("driver-voice").upload(voicePath, voice.blob, { contentType: voice.blob.type.split(";")[0] });
        if (error) return void toast.error(t.failed);
      }
      const r = await sendDriverMessage({ org: orgId, reason, body: text.trim(), voicePath, voiceSeconds: voice?.seconds });
      if (r.status !== "ok") return void toast.error(r.status === "limit" ? t.tooMany : t.failed);
      setText("");
      setVoice(null);
      setSent(true);
    });

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => (setOpen(o), o ? setSent(false) : null)}
      title={sent ? t.sentTitle : t.msgTitle.replace("{org}", orgName)}
      description={sent ? t.sentText.replace("{org}", orgName) : t.msgText}
      trigger={
        <Button variant="secondary" size="md" className="w-full">
          <MessageSquare aria-hidden className="size-4.5" strokeWidth={1.8} />
          {t.message.replace("{org}", orgName)}
        </Button>
      }
      actions={
        sent ? (
          <Button className="w-full" onClick={() => setOpen(false)}>
            {t.done}
          </Button>
        ) : (
          <Button className="h-17 w-full text-[17px]" loading={pending} disabled={!text.trim() && !voice} onClick={send}>
            {t.send}
          </Button>
        )
      }
    >
      {sent ? (
        <SuccessCheck label={t.sentTitle} className="my-4" />
      ) : (
        <div className="flex flex-col gap-3">
          <div role="radiogroup" aria-label={t.msgTitle} className="grid grid-cols-2 gap-2">
            {REASONS.map((r) => (
              <button key={r} type="button" role="radio" aria-checked={reason === r} onClick={() => setReason(r)} className={cn("h-13 rounded-pill border px-3 text-body font-semibold", reason === r ? "border-green-900 bg-green-900 text-white" : "border-line bg-surface text-ink")}>
                {messages.driverMessages.reasons[r]}
              </button>
            ))}
          </div>
          <label className="sr-only" htmlFor="driver-message">
            {t.placeholder}
          </label>
          {moving ? (
            <p role="status" className="rounded-callout bg-warning-100 px-4 py-3 text-body text-ink">
              {t.moving}
            </p>
          ) : null}
          <textarea id="driver-message" disabled={moving} rows={3} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder={t.placeholder} className="w-full rounded-card border border-line-field bg-surface px-4.5 py-4 text-[17px] text-ink outline-none focus:border-green-700 disabled:opacity-50" />
          {voice ? (
            <div className="flex items-center justify-between rounded-card bg-green-50 px-4.5 py-3.5 text-body font-semibold text-green-900">
              {t.recorded.replace("{d}", `${Math.floor(voice.seconds / 60)}:${String(voice.seconds % 60).padStart(2, "0")}`)}
              <button type="button" aria-label={t.removeVoice} onClick={() => setVoice(null)} className="grid size-10 place-items-center rounded-full text-ink-2">
                <X aria-hidden className="size-5" strokeWidth={1.8} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onPointerDown={holdStart}
              onPointerUp={holdEnd}
              onPointerLeave={holdEnd}
              className={cn("flex h-14 items-center justify-center gap-2.5 rounded-card text-body font-semibold", recording ? "bg-danger-100 text-danger" : "bg-green-50 text-green-800")}
            >
              <Loader aria-hidden className={cn("size-5", recording && "motion-safe:animate-spin")} strokeWidth={1.8} />
              {recording ? t.recording : t.hold}
            </button>
          )}
          <p className="flex items-center gap-2 rounded-callout bg-danger-50 px-4 py-3 text-meta text-danger">
            <TriangleAlert aria-hidden className="size-4.5 shrink-0" strokeWidth={1.8} />
            {t.sos}
          </p>
        </div>
      )}
    </Sheet>
  );
}
