"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TablePagination } from "@/components/shared/table-pagination";
import { TableRowActions } from "@/components/shared/table-row-actions";
import {
  SerialNumberCell,
  SerialNumberHead,
} from "@/components/shared/serial-number-head";
import { EpisodeEditDialog } from "@/components/content/episode-edit-dialog";
import { useClientPagination } from "@/hooks/use-client-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin";
import type { AdminEpisode } from "@/types/admin";

export default function EpisodesPage() {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR("admin-episodes", () =>
    adminApi.getEpisodes(),
  );

  const [editingEpisode, setEditingEpisode] = useState<AdminEpisode | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<AdminEpisode | null>(null);
  const [deleting, setDeleting] = useState(false);

  const episodes = data?.episodes ?? [];

  const {
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    paginatedItems: paginatedEpisodes,
    serialOffset,
    handlePageSizeChange,
  } = useClientPagination(episodes);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteEpisode(deleteTarget.id);
      toast.success("Episode deleted");
      setDeleteTarget(null);
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
        title="Episodes"
        description="Browse, review, and manage story episodes across the platform."
      />

      <div className="space-y-4">
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SerialNumberHead />
                <TableHead>Title</TableHead>
                <TableHead>Story</TableHead>
                <TableHead className="hidden sm:table-cell">#</TableHead>
                <TableHead className="hidden md:table-cell">Updated</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : paginatedEpisodes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No episodes found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEpisodes.map((ep, index) => (
                  <TableRow key={ep.id}>
                    <SerialNumberCell index={index} offset={serialOffset} />
                    <TableCell className="font-medium max-w-xs truncate">
                      <Link
                        href={`/episodes/${ep.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {ep.title}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {ep.storyId ? (
                        <Link
                          href={`/stories/${ep.storyId}`}
                          className="text-muted-foreground hover:text-primary hover:underline"
                        >
                          {ep.storyTitle || ep.storyId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell tabular-nums text-muted-foreground">
                      {ep.episodeNumber ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground whitespace-nowrap">
                      {ep.updatedAt
                        ? formatDistanceToNow(new Date(ep.updatedAt), {
                            addSuffix: true,
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <TableRowActions
                        onViewDetails={() => router.push(`/episodes/${ep.id}`)}
                        onEdit={() => setEditingEpisode(ep)}
                        onDelete={() => setDeleteTarget(ep)}
                      />
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

      <EpisodeEditDialog
        episode={editingEpisode}
        open={!!editingEpisode}
        onOpenChange={(open) => !open && setEditingEpisode(null)}
        onSaved={() => mutate()}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete episode?"
        description={
          deleteTarget
            ? `Permanently delete "${deleteTarget.title}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
