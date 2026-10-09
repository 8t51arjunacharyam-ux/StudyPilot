"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import {
  validateOnboarding,
  type ValidationErrors,
} from "@/lib/onboarding/validation";
import {
  energyLevelFor,
  TIME_BLOCKS,
  type OnboardingData,
} from "@/lib/onboarding/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

/**
 * Persisting onboarding data to Supabase.
 *
 * WHERE THE DATA LIVES
 *   The database. Not localStorage, not a cookie.
 *
 *   localStorage would be wrong for a specific reason, not just preference:
 *   it lives in the BROWSER, so a student signing in on their phone would see
 *   an empty dashboard that silently failed to sync. It is also readable and
 *   writable by any script on the page. React state here is only the
 *   in-progress form; the server is the single source of truth.
 *
 * DUPLICATE SUBMISSIONS — handled at two levels
 *   1. In the UI the submit button is disabled while the action is in flight,
 *      so a double-click cannot fire two requests.
 *   2. On the server, a guard check makes a repeated submission a no-op rather
 *      than a second copy of every subject.
 *
 * ROLLBACK ON PARTIAL FAILURE
 *   All bulk inserts run inside one Postgres transaction. If the topics insert
 *   failed after subjects were created, we must not leave a half-built subject
 *   set behind - the student would think setup finished with incomplete data
 *   and have no way to tell.
 */

/** What the UI receives back. Never a raw Supabase error. */
export type SaveResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: ValidationErrors };

/** Turn a Postgres error into something safe to show a student. */
function readableDbError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("duplicate key")) {
    return "Some of that information already exists. Please review your entries and try again.";
  }
  if (lower.includes("violates check constraint")) {
    return "One of your entries has a value outside the allowed range. Please review and try again.";
  }
  if (lower.includes("violates foreign key")) {
    return "One of your entries refers to something that no longer exists. Please review your entries.";
  }
  if (lower.includes("row-level security") || lower.includes("rls")) {
    // Reaching here is a real bug: RLS blocked our own write.
    console.error("[onboarding] RLS blocked an insert:", message);
    return "We could not save your progress. If this persists, please contact support.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "We could not reach the server. Check your connection and try again — your answers are still here.";
  }

  console.error("[onboarding] Unhandled database error:", message);
  return "Something went wrong while saving. Please try again.";
}
export async function saveOnboardingAction(
  payload: OnboardingData
): Promise<SaveResult> {
  // 1. WHO — no session, no write. Every action re-checks, because Server
  //    Actions are reachable by a direct POST that bypasses the layout.
  let user;
  try {
    user = await requireUser();
  } catch {
    // requireUser() redirects, so reaching here is unusual. Fail closed.
    return {
      ok: false,
      error: "Your session has expired. Please sign in again.",
    };
  }

  // 2. WHAT — validate the whole payload server-side. The form can be
  //    bypassed, so this is the check that actually protects the database.
  const validation = validateOnboarding(payload);

  if (!validation.ok) {
    return {
      ok: false,
      error: "Please fix the highlighted problems before saving.",
      fieldErrors: validation.errors,
    };
  }

  const data = validation.data;

  try {
    const supabase = await createClient();

    // Shape the rows the database function expects.
    const subjects = data.subjects.map((subject) => ({
      name: subject.name.trim(),
      color: subject.color ?? "#4f46e5",
      difficulty: subject.difficulty,
      importance: subject.importance,
      topics: subject.topics.map((topic) => ({
        name: topic.name.trim(),
        difficulty: topic.difficulty,
        estimated_minutes: topic.estimatedMinutes,
        confidence: topic.confidence,
      })),
    }));

    const exams = data.exams.map((exam) => ({
      subject_name:
        data.subjects.find((s) => s.key === exam.subjectKey)?.name ?? "",
      title: exam.title.trim(),
      exam_date: exam.examDate,
      importance: exam.importance,
    }));

    // One availability row per selected day.
    const availability = data.availability.days.map((day) => ({
      day_of_week: day,
      start_time: data.availability.startTime,
      end_time: data.availability.endTime,
      energy_level: 3,
    }));

    // Energy buckets become one row per (period, day), so the scheduler can
    // query directly by weekday.
    const energy = data.availability.days.flatMap((day) => {
      const rows: Array<{
        day_of_week: number;
        start_time: string;
        end_time: string;
        energy_level: number;
      }> = [];

      for (const bucket of ["high", "medium", "low"] as const) {
        for (const blockId of data.energy[bucket]) {
          const block = TIME_BLOCKS.find((b) => b.id === blockId);
          if (!block) continue;

          rows.push({
            day_of_week: day,
            start_time: `${String(block.startHour).padStart(2, "0")}:00`,
            end_time: `${String(block.endHour).padStart(2, "0")}:00`,
            energy_level: energyLevelFor(bucket),
          });
        }
      }
      return rows;
    });

    // Profile first: simple column updates, and a repeat submission simply
    // rewrites them.
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: data.displayName,
        study_goal: data.studyGoal || null,
        daily_study_goal_minutes: data.availability.maxMinutesPerDay,
      })
      .eq("id", user.id);

    if (profileError) {
      return { ok: false, error: readableDbError(profileError.message) };
    }

    // Bulk insert, atomic, inside one Postgres function.
    const { data: result, error: saveError } = await supabase.rpc(
      "complete_onboarding",
      {
        p_subjects: subjects,
        p_exams: exams,
        p_availability: availability,
        p_energy: energy,
      }
    );

    if (saveError) {
      return { ok: false, error: readableDbError(saveError.message) };
    }

    // false means there was nothing to do (a repeated submission), which is a
    // success, not a failure.
    if (result === false) {
      console.info("[onboarding] Duplicate submission ignored for user", user.id);
    }
  } catch (error) {
    console.error("[onboarding] save threw:", error);
    return {
      ok: false,
      error: "We could not save your progress. Your answers are still here — please try again.",
    };
  }

  // Only now mark onboarding complete. Doing this LAST matters: if the data
  // failed to save, the student must not be redirected past the wizard.
  try {
    const supabase = await createClient();
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
  } catch (error) {
    console.error("[onboarding] failed to set onboarding_completed:", error);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
