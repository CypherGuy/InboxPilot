// src/app/layout.client.tsx
"use client";

import { ReactNode } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useNewEmailNotifier } from "@/components/useNewEmailNotifier";

interface ClientRootProps {
  defaultOpen: boolean;
  children: ReactNode;
}

export default function ClientRoot({ defaultOpen, children }: ClientRootProps) {
  useNewEmailNotifier(5);

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  );
}
