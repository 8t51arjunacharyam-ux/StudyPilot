import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";

export type Exam = {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  exam_date: string;
  importance: number;
  topics_covered: string[];
  created_at: string;
  updated_at: string;
};

export type ExamWithSubject = Exam & {
  subject_name: string;
  subject_color: string;
  difficulty: number; // 1-5 from subject
  days_until: number;
  is_past: boolean;
  risk_score: number;
  risk_level: "low" | "medium" | "high" | "critical";
};

export async function getExams(): Promise<Exam[]> {
  const user = await requireUser();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("user_id", user.id)
    .order("exam_date", { ascending: true });

  if (error) {
    console.error("[exams] getExams error:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getExamsWithSubjects(): Promise<ExamWithSubject[]> {
  const user = await requireUser();

  const supabase = await createClient();

  const { data: exams, error: examsError } = await supabase
    .from("exams")
    .select("*, subject:subjects(name, color)")
    .eq("user_id", user.id)
    .order("exam_date", { ascending: true });

  if (examsError) {
    console.error("[exams] getExamsWithSubjects exams error:", examsError.message);
    return [];
  }

  if (!exams || exams.length === 0) {
    return [];
  }

  const subjectIds = [...new Set(exams.map((e) => e.subject_id))];

  // Get topics for all subjects to calculate remaining workload
  const { data: topics, error: topicsError } = await supabase
    .from("topics")
    .select("id, subject_id, completed_at, estimated_minutes")
    .in("subject_id", subjectIds);

  if (topicsError) {
    console.error("[exams] getExamsWithSubjects topics error:", topicsError.message);
  }

  const topicsBySubject = new Map<string, typeof topics>();
  if (topics) {
    for (const topic of topics) {
      const existing = topicsBySubject.get(topic.subject_id) ?? [];
      existing.push(topic);
      topicsBySubject.set(topic.subject_id, existing);
    }
  }

  return exams.map((exam) => {
    const subjectTopics = topicsBySubject.get(exam.subject_id) ?? [];
    const incompleteTopics = subjectTopics.filter((t) => !t.completed_at);
    const workloadRemaining = incompleteTopics.reduce((sum, t) => sum + (t.estimated_minutes ?? 0), 0);
    const totalTopics = subjectTopics.length;
    const completedTopics = subjectTopics.filter((t) => t.completed_at).length;
    const preparationPercentage = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    const subject = exam.subject as { name: string; color: string; difficulty: number } | null;
    const now = Date.now();
    const examTime = new Date(exam.exam_date).getTime();
    const daysUntil = Math.ceil((examTime - now) / (1000 * 60 * 60 * 24));
    const isPast = daysUntil < 0;

    // Get subject difficulty (1-5 scale)
    const subjectDifficulty = subject?.difficulty ?? 3; // default to medium

    // Risk calculation based on days remaining, subject difficulty, remaining workload, preparation percentage
    let riskScore = 0;

    // Base risk from days remaining
    if (daysUntil <= 0) {
      riskScore = 100; // Past exam
    } else if (daysUntil <= 3) {
      riskScore = 80 + (3 - daysUntil) * 5;
    } else if (daysUntil <= 7) {
      riskScore = 60 + (7 - daysUntil) * 3;
    } else if (daysUntil <= 14) {
      riskScore = 40 + (14 - daysUntil) * 1.5;
    } else {
      riskScore = 20;
    }

    // Adjust for preparation percentage
    if (preparationPercentage < 30) riskScore += 20;
    else if (preparationPercentage < 50) riskScore += 10;
    else if (preparationPercentage > 80) riskScore -= 10;

    // Adjust for workload
    if (workloadRemaining > 600) riskScore += 15;
    else if (workloadRemaining > 300) riskScore += 10;
    else if (workloadRemaining > 100) riskScore += 5;

    // Adjust for subject difficulty (1-5 scale, where 5 is hardest)
    // Higher difficulty increases risk score
    riskScore += (subjectDifficulty - 3) * 5; // +-5 points per difficulty level relative to medium

    riskScore = Math.min(100, Math.max(0, Math.round(riskScore)));

    let riskLevel: "low" | "medium" | "high" | "critical";
    if (riskScore >= 80) riskLevel = "critical";
    else if (riskScore >= 60) riskLevel = "high";
    else if (riskScore >= 40) riskLevel = "medium";
    else riskLevel = "low";

    return {
      ...exam,
      subject_name: subject?.name ?? "Unknown",
      subject_color: subject?.color ?? "#4f46e5",
      difficulty: subjectDifficulty,
      days_until: daysUntil,
      is_past: isPast,
      risk_score: riskScore,
      risk_level: riskLevel,
    };
  });
}

export async function getExamById(id: string): Promise<Exam | null> {
  const user = await requireUser();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[exams] getExamById error:", error.message);
    return null;
  }

  return data;
}