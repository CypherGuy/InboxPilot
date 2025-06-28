"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getEmailsAction, updateTriageAction } from "@/actions/data";
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
import { ShieldAlert, Trash2, Flag } from "lucide-react";

interface EmailListProps {
  initialEmails: Email[];
}

const triageColorMap: Record<Email["triage"], string> = {
  Sales: "bg-pink-100 border-pink-300",
  Applications: "bg-blue-100 border-blue-300",
  Spam: "bg-red-100 border-red-300",
  Miscellaneous: "bg-gray-100 border-gray-300",
  Unsorted: "bg-zinc-100 border-zinc-300",
  Offensive: "bg-yellow-200 border-yellow-400",
  Flagged: "bg-purple-200 border-purple-400",
  Partnerships: "bg-emerald-100 border-emerald-300",
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

  const handleTriageUpdate = async (
    emailId: string,
    timestamp: string,
    newTriage: Email["triage"]
  ) => {
    await updateTriageAction(emailId, timestamp, newTriage);
    toast.success(`Marked as ${newTriage}`);
    fetchEmails();
  };

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
              className={`relative group border ${
                triageColorMap[email.triage]
              }`}
            >
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() =>
                    handleTriageUpdate(
                      email.emailId,
                      email.timestamp,
                      "Offensive"
                    )
                  }
                  title="Mark as Offensive"
                  className="text-xs p-1 rounded bg-yellow-500 hover:bg-yellow-600 text-white"
                >
                  <ShieldAlert className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    handleTriageUpdate(email.emailId, email.timestamp, "Spam")
                  }
                  title="Mark as Spam"
                  className="text-xs p-1 rounded bg-red-500 hover:bg-red-600 text-white"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() =>
                    handleTriageUpdate(
                      email.emailId,
                      email.timestamp,
                      "Flagged"
                    )
                  }
                  title="Mark as Flagged"
                  className="text-xs p-1 rounded bg-green-500 hover:bg-green-600 text-white"
                >
                  <Flag className="w-4 h-4" />
                </button>
              </div>
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
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmails.map((email) => (
                <Fragment key={email.emailId}>
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
                    <td className="px-4 py-3 border border-gray-300">
                      {new Date(email.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 border border-gray-300 flex gap-1">
                      <button
                        onClick={() =>
                          handleTriageUpdate(
                            email.emailId,
                            email.timestamp,
                            "Offensive"
                          )
                        }
                        title="Mark as Offensive"
                        className="text-xs p-1 rounded bg-yellow-500 hover:bg-yellow-600 text-white"
                      >
                        <ShieldAlert className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleTriageUpdate(
                            email.emailId,
                            email.timestamp,
                            "Spam"
                          )
                        }
                        title="Mark as Spam"
                        className="text-xs p-1 rounded bg-red-500 hover:bg-red-600 text-white"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() =>
                          handleTriageUpdate(
                            email.emailId,
                            email.timestamp,
                            "Flagged"
                          )
                        }
                        title="Mark as Flagged"
                        className="text-xs p-1 rounded bg-green-500 hover:bg-green-600 text-white"
                      >
                        <Flag className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={6} className="h-2"></td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ScrollArea>
  );
}
