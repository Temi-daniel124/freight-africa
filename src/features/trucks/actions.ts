"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

// T-09 Add a truck. The database checks rights (manage_trucks), photos, plate, capacity and papers again.

type Ticket = { status: "ok"; path: string; token: string } | { status: "error" };

/** The transporter business this person manages trucks for: their active one, or the first. */
async function fleetOrg(supabase: Awaited<ReturnType<typeof supabaseServer>>) {
  const { data } = await supabase.rpc("my_accounts");
  const rows = (data ?? []).filter((row) => row.kind === "transporter" && (row.role === "owner" || row.role === "manager"));
  return (rows.find((row) => row.is_active) ?? rows[0])?.org_id ?? null;
}

/** A one-time address to upload one truck or paper photo into the business's folder. */
export async function fleetUploadTicket(): Promise<Ticket> {
  const supabase = await supabaseServer();
  const org = await fleetOrg(supabase);
  if (!org) return { status: "error" };
  const path = `${org}/${randomUUID()}.jpg`;
  const { data, error } = await supabase.storage.from("fleet").createSignedUploadUrl(path);
  if (error || !data) {
    console.error("fleet upload ticket failed", error?.message);
    return { status: "error" };
  }
  return { status: "ok", path, token: data.token };
}

const PAPERS = ["vehicle_licence", "roadworthiness", "insurance_third_party", "goods_in_transit"] as const;
const REQUIRED = new Set(["vehicle_licence", "roadworthiness", "insurance_third_party"]);

export type AddTruckState = {
  status: "idle" | "invalid" | "plateTaken" | "error" | "sent";
  errors: Partial<Record<"back" | "plate" | "type" | "capacity" | "routes" | (typeof PAPERS)[number], string>>;
};

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());

export async function addTruck(_previous: AddTruckState, formData: FormData): Promise<AddTruckState> {
  const get = (key: string) => String(formData.get(key) ?? "").trim();
  const errors: AddTruckState["errors"] = {};
  const back = get("back");
  const plate = get("plate").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const type = get("type");
  const capacity = Number(get("capacity"));
  const routes = formData.getAll("routes").map(String);
  const excluded = formData.getAll("excluded").map(String);
  if (!back) errors.back = "back";
  if (!/^[A-Z0-9]{5,10}$/.test(plate)) errors.plate = "plate";
  if (!z.uuid().safeParse(type).success) errors.type = "type";
  if (!Number.isInteger(capacity) || capacity <= 0) errors.capacity = "capacity";
  if (!routes.length) errors.routes = "routes";
  const papers = PAPERS.map((code) => ({ code, photo: get(`paper_${code}`), expires: get(`expires_${code}`) }));
  for (const paper of papers) {
    const given = paper.photo || paper.expires;
    if (!REQUIRED.has(paper.code) && !given) continue;
    if (!paper.photo || !/^\d{4}-\d{2}-\d{2}$/.test(paper.expires)) errors[paper.code] = "paper";
    else if (paper.expires <= today()) errors[paper.code] = "expired";
  }
  if (Object.keys(errors).length) return { status: "invalid", errors };

  const supabase = await supabaseServer();
  const org = await fleetOrg(supabase);
  if (!org) return { status: "error", errors: {} };
  const photos = [back, get("side"), get("front")].filter(Boolean);
  const { data: truck, error } = await supabase.rpc("add_truck", {
    p_org: org,
    p_plate: plate,
    p_truck_type: type,
    p_capacity_kg: capacity,
    p_photos: photos,
    p_corridors: routes,
    p_excluded_goods: excluded,
  });
  if (error || !truck) {
    if (error?.code === "23505") return { status: "plateTaken", errors: {} };
    if (error?.code === "22023") return { status: "invalid", errors: { capacity: "capacity" } };
    console.error("add_truck failed", error?.code);
    return { status: "error", errors: {} };
  }
  for (const paper of papers) {
    if (!paper.photo) continue;
    const { error: docError } = await supabase.rpc("add_truck_document", { p_truck: truck, p_doc_type: paper.code, p_photo: paper.photo, p_expires_on: paper.expires });
    if (docError) {
      // The truck is saved; its page offers the paper again (T-14a).
      console.error("add_truck_document failed", docError.code);
      return { status: "error", errors: {} };
    }
  }
  return { status: "sent", errors: {} };
}
