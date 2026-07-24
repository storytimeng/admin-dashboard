"use client";

import { init } from "@argusdev/sdk-react";

let initialized = false;

/**
 * Initialize Argus once on the client. Safe to call multiple times.
 * Requires NEXT_PUBLIC_ARGUS_DSN from an Argus React project DSN.
 * @see https://docs.arguserror.xyz/quickstart
 */
export function initArgus(): void {
  if (initialized || typeof window === "undefined") return;

  const dsn = process.env.NEXT_PUBLIC_ARGUS_DSN?.trim();
  if (!dsn) return;

  init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    release:
      process.env.NEXT_PUBLIC_ARGUS_RELEASE ||
      process.env.NEXT_PUBLIC_APP_VERSION ||
      "0.1.0",
  });

  initialized = true;
}
