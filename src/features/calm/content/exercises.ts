import type { CalmExercise, CalmExerciseSlug } from "./types";

export const CALM_EXERCISES = [
  {
    slug: "one-minute-breathing-reset",
    title: "One-minute breathing reset",
    summary:
      "A short, gentle pause with your breath. You can do this in the position you are already in.",
    steps: [
      {
        id: "stay-where-you-are",
        text: "Let yourself stay exactly where you are. There is nothing you need to arrange first.",
      },
      {
        id: "notice-your-breath",
        text: "Notice your breath as it is. You do not need to make it deeper or slower.",
      },
      {
        id: "breathe-in-gently",
        text: "When you are ready, breathe in gently. If counting helps, count to three. If it does not, leave the counting out.",
      },
      {
        id: "let-the-breath-out",
        text: "Let the breath out without forcing it. You might count to four, or simply notice it leaving.",
      },
      {
        id: "another-easy-breath",
        text: "Take another easy breath in, then let it go. Continue only for as long as this feels useful.",
      },
      {
        id: "notice-support",
        text: "Notice one place where your body is supported — the floor, a chair, a bed, or the wall behind you.",
      },
    ],
    completion:
      "That is enough for now. You can repeat a step, stay still for a moment, or return to Glow.",
    safetyNote:
      "If focusing on your breath feels uncomfortable, stop and choose another support option.",
    durationLabel: "About 1 minute",
    exerciseType: "breathing",
    supportsPause: true,
    supportsSkip: true,
    lowLightRecommended: false,
    version: 1,
    enabled: true,
  },
  {
    slug: "five-senses-grounding",
    title: "Five-senses grounding",
    summary:
      "A no-rush way to notice what is around you. Skip any sense that does not fit.",
    steps: [
      {
        id: "see",
        text: "Look around and name up to five things you can see. One is enough if that is all you want to do.",
      },
      {
        id: "feel",
        text: "Notice up to four things you can feel — clothing, a surface, the air, or the weight of something you are holding.",
      },
      {
        id: "hear",
        text: "Listen for up to three sounds. They can be close by or further away.",
      },
      {
        id: "smell",
        text: "Notice up to two scents, or simply notice that no scent stands out.",
      },
      {
        id: "taste",
        text: "Notice one taste, or the feeling inside your mouth. You may skip this.",
      },
      {
        id: "notice-again",
        text: "Choose one thing around you to notice again. There is nothing else you need to complete.",
      },
    ],
    completion: "You can finish here, revisit any step, or move on with your night.",
    safetyNote:
      "Keep your attention on your surroundings and anything that needs your care. Skip any prompt that does not fit where you are.",
    durationLabel: "2–3 minutes",
    exerciseType: "grounding",
    supportsPause: false,
    supportsSkip: true,
    lowLightRecommended: false,
    version: 1,
    enabled: true,
  },
  {
    slug: "tonight-is-hard-reassurance",
    title: "Tonight is hard reassurance",
    summary:
      "A few quiet words for a difficult stretch of the night. Read only what feels useful.",
    steps: [
      {
        id: "this-moment-is-hard",
        text: "This moment is hard. You do not have to make it feel meaningful.",
      },
      {
        id: "care-and-wish",
        text: "You can care deeply and still wish this part were easier.",
      },
      {
        id: "does-not-define-you",
        text: "One difficult stretch does not define you or your family.",
      },
      {
        id: "one-small-moment",
        text: "There is no need to solve the whole night right now. You can take it one small moment at a time.",
      },
      {
        id: "ask-for-help",
        text: "If practical help from someone you trust is available, it is okay to ask for it.",
      },
      {
        id: "leave-when-you-like",
        text: "You may stay with these words, return to an earlier line, or leave whenever you like.",
      },
    ],
    completion:
      "There is nothing to complete here. Glow will still be here when you return.",
    safetyNote:
      "Glow offers general wellbeing support and is not a substitute for professional or emergency care.",
    durationLabel: "Read at your own pace",
    exerciseType: "reassurance",
    supportsPause: false,
    supportsSkip: false,
    lowLightRecommended: true,
    version: 1,
    enabled: true,
  },
] as const satisfies readonly CalmExercise[];

const EXERCISE_BY_SLUG = new Map(
  CALM_EXERCISES.map((exercise) => [exercise.slug, exercise]),
);

export function getCalmExercise(
  slug: string,
): (typeof CALM_EXERCISES)[number] | null {
  return EXERCISE_BY_SLUG.get(slug as CalmExerciseSlug) ?? null;
}

export function isCalmExerciseSlug(slug: string): slug is CalmExerciseSlug {
  return EXERCISE_BY_SLUG.has(slug as CalmExerciseSlug);
}
