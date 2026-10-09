"use client";

import { useState, useCallback } from "react";
import { z } from "zod";
import { type SubjectWithProgress } from "@/lib/data/subjects";

type SubjectFormMode = "create" | "edit";

interface SubjectFormSchema {
  name: string;
  color?: string;
  difficulty: number;
  importance: number;
}

/**
 * useSubjectForm — handles form state for subject CRUD operations
 *
 * Why a custom hook rather than inline form state:
 *   - Centralizes validation and default values
 *   - Separates create vs edit modes cleanly
 *   - Prevents re-renders in the dialog from leaking into the card list
 *   - Easy to reset/validate from anywhere
 */
export function useSubjectForm(
  initialSubject?: SubjectWithProgress | null
) {
  const [mode, setMode] = useState<SubjectFormMode>(
    initialSubject ? "edit" : "create"
  );
  const [values, setValues] = useState<SubjectFormSchema>({
    name: initialSubject?.name ?? "",
    color: initialSubject?.color,
    difficulty: initialSubject?.difficulty ?? 3,
    importance: initialSubject?.importance ?? 3,
  });
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const reset = useCallback(() => {
    setMode(initialSubject ? "edit" : "create");
    setValues({
      name: initialSubject?.name ?? "",
      color: initialSubject?.color,
      difficulty: initialSubject?.difficulty ?? 3,
      importance: initialSubject?.importance ?? 3,
    });
    setError(null);
    setIsSaving(false);
  }, [initialSubject]);

  const save = useCallback(async (): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    try {
      // Validate
      const schema = z.object({
        name: z.string().min(1, "Subject name is required").max(120, "Subject name must be 120 characters or less"),
        color: z.string().optional(),
        difficulty: z.number().min(1, "Difficulty must be at least 1").max(10, "Difficulty must be at most 10"),
        importance: z.number().min(1, "Importance must be at least 1").max(5, "Importance must be at most 5"),
      });

      const parsed = schema.safeParse(values);
      if (!parsed.success) {
        setError(parsed.error.errors[0].message);
        setIsSaving(false);
        return false;
      }

      if (mode === "create") {
        // Will be called from parent with createSubjectAction
        return true;
      } else {
        // Will be called from parent with updateSubjectAction
        return true;
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setIsSaving(false);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [mode, values]);

  const setValue = useCallback((key: keyof SubjectFormSchema, value: unknown) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  return {
    mode,
    setMode,
    values,
    error,
    isSaving,
    reset,
    save,
    setValue,
  };
}