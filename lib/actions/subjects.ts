"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export type SubjectInput = {
  name: string;
  color?: string;
  difficulty: number;
  importance: number;
};

export type SubjectUpdate = Partial<SubjectInput> & { id: string };

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function readableDbError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("duplicate key")) {
    return "A subject with this name already exists.";
  }
  if (lower.includes("violates check constraint")) {
    return "One of the values is outside the allowed range.";
  }
  if (lower.includes("violates foreign key")) {
    return "The subject references something that no longer exists.";
  }
  if (lower.includes("row-level security") || lower.includes("rls")) {
    console.error("[subjects] RLS blocked an operation:", message);
    return "You don't have permission to perform this action.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Could not reach the server. Check your connection and try again.";
  }

  console.error("[subjects] Unhandled database error:", message);
  return "Something went wrong. Please try again.";
}

export async function createSubject(input: SubjectInput): Promise<ActionResult> {
  const user = await requireUser();

  // Validate input
  if (!input.name.trim()) {
    return { ok: false, error: "Subject name is required." };
  }
  if (input.name.trim().length > 120) {
    return { ok: false, error: "Subject name must be 120 characters or less." };
  }
  if (input.difficulty < 1 || input.difficulty > 5) {
    return { ok: false, error: "Difficulty must be between 1 and 5." };
  }
  if (input.importance < 1 || input.importance > 5) {
    return { ok: false, error: "Importance must be between 1 and 5." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.from("subjects").insert({
      user_id: user.id,
      name: input.name.trim(),
      color: input.color ?? "#4f46e5",
      difficulty: input.difficulty,
      importance: input.importance,
    });

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/subjects");
    return { ok: true };
  } catch (error) {
    console.error("[subjects] createSubject threw:", error);
    return { ok: false, error: "Could not create subject. Please try again." };
  }
}

export async function updateSubject(input: SubjectUpdate): Promise<ActionResult> {
  const user = await requireUser();

  const { id, ...updates } = input;

  if (!id) {
    return { ok: false, error: "Subject ID is required." };
  }

  if (updates.name !== undefined) {
    if (!updates.name.trim()) {
      return { ok: false, error: "Subject name is required." };
    }
    if (updates.name.trim().length > 120) {
      return { ok: false, error: "Subject name must be 120 characters or less." };
    }
  }
  if (updates.difficulty !== undefined && (updates.difficulty < 1 || updates.difficulty > 5)) {
    return { ok: false, error: "Difficulty must be between 1 and 5." };
  }
  if (updates.importance !== undefined && (updates.importance < 1 || updates.importance > 5)) {
    return { ok: false, error: "Importance must be between 1 and 5." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("subjects")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/subjects");
    return { ok: true };
  } catch (error) {
    console.error("[subjects] updateSubject threw:", error);
    return { ok: false, error: "Could not update subject. Please try again." };
  }
}

export async function deleteSubject(id: string): Promise<ActionResult> {
  const user = await requireUser();

  if (!id) {
    return { ok: false, error: "Subject ID is required." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("subjects")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/subjects");
    return { ok: true };
  } catch (error) {
    console.error("[subjects] deleteSubject threw:", error);
    return { ok: false, error: "Could not delete subject. Please try again." };
  }
}

export async function archiveSubject(id: string): Promise<ActionResult> {
  const user = await requireUser();

  if (!id) {
    return { ok: false, error: "Subject ID is required." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("subjects")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/subjects");
    return { ok: true };
  } catch (error) {
    console.error("[subjects] archiveSubject threw:", error);
    return { ok: false, error: "Could not archive subject. Please try again." };
  }
}

export async function unarchiveSubject(id: string): Promise<ActionResult> {
  const user = await requireUser();

  if (!id) {
    return { ok: false, error: "Subject ID is required." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("subjects")
      .update({ archived_at: null })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/subjects");
    return { ok: true };
  } catch (error) {
    console.error("[subjects] unarchiveSubject threw:", error);
    return { ok: false, error: "Could not unarchive subject. Please try again." };
  }
}

// Aliases for backward compatibility
export const createSubjectAction = createSubject;
export const updateSubjectAction = updateSubject;
export const deleteSubjectAction = deleteSubject;
export const archiveSubjectAction = archiveSubject;
export const unarchiveSubjectAction = unarchiveSubject;