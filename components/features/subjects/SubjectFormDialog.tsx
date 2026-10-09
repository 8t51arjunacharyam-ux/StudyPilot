"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input, Label } from "@/components/ui/Field";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { createSubjectAction, updateSubjectAction } from "@/lib/actions/subjects";
import { type SubjectWithProgress } from "@/lib/data/subjects";

interface SubjectFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: SubjectWithProgress | null;
  onSubmit: (data: { name: string; color?: string; difficulty: number; importance: number }) => void;
  isLoading: boolean;
}

function SubjectFormDialog({ isOpen, onClose, initialData, onSubmit, isLoading }: SubjectFormDialogProps) {
  if (!isOpen) return null;

  const form = useForm({
    resolver: zodResolver(z.object({
      name: z.string().min(1, "Subject name is required").max(120, "Subject name must be 120 characters or less"),
      color: z.string().optional(),
      difficulty: z.number().min(1, "Difficulty must be at least 1").max(10, "Difficulty must be at most 10"),
      importance: z.number().min(1, "Importance must be at least 1").max(5, "Importance must be at most 5"),
    })),
    defaultValues: {
      name: initialData?.name ?? "",
      color: initialData?.color,
      difficulty: initialData?.difficulty ?? 3,
      importance: initialData?.importance ?? 3,
    },
  });

  return (
    <dialog
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        className="w-full max-w-md bg-background rounded-xl border border-border p-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const data = form.getValues();
          onSubmit(data);
        }}
      >
        <input type="hidden" name="id" defaultValue={initialData?.id ?? ""} />

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {initialData ? "Edit Subject" : "Add Subject"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-3">
          <Label htmlFor="name">Subject name</Label>
          <Input
            id="name"
            name="name"
            {...form.getInputState("name")}
            defaultValue={initialData?.name ?? ""}
            placeholder="e.g., Calculus"
            required
            maxLength={120}
            disabled={isLoading}
          />

          <div className="grid gap-2 sm:grid-cols-3">
            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                name="color"
                type="color"
                defaultValue={initialData?.color ?? "#4f46e5"}
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="difficulty">Difficulty (1-10)</Label>
              <Input
                id="difficulty"
                name="difficulty"
                type="number"
                min={1}
                max={10}
                {...form.getInputState("difficulty")}
                defaultValue={initialData?.difficulty ?? 3}
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="importance">Importance (1-5)</Label>
              <Input
                id="importance"
                name="importance"
                type="number"
                min={1}
                max={5}
                {...form.getInputState("importance")}
                defaultValue={initialData?.importance ?? 3}
                required
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? "Saving..." : initialData ? "Save changes" : "Add subject"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}

export { SubjectFormDialog };