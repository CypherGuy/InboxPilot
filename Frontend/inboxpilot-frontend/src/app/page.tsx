import { redirect } from "next/navigation";
import { getAuthCookie } from "@/lib/auth.server";
import { getEmailsAction } from "@/actions/data";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import EmailDashboardClient from "@/components/email-dashboard-client";

export default async function DashboardPage({ searchParams }: any) {
  const token = await getAuthCookie();
  if (!token) {
    redirect("/login");
  }

  const triageFilter =
    typeof searchParams?.triage === "string" ? searchParams.triage : undefined;
  const newOnly = searchParams?.new === "true";

  const { emails } = await getEmailsAction(triageFilter, newOnly);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-xl font-semibold">Email Dashboard</h1>
      </header>

      <div className="flex-1 rounded-xl bg-muted/50 p-4">
        <EmailDashboardClient
          key={`${triageFilter ?? "all"}-${newOnly ? "new" : "all"}`}
          initialEmails={emails}
        />
      </div>
    </div>
  );
}
