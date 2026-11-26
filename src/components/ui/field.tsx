import { TriangleAlert } from "lucide-react";
import type { Ref, InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const inputClasses =
  "h-14 w-full rounded-input border border-line-field bg-surface px-4 text-control text-ink transition outline-none motion-instant placeholder:text-placeholder focus:border-green-700 focus:shadow-focus focus:outline-[0.5px] focus:outline-green-700 focus:outline-offset-0 disabled:border-line disabled:bg-paper disabled:text-ink-3";

export const inputErrorClasses = "border-danger focus:border-danger focus:outline-danger focus:shadow-[0_0_0_4px_var(--color-danger-100)]";

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
      <label htmlFor={id} className="text-body-sm text-ink">
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
  ref?: Ref<HTMLInputElement>;
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
