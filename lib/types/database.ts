/**
 * StudyPilot - Type definitions generated from Supabase schema.
 *
 * These types mirror the database tables and are used for type-safe
 * queries throughout the application.
 */

// Base types matching the database schema
export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  timezone: string;
  onboarding_completed: boolean;
  daily_study_goal_minutes: number;
  current_streak_days: number;
  longest_streak_days: number;
  study_goal: string | null;
  created_at: string;
  updated_at: string;
};

export type Subject = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  difficulty: number; // 1-5
  importance: number; // 1-5
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Topic = {
  id: string;
  subject_id: string;
  user_id: string;
  name: string;
  difficulty: number; // 1-5
  estimated_minutes: number; // 5-480
  confidence: number; // 0-100
  last_reviewed_at: string | null; // timestamptz
  needs_active_recall: boolean;
  is_new: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Exam = {
  id: string;
  user_id: string;
  subject_id: string;
  title: string;
  exam_date: string; // timestamptz
  importance: number; // 1-5
  topics_covered: string[]; // uuid[]
  created_at: string;
  updated_at: string;
};

export type StudySessionStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "skipped"
  | "rescheduled"
  | "cancelled";

export type EnergyMatch = "peak" | "steady" | "light" | null;

export type StudySession = {
  id: string;
  user_id: string;
  plan_id: string | null;
  topic_id: string;
  scheduled_start: string; // timestamptz
  scheduled_end: string; // timestamptz
  planned_minutes: number;
  actual_minutes: number | null;
  status: StudySessionStatus;
  energy_match: EnergyMatch;
  rescued_from_id: string | null;
  completed_at: string | null; // timestamptz
  created_at: string;
  updated_at: string;
};

export type StudyPlan = {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  generation_reason: "initial" | "plan_rescue" | "manual_regenerate";
  generated_at: string;
  plan_start_date: string; // date
  plan_end_date: string; // date
  created_at: string;
};

export type StudyPreference = {
  id: string;
  user_id: string;
  day_of_week: number; // 0-6 (Sunday-Saturday)
  start_time: string; // time
  end_time: string; // time
  energy_level: number; // 1-5
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type MemoryReview = {
  id: string;
  user_id: string;
  topic_id: string;
  reviewed_at: string; // timestamptz
  confidence_after: number; // 0-100
  recalled_correctly: boolean | null;
  review_type: "active_recall" | "passive_re-read" | "mock_exam";
  note: string | null;
  created_at: string;
};

export type DailyEnergy = {
  id: string;
  user_id: string;
  log_date: string; // date
  energy_level: number; // 1-5
  note: string | null;
  created_at: string;
};

export type Achievement = {
  id: string;
  user_id: string;
  achievement_key: string;
  title: string;
  description: string | null;
  icon: string | null;
  earned_at: string;
  created_at: string;
};

// Extended types with relations for UI components
export type SubjectWithTopics = Subject & {
  topics: Topic[];
  exams: Exam[];
};

export type SubjectWithProgress = Subject & {
  topics_total: number;
  topics_completed: number;
  progress: number;
  exam_date: string | null;
  exam_title: string | null;
  remaining_minutes: number;
};

export type TopicWithSubject = Topic & {
  subject: Subject;
};

export type ExamWithSubject = Exam & {
  subject: Subject;
};

export type StudySessionWithDetails = StudySession & {
  subject: Subject;
  topic: Topic;
};

// Dashboard types
export type DashboardData = {
  profile: Profile;
  subjects: Subject[];
  topics: Topic[];
  exams: Exam[];
  todaySessions: StudySessionWithDetails[];
  upcomingExam: ExamWithSubject | null;
  studyHealth: {
    weeklyHoursPlanned: number;
    weeklyHoursCompleted: number;
    sessionsCompleted: number;
    sessionsPlanned: number;
    streakDays: number;
    healthLabel: string;
  };
  studyNow: StudyNowRecommendation | null;
  subjectProgress: Array<{
    id: string;
    name: string;
    color: string;
    progress: number;
    topicsDone: number;
    topicsTotal: number;
  }>;
  radarTopics: Array<{
    id: string;
    topicName: string;
    subjectName: string;
    color: string;
    confidence: number;
    daysSinceReview: number;
  }>;
  debtItems: Array<{
    id: string;
    subjectName: string;
    color: string;
    debtScore: number;
    reason: string;
  }>;
};

// Recommendation engine types
export type ActivityType =
  | "learn"
  | "practice"
  | "active_recall"
  | "revision"
  | "mock_test";

export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export type StudyNowRecommendation = {
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  topicId: string;
  topicName: string;
  durationMinutes: number;
  reason: string;
  priorityScore: number;
  activityType: ActivityType;
  confidence: number;
};

export type DifficultyDebtResult = {
  subjectId: string;
  subjectName: string;
  color: string;
  debtScore: number;
  level: "low" | "medium" | "high";
  reasons: string[];
};

export type MemoryRadarCategory = "strong" | "needs_review" | "at_risk";

export type MemoryRadarTopic = {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  color: string;
  confidence: number;
  daysSinceReview: number;
  reviewsCount: number;
  lastRecalledCorrectly: boolean | null;
  category: MemoryRadarCategory;
  priorityScore: number;
  recommendedReviewDate: string;
};

export type BrainFitInput = {
  subjects: string[];
  availability: { start: string; end: string; energy: number }[];
};

export type BrainFitSlot = {
  date: string; // ISO date
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  energyLevel: EnergyLevel;
  availableMinutes: number;
};

export type BrainFitSessionProposal = {
  topicId: string;
  topicName: string;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  activityType: ActivityType;
  energyMatch: EnergyMatch;
  reason: string;
};

export type PlanRescueChange = {
  date: string;
  sessions: Array<{
    topicId: string;
    topicName: string;
    subjectName: string;
    subjectColor: string;
    addedMinutes: number;
    reason: string;
    rescuedFromSessionId?: string;
  }>;
};

export type PlanRescueProposal = {
  originalPlanId: string;
  newPlanName: string;
  changes: PlanRescueChange[];
  totalRecoveredMinutes: number;
  peakDailyIncreaseMinutes: number;
  explanation: string;
};

// Input types for mutations
export type CreateSubjectInput = {
  name: string;
  color?: string;
  difficulty: number;
  importance: number;
};

export type UpdateSubjectInput = Partial<CreateSubjectInput> & { id: string };

export type CreateTopicInput = {
  subject_id: string;
  name: string;
  difficulty: number;
  estimated_minutes: number;
  confidence?: number;
};

export type UpdateTopicInput = Partial<CreateTopicInput> & { id: string };

export type CreateExamInput = {
  subject_id: string;
  title: string;
  exam_date: string;
  importance: number;
  topics_covered?: string[];
};

export type UpdateExamInput = Partial<CreateExamInput> & { id: string };

export type CreateStudySessionInput = {
  topic_id: string;
  planned_minutes: number;
  scheduled_start: string; // ISO timestamptz
  scheduled_end: string; // ISO timestamptz
  status?: StudySessionStatus;
};

export type UpdateStudySessionInput = Partial<CreateStudySessionInput> & {
  id: string;
};

export type CompleteSessionInput = {
  id: string;
  actual_minutes: number;
  confidence?: number; // 1-5 optional memory log
  recalled_correctly?: boolean;
};

export type MemoryReviewInput = {
  topic_id: string;
  confidence_after: number;
  recalled_correctly?: boolean | null;
  review_type?: MemoryReview["review_type"];
  note?: string | null;
};

export type UpdateProfileInput = {
  full_name?: string;
  timezone?: string;
  daily_study_goal_minutes?: number;
};

export type StudyPreferenceInput = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  energy_level: number;
  is_active?: boolean;
};
