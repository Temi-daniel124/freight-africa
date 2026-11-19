"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** ⌘K or Ctrl+K opens the shell's search page, as the hint in the search pill says. */
export function SearchShortcut({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        router.push(href);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [href, router]);
  return null;
}
