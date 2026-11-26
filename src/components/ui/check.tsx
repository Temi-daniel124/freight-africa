import { Check as Tick } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { id: string; label: string; help?: string };

/**
 * Mockup .ck and .radio: a 24 px box (8 px corners) or ring, green when chosen. The real input is the
 * drawn control itself (appearance: none), so keyboard, forms and screen readers work as normal; the
 * whole row is the tap target.
 */
export function Checkbox({ label, help, className, id, ...props }: ChoiceProps) {
  return (
    <label htmlFor={id} className={cn("flex min-h-11 cursor-pointer items-center gap-3", className)}>
      <span className="relative grid size-6 shrink-0 place-items-center">
        <input
          id={id}
          type="checkbox"
          className="peer absolute inset-0 size-full cursor-pointer appearance-none rounded-check border-[1.5px] border-line-strong bg-surface checked:border-green-700 checked:bg-green-700 focus-visible:shadow-focus"
          {...props}
        />
        <Tick aria-hidden className="pointer-events-none relative size-4 text-white opacity-0 peer-checked:opacity-100" strokeWidth={3} />
      </span>
      <ChoiceText label={label} help={help} />
    </label>
  );
}

export function Radio({ label, help, className, id, ...props }: ChoiceProps) {
  return (
    <label htmlFor={id} className={cn("flex min-h-11 cursor-pointer items-center gap-3", className)}>
      <input
        id={id}
        type="radio"
        className="size-6 shrink-0 cursor-pointer appearance-none rounded-full border-[1.5px] border-line-strong bg-surface checked:border-[7px] checked:border-green-700 focus-visible:shadow-focus"
        {...props}
      />
      <ChoiceText label={label} help={help} />
    </label>
  );
}

function ChoiceText({ label, help }: { label: string; help?: string }) {
  return (
    <span className="min-w-0">
      <span className="block text-body font-semibold text-ink">{label}</span>
      {help ? <span className="block text-meta text-ink-3">{help}</span> : null}
    </span>
  );
}
