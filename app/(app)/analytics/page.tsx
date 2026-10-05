import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Analytics",
};

/**
 * Analytics - protected placeholder.
 *
 * This route exists so the shell navigation has no dead links and so the
 * route-protection layout can be verified across every protected page.
 *
 * It is NOT implemented. No data is fetched and no feature logic runs here.
 */
export default function Page() {
  return (
    <Container size="wide" className="py-8 sm:py-10">
      <PageHeader title="Analytics" description="Progress insights, Difficulty Debt breakdown and study health trends will appear here." />

      <EmptyState
        icon={BarChart3}
        title="Not built yet"
        description="This page is reserved for a later phase. It is protected by the same authentication check as the rest of the application, but no functionality has been implemented."
      />
    </Container>
  );
}