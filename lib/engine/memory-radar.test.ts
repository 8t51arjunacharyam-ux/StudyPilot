import { describe, it, expect } from "vitest";
import { calculateMemoryRadar, enrichMemoryRadarWithSubjects } from "./memory-radar";
import type { MemoryRadarInput } from "./memory-radar";
import type { Topic, MemoryReview } from "@/lib/types/database";

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: "topic-1",
    subject_id: "subject-1",
    user_id: "user-1",
    name: "Binary Trees",
    difficulty: 4,
    estimated_minutes: 60,
    confidence: 40,
    last_reviewed_at: null,
    needs_active_recall: true,
    is_new: false,
    completed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeReview(overrides: Partial<MemoryReview> = {}): MemoryReview {
  return {
    id: "review-1",
    user_id: "user-1",
    topic_id: "topic-1",
    reviewed_at: "2026-10-01T10:00:00Z",
    confidence_after: 40,
    recalled_correctly: false,
    review_type: "active_recall",
    note: null,
    created_at: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}

function baseInput(overrides: Partial<MemoryRadarInput> = {}): MemoryRadarInput {
  return {
    topics: [makeTopic()],
    reviews: [],
    now: "2026-10-07T00:00:00Z",
    ...overrides,
  };
}

describe("calculateMemoryRadar", () => {
  it("marks topics with low confidence and no recent review as at risk", () => {
    const result = calculateMemoryRadar(baseInput());
    expect(result[0].category).toBe("at_risk");
    expect(result[0].priorityScore).toBeGreaterThan(60);
  });

  it("marks high-confidence recently reviewed topics as strong", () => {
    const topic = makeTopic({ confidence: 90, last_reviewed_at: "2026-10-06T10:00:00Z" });
    const result = calculateMemoryRadar(baseInput({ topics: [topic] }));
    expect(result[0].category).toBe("strong");
  });

  it("marks medium-confidence topics as needs_review", () => {
    const topic = makeTopic({ confidence: 65, last_reviewed_at: "2026-10-03T10:00:00Z" });
    const result = calculateMemoryRadar(baseInput({ topics: [topic] }));
    expect(result[0].category).toBe("needs_review");
  });

  it("sorts topics by priority score", () => {
    const topics = [
      makeTopic({ id: "t1", name: "Strong", confidence: 90, last_reviewed_at: "2026-10-06T10:00:00Z" }),
      makeTopic({ id: "t2", name: "At Risk", confidence: 20, last_reviewed_at: null }),
    ];
    const result = calculateMemoryRadar(baseInput({ topics }));
    expect(result[0].topicName).toBe("At Risk");
  });

  it("uses review history for recall performance scoring", () => {
    const reviews = [
      makeReview({ reviewed_at: "2026-10-06T10:00:00Z", recalled_correctly: true, confidence_after: 80 }),
      makeReview({ reviewed_at: "2026-10-01T10:00:00Z", recalled_correctly: false, confidence_after: 40 }),
    ];
    const topic = makeTopic({ confidence: 80, last_reviewed_at: "2026-10-06T10:00:00Z" });
    const result = calculateMemoryRadar(baseInput({ topics: [topic], reviews }));
    expect(result[0].reviewsCount).toBe(2);
    expect(result[0].lastRecalledCorrectly).toBe(true);
  });

  it("recommends sooner review for at-risk topics", () => {
    const atRisk = makeTopic({ confidence: 30, last_reviewed_at: "2026-09-01T10:00:00Z" });
    const strong = makeTopic({ confidence: 90, last_reviewed_at: "2026-10-06T10:00:00Z" });
    const result = calculateMemoryRadar(baseInput({ topics: [atRisk, strong] }));
    expect(result[0].recommendedReviewDate <= "2026-10-08").toBe(true);
    expect(result[1].recommendedReviewDate >= "2026-10-10").toBe(true);
  });
});

describe("enrichMemoryRadarWithSubjects", () => {
  it("fills subject name and color", () => {
    const radar = calculateMemoryRadar(baseInput());
    const enriched = enrichMemoryRadarWithSubjects(radar, [
      { id: "subject-1", name: "DSA", color: "#4f46e5" },
    ]);
    expect(enriched[0].subjectName).toBe("DSA");
    expect(enriched[0].color).toBe("#4f46e5");
  });
});
