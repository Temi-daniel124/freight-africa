import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmptyScene, SafeTripScene, TrackScene } from "@/components/art/scenes";
import { fillPercent, TruckGraphic } from "@/components/art/truck";
import { Avatar } from "@/components/ui/avatar";
import { AVATARS } from "@/features/settings/avatars";

export const metadata: Metadata = { title: "Art", robots: { index: false, follow: false } };

// D045 illustrations, trucks with the D046 load display, and the avatar set. Development and preview only.
export default function ArtPage() {
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-10 bg-paper p-6">
      <section className="grid gap-6 md:grid-cols-3">
        <SafeTripScene />
        <TrackScene />
        <EmptyScene />
      </section>
      <section className="grid gap-6 md:grid-cols-2">
        <TruckGraphic kind="covered" load={{ kind: "weight", percent: fillPercent(24000, 30000), line: "24 t of 30 t" }} />
        <TruckGraphic kind="flatbed" load={{ kind: "amount", goods: "Bags of rice", amount: "about 600 bags" }} />
        <TruckGraphic kind="tipper" load={{ kind: "weight", percent: fillPercent(18500, 20000), line: "18.5 t of 20 t" }} />
        <TruckGraphic kind="tanker" load={null} />
        <TruckGraphic kind="livestock" load={{ kind: "livestock", text: "Cattle · 40 head" }} />
      </section>
      <section className="flex flex-wrap gap-3">
        {AVATARS.map((key) => (
          <Avatar key={key} name="Adaeze Okafor" src={`/avatars/${key}.webp`} size={64} />
        ))}
        <Avatar name="Adaeze Okafor" size={64} />
      </section>
    </main>
  );
}
