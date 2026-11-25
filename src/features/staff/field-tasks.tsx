import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { InspectForm } from "./inspect-form";

const t = messages.tasks;
const day = new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" });

/** X-30 Tasks: the inspections assigned to me, each with the truck, its owner and the checklist. */
export async function FieldTasks() {
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  const { data: tasks } = await supabase.from("field_tasks").select("id, subject_id, due_at, status").eq("assigned_to", claims?.claims?.sub ?? "").eq("status", "open").order("due_at");
  if (!tasks?.length) return <p className="rounded-card bg-surface p-6 text-body text-ink-2 shadow-raised">{t.empty}</p>;
  const { data: trucks } = await supabase.from("trucks").select("id, plate_number, org:organizations(name)").in("id", tasks.map((x) => x.subject_id));
  const byId = new Map((trucks ?? []).map((x) => [x.id, x]));
  return (
    <ul className="flex flex-col gap-4">
      {tasks.map((task) => {
        const truck = byId.get(task.subject_id);
        return (
          <li key={task.id} className="flex flex-col gap-3 rounded-card bg-surface p-5 shadow-raised">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-title-3 text-ink">{t.truck.replace("{plate}", truck?.plate_number ?? "")}</h2>
              <p className="text-body-sm text-ink-2">{t.due.replace("{date}", day.format(new Date(task.due_at)))}</p>
            </div>
            <p className="text-body-sm text-ink-2">
              {t.owner}: {(truck?.org as unknown as { name: string } | null)?.name ?? "—"}
            </p>
            <InspectForm taskId={task.id} />
          </li>
        );
      })}
    </ul>
  );
}
