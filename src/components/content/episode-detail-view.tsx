"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  HtmlContentBlock,
  MetaItem,
} from "@/components/content/html-content-block";
import { EpisodeEditDialog } from "@/components/content/episode-edit-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin";

interface EpisodeDetailViewProps {
  episodeId: string;
}

export function EpisodeDetailView({ episodeId }: EpisodeDetailViewProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading, error, mutate } = useSWR(
    ["admin-episode", episodeId],
    () => adminApi.getEpisode(episodeId),
  );

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminApi.deleteEpisode(episodeId);
      toast.success("Episode deleted");
      router.push("/episodes");
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
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" render={<Link href="/episodes" />}>
          <ArrowLeft className="mr-2 size-4" />
          Back to episodes
        </Button>
        <p className="text-destructive">Episode not found or failed to load.</p>
      </div>
    );
  }

  const storyId = data.storyId ?? data.story?.id;
  const storyTitle = data.storyTitle ?? data.story?.title;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/episodes" />}>
          <ArrowLeft className="mr-2 size-4" />
          Episodes
        </Button>
      </div>

      <PageHeader
        title={data.title}
        description={
          storyTitle
            ? `Episode ${data.episodeNumber ?? "—"} · ${storyTitle}`
            : `Episode ${data.episodeNumber ?? "—"}`
        }
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
          <CardTitle className="text-base">Metadata</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetaItem
            label="Story"
            value={
              storyId ? (
                <Link
                  href={`/stories/${storyId}`}
                  className="text-primary hover:underline"
                >
                  {storyTitle || storyId}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <MetaItem label="Episode number" value={data.episodeNumber ?? "—"} />
          <MetaItem
            label="Created"
            value={
              data.createdAt
                ? format(new Date(data.createdAt), "MMM d, yyyy HH:mm")
                : "—"
            }
          />
          <MetaItem
            label="Updated"
            value={
              data.updatedAt
                ? format(new Date(data.updatedAt), "MMM d, yyyy HH:mm")
                : "—"
            }
          />
          <MetaItem
            label="Comments on episode"
            value={
              <Badge variant="secondary">{data.comments?.length ?? 0}</Badge>
            }
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content</CardTitle>
        </CardHeader>
        <CardContent>
          <HtmlContentBlock html={data.content} label="content" />
        </CardContent>
      </Card>

      <EpisodeEditDialog
        episode={data}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => mutate()}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete episode?"
        description={`Permanently delete "${data.title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
