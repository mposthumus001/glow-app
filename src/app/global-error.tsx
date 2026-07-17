"use client";

import { FeatureRouteError } from "@/components/errors/FeatureRouteError";

import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-[#060914] text-[#f4eeff] antialiased">
        <FeatureRouteError
          error={error}
          reset={reset}
          featureArea="global"
          title="Glow needs a moment"
          message="Something unexpected happened. You can try again, or come back shortly."
        />
      </body>
    </html>
  );
}
