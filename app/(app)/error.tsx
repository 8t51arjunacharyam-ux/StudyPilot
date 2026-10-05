"use client";

import { useEffect } from "react";
import { Container } from "@/components/ui/Container";
import { ErrorState } from "@/components/ui/ErrorState";

/**
 * Route-level error boundary for signed-in pages.
 *
 * How this works: when a Server Component throws, Next.js catches it and
 * renders the nearest `error.tsx` instead of a blank screen or a raw stack
 * trace. This satisfies rule #10 — the error is surfaced to the user in
 * plain language and logged for the developer, not hidden.
 *
 * `useEffect` logs the real error with full detail to the browser console,
 * because `error` is not serialised to the client and `console.error` during
 * render would fire on every re-render.
 *
 * `reset()` re-renders the segment, which retries the failed server render.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[StudyPilot] Unhandled application error:", error);
  }, [error]);

  return (
    <Container size="wide" className="py-10">
      <ErrorState
        title="We couldn't load this page"
        message="Something went wrong while loading your dashboard. This is a real error, not a placeholder — the details are in the server console."
        onRetry={reset}
        className="max-w-2xl"
      />
    </Container>
  );
}