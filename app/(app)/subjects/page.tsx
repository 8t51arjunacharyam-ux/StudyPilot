import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";

export const metadata: Metadata = {
  title: "Subjects",
};

/**
 * Subjects - protected placeholder.
 *
 * This route exists so the shell navigation has no dead links and so the
 * route-protection layout can be verified across every protected page.
 *
 * It is NOT implemented. No data is fetched and no feature logic runs here.
 */
export default function Page() {
  return (
    <Container size="wide" className="py-8 sm:py-10">
      <PageHeader title="Subjects" description="Manage the subjects you are studying and the topics inside them. Wired to Supabase in a later phase." />

      <EmptyState
        icon={BookOpen}
        title="Not built yet"
        description="This page is reserved for a later phase. It is protected by the same authentication check as the rest of the application, but no functionality has been implemented."
      />
    </Container>
  );
}