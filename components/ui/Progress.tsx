import { cn } from "@/lib/utils";

/**
 * Progress bar.
 *
 * Accessibility note that matters here: a plain coloured <div> conveys
 * nothing to a screen reader. We therefore set role="progressbar" with the
 * correct aria-* values, and render the visible percentage as text for
 * screen readers. The number is always shown next to the bar so the value is
 * never colour-only information.
 */

type Tone = "primary" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

export function Progress({
  value,
  tone = "primary",
  label,
  showValue = true,
  size = "md",
  className,
}: {
  /** Completion from 0 to 100. */
  value: number;
  tone?: Tone;
  /** Accessible description, e.g. "Calculus progress". */
  label: string;
  showValue?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  // Clamp so a bad value from the database can never render a broken bar.
  const clamped = Math.min(100, Math.max(0, Math.round(value)));

  return (
    <div className={cn("w-full", className)}>
      {showValue && (
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-xs font-medium text-muted">{label}</span>
          <span className="text-xs font-semibold tabular-nums">{clamped}%</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "w-full overflow-hidden rounded-full bg-surface-muted",
          size === "sm" ? "h-1.5" : "h-2"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all", tones[tone])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}