"use client";

import { useMemo, useState } from "react";
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
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { adminApi } from "@/lib/api/admin";
import { isHtmlContent, stripHtml } from "@/lib/notification-html";
import type { FaqItem } from "@/types/admin";

type FaqForm = Pick<FaqItem, "question" | "answer" | "order" | "isActive">;

const EMPTY_FORM: FaqForm = {
  question: "",
  answer: "",
  order: 0,
  isActive: true,
};

function getAnswerPreview(answer: string): string {
  const text = isHtmlContent(answer) ? stripHtml(answer) : answer;
  return text.length > 120 ? `${text.slice(0, 120)}…` : text;
}

export default function FaqsPage() {
  const { data, isLoading, error, mutate } = useProtectedSWR("faqs", () =>
    adminApi.getFaqs(),
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [form, setForm] = useState<FaqForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const items = useMemo(() => {
    const list = data ?? [];
    return [...list].sort(
      (a, b) =>
        (a.order ?? 0) - (b.order ?? 0) || a.question.localeCompare(b.question),
    );
  }, [data]);

  const {
    page,
    setPage,
    pageSize,
    total,
    totalPages,
    paginatedItems,
    serialOffset,
    handlePageSizeChange,
  } = useClientPagination(items);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  };

  const openEdit = (item: FaqItem) => {
    setEditing(item);
    setForm({
      question: item.question,
      answer: item.answer,
      order: item.order ?? 0,
      isActive: item.isActive ?? true,
    });
    setOpen(true);
  };

  const save = async () => {
    const question = form.question.trim();
    const answer = form.answer.trim();
    const answerText = isHtmlContent(answer) ? stripHtml(answer) : answer;

    if (question.length < 10) {
      toast.error("Question must be at least 10 characters");
      return;
    }
    if (answerText.length < 20) {
      toast.error("Answer must be at least 20 characters");
      return;
    }
    if ((form.order ?? 0) < 0) {
      toast.error("Display order cannot be negative");
      return;
    }

    setSaving(true);
    try {
      const payload: FaqForm = {
        question,
        answer,
        order: form.order ?? 0,
        isActive: form.isActive ?? true,
      };
      if (editing) await adminApi.updateFaq(editing.id, payload);
      else await adminApi.createFaq(payload);
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
        title="FAQs"
        description="Manage frequently asked questions shown in the app."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Add FAQ
          </Button>
        }
      />

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Could not load FAQs. Check your connection, permissions, and that the
          backend is running.
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SerialNumberHead />
                <TableHead className="w-16">Order</TableHead>
                <TableHead>Question</TableHead>
                <TableHead className="hidden lg:table-cell">
                  Answer preview
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No FAQs yet. Add your first question to get started.
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <SerialNumberCell index={index} offset={serialOffset} />
                    <TableCell className="text-muted-foreground tabular-nums">
                      {item.order ?? 0}
                    </TableCell>
                    <TableCell className="font-medium max-w-xs truncate">
                      {item.question}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell max-w-md truncate text-muted-foreground text-sm">
                      {getAnswerPreview(item.answer) || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.isActive !== false ? "default" : "secondary"
                        }
                      >
                        {item.isActive !== false ? "Active" : "Inactive"}
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
                            await adminApi.deleteFaq(item.id);
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Create"} FAQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="faq-question">Question *</Label>
              <Input
                id="faq-question"
                placeholder="How do I reset my password?"
                value={form.question}
                onChange={(e) =>
                  setForm((f) => ({ ...f, question: e.target.value }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Minimum 10 characters
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-order">Display order</Label>
              <Input
                id="faq-order"
                type="number"
                min={0}
                value={form.order ?? 0}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    order: Number.parseInt(e.target.value, 10) || 0,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first in the app
              </p>
            </div>
            <div className="space-y-2">
              <Label>Answer *</Label>
              <RichTextEditor
                value={form.answer}
                onChange={(answer) => setForm((f) => ({ ...f, answer }))}
                minHeight="min-h-[220px]"
              />
              <p className="text-xs text-muted-foreground">
                Minimum 20 characters of text
              </p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Only active FAQs are shown to users in the app
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
