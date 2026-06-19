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
import type { AdminEpisode } from "@/types/admin";

interface EpisodeEditDialogProps {
  episode: AdminEpisode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function EpisodeEditDialog({
  episode,
  open,
  onOpenChange,
  onSaved,
}: EpisodeEditDialogProps) {
  const [form, setForm] = useState({
    title: "",
    content: "",
    episodeNumber: 1,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (episode && open) {
      setForm({
        title: episode.title,
        content: episode.content ?? "",
        episodeNumber: episode.episodeNumber ?? 1,
      });
    }
  }, [episode, open]);

  const save = async () => {
    if (!episode) return;
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
      await adminApi.updateEpisode(episode.id, {
        title,
        content: form.content,
        episodeNumber: form.episodeNumber,
      });
      toast.success("Episode updated");
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
          <DialogTitle>Edit episode</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
            <div className="space-y-2">
              <Label htmlFor="episode-title">Title</Label>
              <Input
                id="episode-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="episode-number">Episode #</Label>
              <Input
                id="episode-number"
                type="number"
                min={1}
                value={form.episodeNumber}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    episodeNumber: Number(e.target.value) || 1,
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
