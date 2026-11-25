"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import messages from "@/messages/en.json";
import { completeInspection, sendInspection } from "./inspect-actions";

const t = messages.tasks;
const KEYS = ["plate_matches", "roadworthy", "tarpaulin", "tyres"] as const;

/** X-30 Inspect a truck: the checklist, then Pass or Report a problem (with what the problem is). */
export function InspectForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [problem, setProblem] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const save = (pass: boolean) =>
    start(async () => {
      const ok = await completeInspection(taskId, checks, pass, note);
      if (ok) toast.success(t.done);
      else toast.error(t.failed);
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-label text-ink">{t.checklist}</legend>
        {KEYS.map((key) => (
          <label key={key} className="flex min-h-11 cursor-pointer items-center gap-3 text-body-sm text-ink">
            <input type="checkbox" className="size-5 accent-green-700" checked={!!checks[key]} onChange={(e) => setChecks((c) => ({ ...c, [key]: e.target.checked }))} />
            {t.checks[key]}
          </label>
        ))}
      </fieldset>
      {problem ? <TextField id={`note-${taskId}`} label={t.problemNote} value={note} onChange={(e) => setNote(e.target.value)} /> : null}
      <div className="flex flex-wrap gap-2">
        <Button size="md" loading={pending} disabled={problem} onClick={() => save(true)}>
          {t.pass}
        </Button>
        <Button size="md" variant={problem ? "destructive" : "secondary"} loading={pending} onClick={() => (problem ? save(false) : setProblem(true))}>
          {t.problem}
        </Button>
      </div>
    </div>
  );
}

/** Verification: send a field agent to inspect this truck. */
export function SendInspection({ truckId, agents }: { truckId: string; agents: { id: string; name: string }[] }) {
  const [agent, setAgent] = useState(agents[0]?.id ?? "");
  const [pending, start] = useTransition();
  if (!agents.length) return null;
  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1 text-caption text-ink-2">
        {t.agent}
        <select value={agent} onChange={(e) => setAgent(e.target.value)} className="h-11 rounded-field border border-line-strong bg-surface px-3 text-body-sm">
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <Button size="md" variant="secondary" loading={pending} onClick={() => start(async () => { const ok = await sendInspection(truckId, agent); if (ok) toast.success(t.sent); else toast.error(t.failed); })}>
        {t.send}
      </Button>
    </div>
  );
}
