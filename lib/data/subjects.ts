import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";

export type Subject = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  difficulty: number;
  importance: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SubjectWithProgress = Subject & {
  topics_total: number;
  topics_completed: number;
  progress: number;
  exam_date: string | null;
  exam_title: string | null;
  remaining_minutes: number;
};

export async function getSubjects(includeArchived = false): Promise<Subject[]> {
  const user = await requireUser();

  const supabase = await createClient();

  let query = supabase
    .from("subjects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[subjects] getSubjects error:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getSubjectsWithProgress(): Promise<SubjectWithProgress[]> {
  const user = await requireUser();

  const supabase = await createClient();

  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("*")
    .eq("user_id", user.id)
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (subjectsError) {
    console.error("[subjects] getSubjectsWithProgress subjects error:", subjectsError.message);
    return [];
  }

  if (!subjects || subjects.length === 0) {
    return [];
  }

  const subjectIds = subjects.map((s) => s.id);

  // Get topics for all subjects
  const { data: topics, error: topicsError } = await supabase
    .from("topics")
    .select("id, subject_id, completed_at, estimated_minutes")
    .in("subject_id", subjectIds);

  if (topicsError) {
    console.error("[subjects] getSubjectsWithProgress topics error:", topicsError.message);
    // Continue with empty topics rather than failing completely
  }

  // Get exams for all subjects
  const { data: exams, error: examsError } = await supabase
    .from("exams")
    .select("id, subject_id, title, exam_date")
    .in("subject_id", subjectIds)
    .order("exam_date", { ascending: true });

  if (examsError) {
    console.error("[subjects] getSubjectsWithProgress exams error:", examsError.message);
  }

  const topicsBySubject = new Map<string, typeof topics>();
  if (topics) {
    for (const topic of topics) {
      const existing = topicsBySubject.get(topic.subject_id) ?? [];
      existing.push(topic);
      topicsBySubject.set(topic.subject_id, existing);
    }
  }

  const examsBySubject = new Map<string, typeof exams>();
  if (exams) {
    for (const exam of exams) {
      const existing = examsBySubject.get(exam.subject_id) ?? [];
      existing.push(exam);
      examsBySubject.set(exam.subject_id, existing);
    }
  }

  return subjects.map((subject) => {
    const subjectTopics = topicsBySubject.get(subject.id) ?? [];
    const subjectExams = examsBySubject.get(subject.id) ?? [];

    const topicsTotal = subjectTopics.length;
    const topicsCompleted = subjectTopics.filter((t) => t.completed_at).length;
    const progress = topicsTotal > 0 ? Math.round((topicsCompleted / topicsTotal) * 100) : 0;
    const remainingMinutes = subjectTopics
      .filter((t) => !t.completed_at)
      .reduce((sum, t) => sum + (t.estimated_minutes ?? 0), 0);

    const upcomingExam = subjectExams[0] ?? null;

    return {
      ...subject,
      topics_total: topicsTotal,
      topics_completed: topicsCompleted,
      progress,
      exam_date: upcomingExam?.exam_date ?? null,
      exam_title: upcomingExam?.title ?? null,
      remaining_minutes: remainingMinutes,
    };
  });
}

export async function getSubjectById(id: string): Promise<Subject | null> {
  const user = await requireUser();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[subjects] getSubjectById error:", error.message);
    return null;
  }

  return data;
}