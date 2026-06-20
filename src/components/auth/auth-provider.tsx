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
    void bootstrap();
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
