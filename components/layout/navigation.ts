import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarDays,
  BookOpen,
  CalendarCheck,
  TrendingUp,
  Settings,
} from "lucide-react";

/**
 * Navigation configuration.
 *
 * Kept as data rather than duplicated JSX in three places (sidebar, mobile
 * nav, topbar). One list means adding a page means adding one entry, and the
 * nav can never drift out of sync with itself.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/plan", label: "Study Plan", icon: CalendarDays },
  { href: "/subjects", label: "Subjects", icon: BookOpen },
  { href: "/exams", label: "Exams", icon: CalendarCheck },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

export const secondaryNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];