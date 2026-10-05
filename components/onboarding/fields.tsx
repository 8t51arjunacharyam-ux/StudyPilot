"use client";

import { Label } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import {
  DIFFICULTY_MIN,
  DIFFICULTY_MAX,
  IMPORTANCE_MIN,
  IMPORTANCE_MAX,
} from "@/lib/onboarding/types";

/**
 * Shared form controls for onboarding.
 *
 * WHY SLIDERS FOR DIFFICULTY AND IMPORTANCE
 *
 * A 1-10 scale is genuinely hard to express as a number input: a student
 * staring at "7" has no idea whether that is hard. A slider with a live label
 * ("Somewhat hard") gives them a frame of reference, which produces far more
 * consistent answers - and consistency matters, because these numbers drive the
 * whole scheduling engine.
 *
 * Every control is labelled and exposes its value to screen readers via
 * aria-valuetext, so a screen-reader user hears "7, somewhat hard" rather than
 * just "7".
 */

/** Human wording for a 1-10 difficulty. */
function difficultyLabel(value: number): string {
  if (value <= 2) return "Very easy";
  if (value <= 4) return "Easy";
  if (value <= 6) return "Moderate";
  if (value <= 8) return "Hard";
  return "Very hard";
}

/** Human wording for a 1-5 importance. */
function importanceLabel(value: number): string {
  if (value <= 1) return "Minor";
  if (value <= 2) return "Somewhat important";
  if (value <= 3) return "Important";
  if (value <= 4) return "Very important";
  return "Critical";
}

export function DifficultySlider({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>Difficulty</Label>
        <span className="text-xs font-medium text-muted">
          {value} &middot; {difficultyLabel(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={DIFFICULTY_MIN}
        max={DIFFICULTY_MAX}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={`${value}, ${difficultyLabel(value)}`}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-muted accent-primary disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="flex justify-between text-[11px] text-subtle">
        <span>Easier</span>
        <span>Harder</span>
      </div>
    </div>
  );
}

export function ImportanceSlider({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>Importance</Label>
        <span className="text-xs font-medium text-muted">
          {value} &middot; {importanceLabel(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={IMPORTANCE_MIN}
        max={IMPORTANCE_MAX}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={`${value}, ${importanceLabel(value)}`}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-muted accent-primary disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="flex justify-between text-[11px] text-subtle">
        <span>Minor</span>
        <span>Critical</span>
      </div>
    </div>
  );
}

/** A 0-100 confidence input, for topic initial confidence. */
export function ConfidenceSlider({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>How well do you know this?</Label>
        <span className="text-xs font-medium text-muted">{value}%</span>
      </div>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-valuetext={`${value} percent confidence`}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-muted accent-primary disabled:cursor-not-allowed disabled:opacity-50"
      />
      <div className="flex justify-between text-[11px] text-subtle">
        <span>Not at all</span>
        <span>Completely</span>
      </div>
    </div>
  );
}

/** A toggleable day-of-week chip. */
export function DayChip({
  day,
  label,
  selected,
  onToggle,
  disabled,
}: {
  day: number;
  label: string;
  selected: boolean;
  onToggle: (day: number) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(day)}
      aria-pressed={selected}
      disabled={disabled}
      className={cn(
        "rounded-field border px-3 py-2 text-sm font-medium transition-colors",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : selected
          ? "border-primary bg-primary-soft text-primary"
          : "border-border bg-surface text-muted hover:bg-surface-muted hover:text-foreground"
      )}
    >
      {label.slice(0, 3)}
    </button>
  );
}