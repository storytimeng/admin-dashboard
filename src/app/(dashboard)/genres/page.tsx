"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TablePagination } from "@/components/shared/table-pagination";
import {
  SerialNumberCell,
  SerialNumberHead,
} from "@/components/shared/serial-number-head";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { adminApi } from "@/lib/api/admin";
import type { GenreAdminItem } from "@/types/admin";

export default function GenresPage() {
  const { data, isLoading, error, mutate } = useSWR("admin-genres", () =>
    adminApi.getAdminGenres(),
  );

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GenreAdminItem | null>(null);
  const [form, setForm] = useState({
    name: "",
    sortOrder: 0,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GenreAdminItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const genres = data?.genres ?? [];
  const totalStories = genres.reduce((sum, g) => sum + g.storyCount, 0);

  const {
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    paginatedItems: paginatedGenres,
    serialOffset,
    handlePageSizeChange,
  } = useClientPagination(genres);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", sortOrder: genres.length, isActive: true });
    setOpen(true);
  };

  const openEdit = (item: GenreAdminItem) => {
    if (item.id.startsWith("legacy-")) {
      toast.error(
        "Run the latest backend migration to enable editing genres in the database.",
      );
      return;
    }
    setEditing(item);
    setForm({
      name: item.name,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setOpen(true);
  };

  const save = async () => {
    const name = form.name.trim();
    if (name.length < 2) {
      toast.error("Genre name must be at least 2 characters");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        sortOrder: form.sortOrder,
        isActive: form.isActive,
      };
      if (editing) {
        await adminApi.updateGenre(editing.id, payload);
        toast.success("Genre updated");
      } else {
        await adminApi.createGenre(payload);
        toast.success("Genre created");
      }
      setOpen(false);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await adminApi.deleteGenre(deleteTarget.id);
      toast.success("Genre deleted");
      setDeleteTarget(null);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Genres"
        description="Manage story genres, track usage across stories and reader profiles, and control what appears in the app."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => mutate()}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 size-4" />
              Refresh
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 size-4" />
              Add genre
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Total genres</p>
          <p className="text-2xl font-bold">{genres.length}</p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Active genres</p>
          <p className="text-2xl font-bold">
            {genres.filter((g) => g.isActive).length}
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Story tag assignments</p>
          <p className="text-2xl font-bold">{totalStories}</p>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load genres</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Unknown error"}. Check
            that the backend is deployed with genre management enabled, then
            reload.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-4">
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SerialNumberHead />
                <TableHead>Genre</TableHead>
                <TableHead className="text-right">Stories</TableHead>
                <TableHead className="text-right hidden sm:table-cell">
                  Users
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Sort</TableHead>
                <TableHead className="w-44 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : paginatedGenres.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-10"
                  >
                    No genres yet. Add your first genre to get started.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedGenres.map((genre, index) => (
                  <TableRow key={genre.id}>
                    <SerialNumberCell index={index} offset={serialOffset} />
                    <TableCell className="font-medium">{genre.name}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {genre.storyCount > 0 ? (
                        <Link
                          href={`/stories?genre=${encodeURIComponent(genre.name)}`}
                          className="text-primary hover:underline"
                        >
                          {genre.storyCount}
                        </Link>
                      ) : (
                        0
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden sm:table-cell">
                      {genre.userCount}
                    </TableCell>
                    <TableCell>
                      <Badge variant={genre.isActive ? "default" : "secondary"}>
                        {genre.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell tabular-nums text-muted-foreground">
                      {genre.sortOrder}
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(genre)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={genre.id.startsWith("legacy-")}
                        onClick={() => {
                          if (genre.storyCount > 0) {
                            toast.error(
                              `"${genre.name}" is used by ${genre.storyCount} ${genre.storyCount === 1 ? "story" : "stories"}. Deactivate it instead, or reassign those stories first.`,
                            );
                            return;
                          }
                          setDeleteTarget(genre);
                        }}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          disabled={isLoading}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit genre" : "Add genre"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="genre-name">Name</Label>
              <Input
                id="genre-name"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Romance"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="genre-sort">Sort order</Label>
              <Input
                id="genre-sort"
                type="number"
                value={form.sortOrder}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    sortOrder: Number(e.target.value) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first in genre pickers.
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Inactive genres are hidden from new story and profile picks.
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, isActive: checked }))
                }
              />
            </div>
            {editing && editing.storyCount > 0 ? (
              <p className="text-xs text-amber-600">
                Renaming this genre will update {editing.storyCount}{" "}
                {editing.storyCount === 1 ? "story" : "stories"}
                {editing.userCount > 0
                  ? ` and ${editing.userCount} user profile(s)`
                  : ""}
                .
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete genre?"
        description={
          deleteTarget
            ? deleteTarget.storyCount > 0
              ? `"${deleteTarget.name}" is used by ${deleteTarget.storyCount} ${deleteTarget.storyCount === 1 ? "story" : "stories"}. Remove it from those stories first, or deactivate the genre instead.`
              : `Permanently delete "${deleteTarget.name}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        loading={deleteLoading}
        onConfirm={handleDelete}
      />
    </div>
  );
}
