"use server";

import { assertUnlocked } from "@/features/auth/unlock";
import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";

// A-04: one screen, then booking. Creates the sender business with this person as owner.

export type ShipperState = {
  status: "idle" | "invalid" | "error";
  errors: { name?: boolean; businessName?: boolean; cac?: boolean };
  values: { name: string; as: "myself" | "business"; businessName: string; cac: string };
};

export const shipperSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    as: z.enum(["myself", "business"]),
    businessName: z.string().trim().max(120),
    // Same shape the database checks: up to 4 letters then digits (RC1234567, BN123456).
    cac: z.string().trim().toUpperCase().regex(/^([A-Z]{0,4}[0-9]{1,12})?$/),
  })
  .refine((v) => v.as === "myself" || v.businessName.length >= 2, { path: ["businessName"] });

export async function setUpShipper(_previous: ShipperState, formData: FormData): Promise<ShipperState> {
  await assertUnlocked();
  const values = {
    name: String(formData.get("name") ?? ""),
    as: formData.get("as") === "business" ? ("business" as const) : ("myself" as const),
    businessName: String(formData.get("businessName") ?? ""),
    cac: String(formData.get("cac") ?? "").replace(/\s+/g, ""),
  };
  const parsed = shipperSchema.safeParse(values);
  if (!parsed.success) {
    const paths = new Set(parsed.error.issues.map((issue) => issue.path[0]));
    return { status: "invalid", values, errors: { name: paths.has("name"), businessName: paths.has("businessName"), cac: paths.has("cac") } };
  }
  const supabase = await supabaseServer();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) redirect("/auth?next=/onboarding/shipper");
  const v = parsed.data;
  await supabase.from("profiles").update({ full_name: v.name, joining_as: "shipper" }).eq("id", claims.claims.sub);
  const { error } = await supabase.rpc("create_organization", {
    p_kind: "shipper",
    p_name: v.as === "business" ? v.businessName : v.name,
    p_cac_number: v.as === "business" && v.cac ? v.cac : undefined,
  });
  if (error) {
    console.error("create_organization failed", error.code);
    return { status: "error", values, errors: {} };
  }
  redirect("/app/ship");
}
