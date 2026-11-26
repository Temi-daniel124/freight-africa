"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Radio } from "@/components/ui/check";
import { Chip } from "@/components/ui/chip";
import { Dialog } from "@/components/ui/dialog";
import { Keypad, PinDots } from "@/components/ui/keypad";
import { NewPill, RollingNumber, SosHold, SuccessCheck } from "@/components/ui/motion";
import { Switch } from "@/components/ui/switch";
import { UnderlineTabs } from "@/components/ui/underline-tabs";
import messages from "@/messages/en.json";

const t = messages.gallery.mockup;

export function ButtonsDemo() {
  return (
    <>
      <Button>
        <Plus aria-hidden strokeWidth={2.2} />
        {t.primary}
      </Button>
      <Button variant="secondary">{t.secondary}</Button>
      <Button variant="danger">{t.danger}</Button>
      <Button disabled>{t.disabled}</Button>
      <Button loading loadingLabel={t.primary}>
        {t.primary}
      </Button>
      <Button size="sm">{t.small}</Button>
      <Button size="sm" variant="secondary">
        {t.small}
      </Button>
      <Button size="xs">{t.consoleAction}</Button>
      <Button size="xs" variant="destructive">
        {t.sos}
      </Button>
      <Button size="text" variant="tertiary">
        {t.textButton}
      </Button>
    </>
  );
}

export function ChoicesDemo() {
  return (
    <div className="grid w-full gap-x-8 gap-y-2 md:grid-cols-2">
      <div className="flex flex-col">
        <Checkbox id="m-insure" label={t.insured} help={t.insuredHelp} defaultChecked />
        <Checkbox id="m-insure-off" label={t.insured} help={t.insuredHelp} />
        <Checkbox id="m-insure-dis" label={t.insured} disabled />
      </div>
      <div className="flex flex-col">
        <Radio id="m-pay-now" name="m-pay" label={t.payNow} help={t.payNowHelp} defaultChecked />
        <Radio id="m-pay-later" name="m-pay" label={t.payLater} help={t.payLaterHelp} />
        <Switch id="m-alerts" label={t.alerts} help={t.alertsHelp} defaultChecked />
        <Switch id="m-alerts-off" label={t.alerts} />
      </div>
    </div>
  );
}

export function TabsDemo() {
  const [tab, setTab] = useState<"people" | "trucks" | "bank">("people");
  const [filter, setFilter] = useState("all");
  return (
    <div className="flex w-full flex-col gap-4">
      <UnderlineTabs
        label={t.tabsLabel}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "people", label: t.tabPeople, count: 18 },
          { value: "trucks", label: t.tabTrucks, count: 6 },
          { value: "bank", label: t.tabBank, count: 2 },
        ]}
      />
      <div className="flex flex-wrap gap-2">
        {[
          ["all", t.filterAll],
          ["lagos", t.filterLagos],
          ["overdue", t.filterOverdue],
        ].map(([value, label]) => (
          <Chip key={value} dense selected={filter === value} onClick={() => setFilter(value)}>
            {label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {[
          ["all", t.filterAll],
          ["lagos", t.filterLagos],
        ].map(([value, label]) => (
          <Chip key={value} selected={filter === value} onClick={() => setFilter(value)}>
            {label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

export function MotionDemo() {
  const [run, setRun] = useState(0);
  const [price, setPrice] = useState(124000000);
  const [sent, setSent] = useState(false);
  const [fresh, setFresh] = useState(false);
  return (
    <div className="grid w-full items-start gap-6 md:grid-cols-4">
      <div className="flex flex-col items-center gap-3">
        <SuccessCheck key={run} label={t.check} />
        <Button size="sm" variant="secondary" onClick={() => setRun((n) => n + 1)}>
          {t.replay}
        </Button>
      </div>
      <div className="flex flex-col items-center gap-3">
        <SosHold label={t.sosLabel} holdingLabel={t.sosHolding} onTrigger={() => setSent(true)} />
        <p role="status" className="min-h-5 text-meta text-ink-3">
          {sent ? t.sosSent : t.sosLabel}
        </p>
      </div>
      <div className="flex flex-col items-center gap-3">
        <p className="text-caption font-semibold text-ink-3">{t.price}</p>
        <RollingNumber naira value={price} className="text-title-1 text-ink" />
        <Button size="sm" variant="secondary" onClick={() => setPrice((p) => p + 8500000)}>
          {t.priceUp}
        </Button>
      </div>
      <div className="relative flex min-h-32 flex-col items-center gap-3">
        <NewPill show={fresh} onPress={() => setFresh(false)}>
          {t.newPill}
        </NewPill>
        <Button size="sm" variant="secondary" onClick={() => setFresh(true)}>
          {t.addRows}
        </Button>
      </div>
    </div>
  );
}

export function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {t.openDialog}
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title={t.dialogTitle}
        description={t.dialogText}
        actions={
          <>
            <Button variant="danger" onClick={() => setOpen(false)}>
              {t.dialogCancel}
            </Button>
            <Button onClick={() => setOpen(false)}>{t.dialogKeep}</Button>
          </>
        }
      />
    </>
  );
}

export function KeypadDemo() {
  const [pin, setPin] = useState("");
  return (
    <div className="w-full max-w-105 rounded-card border border-line bg-surface">
      <div className="flex flex-col items-center gap-5 px-6 pt-8 pb-6">
        <h3 className="text-title-2 text-ink">{t.pinTitle}</h3>
        <PinDots filled={pin.length} label={t.pinEntered.replace("{n}", String(pin.length))} />
      </div>
      <div className="rounded-t-sheet px-5 pt-2 pb-6">
        <Keypad
          deleteLabel={t.delete}
          canDelete={pin.length > 0}
          extra={{ label: t.forgot, onPress: () => setPin("") }}
          onKey={(key) => setPin((p) => (key === "del" ? p.slice(0, -1) : p.length >= 6 ? "" + key : p + key))}
        />
      </div>
    </div>
  );
}
