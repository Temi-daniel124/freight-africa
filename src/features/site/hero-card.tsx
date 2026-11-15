"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PhoneField } from "@/components/ui/phone-field";
import { SegmentedControl } from "@/components/ui/segmented-control";

type HeroCardProps = {
  t: { cardTitle: string; roleLabel: string; roleSend: string; roleOwn: string; phoneLabel: string; submit: string; note: string };
};

// Starts the sign-up here and finishes it on /waitlist, prefilled. A plain GET form, so it works without JavaScript.
export function HeroCard({ t }: HeroCardProps) {
  const [role, setRole] = useState<"shipper" | "owner">("shipper");
  const options = [
    { value: "shipper", label: t.roleSend },
    { value: "owner", label: t.roleOwn },
  ] as const;

  return (
    <form action="/waitlist" method="get" className="flex flex-col gap-5 rounded-card bg-surface p-5 text-ink shadow-floating lg:p-6">
      <h2 className="text-title-2">{t.cardTitle}</h2>
      <div className="flex flex-col gap-2">
        {/* No visible label: the two options say it. The radio group is still named for screen readers. */}
        <SegmentedControl label={t.roleLabel} options={options} value={role} onChange={setRole} />
        <input type="hidden" name="role" value={role} />
      </div>
      <PhoneField id="hero-phone" name="phone" label={t.phoneLabel} />
      <div className="flex flex-col gap-3">
        <Button type="submit" className="w-full">
          {t.submit}
        </Button>
        <p className="text-center text-caption text-ink-2">{t.note}</p>
      </div>
    </form>
  );
}
