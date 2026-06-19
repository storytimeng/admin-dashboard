"use client";

import { useState } from "react";
import useSWR from "swr";
import { Mail, Pencil } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { adminApi } from "@/lib/api/admin";
import type { EmailTemplate } from "@/types/admin";

export default function EmailTemplatesPage() {
  const { data, isLoading, mutate } = useSWR("email-templates", () =>
    adminApi.getEmailTemplates(),
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState({
    subject: "",
    bodyHtml: "",
    bodyText: "",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const openEdit = (template: EmailTemplate) => {
    setEditing(template);
    setForm({
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText || "",
      isActive: template.isActive ?? true,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await adminApi.updateEmailTemplate(editing.slug, form);
      toast.success("Template updated");
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
        title="Email Templates"
        description="Edit transactional email subjects and HTML bodies sent by the platform."
      />

      <div className="rounded-xl border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Template</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4}>
                  <Skeleton className="h-8 w-full" />
                </TableCell>
              </TableRow>
            ) : (
              data?.map((template) => (
                <TableRow key={template.slug}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="size-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {template.name || template.slug}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {template.slug}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {template.subject}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={template.isActive ? "default" : "secondary"}
                    >
                      {template.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(template)}
                    >
                      <Pencil className="mr-1 size-3.5" />
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit template — {editing?.name || editing?.slug}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                value={form.subject}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>HTML body</Label>
              <Textarea
                rows={10}
                className="font-mono text-sm"
                value={form.bodyHtml}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bodyHtml: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Plain text (optional)</Label>
              <Textarea
                rows={4}
                className="font-mono text-sm"
                value={form.bodyText}
                onChange={(e) =>
                  setForm((f) => ({ ...f, bodyText: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-xs text-muted-foreground">
                  Inactive templates will not be sent
                </p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
