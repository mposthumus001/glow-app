"use client";

import { FeatureRouteError } from "@/components/errors/FeatureRouteError";

export default function CalmError({
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
      featureArea="calm"
      title="Calm didn't load"
      message="Your sound preferences are still saved on this device. Please try again."
    />
  );
}
