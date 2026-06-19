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
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Name</p>
                  <p className="font-medium">{selected.fullName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="font-medium capitalize">{selected.type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p>{selected.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p>
                    {selected.city}, {selected.country}
                  </p>
                </div>
                {selected.institution && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Institution</p>
                    <p>{selected.institution}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-muted-foreground mb-1">Why join</p>
                <p className="whitespace-pre-wrap">{selected.whyJoin}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Reading experience</p>
                <p className="whitespace-pre-wrap">
                  {selected.readingExperience}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Community plan</p>
                <p className="whitespace-pre-wrap">
                  {selected.communityDescription}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selected.favoriteGenres.map((g) => (
                  <Badge key={g} variant="outline">
                    {g}
                  </Badge>
                ))}
              </div>
              <p>
                <span className="text-muted-foreground">
                  Weekly commitment:
                </span>{" "}
                {selected.weeklyHoursCommitment} hours
              </p>

              {selected.status === "pending" && (
                <div className="space-y-2 pt-2">
                  <Label htmlFor="decline-reason">
                    Decline reason (if declining)
                  </Label>
                  <Textarea
                    id="decline-reason"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Required when declining an application"
                  />
                </div>
              )}
            </div>
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
