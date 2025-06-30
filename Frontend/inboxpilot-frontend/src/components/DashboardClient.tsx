"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmailList } from "@/components/email-list";
import type { Email } from "@/types/email";

interface DashboardClientProps {
  initialEmails: Email[];
}

export default function DashboardClient({
  initialEmails,
}: DashboardClientProps) {
  const [emails, setEmails] = useState<Email[]>(initialEmails);

  useEffect(() => {
    // Show “Login successful” toast if  in sessionStorage
    if (sessionStorage.getItem("showLoginToast")) {
      toast.success("Login successful! 🎉");
      sessionStorage.removeItem("showLoginToast");
    }
  }, []);

  return <EmailList initialEmails={emails} />;
}
