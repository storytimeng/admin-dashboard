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

export interface AppUserStats {
  storiesWritten: number;
  episodesWritten: number;
  chaptersWritten: number;
  storiesRead: number;
  likesReceived: number;
  commentsReceived: number;
  readsOnStories: number;
}

export interface AppUser {
  id: string;
  email: string;
  penName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatar?: string | null;
  isSuspended?: boolean;
  isPremium?: boolean;
  isEmailVerified?: boolean;
  deletedAt?: string | null;
  lastActiveAt?: string | null;
  createdAt?: string;
  genres?: string[] | null;
  badges?: string[] | null;
  certificates?: string[] | null;
  badgesCount?: number;
  certificatesCount?: number;
  readerLevel?: string | null;
  writerLevel?: string | null;
  stats?: AppUserStats;
}

export interface AdminUserAchievement {
  id: string;
  milestone: number | null;
  title: string;
  imageUrl: string | null;
}

export interface AdminUserDetail {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    penName?: string | null;
    avatar?: string | null;
    profilePicture?: string | null;
    bio?: string | null;
    genres?: string[];
    dateOfBirth?: string;
    timeToRead?: string | null;
    timeToWrite?: string | null;
    reminder?: string | null;
    isEmailVerified?: boolean;
    emailVerifiedAt?: string | null;
    isSuspended?: boolean;
    suspendedAt?: string | null;
    deletedAt?: string | null;
    isPremium?: boolean;
    premiumExpiresAt?: string | null;
    preferredCurrency?: string;
    lastLoginAt?: string | null;
    lastActiveAt?: string | null;
    createdAt?: string;
  };
  reading: {
    storiesRead: number;
    nextReaderMilestone: number | null;
    level: number;
    levelTitle: string | null;
    progress: {
      totalStoriesInProgress: number;
      completedStories: number;
      totalReadingTimeSeconds: number;
      totalReadingTimeMinutes: number;
      totalReadingTimeHours: number;
    };
    recentHistory: Array<{
      id: string;
      readAt: string;
      story: {
        id: string;
        title: string;
        imageUrl?: string | null;
        storyStatus?: string;
        authorPenName?: string | null;
      } | null;
    }>;
    totalHistory: number;
  };
  writing: {
    storiesWritten: number;
    draftsCount: number;
    publishedStories: number;
    episodesWritten: number;
    chaptersWritten: number;
    nextWriterMilestone: number | null;
    level: number;
    levelTitle: string | null;
    recentStories: Array<{
      id: string;
      title: string;
      storyStatus: string;
      likeCount: number;
      commentCount: number;
      popularityScore: number;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  engagement: {
    likesReceived: number;
    commentsReceived: number;
    readsOnStories: number;
  };
  achievements: {
    badges: AdminUserAchievement[];
    certificates: AdminUserAchievement[];
    badgesCount: number;
    certificatesCount: number;
    readerMilestones: number[];
    authorMilestones: number[];
  };
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
  story?: { id: string; title: string };
  comments?: StoryCommentDetail[];
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
  story?: { id: string; title: string };
  comments?: StoryCommentDetail[];
}

export type AdminCommentType = "story" | "episode" | "chapter";

export interface AdminComment {
  id: string;
  content: string;
  type?: AdminCommentType;
  createdAt?: string;
  updatedAt?: string;
  storyTitle?: string;
  storyId?: string;
  episodeId?: string;
  episodeTitle?: string;
  chapterId?: string;
  chapterTitle?: string;
  userId?: string;
  user?: {
    id?: string;
    penName?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  story?: { id: string; title: string };
  replies?: AdminComment[];
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

export interface DashboardAnalytics {
  generatedAt: string;
  trendDays: number;
  summary: {
    users: {
      total: number;
      active: number;
      suspended: number;
      deleted: number;
      verified: number;
      premium: number;
      newLast7Days: number;
      newLast30Days: number;
      activeLast7Days: number;
    };
    stories: {
      total: number;
      active: number;
      suspended: number;
      complete: number;
      ongoing: number;
      drafts: number;
      exclusive: number;
      anonymous: number;
      triggerContent: number;
      newLast7Days: number;
      newLast30Days: number;
    };
    engagement: {
      totalReads: number;
      readsLast7Days: number;
      readsLast30Days: number;
      totalLikes: number;
      totalComments: number;
      storyComments: number;
      episodeComments: number;
      chapterComments: number;
      chapters: number;
      episodes: number;
      notifications: number;
    };
    subscriptions: {
      totalPayments: number;
      successfulPayments: number;
      pendingPayments: number;
      failedPayments: number;
      activeSubscriptions: number;
      expiredSubscriptions: number;
      cancelledSubscriptions: number;
      pendingSubscriptions: number;
      premiumUsers: number;
      premiumConversionRate: number;
      paymentSuccessRate: number;
      revenueByCurrency: Array<{
        currency: string;
        totalMinor: number;
        formatted: string;
      }>;
      revenueLast30Days: Array<{
        currency: string;
        totalMinor: number;
        formatted: string;
      }>;
    };
    derived: {
      avgReadsPerStory: number;
      commentsPerStory: number;
      likesPerStory: number;
    };
  };
  storyStatusBreakdown: Array<{ status: string; count: number }>;
  contentFormat: {
    chapterStories: number;
    episodeStories: number;
    standalone: number;
  };
  genreBreakdown: Array<{ genre: string; count: number }>;
  trends: {
    userSignups: Array<{ date: string; count: number }>;
    reads: Array<{ date: string; count: number }>;
    revenue: Array<{
      date: string;
      currency: string;
      amountMinor: number;
      formatted: string;
    }>;
  };
  topStories: Array<{
    id: string;
    title: string;
    storyStatus: string;
    authorPenName: string | null;
    reads: number;
    likes: number;
    comments: number;
    popularityScore: number | null;
  }>;
  topAuthors: Array<{
    authorId: string;
    penName: string | null;
    email: string;
    storyCount: number;
    totalReads: number;
  }>;
  recentUsers: Array<{
    id: string;
    email: string;
    penName: string | null;
    isPremium: boolean;
    createdAt: string;
  }>;
  recentStories: Array<{
    id: string;
    title: string;
    storyStatus: string;
    authorPenName: string | null;
    isSuspended: boolean;
    createdAt: string;
  }>;
  alerts: Array<{
    type: "warning" | "info" | "danger";
    label: string;
    count: number;
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
  autoRenew?: boolean;
  cardLast4?: string | null;
  hasPaymentMethod?: boolean;
}

export interface SubscriptionPlanOption {
  id: string;
  code: string;
  name: string;
  durationDays: number;
  amount: number;
  currency: string;
  formattedPrice: string;
  isPopular: boolean;
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

export type AmbassadorApplicationStatus = "pending" | "accepted" | "declined";
export type AmbassadorType = "campus" | "community";

export interface AmbassadorApplicationItem {
  id: string;
  applicationReference?: string;
  userId: string;
  type: AmbassadorType;
  status: AmbassadorApplicationStatus;
  fullName: string;
  email: string;
  phone?: string;
  city: string;
  country: string;
  institution?: string;
  profileTypes?: string[];
  otherProfileType?: string;
  whyJoin: string;
  promotionMethods?: string[];
  otherPromotionDetail?: string;
  partOfOrganizedCommunity?: boolean;
  storytimeRole?: string;
  conflictHandling?: string;
  agreedToResponsibility?: boolean;
  agreedToIntegrity?: boolean;
  agreedToMonthlyReports?: boolean;
  agreedToPerformanceReview?: boolean;
  readingExperience: string;
  writingExperience?: string;
  favoriteGenres: string[];
  communityDescription: string;
  estimatedReach: number;
  hasLedCommunityBefore: boolean;
  communityPlatforms: string[];
  weeklyHoursCommitment: number;
  declineReason?: string;
  reviewDeadline?: string;
  reviewedAt?: string;
  daysRemaining?: number;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  } | null;
}

export type AmbassadorMonthlyReportStatus =
  | "inactive"
  | "draft"
  | "submitted"
  | "processing"
  | "completed";

export interface AmbassadorMonthlyReportItem {
  id: string;
  year: number;
  month: number;
  monthLabel: string;
  status: AmbassadorMonthlyReportStatus;
  newReferrals: number;
  referralStoriesPublished: number;
  activitiesDescription?: string | null;
  programFeedback?: string | null;
  eventsHosted: number;
  submittedAt?: string | null;
  processedAt?: string | null;
  ambassador?: {
    id: string;
    type: AmbassadorType;
    referralCode: string;
  } | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    penName?: string | null;
    email: string;
  } | null;
}

export type AmbassadorLeaderboardScope = "campus" | "city" | "global";
export type AmbassadorTier = "bronze" | "silver" | "gold" | "platinum";

export interface AmbassadorLeaderboardItem {
  rank: number;
  ambassadorId: string;
  type: AmbassadorType;
  totalScore: number;
  tier: AmbassadorTier;
  affiliation: string;
  referralCode: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    penName?: string | null;
    avatar?: string | null;
  } | null;
}

export interface AmbassadorLeaderboardResponse {
  leaderboard: AmbassadorLeaderboardItem[];
  scope: AmbassadorLeaderboardScope;
  total: number;
  hasMore: boolean;
  nextResetDate: string;
  limit: number;
  offset: number;
}

export interface GenreAdminItem {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  storyCount: number;
  userCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export type PolicyType = "terms" | "privacy";
export type LegacyPolicyType = "cookie" | "other";
export type TermsFormType = PolicyType | LegacyPolicyType;

export function isSupportedPolicyType(
  type: string | undefined,
): type is PolicyType {
  return type === "terms" || type === "privacy";
}

export function isLegacyPolicyType(
  type: string | undefined,
): type is LegacyPolicyType {
  return type === "cookie" || type === "other";
}

export const POLICY_TYPE_LABELS: Record<TermsFormType, string> = {
  terms: "Terms of Service",
  privacy: "Privacy Policy",
  cookie: "Cookie Policy (legacy)",
  other: "Other (legacy)",
};

export interface TermsItem {
  id: string;
  title: string;
  content: string;
  type?: TermsFormType;
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
  variableHints?: string[];
  updatedAt?: string;
}

export interface EmailTemplateSummary {
  slug: string;
  name?: string;
  category?: string;
  isActive?: boolean;
  triggerDescription?: string;
  variableHints?: string[];
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
