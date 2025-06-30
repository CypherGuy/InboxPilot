// src/components/email-list.tsx
"use client";

import { Fragment, useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { getEmailsAction, updateTriageAction } from "@/actions/data";
import { apiRequest } from "@/lib/api";
import { getAuthToken, getProxyEmail } from "@/lib/auth.client";
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
import { Input } from "@/components/ui/input";
import { ShieldAlert, Trash2, Flag, Loader2 } from "lucide-react";

interface EmailListProps {
  initialEmails: Email[];
}

const triageColorMap: Record<Email["triage"], string> = {
  Sales: "bg-amber-100 border-amber-300",
  Applications: "bg-blue-100 border-blue-300",
  Spam: "bg-red-100 border-red-300",
  Miscellaneous: "bg-gray-100 border-gray-300",
  Unsorted: "bg-zinc-100 border-zinc-300",
  Offensive: "bg-gray-800 border-gray-900 text-white",
  Flagged: "bg-purple-200 border-purple-400",
  Partnerships: "bg-emerald-100 border-emerald-300",
};

export function EmailList({ initialEmails }: EmailListProps) {
  const searchParams = useSearchParams();
  const serverFilter = searchParams.get("triage") ?? undefined;
  const newOnly = searchParams.get("new") === "true";
  const viewMode = (searchParams.get("view") || "table") as "grid" | "table";

  const [emails, setEmails] = useState<Email[]>(initialEmails);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [filter, setFilter] = useState<string>("All");
  const [query, setQuery] = useState<string>("");
  const [expandedEmailIds, setExpandedEmailIds] = useState<Set<string>>(
    new Set()
  );
  const prevCountRef = useRef(initialEmails.length);

  const toggleExpand = (emailId: string) => {
    setExpandedEmailIds((prev) => {
      const next = new Set(prev);
      next.has(emailId) ? next.delete(emailId) : next.add(emailId);
      return next;
    });
  };

  const fetchEmails = useCallback(async () => {
    if (initialLoad) setLoading(true);

    try {
      const { emails: fetched } = await getEmailsAction(serverFilter, newOnly);
      if (fetched.length > prevCountRef.current) {
        toast.success(
          `${fetched.length - prevCountRef.current} new email(s) received`
        );
      }
      prevCountRef.current = fetched.length;
      setEmails(fetched);
    } catch (err: any) {
      toast.error("Error fetching emails", {
        description: err.message || "Could not load emails.",
      });
      setEmails([]);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [serverFilter, newOnly, initialLoad]);

  useEffect(() => {
    fetchEmails();
    const interval = setInterval(
      () => fetchEmails(),
      parseInt(localStorage.getItem("refreshInterval") || "15", 10) * 1000
    );
    return () => clearInterval(interval);
  }, [fetchEmails]);

  const handleQuerySubmit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const token = getAuthToken();
      const proxyEmail = getProxyEmail();
      if (!token || !proxyEmail) {
        toast.error("Missing authentication", {
          description: "You are not logged in.",
        });
        return;
      }
      const result = await apiRequest(
        "/filter",
        "POST",
        { userID: proxyEmail, query },
        token
      );
      setEmails(result.emails);
    } catch (err: any) {
      toast.error("Filter error", {
        description: err.message || "Could not apply natural language filter.",
      });
    } finally {
      setLoading(false);
    }
  };

  const filtered = emails
    .filter((e) => filter === "All" || e.triage === filter)
    .sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp));

  return (
    <div className="rounded-md border p-4">
      {/* query + filter UI */}
      <div className="mb-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <Input
          className="w-full md:w-1/2 border border-black"
          placeholder="Type natural language query (e.g. 'Emails about lunch')"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleQuerySubmit()}
        />
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-56 border border-black">
            <SelectValue placeholder="Filter by Triage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All</SelectItem>
            {Object.keys(triageColorMap).map((k) => (
              <SelectItem key={k} value={k}>
                {k}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* loading states */}
      {loading && initialLoad && (
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
      )}
      {loading && !initialLoad && (
        <div className="flex flex-col items-center justify-center h-64 space-y-2">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm text-muted-foreground">
            Filtering, please wait...
          </p>
        </div>
      )}

      {/* email list */}
      {!loading && (
        <ScrollArea className="h-[calc(100vh-128px)]">
          <div className="overflow-auto">
            {filtered.length === 0 ? (
              <div className="flex h-64 items-center justify-center rounded-lg border-dashed border">
                <p className="text-muted-foreground">
                  No emails found for this query or category.
                </p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.map((email) => (
                  <Card
                    key={email.emailId}
                    className={`relative border ${
                      triageColorMap[email.triage]
                    } break-words`}
                  >
                    <CardHeader className="space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <CardTitle className="text-base font-semibold max-w-[85%] break-words">
                          {email.subject || "No Subject"}
                        </CardTitle>
                        <div className="flex gap-1">
                          <button
                            onClick={() =>
                              updateTriageAction(
                                email.emailId,
                                email.timestamp,
                                "Offensive"
                              ).then(fetchEmails)
                            }
                            title="Mark as Offensive"
                            className="p-1 rounded bg-yellow-500 hover:bg-yellow-600 text-white"
                          >
                            <ShieldAlert className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              updateTriageAction(
                                email.emailId,
                                email.timestamp,
                                "Spam"
                              ).then(fetchEmails)
                            }
                            title="Mark as Spam"
                            className="p-1 rounded bg-red-500 hover:bg-red-600 text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              updateTriageAction(
                                email.emailId,
                                email.timestamp,
                                "Flagged"
                              ).then(fetchEmails)
                            }
                            title="Mark as Flagged"
                            className="p-1 rounded bg-green-500 hover:bg-green-600 text-white"
                          >
                            <Flag className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs italic text-muted-foreground">
                        {email.triage}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        From: {email.fromEmail}
                      </p>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p className="text-xs mb-2 text-muted-foreground">
                        Received:{" "}
                        {new Date(email.timestamp).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                        })}{" "}
                        UTC
                      </p>
                      <Separator className="my-2 border-gray-900" />
                      {(function () {
                        const isExpanded = expandedEmailIds.has(email.emailId);
                        const limit = 150;
                        const text = isExpanded
                          ? email.body
                          : email.body.slice(0, limit);
                        return (
                          <Fragment>
                            <p className="break-words whitespace-pre-wrap">
                              {text}
                            </p>
                            {email.body.length > limit && (
                              <button
                                onClick={() => toggleExpand(email.emailId)}
                                className="mt-1 text-sm underline text-blue-600"
                              >
                                {isExpanded ? "Show less" : "Show more"}
                              </button>
                            )}
                          </Fragment>
                        );
                      })()}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <table className="min-w-full text-sm border-separate border-spacing-y-1">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="px-4 py-2">Subject</th>
                    <th className="px-4 py-2">From</th>
                    <th className="px-4 py-2">To</th>
                    <th className="px-4 py-2">Triage</th>
                    <th className="px-4 py-2">Received</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((email) => (
                    <tr
                      key={email.emailId}
                      className={triageColorMap[email.triage]}
                    >
                      <td className="px-4 py-3">
                        {email.subject || "No Subject"}
                      </td>
                      <td className="px-4 py-3">{email.fromEmail}</td>
                      <td className="px-4 py-3">{email.toEmail}</td>
                      <td className="px-4 py-3">{email.triage}</td>
                      <td className="px-4 py-3">
                        {new Date(email.timestamp).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: false,
                        })}{" "}
                        UTC
                      </td>
                      <td className="px-4 py-3 flex justify-center items-center gap-3">
                        <button
                          onClick={() =>
                            updateTriageAction(
                              email.emailId,
                              email.timestamp,
                              "Offensive"
                            ).then(fetchEmails)
                          }
                          title="Offensive"
                        >
                          <ShieldAlert className="w-5 h-5 text-yellow-500" />
                        </button>
                        <button
                          onClick={() =>
                            updateTriageAction(
                              email.emailId,
                              email.timestamp,
                              "Spam"
                            ).then(fetchEmails)
                          }
                          title="Spam"
                        >
                          <Trash2 className="w-5 h-5 text-red-500" />
                        </button>
                        <button
                          onClick={() =>
                            updateTriageAction(
                              email.emailId,
                              email.timestamp,
                              "Flagged"
                            ).then(fetchEmails)
                          }
                          title="Flagged"
                        >
                          <Flag className="w-5 h-5 text-green-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
