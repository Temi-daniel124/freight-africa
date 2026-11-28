import { BadgeCheck } from "lucide-react";
import { shells } from "@/features/shell/config";
import { getViewer } from "@/features/shell/viewer";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

/** D041: once an owner of the sending business is verified, More says so (Home follows the mockups, P07/D02). */
export async function VerifiedSender() {
  const viewer = await getViewer(shells.shipper);
  if (!viewer.orgId) return null;
  const { data: verified } = await (await supabaseServer()).rpc("is_verified_sender", { p_org: viewer.orgId });
  if (!verified) return null;
  return (
    <p className="flex items-center gap-1.5 self-start rounded-pill bg-success-100 px-3 py-1.5 text-label font-semibold text-success">
      <BadgeCheck aria-hidden className="size-4" strokeWidth={2} />
      {messages.shell.verifiedSender}
    </p>
  );
}
