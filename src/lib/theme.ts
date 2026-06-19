export const ADMIN_THEME_STORAGE_KEY = "storytime-admin-theme";

export type AdminTheme = "light" | "dark";

export const ADMIN_THEME_DEFAULT: AdminTheme = "light";

export function getAdminThemeInitScript(): string {
  return `(function(){try{var k=${JSON.stringify(ADMIN_THEME_STORAGE_KEY)};var t=localStorage.getItem(k);if(t!=="light"&&t!=="dark")t=${JSON.stringify(ADMIN_THEME_DEFAULT)};var d=document.documentElement;if(t==="dark")d.classList.add("dark");else d.classList.remove("dark");}catch(e){}})();`;
}

const themeListeners = new Set<() => void>();

export function subscribeAdminTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

export function getAdminThemeSnapshot(): AdminTheme {
  if (typeof window === "undefined") {
    return ADMIN_THEME_DEFAULT;
  }

  if (document.documentElement.classList.contains("dark")) {
    return "dark";
  }

  const stored = localStorage.getItem(ADMIN_THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }

  return ADMIN_THEME_DEFAULT;
}

function disableThemeTransitions(): void {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode("*,*::before,*::after{transition:none!important}"),
  );
  document.head.appendChild(style);
  window.getComputedStyle(document.body);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.head.removeChild(style);
    });
  });
}

export function applyAdminTheme(
  theme: AdminTheme,
  options?: { disableTransition?: boolean },
): void {
  if (typeof window === "undefined") {
    return;
  }

  if (options?.disableTransition) {
    disableThemeTransitions();
  }

  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme);
  themeListeners.forEach((listener) => listener());
}
