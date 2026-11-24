import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import messages from "@/messages/en.json";

export const staffMetadata: Metadata = { title: messages.meta.staffTitle, robots: { index: false, follow: false }, manifest: "/app.webmanifest" };

/** Each staff step reads the session, so it renders inside Suspense with a plain card-shaped skeleton. */
export function StaffSuspense({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center bg-paper p-4" role="status" aria-label={messages.waitlist.loading}>
          <Skeleton className="h-96 w-full max-w-120 rounded-card" />
        </main>
      }
    >
      {children}
    </Suspense>
  );
}
