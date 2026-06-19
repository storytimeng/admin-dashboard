export type AdminRole =
  | "super_admin"
  | "admin"
  | "marketing"
  | "developer"
  | "designer"
  | "finance";

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: AdminRole;
  isSuspended: boolean;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLoginResponse {
  message: string;
  access_token: string;
  admin: AdminUser;
}

export interface AppUser {
  id: string;
  email: string;
  penName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  isSuspended?: boolean;
  isEmailVerified?: boolean;
  deletedAt?: string | null;
  lastActiveAt?: string | null;
  createdAt?: string;
  genres?: string[] | null;
  badges?: string[] | null;
  certificates?: string[] | null;
}

export interface AdminStory {
  id: string;
  title: string;
  description?: string | null;
  content?: string | null;
  storyStatus?: string | null;
  genres?: string[] | null;
  imageUrl?: string | null;
  anonymous?: boolean;
  onlyOnStorytime?: boolean;
  isSuspended?: boolean;
  likeCount?: number;
  commentCount?: number;
  viewCount?: number;
  language?: string | null;
  trigger?: boolean;
  copyright?: boolean;
  chapter?: boolean;
  /** True when story uses episodic structure */
  episodesEnabled?: boolean;
  collaborate?: string[] | null;
  author?: {
    id?: string | null;
    penName?: string | null;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    avatar?: string | null;
  } | null;
  authorId?: string;
  createdAt?: string;
  updatedAt?: string;
  suspendedAt?: string | null;
}

export interface AdminStoryDetail extends AdminStory {
  /** Populated on GET /stories/:id when story.chapter is true */
  chapters?: Array<{
    id: string;
    chapterNumber: number;
    createdAt?: string;
    updatedAt?: string;
  }>;
  /** Populated on GET /stories/:id when story uses episodes */
  episodes?: Array<{
    id: string;
    episodeNumber: number;
    createdAt?: string;
    updatedAt?: string;
  }>;
}

export interface StoryChapterDetail {
  id: string;
  title: string;
  content: string;
  chapterNumber: number;
  storyId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoryEpisodeDetail {
  id: string;
  title: string;
  content: string;
  episodeNumber: number;
  storyId: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StoryCommentDetail {
  id: string;
  content: string;
  storyId?: string;
  userId?: string;
  createdAt?: string;
  user?: {
    id?: string;
    penName?: string | null;
    email?: string | null;
  };
  replies?: StoryCommentDetail[];
}

export interface AdminEpisode {
  id: string;
  title: string;
  content?: string | null;
  storyId?: string;
  storyTitle?: string;
  episodeNumber?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminChapter {
  id: string;
  title: string;
  content?: string | null;
  storyId?: string;
  storyTitle?: string;
  chapterNumber?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminComment {
  id: string;
  content: string;
  type?: "story" | "episode" | "chapter";
  createdAt?: string;
  user?: { penName?: string; email?: string };
  story?: { id: string; title: string };
}

export interface ReportsOverview {
  users: {
    total: number;
    active: number;
    suspended: number;
    deleted: number;
  };
  stories: {
    total: number;
    suspended: number;
    active: number;
  };
  content: {
    episodes: number;
    chapters: number;
  };
  comments: {
    total: number;
    story: number;
    episode: number;
    chapter: number;
  };
  generatedAt: string;
}

export interface SubscriptionOverview {
  totalPayments: number;
  successfulPayments: number;
  pendingPayments: number;
  activeSubscriptions: number;
  premiumUsers: number;
  revenueByCurrency: Array<{
    currency: string;
    totalMinor: number;
    formatted: string;
  }>;
}

export interface PaymentRecord {
  id: string;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  formattedAmount: string;
  channel?: string;
  paidAt?: string | null;
  userId?: string;
  userEmail?: string;
  planCode?: string;
  planName?: string;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  userEmail?: string;
  planCode?: string;
  planName?: string;
  status: string;
  currency?: string;
  amountPaid?: number;
  startsAt?: string;
  expiresAt?: string;
  createdAt?: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  order?: number;
  isActive?: boolean;
}

export interface SupportItem {
  id: string;
  email: string;
  phone?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  twitter?: string | null;
  linkedin?: string | null;
  youtube?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type PolicyType = "terms" | "privacy";

export interface TermsItem {
  id: string;
  title: string;
  content: string;
  type?: PolicyType;
  version?: string | null;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmailTemplate {
  slug: string;
  name?: string;
  subject: string;
  bodyHtml: string;
  bodyText?: string;
  isActive?: boolean;
  category?: string;
  triggerDescription?: string;
  updatedAt?: string;
}

export interface EmailTemplateSummary {
  slug: string;
  name?: string;
  category?: string;
  isActive?: boolean;
  triggerDescription?: string;
  updatedAt?: string;
}

export interface PaymentAuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  userId?: string;
  actor?: string;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface EmailDeliveryLog {
  id: string;
  templateSlug?: string;
  recipientEmail?: string;
  status?: string;
  errorMessage?: string | null;
  createdAt: string;
}
