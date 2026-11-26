"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  Clock,
  ExternalLink,
  HardDrive,
  Images,
  Link2,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { adminApi } from "@/lib/api/admin";
import type { AdminMediaItem, MediaAssetStatus } from "@/types/admin";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function CountdownBadge({ item }: { item: AdminMediaItem }) {
  if (item.isUsed) {
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600 gap-1">
        <CheckCircle2 className="size-3" />
        In use
      </Badge>
    );
  }
  const days = item.daysLeft ?? 30;
  if (days <= 7) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="size-3" />
        {days === 0 ? "Deletes today" : `${days}d left`}
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 gap-1"
    >
      <Clock className="size-3" />
      {days}d left
    </Badge>
  );
}

export default function MediaLibraryPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [status, setStatus] = useState<"all" | MediaAssetStatus>("all");
  const [folder, setFolder] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [previewItem, setPreviewItem] = useState<AdminMediaItem | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [extending, setExtending] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    ids: string[];
    hasUsed: boolean;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [extendDays, setExtendDays] = useState<number>(30);

  const { data, isLoading, mutate } = useProtectedSWR(
    ["admin-media-library", page, pageSize, status, folder, search],
    () =>
      adminApi.getMediaLibrary({
        page,
        limit: pageSize,
        status,
        folder,
        search,
      }),
  );

  const media = data?.media;
  const items = media?.items ?? [];
  const summary = media?.summary;

  const allSelectedOnPage =
    items.length > 0 && items.every((item) => selectedIds.includes(item.id));

  const toggleSelectAll = () => {
    if (allSelectedOnPage) {
      const pageIds = new Set(items.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      setSelectedIds((prev) =>
        Array.from(new Set([...prev, ...items.map((i) => i.id)])),
      );
    }
  };

  const toggleItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.includes(i.id)),
    [items, selectedIds],
  );

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await adminApi.syncMediaLibrary();
      toast.success(
        `Synced ${res.total} Cloudinary asset(s) (${res.imported} imported, ${res.unused} unused)`,
      );
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleCleanup = async () => {
    setCleaning(true);
    try {
      const res = await adminApi.runMediaCleanup();
      toast.success(res.message);
      setSelectedIds([]);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cleanup failed");
    } finally {
      setCleaning(false);
    }
  };

  const handleExtend = async (ids: string[], days = extendDays) => {
    if (!ids.length) return;
    setExtending(true);
    try {
      const res = await adminApi.extendMediaRetention(ids, days);
      toast.success(res.message);
      setSelectedIds([]);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Extend failed");
    } finally {
      setExtending(false);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      const res = await adminApi.deleteMediaAssets(
        deleteDialog.ids,
        deleteDialog.hasUsed,
      );
      toast.success(res.message);
      setDeleteDialog(null);
      setSelectedIds([]);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        description="Inspect all Cloudinary images, trace where each asset is used, monitor 30-day unused auto-deletion countdowns, and extend retention or delete in bulk."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              {syncing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Sync Cloudinary
            </Button>
            <Button
              variant="secondary"
              onClick={handleCleanup}
              disabled={cleaning}
            >
              {cleaning ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              Run 30d Cleanup
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Images className="size-6 text-primary" />
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {summary?.totalAssets ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                Total images ({formatBytes(summary?.totalBytes)})
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="size-6 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {summary?.usedCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                Referenced in stories or profiles
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <HardDrive className="size-6 text-amber-500" />
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {summary?.unusedCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                Earmarked ({formatBytes(summary?.reclaimableBytes)} reclaimable)
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertTriangle className="size-6 text-destructive" />
            <div>
              <p className="text-2xl font-bold tabular-nums">
                {summary?.expiringSoonCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                Deleting within 7 days
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search publicId, uploader, story…"
              className="pl-8"
            />
          </div>

          <Select
            value={status}
            onValueChange={(v) => {
              if (v) {
                setStatus(v as "all" | MediaAssetStatus);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All media</SelectItem>
              <SelectItem value="used">In use</SelectItem>
              <SelectItem value="unused">Earmarked (unused)</SelectItem>
              <SelectItem value="expiring_soon">Expiring ≤ 7 days</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={folder}
            onValueChange={(v) => {
              if (v) {
                setFolder(v);
                setPage(1);
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All folders</SelectItem>
              {(media?.folders ?? []).map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedIds.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2">
            <span className="text-xs font-medium">
              {selectedIds.length} selected
            </span>
            <Select
              value={String(extendDays)}
              onValueChange={(v) => v && setExtendDays(Number(v))}
            >
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="14">+14 days</SelectItem>
                <SelectItem value="30">+30 days</SelectItem>
                <SelectItem value="60">+60 days</SelectItem>
                <SelectItem value="90">+90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExtend(selectedIds, extendDays)}
              disabled={extending}
            >
              <CalendarPlus className="mr-1.5 size-3.5" />
              Extend
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                setDeleteDialog({
                  ids: selectedIds,
                  hasUsed: selectedItems.some((i) => i.isUsed),
                })
              }
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Delete
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelectedOnPage}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Preview</TableHead>
              <TableHead>Asset &amp; Size</TableHead>
              <TableHead>Used In</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Auto-Delete Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-12 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-muted-foreground"
                >
                  No media found. Click &ldquo;Sync Cloudinary&rdquo; to import
                  existing images.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(item.id)}
                      onCheckedChange={() => toggleItem(item.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => setPreviewItem(item)}
                      className="block size-14 overflow-hidden rounded-lg border bg-muted hover:opacity-80"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.url}
                        alt={item.publicId}
                        className="size-full object-cover"
                      />
                    </button>
                  </TableCell>
                  <TableCell className="max-w-[240px]">
                    <p
                      className="truncate font-mono text-xs font-medium"
                      title={item.publicId}
                    >
                      {item.publicId}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">
                        {item.folder}
                      </Badge>
                      <span>{formatBytes(item.bytes)}</span>
                      {item.width && item.height ? (
                        <span>
                          {item.width}×{item.height}
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    {item.usages.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {item.usages.map((u) => (
                          <Link
                            key={`${u.type}-${u.id}`}
                            href={u.href}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline truncate"
                          >
                            <Link2 className="size-3 shrink-0" />
                            <span className="truncate">{u.label}</span>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        Not referenced in DB
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex items-center gap-1.5">
                      <UserIcon className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="truncate max-w-[160px]">
                        {item.uploadedByLabel || "Synced from Cloudinary"}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {format(parseISO(item.createdAt), "MMM d, yyyy")}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <CountdownBadge item={item} />
                      {!item.isUsed && item.scheduledDeleteAt ? (
                        <p className="text-[11px] text-muted-foreground">
                          Deletes{" "}
                          {formatDistanceToNow(
                            parseISO(item.scheduledDeleteAt),
                            { addSuffix: true },
                          )}
                        </p>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      {!item.isUsed ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleExtend([item.id], 30)}
                          disabled={extending}
                          title="Extend retention by 30 days"
                        >
                          <CalendarPlus className="mr-1 size-3.5" />
                          +30d
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          setDeleteDialog({
                            ids: [item.id],
                            hasUsed: item.isUsed,
                          })
                        }
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={media?.pagination.page ?? page}
        totalPages={media?.pagination.totalPages ?? 1}
        total={media?.pagination.total ?? 0}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        disabled={isLoading}
      />

      <Dialog
        open={!!previewItem}
        onOpenChange={(open) => !open && setPreviewItem(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm truncate">
              {previewItem?.publicId}
            </DialogTitle>
          </DialogHeader>
          {previewItem ? (
            <div className="space-y-3">
              <div className="flex max-h-[60vh] items-center justify-center overflow-hidden rounded-lg border bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewItem.url}
                  alt={previewItem.publicId}
                  className="max-h-[60vh] object-contain"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {previewItem.format?.toUpperCase()} ·{" "}
                  {formatBytes(previewItem.bytes)} · {previewItem.width ?? "?"}×
                  {previewItem.height ?? "?"}
                </span>
                <a
                  href={previewItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Open original <ExternalLink className="size-3" />
                </a>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
        title={`Delete ${deleteDialog?.ids.length ?? 0} media file(s)?`}
        description={
          deleteDialog?.hasUsed
            ? "Warning: one or more selected images are currently referenced by a story or user profile. Deleting will also clear those image references and permanently remove the files from Cloudinary."
            : "Selected unused images will be permanently deleted from Cloudinary."
        }
        confirmLabel="Delete permanently"
        destructive
        loading={deleting}
        onConfirm={handleDeleteConfirmed}
      />
    </div>
  );
}
