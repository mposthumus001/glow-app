"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { GlowContainer } from "@/components/layout";
import { GlowCard } from "@/components/ui";
import { useGlowReducedMotion } from "@/lib/hooks/useGlowReducedMotion";
import { cn } from "@/lib/utils/cn";

import type { CalmExercise } from "../content/types";

export function CalmExerciseScreen({ exercise }: { exercise: CalmExercise }) {
  const reducedMotion = useGlowReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(60);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const instructionRef = useRef<HTMLHeadingElement>(null);
  const completionRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!timerRunning) return;
    const timer = window.setInterval(() => {
      setTimerRemaining((remaining) => {
        if (remaining <= 1) {
          window.clearInterval(timer);
          setTimerRunning(false);
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [timerRunning]);

  useEffect(() => {
    if (finished) completionRef.current?.focus({ preventScroll: true });
  }, [finished]);

  function moveToStep(nextIndex: number) {
    const bounded = Math.max(0, Math.min(nextIndex, exercise.steps.length - 1));
    setStepIndex(bounded);
    window.requestAnimationFrame(() => {
      instructionRef.current?.focus({ preventScroll: true });
    });
  }

  if (finished) {
    return (
      <ExerciseFrame exercise={exercise}>
        <GlowCard padding="lg" className="border-glow-primary/20">
          <h2
            ref={completionRef}
            tabIndex={-1}
            className="text-xl font-semibold text-glow-text outline-none"
          >
            You can finish here
          </h2>
          <p className="mt-4 text-base leading-relaxed text-glow-text-secondary">
            {exercise.completion}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                setFinished(false);
                window.requestAnimationFrame(() => instructionRef.current?.focus());
              }}
            >
              Return to the exercise
            </button>
            <Link href="/calm/support" className={primaryButtonClass}>
              Return to Support
            </Link>
          </div>
        </GlowCard>
      </ExerciseFrame>
    );
  }

  return (
    <ExerciseFrame exercise={exercise}>
      {exercise.exerciseType === "reassurance" ? (
        <ReassuranceExercise exercise={exercise} onFinish={() => setFinished(true)} />
      ) : (
        <GlowCard
          padding="lg"
          className={cn(
            "overflow-hidden border-glow-primary/15",
            exercise.exerciseType === "breathing" &&
              "bg-gradient-to-br from-glow-primary/[0.09] to-glow-card",
          )}
        >
          <div className="flex items-center justify-between gap-3 text-xs text-glow-text-tertiary">
            <span>
              Step {stepIndex + 1} of {exercise.steps.length}
            </span>
            {exercise.exerciseType === "breathing" && timerStarted ? (
              <span aria-live="polite">
                Optional timer: {formatTimer(timerRemaining)}
              </span>
            ) : null}
          </div>

          {exercise.exerciseType === "breathing" ? (
            <div
              className={cn(
                "mx-auto my-8 h-24 w-24 rounded-full border border-glow-primary/25 bg-glow-primary/[0.08]",
                !reducedMotion && timerRunning && "animate-pulse",
              )}
              aria-hidden="true"
            />
          ) : (
            <div className="h-8" />
          )}

          <p className="sr-only" aria-live="polite" aria-atomic="true">
            Step {stepIndex + 1}: {exercise.steps[stepIndex].text}
          </p>
          <h2
            ref={instructionRef}
            tabIndex={-1}
            className="text-xl leading-relaxed font-medium text-glow-text outline-none"
          >
            {exercise.steps[stepIndex].text}
          </h2>

          {exercise.exerciseType === "breathing" ? (
            <div className="mt-6">
              {!timerStarted ? (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => {
                    setTimerStarted(true);
                    setTimerRunning(true);
                  }}
                >
                  <Play className="h-4 w-4" aria-hidden="true" />
                  Start optional one-minute timer
                </button>
              ) : timerRemaining > 0 ? (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => setTimerRunning((running) => !running)}
                >
                  {timerRunning ? (
                    <Pause className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Play className="h-4 w-4" aria-hidden="true" />
                  )}
                  {timerRunning ? "Pause timer" : "Continue timer"}
                </button>
              ) : (
                <p className="text-sm text-glow-text-secondary">
                  The optional minute has ended. Continue whenever you are ready.
                </p>
              )}
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {stepIndex > 0 ? (
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => moveToStep(stepIndex - 1)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Previous
              </button>
            ) : null}
            {stepIndex < exercise.steps.length - 1 ? (
              <>
                <button
                  type="button"
                  className={primaryButtonClass}
                  onClick={() => moveToStep(stepIndex + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
                {exercise.supportsSkip ? (
                  <button
                    type="button"
                    className={quietButtonClass}
                    onClick={() => moveToStep(stepIndex + 1)}
                  >
                    Skip this step
                  </button>
                ) : null}
              </>
            ) : (
              <button
                type="button"
                className={primaryButtonClass}
                onClick={() => setFinished(true)}
              >
                Finish
              </button>
            )}
          </div>
          <button
            type="button"
            className={cn(quietButtonClass, "mt-4")}
            onClick={() => setFinished(true)}
          >
            Finish early
          </button>
        </GlowCard>
      )}

      <p className="mt-5 text-sm leading-relaxed text-glow-text-secondary">
        {exercise.safetyNote}
      </p>
    </ExerciseFrame>
  );
}

function ExerciseFrame({
  exercise,
  children,
}: {
  exercise: CalmExercise;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("overflow-y-auto", exercise.lowLightRecommended && "bg-black/[0.08]")}>
      <GlowContainer size="sm" as="div" className="pb-10 pt-6">
        <Link
          href="/calm/support"
          className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-glow-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Support
        </Link>
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-glow-text">
            {exercise.title}
          </h1>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-glow-text-secondary">
            {exercise.summary}
          </p>
          <p className="mt-2 text-xs text-glow-text-tertiary">{exercise.durationLabel}</p>
        </header>
        {children}
      </GlowContainer>
    </div>
  );
}

function ReassuranceExercise({
  exercise,
  onFinish,
}: {
  exercise: CalmExercise;
  onFinish: () => void;
}) {
  return (
    <GlowCard padding="lg" className="border-glow-secondary/15 bg-black/[0.08]">
      <h2 className="sr-only">Reassurance</h2>
      <ol className="space-y-7">
        {exercise.steps.map((step) => (
          <li key={step.id} className="text-lg leading-relaxed text-glow-text">
            {step.text}
          </li>
        ))}
      </ol>
      <button type="button" className={cn(primaryButtonClass, "mt-9")} onClick={onFinish}>
        Finish here
      </button>
      <button type="button" className={cn(quietButtonClass, "mt-4 block")} onClick={onFinish}>
        Finish early
      </button>
    </GlowCard>
  );
}

function formatTimer(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

const primaryButtonClass = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-glow-button px-4",
  "bg-glow-primary/20 text-sm font-semibold text-glow-primary-light",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
);

const secondaryButtonClass = cn(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-glow-button border px-4",
  "border-glow-card-border bg-white/[0.04] text-sm font-medium text-glow-text",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
);

const quietButtonClass = cn(
  "inline-flex min-h-11 items-center text-sm font-medium text-glow-text-secondary underline-offset-2 hover:underline",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
);
