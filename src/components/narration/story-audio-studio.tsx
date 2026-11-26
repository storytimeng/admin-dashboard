"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  Mic,
  Pencil,
  RefreshCw,
  Sparkles,
  Volume2,
  XCircle,
} from "lucide-react";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import { adminApi } from "@/lib/api/admin";
import type {
  AdminAudioSegmentStatus,
  AdminAudioSegmentView,
  AdminAudioUnitView,
} from "@/types/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface StoryAudioStudioProps {
  storyId: string;
  initialChapterId?: string | null;
  initialEpisodeId?: string | null;
  onContentUpdated?: () => void;
}

const SEGMENT_STATUS_META: Record<
  AdminAudioSegmentStatus,
  {
    label: string;
    borderClass: string;
    bgClass: string;
    pillClass: string;
    barClass: string;
  }
> = {
  ready: {
    label: "Converted",
    borderClass: "border-l-4 border-l-emerald-500",
    bgClass: "bg-emerald-500/5",
    pillClass:
      "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    barClass: "bg-emerald-500",
  },
  stale: {
    label: "Text edited (stale)",
    borderClass: "border-l-4 border-l-amber-500",
    bgClass: "bg-amber-500/5",
    pillClass:
      "border-amber-500/40 bg-amber-500/15 text-amber-700 dark:text-amber-300",
    barClass: "bg-amber-500",
  },
  pending: {
    label: "Generating",
    borderClass: "border-l-4 border-l-sky-500",
    bgClass: "bg-sky-500/5",
    pillClass: "border-sky-500/40 bg-sky-500/15 text-sky-700 dark:text-sky-300",
    barClass: "bg-sky-500",
  },
  failed: {
    label: "Failed",
    borderClass: "border-l-4 border-l-destructive",
    bgClass: "bg-destructive/5",
    pillClass:
      "border-destructive/40 bg-destructive/15 text-destructive",
    barClass: "bg-destructive",
  },
  missing: {
    label: "Not converted",
    borderClass: "border-l-4 border-l-muted-foreground/40",
    bgClass: "bg-muted/30",
    pillClass: "border-border bg-muted text-muted-foreground",
    barClass: "bg-muted-foreground/30",
  },
};

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function unitKey(unit: Pick<AdminAudioUnitView, "chapterId" | "episodeId">) {
  if (unit.chapterId) return `ch:${unit.chapterId}`;
  if (unit.episodeId) return `ep:${unit.episodeId}`;
  return "story";
}

export function StoryAudioStudio({
  storyId,
  initialChapterId = null,
  initialEpisodeId = null,
  onContentUpdated,
}: StoryAudioStudioProps) {
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>(
    undefined,
  );
  const [selectedUnitKey, setSelectedUnitKey] = useState<string | null>(() => {
    if (initialChapterId) return `ch:${initialChapterId}`;
    if (initialEpisodeId) return `ep:${initialEpisodeId}`;
    return null;
  });
  const [editingSegmentOrder, setEditingSegmentOrder] = useState<number | null>(
    null,
  );
  const [draftText, setDraftText] = useState("");
  const [regeneratingAll, setRegeneratingAll] = useState(false);
  const [regeneratingUnit, setRegeneratingUnit] = useState(false);
  const [regeneratingSegment, setRegeneratingSegment] = useState<number | null>(
    null,
  );

  const { data, isLoading, error, mutate } = useProtectedSWR(
    ["admin-audio-studio", storyId, selectedVoice ?? "default"],
    () => adminApi.getStoryAudioStudio(storyId, selectedVoice),
  );

  const studio = data?.studio;

  useEffect(() => {
    if (!studio?.units?.length) return;
    if (
      selectedUnitKey &&
      studio.units.some((u) => unitKey(u) === selectedUnitKey)
    ) {
      return;
    }
    setSelectedUnitKey(unitKey(studio.units[0]));
  }, [studio, selectedUnitKey]);

  const activeUnit = useMemo(() => {
    if (!studio?.units?.length) return null;
    return (
      studio.units.find((u) => unitKey(u) === selectedUnitKey) ??
      studio.units[0]
    );
  }, [studio, selectedUnitKey]);

  const startEditingSegment = (seg: AdminAudioSegmentView) => {
    setEditingSegmentOrder(seg.order);
    setDraftText(seg.text);
  };

  const handleRegenerateStory = async () => {
    if (!studio) return;
    setRegeneratingAll(true);
    try {
      const res = await adminApi.regenerateStoryAudio(storyId, studio.voice);
      const ok = res.results.filter((r) => r.status === "ready").length;
      const failed = res.results.filter((r) => r.status === "failed").length;
      if (failed > 0) {
        toast.warning(
          `Regenerated ${ok} unit(s), ${failed} failed. Check unit details below.`,
        );
      } else {
        toast.success(`Regenerated audio for ${ok} unit(s)`);
      }
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to regenerate story audio",
      );
    } finally {
      setRegeneratingAll(false);
    }
  };

  const handleRegenerateUnit = async () => {
    if (!activeUnit || !studio) return;
    setRegeneratingUnit(true);
    try {
      await adminApi.regenerateUnitAudio({
        storyId,
        chapterId: activeUnit.chapterId,
        episodeId: activeUnit.episodeId,
        voice: studio.voice,
      });
      toast.success(`Regenerated audio for "${activeUnit.title}"`);
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to regenerate unit audio",
      );
    } finally {
      setRegeneratingUnit(false);
    }
  };

  const handleRegenerateSegment = async (
    seg: AdminAudioSegmentView,
    withEditedText = false,
  ) => {
    if (!activeUnit || !studio) return;
    setRegeneratingSegment(seg.order);
    try {
      const nextText = withEditedText ? draftText.trim() : undefined;
      await adminApi.regenerateAudioSegment({
        storyId,
        chapterId: activeUnit.chapterId,
        episodeId: activeUnit.episodeId,
        voice: studio.voice,
        segmentOrder: seg.order,
        text: nextText,
        saveText: withEditedText,
      });
      toast.success(
        withEditedText
          ? `Saved text & regenerated segment #${seg.order + 1}`
          : `Regenerated segment #${seg.order + 1}`,
      );
      if (withEditedText) {
        setEditingSegmentOrder(null);
        onContentUpdated?.();
      }
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Segment regeneration failed",
      );
    } finally {
      setRegeneratingSegment(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !studio) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="size-4" />
        <AlertTitle>Could not load narration studio</AlertTitle>
        <AlertDescription>
          {error instanceof Error
            ? error.message
            : "Failed to load audio segments for this story."}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-base">
                <Mic className="size-4 text-primary" />
                Audio Narration Studio
                {studio.ttsConfigured ? (
                  <Badge className="bg-emerald-600 hover:bg-emerald-600">
                    TTS Online
                  </Badge>
                ) : (
                  <Badge variant="destructive">TTS Disabled</Badge>
                )}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Inspect text segmentation, spot unconverted or edited sections,
                fix text inline, and regenerate individual segments or full
                audio.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={selectedVoice ?? studio.voice}
                onValueChange={(v) => v && setSelectedVoice(v)}
              >
                <SelectTrigger className="w-[210px]">
                  <SelectValue placeholder="Select voice" />
                </SelectTrigger>
                <SelectContent>
                  {studio.availableVoices.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} ({v.locale})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeUnit ? (
                <Button
                  variant="outline"
                  onClick={handleRegenerateUnit}
                  disabled={
                    regeneratingUnit || regeneratingAll || !studio.ttsConfigured
                  }
                >
                  {regeneratingUnit ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 size-4" />
                  )}
                  Force Regenerate Unit
                </Button>
              ) : null}

              {studio.units.length > 1 ? (
                <Button
                  onClick={handleRegenerateStory}
                  disabled={
                    regeneratingAll || regeneratingUnit || !studio.ttsConfigured
                  }
                >
                  {regeneratingAll ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 size-4" />
                  )}
                  Regenerate All ({studio.units.length})
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>

        {studio.units.length > 1 ? (
          <CardContent className="border-t pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {studio.type === "chapters" ? "Chapters" : "Episodes"}
            </p>
            <div className="flex flex-wrap gap-2">
              {studio.units.map((unit) => {
                const key = unitKey(unit);
                const isSelected = activeUnit && unitKey(activeUnit) === key;
                const allReady =
                  unit.expectedSegmentCount > 0 &&
                  unit.readySegmentCount === unit.expectedSegmentCount;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedUnitKey(key);
                      setEditingSegmentOrder(null);
                    }}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10 font-medium text-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    <span>
                      {unit.unitType === "chapter" ? "Ch." : "Ep."}{" "}
                      {unit.orderNumber}: {unit.title}
                    </span>
                    <Badge
                      variant={allReady ? "default" : "outline"}
                      className={
                        allReady
                          ? "bg-emerald-600 hover:bg-emerald-600 text-[10px]"
                          : "text-[10px]"
                      }
                    >
                      {unit.readySegmentCount}/{unit.expectedSegmentCount}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </CardContent>
        ) : null}
      </Card>

      {activeUnit ? (
        <Card>
          <CardHeader className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">{activeUnit.title}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {activeUnit.expectedSegmentCount} segment(s) · Est.{" "}
                  {formatDuration(activeUnit.totalDurationSeconds)}
                  {activeUnit.updatedAt
                    ? ` · Audio updated ${formatDistanceToNow(
                        parseISO(activeUnit.updatedAt),
                        { addSuffix: true },
                      )}`
                    : " · No audio generated yet"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="size-3" />
                  Converted: {activeUnit.readySegmentCount}
                </span>
                {activeUnit.staleSegmentCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">
                    <Clock3 className="size-3" />
                    Edited/Stale: {activeUnit.staleSegmentCount}
                  </span>
                ) : null}
                {activeUnit.missingSegmentCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-muted-foreground">
                    Not converted: {activeUnit.missingSegmentCount}
                  </span>
                ) : null}
                {activeUnit.failedSegmentCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-destructive">
                    <XCircle className="size-3" />
                    Failed: {activeUnit.failedSegmentCount}
                  </span>
                ) : null}
              </div>
            </div>

            {/* Color-coded visual segmentation bar */}
            {activeUnit.segments.length > 0 ? (
              <div className="space-y-2">
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  {activeUnit.segments.map((seg) => {
                    const meta = SEGMENT_STATUS_META[seg.status];
                    return (
                      <a
                        key={seg.order}
                        href={`#segment-${seg.order}`}
                        title={`Segment #${seg.order + 1}: ${meta.label}`}
                        style={{
                          width: `${100 / activeUnit.segments.length}%`,
                        }}
                        className={`${meta.barClass} border-r border-background/60 last:border-r-0 transition-opacity hover:opacity-80`}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeUnit.segments.map((seg) => {
                    const meta = SEGMENT_STATUS_META[seg.status];
                    return (
                      <a
                        key={seg.order}
                        href={`#segment-${seg.order}`}
                        className={`rounded border px-2 py-0.5 text-[11px] font-medium transition-opacity hover:opacity-80 ${meta.pillClass}`}
                      >
                        #{seg.order + 1} · {meta.label}
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {activeUnit.errorMessage ? (
              <Alert variant="destructive">
                <AlertTriangle className="size-4" />
                <AlertTitle>Last audio error</AlertTitle>
                <AlertDescription>{activeUnit.errorMessage}</AlertDescription>
              </Alert>
            ) : null}
          </CardHeader>

          <CardContent className="space-y-4">
            {activeUnit.segments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                This unit has no readable text content to segment.
              </p>
            ) : (
              activeUnit.segments.map((seg) => {
                const meta = SEGMENT_STATUS_META[seg.status];
                const isEditing = editingSegmentOrder === seg.order;
                const isRegenerating = regeneratingSegment === seg.order;

                return (
                  <div
                    key={seg.order}
                    id={`segment-${seg.order}`}
                    className={`rounded-lg border p-4 ${meta.borderClass} ${meta.bgClass}`}
                  >
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">
                          Segment #{seg.order + 1}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[11px] ${meta.pillClass}`}
                        >
                          {meta.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {seg.text.length} chars ·{" "}
                          {formatDuration(seg.durationSeconds)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {!isEditing ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditingSegment(seg)}
                            disabled={isRegenerating || regeneratingUnit}
                          >
                            <Pencil className="mr-1.5 size-3.5" />
                            Edit text
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant={seg.status === "ready" ? "outline" : "default"}
                          onClick={() => handleRegenerateSegment(seg, false)}
                          disabled={
                            isRegenerating ||
                            regeneratingUnit ||
                            !studio.ttsConfigured
                          }
                        >
                          {isRegenerating && !isEditing ? (
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1.5 size-3.5" />
                          )}
                          Regenerate Segment
                        </Button>
                      </div>
                    </div>

                    {seg.url ? (
                      <div className="mb-3 flex items-center gap-2 rounded-md border bg-background/80 px-3 py-2">
                        <Volume2 className="size-4 shrink-0 text-muted-foreground" />
                        <audio
                          key={`${seg.url}-${seg.updatedAt ?? seg.order}`}
                          controls
                          preload="none"
                          src={seg.url}
                          className="h-8 w-full"
                        />
                      </div>
                    ) : null}

                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={draftText}
                          onChange={(e) => setDraftText(e.target.value)}
                          rows={6}
                          className="bg-background text-sm leading-relaxed"
                        />
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingSegmentOrder(null)}
                            disabled={isRegenerating}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleRegenerateSegment(seg, true)}
                            disabled={
                              isRegenerating ||
                              !draftText.trim() ||
                              !studio.ttsConfigured
                            }
                          >
                            {isRegenerating ? (
                              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="mr-1.5 size-3.5" />
                            )}
                            Save Text &amp; Regenerate Audio
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap rounded-md bg-background/60 p-3 text-sm leading-relaxed text-foreground">
                        {seg.text}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
