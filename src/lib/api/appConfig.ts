import { apiRequest } from "./client";

/**
 * Mobile app billing config (Storytime Android).
 *
 * GET  /app-config  → public  (no auth)
 * PUT  /app-config  → admin   (uses apiRequest's `auth: true` default)
 *
 * Matches the response shape of the Nest controller
 * `app-config.controller.ts → getConfig()` / `updateConfig()`.
 */
export type AppBillingMode = "reader" | "playbilling";

export interface AppConfigDto {
  id: string;
  mode: AppBillingMode;
  force: boolean;
  updatedAt: string;
}

export interface UpdateAppConfigInput {
  mode: AppBillingMode;
  force?: boolean;
}

export const appConfigApi = {
  /** Public — safe to call from the mobile app on launch. */
  getConfig: () => apiRequest<AppConfigDto>("app-config"),

  /** Admin only — flips the billing mode and/or the force override. */
  updateConfig: (input: UpdateAppConfigInput) =>
    apiRequest<AppConfigDto>("app-config", {
      method: "PUT",
      body: input,
    }),
};
