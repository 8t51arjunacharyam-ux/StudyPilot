/**
 * Study Now recommendation engine.
 *
 * Produces a deterministic, transparent recommendation for what the student
 * should study right now. The scoring is intentionally explainable: every
 * factor contributes a bounded sub-score so no single value can dominate
 * the result unpredictably.
 *
 * The engine does NOT use AI. It is a set of weighted heuristics over
 * Supabase data.
 */

import type {
  Subject,
  Topic,
  Exam,
  StudySession,
  StudyPreference,
  StudyNowRecommendation,
  ActivityType,
} from "@/lib/types/database";
import { daysBetween, clamp, getDayOfWeek, applyTime, toISODate, minutesBetween } from "./utils";

export type StudyNowInput = {
  subjects: Subject[];
  topics: Topic[];
  exams: Exam[];
  sessions: StudySession[];
  preferences: StudyPreference[];
  dailyStudyGoalMinutes: number;
  now?: Date | string;
};

const WEIGHTS = {
  examUrgency: 25,
  subjectDifficulty: 10,
  topicWorkload: 10,
  topicConfidence: 25,
  timeSinceStudy: 15,
  availableTime: 10,
  energyPeriod: 5,
} as const;

const MAX_SCORE =
  WEIGHTS.examUrgency +
  WEIGHTS.subjectDifficulty +
  WEIGHTS.topicWorkload +
  WEIGHTS.topicConfidence +
  WEIGHTS.timeSinceStudy +
  WEIGHTS.availableTime +
  WEIGHTS.energyPeriod;

function getExamForSubject(subjectId: string, exams: Exam[]): Exam | null {
  return (
    exams
      .filter((e) => e.subject_id === subjectId)
      .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())[0] ?? null
  );
}

function scoreExamUrgency(topic: Topic, exams: Exam[], now: Date): number {
  const exam = getExamForSubject(topic.subject_id, exams);
  if (!exam) return 0;

  const daysUntil = daysBetween(now, exam.exam_date);
  if (daysUntil < 0) return 0; // past exam
  if (daysUntil <= 1) return WEIGHTS.examUrgency;
  if (daysUntil <= 3) return WEIGHTS.examUrgency * 0.8;
  if (daysUntil <= 7) return WEIGHTS.examUrgency * 0.6;
  if (daysUntil <= 14) return WEIGHTS.examUrgency * 0.4;
  if (daysUntil <= 30) return WEIGHTS.examUrgency * 0.2;
  return 0;
}

function scoreSubjectDifficulty(subject: Subject | undefined): number {
  if (!subject) return 0;
  // difficulty is 1-5; scale to weight.
  return (subject.difficulty / 5) * WEIGHTS.subjectDifficulty;
}

function scoreTopicWorkload(topic: Topic): number {
  // Favour topics that still have a meaningful chunk of work remaining.
  const minutes = clamp(topic.estimated_minutes, 5, 480);
  return (minutes / 480) * WEIGHTS.topicWorkload;
}

function scoreTopicConfidence(topic: Topic): number {
  // Lower confidence => higher score.
  const confidence = clamp(topic.confidence, 0, 100);
  return ((100 - confidence) / 100) * WEIGHTS.topicConfidence;
}

function scoreTimeSinceStudy(topic: Topic, now: Date): number {
  const lastReview = topic.last_reviewed_at ?? topic.created_at;
  const daysSince = daysBetween(new Date(lastReview), now);
  if (daysSince < 0) return 0;
  if (daysSince <= 1) return WEIGHTS.timeSinceStudy * 0.1;
  if (daysSince <= 3) return WEIGHTS.timeSinceStudy * 0.3;
  if (daysSince <= 7) return WEIGHTS.timeSinceStudy * 0.6;
  if (daysSince <= 14) return WEIGHTS.timeSinceStudy * 0.8;
  return WEIGHTS.timeSinceStudy;
}

function getCurrentEnergyLevel(
  now: Date,
  preferences: StudyPreference[]
): { level: number; label: "peak" | "steady" | "light" } {
  const dow = getDayOfWeek(now);
  const timeValue = now.getHours() * 60 + now.getMinutes();

  const matching = preferences.filter((p) => {
    if (p.day_of_week !== dow) return false;
    const start = applyTime(now, p.start_time);
    const end = applyTime(now, p.end_time);
    const startValue = start.getHours() * 60 + start.getMinutes();
    const endValue = end.getHours() * 60 + end.getMinutes();
    return timeValue >= startValue && timeValue < endValue;
  });

  if (matching.length === 0) {
    return { level: 3, label: "steady" };
  }

  const avg =
    matching.reduce((sum, p) => sum + clamp(p.energy_level, 1, 5), 0) / matching.length;

  if (avg >= 4) return { level: Math.round(avg), label: "peak" };
  if (avg >= 2.5) return { level: Math.round(avg), label: "steady" };
  return { level: Math.round(avg), label: "light" };
}

function scoreEnergyPeriod(
  topic: Topic,
  subject: Subject | undefined,
  now: Date,
  preferences: StudyPreference[]
): number {
  const energy = getCurrentEnergyLevel(now, preferences);
  const difficulty = clamp(topic.difficulty + (subject?.difficulty ?? 0), 2, 10) / 2; // rough aggregate 1-5

  // High energy + hard work is ideal. Low energy + hard work is mismatched.
  const ideal = energy.label === "peak" ? 5 : energy.label === "steady" ? 3 : 1;
  const gap = Math.abs(ideal - difficulty);
  return clamp((1 - gap / 5) * WEIGHTS.energyPeriod, 0, WEIGHTS.energyPeriod);
}

function calculateAvailableMinutesToday(
  now: Date,
  preferences: StudyPreference[],
  sessions: StudySession[],
  dailyGoalMinutes: number
): number {
  const dateStr = toISODate(now);
  const dow = getDayOfWeek(now);

  const availableToday = preferences
    .filter((p) => p.day_of_week === dow)
    .reduce((sum, p) => {
      const start = applyTime(now, p.start_time);
      const end = applyTime(now, p.end_time);
      return sum + Math.max(0, minutesBetween(start, end));
    }, 0);

  const usedToday = sessions
    .filter((s) => {
      const sessionDate = toISODate(s.scheduled_start);
      return sessionDate === dateStr && ["planned", "in_progress", "completed"].includes(s.status);
    })
    .reduce((sum, s) => sum + s.planned_minutes, 0);

  const capacity = availableToday > 0 ? availableToday : dailyGoalMinutes;
  return Math.max(0, capacity - usedToday);
}

function scoreAvailableTime(
  topic: Topic,
  now: Date,
  preferences: StudyPreference[],
  sessions: StudySession[],
  dailyGoalMinutes: number
): number {
  const available = calculateAvailableMinutesToday(
    now,
    preferences,
    sessions,
    dailyGoalMinutes
  );
  const needed = topic.estimated_minutes;
  if (available >= needed) return WEIGHTS.availableTime;
  if (available >= needed * 0.5) return WEIGHTS.availableTime * 0.6;
  if (available > 0) return WEIGHTS.availableTime * 0.2;
  return 0;
}

function chooseActivityType(
  topic: Topic,
  subject: Subject | undefined,
  exam: Exam | null,
  energyLabel: "peak" | "steady" | "light",
  daysUntilExam: number | null
): ActivityType {
  if (daysUntilExam !== null && daysUntilExam <= 3) return "mock_test";
  if (topic.is_new) return "learn";
  if (energyLabel === "peak" && topic.difficulty >= 4) return "practice";
  if (topic.confidence < 50) return "learn";
  if (topic.confidence < 70) return "active_recall";
  if (energyLabel === "light") return "revision";
  return "revision";
}

function buildReason(
  topic: Topic,
  subject: Subject,
  exam: Exam | null,
  daysUntilExam: number | null,
  energyLabel: "peak" | "steady" | "light",
  scoreBreakdown: Record<string, number>
): string {
  const parts: string[] = [];

  if (exam && daysUntilExam !== null && daysUntilExam <= 14) {
    parts.push(`your ${subject.name} exam is ${daysUntilExam === 0 ? "today" : `in ${daysUntilExam} days`}`);
  }

  if (topic.confidence < 50) {
    parts.push("your confidence is low");
  } else if (topic.confidence < 70) {
    parts.push("your confidence is below target");
  }

  const lastReview = topic.last_reviewed_at ?? topic.created_at;
  const daysSince = daysBetween(new Date(lastReview), new Date());
  if (daysSince >= 7) {
    parts.push("this topic has not been reviewed recently");
  }

  if (topic.is_new) {
    parts.push("this topic still needs first-time study");
  }

  if (energyLabel === "peak" && topic.difficulty >= 4) {
    parts.push("your current energy window suits difficult work");
  }

  if (parts.length === 0) {
    parts.push("this topic is the next priority in your schedule");
  }

  return `Recommended because ${parts.join(", ")}.`;
}

export function recommendStudyNow(input: StudyNowInput): StudyNowRecommendation | null {
  const {
    subjects,
    topics,
    exams,
    sessions,
    preferences,
    dailyStudyGoalMinutes,
    now: nowInput = new Date(),
  } = input;

  const now = new Date(nowInput);

  if (subjects.length === 0 || topics.length === 0) return null;

  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const incompleteTopics = topics.filter((t) => !t.completed_at);

  if (incompleteTopics.length === 0) return null;

  const candidates = incompleteTopics.map((topic) => {
    const subject = subjectById.get(topic.subject_id);
    if (!subject) return null;

    const exam = getExamForSubject(subject.id, exams);
    const daysUntilExam = exam ? daysBetween(now, exam.exam_date) : null;

    const breakdown = {
      examUrgency: scoreExamUrgency(topic, exams, now),
      subjectDifficulty: scoreSubjectDifficulty(subject),
      topicWorkload: scoreTopicWorkload(topic),
      topicConfidence: scoreTopicConfidence(topic),
      timeSinceStudy: scoreTimeSinceStudy(topic, now),
      availableTime: scoreAvailableTime(
        topic,
        now,
        preferences,
        sessions,
        dailyStudyGoalMinutes
      ),
      energyPeriod: scoreEnergyPeriod(topic, subject, now, preferences),
    };

    const rawScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
    const priorityScore = Math.round((rawScore / MAX_SCORE) * 100);

    const energy = getCurrentEnergyLevel(now, preferences);
    const activityType = chooseActivityType(topic, subject, exam, energy.label, daysUntilExam);

    // Recommended duration respects available time but never drops below 15 min.
    const available = calculateAvailableMinutesToday(
      now,
      preferences,
      sessions,
      dailyStudyGoalMinutes
    );
    const idealDuration = clamp(topic.estimated_minutes, 15, 120);
    const durationMinutes = Math.min(idealDuration, Math.max(available, 15));

    const reason = buildReason(topic, subject, exam, daysUntilExam, energy.label, breakdown);

    return {
      subjectId: subject.id,
      subjectName: subject.name,
      subjectColor: subject.color,
      topicId: topic.id,
      topicName: topic.name,
      durationMinutes,
      reason,
      priorityScore,
      activityType,
      confidence: topic.confidence,
    } satisfies StudyNowRecommendation;
  });

  const valid = candidates.filter((c): c is StudyNowRecommendation => c !== null);
  if (valid.length === 0) return null;

  // Tie-break by priority score, then lower confidence, then earlier exam.
  valid.sort((a, b) => {
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    if (a.confidence !== b.confidence) return a.confidence - b.confidence;
    return a.topicName.localeCompare(b.topicName);
  });

  return valid[0];
}
