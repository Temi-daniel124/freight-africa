import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("shimmer-block animate-shimmer rounded-inner", className)} />;
}
