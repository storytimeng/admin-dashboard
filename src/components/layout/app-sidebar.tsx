"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { navItems } from "./nav-config";
import { canAccessModule, useAdminAuthStore } from "@/stores/useAdminAuthStore";
import { Badge } from "@/components/ui/badge";

export function AppSidebar() {
  const pathname = usePathname();
  const admin = useAdminAuthStore((s) => s.admin);

  const visibleItems = navItems.filter((item) =>
    canAccessModule(admin?.role, item.module),
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
            ST
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="font-semibold tracking-tight">Storytime</span>
            <span className="text-xs text-muted-foreground">Admin Console</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4 group-data-[collapsible=icon]:hidden">
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {admin?.firstName} {admin?.lastName}
          </span>
          <Badge variant="secondary" className="w-fit capitalize">
            {admin?.role?.replace("_", " ")}
          </Badge>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
