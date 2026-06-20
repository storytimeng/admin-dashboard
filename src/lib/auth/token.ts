import {
  ACCESS_TOKEN_STORAGE_KEY,
  LEGACY_COOKIE_NAME,
  LEGACY_LOCAL_STORAGE_KEYS,
} from "./constants";

/** Compact JWT (header.payload.signature). */
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

let cachedToken: string | null = null;

function safeLocalStorageGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function safeLocalStorageRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage may be unavailable (private mode, security policy, quota).
  }
}

function removeLegacyCookie(name: string): void {
  if (typeof document === "undefined") return;
  const paths = ["/", "/login", ""];
  for (const path of paths) {
    const pathPart = path ? `; path=${path}` : "";
    document.cookie = `${name}=; max-age=0${pathPart}`;
  }
}

export function extractAccessToken(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  let candidate = raw.trim();
  if (!candidate || candidate === "undefined" || candidate === "null") {
    return null;
  }

  while (/^Bearer\s+/i.test(candidate)) {
    candidate = candidate.replace(/^Bearer\s+/i, "").trim();
  }

  if (!JWT_PATTERN.test(candidate)) {
    return null;
  }

  return candidate;
}

export function isAccessToken(
  value: string | null | undefined,
): value is string {
  return extractAccessToken(value ?? "") !== null;
}

export function purgeLegacyAuthStorage(): void {
  if (typeof window === "undefined") return;

  for (const key of LEGACY_LOCAL_STORAGE_KEYS) {
    safeLocalStorageRemove(key);
  }

  removeLegacyCookie(LEGACY_COOKIE_NAME);

  const current = safeLocalStorageGet(ACCESS_TOKEN_STORAGE_KEY);
  if (current && !isAccessToken(current)) {
    safeLocalStorageRemove(ACCESS_TOKEN_STORAGE_KEY);
    cachedToken = null;
  }
}

export function getAccessToken(): string | null {
  if (isAccessToken(cachedToken)) {
    return cachedToken;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const stored = safeLocalStorageGet(ACCESS_TOKEN_STORAGE_KEY);
  const token = extractAccessToken(stored);
  if (token) {
    cachedToken = token;
    return token;
  }

  if (stored) {
    safeLocalStorageRemove(ACCESS_TOKEN_STORAGE_KEY);
  }

  cachedToken = null;
  return null;
}

export function setAccessToken(raw: string): void {
  const token = extractAccessToken(raw);
  if (!token) {
    throw new Error("Invalid access token format");
  }

  cachedToken = token;

  if (typeof window !== "undefined") {
    if (!safeLocalStorageSet(ACCESS_TOKEN_STORAGE_KEY, token)) {
      throw new Error("Unable to persist access token");
    }
  }
}

export function clearAccessToken(): void {
  cachedToken = null;

  if (typeof window !== "undefined") {
    safeLocalStorageRemove(ACCESS_TOKEN_STORAGE_KEY);
  }
}
