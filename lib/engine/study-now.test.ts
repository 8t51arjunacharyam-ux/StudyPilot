import { describe, it, expect } from "vitest";
import { recommendStudyNow } from "./study-now";
import type { StudyNowInput } from "./study-now";
import type { Subject, Topic, Exam, StudyPreference } from "@/lib/types/database";

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
    day_of_week: 2,
    start_time: "18:00:00",
    end_time: "21:00:00",
    energy_level: 5,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function baseInput(overrides: Partial<StudyNowInput> = {}): StudyNowInput {
  const now = new Date("2026-10-07T19:00:00Z");
  return {
    subjects: [makeSubject()],
    topics: [makeTopic()],
    exams: [makeExam()],
    sessions: [],
    preferences: [makePreference()],
    dailyStudyGoalMinutes: 120,
    now,
    ...overrides,
  };
}

describe("recommendStudyNow", () => {
  it("returns null when no subjects or topics", () => {
    expect(recommendStudyNow(baseInput({ subjects: [], topics: [] }))).toBeNull();
  });

  it("returns null when all topics are completed", () => {
    const topic = makeTopic({ completed_at: "2026-10-01T00:00:00Z" });
    expect(recommendStudyNow(baseInput({ topics: [topic] }))).toBeNull();
  });

  it("recommends the topic with the lowest confidence for an approaching exam", () => {
    const subjects = [makeSubject()];
    const topics = [
      makeTopic({ id: "t-high", name: "Graphs", confidence: 80 }),
      makeTopic({ id: "t-low", name: "Binary Trees", confidence: 30 }),
    ];
    const result = recommendStudyNow(baseInput({ subjects, topics }));

    expect(result).not.toBeNull();
    expect(result!.topicName).toBe("Binary Trees");
    expect(result!.priorityScore).toBeGreaterThan(50);
    expect(result!.reason).toContain("exam");
  });

  it("prefers a topic from a subject with an approaching exam", () => {
    const subjects = [
      makeSubject({ id: "s1", name: "DSA" }),
      makeSubject({ id: "s2", name: "Database" }),
    ];
    const topics = [
      makeTopic({ id: "t1", subject_id: "s1", name: "Graphs", confidence: 70 }),
      makeTopic({ id: "t2", subject_id: "s2", name: "SQL", confidence: 30 }),
    ];
    const exams = [
      makeExam({ subject_id: "s1", exam_date: "2026-10-08T09:00:00Z" }),
      makeExam({ subject_id: "s2", exam_date: "2026-11-01T09:00:00Z" }),
    ];

    const result = recommendStudyNow(baseInput({ subjects, topics, exams }));
    expect(result!.subjectName).toBe("DSA");
  });

  it("suggests learn activity for new topics", () => {
    const topic = makeTopic({ is_new: true, confidence: 30 });
    const result = recommendStudyNow(baseInput({ topics: [topic] }));
    expect(result!.activityType).toBe("learn");
  });

  it("suggests mock_test when the exam is within 3 days", () => {
    const topic = makeTopic({ confidence: 70 });
    const exam = makeExam({ exam_date: "2026-10-09T09:00:00Z" });
    const result = recommendStudyNow(baseInput({ topics: [topic], exams: [exam] }));
    expect(result!.activityType).toBe("mock_test");
  });

  it("caps duration at available time", () => {
    const now = new Date("2026-10-07T19:00:00Z");
    const dow = now.getDay();
    const preferences = [makePreference({ day_of_week: dow, start_time: "19:00:00", end_time: "19:30:00" })];
    const result = recommendStudyNow(baseInput({ preferences, now }));
    expect(result!.durationMinutes).toBeLessThanOrEqual(30);
  });

  it("includes a transparent reason", () => {
    const result = recommendStudyNow(baseInput());
    expect(result!.reason.length).toBeGreaterThan(10);
  });
});
