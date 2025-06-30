"use client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { getEmailsAction } from "@/actions/data";

export function useNewEmailNotifier(pollIntervalSec = 15) {
  const prevCount = useRef<number>(0);

  useEffect(() => {
    let stopped = false;

    async function check() {
      try {
        const { emails } = await getEmailsAction(undefined, true);
        const now = emails.length;
        if (prevCount.current !== 0 && now > prevCount.current) {
          toast.success(
            `You have ${now - prevCount.current} new email${
              now - prevCount.current > 1 ? "s" : ""
            }`
          );
        }
        prevCount.current = now;
      } catch {}
    }

    check();

    const iv = setInterval(() => {
      if (!stopped) check();
    }, pollIntervalSec * 1000);

    return () => {
      stopped = true;
      clearInterval(iv);
    };
  }, [pollIntervalSec]);
}
