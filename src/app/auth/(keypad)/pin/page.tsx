import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { readPinLogin } from "@/features/auth/pin-login";
import { PinSignIn } from "@/features/auth/pin-screens";
import { requestHome } from "@/lib/ip-key";
import { formatNigerianPhone } from "@/lib/phone";
import { turnstileSiteKey } from "@/lib/turnstile";

async function Pad() {
  const login = await readPinLogin(await requestHome());
  if (!login) redirect("/auth?mode=signin");
  const shown = login.kind === "phone" ? `0${formatNigerianPhone(login.login)}` : login.login;
  return <PinSignIn shownLogin={shown} phone={login.kind === "phone"} turnstileSiteKey={turnstileSiteKey()} />;
}

// A-13 Enter your PIN: sign-in on a new device (D044).
export default function PinSignInPage() {
  return (
    <Suspense fallback={<Skeleton className="h-dvh w-full rounded-none md:h-140 md:w-100 md:rounded-card" />}>
      <Pad />
    </Suspense>
  );
}
