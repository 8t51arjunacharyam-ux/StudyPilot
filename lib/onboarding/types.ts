/**
 * Onboarding domain types.
 *
 * WHY THESE EXIST SEPARATELY FROM DATABASE TYPES
 *
 * Onboarding collects a DIFFERENT shape of data from what the database stores.
 * Here the student is describing "Calculus is hard and matters a lot", which
 * is a form input. In the database that becomes `difficulty: 8` and
 * `importance: 5` in separate columns.
 *
 * Keeping the form shape separate means the UI can evolve without silently
 * reshaping the schema, and the mapping code stays in one obvious place.
 */

/** Difficulty is 1-10 after migration 002. */
export const DIFFICULTY_MIN = 1;
export const DIFFICULTY_MAX = 10;

/** Importance stays 1-5, matching exams.importance. */
export const IMPORTANCE_MIN = 1;
export const IMPORTANCE_MAX = 5;

export const MIN_TOPIC_MINUTES = 5;
export const MAX_TOPIC_MINUTES = 480;
export const MAX_DAILY_MINUTES = 720;

/** A subject being collected in step 2, before it has a database id. */
export type DraftSubject = {
  /** Temporary client-side key so React lists stay stable. Never persisted. */
  key: string;
  name: string;
  difficulty: number;
  importance: number;
  color?: string;
  /** Topics nested under this subject, collected in step 3. */
  topics: DraftTopic[];
};

/** A topic being collected in step 3. */
export type DraftTopic = {
  key: string;
  name: string;
  difficulty: number;
  estimatedMinutes: number;
  confidence: number;
};

/** An exam being collected in step 4. */
export type DraftExam = {
  key: string;
  /** Refers to a DraftSubject.key, not a database id yet. */
  subjectKey: string;
  title: string;
  examDate: string;
  importance: number;
};

/** Availability from step 5. */
export type DraftAvailability = {
  /** 0 = Sunday ... 6 = Saturday. Matches the database. */
  days: number[];
  startTime: string;
  endTime: string;
  maxMinutesPerDay: number;
};

/** Energy periods from step 6. */
export type DraftEnergy = {
  high: string[];
  medium: string[];
  low: string[];
};

/** Everything collected across all six steps. */
export type OnboardingData = {
  displayName: string;
  studyGoal: string;
  subjects: DraftSubject[];
  exams: DraftExam[];
  availability: DraftAvailability;
  energy: DraftEnergy;
};

/** The canonical, empty starting state. */
export function emptyOnboardingData(): OnboardingData {
  return {
    displayName: "",
    studyGoal: "",
    subjects: [],
    exams: [],
    availability: {
      days: [],
      startTime: "18:00",
      endTime: "21:00",
      maxMinutesPerDay: 180,
    },
    energy: { high: [], medium: [], low: [] },
  };
}

/** The six time blocks students recognise, matching JavaScript's getHours(). */
export const TIME_BLOCKS = [
  { id: "early_morning", label: "Early morning", startHour: 5, endHour: 8 },
  { id: "morning", label: "Morning", startHour: 8, endHour: 12 },
  { id: "afternoon", label: "Afternoon", startHour: 12, endHour: 17 },
  { id: "evening", label: "Evening", startHour: 17, endHour: 21 },
  { id: "night", label: "Night", startHour: 21, endHour: 24 },
] as const;

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * Map a time block to the 1-5 energy_level the database stores.
 *
 * The step-6 UI collects three buckets (high / medium / low) because that is
 * how people think. The database stores a 1-5 number because that is what the
 * scheduler needs in order to rank and compare blocks. This function is the
 * single, explicit bridge between the two — so the mapping can never drift.
 */
export function energyLevelFor(bucket: "high" | "medium" | "low"): number {
  if (bucket === "high") return 5;
  if (bucket === "medium") return 3;
  return 1;
}

/** A stable key for React lists. Never sent to the database. */
export function makeKey(): string {
  return Math.random().toString(36).slice(2, 10);
}