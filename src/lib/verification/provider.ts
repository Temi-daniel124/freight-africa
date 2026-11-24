import "server-only";

// Identity checks sit behind this interface (AGENT.md §6; D039). Business code asks for "the provider"
// and never imports a vendor SDK. Today only the demo provider works: the person uploads a photo of
// their ID and verification staff decide. Didit switches on when DIDIT_API_KEY and its workflows exist.

export type CheckPurpose = "sender" | "owner" | "driver" | "agent";

export type VerificationProvider =
  | {
      kind: "demo";
      /** The person uploads an ID photo; staff approve or decline it in the console. */
      flow: "photo";
    }
  | {
      kind: "didit";
      /** The person is sent to the provider's page; its webhook decides. */
      flow: "redirect";
      startSession: (input: { userId: string; purpose: CheckPurpose; returnUrl: string }) => Promise<{ url: string; sessionId: string }>;
    };

/** The demo provider works off production, or for demo accounts anywhere (D039). */
export function demoAllowed(isDemoAccount: boolean) {
  return process.env.VERCEL_ENV !== "production" || isDemoAccount;
}

/**
 * Which provider serves this person, or null when none is ready yet (production, a real account, no
 * Didit keys): the screen then says identity checks open soon, and nothing else is blocked.
 */
export function verificationProvider(isDemoAccount: boolean): VerificationProvider | null {
  if (process.env.DIDIT_API_KEY && process.env.DIDIT_WORKFLOW_OWNER) return didit();
  if (demoAllowed(isDemoAccount)) return { kind: "demo", flow: "photo" };
  return null;
}

function didit(): VerificationProvider {
  return {
    kind: "didit",
    flow: "redirect",
    async startSession() {
      // Built when the Didit account, API key, webhook secret and workflows exist (PROJECT-STATE §4).
      throw new Error("Didit is not connected yet");
    },
  };
}
