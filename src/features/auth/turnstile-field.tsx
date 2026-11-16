"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type TurnstileApi = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
// If Cloudflare never answers (blocked network), stop waiting and let the server say so plainly.
const GIVE_UP_MS = 10_000;

let loading: Promise<TurnstileApi> | undefined;
function loadTurnstile(): Promise<TurnstileApi> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    script.onerror = () => {
      loading = undefined;
      reject(new Error("turnstile blocked"));
    };
    document.head.append(script);
  });
  return loading;
}

/**
 * The "are you a person" check for a form (Cloudflare Turnstile). Nothing shows unless Cloudflare needs
 * the visitor to tick a box. Returns the field to put inside the form, an onSubmit that holds the form
 * for the moment it takes the check to finish, and whether it is holding.
 * `siteKey` null means the check is switched off; `resetKey` changes after each send, because a token
 * works only once.
 */
export function useTurnstile(siteKey: string | null, resetKey: number) {
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const widget = useRef<string | null>(null);
  // "held": the person pressed the button before the check finished. "released": send it regardless.
  const held = useRef(false);
  const released = useRef(false);
  const heldAt = useRef(0);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    if (!siteKey || !box.current) return;
    let gone = false;
    const element = box.current;
    const release = () => {
      if (!held.current) return;
      held.current = false;
      released.current = true;
      input.current?.form?.requestSubmit();
    };
    loadTurnstile()
      .then((turnstile) => {
        if (gone) return;
        widget.current = turnstile.render(element, {
          sitekey: siteKey,
          action: "send-code",
          appearance: "interaction-only",
          "refresh-expired": "auto",
          callback: (token: string) => {
            if (input.current) input.current.value = token;
            release();
          },
          "expired-callback": () => {
            if (input.current) input.current.value = "";
          },
          "error-callback": release,
        });
      })
      .catch(release);
    const giveUp = window.setInterval(() => {
      if (held.current && Date.now() - heldAt.current > GIVE_UP_MS) release();
    }, 500);
    return () => {
      gone = true;
      window.clearInterval(giveUp);
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey]);

  // A used token is spent: fetch a fresh one for the next try.
  useEffect(() => {
    if (resetKey === 0 || !widget.current) return;
    if (input.current) input.current.value = "";
    window.turnstile?.reset(widget.current);
  }, [resetKey]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!siteKey || input.current?.value || released.current) {
      released.current = false;
      setHolding(false);
      return;
    }
    // The check hasn't finished yet: hold the form and send it the moment the token arrives.
    event.preventDefault();
    held.current = true;
    heldAt.current = Date.now();
    setHolding(true);
  };

  const field = siteKey ? (
    <>
      <input ref={input} type="hidden" name="captcha" defaultValue="" />
      <div ref={box} className="empty:hidden" />
    </>
  ) : null;

  return { field, onSubmit, holding };
}
