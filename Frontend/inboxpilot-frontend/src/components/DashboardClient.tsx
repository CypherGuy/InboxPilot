"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { EmailList } from "@/components/email-list";
import { getEmailsAction } from "@/actions/data";
import type { Email } from "@/types/email";

interface DashboardClientProps {
  initialEmails: Email[];
}

export default function DashboardClient({
  initialEmails,
}: DashboardClientProps) {
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [filter, setFilter] = useState("All");

  const searchParams = useSearchParams();
  const triageFromURL = searchParams.get("triage");

  useEffect(() => {
    const updateFilter = async () => {
      if (triageFromURL) {
        const triage = triageFromURL === "All Emails" ? "All" : triageFromURL;
        setFilter(triage);

        // Fefetch if showing All Emails
        if (triage === "All") {
          try {
            const { emails: fetched } = await getEmailsAction();
            setEmails(fetched);
          } catch (err) {
            toast.error("Failed to load all emails");
          }
        }
      }
    };

    updateFilter();
  }, [triageFromURL]);

  useEffect(() => {
    if (sessionStorage.getItem("showLoginToast")) {
      toast.success("Login successful! 🎉");
      sessionStorage.removeItem("showLoginToast");
    }
  }, []);

  return (
    <EmailList initialEmails={emails} filter={filter} setFilter={setFilter} />
  );
}
