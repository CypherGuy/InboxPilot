"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { logoutAction } from "@/actions/auth";
import { getUserID } from "@/lib/auth.client";
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
} from "lucide-react";

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTriage = searchParams.get("triage");
  const isNewTab = searchParams.get("new") === "true";

  const [seenNew, setSeenNew] = useState<boolean>(false);
  const userEmail = getUserID() || "";

  useEffect(() => {
    if (!userEmail) return;
    const key = `seenNew_${userEmail}`;
    const stored = localStorage.getItem(key);
    setSeenNew(stored === "true");
    if (isNewTab && stored !== "true") {
      localStorage.setItem(key, "true");
      setSeenNew(true);
    }
  }, [isNewTab, userEmail]);

  const handleLogout = async () => {
    await logoutAction();
    toast("Logged Out", {
      description: "You have been successfully logged out.",
    });
  };

  const emailCategories = [
    { title: "Recent Emails", url: "/?new=true", icon: Bell },
    { title: "All Emails", url: "/?triage=All Emails", icon: Inbox },
    { title: "Sales", url: "/?triage=Sales", icon: Mail },
    { title: "Applications", url: "/?triage=Applications", icon: Briefcase },
    { title: "Partnerships", url: "/?triage=Partnerships", icon: Tag },
    { title: "Spam", url: "/?triage=Spam", icon: QuestionMarkCircle },
    { title: "Miscellaneous", url: "/?triage=Miscellaneous", icon: HelpCircle },
    { title: "Unsorted", url: "/?triage=Unsorted", icon: HelpCircle },
    {
      title: "Offensive",
      url: "/?triage=Offensive",
      icon: MessageSquareWarning,
    },
    { title: "Flagged", url: "/?triage=Flagged", icon: Flag },
  ];

  return (
    <Sidebar {...props}>
      <SidebarHeader className="flex flex-col gap-2">
        <div className="flex items-center gap-2 p-2 text-lg font-semibold">
          <Link href="/" className="flex items-center gap-2">
            <Inbox className="h-6 w-6" />
            <span>InboxPilot</span>
          </Link>
        </div>
        {userEmail && (
          <div className="px-4 text-sm text-muted-foreground">
            Logged in as
            <br />
            <span className="font-medium">{userEmail}</span>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Emails</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {emailCategories.map((item) => {
                const isActive =
                  item.title === "New Emails"
                    ? isNewTab
                    : currentTriage === item.title;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link
                        href={item.url}
                        className="flex items-center justify-between w-full px-4 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </div>
                        {item.title === "New Emails" && !seenNew && (
                          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
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
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-4 py-2"
                  >
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 px-4 py-2"
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
