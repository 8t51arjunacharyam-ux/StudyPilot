import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
        <CardDescription>Sign in to continue to your study dashboard.</CardDescription>
      </CardHeader>

      <CardContent>
        {/*
          DEVELOPMENT NOTICE — THIS FORM DOES NOT WORK.
          There is no authentication backend yet. Supabase Auth is not
          connected, so submitting this form does nothing at all: it does not
          validate, it does not sign anyone in, and it stores no data.
          It exists purely to establish the layout and spacing.
          Wiring this to real auth happens in the Supabase phase, at which
          point this notice and this banner are both removed.
        */}
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-card border border-info/25 bg-info-soft p-3.5"
        >
          <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-info">
            <span className="font-semibold">Preview mode.</span> Sign-in is not
            connected yet. This form will not submit or save anything.
          </p>
        </div>

        <form className="space-y-4" aria-describedby="login-disabled-note">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              disabled
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              disabled
            />
          </div>

          {/* Disabled so the form cannot be submitted. We disable rather
              than intercept, because a submit that silently does nothing is
              more confusing than a visibly unavailable control. */}
          <Button type="submit" disabled className="w-full">
            Sign in
          </Button>

          <p
            id="login-disabled-note"
            className="flex items-center justify-center gap-1.5 text-center text-xs text-subtle"
          >
            <AlertCircle className="size-3.5" aria-hidden="true" />
            Unavailable until authentication is implemented.
          </p>
        </form>
      </CardContent>

      <div className="border-t border-border px-5 py-4 text-center">
        <p className="text-sm text-muted">
          New to StudyPilot?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </Card>
  );
}
