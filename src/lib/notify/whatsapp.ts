import "server-only";

// WhatsApp Cloud API (D021). Only the sign-in code message exists so far; trip messages arrive in Phase 4.
// Business code calls CodeMessenger, never the Graph API directly (AGENT.md section 6).
export interface CodeMessenger {
  /** Delivers a sign-in code to a phone in E.164 form (+234…). Throws when it can't be sent. */
  sendCode(to: string, code: string): Promise<void>;
}

const GRAPH_VERSION = "v23.0";

export function whatsAppCodeMessenger(): CodeMessenger {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  // The approved "authentication" template in WhatsApp Manager, with a copy-code button.
  const template = process.env.WHATSAPP_AUTH_TEMPLATE || "sign_in_code";
  if (!token || !phoneNumberId) throw new Error("WhatsApp is not set up: WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID are missing");

  return {
    async sendCode(to, code) {
      const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to.replace(/^\+/, ""),
          type: "template",
          template: {
            name: template,
            language: { code: "en" },
            components: [
              { type: "body", parameters: [{ type: "text", text: code }] },
              { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
            ],
          },
        }),
      });
      // The response body can echo the phone number, so only the status is reported.
      if (!response.ok) throw new Error(`WhatsApp answered ${response.status}`);
    },
  };
}
