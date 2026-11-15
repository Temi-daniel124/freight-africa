import messages from "@/messages/en.json";
import { formatNigerianPhone } from "@/lib/phone";
import type { EmailMessage } from "@/lib/email/sender";

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);

export function waitlistConfirmationEmail(to: string, name: string, phone: string): EmailMessage {
  const t = messages.email;
  const values = { name: name.split(/\s+/)[0], phone: `+234 ${formatNigerianPhone(phone)}`, contact: messages.site.contactEmail };
  const paragraphs = [fill(t.greeting, values), fill(t.body, values), t.why, fill(t.remove, values), t.signoff];

  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#F6F8F5;font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0F1A14">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid #E2E8E3;border-radius:24px">
<tr><td style="padding:32px 32px 8px;font-size:20px;font-weight:800;color:#0C5034">Freight Africa</td></tr>
${paragraphs.map((p) => `<tr><td style="padding:8px 32px;font-size:16px;line-height:26px">${escapeHtml(p)}</td></tr>`).join("\n")}
<tr><td style="padding:24px 32px 32px"><div style="height:3px;background:repeating-linear-gradient(90deg,#C9D3CC 0 12px,transparent 12px 22px)"></div></td></tr>
</table></td></tr></table></body></html>`;

  return { to, subject: t.subject, text: paragraphs.join("\n\n"), html };
}
