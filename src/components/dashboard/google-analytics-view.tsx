"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ExternalLink,
  Eye,
  Globe2,
  MonitorSmartphone,
  Timer,
  Users,
} from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { adminApi } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/client";
import type { GoogleAnalyticsOverview } from "@/types/admin";
import { cn } from "@/lib/utils";

const RANGES = [7, 28, 90] as const;
type RangeDays = (typeof RANGES)[number];

const SETUP_STEPS = [
  "Copy the numeric GA4 Property ID (Admin → Property settings) — not the G-XXXXXXXX ID.",
  "Create a Google Cloud service account and download a JSON key.",
  "Enable the Google Analytics Data API on that GCP project.",
  "In GA4 → Property access management, grant the service account Viewer.",
  "Set GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON on the Nest backend (Coolify).",
];

function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function formatPercent(rate: number): string {
  // GA4 rates are typically 0–1 fractions
  const pct = rate <= 1 ? rate * 100 : rate;
  return `${pct.toFixed(1)}%`;
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m === 0) return `${rem}s`;
  return `${m}m ${rem}s`;
}

function KpiCard({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string;
  value: string;
  icon: typeof Users;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {hint ? (
          <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

function SetupState({ message }: { message?: string }) {
  return (
    <Alert>
      <AlertTitle>Google Analytics is not configured yet</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          {message ||
            "Connect a GA4 service account on the backend to load traffic data here."}
        </p>
        <ol className="list-decimal pl-5 space-y-1 text-sm">
          {SETUP_STEPS.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="text-sm">
          Consumer site measurement ID (for reference):{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">
            G-SQKY3GMQ0P
          </code>
        </p>
      </AlertDescription>
    </Alert>
  );
}

function OverviewTables({ analytics }: { analytics: GoogleAnalyticsOverview }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top pages</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead className="text-right">Views</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.topPages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    No page data in this range.
                  </TableCell>
                </TableRow>
              ) : (
                analytics.topPages.map((row) => (
                  <TableRow key={`${row.path}-${row.title}`}>
                    <TableCell className="max-w-[280px]">
                      <div className="truncate font-medium">{row.title}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {row.path}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.views)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Traffic sources</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source / medium</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.trafficSources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    No source data in this range.
                  </TableCell>
                </TableRow>
              ) : (
                analytics.trafficSources.map((row) => (
                  <TableRow key={`${row.source}/${row.medium}`}>
                    <TableCell>
                      <span className="font-medium">{row.source}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        / {row.medium}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.sessions)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MonitorSmartphone className="h-4 w-4" />
            Devices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Users</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    No device data in this range.
                  </TableCell>
                </TableRow>
              ) : (
                analytics.devices.map((row) => (
                  <TableRow key={row.category}>
                    <TableCell className="capitalize">{row.category}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.activeUsers)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe2 className="h-4 w-4" />
            Countries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Users</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.countries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    No country data in this range.
                  </TableCell>
                </TableRow>
              ) : (
                analytics.countries.map((row) => (
                  <TableRow key={row.country}>
                    <TableCell>{row.country}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(row.activeUsers)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export function GoogleAnalyticsView() {
  const [days, setDays] = useState<RangeDays>(28);

  const { data, error, isLoading } = useProtectedSWR(
    ["admin-google-analytics", days],
    () => adminApi.getGoogleAnalyticsOverview(days),
  );

  const analytics = data?.analytics;
  const notConfigured =
    error instanceof ApiError &&
    (error.statusCode === 503 ||
      error.message.toLowerCase().includes("not configured"));

  const chartData = useMemo(
    () =>
      (analytics?.daily ?? []).map((row) => ({
        ...row,
        label: (() => {
          try {
            return format(parseISO(row.date), "MMM d");
          } catch {
            return row.date;
          }
        })(),
      })),
    [analytics?.daily],
  );

  const consoleUrl =
    analytics?.consoleUrl ||
    (process.env.NEXT_PUBLIC_GA4_PROPERTY_ID
      ? `https://analytics.google.com/analytics/web/#/p${process.env.NEXT_PUBLIC_GA4_PROPERTY_ID}/`
      : "https://analytics.google.com/");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Google Analytics"
        description="GA4 traffic for storytime.ng — native overview plus a link into the full Google Analytics console."
        actions={
          <a
            href={consoleUrl}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Open in Google Analytics
            <ExternalLink className="ml-2 h-3.5 w-3.5" />
          </a>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((range) => (
          <Button
            key={range}
            type="button"
            size="sm"
            variant={days === range ? "default" : "outline"}
            onClick={() => setDays(range)}
            className={cn(days === range && "pointer-events-none")}
          >
            Last {range} days
          </Button>
        ))}
        {analytics?.realtime ? (
          <Badge variant="secondary" className="ml-auto gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            {formatNumber(analytics.realtime.activeUsers)} active now
          </Badge>
        ) : null}
      </div>

      {isLoading ? <LoadingSkeleton /> : null}

      {!isLoading && notConfigured ? (
        <SetupState
          message={error instanceof ApiError ? error.message : undefined}
        />
      ) : null}

      {!isLoading && error && !notConfigured ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load Google Analytics</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : "Unknown error"}
          </AlertDescription>
        </Alert>
      ) : null}

      {!isLoading && analytics ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              title="Active users"
              value={formatNumber(analytics.summary.activeUsers)}
              icon={Users}
              hint={`Property ${analytics.propertyId}`}
            />
            <KpiCard
              title="Sessions"
              value={formatNumber(analytics.summary.sessions)}
              icon={Activity}
            />
            <KpiCard
              title="Page views"
              value={formatNumber(analytics.summary.screenPageViews)}
              icon={Eye}
            />
            <KpiCard
              title="Engagement rate"
              value={formatPercent(analytics.summary.engagementRate)}
              icon={Activity}
            />
            <KpiCard
              title="Bounce rate"
              value={formatPercent(analytics.summary.bounceRate)}
              icon={Activity}
            />
            <KpiCard
              title="Avg. session"
              value={formatDuration(
                analytics.summary.averageSessionDurationSeconds,
              )}
              icon={Timer}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Daily users & page views ({analytics.days} days)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No daily series for this range.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="activeUsers"
                      name="Active users"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.15)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="screenPageViews"
                      name="Page views"
                      stroke="#3b82f6"
                      fill="#3b82f622"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <OverviewTables analytics={analytics} />

          <p className="text-xs text-muted-foreground">
            Updated{" "}
            {formatDistanceToNow(new Date(analytics.generatedAt), {
              addSuffix: true,
            })}{" "}
            · Measurement ID hint {analytics.measurementIdHint}
          </p>
        </>
      ) : null}
    </div>
  );
}
