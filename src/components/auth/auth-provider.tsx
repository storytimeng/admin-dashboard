"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  bindSessionExpiredHandler,
  useAdminAuthStore,
} from "@/stores/useAdminAuthStore";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const bootstrap = useAdminAuthStore((s) => s.bootstrap);
  const pathname = usePathname();

  useEffect(() => {
    void bootstrap().catch(() => {
      // Superseded by a newer auth operation — that operation owns state recovery.
    });
  }, [bootstrap]);

  useEffect(() => {
    return bindSessionExpiredHandler(() => {
      if (!pathname.startsWith("/login")) {
        window.location.href = "/login?session=expired";
      }
    });
  }, [pathname]);

  return <>{children}</>;
}
