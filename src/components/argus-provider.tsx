"use client";

import { type ReactNode } from "react";
import { ArgusErrorBoundary } from "@argusdev/sdk-react";
import { initArgus } from "@/lib/argus";

initArgus();

function ArgusFallback() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-base font-medium text-foreground">
        Something went wrong
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        The error was reported. Reload the page to continue.
      </p>
      <button
        type="button"
        className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
        onClick={() => window.location.reload()}
      >
        Reload
      </button>
    </div>
  );
}

export function ArgusProvider({ children }: { children: ReactNode }) {
  return (
    <ArgusErrorBoundary fallback={<ArgusFallback />}>
      {children}
    </ArgusErrorBoundary>
  );
}
