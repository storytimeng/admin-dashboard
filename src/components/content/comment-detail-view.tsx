"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { MetaItem } from "@/components/content/html-content-block";
import { CommentEditDialog } from "@/components/content/comment-edit-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin";
import type { AdminCommentType } from "@/types/admin";

const TYPE_LABELS: Record<AdminCommentType, string> = {
  story: "Story comment",
  episode: "Episode comment",
  chapter: "Chapter comment",
};

interface CommentDetailViewProps {
  commentId: string;
  commentType: AdminCommentType;
}

export function CommentDetailView({
  commentId,
  commentType,
}: CommentDetailViewProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, error, mutate } = useProtectedSWR(
    ["admin-comment", commentType, commentId],
    () => adminApi.getComment(commentType, commentId),
  );

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminApi.deleteComment(commentType, commentId);
      toast.success("Comment deleted");
      router.push("/comments");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" render={<Link href="/comments" />}>
          <ArrowLeft className="mr-2 size-4" />
          Back to comments
        </Button>
        <p className="text-destructive">Comment not found or failed to load.</p>
      </div>
    );
  }

  const type = data.type ?? commentType;
  const storyId = data.storyId ?? data.story?.id;
  const author =
    data.user?.penName ||
    data.user?.email ||
    [data.user?.firstName, data.user?.lastName].filter(Boolean).join(" ") ||
    "Unknown user";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/comments" />}>
        <ArrowLeft className="mr-2 size-4" />
        Comments
      </Button>

      <PageHeader
        title={TYPE_LABELS[type]}
        description="Review and moderate user-generated comment content."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap rounded-lg border bg-muted/30 p-4">
            {data.content}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetaItem
              label="Type"
              value={
                <Badge variant="outline" className="capitalize">
                  {type}
                </Badge>
              }
            />
            <MetaItem label="Author" value={author} />
            <MetaItem
              label="Posted"
              value={
                data.createdAt
                  ? format(new Date(data.createdAt), "MMM d, yyyy HH:mm")
                  : "—"
              }
            />
            <MetaItem
              label="Story"
              value={
                storyId ? (
                  <Link
                    href={`/stories/${storyId}`}
                    className="text-primary hover:underline"
                  >
                    {data.storyTitle ?? data.story?.title ?? storyId}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            {type === "episode" && data.episodeId ? (
              <MetaItem
                label="Episode"
                value={
                  <Link
                    href={`/episodes/${data.episodeId}`}
                    className="text-primary hover:underline"
                  >
                    {data.episodeTitle ?? data.episodeId}
                  </Link>
                }
              />
            ) : null}
            {type === "chapter" && data.chapterId ? (
              <MetaItem
                label="Chapter"
                value={
                  <Link
                    href={`/chapters/${data.chapterId}`}
                    className="text-primary hover:underline"
                  >
                    {data.chapterTitle ?? data.chapterId}
                  </Link>
                }
              />
            ) : null}
          </div>
        </CardContent>
      </Card>

      <CommentEditDialog
        comment={data}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => mutate()}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete comment?"
        description="This comment will be permanently removed from the platform."
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
