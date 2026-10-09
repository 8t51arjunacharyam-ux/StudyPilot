import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { Container, PageHeader } from "@/components/ui/Container";
import { ExamList } from "@/components/features/exams/ExamList";

export const metadata: Metadata = {
  title: "Exams",
};

export default async function ExamsPage() {
  const { getExamsWithSubjects } = await import("@/lib/data/exams");
  const { getSubjects } = await import("@/lib/data/subjects");

  const [exams, subjects] = await Promise.all([
    getExamsWithSubjects(),
    getSubjects(),
  ]);

  return (
    <Container size="wide" className="py-8 sm:py-10">
      <PageHeader
        title="Exams"
        description="Track exam dates and importance. These drive the urgency weighting behind Difficulty Debt."
        action={
          <a href="#" className="hidden sm:inline-flex">
            <Plus className="size-4 mr-2" aria-hidden="true" />
            Add Exam
          </a>
        }
      />

      <ExamList initialExams={exams} initialSubjects={subjects} />
    </Container>
  );
}