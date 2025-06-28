import { redirect } from "next/navigation";
import { getAuthCookie } from "@/lib/auth";
import { getReplyTemplateAction } from "@/actions/data";

import { ReplyTemplateForm } from "@/components/reply-template-form";
import { RefreshIntervalForm } from "@/components/refresh-interval-form";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default async function SettingsPage() {
  const token = await getAuthCookie();
  if (!token) {
    redirect("/login"); // Ensure user is authenticated
  }

  const { reply } = await getReplyTemplateAction();
  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-xl font-semibold">Settings</h1>
      </header>
      <div className="flex-1 space-y-6 p-4">
        <p className="text-sm text-muted-foreground">
          Manage your personalisation settings
        </p>

        <div className="max-w-xl w-full">
          <ReplyTemplateForm initialReplyTemplate={reply} />
        </div>

        <div className="max-w-xl w-full rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-1">Auto Refresh Settings</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Control how frequently your dashboard refreshes new emails
            automatically.
          </p>
          <RefreshIntervalForm />
        </div>
      </div>
    </div>
  );
}
