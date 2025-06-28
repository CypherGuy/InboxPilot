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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EmailListProps {
  initialEmails: Email[];
}

const triageColorMap: Record<Email["triage"], string> = {
  Sales: "bg-orange-100 border-orange-300",
  Job: "bg-blue-100 border-blue-300",
  Spam: "bg-red-100 border-red-300",
  Other: "bg-gray-100 border-gray-300",
  Unknown: "bg-zinc-100 border-zinc-300",
  Offensive: "bg-yellow-100 border-yellow-300",
  Flagged: "bg-purple-100 border-purple-300",
  "Business Opportunity": "bg-green-100 border-green-300",
};

export function EmailList({ initialEmails }: EmailListProps) {
  const searchParams = useSearchParams();
  const serverFilter = searchParams.get("triage");
  const viewMode = (searchParams.get("view") || "table") as "grid" | "table";

  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [filter, setFilter] = useState<string>("All");

  const fetchEmails = useCallback(async () => {
    if (initialLoad) setLoading(true);
    try {
      const { emails: fetchedEmails } = await getEmailsAction(
        serverFilter ?? undefined
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
  }, [serverFilter, initialLoad]);

  useEffect(() => {
    fetchEmails();
    const intervalSeconds = parseInt(
      localStorage.getItem("refreshInterval") || "15",
      10
    );
    const interval = setInterval(fetchEmails, intervalSeconds * 1000);
    return () => clearInterval(interval);
  }, [fetchEmails]);

  const filteredEmails = emails
    .filter((email) => filter === "All" || email.triage === filter)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

  return (
    <ScrollArea className="h-[calc(100vh-120px)] rounded-md border p-4">
      <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <h2 className="text-muted-foreground">View all your emails here!</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[220px] border border-black">
            {/* Solid black border s*/}
            <SelectValue placeholder="Filter by Triage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            {Object.keys(triageColorMap).map((key) => (
              <SelectItem key={key} value={key}>
                {key}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && initialLoad ? (
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
      ) : filteredEmails.length === 0 ? (
        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
          <p className="text-muted-foreground">
            No emails found for this category.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredEmails.map((email) => (
            <Card
              key={email.emailId}
              className={`border ${triageColorMap[email.triage]}`}
            >
              <CardHeader>
                <CardTitle>{email.subject || "No Subject"}</CardTitle>
                <p className="text-xs text-muted-foreground italic">
                  {email.triage}
                </p>
                <p className="text-sm text-muted-foreground">
                  From: {email.sender} ({email.fromEmail})
                </p>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="text-xs text-muted-foreground mb-2">
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
              {filteredEmails.map((email, index) => (
                <>
                  <tr
                    className={`${
                      triageColorMap[email.triage]
                    } border border-gray-300`}
                  >
                    <td className="px-4 py-3 font-medium border border-gray-300 rounded-l-md">
                      {email.subject || "No Subject"}
                    </td>
                    <td className="px-4 py-3 border border-gray-300">
                      {email.sender} ({email.fromEmail})
                    </td>
                    <td className="px-4 py-3 border border-gray-300">
                      {email.toEmail}
                    </td>
                    <td className="px-4 py-3 border border-gray-300">
                      {email.triage}
                    </td>
                    <td className="px-4 py-3 border border-gray-300 rounded-r-md">
                      {new Date(email.timestamp).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={5} className="h-2"></td>
                  </tr>
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ScrollArea>
  );
}
