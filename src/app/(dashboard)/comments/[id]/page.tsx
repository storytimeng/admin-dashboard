import { CommentDetailView } from "@/components/content/comment-detail-view";
import type { AdminCommentType } from "@/types/admin";

interface CommentDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}

function parseCommentType(value?: string): AdminCommentType {
  if (value === "episode" || value === "chapter") return value;
  return "story";
}

export default async function CommentDetailPage({
  params,
  searchParams,
}: CommentDetailPageProps) {
  const { id } = await params;
  const { type } = await searchParams;
  return (
    <CommentDetailView commentId={id} commentType={parseCommentType(type)} />
  );
}
