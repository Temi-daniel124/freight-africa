import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { requireUnlocked } from "@/features/auth/unlock";
import type { FleetTruck } from "@/features/home/owner-home";
import { LoadDetail, type LoadDetailProps } from "@/features/owner/load-detail";
import { slotOf, toBoardLoad } from "@/features/owner/load-cards";
import { dayLabel } from "@/features/checkout/data";
import { shells } from "@/features/shell/config";
import { shellMetadata, ShellSubpage } from "@/features/shell/routes";
import { getViewer } from "@/features/shell/viewer";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.shell.pages.loads.title };

async function Body({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUnlocked("/app/haul");
  const { orgId } = await getViewer(shells.owner);
  if (!orgId) notFound();
  const supabase = await supabaseServer();
  const [{ data: board }, { data: fleet }, { data: team }, { data: org }, { data: rates }] = await Promise.all([
    supabase.rpc("load_board", { p_org: orgId }),
    supabase.rpc("fleet", { p_org: orgId }),
    supabase.rpc("team_members", { p_org: orgId }),
    supabase.from("organizations").select("tier").eq("id", orgId).maybeSingle(),
    supabaseAdmin().from("settings").select("key, value").in("key", ["advance_bps", "commission_bps"]),
  ]);
  const row = (board ?? []).find((l) => l.load_id === id);
  if (!row) notFound();
  const trucks = (fleet ?? []) as FleetTruck[];
  const load = toBoardLoad(row, trucks);
  const tier = (org?.tier ?? "new") as "new" | "established" | "gold";
  const bps = (key: string) => Number(((rates ?? []).find((r) => r.key === key)?.value as Record<string, number> | undefined)?.[tier] ?? 0);
  const props: LoadDetailProps = {
    load: { ...load, when: `${dayLabel(load.pickupFrom)}, ${slotOf(load.pickupFrom)}` },
    tierLabel: messages.owner.tier[tier],
    commissionBps: load.freightKobo > 0 ? Math.round(((load.freightKobo - load.payoutKobo) / load.freightKobo) * 10000) : bps("commission_bps"),
    advanceBps: bps("advance_bps"),
    trucks: trucks.map((x) => ({
      id: x.truck_id,
      plate: x.plate.replace(/^([A-Z]{3})(\d{3})([A-Z]{2})$/, "$1 $2 $3"),
      type: x.truck_type,
      capacityKg: x.capacity_kg,
      busy: !!x.trip_id || x.status !== "active" || x.availability === "unavailable",
      driverName: x.driver_name,
    })),
    drivers: (team ?? []).filter((d) => d.is_driver && d.status === "active").map((d) => ({ id: d.user_id, name: d.is_me ? messages.loads.meDriving : (d.full_name ?? "") })),
  };
  return <LoadDetail {...props} />;
}

// O13 / O13e / OD02 panel: one load, the money card, the truck and driver, accept or offer a price.
export default function LoadPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <ShellSubpage role="owner" title={messages.shell.pages.loads.title} flush>
      <Suspense fallback={<Skeleton className="m-4 h-96 rounded-card" />}>
        <Body params={params} />
      </Suspense>
    </ShellSubpage>
  );
}
