import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import type { StudySession, StudySessionStatus } from "@/lib/types/database";

export type { StudySession, StudySessionStatus };

export type StudySessionWithDetails = StudySession & {
  topic_name: string;
  topic_difficulty: number;
  subject_id: string;
  subject_name: string;
  subject_color: string;
};

function toLocalDateRange(date: Date): { start: string; end: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function getStudySessions(): Promise<StudySession[]> {
  const user = await requireUser();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("scheduled_start", { ascending: true });

  if (error) {
    console.error("[study_sessions] getStudySessions error:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getStudySessionsByDateRange(
  startDate: string,
  endDate: string
): Promise<StudySession[]> {
  const user = await requireUser();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", user.id)
    .gte("scheduled_start", startDate)
    .lte("scheduled_start", endDate)
    .order("scheduled_start", { ascending: true });

  if (error) {
    console.error("[study_sessions] getStudySessionsByDateRange error:", error.message);
    return [];
  }

  return data ?? [];
}

function mapSessionWithDetails(session: unknown): StudySessionWithDetails {
  const s = session as {
    topic?: { name: string; difficulty: number; subject_id: string } | null;
    subject?: { name: string; color: string } | null;
  } & StudySession;

  return {
    ...s,
    topic_name: s.topic?.name ?? "Unknown",
    topic_difficulty: s.topic?.difficulty ?? 3,
    subject_id: s.topic?.subject_id ?? "",
    subject_name: s.subject?.name ?? "Unknown",
    subject_color: s.subject?.color ?? "#4f46e5",
  };
}

export async function getTodaySessions(): Promise<StudySessionWithDetails[]> {
  const user = await requireUser();

  const supabase = await createClient();

  const { start, end } = toLocalDateRange(new Date());

  const { data: sessions, error: sessionsError } = await supabase
    .from("study_sessions")
    .select(
      `
      *,
      topic:topics(name, difficulty, subject_id),
      subject:subjects(name, color)
    `
    )
    .eq("user_id", user.id)
    .gte("scheduled_start", start)
    .lte("scheduled_start", end)
    .order("scheduled_start", { ascending: true });

  if (sessionsError) {
    console.error("[study_sessions] getTodaySessions error:", sessionsError.message);
    return [];
  }

  return (sessions ?? []).map(mapSessionWithDetails);
}

export async function getUpcomingSessions(days = 7): Promise<StudySessionWithDetails[]> {
  const user = await requireUser();

  const supabase = await createClient();

  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);
  future.setHours(23, 59, 59, 999);

  const { data: sessions, error: sessionsError } = await supabase
    .from("study_sessions")
    .select(
      `
      *,
      topic:topics(name, difficulty, subject_id),
      subject:subjects(name, color)
    `
    )
    .eq("user_id", user.id)
    .gte("scheduled_start", now.toISOString())
    .lte("scheduled_start", future.toISOString())
    .in("status", ["planned", "in_progress"])
    .order("scheduled_start", { ascending: true });

  if (sessionsError) {
    console.error("[study_sessions] getUpcomingSessions error:", sessionsError.message);
    return [];
  }

  return (sessions ?? []).map(mapSessionWithDetails);
}

export async function getMissedSessions(): Promise<StudySessionWithDetails[]> {
  const user = await requireUser();

  const supabase = await createClient();

  const now = new Date().toISOString();

  const { data: sessions, error: sessionsError } = await supabase
    .from("study_sessions")
    .select(
      `
      *,
      topic:topics(name, difficulty, subject_id),
      subject:subjects(name, color)
    `
    )
    .eq("user_id", user.id)
    .lt("scheduled_start", now)
    .in("status", ["planned", "skipped", "cancelled"])
    .order("scheduled_start", { ascending: false });

  if (sessionsError) {
    console.error("[study_sessions] getMissedSessions error:", sessionsError.message);
    return [];
  }

  return (sessions ?? []).map(mapSessionWithDetails);
}
