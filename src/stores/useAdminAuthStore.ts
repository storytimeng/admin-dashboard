"use client";

import { create } from "zustand";
import { ApiError } from "@/lib/api/client";
import { adminAuthService } from "@/lib/auth/auth-service";
import { onSessionExpired } from "@/lib/auth/session-events";
import type { AdminUser } from "@/types/admin";
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
        if (generation !== authOperationGeneration) return;
        set({ status: "unauthenticated", admin: null });
        return;
      }

      const admin = await adminAuthService.getProfile();
      if (generation !== authOperationGeneration) return;
      set({ status: "authenticated", admin });
    } catch {
      if (generation !== authOperationGeneration) return;
      adminAuthService.clearLocalSession();
      set({ status: "unauthenticated", admin: null });
    }
  },

  login: async (email, password) => {
    const generation = ++authOperationGeneration;
    set({ status: "loading" });
    try {
      const admin = await adminAuthService.login(email, password);
      if (generation !== authOperationGeneration) return;
      set({ status: "authenticated", admin });
      toast.success("Welcome back!");
    } catch (error) {
      if (generation !== authOperationGeneration) return;
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
    if (generation !== authOperationGeneration) return;
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

export function canAccessModule(
  role: AdminUser["role"] | undefined,
  module: "core" | "subscriptions" | "email" | "content",
): boolean {
  if (!role) return false;
  if (role === "super_admin" || role === "admin") return true;

  switch (module) {
    case "email":
      return role === "marketing";
    case "core":
    case "subscriptions":
    case "content":
      return false;
    default: {
      const _exhaustive: never = module;
      return _exhaustive;
    }
  }
}

/** Register global session-expired handler (call once from AuthProvider). */
export function bindSessionExpiredHandler(onExpired: () => void): () => void {
  return onSessionExpired(() => {
    useAdminAuthStore.getState().clearSession();
    onExpired();
  });
}
