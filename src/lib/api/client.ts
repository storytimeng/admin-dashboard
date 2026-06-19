import Cookies from "js-cookie";
import { toast } from "sonner";

const ADMIN_TOKEN_KEY = "adminToken";
const USE_PROXY = process.env.NEXT_PUBLIC_USE_PROXY === "true";
const API_BASE =
  USE_PROXY && typeof window !== "undefined"
    ? "/api/proxy"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

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

export function getAdminToken(): string | undefined {
  return Cookies.get(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string): void {
  Cookies.set(ADMIN_TOKEN_KEY, token, {
    expires: 1,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export function clearAdminToken(): void {
  Cookies.remove(ADMIN_TOKEN_KEY);
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  silent?: boolean;
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
    headers = {},
  } = options;

  const url = `${API_BASE}/${path.replace(/^\//, "")}`;
  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getAdminToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
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

    if (response.status === 401 && auth) {
      clearAdminToken();
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        window.location.href = "/login?session=expired";
      }
    }

    if (!silent) toast.error(message);
    throw new ApiError(message, response.status);
  }

  if (parsed && "data" in parsed && parsed.data !== undefined) {
    return parsed.data as T;
  }

  return parsed as T;
}
