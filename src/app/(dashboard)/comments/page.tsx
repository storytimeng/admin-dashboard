"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import {
  SerialNumberCell,
  SerialNumberHead,
} from "@/components/shared/serial-number-head";
import { useClientPagination } from "@/hooks/use-client-pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin";
import type { AdminComment } from "@/types/admin";

export default function CommentsPage() {
  const { data, isLoading, mutate } = useSWR("admin-comments", () =>
    adminApi.getComments(),
  );

  const deleteComment = async (comment: AdminComment) => {
    try {
      const type = comment.type || "story";
      if (type === "episode") await adminApi.deleteEpisodeComment(comment.id);
      else if (type === "chapter")
        await adminApi.deleteChapterComment(comment.id);
      else await adminApi.deleteStoryComment(comment.id);
      toast.success("Comment removed");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const comments = data?.comments ?? [];

  const {
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    paginatedItems: paginatedComments,
    serialOffset,
    handlePageSizeChange,
  } = useClientPagination(comments);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comments"
        description="Moderate story, episode, and chapter comments."
      />
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({comments.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4 space-y-4">
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SerialNumberHead />
                  <TableHead>Content</TableHead>
                  <TableHead>Story</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : paginatedComments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No comments
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedComments.map((c, index) => (
                    <TableRow key={c.id}>
                      <SerialNumberCell index={index} offset={serialOffset} />
                      <TableCell className="max-w-md truncate">
                        {c.content}
                      </TableCell>
                      <TableCell>
                        {c.storyTitle || c.story?.title || "—"}
                      </TableCell>
                      <TableCell>
                        {c.user?.penName || c.user?.email || "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteComment(c)}
                        >
                          Remove
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
