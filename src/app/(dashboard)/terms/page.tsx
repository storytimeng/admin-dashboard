"use client";

import { useState } from "react";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { adminApi } from "@/lib/api/admin";
import type { TermsFormType, TermsItem } from "@/types/admin";
import {
  isLegacyPolicyType,
  isSupportedPolicyType,
  POLICY_TYPE_LABELS,
} from "@/types/admin";

export default function TermsPage() {
  const { data, isLoading, error, mutate } = useProtectedSWR("terms", () =>
    adminApi.getTerms(),
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TermsItem | null>(null);
  const [form, setForm] = useState<{
    title: string;
    content: string;
    type: TermsFormType;
  }>({
    title: "",
    content: "",
    type: "terms",
  });
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
    setForm({ title: "", content: "", type: "terms" });
    setOpen(true);
  };

  const openEdit = (item: TermsItem) => {
    const itemType = item.type ?? "terms";
    setEditing(item);
    setForm({
      title: item.title,
      content: item.content,
      type: itemType,
    });
    if (isLegacyPolicyType(itemType)) {
      toast.warning(
        `"${POLICY_TYPE_LABELS[itemType]}" is no longer supported. Choose Terms of Service or Privacy Policy before saving.`,
      );
    }
    setOpen(true);
  };

  const save = async () => {
    const title = form.title.trim();
    const content = form.content.trim();

    if (title.length < 5) {
      toast.error("Title must be at least 5 characters");
      return;
    }
    if (content.length < 50) {
      toast.error("Content must be at least 50 characters");
      return;
    }
    if (!isSupportedPolicyType(form.type)) {
      toast.error(
        "Choose Terms of Service or Privacy Policy before saving. Legacy policy types cannot be saved.",
      );
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title,
        content,
        type: form.type,
      };
      if (editing) await adminApi.updateTerms(editing.id, payload);
      else await adminApi.createTerms(payload);
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
        title="Terms & Policy"
        description="Manage legal documents, privacy policy, and terms of service."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Add document
          </Button>
        }
      />

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Could not load terms and policies. Check your connection, permissions,
          and that the backend is running.
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SerialNumberHead />
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No documents yet
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <SerialNumberCell index={index} offset={serialOffset} />
                    <TableCell className="font-medium max-w-lg truncate">
                      {item.title}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {item.type
                          ? (POLICY_TYPE_LABELS[item.type] ?? item.type)
                          : "Terms of Service"}
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
                            await adminApi.deleteTerms(item.id);
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
            <DialogTitle>{editing ? "Edit" : "Create"} document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              {isLegacyPolicyType(form.type) ? (
                <p className="text-xs text-amber-600">
                  This document uses a legacy type. Select Terms of Service or
                  Privacy Policy to migrate it before saving.
                </p>
              ) : null}
              <Select
                value={form.type}
                onValueChange={(v) =>
                  v && setForm((f) => ({ ...f, type: v as TermsFormType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isLegacyPolicyType(form.type) ? (
                    <SelectItem value={form.type} disabled>
                      {POLICY_TYPE_LABELS[form.type]}
                    </SelectItem>
                  ) : null}
                  <SelectItem value="terms">Terms of Service</SelectItem>
                  <SelectItem value="privacy">Privacy Policy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor
                value={form.content}
                onChange={(content) => setForm((f) => ({ ...f, content }))}
                minHeight="min-h-[320px]"
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
