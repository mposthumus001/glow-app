"use client";

import { FeatureRouteError } from "@/components/errors/FeatureRouteError";

export default function ProfileError({
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
      featureArea="profile"
      title="Settings didn't load"
      message="Your profile details are unchanged. Please try again in a moment."
    />
  );
}
