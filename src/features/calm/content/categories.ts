import type { CalmSupportCategory } from "./types";

export const CALM_SUPPORT_CATEGORIES = [
  {
    id: "quick-reset",
    title: "I need a quick reset",
    description: "Take a short, gentle pause without needing to change where you are.",
    exerciseSlug: "one-minute-breathing-reset",
  },
  {
    id: "overwhelmed",
    title: "I feel overwhelmed",
    description: "Use your surroundings to find one small point of focus.",
    exerciseSlug: "five-senses-grounding",
  },
  {
    id: "tonight-is-hard",
    title: "Tonight feels hard",
    description: "Read a few quiet words without needing to fix the whole night.",
    exerciseSlug: "tonight-is-hard-reassurance",
  },
  {
    id: "settle-my-body",
    title: "I want to settle my body",
    description: "Notice your breath gently, with no need to force or count it.",
    exerciseSlug: "one-minute-breathing-reset",
  },
  {
    id: "back-to-now",
    title: "I need to come back to now",
    description: "Move through a no-rush check-in with what is around you.",
    exerciseSlug: "five-senses-grounding",
  },
  {
    id: "gentle-reassurance",
    title: "I need gentle reassurance",
    description: "Stay with a supportive line, revisit it, or leave whenever you like.",
    exerciseSlug: "tonight-is-hard-reassurance",
  },
] as const satisfies readonly CalmSupportCategory[];
