import { Container } from "@/components/ui/Container";
import { LoadingState } from "@/components/ui/LoadingState";

/**
 * Loading UI for the dashboard route.
 *
 * Next.js automatically shows this while the page's server components are
 * still rendering. Because it mirrors the real page's structure, the layout
 * doesn't shift when content arrives.
 */
export default function DashboardLoading() {
  return (
    <Container size="wide" className="py-8 sm:py-10">
      <LoadingState label="Loading your dashboard" />
    </Container>
  );
}