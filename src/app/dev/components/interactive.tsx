"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { CodeInput } from "@/components/ui/code-input";
import { CorridorText } from "@/components/ui/corridor-text";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Sheet } from "@/components/ui/sheet";
import { Toaster } from "@/components/ui/toaster";

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

/** The website's green sliding switch (Gate 3 pricing, the waitlist role). */
export function SegmentedDemo({ label, send, own }: { label: string; send: string; own: string }) {
  const [value, setValue] = useState<"send" | "own">("send");
  const options = [
    { value: "send", label: send },
    { value: "own", label: own },
  ] as const;
  return <SegmentedControl className="max-w-96" label={label} options={options} value={value} onChange={setValue} />;
}

/** The app's quiet filter (Gate 4 component sheet). */
export function FilterDemo({ label, filters }: { label: string; filters: string[] }) {
  const [value, setValue] = useState(filters[0]);
  return <SegmentedControl appearance="app" label={label} options={filters.map((filter) => ({ value: filter, label: filter }))} value={value} onChange={setValue} />;
}

type SheetDemoProps = { open: string; title: string; text: string; cancel: string; keep: string; showToast: string; toastText: string; undo: string };

export function LiveDemos({ open, title, text, cancel, keep, showToast, toastText, undo }: SheetDemoProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <Sheet trigger={<Button variant="secondary" size="md">{open}</Button>} title={title} description={text}>
        <Button variant="destructive" size="md" className="w-full">
          {cancel}
        </Button>
        <Button variant="tertiary" size="md" className="w-full">
          {keep}
        </Button>
      </Sheet>
      <Button variant="secondary" size="md" onClick={() => toast(toastText, { action: { label: undo, onClick: () => {} } })}>
        {showToast}
      </Button>
      <Toaster />
    </div>
  );
}

export function CodeInputDemo({ label }: { label: string }) {
  const [code, setCode] = useState("482");
  return (
    <div className="flex max-w-96 flex-col gap-6">
      <CodeInput id="demo-code" name="demo-code" length={6} label={label} value={code} onChange={setCode} />
      <CodeInput id="demo-code-error" name="demo-code-error" length={6} label={label} value="" onChange={() => {}} state="error" />
      <CodeInput id="demo-code-done" name="demo-code-done" length={6} label={label} value="482916" onChange={() => {}} state="success" disabled />
    </div>
  );
}
