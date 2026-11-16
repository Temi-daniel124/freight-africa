import messages from "@/messages/en.json";
import type { EmailMessage } from "@/lib/email/sender";

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");

/** The sign-in code email. The code is digits only, so nothing here needs escaping. */
export function signInCodeEmail(to: string, code: string): EmailMessage {
  const t = messages.auth.email;
  const shown = code.replace(/\D/g, "");
  const html = `<!doctype html><html lang="en"><body style="margin:0;background:#F6F8F5;font-family:-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;color:#0F1A14">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border:1px solid #E2E8E3;border-radius:24px">
<tr><td style="padding:32px 32px 8px;font-size:20px;font-weight:800;color:#0C5034">Freight Africa</td></tr>
<tr><td style="padding:8px 32px;font-size:16px;line-height:26px">${t.intro}</td></tr>
<tr><td style="padding:8px 32px"><div style="display:inline-block;padding:12px 20px;border-radius:16px;background:#EEF5F0;font-size:32px;line-height:40px;font-weight:700;letter-spacing:6px;color:#0C5034">${shown}</div></td></tr>
<tr><td style="padding:8px 32px;font-size:16px;line-height:26px">${t.note}</td></tr>
<tr><td style="padding:8px 32px;font-size:16px;line-height:26px">${t.signoff}</td></tr>
<tr><td style="padding:24px 32px 32px"><div style="height:3px;background:repeating-linear-gradient(90deg,#C9D3CC 0 12px,transparent 12px 22px)"></div></td></tr>
</table></td></tr></table></body></html>`;

  return {
    to,
    subject: fill(t.subject, { code: shown }),
    text: [t.intro, shown, t.note, t.signoff].join("\n\n"),
    html,
  };
}
