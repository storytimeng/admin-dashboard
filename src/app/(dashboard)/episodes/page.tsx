"use client";

import useSWR from "swr";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Episodes"
        description="Browse and manage story episodes across the platform."
      />
      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Story</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : (
              data?.episodes?.map((ep) => (
                <TableRow key={ep.id}>
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
    </div>
  );
}
