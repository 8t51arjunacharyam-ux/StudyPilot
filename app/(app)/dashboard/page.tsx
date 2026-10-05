import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/Container";
import { MockDataNotice } from "@/components/features/dashboard/MockDataNotice";
import { StudyHealthCard } from "@/components/features/dashboard/StudyHealthCard";
import { StudyNowCard } from "@/components/features/dashboard/StudyNowCard";
import { TodaySessionsCard } from "@/components/features/dashboard/TodaySessionsCard";
import { SubjectProgressCard } from "@/components/features/dashboard/SubjectProgressCard";
import { UpcomingExamCard } from "@/components/features/dashboard/UpcomingExamCard";
import { MemoryRadarCard } from "@/components/features/dashboard/MemoryRadarCard";
import { DifficultyDebtCard } from "@/components/features/dashboard/DifficultyDebtCard";
import {
  mockStudyHealth,
  mockStudyNow,
  mockTodaySessions,
  mockSubjectProgress,
  mockUpcomingExam,
  mockRadarTopics,
  mockDebtItems,
} from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Dashboard",
};

/**
 * Dashboard — the signed-in home screen.
 *
 * READ THIS BEFORE ASSUMING ANYTHING WORKS:
 * Every value on this page comes from lib/mock-data.ts, which is a file of
 * hardcoded example constants. There is no database, no authentication, and
 * no scheduling logic. The layout, spacing and visual hierarchy are real and
 * final; the numbers are placeholders awaiting the data layer.
 *
 * This is also not yet protected — there is no session check, so anyone can
 * open /dashboard. That is intentional in this phase and is corrected when
 * Supabase Auth is connected.
 *
 * This is a Server Component: it renders on the server with no client-side
 * JavaScript, because it only reads local constants.
 */
export default function DashboardPage() {
  // A fixed placeholder name. Once auth exists this becomes the signed-in
  // user's real name from `profiles`.
  const studentName = "Sample Student";

  return (
    <Container size="wide" className="py-8 sm:py-10">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${studentName}`}
        description="Here is where your study plan stands today."
      />

      <div className="space-y-6">
        <MockDataNotice />

        {/* Study health + Study Now: the two things a student checks first. */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <StudyHealthCard data={mockStudyHealth} />
          </div>
          <div className="lg:col-span-2">
            <StudyNowCard data={mockStudyNow} />
          </div>
        </div>

        {/* Schedule + exam urgency. */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TodaySessionsCard sessions={mockTodaySessions} />
          </div>
          <div className="lg:col-span-1">
            <UpcomingExamCard exam={mockUpcomingExam} />
          </div>
        </div>

        {/* Progress + the two adaptive-insight previews. */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <SubjectProgressCard subjects={mockSubjectProgress} />
          </div>
          <div className="lg:col-span-1">
            <MemoryRadarCard topics={mockRadarTopics} />
          </div>
          <div className="lg:col-span-1">
            <DifficultyDebtCard items={mockDebtItems} />
          </div>
        </div>
      </div>
    </Container>
  );
}