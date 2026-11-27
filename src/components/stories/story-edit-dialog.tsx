"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
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
import { MediaPickerDialog } from "@/components/media/media-picker-dialog";
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      .getAvailableGenres()
      .then(setAvailableGenres)
      .catch(() => toast.error("Could not load genres"));
  }, [open]);

  const toggleGenre = (genre: string) => {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    );
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await adminApi.uploadAdminImage(file);
      setForm((f) => ({ ...f, imageUrl: res.imageUrl }));
      toast.success("Cover image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
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
          <div className="gap-4 grid sm:grid-cols-2">
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
              <Label>Cover image</Label>
              <div className="flex gap-2">
                <Input
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, imageUrl: e.target.value }))
                  }
                  placeholder="https://…"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                >
                  {uploadingImage ? (
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                  ) : (
                    <ImagePlus className="mr-1.5 size-4" />
                  )}
                  Upload
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMediaPickerOpen(true)}
                >
                  Library
                </Button>
              </div>
              {form.imageUrl ? (
                <div className="mt-2 flex items-end gap-3">
                  <img
                    src={form.imageUrl}
                    alt="Cover preview"
                    className="border rounded-md w-18 h-24 object-cover"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}
                  >
                    <Trash2 className="mr-1.5 size-3.5" />
                    Remove image
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Genres</Label>
            <div className="flex flex-wrap gap-2">
              {availableGenres.map((genre) => (
                <Badge
                  key={genre}
                  variant={genres.includes(genre) ? "default" : "outline"}
                  className="capitalize cursor-pointer"
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
      <MediaPickerDialog
        open={mediaPickerOpen}
        onOpenChange={setMediaPickerOpen}
        defaultFolder="story-covers"
        title="Choose Story Cover from Media Library"
        onSelect={(item) => {
          setForm((f) => ({ ...f, imageUrl: item.url }));
        }}
      />
    </Dialog>
  );
}
