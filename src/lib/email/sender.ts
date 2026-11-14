import "server-only";
import { Resend } from "resend";
import { serverEnv } from "@/lib/env.server";

export type EmailMessage = { to: string; subject: string; text: string; html: string };

// Business code depends on this interface, never on the Resend SDK (AGENT.md section 6).
export interface EmailSender {
  send(message: EmailMessage): Promise<void>;
}

export function resendEmailSender(): EmailSender {
  const env = serverEnv();
  if (!env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  const resend = new Resend(env.RESEND_API_KEY);
  return {
    async send({ to, subject, text, html }) {
      const { error } = await resend.emails.send({ from: env.EMAIL_FROM, to, subject, text, html });
      if (error) throw new Error(`Email not sent: ${error.name}`);
    },
  };
}
