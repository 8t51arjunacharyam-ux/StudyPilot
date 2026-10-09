"use client";

import { useState, useTransition } from "react";
import { Plus, CalendarRange, CalendarDays, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { SessionCard } from "./SessionCard";
import { SessionFormDialog } from "./SessionFormDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import {
  createStudySessionAction,
  startStudySessionAction,
  completeStudySessionAction,
  skipStudySessionAction,
  rescheduleStudySessionAction,
  deleteStudySessionAction,
  cancelStudySessionAction,
} from "@/lib/actions/study_sessions";
import { type StudySessionWithDetails } from "@/lib/data/study_sessions";
import { type Subject } from "@/lib/data/subjects";
import { type Topic } from "@/lib/data/topics";

export function PlannerList({
  initialSessions,
  initialSubjects,
  initialTopics,
}: {
  initialSessions: StudySessionWithDetails[];
  initialSubjects: Subject[];
  initialTopics: Topic[];
}) {
  const [sessions, setSessions] = useState<StudySessionWithDetails[]>(initialSessions);
  const [subjects] = useState<Subject[]>(initialSubjects);
  const [topics] = useState<Topic[]>(initialTopics);
  const [isLoading, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"today" | "upcoming" | "missed">("today");

  async function handleCreateSession(formData: FormData) {
    const topic_id = formData.get("topic_id") as string;
    const scheduled_start = formData.get("scheduled_start") as string;
    const scheduled_end = formData.get("scheduled_end") as string;
    const planned_minutes = parseInt(formData.get("planned_minutes") as string, 10);

    setError(null);
    startTransition(async () => {
      const result = await createStudySessionAction({ topic_id, scheduled_start, scheduled_end, planned_minutes });
      if (!result.ok) {
        setError(result.error);
      } else {
        setShowCreateDialog(false);
        window.location.reload();
      }
    });
  }

  async function handleStartSession(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await startStudySessionAction(id);
      if (!result.ok) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  async function handleCompleteSession(id: string, actualMinutes: number) {
    setError(null);
    startTransition(async () => {
      const result = await completeStudySessionAction({
        id,
        actual_minutes: actualMinutes,
      });
      if (!result.ok) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  async function handleSkipSession(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await skipStudySessionAction(id);
      if (!result.ok) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  async function handleRescheduleSession(id: string, newStart: string, newEnd: string) {
    setError(null);
    startTransition(async () => {
      const result = await rescheduleStudySessionAction(id, newStart, newEnd);
      if (!result.ok) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  async function handleDeleteSession(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteStudySessionAction(id);
      if (!result.ok) {
        setError(result.error);
      } else {
        setSessions((prev) => prev.filter((s) => s.id !== id));
      }
    });
  }

  async function handleCancelSession(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await cancelStudySessionAction(id);
      if (!result.ok) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    });
  }

  const todaySessions = sessions.filter((s) => {
    const sessionDate = new Date(s.scheduled_start).toDateString();
    const today = new Date().toDateString();
    return sessionDate === today;
  });

  const upcomingSessions = sessions.filter((s) => {
    const sessionDate = new Date(s.scheduled_start);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const future = new Date(today);
    future.setDate(future.getDate() + 7);
    return sessionDate > today && sessionDate <= future && ["planned", "in_progress"].includes(s.status);
  });

  const missedSessions = sessions.filter((s) => {
    const sessionDate = new Date(s.scheduled_end);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sessionDate < today && ["planned", "skipped", "cancelled"].includes(s.status);
  });

  const getSessionsForTab = () => {
    switch (activeTab) {
      case "today":
        return todaySessions;
      case "upcoming":
        return upcomingSessions;
      case "missed":
        return missedSessions;
      default:
        return todaySessions;
    }
  };

  const currentSessions = getSessionsForTab();

  return (
    <div className="space-y-6">
      {error && (
        <ErrorState title="Error" message={error} onRetry={() => setError(null)} />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Study Sessions</h2>
        <Button
          variant="primary"
          onClick={() => setShowCreateDialog(true)}
          disabled={topics.length === 0}
        >
          <Plus className="size-4 mr-2" aria-hidden="true" />
          Add Session
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab as (value: string) => void}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today">
            <CalendarDays className="size-4 mr-2" aria-hidden="true" />
            Today ({todaySessions.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            <CalendarRange className="size-4 mr-2" aria-hidden="true" />
            This Week ({upcomingSessions.length})
          </TabsTrigger>
          <TabsTrigger value="missed">
            <AlertTriangle className="size-4 mr-2" aria-hidden="true" />
            Missed ({missedSessions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4">
          {currentSessions.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title={todaySessions.length === 0 ? "No sessions today" : "No upcoming sessions" }
              description={
                todaySessions.length === 0
                  ? "Add a study session for today or check the upcoming tab."
                  : "Schedule sessions for the next 7 days to see them here."
              }
            />
          ) : (
            <div className="space-y-4">
              {currentSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onStart={handleStartSession}
                  onComplete={handleCompleteSession}
                  onSkip={handleSkipSession}
                  onReschedule={handleRescheduleSession}
                  onDelete={handleDeleteSession}
                  onCancel={handleCancelSession}
                  isLoading={isLoading}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="mt-4">
          {currentSessions.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="No upcoming sessions"
              description="Schedule sessions for the next 7 days to see them here."
            />
          ) : (
            <div className="space-y-4">
              {currentSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onStart={handleStartSession}
                  onComplete={handleCompleteSession}
                  onSkip={handleSkipSession}
                  onReschedule={handleRescheduleSession}
                  onDelete={handleDeleteSession}
                  onCancel={handleCancelSession}
                  isLoading={isLoading}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="missed" className="mt-4">
          {currentSessions.length === 0 ? (
            <EmptyState
              icon={AlertTriangle}
              title="No missed sessions"
              description="Great job staying on track! Missed sessions will appear here."
            />
          ) : (
            <div className="space-y-4">
              {currentSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onStart={handleStartSession}
                  onComplete={handleCompleteSession}
                  onSkip={handleSkipSession}
                  onReschedule={handleRescheduleSession}
                  onDelete={handleDeleteSession}
                  onCancel={handleCancelSession}
                  isLoading={isLoading}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <SessionFormDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        subjects={subjects}
        topics={topics}
        onSubmit={handleCreateSession}
        isLoading={isLoading}
      />
    </div>
  );
}