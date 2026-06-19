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

export default function ChaptersPage() {
  const { data, isLoading, mutate } = useSWR("admin-chapters", () =>
    adminApi.getChapters(),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chapters"
        description="Browse and manage story chapters across the platform."
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
              data?.chapters?.map((ch) => (
                <TableRow key={ch.id}>
                  <TableCell className="font-medium">{ch.title}</TableCell>
                  <TableCell>{ch.storyTitle || ch.storyId || "—"}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        try {
                          await adminApi.deleteChapter(ch.id);
                          toast.success("Chapter deleted");
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
