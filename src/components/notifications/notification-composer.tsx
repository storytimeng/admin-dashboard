"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { NotificationPreviewDialog } from "@/components/notifications/notification-preview-dialog";
import { stripHtml } from "@/lib/notification-html";

export interface NotificationComposerValues {
  title: string;
  message: string;
  email?: string;
  sendEmail: boolean;
}

interface NotificationComposerProps {
  values: NotificationComposerValues;
  onChange: (values: NotificationComposerValues) => void;
  onSubmit: () => void | Promise<void>;
  loading?: boolean;
  submitLabel: string;
  showEmailField?: boolean;
  emailDescription?: string;
}

export function NotificationComposer({
  values,
  onChange,
  onSubmit,
  loading = false,
  submitLabel,
  showEmailField = false,
  emailDescription,
}: NotificationComposerProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const canPreview =
    values.title.trim().length > 0 || stripHtml(values.message).length > 0;

  const canSubmit =
    values.title.trim().length > 0 &&
    stripHtml(values.message).length > 0 &&
    (!showEmailField || values.email?.trim());

  return (
    <>
      <div className="space-y-4 max-w-2xl">
        {showEmailField ? (
          <div className="space-y-2">
            <Label htmlFor="notification-user-email">User email</Label>
            <Input
              id="notification-user-email"
              type="email"
              placeholder="user@example.com"
              value={values.email ?? ""}
              onChange={(e) => onChange({ ...values, email: e.target.value })}
            />
            {emailDescription ? (
              <p className="text-xs text-muted-foreground">
                {emailDescription}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="notification-title">Title</Label>
          <Input
            id="notification-title"
            placeholder="Announcement title"
            value={values.title}
            onChange={(e) => onChange({ ...values, title: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label>Message</Label>
          <RichTextEditor
            value={values.message}
            onChange={(message) => onChange({ ...values, message })}
            placeholder="Write your notification message…"
            minHeight="min-h-[220px]"
          />
          <p className="text-xs text-muted-foreground">
            Use formatting for emphasis, links, and lists. Rich content is shown
            in-app and in email when enabled.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Also send email</p>
            <p className="text-xs text-muted-foreground">
              Delivers the same message to the user&apos;s inbox
            </p>
          </div>
          <Switch
            checked={values.sendEmail}
            onCheckedChange={(sendEmail) => onChange({ ...values, sendEmail })}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!canPreview}
            onClick={() => setPreviewOpen(true)}
          >
            <Eye className="mr-2 size-4" />
            Preview
          </Button>
          <Button
            type="button"
            onClick={() => void onSubmit()}
            disabled={loading || !canSubmit}
          >
            {loading ? "Sending…" : submitLabel}
          </Button>
        </div>
      </div>

      <NotificationPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        title={values.title}
        messageHtml={values.message}
        sendEmail={values.sendEmail}
      />
    </>
  );
}
