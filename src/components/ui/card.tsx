import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement> & { level?: 0 | 1 | 2 };

export function Card({ level = 0, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card bg-surface p-4.5",
        level === 0 && "border border-line",
        level === 1 && "shadow-raised",
        level === 2 && "shadow-floating",
        className,
      )}
      {...props}
    />
  );
}
