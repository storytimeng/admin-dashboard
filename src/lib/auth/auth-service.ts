import { apiRequest, ApiError } from "@/lib/api/client";
import type {
  AdminAuthSessionResponse,
  AdminLoginResponse,
  AdminTwoFactorChallenge,
  AdminUser,
} from "@/types/admin";
import {
  clearAccessToken,
  extractAccessToken,
  getAccessToken,
  purgeLegacyAuthStorage,
  setAccessToken,
  setRefreshToken,
} from "./token";

function parseSessionResponse(raw: AdminAuthSessionResponse): {
  accessToken: string;
  refreshToken?: string;
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

  return { accessToken, refreshToken: raw.refresh_token, admin: raw.admin };
}

export class AdminAuthService {
  initialize(): void {
    purgeLegacyAuthStorage();
  }

  hasAccessToken(): boolean {
    return getAccessToken() !== null;
  }

  async login(
    email: string,
    password: string,
  ): Promise<
    | { requiresTwoFactor: true; challenge: AdminTwoFactorChallenge }
    | { requiresTwoFactor: false; admin: AdminUser }
  > {
    const response = await apiRequest<AdminLoginResponse>("admin/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    });

    if ("requiresTwoFactor" in response && response.requiresTwoFactor) {
      return { requiresTwoFactor: true, challenge: response };
    }

    const { accessToken, refreshToken } = parseSessionResponse(
      response as AdminAuthSessionResponse,
    );
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);

    const profile = await this.getProfile(accessToken);
    return { requiresTwoFactor: false, admin: profile };
  }

  async sendTwoFactorEmail(
    challengeToken: string,
    mode: "email_otp" | "email_link",
  ): Promise<{ message: string }> {
    return apiRequest<{ message: string }>("admin/auth/2fa/send-email", {
      method: "POST",
      body: { challengeToken, mode },
      auth: false,
    });
  }

  async verifyTwoFactor(
    challengeToken: string,
    code: string,
    method: "totp" | "email_otp",
  ): Promise<AdminUser> {
    const response = await apiRequest<AdminAuthSessionResponse>(
      "admin/auth/2fa/verify",
      {
        method: "POST",
        body: { challengeToken, code, method },
        auth: false,
      },
    );
    const { accessToken, refreshToken } = parseSessionResponse(response);
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    return this.getProfile(accessToken);
  }

  async verifyMagicLink(token: string): Promise<AdminUser> {
    const response = await apiRequest<AdminAuthSessionResponse>(
      "admin/auth/2fa/verify-link",
      {
        method: "POST",
        body: { token },
        auth: false,
      },
    );
    const { accessToken, refreshToken } = parseSessionResponse(response);
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    return this.getProfile(accessToken);
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
        await apiRequest<{ message: string }>("admin/auth/logout", {
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
