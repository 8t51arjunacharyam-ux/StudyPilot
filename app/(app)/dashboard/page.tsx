import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui/Container";
import { StudyHealthCard } from "@/components/features/dashboard/StudyHealthCard";
import { StudyNowCard } from "@/components/features/dashboard/StudyNowCard";
import { TodaySessionsCard } from "@/components/features/dashboard/TodaySessionsCard";
import { SubjectProgressCard } from "@/components/features/dashboard/SubjectProgressCard";
import { UpcomingExamCard } from "@/components/features/dashboard/UpcomingExamCard";
import { MemoryRadarCard } from "@/components/features/dashboard/MemoryRadarCard";
import { DifficultyDebtCard } from "@/components/features/dashboard/DifficultyDebtCard";
import { getDashboardData } from "@/lib/data/dashboard";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    return (
      <Container size="wide" className="py-8 sm:py-10">
        <PageHeader title="Dashboard" description="Please sign in to view your dashboard." />
      </Container>
    );
  }

  const studentName = data.profile.full_name || "Student";

  return (
    <Container size="wide" className="py-8 sm:py-10">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${studentName}`}
        description="Here is where your study plan stands today."
      />

      <div className="space-y-6">
        {/* Study health + Study Now: the two things a student checks first. */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <StudyHealthCard data={data.studyHealth} />
          </div>
          <div className="lg:col-span-2">
            <StudyNowCard data={data.studyNow} />
          </div>
        </div>

        {/* Schedule + exam urgency. */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <TodaySessionsCard sessions={data.todaySessions} />
          </div>
          <div className="lg:col-span-1">
            <UpcomingExamCard exam={data.upcomingExam} />
          </div>
        </div>

        {/* Progress + the two adaptive-insight previews. */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <SubjectProgressCard subjects={data.subjectProgress} />
          </div>
          <div className="lg:col-span-1">
            <MemoryRadarCard topics={data.radarTopics} />
          </div>
          <div className="lg:col-span-1">
            <DifficultyDebtCard items={data.debtItems} />
          </div>
        </div>
      </div>
    </Container>
  );
}