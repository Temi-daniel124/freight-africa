import { Check, Copy, Lock, MapPin, Plus, Route, Truck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { Banner, OfflineStrip, Toast, toastActionClasses } from "@/components/ui/feedback";
import { TextField } from "@/components/ui/field";
import { ListRow } from "@/components/ui/list-row";
import { PhoneField } from "@/components/ui/phone-field";
import { RoadLine } from "@/components/ui/road-line";
import { SheetPreview } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { ShellTabsPreview } from "@/features/shell/app-shell";
import { shells, type ShellRole } from "@/features/shell/config";
import messages from "@/messages/en.json";
import { ChipsDemo, CodeInputDemo, FilterDemo, LiveDemos, SegmentedDemo } from "./interactive";

export const metadata: Metadata = { title: "Components", robots: { index: false, follow: false } };

const t = messages.gallery;
const s = t.sheet;

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="mb-3 text-label font-bold tracking-caps text-ink-3 uppercase">{title}</h2>
      {children}
    </section>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-wrap items-center gap-4 rounded-card bg-surface p-6 shadow-raised ${className}`}>{children}</div>;
}

const tabRoles: ShellRole[] = ["shipper", "owner", "ownerDriver", "driver", "agent"];

export default function ComponentsGalleryPage() {
  // Development and preview only (DESIGN_SYSTEM.md section 20.2).
  const allowed = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  if (!allowed) notFound();

  return (
    <main className="min-h-dvh bg-paper">
      <div className="mx-auto max-w-280 px-6 pt-10 pb-20">
        <h1 className="text-display text-ink">{t.title}</h1>
        <p className="mt-2 max-w-180 text-body text-ink-2">{t.intro}</p>

        <Block title={s.buttons}>
          <Panel>
            <Button size="md">
              <Plus aria-hidden strokeWidth={1.75} />
              {s.book}
            </Button>
            <Button size="md" variant="secondary">
              {s.review}
            </Button>
            <Button size="md" variant="tertiary">
              {s.seeAll}
            </Button>
            <Button size="md" variant="destructive">
              {s.cancelBooking}
            </Button>
            <Button size="md" disabled>
              {s.continue}
            </Button>
            <Button size="md" loading loadingText loadingLabel={s.sending}>
              {s.continue}
            </Button>
            <Button size="sm">{s.pay}</Button>
            <Button size="sm" variant="secondary">
              {s.rate}
            </Button>
          </Panel>
        </Block>

        <Block title={s.fields}>
          <Panel>
            <div className="min-w-65 flex-1">
              <TextField id="g-pickup" label={s.pickup} placeholder={s.pickupPlaceholder} helper={s.pickupHelp} />
            </div>
            <div className="min-w-65 flex-1">
              <TextField id="g-goods" label={s.goods} defaultValue={s.goodsValue} helper={s.goodsHelp} autoFocus />
            </div>
            <div className="min-w-65 flex-1">
              <TextField id="g-weight" label={s.weight} defaultValue={s.weightValue} error={s.weightError} inputMode="numeric" />
            </div>
          </Panel>
        </Block>

        <Block title={s.status}>
          <Panel>
            <StatusChip tone="warning">{s.chips.unpaid}</StatusChip>
            <StatusChip tone="finding">{s.chips.finding}</StatusChip>
            <StatusChip tone="success" icon={Check}>
              {s.chips.accepted}
            </StatusChip>
            <StatusChip tone="info" icon={Truck}>
              {s.chips.road}
            </StatusChip>
            <StatusChip tone="success" icon={Check}>
              {s.chips.delivered}
            </StatusChip>
            <StatusChip tone="danger">{s.chips.problem}</StatusChip>
            <StatusChip tone="neutral">{s.chips.cancelled}</StatusChip>
          </Panel>
        </Block>

        <Block title={s.segmented}>
          <Panel>
            <FilterDemo label={s.filterLabel} filters={s.filters} />
          </Panel>
        </Block>

        <Block title={s.feedback}>
          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <OfflineStrip>{s.offline}</OfflineStrip>
              <Banner icon={Truck} title={s.bannerTitle}>
                {s.bannerText}
              </Banner>
              <Toast action={<button type="button" className={toastActionClasses}>{s.undo}</button>}>{s.toast}</Toast>
            </Panel>
            <Panel>
              <div role="status" aria-label={s.loading} className="flex w-full flex-col gap-3">
                <Skeleton className="h-5 w-2/5 rounded-nav" />
                <Skeleton className="h-22 rounded-nav" />
                <Skeleton className="h-22 rounded-nav" />
                <Skeleton className="h-22 w-4/5 rounded-nav" />
              </div>
            </Panel>
          </div>
        </Block>

        <Block title={s.empty}>
          <Panel>
            <EmptyState
              title={messages.shell.pages.home.empty}
              offer={messages.shell.home.firstOffer}
              action={
                <Button size="md">
                  <Plus aria-hidden strokeWidth={1.75} />
                  {messages.shell.home.firstAction}
                </Button>
              }
              points={[
                { icon: Lock, text: messages.shell.home.firstPoints[0] },
                { icon: Check, text: messages.shell.home.firstPoints[1] },
                { icon: MapPin, text: messages.shell.home.firstPoints[2] },
              ]}
              secondary={
                <Button size="md" variant="tertiary">
                  {messages.shell.home.howItWorks}
                </Button>
              }
            />
          </Panel>
        </Block>

        <Block title={s.bottomSheet}>
          <Panel>
            <SheetPreview title={s.sheetTitle} description={s.sheetText}>
              <Button size="md" variant="destructive" className="w-full">
                {s.cancelBooking}
              </Button>
              <Button size="md" variant="tertiary" className="w-full">
                {s.keep}
              </Button>
            </SheetPreview>
            <LiveDemos open={s.openSheet} title={s.sheetTitle} text={s.sheetText} cancel={s.cancelBooking} keep={s.keep} showToast={s.showToast} toastText={s.toast} undo={s.undo} />
          </Panel>
        </Block>

        <Block title={s.tabs}>
          <Panel className="flex-col items-start">
            {tabRoles.map((role) => (
              <div key={role} className="w-full">
                <p className="mt-2 text-caption font-semibold tracking-normal text-ink-3">{s.tabLabels[role as keyof typeof s.tabLabels]}</p>
                <ShellTabsPreview config={shells[role]} />
              </div>
            ))}
          </Panel>
        </Block>

        <Block title={s.website}>
          <div className="flex flex-col gap-6">
            <Panel>
              <Logo />
              <Button>{t.primary}</Button>
              <Button variant="icon" size="icon" aria-label={t.share}>
                <Copy aria-hidden className="size-5" strokeWidth={1.75} />
              </Button>
              <div className="flex rounded-card bg-green-700 p-4">
                <Button variant="inverse">{t.inverse}</Button>
              </div>
            </Panel>
            <Panel className="items-start">
              <div className="min-w-65 flex-1">
                <PhoneField id="g-phone" label={t.phoneLabel} helper={t.phoneHelper} defaultValue="08031234567" />
              </div>
              <div className="min-w-65 flex-1">
                <TextField id="g-disabled" label={t.disabledLabel} defaultValue={t.disabledValue} disabled />
              </div>
            </Panel>
            <Panel>
              <ChipsDemo options={t.chipOptions} />
              <SegmentedDemo label={t.segmentedLabel} send={t.segmentedSend} own={t.segmentedOwn} />
            </Panel>
            <Panel className="flex-col items-stretch">
              <CodeInputDemo label={t.codeLabel} />
            </Panel>
            <Panel className="flex-col items-stretch">
              <Card className="flex flex-col gap-1">
                <ListRow icon={Truck} title={t.rowTitle} detail={t.rowDetail} action={<Button variant="secondary" size="sm">{t.rowAction}</Button>} />
                <ListRow icon={Route} title={t.rowLongTitle} detail={t.rowLongDetail} />
              </Card>
              <RoadLine progress={60} label={t.roadLabel} />
            </Panel>
          </div>
        </Block>
      </div>
    </main>
  );
}
