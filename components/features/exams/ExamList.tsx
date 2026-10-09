"use client";

import { useState, useTransition } from "react";
import { Plus, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { ExamCard } from "./ExamCard";
import { ExamFormDialog } from "./ExamFormDialog";
import {
  createExamAction,
  updateExamAction,
  deleteExamAction,
} from "@/lib/actions/exams";
import { type ExamWithSubject } from "@/lib/data/exams";
import { type Subject } from "@/lib/data/subjects";

export function ExamList({
  initialExams,
  initialSubjects,
}: {
  initialExams: ExamWithSubject[];
  initialSubjects: Subject[];
}) {
  const [exams, setExams] = useState<ExamWithSubject[]>(initialExams);
  const [subjects] = useState<Subject[]>(initialSubjects);
  const [isLoading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingExam, setEditingExam] = useState<ExamWithSubject | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  async function handleCreateExam(formData: FormData) {
    const subject_id = formData.get("subject_id") as string;
    const title = formData.get("title") as string;
    const exam_date = formData.get("exam_date") as string;
    const importance = parseInt(formData.get("importance") as string, 10);

    setError(null);
    startTransition(async () => {
      const result = await createExamAction({ subject_id, title, exam_date, importance });
      if (!result.ok) {
        setError(result.error);
      } else {
        setShowCreateDialog(false);
        window.location.reload();
      }
    });
  }

  async function handleUpdateExam(formData: FormData) {
    const id = formData.get("id") as string;
    const subject_id = formData.get("subject_id") as string;
    const title = formData.get("title") as string;
    const exam_date = formData.get("exam_date") as string;
    const importance = parseInt(formData.get("importance") as string, 10);

    setError(null);
    startTransition(async () => {
      const result = await updateExamAction({ id, subject_id, title, exam_date, importance });
      if (!result.ok) {
        setError(result.error);
      } else {
        setEditingExam(null);
        window.location.reload();
      }
    });
  }

  async function handleDeleteExam(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteExamAction(id);
      if (!result.ok) {
        setError(result.error);
      } else {
        setExams((prev) => prev.filter((e) => e.id !== id));
      }
    });
  }

  function handleEditClick(exam: ExamWithSubject) {
    setEditingExam(exam);
  }

  return (
    <div className="space-y-6">
      {error && (
        <ErrorState title="Error" message={error} onRetry={() => setError(null)} />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Your Exams</h2>
        <Button
          variant="primary"
          onClick={() => setShowCreateDialog(true)}
          disabled={subjects.length === 0}
        >
          <Plus className="size-4 mr-2" aria-hidden="true" />
          Add Exam
        </Button>
      </div>

      {exams.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={subjects.length === 0 ? "Add subjects first" : "No exams yet"}
          description={
            subjects.length === 0
              ? "Create subjects in the Subjects page, then return here to add exams."
              : "Add your first exam to start tracking deadlines and risk."
          }
          action={
            subjects.length > 0 && (
              <Button variant="primary" onClick={() => setShowCreateDialog(true)}>
                <Plus className="size-4 mr-2" aria-hidden="true" />
                Add Exam
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              onEdit={handleEditClick}
              onDelete={handleDeleteExam}
              isLoading={isLoading}
            />
          ))}
        </div>
      )}

      <ExamFormDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        subjects={subjects}
        onSubmit={handleCreateExam}
        isLoading={isLoading}
      />

      <ExamFormDialog
        isOpen={!!editingExam}
        onClose={() => setEditingExam(null)}
        subjects={subjects}
        initialData={editingExam ?? undefined}
        onSubmit={handleUpdateExam}
        isLoading={isLoading}
      />
    </div>
  );
}