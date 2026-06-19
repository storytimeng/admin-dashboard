import { StoryDetailView } from "@/components/stories/story-detail-view";

interface StoryDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function StoryDetailPage({ params }: StoryDetailPageProps) {
  const { id } = await params;
  return <StoryDetailView storyId={id} />;
}
