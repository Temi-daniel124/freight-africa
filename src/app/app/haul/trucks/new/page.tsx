import { connection } from "next/server";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { shellMetadata, ShellSubpage } from "@/features/shell/routes";
import { AddTruckForm } from "@/features/trucks/add-truck-form";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

export const metadata = { ...shellMetadata, title: messages.trucks.add.title };

async function Form() {
  await connection();
  const supabase = await supabaseServer();
  const [{ data: types }, { data: links }, { data: goods }, { data: papers }, { data: corridors }, { data: accounts }] = await Promise.all([
    supabase.from("truck_types").select("id, name, capacity_kg_min, capacity_kg_max, capacity_kg_default").eq("active", true).order("sort_order"),
    supabase.from("truck_type_goods").select("truck_type_id, goods_category_id"),
    supabase.from("goods_categories").select("id, name").eq("active", true).not("parent_id", "is", null).eq("is_banned", false).order("sort_order"),
    supabase.from("document_types").select("code, name, required").in("code", ["vehicle_licence", "roadworthiness", "insurance_third_party", "goods_in_transit"]),
    supabase.from("corridors").select("id, name").eq("active", true).order("name"),
    supabase.rpc("my_accounts"),
  ]);
  const org = (accounts ?? []).find((row) => row.kind === "transporter" && (row.role === "owner" || row.role === "manager"));
  const { data: orgRow } = org ? await supabase.from("organizations").select("corridor_ids").eq("id", org.org_id).maybeSingle() : { data: null };
  const order = ["vehicle_licence", "roadworthiness", "insurance_third_party", "goods_in_transit"];
  return (
    <div className="mx-auto w-full max-w-160 rounded-tile bg-surface p-5 shadow-raised lg:rounded-card lg:p-8">
      <p className="mb-5 text-body text-ink-2">{messages.trucks.add.lead}</p>
      <AddTruckForm
        types={(types ?? []).map((type) => ({
          id: type.id,
          name: type.name,
          min: type.capacity_kg_min,
          max: type.capacity_kg_max,
          usual: type.capacity_kg_default,
          goods: (links ?? []).filter((link) => link.truck_type_id === type.id).map((link) => link.goods_category_id),
        }))}
        goods={goods ?? []}
        papers={[...(papers ?? [])].sort((a, b) => order.indexOf(a.code) - order.indexOf(b.code))}
        corridors={corridors ?? []}
        defaultRoutes={orgRow?.corridor_ids ?? []}
      />
    </div>
  );
}

// T-09 Add a truck (ux-owner.md), also step 4 of the transporter setup (T-ON-05).
export default function AddTruckPage() {
  return (
    <ShellSubpage role="owner" title={messages.trucks.add.title}>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-card" />}>
        <Form />
      </Suspense>
    </ShellSubpage>
  );
}
