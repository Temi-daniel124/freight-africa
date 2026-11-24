import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "relative inline-flex aria-busy:pointer-events-none items-center justify-center gap-2 rounded-button font-semibold whitespace-nowrap transition select-none motion-instant active:scale-press disabled:pointer-events-none",
  {
    variants: {
      // Gate 4 component sheet: primary green, secondary white with a line, tertiary a green text button,
      // destructive solid red, disabled grey. The website's large buttons (lg) keep their approved sizes.
      variant: {
        primary:
          "bg-green-700 text-white hover:-translate-y-px hover:bg-green-800 active:translate-y-0 active:bg-green-900 disabled:bg-line disabled:text-ink-3",
        secondary: "border border-line-strong bg-surface text-ink hover:bg-paper active:bg-green-50 disabled:border-line disabled:text-ink-3",
        tertiary: "text-green-700 hover:bg-green-50 disabled:text-ink-3",
        destructive: "bg-danger text-white hover:bg-danger/90 disabled:bg-line disabled:text-ink-3",
        inverse: "bg-white text-green-700 hover:bg-green-50 active:bg-green-100",
        icon: "border border-line bg-surface text-ink hover:bg-green-50",
      },
      size: {
        lg: "h-14 px-8 text-body-lg",
        md: "h-12 px-5 text-body font-bold [&_svg]:size-4.5",
        sm: "h-9 px-3.5 text-label font-bold [&_svg]:size-4 before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']",
        text: "min-h-12 px-2 text-body font-bold",
        icon: "size-12",
      },
    },
    defaultVariants: { variant: "primary", size: "lg" },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean;
    loadingLabel?: string;
    /** Show the loading label as the button's words ("Sending…", Gate 4 sheet) instead of the moving road dashes. */
    loadingText?: boolean;
  };

export function Button({ className, variant, size, loading, loadingLabel, loadingText, children, disabled, onClick, type = "button", ...props }: ButtonProps) {
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
      {loading && loadingText ? (
        <span role="status">{loadingLabel}</span>
      ) : (
        <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
      )}
      {loading && !loadingText ? (
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
