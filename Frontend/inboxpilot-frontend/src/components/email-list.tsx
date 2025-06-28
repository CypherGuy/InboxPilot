"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getEmailsAction } from "@/actions/data";
import { Email } from "@/types/email";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface EmailListProps {
  initialEmails: Email[];
}

const triageColorMap: Record<Email["triage"], string> = {
  Sales: "bg-orange-100 border-orange-300",
  Job: "bg-blue-100 border-blue-300",
  Spam: "bg-red-100 border-red-300",
  Other: "bg-gray-100 border-gray-300",
  Unknown: "bg-zinc-100 border-zinc-300",
  Flagged: "bg-yellow-100 border-yellow-300",
  "Business Opportunity": "bg-green-100 border-green-300",
};

export function EmailList({ initialEmails }: EmailListProps) {
  const searchParams = useSearchParams();
  const triageFilter = searchParams.get("triage");
  const viewMode = (searchParams.get("view") || "table") as "grid" | "table";

  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const fetchEmails = useCallback(async () => {
    if (initialLoad) setLoading(true);
    try {
      const { emails: fetchedEmails } = await getEmailsAction(
        triageFilter ?? undefined
      );
      setEmails(fetchedEmails);
    } catch (error: any) {
      toast("Error fetching emails", {
        description: error.message || "Could not load emails.",
      });
      setEmails([]);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [triageFilter, initialLoad]);

  useEffect(() => {
    fetchEmails();
    const intervalSeconds = parseInt(
      localStorage.getItem("refreshInterval") || "15",
      10
    );
    const interval = setInterval(fetchEmails, intervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  if (loading && initialLoad) {
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
      {viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {emails.map((email) => (
            <Card
              key={email.emailId}
              className={`border ${triageColorMap[email.triage]}`}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">
                  {email.subject || "No Subject"}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{email.triage}</p>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="text-sm text-muted-foreground">
                  From: {email.sender} ({email.fromEmail})
                </p>
                <p className="text-xs text-muted-foreground">
                  Received: {new Date(email.timestamp).toLocaleString()}
                </p>
                <Separator className="my-2" />
                <p className="line-clamp-4">{email.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-muted text-left">
              <tr>
                <th className="px-4 py-2">Subject</th>
                <th className="px-4 py-2">From</th>
                <th className="px-4 py-2">To</th>
                <th className="px-4 py-2">Triage</th>
                <th className="px-4 py-2">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {emails.map((email) => (
                <tr key={email.emailId} className="border-t hover:bg-muted/50">
                  <td className="px-4 py-2 font-medium">
                    {email.subject || "No Subject"}
                  </td>
                  <td className="px-4 py-2">
                    {email.sender} ({email.fromEmail})
                  </td>
                  <td className="px-4 py-2">{email.toEmail}</td>
                  <td className="px-4 py-2">{email.triage}</td>
                  <td className="px-4 py-2">
                    {new Date(email.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ScrollArea>
  );
}
