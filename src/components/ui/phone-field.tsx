"use client";

import { useState, type InputHTMLAttributes } from "react";
import { formatNigerianPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";
import { FieldShell, inputClasses, inputErrorClasses } from "./field";

type PhoneFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "defaultValue" | "value"> & {
  id: string;
  label: string;
  helper?: string;
  error?: string;
  defaultValue?: string;
};

export function PhoneField({ id, label, helper, error, defaultValue = "", onChange, className, ...props }: PhoneFieldProps) {
  const [value, setValue] = useState(formatNigerianPhone(defaultValue));
  return (
    <FieldShell id={id} label={label} helper={helper} error={error}>
      <div className="relative">
        <span aria-hidden className="tabular absolute top-4 left-4 text-body-lg font-medium text-ink-2">
          +234
        </span>
        <input
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          value={value}
          onChange={(event) => {
            setValue(formatNigerianPhone(event.target.value));
            onChange?.(event);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
          className={cn(inputClasses, "tabular pl-16", error && inputErrorClasses, className)}
          {...props}
        />
      </div>
    </FieldShell>
  );
}
