import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { MobileNav } from "@/components/layout/MobileNav";

/**
 * AppShell — the responsive frame around every signed-in page.
 *
 * Layout behaviour:
 *   - ≥1024px (lg): permanent sidebar + topbar, side by side.
 *   - <1024px:    hidden sidebar; a compact mobile header with the
 *                 menu button takes its place, and MobileNav provides
 *                 the drawer.
 *
 * This component is a Server Component — it holds no interactive state
 * itself and simply arranges the interactive pieces. That keeps the shell
 * markup out of the client bundle.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile-only header row. */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur-md lg:hidden">
          <MobileNav />
        </div>

        <Topbar />

        {/* min-w-0 is essential: without it a wide child (a table, a wide
            card) can force horizontal scrolling on the whole page instead
            of being contained. */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}