import { cn } from "@/lib/utils";

/**
 * Container — the page-width wrapper.
 *
 * Every page uses this so horizontal padding and max-width are identical
 * everywhere. Without it, each page invents its own width and the layout
 * "jumps" when navigating between screens.
 *
 * Spacing convention used throughout the app:
 *   - 4px base unit (Tailwind's 0.25rem)
 *   - 4 = 16px  tight internal padding
 *   - 6 = 24px  gap between related cards
 *   - 8 = 32px  gap between card sections
 *   - 16 = 64px space between major page sections
 */
export function Container({
  size = "default",
  className,
  children,
}: {
  size?: "default" | "narrow" | "wide";
  className?: string;
  children: React.ReactNode;
}) {
  const widths = {
    narrow: "max-w-2xl",
    default: "max-w-6xl",
    wide: "max-w-7xl",
  };

  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", widths[size], className)}>
      {children}
    </div>
  );
}

/** Consistent vertical rhythm between page sections. */
export function PageSection({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <section className={cn("py-8 sm:py-12", className)}>{children}</section>;
}

/** Standard page heading block: eyebrow, title, supporting text. */
export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1.5">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}