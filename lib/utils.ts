/**
 * Small helpers shared across components.
 * Kept dependency-free so any component can import them.
 */

/** Merge conditional class names, dropping falsy values. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}