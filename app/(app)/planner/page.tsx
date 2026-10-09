import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/Container";
import { PlannerList } from "@/components/features/planner/PlannerList";
import { getTodaySessions, getUpcomingSessions, getMissedSessions } from "@/lib/data/study_sessions";
import { getSubjects } from "@/lib/data/subjects";
import { getTopics } from "@/lib/data/topics";
import type { StudySessionWithDetails } from "@/lib/data/study_sessions";

export const metadata: Metadata = {
  title: "Planner",
};

export default async function PlannerPage() {
  const [today, upcoming, missed, subjects, topics] = await Promise.all([
    getTodaySessions(),
    getUpcomingSessions(7),
    getMissedSessions(),
    getSubjects(),
    getTopics(),
  ]);

  // Deduplicate sessions by id so a session that appears in both today and
  // upcoming lists is only rendered once.
  const sessionMap = new Map<string, StudySessionWithDetails>();
  for (const session of [...today, ...upcoming, ...missed]) {
    sessionMap.set(session.id, session);
  }
  const allSessions = Array.from(sessionMap.values()).sort(
    (a, b) => new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime()
  );

  return (
    <Container size="wide" className="py-8 sm:py-10">
      <PageHeader
        title="Planner"
        description="Your BrainFit schedule and session timeline."
      />

      <PlannerList
        initialSessions={allSessions}
        initialSubjects={subjects}
        initialTopics={topics}
      />
    </Container>
  );
}
