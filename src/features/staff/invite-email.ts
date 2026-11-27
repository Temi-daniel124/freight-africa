import "server-only";
import { resendEmailSender } from "@/lib/email/sender";
import messages from "@/messages/en.json";

const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** X00a: the staff invite link, by email only (staff join from the link; D044). */
export async function sendStaffInviteEmail(to: string, link: string) {
  const t = messages.staffAdmin.inviteEmail;
  try {
    await resendEmailSender().send({
      to,
      subject: t.subject,
      text: `${t.body}\n\n${link}\n\n${t.expires}`,
      html: `<p>${escape(t.body)}</p><p><a href="${escape(link)}">${escape(t.cta)}</a></p><p>${escape(t.expires)}</p>`,
      idempotencyKey: `staff-invite:${link.split("/").pop()}`,
    });
  } catch (error) {
    console.error("staff invite email failed", error instanceof Error ? error.message : "unknown");
  }
}
