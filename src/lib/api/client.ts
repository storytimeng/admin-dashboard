import { toast } from "sonner";
import {
  clearAccessToken,
  getAccessToken,
  getRefreshToken,
  isAccessToken,
  setAccessToken,
  setRefreshToken,
} from "@/lib/auth/token";
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
  return process.env.NEXT_PUBLIC_API_URL || "https://back.storytime.ng";
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
  code?: string;
  hint?: string;
  setup?: string[];

  constructor(
    message: string,
    statusCode: number,
    options?: {
      statusType?: string;
      code?: string;
      hint?: string;
      setup?: string[];
    },
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.statusType = options?.statusType;
    this.code = options?.code;
    this.hint = options?.hint;
    this.setup = options?.setup;
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
    lower.includes("not authenticated") ||
    lower.includes("session has been revoked") ||
    lower.includes("session expired")
  );
}

let inFlightRefresh: Promise<string | null> | null = null;

async function tryRefreshAdminToken(): Promise<string | null> {
  if (inFlightRefresh) return inFlightRefresh;

  inFlightRefresh = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    try {
      const url = `${getApiBase()}/admin/auth/refresh`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) {
        clearAccessToken();
        return null;
      }
      const parsed = await res.json();
      const payload = parsed?.data ?? parsed;
      if (payload?.access_token) {
        setAccessToken(payload.access_token);
        if (payload.refresh_token) {
          setRefreshToken(payload.refresh_token);
        }
        return payload.access_token as string;
      }
      return null;
    } catch {
      return null;
    } finally {
      inFlightRefresh = null;
    }
  })();

  return inFlightRefresh;
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
  skipRefresh?: boolean;
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
    skipRefresh = false,
  } = options;

  const url = `${getApiBase()}/${path.replace(/^\//, "")}`;
  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  if (body !== undefined && !isFormData) {
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
      body:
        body !== undefined
          ? isFormData
            ? (body as FormData)
            : JSON.stringify(body)
          : undefined,
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
    const envelope = parsed as
      | (ApiEnvelope<T> & {
          error?:
            | string
            | {
                code?: string;
                hint?: string;
                setup?: string[];
                details?: unknown;
                error?: string;
              };
        })
      | null;

    let message =
      envelope?.message ||
      (parsed as { error?: string } | null)?.error ||
      `Request failed (${response.status})`;

    // Nest may put a structured payload under `error`
    const errorBody =
      envelope?.error && typeof envelope.error === "object"
        ? envelope.error
        : null;
    const code = errorBody?.code;
    const hint =
      typeof errorBody?.hint === "string" ? errorBody.hint : undefined;
    const setup = Array.isArray(errorBody?.setup)
      ? errorBody.setup.filter((s): s is string => typeof s === "string")
      : undefined;

    if (typeof message !== "string") {
      message = String(message);
    }

    if (
      response.status === 401 &&
      auth &&
      !skipRefresh &&
      getRefreshToken()
    ) {
      const nextToken = await tryRefreshAdminToken();
      if (nextToken) {
        return apiRequest<T>(path, {
          ...options,
          accessToken: nextToken,
          skipRefresh: true,
        });
      }
      notifySessionExpired();
    }

    if (
      auth &&
      signOutOnUnauthorized &&
      isSessionAuthError(response.status, message)
    ) {
      notifySessionExpired();
    }

    if (!silent) toast.error(message);
    throw new ApiError(message, response.status, {
      statusType: envelope?.statusType,
      code,
      hint,
      setup,
    });
  }

  if (parsed && "data" in parsed && parsed.data !== undefined) {
    return parsed.data as T;
  }

  return parsed as T;
}
