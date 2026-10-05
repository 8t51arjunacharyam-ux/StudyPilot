"use client";

import { useState, useTransition, useCallback } from "react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  DifficultySlider,
  ImportanceSlider,
  ConfidenceSlider,
  DayChip,
} from "@/components/onboarding/fields";
import {
  StepIndicator,
  StepSection,
  FieldError,
  StepError,
  WizardFooter,
} from "@/components/onboarding/parts";
import { saveOnboardingAction } from "@/lib/onboarding/actions";
import {
  emptyOnboardingData,
  makeKey,
  DAY_NAMES,
  TIME_BLOCKS,
  MIN_TOPIC_MINUTES,
  MAX_TOPIC_MINUTES,
  MAX_DAILY_MINUTES,
  type OnboardingData,
  type DraftSubject,
  type DraftTopic,
  type DraftExam,
} from "@/lib/onboarding/types";
import { completedSteps, type ValidationErrors } from "@/lib/onboarding/validation";
import { cn } from "@/lib/utils";

/**
 * The seven-step onboarding wizard.
 *
 * WHY ONE COMPONENT
 *
 * The steps share one piece of state. Splitting them across seven files would
 * mean threading subjects/topics/exams through props between every sibling,
 * which is exactly where multi-step form bugs live.
 *
 * WHY NOTHING IS SAVED UNTIL THE END
 *
 * We write to the database only on the final step, inside one transactional
 * Postgres function. A partial save would leave a half-configured account with
 * no obvious way for the student to tell. The trade-off is that leaving
 * mid-way loses progress; the honest fix is database autosave to a DRAFT,
 * which is a later phase. We do not paper over it with localStorage.
 */

export const STEPS = [
  { id: 1, title: "Profile" },
  { id: 2, title: "Subjects" },
  { id: 3, title: "Topics" },
  { id: 4, title: "Exams" },
  { id: 5, title: "Availability" },
  { id: 6, title: "Energy" },
  { id: 7, title: "Review" },
] as const;

type Bucket = "high" | "medium" | "low";

export function OnboardingWizard({
  initialData,
  initialName,
}: {
  initialData?: OnboardingData;
  initialName?: string;
}) {
  const [data, setData] = useState<OnboardingData>(() => {
    const base = initialData ?? emptyOnboardingData();
    // Seed the name from the account so the student does not retype it.
    if (!base.displayName && initialName) {
      return { ...base, displayName: initialName };
    }
    return base;
  });

  const [step, setStep] = useState(1);
  const [furthest, setFurthest] = useState(1);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const update = useCallback((patch: Partial<OnboardingData>) => {
    setData((current) => ({ ...current, ...patch }));
  }, []);

  function addSubject() {
    const subject: DraftSubject = {
      key: makeKey(),
      name: "",
      difficulty: 5,
      importance: 3,
      topics: [],
    };
    update({ subjects: [...data.subjects, subject] });
  }

  function updateSubject(key: string, patch: Partial<DraftSubject>) {
    update({
      subjects: data.subjects.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    });
  }

  function removeSubject(key: string) {
    // Removing a subject must also drop its exams, otherwise rows would point
    // at something that no longer exists.
    update({
      subjects: data.subjects.filter((s) => s.key !== key),
      exams: data.exams.filter((e) => e.subjectKey !== key),
    });
  }

  function addTopic(subjectKey: string) {
    const topic: DraftTopic = {
      key: makeKey(),
      name: "",
      difficulty: 5,
      estimatedMinutes: 45,
      confidence: 50,
    };
    update({
      subjects: data.subjects.map((s) =>
        s.key === subjectKey ? { ...s, topics: [...s.topics, topic] } : s
      ),
    });
  }

  function updateTopic(subjectKey: string, topicKey: string, patch: Partial<DraftTopic>) {
    update({
      subjects: data.subjects.map((s) =>
        s.key === subjectKey
          ? {
              ...s,
              topics: s.topics.map((t) => (t.key === topicKey ? { ...t, ...patch } : t)),
            }
          : s
      ),
    });
  }

  function removeTopic(subjectKey: string, topicKey: string) {
    update({
      subjects: data.subjects.map((s) =>
        s.key === subjectKey
          ? { ...s, topics: s.topics.filter((t) => t.key !== topicKey) }
          : s
      ),
    });
  }

  function addExam() {
    const first = data.subjects[0];
    if (!first) return;
    const exam: DraftExam = {
      key: makeKey(),
      subjectKey: first.key,
      title: "",
      examDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
      importance: 3,
    };
    update({ exams: [...data.exams, exam] });
  }

  function updateExam(key: string, patch: Partial<DraftExam>) {
    update({ exams: data.exams.map((e) => (e.key === key ? { ...e, ...patch } : e)) });
  }

  function removeExam(key: string) {
    update({ exams: data.exams.filter((e) => e.key !== key) });
  }

  function toggleDay(day: number) {
    const days = data.availability.days.includes(day)
      ? data.availability.days.filter((d) => d !== day)
      : [...data.availability.days, day];
    update({ availability: { ...data.availability, days } });
  }

  /**
   * A time period may sit in only ONE bucket. Selecting it elsewhere MOVES it
   * rather than duplicating, so the UI can never hold a contradictory state
   * where "morning" is both high and low energy.
   */
  function toggleEnergyBlock(blockId: string, bucket: Bucket) {
    const energy: Record<Bucket, string[]> = {
      high: data.energy.high.filter((b) => b !== blockId),
      medium: data.energy.medium.filter((b) => b !== blockId),
      low: data.energy.low.filter((b) => b !== blockId),
    };
    energy[bucket] = [...energy[bucket], blockId];
    update({ energy });
  }

  function blockBucket(blockId: string): Bucket | null {
    if (data.energy.high.includes(blockId)) return "high";
    if (data.energy.medium.includes(blockId)) return "medium";
    if (data.energy.low.includes(blockId)) return "low";
    return null;
  }

  const completed = completedSteps(data);
  const canContinue = completed[step - 1] || step >= 7;

  function handleNext() {
    if (step >= 7) {
      startTransition(async () => {
        setSubmitError(null);
        const result = await saveOnboardingAction(data);
        if (!result.ok) {
          setSubmitError(result.error);
          if (result.fieldErrors) {
            setErrors(result.fieldErrors);
          }
        }
      });
    } else if (step < STEPS.length) {
      setStep((s) => s + 1);
      setFurthest((f) => Math.max(f, step + 1));
    }
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <StepIndicator current={step} steps={STEPS} furthest={furthest} />

      <form onSubmit={(e) => e.preventDefault()}>
        {/* Step 1: Profile */}
        {step === 1 && (
          <StepSection
            title="What should we call you?"
            description="This is how we'll greet you throughout the app."
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="displayName">Your name</Label>
                <Input
                  id="displayName"
                  value={data.displayName}
                  onChange={(e) => update({ displayName: e.target.value })}
                  placeholder="Alex"
                  autoComplete="name"
                  disabled={pending}
                  aria-invalid={!!errors.displayName}
                />
                {errors.displayName && <FieldError>{errors.displayName}</FieldError>}
              </div>
              <div>
                <Label htmlFor="studyGoal">What&apos;s your main goal? (optional)</Label>
                <Input
                  id="studyGoal"
                  value={data.studyGoal}
                  onChange={(e) => update({ studyGoal: e.target.value })}
                  placeholder="e.g., Pass my calculus final with an A"
                  maxLength={280}
                  disabled={pending}
                  aria-invalid={!!errors.studyGoal}
                />
                {errors.studyGoal && <FieldError>{errors.studyGoal}</FieldError>}
              </div>
            </div>
          </StepSection>
        )}

        {/* Step 2: Subjects */}
        {step === 2 && (
          <StepSection
            title="What subjects are you studying?"
            description="Add each subject, how hard it is, and how much it matters."
          >
            <div className="space-y-4">
              {data.subjects.length === 0 && (
                <EmptyState
                  icon={BookOpen}
                  title="No subjects yet"
                  description="Add your first subject to get started."
                />
              )}
              {data.subjects.map((subject, index) => (
                <Card key={subject.key} className="space-y-4 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted">
                          Subject {index + 1}
                        </span>
                        <Input
                          value={subject.name}
                          onChange={(e) =>
                            updateSubject(subject.key, { name: e.target.value })
                          }
                          placeholder="Subject name"
                          disabled={pending}
                          aria-invalid={!!errors.subjects}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <DifficultySlider
                          id={`difficulty-${subject.key}`}
                          value={subject.difficulty}
                          onChange={(v) => updateSubject(subject.key, { difficulty: v })}
                          disabled={pending}
                        />
                        <ImportanceSlider
                          id={`importance-${subject.key}`}
                          value={subject.importance}
                          onChange={(v) => updateSubject(subject.key, { importance: v })}
                          disabled={pending}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSubject(subject.key)}
                      disabled={pending || data.subjects.length === 1}
                      aria-label={`Remove ${subject.name || "this subject"}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </Card>
              ))}
              {errors.subjects && <StepError>{errors.subjects}</StepError>}
              <Button type="button" variant="secondary" onClick={addSubject} disabled={pending}>
                <Plus className="size-4 mr-2" aria-hidden="true" />
                Add Subject
              </Button>
            </div>
          </StepSection>
        )}

        {/* Step 3: Topics */}
        {step === 3 && (
          <StepSection
            title="Break each subject into topics"
            description="Topics are the individual units you'll study. Estimate how long each takes and how confident you feel."
          >
            <div className="space-y-6">
              {data.subjects.length === 0 && (
                <EmptyState
                  icon={BookOpen}
                  title="Add subjects first"
                  description="Go back to step 2 to add your subjects, then return here to add topics."
                />
              )}
              {data.subjects.map((subject) => (
                <Card key={subject.key} className="space-y-4 p-4">
                  <h3 className="font-medium">{subject.name}</h3>
                  {subject.topics.length === 0 && (
                    <EmptyState
                      icon={BookOpen}
                      title="No topics yet"
                      description={`Add topics for ${subject.name}`}
                    />
                  )}
                  {subject.topics.map((topic) => (
                    <div key={topic.key} className="space-y-3 p-3 border border-border rounded-field">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <Input
                            value={topic.name}
                            onChange={(e) =>
                              updateTopic(subject.key, topic.key, { name: e.target.value })
                            }
                            placeholder="Topic name"
                            disabled={pending}
                          />
                          <div className="grid gap-3 sm:grid-cols-3">
                            <DifficultySlider
                              id={`topic-difficulty-${topic.key}`}
                              value={topic.difficulty}
                              onChange={(v) =>
                                updateTopic(subject.key, topic.key, { difficulty: v })
                              }
                              disabled={pending}
                            />
                            <div className="space-y-1.5">
                              <Label htmlFor={`topic-minutes-${topic.key}`}>
                                Estimated minutes
                              </Label>
                              <Input
                                id={`topic-minutes-${topic.key}`}
                                type="number"
                                min={MIN_TOPIC_MINUTES}
                                max={MAX_TOPIC_MINUTES}
                                value={topic.estimatedMinutes}
                                onChange={(e) =>
                                  updateTopic(subject.key, topic.key, {
                                    estimatedMinutes: Number(e.target.value),
                                  })
                                }
                                disabled={pending}
                              />
                            </div>
                            <ConfidenceSlider
                              id={`topic-confidence-${topic.key}`}
                              value={topic.confidence}
                              onChange={(v) =>
                                updateTopic(subject.key, topic.key, { confidence: v })
                              }
                              disabled={pending}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeTopic(subject.key, topic.key)}
                          disabled={pending || subject.topics.length === 1}
                          aria-label={`Remove ${topic.name || "this topic"}`}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => addTopic(subject.key)}
                    disabled={pending}
                  >
                    <Plus className="size-4 mr-2" aria-hidden="true" />
                    Add Topic
                  </Button>
                </Card>
              ))}
              {errors.subjects && <StepError>{errors.subjects}</StepError>}
            </div>
          </StepSection>
        )}

        {/* Step 4: Exams */}
        {step === 4 && (
          <StepSection
            title="When are your exams?"
            description="Knowing your deadlines helps us prioritize what to study first."
          >
            <div className="space-y-4">
              {data.subjects.length === 0 && (
                <EmptyState
                  icon={BookOpen}
                  title="Add subjects first"
                  description="Go back to step 2 to add subjects, then return here to schedule exams."
                />
              )}
              {data.exams.map((exam) => (
                <Card key={exam.key} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor={`exam-subject-${exam.key}`}>Subject</Label>
                          <select
                            id={`exam-subject-${exam.key}`}
                            value={exam.subjectKey}
                            onChange={(e) =>
                              updateExam(exam.key, { subjectKey: e.target.value })
                            }
                            disabled={pending}
                            className="w-full rounded-field border border-border bg-surface px-3 py-2 text-sm"
                          >
                            {data.subjects.map((s) => (
                              <option key={s.key} value={s.key}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label htmlFor={`exam-title-${exam.key}`}>Title</Label>
                          <Input
                            id={`exam-title-${exam.key}`}
                            value={exam.title}
                            onChange={(e) =>
                              updateExam(exam.key, { title: e.target.value })
                            }
                            placeholder="e.g., Midterm 1"
                            disabled={pending}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`exam-date-${exam.key}`}>Date</Label>
                          <Input
                            id={`exam-date-${exam.key}`}
                            type="date"
                            value={exam.examDate}
                            onChange={(e) =>
                              updateExam(exam.key, { examDate: e.target.value })
                            }
                            disabled={pending}
                          />
                        </div>
                        <ImportanceSlider
                          id={`exam-importance-${exam.key}`}
                          value={exam.importance}
                          onChange={(v) => updateExam(exam.key, { importance: v })}
                          disabled={pending}
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExam(exam.key)}
                      disabled={pending || data.exams.length === 1}
                      aria-label={`Remove ${exam.title || "this exam"}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </Card>
              ))}
              {errors.exams && <StepError>{errors.exams}</StepError>}
              <Button type="button" variant="secondary" onClick={addExam} disabled={pending}>
                <Plus className="size-4 mr-2" aria-hidden="true" />
                Add Exam
              </Button>
            </div>
          </StepSection>
        )}

        {/* Step 5: Availability */}
        {step === 5 && (
          <StepSection
            title="When are you free to study?"
            description="Pick the days and time window you can consistently study."
          >
            <div className="space-y-6">
              <div>
                <Label>Available days</Label>
                <div className="flex flex-wrap gap-2 mt-2" role="group" aria-label="Study days">
                  {DAY_NAMES.map((day, index) => (
                    <DayChip
                      key={day}
                      day={index}
                      label={day}
                      selected={data.availability.days.includes(index)}
                      onToggle={toggleDay}
                      disabled={pending}
                    />
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="startTime">Start time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={data.availability.startTime}
                    onChange={(e) =>
                      update({ availability: { ...data.availability, startTime: e.target.value } })
                    }
                    disabled={pending}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={data.availability.endTime}
                    onChange={(e) =>
                      update({ availability: { ...data.availability, endTime: e.target.value } })
                    }
                    disabled={pending}
                  />
                </div>
                <div>
                  <Label htmlFor="maxMinutesPerDay">Max minutes per day</Label>
                  <Input
                    id="maxMinutesPerDay"
                    type="number"
                    min={15}
                    max={MAX_DAILY_MINUTES}
                    step={15}
                    value={data.availability.maxMinutesPerDay}
                    onChange={(e) =>
                      update({
                        availability: {
                          ...data.availability,
                          maxMinutesPerDay: Number(e.target.value),
                        },
                      })
                    }
                    disabled={pending}
                  />
                </div>
              </div>
              {errors.availability && <StepError>{errors.availability}</StepError>}
            </div>
          </StepSection>
        )}

        {/* Step 6: Energy */}
        {step === 6 && (
          <StepSection
            title="When do you have the most energy?"
            description="Drag each time period to the bucket that matches your typical energy. Hard topics go in high-energy slots."
          >
            <div className="space-y-6">
              {TIME_BLOCKS.map((block) => {
                const currentBucket = blockBucket(block.id);
                return (
                  <Card key={block.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{block.label}</p>
                        <p className="text-sm text-muted">
                          {block.startHour}:00–{block.endHour}:00
                        </p>
                      </div>
                      <div className="flex items-center gap-2" role="group" aria-label={`${block.label} energy level`}>
                        {(["high", "medium", "low"] as const).map((bucket) => (
                          <button
                            key={bucket}
                            type="button"
                            onClick={() => toggleEnergyBlock(block.id, bucket)}
                            disabled={pending}
                            aria-pressed={currentBucket === bucket}
                            className={cn(
                              "rounded-field border px-3 py-1.5 text-sm font-medium transition-colors",
                              currentBucket === bucket
                                ? bucket === "high"
                                  ? "border-danger bg-danger-soft text-danger"
                                  : bucket === "medium"
                                  ? "border-warning bg-warning-soft text-warning"
                                  : "border-success bg-success-soft text-success"
                                : "border-border bg-surface text-muted hover:bg-surface-muted"
                            )}
                          >
                            {bucket.charAt(0).toUpperCase() + bucket.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
              {errors.energy && <StepError>{errors.energy}</StepError>}
            </div>
          </StepSection>
        )}

        {/* Step 7: Review */}
        {step === 7 && (
          <StepSection
            title="Review your plan"
            description="Everything looks good? We'll create your personalized study schedule."
          >
            <div className="space-y-6">
              <Card className="p-4 space-y-2">
                <h3 className="font-medium">Profile</h3>
                <p className="text-sm text-muted">
                  {data.displayName || "—"} • {data.studyGoal || "No goal set"}
                </p>
              </Card>
              <Card className="p-4 space-y-2">
                <h3 className="font-medium">Subjects ({data.subjects.length})</h3>
                <ul className="text-sm text-muted space-y-1">
                  {data.subjects.map((s) => (
                    <li key={s.key}>
                      {s.name} (difficulty {s.difficulty}, importance {s.importance}) —{' '}
                      {s.topics.length} topics
                    </li>
                  ))}
                  {data.subjects.length === 0 && <li>No subjects</li>}
                </ul>
              </Card>
              <Card className="p-4 space-y-2">
                <h3 className="font-medium">Exams ({data.exams.length})</h3>
                <ul className="text-sm text-muted space-y-1">
                  {data.exams.map((e) => (
                    <li key={e.key}>
                      {e.title} — {e.examDate}
                    </li>
                  ))}
                  {data.exams.length === 0 && <li>No exams</li>}
                </ul>
              </Card>
              <Card className="p-4 space-y-2">
                <h3 className="font-medium">Availability</h3>
                <p className="text-sm text-muted">
                  {data.availability.days
                    .map((d) => DAY_NAMES[d])
                    .join(", ")} @ {data.availability.startTime}–{data.availability.endTime}
                  {' '}
                  ({data.availability.maxMinutesPerDay} min/day)
                </p>
              </Card>
              <Card className="p-4 space-y-2">
                <h3 className="font-medium">Energy</h3>
                <div className="text-sm text-muted space-y-1">
                  <p>
                    High: {data.energy.high.map((b) => TIME_BLOCKS.find((t) => t.id === b)?.label).join(", ") || "—"}
                  </p>
                  <p>
                    Medium: {data.energy.medium.map((b) => TIME_BLOCKS.find((t) => t.id === b)?.label).join(", ") || "—"}
                  </p>
                  <p>
                    Low: {data.energy.low.map((b) => TIME_BLOCKS.find((t) => t.id === b)?.label).join(", ") || "—"}
                  </p>
                </div>
              </Card>
            </div>
          </StepSection>
        )}

        <WizardFooter
          step={step}
          pending={pending}
          canContinue={canContinue}
          onBack={handleBack}
          onNext={handleNext}
          nextLabel={step >= 7 ? "Create my plan" : "Continue"}
          submitError={submitError}
        />
      </form>
    </div>
  );
}