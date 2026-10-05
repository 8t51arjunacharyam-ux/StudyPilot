/**
 * ============================================================================
 * DEVELOPMENT MOCK DATA — NOT REAL DATA
 * ============================================================================
 *
 * Every value in this file is a hardcoded example used to build and review
 * the dashboard layout before Supabase exists.
 *
 * DO NOT TREAT ANY OF THIS AS REAL. Specifically:
 *   - Nothing here is read from a database.
 *   - No user, exam, subject or session here corresponds to real data.
 *   - The "Sample Student" identity is a placeholder, not an account.
 *   - No scheduling, rescue, memory or risk calculation happens here. The
 *     numbers are hand-written constants that merely *look like* the output
 *     the real engine will later compute.
 *
 * WHY IT EXISTS: we need to design and iterate on the interface using
 * realistic content. Waiting for the database and scheduling algorithms
 * would mean designing blind; building the UI against live features would
 * mean layout work blocks on the hardest part of the product.
 *
 * HOW IT GETS REMOVED: in the Supabase phase, each export here is replaced
 * by a real query returning the same shapes. The types below are the
 * contract that must be preserved, so UI components keep working unchanged.
 * This file should then be deleted, not left to rot.
 * ============================================================================
 */

export type SubjectProgress = {
  id: string;
  name: string;
  color: string;
  /** 0–100 */
  progress: number;
  topicsDone: number;
  topicsTotal: number;
};

export type MockSession = {
  id: string;
  topicName: string;
  subjectName: string;
  color: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  /** Manual constant, not a computed energy match. */
  energyLabel: "Peak focus" | "Steady" | "Light";
  status: "planned" | "completed" | "skipped";
};

export type RadarTopic = {
  id: string;
  topicName: string;
  subjectName: string;
  color: string;
  /** 0–100, hand-written to demonstrate the visual range. */
  confidence: number;
  daysSinceReview: number;
};

export type DebtItem = {
  id: string;
  subjectName: string;
  color: string;
  /** Hand-written placeholder; the real engine computes this. */
  debtScore: number;
  reason: string;
};

export type MockStudyNow = {
  topicName: string;
  subjectName: string;
  color: string;
  durationMinutes: number;
  /** Placeholder rationale, not generated reasoning. */
  whyThis: string;
  confidence: number;
};

export type MockExam = {
  title: string;
  subjectName: string;
  dateLabel: string;
  daysAway: number;
  topicsRemaining: number;
};

/* ---- All values below are invented example content. ---- */
export const mockStudyNow: MockStudyNow = {
  topicName: "Reaction Mechanisms",
  subjectName: "Organic Chemistry",
  color: "#0891b2",
  durationMinutes: 60,
  whyThis:
    "Your Organic Chemistry exam is in 12 days and this topic's confidence has dropped to 41%. It also sits in a peak-focus window you have free right now.",
  confidence: 41,
};

export const mockRadarTopics: RadarTopic[] = [
  { id: "t1", topicName: "Nucleophilic Substitution", subjectName: "Organic Chemistry", color: "#0891b2", confidence: 34, daysSinceReview: 12 },
  { id: "t2", topicName: "Eigenvalue Decomposition", subjectName: "Linear Algebra", color: "#7c3aed", confidence: 41, daysSinceReview: 9 },
  { id: "t3", topicName: "Integration by Parts", subjectName: "Calculus", color: "#4f46e5", confidence: 58, daysSinceReview: 6 },
  { id: "t4", topicName: "Bayes Theorem", subjectName: "Statistics", color: "#ca8a04", confidence: 79, daysSinceReview: 3 },
];

export const mockDebtItems: DebtItem[] = [
  { id: "d1", subjectName: "Linear Algebra", color: "#7c3aed", debtScore: 82, reason: "11 topics untouched in 14 days, exam in 9 days" },
  { id: "d2", subjectName: "Organic Chemistry", color: "#0891b2", debtScore: 71, reason: "Confidence below 50% across 4 topics" },
  { id: "d3", subjectName: "Calculus", color: "#4f46e5", debtScore: 48, reason: "Two missed sessions last week" },
];

export const mockUpcomingExam: MockExam = {
  title: "Linear Algebra Final",
  subjectName: "Linear Algebra",
  dateLabel: "14 Oct 2026, 09:00",
  daysAway: 9,
  topicsRemaining: 11,
};

/** Hand-written summary numbers for the "study health" panel. */
export const mockStudyHealth = {
  weeklyHoursPlanned: 12,
  weeklyHoursCompleted: 8.5,
  sessionsCompleted: 9,
  sessionsPlanned: 13,
  streakDays: 6,
  /** Placeholder label — the real score is computed by Difficulty Debt. */
  healthLabel: "Fairly on track",
};

export const mockSubjectProgress: SubjectProgress[] = [
  { id: "s1", name: "Calculus", color: "#4f46e5", progress: 72, topicsDone: 13, topicsTotal: 18 },
  { id: "s2", name: "Organic Chemistry", color: "#0891b2", progress: 45, topicsDone: 8, topicsTotal: 18 },
  { id: "s3", name: "Linear Algebra", color: "#7c3aed", progress: 31, topicsDone: 5, topicsTotal: 16 },
  { id: "s4", name: "Statistics", color: "#ca8a04", progress: 88, topicsDone: 14, topicsTotal: 16 },
];

export const mockTodaySessions: MockSession[] = [
  { id: "ses1", topicName: "Integration by Parts", subjectName: "Calculus", color: "#4f46e5", startTime: "07:00", endTime: "08:00", durationMinutes: 60, energyLabel: "Peak focus", status: "completed" },
  { id: "ses2", topicName: "Reaction Mechanisms", subjectName: "Organic Chemistry", color: "#0891b2", startTime: "09:30", endTime: "10:30", durationMinutes: 60, energyLabel: "Steady", status: "planned" },
  { id: "ses3", topicName: "Eigenvalues and Eigenvectors", subjectName: "Linear Algebra", color: "#7c3aed", startTime: "14:00", endTime: "15:00", durationMinutes: 60, energyLabel: "Steady", status: "planned" },
  { id: "ses4", topicName: "Hypothesis Testing Review", subjectName: "Statistics", color: "#ca8a04", startTime: "19:00", endTime: "19:40", durationMinutes: 40, energyLabel: "Light", status: "planned" },
];