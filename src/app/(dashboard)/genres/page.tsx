"use client";

import useSWR from "swr";
import { Tag } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { adminApi } from "@/lib/api/admin";

export default function GenresPage() {
  const { data, isLoading, error } = useSWR("genres", () =>
    adminApi.getGenres(),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Genres"
        description="Platform story genres available for filtering and categorization."
      />

      <Alert>
        <Tag className="size-4" />
        <AlertTitle>Read-only</AlertTitle>
        <AlertDescription>
          Genres are defined in the backend as a static list. Contact
          engineering to add or rename genres in a future release.
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full" />
          ))}
        </div>
      ) : error ? (
        <p className="text-destructive text-sm">Failed to load genres</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {data?.map((genre) => (
            <Badge
              key={genre}
              variant="secondary"
              className="px-4 py-2 text-sm capitalize"
            >
              {genre}
            </Badge>
          ))}
        </div>
      )}

      <p className="text-sm text-muted-foreground">
        {data?.length ?? 0} genres total
      </p>
    </div>
  );
}
