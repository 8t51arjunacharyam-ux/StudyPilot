/**
 * StudyPilot - Dashboard data aggregation.
 */
import { createClient } from "@/lib/supabase/server";
import type {
  DashboardData,
  Profile,
  Subject,
  Topic,
  Exam,
  ExamWithSubject,
  StudySessionWithDetails,
  StudyPreference,
} from "@/lib/types/database";
import { recommendStudyNow, type StudyNowInput } from "@/lib/engine/study-now";
import { calculateDifficultyDebt } from "@/lib/engine/difficulty-debt";

function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

function startOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/**
 * Get comprehensive dashboard data in a single call.
 */
export async function getDashboardData(): Promise<DashboardData | null> {
  const supabase = await createClient();

  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const userId = user.user.id;

  const [
    profileResult,
    subjectsResult,
    topicsResult,
    examsResult,
    todaySessionsResult,
    preferencesResult,
    weekSessionsResult,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("subjects")
      .select("*")
      .eq("user_id", userId)
      .is("archived_at", null)
      .order("created_at"),
    supabase.from("topics").select("*").eq("user_id", userId).order("created_at"),
    supabase
      .from("exams")
      .select("*, subject:subjects(*)")
      .eq("user_id", userId)
      .order("exam_date"),
    supabase
      .from("study_sessions")
      .select("*, subject:subjects(*), topic:topics(*)")
      .eq("user_id", userId)
      .gte("scheduled_start", startOfDay(new Date()))
      .lte("scheduled_start", endOfDay(new Date()))
      .order("scheduled_start"),
    supabase
      .from("study_preferences")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("day_of_week"),
    supabase
      .from("study_sessions")
      .select("status, planned_minutes, actual_minutes, scheduled_start")
      .eq("user_id", userId)
      .gte("scheduled_start", startOfDay(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))),
  ]);

  const profile = profileResult.data as Profile | null;
  const subjects = (subjectsResult.data ?? []) as Subject[];
  const topics = (topicsResult.data ?? []) as Topic[];
  const exams = (examsResult.data ?? []) as ExamWithSubject[];
  const todaySessions = (todaySessionsResult.data ?? []) as StudySessionWithDetails[];
  const preferences = (preferencesResult.data ?? []) as StudyPreference[];
  const weekSessions = (weekSessionsResult.data ?? []) as { status: string; planned_minutes: number; actual_minutes: number | null; scheduled_start: string }[];

  if (!profile) return null;

  // Calculate study health
  const sessionsPlanned = weekSessions?.length ?? 0;
  const sessionsCompleted = weekSessions?.filter((s) => s.status === "completed").length ?? 0;
  const weeklyHoursPlanned =
    weekSessions?.reduce((sum, s) => sum + (s.planned_minutes || 0), 0) ?? 0;
  const weeklyHoursCompleted =
    weekSessions
      ?.filter((s) => s.status === "completed")
      .reduce((sum, s) => sum + (s.actual_minutes || 0), 0) ?? 0;

  // Find upcoming exam
  const upcomingExam = exams[0] ?? null;

  // Calculate study now recommendation using the transparent scoring engine
  let studyNow: DashboardData["studyNow"] = null;
  if (subjects.length > 0 && topics.length > 0) {
    const studyNowInput: StudyNowInput = {
      subjects,
      topics,
      exams,
      sessions: weekSessions as unknown as StudySessionWithDetails[],
      preferences,
      dailyStudyGoalMinutes: profile.daily_study_goal_minutes ?? 120,
      now: new Date(),
    };
    studyNow = recommendStudyNow(studyNowInput);
  }

  // Calculate subject progress
  const subjectProgress = subjects.map((subject) => {
    const subjectTopics = topics.filter((t) => t.subject_id === subject.id);
    const topicsDone = subjectTopics.filter((t) => t.completed_at).length;
    const topicsTotal = subjectTopics.length;
    const progress = topicsTotal > 0 ? Math.round((topicsDone / topicsTotal) * 100) : 0;

    return {
      id: subject.id,
      name: subject.name,
      color: subject.color,
      progress,
      topicsDone,
      topicsTotal,
    };
  });

  // Calculate radar topics
  const radarTopics = topics
    .filter((t) => !t.completed_at && t.confidence < 80)
    .map((t) => {
      const subject = subjects.find((s) => s.id === t.subject_id);
      const lastReview = t.last_reviewed_at ?? t.updated_at;
      const daysSinceReview = lastReview
        ? Math.floor((Date.now() - new Date(lastReview).getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      return {
        id: t.id,
        topicName: t.name,
        subjectName: subject?.name ?? "Unknown",
        color: subject?.color ?? "#4f46e5",
        confidence: t.confidence,
        daysSinceReview,
      };
    })
    .sort((a, b) => a.confidence - b.confidence)
    .slice(0, 10);

  // Calculate difficulty debt using the transparent engine

  const debtResults = calculateDifficultyDebt({
    subjects,
    topics,
    exams,
    sessions: todaySessions,
    now: new Date(),
  });

  // Transform engine results to the shape expected by the dashboard component
  const debtItems = debtResults
    .filter((d) => d.debtScore > 30)
    .slice(0, 3)
    .map((d) => ({
      id: d.subjectId,
      subjectName: d.subjectName,
      color: d.color,
      debtScore: d.debtScore,
      reason: d.reasons.join(", "),
    }));
  const streakDays = profile.current_streak_days ?? 0;
  const completionRatio = weeklyHoursCompleted / (weeklyHoursPlanned || 1);

  return {
    profile,
    subjects,
    topics,
    exams,
    todaySessions,
    upcomingExam,
    studyHealth: {
      weeklyHoursPlanned: Math.round((weeklyHoursPlanned / 60) * 10) / 10,
      weeklyHoursCompleted: Math.round((weeklyHoursCompleted / 60) * 10) / 10,
      sessionsCompleted,
      sessionsPlanned,
      streakDays,
      healthLabel:
        completionRatio > 0.8 ? "On track" : completionRatio > 0.5 ? "Fairly on track" : "Needs attention",
    },
    studyNow,
    subjectProgress,
    radarTopics,
    debtItems,
  };
}

/**
 * Check if user has completed onboarding.
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("id", user.user.id)
    .maybeSingle();

  return profile?.onboarding_completed ?? false;
}
