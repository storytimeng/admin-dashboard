"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  BellRing,
  CheckCircle2,
  Loader2,
  Search,
  Send,
  ShieldAlert,
  X,
} from "lucide-react";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  NotificationComposer,
  type NotificationComposerValues,
} from "@/components/notifications/notification-composer";
import { adminApi } from "@/lib/api/admin";
import { stripHtml } from "@/lib/notification-html";
import type { AdminUserSearchItem } from "@/types/admin";

const emptyCustom: NotificationComposerValues = {
  title: "",
  message: "",
  sendEmail: false,
};

const emptyBulk: NotificationComposerValues = {
  title: "",
  message: "",
  sendEmail: true,
};

export default function NotificationsPage() {
  const [custom, setCustom] = useState<NotificationComposerValues>(emptyCustom);
  const [bulk, setBulk] = useState<NotificationComposerValues>(emptyBulk);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [loadingBulk, setLoadingBulk] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AdminUserSearchItem[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<AdminUserSearchItem[]>([]);

  const { data: pushData, isLoading: loadingPush, mutate: mutatePush } =
    useProtectedSWR("admin-push-status", () => adminApi.getPushStatus());
  const [testPushUserId, setTestPushUserId] = useState("");
  const [sendingTestPush, setSendingTestPush] = useState(false);

  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await adminApi.searchUsers(q.trim(), 15);
      setSearchResults(res.users);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addSelectedUser = (user: AdminUserSearchItem) => {
    if (!selectedUsers.some((u) => u.id === user.id)) {
      setSelectedUsers((prev) => [...prev, user]);
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeSelectedUser = (id: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const sendCustom = async () => {
    if (!custom.title.trim() || !stripHtml(custom.message)) {
      toast.error("Title and message are required");
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error("Select at least one recipient");
      return;
    }

    setLoadingCustom(true);
    let sent = 0;
    let failed = 0;
    try {
      for (const user of selectedUsers) {
        try {
          await adminApi.sendNotification({
            title: custom.title.trim(),
            message: custom.message,
            type: "admin_message",
            userId: user.id,
            sendEmail: custom.sendEmail,
          });
          sent++;
        } catch {
          failed++;
        }
      }
      if (failed === 0) {
        toast.success(`Notification sent to ${sent} user(s)`);
        setCustom(emptyCustom);
        setSelectedUsers([]);
      } else {
        toast.warning(`Sent to ${sent}, failed for ${failed}`);
      }
    } finally {
      setLoadingCustom(false);
    }
  };

  const sendBulk = async () => {
    if (!bulk.title.trim() || !stripHtml(bulk.message)) {
      toast.error("Title and message are required");
      return;
    }

    setLoadingBulk(true);
    try {
      const result = await adminApi.sendBulkNotification({
        title: bulk.title.trim(),
        message: bulk.message,
        type: "admin_message",
        sendEmail: bulk.sendEmail,
      });
      toast.success(
        `Sent to ${result.created} users (${result.failed} failed)`,
      );
      setBulk(emptyBulk);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk send failed");
    } finally {
      setLoadingBulk(false);
    }
  };

  const handleTestPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPushUserId.trim()) return;
    setSendingTestPush(true);
    try {
      const res = await adminApi.sendTestPush(testPushUserId.trim());
      toast.success(
        `Push test: ${res.sent} sent, ${res.failed} failed (${res.message})`,
      );
      await mutatePush();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Test push failed");
    } finally {
      setSendingTestPush(false);
    }
  };

  const push = pushData?.diagnostics ?? pushData?.push;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Compose rich announcements, target specific users by search, and monitor web push delivery."
      />

      <Tabs defaultValue="bulk">
        <TabsList>
          <TabsTrigger value="bulk">Broadcast</TabsTrigger>
          <TabsTrigger value="custom">Custom</TabsTrigger>
          <TabsTrigger value="push">Push Status</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Broadcast to all users</CardTitle>
              <CardDescription>
                Sends an in-app and web push notification to every active user.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationComposer
                values={bulk}
                onChange={setBulk}
                onSubmit={sendBulk}
                loading={loadingBulk}
                submitLabel="Send broadcast"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Target specific users</CardTitle>
              <CardDescription>
                Search by name, pen name, or email and select one or more
                recipients.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 max-w-2xl">
                <Label htmlFor="user-search">Recipients</Label>
                {selectedUsers.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {selectedUsers.map((u) => (
                      <Badge
                        key={u.id}
                        variant="secondary"
                        className="gap-1 pr-1"
                      >
                        <span>
                          {u.penName ||
                            [u.firstName, u.lastName]
                              .filter(Boolean)
                              .join(" ") ||
                            u.email}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSelectedUser(u.id)}
                          className="rounded-full p-0.5 hover:bg-muted"
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}

                <div className="relative">
                  <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                  <Input
                    id="user-search"
                    className="pl-9"
                    placeholder="Search users by email, name, or pen name..."
                    value={searchQuery}
                    onChange={(e) => void handleSearchUsers(e.target.value)}
                  />
                  {searching ? (
                    <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-muted-foreground" />
                  ) : null}
                </div>

                {searchResults.length > 0 ? (
                  <div className="rounded-lg border bg-popover shadow-md max-h-56 overflow-y-auto divide-y">
                    {searchResults.map((u) => {
                      const name = [u.firstName, u.lastName]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => addSelectedUser(u)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between gap-2"
                        >
                          <div>
                            <p className="font-medium">
                              {u.penName || name || u.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {u.email}
                              {name && u.penName ? ` · ${name}` : ""}
                            </p>
                          </div>
                          <span className="text-xs text-primary">Add</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>

              <NotificationComposer
                values={custom}
                onChange={setCustom}
                onSubmit={sendCustom}
                loading={loadingCustom}
                submitLabel={`Send to ${selectedUsers.length || 0} user(s)`}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="push" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="size-4 text-primary" />
                  Web Push Diagnostics
                </CardTitle>
                <CardDescription>
                  VAPID configuration and active browser push subscriptions.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {loadingPush ? (
                  <p className="text-muted-foreground">Loading...</p>
                ) : push ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">VAPID Status</span>
                      {push.vapidConfiguredFromEnv ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">
                          <CheckCircle2 className="mr-1 size-3" />
                          Configured
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <ShieldAlert className="mr-1 size-3" />
                          Ephemeral Keys
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Active Subscriptions
                      </span>
                      <span className="font-semibold tabular-nums">
                        {push.activeSubscriptions} / {push.totalSubscriptions}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Subject</span>
                      <code className="text-xs font-mono">{push.subject}</code>
                    </div>
                    {push.publicKeyPreview ? (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Public Key
                        </span>
                        <code className="text-xs font-mono">
                          {push.publicKeyPreview}
                        </code>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <p className="text-muted-foreground">Unavailable</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <BellRing className="size-4 text-primary" />
                  Send Test Push
                </CardTitle>
                <CardDescription>
                  Dispatch a test browser push notification to a user UUID.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTestPush} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="test-push-uid">User UUID</Label>
                    <Input
                      id="test-push-uid"
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      value={testPushUserId}
                      onChange={(e) => setTestPushUserId(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" disabled={sendingTestPush}>
                    {sendingTestPush ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 size-4" />
                    )}
                    Send Test Push
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
