"use client";

import { useEffect, useRef, useState } from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
  CheckCircle2,
  Clock,
  DatabaseBackup,
  KeyRound,
  Loader2,
  Lock,
  Play,
  Save,
  ShieldAlert,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { useAdminRole } from "@/stores/useAdminAuthStore";
import { adminApi } from "@/lib/api/admin";
import type { BackupSslMode } from "@/types/admin";
import { PageHeader } from "@/components/shared/page-header";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

export default function BackupsPage() {
  const role = useAdminRole();
  const canEditConfig = role === "super_admin" || role === "developer";

  const { data, isLoading, mutate } = useProtectedSWR(
    "admin-database-backups",
    () => adminApi.getBackups(25),
  );
  const [running, setRunning] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [sslMode, setSslMode] = useState<BackupSslMode>("default_ca");
  const [customCaCert, setCustomCaCert] = useState("");
  const certInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!data?.config) return;
    setUseCustomUrl(data.config.useCustomUrl);
    setSslMode(data.config.sslMode);
    setCustomCaCert(data.config.customCaCert ?? "");
  }, [data?.config]);

  const handleRunBackup = async () => {
    setRunning(true);
    try {
      const res = await adminApi.runManualBackup();
      if (res.backup.status === "success") {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Backup failed");
    } finally {
      setRunning(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await adminApi.updateBackupConfig({
        useCustomUrl,
        ...(customUrlInput.trim() ? { customUrl: customUrlInput.trim() } : {}),
        sslMode,
        customCaCert: customCaCert.trim() || null,
      });
      toast.success(res.message || "Backup configuration saved");
      setCustomUrlInput("");
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save configuration",
      );
    } finally {
      setSavingConfig(false);
    }
  };

  const handleClearCustomUrl = async () => {
    setSavingConfig(true);
    try {
      await adminApi.updateBackupConfig({
        clearCustomUrl: true,
        useCustomUrl: false,
      });
      toast.success("Cleared custom backup URL; reverted to env var");
      setCustomUrlInput("");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to clear URL");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleCertFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCustomCaCert(text.trim());
    setSslMode("custom_ca");
    e.target.value = "";
  };

  const cfg = data?.config;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Database Backups"
        description="Periodic automated replication from the primary PostgreSQL database to Aiven or a custom backup Postgres server."
        actions={
          <Button
            onClick={handleRunBackup}
            disabled={running || data?.isRunning || !data?.configured}
          >
            {running || data?.isRunning ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Play className="mr-2 size-4" />
            )}
            Run Backup Now
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Destination</CardDescription>
                <CardTitle className="text-base flex items-center gap-2">
                  <DatabaseBackup className="size-4 text-primary" />
                  {data?.configured
                    ? cfg?.useCustomUrl
                      ? "Custom Backup DB"
                      : "Env Var (BACKUP_DATABASE_URL)"
                    : "Not Configured"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {data?.targetHost || "Configure below or set BACKUP_DATABASE_URL"}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Schedule &amp; SSL</CardDescription>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  {data?.schedule ?? "Daily at 03:00 AM"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                SSL:{" "}
                {cfg?.sslMode === "custom_ca"
                  ? "Custom CA cert"
                  : cfg?.sslMode === "no_verify"
                    ? "Encrypted (no CA verify)"
                    : cfg?.hasDefaultCaFile
                      ? "Default ./ca.pem"
                      : "Encrypted (no CA file found)"}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Last Backup</CardDescription>
                <CardTitle className="text-base">
                  {data?.lastBackup ? (
                    data.lastBackup.status === "success" ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle2 className="size-4" />
                        Succeeded
                      </span>
                    ) : data.lastBackup.status === "running" ? (
                      <span className="inline-flex items-center gap-1.5 text-amber-600">
                        <Loader2 className="size-4 animate-spin" />
                        Running
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-destructive">
                        <ShieldAlert className="size-4" />
                        Failed
                      </span>
                    )
                  ) : (
                    "No backups yet"
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {data?.lastBackup
                  ? `${formatDistanceToNow(parseISO(data.lastBackup.startedAt), { addSuffix: true })} · ${data.lastBackup.rowsBackedUp} rows`
                  : "Click Run Backup Now to create the first snapshot"}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="size-4 text-primary" />
                Backup Destination &amp; SSL Certificate
              </CardTitle>
              <CardDescription>
                Choose between the server&apos;s{" "}
                <code className="font-mono text-xs">BACKUP_DATABASE_URL</code>{" "}
                environment variable or an AES-256-GCM encrypted custom Postgres
                URL. Credentials are never exposed back to the browser.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveConfig} className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3.5">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      Use Custom Backup Database URL
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {cfg?.envConfigured
                        ? `Env fallback: ${cfg.envMaskedUrl}`
                        : "No BACKUP_DATABASE_URL env var set on server"}
                    </p>
                  </div>
                  <Switch
                    checked={useCustomUrl}
                    disabled={!canEditConfig}
                    onCheckedChange={setUseCustomUrl}
                  />
                </div>

                {useCustomUrl ? (
                  <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label
                        htmlFor="custom-backup-url"
                        className="flex items-center gap-1.5"
                      >
                        <Lock className="size-3.5 text-primary" />
                        Custom PostgreSQL URL (write-only, encrypted at rest)
                      </Label>
                      {cfg?.hasCustomUrl ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono text-[11px]">
                            Saved: {cfg.maskedCustomUrl}
                          </Badge>
                          {canEditConfig ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              onClick={handleClearCustomUrl}
                              disabled={savingConfig}
                            >
                              Clear
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <Input
                      id="custom-backup-url"
                      type="password"
                      disabled={!canEditConfig}
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      placeholder={
                        cfg?.hasCustomUrl
                          ? "Leave blank to keep existing encrypted URL"
                          : "postgres://user:password@host:port/dbname?sslmode=require"
                      }
                    />
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>SSL Verification Mode</Label>
                      <Select
                        value={sslMode}
                        disabled={!canEditConfig}
                        onValueChange={(v) =>
                          v && setSslMode(v as BackupSslMode)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="default_ca">
                            Default ./ca.pem (fallback to main DB cert)
                          </SelectItem>
                          <SelectItem value="custom_ca">
                            Custom CA Certificate (cert.pem)
                          </SelectItem>
                          <SelectItem value="no_verify">
                            SSL without CA verification (self-signed)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <p className="text-xs text-muted-foreground">
                        {sslMode === "default_ca"
                          ? cfg?.hasDefaultCaFile
                            ? "Uses the server's default ./ca.pem file."
                            : "No ./ca.pem file found on server; falls back to encrypted SSL without CA verification."
                          : sslMode === "custom_ca"
                            ? "Verifies the backup server against the public PEM certificate below."
                            : "Encrypts the connection without verifying a CA certificate."}
                      </p>
                    </div>
                  </div>

                  {sslMode === "custom_ca" ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="custom-ca-cert"
                          className="flex items-center gap-1.5"
                        >
                          <ShieldCheck className="size-3.5 text-primary" />
                          Backup Server CA Certificate (PEM, public)
                        </Label>
                        {canEditConfig ? (
                          <>
                            <input
                              ref={certInputRef}
                              type="file"
                              accept=".pem,.crt,.cer,.txt"
                              className="hidden"
                              onChange={handleCertFileUpload}
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => certInputRef.current?.click()}
                            >
                              <Upload className="mr-1.5 size-3.5" />
                              Upload .pem
                            </Button>
                          </>
                        ) : null}
                      </div>
                      <Textarea
                        id="custom-ca-cert"
                        rows={6}
                        disabled={!canEditConfig}
                        className="font-mono text-xs"
                        placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                        value={customCaCert}
                        onChange={(e) => setCustomCaCert(e.target.value)}
                      />
                    </div>
                  ) : null}
                </div>

                {canEditConfig ? (
                  <div className="flex justify-end border-t pt-4">
                    <Button type="submit" disabled={savingConfig}>
                      {savingConfig ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 size-4" />
                      )}
                      Save Backup Settings
                    </Button>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">
                    Only Super Admins and Developers can modify backup
                    destination settings.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Backup History</CardTitle>
              <CardDescription>
                Recent scheduled and manual backup runs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!data?.history?.length ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No backup runs recorded yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Triggered By</TableHead>
                      <TableHead>Tables</TableHead>
                      <TableHead>Rows</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.status === "success" ? (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600">
                              Success
                            </Badge>
                          ) : item.status === "running" ? (
                            <Badge variant="secondary">Running</Badge>
                          ) : (
                            <Badge variant="destructive">Failed</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono">
                          {item.triggeredBy}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {item.tablesBackedUp}
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {item.rowsBackedUp.toLocaleString()}
                        </TableCell>
                        <TableCell className="tabular-nums text-xs text-muted-foreground">
                          {item.durationMs != null
                            ? `${(item.durationMs / 1000).toFixed(1)}s`
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(parseISO(item.startedAt), "MMM d, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="max-w-[260px] truncate text-xs text-destructive">
                          {item.errorMessage || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
