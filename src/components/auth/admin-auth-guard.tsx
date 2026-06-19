"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAdminToken } from "@/lib/api/client";
import { adminApi } from "@/lib/api/admin";
import { useAdminAuthStore } from "@/stores/useAdminAuthStore";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isHydrated = useAdminAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAdminAuthStore((s) => s.isAuthenticated);
  const setAdmin = useAdminAuthStore((s) => s.setAdmin);
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;

    const token = getAdminToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    let cancelled = false;
    adminApi
      .getProfile()
      .then((result) => {
        if (cancelled) return;
        setAdmin(result.admin);
        setValidating(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAdmin(null);
        router.replace("/login?session=expired");
      });

    return () => {
      cancelled = true;
    };
  }, [isHydrated, router, setAdmin]);

  if (!isHydrated || validating || !isAuthenticated || !getAdminToken()) {
    return (
      <div className="flex min-h-svh flex-col gap-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
