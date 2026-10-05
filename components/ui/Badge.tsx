import { cn } from "@/lib/utils";

/**
 * Badge — a small status label.
 *
 * Tone is a fixed semantic set (neutral/success/warning/danger/info/primary)
 * rather than an arbitrary colour prop. That constraint is what keeps the UI
 * meaningful: red always means risk, green always means healthy, everywhere
 * in the app. A free-form `color` prop would let red mean "Calculus" on one
 * screen and "overdue" on another.
 */

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted text-muted border-border",
  success: "bg-success-soft text-success border-transparent",
  warning: "bg-warning-soft text-warning border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  info: "bg-info-soft text-info border-transparent",
  primary: "bg-primary-soft text-primary border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5",
        "text-xs font-medium whitespace-nowrap",
        tones[tone],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}