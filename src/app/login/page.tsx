"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Loader2, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAuthStore } from "@/stores/useAdminAuthStore";
import { adminAuthService } from "@/lib/auth/auth-service";
import { ApiError } from "@/lib/api/client";
import type { AdminTwoFactorChallenge } from "@/types/admin";
import { StorytimeLogo } from "@/components/brand/storytime-logo";
import { ThemeToggle } from "@/components/theme-toggle";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const status = useAdminAuthStore((s) => s.status);
  const login = useAdminAuthStore((s) => s.login);
  const completeTwoFactorLogin = useAdminAuthStore(
    (s) => s.completeTwoFactorLogin,
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challenge, setChallenge] = useState<AdminTwoFactorChallenge | null>(
    null,
  );
  const [activeMethod, setActiveMethod] = useState<
    "totp" | "email_otp" | "email_link"
  >("email_otp");
  const [otpCode, setOtpCode] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingMagicLink, setVerifyingMagicLink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionExpired = searchParams.get("session") === "expired";
  const magicToken = searchParams.get("magicToken");

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (!magicToken) return;
    let cancelled = false;
    setVerifyingMagicLink(true);
    setError(null);
    adminAuthService
      .verifyMagicLink(magicToken)
      .then((admin) => {
        if (cancelled) return;
        completeTwoFactorLogin(admin);
        router.replace("/");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Sign-in link is invalid or expired.",
        );
      })
      .finally(() => {
        if (!cancelled) setVerifyingMagicLink(false);
      });
    return () => {
      cancelled = true;
    };
  }, [magicToken, completeTwoFactorLogin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      if (res.requiresTwoFactor) {
        setChallenge(res.challenge);
        setActiveMethod(res.challenge.method);
        setLinkSent(res.challenge.method === "email_link");
        setOtpCode("");
      } else {
        router.replace("/");
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Login failed. Check your credentials.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challenge || activeMethod === "email_link") return;
    setError(null);
    setLoading(true);
    try {
      const admin = await adminAuthService.verifyTwoFactor(
        challenge.challengeToken,
        otpCode.trim(),
        activeMethod,
      );
      completeTwoFactorLogin(admin);
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Invalid verification code.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmailOption = async (mode: "email_otp" | "email_link") => {
    if (!challenge) return;
    setError(null);
    setSendingEmail(true);
    try {
      const res = await adminAuthService.sendTwoFactorEmail(
        challenge.challengeToken,
        mode,
      );
      setActiveMethod(mode);
      setLinkSent(mode === "email_link");
      toast.success(res.message);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to send email.",
      );
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <Card className="relative w-full max-w-md border-border bg-card/95 shadow-2xl backdrop-blur">
      <CardHeader className="space-y-3 text-center">
        <StorytimeLogo size="lg" priority className="mx-auto justify-center" />
        <CardTitle className="text-2xl">Storytime Admin</CardTitle>
        <CardDescription>
          Sign in to manage stories, users, subscriptions, and operations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sessionExpired ? (
          <Alert className="mb-4">
            <AlertDescription>
              Your session expired. Please sign in again.
            </AlertDescription>
          </Alert>
        ) : null}
        {error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {verifyingMagicLink ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="size-8 animate-spin text-[#F8951D]" />
            <p className="text-sm text-muted-foreground">
              Verifying your email sign-in link…
            </p>
          </div>
        ) : challenge ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <ShieldCheck className="size-4 text-[#F8951D]" />
                Two-Factor Verification Required
              </div>
              <p className="mt-1">
                Account: <span className="font-medium">{challenge.email}</span>
              </p>
            </div>

            {activeMethod === "email_link" ? (
              <div className="space-y-3 rounded-lg border bg-card p-4 text-center">
                <Mail className="mx-auto size-8 text-[#F8951D]" />
                <p className="text-sm font-medium">
                  {linkSent
                    ? "Check your inbox for your sign-in link"
                    : "Send a one-click sign-in link to your email"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Click the link in the email we sent to{" "}
                  <span className="font-medium">{challenge.email}</span> to
                  complete sign-in.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendEmailOption("email_link")}
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : null}
                  Resend sign-in link
                </Button>
              </div>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp-code">
                    {activeMethod === "totp"
                      ? "Authenticator 6-digit code"
                      : "Email 6-digit verification code"}
                  </Label>
                  <Input
                    id="otp-code"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="text-center text-lg tracking-widest"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#F8951D] hover:bg-[#D27527] text-white"
                  disabled={loading || otpCode.trim().length < 6}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Verify & Sign in"
                  )}
                </Button>
              </form>
            )}

            <div className="space-y-2 border-t pt-3">
              <p className="text-xs text-muted-foreground">
                Or verify another way:
              </p>
              <div className="flex flex-wrap gap-2">
                {challenge.hasTotp && activeMethod !== "totp" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveMethod("totp")}
                  >
                    <Smartphone className="mr-1.5 size-3.5" />
                    Authenticator App
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendEmailOption("email_otp")}
                  disabled={sendingEmail}
                >
                  <KeyRound className="mr-1.5 size-3.5" />
                  Email 6-digit code
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleSendEmailOption("email_link")}
                  disabled={sendingEmail}
                >
                  <Mail className="mr-1.5 size-3.5" />
                  Email login link
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setChallenge(null);
                  setError(null);
                }}
              >
                Back to password
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="admin@storytime.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-[#F8951D] hover:bg-[#D27527] text-white"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function LoginFallback() {
  return (
    <Card className="relative w-full max-w-md border-border bg-card/95 shadow-2xl backdrop-blur">
      <CardHeader className="space-y-3 text-center">
        <Skeleton className="mx-auto h-16 w-12 rounded-md" />
        <Skeleton className="mx-auto h-8 w-48" />
        <Skeleton className="mx-auto h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-4">
      <ThemeToggle className="absolute top-4 right-4 z-10" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(248,149,29,0.18),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(255,158,60,0.12),transparent_35%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(248,149,29,0.25),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(255,158,60,0.15),transparent_35%)]" />
      <Suspense fallback={<LoginFallback />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
