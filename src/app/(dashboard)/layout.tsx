"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import { AdminAuthGuard } from "@/components/auth/admin-auth-guard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AdminHeader />
          <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AdminAuthGuard>
  );
}
