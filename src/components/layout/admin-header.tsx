"use client";

import { useRouter } from "next/navigation";
import { LogOut, User } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAdminAuthStore } from "@/stores/useAdminAuthStore";
import { Badge } from "@/components/ui/badge";

export function AdminHeader() {
  const router = useRouter();
  const admin = useAdminAuthStore((s) => s.admin);
  const logout = useAdminAuthStore((s) => s.logout);

  const initials = admin
    ? `${admin.firstName?.[0] ?? ""}${admin.lastName?.[0] ?? ""}`.toUpperCase()
    : "AD";

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger />
      <div className="flex flex-1 items-center justify-between gap-4">
        <Badge variant="outline" className="hidden sm:inline-flex capitalize">
          {process.env.NODE_ENV === "production" ? "Production" : "Development"}
        </Badge>
        <DropdownMenu>
          <DropdownMenuTrigger className="relative inline-flex size-9 items-center justify-center rounded-full outline-none hover:bg-accent">
            <Avatar className="size-9">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-1">
                <span className="font-medium">
                  {admin?.firstName} {admin?.lastName}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {admin?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <User className="mr-2 size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive"
            >
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
