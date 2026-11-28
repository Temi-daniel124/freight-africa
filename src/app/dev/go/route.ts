import { notFound, redirect } from "next/navigation";
import { toAccounts } from "@/features/org/accounts";
import { supabaseServer } from "@/lib/supabase/server";

// Compare previews (closing brief §2): opens the signed-in demo account's own latest record, so detail
// screens are checked with real data. ?to=haul-load|haul-trip|haul-payout|haul-truck|haul-tracker|
// haul-message|ship-trip|ship-receipt, and ?then=<query> is added to the page address. Preview and
// development only; RLS decides what can be found.
export async function GET(request: Request) {
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  const url = new URL(request.url);
  const to = url.searchParams.get("to") ?? "";
  const then = url.searchParams.get("then");
  const supabase = await supabaseServer();
  if (to === "staff-trip") {
    // Staff read every trip (RLS: is_staff); the newest live one first.
    const { data } = await supabase.from("trips").select("id").order("created_at", { ascending: false }).limit(1);
    if (!data?.[0]) notFound();
    redirect(`/admin/trips?trip=${data[0].id}${then ? `&${then}` : ""}`);
  }
  const { data: rows } = await supabase.rpc("my_accounts");
  const org = toAccounts(rows ?? []).find((a) => a.active)?.orgId;
  if (!org) notFound();
  const first = async (q: PromiseLike<{ data: { id: string }[] | null }>) => (await q).data?.[0]?.id;
  let path: string | null = null;
  if (to === "haul-load") {
    const { data } = await supabase.rpc("load_board", { p_org: org });
    const id = (data as { load_id?: string; id?: string }[] | null)?.[0];
    path = id ? `/app/haul/loads/${id.load_id ?? id.id}` : null;
  } else if (to === "haul-trip") {
    const id = await first(supabase.from("trips").select("id").eq("transporter_org_id", org).order("created_at", { ascending: false }).limit(1));
    path = id ? `/app/haul/trips/${id}` : null;
  } else if (to === "haul-payout") {
    const id = await first(supabase.from("payouts").select("id").eq("org_id", org).order("created_at", { ascending: false }).limit(1));
    path = id ? `/app/haul/earnings/${id}` : null;
  } else if (to === "haul-truck" || to === "haul-tracker") {
    const id = await first(supabase.from("trucks").select("id").eq("org_id", org).order("created_at").limit(1));
    path = id ? `/app/haul/trucks/${id}${to === "haul-tracker" ? "/tracker" : ""}` : null;
  } else if (to === "haul-message") {
    const id = await first(supabase.from("driver_messages").select("id").eq("org_id", org).order("created_at", { ascending: false }).limit(1));
    path = id ? `/app/haul/messages/${id}` : null;
  } else if (to === "ship-trip") {
    const id = await first(supabase.from("loads").select("id").eq("shipper_org_id", org).not("status", "in", "(draft,awaiting_payment,expired)").order("created_at", { ascending: false }).limit(1));
    path = id ? `/app/ship/trips/${id}` : null;
  } else if (to === "ship-receipt") {
    const id = await first(supabase.from("payments").select("id").eq("shipper_org_id", org).gt("received_kobo", 0).order("received_at", { ascending: false }).limit(1));
    path = id ? `/app/ship/receipts/${id}` : null;
  }
  if (!path) notFound();
  redirect(then ? `${path}?${then}` : path);
}
