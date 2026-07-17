"use client";

import { FeatureRouteError } from "@/components/errors/FeatureRouteError";

export default function BabyError({
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
      featureArea="baby"
      title="Baby tracking didn't load"
      message="Your logs are still here. Please try again in a moment."
    />
  );
}
