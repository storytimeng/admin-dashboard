"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  CheckCircle2,
  Clock3,
  CloudUpload,
  ListTodo,
  Mic,
  Search,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import {
  SerialNumberCell,
  SerialNumberHead,
} from "@/components/shared/serial-number-head";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adminApi } from "@/lib/api/admin";
import type { AudioInventory, NarrationInventoryStatus } from "@/types/admin";

const STATUS_OPTIONS: Array<{
  value: NarrationInventoryStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All statuses" },
  { value: "ready", label: "Uploaded (ready)" },
  { value: "queued", label: "Queued" },
  { value: "pending", label: "Generating" },
  { value: "missing", label: "Not started" },
  { value: "failed", label: "Failed" },
];

function statusBadge(status: NarrationInventoryStatus) {
  switch (status) {
    case "ready":
      return (
        <Badge className="bg-emerald-600 hover:bg-emerald-600">Uploaded</Badge>
      );
    case "queued":
      return <Badge variant="secondary">Queued</Badge>;
    case "pending":
      return (
        <Badge className="bg-amber-500 hover:bg-amber-500">Generating</Badge>
      );
    case "failed":
      return <Badge variant="destructive">Failed</Badge>;
    case "missing":
      return <Badge variant="outline">Not started</Badge>;
    default: {
      const _exhaustive: never = status;
      return <Badge variant="outline">{_exhaustive}</Badge>;
    }
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.round(seconds % 60);
  return `${minutes}m ${remainder}s`;
}

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
            {sub ? (
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function NarrationInventoryView() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [status, setStatus] = useState<NarrationInventoryStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, pageSize]);

  const { data, error, isLoading } = useSWR(
    ["admin-audio-inventory", page, pageSize, status, debouncedSearch],
    () =>
      adminApi.getAudioInventory({
        page,
        limit: pageSize,
        status,
        search: debouncedSearch,
      }),
    { refreshInterval: 30_000 },
  );

  const inventory: AudioInventory | undefined = data?.inventory;
  const summary = inventory?.summary;
  const items = inventory?.items ?? [];

  const statusCounts = useMemo(
    () => inventory?.statusBreakdown ?? null,
    [inventory?.statusBreakdown],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Narration inventory"
        description="Track which stories have human narration uploaded to Cloudinary, which are still in the pregen queue, and which are left to generate."
        actions={
          <Badge variant="outline" className="font-normal">
            Voice: {inventory?.voice ?? "en-US-AvaNeural"}
          </Badge>
        }
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Failed to load narration inventory</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Uploaded stories"
          value={
            summary
              ? `${summary.readyStories}/${summary.listenableStories}`
              : "—"
          }
          sub={
            summary
              ? `${summary.coveragePercent}% coverage · ${summary.totalMp3Segments} MP3 segments on Cloudinary`
              : undefined
          }
          icon={CheckCircle2}
          loading={isLoading}
        />
        <KpiCard
          title="Left to generate"
          value={summary?.missingStories ?? "—"}
          sub={
            statusCounts
              ? `${statusCounts.queued} queued · ${statusCounts.pending} generating`
              : undefined
          }
          icon={ListTodo}
          loading={isLoading}
        />
        <KpiCard
          title="Pregen queue"
          value={inventory?.pregen.queued ?? "—"}
          sub={
            inventory
              ? `${inventory.pregen.processing} processing · ${inventory.pregen.completed} completed`
              : undefined
          }
          icon={Clock3}
          loading={isLoading}
        />
        <KpiCard
          title="Cloudinary records"
          value={summary?.readyWithCloudinaryUrls ?? "—"}
          sub={
            summary
              ? `${summary.readyEpisodeAudio} episode · ${summary.readyChapterAudio} chapter narrations`
              : undefined
          }
          icon={CloudUpload}
          loading={isLoading}
        />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search story title or author…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) =>
            setStatus(value as NarrationInventoryStatus | "all")
          }
        >
          <SelectTrigger className="w-full lg:w-56">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
                {statusCounts && option.value !== "all"
                  ? ` (${statusCounts[option.value]})`
                  : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SerialNumberHead />
              <TableHead>Story</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Segments</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Last updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  No stories match this filter.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => (
                <TableRow key={item.storyId}>
                  <SerialNumberCell
                    index={index}
                    offset={(page - 1) * pageSize}
                  />
                  <TableCell className="max-w-[260px]">
                    <Link
                      href={`/stories/${item.storyId}`}
                      className="font-medium hover:text-primary hover:underline underline-offset-2 line-clamp-2"
                    >
                      {item.title}
                    </Link>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        variant="outline"
                        className="capitalize text-[10px]"
                      >
                        {item.storyStatus}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{item.authorPenName || "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {statusBadge(item.narrationStatus)}
                      {item.pregenStatus && item.narrationStatus !== "ready" ? (
                        <span className="text-xs text-muted-foreground">
                          Pregen: {item.pregenStatus}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {item.segmentCount > 0 ? item.segmentCount : "—"}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {formatDuration(item.totalDurationSeconds)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {item.audioUpdatedAt
                      ? formatDistanceToNow(parseISO(item.audioUpdatedAt), {
                          addSuffix: true,
                        })
                      : item.pregenUpdatedAt
                        ? formatDistanceToNow(parseISO(item.pregenUpdatedAt), {
                            addSuffix: true,
                          })
                        : "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={inventory?.pagination.page ?? page}
        totalPages={inventory?.pagination.totalPages ?? 1}
        total={inventory?.pagination.total ?? 0}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        disabled={isLoading}
      />

      {!isLoading && inventory ? (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Mic className="size-3.5" />
          Auto-refreshes every 30s. Last synced{" "}
          {formatDistanceToNow(parseISO(inventory.generatedAt), {
            addSuffix: true,
          })}
          .
          {summary?.failedStories ? (
            <>
              {" "}
              <XCircle className="inline size-3.5 text-destructive" />
              {summary.failedStories} failed — check Render logs.
            </>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
