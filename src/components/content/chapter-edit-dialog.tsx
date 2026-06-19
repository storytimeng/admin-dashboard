"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { adminApi } from "@/lib/api/admin";
import type { AdminChapter } from "@/types/admin";

interface ChapterEditDialogProps {
  chapter: AdminChapter | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function ChapterEditDialog({
  chapter,
  open,
  onOpenChange,
  onSaved,
}: ChapterEditDialogProps) {
  const [form, setForm] = useState({
    title: "",
    content: "",
    chapterNumber: 1,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (chapter && open) {
      setForm({
        title: chapter.title,
        content: chapter.content ?? "",
        chapterNumber: chapter.chapterNumber ?? 1,
      });
    }
  }, [chapter, open]);

  const save = async () => {
    if (!chapter) return;
    const title = form.title.trim();
    if (title.length < 3) {
      toast.error("Title must be at least 3 characters");
      return;
    }
    if (form.content.trim().length < 50) {
      toast.error("Content must be at least 50 characters");
      return;
    }

    setSaving(true);
    try {
      await adminApi.updateChapter(chapter.id, {
        title,
        content: form.content,
        chapterNumber: form.chapterNumber,
      });
      toast.success("Chapter updated");
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit chapter</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div className="space-y-2">
              <Label htmlFor="chapter-title">Title</Label>
              <Input
                id="chapter-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chapter-number">Chapter #</Label>
              <Input
                id="chapter-number"
                type="number"
                min={1}
                value={form.chapterNumber}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    chapterNumber: Number(e.target.value) || 1,
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <RichTextEditor
              value={form.content}
              onChange={(content) => setForm((f) => ({ ...f, content }))}
              minHeight="min-h-[280px]"
            />
          </div>
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
