"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  NotificationComposer,
  type NotificationComposerValues,
} from "@/components/notifications/notification-composer";
import { adminApi } from "@/lib/api/admin";
import { stripHtml } from "@/lib/notification-html";

const emptySingle: NotificationComposerValues = {
  title: "",
  message: "",
  email: "",
  sendEmail: false,
};

const emptyBulk: NotificationComposerValues = {
  title: "",
  message: "",
  sendEmail: true,
};

export default function NotificationsPage() {
  const [single, setSingle] = useState<NotificationComposerValues>(emptySingle);
  const [bulk, setBulk] = useState<NotificationComposerValues>(emptyBulk);
  const [loadingSingle, setLoadingSingle] = useState(false);
  const [loadingBulk, setLoadingBulk] = useState(false);

  const sendSingle = async () => {
    if (!single.title.trim() || !stripHtml(single.message)) {
      toast.error("Title and message are required");
      return;
    }
    if (!single.email?.trim()) {
      toast.error("User email is required");
      return;
    }

    setLoadingSingle(true);
    try {
      await adminApi.sendNotification({
        title: single.title.trim(),
        message: single.message,
        type: "admin_message",
        email: single.email.trim(),
        sendEmail: single.sendEmail,
      });
      toast.success("Notification sent");
      setSingle(emptySingle);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setLoadingSingle(false);
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Compose rich announcements with preview, then send in-app notifications and optional email delivery."
      />

      <Tabs defaultValue="bulk">
        <TabsList>
          <TabsTrigger value="bulk">Broadcast</TabsTrigger>
          <TabsTrigger value="single">Single user</TabsTrigger>
        </TabsList>
        <TabsContent value="bulk" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Broadcast to all users</CardTitle>
              <CardDescription>
                Sends an in-app notification to every active user. Preview
                before sending to check formatting in the app and inbox.
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
        <TabsContent value="single" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Target one user</CardTitle>
              <CardDescription>
                Send a rich notification to a specific user by email address.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationComposer
                values={single}
                onChange={setSingle}
                onSubmit={sendSingle}
                loading={loadingSingle}
                submitLabel="Send notification"
                showEmailField
                emailDescription="Must match a registered Storytime account."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
