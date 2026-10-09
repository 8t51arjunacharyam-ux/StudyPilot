"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export type ExamInput = {
  subject_id: string;
  title: string;
  exam_date: string;
  importance: number;
};

export type ExamUpdate = Partial<ExamInput> & { id: string };

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function readableDbError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("duplicate key")) {
    return "An exam with this title already exists for this subject.";
  }
  if (lower.includes("violates check constraint")) {
    return "One of the values is outside the allowed range.";
  }
  if (lower.includes("violates foreign key")) {
    return "The exam references a subject that no longer exists.";
  }
  if (lower.includes("row-level security") || lower.includes("rls")) {
    console.error("[exams] RLS blocked an operation:", message);
    return "You don't have permission to perform this action.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Could not reach the server. Check your connection and try again.";
  }

  console.error("[exams] Unhandled database error:", message);
  return "Something went wrong. Please try again.";
}

export async function createExam(input: ExamInput): Promise<ActionResult> {
  const user = await requireUser();

  // Validate input
  if (!input.title.trim()) {
    return { ok: false, error: "Exam title is required." };
  }
  if (input.title.trim().length > 160) {
    return { ok: false, error: "Exam title must be 160 characters or less." };
  }
  if (!input.exam_date) {
    return { ok: false, error: "Exam date is required." };
  }
  if (isNaN(Date.parse(input.exam_date))) {
    return { ok: false, error: "Invalid exam date." };
  }
  if (input.importance < 1 || input.importance > 5) {
    return { ok: false, error: "Importance must be between 1 and 5." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.from("exams").insert({
      user_id: user.id,
      subject_id: input.subject_id,
      title: input.title.trim(),
      exam_date: input.exam_date,
      importance: input.importance,
    });

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/exams");
    return { ok: true };
  } catch (error) {
    console.error("[exams] createExam threw:", error);
    return { ok: false, error: "Could not create exam. Please try again." };
  }
}

export async function updateExam(input: ExamUpdate): Promise<ActionResult> {
  const user = await requireUser();

  const { id, ...updates } = input;

  if (!id) {
    return { ok: false, error: "Exam ID is required." };
  }

  if (updates.title !== undefined) {
    if (!updates.title.trim()) {
      return { ok: false, error: "Exam title is required." };
    }
    if (updates.title.trim().length > 160) {
      return { ok: false, error: "Exam title must be 160 characters or less." };
    }
  }
  if (updates.exam_date !== undefined) {
    if (!updates.exam_date) {
      return { ok: false, error: "Exam date is required." };
    }
    if (isNaN(Date.parse(updates.exam_date))) {
      return { ok: false, error: "Invalid exam date." };
    }
  }
  if (updates.importance !== undefined && (updates.importance < 1 || updates.importance > 5)) {
    return { ok: false, error: "Importance must be between 1 and 5." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("exams")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/exams");
    return { ok: true };
  } catch (error) {
    console.error("[exams] updateExam threw:", error);
    return { ok: false, error: "Could not update exam. Please try again." };
  }
}

export async function deleteExam(id: string): Promise<ActionResult> {
  const user = await requireUser();

  if (!id) {
    return { ok: false, error: "Exam ID is required." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("exams")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/exams");
    return { ok: true };
  } catch (error) {
    console.error("[exams] deleteExam threw:", error);
    return { ok: false, error: "Could not delete exam. Please try again." };
  }
}

// Aliases for backward compatibility
export const createExamAction = createExam;
export const updateExamAction = updateExam;
export const deleteExamAction = deleteExam;