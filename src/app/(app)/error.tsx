"use client";

import { useEffect } from "react";

import { ShellError } from "@/components/shell";
import { reportClientError } from "@/lib/errors/report-client-error";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  return <ShellError reset={reset} />;
}
