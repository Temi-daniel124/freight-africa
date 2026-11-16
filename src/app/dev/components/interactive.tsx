"use client";

import { Banknote, Home, Plus, Route, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { BottomTabs } from "@/components/ui/bottom-tabs";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CodeInput } from "@/components/ui/code-input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/toaster";
import { CorridorText } from "@/components/ui/corridor-text";

export function ChipsDemo({ options }: { options: string[] }) {
  const [selected, setSelected] = useState(options[0]);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Chip key={option} selected={option === selected} onClick={() => setSelected(option)}>
          <CorridorText text={option} />
        </Chip>
      ))}
    </div>
  );
}

export function SegmentedDemo({ label, send, own }: { label: string; send: string; own: string }) {
  const [value, setValue] = useState<"send" | "own">("send");
  const options = [
    { value: "send", label: send },
    { value: "own", label: own },
  ] as const;
  return <SegmentedControl className="max-w-96" label={label} options={options} value={value} onChange={setValue} />;
}

type SheetToastProps = { open: string; title: string; body: string; keep: string; cancel: string; showToast: string; toastText: string };

export function SheetToastDemo({ open, title, body, keep, cancel, showToast, toastText }: SheetToastProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Sheet trigger={<Button variant="secondary">{open}</Button>} title={title}>
        <p className="text-body text-ink-2">{body}</p>
        <div className="flex flex-col gap-2">
          <Button>{keep}</Button>
          <Button variant="destructive" size="text">
            {cancel}
          </Button>
        </div>
      </Sheet>
      <Button variant="secondary" onClick={() => toast(toastText)}>
        {showToast}
      </Button>
      <Toaster />
    </div>
  );
}

type TabLabels = { label: string; home: string; trips: string; book: string; money: string; me: string };

export function BottomTabsDemo({ label, home, trips, book, money, me }: TabLabels) {
  const tabs = [
    { key: "home", label: home, icon: Home },
    { key: "trips", label: trips, icon: Route },
    { key: "book", label: book, icon: Plus, raised: true },
    { key: "money", label: money, icon: Banknote },
    { key: "me", label: me, icon: User },
  ];
  return <BottomTabs tabs={tabs} label={label} />;
}

export function CodeInputDemo({ label }: { label: string }) {
  const [code, setCode] = useState("482");
  return (
    <div className="flex max-w-96 flex-col gap-6">
      <CodeInput id="demo-code" name="demo-code" length={6} label={label} value={code} onChange={setCode} />
      <CodeInput id="demo-code-error" name="demo-code-error" length={6} label={label} value="" onChange={() => {}} state="error" />
      <CodeInput id="demo-code-done" name="demo-code-done" length={6} label={label} value="482916" onChange={() => {}} state="success" disabled />
      <CodeInput id="demo-code-off" name="demo-code-off" length={6} label={label} value="" onChange={() => {}} disabled />
    </div>
  );
}
