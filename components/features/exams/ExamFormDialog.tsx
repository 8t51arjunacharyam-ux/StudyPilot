"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { type Subject } from "@/lib/data/subjects";
import { type ExamWithSubject } from "@/lib/data/exams";

interface ExamFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  initialData?: ExamWithSubject;
  onSubmit: (formData: FormData) => void;
  isLoading: boolean;
}

export function ExamFormDialog({
  isOpen,
  onClose,
  subjects,
  initialData,
  onSubmit,
  isLoading,
}: ExamFormDialogProps) {
  const isEditing = !!initialData;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <dialog
      id="exam-form-dialog"
      className="max-w-md w-full max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-overlay"
      onClose={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">{isEditing ? "Edit Exam" : "Add Exam"}</h3>
          <p className="text-sm text-muted">
            {isEditing ? "Update the exam details below." : "Enter the exam details below."}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-field p-1.5 text-muted hover:text-foreground hover:bg-surface-muted transition-colors"
          aria-label="Close dialog"
        >
          <X className="size-4" />
        </button>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)); }} className="mt-6 space-y-4">
        {isEditing && (
          <input type="hidden" name="id" value={initialData!.id} />
        )}

        <div className="space-y-1.5">
          <Label htmlFor="subject_id">Subject</Label>
          <select
            id="subject_id"
            name="subject_id"
            required
            disabled={isLoading}
            className="h-10 w-full rounded-field border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
            value={initialData?.subject_id ?? ""}
            onChange={() => {}}
          >
            <option value="">Select a subject</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id} selected={initialData?.subject_id === subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Exam Title</Label>
          <Input
            id="title"
            name="title"
            type="text"
            placeholder="e.g., Midterm 1, Final Exam"
            maxLength={160}
            required
            disabled={isLoading}
            defaultValue={initialData?.title}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exam_date">Exam Date & Time</Label>
          <Input
            id="exam_date"
            name="exam_date"
            type="datetime-local"
            required
            disabled={isLoading}
            defaultValue={initialData?.exam_date?.slice(0, 16)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="importance">Importance</Label>
          <select
            id="importance"
            name="importance"
            required
            disabled={isLoading}
            defaultValue={String(initialData?.importance ?? 3)}
            className="h-10 w-full rounded-field border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
          >
            <option value="1">1 - Minor</option>
            <option value="2">2 - Somewhat Important</option>
            <option value="3">3 - Important</option>
            <option value="4">4 - Very Important</option>
            <option value="5">5 - Critical</option>
          </select>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading} className="flex-1">
            {isLoading ? "Saving..." : isEditing ? "Update Exam" : "Create Exam"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}