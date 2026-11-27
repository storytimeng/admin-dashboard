"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
  CheckCircle2,
  KeyRound,
  Laptop,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  Monitor,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Tablet,
} from "lucide-react";
import { toast } from "sonner";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { adminApi } from "@/lib/api/admin";
import type { AdminSessionItem, AdminTwoFactorMethod } from "@/types/admin";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

function DeviceIcon({ deviceType }: { deviceType: string }) {
  const lower = deviceType.toLowerCase();
  if (lower === "mobile") return <Smartphone className="size-5" />;
  if (lower === "tablet") return <Tablet className="size-5" />;
  if (lower === "desktop") return <Laptop className="size-5" />;
  return <Monitor className="size-5" />;
}

export default function SecurityPage() {
  const { data, isLoading, mutate } = useProtectedSWR(
    "admin-security-overview",
    () => adminApi.getSecurityOverview(),
  );

  const security = data?.security;

  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpQrDataUrl, setTotpQrDataUrl] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [settingUpTotp, setSettingUpTotp] = useState(false);
  const [confirmingTotp, setConfirmingTotp] = useState(false);
  const [updatingMethod, setUpdatingMethod] = useState(false);

  const [emailVerifyStep, setEmailVerifyStep] = useState<"idle" | "sent">("idle");
  const [emailVerifyCode, setEmailVerifyCode] = useState("");
  const [sendingEmailVerify, setSendingEmailVerify] = useState(false);
  const [confirmingEmailVerify, setConfirmingEmailVerify] = useState(false);

  const [sessionToRevoke, setSessionToRevoke] =
    useState<AdminSessionItem | null>(null);
  const [confirmRevokeOthers, setConfirmRevokeOthers] = useState(false);
  const [revoking, setRevoking] = useState(false);

  useEffect(() => {
    if (!totpSecret) {
      setTotpQrDataUrl(null);
    }
  }, [totpSecret]);

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await adminApi.updateSessionLocation(
            pos.coords.latitude,
            pos.coords.longitude,
          );
          await mutate();
        } catch {
          // ignore silent geolocation update failures
        }
      },
      () => {},
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }, [mutate]);

  const startTotpSetup = async () => {
    setSettingUpTotp(true);
    try {
      const res = await adminApi.setupAdminTotp();
      setTotpSecret(res.secret);
      const dataUrl = await QRCode.toDataURL(res.otpauthUri, {
        width: 220,
        margin: 1,
      });
      setTotpQrDataUrl(dataUrl);
      setTotpCode("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not start TOTP setup",
      );
    } finally {
      setSettingUpTotp(false);
    }
  };

  const confirmTotpSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!totpSecret) return;
    setConfirmingTotp(true);
    try {
      await adminApi.confirmAdminTotp(totpSecret, totpCode.trim());
      toast.success("Authenticator app 2FA enabled");
      setTotpSecret(null);
      setTotpQrDataUrl(null);
      setTotpCode("");
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Invalid authenticator code",
      );
    } finally {
      setConfirmingTotp(false);
    }
  };

  const toggleMethod = async (
    method: AdminTwoFactorMethod,
    enabled: boolean,
  ) => {
    setUpdatingMethod(true);
    try {
      await adminApi.toggleTwoFactorMethod(method, enabled);
      toast.success(
        `${method.replace("_", " ").toUpperCase()} ${enabled ? "enabled" : "disabled"}`,
      );
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update 2FA method",
      );
    } finally {
      setUpdatingMethod(false);
    }
  };

  const sendEmailVerify = async () => {
    setSendingEmailVerify(true);
    try {
      await adminApi.sendEmail2faVerification();
      setEmailVerifyStep("sent");
      toast.success("Verification code sent to your admin email");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send verification code",
      );
    } finally {
      setSendingEmailVerify(false);
    }
  };

  const confirmEmailVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailVerifyCode.trim()) return;
    setConfirmingEmailVerify(true);
    try {
      await adminApi.confirmEmail2faVerification(emailVerifyCode.trim());
      toast.success("Admin email verified for 2FA");
      setEmailVerifyStep("idle");
      setEmailVerifyCode("");
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Invalid verification code",
      );
    } finally {
      setConfirmingEmailVerify(false);
    }
  };

  const handleRevokeSession = async () => {
    if (!sessionToRevoke) return;
    setRevoking(true);
    try {
      await adminApi.revokeAdminSession(sessionToRevoke.id);
      toast.success(`Deauthenticated ${sessionToRevoke.deviceName}`);
      setSessionToRevoke(null);
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke session",
      );
    } finally {
      setRevoking(false);
    }
  };

  const handleRevokeOthers = async () => {
    setRevoking(true);
    try {
      const res = await adminApi.revokeOtherAdminSessions();
      toast.success(
        `Signed out ${res.revokedCount} other active device session(s)`,
      );
      setConfirmRevokeOthers(false);
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke other sessions",
      );
    } finally {
      setRevoking(false);
    }
  };

  const activeSessions =
    security?.sessions.filter((s) => s.isActive) ?? [];
  const pastSessions =
    security?.sessions.filter((s) => !s.isActive) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & 2FA"
        description="Configure two-factor authentication (Authenticator TOTP, Email Code, or Email Sign-In Link) and manage your signed-in device sessions."
      />

      {isLoading || !security ? (
        <div className="space-y-4">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                {security.twoFactorEnabled ? (
                  <ShieldCheck className="size-6 text-emerald-500" />
                ) : (
                  <ShieldAlert className="size-6 text-amber-500" />
                )}
                <div>
                  <p className="text-lg font-semibold">
                    {security.twoFactorEnabled ? "2FA Enabled" : "2FA Disabled"}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {security.twoFactorEnabled && security.twoFactorMethod
                      ? `Default: ${security.twoFactorMethod.replace("_", " ")}`
                      : "Recommended for all admins"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <Laptop className="size-6 text-primary" />
                <div>
                  <p className="text-lg font-semibold">
                    {security.activeSessionCount} Active Device
                    {security.activeSessionCount === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Signed-in sessions with live refresh tokens
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex items-center gap-3 pt-6">
                <Shield className="size-6 text-muted-foreground" />
                <div>
                  <p className="text-lg font-semibold">
                    {security.hasTotpConfigured
                      ? "Authenticator Ready"
                      : "No Authenticator"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    TOTP QR app configuration status
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Two-Factor Authentication (2FA)
              </CardTitle>
              <CardDescription>
                Choose what happens after you enter your password on sign-in.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 md:grid-cols-3">
                <div
                  className={`rounded-lg border p-4 space-y-3 ${
                    security.totpEnabled ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium text-sm">
                      <Smartphone className="size-4 text-primary" />
                      Authenticator App (TOTP)
                    </span>
                    <Switch
                      checked={Boolean(security.totpEnabled)}
                      disabled={updatingMethod || !security.hasTotpConfigured}
                      onCheckedChange={(checked) =>
                        void toggleMethod("totp", checked)
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use Google Authenticator, 1Password, or Authy for 6-digit
                    rotating codes.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={startTotpSetup}
                      disabled={settingUpTotp}
                    >
                      {settingUpTotp ? (
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      ) : null}
                      {security.hasTotpConfigured
                        ? "Reconfigure QR"
                        : "Set up Authenticator"}
                    </Button>
                  </div>
                </div>

                <div
                  className={`rounded-lg border p-4 space-y-3 ${
                    security.emailOtpEnabled
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium text-sm">
                      <KeyRound className="size-4 text-primary" />
                      Email Verification Code
                    </span>
                    <Switch
                      checked={Boolean(security.emailOtpEnabled)}
                      disabled={
                        updatingMethod || !security.twoFactorEmailVerified
                      }
                      onCheckedChange={(checked) =>
                        void toggleMethod("email_otp", checked)
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Receive a one-time 6-digit code in your admin email after
                    entering your password.
                  </p>
                  {!security.twoFactorEmailVerified ? (
                    <Badge variant="outline" className="text-[11px]">
                      Verify email below to enable
                    </Badge>
                  ) : null}
                </div>

                <div
                  className={`rounded-lg border p-4 space-y-3 ${
                    security.emailLinkEnabled
                      ? "border-primary bg-primary/5"
                      : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium text-sm">
                      <Mail className="size-4 text-primary" />
                      Email Sign-In Link
                    </span>
                    <Switch
                      checked={Boolean(security.emailLinkEnabled)}
                      disabled={
                        updatingMethod || !security.twoFactorEmailVerified
                      }
                      onCheckedChange={(checked) =>
                        void toggleMethod("email_link", checked)
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Receive a one-click confirmation link in your email after
                    entering your password.
                  </p>
                  {!security.twoFactorEmailVerified ? (
                    <Badge variant="outline" className="text-[11px]">
                      Verify email below to enable
                    </Badge>
                  ) : null}
                </div>
              </div>

              {!security.twoFactorEmailVerified ? (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        Verify Admin Email for Email 2FA
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Confirm you can receive codes at your admin email before
                        enabling Email OTP or Email Sign-In Link.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={sendEmailVerify}
                      disabled={sendingEmailVerify}
                    >
                      {sendingEmailVerify ? (
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      ) : null}
                      {emailVerifyStep === "sent"
                        ? "Resend Code"
                        : "Send Verification Code"}
                    </Button>
                  </div>
                  {emailVerifyStep === "sent" ? (
                    <form
                      onSubmit={confirmEmailVerify}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <Input
                        className="max-w-[180px]"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="6-digit OTP"
                        value={emailVerifyCode}
                        onChange={(e) => setEmailVerifyCode(e.target.value)}
                        required
                      />
                      <Button
                        size="sm"
                        type="submit"
                        disabled={confirmingEmailVerify}
                      >
                        {confirmingEmailVerify ? (
                          <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        ) : null}
                        Confirm Email
                      </Button>
                    </form>
                  ) : null}
                </div>
              ) : null}

              {totpSecret && totpQrDataUrl ? (
                <form
                  onSubmit={confirmTotpSetup}
                  className="rounded-lg border bg-muted/30 p-4 space-y-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <img
                      src={totpQrDataUrl}
                      alt="Authenticator QR code"
                      className="size-44 rounded-lg border bg-white p-2"
                    />
                    <div className="space-y-3 flex-1">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">
                          Scan this QR code with your authenticator app
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Manual setup key:{" "}
                          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-foreground">
                            {totpSecret}
                          </code>
                        </p>
                      </div>
                      <div className="max-w-xs space-y-2">
                        <Label htmlFor="confirm-totp">
                          Enter 6-digit code to activate
                        </Label>
                        <div className="flex gap-2">
                          <Input
                            id="confirm-totp"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={totpCode}
                            onChange={(e) => setTotpCode(e.target.value)}
                            required
                          />
                          <Button type="submit" disabled={confirmingTotp}>
                            {confirmingTotp ? (
                              <Loader2 className="mr-1.5 size-4 animate-spin" />
                            ) : null}
                            Verify
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setTotpSecret(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </form>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">
                  Active Device Sessions ({activeSessions.length})
                </CardTitle>
                <CardDescription>
                  Each login creates a tracked session with a refresh token.
                  Deauthenticating a device immediately invalidates both its
                  access and refresh tokens.
                </CardDescription>
              </div>
              {activeSessions.filter((s) => !s.isCurrent).length > 0 ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setConfirmRevokeOthers(true)}
                >
                  <LogOut className="mr-1.5 size-4" />
                  Sign out all other devices
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {activeSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  No active tracked sessions found.
                </p>
              ) : (
                activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <DeviceIcon deviceType={session.deviceType} />
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-sm">
                            {session.deviceName}
                          </span>
                          <Badge variant="outline" className="text-[11px]">
                            {session.deviceType}
                          </Badge>
                          {session.isCurrent ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[11px]">
                              <CheckCircle2 className="mr-1 size-3" />
                              This device
                            </Badge>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3" />
                            {session.location || "Unknown location"}
                            {session.ipAddress ? ` (${session.ipAddress})` : ""}
                            {session.googleMapsUrl ? (
                              <a
                                href={session.googleMapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-1 text-primary underline hover:no-underline"
                              >
                                Map
                              </a>
                            ) : null}
                          </span>
                          <span>
                            Signed in:{" "}
                            {format(
                              parseISO(session.lastLoginAt),
                              "MMM d, yyyy HH:mm",
                            )}
                          </span>
                          <span>
                            Last active:{" "}
                            {formatDistanceToNow(
                              parseISO(session.lastActiveAt),
                              { addSuffix: true },
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!session.isCurrent ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setSessionToRevoke(session)}
                      >
                        Deauthenticate
                      </Button>
                    ) : null}
                  </div>
                ))
              )}

              {pastSessions.length > 0 ? (
                <div className="pt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Recent Revoked / Expired Sessions
                  </p>
                  <div className="space-y-2">
                    {pastSessions.slice(0, 5).map((session) => (
                      <div
                        key={session.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground"
                      >
                        <span>
                          {session.deviceName} ·{" "}
                          {session.location || session.ipAddress || "Unknown"}
                        </span>
                        <span>
                          Revoked{" "}
                          {session.revokedAt
                            ? formatDistanceToNow(
                                parseISO(session.revokedAt),
                                { addSuffix: true },
                              )
                            : "previously"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </>
      )}

      <ConfirmDialog
        open={!!sessionToRevoke}
        onOpenChange={(open) => !open && setSessionToRevoke(null)}
        title="Deauthenticate device?"
        description={
          sessionToRevoke
            ? `"${sessionToRevoke.deviceName}" (${sessionToRevoke.ipAddress || "unknown IP"}) will be signed out immediately.`
            : ""
        }
        confirmLabel="Deauthenticate"
        destructive
        loading={revoking}
        onConfirm={handleRevokeSession}
      />

      <ConfirmDialog
        open={confirmRevokeOthers}
        onOpenChange={setConfirmRevokeOthers}
        title="Sign out all other devices?"
        description="Every active session except your current device will be invalidated immediately."
        confirmLabel="Sign out all others"
        destructive
        loading={revoking}
        onConfirm={handleRevokeOthers}
      />
    </div>
  );
}
