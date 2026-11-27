"use client";

import { Square, Volume2 } from "lucide-react";
import { useState } from "react";
import messages from "@/messages/en.json";

// DV34 Listen: the phone reads the answer aloud (the browser's own speech, no service).
export function Listen({ text }: { text: string }) {
  const [on, setOn] = useState(false);
  const t = messages.driverHelp;
  const toggle = () => {
    if (!("speechSynthesis" in window)) return;
    if (on) {
      window.speechSynthesis.cancel();
      return setOn(false);
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-NG";
    u.onend = () => setOn(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setOn(true);
  };
  return (
    <button type="button" onClick={toggle} className="inline-flex h-11 items-center gap-2 rounded-pill bg-green-50 px-4 text-body font-semibold text-green-800">
      {on ? <Square aria-hidden className="size-4" strokeWidth={2} /> : <Volume2 aria-hidden className="size-4.5" strokeWidth={1.8} />}
      {on ? t.stop : t.listen}
    </button>
  );
}
