import { describe, it, expect } from "vitest";
import { generateBrainFitSchedule } from "./brainfit";
import type { BrainFitInput } from "./brainfit";
import type { Subject, Topic, Exam, StudyPreference, StudySession } from "@/lib/types/database";

function makeSubject(overrides: Partial<Subject> = {}): Subject {
  return {
    id: "subject-1",
    user_id: "user-1",
    name: "DSA",
    color: "#4f46e5",
    difficulty: 4,
    importance: 5,
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

function makeExam(overrides: Partial<Exam> = {}): Exam {
  return {
    id: "exam-1",
    user_id: "user-1",
    subject_id: "subject-1",
    title: "DSA Final",
    exam_date: "2026-10-14T09:00:00Z",
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
    end_time: "12:00:00",
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

describe("generateBrainFitSchedule", () => {
  it("returns empty array when no preferences", () => {
    expect(generateBrainFitSchedule(baseInput({ preferences: [] }))).toEqual([]);
  });

  it("schedules a session inside a high-energy window for a difficult topic", () => {
    const result = generateBrainFitSchedule(baseInput());
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].energyMatch).toBe("peak");
    expect(result[0].activityType).toBe("practice");
  });

  it("does not exceed daily study limit", () => {
    const topics = Array.from({ length: 10 }, (_, i) =>
      makeTopic({ id: `t${i}`, name: `Topic ${i}`, estimated_minutes: 60 })
    );
    const result = generateBrainFitSchedule(baseInput({ topics }));
    const dailyMinutes = result.reduce((acc, session) => {
      acc[session.date] = (acc[session.date] ?? 0) + session.durationMinutes;
      return acc;
    }, {} as Record<string, number>);
    Object.values(dailyMinutes).forEach((minutes) => {
      expect(minutes).toBeLessThanOrEqual(120);
    });
  });

  it("avoids overlapping with existing sessions", () => {
    const existing: StudySession[] = [
      {
        id: "ses-1",
        user_id: "user-1",
        plan_id: null,
        topic_id: "topic-1",
        scheduled_start: "2026-10-08T09:00:00Z",
        scheduled_end: "2026-10-08T11:00:00Z",
        planned_minutes: 120,
        actual_minutes: null,
        status: "planned",
        energy_match: null,
        rescued_from_id: null,
        completed_at: null,
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
      },
    ];
    const result = generateBrainFitSchedule(baseInput({ existingSessions: existing }));
    expect(result.every((s) => s.startTime >= "11:00")).toBe(true);
  });

  it("prioritises topics with approaching exams", () => {
    const subjects = [
      makeSubject({ id: "s1", name: "DSA" }),
      makeSubject({ id: "s2", name: "History" }),
    ];
    const topics = [
      makeTopic({ id: "t1", subject_id: "s2", name: "WWII", difficulty: 2, estimated_minutes: 60 }),
      makeTopic({ id: "t2", subject_id: "s1", name: "Graphs", difficulty: 5, estimated_minutes: 60 }),
    ];
    const exams = [
      makeExam({ subject_id: "s1", exam_date: "2026-10-08T09:00:00Z" }),
      makeExam({ subject_id: "s2", exam_date: "2026-12-01T09:00:00Z" }),
    ];

    const result = generateBrainFitSchedule(baseInput({ subjects, topics, exams }));
    expect(result[0].topicName).toBe("Graphs");
  });

  it("uses learn activity for new topics", () => {
    const topic = makeTopic({ is_new: true });
    const result = generateBrainFitSchedule(baseInput({ topics: [topic] }));
    expect(result[0].activityType).toBe("learn");
  });
});
