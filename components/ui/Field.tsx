import { cn } from "@/lib/utils";

/**
 * Form field primitives: Label, Input, and a note for helper/error text.
 *
 * Why these are separate rather than one <Field> wrapper: sometimes a form
 * needs an input without a visible label (a search box with a placeholder),
 * and sometimes several inputs share one label. Separate pieces stay flexible.
 *
 * Accessibility: `id` must be passed and must match the input's `id` so the
 * label is programmatically associated — clicking the label then focuses the
 * input, and screen readers announce the field name correctly.
 */

export function Label({
  className,
  ...props
}: React.ComponentProps<"label">) {
  return (
    <label className={cn("text-sm font-medium", className)} {...props} />
  );
}

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-field border border-border bg-surface px-3 text-sm",
        "outline-none transition-colors placeholder:text-subtle",
        "focus:border-primary disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function FieldNote({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p className={cn("text-xs leading-relaxed text-muted", className)} {...props} />
  );
}