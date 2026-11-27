"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  Mail,
  Plus,
  Send,
  Settings2,
  ShieldAlert,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { adminApi } from "@/lib/api/admin";
import type { MailProviderItem, MailProviderType } from "@/types/admin";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

interface ProviderFormState {
  name: string;
  providerType: MailProviderType;
  fromEmail: string;
  fromName: string;
  smtpHost: string;
  smtpPort: string;
  smtpSecure: boolean;
  smtpUser: string;
  smtpPass: string;
  apiKey: string;
  isEnabled: boolean;
  isDefault: boolean;
  isFallback: boolean;
}

const emptyForm: ProviderFormState = {
  name: "",
  providerType: "google_smtp",
  fromEmail: "",
  fromName: "Storytime",
  smtpHost: "smtp.gmail.com",
  smtpPort: "465",
  smtpSecure: true,
  smtpUser: "",
  smtpPass: "",
  apiKey: "",
  isEnabled: true,
  isDefault: false,
  isFallback: false,
};

export default function EmailProvidersPage() {
  const { data, isLoading, mutate } = useProtectedSWR(
    "admin-mail-providers",
    () => adminApi.getMailProviders(),
  );

  const presets = data?.presets;
  const providers = data?.providers ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MailProviderItem | null>(null);
  const [form, setForm] = useState<ProviderFormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [testTarget, setTestTarget] = useState<MailProviderItem | null>(null);
  const [testEmail, setTestEmail] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<MailProviderItem | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  const openCreate = () => {
    setEditing(null);
    const preset = presets?.google_smtp;
    setForm({
      ...emptyForm,
      name: preset?.label ?? "Google SMTP",
      smtpHost: preset?.defaultHost ?? "smtp.gmail.com",
      smtpPort: String(preset?.defaultPort ?? 465),
      smtpSecure: preset?.defaultSecure ?? true,
    });
    setDialogOpen(true);
  };

  const openEdit = (p: MailProviderItem) => {
    setEditing(p);
    setForm({
      name: p.name,
      providerType: p.providerType,
      fromEmail: p.fromEmail ?? "",
      fromName: p.fromName ?? "",
      smtpHost: p.smtpHost ?? "",
      smtpPort: p.smtpPort ? String(p.smtpPort) : "",
      smtpSecure: p.smtpSecure,
      smtpUser: p.smtpUser ?? "",
      smtpPass: "",
      apiKey: "",
      isEnabled: p.isEnabled,
      isDefault: p.isDefault,
      isFallback: p.isFallback,
    });
    setDialogOpen(true);
  };

  const handleTypeChange = (type: MailProviderType) => {
    const preset = presets?.[type];
    setForm((prev) => ({
      ...prev,
      providerType: type,
      name: editing ? prev.name : preset?.label ?? prev.name,
      smtpHost: preset?.defaultHost ?? prev.smtpHost,
      smtpPort: preset?.defaultPort ? String(preset.defaultPort) : prev.smtpPort,
      smtpSecure: preset?.defaultSecure ?? prev.smtpSecure,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Provider name is required");
      return;
    }
    setSaving(true);
    try {
      const portNum = form.smtpPort.trim()
        ? Number.parseInt(form.smtpPort, 10)
        : undefined;
      if (editing) {
        await adminApi.updateMailProvider(editing.id, {
          name: form.name.trim(),
          fromEmail: form.fromEmail.trim(),
          fromName: form.fromName.trim(),
          smtpHost: form.smtpHost.trim() || undefined,
          smtpPort: Number.isFinite(portNum) ? portNum : undefined,
          smtpSecure: form.smtpSecure,
          smtpUser: form.smtpUser.trim() || undefined,
          ...(form.smtpPass.trim() ? { smtpPassword: form.smtpPass.trim() } : {}),
          ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
          isEnabled: form.isEnabled,
          isDefault: form.isDefault,
          isFallback: form.isFallback,
        });
        toast.success("Mail provider updated");
      } else {
        await adminApi.createMailProvider({
          name: form.name.trim(),
          providerType: form.providerType,
          fromEmail: form.fromEmail.trim() || undefined,
          fromName: form.fromName.trim() || undefined,
          smtpHost: form.smtpHost.trim() || undefined,
          smtpPort: Number.isFinite(portNum) ? portNum : undefined,
          smtpSecure: form.smtpSecure,
          smtpUser: form.smtpUser.trim() || undefined,
          smtpPassword: form.smtpPass.trim() || undefined,
          apiKey: form.apiKey.trim() || undefined,
          isEnabled: form.isEnabled,
          isDefault: form.isDefault,
          isFallback: form.isFallback,
        });
        toast.success("Mail provider created");
      }
      setDialogOpen(false);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const quickToggle = async (
    p: MailProviderItem,
    patch: Partial<{ isEnabled: boolean; isDefault: boolean; isFallback: boolean }>,
  ) => {
    try {
      await adminApi.updateMailProvider(p.id, patch);
      toast.success("Provider updated");
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTarget || !testEmail.trim()) return;
    setTestingId(testTarget.id);
    try {
      const res = await adminApi.testMailProvider(
        testTarget.id,
        testEmail.trim(),
      );
      if (res.ok) {
        toast.success(`Test email sent via ${testTarget.name}`);
      } else {
        toast.error(res.message || "Test failed");
      }
      setTestTarget(null);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test failed");
    } finally {
      setTestingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await adminApi.deleteMailProvider(deleteTarget.id);
      toast.success("Mail provider deleted");
      setDeleteTarget(null);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const currentPreset = presets?.[form.providerType];
  const isApiMode = currentPreset?.mode === "api";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mail Providers Hub"
        description="Configure email delivery providers, set primary/fallback routing with automatic failover, and run live delivery tests."
        actions={
          <Button onClick={openCreate}>
            <Plus className="mr-2 size-4" />
            Add Provider
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Mail className="mx-auto size-10 text-muted-foreground opacity-60" />
            <p className="text-sm text-muted-foreground">
              No mail providers configured yet. Add one to enable transactional
              email delivery and failover.
            </p>
            <Button onClick={openCreate}>Add first provider</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((p) => (
            <Card key={p.id} className={!p.isEnabled ? "opacity-75" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex flex-wrap items-center gap-2">
                      {p.name}
                      {p.isDefault ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[11px]">
                          <Star className="mr-1 size-3" />
                          Default
                        </Badge>
                      ) : null}
                      {p.isFallback ? (
                        <Badge variant="secondary" className="text-[11px]">
                          Fallback
                        </Badge>
                      ) : null}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {presets?.[p.providerType]?.label ?? p.providerType} ·{" "}
                      {p.fromEmail || "No sender email"}
                    </CardDescription>
                  </div>
                  <Switch
                    checked={p.isEnabled}
                    onCheckedChange={(checked) =>
                      quickToggle(p, { isEnabled: checked })
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs text-muted-foreground space-y-1">
                  {p.smtpHost ? (
                    <p>
                      SMTP: <code className="font-mono">{p.smtpHost}</code>:
                      {p.smtpPort} ({p.smtpSecure ? "TLS" : "STARTTLS/Plain"})
                    </p>
                  ) : null}
                  <p>
                    Credentials:{" "}
                    {p.hasApiKey
                      ? "API Key saved"
                      : p.hasPassword
                        ? "SMTP Password saved"
                        : "Not configured"}
                  </p>
                  {p.lastTestStatus ? (
                    <div className="flex items-center gap-1.5 pt-1">
                      {p.lastTestStatus === "success" ? (
                        <Badge
                          variant="outline"
                          className="text-emerald-700 border-emerald-200 text-[11px]"
                        >
                          <CheckCircle2 className="mr-1 size-3" />
                          Last test passed
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[11px]">
                          <ShieldAlert className="mr-1 size-3" />
                          Last test failed
                        </Badge>
                      )}
                      {p.lastTestError ? (
                        <span className="truncate text-destructive max-w-[220px]">
                          {p.lastTestError}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(p)}
                  >
                    <Settings2 className="mr-1.5 size-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setTestTarget(p);
                      setTestEmail("");
                    }}
                    disabled={!p.isEnabled}
                  >
                    <Send className="mr-1.5 size-3.5" />
                    Test
                  </Button>
                  {!p.isDefault ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        quickToggle(p, { isDefault: true, isEnabled: true })
                      }
                    >
                      Set Default
                    </Button>
                  ) : null}
                  {!p.isFallback ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        quickToggle(p, { isFallback: true, isEnabled: true })
                      }
                    >
                      Set Fallback
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive ml-auto"
                    onClick={() => setDeleteTarget(p)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Mail Provider" : "Add Mail Provider"}
            </DialogTitle>
            <DialogDescription>
              {currentPreset?.hint ||
                "Configure SMTP or API credentials for email delivery."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {!editing ? (
              <div className="space-y-2">
                <Label>Provider Type</Label>
                <Select
                  value={form.providerType}
                  onValueChange={(v) =>
                    handleTypeChange(v as MailProviderType)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {presets
                      ? Object.entries(presets).map(([key, p]) => (
                          <SelectItem key={key} value={key}>
                            {p.label}
                          </SelectItem>
                        ))
                      : null}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="mp-name">Display Name</Label>
                <Input
                  id="mp-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mp-from-name">From Name</Label>
                <Input
                  id="mp-from-name"
                  value={form.fromName}
                  onChange={(e) =>
                    setForm({ ...form, fromName: e.target.value })
                  }
                  placeholder="Storytime"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mp-from-email">From Email</Label>
              <Input
                id="mp-from-email"
                type="email"
                value={form.fromEmail}
                onChange={(e) =>
                  setForm({ ...form, fromEmail: e.target.value })
                }
                placeholder="noreply@storytime.ng"
              />
            </div>

            {isApiMode ? (
              <div className="space-y-1.5">
                <Label htmlFor="mp-apikey">
                  API Key {editing?.hasApiKey ? "(leave blank to keep)" : ""}
                </Label>
                <Input
                  id="mp-apikey"
                  type="password"
                  value={form.apiKey}
                  onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                  placeholder="Enter provider API key"
                />
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="mp-host">SMTP Host</Label>
                    <Input
                      id="mp-host"
                      value={form.smtpHost}
                      onChange={(e) =>
                        setForm({ ...form, smtpHost: e.target.value })
                      }
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mp-port">Port</Label>
                    <Input
                      id="mp-port"
                      type="number"
                      value={form.smtpPort}
                      onChange={(e) =>
                        setForm({ ...form, smtpPort: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="mp-user">SMTP Username</Label>
                    <Input
                      id="mp-user"
                      value={form.smtpUser}
                      onChange={(e) =>
                        setForm({ ...form, smtpUser: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mp-pass">
                      SMTP Password{" "}
                      {editing?.hasPassword ? "(blank = keep)" : ""}
                    </Label>
                    <Input
                      id="mp-pass"
                      type="password"
                      value={form.smtpPass}
                      onChange={(e) =>
                        setForm({ ...form, smtpPass: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-2.5">
                  <Label htmlFor="mp-secure" className="text-xs">
                    Use SSL/TLS (port 465)
                  </Label>
                  <Switch
                    id="mp-secure"
                    checked={form.smtpSecure}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, smtpSecure: checked })
                    }
                  />
                </div>
              </>
            )}

            <div className="grid gap-2 sm:grid-cols-3 pt-1">
              <div className="flex items-center justify-between rounded-lg border p-2.5">
                <Label className="text-xs">Enabled</Label>
                <Switch
                  checked={form.isEnabled}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, isEnabled: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-2.5">
                <Label className="text-xs">Default</Label>
                <Switch
                  checked={form.isDefault}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, isDefault: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-2.5">
                <Label className="text-xs">Fallback</Label>
                <Switch
                  checked={form.isFallback}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, isFallback: checked })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Save Provider
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!testTarget}
        onOpenChange={(open) => !open && setTestTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Verify delivery using {testTarget?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleTest} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="test-email">Recipient Email</Label>
              <Input
                id="test-email"
                type="email"
                placeholder="you@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTestTarget(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!!testingId}>
                {testingId ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Send Test
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete mail provider?"
        description={`Remove "${deleteTarget?.name}" from configured providers?`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
