import messages from "@/messages/en.json";
import type { Database } from "@/lib/supabase/database.types";

// The account switcher's data (A-09) from my_accounts(), and which shell each account opens.

export type AccountRow = Database["public"]["Functions"]["my_accounts"]["Returns"][number];
export type Account = { orgId: string; name: string; label: string; href: string; active: boolean };

const roles = messages.org.roles;

/** "Sender · Admin", "Truck owner · Manager", "Driver" (A-09). */
export function accountLabel(row: Pick<AccountRow, "kind" | "role" | "is_driver">) {
  if (row.kind === "transporter" && row.role === "driver") return roles.driver;
  const kind = messages.org.kinds[row.kind];
  if (row.role === "owner") return row.kind === "transporter" && row.is_driver ? messages.shell.roles.ownerDriver : kind;
  return `${kind} · ${roles[row.role as keyof typeof roles] ?? row.role}`;
}

/** The shell an account opens: senders /app/ship, drivers /app/drive, owners and managers /app/haul. */
export function accountHref(row: Pick<AccountRow, "kind" | "role">) {
  if (row.kind === "shipper") return "/app/ship";
  return row.role === "driver" ? "/app/drive" : "/app/haul";
}

export function toAccounts(rows: AccountRow[]): Account[] {
  return rows.map((row, index) => ({
    orgId: row.org_id,
    name: row.name,
    label: accountLabel(row),
    href: accountHref(row),
    // my_accounts() lists the active one first; with none saved yet, the first one is used.
    active: row.is_active || (index === 0 && !rows.some((r) => r.is_active)),
  }));
}
