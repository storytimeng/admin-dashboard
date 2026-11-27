"use client";

import { useState } from "react";
import { Images, Loader2, Search } from "lucide-react";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { adminApi } from "@/lib/api/admin";
import type { AdminMediaItem } from "@/types/admin";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

interface MediaPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: AdminMediaItem) => void | Promise<void>;
  defaultFolder?: string;
  title?: string;
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  onSelect,
  defaultFolder = "all",
  title = "Choose from Media Library",
}: MediaPickerDialogProps) {
  const [page, setPage] = useState(1);
  const [folder, setFolder] = useState(defaultFolder);
  const [search, setSearch] = useState("");
  const [selectingId, setSelectingId] = useState<string | null>(null);

  const { data, isLoading } = useProtectedSWR(
    open ? ["media-picker", page, folder, search] : null,
    () =>
      adminApi.getMediaLibrary({
        page,
        limit: 18,
        folder,
        search,
      }),
  );

  const items = data?.media?.items ?? [];
  const folders = data?.media?.folders ?? [];
  const pagination = data?.media?.pagination ?? {
    page: 1,
    totalPages: 1,
    total: 0,
  };

  const handlePick = async (item: AdminMediaItem) => {
    setSelectingId(item.id);
    try {
      await onSelect(item);
      onOpenChange(false);
    } finally {
      setSelectingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Images className="size-4 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>
            Select an existing Cloudinary image instead of uploading a duplicate.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or folder..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
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

        <div className="flex-1 overflow-y-auto min-h-[260px] pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-2 size-5 animate-spin" />
              Loading media library...
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No matching images found in Media Library.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={selectingId === item.id}
                  onClick={() => void handlePick(item)}
                  className="group relative overflow-hidden rounded-lg border bg-card text-left transition hover:border-primary hover:ring-2 hover:ring-primary/30 focus:outline-none"
                >
                  <div className="aspect-square bg-muted overflow-hidden">
                    <img
                      src={item.url}
                      alt={item.publicId}
                      className="h-full w-full object-cover transition group-hover:scale-105"
                    />
                  </div>
                  <div className="p-2 space-y-0.5">
                    <p className="text-[11px] font-mono truncate">
                      {item.publicId.split("/").pop()}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {item.folder}
                    </p>
                  </div>
                  {selectingId === item.id ? (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                      <Loader2 className="size-5 animate-spin text-primary" />
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.total} items)
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() =>
                setPage((p) => Math.min(pagination.totalPages, p + 1))
              }
            >
              Next
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
