"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import messages from "@/messages/en.json";
import { changeSetting, decideApproval, inviteStaff } from "./admin-actions";

const t = messages.staffAdmin;
const field = "w-full rounded-input border border-line-field px-3 py-2.5 text-control outline-none focus:border-green-700";

/** Every change: the effect in one sentence, a required reason, Confirm (combined brief 5d). */
function ReasonDialog({ label, title, effect, variant = "secondary", extra, onConfirm }: { label: string; title: string; effect: string; variant?: "secondary" | "primary"; extra?: (set: (v: string) => void) => ReactNode; onConfirm: (reason: string, value: string) => Promise<{ status: string }> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  const confirm = () =>
    start(async () => {
      const r = await onConfirm(reason, value);
      if (r.status === "ok" || r.status === "waiting") {
        toast.success(r.status === "waiting" ? t.settings.waiting : t.done);
        setOpen(false);
        setReason("");
        router.refresh();
      } else toast.error(r.status === "value" ? t.settings.badValue : r.status === "reason" ? t.reasonHint : r.status === "fresh" ? t.fresh : t.failed);
    });
  return (
    <>
      <Button variant={variant === "primary" ? undefined : "secondary"} size="sm" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={effect}
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button loading={pending} disabled={reason.trim().length < 5} onClick={confirm}>
              {t.confirm}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {extra?.(setValue)}
          <label className="text-label text-ink">
            {t.reason}
            <textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} className={`mt-1.5 ${field}`} />
          </label>
          <p className="text-caption text-ink-3">{t.reasonHint}</p>
        </div>
      </Dialog>
    </>
  );
}

export function SettingChange({ settingKey, current, money }: { settingKey: string; current: string; money: boolean }) {
  return (
    <ReasonDialog
      label={t.settings.change}
      title={t.settings.changeTitle.replace("{key}", settingKey)}
      effect={money ? t.fees.lead : t.settings.lead}
      extra={(set) => (
        <label className="text-label text-ink">
          {t.settings.value}
          <textarea rows={current.length > 40 ? 5 : 2} defaultValue={current} onChange={(e) => set(e.target.value)} onFocus={(e) => set(e.target.value)} className={`mt-1.5 font-mono text-body-sm ${field}`} />
          <span className="mt-1 block text-caption font-normal text-ink-3">{t.settings.valueHint}</span>
        </label>
      )}
      onConfirm={(reason, value) => changeSetting(settingKey, value || current, reason)}
    />
  );
}

export function DecideButtons({ id }: { id: string }) {
  return (
    <div className="flex gap-2">
      <ReasonDialog label={t.approvals.reject} title={t.approvals.rejectTitle} effect={t.approvals.rejectEffect} onConfirm={(reason) => decideApproval(id, false, reason)} />
      <ReasonDialog label={t.approvals.approve} title={t.approvals.approveTitle} effect={t.approvals.approveEffect} variant="primary" onConfirm={(reason) => decideApproval(id, true, reason)} />
    </div>
  );
}

export function InviteStaff({ roles }: { roles: { value: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(roles[0]?.value ?? "support");
  const [pending, start] = useTransition();
  const send = () =>
    start(async () => {
      const r = await inviteStaff(email, role);
      if (r.status === "ok") {
        toast.success(t.team.sent);
        setOpen(false);
        setEmail("");
        router.refresh();
      } else if (r.status === "notSent") {
        toast.error(t.team.notSent);
        setOpen(false);
        router.refresh();
      } else toast.error(r.status === "value" ? t.team.badEmail : r.status === "fresh" ? t.fresh : t.failed);
    });
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        {t.team.invite}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t.team.inviteTitle}
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t.cancel}
            </Button>
            <Button loading={pending} disabled={!email.includes("@")} onClick={send}>
              {t.team.invite}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <label className="text-label text-ink">
            {t.team.email}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={`mt-1.5 ${field}`} />
          </label>
          <label className="text-label text-ink">
            {t.team.role}
            <select value={role} onChange={(e) => setRole(e.target.value)} className={`mt-1.5 h-12 ${field}`}>
              {roles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Dialog>
    </>
  );
}
