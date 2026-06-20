import Cookies from "js-cookie";
import { toast } from "sonner";

const ADMIN_TOKEN_KEY = "adminToken";
const ADMIN_TOKEN_STORAGE_KEY = "storytime-admin-token";

let memoryAdminToken: string | undefined;
let signOutInProgress = false;

function shouldUseProxy(): boolean {
  if (process.env.NEXT_PUBLIC_USE_PROXY === "true") return true;
  if (process.env.NEXT_PUBLIC_USE_PROXY === "false") return false;
  return process.env.NODE_ENV === "production";
}

function getApiBase(): string {
  if (shouldUseProxy() && typeof window !== "undefined") {
    return "/api/proxy";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
}

export interface ApiEnvelope<T> {
  statusType: string;
  statusCode: number;
  message: string;
  data: T;
  timestamp?: string;
  path?: string;
}

export class ApiError extends Error {
  statusCode: number;
  statusType?: string;

  constructor(message: string, statusCode: number, statusType?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.statusType = statusType;
  }
}

export function isValidAdminToken(
  token: string | null | undefined,
): token is string {
  if (!token || token === "undefined" || token === "null") return false;
  return token.split(".").length === 3;
}

function readStoredAdminToken(): string | undefined {
  const cookieToken = Cookies.get(ADMIN_TOKEN_KEY);
  if (isValidAdminToken(cookieToken)) return cookieToken;

  if (typeof window === "undefined") return undefined;

  const storageToken = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
  if (isValidAdminToken(storageToken)) return storageToken;

  return undefined;
}

export function getAdminToken(): string | undefined {
  if (isValidAdminToken(memoryAdminToken)) {
    return memoryAdminToken;
  }

  const stored = readStoredAdminToken();
  if (stored) {
    memoryAdminToken = stored;
  }
  return stored;
}

export function setAdminToken(token: string): void {
  if (!isValidAdminToken(token)) {
    throw new ApiError("Login response missing a valid access token", 500);
  }

  memoryAdminToken = token;
  resetSignOutGuard();

  Cookies.remove(ADMIN_TOKEN_KEY, { path: "/login" });
  Cookies.remove(ADMIN_TOKEN_KEY, { path: "/" });

  Cookies.set(ADMIN_TOKEN_KEY, token, {
    expires: 7,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  if (typeof window !== "undefined") {
    localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
  }
}

export function clearAdminToken(): void {
  memoryAdminToken = undefined;
  Cookies.remove(ADMIN_TOKEN_KEY, { path: "/login" });
  Cookies.remove(ADMIN_TOKEN_KEY, { path: "/" });
  if (typeof window !== "undefined") {
    localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
  }
}

export function isSessionAuthError(status: number, message: string): boolean {
  if (status !== 401) return false;

  const lower = message.toLowerCase();
  return (
    lower.includes("invalid or expired token") ||
    lower.includes("token has been revoked") ||
    lower.includes("authentication token is required") ||
    lower.includes("refresh tokens cannot be used")
  );
}

export function resetSignOutGuard(): void {
  signOutInProgress = false;
}

export function signOutAdminSession(): void {
  if (typeof window === "undefined" || signOutInProgress) return;

  signOutInProgress = true;
  clearAdminToken();

  // Lazy require avoids a circular dependency between the API client and auth store.
  const { useAdminAuthStore } =
    require("@/stores/useAdminAuthStore") as typeof import("@/stores/useAdminAuthStore");
  useAdminAuthStore.getState().clearSession();

  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login?session=expired";
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  silent?: boolean;
  signOutOnUnauthorized?: boolean;
  headers?: Record<string, string>;
};

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    auth = true,
    silent = false,
    signOutOnUnauthorized = false,
    headers = {},
  } = options;

  const url = `${getApiBase()}/${path.replace(/^\//, "")}`;
  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getAdminToken();
    if (!token) {
      if (signOutOnUnauthorized) {
        signOutAdminSession();
      }
      throw new ApiError("Authentication token is required", 401);
    }

    requestHeaders.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    const message = "Network error. Check your connection and try again.";
    if (!silent) toast.error(message);
    throw new ApiError(message, 0);
  }

  const text = await response.text();
  let parsed: ApiEnvelope<T> | { message?: string; error?: string } | null =
    null;

  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) {
    const message =
      (parsed as ApiEnvelope<T> | null)?.message ||
      (parsed as { message?: string } | null)?.message ||
      (parsed as { error?: string } | null)?.error ||
      `Request failed (${response.status})`;

    if (
      auth &&
      (signOutOnUnauthorized || isSessionAuthError(response.status, message))
    ) {
      signOutAdminSession();
    }

    if (!silent) toast.error(message);
    throw new ApiError(message, response.status);
  }

  if (parsed && "data" in parsed && parsed.data !== undefined) {
    return parsed.data as T;
  }

  return parsed as T;
}
