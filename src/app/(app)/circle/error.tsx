"use client";

import { FeatureRouteError } from "@/components/errors/FeatureRouteError";

export default function CircleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <FeatureRouteError
      error={error}
      reset={reset}
      featureArea="circle"
      title="Your Circle didn't load"
      message="Messages are still private and safe. Please try again in a moment."
    />
  );
}
