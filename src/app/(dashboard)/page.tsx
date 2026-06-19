"use client";

import useSWR from "swr";
import { adminApi } from "@/lib/api/admin";
import { DashboardAnalyticsView } from "@/components/dashboard/dashboard-analytics-view";

export default function DashboardPage() {
  const { data, error, isLoading } = useSWR("admin-dashboard-analytics", () =>
    adminApi.getDashboardAnalytics(30),
  );

  return (
    <DashboardAnalyticsView
      analytics={data?.analytics}
      loading={isLoading}
      error={error}
    />
  );
}
