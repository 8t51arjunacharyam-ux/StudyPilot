"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import type { StudySessionStatus } from "@/lib/types/database";

export type StudySessionInput = {
  plan_id?: string | null;
  topic_id: string;
  scheduled_start: string;
  scheduled_end: string;
  planned_minutes: number;
  status?: StudySessionStatus;
};

export type StudySessionUpdate = Partial<StudySessionInput> & {
  id: string;
  actual_minutes?: number | null;
};

export type CompleteSessionInput = {
  id: string;
  actual_minutes: number;
  confidence?: number; // 1-5, optional memory log
  recalled_correctly?: boolean;
};

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function readableDbError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("duplicate key")) {
    return "A session with this schedule already exists.";
  }
  if (lower.includes("violates check constraint")) {
    return "One of the values is outside the allowed range.";
  }
  if (lower.includes("violates foreign key")) {
    return "The session references a topic or plan that no longer exists.";
  }
  if (lower.includes("row-level security") || lower.includes("rls")) {
    console.error("[study_sessions] RLS blocked an operation:", message);
    return "You don't have permission to perform this action.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Could not reach the server. Check your connection and try again.";
  }

  console.error("[study_sessions] Unhandled database error:", message);
  return "Something went wrong. Please try again.";
}

export async function createStudySession(input: StudySessionInput): Promise<ActionResult> {
  const user = await requireUser();

  if (!input.topic_id) {
    return { ok: false, error: "Topic ID is required." };
  }
  if (!input.scheduled_start || !input.scheduled_end) {
    return { ok: false, error: "Scheduled start and end times are required." };
  }
  if (new Date(input.scheduled_end) <= new Date(input.scheduled_start)) {
    return { ok: false, error: "End time must be after start time." };
  }
  if (input.planned_minutes < 5 || input.planned_minutes > 480) {
    return { ok: false, error: "Planned minutes must be between 5 and 480." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.from("study_sessions").insert({
      user_id: user.id,
      plan_id: input.plan_id ?? null,
      topic_id: input.topic_id,
      scheduled_start: input.scheduled_start,
      scheduled_end: input.scheduled_end,
      planned_minutes: input.planned_minutes,
      status: input.status ?? "planned",
    });

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/planner");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error("[study_sessions] createStudySession threw:", error);
    return { ok: false, error: "Could not create study session. Please try again." };
  }
}

export async function updateStudySession(input: StudySessionUpdate): Promise<ActionResult> {
  const user = await requireUser();

  const { id, ...updates } = input;

  if (!id) {
    return { ok: false, error: "Session ID is required." };
  }

  if (updates.scheduled_start && updates.scheduled_end) {
    if (new Date(updates.scheduled_end) <= new Date(updates.scheduled_start)) {
      return { ok: false, error: "End time must be after start time." };
    }
  }
  if (
    updates.planned_minutes !== undefined &&
    (updates.planned_minutes < 5 || updates.planned_minutes > 480)
  ) {
    return { ok: false, error: "Planned minutes must be between 5 and 480." };
  }
  if (
    updates.actual_minutes !== undefined &&
    updates.actual_minutes !== null &&
    (updates.actual_minutes < 0 || updates.actual_minutes > 1440)
  ) {
    return { ok: false, error: "Actual minutes must be between 0 and 1440." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("study_sessions")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/planner");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error("[study_sessions] updateStudySession threw:", error);
    return { ok: false, error: "Could not update study session. Please try again." };
  }
}

export async function startStudySession(id: string): Promise<ActionResult> {
  const user = await requireUser();

  if (!id) {
    return { ok: false, error: "Session ID is required." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("study_sessions")
      .update({ status: "in_progress" })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "planned");

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/planner");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error("[study_sessions] startStudySession threw:", error);
    return { ok: false, error: "Could not start study session. Please try again." };
  }
}

export async function completeStudySession(input: CompleteSessionInput): Promise<ActionResult> {
  const user = await requireUser();

  if (!input.id) {
    return { ok: false, error: "Session ID is required." };
  }
  if (input.actual_minutes < 0 || input.actual_minutes > 1440) {
    return { ok: false, error: "Actual minutes must be between 0 and 1440." };
  }

  try {
    const supabase = await createClient();

    // Fetch the session to know which topic we are updating.
    const { data: session, error: sessionError } = await supabase
      .from("study_sessions")
      .select("topic_id, planned_minutes")
      .eq("id", input.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (sessionError || !session) {
      return { ok: false, error: "Session not found." };
    }

    const completedAt = new Date().toISOString();

    const { error } = await supabase
      .from("study_sessions")
      .update({
        actual_minutes: input.actual_minutes,
        status: "completed",
        completed_at: completedAt,
      })
      .eq("id", input.id)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    // Update topic progress: boost confidence slightly, mark as no longer new,
    // and record the review timestamp.
    const { data: topic } = await supabase
      .from("topics")
      .select("confidence, estimated_minutes")
      .eq("id", session.topic_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (topic) {
      const effortRatio = Math.min(1, input.actual_minutes / Math.max(1, topic.estimated_minutes));
      const confidenceBoost = Math.round(effortRatio * 5);
      const newConfidence = Math.min(100, topic.confidence + confidenceBoost);

      const updatePayload: {
        confidence: number;
        last_reviewed_at: string;
        is_new: boolean;
        needs_active_recall: boolean;
        completed_at?: string;
      } = {
        confidence: newConfidence,
        last_reviewed_at: completedAt,
        is_new: false,
        needs_active_recall: newConfidence < 80,
      };

      if (newConfidence >= 80) {
        updatePayload.completed_at = completedAt;
      }

      await supabase.from("topics").update(updatePayload).eq("id", session.topic_id).eq("user_id", user.id);
    }

    // Log memory review when the student reported confidence.
    if (input.confidence !== undefined && input.confidence >= 1 && input.confidence <= 5) {
      const confidenceAfter = Math.min(100, input.confidence * 20);
      await supabase.from("memory_reviews").insert({
        user_id: user.id,
        topic_id: session.topic_id,
        reviewed_at: completedAt,
        confidence_after: confidenceAfter,
        recalled_correctly: input.recalled_correctly ?? null,
        review_type: "active_recall",
      });
    }

    revalidatePath("/planner");
    revalidatePath("/dashboard");
    revalidatePath("/memory");
    return { ok: true };
  } catch (error) {
    console.error("[study_sessions] completeStudySession threw:", error);
    return { ok: false, error: "Could not complete study session. Please try again." };
  }
}

export async function skipStudySession(id: string): Promise<ActionResult> {
  const user = await requireUser();

  if (!id) {
    return { ok: false, error: "Session ID is required." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("study_sessions")
      .update({ status: "skipped" })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/planner");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error("[study_sessions] skipStudySession threw:", error);
    return { ok: false, error: "Could not skip study session. Please try again." };
  }
}

export async function rescheduleStudySession(
  id: string,
  newStart: string,
  newEnd: string
): Promise<ActionResult> {
  const user = await requireUser();

  if (!id) {
    return { ok: false, error: "Session ID is required." };
  }
  if (!newStart || !newEnd) {
    return { ok: false, error: "New start and end times are required." };
  }
  if (new Date(newEnd) <= new Date(newStart)) {
    return { ok: false, error: "End time must be after start time." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("study_sessions")
      .update({
        scheduled_start: newStart,
        scheduled_end: newEnd,
        status: "rescheduled",
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/planner");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error("[study_sessions] rescheduleStudySession threw:", error);
    return { ok: false, error: "Could not reschedule study session. Please try again." };
  }
}

export async function deleteStudySession(id: string): Promise<ActionResult> {
  const user = await requireUser();

  if (!id) {
    return { ok: false, error: "Session ID is required." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.from("study_sessions").delete().eq("id", id).eq("user_id", user.id);

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/planner");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error("[study_sessions] deleteStudySession threw:", error);
    return { ok: false, error: "Could not delete study session. Please try again." };
  }
}

export async function cancelStudySession(id: string): Promise<ActionResult> {
  const user = await requireUser();

  if (!id) {
    return { ok: false, error: "Session ID is required." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("study_sessions")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/planner");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error("[study_sessions] cancelStudySession threw:", error);
    return { ok: false, error: "Could not cancel study session. Please try again." };
  }
}

export async function createStudySessionFromRecommendation(
  topicId: string,
  plannedMinutes: number
): Promise<ActionResult<{ sessionId: string }>> {
  const user = await requireUser();

  if (!topicId) {
    return { ok: false, error: "Topic ID is required." };
  }
  if (plannedMinutes < 5 || plannedMinutes > 480) {
    return { ok: false, error: "Planned minutes must be between 5 and 480." };
  }

  try {
    const supabase = await createClient();

    // Create session starting now
    const now = new Date();
    const scheduledStart = now.toISOString();
    const scheduledEnd = new Date(now.getTime() + plannedMinutes * 60000).toISOString();

    const { data, error } = await supabase
      .from("study_sessions")
      .insert({
        user_id: user.id,
        plan_id: null,
        topic_id: topicId,
        scheduled_start: scheduledStart,
        scheduled_end: scheduledEnd,
        planned_minutes: plannedMinutes,
        status: "in_progress",
      })
      .select("id")
      .single();

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/planner");
    revalidatePath("/dashboard");
    return { ok: true, data: { sessionId: data.id } };
  } catch (error) {
    console.error("[study_sessions] createStudySessionFromRecommendation threw:", error);
    return { ok: false, error: "Could not create study session. Please try again." };
  }
}

// Aliases for backward compatibility
export const createStudySessionAction = createStudySession;
export const updateStudySessionAction = updateStudySession;
export const startStudySessionAction = startStudySession;
export const completeStudySessionAction = completeStudySession;
export const skipStudySessionAction = skipStudySession;
export const rescheduleStudySessionAction = rescheduleStudySession;
export const deleteStudySessionAction = deleteStudySession;
export const cancelStudySessionAction = cancelStudySession;
export const createStudySessionFromRecommendationAction = createStudySessionFromRecommendation;
