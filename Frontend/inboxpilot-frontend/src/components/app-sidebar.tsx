"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { logoutAction } from "@/actions/auth";
import { getProxyEmail } from "@/lib/auth.client";
import { getEmailsAction } from "@/actions/data";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Inbox,
  Mail,
  Briefcase,
  Tag,
  HelpCircle,
  MessageCircleQuestionIcon as QuestionMarkCircle,
  Settings,
  LogOut,
  Flag,
  MessageSquareWarning,
  Home,
} from "lucide-react";

const emailCategories = [
  { title: "Recent Emails", url: "/?new=true", icon: Bell },
  { title: "All Emails", url: "/?triage=All%20Emails", icon: Inbox },
  { title: "Sales", url: "/?triage=Sales", icon: Mail },
  { title: "Applications", url: "/?triage=Applications", icon: Briefcase },
  { title: "Partnerships", url: "/?triage=Partnerships", icon: Tag },
  { title: "Spam", url: "/?triage=Spam", icon: QuestionMarkCircle },
  { title: "Miscellaneous", url: "/?triage=Miscellaneous", icon: HelpCircle },
  { title: "Unsorted", url: "/?triage=Unsorted", icon: QuestionMarkCircle },
  { title: "Offensive", url: "/?triage=Offensive", icon: MessageSquareWarning },
  { title: "Flagged", url: "/?triage=Flagged", icon: Flag },
];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTriage = searchParams.get("triage");
  const newOnly = searchParams.get("new") === "true";

  const [mounted, setMounted] = useState(false);
  const [displayEmail, setDisplayEmail] = useState<string>("");
  const [recentCount, setRecentCount] = useState<number>(0);
  const prevCountRef = useRef<number>(0);

  useEffect(() => {
    setMounted(true);
    const p = getProxyEmail();
    if (p) setDisplayEmail(p);
  }, []);

  // Poll every 5s for the number of "recent" emails (past 2 hours)
  useEffect(() => {
    const poll = async () => {
      try {
        const { emails } = await getEmailsAction(undefined, true);
        const newCount = emails.length;

        if (newCount > prevCountRef.current) {
          const delta = newCount - prevCountRef.current;
          toast.success(`You have ${delta} new email${delta > 1 ? "s" : ""}`);
        }

        prevCountRef.current = newCount;
        setRecentCount(newCount);
      } catch {
        // ignore
      }
    };

    poll();
    const interval = window.setInterval(poll, 5000);
    return () => window.clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logoutAction();
    toast.success("Logged out");
  };

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <Link
          href="/"
          className="flex items-center gap-2 p-2 text-lg font-semibold"
        >
          <Home className="h-6 w-6" />
          <span>InboxPilot</span>
        </Link>
        {mounted && displayEmail && (
          <p className="px-2 text-sm text-gray-500">
            Logged in as <strong>{displayEmail}</strong>
          </p>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Emails</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {emailCategories.map((item) => {
                const isActive =
                  (item.title === "Recent Emails" && newOnly) ||
                  currentTriage === item.title;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link
                        href={item.url}
                        className="flex items-center gap-2 w-full"
                      >
                        <item.icon />
                        <span>{item.title}</span>
                        {item.title === "Recent Emails" && recentCount > 0 && (
                          <span className="ml-auto inline-block rounded-full bg-red-600 px-2 text-xs text-white">
                            {recentCount}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Preferences</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/settings"}>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  );
}
