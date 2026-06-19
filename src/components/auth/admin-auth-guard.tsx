"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken } from "@/lib/api/client";
import { useAdminAuthStore } from "@/stores/useAdminAuthStore";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isHydrated = useAdminAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);
  const setAdmin = useAdminAuthStore((s) => s.setAdmin);
  const admin = useAdminAuthStore((s) => s.admin);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!admin && isHydrated) {
      setAdmin(null);
      router.replace("/login");
    }
  }, [admin, isHydrated, router, setAdmin]);

  if (!isHydrated || !isAuthenticated || !getAdminToken()) {
    return (
      <div className="flex min-h-svh flex-col gap-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
