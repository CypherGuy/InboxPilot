"use client";

import { useState } from "react";
import ViewToggle, { ViewMode } from "@/components/ui/view-toggle";
import { EmailList } from "@/components/email-list";
import { Email } from "@/types/email";

interface Props {
  initialEmails: Email[];
}

export default function EmailDashboardClient({ initialEmails }: Props) {
  const [view, setView] = useState<ViewMode>("grid");

  return (
    <div className="flex-1 rounded-xl bg-muted/50 p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Emails</h2>
        <ViewToggle view={view} onChange={setView} />
      </div>

      <EmailList initialEmails={initialEmails} />
    </div>
  );
}
