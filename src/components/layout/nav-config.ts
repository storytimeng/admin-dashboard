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
} from "lucide-react";

export type NavModule = "core" | "subscriptions" | "email" | "content";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  module: NavModule;
}

export const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard, module: "core" },
  { title: "Narration", href: "/narration", icon: Mic, module: "core" },
  { title: "Stories", href: "/stories", icon: BookOpen, module: "core" },
  { title: "Genres", href: "/genres", icon: Tag, module: "core" },
  {
    title: "Popularity",
    href: "/popularity",
    icon: TrendingUp,
    module: "core",
  },
  { title: "Episodes", href: "/episodes", icon: Layers, module: "core" },
  { title: "Chapters", href: "/chapters", icon: FileText, module: "core" },
  { title: "Users", href: "/users", icon: Users, module: "core" },
  {
    title: "Deletion Requests",
    href: "/deletion-requests",
    icon: Trash2,
    module: "core",
  },
  {
    title: "Story Removals",
    href: "/story-deletion-requests",
    icon: BookX,
    module: "core",
  },
  { title: "Ambassadors", href: "/ambassadors", icon: Star, module: "core" },
  { title: "Admins", href: "/admins", icon: Shield, module: "core" },
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
    module: "core",
  },
  { title: "Comments", href: "/comments", icon: MessageSquare, module: "core" },
  {
    title: "Email Templates",
    href: "/email-templates",
    icon: Mail,
    module: "email",
  },
  { title: "FAQs", href: "/faqs", icon: HelpCircle, module: "content" },
  { title: "Support", href: "/support", icon: Headphones, module: "content" },
  {
    title: "Terms & Policy",
    href: "/terms",
    icon: ScrollText,
    module: "content",
  },
];
