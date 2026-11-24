import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { safeNext } from "@/features/auth/next-path";
import { requireUnlocked } from "@/features/auth/unlock";
import { ChangePin } from "@/features/settings/change-pin";
import { requestHome } from "@/lib/ip-key";

type Params = Promise<Record<string, string | string[] | undefined>>;

async function Pad({ searchParams }: { searchParams: Params }) {
  const raw = (await searchParams).back;
  const back = safeNext(Array.isArray(raw) ? raw[0] : raw, await requestHome());
  await requireUnlocked(back);
  return <ChangePin back={back} />;
}

// Settings, Change PIN (D044).
export default function ChangePinPage({ searchParams }: { searchParams: Params }) {
  return (
    <Suspense fallback={<Skeleton className="h-dvh w-full rounded-none md:h-140 md:w-100 md:rounded-card" />}>
      <Pad searchParams={searchParams} />
    </Suspense>
  );
}
