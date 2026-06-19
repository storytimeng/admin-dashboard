"use client";

import { useState } from "react";
import useSWR from "swr";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import {
  SerialNumberCell,
  SerialNumberHead,
} from "@/components/shared/serial-number-head";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/hooks/use-client-pagination";
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
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [paymentsPageSize, setPaymentsPageSize] = useState(
    DEFAULT_TABLE_PAGE_SIZE,
  );
  const [recordsPage, setRecordsPage] = useState(1);
  const [recordsPageSize, setRecordsPageSize] = useState(
    DEFAULT_TABLE_PAGE_SIZE,
  );
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const { data: overview, isLoading: overviewLoading } = useSWR(
    "subs-overview",
    () => adminApi.getSubscriptionOverview(),
  );
  const { data: payments, isLoading: paymentsLoading } = useSWR(
    ["subs-payments", paymentsPage, paymentsPageSize],
    () => adminApi.getPayments({ page: paymentsPage, limit: paymentsPageSize }),
  );
  const { data: records, isLoading: recordsLoading } = useSWR(
    ["subs-records", recordsPage, recordsPageSize],
    () =>
      adminApi.getSubscriptionRecords({
        page: recordsPage,
        limit: recordsPageSize,
      }),
  );
  const { data: auditLogs, isLoading: auditLoading } = useSWR(
    ["subs-audit-logs", auditPage, auditPageSize],
    () =>
      adminApi.getSubscriptionAuditLogs({
        page: auditPage,
        limit: auditPageSize,
      }),
  );

  const paymentsSerialOffset = (paymentsPage - 1) * paymentsPageSize;
  const recordsSerialOffset = (recordsPage - 1) * recordsPageSize;
  const auditSerialOffset = (auditPage - 1) * auditPageSize;

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
        <TabsContent value="payments" className="mt-4 space-y-4">
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SerialNumberHead />
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
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : payments?.payments?.length ? (
                  payments.payments.map((p, index) => (
                    <TableRow key={p.id}>
                      <SerialNumberCell
                        index={index}
                        offset={paymentsSerialOffset}
                      />
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
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No payments found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={paymentsPage}
            totalPages={payments?.totalPages ?? 1}
            total={payments?.total ?? 0}
            pageSize={paymentsPageSize}
            onPageChange={setPaymentsPage}
            onPageSizeChange={(size) => {
              setPaymentsPageSize(size);
              setPaymentsPage(1);
            }}
            disabled={paymentsLoading}
          />
        </TabsContent>
        <TabsContent value="subscriptions" className="mt-4 space-y-4">
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SerialNumberHead />
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : records?.subscriptions?.length ? (
                  records.subscriptions.map((s, index) => (
                    <TableRow key={s.id}>
                      <SerialNumberCell
                        index={index}
                        offset={recordsSerialOffset}
                      />
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
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No subscriptions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={recordsPage}
            totalPages={records?.totalPages ?? 1}
            total={records?.total ?? 0}
            pageSize={recordsPageSize}
            onPageChange={setRecordsPage}
            onPageSizeChange={(size) => {
              setRecordsPageSize(size);
              setRecordsPage(1);
            }}
            disabled={recordsLoading}
          />
        </TabsContent>
        <TabsContent value="audit" className="mt-4 space-y-4">
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SerialNumberHead />
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLoading ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : auditLogs?.items?.length ? (
                  auditLogs.items.map((log, index) => (
                    <TableRow key={log.id}>
                      <SerialNumberCell
                        index={index}
                        offset={auditSerialOffset}
                      />
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
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No audit events yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={auditPage}
            totalPages={auditLogs?.totalPages ?? 1}
            total={auditLogs?.total ?? 0}
            pageSize={auditPageSize}
            onPageChange={setAuditPage}
            onPageSizeChange={(size) => {
              setAuditPageSize(size);
              setAuditPage(1);
            }}
            disabled={auditLoading}
          />
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
