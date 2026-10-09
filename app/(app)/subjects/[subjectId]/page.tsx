import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container, PageHeader } from "@/components/ui/Container";
import { SubjectDetail } from "@/components/features/subjects/SubjectDetail";
import { getSubjectWithProgress } from "@/lib/data/queries_part1";
import { getTopicsBySubject } from "@/lib/data/topics";

export async function generateMetadata({ params }: { params: Promise<{ subjectId: string }> }): Promise<Metadata> {
  const { subjectId } = await params;
  const subject = await getSubjectWithProgress(subjectId);
  return {
    title: subject?.name ?? "Subject not found",
  };
}

export default async function SubjectDetailPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  const subject = await getSubjectWithProgress(subjectId);

  if (!subject) {
    notFound();
  }

  const topics = await getTopicsBySubject(subjectId);

  return (
    <Container size="wide" className="py-8 sm:py-10">
      <PageHeader
        title={subject.name}
        description={`${subject.topics_completed} of ${subject.topics_total} topics completed`}
      />

      <SubjectDetail subject={subject} initialTopics={topics} />
    </Container>
  );
}