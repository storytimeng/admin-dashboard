"use client";

import { Suspense, useEffect, useState } from "react";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, MoreHorizontal, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TablePagination } from "@/components/shared/table-pagination";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { moderationActionMessage } from "@/lib/moderation-action-message";
import type { AdminStory } from "@/types/admin";
import { formatDistanceToNow } from "date-fns";
import { StoryEditDialog } from "@/components/stories/story-edit-dialog";

const DEFAULT_PAGE_SIZE = 20;

function StoriesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGenre = searchParams.get("genre") || "all";

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState(initialGenre);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setGenreFilter(searchParams.get("genre") || "all");
    setPage(1);
  }, [searchParams]);

  const { data: genresData } = useProtectedSWR("admin-genres-filter", () =>
    adminApi.getGenres().catch(() => [] as string[]),
  );
  const availableGenres: string[] = Array.isArray(genresData)
    ? genresData
    : ((genresData as { genres?: string[] } | undefined)?.genres ?? []);

  const { data, error, isLoading, mutate } = useProtectedSWR(
    ["admin-stories", page, pageSize, debouncedSearch, genreFilter, statusFilter],
    () =>
      adminApi.getStories({
        page,
        limit: pageSize,
        search: debouncedSearch || undefined,
        genres: genreFilter !== "all" ? [genreFilter] : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      }),
  );

  const [confirm, setConfirm] = useState<{
    story: AdminStory;
    action: "suspend" | "unsuspend" | "delete";
  } | null>(null);
  const [editingStory, setEditingStory] = useState<AdminStory | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const stories = data?.stories ?? [];

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, genreFilter, statusFilter]);

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
      toast.success(
        moderationActionMessage("Story", action, {
          deletePastTense: "deleted",
        }),
      );
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

      <div className="flex sm:flex-row flex-col sm:justify-between sm:items-center gap-3">
        <div className="flex flex-wrap flex-1 items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="top-1/2 left-3 absolute size-4 text-muted-foreground -translate-y-1/2" />
            <Input
              placeholder="Search title, description, or author…"
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={genreFilter}
            onValueChange={(v) => setGenreFilter(v ?? "all")}
          >
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="All Genres" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Genres</SelectItem>
              {availableGenres.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v ?? "all")}
          >
            <SelectTrigger className="w-[155px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="complete">Completed</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="drafts">Drafts</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!isLoading && total > 0 ? (
          <p className="text-muted-foreground text-sm whitespace-nowrap">
            {total} stories total
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="bg-card border rounded-xl overflow-x-auto">
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
                        <Skeleton className="w-full h-8" />
                      </TableCell>
                    </TableRow>
                  ),
                )
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-destructive text-center"
                  >
                    Failed to load stories
                  </TableCell>
                </TableRow>
              ) : stories.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-muted-foreground text-center"
                  >
                    {search.trim()
                      ? "No matches on this page"
                      : "No stories found"}
                  </TableCell>
                </TableRow>
              ) : (
                stories.map((story, index) => (
                  <TableRow key={story.id}>
                    <TableCell className="tabular-nums text-muted-foreground text-sm text-center">
                      {(page - 1) * pageSize + index + 1}
                    </TableCell>
                    <TableCell className="max-w-[220px] font-medium">
                      <Link
                        href={`/stories/${story.id}`}
                        className="hover:text-primary hover:underline underline-offset-2 truncate"
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
                    <TableCell className="text-muted-foreground text-sm">
                      {story.likeCount ?? 0} likes · {story.commentCount ?? 0}{" "}
                      comments
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {story.updatedAt
                        ? formatDistanceToNow(new Date(story.updatedAt), {
                            addSuffix: true,
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex justify-center items-center hover:bg-accent rounded-md outline-none size-8">
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

export default function StoriesPage() {
  return (
    <Suspense fallback={null}>
      <StoriesPageContent />
    </Suspense>
  );
}
