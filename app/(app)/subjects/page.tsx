import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Container";
import { SubjectList } from "@/components/features/subjects/SubjectList";

export const metadata: Metadata = {
  title: "Subjects",
};

export default async function SubjectsPage() {
  const { getSubjectsWithProgress } = await import("@/lib/data/subjects");
  const subjects = await getSubjectsWithProgress();

  return (
    <Container size="wide" className="py-8 sm:py-10">
      <PageHeader
        title="Subjects"
        description="Manage the subjects you are studying and the topics inside them."
        action={
          <a href="/subjects/new" className="hidden sm:inline-flex">
            <Plus className="size-4 mr-2" aria-hidden="true" />
            Add Subject
          </a>
        }
      />

      <SubjectList initialSubjects={subjects} />
    </Container>
  );
}