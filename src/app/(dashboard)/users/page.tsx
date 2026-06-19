"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { MoreHorizontal, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TablePagination } from "@/components/shared/table-pagination";
import {
  SerialNumberCell,
  SerialNumberHead,
} from "@/components/shared/serial-number-head";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin";
import type { AppUser } from "@/types/admin";
import { formatDistanceToNow } from "date-fns";

export default function UsersPage() {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR("admin-users", () =>
    adminApi.getUsers(),
  );
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState<{
    user: AppUser;
    action: "suspend" | "unsuspend" | "delete";
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const users = useMemo(() => {
    const list = data?.users ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.penName?.toLowerCase().includes(q) ||
        u.firstName?.toLowerCase().includes(q) ||
        u.lastName?.toLowerCase().includes(q),
    );
  }, [data?.users, search]);

  const {
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    paginatedItems: paginatedUsers,
    serialOffset,
    handlePageSizeChange,
  } = useClientPagination(users, { resetKeys: [search] });

  const runAction = async () => {
    if (!confirm) return;
    setActionLoading(true);
    try {
      const { user, action } = confirm;
      if (action === "suspend") await adminApi.suspendUser(user.id);
      if (action === "unsuspend") await adminApi.unsuspendUser(user.id);
      if (action === "delete") await adminApi.deleteUser(user.id);
      toast.success(`User ${action === "delete" ? "removed" : action + "ed"}`);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
      setConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage reader and author accounts with full activity, engagement, and milestone visibility."
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search email, pen name, or name…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SerialNumberHead />
                <TableHead>User</TableHead>
                <TableHead className="text-right hidden lg:table-cell">
                  Stories
                </TableHead>
                <TableHead className="text-right hidden xl:table-cell">
                  Episodes
                </TableHead>
                <TableHead className="text-right hidden xl:table-cell">
                  Chapters
                </TableHead>
                <TableHead className="text-right hidden md:table-cell">
                  Read
                </TableHead>
                <TableHead className="text-right hidden lg:table-cell">
                  Engagement
                </TableHead>
                <TableHead className="hidden sm:table-cell">Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">
                  Last active
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={11}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="text-center text-destructive py-8"
                  >
                    Failed to load users
                  </TableCell>
                </TableRow>
              ) : paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={11}
                    className="text-center text-muted-foreground py-8"
                  >
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user, index) => (
                  <TableRow key={user.id}>
                    <SerialNumberCell index={index} offset={serialOffset} />
                    <TableCell>
                      <Link
                        href={`/users/${user.id}`}
                        className="font-medium hover:text-primary hover:underline"
                      >
                        {user.penName ||
                          [user.firstName, user.lastName]
                            .filter(Boolean)
                            .join(" ") ||
                          "—"}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {user.email}
                      </p>
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden lg:table-cell">
                      {user.stats?.storiesWritten ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden xl:table-cell">
                      {user.stats?.episodesWritten ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden xl:table-cell">
                      {user.stats?.chaptersWritten ?? 0}
                    </TableCell>
                    <TableCell className="text-right tabular-nums hidden md:table-cell">
                      {user.stats?.storiesRead ?? 0}
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {user.stats?.likesReceived ?? 0} likes ·{" "}
                        {user.stats?.commentsReceived ?? 0} comments
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex flex-col gap-1">
                        {user.readerLevel ? (
                          <Badge
                            variant="secondary"
                            className="w-fit text-[10px]"
                          >
                            {user.readerLevel}
                          </Badge>
                        ) : null}
                        {user.writerLevel ? (
                          <Badge
                            variant="outline"
                            className="w-fit text-[10px]"
                          >
                            {user.writerLevel}
                          </Badge>
                        ) : null}
                        {!user.readerLevel && !user.writerLevel ? (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {user.isPremium ? (
                          <Badge className="w-fit text-[10px]">Premium</Badge>
                        ) : null}
                        {user.deletedAt ? (
                          <Badge variant="secondary">Deleted</Badge>
                        ) : user.isSuspended ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="w-fit text-green-700 border-green-200"
                          >
                            Active
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell whitespace-nowrap">
                      {user.lastActiveAt
                        ? formatDistanceToNow(new Date(user.lastActiveAt), {
                            addSuffix: true,
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-md hover:bg-accent outline-none">
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/users/${user.id}`)}
                          >
                            View profile
                          </DropdownMenuItem>
                          {user.isSuspended ? (
                            <DropdownMenuItem
                              onClick={() =>
                                setConfirm({ user, action: "unsuspend" })
                              }
                            >
                              Unsuspend
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() =>
                                setConfirm({ user, action: "suspend" })
                              }
                            >
                              Suspend
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() =>
                              setConfirm({ user, action: "delete" })
                            }
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <TablePagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          disabled={isLoading}
        />
      </div>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm?.action === "delete"
            ? "Delete user?"
            : confirm?.action === "suspend"
              ? "Suspend user?"
              : "Unsuspend user?"
        }
        description={`This will ${confirm?.action} ${confirm?.user.email}.`}
        confirmLabel={
          confirm?.action === "delete"
            ? "Delete"
            : confirm?.action === "suspend"
              ? "Suspend"
              : "Unsuspend"
        }
        destructive={
          confirm?.action === "delete" || confirm?.action === "suspend"
        }
        loading={actionLoading}
        onConfirm={runAction}
      />
    </div>
  );
}
