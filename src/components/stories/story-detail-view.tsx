"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import {
  ArrowLeft,
  BookOpen,
  Eye,
  Heart,
  MessageSquare,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi } from "@/lib/api/admin";
import type { AdminStoryDetail, StoryCommentDetail } from "@/types/admin";
import { StoryEditDialog } from "@/components/stories/story-edit-dialog";
import { useState } from "react";

function HtmlBlock({ html, label }: { html?: string | null; label: string }) {
  if (!html?.trim()) {
    return (
      <p className="text-sm text-muted-foreground italic">No {label} provided.</p>
    );
  }
  return (
    <div
      className="admin-rich-text rounded-lg border bg-card p-4"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function MetaItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

function CommentRow({ comment, depth = 0 }: { comment: StoryCommentDetail; depth?: number }) {
  return (
    <div className={depth > 0 ? "ml-6 border-l pl-4 mt-3" : "mt-3 first:mt-0"}>
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="text-sm">{comment.content}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {comment.user?.penName || comment.user?.email || "Unknown user"}
          {comment.createdAt
            ? ` · ${format(new Date(comment.createdAt), "MMM d, yyyy HH:mm")}`
            : ""}
        </p>
      </div>
      {comment.replies?.map((reply) => (
        <CommentRow key={reply.id} comment={reply} depth={depth + 1} />
      ))}
    </div>
  );
}

interface StoryDetailViewProps {
  storyId: string;
}

export function StoryDetailView({ storyId }: StoryDetailViewProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "suspend" | "unsuspend" | "delete" | null
  >(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data: story, isLoading, error, mutate } = useSWR(
    ["story-detail", storyId],
    () => adminApi.getStory(storyId),
  );

  const { data: chapters } = useSWR(["story-chapters", storyId], () =>
    adminApi.getStoryChapters(storyId),
  );

  const { data: episodes } = useSWR(["story-episodes", storyId], () =>
    adminApi.getStoryEpisodes(storyId),
  );

  const { data: comments } = useSWR(["story-comments", storyId], () =>
    adminApi.getStoryComments(storyId),
  );

  const runAction = async () => {
    if (!confirmAction || !story) return;
    setActionLoading(true);
    try {
      if (confirmAction === "suspend") await adminApi.suspendStory(story.id);
      if (confirmAction === "unsuspend")
        await adminApi.unsuspendStory(story.id);
      if (confirmAction === "delete") {
        await adminApi.deleteStory(story.id);
        toast.success("Story deleted");
        router.push("/stories");
        return;
      }
      toast.success(`Story ${confirmAction}ed`);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" render={<Link href="/stories" />}>
          <ArrowLeft className="mr-2 size-4" />
          Back to stories
        </Button>
        <p className="text-destructive">Failed to load story.</p>
      </div>
    );
  }

  const authorLabel = story.anonymous
    ? "Anonymous"
    : story.author?.penName ||
      [story.author?.firstName, story.author?.lastName]
        .filter(Boolean)
        .join(" ") ||
      story.author?.email ||
      story.authorId ||
      "—";

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/stories" />}>
          <ArrowLeft className="mr-2 size-4" />
          Stories
        </Button>
      </div>

      <PageHeader
        title={story.title}
        description={`Story ID: ${story.id}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-2 size-4" />
              Edit
            </Button>
            {story.isSuspended ? (
              <Button
                variant="outline"
                onClick={() => setConfirmAction("unsuspend")}
              >
                Unsuspend
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setConfirmAction("suspend")}
              >
                Suspend
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={() => setConfirmAction("delete")}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="capitalize">
          {story.storyStatus || "unknown"}
        </Badge>
        {story.isSuspended ? <Badge variant="destructive">Suspended</Badge> : null}
        {story.onlyOnStorytime ? (
          <Badge variant="secondary">Storytime Exclusive</Badge>
        ) : null}
        {story.anonymous ? <Badge variant="secondary">Anonymous</Badge> : null}
        {story.trigger ? <Badge variant="destructive">18+ Trigger</Badge> : null}
        {story.copyright ? <Badge variant="outline">Copyright</Badge> : null}
        {story.chapter ? <Badge variant="outline">Chapters</Badge> : null}
        {episodes?.length ? (
          <Badge variant="outline">Episodes</Badge>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        {story.imageUrl ? (
          <div className="overflow-hidden rounded-xl border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={story.imageUrl}
              alt={story.title}
              className="aspect-[3/4] w-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "";
                e.currentTarget.alt = "Cover unavailable";
              }}
            />
          </div>
        ) : (
          <div className="flex aspect-[3/4] items-center justify-center rounded-xl border bg-muted text-muted-foreground">
            <BookOpen className="size-10 opacity-40" />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Story metadata</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetaItem label="Author" value={authorLabel} />
            {story.anonymous && story.authorId ? (
              <MetaItem
                label="Author ID"
                value={
                  <span className="font-mono text-xs">{story.authorId}</span>
                }
              />
            ) : null}
            <MetaItem
              label="Language"
              value={<span className="capitalize">{story.language || "—"}</span>}
            />
            <MetaItem
              label="Created"
              value={
                story.createdAt
                  ? format(new Date(story.createdAt), "MMM d, yyyy HH:mm")
                  : "—"
              }
            />
            <MetaItem
              label="Updated"
              value={
                story.updatedAt
                  ? format(new Date(story.updatedAt), "MMM d, yyyy HH:mm")
                  : "—"
              }
            />
            <MetaItem
              label="Genres"
              value={
                story.genres?.length ? (
                  <div className="flex flex-wrap gap-1">
                    {story.genres.map((g) => (
                      <Badge key={g} variant="secondary" className="capitalize">
                        {g}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  "—"
                )
              }
            />
            {story.collaborate?.length ? (
              <MetaItem
                label="Collaborators"
                value={story.collaborate.join(", ")}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Heart className="size-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{story.likeCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Likes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <MessageSquare className="size-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{story.commentCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Comments</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-6">
            <Eye className="size-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-bold">{story.viewCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">Reads</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="description">Description</TabsTrigger>
        {story.chapter && chapters?.length ? (
          <TabsTrigger value="chapters">
            Chapters ({chapters.length})
          </TabsTrigger>
        ) : null}
        {episodes?.length ? (
          <TabsTrigger value="episodes">
            Episodes ({episodes.length})
          </TabsTrigger>
        ) : null}
          <TabsTrigger value="comments">
            Comments ({comments?.length ?? story.commentCount ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-4">
          <HtmlBlock html={story.content} label="content" />
        </TabsContent>

        <TabsContent value="description" className="mt-4">
          <HtmlBlock html={story.description} label="description" />
        </TabsContent>

        {story.chapter && chapters?.length ? (
          <TabsContent value="chapters" className="mt-4 space-y-4">
            {chapters.map((ch) => (
              <Card key={ch.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Ch. {ch.chapterNumber}: {ch.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HtmlBlock html={ch.content} label="chapter content" />
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ) : null}

        {episodes?.length ? (
          <TabsContent value="episodes" className="mt-4 space-y-4">
            {episodes.map((ep) => (
              <Card key={ep.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Ep. {ep.episodeNumber}: {ep.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HtmlBlock html={ep.content} label="episode content" />
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ) : null}

        <TabsContent value="comments" className="mt-4">
          {comments?.length ? (
            <div className="rounded-xl border p-4">
              {comments.map((c) => (
                <CommentRow key={c.id} comment={c} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No comments.</p>
          )}
        </TabsContent>
      </Tabs>

      <StoryEditDialog
        story={story as AdminStoryDetail}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={() => mutate()}
      />

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={
          confirmAction === "delete"
            ? "Delete story permanently?"
            : confirmAction === "suspend"
              ? "Suspend story?"
              : "Unsuspend story?"
        }
        description={`"${story.title}" will be ${confirmAction}${confirmAction === "delete" ? " permanently" : ""}.`}
        confirmLabel={
          confirmAction === "delete"
            ? "Delete"
            : confirmAction === "suspend"
              ? "Suspend"
              : "Unsuspend"
        }
        destructive={
          confirmAction === "delete" || confirmAction === "suspend"
        }
        loading={actionLoading}
        onConfirm={runAction}
      />
    </div>
  );
}
