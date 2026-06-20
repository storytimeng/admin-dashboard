"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
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
import { ChapterEditDialog } from "@/components/content/chapter-edit-dialog";
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
import type { AdminChapter } from "@/types/admin";

export default function ChaptersPage() {
  const router = useRouter();
  const { data, isLoading, mutate } = useProtectedSWR("admin-chapters", () =>
    adminApi.getChapters(),
  );

  const [editingChapter, setEditingChapter] = useState<AdminChapter | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<AdminChapter | null>(null);
  const [deleting, setDeleting] = useState(false);

  const chapters = data?.chapters ?? [];

  const {
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    paginatedItems: paginatedChapters,
    serialOffset,
    handlePageSizeChange,
  } = useClientPagination(chapters);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteChapter(deleteTarget.id);
      toast.success("Chapter deleted");
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
        title="Chapters"
        description="Browse, review, and manage story chapters across the platform."
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
              ) : paginatedChapters.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No chapters found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedChapters.map((ch, index) => (
                  <TableRow key={ch.id}>
                    <SerialNumberCell index={index} offset={serialOffset} />
                    <TableCell className="font-medium max-w-xs truncate">
                      <Link
                        href={`/chapters/${ch.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {ch.title}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {ch.storyId ? (
                        <Link
                          href={`/stories/${ch.storyId}`}
                          className="text-muted-foreground hover:text-primary hover:underline"
                        >
                          {ch.storyTitle || ch.storyId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell tabular-nums text-muted-foreground">
                      {ch.chapterNumber ?? "—"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground whitespace-nowrap">
                      {ch.updatedAt
                        ? formatDistanceToNow(new Date(ch.updatedAt), {
                            addSuffix: true,
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <TableRowActions
                        onViewDetails={() => router.push(`/chapters/${ch.id}`)}
                        onEdit={() => setEditingChapter(ch)}
                        onDelete={() => setDeleteTarget(ch)}
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

      <ChapterEditDialog
        chapter={editingChapter}
        open={!!editingChapter}
        onOpenChange={(open) => !open && setEditingChapter(null)}
        onSaved={() => mutate()}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete chapter?"
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
