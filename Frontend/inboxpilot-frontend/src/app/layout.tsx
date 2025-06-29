import type React from "react";
import type { Metadata } from "next/types";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { cn } from "@/lib/utils";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Toaster } from "sonner";

import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InboxPilot Dashboard",
  description: "Email triage system dashboard",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Await the cookieStore to access get()
  const cookieStore = await cookies();

  const defaultOpen = cookieStore.get("sidebar:state")?.value === "true";
  const isAuthenticated = !!cookieStore.get("inboxpilot_auth_token")?.value;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.className
        )}
      >
        {isAuthenticated ? (
          <SidebarProvider defaultOpen={defaultOpen}>
            <AppSidebar />
            <SidebarInset>{children}</SidebarInset>
          </SidebarProvider>
        ) : (
          children
        )}
        <Toaster />
      </body>
    </html>
  );
}
