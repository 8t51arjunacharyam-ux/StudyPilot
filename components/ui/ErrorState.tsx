"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * ErrorState — shown when something genuinely failed.
 *
 * This component follows rule #10: never hide errors.
 *
 *   - We show a clear, human message instead of a blank screen or a raw
 *     stack trace.
 *   - If a retry handler is supplied, we offer it. A dead end with no way
 *     forward is a worse experience than a slow page.
 *   - We deliberately do NOT swallow the error. This is a *presentation*
 *     component; the error is still logged where it is thrown, and anything
 *     unexpected propagates to app/error.tsx.
 *
 * `onRetry` lives on a Client Component because passing a function from a
 * Server Component to a Client Component is not allowed — functions are not
 * serialisable. Without 'use client' above, passing onRetry would fail.
 */
export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this section. Please try again.",
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-card border border-danger/30 bg-danger-soft px-6 py-12 text-center",
        className
      )}
      role="alert"
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-surface">
        <AlertTriangle className="size-5 text-danger" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-danger">{title}</h3>
        <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted">
          {message}
        </p>
      </div>
      {onRetry && (
        <div className="mt-1">
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}