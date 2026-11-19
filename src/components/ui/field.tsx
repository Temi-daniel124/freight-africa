import { TriangleAlert } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClasses =
  "h-14 w-full rounded-input border border-line-strong bg-surface px-4 text-control text-ink transition outline-none motion-instant placeholder:text-ink-3 focus:border-green-700 focus:ring-4 focus:ring-green-500/16 disabled:border-line disabled:bg-paper disabled:text-ink-3";

export const inputErrorClasses = "border-danger focus:border-danger focus:ring-danger/12";

type FieldShellProps = {
  id: string;
  label: string;
  helper?: string;
  error?: string;
  children: ReactNode;
};

export function FieldShell({ id, label, helper, error, children }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-label text-ink">
        {label}
      </label>
      <div className="flex flex-col gap-helper">
        {children}
        {error ? (
          <p id={`${id}-error`} className="flex items-start gap-1.5 text-label font-medium text-danger">
            <TriangleAlert aria-hidden className="mt-px size-4 shrink-0" strokeWidth={1.75} />
            {error}
          </p>
        ) : helper ? (
          <p id={`${id}-helper`} className="text-label font-normal text-ink-3">
            {helper}
          </p>
        ) : null}
      </div>
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  helper?: string;
  error?: string;
};

export function TextField({ id, label, helper, error, className, ...props }: TextFieldProps) {
  return (
    <FieldShell id={id} label={label} helper={helper} error={error}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
        className={cn(inputClasses, error && inputErrorClasses, className)}
        {...props}
      />
    </FieldShell>
  );
}
