"use client";

import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

/**
 * Presentational pieces of the wizard, kept separate from the stateful
 * container so each file stays readable.
 */

/** The numbered progress rail across the top. */
export function StepIndicator({
  current,
  steps,
  furthest,
}: {
  current: number;
  steps: ReadonlyArray<{ id: number; title: string }>;
  furthest: number;
}) {
  return (
    <nav aria-label="Onboarding progress">
      <ol className="flex items-center gap-1.5">
        {steps.map((step) => {
          const done = step.id < current;
          const active = step.id === current;
          // A step is reachable if it is at or before the furthest reached,
          // so a student can go back and correct an earlier answer.
          const reachable = step.id <= furthest;

          return (
            <li key={step.id} className="flex flex-1 flex-col gap-2">
              <div
                className={cn(
                  "h-1 rounded-full transition-colors",
                  done || active ? "bg-primary" : "bg-border"
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "hidden truncate text-[11px] font-medium sm:block",
                  active
                    ? "text-primary"
                    : reachable
                      ? "text-muted"
                      : "text-subtle"
                )}
              >
                {step.title}
              </span>
              <span className="sr-only">
                Step {step.id} of {steps.length}: {step.title}
                {done ? " (completed)" : active ? " (current)" : ""}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Title + description wrapper used by every step. */
export function StepSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

/** Inline field-level error. */
export function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-danger">{children}</p>;
}

/** Step-level error banner. */
export function StepError({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      className="rounded-card border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger"
    >
      {children}
    </div>
  );
}

/** The persistent footer with Back / Continue. */
export function WizardFooter({
  step,
  pending,
  canContinue,
  onBack,
  onNext,
  nextLabel,
  submitError,
}: {
  step: number;
  pending: boolean;
  canContinue: boolean;
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  submitError: string | null;
}) {
  const isSubmit = step >= 7;

  return (
    <div className="space-y-3 border-t border-border pt-6">
      {submitError && (
        <div
          role="alert"
          className="rounded-card border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {submitError}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          disabled={step === 1 || pending}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Button>

        {/*
          Disabled while pending. This is the first half of duplicate-submission
          protection: an impatient double-click cannot fire two requests. The
          database function is the second half.
        */}
        <Button
          type="button"
          onClick={onNext}
          disabled={!canContinue || pending}
          aria-busy={pending}
        >
          {pending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
          {isSubmit && !pending ? nextLabel : null}
          {!isSubmit && !pending ? nextLabel : null}
          {!isSubmit && pending ? "Saving..." : null}
          {isSubmit && pending ? "Creating your plan..." : null}
          {!isSubmit && !pending ? (
            <ArrowRight className="size-4" aria-hidden="true" />
          ) : null}
        </Button>
      </div>
    </div>
  );
}