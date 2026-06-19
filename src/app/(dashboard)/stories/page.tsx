"use client";

import { useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, MoreHorizontal, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TablePagination } from "@/components/shared/table-pagination";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin";
import type { AdminStory } from "@/types/admin";
import { formatDistanceToNow } from "date-fns";
import { StoryEditDialog } from "@/components/stories/story-edit-dialog";

const DEFAULT_PAGE_SIZE = 20;

export default function StoriesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");

  const { data, error, isLoading, mutate } = useSWR(
    ["admin-stories", page, pageSize],
    () => adminApi.getStories({ page, limit: pageSize }),
  );

  const [confirm, setConfirm] = useState<{
    story: AdminStory;
    action: "suspend" | "unsuspend" | "delete";
  } | null>(null);
  const [editingStory, setEditingStory] = useState<AdminStory | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const stories = useMemo(() => {
    const list = data?.stories ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.title?.toLowerCase().includes(q) ||
        s.author?.penName?.toLowerCase().includes(q),
    );
  }, [data?.stories, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const runAction = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      const { story, action } = confirm;
      if (action === "suspend") await adminApi.suspendStory(story.id);
      if (action === "unsuspend") await adminApi.unsuspendStory(story.id);
      if (action === "delete") await adminApi.deleteStory(story.id);
      toast.success(`Story ${action === "delete" ? "deleted" : action + "ed"}`);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stories"
        description="Review, moderate, and manage published and draft stories."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search title or author on this page…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!isLoading && total > 0 ? (
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            {total} stories total
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14 text-center">S/N</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: pageSize > 10 ? 10 : pageSize }).map(
                  (_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                    </TableRow>
                  ),
                )
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-destructive py-8"
                  >
                    Failed to load stories
                  </TableCell>
                </TableRow>
              ) : stories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    {search.trim()
                      ? "No matches on this page"
                      : "No stories found"}
                  </TableCell>
                </TableRow>
              ) : (
                stories.map((story, index) => (
                  <TableRow key={story.id}>
                    <TableCell className="text-center text-sm tabular-nums text-muted-foreground">
                      {(page - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="font-medium max-w-[220px]">
                      <Link
                        href={`/stories/${story.id}`}
                        className="truncate hover:text-primary hover:underline underline-offset-2"
                      >
                        {story.title}
                      </Link>
                      {story.onlyOnStorytime ? (
                        <Badge variant="secondary" className="ml-2 text-[10px]">
                          Exclusive
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {story.anonymous
                        ? "Anonymous"
                        : story.author?.penName || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className="w-fit capitalize">
                          {story.storyStatus || "unknown"}
                        </Badge>
                        {story.isSuspended ? (
                          <Badge variant="destructive" className="w-fit">
                            Suspended
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {story.likeCount ?? 0} likes · {story.commentCount ?? 0}{" "}
                      comments
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {story.updatedAt
                        ? formatDistanceToNow(new Date(story.updatedAt), {
                            addSuffix: true,
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent outline-none">
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/stories/${story.id}`)}
                          >
                            <Eye className="mr-2 size-4" />
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setEditingStory(story)}
                          >
                            Edit
                          </DropdownMenuItem>
                          {story.isSuspended ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setConfirm({ story, action: "unsuspend" })
                              }
                            >
                              Unsuspend
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                setConfirm({ story, action: "suspend" })
                              }
                            >
                              Suspend
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() =>
                              setConfirm({ story, action: "delete" })
                            }
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm?.action === "delete"
            ? "Delete story permanently?"
            : confirm?.action === "suspend"
              ? "Suspend story?"
              : "Unsuspend story?"
        }
        description={`"${confirm?.story.title}" will be ${confirm?.action}${confirm?.action === "delete" ? " permanently" : ""}.`}
        confirmLabel={
          confirm?.action === "delete"
            ? "Delete"
            : confirm?.action === "suspend"
              ? "Suspend"
              : "Unsuspend"
        }
        destructive={
          confirm?.action === "delete" || confirm?.action === "suspend"
        }
        loading={actionLoading}
        onConfirm={runAction}
      />

      <StoryEditDialog
        story={editingStory}
        open={!!editingStory}
        onOpenChange={(open) => !open && setEditingStory(null)}
        onSaved={() => mutate()}
      />
    </div>
  );
}
