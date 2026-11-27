"use client";

import { useState } from "react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
  CheckCircle2,
  Clock,
  DatabaseBackup,
  Loader2,
  Play,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { adminApi } from "@/lib/api/admin";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function BackupsPage() {
  const { data, isLoading, mutate } = useProtectedSWR(
    "admin-database-backups",
    () => adminApi.getBackups(25),
  );
  const [running, setRunning] = useState(false);

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Database Backups"
        description="Periodic automated replication from the primary PostgreSQL database to Aiven for safekeeping."
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
                <CardDescription>Backup Destination</CardDescription>
                <CardTitle className="text-base flex items-center gap-2">
                  <DatabaseBackup className="size-4 text-primary" />
                  {data?.configured ? "Aiven Configured" : "Not Configured"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {data?.targetHost || "Set BACKUP_DATABASE_URL in backend .env"}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Schedule</CardDescription>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  {data?.schedule ?? "Daily at 03:00 AM"}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Upserts all public tables non-destructively
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
              <CardTitle className="text-base">Backup History</CardTitle>
              <CardDescription>
                Recent scheduled and manual backup runs to Aiven.
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
