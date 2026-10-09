import { describe, it, expect } from "vitest";
import { generateBrainFitSchedule, type BrainFitInput } from "./brainfit";
import type { Subject, Topic, Exam, StudyPreference, StudySession } from "@/lib/types/database";

/** Helper factories (duplicate of those in brainfit.test.ts) */
function makeSubject(overrides: Partial<Subject> = {}): Subject {
  return {
    id: "subject-1",
    user_id: "user-1",
    name: "Default",
    color: "#ff0000",
    difficulty: 3,
    importance: 3,
    archived_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeTopic(overrides: Partial<Topic> = {}): Topic {
  return {
    id: "topic-1",
    subject_id: "subject-1",
    user_id: "user-1",
    name: "Topic",
    difficulty: 3,
    estimated_minutes: 60,
    confidence: 50,
    last_reviewed_at: null,
    needs_active_recall: false,
    is_new: false,
    completed_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeExam(overrides: Partial<Exam> = {}): Exam {
  return {
    id: "exam-1",
    user_id: "user-1",
    subject_id: "subject-1",
    title: "Exam",
    exam_date: "2026-11-01T09:00:00Z",
    importance: 5,
    topics_covered: [],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makePreference(overrides: Partial<StudyPreference> = {}): StudyPreference {
  return {
    id: "pref-1",
    user_id: "user-1",
    day_of_week: new Date("2026-10-08T00:00:00Z").getUTCDay(),
    start_time: "09:00:00",
    end_time: "10:00:00",
    energy_level: 5,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function baseInput(overrides: Partial<BrainFitInput> = {}): BrainFitInput {
  return {
    subjects: [makeSubject()],
    topics: [makeTopic()],
    exams: [makeExam()],
    preferences: [makePreference()],
    existingSessions: [],
    startDate: "2026-10-08T00:00:00Z",
    endDate: "2026-10-10T00:00:00Z",
    dailyStudyGoalMinutes: 120,
    now: "2026-10-07T00:00:00Z",
    ...overrides,
  };
}

describe("BrainFit additional edge cases", () => {
  it("handles limited availability (short low‑energy window)", () => {
    const pref = makePreference({ start_time: "14:00:00", end_time: "15:00:00", energy_level: 1 });
    const result = generateBrainFitSchedule(baseInput({ preferences: [pref] }));
    // Should still schedule something (minimum 15 min) and match low‑energy bucket "light"
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].energyMatch).toBe("light");
  });

  it("spreads high workload across days respecting daily goal", () => {
    // 5 topics each 90 minutes, daily goal 120 minutes.
    // The scheduler should never exceed the daily goal for any day.
    const topics = Array.from({ length: 5 }, (_, i) =>
      makeTopic({ id: `t${i}`, name: `Topic ${i}`, estimated_minutes: 90 })
    );
    const result = generateBrainFitSchedule(baseInput({ topics }));
    // Verify each day's total does not exceed the goal
    const perDay: Record<string, number> = {};
    for (const s of result) {
      perDay[s.date] = (perDay[s.date] ?? 0) + s.durationMinutes;
    }
    Object.values(perDay).forEach((min) => expect(min).toBeLessThanOrEqual(120));
    // Ensure at least one session is scheduled (workload is non‑zero)
    expect(Object.keys(perDay).length).toBeGreaterThan(0);
  });

  it("does not schedule overlapping a skipped session", () => {
    const skipped: StudySession[] = [
      {
        id: "ses-1",
        user_id: "user-1",
        plan_id: null,
        topic_id: "topic-1",
        scheduled_start: "2026-10-08T09:30:00Z",
        scheduled_end: "2026-10-08T10:30:00Z",
        planned_minutes: 60,
        actual_minutes: null,
        status: "skipped",
        energy_match: null,
        rescued_from_id: null,
        completed_at: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];
    const result = generateBrainFitSchedule(baseInput({ existingSessions: skipped }));
    // Verify none of the generated sessions overlap the skipped interval.
    const overlap = result.some((s) => {
      const start = s.startTime;
      const end = s.endTime;
      // Overlap if start < skipped_end && end > skipped_start
      return start < "10:30:00" && end > "09:30:00";
    });
    expect(overlap).toBe(false);
  });

  it("handles conflicting existing sessions gracefully", () => {
    const conflicting: StudySession[] = [
      {
        id: "ses-a",
        user_id: "user-1",
        plan_id: null,
        topic_id: "topic-1",
        scheduled_start: "2026-10-08T09:00:00Z",
        scheduled_end: "2026-10-08T10:00:00Z",
        planned_minutes: 60,
        actual_minutes: null,
        status: "planned",
        energy_match: null,
        rescued_from_id: null,
        completed_at: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "ses-b",
        user_id: "user-1",
        plan_id: null,
        topic_id: "topic-1",
        scheduled_start: "2026-10-08T09:30:00Z",
        scheduled_end: "2026-10-08T11:00:00Z",
        planned_minutes: 90,
        actual_minutes: null,
        status: "planned",
        energy_match: null,
        rescued_from_id: null,
        completed_at: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ];
    const result = generateBrainFitSchedule(baseInput({ existingSessions: conflicting }));
    // The algorithm should still produce sessions (if any) that do not overlap the occupied windows.
    // Verify that no generated session starts before 11:00 (the latest end of overlapping windows).
    expect(result.every((s) => s.startTime >= "11:00:00")).toBe(true);
  });
});
