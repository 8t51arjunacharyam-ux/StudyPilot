"use client";

import { useState, useTransition } from "react";
import { Plus, BookOpen, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SubjectCard } from "./SubjectCard";
import { type SubjectWithProgress } from "@/lib/data/subjects";
import {
  createSubjectAction,
  updateSubjectAction,
  deleteSubjectAction,
  archiveSubjectAction,
  unarchiveSubjectAction,
} from "@/lib/actions/subjects";

export function SubjectList({
  initialSubjects,
}: {
  initialSubjects: SubjectWithProgress[];
}) {
  const [subjects, setSubjects] = useState<SubjectWithProgress[]>(initialSubjects);
  const [isLoading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleCreateSubject() {
    setError(null);
    startTransition(async () => {
      const result = await createSubjectAction({
        name: "",
        color: "#4f46e5",
        difficulty: 3,
        importance: 3,
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  async function handleEditSubject(subject: SubjectWithProgress) {
    // Trigger reload with updated data - form dialog handles the edit
    window.location.reload();
  }

  async function handleDeleteSubject(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteSubjectAction(id);
      if (!result.ok) {
        setError(result.error);
      }
    });
  }

  async function handleArchiveSubject(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await archiveSubjectAction(id);
      if (!result.ok) {
        setError(result.error);
      } else {
        setSubjects((prev) => prev.filter((s) => s.id !== id));
      }
    });
  }

  async function handleUnarchiveSubject(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await unarchiveSubjectAction(id);
      if (!result.ok) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  if (subjects.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No subjects yet"
        description="Add your first subject to start building your study plan."
        action={
          <Button
            variant="primary"
            onClick={() => handleCreateSubject()}
          >
            <Plus className="size-4 mr-2" aria-hidden="true" />
            Add Subject
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {error && <ErrorState title="Error" message={error} onRetry={() => setError(null)} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <SubjectCard
            key={subject.id}
            subject={subject}
            onArchive={handleArchiveSubject}
            onUnarchive={handleUnarchiveSubject}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}