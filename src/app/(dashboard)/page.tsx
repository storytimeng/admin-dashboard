"use client";

import useSWR from "swr";
import {
  Users,
  BookOpen,
  MessageSquare,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { adminApi } from "@/lib/api/admin";
import { formatDistanceToNow } from "date-fns";

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

export default function DashboardPage() {
  const {
    data: reports,
    error: reportsError,
    isLoading: reportsLoading,
  } = useSWR("admin-reports", () => adminApi.getReportsOverview());

  const {
    data: subs,
    error: subsError,
    isLoading: subsLoading,
  } = useSWR("admin-subscriptions-overview", () =>
    adminApi.getSubscriptionOverview(),
  );

  const report = reports?.report;
  const loading = reportsLoading || subsLoading;
  const error = reportsError || subsError;

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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total Users"
          value={report?.users.total ?? "—"}
          sub={`${report?.users.active ?? 0} active · ${report?.users.suspended ?? 0} suspended`}
          icon={Users}
          loading={loading}
        />
        <KpiCard
          title="Stories"
          value={report?.stories.total ?? "—"}
          sub={`${report?.stories.active ?? 0} active · ${report?.stories.suspended ?? 0} suspended`}
          icon={BookOpen}
          loading={loading}
        />
        <KpiCard
          title="Comments"
          value={report?.comments.total ?? "—"}
          sub={`${report?.content.episodes ?? 0} episodes · ${report?.content.chapters ?? 0} chapters`}
          icon={MessageSquare}
          loading={loading}
        />
        <KpiCard
          title="Premium Users"
          value={subs?.premiumUsers ?? "—"}
          sub={`${subs?.activeSubscriptions ?? 0} active subscriptions`}
          icon={CreditCard}
          loading={loading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by currency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subsLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : subs?.revenueByCurrency?.length ? (
              subs.revenueByCurrency.map((row) => (
                <div
                  key={row.currency}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
                  <span className="font-medium">{row.currency}</span>
                  <span className="text-muted-foreground">{row.formatted}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No payment data yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments snapshot</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border p-3">
              <p className="text-2xl font-bold">{subs?.totalPayments ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-2xl font-bold text-green-600">
                {subs?.successfulPayments ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Successful</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-2xl font-bold text-amber-600">
                {subs?.pendingPayments ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {report?.generatedAt ? (
        <p className="text-xs text-muted-foreground">
          Report generated{" "}
          {formatDistanceToNow(new Date(report.generatedAt), {
            addSuffix: true,
          })}
        </p>
      ) : null}
    </div>
  );
}
