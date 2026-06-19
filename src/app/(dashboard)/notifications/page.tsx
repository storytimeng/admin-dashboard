"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminApi } from "@/lib/api/admin";

export default function NotificationsPage() {
  const [single, setSingle] = useState({
    title: "",
    message: "",
    email: "",
    sendEmail: false,
  });
  const [bulk, setBulk] = useState({
    title: "",
    message: "",
    sendEmail: true,
  });
  const [loading, setLoading] = useState(false);

  const sendSingle = async () => {
    if (!single.title || !single.message) {
      toast.error("Title and message are required");
      return;
    }
    setLoading(true);
    try {
      await adminApi.sendNotification({
        title: single.title,
        message: single.message,
        type: "admin_message",
        email: single.email || undefined,
        sendEmail: single.sendEmail,
      });
      toast.success("Notification sent");
      setSingle({ title: "", message: "", email: "", sendEmail: false });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setLoading(false);
    }
  };

  const sendBulk = async () => {
    if (!bulk.title || !bulk.message) {
      toast.error("Title and message are required");
      return;
    }
    setLoading(true);
    try {
      const result = await adminApi.sendBulkNotification({
        title: bulk.title,
        message: bulk.message,
        type: "admin_message",
        sendEmail: bulk.sendEmail,
      });
      toast.success(
        `Sent to ${result.created} users (${result.failed} failed)`,
      );
      setBulk({ title: "", message: "", sendEmail: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk send failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Send in-app and email notifications to users."
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
                Sends an in-app notification to every active user.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={bulk.title}
                  onChange={(e) =>
                    setBulk((b) => ({ ...b, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  rows={4}
                  value={bulk.message}
                  onChange={(e) =>
                    setBulk((b) => ({ ...b, message: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={bulk.sendEmail}
                  onCheckedChange={(v) =>
                    setBulk((b) => ({ ...b, sendEmail: v }))
                  }
                />
                <Label>Also send email</Label>
              </div>
              <Button onClick={sendBulk} disabled={loading}>
                {loading ? "Sending…" : "Send broadcast"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="single" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Target one user</CardTitle>
              <CardDescription>Send by user email address.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label>User email</Label>
                <Input
                  type="email"
                  value={single.email}
                  onChange={(e) =>
                    setSingle((s) => ({ ...s, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={single.title}
                  onChange={(e) =>
                    setSingle((s) => ({ ...s, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  rows={4}
                  value={single.message}
                  onChange={(e) =>
                    setSingle((s) => ({ ...s, message: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={single.sendEmail}
                  onCheckedChange={(v) =>
                    setSingle((s) => ({ ...s, sendEmail: v }))
                  }
                />
                <Label>Also send email</Label>
              </div>
              <Button onClick={sendSingle} disabled={loading}>
                {loading ? "Sending…" : "Send notification"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
