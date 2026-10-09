/**
 * Plan Rescue engine.
 *
 * When a student misses planned sessions, this engine redistributes the
 * unfinished work across the remaining available study periods. It never
 * dumps all missed time onto the next day; instead it spreads workload
 * according to subject priority, exam urgency, and daily capacity.
 *
 * The algorithm is deterministic and does not use AI.
 */

import type {
  Subject,
  Topic,
  Exam,
  StudyPreference,
  StudySession,
  PlanRescueProposal,
  PlanRescueChange,
} from "@/lib/types/database";
import {
  daysBetween,
  clamp,
  getUTCDayOfWeek,
  applyUTCTime,
  minutesBetween,
  toUTCISODate,
  addDays,
  utcTimeString,
} from "./utils";

export type PlanRescueInput = {
  subjects: Subject[];
  topics: Topic[];
  exams: Exam[];
  missedSessions: StudySession[];
  preferences: StudyPreference[];
  existingSessions: StudySession[];
  startDate: Date | string;
  endDate: Date | string;
  dailyStudyGoalMinutes: number;
  originalPlanId?: string | null;
  now?: Date | string;
};

type MissedWorkloadUnit = {
  sessionId: string;
  topicId: string;
  subjectId: string;
  minutes: number;
  rescuedFromSessionId: string;
};

type AvailableSlot = {
  date: string;
  startTime: string;
  endTime: string;
  availableMinutes: number;
};

function getNearestExam(subjectId: string, exams: Exam[], now: Date): Exam | null {
  return (
    exams
      .filter((e) => e.subject_id === subjectId)
      .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())[0] ?? null
  );
}

function subjectPriority(subject: Subject, exams: Exam[], now: Date): number {
  const exam = getNearestExam(subject.id, exams, now);
  const daysUntil = exam ? daysBetween(now, exam.exam_date) : 999;

  let urgency = 0;
  if (daysUntil <= 3) urgency = 100;
  else if (daysUntil <= 7) urgency = 75;
  else if (daysUntil <= 14) urgency = 50;
  else if (daysUntil <= 30) urgency = 25;

  return urgency + subject.importance * 10 + subject.difficulty * 5;
}

function calculateMissedWorkload(
  missedSessions: StudySession[],
  topics: Topic[]
): MissedWorkloadUnit[] {
  const topicById = new Map(topics.map((t) => [t.id, t]));
  const units: MissedWorkloadUnit[] = [];

  for (const session of missedSessions) {
    const topic = topicById.get(session.topic_id);
    if (!topic) continue;

    const remainingMinutes =
      session.status === "skipped"
        ? session.planned_minutes
        : Math.max(0, session.planned_minutes - (session.actual_minutes ?? 0));

    if (remainingMinutes <= 0) continue;

    units.push({
      sessionId: session.id,
      topicId: session.topic_id,
      subjectId: topic.subject_id,
      minutes: remainingMinutes,
      rescuedFromSessionId: session.rescued_from_id ?? session.id,
    });
  }

  return units;
}

function buildAvailableSlots(
  startDate: Date,
  endDate: Date,
  preferences: StudyPreference[],
  existingSessions: StudySession[]
): AvailableSlot[] {
  const slots: AvailableSlot[] = [];
  const dayCount = Math.max(1, daysBetween(startDate, endDate) + 1);

  for (let i = 0; i < dayCount; i++) {
    const date = addDays(startDate, i);
    const dow = getUTCDayOfWeek(date);
    const dateStr = toUTCISODate(date);

    const dayPrefs = preferences
      .filter((p) => p.day_of_week === dow && p.is_active)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    for (const pref of dayPrefs) {
      const start = applyUTCTime(date, pref.start_time);
      const end = applyUTCTime(date, pref.end_time);
      if (end <= start) continue;
      const duration = minutesBetween(start, end);
      if (duration <= 0) continue;

      slots.push({
        date: dateStr,
        startTime: pref.start_time,
        endTime: pref.end_time,
        availableMinutes: duration,
      });
    }
  }

  // Subtract existing future sessions.
  for (const session of existingSessions) {
    const sessionStart = new Date(session.scheduled_start);
    const sessionEnd = new Date(session.scheduled_end);
    const sessionDate = toUTCISODate(sessionStart);
    const sessionStartTime = utcTimeString(sessionStart);
    const sessionEndTime = utcTimeString(sessionEnd);

    for (const slot of slots) {
      if (slot.date !== sessionDate) continue;
      if (sessionEndTime <= slot.startTime || sessionStartTime >= slot.endTime) continue;

      const [startH, startM] =
        sessionStartTime > slot.startTime ? sessionStartTime.split(":").map(Number) : slot.startTime.split(":").map(Number);
      const [endH, endM] =
        sessionEndTime < slot.endTime ? sessionEndTime.split(":").map(Number) : slot.endTime.split(":").map(Number);
      const overlapMinutes = endH * 60 + endM - (startH * 60 + startM);
      slot.availableMinutes = Math.max(0, slot.availableMinutes - overlapMinutes);
    }
  }

  return slots.filter((s) => s.availableMinutes > 0);
}

export function generatePlanRescue(input: PlanRescueInput): PlanRescueProposal | null {
  const {
    subjects,
    topics,
    exams,
    missedSessions,
    preferences,
    existingSessions,
    startDate,
    endDate,
    dailyStudyGoalMinutes,
    originalPlanId = null,
    now: nowInput = new Date(),
  } = input;

  const now = new Date(nowInput);
  const start = new Date(startDate);
  const end = new Date(endDate);

  const missedWorkload = calculateMissedWorkload(missedSessions, topics);
  if (missedWorkload.length === 0) return null;

  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const topicById = new Map(topics.map((t) => [t.id, t]));

  // Sort missed workload by subject priority so high-priority subjects get time first.
  missedWorkload.sort((a, b) => {
    const subjectA = subjectById.get(a.subjectId);
    const subjectB = subjectById.get(b.subjectId);
    if (!subjectA || !subjectB) return 0;
    return subjectPriority(subjectB, exams, now) - subjectPriority(subjectA, exams, now);
  });

  const slots = buildAvailableSlots(start, end, preferences, existingSessions);
  if (slots.length === 0) {
    return {
      originalPlanId: originalPlanId ?? "",
      newPlanName: "Rescued plan",
      changes: [],
      totalRecoveredMinutes: 0,
      peakDailyIncreaseMinutes: 0,
      explanation:
        "No available study periods remain in the selected range, so the missed workload could not be redistributed.",
    };
  }

  const dailyCapacity = new Map<string, number>();
  const dailyIncrease = new Map<string, number>();
  const changesByDate = new Map<string, PlanRescueChange["sessions"]>();

  let totalRecovered = 0;

  for (const unit of missedWorkload) {
    const subject = subjectById.get(unit.subjectId);
    const topic = topicById.get(unit.topicId);
    if (!subject || !topic) continue;

    let remaining = unit.minutes;

    // Try to place up to the unit's remaining minutes across slots.
    for (const slot of slots) {
      if (remaining <= 0) break;

      const alreadyScheduled = dailyCapacity.get(slot.date) ?? 0;
      const roomToday = Math.max(0, dailyStudyGoalMinutes - alreadyScheduled);
      const roomSlot = slot.availableMinutes;
      const chunk = Math.min(remaining, roomToday, roomSlot, 60);

      if (chunk < 10) continue;

      const startDateTime = applyUTCTime(slot.date, slot.startTime);
      const endDateTime = new Date(startDateTime.getTime() + chunk * 60000);
      const startTime = utcTimeString(startDateTime);
      const endTime = utcTimeString(endDateTime);

      const dateSessions = changesByDate.get(slot.date) ?? [];
      dateSessions.push({
        topicId: topic.id,
        topicName: topic.name,
        subjectName: subject.name,
        subjectColor: subject.color,
        addedMinutes: chunk,
        reason: `Recovered ${chunk} min from missed ${subject.name} session`,
        rescuedFromSessionId: unit.sessionId,
      });
      changesByDate.set(slot.date, dateSessions);

      slot.availableMinutes -= chunk;
      dailyCapacity.set(slot.date, alreadyScheduled + chunk);
      dailyIncrease.set(slot.date, (dailyIncrease.get(slot.date) ?? 0) + chunk);
      totalRecovered += chunk;
      remaining -= chunk;

      // Advance the slot start time so the next session doesn't overlap.
      slot.startTime = endTime;
    }
  }

  const changes: PlanRescueChange[] = Array.from(changesByDate.entries())
    .map(([date, sessions]) => ({ date, sessions }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const peakDailyIncrease = Math.max(0, ...Array.from(dailyIncrease.values()));

  const recoveredRatio =
    totalRecovered /
    missedWorkload.reduce((sum, u) => sum + u.minutes, 0);

  let explanation: string;
  if (totalRecovered === 0) {
    explanation =
      "No missed workload could be placed in the remaining study periods. Consider extending your daily study limit or adding more availability.";
  } else if (recoveredRatio >= 1) {
    explanation = `All missed workload (${totalRecovered} min) was redistributed across the remaining schedule without exceeding your daily limit.`;
  } else {
    explanation = `${totalRecovered} min of missed workload was redistributed. The remaining ${
      missedWorkload.reduce((sum, u) => sum + u.minutes, 0) - totalRecovered
    } min could not fit within your availability and daily limit.`;
  }

  return {
    originalPlanId: originalPlanId ?? "",
    newPlanName: `Rescued plan from ${toUTCISODate(now)}`,
    changes,
    totalRecoveredMinutes: totalRecovered,
    peakDailyIncreaseMinutes: peakDailyIncrease,
    explanation,
  };
}
