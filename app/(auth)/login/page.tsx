import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/AuthForm";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Sign in",
};

/**
 * This page reads session cookies (to skip the form when already signed in),
 * so it must render per request. Prerendering it would bake in whatever auth
 * state existed at build time.
 */
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  // Next.js 16: searchParams is a Promise and must be awaited.
  const params = await searchParams;

  // Already signed in? No reason to show a login form.
  const user = await getCurrentUser();
  if (user) {
    // Same open-redirect guard as in the login action.
    const safeNext =
      params.next && params.next.startsWith("/") && !params.next.startsWith("//")
        ? params.next
        : "/dashboard";
    redirect(safeNext);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>
          Sign in to continue to your study dashboard.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {params.error === "signout-failed" && (
          <div
            role="alert"
            className="mb-5 rounded-card border border-danger/25 bg-danger-soft p-3.5 text-xs text-danger"
          >
            We could not complete sign-out. Please try again.
          </div>
        )}

        <LoginForm next={params.next} />
      </CardContent>

      <div className="border-t border-border px-5 py-4 text-center">
        <p className="text-sm text-muted">
          New to StudyPilot?{" "}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </Card>
  );
}