import { EpisodeDetailView } from "@/components/content/episode-detail-view";

interface EpisodeDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EpisodeDetailPage({
  params,
}: EpisodeDetailPageProps) {
  const { id } = await params;
  return <EpisodeDetailView episodeId={id} />;
}
