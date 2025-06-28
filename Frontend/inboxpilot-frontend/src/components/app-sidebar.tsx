"use client";

import type * as React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Inbox,
  Mail,
  Briefcase,
  SpellCheckIcon as Spam,
  Tag,
  HelpCircle,
  MessageCircleQuestionIcon as QuestionMarkCircle,
  Settings,
  LogOut,
  Home,
  Flag,
  MessageSquareWarning,
} from "lucide-react";
import { toast } from "sonner";
import { logoutAction } from "@/actions/auth";

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

const emailCategories = [
  {
    title: "All Emails",
    url: "/?triage=All Emails",
    icon: Inbox,
  },
  {
    title: "Sales",
    url: "/?triage=Sales",
    icon: Mail,
  },
  {
    title: "Applications",
    url: "/?triage=Applications",
    icon: Briefcase,
  },
  {
    title: "Partnerships",
    url: "/?triage=Partnerships",
    icon: Tag,
  },
  {
    title: "Spam",
    url: "/?triage=Spam",
    icon: Spam,
  },
  {
    title: "Miscellaneous",
    url: "/?triage=Miscellaneous",
    icon: HelpCircle,
  },
  {
    title: "Unsorted",
    url: "/?triage=Unsorted",
    icon: QuestionMarkCircle,
  },
  {
    title: "Offensive",
    url: "/?triage=Offensive",
    icon: MessageSquareWarning,
  },
  {
    title: "Flagged",
    url: "/?triage=Flagged",
    icon: Flag,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTriage = searchParams.get("triage");

  const handleLogout = async () => {
    await logoutAction();
    toast("Logged Out", {
      description: "You have been successfully logged out.",
    });
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
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Emails</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {emailCategories.map((item) => {
                const isActive = currentTriage === item.title;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} className="flex items-center gap-2">
                        <item.icon />
                        <span>{item.title}</span>
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
