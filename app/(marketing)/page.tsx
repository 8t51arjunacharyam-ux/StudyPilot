import type { Metadata } from "next";
import {
  LifeBuoy,
  Zap,
  Radar,
  Gauge,
  Crosshair,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "StudyPilot — Your study plan adapts to you",
};

const FEATURES = [
  {
    icon: LifeBuoy,
    title: "Plan Rescue",
    description:
      "Miss a session and the unfinished work is recalculated and redistributed across the time you actually have left — without piling it all onto one day.",
  },
  {
    icon: Zap,
    title: "BrainFit Scheduler",
    description:
      "Tell StudyPilot when you focus best. Hard subjects get placed in your high-energy hours; lighter review work fills the quieter ones.",
  },
  {
    icon: Radar,
    title: "Memory Radar",
    description:
      "Every topic is tracked for confidence and revision history, so StudyPilot can flag material you are about to forget before you lose it.",
  },
  {
    icon: Gauge,
    title: "Difficulty Debt",
    description:
      "StudyPilot weighs difficulty, exam urgency, remaining workload and confidence to show exactly which subjects are quietly slipping.",
  },
  {
    icon: Crosshair,
    title: "Study Now",
    description:
      "One clear answer to 'what should I do right now?' — the single most useful session for this moment, and the reason it was chosen.",
  },
];

const STEPS = [
  { step: "01", title: "Add your subjects", body: "List your subjects and the topics inside them." },
  { step: "02", title: "Add your exams", body: "Give StudyPilot the dates so it can weigh urgency." },
  { step: "03", title: "Set your real availability", body: "Tell it when you are free and when you focus best." },
  { step: "04", title: "Follow the plan as it adapts", body: "Study Now and Plan Rescue adjust as your reality changes." },
];

export default function LandingPage() {
  return (
    <main>
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden">
        {/* Decorative background wash; hidden from assistive tech. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,var(--primary-soft),transparent)]"
        />

        <Container size="wide">
          <div className="flex flex-col items-center gap-7 py-20 text-center sm:py-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted shadow-card">
              <Sparkles className="size-3.5 text-primary" aria-hidden="true" />
              Adaptive study planning
            </span>

            <h1 className="max-w-4xl text-4xl font-bold tracking-tight text-balance sm:text-6xl">
              StudyPilot
            </h1>

            <p className="max-w-2xl text-xl font-medium text-balance sm:text-2xl">
              Your study plan adapts to you.
            </p>

            <p className="max-w-2xl text-base leading-relaxed text-pretty text-muted">
              Most planners assume you follow the plan. StudyPilot does not. It
              continuously adjusts your study recommendations according to your
              real progress, the difficulty of each topic, how well you are
              remembering it, and the time you actually have available.
            </p>

            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/register" size="lg">
                Build My Study Plan
                <ArrowRight className="size-4" aria-hidden="true" />
              </ButtonLink>
              <ButtonLink href="#features" variant="secondary" size="lg">
                See How It Works
              </ButtonLink>
            </div>

            <p className="text-xs text-subtle">
              Free while in development · No card required
            </p>
          </div>
        </Container>
      </section>

      {/* ---------------- Features ---------------- */}
      <section id="features" className="scroll-mt-20 border-t border-border bg-surface">
        <Container size="wide">
          <div className="py-20 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Built around how you actually study
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Five capabilities that work together to keep your plan honest
                about your real progress.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <Card key={feature.title} interactive className="p-6">
                  <div className="flex size-10 items-center justify-center rounded-field bg-primary-soft">
                    <feature.icon className="size-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ---------------- How it works ---------------- */}
      <section id="how-it-works" className="scroll-mt-20 border-t border-border">
        <Container size="wide">
          <div className="py-20 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                How it works
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted">
                Four steps to a plan that keeps correcting itself.
              </p>
            </div>

            <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((item) => (
                <li key={item.step}>
                  <div className="flex h-full flex-col gap-2 rounded-card border border-border bg-surface p-6 shadow-card">
                    <span className="text-xs font-bold tracking-widest text-primary">
                      {item.step}
                    </span>
                    <h3 className="text-sm font-semibold">{item.title}</h3>
                    <p className="text-sm leading-relaxed text-muted">{item.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </Container>
      </section>

      {/* ---------------- Closing CTA ---------------- */}
      <section className="border-t border-border bg-surface-muted">
        <Container size="wide">
          <div className="flex flex-col items-center gap-5 py-20 text-center">
            <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-balance">
              Stop planning. Start adapting.
            </h2>
            <p className="max-w-xl text-base leading-relaxed text-muted">
              Create a study plan that reflects what you are actually getting
              done — not what you hoped you would.
            </p>
            <ButtonLink href="/register" size="lg" className="mt-1">
              Build My Study Plan
              <ArrowRight className="size-4" aria-hidden="true" />
            </ButtonLink>
          </div>
        </Container>
      </section>
    </main>
  );
}