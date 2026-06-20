import { toast } from "sonner";
import { getAccessToken, isAccessToken } from "@/lib/auth/token";
import { notifySessionExpired } from "@/lib/auth/session-events";

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

export function isSessionAuthError(status: number, message: string): boolean {
  if (status !== 401) return false;

  const lower = message.toLowerCase();
  return (
    lower.includes("invalid or expired token") ||
    lower.includes("token has been revoked") ||
    lower.includes("authentication token is required") ||
    lower.includes("authentication required") ||
    lower.includes("not authenticated")
  );
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  /** Explicit token override (e.g. immediately after login). */
  accessToken?: string;
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
    accessToken,
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
    const token = accessToken ?? getAccessToken();
    if (!token || !isAccessToken(token)) {
      if (signOutOnUnauthorized) {
        notifySessionExpired();
      }
      throw new ApiError("Authentication required", 401);
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
      signOutOnUnauthorized &&
      isSessionAuthError(response.status, message)
    ) {
      notifySessionExpired();
    }

    if (!silent) toast.error(message);
    throw new ApiError(message, response.status);
  }

  if (parsed && "data" in parsed && parsed.data !== undefined) {
    return parsed.data as T;
  }

  return parsed as T;
}
