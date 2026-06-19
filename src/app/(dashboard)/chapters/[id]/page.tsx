import { ChapterDetailView } from "@/components/content/chapter-detail-view";

interface ChapterDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChapterDetailPage({
  params,
}: ChapterDetailPageProps) {
  const { id } = await params;
  return <ChapterDetailView chapterId={id} />;
}
