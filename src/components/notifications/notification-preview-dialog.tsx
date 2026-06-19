"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  buildNotificationEmailPreviewHtml,
  stripHtml,
} from "@/lib/notification-html";

interface NotificationPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  messageHtml: string;
  sendEmail?: boolean;
}

export function NotificationPreviewDialog({
  open,
  onOpenChange,
  title,
  messageHtml,
  sendEmail = false,
}: NotificationPreviewDialogProps) {
  const previewTitle = title.trim() || "Notification title";
  const previewBody = messageHtml.trim() || "<p>No message content yet.</p>";
  const listSnippet = stripHtml(previewBody) || "No message content yet.";
  const emailHtml = buildNotificationEmailPreviewHtml(
    previewTitle,
    previewBody,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview notification</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="in-app">
          <TabsList>
            <TabsTrigger value="in-app">In-app</TabsTrigger>
            <TabsTrigger value="detail">Detail view</TabsTrigger>
            {sendEmail ? <TabsTrigger value="email">Email</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="in-app" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              How this appears in the user&apos;s notification list.
            </p>
            <div className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-lg">
                  📢
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{previewTitle}</p>
                    <Badge variant="outline" className="text-xs">
                      New
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {listSnippet}
                  </p>
                  <p className="text-xs text-muted-foreground">Just now</p>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="detail" className="mt-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              Full message when the user opens the notification.
            </p>
            <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted text-xl">
                  📢
                </div>
                <h3 className="text-lg font-semibold">{previewTitle}</h3>
              </div>
              <div
                className="admin-rich-text text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: previewBody }}
              />
            </div>
          </TabsContent>

          {sendEmail ? (
            <TabsContent value="email" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Email layout sent when &quot;Also send email&quot; is enabled.
              </p>
              <div
                className="overflow-hidden rounded-lg border bg-white"
                dangerouslySetInnerHTML={{ __html: emailHtml }}
              />
            </TabsContent>
          ) : null}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
