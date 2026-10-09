import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";

export type Topic = {
  id: string;
  subject_id: string;
  user_id: string;
  name: string;
  difficulty: number;
  estimated_minutes: number;
  confidence: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getTopics(): Promise<Topic[]> {
  const user = await requireUser();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[topics] getTopics error:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getTopicsBySubject(subjectId: string): Promise<Topic[]> {
  const user = await requireUser();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .eq("subject_id", subjectId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[topics] getTopicsBySubject error:", error.message);
    return [];
  }

  return data ?? [];
}

export async function getTopicById(id: string): Promise<Topic | null> {
  const user = await requireUser();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("topics")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[topics] getTopicById error:", error.message);
    return null;
  }

  return data;
}