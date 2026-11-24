import { supabaseServer } from "@/lib/supabase/server";
import messages from "@/messages/en.json";
import { DecideForm } from "./decide-form";

const t = messages.shell.staff.verification;
const date = new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeZone: "Africa/Lagos" });

/**
 * Trucks waiting for their own approval, and papers waiting to be checked (ux-admin verification queue).
 * A truck goes live once it and its three required papers are approved (the database decides).
 */
export async function FleetQueue() {
  const supabase = await supabaseServer();
  const [{ data: trucks }, { data: docs }, { data: types }, { data: docTypes }] = await Promise.all([
    supabase.from("trucks").select("id, org_id, plate_number, truck_type_id, capacity_kg, photo_paths, created_at").eq("status", "pending_review").is("approved_at", null).order("created_at").limit(30),
    supabase.from("documents").select("id, org_id, subject_kind, subject_id, doc_type_id, file_path, expires_on, created_at").eq("status", "pending").order("created_at").limit(60),
    supabase.from("truck_types").select("id, name"),
    supabase.from("document_types").select("id, name"),
  ]);
  if (!trucks?.length && !docs?.length) {
    return <p className="rounded-tile bg-surface p-6 text-body text-ink-2 shadow-raised lg:rounded-card">{t.truckEmpty}</p>;
  }
  const orgIds = [...new Set([...(trucks ?? []).map((x) => x.org_id), ...(docs ?? []).map((x) => x.org_id)])];
  const truckIds = [...new Set((docs ?? []).filter((d) => d.subject_kind === "truck").map((d) => d.subject_id))];
  const [{ data: orgs }, { data: docTrucks }, { data: links }] = await Promise.all([
    supabase.from("organizations").select("id, name").in("id", orgIds),
    supabase.from("trucks").select("id, plate_number").in("id", truckIds.length ? truckIds : ["00000000-0000-0000-0000-000000000000"]),
    supabase.storage.from("fleet").createSignedUrls([...(trucks ?? []).flatMap((x) => x.photo_paths), ...(docs ?? []).map((d) => d.file_path)], 600),
  ]);
  const orgName = new Map((orgs ?? []).map((o) => [o.id, o.name]));
  const plateOf = new Map([...(trucks ?? []), ...(docTrucks ?? [])].map((x) => [x.id, x.plate_number]));
  const url = new Map((links ?? []).map((l) => [l.path, l.signedUrl]));
  const typeName = new Map((types ?? []).map((x) => [x.id, x.name]));
  const docName = new Map((docTypes ?? []).map((x) => [x.id, x.name]));
  const card = "grid gap-5 rounded-tile bg-surface p-5 shadow-raised lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:rounded-card lg:p-6";
  return (
    <ul className="flex flex-col gap-4">
      {(trucks ?? []).map((truck) => (
        <li key={truck.id} className={card}>
          <div className="grid grid-cols-2 gap-2">
            {truck.photo_paths.map((path) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={path} src={url.get(path) ?? undefined} alt="" className="aspect-[4/3] w-full rounded-inner border border-line bg-paper object-cover first:col-span-2" />
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-caption font-bold tracking-caps text-ink-3 uppercase">{orgName.get(truck.org_id)}</p>
              <h2 className="text-title-2 tracking-kv text-ink tabular">{truck.plate_number}</h2>
              <p className="text-body-sm text-ink-2">
                {typeName.get(truck.truck_type_id)} · {messages.trucks.list.capacity.replace("{tonnes}", String(truck.capacity_kg / 1000))}
              </p>
            </div>
            <DecideForm session={truck.id} kind="truck" />
          </div>
        </li>
      ))}
      {(docs ?? []).map((doc) => (
        <li key={doc.id} className={card}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url.get(doc.file_path) ?? undefined} alt="" className="aspect-[3/2] w-full rounded-inner border border-line bg-paper object-contain" />
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-caption font-bold tracking-caps text-ink-3 uppercase">{t.paper}</p>
              <h2 className="text-title-2 text-ink">{docName.get(doc.doc_type_id)}</h2>
              <p className="text-body-sm text-ink-2">
                {t.truckOf.replace("{plate}", plateOf.get(doc.subject_id) ?? "").replace("{org}", orgName.get(doc.org_id) ?? "")}
              </p>
              {doc.expires_on ? <p className="text-body-sm font-semibold text-ink">{t.expires.replace("{date}", date.format(new Date(doc.expires_on)))}</p> : null}
            </div>
            <DecideForm session={doc.id} kind="document" />
          </div>
        </li>
      ))}
    </ul>
  );
}
