"use client";

import { useState } from "react";
import Link from "next/link";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { MoreHorizontal, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import {
  SerialNumberCell,
  SerialNumberHead,
} from "@/components/shared/serial-number-head";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SubscriptionUpgradeDialog } from "@/components/subscriptions/subscription-upgrade-dialog";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { adminApi } from "@/lib/api/admin";
import type { SubscriptionRecord } from "@/types/admin";

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
  const [confirmAction, setConfirmAction] = useState<{
    subscription: SubscriptionRecord;
    action: "cancel" | "reactivate";
  } | null>(null);
  const [upgradeTarget, setUpgradeTarget] = useState<SubscriptionRecord | null>(
    null,
  );
  const [actionLoading, setActionLoading] = useState(false);

  const {
    data: overview,
    isLoading: overviewLoading,
    mutate: mutateOverview,
  } = useProtectedSWR("subs-overview", () => adminApi.getSubscriptionOverview());
  const {
    data: payments,
    isLoading: paymentsLoading,
    error: paymentsError,
    mutate: mutatePayments,
  } = useProtectedSWR(["subs-payments", paymentsPage, paymentsPageSize], () =>
    adminApi.getPayments({ page: paymentsPage, limit: paymentsPageSize }),
  );
  const {
    data: records,
    isLoading: recordsLoading,
    error: recordsError,
    mutate: mutateRecords,
  } = useProtectedSWR(["subs-records", recordsPage, recordsPageSize], () =>
    adminApi.getSubscriptionRecords({
      page: recordsPage,
      limit: recordsPageSize,
    }),
  );
  const { data: auditLogs, isLoading: auditLoading } = useProtectedSWR(
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

  const refreshAll = async () => {
    await Promise.all([mutateOverview(), mutatePayments(), mutateRecords()]);
  };

  const runSubscriptionAction = async () => {
    if (!confirmAction) return;

    setActionLoading(true);
    try {
      const { subscription, action } = confirmAction;
      const result =
        action === "cancel"
          ? await adminApi.cancelUserSubscription(subscription.id)
          : await adminApi.reactivateUserSubscription(subscription.id);

      toast.success(result.message);
      await refreshAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  const canCancel = (subscription: SubscriptionRecord) =>
    subscription.status === "active";
  const canReactivate = (subscription: SubscriptionRecord) =>
    subscription.status === "cancelled";
  const canUpgrade = (subscription: SubscriptionRecord) =>
    subscription.status === "active" || subscription.status === "cancelled";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions & Payments"
        description="Monitor premium subscriptions, payment transactions, and revenue. Manage renewals, cancellations, and plan upgrades."
        actions={
          <Button variant="outline" size="sm" onClick={() => refreshAll()}>
            <RefreshCw className="mr-2 size-4" />
            Refresh
          </Button>
        }
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
          {paymentsError ? (
            <ErrorBanner message="Could not load payments. Check your connection and permissions." />
          ) : null}
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
                      <TableCell>
                        {p.userId ? (
                          <Link
                            href={`/users/${p.userId}`}
                            className="hover:underline"
                          >
                            {p.userEmail || p.userId}
                          </Link>
                        ) : (
                          p.userEmail || "—"
                        )}
                      </TableCell>
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
          {recordsError ? (
            <ErrorBanner message="Could not load subscriptions. Check your connection and permissions." />
          ) : null}
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SerialNumberHead />
                  <TableHead>User</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Renewal</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
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
                      <TableCell>
                        <Link
                          href={`/users/${s.userId}`}
                          className="hover:underline"
                        >
                          {s.userEmail || s.userId}
                        </Link>
                      </TableCell>
                      <TableCell>{s.planName || s.planCode}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {s.status === "active" ? (
                          s.autoRenew ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              Auto-renew
                              {s.cardLast4 ? ` · ·${s.cardLast4}` : ""}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Manual / cancelled
                            </span>
                          )
                        ) : s.status === "cancelled" ? (
                          <span className="text-muted-foreground">
                            Ends at expiry
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {s.expiresAt
                          ? formatDistanceToNow(new Date(s.expiresAt), {
                              addSuffix: true,
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <SubscriptionActionsMenu
                          subscription={s}
                          onCancel={() =>
                            setConfirmAction({
                              subscription: s,
                              action: "cancel",
                            })
                          }
                          onReactivate={() =>
                            setConfirmAction({
                              subscription: s,
                              action: "reactivate",
                            })
                          }
                          onUpgrade={() => setUpgradeTarget(s)}
                          canCancel={canCancel(s)}
                          canReactivate={canReactivate(s)}
                          canUpgrade={canUpgrade(s)}
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
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

      <ConfirmDialog
        open={Boolean(confirmAction)}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title={
          confirmAction?.action === "cancel"
            ? "Cancel subscription"
            : "Reactivate subscription"
        }
        description={
          confirmAction?.action === "cancel"
            ? `Cancel [${confirmAction.subscription.userEmail || "User"}] will keep Premium until the current period ends. Auto-renewal will be disabled.`
            : `Re-enable auto-renewal for ${confirmAction?.subscription.userEmail || "this user"} before their plan expires.`
        }
        confirmLabel={
          confirmAction?.action === "cancel"
            ? "Cancel subscription"
            : "Reactivate"
        }
        destructive={confirmAction?.action === "cancel"}
        loading={actionLoading}
        onConfirm={runSubscriptionAction}
      />

      <SubscriptionUpgradeDialog
        subscription={upgradeTarget}
        open={Boolean(upgradeTarget)}
        onOpenChange={(open) => {
          if (!open) setUpgradeTarget(null);
        }}
        onSuccess={refreshAll}
      />
    </div>
  );
}

function SubscriptionActionsMenu({
  subscription,
  onCancel,
  onReactivate,
  onUpgrade,
  canCancel,
  canReactivate,
  canUpgrade,
}: {
  subscription: SubscriptionRecord;
  onCancel: () => void;
  onReactivate: () => void;
  onUpgrade: () => void;
  canCancel: boolean;
  canReactivate: boolean;
  canUpgrade: boolean;
}) {
  const hasActions = canCancel || canReactivate || canUpgrade;
  if (!hasActions) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent outline-none">
        <MoreHorizontal className="size-4" />
        <span className="sr-only">Open subscription actions</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canUpgrade ? (
          <DropdownMenuItem onClick={onUpgrade}>Upgrade plan</DropdownMenuItem>
        ) : null}
        {canReactivate ? (
          <DropdownMenuItem onClick={onReactivate}>
            Reactivate subscription
          </DropdownMenuItem>
        ) : null}
        {canCancel ? (
          <DropdownMenuItem className="text-destructive" onClick={onCancel}>
            Cancel subscription
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
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

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  );
}
