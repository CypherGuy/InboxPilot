"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getEmailsAction } from "@/actions/data";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

interface Email {
  emailId: string;
  timestamp: string;
  body: string;
  fromEmail: string;
  sender: string;
  subject: string;
  toEmail: string;
  triage:
    | "Sales"
    | "Job"
    | "Spam"
    | "Other"
    | "Unknown"
    | "Flagged"
    | "Business Opportunity";
  userID: string;
}

interface EmailListProps {
  initialEmails: Email[];
}

export function EmailList({ initialEmails }: EmailListProps) {
  const searchParams = useSearchParams();
  const triageFilter = searchParams.get("triage");
  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [loading, setLoading] = useState(false);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    try {
      const { emails: fetchedEmails } = await getEmailsAction(triageFilter);
      setEmails(fetchedEmails);
    } catch (error: any) {
      toast("Error fetching emails", {
        description: error.message || "Could not load emails.",
        variant: "destructive",
      });
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, [triageFilter]);

  useEffect(() => {
    // Only refetch if the filter changes or on interval. Fetches every 15s
    fetchEmails();
    const interval = setInterval(fetchEmails, 15000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[80%]" />
              <Skeleton className="h-4 w-[90%]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
        <p className="text-muted-foreground">
          No emails found for this category.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-120px)] rounded-md border p-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {emails.map((email) => {
          const isFlagged = email.triage === "Flagged";
          const isViewingFlaggedTab = triageFilter === "Flagged";
          const shouldBlur = isFlagged && !isViewingFlaggedTab;

          return (
            <Card
              key={email.emailId}
              className="relative overflow-hidden group"
            >
              {shouldBlur && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-sm pointer-events-none group-hover:backdrop-blur-0 group-hover:bg-transparent transition-all duration-200">
                  <p className="text-white text-sm font-medium opacity-90 group-hover:opacity-0 transition-opacity duration-200">
                    Flagged Content – Hover to Reveal
                  </p>
                </div>
              )}
              <div
                className={
                  shouldBlur
                    ? "blur-sm pointer-events-none select-none group-hover:blur-none group-hover:pointer-events-auto transition-all duration-200"
                    : ""
                }
              >
                <CardHeader>
                  <CardTitle className="text-lg">
                    {email.subject || "No Subject"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    From: {email.sender} ({email.fromEmail})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    To: {email.toEmail} | Triage: {email.triage}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Received: {new Date(email.timestamp).toLocaleString()}
                  </p>
                </CardHeader>
                <CardContent>
                  <Separator className="my-2" />
                  <p className="line-clamp-4 text-sm">{email.body}</p>
                </CardContent>
              </div>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}
