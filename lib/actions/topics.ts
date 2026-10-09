"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export type TopicInput = {
  subject_id: string;
  name: string;
  difficulty: number;
  estimated_minutes: number;
  confidence?: number;
};

export type TopicUpdate = Partial<TopicInput> & { id: string };

export type CompleteTopicInput = {
  id: string;
  confidence?: number; // 1-5, optional memory log
  recalled_correctly?: boolean;
};

export type ActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };

function readableDbError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("duplicate key")) {
    return "A topic with this name already exists for this subject.";
  }
  if (lower.includes("violates check constraint")) {
    return "One of the values is outside the allowed range.";
  }
  if (lower.includes("violates foreign key")) {
    return "The topic references a subject that no longer exists.";
  }
  if (lower.includes("row-level security") || lower.includes("rls")) {
    console.error("[topics] RLS blocked an operation:", message);
    return "You don't have permission to perform this action.";
  }
  if (lower.includes("failed to fetch") || lower.includes("network")) {
    return "Could not reach the server. Check your connection and try again.";
  }

  console.error("[topics] Unhandled database error:", message);
  return "Something went wrong. Please try again.";
}

export async function createTopic(input: TopicInput): Promise<ActionResult> {
  const user = await requireUser();

  // Validate input
  if (!input.name.trim()) {
    return { ok: false, error: "Topic name is required." };
  }
  if (input.name.trim().length > 160) {
    return { ok: false, error: "Topic name must be 160 characters or less." };
  }
  if (input.difficulty < 1 || input.difficulty > 5) {
    return { ok: false, error: "Difficulty must be between 1 and 5." };
  }
  if (input.estimated_minutes < 5 || input.estimated_minutes > 480) {
    return { ok: false, error: "Estimated minutes must be between 5 and 480." };
  }
  if (input.confidence !== undefined && (input.confidence < 0 || input.confidence > 100)) {
    return { ok: false, error: "Confidence must be between 0 and 100." };
  }

  try {
    const supabase = await createClient();

    // Verify subject belongs to user
    const { data: subject } = await supabase
      .from("subjects")
      .select("id")
      .eq("id", input.subject_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!subject) {
      return { ok: false, error: "Subject not found." };
    }

    const { error } = await supabase.from("topics").insert({
      user_id: user.id,
      subject_id: input.subject_id,
      name: input.name.trim(),
      difficulty: input.difficulty,
      estimated_minutes: input.estimated_minutes,
      confidence: input.confidence ?? 50,
    });

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/subjects");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error("[topics] createTopic threw:", error);
    return { ok: false, error: "Could not create topic. Please try again." };
  }
}

export async function updateTopic(input: TopicUpdate): Promise<ActionResult> {
  const user = await requireUser();

  const { id, ...updates } = input;

  if (!id) {
    return { ok: false, error: "Topic ID is required." };
  }

  if (updates.name !== undefined) {
    if (!updates.name.trim()) {
      return { ok: false, error: "Topic name is required." };
    }
    if (updates.name.trim().length > 160) {
      return { ok: false, error: "Topic name must be 160 characters or less." };
    }
  }
  if (updates.difficulty !== undefined && (updates.difficulty < 1 || updates.difficulty > 5)) {
    return { ok: false, error: "Difficulty must be between 1 and 5." };
  }
  if (updates.estimated_minutes !== undefined && (updates.estimated_minutes < 5 || updates.estimated_minutes > 480)) {
    return { ok: false, error: "Estimated minutes must be between 5 and 480." };
  }
  if (updates.confidence !== undefined && (updates.confidence < 0 || updates.confidence > 100)) {
    return { ok: false, error: "Confidence must be between 0 and 100." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("topics")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/subjects");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error("[topics] updateTopic threw:", error);
    return { ok: false, error: "Could not update topic. Please try again." };
  }
}

export async function deleteTopic(id: string): Promise<ActionResult> {
  const user = await requireUser();

  if (!id) {
    return { ok: false, error: "Topic ID is required." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("topics")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/subjects");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    console.error("[topics] deleteTopic threw:", error);
    return { ok: false, error: "Could not delete topic. Please try again." };
  }
}

export async function completeTopic(id: string): Promise<ActionResult> {
  const user = await requireUser();

  if (!id) {
    return { ok: false, error: "Topic ID is required." };
  }

  try {
    const supabase = await createClient();

    const completedAt = new Date().toISOString();

    const { error } = await supabase
      .from("topics")
      .update({
        completed_at: completedAt,
        is_new: false,
        needs_active_recall: false,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/subjects");
    revalidatePath("/dashboard");
    revalidatePath("/memory");
    return { ok: true };
  } catch (error) {
    console.error("[topics] completeTopic threw:", error);
    return { ok: false, error: "Could not complete topic. Please try again." };
  }
}

export async function uncompleteTopic(id: string): Promise<ActionResult> {
  const user = await requireUser();

  if (!id) {
    return { ok: false, error: "Topic ID is required." };
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from("topics")
      .update({
        completed_at: null,
        is_new: false,
        needs_active_recall: true,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { ok: false, error: readableDbError(error.message) };
    }

    revalidatePath("/subjects");
    revalidatePath("/dashboard");
    revalidatePath("/memory");
    return { ok: true };
  } catch (error) {
    console.error("[topics] uncompleteTopic threw:", error);
    return { ok: false, error: "Could not uncomplete topic. Please try again." };
  }
}

// Aliases for backward compatibility
export const createTopicAction = createTopic;
export const updateTopicAction = updateTopic;
export const deleteTopicAction = deleteTopic;
export const completeTopicAction = completeTopic;
export const uncompleteTopicAction = uncompleteTopic;