/**
 * Memory Radar engine.
 *
 * Tracks topic recall strength and recommends when each topic should be
 * reviewed next. This is a study-planning heuristic, not a scientific
 * forgetting-curve prediction.
 */

import type { Topic, MemoryReview, MemoryRadarTopic, MemoryRadarCategory } from "@/lib/types/database";
import { daysBetween, clamp, addDays, toISODate } from "./utils";

export type MemoryRadarInput = {
  topics: Topic[];
  reviews: MemoryReview[];
  now?: Date | string;
};

const CONFIDENCE_WEIGHT = 35;
const RECENCY_WEIGHT = 30;
const RECALL_WEIGHT = 20;
const DIFFICULTY_WEIGHT = 15;
const MAX_SCORE = CONFIDENCE_WEIGHT + RECENCY_WEIGHT + RECALL_WEIGHT + DIFFICULTY_WEIGHT;

function getTopicReviews(topicId: string, reviews: MemoryReview[]): MemoryReview[] {
  return reviews
    .filter((r) => r.topic_id === topicId)
    .sort((a, b) => new Date(b.reviewed_at).getTime() - new Date(a.reviewed_at).getTime());
}

function scoreConfidence(confidence: number): number {
  return ((100 - clamp(confidence, 0, 100)) / 100) * CONFIDENCE_WEIGHT;
}

function scoreRecency(lastReviewedAt: string | null, now: Date): number {
  if (!lastReviewedAt) return RECALL_WEIGHT;
  const daysSince = daysBetween(new Date(lastReviewedAt), now);
  if (daysSince <= 1) return 0;
  if (daysSince <= 3) return RECENCY_WEIGHT * 0.25;
  if (daysSince <= 7) return RECENCY_WEIGHT * 0.5;
  if (daysSince <= 14) return RECENCY_WEIGHT * 0.75;
  return RECENCY_WEIGHT;
}

function scoreRecallPerformance(reviews: MemoryReview[]): number {
  if (reviews.length === 0) return RECALL_WEIGHT;

  const attempts = reviews.filter((r) => r.recalled_correctly !== null);
  if (attempts.length === 0) return RECALL_WEIGHT * 0.6;

  const correct = attempts.filter((r) => r.recalled_correctly === true).length;
  const ratio = correct / attempts.length;

  // More recent attempts matter more.
  const lastAttempt = attempts[0];
  const lastCorrect = lastAttempt.recalled_correctly === true;

  if (lastCorrect && ratio >= 0.8) return RECALL_WEIGHT * 0.1;
  if (lastCorrect && ratio >= 0.5) return RECALL_WEIGHT * 0.35;
  if (!lastCorrect && ratio < 0.5) return RECALL_WEIGHT;
  return RECALL_WEIGHT * 0.6;
}

function scoreDifficulty(difficulty: number): number {
  return (difficulty / 5) * DIFFICULTY_WEIGHT;
}

function categoryFromScore(
  priorityScore: number,
  confidence: number,
  daysSinceReview: number
): MemoryRadarCategory {
  if (confidence >= 80 && daysSinceReview <= 3) return "strong";
  if (priorityScore >= 60 || confidence < 50 || daysSinceReview >= 7) return "at_risk";
  return "needs_review";
}

function recommendedReviewDate(
  category: MemoryRadarCategory,
  lastReviewedAt: string | null,
  now: Date
): string {
  const base = lastReviewedAt ? new Date(lastReviewedAt) : now;
  const days =
    category === "at_risk" ? 1 : category === "needs_review" ? 3 : 7;
  return toISODate(addDays(base, days));
}

export function calculateMemoryRadar(input: MemoryRadarInput): MemoryRadarTopic[] {
  const { topics, reviews, now: nowInput = new Date() } = input;
  const now = new Date(nowInput);

  return topics
    .map((topic) => {
      const topicReviews = getTopicReviews(topic.id, reviews);
      const lastReview = topicReviews[0] ?? null;
      const lastReviewedAt = topic.last_reviewed_at ?? lastReview?.reviewed_at ?? null;
      const daysSinceReview = lastReviewedAt ? daysBetween(new Date(lastReviewedAt), now) : 999;
      const lastRecalledCorrectly = lastReview?.recalled_correctly ?? null;

      const breakdown = {
        confidence: scoreConfidence(topic.confidence),
        recency: scoreRecency(lastReviewedAt, now),
        recall: scoreRecallPerformance(topicReviews),
        difficulty: scoreDifficulty(topic.difficulty),
      };

      const rawScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0);
      const priorityScore = Math.round((rawScore / MAX_SCORE) * 100);

      const category = categoryFromScore(priorityScore, topic.confidence, daysSinceReview);

      return {
        topicId: topic.id,
        topicName: topic.name,
        subjectId: topic.subject_id,
        subjectName: "", // filled later if caller needs it
        color: "#4f46e5",
        confidence: topic.confidence,
        daysSinceReview,
        reviewsCount: topicReviews.length,
        lastRecalledCorrectly: lastRecalledCorrectly,
        category,
        priorityScore,
        recommendedReviewDate: recommendedReviewDate(category, lastReviewedAt, now),
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function enrichMemoryRadarWithSubjects(
  radarTopics: MemoryRadarTopic[],
  subjects: { id: string; name: string; color: string }[]
): MemoryRadarTopic[] {
  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  return radarTopics.map((t) => {
    const subject = subjectById.get(t.subjectId);
    return {
      ...t,
      subjectName: subject?.name ?? "Unknown",
      color: subject?.color ?? "#4f46e5",
    };
  });
}
