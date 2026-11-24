"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import messages from "@/messages/en.json";
import { pauseDriver } from "./owner-actions";

/** T-13 Pause driver / Let drive (no new trips while paused). */
export function PauseDriverButton({ driver, paused }: { driver: string; paused: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button variant="secondary" size="md" loading={pending} onClick={() => start(() => pauseDriver(driver, !paused))}>
      {paused ? messages.drivers.list.resume : messages.drivers.list.pause}
    </Button>
  );
}
