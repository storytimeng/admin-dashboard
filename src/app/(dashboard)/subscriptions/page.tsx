"use client";

import useSWR from "swr";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin";
import { formatDistanceToNow } from "date-fns";

export default function SubscriptionsPage() {
  const { data: overview, isLoading: overviewLoading } = useSWR(
    "subs-overview",
    () => adminApi.getSubscriptionOverview(),
  );
  const { data: payments, isLoading: paymentsLoading } = useSWR(
    "subs-payments",
    () => adminApi.getPayments({ page: 1, limit: 50 }),
  );
  const { data: records, isLoading: recordsLoading } = useSWR(
    "subs-records",
    () => adminApi.getSubscriptionRecords({ page: 1, limit: 50 }),
  );
  const { data: auditLogs, isLoading: auditLoading } = useSWR(
    "subs-audit-logs",
    () => adminApi.getSubscriptionAuditLogs({ page: 1, limit: 50 }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions & Payments"
        description="Monitor premium subscriptions, payment transactions, and revenue."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overviewLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))
        ) : (
          <>
            <Stat label="Premium users" value={overview?.premiumUsers ?? 0} />
            <Stat
              label="Active subscriptions"
              value={overview?.activeSubscriptions ?? 0}
            />
            <Stat
              label="Successful payments"
              value={overview?.successfulPayments ?? 0}
            />
            <Stat label="Pending" value={overview?.pendingPayments ?? 0} />
          </>
        )}
      </div>

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="audit">Audit trail</TabsTrigger>
        </TabsList>
        <TabsContent value="payments" className="mt-4">
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : (
                  payments?.payments?.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">
                        {p.reference}
                      </TableCell>
                      <TableCell>{p.userEmail || p.userId}</TableCell>
                      <TableCell>{p.planName || p.planCode || "—"}</TableCell>
                      <TableCell>{p.formattedAmount}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            p.status === "success" ? "outline" : "secondary"
                          }
                          className="capitalize"
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.paidAt
                          ? formatDistanceToNow(new Date(p.paidAt), {
                              addSuffix: true,
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-4">
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordsLoading ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : (
                  records?.subscriptions?.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>{s.userEmail || s.userId}</TableCell>
                      <TableCell>{s.planName || s.planCode}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.expiresAt
                          ? formatDistanceToNow(new Date(s.expiresAt), {
                              addSuffix: true,
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="audit" className="mt-4">
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLoading ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : auditLogs?.items?.length ? (
                  auditLogs.items.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {log.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.entityType}
                        {log.entityId ? (
                          <span className="block font-mono text-xs text-muted-foreground truncate max-w-[180px]">
                            {log.entityId}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="capitalize text-sm">
                        {log.actor || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.createdAt
                          ? formatDistanceToNow(new Date(log.createdAt), {
                              addSuffix: true,
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No audit events yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}
