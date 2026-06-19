"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  BookOpen,
  Eye,
  Heart,
  MessageSquare,
  TrendingUp,
  Users,
  CreditCard,
  Crown,
  UserPlus,
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import {
  SerialNumberCell,
  SerialNumberHead,
} from "@/components/shared/serial-number-head";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { DashboardAnalytics } from "@/types/admin";

const STATUS_COLORS: Record<string, string> = {
  complete: "#22c55e",
  ongoing: "#3b82f6",
  drafts: "#94a3b8",
};

const ALERT_VARIANT: Record<
  DashboardAnalytics["alerts"][number]["type"],
  "default" | "destructive"
> = {
  warning: "default",
  info: "default",
  danger: "destructive",
};

function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {sub ? (
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function formatTrendDate(date: string) {
  try {
    return format(parseISO(date), "MMM d");
  } catch {
    return date;
  }
}

function ChartSkeleton() {
  return <Skeleton className="h-[260px] w-full" />;
}

export function DashboardAnalyticsView({
  analytics,
  loading,
  error,
}: {
  analytics?: DashboardAnalytics;
  loading?: boolean;
  error?: Error | null;
}) {
  const s = analytics?.summary;
  const subs = s?.subscriptions;

  const topStories = analytics?.topStories ?? [];
  const topAuthors = analytics?.topAuthors ?? [];
  const recentUsers = analytics?.recentUsers ?? [];
  const recentStories = analytics?.recentStories ?? [];

  const topStoriesPagination = useClientPagination(topStories, {
    defaultPageSize: 10,
  });
  const topAuthorsPagination = useClientPagination(topAuthors, {
    defaultPageSize: 10,
  });
  const recentUsersPagination = useClientPagination(recentUsers, {
    defaultPageSize: 10,
  });
  const recentStoriesPagination = useClientPagination(recentStories, {
    defaultPageSize: 10,
  });

  const revenueTrendByDate = (() => {
    const map = new Map<string, Record<string, number | string>>();
    for (const row of analytics?.trends.revenue ?? []) {
      const entry = map.get(row.date) ?? { date: row.date };
      entry[row.currency] = row.amountMinor / 100;
      entry[`${row.currency}_label`] = row.formatted;
      map.set(row.date, entry);
    }
    return Array.from(map.values()).sort((a, b) =>
      String(a.date).localeCompare(String(b.date)),
    );
  })();

  const revenueCurrencies = [
    ...new Set(analytics?.trends.revenue.map((r) => r.currency) ?? []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Platform health, growth metrics, and operational overview."
      />

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertTitle>Failed to load dashboard</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      ) : null}

      {analytics?.alerts.length ? (
        <div className="flex flex-wrap gap-2">
          {analytics.alerts.map((alert) => (
            <Badge
              key={alert.label}
              variant={ALERT_VARIANT[alert.type]}
              className="px-3 py-1 text-sm"
            >
              {alert.label}: {alert.count}
            </Badge>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        <KpiCard
          title="Total Users"
          value={s?.users.total ?? "—"}
          sub={`${s?.users.active ?? 0} active · +${s?.users.newLast7Days ?? 0} this week`}
          icon={Users}
          loading={loading}
        />
        <KpiCard
          title="Active Readers (7d)"
          value={s?.users.activeLast7Days ?? "—"}
          sub={`${s?.users.verified ?? 0} verified · ${s?.users.suspended ?? 0} suspended`}
          icon={UserPlus}
          loading={loading}
        />
        <KpiCard
          title="Stories"
          value={s?.stories.total ?? "—"}
          sub={`${s?.stories.complete ?? 0} complete · ${s?.stories.ongoing ?? 0} ongoing · ${s?.stories.drafts ?? 0} drafts`}
          icon={BookOpen}
          loading={loading}
        />
        <KpiCard
          title="Total Reads"
          value={s?.engagement.totalReads ?? "—"}
          sub={`${s?.engagement.readsLast7Days ?? 0} this week · avg ${s?.derived.avgReadsPerStory ?? 0}/story`}
          icon={Eye}
          loading={loading}
        />
        <KpiCard
          title="Engagement"
          value={s?.engagement.totalComments ?? "—"}
          sub={`${s?.engagement.totalLikes ?? 0} likes · ${s?.engagement.chapters ?? 0} chapters · ${s?.engagement.episodes ?? 0} episodes`}
          icon={MessageSquare}
          loading={loading}
        />
        <KpiCard
          title="Premium Users"
          value={subs?.premiumUsers ?? "—"}
          sub={`${subs?.premiumConversionRate ?? 0}% conversion · ${subs?.activeSubscriptions ?? 0} active subs`}
          icon={Crown}
          loading={loading}
        />
        <KpiCard
          title="Revenue (all time)"
          value={
            subs?.revenueByCurrency?.length
              ? subs.revenueByCurrency.map((r) => r.formatted).join(" · ")
              : "—"
          }
          sub={
            subs?.revenueLast30Days?.length
              ? `Last 30d: ${subs.revenueLast30Days.map((r) => r.formatted).join(" · ")}`
              : undefined
          }
          icon={TrendingUp}
          loading={loading}
        />
        <KpiCard
          title="Payments"
          value={subs?.successfulPayments ?? "—"}
          sub={`${subs?.paymentSuccessRate ?? 0}% success · ${subs?.pendingPayments ?? 0} pending · ${subs?.failedPayments ?? 0} failed`}
          icon={CreditCard}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              User signups ({analytics?.trendDays ?? 30} days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={analytics?.trends.userSignups ?? []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatTrendDate}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis allowDecimals={false} fontSize={11} tickLine={false} />
                  <Tooltip labelFormatter={(v) => formatTrendDate(String(v))} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Signups"
                    stroke="#3b82f6"
                    fill="#3b82f680"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Story reads ({analytics?.trendDays ?? 30} days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={analytics?.trends.reads ?? []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatTrendDate}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis allowDecimals={false} fontSize={11} tickLine={false} />
                  <Tooltip labelFormatter={(v) => formatTrendDate(String(v))} />
                  <Area
                    type="monotone"
                    dataKey="count"
                    name="Reads"
                    stroke="#22c55e"
                    fill="#22c55e80"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Story status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={analytics?.storyStatusBreakdown ?? []}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {(analytics?.storyStatusBreakdown ?? []).map((entry) => (
                      <Cell
                        key={entry.status}
                        fill={STATUS_COLORS[entry.status] ?? "#64748b"}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top genres</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : analytics?.genreBreakdown.length ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={analytics.genreBreakdown}
                  layout="vertical"
                  margin={{ left: 8, right: 8 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis type="number" allowDecimals={false} fontSize={11} />
                  <YAxis
                    type="category"
                    dataKey="genre"
                    width={90}
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    name="Stories"
                    fill="#8b5cf6"
                    radius={4}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No genre data yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Content format</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-[260px] w-full" />
            ) : (
              <>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg border p-3">
                    <p className="text-2xl font-bold">
                      {analytics?.contentFormat.chapterStories ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Chapter series
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-2xl font-bold">
                      {analytics?.contentFormat.episodeStories ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Episodes</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-2xl font-bold">
                      {analytics?.contentFormat.standalone ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Standalone</p>
                  </div>
                </div>
                <div className="rounded-lg border p-3 text-sm space-y-1">
                  <p>
                    <span className="text-muted-foreground">Exclusive:</span>{" "}
                    {s?.stories.exclusive ?? 0} stories
                  </p>
                  <p>
                    <span className="text-muted-foreground">Anonymous:</span>{" "}
                    {s?.stories.anonymous ?? 0} stories
                  </p>
                  <p>
                    <span className="text-muted-foreground">18+ flagged:</span>{" "}
                    {s?.stories.triggerContent ?? 0} stories
                  </p>
                  <p>
                    <span className="text-muted-foreground">Suspended:</span>{" "}
                    {s?.stories.suspended ?? 0} stories
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {revenueTrendByDate.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <ChartSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={revenueTrendByDate}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatTrendDate}
                    fontSize={11}
                  />
                  <YAxis fontSize={11} />
                  <Tooltip labelFormatter={(v) => formatTrendDate(String(v))} />
                  <Legend />
                  {revenueCurrencies.map((currency, i) => (
                    <Bar
                      key={currency}
                      dataKey={currency}
                      name={currency}
                      fill={["#22c55e", "#3b82f6", "#f59e0b"][i % 3]}
                      radius={4}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Top stories by reads</CardTitle>
            <Link
              href="/stories"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SerialNumberHead />
                      <TableHead>Title</TableHead>
                      <TableHead className="text-right">Reads</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">
                        <Heart className="inline size-3" />
                      </TableHead>
                      <TableHead className="text-right hidden sm:table-cell">
                        <MessageSquare className="inline size-3" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topStoriesPagination.paginatedItems.map((story, index) => (
                      <TableRow key={story.id}>
                        <SerialNumberCell
                          index={index}
                          offset={topStoriesPagination.serialOffset}
                        />
                        <TableCell>
                          <Link
                            href={`/stories/${story.id}`}
                            className="font-medium hover:underline line-clamp-1"
                          >
                            {story.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {story.authorPenName ?? "Unknown"} ·{" "}
                            {story.storyStatus}
                          </p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {story.reads}
                        </TableCell>
                        <TableCell className="text-right tabular-nums hidden sm:table-cell">
                          {story.likes}
                        </TableCell>
                        <TableCell className="text-right tabular-nums hidden sm:table-cell">
                          {story.comments}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={topStoriesPagination.page}
                  totalPages={topStoriesPagination.totalPages}
                  total={topStoriesPagination.total}
                  pageSize={topStoriesPagination.pageSize}
                  onPageChange={topStoriesPagination.setPage}
                  onPageSizeChange={topStoriesPagination.handlePageSizeChange}
                  pageSizeOptions={[5, 10, 20]}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Top authors</CardTitle>
            <Link
              href="/users"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              View users
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SerialNumberHead />
                      <TableHead>Author</TableHead>
                      <TableHead className="text-right">Stories</TableHead>
                      <TableHead className="text-right">Reads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topAuthorsPagination.paginatedItems.map(
                      (author, index) => (
                        <TableRow key={author.authorId}>
                          <SerialNumberCell
                            index={index}
                            offset={topAuthorsPagination.serialOffset}
                          />
                          <TableCell>
                            <p className="font-medium">
                              {author.penName ?? author.email}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {author.email}
                            </p>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {author.storyCount}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {author.totalReads}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
                <TablePagination
                  page={topAuthorsPagination.page}
                  totalPages={topAuthorsPagination.totalPages}
                  total={topAuthorsPagination.total}
                  pageSize={topAuthorsPagination.pageSize}
                  onPageChange={topAuthorsPagination.setPage}
                  onPageSizeChange={topAuthorsPagination.handlePageSizeChange}
                  pageSizeOptions={[5, 10, 20]}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent signups</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SerialNumberHead />
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentUsersPagination.paginatedItems.map((user, index) => (
                      <TableRow key={user.id}>
                        <SerialNumberCell
                          index={index}
                          offset={recentUsersPagination.serialOffset}
                        />
                        <TableCell>
                          <p className="font-medium">
                            {user.penName ?? user.email}
                            {user.isPremium ? (
                              <Badge
                                variant="secondary"
                                className="ml-2 text-[10px]"
                              >
                                Premium
                              </Badge>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(user.createdAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <TablePagination
                  page={recentUsersPagination.page}
                  totalPages={recentUsersPagination.totalPages}
                  total={recentUsersPagination.total}
                  pageSize={recentUsersPagination.pageSize}
                  onPageChange={recentUsersPagination.setPage}
                  onPageSizeChange={recentUsersPagination.handlePageSizeChange}
                  pageSizeOptions={[5, 10, 20]}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent stories</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SerialNumberHead />
                      <TableHead>Story</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentStoriesPagination.paginatedItems.map(
                      (story, index) => (
                        <TableRow key={story.id}>
                          <SerialNumberCell
                            index={index}
                            offset={recentStoriesPagination.serialOffset}
                          />
                          <TableCell>
                            <Link
                              href={`/stories/${story.id}`}
                              className="font-medium hover:underline line-clamp-1"
                            >
                              {story.title}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              {story.authorPenName ?? "Unknown"} ·{" "}
                              {formatDistanceToNow(new Date(story.createdAt), {
                                addSuffix: true,
                              })}
                            </p>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                story.isSuspended ? "destructive" : "secondary"
                              }
                            >
                              {story.isSuspended
                                ? "Suspended"
                                : story.storyStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
                <TablePagination
                  page={recentStoriesPagination.page}
                  totalPages={recentStoriesPagination.totalPages}
                  total={recentStoriesPagination.total}
                  pageSize={recentStoriesPagination.pageSize}
                  onPageChange={recentStoriesPagination.setPage}
                  onPageSizeChange={
                    recentStoriesPagination.handlePageSizeChange
                  }
                  pageSizeOptions={[5, 10, 20]}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {analytics?.generatedAt ? (
        <p className="text-xs text-muted-foreground">
          Analytics generated{" "}
          {formatDistanceToNow(new Date(analytics.generatedAt), {
            addSuffix: true,
          })}
          {" · "}
          {analytics.trendDays}-day trend window
        </p>
      ) : null}
    </div>
  );
}
