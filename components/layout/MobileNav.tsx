"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { mainNav, secondaryNav } from "@/components/layout/navigation";
import { BrandMark } from "@/components/layout/Brand";
import { cn } from "@/lib/utils";

/**
 * MobileNav — navigation for small screens.
 *
 * Uses a slide-out drawer rather than a bottom bar because our nav has six
 * items with text labels — a bottom bar would be cramped at 375px wide.
 *
 * Two details that matter for quality:
 *  1. Close the drawer whenever the route changes, otherwise it stays open
 *     on top of the page the user just navigated to.
 *  2. Handle the Escape key, and lock background scroll while open.
 *     A modal that traps neither focus nor scroll feels broken on mobile.
 */
export function MobileNav() {
  const pathname = usePathname();

  /**
   * Instead of storing a boolean and closing the drawer from an effect when
   * the route changes, we store *which route the drawer was opened on*.
   *
   * The drawer is open only while `openedOn === pathname`. Navigating
   * anywhere automatically makes that comparison false, so the drawer closes
   * itself — with no effect and no cascading re-render.
   *
   * (React discourages calling setState synchronously inside an effect,
   * because it triggers an extra render pass. Deriving the state this way
   * avoids that entirely and is also more robust: it closes on browser
   * Back/Forward too, which an onClick handler alone would miss.)
   */
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const open = openedOn === pathname;

  // Escape to close + prevent background scrolling while open.
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenedOn(null);
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpenedOn(null);

  return (
    <>
      {/* Trigger — sits in the mobile header row. */}
      <button
        type="button"
        onClick={() => setOpenedOn(pathname)}
        className="flex size-9 items-center justify-center rounded-field text-muted transition-colors hover:bg-surface-muted hover:text-foreground lg:hidden"
        aria-label="Open navigation menu"
        aria-expanded={open}
      >
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Scrim — clicking the darkened area closes the drawer. */}
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={close}
            className="absolute inset-0 h-full w-full animate-pulse bg-foreground/30 backdrop-blur-sm"
          />

          <nav
            aria-label="Main navigation"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col border-r border-border bg-surface shadow-overlay"
          >
            <div className="flex h-16 items-center justify-between px-5">
              <BrandMark size="sm" />
              <button
                type="button"
                onClick={close}
                className="flex size-8 items-center justify-center rounded-field text-muted hover:bg-surface-muted"
                aria-label="Close navigation menu"
              >
                <X className="size-4.5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {mainNav.map((item) => (
                <MobileNavLink key={item.href} item={item} />
              ))}

              <p className="px-3 pt-6 pb-2 text-xs font-semibold uppercase tracking-wider text-subtle">
                Account
              </p>
              {secondaryNav.map((item) => (
                <MobileNavLink key={item.href} item={item} />
              ))}
            </div>

            <div className="m-3 rounded-card border border-dashed border-border-strong bg-surface-muted p-3">
              <p className="text-xs font-semibold">Development preview</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                Layout only. No account is signed in.
              </p>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}

function MobileNavLink({ item }: { item: (typeof mainNav)[number] }) {
  const pathname = usePathname();
  const active = pathname === item.href;
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-field px-3 py-2.5 text-sm font-medium transition-colors",
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
