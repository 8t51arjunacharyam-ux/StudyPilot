"use client";

import { Bell, Menu, Search } from "lucide-react";
import { BrandMark } from "@/components/layout/Brand";

/**
 * Topbar - the upper application bar.
 *
 * The signed-in identity is passed in as a prop by the Server Component that
 * renders this, so the user's name is fetched on the server and never requires
 * a client-side fetch.
 */
export function Topbar({
  onOpenNav,
  userName,
  userEmail,
}: {
  onOpenNav?: () => void;
  userName?: string | null;
  userEmail?: string | null;
}) {
  // Initials for the avatar: "Alex Student" -> "AS", "alex" -> "A".
  const initials = (userName ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const displayName = userName || userEmail || "Student";

  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center gap-4 border-b border-border bg-surface/80 px-6 backdrop-blur-md lg:flex">
      <button
        type="button"
        onClick={onOpenNav}
        className="hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" aria-hidden="true" />
      </button>

      <div className="lg:hidden">
        <BrandMark size="sm" />
      </div>

      {/* Search is presentational in this phase - no data source yet. */}
      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search subjects, topics..."
          aria-label="Search"
          disabled
          className="h-9 w-full rounded-field border border-border bg-background pr-3 pl-9 text-sm outline-none placeholder:text-subtle"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          disabled
          className="flex size-9 items-center justify-center rounded-field text-muted"
          aria-label="Notifications (not implemented yet)"
        >
          <Bell className="size-4.5" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2.5 border-l border-border pl-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm leading-tight font-medium">{displayName}</p>
            {userEmail && (
              <p className="text-xs leading-tight text-subtle">{userEmail}</p>
            )}
          </div>
          <div
            className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
            aria-hidden="true"
          >
            {initials || "S"}
          </div>
        </div>
      </div>
    </header>
  );
}