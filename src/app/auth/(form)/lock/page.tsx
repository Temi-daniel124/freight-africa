import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LockForm } from "@/features/auth/lock-form";

type Params = Promise<Record<string, string | string[] | undefined>>;

async function Lock({ searchParams }: { searchParams: Params }) {
  const raw = (await searchParams).t;
  return <LockForm token={(Array.isArray(raw) ? raw[0] : raw) ?? ""} />;
}

// D044 "Not you? Lock your account": a page with one button, so link scanners never lock anyone.
export default function LockPage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={<Skeleton className="h-60 w-full rounded-card" />}>
      <Lock searchParams={searchParams} />
    </Suspense>
  );
}
