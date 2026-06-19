import { apiRequest } from "./client";
import type {
  AdminComment,
  AdminCommentType,
  AdminEpisode,
  AdminChapter,
  AdminLoginResponse,
  AdminStory,
  AdminStoryDetail,
  AdminUser,
  AppUser,
  EmailDeliveryLog,
  EmailTemplate,
  EmailTemplateSummary,
  FaqItem,
  GenreAdminItem,
  DashboardAnalytics,
  PaymentAuditLog,
  PaymentRecord,
  ReportsOverview,
  StoryChapterDetail,
  StoryCommentDetail,
  StoryEpisodeDetail,
  SubscriptionOverview,
  SubscriptionRecord,
  SupportItem,
  TermsItem,
} from "@/types/admin";

type GenresListPayload = string[] | { genres?: string[] };

function normalizeGenreNames(
  payload: GenresListPayload | null | undefined,
): string[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  return payload.genres ?? [];
}

export const adminApi = {
  login: (email: string, password: string) =>
    apiRequest<AdminLoginResponse>("admin/login", {
      method: "POST",
      body: { email, password },
      auth: false,
    }),

  logout: () =>
    apiRequest<{ message: string }>("auth/logout", { method: "POST" }),

  getProfile: () =>
    apiRequest<{ message: string; admin: AdminUser }>("admin/profile"),

  getReportsOverview: () =>
    apiRequest<{ message: string; report: ReportsOverview }>(
      "admin/reports/overview",
    ),

  getDashboardAnalytics: (days = 30) =>
    apiRequest<{ message: string; analytics: DashboardAnalytics }>(
      `admin/analytics/dashboard?days=${days}`,
    ),

  getUsers: () =>
    apiRequest<{ message: string; count: number; users: AppUser[] }>(
      "admin/users",
    ),

  suspendUser: (id: string) =>
    apiRequest<{ message: string }>(`admin/users/${id}/suspend`, {
      method: "PATCH",
    }),

  unsuspendUser: (id: string) =>
    apiRequest<{ message: string }>(`admin/users/${id}/unsuspend`, {
      method: "PATCH",
    }),

  deleteUser: (id: string) =>
    apiRequest<{ message: string }>(`admin/users/${id}`, { method: "DELETE" }),

  getStories: (params?: {
    page?: number;
    limit?: number;
    genres?: string[];
  }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    params?.genres?.forEach((g) => search.append("genres", g));
    const qs = search.toString();
    return apiRequest<{
      stories: AdminStory[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`admin/stories${qs ? `?${qs}` : ""}`);
  },

  updateStory: (id: string, data: Partial<AdminStory>) =>
    apiRequest<{ message: string; story: AdminStory }>(`admin/stories/${id}`, {
      method: "PATCH",
      body: data,
    }),

  suspendStory: (id: string) =>
    apiRequest<{ message: string }>(`admin/stories/${id}/suspend`, {
      method: "PATCH",
    }),

  unsuspendStory: (id: string) =>
    apiRequest<{ message: string }>(`admin/stories/${id}/unsuspend`, {
      method: "PATCH",
    }),

  deleteStory: (id: string) =>
    apiRequest<{ message: string }>(`admin/stories/${id}`, {
      method: "DELETE",
    }),

  getStory: (id: string) => apiRequest<AdminStoryDetail>(`stories/${id}`),

  getStoryChapters: (id: string) =>
    apiRequest<StoryChapterDetail[]>(`stories/${id}/chapters`),

  getStoryEpisodes: (id: string) =>
    apiRequest<StoryEpisodeDetail[]>(`stories/${id}/episodes`),

  getStoryComments: (id: string) =>
    apiRequest<StoryCommentDetail[]>(`stories/${id}/comments`),

  getEpisodes: () =>
    apiRequest<{ episodes: AdminEpisode[]; count: number }>("admin/episodes"),

  getEpisode: (id: string) => apiRequest<AdminEpisode>(`admin/episodes/${id}`),

  updateEpisode: (
    id: string,
    data: Partial<Pick<AdminEpisode, "title" | "content" | "episodeNumber">>,
  ) =>
    apiRequest<AdminEpisode>(`admin/episodes/${id}`, {
      method: "PUT",
      body: data,
    }),

  deleteEpisode: (id: string) =>
    apiRequest<{ message: string }>(`admin/episodes/${id}`, {
      method: "DELETE",
    }),

  getChapters: () =>
    apiRequest<{ chapters: AdminChapter[]; count: number }>("admin/chapters"),

  getChapter: (id: string) => apiRequest<AdminChapter>(`admin/chapters/${id}`),

  updateChapter: (
    id: string,
    data: Partial<Pick<AdminChapter, "title" | "content" | "chapterNumber">>,
  ) =>
    apiRequest<AdminChapter>(`admin/chapters/${id}`, {
      method: "PUT",
      body: data,
    }),

  deleteChapter: (id: string) =>
    apiRequest<{ message: string }>(`admin/chapters/${id}`, {
      method: "DELETE",
    }),

  getComments: (type?: AdminCommentType) => {
    const qs = type ? `?type=${type}` : "";
    return apiRequest<{ comments: AdminComment[]; count: number }>(
      `admin/comments${qs}`,
    );
  },

  getComment: (type: AdminCommentType, id: string) =>
    apiRequest<AdminComment>(`admin/comments/${type}/${id}`),

  updateComment: (
    type: AdminCommentType,
    id: string,
    data: { content: string },
  ) =>
    apiRequest<AdminComment>(`admin/comments/${type}/${id}`, {
      method: "PUT",
      body: data,
    }),

  deleteComment: (type: AdminCommentType, id: string) => {
    switch (type) {
      case "episode":
        return apiRequest<{ message: string }>(`admin/comments/episode/${id}`, {
          method: "DELETE",
        });
      case "chapter":
        return apiRequest<{ message: string }>(`admin/comments/chapter/${id}`, {
          method: "DELETE",
        });
      default:
        return apiRequest<{ message: string }>(`admin/comments/story/${id}`, {
          method: "DELETE",
        });
    }
  },

  deleteStoryComment: (id: string) =>
    apiRequest<{ message: string }>(`admin/comments/story/${id}`, {
      method: "DELETE",
    }),

  deleteEpisodeComment: (id: string) =>
    apiRequest<{ message: string }>(`admin/comments/episode/${id}`, {
      method: "DELETE",
    }),

  deleteChapterComment: (id: string) =>
    apiRequest<{ message: string }>(`admin/comments/chapter/${id}`, {
      method: "DELETE",
    }),

  getAdmins: async () => {
    const result = await apiRequest<
      { message: string; count: number; admins: AdminUser[] } | AdminUser[]
    >("admin");
    return Array.isArray(result) ? result : (result.admins ?? []);
  },

  getAdmin: (id: string) =>
    apiRequest<{ message: string; admin: AdminUser }>(`admin/${id}`),

  createAdmin: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
  }) =>
    apiRequest<{ message: string; admin: AdminUser }>("admin", {
      method: "POST",
      body: data,
    }),

  updateAdmin: (
    id: string,
    data: Partial<Pick<AdminUser, "firstName" | "lastName" | "email" | "role">>,
  ) =>
    apiRequest<{ message: string; admin: AdminUser }>(`admin/${id}`, {
      method: "PATCH",
      body: data,
    }),

  suspendAdmin: (id: string) =>
    apiRequest<{ message: string }>(`admin/${id}/suspend`, { method: "PATCH" }),

  unsuspendAdmin: (id: string) =>
    apiRequest<{ message: string }>(`admin/${id}/unsuspend`, {
      method: "PATCH",
    }),

  deleteAdmin: (id: string) =>
    apiRequest<{ message: string }>(`admin/${id}`, { method: "DELETE" }),

  sendNotification: (data: {
    title: string;
    message: string;
    type: string;
    userId?: string;
    email?: string;
    sendEmail?: boolean;
  }) =>
    apiRequest<{ message: string }>("admin/notifications", {
      method: "POST",
      body: data,
    }),

  sendBulkNotification: (data: {
    title: string;
    message: string;
    type: string;
    emails?: string[];
    userIds?: string[];
    sendEmail?: boolean;
  }) =>
    apiRequest<{
      message: string;
      created: number;
      failed: number;
      externalEmailsSent?: number;
    }>("admin/notifications/bulk", { method: "POST", body: data }),

  getSubscriptionOverview: () =>
    apiRequest<SubscriptionOverview>("admin/subscriptions/overview"),

  getPayments: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
  }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.status) search.set("status", params.status);
    if (params?.userId) search.set("userId", params.userId);
    const qs = search.toString();
    return apiRequest<{
      payments: PaymentRecord[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`admin/subscriptions/payments${qs ? `?${qs}` : ""}`);
  },

  getSubscriptionRecords: (params?: { page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    const qs = search.toString();
    return apiRequest<{
      subscriptions: SubscriptionRecord[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`admin/subscriptions/records${qs ? `?${qs}` : ""}`);
  },

  getSubscriptionAuditLogs: (params?: { page?: number; limit?: number }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    const qs = search.toString();
    return apiRequest<{
      items: PaymentAuditLog[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`admin/subscriptions/audit-logs${qs ? `?${qs}` : ""}`);
  },

  getEmailTemplates: () =>
    apiRequest<EmailTemplateSummary[]>("admin/email-templates"),

  getEmailTemplate: (slug: string) =>
    apiRequest<EmailTemplate>(`admin/email-templates/${slug}`),

  updateEmailTemplate: (
    slug: string,
    data: Partial<
      Pick<EmailTemplate, "subject" | "bodyHtml" | "bodyText" | "isActive">
    >,
  ) =>
    apiRequest<EmailTemplate>(`admin/email-templates/${slug}`, {
      method: "PUT",
      body: data,
    }),

  previewEmailTemplate: (slug: string, variables?: Record<string, string>) =>
    apiRequest<{ subject: string; html: string; text?: string }>(
      `admin/email-templates/${slug}/preview`,
      { method: "POST", body: { variables: variables ?? {} } },
    ),

  getEmailDeliveryLogs: (params?: {
    page?: number;
    limit?: number;
    templateSlug?: string;
  }) => {
    const search = new URLSearchParams();
    if (params?.page) search.set("page", String(params.page));
    if (params?.limit) search.set("limit", String(params.limit));
    if (params?.templateSlug) search.set("templateSlug", params.templateSlug);
    const qs = search.toString();
    return apiRequest<{ data: EmailDeliveryLog[]; total: number }>(
      `admin/email-templates/delivery-logs${qs ? `?${qs}` : ""}`,
    );
  },

  getFaqs: () => apiRequest<FaqItem[]>("faqs/admin/all"),

  createFaq: (data: Partial<FaqItem>) =>
    apiRequest<FaqItem>("faqs", { method: "POST", body: data }),

  updateFaq: (id: string, data: Partial<FaqItem>) =>
    apiRequest<FaqItem>(`faqs/${id}`, { method: "PUT", body: data }),

  deleteFaq: (id: string) =>
    apiRequest<{ message: string }>(`faqs/${id}`, { method: "DELETE" }),

  getSupport: () => apiRequest<SupportItem[]>("support/admin/all"),

  createSupport: (data: Partial<SupportItem>) =>
    apiRequest<SupportItem>("support", { method: "POST", body: data }),

  updateSupport: (id: string, data: Partial<SupportItem>) =>
    apiRequest<SupportItem>(`support/${id}`, { method: "PUT", body: data }),

  deleteSupport: (id: string) =>
    apiRequest<{ message: string }>(`support/${id}`, { method: "DELETE" }),

  getTerms: () => apiRequest<TermsItem[]>("terms-and-policy/admin/all"),

  createTerms: (data: Partial<TermsItem>) =>
    apiRequest<TermsItem>("terms-and-policy", { method: "POST", body: data }),

  updateTerms: (id: string, data: Partial<TermsItem>) =>
    apiRequest<TermsItem>(`terms-and-policy/${id}`, {
      method: "PUT",
      body: data,
    }),

  deleteTerms: (id: string) =>
    apiRequest<{ message: string }>(`terms-and-policy/${id}`, {
      method: "DELETE",
    }),

  getGenres: async () => {
    const res = await apiRequest<GenresListPayload>("stories/genres");
    return normalizeGenreNames(res);
  },

  getAvailableGenres: async () => {
    try {
      const adminRes = await apiRequest<{
        genres?: GenreAdminItem[];
      }>("admin/genres");
      const fromAdmin = (adminRes.genres ?? [])
        .filter((genre) => genre.isActive)
        .map((genre) => genre.name);
      if (fromAdmin.length > 0) return fromAdmin;
    } catch {
      // Fall back to public endpoint when admin route is unavailable.
    }

    const res = await apiRequest<GenresListPayload>("stories/genres");
    return normalizeGenreNames(res);
  },

  getAdminGenres: () =>
    apiRequest<{
      message: string;
      genres: GenreAdminItem[];
      count: number;
    }>("admin/genres"),

  createGenre: (data: {
    name: string;
    sortOrder?: number;
    isActive?: boolean;
  }) =>
    apiRequest<{ message: string; genre: GenreAdminItem }>("admin/genres", {
      method: "POST",
      body: data,
    }),

  updateGenre: (
    id: string,
    data: Partial<{
      name: string;
      sortOrder: number;
      isActive: boolean;
    }>,
  ) =>
    apiRequest<{ message: string; genre: GenreAdminItem }>(
      `admin/genres/${id}`,
      { method: "PATCH", body: data },
    ),

  deleteGenre: (id: string) =>
    apiRequest<{ message: string }>(`admin/genres/${id}`, {
      method: "DELETE",
    }),
};
