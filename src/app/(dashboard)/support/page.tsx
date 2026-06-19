"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export default function SupportPage() {
  const { data, isLoading, mutate } = useSWR("support", () =>
    adminApi.getSupport(),
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SupportItem | null>(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", content: "" });
    setOpen(true);
  };

  const openEdit = (item: SupportItem) => {
    setEditing(item);
    setForm({ title: item.title, content: item.content });
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editing) await adminApi.updateSupport(editing.id, form);
      else await adminApi.createSupport(form);
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
        description="Manage help articles and support content in the app."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Add article
          </Button>
        }
      />
      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead className="w-40" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={2}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : (
              data?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium max-w-lg truncate">
                    {item.title}
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit" : "Create"} support article
            </DialogTitle>
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
              <Label>Content</Label>
              <Textarea
                rows={8}
                value={form.content}
                onChange={(e) =>
                  setForm((f) => ({ ...f, content: e.target.value }))
                }
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
