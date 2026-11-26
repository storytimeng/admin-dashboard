import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StoryAudioStudio } from "@/components/narration/story-audio-studio";

interface StoryNarrationStudioPageProps {
  params: Promise<{ storyId: string }>;
}

export default async function StoryNarrationStudioPage({
  params,
}: StoryNarrationStudioPageProps) {
  const { storyId } = await params;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" render={<Link href="/narration" />}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Narration Inventory
        </Button>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/stories/${storyId}`} />}
        >
          View Story Details
        </Button>
      </div>

      <StoryAudioStudio storyId={storyId} />
    </div>
  );
}
