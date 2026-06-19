"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type ThemeToggleProps = {
  className?: string;
  showLabels?: boolean;
};

export function ThemeToggle({
  className,
  showLabels = false,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = theme === "dark";

  if (!mounted) {
    return <div className={cn("h-9 w-[4.5rem]", className)} aria-hidden />;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2.5 py-1.5",
        className,
      )}
    >
      <Sun
        className={cn(
          "size-4 shrink-0 transition-colors",
          isDark ? "text-muted-foreground" : "text-primary",
        )}
        aria-hidden
      />
      <Switch
        checked={isDark}
        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      />
      <Moon
        className={cn(
          "size-4 shrink-0 transition-colors",
          isDark ? "text-primary" : "text-muted-foreground",
        )}
        aria-hidden
      />
      {showLabels ? (
        <span className="text-xs font-medium text-muted-foreground">
          {isDark ? "Dark" : "Light"}
        </span>
      ) : null}
    </div>
  );
}
