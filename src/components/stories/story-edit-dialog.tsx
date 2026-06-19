"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { adminApi } from "@/lib/api/admin";
import type { AdminStory } from "@/types/admin";

interface StoryEditDialogProps {
  story: AdminStory | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function StoryEditDialog({
  story,
  open,
  onOpenChange,
  onSaved,
}: StoryEditDialogProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    content: "",
    storyStatus: "published",
    imageUrl: "",
  });
  const [genres, setGenres] = useState<string[]>([]);
  const [availableGenres, setAvailableGenres] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!story) return;
    setForm({
      title: story.title || "",
      description: story.description || "",
      content: story.content || "",
      storyStatus: story.storyStatus || "published",
      imageUrl: story.imageUrl || "",
    });
    setGenres(story.genres ?? []);
  }, [story]);

  useEffect(() => {
    if (!open) return;
    adminApi
      .getGenres()
      .then(setAvailableGenres)
      .catch(() => toast.error("Could not load genres"));
  }, [open]);

  const toggleGenre = (genre: string) => {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  const save = async () => {
    if (!story) return;
    setSaving(true);
    try {
      await adminApi.updateStory(story.id, {
        title: form.title,
        description: form.description,
        content: form.content,
        storyStatus: form.storyStatus,
        imageUrl: form.imageUrl || null,
        genres,
      });
      toast.success("Story updated");
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
          <DialogTitle>Edit story</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <RichTextEditor
              value={form.description}
              onChange={(description) =>
                setForm((f) => ({ ...f, description }))
              }
              placeholder="Short description or synopsis…"
              minHeight="min-h-[120px]"
            />
          </div>
          <div className="space-y-2">
            <Label>Content</Label>
            <RichTextEditor
              value={form.content}
              onChange={(content) => setForm((f) => ({ ...f, content }))}
              placeholder="Story body…"
              minHeight="min-h-[280px]"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.storyStatus}
                onValueChange={(v) =>
                  v && setForm((f) => ({ ...f, storyStatus: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cover image URL</Label>
              <Input
                value={form.imageUrl}
                onChange={(e) =>
                  setForm((f) => ({ ...f, imageUrl: e.target.value }))
                }
                placeholder="https://…"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Genres</Label>
            <div className="flex flex-wrap gap-2">
              {availableGenres.map((genre) => (
                <Badge
                  key={genre}
                  variant={genres.includes(genre) ? "default" : "outline"}
                  className="cursor-pointer capitalize"
                  onClick={() => toggleGenre(genre)}
                >
                  {genre}
                </Badge>
              ))}
            </div>
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
