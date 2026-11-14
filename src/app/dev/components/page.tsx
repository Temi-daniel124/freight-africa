import { Check, CircleAlert, Clock3, Copy, Lock, Route, Truck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { TextField } from "@/components/ui/field";
import { ListRow } from "@/components/ui/list-row";
import { PhoneField } from "@/components/ui/phone-field";
import { RoadLine } from "@/components/ui/road-line";
import { Skeleton } from "@/components/ui/skeleton";
import messages from "@/messages/en.json";
import { BottomTabsDemo, ChipsDemo, SegmentedDemo, SheetToastDemo } from "./interactive";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const t = messages.gallery;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-title-2 text-ink">{title}</h2>
      {children}
    </section>
  );
}

function MoneyRow({ label, value, total }: { label: string; value: string; total?: boolean }) {
  return (
    <div className={total ? "flex justify-between border-t border-line pt-3 text-title-2" : "flex justify-between text-body"}>
      <span className={total ? "text-ink" : "text-ink-2"}>{label}</span>
      <span className="tabular text-ink">{value}</span>
    </div>
  );
}

export default function ComponentsGalleryPage() {
  // Development and preview only (DESIGN_SYSTEM.md section 20.2).
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();

  return (
    <main className="mx-auto flex max-w-site flex-col gap-12 px-4 py-8 lg:px-6 lg:py-12">
      <header className="flex flex-col gap-4">
        <Logo className="self-start" />
        <h1 className="text-title-1 text-ink">{t.title}</h1>
        <p className="text-body text-ink-2">{t.intro}</p>
      </header>

      <Section title={t.buttons}>
        <div className="flex flex-wrap items-center gap-3">
          <Button>{t.primary}</Button>
          <Button variant="secondary">{t.secondary}</Button>
          <Button variant="tertiary" size="text">
            {t.tertiary}
          </Button>
          <Button variant="destructive" size="text">
            {t.destructive}
          </Button>
          <Button variant="icon" size="icon" aria-label={t.share}>
            <Copy aria-hidden className="size-5" strokeWidth={1.75} />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="md">{t.primary}</Button>
          <Button loading loadingLabel={t.loading}>
            {t.primary}
          </Button>
          <Button variant="secondary" loading loadingLabel={t.loading}>
            {t.secondary}
          </Button>
        </div>
        <div className="flex flex-col items-start gap-helper">
          <Button disabled>{t.disabled}</Button>
          <p className="text-caption text-ink-2">{t.disabledReason}</p>
        </div>
        <div className="flex rounded-card bg-green-700 p-6">
          <Button variant="inverse">{t.inverse}</Button>
        </div>
      </Section>

      <Section title={t.inputs}>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField id="g-name" label={t.nameLabel} placeholder={t.namePlaceholder} helper={t.helper} />
          <TextField id="g-long" label={t.nameLabel} defaultValue={t.nameValue} />
          <TextField id="g-error" label={t.errorLabel} defaultValue={t.errorValue} error={t.errorMessage} />
          <TextField id="g-disabled" label={t.disabledLabel} defaultValue={t.disabledValue} disabled />
          <PhoneField id="g-phone" label={t.phoneLabel} helper={t.phoneHelper} defaultValue="08031234567" />
        </div>
      </Section>

      <Section title={t.chips}>
        <ChipsDemo options={t.chipOptions} />
      </Section>

      <Section title={t.status}>
        <div className="flex flex-wrap gap-2">
          <StatusChip tone="info" icon={Truck}>
            {t.statusInfo}
          </StatusChip>
          <StatusChip tone="warning" icon={Clock3}>
            {t.statusWarning}
          </StatusChip>
          <StatusChip tone="danger" icon={CircleAlert}>
            {t.statusDanger}
          </StatusChip>
          <StatusChip tone="success" icon={Check}>
            {t.statusSuccess}
          </StatusChip>
          <StatusChip tone="neutral">{t.statusNeutral}</StatusChip>
        </div>
      </Section>

      <Section title={t.segmented}>
        <SegmentedDemo label={t.segmentedLabel} send={t.segmentedSend} own={t.segmentedOwn} />
      </Section>

      <Section title={t.cards}>
        <div className="grid items-start gap-3 lg:grid-cols-3">
          <div className="flex items-start gap-3 rounded-card bg-green-100 p-4 lg:p-5">
            <Lock aria-hidden className="size-5 shrink-0 text-green-700" strokeWidth={1.75} />
            <p className="text-body font-bold text-green-900">{t.moneyHeld}</p>
          </div>
          <Card level={1} className="flex flex-col gap-3">
            <h3 className="text-title-2 text-ink">{t.moneyTitle}</h3>
            <MoneyRow label={t.moneyFreight} value={t.moneyFreightValue} />
            <MoneyRow label={t.moneyFee} value={t.moneyFeeValue} />
            <MoneyRow label={t.moneyTotal} value={t.moneyTotalValue} total />
          </Card>
          <Card className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-body font-semibold text-ink">{t.tripRoute}</p>
              <StatusChip tone="info" icon={Truck}>
                {t.statusInfo}
              </StatusChip>
            </div>
            <p className="text-body text-ink">{t.tripNext}</p>
            <p className="text-body text-ink-2">{t.tripMoney}</p>
            <RoadLine progress={60} label={t.roadLabel} className="mt-2" />
          </Card>
        </div>
      </Section>

      <Section title={t.rows}>
        <Card className="flex flex-col gap-1">
          <ListRow icon={Truck} title={t.rowTitle} detail={t.rowDetail} action={<Button variant="secondary" size="md">{t.rowAction}</Button>} />
          <ListRow icon={Route} title={t.rowLongTitle} detail={t.rowLongDetail} />
        </Card>
      </Section>

      <Section title={t.nav}>
        <div className="max-w-96 overflow-hidden rounded-card pt-6">
          <BottomTabsDemo label={t.navLabel} home={t.navHome} trips={t.navTrips} book={t.navBook} money={t.navMoney} me={t.navMe} />
        </div>
      </Section>

      <Section title={t.sheets}>
        <SheetToastDemo open={t.openSheet} title={t.sheetTitle} body={t.sheetBody} keep={t.sheetKeep} cancel={t.destructive} showToast={t.showToast} toastText={t.toast} />
      </Section>

      <Section title={t.empty}>
        <Card>
          <EmptyState
            illustration={<Truck role="img" aria-label={t.emptyIllustration} className="size-24 text-green-700" strokeWidth={1} />}
            message={t.emptyMessage}
            action={<Button>{t.emptyAction}</Button>}
          />
        </Card>
      </Section>

      <Section title={t.skeletons}>
        <Card className="flex flex-col gap-3">
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-2/5" />
        </Card>
      </Section>

      <Section title={t.road}>
        <div className="flex flex-col gap-6 py-2">
          <RoadLine />
          <RoadLine progress={60} label={t.roadLabel} />
        </div>
      </Section>
    </main>
  );
}
