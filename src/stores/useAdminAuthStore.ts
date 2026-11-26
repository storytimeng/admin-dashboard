"use client";

import { create } from "zustand";
import { ApiError } from "@/lib/api/client";
import { adminAuthService } from "@/lib/auth/auth-service";
import { onSessionExpired } from "@/lib/auth/session-events";
import type { AdminUser } from "@/types/admin";
import { navItems, type NavModule } from "@/components/layout/nav-config";
import { toast } from "sonner";

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated";

interface AdminAuthState {
  status: AuthStatus;
  admin: AdminUser | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => void;
}

/** Invalidates in-flight bootstrap when login/logout starts. */
let authOperationGeneration = 0;

function isSuperseded(generation: number): boolean {
  return generation !== authOperationGeneration;
}

export const useAdminAuthStore = create<AdminAuthState>((set, get) => ({
  status: "idle",
  admin: null,

  bootstrap: async () => {
    if (get().status !== "idle") return;

    const generation = ++authOperationGeneration;
    set({ status: "loading" });

    try {
      adminAuthService.initialize();

      if (!adminAuthService.hasAccessToken()) {
        if (isSuperseded(generation)) return;
        set({ status: "unauthenticated", admin: null });
        return;
      }

      const admin = await adminAuthService.getProfile();
      if (isSuperseded(generation)) return;
      set({ status: "authenticated", admin });
    } catch (error) {
      if (isSuperseded(generation)) {
        throw error;
      }
      adminAuthService.clearLocalSession();
      set({ status: "unauthenticated", admin: null });
    }
  },

  login: async (email, password) => {
    const generation = ++authOperationGeneration;
    set({ status: "loading" });
    try {
      const admin = await adminAuthService.login(email, password);
      if (isSuperseded(generation)) {
        throw new ApiError("Login was interrupted. Please try again.", 409);
      }
      set({ status: "authenticated", admin });
      toast.success("Welcome back!");
    } catch (error) {
      if (isSuperseded(generation)) {
        throw error instanceof ApiError
          ? error
          : new ApiError("Login failed. Check your credentials.", 401);
      }
      adminAuthService.clearLocalSession();
      set({ status: "unauthenticated", admin: null });
      throw error instanceof ApiError
        ? error
        : new ApiError("Login failed. Check your credentials.", 401);
    }
  },

  logout: async () => {
    const generation = ++authOperationGeneration;
    await adminAuthService.logout();
    if (isSuperseded(generation)) return;
    set({ status: "unauthenticated", admin: null });
    toast.success("Signed out");
  },

  clearSession: () => {
    authOperationGeneration += 1;
    adminAuthService.clearLocalSession();
    set({ status: "unauthenticated", admin: null });
  },
}));

export function useAdminRole() {
  return useAdminAuthStore((s) => s.admin?.role);
}

export function useIsAuthenticated(): boolean {
  return useAdminAuthStore((s) => s.status === "authenticated");
}

export function useSessionReady(): boolean {
  return useAdminAuthStore((s) => s.status === "authenticated");
}

const ROLE_MODULES: Record<AdminUser["role"], Set<NavModule>> = {
  super_admin: new Set([
    "analytics",
    "moderation",
    "users",
    "admins",
    "subscriptions",
    "email",
    "support",
    "system",
  ]),
  admin: new Set([
    "analytics",
    "moderation",
    "users",
    "admins",
    "subscriptions",
    "email",
    "support",
    "system",
  ]),
  content_moderator: new Set(["analytics", "moderation", "users"]),
  support: new Set(["analytics", "users", "support", "moderation"]),
  finance: new Set(["analytics", "subscriptions"]),
  marketing: new Set(["analytics", "email"]),
  developer: new Set(["analytics", "system"]),
  designer: new Set(["analytics", "moderation"]),
};

export function canAccessModule(
  role: AdminUser["role"] | undefined,
  module: NavModule,
): boolean {
  if (!role) return false;
  return ROLE_MODULES[role]?.has(module) ?? false;
}

export function canAccessRoute(
  role: AdminUser["role"] | undefined,
  pathname: string,
): boolean {
  if (!role) return false;
  if (pathname === "/") return canAccessModule(role, "analytics");
  const matched = navItems
    .filter((item) => item.href !== "/" && pathname.startsWith(item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  if (!matched) return true;
  return canAccessModule(role, matched.module);
}

/** Register global session-expired handler (call once from AuthProvider). */
export function bindSessionExpiredHandler(onExpired: () => void): () => void {
  return onSessionExpired(() => {
    useAdminAuthStore.getState().clearSession();
    onExpired();
  });
}
