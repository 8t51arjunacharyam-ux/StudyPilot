import Link from "next/link";
import { BrandMark } from "@/components/layout/Brand";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

/**
 * MarketingHeader — navigation for the public landing page.
 *
 * Separate from the app Topbar on purpose: a marketing page should not show
 * a user avatar or app search box. Keeping the two headers distinct makes
 * each page feel designed for its purpose rather than reusing whatever
 * component was convenient.
 */
export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
      <Container size="wide">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link href="/" aria-label="StudyPilot home">
            <BrandMark />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-medium text-muted md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <Link href="/login" className="transition-colors hover:text-foreground">
              Sign in
            </Link>
          </nav>

          <div className="flex items-center gap-2.5">
            <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
              Sign in
            </ButtonLink>
            <ButtonLink href="/register" size="sm">
              Get started
            </ButtonLink>
          </div>
        </div>
      </Container>
    </header>
  );
}