import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarRange,
  BookOpen,
  CalendarCheck,
  Brain,
  BarChart3,
  Settings,
} from "lucide-react";

/**
 * Navigation configuration.
 *
 * Kept as data rather than duplicated JSX in three places (sidebar, mobile
 * nav, topbar). One list means adding a page means adding one entry, and the
 * nav can never drift out of sync with itself.
 *
 * Every href below corresponds to a real route inside app/(app)/, so no link
 * can ever point at a 404.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const mainNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planner", label: "Planner", icon: CalendarRange },
  { href: "/subjects", label: "Subjects", icon: BookOpen },
  { href: "/exams", label: "Exams", icon: CalendarCheck },
  { href: "/memory", label: "Memory", icon: Brain },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
];

export const secondaryNav: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];