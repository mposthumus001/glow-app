import { CALM_SUPPORT_CATEGORIES } from "./categories.ts";
import { CALM_EXERCISES } from "./exercises.ts";
import type { CalmExercise, CalmSupportCategory } from "./types";

export function validateCalmContent(
  exercises: readonly CalmExercise[] = CALM_EXERCISES,
  categories: readonly CalmSupportCategory[] = CALM_SUPPORT_CATEGORIES,
): string[] {
  const errors: string[] = [];
  const slugs = new Set<string>();

  for (const exercise of exercises) {
    if (slugs.has(exercise.slug)) errors.push(`Duplicate exercise slug: ${exercise.slug}`);
    slugs.add(exercise.slug);

    if (!exercise.title.trim()) errors.push(`Exercise ${exercise.slug} has no title`);
    if (!exercise.summary.trim()) errors.push(`Exercise ${exercise.slug} has no summary`);
    if (!exercise.completion.trim()) {
      errors.push(`Exercise ${exercise.slug} has no completion copy`);
    }
    if (!exercise.safetyNote.trim()) {
      errors.push(`Exercise ${exercise.slug} has no safety note`);
    }
    if (exercise.steps.length === 0) errors.push(`Exercise ${exercise.slug} has no steps`);
    if (new Set(exercise.steps.map((step) => step.id)).size !== exercise.steps.length) {
      errors.push(`Exercise ${exercise.slug} has duplicate step IDs`);
    }
    if (exercise.steps.some((step) => !step.text.trim())) {
      errors.push(`Exercise ${exercise.slug} has an empty step`);
    }
    if (!Number.isInteger(exercise.version) || exercise.version < 1) {
      errors.push(`Exercise ${exercise.slug} has an invalid version`);
    }
  }

  const categoryIds = new Set<string>();
  for (const category of categories) {
    if (categoryIds.has(category.id)) errors.push(`Duplicate category ID: ${category.id}`);
    categoryIds.add(category.id);
    if (!slugs.has(category.exerciseSlug)) {
      errors.push(
        `Category ${category.id} references missing exercise: ${category.exerciseSlug}`,
      );
    }
  }

  return errors.sort();
}
