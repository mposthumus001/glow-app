"use client";

import { ShellError } from "@/components/shell";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ShellError reset={reset} />;
}
