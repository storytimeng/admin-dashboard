import { apiRequest, ApiError } from "@/lib/api/client";
import type { AdminLoginResponse, AdminUser } from "@/types/admin";
import {
  clearAccessToken,
  extractAccessToken,
  getAccessToken,
  purgeLegacyAuthStorage,
  setAccessToken,
} from "./token";

function parseLoginResponse(raw: AdminLoginResponse): {
  accessToken: string;
  admin: AdminUser;
} {
  const accessToken = extractAccessToken(raw.access_token);
  if (!accessToken) {
    throw new ApiError(
      "Login response did not include a valid access token",
      500,
    );
  }

  if (!raw.admin || typeof raw.admin !== "object") {
    throw new ApiError("Login response did not include admin profile", 500);
  }

  return { accessToken, admin: raw.admin };
}

export class AdminAuthService {
  initialize(): void {
    purgeLegacyAuthStorage();
  }

  hasAccessToken(): boolean {
    return getAccessToken() !== null;
  }

  async login(email: string, password: string): Promise<AdminUser> {
    const response = await apiRequest<AdminLoginResponse>("admin/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });

    const { accessToken } = parseLoginResponse(response);
    setAccessToken(accessToken);

    const profile = await this.getProfile(accessToken);
    return profile;
  }

  async getProfile(accessToken?: string): Promise<AdminUser> {
    const token = accessToken ?? getAccessToken();
    if (!token) {
      throw new ApiError("Authentication required", 401);
    }

    const response = await apiRequest<{ message: string; admin: AdminUser }>(
      "admin/profile",
      {
        auth: true,
        accessToken: token,
        silent: true,
      },
    );

    return response.admin;
  }

  async logout(): Promise<void> {
    try {
      if (getAccessToken()) {
        await apiRequest<{ message: string }>("auth/logout", {
          method: "POST",
          auth: true,
          silent: true,
        });
      }
    } catch {
      // Local session is always cleared even if the backend call fails.
    } finally {
      clearAccessToken();
    }
  }

  clearLocalSession(): void {
    clearAccessToken();
  }
}

export const adminAuthService = new AdminAuthService();
