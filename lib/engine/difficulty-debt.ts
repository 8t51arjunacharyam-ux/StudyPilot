/**
 * Difficulty Debt engine.
 *
 * Identifies subjects/topics that are becoming risky because the student is
 * not progressing fast enough. The score is a planning prioritisation metric,
 * not a prediction of exam results.
 *
 * The calculation is deterministic and transparent.
 */

import type { Subject, Topic, Exam, StudySession, DifficultyDebtResult } from "@/lib/types/database";
import { daysBetween, clamp } from "./utils";

export type DifficultyDebtInput = {
  subjects: Subject[];
  topics: Topic[];
  exams: Exam[];
  sessions?: StudySession[];
  now?: Date | string;
};

const WEIGHTS = {
  difficulty: 20,
  examUrgency: 25,
  remainingWorkload: 20,
  progress: 15,
  confidence: 15,
  recentActivity: 5,
} as const;

const MAX_SCORE = Object.values(WEIGHTS).reduce((sum, v) => sum + v, 0);

function getNearestExam(subjectId: string, exams: Exam[], now: Date): Exam | null {
  return (
    exams
      .filter((e) => e.subject_id === subjectId)
      .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())[0] ?? null
  );
}

function scoreDifficulty(subject: Subject): number {
  return (subject.difficulty / 5) * WEIGHTS.difficulty;
}

function scoreExamUrgency(exam: Exam | null, now: Date): number {
  if (!exam) return 0;
  const daysUntil = daysBetween(now, exam.exam_date);
  if (daysUntil < 0) return 0;
  if (daysUntil <= 1) return WEIGHTS.examUrgency;
  if (daysUntil <= 3) return WEIGHTS.examUrgency * 0.85;
  if (daysUntil <= 7) return WEIGHTS.examUrgency * 0.7;
  if (daysUntil <= 14) return WEIGHTS.examUrgency * 0.5;
  if (daysUntil <= 30) return WEIGHTS.examUrgency * 0.25;
  return 0;
}

function scoreRemainingWorkload(subjectTopics: Topic[]): number {
  const total = subjectTopics.reduce((sum, t) => sum + t.estimated_minutes, 0);
  const remaining = subjectTopics
    .filter((t) => !t.completed_at)
    .reduce((sum, t) => sum + t.estimated_minutes, 0);

  if (total === 0) return 0;
  const ratio = remaining / total;
  return ratio * WEIGHTS.remainingWorkload;
}

function scoreProgress(subjectTopics: Topic[]): number {
  const total = subjectTopics.length;
  if (total === 0) return 0;
  const completed = subjectTopics.filter((t) => t.completed_at).length;
  const progress = completed / total;
  // Lower progress => higher debt.
  return (1 - progress) * WEIGHTS.progress;
}

function scoreConfidence(subjectTopics: Topic[]): number {
  if (subjectTopics.length === 0) return 0;
  const avgConfidence =
    subjectTopics.reduce((sum, t) => sum + t.confidence, 0) / subjectTopics.length;
  return ((100 - avgConfidence) / 100) * WEIGHTS.confidence;
}

function scoreRecentActivity(
  subjectTopics: Topic[],
  sessions: StudySession[],
  now: Date
): number {
  const topicIds = new Set(subjectTopics.map((t) => t.id));
  const recentSessions = sessions.filter((s) => {
    if (!topicIds.has(s.topic_id)) return false;
    const daysSince = daysBetween(new Date(s.scheduled_start), now);
    return s.status === "completed" && daysSince >= 0 && daysSince <= 7;
  });

  if (recentSessions.length === 0) return WEIGHTS.recentActivity;
  const uniqueDays = new Set(
    recentSessions.map((s) => new Date(s.scheduled_start).toISOString().split("T")[0])
  ).size;
  if (uniqueDays >= 3) return 0;
  return WEIGHTS.recentActivity * (1 - uniqueDays / 3);
}

function debtLevel(score: number): DifficultyDebtResult["level"] {
  if (score >= 70) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export function calculateDifficultyDebt(input: DifficultyDebtInput): DifficultyDebtResult[] {
  const { subjects, topics, exams, sessions = [], now: nowInput = new Date() } = input;
  const now = new Date(nowInput);

  if (subjects.length === 0) return [];

  const topicsBySubject = new Map<string, Topic[]>();
  for (const topic of topics) {
    const existing = topicsBySubject.get(topic.subject_id) ?? [];
    existing.push(topic);
    topicsBySubject.set(topic.subject_id, existing);
  }

  return subjects
    .map((subject) => {
      const subjectTopics = topicsBySubject.get(subject.id) ?? [];
      const exam = getNearestExam(subject.id, exams, now);
      const daysUntilExam = exam ? daysBetween(now, exam.exam_date) : null;

      const scoreBreakdown = {
        difficulty: scoreDifficulty(subject),
        examUrgency: scoreExamUrgency(exam, now),
        remainingWorkload: scoreRemainingWorkload(subjectTopics),
        progress: scoreProgress(subjectTopics),
        confidence: scoreConfidence(subjectTopics),
        recentActivity: scoreRecentActivity(subjectTopics, sessions, now),
      };

      const rawScore = Object.values(scoreBreakdown).reduce((sum, v) => sum + v, 0);
      const debtScore = Math.round((rawScore / MAX_SCORE) * 100);

      const reasons: string[] = [];
      if (daysUntilExam !== null && daysUntilExam <= 14) {
        reasons.push(`exam ${daysUntilExam === 0 ? "today" : `in ${daysUntilExam} days`}`);
      }

      const subjectTotalMinutes = subjectTopics.reduce((sum, t) => sum + t.estimated_minutes, 0);
      const remainingMinutes = subjectTopics
        .filter((t) => !t.completed_at)
        .reduce((sum, t) => sum + t.estimated_minutes, 0);
      if (remainingMinutes > 0) {
        const workloadRatio =
          subjectTotalMinutes > 0
            ? Math.round((remainingMinutes / subjectTotalMinutes) * 100)
            : 0;
        reasons.push(`${workloadRatio}% workload remaining`);
      }

      reasons.push(`difficulty ${subject.difficulty}/5`);

      const avgConfidence =
        subjectTopics.length > 0
          ? subjectTopics.reduce((sum, t) => sum + t.confidence, 0) / subjectTopics.length
          : 100;
      if (avgConfidence < 70) {
        reasons.push(`confidence below target (${Math.round(avgConfidence)}%)`);
      }

      if (scoreBreakdown.recentActivity > WEIGHTS.recentActivity * 0.5) {
        reasons.push("little recent study activity");
      }

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        color: subject.color,
        debtScore,
        level: debtLevel(debtScore),
        reasons,
      };
    })
    .sort((a, b) => b.debtScore - a.debtScore);
}
