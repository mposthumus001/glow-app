export type CalmExerciseType = "breathing" | "grounding" | "reassurance";

export type CalmExerciseSlug =
  | "one-minute-breathing-reset"
  | "five-senses-grounding"
  | "tonight-is-hard-reassurance";

export type CalmSupportCategoryId =
  | "quick-reset"
  | "overwhelmed"
  | "tonight-is-hard"
  | "settle-my-body"
  | "back-to-now"
  | "gentle-reassurance";

export type CalmExerciseStep = {
  id: string;
  text: string;
};

export type CalmExercise = {
  slug: CalmExerciseSlug;
  title: string;
  summary: string;
  steps: readonly CalmExerciseStep[];
  completion: string;
  safetyNote: string;
  durationLabel: string;
  exerciseType: CalmExerciseType;
  supportsPause: boolean;
  supportsSkip: boolean;
  lowLightRecommended: boolean;
  version: number;
  enabled: boolean;
};

export type CalmSupportCategory = {
  id: CalmSupportCategoryId;
  title: string;
  description: string;
  exerciseSlug: CalmExerciseSlug;
};
