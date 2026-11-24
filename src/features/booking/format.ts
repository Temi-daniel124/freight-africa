import type { LoadRow } from "./data";

/** "24 t of 30 t", "about 600 bags", "Cattle · 40 head" (D046). */
export function loadLine(
  row: Pick<LoadRow, "weightKg" | "quantity" | "quantityUnit" | "goods">,
) {
  if (row.quantityUnit === "head")
    return `${row.goods.split(",")[0]} · ${row.quantity} head`;
  if (row.weightKg)
    return `${(row.weightKg / 1000).toLocaleString("en-NG", { maximumFractionDigits: 1 })} t`;
  if (row.quantity)
    return `about ${row.quantity.toLocaleString("en-NG")} ${row.quantityUnit}`;
  return "";
}

/** Where a trip is on Booked → Loaded → On the road → Delivered (0–3). */
export function progressStep(loadStatus: string, tripStatus?: string | null) {
  if (
    tripStatus &&
    ["delivered", "delivered_with_exception", "closed"].includes(tripStatus)
  )
    return 3;
  if (tripStatus && ["in_transit", "arrived"].includes(tripStatus)) return 2;
  if (tripStatus === "loaded") return 1;
  return loadStatus === "draft" ? -1 : 0;
}
