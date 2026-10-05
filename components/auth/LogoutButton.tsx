"use client";

import { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

/**
 * Sign-out control for the application shell.
 *
 * Calls the `logoutAction` Server Action rather than signing out from the
 * browser. That matters: `supabase.auth.signOut()` on the client only clears
 * local state, while the Server Action revokes the refresh token on Supabase's
 * servers. Revoking is what actually ends the session.
 *
 * `useTransition` provides the pending state so the control can be disabled
 * and show progress rather than appearing to do nothing.
 */
export function LogoutButton({ className }: { className?: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await logoutAction();
      // No setState needed after this: logoutAction redirects, which unmounts
      // this component. If the redirect fails, Next.js shows the error boundary.
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-busy={pending}
      className={cn(
        "flex w-full items-center gap-3 rounded-field px-3 py-2 text-sm font-medium",
        "text-muted transition-colors hover:bg-surface-muted hover:text-foreground",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
    >
      {pending ? (
        <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        <LogOut className="size-4 shrink-0" aria-hidden="true" />
      )}
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}