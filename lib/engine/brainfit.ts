/**
 * BrainFit Scheduler.
 *
 * Generates a study schedule that matches topic difficulty and activity type
 * to the student's energy periods. The algorithm is deterministic and does
 * not use AI.
 */

import type {
  Subject,
  Topic,
  Exam,
  StudyPreference,
  StudySession,
  BrainFitSlot,
  BrainFitSessionProposal,
  ActivityType,
  EnergyMatch,
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


export type BrainFitInput = {
  subjects: Subject[];
  topics: Topic[];
  exams: Exam[];
  preferences: StudyPreference[];
  existingSessions: StudySession[];
  startDate: Date | string;
  endDate: Date | string;
  dailyStudyGoalMinutes: number;
  now?: Date | string;
};

type EnergyBucket = "peak" | "steady" | "light";

function getEnergyBucket(level: number): EnergyBucket {
  if (level >= 4) return "peak";
  if (level >= 2.5) return "steady";
  return "light";
}

function topicEnergyNeed(topic: Topic, activity: ActivityType): EnergyBucket {
  if (activity === "mock_test") return "peak";
  if (activity === "practice") return "peak";
  if (topic.difficulty >= 4 || topic.is_new) return "peak";
  if (topic.difficulty === 3 || activity === "active_recall") return "steady";
  return "light";
}

function chooseActivityType(
  topic: Topic,
  daysUntilExam: number | null,
  energyBucket: EnergyBucket
): ActivityType {
  if (daysUntilExam !== null && daysUntilExam <= 3) return "mock_test";
  if (topic.is_new) return "learn";
  if (energyBucket === "peak" && topic.difficulty >= 4) return "practice";
  if (topic.confidence < 50) return "learn";
  if (topic.confidence < 70) return "active_recall";
  if (energyBucket === "light") return "revision";
  return "revision";
}

function activityReason(topic: Topic, activity: ActivityType, bucket: EnergyBucket): string {
  const bucketLabel = bucket === "peak" ? "high" : bucket === "steady" ? "medium" : "low";
  const activityLabel: Record<ActivityType, string> = {
    learn: "first-time learning",
    practice: "problem-solving practice",
    active_recall: "active recall",
    revision: "structured revision",
    mock_test: "mock test practice",
  };
  return `${topic.name} needs ${activityLabel[activity]} and fits your ${bucketLabel}-energy window.`;
}

function getNearestExam(subjectId: string, exams: Exam[], now: Date): Exam | null {
  return (
    exams
      .filter((e) => e.subject_id === subjectId)
      .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())[0] ?? null
  );
}

function topicPriority(topic: Topic, subject: Subject, exams: Exam[], now: Date): number {
  const exam = getNearestExam(topic.subject_id, exams, now);
  const daysUntil = exam ? daysBetween(now, exam.exam_date) : 999;

  let urgency = 0;
  if (daysUntil <= 3) urgency = 100;
  else if (daysUntil <= 7) urgency = 80;
  else if (daysUntil <= 14) urgency = 60;
  else if (daysUntil <= 30) urgency = 30;

  const difficulty = topic.difficulty * 10 + subject.difficulty * 5;
  const confidencePenalty = 100 - topic.confidence;
  const newBonus = topic.is_new ? 20 : 0;

  return urgency + difficulty + confidencePenalty + newBonus;
}

function buildAvailableSlots(
  startDate: Date,
  endDate: Date,
  preferences: StudyPreference[],
  existingSessions: StudySession[]
): BrainFitSlot[] {
  const slots: BrainFitSlot[] = [];
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
        energyLevel: clamp(pref.energy_level, 1, 5) as BrainFitSlot["energyLevel"],
        availableMinutes: duration,
      });
    }
  }

  // Subtract existing sessions from the slots that overlap them.
  for (const session of existingSessions) {
    const sessionStart = new Date(session.scheduled_start);
    const sessionEnd = new Date(session.scheduled_end);
    const sessionDate = toUTCISODate(sessionStart);
    const sessionStartTime = utcTimeString(sessionStart);
    const sessionEndTime = utcTimeString(sessionEnd);

    for (const slot of slots) {
      if (slot.date !== sessionDate) continue;
      if (sessionEndTime <= slot.startTime || sessionStartTime >= slot.endTime) continue;

      const overlapStart = sessionStartTime > slot.startTime ? sessionStartTime : slot.startTime;
      const overlapEnd = sessionEndTime < slot.endTime ? sessionEndTime : slot.endTime;
      const [startH, startM] = overlapStart.split(":").map(Number);
      const [endH, endM] = overlapEnd.split(":").map(Number);
      const overlapMinutes = endH * 60 + endM - (startH * 60 + startM);

      // If the overlap consumes the start of the slot, advance the slot start
      // so newly scheduled sessions do not collide with the existing session.
      if (overlapStart === slot.startTime) {
        slot.startTime = overlapEnd;
      }

      slot.availableMinutes = Math.max(0, slot.availableMinutes - overlapMinutes);
    }
  }

  return slots.filter((s) => s.availableMinutes > 0);
}

function allocateDuration(
  topic: Topic,
  activity: ActivityType,
  bucket: EnergyBucket,
  availableMinutes: number
): number {
  const minDuration = activity === "mock_test" ? 30 : 15;
  const ideal = clamp(topic.estimated_minutes, minDuration, 120);

  if (bucket === "peak") return clamp(ideal, minDuration, Math.min(120, availableMinutes));
  if (bucket === "steady") return clamp(Math.round(ideal * 0.8), minDuration, Math.min(90, availableMinutes));
  return clamp(Math.round(ideal * 0.6), minDuration, Math.min(60, availableMinutes));
}

export function generateBrainFitSchedule(input: BrainFitInput): BrainFitSessionProposal[] {
  const {
    subjects,
    topics,
    exams,
    preferences,
    existingSessions,
    startDate,
    endDate,
    dailyStudyGoalMinutes,
    now: nowInput = new Date(),
  } = input;

  const now = new Date(nowInput);
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (subjects.length === 0 || topics.length === 0 || preferences.length === 0) {
    return [];
  }

  const subjectById = new Map(subjects.map((s) => [s.id, s]));
  const incompleteTopics = topics.filter((t) => !t.completed_at);

  if (incompleteTopics.length === 0) return [];

  const slots = buildAvailableSlots(start, end, preferences, existingSessions);
  if (slots.length === 0) return [];

  // Track how many minutes have been scheduled per day.
  const dailyScheduledMinutes = new Map<string, number>();

  const scoredTopics = incompleteTopics
    .map((topic) => {
      const subject = subjectById.get(topic.subject_id);
      if (!subject) return null;
      return {
        topic,
        subject,
        priority: topicPriority(topic, subject, exams, now),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.priority - a.priority);

  const proposals: BrainFitSessionProposal[] = [];

  for (const { topic, subject } of scoredTopics) {
    const needBucket = topicEnergyNeed(topic, chooseActivityType(topic, null, "peak"));

    // Find the best slot: prefer matching bucket, then earliest date, then most available time.
    const rankedSlots = slots
      .filter((slot) => slot.availableMinutes >= 15)
      .map((slot) => {
        const slotBucket = getEnergyBucket(slot.energyLevel);
        const bucketMatch = slotBucket === needBucket ? 2 : slotBucket === "steady" ? 1 : 0;
        const scheduledToday = dailyScheduledMinutes.get(slot.date) ?? 0;
        const remainingDailyCapacity = Math.max(0, dailyStudyGoalMinutes - scheduledToday);
        return { slot, bucketMatch, remainingDailyCapacity };
      })
      .filter((item) => item.remainingDailyCapacity >= 15)
      .sort((a, b) => {
        if (b.bucketMatch !== a.bucketMatch) return b.bucketMatch - a.bucketMatch;
        if (a.slot.date !== b.slot.date) return a.slot.date.localeCompare(b.slot.date);
        return b.slot.availableMinutes - a.slot.availableMinutes;
      });

    const best = rankedSlots[0];
    if (!best) continue;

    const slot = best.slot;
    const slotBucket = getEnergyBucket(slot.energyLevel);
    const exam = getNearestExam(subject.id, exams, now);
    const daysUntil = exam ? daysBetween(now, exam.exam_date) : null;
    const activity = chooseActivityType(topic, daysUntil, slotBucket);
    const duration = allocateDuration(
      topic,
      activity,
      getEnergyBucket(slot.energyLevel),
      Math.min(slot.availableMinutes, best.remainingDailyCapacity)
    );

    if (duration < 15) continue;

    const startDateTime = applyUTCTime(slot.date, slot.startTime);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
    const startTime = utcTimeString(startDateTime);
    const endTime = utcTimeString(endDateTime);

    proposals.push({
      topicId: topic.id,
      topicName: topic.name,
      subjectId: subject.id,
      subjectName: subject.name,
      subjectColor: subject.color,
      date: slot.date,
      startTime,
      endTime,
      durationMinutes: duration,
      activityType: activity,
      energyMatch: getEnergyBucket(slot.energyLevel),
      reason: activityReason(topic, activity, getEnergyBucket(slot.energyLevel)),
    });

    slot.availableMinutes -= duration;
    dailyScheduledMinutes.set(slot.date, (dailyScheduledMinutes.get(slot.date) ?? 0) + duration);
  }

  return proposals.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.startTime.localeCompare(b.startTime)
  );
}
