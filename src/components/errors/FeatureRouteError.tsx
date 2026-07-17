"use client";

import { useEffect } from "react";

import { ShellError } from "@/components/shell";
import type { GlowFeatureArea } from "@/lib/monitoring/feature-areas";
import { reportUnexpectedException } from "@/lib/monitoring/report-error";

export type FeatureRouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
  featureArea: GlowFeatureArea;
  title?: string;
  message?: string;
};

export function FeatureRouteError({
  error,
  reset,
  featureArea,
  title,
  message,
}: FeatureRouteErrorProps) {
  useEffect(() => {
    reportUnexpectedException(error, {
      featureArea,
      route:
        typeof window !== "undefined" ? window.location.pathname : undefined,
    });
  }, [error, featureArea]);

  return <ShellError title={title} message={message} reset={reset} />;
}
