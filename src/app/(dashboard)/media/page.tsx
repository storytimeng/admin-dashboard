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
  Folder,
  FolderInput,
  FolderPlus,
  HardDrive,
  Images,
  LayoutGrid,
  Link2,
  List,
  Loader2,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { adminApi } from "@/lib/api/admin";
import type {
  AdminMediaItem,
  MediaAssetStatus,
  MediaFolderItem,
} from "@/types/admin";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function StatusBadge({ item }: { item: AdminMediaItem }) {
  if (item.isUsed) {
    return (
      <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
        <CheckCircle2 className="size-3" />
        In use
      </Badge>
    );
  }
  if (item.isProtected || item.status === "protected") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-sky-500/10 border-sky-500/30 text-sky-700 dark:text-sky-300"
      >
        <ShieldCheck className="size-3" />
        Protected
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
      className="gap-1 bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300"
    >
      <Clock className="size-3" />
      {days}d left
    </Badge>
  );
}

type ViewMode = "grid" | "table" | "folders";

export default function MediaLibraryPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
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

  // Folder management
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderPath, setNewFolderPath] = useState("");
  const [newFolderAutoCleanup, setNewFolderAutoCleanup] = useState(false);
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Move / Rename
  const [moveTarget, setMoveTarget] = useState<AdminMediaItem | null>(null);
  const [moveFolder, setMoveFolder] = useState("");
  const [renameBase, setRenameBase] = useState("");
  const [moving, setMoving] = useState(false);
  const [bulkMoveFolder, setBulkMoveFolder] = useState("");

  // Drag & Drop state
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

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
  const folders = media?.folders ?? [];
  const folderMeta: MediaFolderItem[] = media?.folderMeta ?? [];
  const pagination = media?.pagination ?? {
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
  };

  const allOnPageSelected = useMemo(
    () => items.length > 0 && items.every((i) => selectedIds.includes(i.id)),
    [items, selectedIds],
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      const pageIds = new Set(items.map((i) => i.id));
      setSelectedIds((prev) => prev.filter((id) => !pageIds.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...items.map((i) => i.id)]);
      setSelectedIds(Array.from(merged));
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await adminApi.syncMediaLibrary();
      toast.success(
        `Synced ${res.total} images (${res.imported} imported, ${res.unused} auto-cleanup eligible)`,
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

  const handleExtend = async (ids: string[]) => {
    if (!ids.length) return;
    setExtending(true);
    try {
      const res = await adminApi.extendMediaRetention(ids, extendDays);
      toast.success(res.message);
      setSelectedIds([]);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to extend");
    } finally {
      setExtending(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteDialog) return;
    setDeleting(true);
    try {
      const res = await adminApi.deleteMediaAssets(
        deleteDialog.ids,
        deleteDialog.hasUsed,
      );
      toast.success(res.message);
      setDeleteDialog(null);
      setSelectedIds((prev) =>
        prev.filter((id) => !deleteDialog.ids.includes(id)),
      );
      if (previewItem && deleteDialog.ids.includes(previewItem.id)) {
        setPreviewItem(null);
      }
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteFor = (targetItems: AdminMediaItem[]) => {
    setDeleteDialog({
      ids: targetItems.map((i) => i.id),
      hasUsed: targetItems.some((i) => i.isUsed),
    });
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderPath.trim()) return;
    setCreatingFolder(true);
    try {
      await adminApi.createMediaFolder({
        path: newFolderPath.trim(),
        autoCleanup: newFolderAutoCleanup,
        description: newFolderDesc.trim() || undefined,
      });
      toast.success(`Folder "${newFolderPath.trim()}" created`);
      setCreateFolderOpen(false);
      setNewFolderPath("");
      setNewFolderDesc("");
      setNewFolderAutoCleanup(false);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleToggleFolderPolicy = async (
    f: MediaFolderItem,
    autoCleanup: boolean,
  ) => {
    try {
      const res = await adminApi.updateMediaFolderPolicy({
        path: f.path,
        autoCleanup,
      });
      toast.success(res.message);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update policy");
    }
  };

  const handleDeleteFolder = async (path: string) => {
    try {
      await adminApi.deleteMediaFolder(path);
      toast.success(`Folder "${path}" deleted`);
      if (folder === path) setFolder("all");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cannot delete folder");
    }
  };

  const openMoveDialog = (item: AdminMediaItem) => {
    const parts = item.publicId.split("/");
    setMoveTarget(item);
    setMoveFolder(item.folder);
    setRenameBase(parts[parts.length - 1] ?? "");
  };

  const handleMoveOrRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveTarget) return;
    setMoving(true);
    try {
      await adminApi.moveOrRenameMedia(moveTarget.id, {
        targetFolder: moveFolder.trim() || "root",
        newName: renameBase.trim() || undefined,
      });
      toast.success("Media moved/renamed successfully");
      setMoveTarget(null);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Move/rename failed");
    } finally {
      setMoving(false);
    }
  };

  const handleBulkMove = async (targetFolder: string) => {
    if (!selectedIds.length || !targetFolder) return;
    setMoving(true);
    try {
      const res = await adminApi.bulkMoveMedia(selectedIds, targetFolder);
      toast.success(res.message);
      setSelectedIds([]);
      setBulkMoveFolder("");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk move failed");
    } finally {
      setMoving(false);
    }
  };

  const handleDragStart = (
    e: React.DragEvent,
    item: AdminMediaItem,
  ) => {
    const idsToMove = selectedIds.includes(item.id) ? selectedIds : [item.id];
    e.dataTransfer.setData("application/x-media-ids", JSON.stringify(idsToMove));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDropOnFolder = async (
    e: React.DragEvent,
    targetPath: string,
  ) => {
    e.preventDefault();
    setDragOverFolder(null);
    const raw = e.dataTransfer.getData("application/x-media-ids");
    if (!raw) return;
    try {
      const ids = JSON.parse(raw) as string[];
      if (!ids.length) return;
      const res = await adminApi.bulkMoveMedia(ids, targetPath);
      toast.success(res.message);
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Drop move failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        description="Manage Cloudinary folders and assets. Only folders marked Auto-Cleanup are pruned after 30 days unused; all other folders stay protected."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateFolderOpen(true)}
            >
              <FolderPlus className="mr-2 size-4" />
              New Folder
            </Button>
            <Button
              variant="outline"
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Sync Cloudinary
            </Button>
            <Button
              variant="destructive"
              onClick={handleCleanup}
              disabled={cleaning}
            >
              {cleaning ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 size-4" />
              )}
              Run Auto-Cleanup
            </Button>
          </div>
        }
      />

      {summary ? (
        <div className="gap-3 grid sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center text-muted-foreground text-xs">
                <span>Total Media</span>
                <Images className="size-4" />
              </div>
              <p className="mt-1 font-bold tabular-nums text-2xl">
                {summary.totalAssets}
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                {formatBytes(summary.totalBytes)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center text-muted-foreground text-xs">
                <span>In Use</span>
                <CheckCircle2 className="size-4 text-emerald-600" />
              </div>
              <p className="mt-1 font-bold tabular-nums text-emerald-600 text-2xl">
                {summary.usedCount}
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Linked in DB
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center text-muted-foreground text-xs">
                <span>Protected</span>
                <ShieldCheck className="size-4 text-sky-600" />
              </div>
              <p className="mt-1 font-bold tabular-nums text-sky-600 text-2xl">
                {summary.protectedCount ?? 0}
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Safe from auto-delete
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center text-muted-foreground text-xs">
                <span>Auto-Delete Queue</span>
                <Clock className="size-4 text-amber-500" />
              </div>
              <p className="mt-1 font-bold tabular-nums text-amber-600 text-2xl">
                {summary.unusedCount}
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                {formatBytes(summary.reclaimableBytes)} reclaimable
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex justify-between items-center text-muted-foreground text-xs">
                <span>Expiring ≤ 7d</span>
                <AlertTriangle className="size-4 text-destructive" />
              </div>
              <p className="mt-1 font-bold tabular-nums text-destructive text-2xl">
                {summary.expiringSoonCount}
              </p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Extend to keep
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Drag & Drop Folder Bar */}
      {folderMeta.length > 0 ? (
        <div className="space-y-2 bg-card p-3 border rounded-xl">
          <div className="flex justify-between items-center text-muted-foreground text-xs">
            <span>
              Folders (click to filter, or <strong>drag &amp; drop</strong>{" "}
              assets onto a folder to move them)
            </span>
            <button
              type="button"
              onClick={() => {
                setFolder("all");
                setPage(1);
              }}
              className={`underline hover:text-foreground ${folder === "all" ? "font-semibold text-foreground" : ""}`}
            >
              Show all folders
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {folderMeta.map((f) => {
              const isSelected = folder === f.path;
              const isDragTarget = dragOverFolder === f.path;
              return (
                <div
                  key={f.path}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverFolder(f.path);
                  }}
                  onDragLeave={() => setDragOverFolder(null)}
                  onDrop={(e) => void handleDropOnFolder(e, f.path)}
                  onClick={() => {
                    setFolder(f.path);
                    setPage(1);
                    if (viewMode === "folders") setViewMode("grid");
                  }}
                  className={`cursor-pointer inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition ${
                    isDragTarget
                      ? "border-primary bg-primary/15 ring-2 ring-primary/40"
                      : isSelected
                        ? "border-primary bg-primary/10 font-medium"
                        : "hover:bg-muted/60"
                  }`}
                >
                  <Folder className="size-3.5 text-primary shrink-0" />
                  <span>{f.path}</span>
                  <span className="text-muted-foreground">
                    ({f.assetCount})
                  </span>
                  {f.autoCleanup ? (
                    <Badge
                      variant="outline"
                      className="px-1.5 py-0 border-amber-500/40 text-[10px] text-amber-700 dark:text-amber-300"
                    >
                      Auto-clean
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="px-1.5 py-0 text-[10px] text-sky-700 dark:text-sky-300"
                    >
                      Protected
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Filters & View Switcher */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex flex-wrap flex-1 items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="top-1/2 left-3 absolute size-4 text-muted-foreground -translate-y-1/2" />
            <Input
              placeholder="Search publicId, folder, uploader, story..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as "all" | MediaAssetStatus);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="used">In use</SelectItem>
              <SelectItem value="protected">Protected</SelectItem>
              <SelectItem value="unused">Auto-cleanup queue</SelectItem>
              <SelectItem value="expiring_soon">Expiring soon (≤7d)</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={folder}
            onValueChange={(v) => {
              setFolder(v ?? "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Folder" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All folders</SelectItem>
              {folders.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="inline-flex bg-muted/40 p-0.5 border rounded-lg">
          <Button
            size="sm"
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            onClick={() => setViewMode("grid")}
          >
            <LayoutGrid className="mr-1.5 size-3.5" />
            Grid
          </Button>
          <Button
            size="sm"
            variant={viewMode === "table" ? "secondary" : "ghost"}
            onClick={() => setViewMode("table")}
          >
            <List className="mr-1.5 size-3.5" />
            Detailed
          </Button>
          <Button
            size="sm"
            variant={viewMode === "folders" ? "secondary" : "ghost"}
            onClick={() => setViewMode("folders")}
          >
            <Folder className="mr-1.5 size-3.5" />
            Folders
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 ? (
        <div className="flex flex-wrap justify-between items-center gap-3 bg-muted/50 px-4 py-3 border rounded-xl">
          <div className="flex items-center gap-3 font-medium text-sm">
            <span>{selectedIds.length} selected</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={bulkMoveFolder}
              onValueChange={(v) => {
                if (v) void handleBulkMove(v);
              }}
            >
              <SelectTrigger className="w-[170px] h-8">
                <SelectValue placeholder="Move to folder..." />
              </SelectTrigger>
              <SelectContent>
                {folders.map((f) => (
                  <SelectItem key={f} value={f}>
                    Move to: {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(extendDays)}
              onValueChange={(v) => setExtendDays(Number(v))}
            >
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">+15 days</SelectItem>
                <SelectItem value="30">+30 days</SelectItem>
                <SelectItem value="60">+60 days</SelectItem>
                <SelectItem value="90">+90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleExtend(selectedIds)}
              disabled={extending}
            >
              <CalendarPlus className="mr-1.5 size-4" />
              Extend
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                openDeleteFor(
                  items.filter((i) => selectedIds.includes(i.id)),
                )
              }
            >
              <Trash2 className="mr-1.5 size-4" />
              Delete Selected
            </Button>
          </div>
        </div>
      ) : null}

      {isLoading ? (
        <div className="gap-4 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="rounded-xl h-64" />
          ))}
        </div>
      ) : viewMode === "folders" ? (
        <div className="gap-4 grid sm:grid-cols-2 lg:grid-cols-3">
          {folderMeta.map((f) => (
            <Card
              key={f.path}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverFolder(f.path);
              }}
              onDragLeave={() => setDragOverFolder(null)}
              onDrop={(e) => void handleDropOnFolder(e, f.path)}
              className={
                dragOverFolder === f.path
                  ? "border-primary ring-2 ring-primary/40"
                  : ""
              }
            >
              <CardContent className="space-y-4 pt-5">
                <div className="flex justify-between items-start gap-2">
                  <div className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setFolder(f.path);
                        setViewMode("grid");
                        setPage(1);
                      }}
                      className="flex items-center gap-2 font-semibold text-sm text-left hover:underline"
                    >
                      <Folder className="size-4 text-primary" />
                      {f.path}
                    </button>
                    <p className="text-muted-foreground text-xs">
                      {f.assetCount} file(s) · {formatBytes(f.totalBytes)}
                    </p>
                    {f.description ? (
                      <p className="text-muted-foreground text-xs">
                        {f.description}
                      </p>
                    ) : null}
                  </div>
                  {f.autoCleanup ? (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-700 dark:text-amber-300"
                    >
                      Auto-Cleanup
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-sky-700 dark:text-sky-300"
                    >
                      Protected
                    </Badge>
                  )}
                </div>

                <div className="flex justify-between items-center p-2.5 border rounded-lg">
                  <div>
                    <p className="font-medium text-xs">30-Day Auto-Cleanup</p>
                    <p className="text-[11px] text-muted-foreground">
                      {f.autoCleanup
                        ? "Unused files in this folder will auto-delete"
                        : "Protected — never auto-deleted"}
                    </p>
                  </div>
                  <Switch
                    checked={f.autoCleanup}
                    onCheckedChange={(checked) =>
                      void handleToggleFolderPolicy(f, checked)
                    }
                  />
                </div>

                <div className="flex justify-between items-center pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFolder(f.path);
                      setViewMode("grid");
                      setPage(1);
                    }}
                  >
                    Browse Files
                  </Button>
                  {f.assetCount === 0 && f.path !== "root" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => void handleDeleteFolder(f.path)}
                    >
                      <Trash2 className="mr-1 size-3.5" />
                      Delete Folder
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-muted-foreground text-center">
            <HardDrive className="opacity-40 mx-auto mb-3 size-10" />
            <p className="font-medium">No media assets match your filters.</p>
            <p className="mt-1 text-xs">
              Click &ldquo;Sync Cloudinary&rdquo; to import existing files from
              Cloudinary.
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "table" ? (
        <>
          <div className="bg-card border rounded-xl">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allOnPageSelected}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>Folder</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size / Dims</TableHead>
                  <TableHead>Uploader</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const checked = selectedIds.includes(item.id);
                  return (
                    <TableRow
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.url}
                            alt={item.publicId}
                            onClick={() => setPreviewItem(item)}
                            className="border rounded size-10 object-cover cursor-pointer shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="max-w-[200px] font-mono text-xs truncate">
                              {item.publicId.split("/").pop()}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {format(parseISO(item.createdAt), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {item.folder}
                      </TableCell>
                      <TableCell>
                        <StatusBadge item={item} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatBytes(item.bytes)}
                        {item.width && item.height
                          ? ` · ${item.width}×${item.height}`
                          : ""}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.uploadedByLabel || "Cloudinary / System"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {item.usages.length > 0 ? (
                          <Link
                            href={item.usages[0].href}
                            className="text-primary hover:underline"
                          >
                            {item.usages[0].label}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Unused</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openMoveDialog(item)}
                            title="Move / Rename"
                          >
                            <FolderInput className="size-3.5" />
                          </Button>
                          {!item.isUsed && !item.isProtected ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleExtend([item.id])}
                              title="Extend +30d"
                            >
                              <CalendarPlus className="size-3.5" />
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDeleteFor([item])}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Checkbox
              checked={allOnPageSelected}
              onCheckedChange={toggleSelectAll}
              id="select-all-media"
            />
            <label htmlFor="select-all-media" className="cursor-pointer">
              Select all on page ({items.length}) · Drag cards onto any folder
              above to move
            </label>
          </div>

          <div className="gap-4 grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => {
              const checked = selectedIds.includes(item.id);
              return (
                <Card
                  key={item.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  className={`overflow-hidden flex flex-col cursor-grab active:cursor-grabbing ${
                    checked ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="relative bg-muted aspect-video">
                    <img
                      src={item.url}
                      alt={item.publicId}
                      className="w-full h-full object-cover cursor-pointer"
                      onClick={() => setPreviewItem(item)}
                    />
                    <div className="top-2 left-2 absolute">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleSelect(item.id)}
                        className="bg-background/90"
                      />
                    </div>
                    <div className="top-2 right-2 absolute">
                      <StatusBadge item={item} />
                    </div>
                  </div>
                  <CardContent className="flex flex-col flex-1 justify-between gap-3 p-3.5">
                    <div className="space-y-1.5">
                      <p
                        className="font-mono text-xs truncate"
                        title={item.publicId}
                      >
                        {item.publicId}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                        <span>{item.folder}</span>
                        <span>·</span>
                        <span>{formatBytes(item.bytes)}</span>
                        {item.width && item.height ? (
                          <>
                            <span>·</span>
                            <span>
                              {item.width}×{item.height}
                            </span>
                          </>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <UserIcon className="size-3 shrink-0" />
                        <span className="truncate">
                          {item.uploadedByLabel || "Cloudinary / System"}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Uploaded{" "}
                        {formatDistanceToNow(parseISO(item.createdAt), {
                          addSuffix: true,
                        })}
                      </p>

                      {item.usages.length > 0 ? (
                        <div className="space-y-1 pt-1">
                          {item.usages.slice(0, 2).map((u) => (
                            <Link
                              key={`${u.type}-${u.id}`}
                              href={u.href}
                              className="flex items-center gap-1 text-[11px] text-primary hover:underline truncate"
                            >
                              <Link2 className="size-3 shrink-0" />
                              <span className="truncate">{u.label}</span>
                            </Link>
                          ))}
                          {item.usages.length > 2 ? (
                            <p className="text-[10px] text-muted-foreground">
                              +{item.usages.length - 2} more reference(s)
                            </p>
                          ) : null}
                        </div>
                      ) : item.isProtected ? (
                        <p className="text-[11px] text-sky-600 dark:text-sky-400">
                          Protected folder — auto-delete disabled.
                        </p>
                      ) : (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">
                          Unused —{" "}
                          {item.scheduledDeleteAt
                            ? `auto-deletes ${format(parseISO(item.scheduledDeleteAt), "MMM d, yyyy")}`
                            : "scheduled for cleanup"}
                        </p>
                      )}
                    </div>

                    <div className="flex justify-between items-center gap-2 pt-2 border-t">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="px-2 h-7 text-xs"
                          onClick={() => openMoveDialog(item)}
                          title="Move or rename"
                        >
                          <Pencil className="mr-1 size-3" />
                          Move
                        </Button>
                        {!item.isUsed && !item.isProtected ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="px-2 h-7 text-xs"
                            onClick={() => handleExtend([item.id])}
                            disabled={extending}
                          >
                            <CalendarPlus className="mr-1 size-3" />
                            +{extendDays}d
                          </Button>
                        ) : null}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="px-2 h-7 text-destructive hover:text-destructive"
                        onClick={() => openDeleteFor([item])}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <TablePagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
        </>
      )}

      {/* Preview Dialog */}
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
            <div className="space-y-4">
              <img
                src={previewItem.url}
                alt={previewItem.publicId}
                className="bg-muted border rounded-lg w-full max-h-[420px] object-contain"
              />
              <div className="gap-2 grid sm:grid-cols-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Folder:</span>{" "}
                  {previewItem.folder}
                </div>
                <div>
                  <span className="text-muted-foreground">Size:</span>{" "}
                  {formatBytes(previewItem.bytes)} ({previewItem.format ?? "—"})
                </div>
                <div>
                  <span className="text-muted-foreground">Uploaded by:</span>{" "}
                  {previewItem.uploadedByLabel || "Cloudinary / System"}
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{" "}
                  {format(parseISO(previewItem.createdAt), "PPpp")}
                </div>
              </div>
              <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t">
                <a
                  href={previewItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary text-xs hover:underline"
                >
                  Open original <ExternalLink className="size-3" />
                </a>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const target = previewItem;
                      setPreviewItem(null);
                      openMoveDialog(target);
                    }}
                  >
                    <Pencil className="mr-1.5 size-3.5" />
                    Move / Rename
                  </Button>
                  {!previewItem.isUsed && !previewItem.isProtected ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleExtend([previewItem.id])}
                    >
                      <CalendarPlus className="mr-1.5 size-3.5" />
                      Extend +{extendDays}d
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => openDeleteFor([previewItem])}
                  >
                    <Trash2 className="mr-1.5 size-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Cloudinary Folder</DialogTitle>
            <DialogDescription>
              New folders are protected from auto-cleanup by default.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-folder-path">Folder Path</Label>
              <Input
                id="new-folder-path"
                placeholder="e.g. marketing/banners"
                value={newFolderPath}
                onChange={(e) => setNewFolderPath(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new-folder-desc">Description (optional)</Label>
              <Input
                id="new-folder-desc"
                placeholder="Static site banners & assets"
                value={newFolderDesc}
                onChange={(e) => setNewFolderDesc(e.target.value)}
              />
            </div>
            <div className="flex justify-between items-center p-3 border rounded-lg">
              <div>
                <p className="font-medium text-sm">Enable 30-Day Auto-Cleanup</p>
                <p className="text-muted-foreground text-xs">
                  Off = protected from automatic deletion
                </p>
              </div>
              <Switch
                checked={newFolderAutoCleanup}
                onCheckedChange={setNewFolderAutoCleanup}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateFolderOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creatingFolder}>
                {creatingFolder ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Create Folder
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Move / Rename Dialog */}
      <Dialog
        open={!!moveTarget}
        onOpenChange={(open) => !open && setMoveTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move or Rename Media</DialogTitle>
            <DialogDescription>
              Updates Cloudinary path and automatically updates any Story or
              User references in the database.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMoveOrRename} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="move-folder">Target Folder</Label>
              <Input
                id="move-folder"
                list="media-folder-options"
                value={moveFolder}
                onChange={(e) => setMoveFolder(e.target.value)}
                placeholder="e.g. story-covers or root"
              />
              <datalist id="media-folder-options">
                {folders.map((f) => (
                  <option key={f} value={f} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rename-base">File Name (public ID tail)</Label>
              <Input
                id="rename-base"
                value={renameBase}
                onChange={(e) => setRenameBase(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setMoveTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={moving}>
                {moving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={(open) => !open && setDeleteDialog(null)}
        title={
          deleteDialog?.hasUsed
            ? "Delete in-use media from Cloudinary?"
            : "Delete media permanently?"
        }
        description={
          deleteDialog?.hasUsed
            ? "One or more selected files are currently linked to a story or user profile. Deleting will remove them from Cloudinary and clear those links."
            : `Permanently delete ${deleteDialog?.ids.length ?? 0} selected file(s) from Cloudinary.`
        }
        confirmLabel="Delete permanently"
        destructive
        loading={deleting}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}
