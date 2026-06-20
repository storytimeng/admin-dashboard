"use client";

import { useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import {
  SerialNumberCell,
  SerialNumberHead,
} from "@/components/shared/serial-number-head";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi } from "@/lib/api/admin";
import type {
  AmbassadorApplicationItem,
  AmbassadorApplicationStatus,
} from "@/types/admin";

const STATUS_TABS: Array<{
  value: AmbassadorApplicationStatus | "all";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

function statusVariant(
  status: AmbassadorApplicationStatus,
): "secondary" | "default" | "destructive" {
  switch (status) {
    case "pending":
      return "secondary";
    case "accepted":
      return "default";
    case "declined":
      return "destructive";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function displayText(value?: string | null): string {
  const trimmed = value?.trim();
  return trimmed || "—";
}

function formatWeeklyCommitment(hours: number): string {
  if (hours <= 0) return "—";
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

function getApplicationReviewFields(application: AmbassadorApplicationItem) {
  const storytimeRole = application.storytimeRole?.trim() || null;
  const readingExperience = application.readingExperience?.trim() || null;
  const conflictHandling =
    application.conflictHandling?.trim() ||
    application.writingExperience?.trim() ||
    null;

  return {
    storytimeRole,
    readingExperience,
    conflictHandling,
  };
}

function ApplicationReviewDetails({
  application,
  declineReason,
  onDeclineReasonChange,
}: {
  application: AmbassadorApplicationItem;
  declineReason: string;
  onDeclineReasonChange: (value: string) => void;
}) {
  const reviewFields = getApplicationReviewFields(application);

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-muted-foreground">Name</p>
          <p className="font-medium">{application.fullName}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Type</p>
          <p className="font-medium capitalize">{application.type}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Email</p>
          <p>{application.email}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Location</p>
          <p>
            {application.city}, {application.country}
          </p>
        </div>
        {application.institution && (
          <div className="col-span-2">
            <p className="text-muted-foreground">Institution</p>
            <p>{application.institution}</p>
          </div>
        )}
      </div>

      <div>
        <p className="text-muted-foreground mb-1">Why join</p>
        <p className="whitespace-pre-wrap">{application.whyJoin}</p>
      </div>

      {(application.profileTypes?.length ?? 0) > 0 && (
        <div>
          <p className="text-muted-foreground mb-1">Profile types</p>
          <div className="flex flex-wrap gap-2">
            {application.profileTypes?.map((item) => (
              <Badge key={item} variant="outline">
                {item}
              </Badge>
            ))}
          </div>
          {application.otherProfileType && (
            <p className="mt-2 whitespace-pre-wrap">
              Other: {application.otherProfileType}
            </p>
          )}
        </div>
      )}

      {reviewFields.storytimeRole ? (
        <div>
          <p className="text-muted-foreground mb-1">Storytime role</p>
          <p className="whitespace-pre-wrap">{reviewFields.storytimeRole}</p>
        </div>
      ) : reviewFields.readingExperience ? (
        <div>
          <p className="text-muted-foreground mb-1">Reading experience</p>
          <p className="whitespace-pre-wrap">
            {reviewFields.readingExperience}
          </p>
        </div>
      ) : (
        <div>
          <p className="text-muted-foreground mb-1">Storytime role</p>
          <p>—</p>
        </div>
      )}

      <div>
        <p className="text-muted-foreground mb-1">
          Part of organized community
        </p>
        <p>
          {(application.partOfOrganizedCommunity ??
          application.hasLedCommunityBefore)
            ? "Yes"
            : "No"}
        </p>
      </div>

      {(application.promotionMethods?.length ?? 0) > 0 && (
        <div>
          <p className="text-muted-foreground mb-1">Promotion methods</p>
          <div className="flex flex-wrap gap-2">
            {application.promotionMethods?.map((item) => (
              <Badge key={item} variant="outline">
                {item}
              </Badge>
            ))}
          </div>
          {application.otherPromotionDetail && (
            <p className="mt-2 whitespace-pre-wrap">
              Other: {application.otherPromotionDetail}
            </p>
          )}
        </div>
      )}

      <div>
        <p className="text-muted-foreground mb-1">Conflict handling</p>
        <p className="whitespace-pre-wrap">
          {displayText(reviewFields.conflictHandling)}
        </p>
      </div>

      <div>
        <p className="text-muted-foreground mb-1">Favorite genres</p>
        {application.favoriteGenres.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {application.favoriteGenres.map((genre) => (
              <Badge key={genre} variant="outline">
                {genre}
              </Badge>
            ))}
          </div>
        ) : (
          <p>—</p>
        )}
      </div>

      <p>
        <span className="text-muted-foreground">Weekly commitment:</span>{" "}
        {formatWeeklyCommitment(application.weeklyHoursCommitment)}
      </p>

      {!application.promotionMethods?.length && (
        <div>
          <p className="text-muted-foreground mb-1">Community plan</p>
          <p className="whitespace-pre-wrap">
            {application.communityDescription}
          </p>
        </div>
      )}

      {application.status === "pending" && (
        <div className="space-y-2 pt-2">
          <Label htmlFor="decline-reason">Decline reason (if declining)</Label>
          <Textarea
            id="decline-reason"
            value={declineReason}
            onChange={(e) => onDeclineReasonChange(e.target.value)}
            placeholder="Required when declining an application"
          />
        </div>
      )}
    </div>
  );
}

export default function AmbassadorsPage() {
  const [tab, setTab] = useState<AmbassadorApplicationStatus | "all">(
    "pending",
  );
  const [selected, setSelected] = useState<AmbassadorApplicationItem | null>(
    null,
  );
  const [declineReason, setDeclineReason] = useState("");
  const [reviewing, setReviewing] = useState(false);

  const statusFilter = tab === "all" ? undefined : tab;
  const { data, isLoading, mutate } = useSWR(
    ["ambassador-applications", tab],
    () => adminApi.getAmbassadorApplications(statusFilter),
  );

  const items = data ?? [];
  const {
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    paginatedItems,
    serialOffset,
    handlePageSizeChange,
  } = useClientPagination(items);

  const handleReview = async (status: "accepted" | "declined") => {
    if (!selected) return;
    if (status === "declined" && !declineReason.trim()) {
      toast.error("A decline reason is required.");
      return;
    }

    setReviewing(true);
    try {
      await adminApi.reviewAmbassadorApplication(selected.id, {
        status,
        declineReason: status === "declined" ? declineReason.trim() : undefined,
      });
      toast.success(
        status === "accepted" ? "Application accepted" : "Application declined",
      );
      setSelected(null);
      setDeclineReason("");
      await mutate();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Review failed");
    } finally {
      setReviewing(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ambassadors"
        description="Review ambassador applications and manage the program."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {STATUS_TABS.map((t) => (
          <TabsContent key={t.value} value={t.value} className="space-y-4">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SerialNumberHead />
                      <TableHead>Applicant</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedItems.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center text-muted-foreground"
                        >
                          No applications found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedItems.map((item, index) => (
                        <TableRow key={item.id}>
                          <SerialNumberCell
                            offset={serialOffset}
                            index={index}
                          />
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.fullName}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.email}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">
                            {item.type}
                          </TableCell>
                          <TableCell>
                            {item.city}, {item.country}
                          </TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(item.status)}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelected(item);
                                setDeclineReason("");
                              }}
                            >
                              Review
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <TablePagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  totalPages={totalPages}
                  onPageChange={setPage}
                  onPageSizeChange={handlePageSizeChange}
                />
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review Application</DialogTitle>
          </DialogHeader>

          {selected && (
            <ApplicationReviewDetails
              application={selected}
              declineReason={declineReason}
              onDeclineReasonChange={setDeclineReason}
            />
          )}

          <DialogFooter>
            {selected?.status === "pending" && (
              <>
                <Button
                  variant="destructive"
                  disabled={reviewing}
                  onClick={() => handleReview("declined")}
                >
                  Decline
                </Button>
                <Button
                  disabled={reviewing}
                  onClick={() => handleReview("accepted")}
                >
                  Accept
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
