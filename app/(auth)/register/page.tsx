import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/AuthForm";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Create your account",
};

/**
 * This page reads session cookies (to skip the form when already signed in),
 * so it must render per request. Prerendering it would bake in whatever auth
 * state existed at build time.
 */
export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  // No point showing a registration form to someone already signed in.
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Start building a study plan that adapts to your real progress.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <RegisterForm />
      </CardContent>

      <div className="border-t border-border px-5 py-4 text-center">
        <p className="text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </Card>
  );
}