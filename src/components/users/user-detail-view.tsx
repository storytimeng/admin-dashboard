"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useProtectedSWR } from "@/hooks/use-protected-swr";
import {
  ArrowLeft,
  Award,
  BookOpen,
  Crown,
  Heart,
  ImagePlus,
  KeyRound,
  Loader2,
  MessageSquare,
  Pencil,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { MetaItem } from "@/components/content/html-content-block";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminApi } from "@/lib/api/admin";
import { moderationActionMessage } from "@/lib/moderation-action-message";
import { MediaPickerDialog } from "@/components/media/media-picker-dialog";

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
        {sub ? (
          <p className="text-xs text-muted-foreground mt-1">{sub}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

interface UserDetailViewProps {
  userId: string;
}

export function UserDetailView({ userId }: UserDetailViewProps) {
  const router = useRouter();
  const [confirmAction, setConfirmAction] = useState<
    "suspend" | "unsuspend" | "delete" | "reset-password" | null
  >(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [avatarUpdating, setAvatarUpdating] = useState(false);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    penName: "",
    email: "",
    bio: "",
    genres: "",
    isEmailVerified: false,
    isPremium: false,
    pushNotificationsEnabled: true,
    loginNotificationsEnabled: true,
    timeToRead: "",
    timeToWrite: "",
    timezone: "",
  });

  const openEditModal = () => {
    if (!data?.user) return;
    const u = data.user as any;
    setEditForm({
      firstName: u.firstName ?? "",
      lastName: u.lastName ?? "",
      penName: u.penName ?? "",
      email: u.email ?? "",
      bio: u.bio ?? "",
      genres: Array.isArray(u.genres) ? u.genres.join(", ") : "",
      isEmailVerified: Boolean(u.isEmailVerified),
      isPremium: Boolean(u.isPremium),
      pushNotificationsEnabled: u.pushNotificationsEnabled !== false,
      loginNotificationsEnabled: u.loginNotificationsEnabled !== false,
      timeToRead: u.timeToRead ?? "",
      timeToWrite: u.timeToWrite ?? "",
      timezone: u.timezone ?? "",
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      await adminApi.updateUser(userId, {
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        penName: editForm.penName.trim() || undefined,
        email: editForm.email.trim(),
        bio: editForm.bio.trim(),
        genres: editForm.genres
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean),
        isEmailVerified: editForm.isEmailVerified,
        isPremium: editForm.isPremium,
        pushNotificationsEnabled: editForm.pushNotificationsEnabled,
        loginNotificationsEnabled: editForm.loginNotificationsEnabled,
        timeToRead: editForm.timeToRead.trim() || null,
        timeToWrite: editForm.timeToWrite.trim() || null,
        timezone: editForm.timezone.trim() || null,
      });
      toast.success("User updated successfully");
      setEditOpen(false);
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setEditSaving(false);
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarUpdating(true);
    try {
      const uploaded = await adminApi.uploadAdminImage(file, "users/avatars");
      await adminApi.updateUserAvatar(userId, uploaded.imageUrl);
      toast.success("User profile photo updated");
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update profile photo",
      );
    } finally {
      setAvatarUpdating(false);
      event.target.value = "";
    }
  };

  const handleDeleteAvatar = async () => {
    setAvatarUpdating(true);
    try {
      await adminApi.deleteUserAvatar(userId);
      toast.success("User profile photo removed");
      await mutate();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove profile photo",
      );
    } finally {
      setAvatarUpdating(false);
    }
  };

  const { data, isLoading, error, mutate } = useProtectedSWR(
    ["admin-user", userId],
    () => adminApi.getUser(userId),
  );

  const runAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      if (confirmAction === "suspend") await adminApi.suspendUser(userId);
      if (confirmAction === "unsuspend") await adminApi.unsuspendUser(userId);
      if (confirmAction === "delete") {
        await adminApi.deleteUser(userId);
        toast.success("User removed");
        router.push("/users");
        return;
      }
      if (confirmAction === "reset-password") {
        await adminApi.sendPasswordResetEmail(data!.user.email);
        toast.success(`Password reset email sent to ${data!.user.email}`);
        setConfirmAction(null);
        return;
      }
      toast.success(moderationActionMessage("User", confirmAction));
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" render={<Link href="/users" />}>
          <ArrowLeft className="mr-2 size-4" />
          Back to users
        </Button>
        <p className="text-destructive">User not found or failed to load.</p>
      </div>
    );
  }

  const { user, reading, writing, engagement, achievements } = data;
  const displayName =
    user.penName ||
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link href="/users" />}>
        <ArrowLeft className="mr-2 size-4" />
        Users
      </Button>

      <PageHeader
        title={displayName}
        description={user.email}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={openEditModal}>
              <Pencil className="mr-2 size-4" />
              Edit User
            </Button>
            {user.isSuspended ? (
              <Button
                variant="outline"
                onClick={() => setConfirmAction("unsuspend")}
              >
                Unsuspend
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => setConfirmAction("suspend")}
              >
                Suspend
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setConfirmAction("reset-password")}
            >
              <KeyRound className="mr-2 size-4" />
              Send password reset
            </Button>
            <Button
              variant="destructive"
              onClick={() => setConfirmAction("delete")}
            >
              <Trash2 className="mr-2 size-4" />
              Delete
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-4">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleAvatarUpload}
          />
          {user.profilePicture || user.avatar ? (
            <img
              src={user.profilePicture || user.avatar || ""}
              alt={displayName}
              className="size-16 rounded-full border object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full border bg-muted text-muted-foreground">
              <UserIcon className="size-7 opacity-50" />
            </div>
          )}
          <div className="space-y-1">
            <p className="text-sm font-medium">Profile Photo</p>
            <p className="text-xs text-muted-foreground">
              Upload a replacement photo or remove the current avatar.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => avatarInputRef.current?.click()}
            disabled={avatarUpdating}
          >
            {avatarUpdating ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <ImagePlus className="mr-1.5 size-3.5" />
            )}
            {user.profilePicture || user.avatar ? "Change photo" : "Upload photo"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAvatarPickerOpen(true)}
            disabled={avatarUpdating}
          >
            Choose from Library
          </Button>
          {user.profilePicture || user.avatar ? (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={handleDeleteAvatar}
              disabled={avatarUpdating}
            >
              <Trash2 className="mr-1.5 size-3.5" />
              Remove photo
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {user.isPremium ? (
          <Badge className="gap-1">
            <Crown className="size-3" />
            Premium
          </Badge>
        ) : null}
        {user.isSuspended ? (
          <Badge variant="destructive">Suspended</Badge>
        ) : (
          <Badge variant="outline" className="text-green-700 border-green-200">
            Active
          </Badge>
        )}
        {user.isEmailVerified ? (
          <Badge variant="secondary">Email verified</Badge>
        ) : (
          <Badge variant="outline">Email unverified</Badge>
        )}
        {reading.levelTitle ? (
          <Badge variant="outline">Reader: {reading.levelTitle}</Badge>
        ) : null}
        {writing.levelTitle ? (
          <Badge variant="outline">Writer: {writing.levelTitle}</Badge>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard label="Stories read" value={reading.storiesRead} />
        <StatCard label="Stories written" value={writing.storiesWritten} />
        <StatCard label="Episodes" value={writing.episodesWritten} />
        <StatCard label="Chapters" value={writing.chaptersWritten} />
        <StatCard label="Likes received" value={engagement.likesReceived} />
        <StatCard
          label="Comments received"
          value={engagement.commentsReceived}
        />
        <StatCard label="Reads on stories" value={engagement.readsOnStories} />
        <StatCard
          label="Reading time"
          value={`${reading.progress.totalReadingTimeHours}h`}
          sub={`${reading.progress.completedStories} completed`}
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reading">Reading</TabsTrigger>
          <TabsTrigger value="writing">Writing</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Profile</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <MetaItem
                  label="Full name"
                  value={`${user.firstName} ${user.lastName}`}
                />
                <MetaItem label="Pen name" value={user.penName || "—"} />
                <MetaItem label="Email" value={user.email} />
                <MetaItem
                  label="Date of birth"
                  value={
                    user.dateOfBirth
                      ? format(new Date(user.dateOfBirth), "MMM d, yyyy")
                      : "—"
                  }
                />
                <MetaItem
                  label="Genres"
                  value={
                    user.genres?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {user.genres.map((g) => (
                          <Badge key={g} variant="secondary">
                            {g}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )
                  }
                />
                <MetaItem
                  label="Preferred currency"
                  value={user.preferredCurrency || "NGN"}
                />
                <MetaItem
                  label="Reading time preference"
                  value={user.timeToRead || "—"}
                />
                <MetaItem
                  label="Writing time preference"
                  value={user.timeToWrite || "—"}
                />
                <MetaItem label="Reminder" value={user.reminder || "—"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Account activity</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <MetaItem
                  label="Joined"
                  value={
                    user.createdAt
                      ? format(new Date(user.createdAt), "MMM d, yyyy")
                      : "—"
                  }
                />
                <MetaItem
                  label="Last active"
                  value={
                    user.lastActiveAt
                      ? formatDistanceToNow(new Date(user.lastActiveAt), {
                          addSuffix: true,
                        })
                      : "—"
                  }
                />
                <MetaItem
                  label="Last login"
                  value={
                    user.lastLoginAt
                      ? formatDistanceToNow(new Date(user.lastLoginAt), {
                          addSuffix: true,
                        })
                      : "—"
                  }
                />
                <MetaItem
                  label="Premium expires"
                  value={
                    user.isPremium && user.premiumExpiresAt
                      ? format(new Date(user.premiumExpiresAt), "MMM d, yyyy")
                      : user.isPremium
                        ? "Active"
                        : "—"
                  }
                />
                {user.bio ? (
                  <div className="sm:col-span-2 space-y-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Bio
                    </p>
                    <p className="text-sm whitespace-pre-wrap">{user.bio}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reading" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Stories read" value={reading.storiesRead} />
            <StatCard
              label="Reader level"
              value={reading.levelTitle || "—"}
              sub={
                reading.nextReaderMilestone
                  ? `Next milestone: ${reading.nextReaderMilestone} reads`
                  : "Max milestone reached"
              }
            />
            <StatCard
              label="In progress"
              value={reading.progress.totalStoriesInProgress}
            />
            <StatCard
              label="Reading time"
              value={`${reading.progress.totalReadingTimeMinutes} min`}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Recent reading history
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reading.recentHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No reading history yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Story</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead className="text-right">Read</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reading.recentHistory.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {entry.story ? (
                            <Link
                              href={`/stories/${entry.story.id}`}
                              className="font-medium hover:text-primary hover:underline"
                            >
                              {entry.story.title}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {entry.story?.authorPenName || "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {entry.readAt
                            ? formatDistanceToNow(new Date(entry.readAt), {
                                addSuffix: true,
                              })
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="writing" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Published" value={writing.publishedStories} />
            <StatCard label="Drafts" value={writing.draftsCount} />
            <StatCard label="Episodes" value={writing.episodesWritten} />
            <StatCard label="Chapters" value={writing.chaptersWritten} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Writer progress</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <MetaItem
                label="Writer level"
                value={writing.levelTitle || "No certificate yet"}
              />
              <MetaItem
                label="Next milestone"
                value={
                  writing.nextWriterMilestone
                    ? `${writing.nextWriterMilestone} stories written`
                    : "Max milestone reached"
                }
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent stories</CardTitle>
            </CardHeader>
            <CardContent>
              {writing.recentStories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No stories yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">
                        <Heart className="inline size-3.5" />
                      </TableHead>
                      <TableHead className="text-right">
                        <MessageSquare className="inline size-3.5" />
                      </TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {writing.recentStories.map((story) => (
                      <TableRow key={story.id}>
                        <TableCell className="font-medium max-w-xs truncate">
                          {story.title}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {story.storyStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {story.likeCount}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {story.commentCount}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            render={<Link href={`/stories/${story.id}`} />}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard
              label="Badges earned"
              value={achievements.badgesCount}
              sub={reading.levelTitle || undefined}
            />
            <StatCard
              label="Certificates earned"
              value={achievements.certificatesCount}
              sub={writing.levelTitle || undefined}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="size-4" />
                Reader badges
              </CardTitle>
            </CardHeader>
            <CardContent>
              {achievements.badges.length === 0 ? (
                <p className="text-sm text-muted-foreground">No badges yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {achievements.badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      {badge.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={badge.imageUrl}
                          alt={badge.title}
                          className="size-12 object-contain"
                        />
                      ) : (
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                          <BookOpen className="size-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">{badge.title}</p>
                        {badge.milestone ? (
                          <p className="text-xs text-muted-foreground">
                            {badge.milestone} stories read
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Pencil className="size-4" />
                Writer certificates
              </CardTitle>
            </CardHeader>
            <CardContent>
              {achievements.certificates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No certificates yet.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {achievements.certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="rounded-lg border overflow-hidden"
                    >
                      {cert.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cert.imageUrl}
                          alt={cert.title}
                          className="w-full h-auto"
                        />
                      ) : (
                        <div className="p-4 text-sm font-medium">
                          {cert.title}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={
          confirmAction === "delete"
            ? "Delete user?"
            : confirmAction === "suspend"
              ? "Suspend user?"
              : confirmAction === "unsuspend"
                ? "Unsuspend user?"
                : "Send password reset?"
        }
        description={
          confirmAction === "reset-password"
            ? `A password reset email will be sent to ${user.email}. They will receive a link to set a new password.`
            : `This will ${confirmAction} ${user.email}.`
        }
        confirmLabel={
          confirmAction === "delete"
            ? "Delete"
            : confirmAction === "suspend"
              ? "Suspend"
              : confirmAction === "unsuspend"
                ? "Unsuspend"
                : "Send email"
        }
        destructive={confirmAction === "delete" || confirmAction === "suspend"}
        loading={actionLoading}
        onConfirm={runAction}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit User Details &amp; Settings</DialogTitle>
            <DialogDescription>
              Update profile information, notification preferences, and account
              flags.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>First Name</Label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, firstName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Last Name</Label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, lastName: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Pen Name</Label>
                <Input
                  value={editForm.penName}
                  onChange={(e) =>
                    setEditForm({ ...editForm, penName: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Bio</Label>
              <Textarea
                rows={3}
                value={editForm.bio}
                onChange={(e) =>
                  setEditForm({ ...editForm, bio: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Genres (comma-separated)</Label>
              <Input
                value={editForm.genres}
                onChange={(e) =>
                  setEditForm({ ...editForm, genres: e.target.value })
                }
                placeholder="Romance, Fantasy, Thriller"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Time to Read</Label>
                <Input
                  value={editForm.timeToRead}
                  onChange={(e) =>
                    setEditForm({ ...editForm, timeToRead: e.target.value })
                  }
                  placeholder="20:00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Time to Write</Label>
                <Input
                  value={editForm.timeToWrite}
                  onChange={(e) =>
                    setEditForm({ ...editForm, timeToWrite: e.target.value })
                  }
                  placeholder="09:00"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Timezone</Label>
                <Input
                  value={editForm.timezone}
                  onChange={(e) =>
                    setEditForm({ ...editForm, timezone: e.target.value })
                  }
                  placeholder="Africa/Lagos"
                />
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-2.5">
                <Label className="text-xs">Email Verified</Label>
                <Switch
                  checked={editForm.isEmailVerified}
                  onCheckedChange={(v) =>
                    setEditForm({ ...editForm, isEmailVerified: v })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-2.5">
                <Label className="text-xs">Premium</Label>
                <Switch
                  checked={editForm.isPremium}
                  onCheckedChange={(v) =>
                    setEditForm({ ...editForm, isPremium: v })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-2.5">
                <Label className="text-xs">Push Notifications</Label>
                <Switch
                  checked={editForm.pushNotificationsEnabled}
                  onCheckedChange={(v) =>
                    setEditForm({ ...editForm, pushNotificationsEnabled: v })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-2.5">
                <Label className="text-xs">Login Notifications</Label>
                <Switch
                  checked={editForm.loginNotificationsEnabled}
                  onCheckedChange={(v) =>
                    setEditForm({ ...editForm, loginNotificationsEnabled: v })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editSaving}>
                {editSaving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <MediaPickerDialog
        open={avatarPickerOpen}
        onOpenChange={setAvatarPickerOpen}
        defaultFolder="users/avatars"
        title="Choose Profile Photo from Media Library"
        onSelect={async (item) => {
          setAvatarUpdating(true);
          try {
            await adminApi.updateUserAvatar(userId, item.url);
            toast.success("User profile photo updated from Media Library");
            await mutate();
          } catch (err) {
            toast.error(
              err instanceof Error ? err.message : "Failed to update photo",
            );
          } finally {
            setAvatarUpdating(false);
          }
        }}
      />
    </div>
  );
}
