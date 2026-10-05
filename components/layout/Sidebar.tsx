"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mainNav, secondaryNav } from "@/components/layout/navigation";
import { BrandMark } from "@/components/layout/Brand";
import { cn } from "@/lib/utils";

/**
 * Sidebar — desktop navigation.
 *
 * A Client Component because it uses `usePathname()` to know which page is
 * active. That's the one thing a server component cannot do: the active route
 * is only known on the client during navigation.
 *
 * Active-page detection compares `pathname === href`, so this remains correct
 * for the flat routes built so far.
 */
export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  const isActive = (href: string) => pathname === href;

  return (
    <aside
      className={cn(
        "hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex",
        className
      )}
    >
      <div className="flex h-16 items-center px-6">
        <Link href="/dashboard" aria-label="StudyPilot home">
          <BrandMark />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-subtle">
          Study
        </p>
        {mainNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
          />
        ))}

        <p className="px-3 pt-6 pb-2 text-xs font-semibold uppercase tracking-wider text-subtle">
          Account
        </p>
        {secondaryNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item.href)}
          />
        ))}
      </nav>

      {/* Development-phase notice. This banner is removed once real
          authentication replaces the placeholder identity below. */}
      <div className="m-3 rounded-card border border-dashed border-border-strong bg-surface-muted p-3">
        <p className="text-xs font-semibold text-foreground">Development preview</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted">
          Navigation and layout only. No account is signed in yet.
        </p>
      </div>
    </aside>
  );
}

function NavLink({
  item,
  active,
}: {
  item: (typeof mainNav)[number];
  active: boolean;
}) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-field px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-primary-soft text-primary"
          : "text-muted hover:bg-surface-muted hover:text-foreground"
      )}
    >
      <Icon className="size-4.5 shrink-0" aria-hidden="true" />
      {item.label}
    </Link>
  );
}