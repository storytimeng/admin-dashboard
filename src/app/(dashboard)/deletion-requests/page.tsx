"use client";

import { useState } from "react";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin";
import type { AppUser } from "@/types/admin";
import { format } from "date-fns";

type Action = "approve" | "revoke";

export default function DeletionRequestsPage() {
  const { data, error, isLoading, mutate } = useProtectedSWR(
    "admin-deletion-requests",
    () => adminApi.getDeletionRequests(),
  );
  const [confirm, setConfirm] = useState<{
    user: AppUser;
    action: Action;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const users = data?.users ?? [];

  const handleAction = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      if (confirm.action === "approve") {
        await adminApi.approveDeletion(confirm.user.id);
        toast.success(`Account for ${confirm.user.email} has been deleted.`);
      } else {
        await adminApi.revokeDeletion(confirm.user.id);
        toast.success(
          `Deletion request for ${confirm.user.email} revoked. User notified by email.`,
        );
      }
      mutate();
    } catch {
      toast.error("Action failed. Please try again.");
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deletion Requests"
        description="Review pending account deletion requests from users."
      />

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-destructive text-sm">
          Failed to load deletion requests.
        </p>
      )}

      {!isLoading && !error && (
        <>
          <p className="text-sm text-muted-foreground">
            {users.length === 0
              ? "No pending deletion requests."
              : `${users.length} pending request${users.length !== 1 ? "s" : ""}`}
          </p>
          {users.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Scheduled Deletion</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        {user.firstName} {user.lastName}
                        {user.penName && (
                          <span className="block text-xs text-muted-foreground">
                            @{user.penName}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.deletionRequestedAt
                          ? format(new Date(user.deletionRequestedAt), "dd MMM yyyy")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {user.deletionScheduledAt ? (
                          <span className="font-medium text-destructive">
                            {format(new Date(user.deletionScheduledAt), "dd MMM yyyy")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Pending</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setConfirm({ user, action: "approve" })}
                          >
                            Approve Deletion
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirm({ user, action: "revoke" })}
                          >
                            Revoke
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => { if (!open) setConfirm(null); }}
        title={
          confirm?.action === "approve"
            ? "Approve Account Deletion"
            : "Revoke Deletion Request"
        }
        description={
          confirm?.action === "approve"
            ? `This will permanently delete the account for ${confirm?.user.email}. This cannot be undone.`
            : `This will cancel the deletion request for ${confirm?.user.email}. They will be notified by email that their account is safe.`
        }
        confirmLabel={
          confirm?.action === "approve" ? "Delete Account" : "Revoke Request"
        }
        destructive={confirm?.action === "approve"}
        loading={actionLoading}
        onConfirm={handleAction}
      />
    </div>
  );
}
