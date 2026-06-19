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
import type { FaqItem } from "@/types/admin";

function ContentCrudPage({
  title,
  description,
  fetchKey,
  fetchFn,
  createFn,
  updateFn,
  deleteFn,
  contentLabel,
}: {
  title: string;
  description: string;
  fetchKey: string;
  fetchFn: () => Promise<FaqItem[]>;
  createFn: (data: Partial<FaqItem>) => Promise<FaqItem>;
  updateFn: (id: string, data: Partial<FaqItem>) => Promise<FaqItem>;
  deleteFn: (id: string) => Promise<unknown>;
  contentLabel: string;
}) {
  const { data, isLoading, mutate } = useSWR(fetchKey, fetchFn);
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

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FaqItem | null>(null);
  const [form, setForm] = useState({ question: "", answer: "" });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm({ question: "", answer: "" });
    setOpen(true);
  };

  const openEdit = (item: FaqItem) => {
    setEditing(item);
    setForm({
      question: item.question,
      answer: item.answer,
    });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const payload: Pick<FaqItem, "question" | "answer"> = {
        question: form.question,
        answer: form.answer,
      };
      if (editing) await updateFn(editing.id, payload);
      else await createFn(payload);
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
        title={title}
        description={description}
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Add new
          </Button>
        }
      />
      <div className="space-y-4">
        <div className="rounded-xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <SerialNumberHead />
                <TableHead>Title / Question</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ) : paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No items yet
                  </TableCell>
                </TableRow>
              ) : (
                paginatedItems.map((item, index) => (
                  <TableRow key={item.id}>
                    <SerialNumberCell index={index} offset={serialOffset} />
                    <TableCell className="font-medium max-w-lg truncate">
                      {item.question || "—"}
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
                            await deleteFn(item.id);
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
            <DialogTitle>{editing ? "Edit" : "Create"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title / Question</Label>
              <Input
                value={form.question}
                onChange={(e) =>
                  setForm((f) => ({ ...f, question: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>{contentLabel}</Label>
              <RichTextEditor
                value={form.answer}
                onChange={(answer) => setForm((f) => ({ ...f, answer }))}
                minHeight="min-h-[220px]"
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

export default function FaqsPage() {
  return (
    <ContentCrudPage
      title="FAQs"
      description="Manage frequently asked questions shown in the app."
      fetchKey="faqs"
      fetchFn={() => adminApi.getFaqs()}
      createFn={(d) => adminApi.createFaq(d)}
      updateFn={(id, d) => adminApi.updateFaq(id, d)}
      deleteFn={(id) => adminApi.deleteFaq(id)}
      contentLabel="Answer"
    />
  );
}
