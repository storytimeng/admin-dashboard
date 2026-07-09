"use client";

import { useEffect, useState } from "react";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { toast } from "sonner";
import {
  RefreshCw,
  ShieldAlert,
  Smartphone,
  CreditCard,
  Save,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { appConfigApi, type AppBillingMode } from "@/lib/api/appConfig";
import { formatDistanceToNow } from "date-fns";

/**
 * /billing — admin controls for the Storytime Android app's billing mode.
 *
 * Two switches that can be flipped independently:
 *
 *   - `mode`   — `reader` (no in-app pricing, Google Play Reader App)
 *               or `playbilling` (Google Play Billing, in-app subscribe)
 *   - `force`  — when ON, the backend mode wins over the APK's build-time
 *               reveal date. Use for emergency rollback or early reveal.
 *
 * The actual UI in the app is rendered by `useBillingMode()` in
 * `storytime-ng` (see `lib/billingMode.ts`).
 */
export default function BillingSettingsPage() {
  const { data, isLoading, error, mutate } = useProtectedSWR("app-config", () =>
    appConfigApi.getConfig(),
  );

  const [mode, setMode] = useState<AppBillingMode>("reader");
  const [force, setForce] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Sync local form state with the SWR payload when it arrives or changes.
  useEffect(() => {
    if (data) {
      setMode(data.mode);
      setForce(data.force);
      setDirty(false);
    }
  }, [data]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updated = await appConfigApi.updateConfig({ mode, force });
      toast.success(
        `App config saved. Live in ${formatDistanceToNow(new Date(updated.updatedAt), { addSuffix: true })}.`,
      );
      await mutate();
      setDirty(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update app config";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const setModeAndDirty = (next: AppBillingMode) => {
    setMode(next);
    setDirty(true);
  };

  const setForceAndDirty = (next: boolean) => {
    setForce(next);
    setDirty(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="App Billing"
        description="Control how the Storytime Android app shows pricing and subscriptions. Switches here take effect within ~5 minutes for active users (SWR revalidation)."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => mutate()}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 size-3.5" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving || isLoading || !dirty}
            >
              {isSaving ? (
                <Loader2 className="mr-2 size-3.5 animate-spin" />
              ) : (
                <Save className="mr-2 size-3.5" />
              )}
              Save changes
            </Button>
          </div>
        }
      />

      {/* Status banner — what the app is currently doing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="size-4" />
            Current live state
          </CardTitle>
          <CardDescription>
            What the Android app is showing right now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertTriangle className="size-4" />
              Could not load current app config. Check your admin permissions.
            </div>
          ) : data ? (
            <div className="flex flex-wrap items-center gap-3">
              <Badge
                variant={data.mode === "playbilling" ? "default" : "secondary"}
              >
                {data.mode === "playbilling" ? (
                  <>
                    <CreditCard className="mr-1 size-3" />
                    Play Billing
                  </>
                ) : (
                  <>
                    <Smartphone className="mr-1 size-3" />
                    Reader App
                  </>
                )}
              </Badge>
              {data.force ? (
                <Badge
                  variant="outline"
                  className="border-amber-500 text-amber-700 dark:text-amber-300"
                >
                  <ShieldAlert className="mr-1 size-3" />
                  Force override ON
                </Badge>
              ) : null}
              <span className="text-sm text-muted-foreground">
                Updated{" "}
                {formatDistanceToNow(new Date(data.updatedAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Mode selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-4" />
            Billing mode
          </CardTitle>
          <CardDescription>
            Determines which UI the Android app shows on the{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              /pricing
            </code>{" "}
            and{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              /premium
            </code>{" "}
            pages.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              value={mode}
              onValueChange={(v) => setModeAndDirty(v as AppBillingMode)}
            >
              <SelectTrigger className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="reader">
                  Reader App — hide in-app pricing
                </SelectItem>
                <SelectItem value="playbilling">
                  Play Billing — show in-app subscription
                </SelectItem>
              </SelectContent>
            </Select>
          )}

          {mode === "reader" ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm dark:border-amber-900 dark:bg-amber-950/30">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div>
                <p className="font-medium text-amber-900 dark:text-amber-200">
                  Reader App mode
                </p>
                <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                  Users will see a notice telling them to subscribe on the web.
                  Google Play policy compliant — no in-app prices, no in-app
                  subscribe button.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm dark:border-blue-900 dark:bg-blue-950/30">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-200">
                  Play Billing mode
                </p>
                <p className="mt-0.5 text-blue-800 dark:text-blue-300">
                  Make sure your Google Play Console listing is approved for
                  in-app subscriptions BEFORE flipping this. Otherwise the app
                  will show a Subscribe button that fails at checkout.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Force override */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="size-4" />
            Force override
          </CardTitle>
          <CardDescription>
            When enabled, the backend mode above always wins — overriding the
            APK&apos;s build-time reveal date.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor="force" className="flex-1 cursor-pointer">
              <span className="block font-medium">
                Override build-time reveal date
              </span>
              <span className="block text-sm text-muted-foreground">
                Useful for emergency rollbacks or for testing in beta channels.
              </span>
            </Label>
            <Switch
              id="force"
              checked={force}
              onCheckedChange={setForceAndDirty}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Help footer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How this works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            1. The mobile app queries{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              GET /app-config
            </code>{" "}
            on every launch and every 5 minutes.
          </p>
          <p>
            2. If <strong>force</strong> is on, the backend mode wins
            immediately. If off, the build-time reveal date (baked into the APK)
            decides.
          </p>
          <p>
            3. If the request fails, the app falls back to{" "}
            <strong>Reader App</strong> mode — the safe default that keeps the
            app Play-policy compliant.
          </p>
          <p className="pt-2">
            <a
              href="https://support.google.com/googleplay/android-developer/answer/9888077"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Google Play Reader Apps policy
              <ExternalLink className="size-3" />
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
