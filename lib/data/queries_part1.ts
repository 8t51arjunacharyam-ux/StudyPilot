/**
 * StudyPilot - Server-side data access layer.
 * 
 * All database queries go through these functions to ensure:
 * - Consistent RLS enforcement (queries run as authenticated user)
 * - Proper error handling
 * - Type safety
 * - Single source of truth for query logic
 */

import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/session';
import type {
  Profile,
  Subject,
  Topic,
  Exam,
  StudySession,
  StudyPreference,
  MemoryReview,
  DashboardData,
  SubjectWithTopics,
  SubjectWithProgress,
  TopicWithSubject,
  ExamWithSubject,
  StudySessionWithDetails,
} from '@/lib/types/database';

/**
 * Get a single subject with its topics and exams.
 */
export async function getSubjectWithDetails(subjectId: string): Promise<SubjectWithTopics | null> {
  const supabase = await createClient();
  
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const { data: subject, error: subjectError } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', subjectId)
    .eq('user_id', user.user.id)
    .maybeSingle();

  if (subjectError || !subject) return null;

  const [topicsResult, examsResult] = await Promise.all([
    supabase
      .from('topics')
      .select('*')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: true }),
    supabase
      .from('exams')
      .select('*')
      .eq('subject_id', subjectId)
      .order('exam_date', { ascending: true }),
  ]);

  return {
    ...subject,
    topics: topicsResult.data ?? [],
    exams: examsResult.data ?? [],
  };
}

/**
 * Get a single subject with computed progress fields for the detail page.
 */
export async function getSubjectWithProgress(subjectId: string): Promise<SubjectWithProgress | null> {
  const supabase = await createClient();
  
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const { data: subject, error: subjectError } = await supabase
    .from('subjects')
    .select('*')
    .eq('id', subjectId)
    .eq('user_id', user.user.id)
    .maybeSingle();

  if (subjectError || !subject) return null;

  const [topicsResult, examsResult] = await Promise.all([
    supabase
      .from('topics')
      .select('id, completed_at, estimated_minutes')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: true }),
    supabase
      .from('exams')
      .select('id, title, exam_date')
      .eq('subject_id', subjectId)
      .order('exam_date', { ascending: true }),
  ]);

  const topics = topicsResult.data ?? [];
  const topicsTotal = topics.length;
  const topicsCompleted = topics.filter((t) => t.completed_at).length;
  const progress = topicsTotal > 0 ? Math.round((topicsCompleted / topicsTotal) * 100) : 0;
  const remainingMinutes = topics
    .filter((t) => !t.completed_at)
    .reduce((sum, t) => sum + (t.estimated_minutes ?? 0), 0);

  const upcomingExam = examsResult.data?.[0] ?? null;

  return {
    ...subject,
    topics_total: topicsTotal,
    topics_completed: topicsCompleted,
    progress,
    exam_date: upcomingExam?.exam_date ?? null,
    exam_title: upcomingExam?.title ?? null,
    remaining_minutes: remainingMinutes,
  };
}

/**
 * Get all topics for the current user.
 */
export async function getTopics(): Promise<Topic[]> {
  const supabase = await createClient();
  
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[data] Failed to load topics:', error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Get all exams for the current user.
 */
export async function getExams(): Promise<Exam[]> {
  const supabase = await createClient();
  
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .order('exam_date', { ascending: true });

  if (error) {
    console.error('[data] Failed to load exams:', error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Get exams with subject details.
 */
export async function getExamsWithSubjects(): Promise<ExamWithSubject[]> {
  const supabase = await createClient();
  
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const { data, error } = await supabase
    .from('exams')
    .select(`
      *,
      subject:subjects(*)
    `)
    .eq('user_id', user.user.id)
    .order('exam_date', { ascending: true });

  if (error) {
    console.error('[data] Failed to load exams with subjects:', error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Get study sessions for a date range.
 */
export async function getStudySessions(
  startDate: string,
  endDate: string
): Promise<StudySessionWithDetails[]> {
  const supabase = await createClient();
  
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const { data, error } = await supabase
    .from('study_sessions')
    .select(`
      *,
      subject:subjects(*),
      topic:topics(*)
    `)
    .eq('user_id', user.user.id)
    .gte('scheduled_start', `${startDate}T00:00:00`)
    .lte('scheduled_start', `${endDate}T23:59:59`)
    .order('scheduled_start', { ascending: true });

  if (error) {
    console.error('[data] Failed to load study sessions:', error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Get today's study sessions.
 */
export async function getTodaySessions(): Promise<StudySessionWithDetails[]> {
  const today = new Date().toISOString().split('T')[0];
  return getStudySessions(today, today);
}

/**
 * Get study preferences for the current user.
 */
export async function getStudyPreferences(): Promise<StudyPreference[]> {
  const supabase = await createClient();
  
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const { data, error } = await supabase
    .from('study_preferences')
    .select('*')
    .eq('user_id', user.user.id)
    .eq('is_active', true)
    .order('day_of_week', { ascending: true })
    .order('start_time', { ascending: true });

  if (error) {
    console.error('[data] Failed to load study preferences:', error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Get memory reviews for the current user.
 */
export async function getMemoryReviews(): Promise<MemoryReview[]> {
  const supabase = await createClient();
  
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const { data, error } = await supabase
    .from('memory_reviews')
    .select('*')
    .eq('user_id', user.user.id)
    .order('reviewed_at', { ascending: false });

  if (error) {
    console.error('[data] Failed to load memory reviews:', error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Get all subjects for the current user.
 */
export async function getSubjects(): Promise<Subject[]> {
  const supabase = await createClient();
  
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('user_id', user.user.id)
    .is('archived_at', null)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[data] Failed to load subjects:', error.message);
    return [];
  }

  return data ?? [];
}

/**
 * Get the current user's profile.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.user.id)
    .maybeSingle();

  if (error) {
    console.error('[data] Failed to load profile:', error.message);
    return null;
  }

  return data;
}
