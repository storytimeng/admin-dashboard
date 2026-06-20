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
import { Input } from "@/components/ui/input";
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
  AmbassadorLeaderboardScope,
  AmbassadorMonthlyReportItem,
  AmbassadorMonthlyReportStatus,
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

function reportStatusVariant(
  status: AmbassadorMonthlyReportStatus,
): "secondary" | "default" | "destructive" | "outline" {
  switch (status) {
    case "draft":
      return "outline";
    case "submitted":
    case "processing":
      return "secondary";
    case "completed":
      return "default";
    case "inactive":
      return "outline";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function MonthlyReportReviewDetails({
  report,
}: {
  report: AmbassadorMonthlyReportItem;
}) {
  const ambassadorName = report.user
    ? `${report.user.firstName} ${report.user.lastName}`.trim()
    : "—";

  return (
    <div className="space-y-4 text-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-muted-foreground">Ambassador</p>
          <p className="font-medium">{ambassadorName}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Period</p>
          <p className="font-medium">{report.monthLabel}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Type</p>
          <p className="font-medium capitalize">
            {report.ambassador?.type ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Status</p>
          <p className="font-medium capitalize">{report.status}</p>
        </div>
        <div>
          <p className="text-muted-foreground">New users introduced</p>
          <p>{report.newReferrals}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Referral stories published</p>
          <p>{report.referralStoriesPublished}</p>
        </div>
        <div>
          <p className="text-muted-foreground">
            Activity submission flag (0/1)
          </p>
          <p>{report.eventsHosted}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Submitted</p>
          <p>
            {report.submittedAt
              ? new Date(report.submittedAt).toLocaleString()
              : "—"}
          </p>
        </div>
      </div>

      <div>
        <p className="text-muted-foreground mb-1">
          Activities and events hosted
        </p>
        <p className="whitespace-pre-wrap rounded-md border p-3 bg-muted/30">
          {displayText(report.activitiesDescription)}
        </p>
      </div>

      {report.programFeedback?.trim() && (
        <div>
          <p className="text-muted-foreground mb-1">Program feedback</p>
          <p className="whitespace-pre-wrap rounded-md border p-3 bg-muted/30">
            {report.programFeedback}
          </p>
        </div>
      )}
    </div>
  );
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
        {application.phone && (
          <div>
            <p className="text-muted-foreground">Phone</p>
            <p>{application.phone}</p>
          </div>
        )}
        {application.applicationReference && (
          <div>
            <p className="text-muted-foreground">Application ID</p>
            <p>#{application.applicationReference}</p>
          </div>
        )}
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

      {(application.instagram ||
        application.twitter ||
        application.tiktok ||
        application.linkedin) && (
        <div className="grid grid-cols-2 gap-3">
          {application.instagram && (
            <div>
              <p className="text-muted-foreground">Instagram</p>
              <p>{application.instagram}</p>
            </div>
          )}
          {application.twitter && (
            <div>
              <p className="text-muted-foreground">Twitter / X</p>
              <p>{application.twitter}</p>
            </div>
          )}
          {application.tiktok && (
            <div>
              <p className="text-muted-foreground">TikTok</p>
              <p>{application.tiktok}</p>
            </div>
          )}
          {application.linkedin && (
            <div>
              <p className="text-muted-foreground">LinkedIn</p>
              <p>{application.linkedin}</p>
            </div>
          )}
        </div>
      )}

      {application.status === "declined" && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
          <div>
            <p className="text-muted-foreground">Decline reason</p>
            <p className="whitespace-pre-wrap">
              {displayText(application.declineReason)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Reviewed at</p>
            <p>
              {application.reviewedAt
                ? new Date(application.reviewedAt).toLocaleString()
                : "—"}
            </p>
          </div>
          {application.canReapply === false &&
            application.reapplyDaysRemaining != null && (
              <p className="text-muted-foreground">
                Reapply available in {application.reapplyDaysRemaining} day
                {application.reapplyDaysRemaining === 1 ? "" : "s"}.
              </p>
            )}
        </div>
      )}

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

      <div className="grid grid-cols-2 gap-2 text-xs">
        <p>
          <span className="text-muted-foreground">
            Responsibility agreement:
          </span>{" "}
          {application.agreedToResponsibility ? "Yes" : "No"}
        </p>
        <p>
          <span className="text-muted-foreground">Integrity agreement:</span>{" "}
          {application.agreedToIntegrity ? "Yes" : "No"}
        </p>
        <p>
          <span className="text-muted-foreground">
            Monthly reports agreement:
          </span>{" "}
          {application.agreedToMonthlyReports ? "Yes" : "No"}
        </p>
        <p>
          <span className="text-muted-foreground">
            Performance review agreement:
          </span>{" "}
          {application.agreedToPerformanceReview ? "Yes" : "No"}
        </p>
      </div>

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

const LEADERBOARD_SCOPE_TABS: Array<{
  value: AmbassadorLeaderboardScope;
  label: string;
}> = [
  { value: "global", label: "Global" },
  { value: "campus", label: "Campus" },
  { value: "city", label: "City" },
];

export default function AmbassadorsPage() {
  const [section, setSection] = useState<
    "applications" | "reports" | "leaderboard"
  >("applications");
  const [tab, setTab] = useState<AmbassadorApplicationStatus | "all">(
    "pending",
  );
  const [reportTab, setReportTab] = useState<
    AmbassadorMonthlyReportStatus | "all"
  >("submitted");
  const [selected, setSelected] = useState<AmbassadorApplicationItem | null>(
    null,
  );
  const [selectedReport, setSelectedReport] =
    useState<AmbassadorMonthlyReportItem | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [leaderboardScope, setLeaderboardScope] =
    useState<AmbassadorLeaderboardScope>("global");
  const [leaderboardCity, setLeaderboardCity] = useState("");
  const [leaderboardOffset, setLeaderboardOffset] = useState(0);
  const leaderboardLimit = 20;

  const statusFilter = tab === "all" ? undefined : tab;
  const { data, isLoading, mutate } = useSWR(
    section === "applications" ? ["ambassador-applications", tab] : null,
    () => adminApi.getAmbassadorApplications(statusFilter),
  );

  const reportStatusFilter = reportTab === "all" ? undefined : reportTab;
  const { data: reportData, isLoading: reportsLoading } = useSWR(
    section === "reports" ? ["ambassador-monthly-reports", reportTab] : null,
    () => adminApi.getAmbassadorMonthlyReports(reportStatusFilter),
  );

  const { data: leaderboardData, isLoading: leaderboardLoading } = useSWR(
    section === "leaderboard"
      ? [
          "ambassador-leaderboard",
          leaderboardScope,
          leaderboardOffset,
          leaderboardCity,
        ]
      : null,
    () =>
      adminApi.getAmbassadorLeaderboard({
        scope: leaderboardScope,
        limit: leaderboardLimit,
        offset: leaderboardOffset,
        city:
          leaderboardScope === "city"
            ? leaderboardCity.trim() || undefined
            : undefined,
      }),
  );

  const items = data ?? [];
  const reportItems = reportData ?? [];
  const leaderboardItems = leaderboardData?.leaderboard ?? [];
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

  const {
    page: reportPage,
    setPage: setReportPage,
    pageSize: reportPageSize,
    total: reportTotal,
    totalPages: reportTotalPages,
    paginatedItems: paginatedReports,
    serialOffset: reportSerialOffset,
    handlePageSizeChange: handleReportPageSizeChange,
  } = useClientPagination(reportItems);

  const leaderboardTotal = leaderboardData?.total ?? 0;
  const leaderboardTotalPages = Math.max(
    1,
    Math.ceil(leaderboardTotal / leaderboardLimit),
  );
  const leaderboardPage = Math.floor(leaderboardOffset / leaderboardLimit) + 1;
  const leaderboardSerialOffset = leaderboardOffset;

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
        description="Review ambassador applications, monthly impact reports, and leaderboard rankings."
      />

      <Tabs
        value={section}
        onValueChange={(v) => setSection(v as typeof section)}
      >
        <TabsList>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="reports">Monthly Reports</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
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
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Tabs
            value={reportTab}
            onValueChange={(v) => setReportTab(v as typeof reportTab)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
              <TabsTrigger value="submitted">Submitted</TabsTrigger>
              <TabsTrigger value="processing">Processing</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
            </TabsList>

            {reportsLoading ? (
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
                      <TableHead>Ambassador</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Referrals</TableHead>
                      <TableHead>Stories</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReports.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center text-muted-foreground"
                        >
                          No monthly reports found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedReports.map((item, index) => (
                        <TableRow key={item.id}>
                          <SerialNumberCell
                            offset={reportSerialOffset}
                            index={index}
                          />
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {item.user
                                  ? `${item.user.firstName} ${item.user.lastName}`.trim()
                                  : "—"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.user?.email ?? "—"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>{item.monthLabel}</TableCell>
                          <TableCell>{item.newReferrals}</TableCell>
                          <TableCell>{item.referralStoriesPublished}</TableCell>
                          <TableCell>
                            <Badge variant={reportStatusVariant(item.status)}>
                              {item.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.submittedAt
                              ? new Date(item.submittedAt).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedReport(item)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                <TablePagination
                  page={reportPage}
                  pageSize={reportPageSize}
                  total={reportTotal}
                  totalPages={reportTotalPages}
                  onPageChange={setReportPage}
                  onPageSizeChange={handleReportPageSizeChange}
                />
              </>
            )}
          </Tabs>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <Tabs
            value={leaderboardScope}
            onValueChange={(v) => {
              setLeaderboardScope(v as AmbassadorLeaderboardScope);
              setLeaderboardOffset(0);
            }}
          >
            <TabsList>
              {LEADERBOARD_SCOPE_TABS.map((scopeTab) => (
                <TabsTrigger key={scopeTab.value} value={scopeTab.value}>
                  {scopeTab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {leaderboardScope === "city" && (
            <div className="max-w-sm space-y-2">
              <Label htmlFor="leaderboard-city">City filter</Label>
              <Input
                id="leaderboard-city"
                value={leaderboardCity}
                onChange={(e) => {
                  setLeaderboardCity(e.target.value);
                  setLeaderboardOffset(0);
                }}
                placeholder="Enter city name (required for city rankings)"
              />
              <p className="text-xs text-muted-foreground">
                City leaderboard requires a city filter. Results are empty until
                you enter a city.
              </p>
            </div>
          )}

          {leaderboardData?.nextResetDate && (
            <p className="text-sm text-muted-foreground">
              Rankings update monthly. Next reset:{" "}
              {new Date(leaderboardData.nextResetDate).toLocaleDateString()}
            </p>
          )}

          {leaderboardLoading ? (
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
                    <TableHead>Rank</TableHead>
                    <TableHead>Ambassador</TableHead>
                    <TableHead>Affiliation</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Awareness</TableHead>
                    <TableHead className="text-right">Reading</TableHead>
                    <TableHead className="text-right">Writing</TableHead>
                    <TableHead className="text-right">Community</TableHead>
                    <TableHead className="text-right">Consistency</TableHead>
                    <TableHead className="text-right">Impact Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboardItems.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={12}
                        className="text-center text-muted-foreground"
                      >
                        No leaderboard rankings found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    leaderboardItems.map((item, index) => (
                      <TableRow key={item.ambassadorId}>
                        <SerialNumberCell
                          offset={leaderboardSerialOffset}
                          index={index}
                        />
                        <TableCell className="font-medium">
                          #{item.rank}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {item.user
                                ? item.user.penName?.trim() ||
                                  `${item.user.firstName} ${item.user.lastName}`.trim()
                                : "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.referralCode}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{item.affiliation}</TableCell>
                        <TableCell className="capitalize">
                          {item.type}
                        </TableCell>
                        <TableCell className="capitalize">
                          {item.tier}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.awarenessScore}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.readingScore}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.writingScore}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.communityScore}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.consistencyScore}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.totalScore.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <TablePagination
                page={leaderboardPage}
                pageSize={leaderboardLimit}
                total={leaderboardTotal}
                totalPages={leaderboardTotalPages}
                onPageChange={(nextPage) =>
                  setLeaderboardOffset((nextPage - 1) * leaderboardLimit)
                }
                onPageSizeChange={() => undefined}
              />
            </>
          )}
        </TabsContent>
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

      <Dialog
        open={!!selectedReport}
        onOpenChange={(open) => !open && setSelectedReport(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Monthly Report Details</DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <MonthlyReportReviewDetails report={selectedReport} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
