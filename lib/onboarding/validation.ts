import {
  DIFFICULTY_MIN,
  DIFFICULTY_MAX,
  IMPORTANCE_MIN,
  IMPORTANCE_MAX,
  MIN_TOPIC_MINUTES,
  MAX_TOPIC_MINUTES,
  MAX_DAILY_MINUTES,
  TIME_BLOCKS,
  type OnboardingData,
} from "@/lib/onboarding/types";

/**
 * Validation for onboarding.
 *
 * WHY VALIDATE HERE AND NOT ONLY IN THE FORM
 *
 * The browser checks are for the user's benefit - instant feedback. These
 * checks are for CORRECTNESS. A Server Action is reachable by a direct POST,
 * not just through our UI, so every value is validated again on the server
 * before it is written. A form can be bypassed; this cannot.
 *
 * The database constraints are the final backstop, but we catch problems early
 * so the student sees a useful message instead of a database error.
 */

export type ValidationErrors = Partial<
  Record<"displayName" | "studyGoal" | "subjects" | "exams" | "availability" | "energy", string>
>;

export type ValidationResult =
  | { ok: true; data: OnboardingData }
  | { ok: false; errors: ValidationErrors };

export function validateOnboarding(data: OnboardingData): ValidationResult {
  const errors: ValidationErrors = {};

  // ---- Step 1: profile ---------------------------------------------------
  if (!data.displayName.trim()) {
    errors.displayName = "Please enter a name we can use to greet you.";
  } else if (data.displayName.trim().length > 80) {
    errors.displayName = "That name is too long (80 characters maximum).";
  }

  if (data.studyGoal.trim().length > 280) {
    errors.studyGoal = "Please keep your goal under 280 characters.";
  }

  // ---- Step 2: subjects --------------------------------------------------
  if (data.subjects.length === 0) {
    errors.subjects = "Add at least one subject so we can build a plan.";
  } else if (data.subjects.length > 30) {
    errors.subjects = "That is more than 30 subjects. Please remove a few.";
  } else {
    const names = data.subjects.map((s) => s.name.trim().toLowerCase());

    for (let i = 0; i < data.subjects.length; i++) {
      const subject = data.subjects[i];

      if (!subject.name.trim()) {
        errors.subjects = `Subject ${i + 1} needs a name.`;
        break;
      }
      if (subject.name.trim().length > 120) {
        errors.subjects = `"${subject.name}" is too long (120 characters maximum).`;
        break;
      }
      if (subject.difficulty < DIFFICULTY_MIN || subject.difficulty > DIFFICULTY_MAX) {
        errors.subjects = `Difficulty for "${subject.name}" must be between ${DIFFICULTY_MIN} and ${DIFFICULTY_MAX}.`;
        break;
      }
      if (subject.importance < IMPORTANCE_MIN || subject.importance > IMPORTANCE_MAX) {
        errors.subjects = `Importance for "${subject.name}" must be between ${IMPORTANCE_MIN} and ${IMPORTANCE_MAX}.`;
        break;
      }
      // Case-insensitive: "Calculus" and "calculus" are the same subject to a
      // student, and allowing both would double-count workload later.
      if (names.indexOf(subject.name.trim().toLowerCase()) !== i) {
        errors.subjects = `You have entered "${subject.name}" more than once.`;
        break;
      }
    }
  }
  // ---- Step 3: topics ----------------------------------------------------
  if (!errors.subjects) {
    for (const subject of data.subjects) {
      if (subject.topics.length > 100) {
        errors.subjects = `"${subject.name}" has too many topics (100 maximum).`;
        break;
      }

      const topicNames = subject.topics.map((t) => t.name.trim().toLowerCase());

      for (let i = 0; i < subject.topics.length; i++) {
        const topic = subject.topics[i];

        if (!topic.name.trim()) {
          errors.subjects = `"${subject.name}" has a topic with no name.`;
          break;
        }
        if (topic.name.trim().length > 160) {
          errors.subjects = `A topic name in "${subject.name}" is too long.`;
          break;
        }
        if (topic.difficulty < DIFFICULTY_MIN || topic.difficulty > DIFFICULTY_MAX) {
          errors.subjects = `Difficulty for "${topic.name}" must be between ${DIFFICULTY_MIN} and ${DIFFICULTY_MAX}.`;
          break;
        }
        if (topic.estimatedMinutes < MIN_TOPIC_MINUTES || topic.estimatedMinutes > MAX_TOPIC_MINUTES) {
          errors.subjects = `Study time for "${topic.name}" must be between ${MIN_TOPIC_MINUTES} and ${MAX_TOPIC_MINUTES} minutes.`;
          break;
        }
        if (topic.confidence < 0 || topic.confidence > 100) {
          errors.subjects = `Confidence for "${topic.name}" must be between 0 and 100.`;
          break;
        }
        if (topicNames.indexOf(topic.name.trim().toLowerCase()) !== i) {
          errors.subjects = `"${topic.name}" is listed twice in ${subject.name}.`;
          break;
        }
      }
      if (errors.subjects) break;
    }
  }

  // ---- Step 4: exams -----------------------------------------------------
  if (data.exams.length > 40) {
    errors.exams = "That is more than 40 exams. Please remove a few.";
  } else {
    const subjectKeys = new Set(data.subjects.map((s) => s.key));

    for (let i = 0; i < data.exams.length; i++) {
      const exam = data.exams[i];

      if (!exam.title.trim()) {
        errors.exams = `Exam ${i + 1} needs a title.`;
        break;
      }
      // Guards against an exam pointing at a subject the student deleted.
      if (!subjectKeys.has(exam.subjectKey)) {
        errors.exams = `Exam "${exam.title}" refers to a subject that no longer exists.`;
        break;
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(exam.examDate)) {
        errors.exams = `Exam "${exam.title}" needs a valid date.`;
        break;
      }
      if (Number.isNaN(Date.parse(exam.examDate))) {
        errors.exams = `Exam "${exam.title}" has an unrecognised date.`;
        break;
      }
      if (exam.importance < IMPORTANCE_MIN || exam.importance > IMPORTANCE_MAX) {
        errors.exams = `Importance for "${exam.title}" must be between ${IMPORTANCE_MIN} and ${IMPORTANCE_MAX}.`;
        break;
      }
    }
  }

  // ---- Step 5: availability ----------------------------------------------
  const { availability } = data;
  if (availability.days.length === 0) {
    errors.availability = "Select at least one day you are available to study.";
  }
  const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timePattern.test(availability.startTime) || !timePattern.test(availability.endTime)) {
    errors.availability = "Enter valid start and end times.";
  } else if (availability.endTime <= availability.startTime) {
    errors.availability = "The end time must be after the start time.";
  }
  if (availability.maxMinutesPerDay < 15 || availability.maxMinutesPerDay > MAX_DAILY_MINUTES) {
    errors.availability = `Daily study time must be between 15 and ${MAX_DAILY_MINUTES} minutes.`;
  }

  // ---- Step 6: energy ----------------------------------------------------
  const validBlockIds = new Set<string>(TIME_BLOCKS.map((b) => b.id));
  const { energy } = data;

  for (const bucket of ["high", "medium", "low"] as const) {
    const blocks = energy[bucket];

    for (const block of blocks) {
      if (!validBlockIds.has(block)) {
        errors.energy = "That is not a recognised time period.";
        break;
      }
    }
    if (errors.energy) break;

    // A period cannot sit in two buckets at once - that would contradict
    // itself when the scheduler tries to place hard work.
    const others = (["high", "medium", "low"] as const).filter((b) => b !== bucket);
    for (const block of blocks) {
      if (others.some((b) => energy[b].includes(block))) {
        errors.energy = "Each time period should be assigned only one energy level.";
        break;
      }
    }
    if (errors.energy) break;

    if (blocks.length > TIME_BLOCKS.length) {
      errors.energy = "Too many periods selected.";
      break;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  // Normalise before saving: trim strings and dedupe arrays, so a double-click
  // cannot store the same day or period twice.
  return {
    ok: true,
    data: {
      ...data,
      displayName: data.displayName.trim(),
      studyGoal: data.studyGoal.trim(),
      availability: {
        ...availability,
        days: [...new Set(availability.days)].sort((a, b) => a - b),
      },
      energy: {
        high: [...new Set(energy.high)],
        medium: [...new Set(energy.medium)],
        low: [...new Set(energy.low)],
      },
    },
  };
}

/** Which steps still need attention. Drives the progress indicator. */
export function completedSteps(data: OnboardingData): boolean[] {
  const topicCount = data.subjects.reduce(
    (total, subject) => total + subject.topics.length,
    0
  );

  return [
    data.displayName.trim().length > 0,
    data.subjects.length > 0,
    topicCount > 0,
    data.exams.length > 0,
    data.availability.days.length > 0,
    data.energy.high.length + data.energy.medium.length + data.energy.low.length > 0,
  ];
}

/** True when nothing has been entered yet. */
export function isEmpty(data: OnboardingData): boolean {
  return (
    data.displayName.trim() === "" &&
    data.studyGoal.trim() === "" &&
    data.subjects.length === 0 &&
    data.exams.length === 0 &&
    data.availability.days.length === 0 &&
    data.energy.high.length + data.energy.medium.length + data.energy.low.length === 0
  );
}
