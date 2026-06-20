"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAdminToken, getAdminToken } from "@/lib/api/client";
import { adminApi } from "@/lib/api/admin";
import { useAdminAuthStore } from "@/stores/useAdminAuthStore";
import { Skeleton } from "@/components/ui/skeleton";

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isHydrated = useAdminAuthStore((s) => s.isHydrated);
  const sessionReady = useAdminAuthStore((s) => s.sessionReady);
  const setAdmin = useAdminAuthStore((s) => s.setAdmin);
  const markSessionReady = useAdminAuthStore((s) => s.markSessionReady);
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;

    const token = getAdminToken();
    if (!token) {
      setAdmin(null);
      clearAdminToken();
      router.replace("/login");
      return;
    }

    if (sessionReady) {
      setValidating(false);
      return;
    }

    let cancelled = false;
    adminApi
      .validateSession()
      .then((result) => {
        if (cancelled) return;
        setAdmin(result.admin);
        markSessionReady();
        setValidating(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAdmin(null);
        clearAdminToken();
        router.replace("/login?session=expired");
      });

    return () => {
      cancelled = true;
    };
  }, [isHydrated, sessionReady, router, setAdmin, markSessionReady]);

  if (!isHydrated || validating || !getAdminToken()) {
    return (
      <div className="flex min-h-svh flex-col gap-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
