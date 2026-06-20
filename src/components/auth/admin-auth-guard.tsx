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
  const sessionValidated = useAdminAuthStore((s) => s.sessionValidated);
  const setAdmin = useAdminAuthStore((s) => s.setAdmin);
  const markSessionValidated = useAdminAuthStore((s) => s.markSessionValidated);
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

    if (sessionValidated) {
      setValidating(false);
      return;
    }

    let cancelled = false;
    adminApi
      .getProfile({ silent: true })
      .then((result) => {
        if (cancelled) return;
        setAdmin(result.admin);
        markSessionValidated();
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
  }, [isHydrated, sessionValidated, router, setAdmin, markSessionValidated]);

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
