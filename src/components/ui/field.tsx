import { CircleAlert } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClasses =
  "h-14 w-full rounded-input border-field border-line-strong bg-surface px-4 text-body-lg font-normal text-ink transition outline-none motion-instant placeholder:text-ink-3 focus:border-2 focus:border-green-700 focus:ring-4 focus:ring-green-100 disabled:border-line disabled:bg-green-50 disabled:text-ink-3";

export const inputErrorClasses = "border-danger focus:border-danger focus:ring-danger-100";

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
      <label htmlFor={id} className="text-label text-ink-2">
        {label}
      </label>
      <div className="flex flex-col gap-helper">
        {children}
        {error ? (
          <p id={`${id}-error`} className="flex items-center gap-1 text-caption text-danger">
            <CircleAlert aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
            {error}
          </p>
        ) : helper ? (
          <p id={`${id}-helper`} className="text-caption text-ink-2">
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
