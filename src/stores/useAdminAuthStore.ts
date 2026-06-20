"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ApiError, clearAdminToken, setAdminToken, getAdminToken, resetSignOutGuard } from "@/lib/api/client";
import { normalizeAdminLoginResponse } from "@/lib/api/auth-helpers";
import { adminApi } from "@/lib/api/admin";
import type { AdminUser } from "@/types/admin";
import { toast } from "sonner";

interface AdminAuthState {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  sessionReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => void;
  setAdmin: (admin: AdminUser | null) => void;
  markSessionReady: () => void;
  clearSession: () => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set) => ({
      admin: null,
      isAuthenticated: false,
      isHydrated: false,
      sessionReady: false,

      hydrate: () => {
        const token = getAdminToken();
        if (!token) {
          set({
            admin: null,
            isAuthenticated: false,
            sessionReady: false,
          });
        }
        set({ isHydrated: true });
      },

      setAdmin: (admin) => {
        set({ admin, isAuthenticated: !!admin });
      },

      markSessionReady: () => {
        set({ sessionReady: true });
      },

      clearSession: () => {
        set({
          admin: null,
          isAuthenticated: false,
          sessionReady: false,
        });
      },

      login: async (email, password) => {
        const raw = await adminApi.login(email, password);
        const result = normalizeAdminLoginResponse(raw);
        setAdminToken(result.access_token);
        resetSignOutGuard();

        try {
          const verified = await adminApi.getProfile({
            silent: true,
            signOutOnUnauthorized: false,
          });
          set({
            admin: verified.admin,
            isAuthenticated: true,
            isHydrated: true,
            sessionReady: true,
          });
        } catch (error) {
          clearAdminToken();
          throw error instanceof ApiError
            ? error
            : new ApiError("Could not verify admin session after login", 401);
        }

        toast.success("Welcome back!");
      },

      logout: async () => {
        try {
          await adminApi.logout();
        } catch {
          // Still clear local session if backend logout fails
        } finally {
          clearAdminToken();
          set({
            admin: null,
            isAuthenticated: false,
            sessionReady: false,
          });
          toast.success("Signed out");
        }
      },
    }),
    {
      name: "storytime-admin-auth",
      partialize: (state) => ({
        admin: state.admin,
        isAuthenticated: state.isAuthenticated,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<AdminAuthState>),
        isHydrated: current.isHydrated,
        sessionReady: current.sessionReady,
      }),
      onRehydrateStorage: () => (state) => {
        state?.hydrate();
      },
    },
  ),
);

export function useAdminRole() {
  return get().admin?.role;
}

function get() {
  return useAdminAuthStore.getState();
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
