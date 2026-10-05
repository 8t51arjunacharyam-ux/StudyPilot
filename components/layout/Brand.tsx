import { cn } from "@/lib/utils";

/**
 * BrandMark — the StudyPilot wordmark and logo.
 *
 * One component used in the sidebar, the mobile header, and the marketing
 * header, so the logo never looks different in two places.
 */
export function BrandMark({
  className,
  showWordmark = true,
  size = "md",
}: {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const iconSize = { sm: "size-7", md: "size-8", lg: "size-9" }[size];
  const textSize = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  }[size];

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex items-center justify-center rounded-lg bg-primary text-on-primary",
          iconSize
        )}
        aria-hidden="true"
      >
        {/* A simple compass/plane glyph suggesting navigation and direction. */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-[60%]"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 19V5" />
          <path d="m5 12 7-7 7 7" />
        </svg>
      </span>
      {showWordmark && (
        <span className={cn("font-bold tracking-tight", textSize)}>StudyPilot</span>
      )}
    </span>
  );
}