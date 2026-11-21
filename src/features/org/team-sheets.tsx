"use client";

import { Copy, MessageCircle, Plus, TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { Sheet } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import messages from "@/messages/en.json";
import { changeMemberRole, createInvite, removeMember, type ActionState, type InviteState } from "./actions";

const t = messages.org.team;
const roleNames = messages.org.roles;
const roleHelp = messages.org.roleHelp;
type Role = keyof typeof roleNames;

/** Role chips with one line each (S-20), as radio buttons so the keyboard and screen readers work. */
function RoleChoice({ roles, value, onChange, name }: { roles: Role[]; value: Role; onChange: (role: Role) => void; name: string }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label text-ink">{t.roleLabel}</legend>
      {roles.map((role) => (
        <label
          key={role}
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-field border px-4 py-3 transition-colors",
            value === role ? "border-green-700 bg-green-50" : "border-line-strong hover:bg-paper",
          )}
        >
          <input type="radio" name={name} value={role} checked={value === role} onChange={() => onChange(role)} className="mt-1 accent-green-700" />
          <span>
            <span className="block text-body font-semibold text-ink">{roleNames[role]}</span>
            <span className="block text-label font-normal text-ink-2">{roleHelp[role]}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

function ErrorLine({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-start gap-1.5 text-label font-medium text-danger">
      <TriangleAlert aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.75} />
      {message}
    </p>
  );
}

export function InviteSheet({ orgId, orgName, roles }: { orgId: string; orgName: string; roles: Role[] }) {
  const [state, action, pending] = useActionState<InviteState, FormData>(createInvite, { status: "idle" });
  const [role, setRole] = useState<Role>(roles.includes("booker") ? "booker" : roles[0]);
  const [copied, setCopied] = useState(false);
  const share = state.link ? t.shareMessage.replace("{org}", orgName).replace("{role}", state.role ?? "").replace("{link}", state.link) : "";
  return (
    <Sheet
      title={state.link ? t.created : t.inviteTitle}
      description={state.link ? t.createdText.replace("{who}", state.who ?? "") : t.inviteText}
      trigger={
        <Button size="md">
          <Plus aria-hidden strokeWidth={1.75} />
          {t.invite}
        </Button>
      }
    >
      {state.link ? (
        <div className="flex flex-col gap-2">
          <p className="rounded-field border border-line bg-paper px-4 py-3 text-label font-normal break-all text-ink">{state.link}</p>
          <Button
            size="md"
            variant="secondary"
            className="w-full"
            onClick={async () => {
              await navigator.clipboard.writeText(state.link ?? "");
              setCopied(true);
            }}
          >
            <Copy aria-hidden strokeWidth={1.75} />
            {copied ? t.copied : t.copy}
          </Button>
          <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "md" }), "w-full")}>
            <MessageCircle aria-hidden strokeWidth={1.75} />
            {t.shareWhatsApp}
          </a>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-4" noValidate>
          <input type="hidden" name="org" value={orgId} />
          <TextField
            key={state.attempt}
            id="invite-contact"
            name="contact"
            label={t.contactLabel}
            placeholder={t.contactPlaceholder}
            autoComplete="off"
            error={state.contactError ? state.message : undefined}
          />
          <RoleChoice roles={roles} value={role} onChange={setRole} name="role" />
          {state.contactError ? null : <ErrorLine message={state.message} />}
          <Button type="submit" size="md" className="w-full" loading={pending} loadingText loadingLabel={t.sending}>
            {t.send}
          </Button>
        </form>
      )}
    </Sheet>
  );
}

type MemberSheetProps = { orgId: string; orgName: string; userId: string; name: string; role: Role; roles: Role[]; isMe: boolean };

/** Change someone's role, or remove them (S-20). Drivers are added and removed, never changed. */
export function MemberSheet({ orgId, orgName, userId, name, role, roles, isMe }: MemberSheetProps) {
  const [roleState, roleAction, savingRole] = useActionState<ActionState, FormData>(changeMemberRole, { status: "idle" });
  const [removeState, removeAction, removing] = useActionState<ActionState, FormData>(removeMember, { status: "idle" });
  const [choice, setChoice] = useState<Role>(role);
  const changeable = role !== "driver" && roles.filter((r) => r !== "driver").length > 1 && !isMe;
  return (
    <Sheet
      title={name}
      description={roleNames[role]}
      trigger={
        <Button size="sm" variant="secondary" aria-label={`${isMe ? t.leave : t.manage}: ${name}`}>
          {isMe ? t.leaveShort : t.manageShort}
        </Button>
      }
    >
      {changeable ? (
        <form action={roleAction} className="mb-4 flex flex-col gap-3">
          <input type="hidden" name="org" value={orgId} />
          <input type="hidden" name="user" value={userId} />
          <RoleChoice roles={roles.filter((r) => r !== "driver")} value={choice} onChange={setChoice} name="role" />
          <ErrorLine message={roleState.message} />
          <Button type="submit" size="md" className="w-full" loading={savingRole} loadingText loadingLabel={t.sending} disabled={choice === role}>
            {t.save}
          </Button>
        </form>
      ) : null}
      <form action={removeAction} className="flex flex-col gap-2">
        <input type="hidden" name="org" value={orgId} />
        <input type="hidden" name="user" value={userId} />
        <p className="text-body-sm font-normal text-ink-2">{isMe ? t.leave : t.removeConfirm.replace("{name}", name).replace("{org}", orgName)}</p>
        <ErrorLine message={removeState.message} />
        <Button type="submit" size="md" variant="destructive" className="w-full" loading={removing} loadingText loadingLabel={t.sending}>
          {isMe ? t.leave : t.remove}
        </Button>
      </form>
    </Sheet>
  );
}
