import { MarketingHeader } from "@/components/layout/MarketingHeader";
import { BrandMark } from "@/components/layout/Brand";

/**
 * Layout for the public marketing pages.
 *
 * The folder is named `(marketing)` — a Next.js *route group*. The
 * parentheses mean it organises files without adding anything to the URL, so
 * this page still lives at `/`, not at `/marketing`.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MarketingHeader />
      <div className="flex-1">{children}</div>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <BrandMark size="sm" />
            <p className="text-xs text-muted">
              © 2026 StudyPilot. Built for students who plan realistically.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}