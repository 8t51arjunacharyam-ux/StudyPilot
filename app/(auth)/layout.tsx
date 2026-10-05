import Link from "next/link";
import { BrandMark } from "@/components/layout/Brand";

/**
 * Layout for sign-in and registration.
 *
 * A focused, centred card with no navigation — a student signing in has one
 * task, and giving them the full app chrome would distract from it.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="p-6">
        <Link href="/" aria-label="StudyPilot home">
          <BrandMark size="sm" />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="p-6 text-center">
        <p className="text-xs text-subtle">© 2026 StudyPilot</p>
      </footer>
    </div>
  );
}