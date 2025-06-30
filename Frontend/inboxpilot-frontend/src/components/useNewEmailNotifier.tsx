"use client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getEmailsAction } from "@/actions/data";

export function useNewEmailNotifier(pollIntervalSec = 15) {
  const prevCount = useRef<number>(0);

  useEffect(() => {
    let stopped = false;
    const notifSound =
      typeof Audio !== "undefined" ? new Audio("/ping.mp3") : null;

    async function check() {
      try {
        const { emails } = await getEmailsAction(undefined, true);
        const now = emails.length;
        if (prevCount.current !== 0 && now > prevCount.current) {
          const delta = now - prevCount.current;
          // play a ping noise
          notifSound?.play().catch(() => {});
          toast.success(`You have ${delta} new email${delta > 1 ? "s" : ""}`);
        }
        prevCount.current = now;
      } catch {
        // ignore
      }
    }

    check();
    const iv = window.setInterval(() => {
      if (!stopped) check();
    }, pollIntervalSec * 1000);

    return () => {
      stopped = true;
      window.clearInterval(iv);
    };
  }, [pollIntervalSec]);
}
