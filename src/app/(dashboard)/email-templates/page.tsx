"use client";

import { useMemo, useState } from "react";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { Eye, Loader2, Mail, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { TablePagination } from "@/components/shared/table-pagination";
import {
  SerialNumberCell,
  SerialNumberHead,
} from "@/components/shared/serial-number-head";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  useClientPagination,
} from "@/hooks/use-client-pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { adminApi } from "@/lib/api/admin";
import type { EmailTemplateSummary } from "@/types/admin";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_FILTERS = [
  { value: "all", label: "All templates" },
  { value: "ambassador", label: "Ambassadors" },
  { value: "subscription", label: "Subscriptions & Premium" },
  { value: "onboarding", label: "Onboarding" },
  { value: "engagement", label: "Engagement" },
  { value: "milestone", label: "Milestones" },
  { value: "security", label: "Security" },
] as const;

type CategoryFilter = (typeof CATEGORY_FILTERS)[number]["value"];

function matchesCategoryFilter(
  template: EmailTemplateSummary,
  filter: CategoryFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "subscription") {
    return template.slug.startsWith("subscription_");
  }
  return template.category === filter;
}

export default function EmailTemplatesPage() {
  const { data, isLoading, mutate } = useProtectedSWR("email-templates", () =>
    adminApi.getEmailTemplates(),
  );

  const templates = data ?? [];
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [syncing, setSyncing] = useState(false);

  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) =>
        matchesCategoryFilter(template, categoryFilter),
      ),
    [templates, categoryFilter],
  );

  const {
    page: templatesPage,
    setPage: setTemplatesPage,
    pageSize: templatesPageSize,
    total: templatesTotal,
    totalPages: templatesTotalPages,
    paginatedItems: paginatedTemplates,
    serialOffset: templatesSerialOffset,
    handlePageSizeChange: handleTemplatesPageSizeChange,
  } = useClientPagination(filteredTemplates);

  const [logsPage, setLogsPage] = useState(1);
  const [logsPageSize, setLogsPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);

  const { data: deliveryLogs, isLoading: logsLoading } = useProtectedSWR(
    ["email-delivery-logs", logsPage, logsPageSize],
    () =>
      adminApi.getEmailDeliveryLogs({ page: logsPage, limit: logsPageSize }),
  );

  const logsSerialOffset = (logsPage - 1) * logsPageSize;
  const logsTotalPages = Math.max(
    1,
    Math.ceil((deliveryLogs?.total ?? 0) / logsPageSize),
  );

  const [open, setOpen] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSubject, setPreviewSubject] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editing, setEditing] = useState<EmailTemplateSummary | null>(null);
  const [form, setForm] = useState({
    subject: "",
    bodyHtml: "",
    bodyText: "",
    isActive: true,
  });
  const [variableHints, setVariableHints] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const syncTemplates = async () => {
    setSyncing(true);
    try {
      const result = await adminApi.syncEmailTemplates();
      if (result.inserted > 0) {
        toast.success(
          `Added ${result.inserted} new template(s). ${result.totalInDatabase} total available.`,
        );
      } else {
        toast.success(
          `All ${result.totalDefaults} platform templates are already in the database.`,
        );
      }
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const openEdit = async (template: EmailTemplateSummary) => {
    setEditing(template);
    setOpen(true);
    setLoadingTemplate(true);
    try {
      const full = await adminApi.getEmailTemplate(template.slug);
      setForm({
        subject: full.subject,
        bodyHtml: full.bodyHtml,
        bodyText: full.bodyText || "",
        isActive: full.isActive ?? true,
      });
      setVariableHints(full.variableHints ?? template.variableHints ?? []);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to load template",
      );
      setOpen(false);
    } finally {
      setLoadingTemplate(false);
    }
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

  const preview = async () => {
    if (!editing) return;
    setPreviewLoading(true);
    try {
      const result = await adminApi.previewEmailTemplate(editing.slug);
      setPreviewSubject(result.subject);
      setPreviewHtml(result.html);
      setPreviewOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Email Templates"
        description="View and edit every automated email — onboarding, milestones, subscriptions, security, and more. Use {{VariableName}} placeholders in subject and body."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={syncTemplates}
            disabled={syncing || isLoading}
          >
            {syncing ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            Sync missing templates
          </Button>
        }
      />

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="logs">Delivery logs</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredTemplates.length} of {templates.length} template
              {templates.length === 1 ? "" : "s"} shown
            </p>
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                if (value) {
                  setCategoryFilter(value as CategoryFilter);
                  setTemplatesPage(1);
                }
              }}
            >
              <SelectTrigger className="w-full sm:w-[240px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SerialNumberHead />
                  <TableHead>Template</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>When sent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : paginatedTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      {templates.length === 0
                        ? "No templates found. Click “Sync missing templates” to load platform defaults."
                        : "No templates match this filter."}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTemplates.map((template, index) => (
                    <TableRow key={template.slug}>
                      <SerialNumberCell
                        index={index}
                        offset={templatesSerialOffset}
                      />
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="size-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium">
                              {template.name || template.slug}
                            </p>
                            <p className="text-xs text-muted-foreground font-mono">
                              {template.slug}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">
                        {template.slug.startsWith("subscription_")
                          ? "subscription"
                          : template.category || "—"}
                      </TableCell>
                      <TableCell className="max-w-[280px] text-sm text-muted-foreground">
                        {template.triggerDescription || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={template.isActive ? "default" : "secondary"}
                        >
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {template.updatedAt
                          ? formatDistanceToNow(new Date(template.updatedAt), {
                              addSuffix: true,
                            })
                          : "—"}
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

          <TablePagination
            page={templatesPage}
            totalPages={templatesTotalPages}
            total={templatesTotal}
            pageSize={templatesPageSize}
            onPageChange={setTemplatesPage}
            onPageSizeChange={handleTemplatesPageSizeChange}
            disabled={isLoading}
          />
        </TabsContent>

        <TabsContent value="logs" className="mt-4 space-y-4">
          <div className="rounded-xl border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SerialNumberHead />
                  <TableHead>Template</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : deliveryLogs?.data?.length ? (
                  deliveryLogs.data.map((log, index) => (
                    <TableRow key={log.id}>
                      <SerialNumberCell
                        index={index}
                        offset={logsSerialOffset}
                      />
                      <TableCell>{log.templateSlug || "—"}</TableCell>
                      <TableCell>{log.recipientEmail || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {log.status || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.createdAt
                          ? formatDistanceToNow(new Date(log.createdAt), {
                              addSuffix: true,
                            })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No delivery logs yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <TablePagination
            page={logsPage}
            totalPages={logsTotalPages}
            total={deliveryLogs?.total ?? 0}
            pageSize={logsPageSize}
            onPageChange={setLogsPage}
            onPageSizeChange={(size) => {
              setLogsPageSize(size);
              setLogsPage(1);
            }}
            disabled={logsLoading}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Edit template — {editing?.name || editing?.slug}
            </DialogTitle>
            {editing?.triggerDescription ? (
              <p className="text-sm text-muted-foreground">
                {editing.triggerDescription}
              </p>
            ) : null}
          </DialogHeader>
          {loadingTemplate ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {variableHints.length > 0 ? (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm font-medium">Available variables</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Insert these in subject or body as{" "}
                    <code className="font-mono">{`{{VariableName}}`}</code>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {variableHints.map((variable) => (
                      <Badge
                        key={variable}
                        variant="outline"
                        className="font-mono text-xs"
                      >
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
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
                <RichTextEditor
                  value={form.bodyHtml}
                  onChange={(bodyHtml) => setForm((f) => ({ ...f, bodyHtml }))}
                  minHeight="min-h-[280px]"
                  allowSourceView
                />
              </div>
              <div className="space-y-2">
                <Label>Plain text (optional fallback)</Label>
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
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, isActive: v }))
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={preview}
              disabled={previewLoading || loadingTemplate || !editing}
            >
              {previewLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Eye className="mr-2 size-4" />
              )}
              Preview
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving || loadingTemplate}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview — {previewSubject}</DialogTitle>
          </DialogHeader>
          <div
            className="admin-rich-text rounded-lg border bg-white p-4 text-black"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
