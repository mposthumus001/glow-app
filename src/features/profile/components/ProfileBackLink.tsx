import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils/cn";

export function ProfileBackLink({
  href = "/profile",
  label = "Back to You",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mb-4 inline-flex min-h-11 items-center gap-1.5 text-sm text-glow-text-secondary",
        "rounded-lg transition-colors hover:text-glow-text",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-glow-primary/50",
      )}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
