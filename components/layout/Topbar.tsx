"use client";

import { Bell, Menu, Search } from "lucide-react";
import { BrandMark } from "@/components/layout/Brand";

/**
 * Topbar — the upper application bar.
 *
 * Hidden on mobile, where space is tight; the mobile header carries the
 * menu button instead. On desktop it holds search, notifications, and the
 * identity area.
 *
 * The `onOpenNav` callback toggles the mobile nav drawer. Because it is a
 * function, this must be a Client Component.
 */
export function Topbar({ onOpenNav }: { onOpenNav?: () => void }) {
  return (
    <header className="sticky top-0 z-30 hidden h-16 items-center gap-4 border-b border-border bg-surface/80 px-6 backdrop-blur-md lg:flex">
      {/* Mobile menu button is rendered here by the shell on small
          screens; on desktop the sidebar is always visible. */}
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

      {/* Search is presentational in this phase — no data source yet. */}
      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle"
          aria-hidden="true"
        />
        <input
          type="search"
          placeholder="Search subjects, topics…"
          aria-label="Search"
          className="h-9 w-full rounded-field border border-border bg-background pr-3 pl-9 text-sm outline-none placeholder:text-subtle focus:border-primary"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-field text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
          aria-label="Notifications"
        >
          <Bell className="size-4.5" aria-hidden="true" />
          <span className="absolute top-2 right-2.5 size-1.5 rounded-full bg-danger" />
        </button>

        {/* Placeholder identity. Replaced by a real profile menu once
            Supabase Auth is connected — not before. */}
        <div className="flex items-center gap-2.5 border-l border-border pl-4">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium leading-tight">Sample Student</p>
            <p className="text-xs leading-tight text-subtle">Demo account</p>
          </div>
          <div
            className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary"
            aria-hidden="true"
          >
            SS
          </div>
        </div>
      </div>
    </header>
  );
}