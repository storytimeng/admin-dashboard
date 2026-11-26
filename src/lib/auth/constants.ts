/** Primary storage key for the admin access token (localStorage only). */
export const ACCESS_TOKEN_STORAGE_KEY = "storytime.admin.access_token";

/** Storage key for the admin session refresh token (localStorage only). */
export const REFRESH_TOKEN_STORAGE_KEY = "storytime.admin.refresh_token";

/** Legacy keys from previous auth implementations — purged on startup. */
export const LEGACY_LOCAL_STORAGE_KEYS = [
  "storytime-admin-token",
  "storytime-admin-auth",
] as const;

export const LEGACY_COOKIE_NAME = "adminToken";
