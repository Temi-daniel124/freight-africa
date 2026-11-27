"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { CodeInput } from "@/components/ui/code-input";
import { PhoneField } from "@/components/ui/phone-field";
import { AuthActions, AuthBody, AuthTop } from "@/features/auth/auth-frame";
import messages from "@/messages/en.json";
import { signInWithSetupCode } from "./install-actions";

const t = messages.driverInstall.code;

/** DV05d, in the iPhone home-screen app (which starts signed out): phone number and setup code. */
export function SetupCodeForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pending, start] = useTransition();
  const submit = () =>
    start(async () => {
      const r = await signInWithSetupCode(phone, code);
      if (r.status === "ok") return router.replace(`/auth/unlock?next=${encodeURIComponent("/onboarding/install")}`);
      setError(r.status === "wrong" ? t.wrong : t.error);
      setAttempt((a) => a + 1);
      setCode("");
    });
  return (
    <div className="flex flex-1 flex-col">
      <AuthTop back="/auth?mode=signin" />
      <AuthBody className="pt-10 lg:pt-0">
        <h1 className="type-signin text-balance text-ink">{t.title}</h1>
        <p className="type-signin-lead mt-3 text-ink-2">{t.lead}</p>
        <div className="mt-8">
          <PhoneField id="setup-phone" label={t.phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="mt-6">
          <CodeInput id="setup-code" name="code" length={6} label={t.code} value={code} onChange={setCode} state={error ? "error" : "idle"} attempt={attempt} describedBy={error ? "setup-error" : undefined} />
        </div>
        {error ? (
          <p id="setup-error" role="alert" className="mt-3 text-label font-medium text-danger">
            {error}
          </p>
        ) : null}
      </AuthBody>
      <AuthActions>
        <Button className="w-full" loading={pending} disabled={code.length !== 6 || !phone} onClick={submit}>
          {t.cta}
        </Button>
      </AuthActions>
    </div>
  );
}

/** On the sign-in screen, only inside the home-screen app: the way in with a setup code. */
export function SetupCodeLink() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from the browser after mount
    setShow(standalone);
  }, []);
  if (!show) return null;
  return (
    <Link href="/auth/setup-code" className="block text-center text-body font-semibold text-green-800">
      {t.link}
    </Link>
  );
}
