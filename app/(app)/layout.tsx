import { AppShell } from "@/components/layout/AppShell";

/**
 * Layout for all signed-in application pages.
 *
 * SECURITY NOTE — this is currently the visual shell only. Once Supabase
 * Auth is connected this file becomes the security chokepoint described in
 * docs/PROJECT_PLAN.md §5: it will call `supabase.auth.getUser()` and
 * `redirect('/login')` when there is no session, so every nested page is
 * protected by default.
 *
 * Until that check exists, /dashboard is publicly reachable and displays
 * mock data. That is expected in this phase and is stated on the page.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}