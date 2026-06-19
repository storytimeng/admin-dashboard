"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearAdminToken, setAdminToken } from "@/lib/api/client";
import { adminApi } from "@/lib/api/admin";
import type { AdminUser } from "@/types/admin";
import { toast } from "sonner";

interface AdminAuthState {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => void;
  setAdmin: (admin: AdminUser | null) => void;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      admin: null,
      isAuthenticated: false,
      isHydrated: false,

      hydrate: () => {
        set({ isHydrated: true });
      },

      setAdmin: (admin) => {
        set({ admin, isAuthenticated: !!admin });
      },

      login: async (email, password) => {
        const result = await adminApi.login(email, password);
        setAdminToken(result.access_token);
        set({ admin: result.admin, isAuthenticated: true });
        toast.success("Welcome back!");
      },

      logout: async () => {
        try {
          await adminApi.logout();
        } catch {
          // Still clear local session if backend logout fails
        } finally {
          clearAdminToken();
          set({ admin: null, isAuthenticated: false });
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
