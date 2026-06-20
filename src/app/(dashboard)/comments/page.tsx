"use client";

import { useMemo, useState } from "react";
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
import { CommentEditDialog } from "@/components/content/comment-edit-dialog";
import { useClientPagination } from "@/hooks/use-client-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin";
import type { AdminComment, AdminCommentType } from "@/types/admin";

type CommentFilter = "all" | AdminCommentType;

function commentDetailHref(comment: AdminComment) {
  const type = comment.type ?? "story";
  return `/comments/${comment.id}?type=${type}`;
}

export default function CommentsPage() {
  const router = useRouter();
  const { data, isLoading, error, mutate } = useProtectedSWR("admin-comments", () =>
    adminApi.getComments(),
  );

  const [filter, setFilter] = useState<CommentFilter>("all");
  const [editingComment, setEditingComment] = useState<AdminComment | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<AdminComment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const comments = data?.comments ?? [];

  const filteredComments = useMemo(() => {
    if (filter === "all") return comments;
    return comments.filter((c) => (c.type ?? "story") === filter);
  }, [comments, filter]);

  const counts = useMemo(
    () => ({
      all: comments.length,
      story: comments.filter((c) => (c.type ?? "story") === "story").length,
      episode: comments.filter((c) => c.type === "episode").length,
      chapter: comments.filter((c) => c.type === "chapter").length,
    }),
    [comments],
  );

  const {
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    paginatedItems: paginatedComments,
    serialOffset,
    handlePageSizeChange,
  } = useClientPagination(filteredComments, { resetKeys: [filter] });

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const type: AdminCommentType = deleteTarget.type ?? "story";
    setDeleting(true);
    try {
      await adminApi.deleteComment(type, deleteTarget.id);
      toast.success("Comment removed");
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
        title="Comments"
        description="Moderate story, episode, and chapter comments with full review and edit controls."
      />

      <Tabs
        value={filter}
        onValueChange={(v) => v && setFilter(v as CommentFilter)}
      >
        <TabsList>
          <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
          <TabsTrigger value="story">Story ({counts.story})</TabsTrigger>
          <TabsTrigger value="episode">Episode ({counts.episode})</TabsTrigger>
          <TabsTrigger value="chapter">Chapter ({counts.chapter})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4 space-y-4">
          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              Could not load comments. Check your connection, permissions, and
              that the backend is deployed with the latest admin API.
            </div>
          ) : null}
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SerialNumberHead />
                  <TableHead>Content</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Context</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead className="hidden md:table-cell">Posted</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : paginatedComments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No comments found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedComments.map((c, index) => {
                    const type = c.type ?? "story";
                    const contextLabel =
                      type === "episode"
                        ? c.episodeTitle || c.episodeId
                        : type === "chapter"
                          ? c.chapterTitle || c.chapterId
                          : c.storyTitle || c.story?.title;

                    return (
                      <TableRow key={`${type}-${c.id}`}>
                        <SerialNumberCell index={index} offset={serialOffset} />
                        <TableCell className="max-w-sm">
                          <Link
                            href={commentDetailHref(c)}
                            className="line-clamp-2 hover:text-primary hover:underline"
                          >
                            {c.content}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {type}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground">
                          {contextLabel || "—"}
                        </TableCell>
                        <TableCell>
                          {c.user?.penName || c.user?.email || "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground whitespace-nowrap">
                          {c.createdAt
                            ? formatDistanceToNow(new Date(c.createdAt), {
                                addSuffix: true,
                              })
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <TableRowActions
                            onViewDetails={() =>
                              router.push(commentDetailHref(c))
                            }
                            onEdit={() => setEditingComment(c)}
                            onDelete={() => setDeleteTarget(c)}
                            deleteLabel="Remove"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
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
        </TabsContent>
      </Tabs>

      <CommentEditDialog
        comment={editingComment}
        open={!!editingComment}
        onOpenChange={(open) => !open && setEditingComment(null)}
        onSaved={() => mutate()}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove comment?"
        description="This comment will be permanently deleted from the platform."
        confirmLabel="Remove"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
