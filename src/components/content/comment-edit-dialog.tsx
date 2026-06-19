"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminApi } from "@/lib/api/admin";
import type { AdminComment, AdminCommentType } from "@/types/admin";

interface CommentEditDialogProps {
  comment: AdminComment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function CommentEditDialog({
  comment,
  open,
  onOpenChange,
  onSaved,
}: CommentEditDialogProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (comment && open) {
      setContent(comment.content);
    }
  }, [comment, open]);

  const save = async () => {
    if (!comment) return;
    const trimmed = content.trim();
    if (trimmed.length < 1) {
      toast.error("Comment cannot be empty");
      return;
    }

    const type: AdminCommentType = comment.type ?? "story";
    setSaving(true);
    try {
      await adminApi.updateComment(type, comment.id, { content: trimmed });
      toast.success("Comment updated");
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit comment</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label htmlFor="comment-content">Content</Label>
          <Textarea
            id="comment-content"
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
