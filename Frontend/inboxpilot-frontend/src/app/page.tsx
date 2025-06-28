import { redirect } from "next/navigation";
import { getAuthCookie } from "@/lib/auth";
import { getEmailsAction } from "@/actions/data";

import { EmailList } from "@/components/email-list";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

type PageProps = {
  searchParams?: {
    triage?: string;
  };
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { triage?: string };
}) {
  const triageFilter =
    typeof searchParams?.triage === "string" ? searchParams.triage : undefined;

  const token = getAuthCookie();
  if (!token) {
    redirect("/login");
  }

  const { emails } = await getEmailsAction(triageFilter);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-xl font-semibold">Email Dashboard</h1>
      </header>

      <div className="flex-1 rounded-xl bg-muted/50 p-4">
        <EmailList initialEmails={emails} />
      </div>
    </div>
  );
}
