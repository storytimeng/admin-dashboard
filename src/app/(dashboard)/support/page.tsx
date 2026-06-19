"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import {
  SerialNumberCell,
  SerialNumberHead,
} from "@/components/shared/serial-number-head";
import { useClientPagination } from "@/hooks/use-client-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { adminApi } from "@/lib/api/admin";
import type { SupportItem } from "@/types/admin";

type SupportForm = Pick<
  SupportItem,
  | "email"
  | "phone"
  | "facebook"
  | "instagram"
  | "twitter"
  | "linkedin"
  | "youtube"
  | "isActive"
>;

const EMPTY_FORM: SupportForm = {
  email: "",
  phone: "",
  facebook: "",
  instagram: "",
  twitter: "",
  linkedin: "",
  youtube: "",
  isActive: true,
};

function toPayload(form: SupportForm): SupportForm {
  return {
    email: form.email.trim(),
    phone: form.phone?.trim() || undefined,
    facebook: form.facebook?.trim() || undefined,
    instagram: form.instagram?.trim() || undefined,
    twitter: form.twitter?.trim() || undefined,
    linkedin: form.linkedin?.trim() || undefined,
    youtube: form.youtube?.trim() || undefined,
    isActive: form.isActive,
  };
}

export default function SupportPage() {
  const { data, isLoading, mutate } = useSWR("support", () =>
    adminApi.getSupport(),
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupportItem | null>(null);
  const [form, setForm] = useState<SupportForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const items = data ?? [];

  const {
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    paginatedItems: paginatedItems,
    serialOffset,
    handlePageSizeChange,
  } = useClientPagination(items);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (item: SupportItem) => {
    setEditing(item);
    setForm({
      email: item.email,
      phone: item.phone ?? "",
      facebook: item.facebook ?? "",
      instagram: item.instagram ?? "",
      twitter: item.twitter ?? "",
      linkedin: item.linkedin ?? "",
      youtube: item.youtube ?? "",
      isActive: item.isActive ?? true,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.email.trim()) {
      toast.error("Email is required");
      return;
    }

    setSaving(true);
    try {
      const payload = toPayload(form);
      if (editing) await adminApi.updateSupport(editing.id, payload);
      else await adminApi.createSupport(payload);
      toast.success(editing ? "Updated" : "Created");
      setOpen(false);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support"
        description="Manage support contact details and social links shown in the app."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Add contact
          </Button>
        }
      />

      <div className="space-y-4">
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SerialNumberHead />
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No support records yet
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <SerialNumberCell index={index} offset={serialOffset} />
                    <TableCell className="font-medium">{item.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.phone || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.isActive ? "default" : "secondary"}>
                        {item.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={async () => {
                          try {
                            await adminApi.deleteSupport(item.id);
                            toast.success("Deleted");
                            await mutate();
                          } catch (err) {
                            toast.error(
                              err instanceof Error ? err.message : "Failed",
                            );
                          }
                        }}
                      >
                        Delete
                      </Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit" : "Create"} support contact
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="support-email">Email *</Label>
              <Input
                id="support-email"
                type="email"
                placeholder="support@storytime.ng"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-phone">Phone</Label>
              <Input
                id="support-phone"
                placeholder="+234…"
                value={form.phone ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["facebook", "Facebook URL"],
                  ["instagram", "Instagram URL"],
                  ["twitter", "Twitter / X URL"],
                  ["linkedin", "LinkedIn URL"],
                  ["youtube", "YouTube URL"],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-2">
                  <Label htmlFor={`support-${key}`}>{label}</Label>
                  <Input
                    id={`support-${key}`}
                    type="url"
                    placeholder="https://…"
                    value={form[key] ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Only active records are shown to users
                </p>
              </div>
              <Switch
                checked={form.isActive ?? true}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
