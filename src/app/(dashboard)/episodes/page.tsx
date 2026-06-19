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
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin";

export default function EpisodesPage() {
  const { data, isLoading, mutate } = useSWR("admin-episodes", () =>
    adminApi.getEpisodes(),
  );

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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Episodes"
        description="Browse and manage story episodes across the platform."
      />
      <div className="space-y-4">
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SerialNumberHead />
                <TableHead>Title</TableHead>
                <TableHead>Story</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : paginatedEpisodes.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No episodes found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedEpisodes.map((ep, index) => (
                  <TableRow key={ep.id}>
                    <SerialNumberCell index={index} offset={serialOffset} />
                    <TableCell className="font-medium">{ep.title}</TableCell>
                    <TableCell>{ep.storyTitle || ep.storyId || "—"}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          try {
                            await adminApi.deleteEpisode(ep.id);
                            toast.success("Episode deleted");
                            await mutate();
                          } catch (err) {
                            toast.error(
                              err instanceof Error ? err.message : "Failed",
                            );
                          }
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
    </div>
  );
}
