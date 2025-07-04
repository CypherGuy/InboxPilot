// src/components/email-dashboard-client.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import ViewToggle, { ViewMode } from "@/components/ui/view-toggle";
import { EmailList } from "@/components/email-list";
import { getEmailsAction } from "@/actions/data";
import type { Email } from "@/types/email";

interface Props {
  initialEmails: Email[];
}

export default function EmailDashboardClient({ initialEmails }: Props) {
  const searchParams = useSearchParams();
  const triageFilter = searchParams.get("triage") ?? undefined;
  const newOnly = searchParams.get("new") === "true";

  // server‐fetched list
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  // client‐side triage dropdown
  const [filter, setFilter] = useState<string>("All");
  // view toggle (grid/table)
  const [view, setView] = useState<ViewMode>("grid");

  // show login toast once
  useEffect(() => {
    if (sessionStorage.getItem("showLoginToast")) {
      toast.success("Login successful! 🎉");
      sessionStorage.removeItem("showLoginToast");
    }
  }, []);

  // re-fetch whenever triageFilter or newOnly changes
  useEffect(() => {
    getEmailsAction(triageFilter, newOnly).then(({ emails }) => {
      setEmails(emails);
      setFilter("All"); // reset client filter on category change
    });
  }, [triageFilter, newOnly]);

  return (
    <div className="flex-1 rounded-xl bg-muted/50 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Emails</h2>
        <ViewToggle view={view} onChange={setView} />
      </div>

      <EmailList initialEmails={emails} filter={filter} setFilter={setFilter} />
    </div>
  );
}
