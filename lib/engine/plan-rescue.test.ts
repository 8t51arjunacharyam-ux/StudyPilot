import { describe, it, expect } from "vitest";
import { generatePlanRescue } from "./plan-rescue";
import type { PlanRescueInput } from "./plan-rescue";
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
    estimated_minutes: 90,
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
    start_time: "18:00:00",
    end_time: "21:00:00",
    energy_level: 4,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeMissedSession(minutes: number, status: "skipped" | "planned" = "skipped"): StudySession {
  return {
    id: "missed-1",
    user_id: "user-1",
    plan_id: null,
    topic_id: "topic-1",
    scheduled_start: "2026-10-06T18:00:00Z",
    scheduled_end: "2026-10-06T19:30:00Z",
    planned_minutes: minutes,
    actual_minutes: status === "planned" ? null : 0,
    status,
    energy_match: null,
    rescued_from_id: null,
    completed_at: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-06T18:00:00Z",
  };
}

function preferencesForRange(): StudyPreference[] {
  const start = new Date("2026-10-08T00:00:00Z");
  return Array.from({ length: 3 }, (_, i) => {
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + i);
    return makePreference({ day_of_week: date.getUTCDay() });
  });
}

function baseInput(overrides: Partial<PlanRescueInput> = {}): PlanRescueInput {
  return {
    subjects: [makeSubject()],
    topics: [makeTopic()],
    exams: [makeExam()],
    missedSessions: [makeMissedSession(60)],
    preferences: preferencesForRange(),
    existingSessions: [],
    startDate: "2026-10-08T00:00:00Z",
    endDate: "2026-10-10T00:00:00Z",
    dailyStudyGoalMinutes: 120,
    now: "2026-10-07T00:00:00Z",
    ...overrides,
  };
}

describe("generatePlanRescue", () => {
  it("returns null when there are no missed sessions", () => {
    expect(generatePlanRescue(baseInput({ missedSessions: [] }))).toBeNull();
  });

  it("distributes one missed session across remaining days", () => {
    const result = generatePlanRescue(baseInput());
    expect(result).not.toBeNull();
    expect(result!.totalRecoveredMinutes).toBeGreaterThan(0);
    expect(result!.changes.length).toBeGreaterThan(0);
  });

  it("does not dump all missed time onto the first available day", () => {
    const result = generatePlanRescue(baseInput({ missedSessions: [makeMissedSession(180)] }));
    expect(result!.changes.length).toBeGreaterThan(0);
    const firstDayMinutes = result!.changes[0].sessions.reduce((s, c) => s + c.addedMinutes, 0);
    expect(firstDayMinutes).toBeLessThan(180);
  });

  it("handles multiple missed sessions", () => {
    const missed = [
      makeMissedSession(60),
      {
        ...makeMissedSession(60),
        id: "missed-2",
        topic_id: "topic-1",
        scheduled_start: "2026-10-05T18:00:00Z",
        scheduled_end: "2026-10-05T19:00:00Z",
      },
    ];
    const result = generatePlanRescue(baseInput({ missedSessions: missed }));
    expect(result!.totalRecoveredMinutes).toBe(120);
  });

  it("reports zero recovery when schedule is fully booked", () => {
    const existing: StudySession[] = [
      {
        id: "existing-1",
        user_id: "user-1",
        plan_id: null,
        topic_id: "topic-1",
        scheduled_start: "2026-10-08T18:00:00Z",
        scheduled_end: "2026-10-08T21:00:00Z",
        planned_minutes: 180,
        actual_minutes: null,
        status: "planned",
        energy_match: null,
        rescued_from_id: null,
        completed_at: null,
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
      },
    ];
    const result = generatePlanRescue(
      baseInput({ existingSessions: existing, dailyStudyGoalMinutes: 180, endDate: "2026-10-08T00:00:00Z" })
    );
    expect(result!.totalRecoveredMinutes).toBe(0);
  });

  it("prioritises high-priority subjects when redistributing limited time", () => {
    const subjects = [
      makeSubject({ id: "s1", name: "History", importance: 1, difficulty: 1 }),
      makeSubject({ id: "s2", name: "DSA", importance: 5, difficulty: 5 }),
    ];
    const topics = [
      makeTopic({ id: "t1", subject_id: "s1", name: "WWII", estimated_minutes: 60 }),
      makeTopic({ id: "t2", subject_id: "s2", name: "Graphs", estimated_minutes: 60 }),
    ];
    const exams = [
      makeExam({ subject_id: "s1", exam_date: "2026-12-01T09:00:00Z" }),
      makeExam({ subject_id: "s2", exam_date: "2026-10-08T09:00:00Z" }),
    ];
    const missed = [
      { ...makeMissedSession(60), topic_id: "t1", subject_id: "s1" },
      { ...makeMissedSession(60), topic_id: "t2", subject_id: "s2" },
    ];
    const result = generatePlanRescue(baseInput({ subjects, topics, exams, missedSessions: missed }));
    const firstChange = result!.changes[0];
    expect(firstChange.sessions[0].subjectName).toBe("DSA");
  });

  it("handles exam tomorrow scenario by prioritising recovery", () => {
    const exam = makeExam({ exam_date: "2026-10-08T09:00:00Z" });
    const result = generatePlanRescue(baseInput({ exams: [exam] }));
    expect(result!.totalRecoveredMinutes).toBeGreaterThan(0);
  });

  it("reports peak daily increase", () => {
    const result = generatePlanRescue(baseInput());
    expect(result!.peakDailyIncreaseMinutes).toBeGreaterThanOrEqual(0);
    expect(result!.peakDailyIncreaseMinutes).toBeLessThanOrEqual(120);
  });
});
