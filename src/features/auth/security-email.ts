import type { EmailMessage } from "@/lib/email/sender";
import messages from "@/messages/en.json";

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
const escape = (text: string) => text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** D044: "New sign-in on [device], [city]. Not you? Lock your account", and the PIN-locked notice. */
export type SecurityEmailKind = "newDevice" | "locked" | "twoStepLocked";

export function securityEmail(kind: SecurityEmailKind, to: string, device: string, city: string, lockLink: string): EmailMessage {
  const t = messages.auth.security;
  const where = city ? fill(t.where, { device, city }) : device;
  const subject = kind === "newDevice" ? fill(t.newDeviceSubject, { where }) : kind === "twoStepLocked" ? t.twoStepLockedSubject : t.lockedSubject;
  const intro = kind === "newDevice" ? fill(t.newDeviceIntro, { where }) : kind === "twoStepLocked" ? t.twoStepLockedIntro : t.lockedIntro;
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#F6F8F5;font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0F1A14">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid #E2E8E3;border-radius:24px">
<tr><td style="padding:32px 32px 8px;font-size:20px;font-weight:800;color:#0C5034">Freight Africa</td></tr>
<tr><td style="padding:8px 32px;font-size:16px;line-height:26px">${escape(intro)}</td></tr>
<tr><td style="padding:8px 32px;font-size:16px;line-height:26px">${escape(t.notYou)}</td></tr>
<tr><td style="padding:16px 32px"><a href="${escape(lockLink)}" style="display:inline-block;padding:14px 24px;border-radius:45px;background:#B42318;color:#FFFFFF;font-weight:700;text-decoration:none">${escape(t.lockButton)}</a></td></tr>
<tr><td style="padding:8px 32px 32px;font-size:14px;line-height:22px;color:#4A5A50">${escape(t.lockNote)}</td></tr>
</table></td></tr></table></body></html>`;
  return { to, subject, text: [intro, t.notYou, `${t.lockButton}: ${lockLink}`, t.lockNote].join("\n\n"), html };
}
