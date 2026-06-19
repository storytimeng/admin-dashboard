"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import {
  ADMIN_THEME_DEFAULT,
  applyAdminTheme,
  getAdminThemeSnapshot,
  subscribeAdminTheme,
  type AdminTheme,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: AdminTheme;
  resolvedTheme: AdminTheme;
  setTheme: (theme: AdminTheme) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: AdminTheme;
  disableTransitionOnChange?: boolean;
};

export function ThemeProvider({
  children,
  defaultTheme = ADMIN_THEME_DEFAULT,
  disableTransitionOnChange = false,
}: ThemeProviderProps) {
  const theme = useSyncExternalStore(
    subscribeAdminTheme,
    getAdminThemeSnapshot,
    () => defaultTheme,
  );

  useEffect(() => {
    applyAdminTheme(getAdminThemeSnapshot(), {
      disableTransition: disableTransitionOnChange,
    });
  }, [disableTransitionOnChange]);

  const setTheme = useCallback(
    (nextTheme: AdminTheme) => {
      applyAdminTheme(nextTheme, {
        disableTransition: disableTransitionOnChange,
      });
    },
    [disableTransitionOnChange],
  );

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme: theme,
      setTheme,
    }),
    [theme, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
