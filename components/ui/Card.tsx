import { cn } from "@/lib/utils";

/**
 * Card is the surface all content sits on.
 *
 * It exports a compound set (Card, CardHeader, CardTitle, CardDescription,
 * CardContent, CardFooter) rather than one component with many props.
 *
 * Why: a single component with `title`/`description`/`footer` props turns
 * into a component with 12 boolean props and eventually 200 lines of
 * conditionals. Separate small pieces can be composed and reordered freely,
 * so the layout code stays readable as designs change.
 */

export function Card({
  className,
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-card border border-border bg-surface shadow-card",
        interactive && "transition-shadow hover:shadow-raised",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 p-5 pb-4", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      className={cn("text-base font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-sm leading-relaxed text-muted", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-border px-5 py-4",
        className
      )}
      {...props}
    />
  );
}