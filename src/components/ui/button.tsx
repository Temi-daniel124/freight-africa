import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "relative inline-flex aria-busy:pointer-events-none items-center justify-center gap-2 rounded-button font-semibold whitespace-nowrap transition select-none motion-instant active:scale-press disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-green-700 text-white hover:-translate-y-px hover:bg-green-800 active:translate-y-0 active:bg-green-900 disabled:bg-line-strong disabled:text-ink-3",
        secondary: "bg-green-50 text-green-700 hover:bg-green-100 active:bg-green-200 disabled:bg-line-strong disabled:text-ink-3",
        tertiary: "text-green-700 hover:underline disabled:text-ink-3",
        destructive: "text-danger hover:underline disabled:text-ink-3",
        inverse: "bg-white text-green-700 hover:bg-green-50 active:bg-green-100",
        icon: "border border-line bg-surface text-ink hover:bg-green-50",
      },
      size: {
        lg: "h-14 px-8 text-body-lg",
        md: "h-12 px-6 text-body",
        text: "min-h-12 text-body",
        icon: "size-12",
      },
    },
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { loading?: boolean; loadingLabel?: string };

export function Button({ className, variant, size, loading, loadingLabel, children, disabled, onClick, type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled}
      aria-disabled={loading || undefined}
      aria-busy={loading || undefined}
      onClick={loading ? undefined : onClick}
      {...props}
    >
      <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center gap-1" role="status">
          <span className="sr-only">{loadingLabel}</span>
          {[0, 1, 2].map((dash) => (
            <span key={dash} aria-hidden className="h-1 w-3 animate-road-dash rounded-pill bg-current" style={{ animationDelay: `${dash * 120}ms` }} />
          ))}
        </span>
      ) : null}
    </button>
  );
}
