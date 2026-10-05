"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import {
  loginAction,
  registerAction,
  type AuthResult,
} from "@/lib/auth/actions";

/**
 * Login and registration forms.
 *
 * WHY THIS IS A CLIENT COMPONENT
 *
 * `useActionState` needs React state to show the pending state and display the
 * result the Server Action returned. The action itself still executes entirely
 * on the server - only this thin wrapper ships to the browser.
 *
 * PASSWORD HANDLING
 *
 * The password goes into a FormData and is posted to the Server Action, which
 * forwards it to Supabase Auth. It is never stored in React state, never
 * logged, and never persisted anywhere in our code.
 *
 * `autoComplete` matters: "current-password" lets a password manager offer the
 * right credential, and "new-password" lets it generate a strong one.
 */

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthResult | null, FormData>(
    loginAction,
    null
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {/* Surfaces errors the form itself cannot detect: wrong password, rate
          limited, network down. */}
      {state && !state.ok && (
        <FormAlert tone="error">{state.error}</FormAlert>
      )}

      {/* Preserves where the user was heading before being sent to login. */}
      {next && <input type="hidden" name="next" value={next} />}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          disabled={pending}
          aria-invalid={state?.ok === false && state.field === "email"}
        />
        {state?.ok === false && state.field === "email" && (
          <FieldError>{state.error}</FieldError>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          required
          disabled={pending}
          aria-invalid={state?.ok === false && state.field === "password"}
        />
        {state?.ok === false && state.field === "password" && (
          <FieldError>{state.error}</FieldError>
        )}
      </div>

      {/* Password reset is not implemented yet, so the link is deliberately
          absent rather than pointing at a 404. */}
      <SubmitButton pending={pending} idleLabel="Sign in" pendingLabel="Signing in..." />
    </form>
  );
}

export function RegisterForm() {
  const [state, formAction, pending] = useActionState<AuthResult | null, FormData>(
    registerAction,
    null
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state && !state.ok && (
        <FormAlert tone={state.error.startsWith("Almost there") ? "info" : "error"}>
          {state.error}
        </FormAlert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          disabled={pending}
          aria-invalid={state?.ok === false && state.field === "email"}
        />
        {state?.ok === false && state.field === "email" && (
          <FieldError>{state.error}</FieldError>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          minLength={8}
          required
          disabled={pending}
          aria-invalid={state?.ok === false && state.field === "password"}
        />
        {state?.ok === false && state.field === "password" && (
          <FieldError>{state.error}</FieldError>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter your password"
          required
          disabled={pending}
          aria-invalid={state?.ok === false && state.field === "confirmPassword"}
        />
        {state?.ok === false && state.field === "confirmPassword" && (
          <FieldError>{state.error}</FieldError>
        )}
      </div>

      <SubmitButton
        pending={pending}
        idleLabel="Create account"
        pendingLabel="Creating your account..."
      />
    </form>
  );
}

/** Disables the button and shows a spinner while the action is in flight. */
function SubmitButton({
  pending,
  idleLabel,
  pendingLabel,
}: {
  pending: boolean;
  idleLabel: string;
  pendingLabel: string;
}) {
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {pending ? pendingLabel : idleLabel}
    </Button>
  );
}

/** Error banner. `role="alert"` makes screen readers announce it immediately. */
function FormAlert({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: "error" | "info";
}) {
  const isError = tone === "error";
  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-card border p-3.5 text-sm ${
        isError
          ? "border-danger/25 bg-danger-soft text-danger"
          : "border-info/25 bg-info-soft text-info"
      }`}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <p className="text-xs leading-relaxed">{children}</p>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-danger">{children}</p>;
}