"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AdminHeader } from "@/components/layout/admin-header";
import { AdminAuthGuard } from "@/components/auth/admin-auth-guard";
import { canAccessRoute, useAdminRole } from "@/stores/useAdminAuthStore";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const role = useAdminRole();
  const allowed = canAccessRoute(role, pathname);

  return (
    <AdminAuthGuard>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AdminHeader />
          <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
            {allowed ? (
              children
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <ShieldAlert className="size-6" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Access Restricted</h2>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Your current role ({role?.replace("_", " ")}) does not have
                    permission to access this section.
                  </p>
                </div>
                <Button render={<Link href="/" />} variant="outline">
                  Back to Dashboard
                </Button>
              </div>
            )}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AdminAuthGuard>
  );
}
