import { notFound } from "next/navigation";

import { CalmExerciseScreen } from "@/features/calm/components/CalmExerciseScreen";
import { getCalmExercise } from "@/features/calm/content/exercises";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CalmExercisePage({ params }: PageProps) {
  const { slug } = await params;
  const exercise = getCalmExercise(slug);

  if (!exercise?.enabled) notFound();

  return <CalmExerciseScreen exercise={exercise} />;
}
