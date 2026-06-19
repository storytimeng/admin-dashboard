"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TablePagination } from "@/components/shared/table-pagination";
import {
  SerialNumberCell,
  SerialNumberHead,
} from "@/components/shared/serial-number-head";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin";
import { moderationActionMessage } from "@/lib/moderation-action-message";
import type { AdminRole, AdminUser } from "@/types/admin";
import { useAdminAuthStore } from "@/stores/useAdminAuthStore";

const ROLES: AdminRole[] = [
  "super_admin",
  "admin",
  "marketing",
  "developer",
  "designer",
  "finance",
];

export default function AdminsPage() {
  const currentAdmin = useAdminAuthStore((s) => s.admin);
  const { data, isLoading, mutate } = useSWR("admin-list", () =>
    adminApi.getAdmins(),
  );
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<AdminRole>("admin");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "admin" as AdminRole,
  });
  const [submitting, setSubmitting] = useState(false);
  const [confirm, setConfirm] = useState<{
    admin: AdminUser;
    action: "suspend" | "unsuspend" | "delete";
  } | null>(null);

  const isSuperAdmin = currentAdmin?.role === "super_admin";
  const admins = data ?? [];

  const {
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    paginatedItems: paginatedAdmins,
    serialOffset,
    handlePageSizeChange,
  } = useClientPagination(admins);

  const handleInvite = async () => {
    setSubmitting(true);
    try {
      await adminApi.createAdmin(form);
      toast.success("Admin invited successfully");
      setInviteOpen(false);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        role: "admin",
      });
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create admin",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async () => {
    if (!confirm) return;
    try {
      const { admin, action } = confirm;
      if (action === "suspend") await adminApi.suspendAdmin(admin.id);
      if (action === "unsuspend") await adminApi.unsuspendAdmin(admin.id);
      if (action === "delete") await adminApi.deleteAdmin(admin.id);
      toast.success(
        moderationActionMessage("Admin", action, {
          deletePastTense: "deleted",
        }),
      );
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setConfirm(null);
    }
  };

  const openEditRole = (admin: AdminUser) => {
    setEditingAdmin(admin);
    setEditRole(admin.role);
    setEditOpen(true);
  };

  const saveRole = async () => {
    if (!editingAdmin) return;
    try {
      await adminApi.updateAdmin(editingAdmin.id, { role: editRole });
      toast.success("Role updated");
      setEditOpen(false);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admins & Roles"
        description="Invite team members and manage admin access levels."
        actions={
          isSuperAdmin ? (
            <Button onClick={() => setInviteOpen(true)}>
              <Plus className="mr-2 size-4" />
              Invite admin
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-4">
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SerialNumberHead />
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                {isSuperAdmin ? <TableHead /> : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 6 : 5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : paginatedAdmins.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isSuperAdmin ? 6 : 5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No admins found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedAdmins.map((admin, index) => (
                  <TableRow key={admin.id}>
                    <SerialNumberCell index={index} offset={serialOffset} />
                    <TableCell className="font-medium">
                      {admin.firstName} {admin.lastName}
                    </TableCell>
                    <TableCell>{admin.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {admin.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {admin.isSuspended ? (
                        <Badge variant="destructive">Suspended</Badge>
                      ) : (
                        <Badge variant="outline">Active</Badge>
                      )}
                    </TableCell>
                    {isSuperAdmin ? (
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditRole(admin)}
                        >
                          Edit role
                        </Button>
                        {admin.isSuspended ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setConfirm({ admin, action: "unsuspend" })
                            }
                          >
                            Unsuspend
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setConfirm({ admin, action: "suspend" })
                            }
                          >
                            Suspend
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            setConfirm({ admin, action: "delete" })
                          }
                        >
                          Remove
                        </Button>
                      </TableCell>
                    ) : null}
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

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite admin</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First name</Label>
                <Input
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, firstName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Last name</Label>
                <Input
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lastName: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Temporary password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((f) => ({ ...f, password: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  v && setForm((f) => ({ ...f, role: v as AdminRole }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={submitting}>
              {submitting ? "Creating…" : "Create admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change admin role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {editingAdmin?.firstName} {editingAdmin?.lastName} (
              {editingAdmin?.email})
            </p>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={editRole}
                onValueChange={(v) => v && setEditRole(v as AdminRole)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveRole}>Save role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Confirm admin action"
        description={`Apply ${confirm?.action} to ${confirm?.admin.email}?`}
        destructive={confirm?.action === "delete"}
        onConfirm={runAction}
      />
    </div>
  );
}
