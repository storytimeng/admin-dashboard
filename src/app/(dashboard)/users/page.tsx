"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { MoreHorizontal, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
        u.firstName?.toLowerCase().includes(q),
    );
  }, [data?.users, search]);

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
        description="Manage reader and author accounts, suspensions, and access."
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search email or pen name…"
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pen name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : error ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-destructive py-8"
                >
                  Failed to load users
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center text-muted-foreground py-8"
                >
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.penName || "—"}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.deletedAt ? (
                      <Badge variant="secondary">Deleted</Badge>
                    ) : user.isSuspended ? (
                      <Badge variant="destructive">Suspended</Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="text-green-700 border-green-200"
                      >
                        Active
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
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
                          onClick={() => setConfirm({ user, action: "delete" })}
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
