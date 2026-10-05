import type { Metadata } from "next";
import { Brain } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Memory",
};

/**
 * Memory - protected placeholder.
 *
 * This route exists so the shell navigation has no dead links and so the
 * route-protection layout can be verified across every protected page.
 *
 * It is NOT implemented. No data is fetched and no feature logic runs here.
 */
export default function Page() {
  return (
    <Container size="wide" className="py-8 sm:py-10">
      <PageHeader title="Memory" description="Memory Radar will show which topics are at risk of being forgotten, based on your review history." />

      <EmptyState
        icon={Brain}
        title="Not built yet"
        description="This page is reserved for a later phase. It is protected by the same authentication check as the rest of the application, but no functionality has been implemented."
      />
    </Container>
  );
}