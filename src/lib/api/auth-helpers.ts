import type { AdminLoginResponse, AdminUser } from "@/types/admin";
import { ApiError, isValidAdminToken } from "./client";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export function normalizeAdminLoginResponse(raw: unknown): AdminLoginResponse {
  const top = asRecord(raw);
  if (!top) {
    throw new ApiError("Invalid login response", 500);
  }

  const nested = asRecord(top.data);
  const source =
    typeof top.access_token === "string"
      ? top
      : nested && typeof nested.access_token === "string"
        ? nested
        : top;

  const access_token = source.access_token;
  const admin = source.admin;
  if (typeof access_token !== "string") {
    throw new ApiError("Login response missing access token", 500);
  }
  const token = access_token.trim();

  if (!isValidAdminToken(token)) {
    throw new ApiError("Login response missing access token", 500);
  }

  if (!admin || typeof admin !== "object") {
    throw new ApiError("Login response missing admin profile", 500);
  }

  return {
    message: String(source.message ?? "Admin logged in successfully"),
    access_token: token,
    admin: admin as AdminUser,
  };
}
