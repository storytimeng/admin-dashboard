import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Shield,
  CreditCard,
  Bell,
  MessageSquare,
  Layers,
  FileText,
  HelpCircle,
  Headphones,
  Mail,
  ScrollText,
  Tag,
  Star,
  Mic,
  Trash2,
  TrendingUp,
  BookX,
  Wallet,
  BarChart3,
  ShieldCheck,
  Images,
  DatabaseBackup,
} from "lucide-react";

export type NavModule =
  | "analytics"
  | "moderation"
  | "users"
  | "admins"
  | "subscriptions"
  | "email"
  | "support"
  | "system"
  | "security";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  module: NavModule;
}

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard, module: "analytics" },
  {
    title: "Google Analytics",
    href: "/google-analytics",
    icon: BarChart3,
    module: "analytics",
  },
  { title: "Narration", href: "/narration", icon: Mic, module: "moderation" },
  {
    title: "Media Library",
    href: "/media",
    icon: Images,
    module: "moderation",
  },
  { title: "Stories", href: "/stories", icon: BookOpen, module: "moderation" },
  { title: "Genres", href: "/genres", icon: Tag, module: "moderation" },
  {
    title: "Popularity",
    href: "/popularity",
    icon: TrendingUp,
    module: "system",
  },
  {
    title: "Database Backups",
    href: "/backups",
    icon: DatabaseBackup,
    module: "system",
  },
  { title: "Episodes", href: "/episodes", icon: Layers, module: "moderation" },
  { title: "Chapters", href: "/chapters", icon: FileText, module: "moderation" },
  { title: "Users", href: "/users", icon: Users, module: "users" },
  {
    title: "Deletion Requests",
    href: "/deletion-requests",
    icon: Trash2,
    module: "support",
  },
  {
    title: "Story Removals",
    href: "/story-deletion-requests",
    icon: BookX,
    module: "moderation",
  },
  { title: "Ambassadors", href: "/ambassadors", icon: Star, module: "email" },
  { title: "Admins", href: "/admins", icon: Shield, module: "admins" },
  {
    title: "Subscriptions",
    href: "/subscriptions",
    icon: CreditCard,
    module: "subscriptions",
  },
  {
    title: "App Billing",
    href: "/billing",
    icon: Wallet,
    module: "subscriptions",
  },
  {
    title: "Notifications",
    href: "/notifications",
    icon: Bell,
    module: "email",
  },
  { title: "Comments", href: "/comments", icon: MessageSquare, module: "moderation" },
  {
    title: "Email Templates",
    href: "/email-templates",
    icon: Mail,
    module: "email",
  },
  {
    title: "Mail Providers",
    href: "/email-providers",
    icon: Mail,
    module: "email",
  },
  { title: "FAQs", href: "/faqs", icon: HelpCircle, module: "support" },
  { title: "Support", href: "/support", icon: Headphones, module: "support" },
  {
    title: "Terms & Policy",
    href: "/terms",
    icon: ScrollText,
    module: "support",
  },
  {
    title: "Security & 2FA",
    href: "/security",
    icon: ShieldCheck,
    module: "security",
  },
];
