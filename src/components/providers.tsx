"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { ArgusProvider } from "@/components/argus-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ArgusProvider>
      <ThemeProvider>
        <TooltipProvider>
          <AuthProvider>{children}</AuthProvider>
          <Toaster richColors closeButton position="top-right" />
        </TooltipProvider>
      </ThemeProvider>
    </ArgusProvider>
  );
}
