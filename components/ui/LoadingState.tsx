import { cn } from "@/lib/utils";

/**
 * LoadingState — shown while server data is in flight.
 *
 * It uses shimmering placeholder blocks rather than a spinner because the
 * placeholder roughly matches the shape of the content that will arrive,
 * so the layout doesn't jump when data lands (a "layout shift" — the thing
 * that makes a page feel cheap).
 *
 * The `sr-only` text tells screen-reader users data is loading. Without it
 * the page is just silent.
 */
export function LoadingState({
  label = "Loading",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)} role="status" aria-busy="true">
      <span className="sr-only">{label}…</span>

      <div className="h-8 w-48 animate-pulse rounded-field bg-surface-muted" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="h-32 animate-pulse rounded-card bg-surface-muted" />
        <div className="h-32 animate-pulse rounded-card bg-surface-muted" />
        <div className="h-32 animate-pulse rounded-card bg-surface-muted" />
      </div>
    </div>
  );
}

/** A single skeleton row, for loading lists of items. */
export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-16 animate-pulse rounded-card bg-surface-muted", className)}
      aria-hidden="true"
    />
  );
}