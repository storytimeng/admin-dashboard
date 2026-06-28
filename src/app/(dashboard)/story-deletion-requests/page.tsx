"use client";

import { useState } from "react";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminApi } from "@/lib/api/admin";
import type { StoryDeletionRequestItem, StoryDeletionRequestStatus } from "@/types/admin";
import { CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react";

const STATUS_LABELS: Record<StoryDeletionRequestStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:  { label: "Pending",  variant: "outline" },
  approved: { label: "Approved", variant: "default" },
  rejected: { label: "Rejected", variant: "destructive" },
};

export default function StoryDeletionRequestsPage() {
  const [statusFilter, setStatusFilter] = useState<StoryDeletionRequestStatus | "all">("all");
  const [rejectTarget, setRejectTarget] = useState<StoryDeletionRequestItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isActioning, setIsActioning] = useState<string | null>(null);

  const { data, isLoading, error, mutate } = useProtectedSWR(
    `story-deletion-requests-${statusFilter}`,
    () =>
      adminApi.getStoryDeletionRequests(
        statusFilter === "all" ? undefined : statusFilter,
      ),
  );

  const requests = data?.requests ?? [];

  async function handleApprove(req: StoryDeletionRequestItem) {
    setIsActioning(req.id);
    try {
      await adminApi.approveStoryDeletion(req.id);
      await mutate();
      toast.success(`"${req.story?.title ?? "Story"}" deleted successfully`);
    } catch {
      toast.error("Failed to approve deletion request");
    } finally {
      setIsActioning(null);
    }
  }

  async function handleRejectConfirm() {
    if (!rejectTarget) return;
    setIsActioning(rejectTarget.id);
    try {
      await adminApi.rejectStoryDeletion(rejectTarget.id, rejectReason || undefined);
      await mutate();
      toast.success("Deletion request rejected");
      setRejectTarget(null);
      setRejectReason("");
    } catch {
      toast.error("Failed to reject deletion request");
    } finally {
      setIsActioning(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Story Deletion Requests"
        description="Review and action requests from users to remove their published stories"
      />

      <div className="flex items-center gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StoryDeletionRequestStatus | "all")}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {data && (
          <span className="text-sm text-muted-foreground">
            {data.count} request{data.count !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Failed to load deletion requests. Please refresh.</span>
        </div>
      )}

      {!isLoading && !error && requests.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
          <CheckCircle className="h-10 w-10 opacity-30" />
          <p className="text-sm">No deletion requests found</p>
        </div>
      )}

      {requests.length > 0 && (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Story</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium max-w-[200px]">
                    <span className="line-clamp-2">{req.story?.title ?? req.storyId}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {req.user?.penName || req.user?.email || req.userId}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                    <span className="line-clamp-2">{req.reason || <em>No reason given</em>}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {new Date(req.requestedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_LABELS[req.status].variant}>
                      {STATUS_LABELS[req.status].label}
                    </Badge>
                    {req.rejectionReason && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        {req.rejectionReason}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {req.status === "pending" && (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isActioning === req.id}
                          onClick={() => handleApprove(req)}
                        >
                          <CheckCircle className="mr-1 h-3.5 w-3.5" />
                          Approve &amp; Delete
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isActioning === req.id}
                          onClick={() => { setRejectTarget(req); setRejectReason(""); }}
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </div>
                    )}
                    {req.status !== "pending" && (
                      <span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : "—"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Reject modal */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Deletion Request</DialogTitle>
            <DialogDescription>
              The user will keep their story. Optionally provide a reason.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleRejectConfirm}
              disabled={isActioning === rejectTarget?.id}
            >
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
