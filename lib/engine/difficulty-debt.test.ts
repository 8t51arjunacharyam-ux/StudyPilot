import { describe, it, expect } from "vitest";
import { calculateDifficultyDebt } from "./difficulty-debt";
import type { DifficultyDebtInput } from "./difficulty-debt";
import type { Subject, Topic, Exam, StudySession } from "@/lib/types/database";

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
    estimated_minutes: 120,
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

function baseInput(overrides: Partial<DifficultyDebtInput> = {}): DifficultyDebtInput {
  return {
    subjects: [makeSubject()],
    topics: [makeTopic()],
    exams: [makeExam()],
    sessions: [],
    now: "2026-10-07T00:00:00Z",
    ...overrides,
  };
}

describe("calculateDifficultyDebt", () => {
  it("returns empty array when no subjects", () => {
    expect(calculateDifficultyDebt(baseInput({ subjects: [] }))).toEqual([]);
  });

  it("returns high debt for difficult subject with approaching exam and low confidence", () => {
    const result = calculateDifficultyDebt(baseInput());
    expect(result.length).toBe(1);
    expect(result[0].level).toBe("high");
    expect(result[0].debtScore).toBeGreaterThan(60);
    expect(result[0].reasons.some((r) => r.includes("exam"))).toBe(true);
  });

  it("returns low debt for easy subject with distant exam and high confidence", () => {
    const subject = makeSubject({ difficulty: 1 });
    const topic = makeTopic({ confidence: 90 });
    const exam = makeExam({ exam_date: "2026-12-01T09:00:00Z" });
    const result = calculateDifficultyDebt(
      baseInput({ subjects: [subject], topics: [topic], exams: [exam] })
    );
    expect(result.length).toBe(1);
    expect(result[0].level).toBe("low");
  });

  it("ranks multiple subjects by debt score", () => {
    const subjects = [
      makeSubject({ id: "s1", name: "Easy", difficulty: 1 }),
      makeSubject({ id: "s2", name: "Hard", difficulty: 5 }),
    ];
    const topics = [
      makeTopic({ id: "t1", subject_id: "s1", confidence: 90, estimated_minutes: 30 }),
      makeTopic({ id: "t2", subject_id: "s2", confidence: 30, estimated_minutes: 300 }),
    ];
    const exams = [
      makeExam({ subject_id: "s1", exam_date: "2026-12-01T09:00:00Z" }),
      makeExam({ subject_id: "s2", exam_date: "2026-10-08T09:00:00Z" }),
    ];

    const result = calculateDifficultyDebt(baseInput({ subjects, topics, exams }));
    expect(result[0].subjectName).toBe("Hard");
    expect(result[0].debtScore).toBeGreaterThan(result[1].debtScore);
  });

  it("mentions workload remaining in reasons", () => {
    const result = calculateDifficultyDebt(baseInput());
    expect(result[0].reasons.some((r) => r.includes("workload"))).toBe(true);
  });

  it("considers recent study activity", () => {
    const sessions: StudySession[] = [
      {
        id: "ses-1",
        user_id: "user-1",
        plan_id: null,
        topic_id: "topic-1",
        scheduled_start: "2026-10-06T10:00:00Z",
        scheduled_end: "2026-10-06T11:00:00Z",
        planned_minutes: 60,
        actual_minutes: 60,
        status: "completed",
        energy_match: null,
        rescued_from_id: null,
        completed_at: "2026-10-06T11:00:00Z",
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-06T11:00:00Z",
      },
    ];
    const withActivity = calculateDifficultyDebt(baseInput({ sessions }));
    const withoutActivity = calculateDifficultyDebt(baseInput({ sessions: [] }));
    expect(withActivity[0].debtScore).toBeLessThanOrEqual(withoutActivity[0].debtScore);
  });
});
