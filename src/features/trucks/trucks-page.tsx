import { Plus, Truck } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { StatusChip, type StatusTone } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPlate } from "@/lib/plate";
import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";

const t = messages.trucks.list;
const TONES: Record<string, StatusTone> = {
  draft: "danger",
  pending_review: "warning",
  active: "success",
  paused: "warning",
  suspended: "danger",
  retired: "info",
};

/** T-08 Trucks: every truck with its status, and Add a truck. */
export async function TrucksPage() {
  const supabase = await supabaseServer();
  const [{ data: trucks }, { data: types }] = await Promise.all([
    supabase
      .from("trucks")
      .select(
        "id, plate_number, truck_type_id, capacity_kg, status, photo_paths",
      )
      .neq("status", "retired")
      .order("created_at", { ascending: false }),
    supabase.from("truck_types").select("id, name"),
  ]);
  const typeName = new Map((types ?? []).map((type) => [type.id, type.name]));
  const add = (
    <Link
      href="/app/haul/trucks/new"
      className={buttonVariants({ size: "md" })}
    >
      <Plus aria-hidden strokeWidth={1.75} />
      {t.add}
    </Link>
  );
  if (!trucks?.length) {
    return (
      <section className="rounded-tile bg-surface shadow-raised lg:rounded-card">
        <EmptyState
          title={t.empty}
          art={
            <Truck
              aria-hidden
              className="size-10 text-green-700"
              strokeWidth={1.5}
            />
          }
          action={add}
        >
          {t.emptyText}
        </EmptyState>
      </section>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">{add}</div>
      <ul className="overflow-hidden rounded-tile bg-surface shadow-raised lg:rounded-card">
        {trucks.map((truck) => (
          <li
            key={truck.id}
            className="flex items-center gap-3 border-t border-line px-4 py-3.5 first:border-t-0 lg:px-6"
          >
            <span
              aria-hidden
              className="grid size-11 shrink-0 place-items-center rounded-inner bg-paper text-green-700"
            >
              <Truck className="size-5" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-body font-semibold tracking-kv text-ink tabular">
                {formatPlate(truck.plate_number)}
              </span>
              <span className="block truncate text-body-sm text-ink-2">
                {typeName.get(truck.truck_type_id)} ·{" "}
                {t.capacity.replace(
                  "{tonnes}",
                  String(truck.capacity_kg / 1000),
                )}
              </span>
            </span>
            <StatusChip
              tone={TONES[truck.status] ?? "info"}
              className="shrink-0"
            >
              {t.status[truck.status as keyof typeof t.status]}
            </StatusChip>
          </li>
        ))}
      </ul>
    </div>
  );
}
