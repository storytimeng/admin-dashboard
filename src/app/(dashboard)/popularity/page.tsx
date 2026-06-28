"use client";

import { useState } from "react";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { adminApi } from "@/lib/api/admin";
import { RefreshCw, Play, Clock, BarChart2, CheckCircle2, AlertCircle } from "lucide-react";

const CUSTOM_KEY = "custom";

export default function PopularitySettingsPage() {
  const { data, isLoading, error, mutate } = useProtectedSWR(
    "popularity-settings",
    () => adminApi.getPopularitySettings(),
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [customCron, setCustomCron] = useState("");
  const [enabled, setEnabled] = useState<boolean | undefined>(undefined);

  const settings = data?.settings;
  const presets: Record<string, { label: string; cron: string }> =
    data?.presets ?? {};

  const effectiveEnabled = enabled ?? settings?.isEnabled ?? true;

  async function handleSave() {
    const preset = selectedPreset && selectedPreset !== CUSTOM_KEY ? selectedPreset : undefined;
    const cronExpression = selectedPreset === CUSTOM_KEY ? customCron.trim() : undefined;

    if (!preset && !cronExpression && enabled === undefined) {
      toast.error("Select a schedule preset or enter a custom cron expression");
      return;
    }

    setIsSaving(true);
    try {
      await adminApi.updatePopularitySettings({
        preset,
        cronExpression,
        isEnabled: effectiveEnabled,
      });
      await mutate();
      setSelectedPreset("");
      setCustomCron("");
      setEnabled(undefined);
      toast.success("Popularity schedule updated successfully");
    } catch {
      toast.error("Failed to update popularity settings");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleTrigger() {
    setIsTriggering(true);
    try {
      const result = await adminApi.triggerPopularityRefresh();
      await mutate();
      toast.success(
        `Refresh complete — ${result.updated} stories updated in ${(result.durationMs / 1000).toFixed(1)}s`,
      );
    } catch {
      toast.error("Failed to trigger popularity refresh");
    } finally {
      setIsTriggering(false);
    }
  }

  const isDirty =
    selectedPreset !== "" || customCron !== "" || enabled !== undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Popularity Score"
        description="Configure when story popularity scores are recalculated for all stories"
      />

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load popularity settings. Please refresh.</span>
        </div>
      )}

      {settings && (
        <>
          {/* Stats row */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Current Schedule
                </CardDescription>
                <CardTitle className="text-base">{settings.scheduleLabel}</CardTitle>
              </CardHeader>
              <CardContent>
                <code className="text-xs text-muted-foreground">{settings.cronExpression}</code>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Last Run
                </CardDescription>
                <CardTitle className="text-base">
                  {settings.lastRunAt
                    ? new Date(settings.lastRunAt).toLocaleString()
                    : "Never"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {settings.lastRunDurationMs != null && (
                  <p className="text-xs text-muted-foreground">
                    {(settings.lastRunDurationMs / 1000).toFixed(1)}s &bull;{" "}
                    {settings.lastRunStoriesUpdated ?? 0} stories
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <BarChart2 className="h-3.5 w-3.5" /> Status
                </CardDescription>
                <CardTitle className="text-base">
                  {settings.isEnabled ? (
                    <Badge variant="default" className="bg-green-600">Active</Badge>
                  ) : (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Per-story scores still update instantly on likes, views & comments
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Settings card */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule Configuration</CardTitle>
              <CardDescription>
                The bulk refresh recalculates scores for all stories at once.
                Individual stories are still scored in real-time on every
                like, view, and comment — this schedule only controls the
                full recalculation sweep.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable toggle */}
              <div className="flex items-center gap-3">
                <Switch
                  id="enabled"
                  checked={effectiveEnabled}
                  onCheckedChange={(v) => setEnabled(v)}
                />
                <Label htmlFor="enabled">Enable scheduled bulk refresh</Label>
              </div>

              {/* Preset picker */}
              <div className="space-y-2">
                <Label>Schedule Preset</Label>
                <Select
                  value={selectedPreset}
                  onValueChange={setSelectedPreset}
                  disabled={!effectiveEnabled}
                >
                  <SelectTrigger className="w-72">
                    <SelectValue placeholder="Choose a preset…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(presets).map(([key, val]) => (
                      <SelectItem key={key} value={key}>
                        {val.label}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_KEY}>Custom cron expression</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom cron input */}
              {selectedPreset === CUSTOM_KEY && (
                <div className="space-y-2">
                  <Label htmlFor="cron">Custom Cron Expression</Label>
                  <Input
                    id="cron"
                    className="w-72 font-mono"
                    placeholder="0 0 * * 1"
                    value={customCron}
                    onChange={(e) => setCustomCron(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Format: minute hour day-of-month month day-of-week
                    &nbsp;&mdash;&nbsp;
                    <a
                      href="https://crontab.guru"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      crontab.guru
                    </a>
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <Button onClick={handleSave} disabled={isSaving || !isDirty}>
                  {isSaving ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Save Schedule
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Manual trigger card */}
          <Card>
            <CardHeader>
              <CardTitle>Manual Trigger</CardTitle>
              <CardDescription>
                Run a full popularity score recalculation right now without
                waiting for the next scheduled run. This can take a few
                seconds on large catalogues.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={handleTrigger}
                disabled={isTriggering}
              >
                {isTriggering ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                {isTriggering ? "Running…" : "Run Now"}
              </Button>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
