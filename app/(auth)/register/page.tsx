import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, FieldNote } from "@/components/ui/Field";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Create your account",
};

export default function RegisterPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Start building a study plan that adapts to your real progress.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* DEVELOPMENT NOTICE — THIS FORM DOES NOT WORK.
            No account is created. Supabase Auth is not connected, so
            submitting does nothing: no validation, no user record, no
            session. It exists to establish layout and spacing only. */}
        <div
          role="status"
          className="mb-6 flex items-start gap-3 rounded-card border border-info/25 bg-info-soft p-3.5"
        >
          <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-info">
            <span className="font-semibold">Preview mode.</span> Registration
            is not connected yet. This form will not create an account.
          </p>
        </div>

        <form className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              placeholder="Alex Student"
              disabled
            />
          </div>

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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              disabled
            />
            <FieldNote>
              Use at least 8 characters. This is a placeholder field only.
            </FieldNote>
          </div>

          <Button type="submit" disabled className="w-full">
            Create account
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-center text-xs text-subtle">
            <AlertCircle className="size-3.5" aria-hidden="true" />
            Unavailable until authentication is implemented.
          </p>
        </form>
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