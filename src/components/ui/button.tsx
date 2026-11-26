import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "relative inline-flex aria-busy:pointer-events-none items-center justify-center gap-2 rounded-button font-semibold whitespace-nowrap transition select-none motion-instant active:scale-press disabled:pointer-events-none",
  {
    variants: {
      // Mockup fa.css: .btn (primary pill with its green shadow), .btn2 (white with a line), .btnl (green
      // text), .btn.rd (red, used for SOS and destructive), .btnw (white on deep green), .ib (round icon).
      variant: {
        primary:
          "bg-green-700 text-white shadow-button hover:bg-green-800 active:bg-green-900 disabled:bg-line disabled:text-ink-3 disabled:shadow-none",
        secondary: "border border-line-field bg-surface text-ink hover:bg-paper active:bg-green-50 disabled:border-line disabled:text-ink-3",
        tertiary: "text-green-700 hover:bg-green-50 disabled:text-ink-3",
        destructive: "bg-sos text-white shadow-button-sos hover:bg-danger active:bg-danger disabled:bg-line disabled:text-ink-3 disabled:shadow-none",
        // In-app "Cancel" and "Reject": the white button with red words (.btn2 + #B42318).
        danger: "border border-line-field bg-surface text-danger hover:bg-danger-50 disabled:border-line disabled:text-ink-3",
        inverse: "bg-white text-green-900 hover:bg-green-50 active:bg-green-100",
        icon: "rounded-full border border-line bg-surface text-ink hover:bg-green-50",
      },
      // 56 px pills (lg and md), 40 px small, 36 px console, 48 px text link, 44 px round icon.
      size: {
        lg: "h-14 px-6 text-control font-semibold [&_svg]:size-5",
        md: "h-14 px-6 text-control font-semibold [&_svg]:size-5",
        sm: "h-10 px-4.5 text-body-sm shadow-none [&_svg]:size-4 before:absolute before:-inset-y-0.5 before:inset-x-0 before:content-['']",
        xs: "h-9 px-3.5 text-[13px] font-semibold shadow-none [&_svg]:size-4 before:absolute before:-inset-y-1 before:inset-x-0 before:content-['']",
        text: "min-h-12 px-2 text-body font-semibold shadow-none",
        icon: "size-11",
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
